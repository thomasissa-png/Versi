/**
 * API Route — /api/vs/plans/[id]
 * DELETE : Supprime un plan + son fichier sur disque
 *
 * V1 sans auth — tout est public.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, ensureDbReady } from "@/lib/vs/db";
import type { ApiResponse } from "@/lib/vs/types";
import { unlink } from "fs/promises";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    str
  );
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    await ensureDbReady();
    const { id } = await params;

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { success: false, error: "Identifiant invalide." },
        { status: 400 }
      );
    }

    // Récupérer le chemin du fichier avant suppression
    const planResult = await query<{ file_path: string }>(
      "SELECT file_path FROM vs_plans WHERE id = $1",
      [id]
    );

    if (planResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Plan introuvable." },
        { status: 404 }
      );
    }

    const filePath = planResult.rows[0].file_path;

    // Supprimer en base
    await query("DELETE FROM vs_plans WHERE id = $1", [id]);

    // Supprimer le fichier sur disque (best effort)
    try {
      await unlink(filePath);
    } catch {
      // Le fichier peut déjà avoir été supprimé — pas bloquant
      console.warn(
        `[API] Fichier non trouvé lors de la suppression : ${filePath}`
      );
    }

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error("[API] DELETE /api/vs/plans/[id] erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de supprimer le plan." },
      { status: 500 }
    );
  }
}
