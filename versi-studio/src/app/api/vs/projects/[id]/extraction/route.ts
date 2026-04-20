/**
 * API Route — /api/vs/projects/[id]/extraction
 * GET : Polling du statut d'extraction pour tous les plans du projet.
 *
 * Retourne le statut agrégé : pending | processing | done | failed.
 * "done" uniquement si TOUS les plans sont en "done".
 * "failed" si au moins un plan est "failed" et aucun n'est "processing".
 *
 * V1 sans auth — tout est public.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, ensureDbReady } from "@/lib/vs/db";
import type { ApiResponse, ExtractionStatus } from "@/lib/vs/types";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    str
  );
}

interface ExtractionStatusResponse {
  status: ExtractionStatus;
  plans_total: number;
  plans_done: number;
  plans_failed: number;
  plans_processing: number;
}

// ─── GET /api/vs/projects/[id]/extraction ─────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<ExtractionStatusResponse>>> {
  try {
    await ensureDbReady();
    const { id: projectId } = await params;

    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Identifiant de projet invalide." },
        { status: 400 }
      );
    }

    // Vérifier que le projet existe
    const projectCheck = await query(
      "SELECT id FROM vs_projects WHERE id = $1",
      [projectId]
    );
    if (projectCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Opération introuvable." },
        { status: 404 }
      );
    }

    // Compter les statuts
    const result = await query<{ extraction_status: ExtractionStatus; count: string }>(
      `SELECT extraction_status, COUNT(*) as count
       FROM vs_plans
       WHERE project_id = $1
       GROUP BY extraction_status`,
      [projectId]
    );

    let total = 0;
    let done = 0;
    let failed = 0;
    let processing = 0;

    for (const row of result.rows) {
      const count = parseInt(row.count, 10);
      total += count;
      if (row.extraction_status === "done") done = count;
      if (row.extraction_status === "failed") failed = count;
      if (row.extraction_status === "processing") processing = count;
    }

    // Déterminer le statut agrégé
    let aggregatedStatus: ExtractionStatus;
    if (total === 0) {
      aggregatedStatus = "pending";
    } else if (processing > 0) {
      aggregatedStatus = "processing";
    } else if (done === total) {
      aggregatedStatus = "done";
    } else if (failed > 0) {
      aggregatedStatus = "failed";
    } else {
      aggregatedStatus = "pending";
    }

    return NextResponse.json({
      success: true,
      data: {
        status: aggregatedStatus,
        plans_total: total,
        plans_done: done,
        plans_failed: failed,
        plans_processing: processing,
      },
    });
  } catch (err) {
    console.error("[API] GET /api/vs/projects/[id]/extraction erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de récupérer le statut d'extraction." },
      { status: 500 }
    );
  }
}
