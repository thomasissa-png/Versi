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
 * Body : { style_id: string }
 * Response 202 : { job_id, expected_count, estimated_cost_usd }
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

    const body = (await request.json()) as { style_id?: string };
    const styleId = body.style_id?.trim();
    if (!styleId || !getStyle(styleId)) {
      return NextResponse.json({ success: false, error: "style_id invalide." }, { status: 400 });
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

    // Compter le nombre de visuels attendus
    const sumResult = await query<{ total: string }>(
      `
      SELECT COALESCE(SUM(rs.target_visual_count), 0)::TEXT AS total
        FROM vs_rooms r
        JOIN vs_lots l ON l.id = r.lot_id
        LEFT JOIN vs_room_settings rs ON rs.room_id = r.id
       WHERE l.project_id = $1
         AND COALESCE(rs.target_visual_count, 0) > 0
      `,
      [projectId]
    );
    const expectedCount = Number.parseInt(sumResult.rows[0]?.total ?? "0", 10);
    if (expectedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Aucune pièce active (target_visual_count > 0). Activez au moins une pièce." },
        { status: 400 }
      );
    }

    const job = await createVisualJob(projectId, expectedCount);

    // Fire-and-forget contrôlé : on ne await PAS. Sur Replit autoscale, le
    // worker continue tant que le process Node vit (~10 min après dernière req).
    // La persistance BDD reste source de vérité — pas de perte si crash.
    void runVisualJob({ job_id: job.job_id, project_id: projectId, style_id: styleId });

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
