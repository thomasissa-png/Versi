/**
 * s32 (Phase 9) — POST /api/vs/rooms/[id]/chat/message
 *
 * Envoie un message utilisateur, reçoit la réponse de l'IA architecte.
 *
 * Body : { message: string }
 * Response : { reply, tool_calls, brief_validated, field_updates, transcript }
 *
 * Le client est responsable d'appliquer field_updates (PATCH /api/vs/rooms/:id
 * et /api/vs/lots/:id) côté UI. L'API persiste juste le transcript et
 * operation_chat_context.
 *
 * V1 sans auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { ensureDbReady } from "@/lib/vs/db";
import type { ChatMessage } from "@/lib/vs/types";
import {
  loadChatContext,
  persistChatTurn,
  persistOperationContext,
  isValidUUID,
  buildResponsePayload,
  type ChatApiResponse,
} from "@/lib/vs/chat-api-helpers";
import { processChatMessage } from "@/lib/vs/conversational-architect-agent";

const MAX_MESSAGE_LEN = 2000;

export async function POST(
  request: NextRequest,
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

    let body: { message?: unknown };
    try {
      body = (await request.json()) as { message?: unknown };
    } catch {
      return NextResponse.json(
        { success: false, error: "JSON invalide." },
        { status: 400 }
      );
    }

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json(
        { success: false, error: "Message vide." },
        { status: 400 }
      );
    }
    if (message.length > MAX_MESSAGE_LEN) {
      return NextResponse.json(
        {
          success: false,
          error: `Message trop long (max ${MAX_MESSAGE_LEN} caractères).`,
        },
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

    const userMsg: ChatMessage = {
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };

    const result = await processChatMessage({
      roomId,
      userMessage: message,
      context: {
        lot: ctx.lot,
        room: ctx.room,
        photoUrl: ctx.photoUrl,
        segments: ctx.segments,
        transcript: ctx.transcript,
      },
    });

    const newTranscript: ChatMessage[] = [
      ...ctx.transcript,
      userMsg,
      result.reply,
    ];

    const mergedExtra = { ...ctx.extraContext };
    for (const [k, v] of Object.entries(result.extraContextPatch)) {
      mergedExtra[k] = v;
    }

    const briefValidated = ctx.briefValidated || result.briefValidated;

    await persistChatTurn({
      roomId,
      newTranscript,
      briefValidated,
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
        briefValidated,
        fieldUpdates: result.fieldUpdates,
        transcript: newTranscript,
      }),
    });
  } catch (err) {
    console.error("[API] POST /api/vs/rooms/[id]/chat/message :", err);
    return NextResponse.json(
      { success: false, error: "Le traitement du message a échoué." },
      { status: 500 }
    );
  }
}
