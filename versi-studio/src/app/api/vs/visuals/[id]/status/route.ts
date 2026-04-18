/**
 * API Route — /api/vs/visuals/[id]/status
 * GET : Retourne le statut d'un visuel (polling toutes les 5s côté frontend)
 *
 * Statuts possibles : processing, generated, validated, failed.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, ensureDbReady } from "@/lib/vs/db";
import type { VsVisual, ApiResponse } from "@/lib/vs/types";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// Désactive le cache Route Handler de Next.js 15.
// Route de polling toutes les 5s : un cache rendrait le polling inutile (statut figé
// tant que le cache n'est pas invalidé). Pattern du fix s22, étendu session s22 maintenance.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ─── GET /api/vs/visuals/[id]/status ──────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Pick<VsVisual, "id" | "status" | "file_path" | "error_message">>>> {
  try {
    await ensureDbReady();
    const { id: visualId } = await params;

    if (!isValidUUID(visualId)) {
      return NextResponse.json(
        { success: false, error: "Identifiant de visuel invalide." },
        { status: 400 }
      );
    }

    const result = await query<VsVisual>(
      "SELECT id, status, file_path, error_message FROM vs_visuals WHERE id = $1",
      [visualId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Visuel introuvable." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("[API] GET /api/vs/visuals/[id]/status erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de vérifier le statut du visuel." },
      { status: 500 }
    );
  }
}
