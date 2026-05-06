/**
 * API Route — /api/vs/rooms/[id]
 * PATCH  : Modifie le type, la position ou la surface d'une pièce
 * DELETE : Supprime une pièce
 *
 * V1 sans auth — tout est public.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, ensureDbReady } from "@/lib/vs/db";
import type {
  VsRoom,
  ApiResponse,
  ArchitecturalDetails,
} from "@/lib/vs/types";
import { ROOM_TYPE_LABELS, STYLES, type RoomTypeKey, type StyleId } from "@/lib/vs/styles";
import { validateArchitecturalDetails } from "@/lib/vs/architectural-validation";

const VALID_ROOM_TYPES = Object.keys(ROOM_TYPE_LABELS) as RoomTypeKey[];
const VALID_STYLE_IDS = Object.keys(STYLES) as StyleId[];

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
  /** s23 fix désync — polygon transformé (cohérent avec position) */
  polygon?: Array<Record<string, unknown>> | null;
  /** Marque explicitement la pièce comme confirmée par l'utilisateur */
  touched?: boolean;
  /** s32 — style décoration propre à la pièce (refonte wizard Étape 4) */
  style_id?: string | null;
  /** s32 (autopilot) — true = pièce meublée à transformer, false = vide à meubler. */
  is_furnished?: boolean;
  /** s32 (autopilot) — 'suggested' | 'validated' | 'skipped' (skip pièce wizard). */
  status?: "suggested" | "validated" | "skipped";
  /** s32 (autopilot — Feature A) — décalage horizontal polygone, lot-local %
   *  (plage [-10, +10]). null = annule l'ajustement. */
  polygon_offset_x?: number | null;
  /** s32 (autopilot — Feature A) — décalage vertical polygone (lot-local %). */
  polygon_offset_y?: number | null;
  /** s32 — détails architecturaux pièce (saisie marchand + Vision). */
  architectural_details?: ArchitecturalDetails;
}

const POLYGON_OFFSET_MIN = -10;
const POLYGON_OFFSET_MAX = 10;

function isValidPolygonOffset(v: unknown): v is number | null {
  if (v === null) return true;
  if (typeof v !== "number" || !Number.isFinite(v)) return false;
  return v >= POLYGON_OFFSET_MIN && v <= POLYGON_OFFSET_MAX;
}

const VALID_ROOM_STATUSES = ["suggested", "validated", "skipped"] as const;

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

    // s23 fix désync — polygon transformé lors des drag/resize
    if (body.polygon !== undefined) {
      setClauses.push(`polygon = $${paramIndex++}`);
      values.push(body.polygon ? JSON.stringify(body.polygon) : null);
    }

    // s32 — style propre à chaque pièce (refonte wizard Étape 4)
    if (body.style_id !== undefined) {
      if (body.style_id !== null && !VALID_STYLE_IDS.includes(body.style_id as StyleId)) {
        return NextResponse.json(
          { success: false, error: "Style invalide." },
          { status: 400 }
        );
      }
      setClauses.push(`style_id = $${paramIndex++}`);
      values.push(body.style_id);
    }

    // s32 (autopilot) — meublé / non-meublé
    if (body.is_furnished !== undefined) {
      if (typeof body.is_furnished !== "boolean") {
        return NextResponse.json(
          { success: false, error: "is_furnished doit être un booléen." },
          { status: 400 }
        );
      }
      setClauses.push(`is_furnished = $${paramIndex++}`);
      values.push(body.is_furnished);
    }

    // s32 (autopilot — Feature A) — ajustement contour (offset polygone)
    if (body.polygon_offset_x !== undefined) {
      if (!isValidPolygonOffset(body.polygon_offset_x)) {
        return NextResponse.json(
          {
            success: false,
            error: `polygon_offset_x doit être null ou un nombre dans [${POLYGON_OFFSET_MIN}, ${POLYGON_OFFSET_MAX}].`,
          },
          { status: 400 }
        );
      }
      setClauses.push(`polygon_offset_x = $${paramIndex++}`);
      values.push(body.polygon_offset_x);
    }
    if (body.polygon_offset_y !== undefined) {
      if (!isValidPolygonOffset(body.polygon_offset_y)) {
        return NextResponse.json(
          {
            success: false,
            error: `polygon_offset_y doit être null ou un nombre dans [${POLYGON_OFFSET_MIN}, ${POLYGON_OFFSET_MAX}].`,
          },
          { status: 400 }
        );
      }
      setClauses.push(`polygon_offset_y = $${paramIndex++}`);
      values.push(body.polygon_offset_y);
    }

    // s32 — détails architecturaux pièce (saisie wizard + Vision)
    if (body.architectural_details !== undefined) {
      const result = validateArchitecturalDetails(body.architectural_details);
      if (!result.ok) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }
      setClauses.push(`architectural_details = $${paramIndex++}`);
      values.push(JSON.stringify(result.value));
    }

    // s32 (autopilot) — skip pièce
    if (body.status !== undefined) {
      if (!VALID_ROOM_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { success: false, error: "Statut invalide." },
          { status: 400 }
        );
      }
      setClauses.push(`status = $${paramIndex++}`);
      values.push(body.status);
    }

    // Option C : toute modification utilisateur marque la pièce comme confirmée.
    // Le flag `touched` peut aussi être envoyé explicitement (bouton "Confirmer").
    if (setClauses.length > 0 || body.touched === true) {
      setClauses.push(`touched = true`);
    }

    if (setClauses.length === 0) {
      return NextResponse.json(
        { success: false, error: "Aucune modification fournie." },
        { status: 400 }
      );
    }

    values.push(roomId);
    // Cast NUMERIC en FLOAT pour que polygon_offset_* arrivent typés number côté client.
    const result = await query<VsRoom>(
      `UPDATE vs_rooms SET ${setClauses.join(", ")} WHERE id = $${paramIndex}
         RETURNING *,
                   surface_m2::FLOAT AS surface_m2,
                   polygon_offset_x::FLOAT AS polygon_offset_x,
                   polygon_offset_y::FLOAT AS polygon_offset_y`,
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
