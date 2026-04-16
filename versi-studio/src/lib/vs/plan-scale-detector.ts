/**
 * Détection automatique de l'échelle d'un plan via GPT-4.1 vision.
 * Retourne { scale_ratio, confidence } pour pré-remplir la modale calibration.
 *
 * Approche progressive (assistant, pas remplacement) :
 * - confidence >= 0.9 : pré-remplir lengthMeters + suggérer ligne A→B
 * - confidence < 0.9 : fallback modale manuelle V1 (zéro régression)
 */
import OpenAI from "openai";
import { z } from "zod";

let _openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openaiClient;
}

export const PlanScaleResultSchema = z.object({
  scale_text: z
    .string()
    .nullable()
    .describe(
      "Texte d'échelle détecté tel quel (ex: '1:100', '1/200', 'Échelle 1:50'). null si non détecté."
    ),
  scale_ratio: z
    .number()
    .nullable()
    .describe(
      "Ratio numérique (ex: 100 pour 1:100, 200 pour 1:200). null si non détectable."
    ),
  reference_dimension: z
    .object({
      text: z
        .string()
        .describe("Texte de la dimension détectée (ex: '5,80 m', '4.20m')"),
      meters: z.number().describe("Valeur en mètres (ex: 5.80)"),
      location_hint: z
        .string()
        .describe(
          "Description de l'emplacement sur le plan (ex: 'mur de droite, étiquette en haut')"
        ),
    })
    .nullable()
    .describe(
      "Dimension cotée détectée (alternative à scale_ratio si pas de barre d'échelle textuelle)"
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Confiance globale 0-1 dans la détection. >= 0.9 = très fiable, 0.7-0.9 = à valider, < 0.7 = peu fiable, recommander manuel."
    ),
  reasoning: z
    .string()
    .describe("Justification courte du verdict en français (≤ 200 caractères)."),
});
export type PlanScaleResult = z.infer<typeof PlanScaleResultSchema>;

export class PlanScaleError extends Error {
  constructor(
    public code: "API_ERROR" | "PARSING_FAILED" | "NO_SCALE_FOUND",
    message: string
  ) {
    super(message);
    this.name = "PlanScaleError";
  }
}

export async function detectPlanScale(
  imageBase64: string,
  mimeType: string
): Promise<PlanScaleResult> {
  const client = getOpenAI();
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  const systemPrompt = `Tu es un assistant spécialisé dans l'analyse de plans architecturaux et techniques.
Ta mission : détecter l'échelle d'un plan d'immeuble pour permettre le calcul automatique des surfaces.

Règles strictes :
1. Cherche EN PRIORITÉ : barre d'échelle textuelle (ex: "1:100", "1/200", "Échelle 1:50", "Scale 1:100")
2. À DÉFAUT : cherche une dimension cotée explicite sur un mur (ex: "5,80 m", "4.20m", "580 cm")
3. Si AUCUNE indication fiable, retourne confidence < 0.7 et explique pourquoi.
4. Sois CONSERVATEUR sur la confiance : un doute = confiance plus basse. Mieux vaut tomber en fallback manuel qu'induire l'utilisateur en erreur sur des surfaces ÷4 ou ×2.
5. Réponds STRICTEMENT au format JSON Zod. Pas de markdown, pas de commentaire avant/après.`;

  const userPrompt = `Analyse ce plan d'architecte et détecte son échelle. Réponds en JSON strict conforme au schéma fourni.`;

  let response;
  try {
    response = await client.chat.completions.create({
      model: "gpt-4.1",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0,
    });
  } catch (err) {
    throw new PlanScaleError(
      "API_ERROR",
      err instanceof Error ? err.message : "Appel OpenAI échoué."
    );
  }

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    throw new PlanScaleError("PARSING_FAILED", "Réponse OpenAI vide.");
  }

  try {
    const parsed = JSON.parse(raw);
    return PlanScaleResultSchema.parse(parsed);
  } catch (err) {
    throw new PlanScaleError(
      "PARSING_FAILED",
      `Parsing échoué : ${err instanceof Error ? err.message : "format inattendu"}`
    );
  }
}

/**
 * Convertit un PlanScaleResult en m²/pixel calibré pour la DB.
 * Le calcul exact nécessite la résolution image. Si scale_ratio textuel détecté,
 * il faut connaître la taille en pixels d'1 mètre RÉEL projeté = (scale_ratio * 1000) / dpi.
 *
 * APPROCHE V1 du POC : retourner le scale_ratio brut + suggestion de longueur de référence.
 * Le frontend (PlanCalibration) place 2 points suggérés sur l'image et pré-remplit lengthMeters.
 * L'utilisateur valide d'1 clic.
 */
export function suggestCalibrationFromScale(
  scaleResult: PlanScaleResult,
  imageWidthPx: number,
  _imageHeightPx: number
): { suggestedLengthMeters: number; suggestedLengthPx: number } | null {
  if (scaleResult.confidence < 0.9) return null;

  // Cas 1 : ratio textuel détecté (ex: 1:100)
  if (scaleResult.scale_ratio && scaleResult.scale_ratio > 0) {
    // Heuristique : suggérer une ligne horizontale au tiers de la hauteur, longueur 30% de la largeur
    const suggestedLengthPx = imageWidthPx * 0.3;
    // À 1:100, 1 cm sur le plan = 100 cm = 1 m réel. À 96 DPI, 1 cm ≈ 37.8 px.
    // Donc suggestedLengthPx (px) / 37.8 (px/cm) = X cm sur le plan
    // X cm * scale_ratio / 100 = X * scale_ratio / 100 mètres réels
    const cmOnPlan = suggestedLengthPx / 37.8;
    const suggestedLengthMeters = (cmOnPlan * scaleResult.scale_ratio) / 100;
    return {
      suggestedLengthMeters: Number(suggestedLengthMeters.toFixed(1)),
      suggestedLengthPx,
    };
  }

  // Cas 2 : dimension cotée détectée (ex: "5.80 m")
  if (scaleResult.reference_dimension) {
    // Ne peut pas estimer la position exacte du mur sur le plan sans bounding box.
    // Suggère d'utiliser cette mesure comme valeur, et laisse l'utilisateur tracer la ligne A→B.
    return {
      suggestedLengthMeters: scaleResult.reference_dimension.meters,
      suggestedLengthPx: 0,
    };
  }

  return null;
}
