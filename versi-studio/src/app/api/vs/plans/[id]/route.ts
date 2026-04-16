/**
 * API Route — /api/vs/plans/[id]
 * DELETE : Supprime un plan + son fichier sur disque
 * PATCH  : Met à jour les métadonnées d'un plan (floor_number)
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ id: string; floor_number: number }>>> {
  try {
    await ensureDbReady();
    const { id } = await params;

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { success: false, error: "Identifiant invalide." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as { floor_number?: unknown };
    const floorNumber = body.floor_number;

    // Validation : entier entre -5 (sous-sols) et 50 (tours)
    if (
      typeof floorNumber !== "number" ||
      !Number.isInteger(floorNumber) ||
      floorNumber < -5 ||
      floorNumber > 50
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Numéro d'étage invalide — doit être un entier compris entre -5 et 50.",
        },
        { status: 400 }
      );
    }

    // Vérifier que le plan existe
    const existing = await query<{ id: string }>(
      "SELECT id FROM vs_plans WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Plan introuvable." },
        { status: 404 }
      );
    }

    // Mettre à jour floor_number
    await query(
      "UPDATE vs_plans SET floor_number = $1 WHERE id = $2",
      [floorNumber, id]
    );

    return NextResponse.json({
      success: true,
      data: { id, floor_number: floorNumber },
    });
  } catch (err) {
    console.error("[API] PATCH /api/vs/plans/[id] erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de mettre à jour le plan." },
      { status: 500 }
    );
  }
}
