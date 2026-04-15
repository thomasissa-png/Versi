/**
 * Agent architecte — itération visuelle V1.
 *
 * Reçoit : le visuel courant + l'instruction en langage naturel + le style
 * Produit : un nouveau visuel intégrant les modifications demandées
 *
 * Flux :
 * 1. gpt-4.1-mini enrichit l'instruction → prompt détaillé
 * 2. gpt-image-1.5 génère la nouvelle version depuis le visuel courant + prompt
 */
import OpenAI from "openai";
import { getStyle, getRoomLabel } from "@/lib/vs/styles";
import { enrichPromptForIteration } from "@/lib/vs/visual-generator";

// ─── Singleton OpenAI ──────────────────────────────────────────────
let _openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openaiClient;
}

// ─── Types ─────────────────────────────────────────────────────────
export interface IterationResult {
  image_base64: string;
  prompt_used: string;
  interpretation: string;
}

// ─── Main function ─────────────────────────────────────────────────

/**
 * Itère sur un visuel existant selon l'instruction de l'utilisateur.
 *
 * @param currentVisualBase64 - Le visuel courant en base64
 * @param instruction - L'instruction utilisateur ("Retire le tapis, ajoute plus de lumière")
 * @param styleId - Le style actif (scandinave, industriel, etc.)
 * @param roomType - Le type de pièce
 * @param surfaceM2 - Surface en m² (optionnel)
 * @returns { image_base64, prompt_used, interpretation } ou null si échec
 */
export async function iterateVisual(
  currentVisualBase64: string,
  instruction: string,
  styleId: string,
  roomType: string,
  surfaceM2: number | null = null
): Promise<IterationResult | null> {
  const openai = getOpenAI();
  const style = getStyle(styleId);
  const roomLabel = getRoomLabel(roomType);
  const styleName = style?.name ?? styleId;
  const styleHint = style?.prompt_hint ?? "";

  // Étape 1 : Enrichir l'instruction via gpt-4.1-mini
  let enrichedPrompt: string;
  try {
    enrichedPrompt = await enrichPromptForIteration(instruction, styleId, roomType);
  } catch (err) {
    console.warn("[architect-agent] Enrichissement échoué, utilisation du prompt brut");
    enrichedPrompt = `Modify this ${roomLabel}: ${instruction}. Style: ${styleName} (${styleHint}). Keep structural elements. Photorealistic.`;
  }

  // Ajouter les contraintes structurelles au prompt enrichi
  const finalPrompt = `${enrichedPrompt}

IMPORTANT CONSTRAINTS:
- Keep ALL structural elements exactly as they are (walls, windows, doors, ceiling).
- Apply ONLY the requested modifications. Do not change anything else.
- The result must remain consistent with ${styleName} style.
- Photorealistic interior design photograph quality.
- No text, watermark, or overlay on the image.${surfaceM2 ? `\n- Room is approximately ${surfaceM2}m².` : ""}`;

  // Étape 2 : Générer la nouvelle version via gpt-image-1.5
  // Premier essai
  try {
    const imageBase64 = await callIterationGeneration(openai, currentVisualBase64, finalPrompt);
    return {
      image_base64: imageBase64,
      prompt_used: finalPrompt,
      interpretation: enrichedPrompt,
    };
  } catch (err) {
    console.warn("[architect-agent] Premier essai échoué, retry dans 5s...", err instanceof Error ? err.message : err);
  }

  // Retry après 5s
  await new Promise(r => setTimeout(r, 5000));
  try {
    const imageBase64 = await callIterationGeneration(openai, currentVisualBase64, finalPrompt);
    return {
      image_base64: imageBase64,
      prompt_used: finalPrompt,
      interpretation: enrichedPrompt,
    };
  } catch (retryErr) {
    console.error("[architect-agent] Retry échoué, abandon.", retryErr instanceof Error ? retryErr.message : retryErr);
    return null;
  }
}

// ─── Appel gpt-image-1.5 pour itération ────────────────────────────

async function callIterationGeneration(
  openai: OpenAI,
  currentVisualBase64: string,
  prompt: string
): Promise<string> {
  const imageDataUrl = `data:image/png;base64,${currentVisualBase64}`;

  const response = await openai.responses.create({
    model: "gpt-image-1.5",
    input: [
      {
        role: "user",
        content: [
          { type: "input_image", image_url: imageDataUrl },
          { type: "input_text", text: prompt },
        ],
      },
    ],
    tools: [{ type: "image_generation", quality: "high" }],
  });

  const imageOutput = response.output.find((o: any) => o.type === "image_generation_call");
  if (!imageOutput || imageOutput.type !== "image_generation_call") {
    throw new Error("Pas de sortie image dans la réponse gpt-image-1.5");
  }
  if (!imageOutput.result) {
    throw new Error("Résultat image vide");
  }
  return imageOutput.result;
}
