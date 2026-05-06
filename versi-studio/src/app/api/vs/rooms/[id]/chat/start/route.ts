/**
 * s32 (Phase 9) — POST /api/vs/rooms/[id]/chat/start
 *
 * Initialise (ou réinitialise) la conversation chat architecte pour la pièce.
 * Le LLM produit la synthèse 3 sections + 1ère question + suggestions dynamiques.
 *
 * Body : aucun (POST vide).
 * Response : { reply, tool_calls, brief_validated, field_updates, transcript }
 *   - reply.suggestions : 2-4 réponses cliquables dynamiques
 *   - field_updates : pills à pré-remplir côté UI (rare au tour 0 mais possible)
 *
 * Persistance :
 *   - vs_room_chats UPSERT (transcript reset au tour 0)
 *   - vs_lots.operation_chat_context patch si applicable
 *
 * V1 sans auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { ensureDbReady } from "@/lib/vs/db";
import {
  loadChatContext,
  persistChatTurn,
  persistOperationContext,
  isValidUUID,
  buildResponsePayload,
  type ChatApiResponse,
} from "@/lib/vs/chat-api-helpers";
import { processChatMessage } from "@/lib/vs/conversational-architect-agent";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ChatApiResponse>> {
  try {
    await ensureDbReady();
    const { id: roomId } = await params;

    if (!isValidUUID(roomId)) {
      return NextResponse.json(
        { success: false, error: "Identifiant de pièce invalide." },
        { status: 400 }
      );
    }

    const ctx = await loadChatContext(roomId);
    if (!ctx) {
      return NextResponse.json(
        { success: false, error: "Pièce introuvable." },
        { status: 404 }
      );
    }

    // Reset transcript au start
    const result = await processChatMessage({
      roomId,
      userMessage: null,
      context: {
        lot: ctx.lot,
        room: ctx.room,
        photoUrl: ctx.photoUrl,
        segments: ctx.segments,
        transcript: [],
      },
    });

    const newTranscript = [result.reply];
    const mergedExtra = { ...ctx.extraContext };
    for (const [k, v] of Object.entries(result.extraContextPatch)) {
      mergedExtra[k] = v;
    }

    await persistChatTurn({
      roomId,
      newTranscript,
      briefValidated: result.briefValidated,
      extraContext: mergedExtra,
    });

    if (Object.keys(result.operationContextPatch).length > 0) {
      await persistOperationContext(ctx.lot.id, result.operationContextPatch);
    }

    return NextResponse.json({
      success: true,
      data: buildResponsePayload({
        reply: result.reply,
        toolCalls: result.toolCalls,
        briefValidated: result.briefValidated,
        fieldUpdates: result.fieldUpdates,
        transcript: newTranscript,
      }),
    });
  } catch (err) {
    console.error("[API] POST /api/vs/rooms/[id]/chat/start :", err);
    return NextResponse.json(
      { success: false, error: "Le démarrage du chat a échoué." },
      { status: 500 }
    );
  }
}
