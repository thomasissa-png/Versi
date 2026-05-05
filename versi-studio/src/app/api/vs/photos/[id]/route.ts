/**
 * API Route — /api/vs/photos/[id]
 * DELETE : Supprime une photo (et son fichier disque). Utilisé par le wizard
 *          s32 (« supprimer une position » dans VisualWizardRoomStep).
 *
 * V1 sans auth — public.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, ensureDbReady } from "@/lib/vs/db";
import type { ApiResponse } from "@/lib/vs/types";
import { unlink } from "fs/promises";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    await ensureDbReady();
    const { id: photoId } = await params;
    if (!isValidUUID(photoId)) {
      return NextResponse.json(
        { success: false, error: "Identifiant photo invalide." },
        { status: 400 }
      );
    }

    const result = await query<{ id: string; file_path: string | null }>(
      "DELETE FROM vs_photos WHERE id = $1 RETURNING id, file_path",
      [photoId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Photo introuvable." },
        { status: 404 }
      );
    }

    // Cleanup fichier disque (best-effort)
    const filePath = result.rows[0].file_path;
    if (filePath) {
      try {
        await unlink(filePath);
      } catch {
        // Fichier déjà manquant ou inaccessible — on ne bloque pas la suppression DB.
      }
    }

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error("[API] DELETE /api/vs/photos/[id] erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de supprimer la photo." },
      { status: 500 }
    );
  }
}
