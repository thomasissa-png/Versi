/**
 * s32 (Phase 9) — Helpers partagés routes /api/vs/rooms/[id]/chat/*.
 *
 * Charge le contexte complet (lot + room + segments + photo + transcript)
 * et persiste le transcript après chaque tour.
 */

import { readFile } from "node:fs/promises";
import { query } from "@/lib/vs/db";
import type {
  VsLot,
  VsRoom,
  VsRoomSegment,
  ChatMessage,
  OperationChatContext,
} from "@/lib/vs/types";
import { normalizeArchitecturalDetails } from "@/lib/vs/types";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
};

export interface ChatContext {
  lot: VsLot;
  room: VsRoom;
  segments: VsRoomSegment[];
  photoUrl?: string;
  transcript: ChatMessage[];
  briefValidated: boolean;
  extraContext: Record<string, string>;
}

interface RoomRow {
  id: string;
  lot_id: string;
  plan_id: string | null;
  name: string | null;
  room_type: string;
  custom_label: string | null;
  surface_m2: number | null;
  position: Record<string, unknown> | null;
  polygon: unknown;
  touched: boolean;
  style_id: string | null;
  is_furnished: boolean;
  polygon_offset_x: number | null;
  polygon_offset_y: number | null;
  architectural_details: unknown;
  status: string;
  source: string;
  created_at: Date | string;
}

interface LotRow {
  id: string;
  project_id: string;
  name: string;
  floor_number: number;
  surface_m2: number | null;
  zone_data: unknown;
  status: string;
  source: string;
  confidence_avg: number | null;
  architectural_profile: unknown;
  operation_chat_context: unknown;
  created_at: Date | string;
}

interface SegmentRow {
  id: string;
  room_id: string;
  segment_index: number;
  type: string;
  notes: string | null;
  updated_at: Date | string;
}

interface ChatRow {
  transcript: unknown;
  brief_validated: boolean;
  extra_context: unknown;
}

interface PhotoRow {
  id: string;
  file_path: string;
}

function rowToRoom(row: RoomRow): VsRoom {
  return {
    id: row.id,
    lot_id: row.lot_id,
    plan_id: row.plan_id,
    name: row.name,
    room_type: row.room_type,
    custom_label: row.custom_label,
    surface_m2: row.surface_m2,
    position: row.position,
    polygon: (row.polygon as VsRoom["polygon"]) ?? null,
    touched: row.touched,
    style_id: row.style_id,
    is_furnished: row.is_furnished,
    polygon_offset_x: row.polygon_offset_x,
    polygon_offset_y: row.polygon_offset_y,
    // s32 HOTFIX P0 : normalize toujours (rows pre-migration 012 ont `{}` →
    // sub-fields undefined → crash UI). Garantit structure complète.
    architectural_details: normalizeArchitecturalDetails(
      row.architectural_details
    ),
    status: row.status as VsRoom["status"],
    source: row.source as VsRoom["source"],
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

function rowToLot(row: LotRow): VsLot {
  return {
    id: row.id,
    project_id: row.project_id,
    name: row.name,
    floor_number: row.floor_number,
    surface_m2: row.surface_m2,
    zone_data: (row.zone_data as Record<string, unknown>) ?? {},
    status: row.status as VsLot["status"],
    source: row.source as VsLot["source"],
    confidence_avg: row.confidence_avg,
    architectural_profile:
      (row.architectural_profile as VsLot["architectural_profile"]) ?? undefined,
    operation_chat_context:
      (row.operation_chat_context as OperationChatContext | undefined) ??
      undefined,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

function rowToSegment(row: SegmentRow): VsRoomSegment {
  return {
    id: row.id,
    room_id: row.room_id,
    segment_index: row.segment_index,
    type: row.type as VsRoomSegment["type"],
    notes: row.notes,
    updated_at:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
  };
}

export function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    str
  );
}

export async function loadChatContext(roomId: string): Promise<ChatContext | null> {
  const roomRes = await query<RoomRow>(
    `SELECT * FROM vs_rooms WHERE id = $1 LIMIT 1`,
    [roomId]
  );
  if (roomRes.rows.length === 0) return null;
  const room = rowToRoom(roomRes.rows[0]);

  const lotRes = await query<LotRow>(
    `SELECT * FROM vs_lots WHERE id = $1 LIMIT 1`,
    [room.lot_id]
  );
  if (lotRes.rows.length === 0) return null;
  const lot = rowToLot(lotRes.rows[0]);

  const segRes = await query<SegmentRow>(
    `SELECT id, room_id, segment_index, type, notes, updated_at
       FROM vs_room_segments
      WHERE room_id = $1
      ORDER BY segment_index ASC`,
    [roomId]
  );
  const segments = segRes.rows.map(rowToSegment);

  // Photo source : 1ère placée ou 1ère tout court
  let photoUrl: string | undefined;
  const photoRes = await query<PhotoRow>(
    `SELECT id, file_path
       FROM vs_photos
      WHERE room_id = $1
      ORDER BY is_placed_on_plan DESC, taken_at ASC NULLS LAST, id ASC
      LIMIT 1`,
    [roomId]
  );
  if (photoRes.rows.length > 0) {
    const photo = photoRes.rows[0];
    const ext = photo.file_path
      .toLowerCase()
      .slice(photo.file_path.lastIndexOf("."));
    const mime = MIME_BY_EXT[ext] ?? "image/jpeg";
    try {
      const buf = await readFile(photo.file_path);
      photoUrl = `data:${mime};base64,${buf.toString("base64")}`;
    } catch {
      // Photo introuvable : on continue sans
    }
  }

  // Transcript existant
  const chatRes = await query<ChatRow>(
    `SELECT transcript, brief_validated, extra_context
       FROM vs_room_chats WHERE room_id = $1 LIMIT 1`,
    [roomId]
  );
  let transcript: ChatMessage[] = [];
  let briefValidated = false;
  let extraContext: Record<string, string> = {};
  if (chatRes.rows.length > 0) {
    const r = chatRes.rows[0];
    if (Array.isArray(r.transcript)) {
      transcript = r.transcript as ChatMessage[];
    }
    briefValidated = !!r.brief_validated;
    if (r.extra_context && typeof r.extra_context === "object") {
      extraContext = r.extra_context as Record<string, string>;
    }
  }

  return {
    lot,
    room,
    segments,
    photoUrl,
    transcript,
    briefValidated,
    extraContext,
  };
}

export async function persistChatTurn(params: {
  roomId: string;
  newTranscript: ChatMessage[];
  briefValidated: boolean;
  extraContext: Record<string, string>;
}): Promise<void> {
  await query(
    `INSERT INTO vs_room_chats (room_id, transcript, brief_validated, extra_context)
     VALUES ($1, $2::jsonb, $3, $4::jsonb)
     ON CONFLICT (room_id) DO UPDATE
       SET transcript = EXCLUDED.transcript,
           brief_validated = EXCLUDED.brief_validated,
           extra_context = EXCLUDED.extra_context`,
    [
      params.roomId,
      JSON.stringify(params.newTranscript),
      params.briefValidated,
      JSON.stringify(params.extraContext),
    ]
  );
}

export async function persistOperationContext(
  lotId: string,
  patch: Partial<OperationChatContext>
): Promise<void> {
  if (Object.keys(patch).length === 0) return;
  // Merge en SQL (jsonb || ...) pour atomicité
  await query(
    `UPDATE vs_lots
        SET operation_chat_context = COALESCE(operation_chat_context, '{}'::jsonb) || $1::jsonb
      WHERE id = $2`,
    [JSON.stringify(patch), lotId]
  );
}

export function buildResponsePayload(params: {
  reply: ChatMessage;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: string }>;
  briefValidated: boolean;
  briefConfidence?: "high" | "medium" | "low" | null;
  fieldUpdates: Array<{ field: string; value: string; scope: "room" | "lot" }>;
  transcript: ChatMessage[];
}): {
  reply: ChatMessage;
  tool_calls: Array<{ name: string; args: Record<string, unknown>; result: string }>;
  brief_validated: boolean;
  brief_confidence: "high" | "medium" | "low" | null;
  field_updates: Array<{ field: string; value: string; scope: "room" | "lot" }>;
  transcript: ChatMessage[];
} {
  return {
    reply: params.reply,
    tool_calls: params.toolCalls,
    brief_validated: params.briefValidated,
    brief_confidence: params.briefConfidence ?? null,
    field_updates: params.fieldUpdates,
    transcript: params.transcript,
  };
}

export type ChatApiData = ReturnType<typeof buildResponsePayload>;

export type ChatApiResponse =
  | { success: true; data: ChatApiData }
  | { success: false; error: string };
