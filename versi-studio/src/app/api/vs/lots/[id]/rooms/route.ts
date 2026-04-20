/**
 * API Route — /api/vs/lots/[id]/rooms
 * GET  : Liste les pièces d'un lot
 * POST : Ajoute une pièce manuellement à un lot
 *
 * V1 sans auth — tout est public.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, ensureDbReady } from "@/lib/vs/db";
import type { VsRoom, ApiResponse } from "@/lib/vs/types";
import { ROOM_TYPE_LABELS, type RoomTypeKey } from "@/lib/vs/styles";

const VALID_ROOM_TYPES = Object.keys(ROOM_TYPE_LABELS) as RoomTypeKey[];

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    str
  );
}

// ─── GET /api/vs/lots/[id]/rooms ──────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<VsRoom[]>>> {
  try {
    await ensureDbReady();
    const { id: lotId } = await params;

    if (!isValidUUID(lotId)) {
      return NextResponse.json(
        { success: false, error: "Identifiant de lot invalide." },
        { status: 400 }
      );
    }

    // Vérifier que le lot existe
    const lotCheck = await query(
      "SELECT id FROM vs_lots WHERE id = $1",
      [lotId]
    );
    if (lotCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Lot introuvable." },
        { status: 404 }
      );
    }

    const result = await query<VsRoom>(
      "SELECT * FROM vs_rooms WHERE lot_id = $1 ORDER BY created_at ASC",
      [lotId]
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("[API] GET /api/vs/lots/[id]/rooms erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de charger les pièces." },
      { status: 500 }
    );
  }
}

// ─── POST /api/vs/lots/[id]/rooms ─────────────────────────────────

interface CreateRoomPayload {
  name?: string;
  room_type: string;
  custom_label?: string;
  surface_m2?: number;
  position?: Record<string, unknown>;
  plan_id?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<VsRoom>>> {
  try {
    await ensureDbReady();
    const { id: lotId } = await params;

    if (!isValidUUID(lotId)) {
      return NextResponse.json(
        { success: false, error: "Identifiant de lot invalide." },
        { status: 400 }
      );
    }

    // Vérifier que le lot existe
    const lotCheck = await query(
      "SELECT id FROM vs_lots WHERE id = $1",
      [lotId]
    );
    if (lotCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Lot introuvable." },
        { status: 404 }
      );
    }

    const body = (await request.json()) as CreateRoomPayload;

    // Validation du type de pièce
    if (!body.room_type || !VALID_ROOM_TYPES.includes(body.room_type as RoomTypeKey)) {
      return NextResponse.json(
        {
          success: false,
          error: "Type de pièce invalide.",
        },
        { status: 400 }
      );
    }

    // Validation du custom_label si type = autre
    if (body.room_type === "autre" && body.custom_label && body.custom_label.length > 50) {
      return NextResponse.json(
        { success: false, error: "Le label personnalisé ne peut pas dépasser 50 caractères." },
        { status: 400 }
      );
    }

    // Validation plan_id si fourni
    if (body.plan_id && !isValidUUID(body.plan_id)) {
      return NextResponse.json(
        { success: false, error: "Identifiant de plan invalide." },
        { status: 400 }
      );
    }

    const surfaceM2 =
      body.surface_m2 != null && body.surface_m2 > 0
        ? body.surface_m2
        : null;

    const result = await query<VsRoom>(
      `INSERT INTO vs_rooms (lot_id, plan_id, name, room_type, custom_label, surface_m2, position, source, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'manual', 'suggested')
       RETURNING *`,
      [
        lotId,
        body.plan_id || null,
        body.name?.trim() || null,
        body.room_type,
        body.custom_label?.trim() || null,
        surfaceM2,
        body.position ? JSON.stringify(body.position) : null,
      ]
    );

    return NextResponse.json(
      { success: true, data: result.rows[0] },
      { status: 201 }
    );
  } catch (err) {
    console.error("[API] POST /api/vs/lots/[id]/rooms erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible d'ajouter la pièce." },
      { status: 500 }
    );
  }
}
