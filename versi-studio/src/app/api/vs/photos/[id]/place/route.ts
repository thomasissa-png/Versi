/**
 * API Route — PATCH /api/vs/photos/[id]/place
 *
 * Place une photo sur le canvas plan (drag-and-drop côté UI Vague 3) :
 *  - position_x / position_y : 0.0-1.0 normalisé sur le plan complet
 *  - angle_degrees : 0-359 (orientation photographe, 0 = nord)
 *  - room_id : pièce cible (re-affectation possible si la photo bouge entre pièces)
 *
 * Body : { room_id?: string, position_x: number, position_y: number, angle_degrees?: number | null }
 * Response 200 : { photo_id, room_id, position_x, position_y, angle_degrees, is_placed_on_plan: true }
 *
 * Pattern dual-callback s27.2 : cette route est l'endpoint "commit" (mouseup).
 * Pendant le drag, l'UI ne sollicite pas l'API (state local uniquement).
 */

import { NextRequest, NextResponse } from "next/server";
import { ensureDbReady, query } from "@/lib/vs/db";
import type { ApiResponse, VsPhoto } from "@/lib/vs/types";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function clamp01(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v));
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 1) return null;
  return n;
}

function normalizeAngle(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number.parseFloat(String(v));
  if (!Number.isFinite(n)) return null;
  // Modulo 360 robuste aux valeurs négatives ou > 360 envoyées par UI rotative
  const mod = ((n % 360) + 360) % 360;
  return mod;
}

interface PlaceResponse {
  photo_id: string;
  room_id: string;
  position_x: number;
  position_y: number;
  angle_degrees: number | null;
  is_placed_on_plan: boolean;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<PlaceResponse>>> {
  try {
    await ensureDbReady();
    const { id: photoId } = await params;
    if (!isValidUUID(photoId)) {
      return NextResponse.json({ success: false, error: "Identifiant photo invalide." }, { status: 400 });
    }

    const body = (await request.json()) as {
      room_id?: string;
      position_x?: number;
      position_y?: number;
      angle_degrees?: number | null;
    };

    const px = clamp01(body.position_x);
    const py = clamp01(body.position_y);
    if (px === null || py === null) {
      return NextResponse.json(
        { success: false, error: "position_x et position_y doivent être entre 0.0 et 1.0." },
        { status: 400 }
      );
    }
    const angle = normalizeAngle(body.angle_degrees);

    // Charge la photo pour récupérer room_id par défaut (si pas fourni)
    const photoCheck = await query<VsPhoto>("SELECT id, room_id FROM vs_photos WHERE id = $1", [photoId]);
    if (photoCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Photo introuvable." }, { status: 404 });
    }
    const currentRoomId = photoCheck.rows[0].room_id;

    let targetRoomId = currentRoomId;
    if (body.room_id) {
      if (!isValidUUID(body.room_id)) {
        return NextResponse.json({ success: false, error: "room_id invalide." }, { status: 400 });
      }
      // Vérifier que la pièce existe (même projet — sécurité minimale V2)
      const roomCheck = await query<{ id: string }>("SELECT id FROM vs_rooms WHERE id = $1", [body.room_id]);
      if (roomCheck.rows.length === 0) {
        return NextResponse.json({ success: false, error: "Pièce cible introuvable." }, { status: 404 });
      }
      targetRoomId = body.room_id;
    }

    const result = await query<VsPhoto>(
      `UPDATE vs_photos
          SET room_id = $2, position_x = $3, position_y = $4, angle_degrees = $5,
              is_placed_on_plan = true
        WHERE id = $1
        RETURNING id, room_id, position_x, position_y, angle_degrees, is_placed_on_plan`,
      [photoId, targetRoomId, px, py, angle]
    );
    const row = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        photo_id: row.id,
        room_id: row.room_id,
        position_x: row.position_x ?? px,
        position_y: row.position_y ?? py,
        angle_degrees: row.angle_degrees,
        is_placed_on_plan: row.is_placed_on_plan,
      },
    });
  } catch (err) {
    console.error("[API] PATCH /api/vs/photos/[id]/place erreur:", err);
    return NextResponse.json(
      { success: false, error: "Placement non enregistré — réessayez." },
      { status: 500 }
    );
  }
}
