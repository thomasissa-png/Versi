/**
 * s32 — Service Vision : analyse photo source → ArchitecturalDetails.
 *
 * Pré-remplit les 4 champs détails pièce (sol, murs, luminosité, particularités)
 * à partir d'UNE photo source du marchand. Le marchand peut tout écraser.
 *
 * Stratégie :
 *   - 1 appel gpt-4o-mini avec image input + prompt JSON-structured
 *   - Modèle retourne JSON strict { floor, walls, lighting, specifics }
 *   - Confidence ∈ [0, 1] dérivée des keywords du modèle (clearly|likely|maybe|uncertain)
 *   - Si parsing échoue → toutes les valeurs null avec source=null
 *
 * Règle absolue : la saisie marchand (source='user') prime toujours.
 * Cette fonction ne renvoie QUE source='vision' ou source=null.
 *
 * Coût indicatif : gpt-4o-mini ~$0.15 / 1M input tokens, ~$0.60 / 1M output.
 * Une analyse = ~1500 input tokens (image + prompt) + ~200 output tokens
 * → ~$0.0003 / pièce. Négligeable. Pas de circuit-breaker.
 */

import OpenAI from "openai";
import {
  ARCHITECTURAL_DETAILS_OPTIONS,
  emptyArchitecturalDetails,
  type ArchitecturalDetails,
  type ArchitecturalFieldValue,
} from "./types";

// ─── Singleton OpenAI ──────────────────────────────────────────────
let _openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openaiClient;
}

const MODEL = "gpt-4o-mini";
const TIMEOUT_MS = 30_000;
const MIN_CONFIDENCE_TO_KEEP = 0; // on retourne TOUS les champs avec leur confidence ; le client décide du seuil pré-remplissage UI

/** Mappe les niveaux qualitatifs renvoyés par le modèle à des numérals. */
const CONFIDENCE_MAP: Record<string, number> = {
  clearly: 0.95,
  obviously: 0.95,
  certain: 0.95,
  likely: 0.8,
  probably: 0.8,
  maybe: 0.5,
  uncertain: 0.3,
  unclear: 0.3,
};

function buildPrompt(): string {
  const opts = ARCHITECTURAL_DETAILS_OPTIONS;
  return `Tu es un architecte d'intérieur expérimenté. Analyse cette photo d'une pièce et identifie 4 caractéristiques architecturales avec un niveau de confiance.

Réponds UNIQUEMENT avec un JSON valide selon ce schéma exact (aucun texte autour, aucun code fence) :
{
  "not_a_room": <true if image is NOT an interior room (exterior view, blurry, invalid, document, etc.) — else omit or false>,
  "floor": { "value": <one of ${JSON.stringify(opts.floor)} or null>, "confidence_word": "clearly"|"likely"|"maybe"|"uncertain" },
  "walls": { "value": <one of ${JSON.stringify(opts.walls)} or null>, "confidence_word": "clearly"|"likely"|"maybe"|"uncertain" },
  "lighting": { "value": <one of ${JSON.stringify(opts.lighting)} or null>, "confidence_word": "clearly"|"likely"|"maybe"|"uncertain" },
  "specifics": [{ "value": <one of ${JSON.stringify(opts.specifics)}>, "confidence_word": "clearly"|"likely"|"maybe"|"uncertain" }, ...]
}

Règles :
- Si l'image NE montre PAS un intérieur de pièce (vue extérieure, photo floue, document, plan, capture invalide) :
  retourne { "not_a_room": true, "floor": { "value": null, "confidence_word": "uncertain" }, "walls": { "value": null, "confidence_word": "uncertain" }, "lighting": { "value": null, "confidence_word": "uncertain" }, "specifics": [] }.
  N'invente JAMAIS de valeurs si la photo n'est pas une pièce.
- Choisis EXACTEMENT une valeur autorisée (ou null pour les champs simples si vraiment indéterminable).
- Pour "specifics", retourne un tableau (peut être vide). Inclus uniquement les particularités visibles.
- "clearly" = visible sans ambiguïté ; "likely" = forte probabilité ; "maybe" = hypothèse ; "uncertain" = très peu fiable.
- Si la photo est floue / partielle, privilégie "uncertain" plutôt qu'inventer.
- Pas de markdown, pas de commentaire, JUSTE le JSON.`;
}

interface ParsedField {
  value: string | null;
  confidence_word?: string;
}

interface ParsedResponse {
  /** s32 P0-2 — flag explicite si l'image n'est pas une pièce. */
  not_a_room?: boolean;
  floor: ParsedField;
  walls: ParsedField;
  lighting: ParsedField;
  specifics: Array<{ value: string; confidence_word?: string }>;
}

/**
 * Convertit un mot de confiance en numéral [0,1].
 * Tolère casse, espaces, mots inconnus (→ 0.5 par défaut).
 */
function wordToConfidence(word: string | undefined): number {
  if (!word) return 0.5;
  const key = word.toLowerCase().trim();
  return CONFIDENCE_MAP[key] ?? 0.5;
}

/**
 * Parse robust : retire code fences éventuels, tente JSON.parse.
 * Retourne null si parsing impossible.
 */
function safeParseJson(raw: string): ParsedResponse | null {
  try {
    // Retire code fences markdown éventuels
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as ParsedResponse;
  } catch {
    return null;
  }
}

/**
 * Convertit une réponse parsée en ArchitecturalDetails normalisé.
 * Filtre les valeurs hors enum (sécurité). Source toujours 'vision'.
 */
function normalizeResponse(parsed: ParsedResponse): ArchitecturalDetails {
  const opts = ARCHITECTURAL_DETAILS_OPTIONS;
  const out = emptyArchitecturalDetails();

  function buildSingle(
    raw: ParsedField | undefined,
    allowed: readonly string[]
  ): ArchitecturalFieldValue {
    if (!raw || raw.value == null) {
      return { value: null, source: null };
    }
    if (!allowed.includes(raw.value)) {
      return { value: null, source: null };
    }
    const confidence = wordToConfidence(raw.confidence_word);
    if (confidence < MIN_CONFIDENCE_TO_KEEP) {
      return { value: null, source: null };
    }
    return { value: raw.value, source: "vision", confidence };
  }

  out.floor = buildSingle(parsed.floor, opts.floor);
  out.walls = buildSingle(parsed.walls, opts.walls);
  out.lighting = buildSingle(parsed.lighting, opts.lighting);

  if (Array.isArray(parsed.specifics)) {
    const allowed = opts.specifics as readonly string[];
    out.specifics = parsed.specifics
      .filter((s) => s && typeof s.value === "string" && allowed.includes(s.value))
      .map((s) => ({
        value: s.value,
        source: "vision" as const,
        confidence: wordToConfidence(s.confidence_word),
      }));
  }

  return out;
}

/**
 * Analyse une photo source pour pré-remplir les 4 détails architecturaux pièce.
 *
 * @param photoUrl URL absolue de la photo source (accessible par OpenAI)
 * @returns ArchitecturalDetails avec source='vision' (ou null si échec)
 */
export async function analyzePhotoForArchitecturalDetails(params: {
  photoUrl: string;
}): Promise<ArchitecturalDetails> {
  const { photoUrl } = params;
  if (!photoUrl) return emptyArchitecturalDetails();

  // Validation env (placeholder check anti-CLAUDE.md règle)
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.length < 20) {
    console.warn("[architectural-vision] OPENAI_API_KEY manquant, skip");
    return emptyArchitecturalDetails();
  }

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create(
      {
        model: MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: buildPrompt() },
              { type: "image_url", image_url: { url: photoUrl, detail: "low" } },
            ],
          },
        ],
        max_tokens: 400,
        temperature: 0.1, // proche déterministe — la même photo doit donner le même JSON
      },
      { timeout: TIMEOUT_MS }
    );

    const raw = response.choices[0]?.message?.content;
    if (!raw || typeof raw !== "string") {
      console.warn("[architectural-vision] réponse vide", { photoUrl });
      return emptyArchitecturalDetails();
    }

    const parsed = safeParseJson(raw);
    if (!parsed) {
      console.warn("[architectural-vision] JSON invalide", {
        rawHead: raw.slice(0, 200),
      });
      return emptyArchitecturalDetails();
    }

    // s32 P0-2 — edge case "not a room" : si l'image n'est pas un intérieur,
    // on retourne un détails vide sans tenter de parser (évite valeurs inventées).
    if (parsed.not_a_room === true) {
      console.warn("[architectural-vision] image flagged not_a_room", {
        photoUrl,
      });
      return emptyArchitecturalDetails();
    }

    return normalizeResponse(parsed);
  } catch (err) {
    console.error("[architectural-vision] erreur analyse :", err);
    return emptyArchitecturalDetails();
  }
}
