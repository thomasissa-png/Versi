/**
 * API Route — /api/vs/rooms/[id]
 * PATCH  : Modifie le type, la position ou la surface d'une pièce
 * DELETE : Supprime une pièce
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

// ─── PATCH /api/vs/rooms/[id] ─────────────────────────────────────

interface PatchRoomPayload {
  name?: string;
  room_type?: string;
  custom_label?: string | null;
  surface_m2?: number | null;
  position?: Record<string, unknown> | null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<VsRoom>>> {
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

    const body = (await request.json()) as PatchRoomPayload;

    // Construire dynamiquement la requête UPDATE
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (body.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(body.name?.trim() || null);
    }

    if (body.room_type !== undefined) {
      if (!VALID_ROOM_TYPES.includes(body.room_type as RoomTypeKey)) {
        return NextResponse.json(
          { success: false, error: "Type de pièce invalide." },
          { status: 400 }
        );
      }
      setClauses.push(`room_type = $${paramIndex++}`);
      values.push(body.room_type);
    }

    if (body.custom_label !== undefined) {
      if (body.custom_label && body.custom_label.length > 50) {
        return NextResponse.json(
          { success: false, error: "Le label personnalisé ne peut pas dépasser 50 caractères." },
          { status: 400 }
        );
      }
      setClauses.push(`custom_label = $${paramIndex++}`);
      values.push(body.custom_label?.trim() || null);
    }

    if (body.surface_m2 !== undefined) {
      setClauses.push(`surface_m2 = $${paramIndex++}`);
      values.push(
        body.surface_m2 != null && body.surface_m2 > 0 ? body.surface_m2 : null
      );
    }

    if (body.position !== undefined) {
      setClauses.push(`position = $${paramIndex++}`);
      values.push(body.position ? JSON.stringify(body.position) : null);
    }

    if (setClauses.length === 0) {
      return NextResponse.json(
        { success: false, error: "Aucune modification fournie." },
        { status: 400 }
      );
    }

    values.push(roomId);
    const result = await query<VsRoom>(
      `UPDATE vs_rooms SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("[API] PATCH /api/vs/rooms/[id] erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de modifier la pièce." },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/vs/rooms/[id] ────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    await ensureDbReady();
    const { id: roomId } = await params;

    if (!isValidUUID(roomId)) {
      return NextResponse.json(
        { success: false, error: "Identifiant de pièce invalide." },
        { status: 400 }
      );
    }

    const result = await query(
      "DELETE FROM vs_rooms WHERE id = $1 RETURNING id",
      [roomId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pièce introuvable." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error("[API] DELETE /api/vs/rooms/[id] erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de supprimer la pièce." },
      { status: 500 }
    );
  }
}
