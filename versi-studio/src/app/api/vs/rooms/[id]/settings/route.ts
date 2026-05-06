/**
 * API Route — PUT /api/vs/rooms/[id]/settings
 *
 * Met à jour les paramètres visuels d'une pièce (sidebar Étape 4 v2) :
 *  - target_visual_count : 0-5 (slider)
 *  - comment_text : commentaire libre Thomas (max 500 char)
 *
 * Pattern UPSERT : crée la ligne vs_room_settings si absente. Cohérent avec
 * le default applicatif (target = 1 à la création de la room).
 *
 * P1 persona Friction 2 (inversion ordre) : si target_visual_count > 0 mais
 * 0 photo placée → on flag warning_pending dans la response (l'UI peut alors
 * afficher un hint "place une photo" sans bloquer la saisie).
 *
 * Body : { target_visual_count: number, comment_text?: string | null }
 * Response 200 : { room_id, target_visual_count, comment_text, warning_pending }
 */

import { NextRequest, NextResponse } from "next/server";
import { ensureDbReady, query } from "@/lib/vs/db";
import type { ApiResponse } from "@/lib/vs/types";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

interface SettingsResponse {
  room_id: string;
  target_visual_count: number;
  comment_text: string | null;
  /** P1 persona : true si target>0 mais 0 photo placée (UX hint, pas bloquant). */
  warning_pending: boolean;
}

/**
 * GET retourne les settings courants d'une pièce (UI Vague 3b — pré-remplir
 * sidebar). Si la ligne n'existe pas encore, retourne le defaut applicatif
 * (target=1, comment=null).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<SettingsResponse>>> {
  try {
    await ensureDbReady();
    const { id: roomId } = await params;
    if (!isValidUUID(roomId)) {
      return NextResponse.json({ success: false, error: "Identifiant pièce invalide." }, { status: 400 });
    }
    const row = await query<{
      target_visual_count: number;
      comment_text: string | null;
    }>(
      // s32 #P3 (Thomas prod) — default applicatif aligné sur le default DB (3).
      `SELECT COALESCE(rs.target_visual_count, 3) AS target_visual_count, rs.comment_text
         FROM vs_rooms r
         LEFT JOIN vs_room_settings rs ON rs.room_id = r.id
        WHERE r.id = $1`,
      [roomId]
    );
    if (row.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Pièce introuvable." }, { status: 404 });
    }
    const target = row.rows[0].target_visual_count;
    let warningPending = false;
    if (target > 0) {
      const photosCount = await query<{ count: string }>(
        `SELECT COUNT(*)::TEXT AS count FROM vs_photos
          WHERE room_id = $1 AND is_placed_on_plan = true`,
        [roomId]
      );
      warningPending = Number.parseInt(photosCount.rows[0]?.count ?? "0", 10) === 0;
    }
    return NextResponse.json({
      success: true,
      data: {
        room_id: roomId,
        target_visual_count: target,
        comment_text: row.rows[0].comment_text,
        warning_pending: warningPending,
      },
    });
  } catch (err) {
    console.error("[API] GET /api/vs/rooms/[id]/settings erreur:", err);
    return NextResponse.json(
      { success: false, error: "Paramètres non chargés — réessayez." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<SettingsResponse>>> {
  try {
    await ensureDbReady();
    const { id: roomId } = await params;
    if (!isValidUUID(roomId)) {
      return NextResponse.json({ success: false, error: "Identifiant pièce invalide." }, { status: 400 });
    }

    const body = (await request.json()) as {
      target_visual_count?: number;
      comment_text?: string | null;
    };

    // s32 fix P2 (Thomas iter4) — PATCH partiel : target_visual_count est
    // désormais OPTIONNEL. Si absent, on préserve la valeur DB existante via
    // COALESCE côté UPDATE (default 1 à la création). Le commentaire est
    // toujours pris en compte (string vide => null).
    const targetProvided = Number.isInteger(body.target_visual_count);
    const target = targetProvided ? (body.target_visual_count as number) : null;
    if (targetProvided && (target! < 0 || target! > 5)) {
      return NextResponse.json(
        { success: false, error: "target_visual_count doit être un entier 0-5." },
        { status: 400 }
      );
    }
    const commentProvided = Object.prototype.hasOwnProperty.call(body, "comment_text");
    const comment = body.comment_text == null ? null : String(body.comment_text).trim().slice(0, 500);

    // Vérifier que la pièce existe
    const roomCheck = await query<{ id: string }>("SELECT id FROM vs_rooms WHERE id = $1", [roomId]);
    if (roomCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Pièce introuvable." }, { status: 404 });
    }

    // INSERT : COALESCE($2, 3) → si target absent à la création, default 3 (s32 #P3).
    // UPDATE : COALESCE(EXCLUDED.target, current) → préserve la valeur existante
    // si l'appelant n'a pas fourni target. Idem pour comment si absent.
    await query(
      `INSERT INTO vs_room_settings (room_id, target_visual_count, comment_text)
       VALUES ($1, COALESCE($2, 3), $3)
       ON CONFLICT (room_id) DO UPDATE
         SET target_visual_count = COALESCE(EXCLUDED.target_visual_count, vs_room_settings.target_visual_count),
             comment_text = CASE WHEN $4::boolean THEN EXCLUDED.comment_text ELSE vs_room_settings.comment_text END,
             updated_at = NOW()`,
      [roomId, target, comment, commentProvided]
    );

    // Relire la valeur finale (target peut avoir été préservée) pour la réponse.
    const finalRow = await query<{ target_visual_count: number; comment_text: string | null }>(
      `SELECT target_visual_count, comment_text FROM vs_room_settings WHERE room_id = $1`,
      [roomId]
    );
    const finalTarget = finalRow.rows[0]?.target_visual_count ?? 3;
    const finalComment = finalRow.rows[0]?.comment_text ?? null;

    // P1 persona : flag warning si target>0 mais 0 photo placée
    let warningPending = false;
    if (finalTarget > 0) {
      const photosCount = await query<{ count: string }>(
        `SELECT COUNT(*)::TEXT AS count FROM vs_photos
          WHERE room_id = $1 AND is_placed_on_plan = true`,
        [roomId]
      );
      warningPending = Number.parseInt(photosCount.rows[0]?.count ?? "0", 10) === 0;
    }

    return NextResponse.json({
      success: true,
      data: {
        room_id: roomId,
        target_visual_count: finalTarget,
        comment_text: finalComment,
        warning_pending: warningPending,
      },
    });
  } catch (err) {
    console.error("[API] PUT /api/vs/rooms/[id]/settings erreur:", err);
    return NextResponse.json(
      { success: false, error: "Paramètres non enregistrés — réessayez." },
      { status: 500 }
    );
  }
}

// s32 fix P2 (Thomas iter4) — alignement method : le wizard envoie PATCH,
// le handler historique exporte PUT. On expose les deux pour éviter 405.
export const PATCH = PUT;
