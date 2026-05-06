/**
 * Versi Studio — Génération cohérente multi-visuels Étape 4 v2
 *
 * Orchestre le pipeline §5 : pour une pièce avec target_visual_count = N,
 * génère 1 visuel ancre puis N-1 visuels secondaires partageant la même
 * signature visuelle (palette, meubles, finitions, lumière).
 *
 * Pipeline par pièce :
 *   1. Sélection photo ancre (déterministe — la plus proche du centroïde)
 *   2. Génération visuel ancre via gpt-image-2 images.edit
 *   3. Extraction signature visuelle ancre via gpt-4o-mini vision
 *   4. Génération N-1 secondaires (multi-image natif si supporté, sinon
 *      fallback signature textuelle)
 *
 * Persistance : vs_visuals avec anchor_visual_id (NULL pour ancres),
 * visual_signature_json (présent uniquement sur ancres), coherence_mode
 * ('multi_image_native' | 'textual_signature' pour secondaires uniquement).
 *
 * Source : docs/ia/visuals-step-v2-pipeline.md §5.
 */

import OpenAI, { toFile } from "openai";
import { query } from "@/lib/vs/db";
import {
  polygonCentroid,
  type ZonePolygonPoint,
  type VsRoomSegment,
  type ArchitecturalDetails,
  type ArchitecturalProfile,
} from "@/lib/vs/types";
import { imagesEditLimiter } from "@/lib/vs/openai-rate-limiter";
import {
  buildVisualPromptAnchor,
  buildVisualPromptSecondary,
  extractVisualSignature,
  type AnchorPromptParams,
  type VisualSignature,
} from "@/lib/vs/visual-generator";
import { buildSegmentDescriptionEn } from "@/lib/vs/ui/segment-prompt";

// ─── Types ─────────────────────────────────────────────────────────

const PROMPT_VERSION = "v2.0.0";

export interface PlacedPhoto {
  id: string;
  room_id: string;
  file_path: string;
  position_x: number; // 0.0 - 1.0 (canvas plan)
  position_y: number;
  angle_degrees: number | null;
  /** Bytes de la photo (déjà pré-traitée via photo-preprocessor). */
  buffer: Buffer;
  /** MIME type (toujours image/jpeg après preprocessing). */
  mime_type: string;
}

export interface CoherentGenerationInput {
  room_id: string;
  /** Polygone de la pièce (coordonnées % canvas, 0-100) — pour calcul centroïde. */
  room_polygon: ZonePolygonPoint[];
  /** Photos placées sur cette pièce avec position + angle. */
  photos: PlacedPhoto[];
  style_id: string;
  room_type: string;
  surface_m2: number | null;
  comment_text: string | null;
  target_visual_count: number;
  /** Réponses utilisateur aux questions T1-T5 pour cette pièce. */
  user_answers: string[];
  /** Instructions structurelles (extraites du commentaire si T3 a confirmé). */
  structural_instructions: string | null;
  /** s32 (autopilot) — true = pièce déjà meublée à transformer/améliorer,
   *  false = pièce vide à meubler intégralement. Default true (back-compat). */
  is_furnished?: boolean;
  /** s32 (autopilot — Feature B) — segments annotés du polygone. Si vide ou
   *  100% 'wall', aucune injection prompt (pas de pollution). */
  segments?: VsRoomSegment[];
  /** s32 (Thomas prod) — profil architectural marchand niveau lot (5 champs). */
  architectural_profile?: ArchitecturalProfile | null;
  /** s32 (Thomas prod) — détails architecturaux pièce (saisi + Vision). */
  architectural_details?: ArchitecturalDetails | null;
}

export interface SecondaryVisualResult {
  visual_id: string;
  image_base64: string;
  prompt_used: string;
  coherence_mode: "multi_image_native" | "textual_signature";
}

export interface CoherentGenerationResult {
  anchor: {
    visual_id: string;
    image_base64: string;
    prompt_used: string;
    signature_json: VisualSignature;
  };
  secondaries: SecondaryVisualResult[];
  /** Visuels qui ont échoué (EC-5 — les autres restent valides). */
  failures: Array<{ photo_id: string; error: string }>;
}

// ─── Singleton OpenAI ──────────────────────────────────────────────

let _openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openaiClient;
}

// ─── Étape 1 — Sélection photo ancre (règle déterministe) ─────────

/**
 * Sélectionne la photo "ancre" : celle dont la position normalisée sur le
 * plan est la plus proche du centroïde géométrique du polygone pièce.
 * Tie-break (rare) : photo avec le plus gros buffer (proxy résolution).
 */
export function selectAnchorPhoto(
  polygon: ZonePolygonPoint[],
  photos: PlacedPhoto[]
): PlacedPhoto {
  if (photos.length === 0) {
    throw new Error("selectAnchorPhoto: empty photos array");
  }
  if (photos.length === 1) return photos[0];

  // Centroïde du polygone exprimé en % (0-100)
  const centroid = polygonCentroid(polygon);
  // Position photo en 0.0-1.0 → ramener en 0-100 pour comparer avec centroïde
  const centroidNorm = { x: centroid.x_percent / 100, y: centroid.y_percent / 100 };

  let best = photos[0];
  let bestDist = Math.hypot(best.position_x - centroidNorm.x, best.position_y - centroidNorm.y);
  for (const p of photos.slice(1)) {
    const d = Math.hypot(p.position_x - centroidNorm.x, p.position_y - centroidNorm.y);
    if (d < bestDist || (d === bestDist && p.buffer.length > best.buffer.length)) {
      best = p;
      bestDist = d;
    }
  }
  return best;
}

// ─── Étape 2 — Génération visuel ancre ────────────────────────────

async function generateAnchorVisual(
  input: CoherentGenerationInput,
  anchorPhoto: PlacedPhoto
): Promise<{ image_base64: string; prompt_used: string }> {
  // s32 (Feature B) — description segments à injecter (vide si pas annoté)
  const segmentDescription = buildSegmentDescriptionEn(
    input.room_polygon,
    input.segments ?? []
  );
  const params: AnchorPromptParams = {
    roomType: input.room_type,
    styleId: input.style_id,
    surfaceM2: input.surface_m2,
    angleDegrees: anchorPhoto.angle_degrees,
    commentText: input.comment_text,
    userAnswers: input.user_answers,
    structuralInstructions: input.structural_instructions,
    isFurnished: input.is_furnished,
    segmentDescription,
    architecturalProfile: input.architectural_profile ?? null,
    architecturalDetails: input.architectural_details ?? null,
  };
  const prompt = buildVisualPromptAnchor(params);

  await imagesEditLimiter.acquireToken();

  const ext = anchorPhoto.mime_type === "image/png" ? "png"
            : anchorPhoto.mime_type === "image/webp" ? "webp" : "jpg";
  const imageFile = await toFile(anchorPhoto.buffer, `anchor.${ext}`, { type: anchorPhoto.mime_type });

  const openai = getOpenAI();
  const response = await openai.images.edit({
    model: "gpt-image-2",
    image: imageFile,
    prompt,
    quality: "high",
    size: "auto",
  });
  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("gpt-image-2 ancre : réponse vide (pas de b64_json).");
  }
  return { image_base64: b64, prompt_used: prompt };
}

// ─── Étape 4 — Génération secondaire ──────────────────────────────

async function generateSecondaryVisual(
  input: CoherentGenerationInput,
  secondaryPhoto: PlacedPhoto,
  anchorImageBase64: string,
  anchorSignature: VisualSignature
): Promise<{ image_base64: string; prompt_used: string; coherence_mode: "multi_image_native" | "textual_signature" }> {
  // s32 (Feature B) — description segments injectée aussi sur les secondaires
  // pour cohérence (pas de divergence anchor/secondary sur les ouvertures).
  const segmentDescription = buildSegmentDescriptionEn(
    input.room_polygon,
    input.segments ?? []
  );
  const baseParams: AnchorPromptParams = {
    roomType: input.room_type,
    styleId: input.style_id,
    surfaceM2: input.surface_m2,
    angleDegrees: secondaryPhoto.angle_degrees,
    commentText: input.comment_text,
    userAnswers: input.user_answers,
    structuralInstructions: input.structural_instructions,
    isFurnished: input.is_furnished,
    segmentDescription,
    architecturalProfile: input.architectural_profile ?? null,
    architecturalDetails: input.architectural_details ?? null,
  };
  const prompt = buildVisualPromptSecondary({ ...baseParams, anchorSignature });

  await imagesEditLimiter.acquireToken();

  const openai = getOpenAI();
  const ext = secondaryPhoto.mime_type === "image/png" ? "png"
            : secondaryPhoto.mime_type === "image/webp" ? "webp" : "jpg";
  const photoFile = await toFile(secondaryPhoto.buffer, `secondary.${ext}`, { type: secondaryPhoto.mime_type });

  // Tentative 1 : multi-image natif (photo source + ancre comme référence)
  // Si gpt-image-2 accepte un tableau d'images en input, on a la cohérence forte.
  // Si l'API rejette le tableau (TypeError SDK ou erreur 400 OpenAI), fallback
  // sur image unique + signature textuelle uniquement (déjà dans le prompt).
  try {
    const anchorBuffer = Buffer.from(anchorImageBase64, "base64");
    const anchorFile = await toFile(anchorBuffer, "anchor.png", { type: "image/png" });
    // Note SDK : passer un array peut nécessiter cast — on l'isole pour pouvoir
    // catch le rejet propre. Voir docs OpenAI gpt-image-2 multi-image.
    const response = await openai.images.edit({
      model: "gpt-image-2",
      image: [photoFile, anchorFile] as unknown as Parameters<typeof openai.images.edit>[0]["image"],
      prompt,
      quality: "high",
      size: "auto",
    });
    const b64 = response.data?.[0]?.b64_json;
    if (!b64) throw new Error("gpt-image-2 secondaire multi-image : réponse vide.");
    return { image_base64: b64, prompt_used: prompt, coherence_mode: "multi_image_native" };
  } catch (multiErr) {
    // Fallback : image unique + signature textuelle (le prompt contient déjà la signature)
    console.warn(
      "[coherent-visual-generator] Multi-image refusé, fallback signature textuelle:",
      multiErr instanceof Error ? multiErr.message : multiErr
    );
    await imagesEditLimiter.acquireToken(); // re-token pour la 2e tentative
    const response = await openai.images.edit({
      model: "gpt-image-2",
      image: photoFile,
      prompt,
      quality: "high",
      size: "auto",
    });
    const b64 = response.data?.[0]?.b64_json;
    if (!b64) throw new Error("gpt-image-2 secondaire fallback : réponse vide.");
    return { image_base64: b64, prompt_used: prompt, coherence_mode: "textual_signature" };
  }
}

// ─── Persistance vs_visuals ────────────────────────────────────────

interface InsertVisualParams {
  photo_id: string;
  style_id: string;
  prompt_used: string;
  file_path: string;
  anchor_visual_id: string | null;
  visual_signature_json: VisualSignature | null;
  coherence_mode: "multi_image_native" | "textual_signature" | null;
}

async function insertVisual(params: InsertVisualParams): Promise<string> {
  const result = await query<{ id: string }>(
    `
    INSERT INTO vs_visuals (
      photo_id, style_id, file_path, status, prompt_used,
      anchor_visual_id, visual_signature_json, coherence_mode, prompt_version
    )
    VALUES ($1, $2, $3, 'generated', $4, $5, $6, $7, $8)
    RETURNING id
    `,
    [
      params.photo_id,
      params.style_id,
      params.file_path,
      params.prompt_used,
      params.anchor_visual_id,
      params.visual_signature_json ? JSON.stringify(params.visual_signature_json) : null,
      params.coherence_mode,
      PROMPT_VERSION,
    ]
  );
  return result.rows[0].id;
}

// ─── Orchestration principale ──────────────────────────────────────

export interface GenerateCoherentVisualsOptions {
  /**
   * Callback de stockage : reçoit l'image base64 et un nom logique,
   * retourne le file_path à persister en BDD.
   * Permet de découpler le module du stockage (filesystem local, R2, S3).
   */
  storeImage: (base64: string, logicalName: string) => Promise<string>;
}

/**
 * Pipeline complet de génération cohérente pour une pièce.
 *
 * Comportement EC-5 : si un visuel secondaire échoue, on continue avec les
 * autres. Les échecs sont retournés dans `failures` pour permettre à Thomas
 * de relancer individuellement ce visuel manqué via une autre route API.
 *
 * Si l'ancre échoue → throw Error (pas de cohérence possible sans ancre).
 *
 * @throws Error si génération de l'ancre échoue (bloquant pour la pièce)
 */
export async function generateCoherentVisuals(
  input: CoherentGenerationInput,
  options: GenerateCoherentVisualsOptions
): Promise<CoherentGenerationResult> {
  if (input.photos.length === 0) {
    throw new Error("generateCoherentVisuals: aucune photo placée pour cette pièce.");
  }
  if (input.target_visual_count <= 0) {
    throw new Error("generateCoherentVisuals: target_visual_count doit être > 0.");
  }

  // 1. Sélection photo ancre
  const anchorPhoto = selectAnchorPhoto(input.room_polygon, input.photos);

  // 2. Génération visuel ancre (bloquant : si échec, on ne peut pas générer cohérent)
  const anchorGen = await generateAnchorVisual(input, anchorPhoto);
  const anchorPath = await options.storeImage(anchorGen.image_base64, `room-${input.room_id}-anchor.png`);

  // 3. Extraction signature visuelle de l'ancre (1 appel gpt-4o-mini vision)
  const anchorSignature = await extractVisualSignature(anchorGen.image_base64);

  // 4. Persistance ancre AVANT génération secondaires (permet régénération individuelle EC-5
  // même si la session crash après l'ancre)
  const anchorVisualId = await insertVisual({
    photo_id: anchorPhoto.id,
    style_id: input.style_id,
    prompt_used: anchorGen.prompt_used,
    file_path: anchorPath,
    anchor_visual_id: null, // ancre = source de vérité
    visual_signature_json: anchorSignature,
    coherence_mode: null,
  });

  // 5. Sélection des photos secondaires
  // Si target_visual_count > photos disponibles : on réutilise des photos (l'IA
  // produira des angles différents grâce au prompt). Si target < photos : on
  // prend les N-1 photos les plus diversifiées en angle (cf. EC-3 spec PM —
  // simplification V2 : on prend simplement les premières N-1 photos non-ancre).
  const nonAnchorPhotos = input.photos.filter((p) => p.id !== anchorPhoto.id);
  const numSecondaries = input.target_visual_count - 1;
  const secondariesPlan: PlacedPhoto[] = [];
  for (let i = 0; i < numSecondaries; i++) {
    if (nonAnchorPhotos.length > 0) {
      // Cycle sur les non-ancres si pas assez (fallback raisonnable V2)
      secondariesPlan.push(nonAnchorPhotos[i % nonAnchorPhotos.length]);
    } else {
      // Pas de photo secondaire dispo → réutiliser l'ancre (l'IA changera l'angle via prompt)
      secondariesPlan.push(anchorPhoto);
    }
  }

  // 6. Génération secondaires en parallèle (le rate limiter gère le throttle)
  const secondaryResults: SecondaryVisualResult[] = [];
  const failures: Array<{ photo_id: string; error: string }> = [];

  const secondaryPromises = secondariesPlan.map(async (photo, idx) => {
    try {
      const gen = await generateSecondaryVisual(input, photo, anchorGen.image_base64, anchorSignature);
      const path = await options.storeImage(gen.image_base64, `room-${input.room_id}-secondary-${idx}.png`);
      const visualId = await insertVisual({
        photo_id: photo.id,
        style_id: input.style_id,
        prompt_used: gen.prompt_used,
        file_path: path,
        anchor_visual_id: anchorVisualId,
        visual_signature_json: null, // les secondaires héritent de la signature de l'ancre
        coherence_mode: gen.coherence_mode,
      });
      secondaryResults.push({
        visual_id: visualId,
        image_base64: gen.image_base64,
        prompt_used: gen.prompt_used,
        coherence_mode: gen.coherence_mode,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[coherent-visual-generator] Secondary ${idx} failed:`, msg);
      failures.push({ photo_id: photo.id, error: msg });
    }
  });
  await Promise.all(secondaryPromises);

  return {
    anchor: {
      visual_id: anchorVisualId,
      image_base64: anchorGen.image_base64,
      prompt_used: anchorGen.prompt_used,
      signature_json: anchorSignature,
    },
    secondaries: secondaryResults,
    failures,
  };
}

/**
 * Régénère un visuel secondaire spécifique (EC-5 : régénération individuelle
 * après échec). Réutilise la signature de l'ancre déjà persistée.
 */
export async function regenerateSecondaryVisual(
  failedVisualId: string,
  options: GenerateCoherentVisualsOptions
): Promise<SecondaryVisualResult> {
  // Charger le visuel échoué + son ancre + la photo source
  const result = await query<{
    photo_id: string;
    style_id: string;
    anchor_visual_id: string | null;
    anchor_signature_json: VisualSignature | null;
    anchor_image_path: string | null;
    photo_file_path: string;
    photo_mime: string | null;
    angle_degrees: number | null;
    room_id: string;
    room_type: string;
    surface_m2: number | null;
    comment_text: string | null;
  }>(
    `
    SELECT
      v.photo_id,
      v.style_id,
      v.anchor_visual_id,
      av.visual_signature_json AS anchor_signature_json,
      av.file_path AS anchor_image_path,
      p.file_path AS photo_file_path,
      'image/jpeg'::TEXT AS photo_mime,
      p.angle_degrees,
      r.id AS room_id,
      r.room_type,
      r.surface_m2::FLOAT AS surface_m2,
      rs.comment_text
    FROM vs_visuals v
    JOIN vs_visuals av ON av.id = v.anchor_visual_id
    JOIN vs_photos p ON p.id = v.photo_id
    JOIN vs_rooms r ON r.id = p.room_id
    LEFT JOIN vs_room_settings rs ON rs.room_id = r.id
    WHERE v.id = $1
    `,
    [failedVisualId]
  );
  const row = result.rows[0];
  if (!row) throw new Error(`Visuel ${failedVisualId} introuvable.`);
  if (!row.anchor_signature_json) throw new Error(`Signature ancre absente pour ${failedVisualId} — impossible de régénérer cohérent.`);

  // Le caller doit fournir les buffers (chargés depuis le storage selon l'env Replit).
  // Pour rester découplé du storage, on déclare cette fonction comme "non implémentée"
  // ici et on documente que le caller (route API) doit charger les buffers et appeler
  // generateSecondaryVisual directement. C'est plus honnête qu'un re-load incomplet.
  void options;
  throw new Error(
    "regenerateSecondaryVisual: le caller (route API) doit charger les buffers photo + ancre " +
    "depuis le storage et invoquer generateSecondaryVisual directement. " +
    "Cette fonction reste un point de documentation pour la Vague 2 (route API)."
  );
}
