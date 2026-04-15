/**
 * Définitions des 12 styles de décoration et labels de pièces.
 *
 * Source de vérité pour les prompts de génération visuelle et l'agent architecte.
 * Importé par visual-generator.ts et architect-agent.ts.
 */

// ─── Types ─────────────────────────────────────────────────────────

export interface StyleDefinition {
  name: string;
  prompt_hint: string;
}

export type StyleId =
  | "scandinave"
  | "industriel"
  | "moderne"
  | "boheme"
  | "classique"
  | "minimaliste"
  | "art-deco"
  | "tropical"
  | "wabi-sabi"
  | "mid-century"
  | "cottagecore"
  | "japandi";

// ─── Les 12 styles de décoration ───────────────────────────────────

export const STYLES: Record<StyleId, StyleDefinition> = {
  scandinave: {
    name: "Scandinave",
    prompt_hint: "bois clair, blanc, tons neutres, minimaliste, lumineux, textile doux",
  },
  industriel: {
    name: "Industriel",
    prompt_hint: "métal brut, briques, béton, éclairage Edison, bois foncé, loft",
  },
  moderne: {
    name: "Moderne",
    prompt_hint: "lignes épurées, tons neutres, matériaux premium, éclairage intégré",
  },
  boheme: {
    name: "Bohème",
    prompt_hint: "textiles ethniques, plantes, macramé, couleurs chaudes, mix & match",
  },
  classique: {
    name: "Classique",
    prompt_hint: "moulures, parquet point de Hongrie, velours, tons crème et or",
  },
  minimaliste: {
    name: "Minimaliste",
    prompt_hint: "épuré, formes simples, peu de mobilier, tons monochromes",
  },
  "art-deco": {
    name: "Art Déco",
    prompt_hint: "géométrie, laiton, velours, marbre, noir et doré",
  },
  tropical: {
    name: "Tropical",
    prompt_hint: "plantes tropicales, rotin, bois naturel, couleurs végétales, lumière chaude",
  },
  "wabi-sabi": {
    name: "Wabi-Sabi",
    prompt_hint: "imperfections, matériaux bruts, tons terreux, artisanat, zen",
  },
  "mid-century": {
    name: "Mid-Century Modern",
    prompt_hint: "pieds compas, formes organiques, bois noyer, couleurs moutarde et teal",
  },
  cottagecore: {
    name: "Cottagecore",
    prompt_hint: "campagne chic, fleurs séchées, lin, vaisselle vintage, tons pastels",
  },
  japandi: {
    name: "Japandi",
    prompt_hint: "fusion scandinave-japonais, bois clair, lignes pures, wabi-sabi nordique",
  },
};

// ─── Les 18 types de pièces avec labels français courants ──────────

export type RoomTypeKey =
  | "chambre"
  | "chambre_parentale"
  | "salon"
  | "sejour"
  | "salle_a_manger"
  | "cuisine"
  | "sdb"
  | "wc"
  | "entree"
  | "bureau"
  | "dressing"
  | "cellier"
  | "terrasse"
  | "garage"
  | "couloir"
  | "cave"
  | "balcon"
  | "autre";

export const ROOM_TYPE_LABELS: Record<RoomTypeKey, string> = {
  chambre: "chambre à coucher",
  chambre_parentale: "suite parentale",
  salon: "salon",
  sejour: "pièce de vie",
  salle_a_manger: "salle à manger",
  cuisine: "cuisine",
  sdb: "salle de bains",
  wc: "toilettes",
  entree: "entrée",
  bureau: "bureau",
  dressing: "dressing",
  cellier: "cellier",
  terrasse: "terrasse",
  garage: "garage",
  couloir: "couloir",
  cave: "cave",
  balcon: "balcon",
  autre: "pièce",
};

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Retourne la définition du style ou null si l'ID est inconnu.
 */
export function getStyle(styleId: string): StyleDefinition | null {
  return STYLES[styleId as StyleId] ?? null;
}

/**
 * Retourne le label français d'un type de pièce.
 * Fallback sur le type brut si non trouvé dans le mapping.
 */
export function getRoomLabel(roomType: string): string {
  return ROOM_TYPE_LABELS[roomType as RoomTypeKey] ?? roomType;
}

/**
 * Liste tous les IDs de styles disponibles.
 */
export function getAvailableStyleIds(): StyleId[] {
  return Object.keys(STYLES) as StyleId[];
}
