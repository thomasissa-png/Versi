/**
 * API Route — POST /api/vs/rooms/[id]/generate (refacto s30 V2)
 *
 * Refacto wire-grep s27.2 : avant s30, cette route appelait `generateVisual`
 * (pipeline V1 mono-photo). En V2, le mode prod = `coherent-visual-generator`
 * (anchor + secondaires cohérents par pièce). Cette route conserve son contrat
 * d'usage "génère un visuel pour cette pièce" mais pointe maintenant sur le
 * runner cohérent en mode mono-room (target=1, 1 photo).
 *
 * Pour les générations multi-pièces / multi-visuels, utiliser
 * POST /api/vs/projects/[id]/visuals/generate qui scope au projet entier.
 *
 * Body : { photo_id: string, style_id: string, structural_instructions?: string }
 * Response 201 : { visual_id }  (legacy contract, polling vs status reste valide)
 *
 * Mode legacy V1 si feature flag VS_COHERENT_PIPELINE=false (rollback safe).
 */

import { NextRequest, NextResponse } from "next/server";
import { query, ensureDbReady } from "@/lib/vs/db";
import { generateVisual } from "@/lib/vs/visual-generator";
import { generateCoherentVisuals } from "@/lib/vs/coherent-visual-generator";
import { storeVisualImage } from "@/lib/vs/visual-storage";
import { preprocessPhoto } from "@/lib/vs/photo-preprocessor";
import type { VsVisual, VsPhoto, VsRoom, ApiResponse, ZonePolygonPoint } from "@/lib/vs/types";
import { getStyle } from "@/lib/vs/styles";
import { readFile } from "fs/promises";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

const COHERENT_PIPELINE_DEFAULT = process.env.VS_COHERENT_PIPELINE !== "false";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ visual_id: string }>>> {
  try {
    await ensureDbReady();
    const { id: roomId } = await params;
    if (!isValidUUID(roomId)) {
      return NextResponse.json({ success: false, error: "Identifiant pièce invalide." }, { status: 400 });
    }

    const body = (await request.json()) as {
      photo_id: string; style_id: string;
      structural_instructions?: string | null;
    };
    if (!body.photo_id || !isValidUUID(body.photo_id)) {
      return NextResponse.json({ success: false, error: "Identifiant photo invalide." }, { status: 400 });
    }
    if (!body.style_id || !getStyle(body.style_id)) {
      return NextResponse.json({ success: false, error: "style_id invalide." }, { status: 400 });
    }
    const structuralInstructions = body.structural_instructions?.trim() || null;
    if (structuralInstructions && structuralInstructions.length > 500) {
      return NextResponse.json({ success: false, error: "Description travaux > 500 caractères." }, { status: 400 });
    }

    const roomResult = await query<VsRoom>("SELECT * FROM vs_rooms WHERE id = $1", [roomId]);
    if (roomResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Pièce introuvable." }, { status: 404 });
    }
    const room = roomResult.rows[0];

    const photoResult = await query<VsPhoto>(
      "SELECT * FROM vs_photos WHERE id = $1 AND room_id = $2",
      [body.photo_id, roomId]
    );
    if (photoResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Photo introuvable pour cette pièce." }, { status: 404 });
    }
    const photo = photoResult.rows[0];

    const countResult = await query<{ count: string }>(
      "SELECT COUNT(*) as count FROM vs_visuals WHERE photo_id = $1 AND style_id = $2",
      [body.photo_id, body.style_id]
    );
    const iterationCount = parseInt(countResult.rows[0].count, 10);

    const visualResult = await query<VsVisual>(
      `INSERT INTO vs_visuals (photo_id, style_id, status, iteration_count)
       VALUES ($1, $2, 'processing', $3)
       RETURNING *`,
      [body.photo_id, body.style_id, iterationCount]
    );
    const visual = visualResult.rows[0];

    // Branche V2 cohérent (par défaut) ou V1 legacy (rollback)
    if (COHERENT_PIPELINE_DEFAULT) {
      void runCoherentMonoRoom(visual.id, photo, room, body.style_id, structuralInstructions);
    } else {
      void runLegacyMono(visual.id, photo, room, body.style_id, structuralInstructions);
    }

    return NextResponse.json({ success: true, data: { visual_id: visual.id } }, { status: 201 });
  } catch (err) {
    console.error("[API] POST /api/vs/rooms/[id]/generate erreur:", err);
    return NextResponse.json(
      { success: false, error: "Impossible de lancer la création du visuel." },
      { status: 500 }
    );
  }
}

// ─── V2 cohérent (mono-room target=1) ─────────────────────────────

async function runCoherentMonoRoom(
  visualId: string,
  photo: VsPhoto,
  room: VsRoom,
  styleId: string,
  structuralInstructions: string | null
): Promise<void> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const hasRealKey = apiKey && apiKey !== "..." && apiKey.length > 10;
    if (!hasRealKey) {
      // Fallback simulation — comportement preserve du V1 pour dev offline
      await new Promise((r) => setTimeout(r, 1500));
      await query(
        `UPDATE vs_visuals SET status = 'generated', file_path = 'placeholder',
                prompt_used = 'Mode simulation V2 — OPENAI_API_KEY non configurée'
         WHERE id = $1`,
        [visualId]
      );
      return;
    }

    const buffer = await readFile(photo.file_path);
    const ext = photo.file_path.toLowerCase().slice(photo.file_path.lastIndexOf("."));
    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
      ".png": "image/png", ".webp": "image/webp", ".heic": "image/heic",
    };
    const declaredMime = mimeMap[ext] ?? "image/jpeg";
    const preprocessed = await preprocessPhoto(buffer, declaredMime);

    // Polygone room — fallback rectangle si room.polygon absent
    const polygon: ZonePolygonPoint[] = room.polygon && room.polygon.length >= 3
      ? room.polygon
      : [
          { x_percent: 0, y_percent: 0 }, { x_percent: 100, y_percent: 0 },
          { x_percent: 100, y_percent: 100 }, { x_percent: 0, y_percent: 100 },
        ];

    // La ligne vs_visuals déjà créée plus haut sera redondante avec celle créée
    // par generateCoherentVisuals (qui INSERT son ancre). On supprime la ligne
    // 'processing' pour éviter le doublon orphelin, puis on délègue.
    await query(`DELETE FROM vs_visuals WHERE id = $1 AND status = 'processing'`, [visualId]);

    await generateCoherentVisuals(
      {
        room_id: room.id,
        room_polygon: polygon,
        photos: [{
          id: photo.id, room_id: photo.room_id, file_path: photo.file_path,
          position_x: photo.position_x ?? 0.5, position_y: photo.position_y ?? 0.5,
          angle_degrees: photo.angle_degrees,
          buffer: preprocessed.buffer, mime_type: "image/jpeg",
        }],
        style_id: styleId,
        room_type: room.room_type,
        surface_m2: room.surface_m2 ? Number(room.surface_m2) : null,
        comment_text: null,
        target_visual_count: 1,
        user_answers: [],
        structural_instructions: structuralInstructions,
      },
      { storeImage: storeVisualImage }
    );
  } catch (err) {
    console.error(`[runCoherentMonoRoom] visual ${visualId} fatal:`, err);
    await query(
      `UPDATE vs_visuals SET status = 'failed', error_message = $1 WHERE id = $2`,
      [err instanceof Error ? err.message : "Erreur inconnue", visualId]
    ).catch(() => {});
  }
}

// ─── V1 legacy (rollback safe) ─────────────────────────────────────

async function runLegacyMono(
  visualId: string, photo: VsPhoto, room: VsRoom,
  styleId: string, structuralInstructions: string | null
): Promise<void> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const hasRealKey = apiKey && apiKey !== "..." && apiKey.length > 10;
    if (!hasRealKey) {
      await new Promise((r) => setTimeout(r, 3000));
      await query(
        `UPDATE vs_visuals SET status = 'generated', file_path = 'placeholder',
                prompt_used = 'Mode simulation' WHERE id = $1`,
        [visualId]
      );
      return;
    }
    const buf = await readFile(photo.file_path);
    const b64 = buf.toString("base64");
    const ext = photo.file_path.substring(photo.file_path.lastIndexOf(".")).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
      ".png": "image/png", ".webp": "image/webp",
    };
    const mimeType = mimeMap[ext] || "image/jpeg";
    const result = await generateVisual(
      b64, mimeType, room.room_type, styleId,
      room.surface_m2 ? Number(room.surface_m2) : null,
      photo.angle_description, structuralInstructions
    );
    if (!result.ok) {
      await query(
        `UPDATE vs_visuals SET status = 'failed', error_message = $1 WHERE id = $2`,
        [result.error, visualId]
      );
      return;
    }
    const filePath = await storeVisualImage(result.image_base64, `legacy-${visualId}.png`);
    await query(
      `UPDATE vs_visuals SET status = 'generated', file_path = $1, prompt_used = $2 WHERE id = $3`,
      [filePath, result.prompt_used, visualId]
    );
  } catch (err) {
    console.error(`[runLegacyMono] visual ${visualId} fatal:`, err);
    await query(
      `UPDATE vs_visuals SET status = 'failed', error_message = $1 WHERE id = $2`,
      [err instanceof Error ? err.message : "Erreur inconnue", visualId]
    ).catch(() => {});
  }
}
