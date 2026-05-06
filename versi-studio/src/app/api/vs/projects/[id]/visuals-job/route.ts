/**
 * API Route — GET /api/vs/projects/[id]/visuals-job
 *
 * Snapshot HTTP du job de génération en cours (ou du dernier job terminé)
 * pour ce projet. Sert de fallback POLLING au stream SSE — qui peut être
 * interrompu silencieusement par le navigateur quand l'onglet perd le focus
 * (Chrome throttle agressif sur background tabs) ou par les proxies (Replit
 * autoscale / Vercel idle timeout).
 *
 * Stratégie côté client (`useVisualsStream` v2) :
 *   - Le SSE reste le canal "low-latency" tant qu'il est ouvert
 *   - Un poll de cette route toutes les 4s sert de filet :
 *       * resynchronise les compteurs (si SSE a perdu un event)
 *       * détecte la complétion / l'échec si SSE est mort
 *       * permet de masquer le faux "Connexion interrompue" quand le job
 *         tourne toujours côté serveur
 *   - Sur `visibilitychange → visible` le client force un poll immédiat
 *
 * Schéma de réponse (compatible avec le state du hook) :
 *   {
 *     success: true,
 *     data: {
 *       job: { id, status: 'pending'|'running'|'completed'|'failed',
 *              expected_count, completed_count, failed_count,
 *              estimated_cost_usd, started_at, error } | null,
 *       visuals_by_room: { [room_id]: VisualGenerated[] }
 *     }
 *   }
 *
 * Note schéma : la table `vs_visual_jobs` utilise `'done'` ; on traduit en
 * `'completed'` pour matcher la sémantique des events SSE consommés par le
 * hook (batch.complete → status='completed').
 */

import { NextRequest, NextResponse } from "next/server";
import { ensureDbReady, query } from "@/lib/vs/db";

export const dynamic = "force-dynamic";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

interface JobRow {
  id: string;
  status: string;
  expected_count: number;
  completed_count: number;
  failed_count: number;
  estimated_cost_usd: string | number | null;
  started_at: string | null;
  error_message: string | null;
}

interface VisualRow {
  id: string;
  room_id: string;
  status: string;
  anchor_visual_id: string | null;
  coherence_mode: string | null;
  file_path: string;
  created_at: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  await ensureDbReady();
  const { id: projectId } = await params;
  if (!isValidUUID(projectId)) {
    return NextResponse.json(
      { success: false, error: "Identifiant projet invalide." },
      { status: 400 }
    );
  }

  try {
    // 1. Dernier job du projet (running > done > failed > pending)
    const jobRes = await query<JobRow>(
      `SELECT id, status, expected_count, completed_count, failed_count,
              estimated_cost_usd, started_at::TEXT AS started_at, error_message
         FROM vs_visual_jobs
        WHERE project_id = $1
        ORDER BY created_at DESC LIMIT 1`,
      [projectId]
    );

    let jobPayload: {
      id: string;
      status: "pending" | "running" | "completed" | "failed";
      expected_count: number;
      completed_count: number;
      failed_count: number;
      estimated_cost_usd: number;
      started_at: string | null;
      error: string | null;
    } | null = null;

    let visualsByRoom: Record<string, Array<{
      visual_id: string;
      room_id: string;
      kind: "anchor" | "secondary";
      file_path: string;
      coherence_mode: "multi_image_native" | "textual_signature" | null;
      status: string;
    }>> = {};

    if (jobRes.rows.length > 0) {
      const j = jobRes.rows[0];
      // Traduction 'done' → 'completed' pour matcher le hook (qui s'aligne sur l'event SSE batch.complete)
      const status =
        j.status === "done"
          ? "completed"
          : (["pending", "running", "failed"].includes(j.status)
              ? (j.status as "pending" | "running" | "failed")
              : "pending");
      jobPayload = {
        id: j.id,
        status,
        expected_count: j.expected_count,
        completed_count: j.completed_count,
        failed_count: j.failed_count,
        estimated_cost_usd: Number(j.estimated_cost_usd ?? 0),
        started_at: j.started_at,
        error: j.error_message,
      };

      // 2. Visuels persistés pour ce projet (joint via photo → room → lot → project)
      // On récupère TOUS les visuels du projet "récents" (status generated/validated)
      // pour rebuild visualsByRoom — utile si SSE a perdu des events.
      // Filtre temporel : visuels créés à partir du started_at du job (sinon on
      // remonte d'anciens visuels d'autres jobs régénérés).
      const sinceClause = j.started_at ? `AND v.created_at >= $2::TIMESTAMPTZ` : "";
      const queryParams: (string | null)[] = j.started_at
        ? [projectId, j.started_at]
        : [projectId];

      const visualsRes = await query<VisualRow>(
        `
        SELECT v.id, p.room_id, v.status,
               v.anchor_visual_id, v.coherence_mode, v.file_path,
               v.created_at::TEXT AS created_at
          FROM vs_visuals v
          JOIN vs_photos p ON p.id = v.photo_id
          JOIN vs_rooms r  ON r.id = p.room_id
          JOIN vs_lots l   ON l.id = r.lot_id
         WHERE l.project_id = $1
           AND v.status IN ('generated', 'validated')
           ${sinceClause}
         ORDER BY v.created_at ASC
        `,
        queryParams
      );

      const grouped: typeof visualsByRoom = {};
      for (const v of visualsRes.rows) {
        const kind: "anchor" | "secondary" = v.anchor_visual_id === null ? "anchor" : "secondary";
        const coherence_mode: "multi_image_native" | "textual_signature" | null =
          v.coherence_mode === "multi_image_native" || v.coherence_mode === "textual_signature"
            ? v.coherence_mode
            : null;
        const list = grouped[v.room_id] ?? [];
        list.push({
          visual_id: v.id,
          room_id: v.room_id,
          kind,
          file_path: v.file_path,
          coherence_mode,
          status: v.status,
        });
        grouped[v.room_id] = list;
      }
      visualsByRoom = grouped;
    }

    return NextResponse.json({
      success: true,
      data: {
        job: jobPayload,
        visuals_by_room: visualsByRoom,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[GET /visuals-job] erreur:", msg);
    return NextResponse.json(
      { success: false, error: "Lecture du job échouée." },
      { status: 500 }
    );
  }
}
