/**
 * cost-hint — Helpers purs pour CostEstimator (s30 Round 2)
 *
 * Logique calcul/formatage extraite du composant pour testabilité Vitest (env "node")
 * sans introduire jsdom/RTL.
 *
 * RÈGLE FONDATEUR (s29 propagée s30) : PURELY INFORMATIVE.
 * Aucune fonction ici ne signale un blocage — uniquement des hints visuels.
 */

/** Coût par visuel généré ($USD). Source : visual-job-runner.ts. */
export const COST_PER_VISUAL_USD = 0.21;

/**
 * Plafond indicatif persona Thomas (verbatim s29 "$3.80 / $5.00 max").
 * UNIQUEMENT pour l'affichage — JAMAIS pour bloquer une action.
 */
export const COST_HINT_THRESHOLD_USD = 5.0;

/** Seuil de bascule info → warning (90% du plafond, ≈ $4.50). */
export const COST_HINT_WARNING_RATIO = 0.9;

/** Borne max par pièce (slider 0-5). */
const MAX_VISUALS_PER_ROOM = 5;

export type CostTone = "info" | "warning";

export interface CostHint {
  /** Nombre total de visuels (somme des targets, capped 0-5 par room). */
  totalVisuals: number;
  /** Coût total estimé en USD. */
  totalCostUsd: number;
  /** Couleur indicative — "warning" dès 90% du plafond, JAMAIS bloquant. */
  tone: CostTone;
}

/**
 * Calcule le hint coût à partir des targets par room.
 * Pure : pas d'effets, idempotent, testable.
 */
export function computeCostHint(roomTargets: ReadonlyMap<string, number>): CostHint {
  let totalVisuals = 0;
  for (const v of roomTargets.values()) {
    // Cap 0..MAX_VISUALS_PER_ROOM, force entier.
    const safe = Math.max(0, Math.min(MAX_VISUALS_PER_ROOM, v | 0));
    totalVisuals += safe;
  }
  const totalCostUsd = totalVisuals * COST_PER_VISUAL_USD;
  const tone: CostTone =
    totalCostUsd >= COST_HINT_THRESHOLD_USD * COST_HINT_WARNING_RATIO ? "warning" : "info";
  return { totalVisuals, totalCostUsd, tone };
}

/** Formate un montant en USD avec 2 décimales (ex: $3.78). */
export function formatUsd(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
