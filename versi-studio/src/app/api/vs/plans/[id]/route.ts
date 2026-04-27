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
): Promise<NextResponse<ApiResponse<{ id: string; floor_number?: number; m2_per_pixel?: number; original_filename?: string }>>> {
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
      original_filename?: unknown;
    };

    // Au moins un champ doit être fourni
    if (
      body.floor_number === undefined &&
      body.m2_per_pixel === undefined &&
      body.original_filename === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Aucun champ à mettre à jour. Fournissez floor_number, m2_per_pixel ou original_filename.",
        },
        { status: 400 }
      );
    }

    // Validation floor_number si fourni
    // Range : -5..50 + 99 réservé pour "Grenier" (label spécial UI s27)
    if (body.floor_number !== undefined) {
      const isStandardFloor =
        typeof body.floor_number === "number" &&
        Number.isInteger(body.floor_number) &&
        body.floor_number >= -5 &&
        body.floor_number <= 50;
      const isGrenier = body.floor_number === 99;
      if (!isStandardFloor && !isGrenier) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Numéro d'étage invalide — doit être un entier compris entre -5 et 50, ou 99 pour Grenier.",
          },
          { status: 400 }
        );
      }
    }

    // Validation original_filename si fourni (string non vide, max 255)
    let sanitizedFilename: string | undefined;
    if (body.original_filename !== undefined) {
      if (typeof body.original_filename !== "string") {
        return NextResponse.json(
          { success: false, error: "Nom de fichier invalide." },
          { status: 400 }
        );
      }
      sanitizedFilename = body.original_filename.trim();
      if (sanitizedFilename.length === 0 || sanitizedFilename.length > 255) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Nom de fichier invalide — doit faire entre 1 et 255 caractères.",
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
    if (sanitizedFilename !== undefined) {
      updates.push(`original_filename = $${paramIdx++}`);
      values.push(sanitizedFilename);
    }
    values.push(id);

    await query(
      `UPDATE vs_plans SET ${updates.join(", ")} WHERE id = $${paramIdx}`,
      values
    );

    const data: { id: string; floor_number?: number; m2_per_pixel?: number; original_filename?: string } = { id };
    if (body.floor_number !== undefined) data.floor_number = body.floor_number as number;
    if (body.m2_per_pixel !== undefined) data.m2_per_pixel = body.m2_per_pixel as number;
    if (sanitizedFilename !== undefined) data.original_filename = sanitizedFilename;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[API] PATCH /api/vs/plans/[id] erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de mettre à jour le plan." },
      { status: 500 }
    );
  }
}
