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

// Désactive le cache Route Handler de Next.js 15.
// Cohérence avec /api/vs/projects/[id]/plans : DELETE et PATCH doivent toujours
// frapper la base, jamais une réponse cachée (bug s22 — plan supprimé qui réapparaît).
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
): Promise<NextResponse<ApiResponse<{ id: string; floor_number?: number; m2_per_pixel?: number }>>> {
  try {
    await ensureDbReady();
    const { id } = await params;

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { success: false, error: "Identifiant invalide." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as {
      floor_number?: unknown;
      m2_per_pixel?: unknown;
    };

    // Au moins un champ doit être fourni
    if (body.floor_number === undefined && body.m2_per_pixel === undefined) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Aucun champ à mettre à jour. Fournissez floor_number ou m2_per_pixel.",
        },
        { status: 400 }
      );
    }

    // Validation floor_number si fourni
    if (body.floor_number !== undefined) {
      if (
        typeof body.floor_number !== "number" ||
        !Number.isInteger(body.floor_number) ||
        body.floor_number < -5 ||
        body.floor_number > 50
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
    }

    // Validation m2_per_pixel si fourni (DECIMAL(12,6) positif)
    if (body.m2_per_pixel !== undefined) {
      if (
        typeof body.m2_per_pixel !== "number" ||
        !Number.isFinite(body.m2_per_pixel) ||
        body.m2_per_pixel <= 0 ||
        body.m2_per_pixel > 1
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Calibration invalide — la valeur m2_per_pixel doit être un nombre strictement positif et inférieur à 1.",
          },
          { status: 400 }
        );
      }
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

    // Construire UPDATE dynamique selon les champs fournis
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (body.floor_number !== undefined) {
      updates.push(`floor_number = $${paramIdx++}`);
      values.push(body.floor_number);
    }
    if (body.m2_per_pixel !== undefined) {
      updates.push(`m2_per_pixel = $${paramIdx++}`);
      values.push(body.m2_per_pixel);
    }
    values.push(id);

    await query(
      `UPDATE vs_plans SET ${updates.join(", ")} WHERE id = $${paramIdx}`,
      values
    );

    const data: { id: string; floor_number?: number; m2_per_pixel?: number } = { id };
    if (body.floor_number !== undefined) data.floor_number = body.floor_number as number;
    if (body.m2_per_pixel !== undefined) data.m2_per_pixel = body.m2_per_pixel as number;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[API] PATCH /api/vs/plans/[id] erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de mettre à jour le plan." },
      { status: 500 }
    );
  }
}
