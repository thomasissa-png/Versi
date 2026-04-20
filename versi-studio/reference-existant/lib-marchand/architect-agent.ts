/**
 * Agent architecte pour recommandations de réagencement.
 *
 * Source de vérité : docs/marchand-pivot/ia/technical-architecture.md sections 1.2 et 4.2.
 * Analyse les pièces validées + qualification du lot et produit des recommandations
 * de réagencement argumentées via GPT-4.1 text (structured output).
 */
import OpenAI from "openai";
import {
  ArchitectRecommendationSetSchema,
  type ArchitectRecommendationSet,
  type ValidatedRoom,
  type LotQualification,
} from "@/lib/marchand/schemas";

// ─── Singleton OpenAI client ────────────────────────────────────────
let _openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openaiClient;
}

// ─── System prompt ──────────────────────────────────────────────────
function buildSystemPrompt(styleId: string): string {
  return `Tu es un architecte d'intérieur expert en valorisation immobilière pour marchands de biens. Tu as 20 ans d'expérience dans l'optimisation de biens avant revente.

CONTEXTE: Un marchand de biens t'envoie les données d'un lot (pièces, dimensions, cible acheteur, style choisi, budget travaux, contraintes). Tu dois produire des recommandations de réagencement qui MAXIMISENT la valeur perçue par la cible acheteur.

RÈGLES:
1. Chaque recommandation doit être ACTIONNABLE et CHIFFRABLE (coût estimé en euros).
2. RESPECTER LE BUDGET: si budget_travaux est renseigné, ne jamais proposer d'action dont le coût dépasse le budget restant. Si budget < 5000€, limiter aux actions décoratives (peinture, sol, luminaires).
3. RESPECTER LES CONTRAINTES: si "PMR" est mentionné, inclure au moins 1 recommandation accessibilité. Si "pas de mur porteur" est mentionné, ne jamais proposer de démolition.
4. ADAPTER À LA CIBLE:
   - famille → espace ouvert cuisine/séjour, chambre enfant, rangements
   - couple_sans_enfant → espace de vie lumineux, suite parentale, dressing
   - etudiant → optimisation m², bureau intégré, kitchenette fonctionnelle
   - investisseur_locatif → rendement locatif, séparation zones, cuisine équipée
   - senior → accessibilité, douche italienne, lumière naturelle, pas de marches
   - professionnel_liberal → bureau séparé, accueil client, isolation phonique
5. MAXIMUM 8 recommandations par lot, ordonnées par impact décroissant.
6. Ne jamais recommander des travaux structurels lourds (fondations, toiture) — hors scope marchand de biens.
7. Le champ "rationale_buyer" explique POURQUOI cette modification parle à la cible — c'est l'argument de vente.

STYLE CHOISI: ${styleId}. Les recommandations doivent être cohérentes avec ce style (ne pas recommander du béton ciré si le style est Haussmannien).

OUTPUT: JSON structuré selon le schema fourni. Pas de texte hors JSON.`;
}

// ─── JSON Schema for structured output ──────────────────────────────
const RECOMMENDATION_JSON_SCHEMA = {
  name: "architect_recommendations",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      recommendations: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            id: { type: "string" as const },
            title: { type: "string" as const },
            description: { type: "string" as const },
            action_type: {
              type: "string" as const,
              enum: ["redistribution", "cloison", "affectation", "deco", "sol", "luminaire"],
            },
            estimated_cost_eur: { type: ["number", "null"] as const },
            impact_level: {
              type: "string" as const,
              enum: ["basse", "moyenne", "haute"],
            },
            affected_rooms: {
              type: "array" as const,
              items: { type: "string" as const },
            },
            rationale_buyer: { type: "string" as const },
          },
          required: [
            "id", "title", "description", "action_type",
            "estimated_cost_eur", "impact_level", "affected_rooms", "rationale_buyer",
          ],
          additionalProperties: false,
        },
      },
      summary: { type: "string" as const },
    },
    required: ["recommendations", "summary"],
    additionalProperties: false,
  },
};

// ─── Main function ──────────────────────────────────────────────────

/**
 * Generate architect recommendations for a lot based on room data and qualification.
 *
 * @param rooms - Validated rooms belonging to this lot
 * @param lot - Lot qualification (target buyer, style, budget, constraints)
 * @returns Recommendation set or null if generation fails (non-blocking)
 */
export async function generateRecommendations(
  rooms: ValidatedRoom[],
  lot: LotQualification
): Promise<ArchitectRecommendationSet | null> {
  const openai = getOpenAI();
  const systemPrompt = buildSystemPrompt(lot.style_id);

  // Build user message with all context
  const userMessage = buildUserMessage(rooms, lot);

  // First attempt
  let rawJson: string;
  try {
    rawJson = await callArchitectAgent(openai, systemPrompt, userMessage);
  } catch (err) {
    // Retry once
    console.warn(
      "[architect-agent] First attempt failed, retrying...",
      err instanceof Error ? err.message : err
    );
    try {
      rawJson = await callArchitectAgent(openai, systemPrompt, userMessage);
    } catch (retryErr) {
      console.error(
        "[architect-agent] Retry failed, returning null",
        retryErr instanceof Error ? retryErr.message : retryErr
      );
      return null;
    }
  }

  // Parse and validate
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    console.error("[architect-agent] Invalid JSON response");
    return null;
  }

  const validation = ArchitectRecommendationSetSchema.safeParse(parsed);
  if (!validation.success) {
    console.error(
      "[architect-agent] Zod validation failed:",
      validation.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
    );
    return null;
  }

  // Filter by budget if specified
  const result = validation.data;
  if (lot.budget_travaux !== null && lot.budget_travaux !== undefined) {
    result.recommendations = filterByBudget(
      result.recommendations,
      lot.budget_travaux
    );
  }

  return result;
}

// ─── Internal helpers ───────────────────────────────────────────────

function buildUserMessage(rooms: ValidatedRoom[], lot: LotQualification): string {
  const roomSummaries = rooms.map((r) => {
    const dims = r.dimensions
      ? `${r.dimensions.length_m}m x ${r.dimensions.width_m}m`
      : "dimensions inconnues";
    const surface = r.surface_m2 !== null ? `${r.surface_m2} m²` : "surface inconnue";
    return `- ${r.name_raw} (${r.room_type}): ${surface}, ${dims}, ${r.windows_count} fenêtres, ${r.doors_count} portes${r.shape ? `, forme: ${r.shape}` : ""}${r.notes ? ` — Note: ${r.notes}` : ""}`;
  });

  return `LOT: ${lot.name}
CIBLE ACHETEUR: ${lot.target_buyer}
STYLE: ${lot.style_id}
BUDGET TRAVAUX: ${lot.budget_travaux !== null ? `${lot.budget_travaux}€` : "Non défini"}
CONTRAINTES: ${lot.contraintes ?? "Aucune"}
NOTES COMMERCIALES: ${lot.notes_commerciales ?? "Aucune"}

PIÈCES DU LOT:
${roomSummaries.join("\n")}

Produis tes recommandations de réagencement pour ce lot.`;
}

async function callArchitectAgent(
  openai: OpenAI,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const response = await openai.responses.create({
    model: "gpt-4.1",
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    text: {
      format: {
        type: "json_schema",
        ...RECOMMENDATION_JSON_SCHEMA,
      },
    },
  });

  const textOutput = response.output.find((o) => o.type === "message");
  if (!textOutput || textOutput.type !== "message") {
    throw new Error("No message output from GPT-4.1");
  }
  const textContent = textOutput.content.find((c) => c.type === "output_text");
  if (!textContent || textContent.type !== "output_text") {
    throw new Error("No text content in GPT-4.1 response");
  }
  return textContent.text;
}

function filterByBudget(
  recommendations: ArchitectRecommendationSet["recommendations"],
  budget: number
): ArchitectRecommendationSet["recommendations"] {
  let remaining = budget;
  return recommendations.filter((rec) => {
    if (rec.estimated_cost_eur === null) return true; // Keep if cost unknown
    if (rec.estimated_cost_eur <= remaining) {
      remaining -= rec.estimated_cost_eur;
      return true;
    }
    return false;
  });
}
