/**
 * API Route — POST /api/vs/projects/[id]/visuals/generate (s30 V2)
 *
 * Lance un job de génération cohérente pour TOUTES les pièces actives
 * (target_visual_count > 0) du projet. Pattern fire-and-forget contrôlé :
 *  - Crée vs_visual_jobs status='pending'
 *  - Lance void runVisualJob(...) — ne pas await
 *  - Retourne 202 Accepted avec job_id immédiatement
 *
 * Le frontend doit ensuite s'abonner à /api/vs/projects/[id]/visuals-stream
 * pour suivre la progression en temps réel (P1 persona Friction 9).
 *
 * Pré-condition métier : preflight OK (0 question status='asked'). Si une
 * question reste, on renvoie 409 + liste questions (le frontend re-route
 * vers la modale chat bloquante).
 *
 * Body : { style_id: string, room_ids?: string[] }
 * Response 202 : { job_id, expected_count, estimated_cost_usd }
 *
 * s32 (autopilot Thomas) : `room_ids` optionnel pour génération par pièce
 * (#4). Si fourni, restreint le job à ces pièces uniquement (intersection
 * avec les pièces actives target_visual_count > 0 et non 'skipped'). Si
 * absent, comportement legacy : toutes les pièces du projet.
 */

import { NextRequest, NextResponse } from "next/server";
import { ensureDbReady, query } from "@/lib/vs/db";
import { hasBlockingQuestions } from "@/lib/vs/ambiguity-detector";
import { createVisualJob, runVisualJob, estimateJobCost } from "@/lib/vs/visual-job-runner";
import { getStyle } from "@/lib/vs/styles";
import type { ApiResponse } from "@/lib/vs/types";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

interface GenerateResponse {
  job_id: string;
  expected_count: number;
  estimated_cost_usd: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<GenerateResponse>>> {
  try {
    await ensureDbReady();
    const { id: projectId } = await params;
    if (!isValidUUID(projectId)) {
      return NextResponse.json({ success: false, error: "Identifiant projet invalide." }, { status: 400 });
    }

    const body = (await request.json()) as {
      style_id?: string;
      /** s32 (autopilot) — optionnel : restreint le job à ces pièces (#4 génération par pièce). */
      room_ids?: string[];
    };
    const styleId = body.style_id?.trim();
    if (!styleId || !getStyle(styleId)) {
      return NextResponse.json({ success: false, error: "style_id invalide." }, { status: 400 });
    }
    // Validation des UUID room_ids (si fourni)
    let roomIdsFilter: string[] | null = null;
    if (Array.isArray(body.room_ids)) {
      if (body.room_ids.length === 0) {
        return NextResponse.json(
          { success: false, error: "room_ids fourni mais vide." },
          { status: 400 }
        );
      }
      for (const rid of body.room_ids) {
        if (!isValidUUID(rid)) {
          return NextResponse.json(
            { success: false, error: "room_ids contient un identifiant invalide." },
            { status: 400 }
          );
        }
      }
      roomIdsFilter = body.room_ids;
    }

    // Vérifier projet existe
    const projCheck = await query<{ id: string }>("SELECT id FROM vs_projects WHERE id = $1", [projectId]);
    if (projCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Projet introuvable." }, { status: 404 });
    }

    // Pré-condition : preflight (aucune question bloquante)
    if (await hasBlockingQuestions(projectId)) {
      return NextResponse.json(
        { success: false, error: "Préflight requis — répondez aux questions avant de lancer la génération." },
        { status: 409 }
      );
    }

    // Empêcher double déclenchement (uniq index DB couvre la course mais on
    // donne un message clair côté API)
    const running = await query<{ id: string }>(
      `SELECT id FROM vs_visual_jobs WHERE project_id = $1 AND status IN ('pending','running')`,
      [projectId]
    );
    if (running.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: "Un job de génération est déjà en cours pour ce projet." },
        { status: 409 }
      );
    }

    // Compter le nombre de visuels attendus.
    // BUG P0 fix s32 (Thomas prod) : `COALESCE(rs.target_visual_count, 3)` au
    // lieu de 0 pour considérer "settings absente = pièce active par défaut"
    // (cohérent avec le default DB DEFAULT 1 de vs_room_settings et avec
    // settings/route.ts:54 + ambiguity-detector.ts:287). Avant le fix, une
    // pièce qui n'avait jamais reçu d'INSERT explicite (cas du wizard s32 qui
    // ne crée pas vs_room_settings au démarrage) était comptée 0 → "Aucune
    // pièce active". On exclut explicitement les pièces 'skipped' (s32 #5).
    const sumResult = roomIdsFilter
      ? await query<{ total: string }>(
          `
          SELECT COALESCE(SUM(COALESCE(rs.target_visual_count, 3)), 0)::TEXT AS total
            FROM vs_rooms r
            JOIN vs_lots l ON l.id = r.lot_id
            LEFT JOIN vs_room_settings rs ON rs.room_id = r.id
           WHERE l.project_id = $1
             AND COALESCE(rs.target_visual_count, 3) > 0
             AND COALESCE(r.status, 'suggested') <> 'skipped'
             AND r.id = ANY($2::uuid[])
          `,
          [projectId, roomIdsFilter]
        )
      : await query<{ total: string }>(
          `
          SELECT COALESCE(SUM(COALESCE(rs.target_visual_count, 3)), 0)::TEXT AS total
            FROM vs_rooms r
            JOIN vs_lots l ON l.id = r.lot_id
            LEFT JOIN vs_room_settings rs ON rs.room_id = r.id
           WHERE l.project_id = $1
             AND COALESCE(rs.target_visual_count, 3) > 0
             AND COALESCE(r.status, 'suggested') <> 'skipped'
          `,
          [projectId]
        );
    const expectedCount = Number.parseInt(sumResult.rows[0]?.total ?? "0", 10);
    if (expectedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Aucune pièce à générer. Configurez au moins une pièce avant de lancer la génération." },
        { status: 400 }
      );
    }

    const job = await createVisualJob(projectId, expectedCount);

    // Fire-and-forget contrôlé : on ne await PAS. Sur Replit autoscale, le
    // worker continue tant que le process Node vit (~10 min après dernière req).
    // La persistance BDD reste source de vérité — pas de perte si crash.
    // s32 (autopilot) : passe le filtre room_ids éventuel.
    void runVisualJob({
      job_id: job.job_id,
      project_id: projectId,
      style_id: styleId,
      room_ids: roomIdsFilter ?? undefined,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          job_id: job.job_id,
          expected_count: expectedCount,
          estimated_cost_usd: estimateJobCost(expectedCount),
        },
      },
      { status: 202 }
    );
  } catch (err) {
    console.error("[API] POST /api/vs/projects/[id]/visuals/generate erreur:", err);
    return NextResponse.json(
      { success: false, error: "Lancement génération impossible — réessayez." },
      { status: 500 }
    );
  }
}
