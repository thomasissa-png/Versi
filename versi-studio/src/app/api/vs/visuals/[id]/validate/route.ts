/**
 * API Route — /api/vs/visuals/[id]/validate
 * PATCH : Valide ou invalide un visuel
 *
 * Body : { validated: boolean }
 * - true → status = 'validated'
 * - false → status = 'generated' (retour à non-validé)
 *
 * V1 sans auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, ensureDbReady } from "@/lib/vs/db";
import type { VsVisual, ApiResponse } from "@/lib/vs/types";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// ─── PATCH /api/vs/visuals/[id]/validate ─────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<VsVisual>>> {
  try {
    await ensureDbReady();
    const { id: visualId } = await params;

    if (!isValidUUID(visualId)) {
      return NextResponse.json(
        { success: false, error: "Identifiant de visuel invalide." },
        { status: 400 }
      );
    }

    const body = await request.json() as { validated: boolean };

    if (typeof body.validated !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Le champ 'validated' est requis (true ou false)." },
        { status: 400 }
      );
    }

    // Vérifier que le visuel existe
    const checkResult = await query<VsVisual>(
      "SELECT * FROM vs_visuals WHERE id = $1",
      [visualId]
    );
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Visuel introuvable." },
        { status: 404 }
      );
    }

    const visual = checkResult.rows[0];

    // On ne peut valider qu'un visuel généré (ou re-invalider un validé)
    if (body.validated && visual.status !== "generated") {
      return NextResponse.json(
        { success: false, error: "Seul un visuel généré peut être validé." },
        { status: 400 }
      );
    }

    if (!body.validated && visual.status !== "validated") {
      return NextResponse.json(
        { success: false, error: "Seul un visuel validé peut être invalidé." },
        { status: 400 }
      );
    }

    const newStatus = body.validated ? "validated" : "generated";

    const result = await query<VsVisual>(
      `UPDATE vs_visuals SET status = $1 WHERE id = $2 RETURNING *`,
      [newStatus, visualId]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("[API] PATCH /api/vs/visuals/[id]/validate erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de mettre à jour le statut du visuel." },
      { status: 500 }
    );
  }
}
