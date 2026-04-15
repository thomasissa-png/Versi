/**
 * API Route — /api/vs/rooms/[id]/visuals
 * GET : Historique des visuels d'une pièce (tous styles confondus, triés par date desc)
 *
 * Retourne les visuels avec leurs infos photo et style.
 * V1 sans auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, ensureDbReady } from "@/lib/vs/db";
import type { VsVisual, VsPhoto, ApiResponse } from "@/lib/vs/types";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// ─── Types enrichis ──────────────────────────────────────────────

interface VisualWithPhoto extends VsVisual {
  photo_file_path: string;
  angle_description: string | null;
}

interface RoomVisualsResponse {
  photos: VsPhoto[];
  visuals: VisualWithPhoto[];
}

// ─── GET /api/vs/rooms/[id]/visuals ──────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<RoomVisualsResponse>>> {
  try {
    await ensureDbReady();
    const { id: roomId } = await params;

    if (!isValidUUID(roomId)) {
      return NextResponse.json(
        { success: false, error: "Identifiant de pièce invalide." },
        { status: 400 }
      );
    }

    // Vérifier que la pièce existe
    const roomCheck = await query(
      "SELECT id FROM vs_rooms WHERE id = $1",
      [roomId]
    );
    if (roomCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pièce introuvable." },
        { status: 404 }
      );
    }

    // Récupérer les photos de cette pièce
    const photosResult = await query<VsPhoto>(
      "SELECT * FROM vs_photos WHERE room_id = $1 ORDER BY created_at DESC",
      [roomId]
    );

    // Récupérer les visuels de cette pièce (via les photos)
    const visualsResult = await query<VisualWithPhoto>(
      `SELECT v.*, p.file_path as photo_file_path, p.angle_description
       FROM vs_visuals v
       JOIN vs_photos p ON p.id = v.photo_id
       WHERE p.room_id = $1
       ORDER BY v.created_at DESC`,
      [roomId]
    );

    return NextResponse.json({
      success: true,
      data: {
        photos: photosResult.rows,
        visuals: visualsResult.rows,
      },
    });
  } catch (err) {
    console.error("[API] GET /api/vs/rooms/[id]/visuals erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de charger les visuels de cette pièce." },
      { status: 500 }
    );
  }
}
