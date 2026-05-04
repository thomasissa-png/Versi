/**
 * Génération de visuels post-travaux via gpt-image-2 (Images API — edit).
 *
 * Migration s27 : gpt-image-1 → gpt-image-2 (lancé 2026-04-21, GA OpenAI).
 * gpt-image-1 sera retiré le 2026-05-12. Décision fondateur Thomas s27 :
 * gpt-image-2 exclusivement, aucun fallback de modèle.
 *
 * Note versi-s22 historique : openai.responses.create() ne supporte pas
 * la génération d'images (erreur silencieuse). On utilise images.edit().
 *
 * Input : photo brute (base64), style de décoration, infos pièce
 * Output : image générée (base64) + prompt utilisé
 */
import OpenAI, { toFile } from "openai";
import { getStyle, getRoomLabel } from "@/lib/vs/styles";
import { imagesEditLimiter } from "@/lib/vs/openai-rate-limiter";

// ─── Singleton OpenAI ──────────────────────────────────────────────
let _openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openaiClient;
}

// ─── Types ─────────────────────────────────────────────────────────
export interface VisualGenerationResult {
  image_base64: string;
  prompt_used: string;
}

/** Résultat soit succès, soit erreur explicite (avec message OpenAI propagé). */
export type VisualGenerationOutcome =
  | { ok: true; image_base64: string; prompt_used: string }
  | { ok: false; error: string };

// ─── Types V2 (Étape 4 v2 — pipeline cohérent) ────────────────────

/** Paramètres communs pour build prompt ancre OU secondaire. */
export interface AnchorPromptParams {
  roomType: string;
  styleId: string;
  surfaceM2: number | null;
  /** Angle de vue du photographe en degrés (0-359, 0 = nord). NULL si non placé. */
  angleDegrees: number | null;
  /** Commentaire libre Thomas (vs_room_settings.comment_text). */
  commentText: string | null;
  /** Réponses utilisateur aux questions T1-T5 (concaténées). */
  userAnswers: string[];
  structuralInstructions: string | null;
}

/** Signature visuelle extraite de l'ancre — sert à uniformiser les secondaires. */
export interface VisualSignature {
  /** Couleurs hex dominantes : ["#F5EDE2", ...]. */
  palette: string[];
  /** Meubles principaux avec matériau/couleur. */
  meubles: string[];
  /** Revêtement sol + finition murs. */
  sols_murs: string;
  /** Ambiance lumineuse. */
  lumiere: string;
}

export interface SecondaryPromptParams extends AnchorPromptParams {
  anchorSignature: VisualSignature;
}

// ─── Prompt builder ────────────────────────────────────────────────

/**
 * Construit le prompt de génération pour gpt-image-2.
 * Le prompt doit :
 * - Décrire la transformation de la pièce brute en pièce meublée
 * - Respecter le style choisi (utiliser style.prompt_hint de styles.ts)
 * - Conserver les éléments structurels (fenêtres, portes, murs)
 * - Mentionner l'angle si fourni
 * - Viser un rendu photoréaliste
 */
export function buildVisualPrompt(
  roomType: string,
  styleId: string,
  surfaceM2: number | null,
  angleDescription: string | null,
  structuralInstructions: string | null = null
): string {
  const style = getStyle(styleId);
  const roomLabel = getRoomLabel(roomType);
  const styleName = style?.name ?? styleId;
  const styleHint = style?.prompt_hint ?? "";
  const surfaceNote = surfaceM2 ? `The room is approximately ${surfaceM2} square meters.` : "";
  const angleNote = angleDescription ? `Camera angle: ${angleDescription}.` : "";

  const hasTransformations = structuralInstructions && structuralInstructions.trim().length > 0;

  // STRICT RULE 1 : conditionnelle selon la présence de transformations structurelles
  const structuralRule = hasTransformations
    ? `1. APPLY the structural transformations described below AS THE PRIMARY OBJECTIVE. The transformation must be clearly visible and unmistakable. Adapt walls, partitions, and openings exactly as instructed. Keep camera framing and natural light direction.`
    : `1. KEEP all structural elements EXACTLY as they are: walls, windows, doors, ceiling, floor shape, room proportions. Do NOT move, add, or remove any window or door.`;

  // Bloc optionnel de transformations structurelles
  const transformationsBlock = hasTransformations
    ? `

STRUCTURAL TRANSFORMATIONS — THIS IS THE #1 PRIORITY OF THIS IMAGE:
${structuralInstructions!.trim()}

CRITICAL rules for structural transformations (MUST be followed):
- The structural change described above is the MOST IMPORTANT aspect of this image. The viewer must immediately see the transformation.
- If a wall is REMOVED: the wall must be COMPLETELY GONE — no remnant, no archway, no pillar, no column, no partial wall. There must be ZERO vertical separation between the two spaces. Show a single wide-open continuous space where two rooms merge seamlessly. The flooring and ceiling must be uninterrupted across the full width. The adjacent room/space must be clearly visible and furnished. Do NOT show any trace of the former wall.
- If a PARTITION/WALL is ADDED: a NEW vertical wall must be clearly visible, dividing the space into two distinct rooms. The new wall should be thin (~15cm), freshly finished, and extend from floor to ceiling. Both resulting spaces should be visible or implied.
- If an OPENING/DOOR is CREATED: show a clean rectangular opening with a proper door frame cut into an existing wall. The room beyond the opening must be visible through it.
- If a KITCHEN is RELOCATED: show kitchen cabinets, countertop, sink, and appliances positioned exactly where described (e.g., against the exterior wall with a window above the sink).
- Respect physics: walls meet floors and ceilings at right angles, doors are human-sized (~2m), furniture is proportional.
- Keep the camera angle and lighting from the source photo.`
    : "";

  return `Transform this empty, unfurnished ${roomLabel} into a beautifully designed and fully furnished ${roomLabel} in ${styleName} style.${transformationsBlock}

STYLE DETAILS: ${styleHint}.

STRICT RULES:
${structuralRule}
2. ADD appropriate furniture, decorations, lighting, and finishes consistent with ${styleName} style.
3. The furniture must be PROPORTIONAL to the room size. ${surfaceNote}
4. The result must look like a professional interior design photograph — photorealistic, high quality, natural lighting.
5. Do NOT add any text, watermark, logo, or overlay to the image.
6. Do NOT change the camera perspective or angle. ${angleNote}
7. Walls should be freshly painted or finished. Floors should have appropriate flooring (hardwood, tiles, etc.) matching the style.
8. Add subtle decorative elements: plants, books, artwork, cushions — appropriate for the style.`;
}

// ─── Main generation function ──────────────────────────────────────

/**
 * Génère un visuel post-travaux à partir d'une photo brute.
 *
 * @param photoBase64 - Photo brute en base64
 * @param mimeType - MIME type de la photo (image/jpeg, image/png, image/webp)
 * @param roomType - Type de pièce (chambre, salon, cuisine, etc.)
 * @param styleId - ID du style (scandinave, industriel, etc.)
 * @param surfaceM2 - Surface en m² (optionnel)
 * @param angleDescription - Description de l'angle (optionnel)
 * @returns { image_base64, prompt_used } ou null si échec après retry
 */
export async function generateVisual(
  photoBase64: string,
  mimeType: string,
  roomType: string,
  styleId: string,
  surfaceM2: number | null = null,
  angleDescription: string | null = null,
  structuralInstructions: string | null = null
): Promise<VisualGenerationOutcome> {
  const openai = getOpenAI();
  const prompt = buildVisualPrompt(roomType, styleId, surfaceM2, angleDescription, structuralInstructions);

  // Premier essai
  try {
    const result = await callImageGeneration(openai, photoBase64, mimeType, prompt);
    return { ok: true, image_base64: result, prompt_used: prompt };
  } catch (err) {
    console.warn("[visual-generator] Premier essai échoué, retry dans 5s...", err instanceof Error ? err.message : err);
  }

  // Retry après 5s
  await new Promise(r => setTimeout(r, 5000));
  try {
    const result = await callImageGeneration(openai, photoBase64, mimeType, prompt);
    return { ok: true, image_base64: result, prompt_used: prompt };
  } catch (retryErr) {
    // Propagation du vrai motif d'échec OpenAI (au lieu de null générique)
    const rawMessage = retryErr instanceof Error ? retryErr.message : String(retryErr);
    console.error("[visual-generator] Retry échoué, abandon.", rawMessage);
    return { ok: false, error: rawMessage };
  }
}

// ─── Appel gpt-image-2 (Images API — edit) ───────────────────────

async function callImageGeneration(
  openai: OpenAI,
  photoBase64: string,
  mimeType: string,
  prompt: string
): Promise<string> {
  // Convertir base64 en Uploadable file pour le SDK OpenAI
  const photoBuffer = Buffer.from(photoBase64, "base64");
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "png";
  const imageFile = await toFile(photoBuffer, `photo.${ext}`, { type: mimeType });

  // s29 — rate limit token bucket vers gpt-image-2 images.edit
  // Évite le 429 quand plusieurs pièces génèrent en parallèle
  await imagesEditLimiter.acquireToken();

  const response = await openai.images.edit({
    model: "gpt-image-2",
    image: imageFile,
    prompt,
    quality: "high",
    size: "auto",
  });

  // Extraire l'image générée (b64_json par défaut pour gpt-image-2)
  const imageData = response.data?.[0];
  if (!imageData?.b64_json) {
    throw new Error("Résultat image vide dans la réponse gpt-image-2");
  }
  return imageData.b64_json;
}

// ─── Enrichissement de prompt pour itération ───────────────────────

/**
 * Utilise gpt-4.1-mini pour enrichir une instruction utilisateur en prompt détaillé.
 * Ex: "Ajoute une table basse" → prompt enrichi avec matériaux, proportions, style.
 *
 * @param instruction - L'instruction brute de l'utilisateur
 * @param styleId - Le style actif
 * @param roomType - Le type de pièce
 * @returns Le prompt enrichi pour gpt-image-2
 */
export async function enrichPromptForIteration(
  instruction: string,
  styleId: string,
  roomType: string
): Promise<string> {
  const openai = getOpenAI();
  const style = getStyle(styleId);
  const roomLabel = getRoomLabel(roomType);
  const styleName = style?.name ?? styleId;
  const styleHint = style?.prompt_hint ?? "";

  // Détecter si l'instruction contient une demande de transformation structurelle
  const structuralKeywords = /\b(mur|cloison|abattre|supprimer|ouvrir|percer|ouverture|porte|baie|fenêtre|agrandir|cuisine ouverte|open.?space|séparer|diviser|fusionner)\b/i;
  const isStructural = structuralKeywords.test(instruction);

  const structuralRule = isStructural
    ? `1. Les modifications STRUCTURELLES sont autorisées pour cette instruction (suppression de mur, ajout de cloison, percement d'ouverture). Applique les transformations demandées tout en gardant la physique réaliste (murs joints au sol et au plafond, portes à taille humaine, sols et plafonds continus).`
    : `1. Conserve TOUS les éléments structurels (murs, fenêtres, portes).`;

  const suggestions = isStructural
    ? `
7. Exemples d'instructions structurelles courantes :
   - "Supprimer le mur entre le salon et la cuisine" → montrer un espace ouvert avec sol et plafond continus
   - "Ajouter une cloison" → montrer un mur fin (15 cm) avec finitions assorties
   - "Percer une ouverture" → montrer un encadrement propre de porte ou fenêtre
   - "Agrandir la fenêtre en baie vitrée" → montrer une ouverture élargie avec vitrages`
    : "";

  const systemPrompt = `Tu es un architecte d'intérieur expert. On te donne une instruction de modification pour un visuel de ${roomLabel} en style ${styleName}. Tu dois transformer cette instruction en un prompt détaillé pour un modèle de génération d'image.

RÈGLES :
${structuralRule}
2. Applique UNIQUEMENT les modifications demandées.
3. Reste cohérent avec le style ${styleName} (${styleHint}).
4. Décris les matériaux, couleurs et proportions spécifiques.
5. Le résultat doit être photoréaliste.
6. Réponds UNIQUEMENT avec le prompt enrichi, sans explication.${suggestions}`;

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Instruction : "${instruction}"\n\nProduis le prompt enrichi.` },
      ],
    });

    const textOutput = response.output.find(
      (o: { type: string }) => o.type === "message"
    );
    if (textOutput && textOutput.type === "message") {
      const msg = textOutput as { type: string; content: Array<{ type: string; text?: string }> };
      const textContent = msg.content.find(
        (c: { type: string }) => c.type === "output_text"
      );
      if (textContent && textContent.type === "output_text" && textContent.text) {
        return textContent.text;
      }
    }
  } catch (err) {
    console.warn("[visual-generator] enrichPromptForIteration échoué, utilisation du prompt brut", err instanceof Error ? err.message : err);
  }

  // Fallback : prompt brut (structural constraint conditionnelle)
  const fallbackStructural = isStructural
    ? "Apply the structural modifications as described."
    : "Keep all structural elements.";
  return `Modify this ${roomLabel} image: ${instruction}. Keep the ${styleName} style (${styleHint}). ${fallbackStructural} Photorealistic result.`;
}

// ─── V2 (s29) — Helpers communs prompts cohérents ─────────────────

type SurfaceQualifier = "compact" | "standard" | "généreux";

function qualifySurface(m2: number): SurfaceQualifier {
  if (m2 < 12) return "compact";
  if (m2 < 25) return "standard";
  return "généreux";
}

function furnitureGuidance(qualifier: SurfaceQualifier): string {
  return ({
    compact: "compact furniture — 2-seat sofa, side table, optimized layout",
    standard: "standard furniture — 3-seat sofa, coffee table, accent chair",
    "généreux": "generous furniture — corner sofa, lounge chair, 120cm coffee table",
  } as const)[qualifier];
}

/**
 * Convertit un angle en degrés (0 = nord, sens horaire) en libellé cardinal
 * pour injection prompt. 8 secteurs de 45°.
 */
export function angleDegreesToCardinal(deg: number): string {
  const sectors = [
    "from the north", "from the north-east", "from the east", "from the south-east",
    "from the south", "from the south-west", "from the west", "from the north-west",
  ];
  const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return `view ${sectors[idx]} of the room`;
}

// ─── V2 (s29) — buildVisualPromptAnchor ───────────────────────────

/**
 * Construit le prompt pour le visuel "ancre" (1er visuel d'une pièce).
 * Servira de base pour la signature visuelle injectée dans les secondaires.
 *
 * Diff vs buildVisualPrompt V1 : ajout angleDegrees (cardinal verbalisé),
 * userAnswers, gestion surface qualifier (compact/standard/généreux).
 */
export function buildVisualPromptAnchor(p: AnchorPromptParams): string {
  const style = getStyle(p.styleId);
  const roomLabel = getRoomLabel(p.roomType);
  const styleName = style?.name ?? p.styleId;
  const styleHint = style?.prompt_hint ?? "";

  const surfaceQual = p.surfaceM2 ? qualifySurface(p.surfaceM2) : "standard";
  const surfaceLine = p.surfaceM2
    ? `Surface ${p.surfaceM2}m² (${surfaceQual}) — ${furnitureGuidance(surfaceQual)}.`
    : "";
  const angleLine = p.angleDegrees != null
    ? `Camera angle: ${angleDegreesToCardinal(p.angleDegrees)}.`
    : "";
  const commentLine = p.commentText
    ? `User-specified constraints (MUST respect): ${p.commentText}.`
    : "";
  const answersLine = p.userAnswers.length > 0
    ? `Clarifications from operator: ${p.userAnswers.join(" | ")}.`
    : "";
  const hasTransformations = p.structuralInstructions && p.structuralInstructions.trim().length > 0;
  const structuralBlock = hasTransformations
    ? `\n\nSTRUCTURAL TRANSFORMATIONS — TOP PRIORITY:\n${p.structuralInstructions!.trim()}`
    : "";
  const structuralRule = hasTransformations
    ? "1. APPLY the structural transformations above as the PRIMARY OBJECTIVE."
    : "1. KEEP all structural elements EXACTLY (walls, windows, doors, ceiling, floor shape).";

  return `Transform this empty/raw ${roomLabel} into a beautifully designed and fully furnished ${roomLabel} in ${styleName} style.${structuralBlock}

STYLE DETAILS: ${styleHint}.

CONTEXT:
${surfaceLine}
${angleLine}
${commentLine}
${answersLine}

STRICT RULES:
${structuralRule}
2. ADD furniture, decorations, lighting consistent with ${styleName} style.
3. Furniture MUST be PROPORTIONAL to surface (${surfaceQual}).
4. Result must be a professional interior design photograph — photorealistic, natural lighting.
5. NO text, watermark, logo, or overlay.
6. Do NOT change camera perspective.
7. Walls freshly finished, floor with appropriate material.
8. Subtle decorative elements appropriate to style.`;
}

// ─── V2 (s29) — buildVisualPromptSecondary ────────────────────────

/**
 * Construit le prompt pour un visuel "secondaire" (vue alternative d'une pièce
 * dont l'ancre a déjà été générée). Réutilise buildVisualPromptAnchor + bloc
 * de cohérence injectant la signature de l'ancre (palette, meubles, finitions).
 *
 * Si gpt-image-2 supporte multi-image en input, l'ancre passe AUSSI comme
 * image de référence (cf. coherent-visual-generator.ts) — la signature reste
 * un fallback robuste.
 */
export function buildVisualPromptSecondary(p: SecondaryPromptParams): string {
  const base = buildVisualPromptAnchor(p);
  const sig = p.anchorSignature;
  const palette = sig.palette.length > 0 ? sig.palette.join(", ") : "(palette unspecified)";
  const meubles = sig.meubles.length > 0 ? sig.meubles.join("; ") : "(furniture list unspecified)";
  const coherenceBlock = `

COHERENCE WITH ANCHOR VISUAL — CRITICAL:
This image is a DIFFERENT ANGLE of the SAME ROOM as a previously generated anchor visual. Furniture, palette and finishes MUST match the anchor exactly.
- Color palette (use these hex tones): ${palette}
- Furniture present in the room (must appear or be visible in this angle if geometrically plausible): ${meubles}
- Floor and walls: ${sig.sols_murs}
- Lighting mood: ${sig.lumiere}

Do NOT introduce new furniture types, new colors, or different finishes. This is a second photo of the same finished room from another viewpoint.`;
  return base + coherenceBlock;
}

// ─── V2 (s29) — extractVisualSignature ────────────────────────────

/**
 * Extrait la signature visuelle d'une image (palette, meubles, finitions, lumière)
 * via gpt-4o-mini vision. Utilisé sur le visuel "ancre" pour injecter la cohérence
 * dans les prompts secondaires.
 *
 * Coût : ~$0.001 par appel. Fallback safe : si parsing JSON échoue ou si l'API
 * est indisponible, retourne une signature vide — les prompts secondaires resteront
 * cohérents textuellement mais sans contraintes hex précises (dégradation acceptable
 * vs throw qui bloquerait toute la pièce).
 *
 * @param imageBase64 Image source en base64 (sans préfixe data:)
 * @returns Signature visuelle structurée
 */
export async function extractVisualSignature(imageBase64: string): Promise<VisualSignature> {
  const fallback: VisualSignature = {
    palette: [],
    meubles: [],
    sols_murs: "(unspecified — coherence based on prompt only)",
    lumiere: "(unspecified — natural lighting assumed)",
  };

  const sysPrompt = `Décris cette image d'intérieur en 4 sections JSON courtes:
1. "palette": 3 à 5 couleurs hex dominantes (format "#RRGGBB")
2. "meubles": liste des meubles principaux avec leur matériau/couleur (ex: "canapé tissu lin beige")
3. "sols_murs": revêtement sol + finition murs (ex: "parquet chêne clair, murs blanc cassé")
4. "lumiere": ambiance lumineuse (ex: "lumière naturelle latérale gauche, chaude")
Réponds STRICTEMENT en JSON valide, sans markdown ni explication.`;

  try {
    const openai = getOpenAI();
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: sysPrompt },
        {
          role: "user",
          content: [{ type: "input_image", image_url: `data:image/png;base64,${imageBase64}`, detail: "auto" }],
        },
      ],
    });
    const textOutput = response.output.find((o: { type: string }) => o.type === "message");
    if (!textOutput || textOutput.type !== "message") return fallback;
    const msg = textOutput as { content: Array<{ type: string; text?: string }> };
    const textContent = msg.content.find((c) => c.type === "output_text");
    if (!textContent?.text) return fallback;

    const cleaned = textContent.text.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    const parsed = JSON.parse(cleaned) as Partial<VisualSignature>;
    return {
      palette: Array.isArray(parsed.palette) ? parsed.palette.filter((s) => typeof s === "string") : [],
      meubles: Array.isArray(parsed.meubles) ? parsed.meubles.filter((s) => typeof s === "string") : [],
      sols_murs: typeof parsed.sols_murs === "string" ? parsed.sols_murs : fallback.sols_murs,
      lumiere: typeof parsed.lumiere === "string" ? parsed.lumiere : fallback.lumiere,
    };
  } catch (err) {
    console.warn(
      "[visual-generator] extractVisualSignature failed, using fallback:",
      err instanceof Error ? err.message : err
    );
    return fallback;
  }
}
