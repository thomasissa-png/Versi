/**
 * API Route — POST /api/vs/visuals/[id]/regenerate
 *
 * EC-5 Étape 4 v2 : régénération individuelle d'un visuel sans toucher
 * aux autres. Conserve `coherence_mode` + `anchor_visual_id` du visuel
 * d'origine pour préserver la cohérence de la pièce.
 *
 * Cas couverts :
 *  - Régénérer une ancre : nouvelle signature visuelle, secondaires existants
 *    conservés (warning UI : "les autres visuels de cette pièce ne seront pas
 *    régénérés automatiquement")
 *  - Régénérer un secondaire : reload de l'ancre persistée, réutilisation de
 *    sa signature, génération d'un nouveau secondaire au même angle
 *
 * Body : (vide)
 * Response 200 : { visual_id, file_path, status: 'generated' }
 */

import { NextRequest, NextResponse } from "next/server";
import { ensureDbReady, query } from "@/lib/vs/db";
import { storeVisualImage, loadVisualImage } from "@/lib/vs/visual-storage";
import { preprocessPhoto } from "@/lib/vs/photo-preprocessor";
import { imagesEditLimiter } from "@/lib/vs/openai-rate-limiter";
import {
  buildVisualPromptAnchor,
  buildVisualPromptSecondary,
  type VisualSignature,
} from "@/lib/vs/visual-generator";
import { readFile } from "node:fs/promises";
import OpenAI, { toFile } from "openai";
import type {
  ApiResponse,
  ArchitecturalDetails,
  ArchitecturalProfile,
} from "@/lib/vs/types";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

let _openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openaiClient;
}

interface RegenerateResponse {
  visual_id: string;
  file_path: string;
  status: "generated";
  kind: "anchor" | "secondary";
}

interface VisualContextRow {
  visual_id: string;
  photo_id: string;
  style_id: string;
  anchor_visual_id: string | null;
  coherence_mode: "multi_image_native" | "textual_signature" | null;
  visual_signature_json: VisualSignature | null;
  anchor_signature_json: VisualSignature | null;
  anchor_file_path: string | null;
  photo_file_path: string;
  angle_degrees: number | null;
  room_type: string;
  surface_m2: number | null;
  comment_text: string | null;
  structural_instructions: string | null;
  /** s32 (Thomas prod) — détails architecturaux pièce. */
  architectural_details: ArchitecturalDetails | null;
  /** s32 (Thomas prod) — profil architectural lot parent. */
  architectural_profile: ArchitecturalProfile | null;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<RegenerateResponse>>> {
  try {
    await ensureDbReady();
    const { id: visualId } = await params;
    if (!isValidUUID(visualId)) {
      return NextResponse.json({ success: false, error: "Identifiant visuel invalide." }, { status: 400 });
    }

    const ctx = await loadVisualContext(visualId);
    if (!ctx) {
      return NextResponse.json({ success: false, error: "Visuel introuvable." }, { status: 404 });
    }
    const isAnchor = ctx.anchor_visual_id === null;

    // Charger photo source
    const photoRaw = await readFile(ctx.photo_file_path);
    const photoExt = ctx.photo_file_path.toLowerCase().slice(ctx.photo_file_path.lastIndexOf("."));
    const photoMime = photoExt === ".png" ? "image/png" : photoExt === ".webp" ? "image/webp" : "image/jpeg";
    const preprocessed = await preprocessPhoto(photoRaw, photoMime);
    const photoFile = await toFile(preprocessed.buffer, "photo.jpg", { type: "image/jpeg" });

    let prompt: string;
    let imageInputs: ReturnType<typeof toFile> extends Promise<infer T> ? T[] : never;
    let coherenceMode: "multi_image_native" | "textual_signature" | null = null;

    if (isAnchor) {
      // Régénération ancre : on reconstruit le prompt ancre, secondaires non touchés
      prompt = buildVisualPromptAnchor({
        roomType: ctx.room_type,
        styleId: ctx.style_id,
        surfaceM2: ctx.surface_m2,
        angleDegrees: ctx.angle_degrees,
        commentText: ctx.comment_text,
        userAnswers: [],
        structuralInstructions: ctx.structural_instructions,
        architecturalProfile: ctx.architectural_profile ?? null,
        architecturalDetails: ctx.architectural_details ?? null,
      });
      imageInputs = [photoFile];
    } else {
      // Régénération secondaire : recharger l'ancre depuis storage
      if (!ctx.anchor_signature_json) {
        return NextResponse.json(
          { success: false, error: "Signature ancre introuvable — régénérez d'abord l'ancre." },
          { status: 422 }
        );
      }
      prompt = buildVisualPromptSecondary({
        roomType: ctx.room_type,
        styleId: ctx.style_id,
        surfaceM2: ctx.surface_m2,
        angleDegrees: ctx.angle_degrees,
        commentText: ctx.comment_text,
        userAnswers: [],
        structuralInstructions: ctx.structural_instructions,
        anchorSignature: ctx.anchor_signature_json,
        architecturalProfile: ctx.architectural_profile ?? null,
        architecturalDetails: ctx.architectural_details ?? null,
      });
      imageInputs = [photoFile];
      coherenceMode = "textual_signature"; // par défaut

      // Tentative multi-image native si l'ancre est sur disque
      if (ctx.anchor_file_path) {
        const anchorBytes = await loadVisualImage(ctx.anchor_file_path);
        if (anchorBytes) {
          const anchorFile = await toFile(anchorBytes, "anchor.png", { type: "image/png" });
          imageInputs = [photoFile, anchorFile];
          coherenceMode = "multi_image_native";
        }
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === "..." || apiKey.length < 10) {
      return NextResponse.json(
        { success: false, error: "OPENAI_API_KEY non configurée — régénération impossible." },
        { status: 503 }
      );
    }

    await imagesEditLimiter.acquireToken();
    const openai = getOpenAI();
    const editParams = {
      model: "gpt-image-2" as const,
      image: (imageInputs.length === 1
        ? imageInputs[0]
        : imageInputs as unknown) as Parameters<typeof openai.images.edit>[0]["image"],
      prompt,
      quality: "high" as const,
      size: "auto" as const,
    };
    let response;
    try {
      response = await openai.images.edit(editParams);
    } catch (multiErr) {
      // Fallback signature textuelle si multi-image refusé
      if (imageInputs.length > 1) {
        console.warn("[regenerate] Multi-image refusé, fallback textual_signature:", multiErr);
        await imagesEditLimiter.acquireToken();
        response = await openai.images.edit({
          ...editParams,
          image: imageInputs[0] as unknown as Parameters<typeof openai.images.edit>[0]["image"],
        });
        coherenceMode = "textual_signature";
      } else {
        throw multiErr;
      }
    }
    const b64 = response.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json(
        { success: false, error: "OpenAI a retourné une réponse vide — réessayez." },
        { status: 502 }
      );
    }

    const newPath = await storeVisualImage(b64, `regen-${visualId}.png`);

    // UPDATE in-place (préserve photo_id, style_id, anchor_visual_id)
    await query(
      `UPDATE vs_visuals
          SET file_path = $2,
              prompt_used = $3,
              status = 'generated',
              error_message = NULL,
              coherence_mode = $4,
              iteration_count = iteration_count + 1
        WHERE id = $1`,
      [visualId, newPath, prompt, isAnchor ? null : coherenceMode]
    );

    return NextResponse.json({
      success: true,
      data: {
        visual_id: visualId, file_path: newPath, status: "generated",
        kind: isAnchor ? "anchor" : "secondary",
      },
    });
  } catch (err) {
    console.error("[API] POST /api/vs/visuals/[id]/regenerate erreur:", err);
    return NextResponse.json(
      { success: false, error: "Régénération échouée — réessayez." },
      { status: 500 }
    );
  }
}

async function loadVisualContext(visualId: string): Promise<VisualContextRow | null> {
  const result = await query<VisualContextRow>(
    `
    SELECT
      v.id              AS visual_id,
      v.photo_id        AS photo_id,
      v.style_id        AS style_id,
      v.anchor_visual_id AS anchor_visual_id,
      v.coherence_mode  AS coherence_mode,
      v.visual_signature_json AS visual_signature_json,
      av.visual_signature_json AS anchor_signature_json,
      av.file_path      AS anchor_file_path,
      p.file_path       AS photo_file_path,
      p.angle_degrees   AS angle_degrees,
      r.room_type       AS room_type,
      r.surface_m2::FLOAT AS surface_m2,
      rs.comment_text   AS comment_text,
      rs.comment_text   AS structural_instructions,
      r.architectural_details AS architectural_details,
      l.architectural_profile AS architectural_profile
      FROM vs_visuals v
      LEFT JOIN vs_visuals av ON av.id = v.anchor_visual_id
      JOIN vs_photos p ON p.id = v.photo_id
      JOIN vs_rooms r ON r.id = p.room_id
      JOIN vs_lots l ON l.id = r.lot_id
      LEFT JOIN vs_room_settings rs ON rs.room_id = r.id
     WHERE v.id = $1
    `,
    [visualId]
  );
  return result.rows[0] ?? null;
}
