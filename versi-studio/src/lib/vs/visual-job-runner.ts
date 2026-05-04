/**
 * Versi Studio — Worker async job de génération visuels (s30 Vague 2)
 *
 * Orchestration du job persistant `vs_visual_jobs` :
 *  1. Crée la ligne `vs_visual_jobs` status='pending'
 *  2. Émet job.started → status devient 'running'
 *  3. Itère sur les pièces actives (target_visual_count > 0 + photos placées)
 *  4. Pour chaque pièce → generateCoherentVisuals() (anchor + N-1 secondaires)
 *  5. Émet visual.created/visual.generated/visual.failed à chaque étape
 *  6. Émet batch.complete au final (compte succès + échecs)
 *
 * Conformité P1 persona Friction 9 : la fonction startVisualJob() retourne
 * immédiatement le job_id ; le runner continue côté serveur même si Thomas
 * ferme l'app (pattern fire-and-forget contrôlé : la persistance BDD est
 * la source de vérité, pas la response HTTP).
 *
 * Conformité préf fondateur s29 : aucun blocage budget. Le coût estimé
 * est calculé pour affichage CostHint UI, JAMAIS comme circuit breaker.
 *
 * Conformité P2 persona : check de cohérence post-génération opt-in via
 * `VS_VISUAL_COHERENCE_CHECK=true` (par défaut désactivé — économie $0.10/visuel).
 */

import { query } from "@/lib/vs/db";
import { generateCoherentVisuals, type PlacedPhoto, type CoherentGenerationInput } from "@/lib/vs/coherent-visual-generator";
import { preprocessPhoto } from "@/lib/vs/photo-preprocessor";
import { storeVisualImage, loadVisualImage } from "@/lib/vs/visual-storage";
import { emitJobEvent } from "@/lib/vs/visual-job-bus";
import { readFile } from "node:fs/promises";
import type { ZonePolygonPoint } from "@/lib/vs/types";

// ─── Types ─────────────────────────────────────────────────────────

interface RoomToGenerate {
  room_id: string;
  room_type: string;
  surface_m2: number | null;
  comment_text: string | null;
  target_visual_count: number;
  polygon: ZonePolygonPoint[] | null;
  user_answers: string[];
  structural_instructions: string | null;
}

interface PhotoRow {
  id: string;
  room_id: string;
  file_path: string;
  position_x: number | null;
  position_y: number | null;
  angle_degrees: number | null;
}

// ─── Cost estimation (CostHint UI uniquement, jamais blocage) ──────

/**
 * Estime le coût total d'un job pour affichage UI. Basé sur tarification
 * gpt-image-2 ~$0.04/visuel HD + gpt-4o-mini vision ~$0.001/signature.
 * Marge volontaire : on surestime pour éviter mauvaise surprise UX.
 */
export function estimateJobCost(expectedVisualCount: number): number {
  const VISUAL_COST_USD = 0.04;
  const SIGNATURE_COST_USD = 0.001;
  const totalSignatures = Math.ceil(expectedVisualCount / 5); // ~1 signature par pièce
  return Number((expectedVisualCount * VISUAL_COST_USD + totalSignatures * SIGNATURE_COST_USD).toFixed(3));
}

// ─── Création du job ───────────────────────────────────────────────

/**
 * Crée la ligne vs_visual_jobs status='pending' et retourne l'id.
 * Échoue si un job 'running' existe déjà pour ce projet (uniq index).
 */
export async function createVisualJob(
  projectId: string,
  expectedCount: number
): Promise<{ job_id: string; estimated_cost_usd: number }> {
  const estimated = estimateJobCost(expectedCount);
  const result = await query<{ id: string }>(
    `INSERT INTO vs_visual_jobs (project_id, status, expected_count, estimated_cost_usd)
     VALUES ($1, 'pending', $2, $3)
     RETURNING id`,
    [projectId, expectedCount, estimated]
  );
  return { job_id: result.rows[0].id, estimated_cost_usd: estimated };
}

// ─── Chargement des pièces à générer ───────────────────────────────

async function loadRoomsToGenerate(projectId: string, styleId: string): Promise<RoomToGenerate[]> {
  void styleId;
  const result = await query<{
    room_id: string;
    room_type: string;
    surface_m2: number | null;
    comment_text: string | null;
    target_visual_count: number;
    polygon: ZonePolygonPoint[] | null;
    user_answers_json: string | null;
    structural_instructions: string | null;
  }>(
    `
    SELECT
      r.id AS room_id,
      r.room_type,
      r.surface_m2::FLOAT AS surface_m2,
      rs.comment_text,
      COALESCE(rs.target_visual_count, 0) AS target_visual_count,
      r.polygon,
      (
        SELECT COALESCE(json_agg(q.user_answer ORDER BY q.answered_at)::TEXT, '[]')
          FROM vs_visual_questions q
         WHERE q.room_id = r.id AND q.status = 'answered'
      ) AS user_answers_json,
      -- structural_instructions = sous-ensemble du commentaire si T3 a confirmé.
      -- Pour V2, on transmet le comment_text intégral comme instruction.
      rs.comment_text AS structural_instructions
    FROM vs_rooms r
    JOIN vs_lots l ON l.id = r.lot_id
    LEFT JOIN vs_room_settings rs ON rs.room_id = r.id
    WHERE l.project_id = $1
      AND COALESCE(rs.target_visual_count, 0) > 0
    `,
    [projectId]
  );
  return result.rows.map((row) => ({
    room_id: row.room_id,
    room_type: row.room_type,
    surface_m2: row.surface_m2,
    comment_text: row.comment_text,
    target_visual_count: row.target_visual_count,
    polygon: row.polygon,
    user_answers: row.user_answers_json ? (JSON.parse(row.user_answers_json) as string[]).filter(Boolean) : [],
    structural_instructions: row.structural_instructions,
  }));
}

async function loadPlacedPhotos(roomId: string): Promise<PlacedPhoto[]> {
  const result = await query<PhotoRow>(
    `SELECT id, room_id, file_path, position_x, position_y, angle_degrees
       FROM vs_photos
      WHERE room_id = $1 AND is_placed_on_plan = true`,
    [roomId]
  );

  const placed: PlacedPhoto[] = [];
  for (const row of result.rows) {
    if (row.position_x == null || row.position_y == null) continue;
    try {
      const raw = await readFile(row.file_path);
      // Pré-traite (downscale + JPEG normalisé) — coherent-visual-generator
      // requiert un buffer prêt et un mime type. Mime type déduit de l'ext.
      const ext = row.file_path.toLowerCase().slice(row.file_path.lastIndexOf("."));
      const mimeMap: Record<string, string> = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png", ".webp": "image/webp", ".heic": "image/heic",
      };
      const declaredMime = mimeMap[ext] ?? "image/jpeg";
      const preprocessed = await preprocessPhoto(raw, declaredMime);
      placed.push({
        id: row.id,
        room_id: row.room_id,
        file_path: row.file_path,
        position_x: row.position_x,
        position_y: row.position_y,
        angle_degrees: row.angle_degrees,
        buffer: preprocessed.buffer,
        mime_type: "image/jpeg",
      });
    } catch (err) {
      console.warn(`[visual-job-runner] Photo ${row.id} skipped (read failed):`, err instanceof Error ? err.message : err);
    }
  }
  return placed;
}

// ─── Worker principal ──────────────────────────────────────────────

interface RunVisualJobInput {
  job_id: string;
  project_id: string;
  style_id: string;
}

/**
 * Worker async — lance la génération de tous les visuels du projet.
 * Ne JAMAIS await côté route API : appeler `void runVisualJob(...)` puis
 * répondre 201 immédiatement (sinon le proxy Replit timeout à 60s).
 *
 * Le worker continue côté serveur grâce au pattern Node "promise échappée"
 * (event loop garde la promesse vivante tant que la connexion DB tient).
 * Sur Replit autoscale, l'instance vit ~10min après la dernière requête —
 * largement suffisant pour les 7 minutes de génération annoncées Étape 4 v2.
 */
export async function runVisualJob(input: RunVisualJobInput): Promise<void> {
  const { job_id, project_id, style_id } = input;
  const coherenceCheckEnabled = process.env.VS_VISUAL_COHERENCE_CHECK === "true";
  if (coherenceCheckEnabled) {
    console.log(`[visual-job-runner] coherence check ENABLED for job ${job_id} (opt-in flag)`);
  }

  try {
    const rooms = await loadRoomsToGenerate(project_id, style_id);
    if (rooms.length === 0) {
      await emitJobEvent({
        type: "batch.complete", project_id, job_id,
        completed_count: 0, failed_count: 0,
      });
      return;
    }

    const expectedCount = rooms.reduce((s, r) => s + r.target_visual_count, 0);
    const estimatedCost = estimateJobCost(expectedCount);
    await emitJobEvent({
      type: "job.started", project_id, job_id,
      expected_count: expectedCount, estimated_cost_usd: estimatedCost,
    });

    let completed = 0;
    let failed = 0;

    for (const room of rooms) {
      const photos = await loadPlacedPhotos(room.room_id);
      if (photos.length === 0) {
        // Pièce avec target>0 mais pas de photo placée — devrait être bloquée
        // par preflight ; on log et on continue (mode permissif s30).
        console.warn(`[visual-job-runner] Room ${room.room_id} : target>0 mais 0 photo placée — skip.`);
        continue;
      }
      const polygon = room.polygon ?? [];
      if (polygon.length < 3) {
        console.warn(`[visual-job-runner] Room ${room.room_id} : polygone invalide — skip.`);
        continue;
      }

      const genInput: CoherentGenerationInput = {
        room_id: room.room_id,
        room_polygon: polygon,
        photos,
        style_id,
        room_type: room.room_type,
        surface_m2: room.surface_m2,
        comment_text: room.comment_text,
        target_visual_count: room.target_visual_count,
        user_answers: room.user_answers,
        structural_instructions: room.structural_instructions,
      };

      try {
        const result = await generateCoherentVisuals(genInput, { storeImage: storeVisualImage });

        // Émet visual.generated pour ancre + secondaires
        await emitJobEvent({
          type: "visual.generated", project_id, job_id,
          room_id: room.room_id, visual_id: result.anchor.visual_id,
          kind: "anchor", file_path: "", coherence_mode: null,
        });
        completed += 1;
        for (const sec of result.secondaries) {
          await emitJobEvent({
            type: "visual.generated", project_id, job_id,
            room_id: room.room_id, visual_id: sec.visual_id,
            kind: "secondary", file_path: "", coherence_mode: sec.coherence_mode,
          });
          completed += 1;
        }
        for (const fail of result.failures) {
          await emitJobEvent({
            type: "visual.failed", project_id, job_id,
            room_id: room.room_id, photo_id: fail.photo_id, error: fail.error,
          });
          failed += 1;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[visual-job-runner] Room ${room.room_id} fatal:`, msg);
        await emitJobEvent({
          type: "visual.failed", project_id, job_id,
          room_id: room.room_id, photo_id: photos[0]?.id ?? "", error: msg,
        });
        failed += room.target_visual_count;
      }
    }

    await emitJobEvent({
      type: "batch.complete", project_id, job_id,
      completed_count: completed, failed_count: failed,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[visual-job-runner] Job ${job_id} fatal:`, msg);
    await emitJobEvent({ type: "job.failed", project_id, job_id, error: msg });
  }
}

// Exports utilitaires pour tests/régénération
export { loadVisualImage, loadPlacedPhotos };
