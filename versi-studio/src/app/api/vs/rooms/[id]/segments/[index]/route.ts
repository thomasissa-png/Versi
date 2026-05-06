/**
 * API Route — /api/vs/rooms/[id]/segments/[index]
 *
 * PATCH : UPSERT d'UN segment (par index). Pratique pour update unitaire
 *         depuis le canvas (clic sur un segment → choix type → PATCH).
 *
 * V1 sans auth.
 *
 * s32 (autopilot Thomas) — Feature B annotations sémantiques.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, ensureDbReady } from "@/lib/vs/db";
import type {
  ApiResponse,
  VsRoomSegment,
  VsRoomSegmentType,
} from "@/lib/vs/types";
import { VS_ROOM_SEGMENT_TYPES } from "@/lib/vs/types";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    str
  );
}

function isValidSegmentType(v: unknown): v is VsRoomSegmentType {
  return typeof v === "string" && (VS_ROOM_SEGMENT_TYPES as readonly string[]).includes(v);
}

interface PatchOnePayload {
  type?: unknown;
  notes?: unknown;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; index: string }> }
): Promise<NextResponse<ApiResponse<VsRoomSegment>>> {
  try {
    await ensureDbReady();
    const { id: roomId, index: indexStr } = await params;

    if (!isValidUUID(roomId)) {
      return NextResponse.json(
        { success: false, error: "Identifiant de pièce invalide." },
        { status: 400 }
      );
    }

    const idx = Number.parseInt(indexStr, 10);
    if (!Number.isInteger(idx) || idx < 0) {
      return NextResponse.json(
        { success: false, error: "Index de segment invalide." },
        { status: 400 }
      );
    }

    // Vérifie que la pièce existe + récupère taille polygone pour borner idx
    const roomCheck = await query<{ polygon: { x_percent: number; y_percent: number }[] | null }>(
      "SELECT polygon FROM vs_rooms WHERE id = $1",
      [roomId]
    );
    if (roomCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pièce introuvable." },
        { status: 404 }
      );
    }
    const polygon = roomCheck.rows[0].polygon;
    const expected = Array.isArray(polygon) && polygon.length >= 3 ? polygon.length : 0;
    if (expected > 0 && idx >= expected) {
      return NextResponse.json(
        {
          success: false,
          error: `segment_index hors borne (max ${expected - 1}).`,
        },
        { status: 400 }
      );
    }

    const body = (await request.json()) as PatchOnePayload;
    if (!isValidSegmentType(body.type)) {
      return NextResponse.json(
        { success: false, error: "Type de segment invalide." },
        { status: 400 }
      );
    }
    if (body.notes !== undefined && body.notes !== null && typeof body.notes !== "string") {
      return NextResponse.json(
        { success: false, error: "notes doit être une chaîne ou null." },
        { status: 400 }
      );
    }
    const type = body.type as VsRoomSegmentType;
    const notes =
      typeof body.notes === "string" ? body.notes.slice(0, 500) : null;

    const upsert = await query<VsRoomSegment>(
      `INSERT INTO vs_room_segments (room_id, segment_index, type, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (room_id, segment_index)
       DO UPDATE SET type = EXCLUDED.type, notes = EXCLUDED.notes
       RETURNING id, room_id, segment_index, type, notes, updated_at`,
      [roomId, idx, type, notes]
    );

    return NextResponse.json({ success: true, data: upsert.rows[0] });
  } catch (err) {
    console.error("[API] PATCH /api/vs/rooms/[id]/segments/[index] erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible d'enregistrer le segment." },
      { status: 500 }
    );
  }
}
