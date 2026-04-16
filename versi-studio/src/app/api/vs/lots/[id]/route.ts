/**
 * API Route — /api/vs/lots/[id]
 * PATCH  : Modifier un lot (nom, zone, floor, surface, status)
 * DELETE : Supprimer un lot
 *
 * V1 sans auth — tout est public.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, ensureDbReady } from "@/lib/vs/db";
import type {
  VsLot,
  UpdateLotPayload,
  ApiResponse,
  LotStatus,
  Zone,
  ZoneRect,
  ZonePolygon,
} from "@/lib/vs/types";

const VALID_STATUSES: LotStatus[] = ["suggested", "validated", "overlap_error"];

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    str
  );
}

function isValidZoneRect(zone: unknown): zone is ZoneRect {
  if (!zone || typeof zone !== "object") return false;
  const z = zone as Record<string, unknown>;
  return (
    typeof z.x_percent === "number" &&
    typeof z.y_percent === "number" &&
    typeof z.width_percent === "number" &&
    typeof z.height_percent === "number" &&
    z.x_percent >= 0 &&
    z.x_percent <= 100 &&
    z.y_percent >= 0 &&
    z.y_percent <= 100 &&
    z.width_percent > 0 &&
    z.width_percent <= 100 &&
    z.height_percent > 0 &&
    z.height_percent <= 100
  );
}

function isValidZonePolygon(zone: unknown): zone is ZonePolygon {
  if (!zone || typeof zone !== "object") return false;
  const z = zone as Record<string, unknown>;
  if (z.type !== "polygon") return false;
  if (!Array.isArray(z.points) || z.points.length < 3) return false;
  for (const p of z.points) {
    if (!p || typeof p !== "object") return false;
    const pt = p as Record<string, unknown>;
    if (
      typeof pt.x_percent !== "number" ||
      typeof pt.y_percent !== "number" ||
      pt.x_percent < 0 || pt.x_percent > 100 ||
      pt.y_percent < 0 || pt.y_percent > 100
    ) return false;
  }
  return true;
}

function isValidZone(zone: unknown): zone is Zone {
  return isValidZoneRect(zone) || isValidZonePolygon(zone);
}

// ─── PATCH /api/vs/lots/[id] ──────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<VsLot>>> {
  try {
    await ensureDbReady();
    const { id: lotId } = await params;

    if (!isValidUUID(lotId)) {
      return NextResponse.json(
        { success: false, error: "Identifiant de lot invalide." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as UpdateLotPayload;

    // Construire la requête dynamiquement
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (body.name !== undefined) {
      if (body.name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: "Le nom du lot ne peut pas être vide." },
          { status: 400 }
        );
      }
      setClauses.push(`name = $${paramIndex++}`);
      values.push(body.name.trim());
    }

    if (body.floor_number !== undefined) {
      setClauses.push(`floor_number = $${paramIndex++}`);
      values.push(Math.round(body.floor_number));
    }

    if (body.surface_m2 !== undefined) {
      setClauses.push(`surface_m2 = $${paramIndex++}`);
      values.push(
        body.surface_m2 != null && body.surface_m2 > 0
          ? body.surface_m2
          : null
      );
    }

    if (body.zone_data !== undefined) {
      if (!isValidZone(body.zone_data)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Zone invalide. Les coordonnées doivent être en pourcentage (0-100).",
          },
          { status: 400 }
        );
      }
      setClauses.push(`zone_data = $${paramIndex++}`);
      values.push(JSON.stringify(body.zone_data));
    }

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { success: false, error: "Statut de lot invalide." },
          { status: 400 }
        );
      }
      setClauses.push(`status = $${paramIndex++}`);
      values.push(body.status);
    }

    if (setClauses.length === 0) {
      return NextResponse.json(
        { success: false, error: "Aucune modification fournie." },
        { status: 400 }
      );
    }

    values.push(lotId);

    const result = await query<VsLot>(
      `UPDATE vs_lots SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Lot introuvable." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("[API] PATCH /api/vs/lots/[id] erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de modifier le lot." },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/vs/lots/[id] ─────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    await ensureDbReady();
    const { id: lotId } = await params;

    if (!isValidUUID(lotId)) {
      return NextResponse.json(
        { success: false, error: "Identifiant de lot invalide." },
        { status: 400 }
      );
    }

    const result = await query(
      "DELETE FROM vs_lots WHERE id = $1 RETURNING id",
      [lotId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Lot introuvable." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error("[API] DELETE /api/vs/lots/[id] erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de supprimer le lot." },
      { status: 500 }
    );
  }
}
