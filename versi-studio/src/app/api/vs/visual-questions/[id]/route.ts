/**
 * API Route — PATCH /api/vs/visual-questions/[id]
 *
 * Soumet une réponse Thomas à une question d'ambiguïté T1-T5. Met à jour
 * vs_visual_questions.status='answered' + user_answer + answered_at.
 *
 * Effet métier (selon trigger_type) :
 *  - T1/T5 (surface) : si la réponse est un nombre, on met à jour vs_rooms.surface_m2
 *  - T2 (photo manquante) : si "passer à 0", on set vs_room_settings.target_visual_count = 0
 *  - T3/T4 (style/photos) : on stocke juste la réponse pour réinjection prompt
 *
 * Le frontend re-déclenche /preflight après chaque réponse pour vérifier
 * s'il reste des questions bloquantes.
 *
 * Body : { answer: string }
 * Response 200 : { question_id: string, status: 'answered' }
 */

import { NextRequest, NextResponse } from "next/server";
import { ensureDbReady, query, withTransaction } from "@/lib/vs/db";
import type { ApiResponse } from "@/lib/vs/types";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

const SURFACE_TRIGGERS = new Set(["surface_aberrante", "surface_inconnue"]);

interface AnswerResponse {
  question_id: string;
  status: "answered";
  side_effect: string | null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<AnswerResponse>>> {
  try {
    await ensureDbReady();
    const { id: questionId } = await params;
    if (!isValidUUID(questionId)) {
      return NextResponse.json({ success: false, error: "Identifiant question invalide." }, { status: 400 });
    }

    const body = (await request.json()) as { answer?: string };
    const answer = body.answer?.trim();
    if (!answer || answer.length > 500) {
      return NextResponse.json(
        { success: false, error: "Réponse vide ou trop longue (max 500 caractères)." },
        { status: 400 }
      );
    }

    // Charge la question
    const qResult = await query<{
      id: string; project_id: string; room_id: string | null;
      trigger_type: string; status: string;
    }>(
      `SELECT id, project_id, room_id, trigger_type, status
         FROM vs_visual_questions WHERE id = $1`,
      [questionId]
    );
    if (qResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Question introuvable." }, { status: 404 });
    }
    const question = qResult.rows[0];
    if (question.status !== "asked") {
      return NextResponse.json(
        { success: false, error: `Question déjà ${question.status}.` },
        { status: 409 }
      );
    }

    // Side-effects métier dans une transaction
    let sideEffect: string | null = null;
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE vs_visual_questions
            SET user_answer = $2, answered_at = NOW(), status = 'answered'
          WHERE id = $1 AND status = 'asked'`,
        [questionId, answer]
      );

      if (!question.room_id) return;

      if (SURFACE_TRIGGERS.has(question.trigger_type)) {
        const num = Number.parseFloat(answer.replace(",", ".").replace(/[^\d.]/g, ""));
        if (Number.isFinite(num) && num >= 4 && num <= 200) {
          await client.query(
            `UPDATE vs_rooms SET surface_m2 = $2 WHERE id = $1`,
            [question.room_id, num]
          );
          sideEffect = `surface_m2 mise à jour : ${num} m²`;
        }
      } else if (question.trigger_type === "photo_manquante") {
        const wantsZero = /\b(passer à 0|0|zero|désactiver|desactiver)\b/i.test(answer);
        if (wantsZero) {
          await client.query(
            `INSERT INTO vs_room_settings (room_id, target_visual_count)
             VALUES ($1, 0)
             ON CONFLICT (room_id) DO UPDATE SET target_visual_count = 0, updated_at = NOW()`,
            [question.room_id]
          );
          sideEffect = "target_visual_count remis à 0 (pièce désactivée)";
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: { question_id: questionId, status: "answered", side_effect: sideEffect },
    });
  } catch (err) {
    console.error("[API] PATCH /api/vs/visual-questions/[id] erreur:", err);
    return NextResponse.json(
      { success: false, error: "Réponse non enregistrée — réessayez." },
      { status: 500 }
    );
  }
}
