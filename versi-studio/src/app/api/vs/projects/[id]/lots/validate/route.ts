/**
 * API Route — /api/vs/projects/[id]/lots/validate
 * POST : Valide tous les lots d'un projet et passe le projet en step_2_complete.
 *
 * Pré-conditions :
 * - Au moins 1 lot existe
 * - Aucun lot en "overlap_error"
 *
 * V1 sans auth — tout est public.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, ensureDbReady, withTransaction } from "@/lib/vs/db";
import type { VsProject, VsLot, ApiResponse } from "@/lib/vs/types";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    str
  );
}

// ─── POST /api/vs/projects/[id]/lots/validate ─────────────────────

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<VsProject>>> {
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
    const projectCheck = await query<VsProject>(
      "SELECT * FROM vs_projects WHERE id = $1",
      [projectId]
    );
    if (projectCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Opération introuvable." },
        { status: 404 }
      );
    }

    // Récupérer les lots
    const lotsResult = await query<VsLot>(
      "SELECT * FROM vs_lots WHERE project_id = $1",
      [projectId]
    );

    if (lotsResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Aucun lot à valider. Créez au moins un lot avant de continuer.",
        },
        { status: 400 }
      );
    }

    // Vérifier qu'aucun lot n'a un statut overlap_error
    const hasOverlap = lotsResult.rows.some(
      (lot) => lot.status === "overlap_error"
    );
    if (hasOverlap) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Certains lots se chevauchent. Ajustez les zones avant de valider.",
        },
        { status: 400 }
      );
    }

    // Transaction : valider tous les lots + passer le projet en step_2_complete
    const updatedProject = await withTransaction(async (client) => {
      // Valider tous les lots
      await client.query(
        "UPDATE vs_lots SET status = 'validated' WHERE project_id = $1",
        [projectId]
      );

      // Mettre à jour le statut du projet
      const result = await client.query(
        `UPDATE vs_projects
         SET status = 'step_2_complete', updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [projectId]
      );

      return result.rows[0] as VsProject;
    });

    return NextResponse.json({ success: true, data: updatedProject });
  } catch (err) {
    console.error(
      "[API] POST /api/vs/projects/[id]/lots/validate erreur :",
      err
    );
    return NextResponse.json(
      { success: false, error: "Impossible de valider les lots." },
      { status: 500 }
    );
  }
}
