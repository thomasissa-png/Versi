/**
 * s32 (Phase 9) — GET /api/vs/rooms/[id]/chat
 *
 * Retourne le transcript courant + brief_validated + extra_context pour
 * permettre la reprise de la conversation après reload.
 *
 * Response : { transcript, brief_validated, extra_context }
 *
 * V1 sans auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, ensureDbReady } from "@/lib/vs/db";
import type { ApiResponse, RoomChatTranscript, ChatMessage } from "@/lib/vs/types";
import { isValidUUID } from "@/lib/vs/chat-api-helpers";

interface ChatRow {
  transcript: unknown;
  brief_validated: boolean;
  extra_context: unknown;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<RoomChatTranscript>>> {
  try {
    await ensureDbReady();
    const { id: roomId } = await params;

    if (!isValidUUID(roomId)) {
      return NextResponse.json(
        { success: false, error: "Identifiant de pièce invalide." },
        { status: 400 }
      );
    }

    const res = await query<ChatRow>(
      `SELECT transcript, brief_validated, extra_context
         FROM vs_room_chats WHERE room_id = $1 LIMIT 1`,
      [roomId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          room_id: roomId,
          transcript: [],
          brief_validated: false,
          extra_context: {},
        },
      });
    }

    const r = res.rows[0];
    return NextResponse.json({
      success: true,
      data: {
        room_id: roomId,
        transcript: Array.isArray(r.transcript)
          ? (r.transcript as ChatMessage[])
          : [],
        brief_validated: !!r.brief_validated,
        extra_context:
          r.extra_context && typeof r.extra_context === "object"
            ? (r.extra_context as Record<string, string>)
            : {},
      },
    });
  } catch (err) {
    console.error("[API] GET /api/vs/rooms/[id]/chat :", err);
    return NextResponse.json(
      { success: false, error: "Lecture du chat échouée." },
      { status: 500 }
    );
  }
}
