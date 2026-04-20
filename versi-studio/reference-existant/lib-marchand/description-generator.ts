/**
 * Générateur de description commerciale pour les lots marchands.
 *
 * Source de vérité : docs/marchand-pivot/ia/technical-architecture.md sections 1.5 et 4.3.
 * Génère un paragraphe commercial (80-120 mots, français) via GPT-4.1-mini.
 * Fallback template si erreur — ne bloque jamais la génération du PDF.
 */
import OpenAI from "openai";
import type { LotWithRooms, ProjectInfo } from "@/lib/marchand/schemas";

// ─── Singleton OpenAI client ────────────────────────────────────────
let _openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openaiClient;
}

// ─── System prompt ──────────────────────────────────────────────────
const COMMERCIAL_DESCRIPTION_SYSTEM_PROMPT = `Tu es un rédacteur immobilier professionnel. Tu rédiges des descriptions d'annonces pour des marchands de biens.

RÈGLES:
1. 80-120 mots maximum, en français.
2. Ton professionnel et engageant, pas d'exagération ("exceptionnel", "unique") — factuel et valorisant.
3. Commencer par le type de bien et la localisation.
4. Mentionner les atouts clés : surface, nombre de pièces, exposition si connue, style de décoration.
5. Adapter le vocabulaire à la cible acheteur :
   - famille → "espace de vie généreux", "chambres spacieuses", "quartier familial"
   - investisseur → "potentiel locatif", "secteur recherché", "rentabilité"
   - senior → "plain-pied", "lumineux", "calme"
6. NE JAMAIS mentionner Versimo, l'IA, ou le fait que les visuels sont virtuels.
7. NE JAMAIS inventer des informations non fournies (exposition, parking, cave).
8. Terminer par une phrase d'appel à action subtile.

OUTPUT: Texte brut en français, sans guillemets englobants, sans markdown.`;

// ─── Main function ──────────────────────────────────────────────────

/**
 * Generate a commercial description for a lot.
 *
 * @param lot - Lot data with rooms
 * @param project - Project info (address, type, surface)
 * @returns Commercial description in French (80-120 words), or fallback template
 */
export async function generateCommercialDescription(
  lot: LotWithRooms,
  project: ProjectInfo
): Promise<string> {
  const openai = getOpenAI();
  const userMessage = buildUserMessage(lot, project);

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: COMMERCIAL_DESCRIPTION_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    const textOutput = response.output.find((o) => o.type === "message");
    if (!textOutput || textOutput.type !== "message") {
      console.warn("[description-generator] No message output, using fallback");
      return buildFallbackDescription(lot, project);
    }
    const textContent = textOutput.content.find((c) => c.type === "output_text");
    if (!textContent || textContent.type !== "output_text" || !textContent.text.trim()) {
      console.warn("[description-generator] Empty text output, using fallback");
      return buildFallbackDescription(lot, project);
    }

    return textContent.text.trim();
  } catch (err) {
    console.error(
      "[description-generator] Generation failed, using fallback:",
      err instanceof Error ? err.message : err
    );
    return buildFallbackDescription(lot, project);
  }
}

// ─── Internal helpers ───────────────────────────────────────────────

function buildUserMessage(lot: LotWithRooms, project: ProjectInfo): string {
  const roomList = lot.rooms
    .map((r) => {
      const surface = r.surface_m2 !== null ? `${r.surface_m2} m²` : "surface non précisée";
      return `- ${r.name} (${r.room_type}) : ${surface}`;
    })
    .join("\n");

  const surfaceText = project.surface_totale
    ? `${project.surface_totale} m²`
    : lot.surface_m2
      ? `${lot.surface_m2} m²`
      : "Surface non précisée";

  return `TYPE DE BIEN: ${project.type_bien}
ADRESSE: ${project.adresse}
SURFACE: ${surfaceText}
NOM DU LOT: ${lot.name}
ÉTAGE: ${lot.floor !== null ? (lot.floor === 0 ? "Rez-de-chaussée" : `Étage ${lot.floor}`) : "Non précisé"}
CIBLE ACHETEUR: ${lot.target_buyer ?? "Non définie"}
STYLE DE DÉCORATION: ${lot.style_id ?? "Non défini"}

PIÈCES:
${roomList}

Rédige la description commerciale de ce lot.`;
}

function buildFallbackDescription(lot: LotWithRooms, project: ProjectInfo): string {
  const typeLabel = TYPE_LABELS[project.type_bien] ?? project.type_bien;
  const surface = lot.surface_m2 ?? project.surface_totale;
  const surfaceText = surface ? `de ${surface} m² ` : "";
  const roomCount = lot.rooms.length;
  const roomText = roomCount > 1 ? `${roomCount} pièces` : "1 pièce";

  return `Bel ${typeLabel} ${surfaceText}comprenant ${roomText}, idéalement situé au ${project.adresse}. À découvrir.`;
}

const TYPE_LABELS: Record<string, string> = {
  appartement: "appartement",
  maison: "maison",
  immeuble: "immeuble",
  bureaux: "local de bureaux",
  local_commercial: "local commercial",
};
