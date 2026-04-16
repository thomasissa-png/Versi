/**
 * Génération de visuels post-travaux via gpt-image-1.5.
 *
 * Input : photo brute (base64), style de décoration, infos pièce
 * Output : image générée (base64) + prompt utilisé
 */
import OpenAI from "openai";
import { getStyle, getRoomLabel } from "@/lib/vs/styles";

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

// ─── Prompt builder ────────────────────────────────────────────────

/**
 * Construit le prompt de génération pour gpt-image-1.5.
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
  angleDescription: string | null
): string {
  const style = getStyle(styleId);
  const roomLabel = getRoomLabel(roomType);
  const styleName = style?.name ?? styleId;
  const styleHint = style?.prompt_hint ?? "";
  const surfaceNote = surfaceM2 ? `The room is approximately ${surfaceM2} square meters.` : "";
  const angleNote = angleDescription ? `Camera angle: ${angleDescription}.` : "";

  return `Transform this empty, unfurnished ${roomLabel} into a beautifully designed and fully furnished ${roomLabel} in ${styleName} style.

STYLE DETAILS: ${styleHint}.

STRICT RULES:
1. KEEP all structural elements EXACTLY as they are: walls, windows, doors, ceiling, floor shape, room proportions. Do NOT move, add, or remove any window or door.
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
  angleDescription: string | null = null
): Promise<VisualGenerationResult | null> {
  const openai = getOpenAI();
  const prompt = buildVisualPrompt(roomType, styleId, surfaceM2, angleDescription);

  // Premier essai
  try {
    const result = await callImageGeneration(openai, photoBase64, mimeType, prompt);
    return { image_base64: result, prompt_used: prompt };
  } catch (err) {
    console.warn("[visual-generator] Premier essai échoué, retry dans 5s...", err instanceof Error ? err.message : err);
  }

  // Retry après 5s
  await new Promise(r => setTimeout(r, 5000));
  try {
    const result = await callImageGeneration(openai, photoBase64, mimeType, prompt);
    return { image_base64: result, prompt_used: prompt };
  } catch (retryErr) {
    console.error("[visual-generator] Retry échoué, abandon.", retryErr instanceof Error ? retryErr.message : retryErr);
    return null;
  }
}

// ─── Appel gpt-image-1.5 ──────────────────────────────────────────

async function callImageGeneration(
  openai: OpenAI,
  photoBase64: string,
  mimeType: string,
  prompt: string
): Promise<string> {
  const imageDataUrl = `data:${mimeType};base64,${photoBase64}`;

  const response = await openai.responses.create({
    model: "gpt-image-1.5",
    input: [
      {
        role: "user",
        content: [
          { type: "input_image", image_url: imageDataUrl, detail: "auto" as const },
          { type: "input_text", text: prompt },
        ],
      },
    ],
    tools: [{ type: "image_generation", quality: "high" }],
  });

  // Extraire l'image générée
  const imageOutput = response.output.find(
    (o: { type: string }) => o.type === "image_generation_call"
  );
  if (!imageOutput || imageOutput.type !== "image_generation_call") {
    throw new Error("Pas de sortie image dans la réponse gpt-image-1.5");
  }
  // Le résultat contient result en base64
  const resultData = (imageOutput as { type: string; result?: string }).result;
  if (!resultData) {
    throw new Error("Résultat image vide");
  }
  return resultData;
}

// ─── Enrichissement de prompt pour itération ───────────────────────

/**
 * Utilise gpt-4.1-mini pour enrichir une instruction utilisateur en prompt détaillé.
 * Ex: "Ajoute une table basse" → prompt enrichi avec matériaux, proportions, style.
 *
 * @param instruction - L'instruction brute de l'utilisateur
 * @param styleId - Le style actif
 * @param roomType - Le type de pièce
 * @returns Le prompt enrichi pour gpt-image-1.5
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

  const systemPrompt = `Tu es un architecte d'intérieur expert. On te donne une instruction de modification pour un visuel de ${roomLabel} en style ${styleName}. Tu dois transformer cette instruction en un prompt détaillé pour un modèle de génération d'image.

RÈGLES :
1. Conserve TOUS les éléments structurels (murs, fenêtres, portes).
2. Applique UNIQUEMENT les modifications demandées.
3. Reste cohérent avec le style ${styleName} (${styleHint}).
4. Décris les matériaux, couleurs et proportions spécifiques.
5. Le résultat doit être photoréaliste.
6. Réponds UNIQUEMENT avec le prompt enrichi, sans explication.`;

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

  // Fallback : prompt brut
  return `Modify this ${roomLabel} image: ${instruction}. Keep the ${styleName} style (${styleHint}). Keep all structural elements. Photorealistic result.`;
}
