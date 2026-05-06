/**
 * API Route — /api/vs/rooms/[id]/segments
 *
 * GET : retourne TOUS les segments d'une pièce (un par arête du polygone).
 *       Création à la volée des lignes default 'wall' si absentes (lazy
 *       seeding). Le nombre de segments correspond au nombre de sommets
 *       du polygone (un polygone à N sommets a N arêtes — la dernière
 *       ferme le polygone vers le sommet 0).
 *
 * Utilisé par RoomZoomCanvas pour afficher le rendu sémantique des arêtes
 * et par le wizard pour proposer le menu d'annotation.
 *
 * V1 sans auth — tout est public (cohérent avec /rooms/[id]).
 *
 * s32 (autopilot Thomas) — Feature B annotations sémantiques.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, withTransaction, ensureDbReady } from "@/lib/vs/db";
import type {
  ApiResponse,
  VsRoomSegment,
  VsRoomSegmentType,
  ZonePolygonPoint,
} from "@/lib/vs/types";
import { VS_ROOM_SEGMENT_TYPES } from "@/lib/vs/types";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    str
  );
}

interface RoomRowMin {
  id: string;
  polygon: ZonePolygonPoint[] | null;
}

/**
 * Charge la pièce (id + polygon). Retourne null si introuvable.
 */
async function loadRoomMin(roomId: string): Promise<RoomRowMin | null> {
  const r = await query<RoomRowMin>(
    "SELECT id, polygon FROM vs_rooms WHERE id = $1",
    [roomId]
  );
  return r.rows[0] ?? null;
}

/**
 * Compte attendu de segments d'une pièce = nombre de sommets du polygone.
 * Un polygone à N sommets a N arêtes (le dernier segment ferme la boucle).
 * Si le polygone est invalide (< 3 sommets) → 0 segments.
 */
function expectedSegmentCount(polygon: ZonePolygonPoint[] | null): number {
  if (!Array.isArray(polygon) || polygon.length < 3) return 0;
  return polygon.length;
}

/**
 * Charge les segments existants. Si certains indices manquent (création de
 * la pièce sans pré-remplissage, ou polygone modifié et nouveaux sommets),
 * crée à la volée les lignes default 'wall' dans une transaction.
 */
async function loadOrSeedSegments(
  roomId: string,
  expected: number
): Promise<VsRoomSegment[]> {
  const existing = await query<VsRoomSegment>(
    `SELECT id, room_id, segment_index, type, notes, updated_at
       FROM vs_room_segments
      WHERE room_id = $1
      ORDER BY segment_index ASC`,
    [roomId]
  );

  if (expected === 0) {
    // Pas de polygone → on retourne ce qui existe (peut-être 0 ; pas de seed).
    return existing.rows;
  }

  const presentIndices = new Set(existing.rows.map((s) => s.segment_index));
  const missing: number[] = [];
  for (let i = 0; i < expected; i++) {
    if (!presentIndices.has(i)) missing.push(i);
  }

  if (missing.length === 0) {
    // Filtrer indices > expected-1 (cas polygone réduit) — on ne supprime pas
    // pour ne pas perdre l'annotation, mais on n'expose que les indices valides.
    return existing.rows.filter((s) => s.segment_index < expected);
  }

  // Insertion idempotente des indices manquants
  await withTransaction(async (client) => {
    for (const idx of missing) {
      await client.query(
        `INSERT INTO vs_room_segments (room_id, segment_index, type)
         VALUES ($1, $2, 'wall')
         ON CONFLICT (room_id, segment_index) DO NOTHING`,
        [roomId, idx]
      );
    }
  });

  // Recharge après seed
  const reloaded = await query<VsRoomSegment>(
    `SELECT id, room_id, segment_index, type, notes, updated_at
       FROM vs_room_segments
      WHERE room_id = $1 AND segment_index < $2
      ORDER BY segment_index ASC`,
    [roomId, expected]
  );
  return reloaded.rows;
}

// ─── GET /api/vs/rooms/[id]/segments ──────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<VsRoomSegment[]>>> {
  try {
    await ensureDbReady();
    const { id: roomId } = await params;

    if (!isValidUUID(roomId)) {
      return NextResponse.json(
        { success: false, error: "Identifiant de pièce invalide." },
        { status: 400 }
      );
    }

    const room = await loadRoomMin(roomId);
    if (!room) {
      return NextResponse.json(
        { success: false, error: "Pièce introuvable." },
        { status: 404 }
      );
    }

    const expected = expectedSegmentCount(room.polygon);
    const segments = await loadOrSeedSegments(roomId, expected);
    return NextResponse.json({ success: true, data: segments });
  } catch (err) {
    console.error("[API] GET /api/vs/rooms/[id]/segments erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible de charger les segments." },
      { status: 500 }
    );
  }
}

// ─── PATCH (par lot) /api/vs/rooms/[id]/segments ───────────────────
//
// Permet d'updater plusieurs segments en une requête : payload =
//   { segments: Array<{ segment_index, type, notes? }> }
// Plus robuste que faire N requêtes séparées depuis le client.

interface PatchBatchPayload {
  segments?: Array<{
    segment_index?: unknown;
    type?: unknown;
    notes?: unknown;
  }>;
}

function isValidSegmentType(v: unknown): v is VsRoomSegmentType {
  return typeof v === "string" && (VS_ROOM_SEGMENT_TYPES as readonly string[]).includes(v);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<VsRoomSegment[]>>> {
  try {
    await ensureDbReady();
    const { id: roomId } = await params;

    if (!isValidUUID(roomId)) {
      return NextResponse.json(
        { success: false, error: "Identifiant de pièce invalide." },
        { status: 400 }
      );
    }

    const room = await loadRoomMin(roomId);
    if (!room) {
      return NextResponse.json(
        { success: false, error: "Pièce introuvable." },
        { status: 404 }
      );
    }

    const expected = expectedSegmentCount(room.polygon);

    const body = (await request.json()) as PatchBatchPayload;
    const items = Array.isArray(body.segments) ? body.segments : [];
    if (items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Aucun segment fourni." },
        { status: 400 }
      );
    }

    // Validation
    for (const it of items) {
      if (
        typeof it.segment_index !== "number" ||
        !Number.isInteger(it.segment_index) ||
        it.segment_index < 0 ||
        (expected > 0 && it.segment_index >= expected)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `segment_index invalide (attendu entre 0 et ${
              expected > 0 ? expected - 1 : "∞"
            }).`,
          },
          { status: 400 }
        );
      }
      if (!isValidSegmentType(it.type)) {
        return NextResponse.json(
          { success: false, error: "Type de segment invalide." },
          { status: 400 }
        );
      }
      if (it.notes !== undefined && it.notes !== null && typeof it.notes !== "string") {
        return NextResponse.json(
          { success: false, error: "notes doit être une chaîne ou null." },
          { status: 400 }
        );
      }
    }

    // UPSERT en transaction
    await withTransaction(async (client) => {
      for (const it of items) {
        const idx = it.segment_index as number;
        const type = it.type as VsRoomSegmentType;
        const notes =
          typeof it.notes === "string" ? it.notes.slice(0, 500) : null;
        await client.query(
          `INSERT INTO vs_room_segments (room_id, segment_index, type, notes)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (room_id, segment_index)
           DO UPDATE SET type = EXCLUDED.type, notes = EXCLUDED.notes`,
          [roomId, idx, type, notes]
        );
      }
    });

    // Retourne tous les segments à jour
    const segments = await loadOrSeedSegments(roomId, expected);
    return NextResponse.json({ success: true, data: segments });
  } catch (err) {
    console.error("[API] PATCH /api/vs/rooms/[id]/segments erreur :", err);
    return NextResponse.json(
      { success: false, error: "Impossible d'enregistrer les annotations." },
      { status: 500 }
    );
  }
}
