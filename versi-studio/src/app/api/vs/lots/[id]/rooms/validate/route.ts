/**
 * API Route — /api/vs/lots/[id]/rooms/validate
 * POST : Valide toutes les pièces d'un lot (status → 'validated')
 *
 * Pré-condition : toutes les pièces du lot doivent avoir un room_type défini
 * (différent de 'non_identifie').
 *
 * V1 sans auth — tout est public.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, ensureDbReady, withTransaction } from "@/lib/vs/db";
import type { VsRoom, VsLot, ApiResponse } from "@/lib/vs/types";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    str
  );
}

// ─── POST /api/vs/lots/[id]/rooms/validate ────────────────────────

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ lot: VsLot; rooms: VsRoom[] }>>> {
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
    const lotCheck = await query<VsLot>(
      "SELECT * FROM vs_lots WHERE id = $1",
      [lotId]
    );
    if (lotCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Lot introuvable." },
        { status: 404 }
      );
    }

    // Vérifier que toutes les pièces sont typées
    const untypedRooms = await query(
      "SELECT id FROM vs_rooms WHERE lot_id = $1 AND room_type = 'non_identifie'",
      [lotId]
    );
    if (untypedRooms.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Définissez le type de toutes les pièces avant de valider.",
        },
        { status: 400 }
      );
    }

    // Transaction : valider toutes les pièces + le lot
    const result = await withTransaction(async (client) => {
      // Valider toutes les pièces du lot
      const roomsResult = await client.query<VsRoom>(
        "UPDATE vs_rooms SET status = 'validated' WHERE lot_id = $1 RETURNING *",
        [lotId]
      );

      // Valider le lot lui-même
      const lotResult = await client.query<VsLot>(
        "UPDATE vs_lots SET status = 'validated' WHERE id = $1 RETURNING *",
        [lotId]
      );

      return { lot: lotResult.rows[0], rooms: roomsResult.rows };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[API] POST /api/vs/lots/[id]/rooms/validate erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de valider les pièces." },
      { status: 500 }
    );
  }
}
