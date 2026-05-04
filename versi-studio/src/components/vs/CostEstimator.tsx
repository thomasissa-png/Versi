/**
 * CostEstimator — Étape 4 v2 / s30 Vague 3b
 *
 * Compteur coût IA estimé en temps réel (P0 persona Thomas Marchand).
 *
 * RÈGLE FONDATEUR (s29 propagée s30) : PURELY INFORMATIVE.
 * - JAMAIS de blocage technique
 * - JAMAIS de modale de confirmation
 * - JAMAIS de circuit breaker / threshold
 * - Crédits utilisateur gérés en V3 — V2 affiche juste l'estimation
 *
 * Calcul : Σ (target_visual_count × cost_per_visual) sur toutes les pièces actives.
 * Cost per visual : $0.21 (constant V2, source visual-job-runner.estimateJobCost).
 *
 * Couleur info (bleu), pas warning, pas erreur.
 */

"use client";

import { useMemo } from "react";

/** Coût par visuel généré ($USD). Source : visual-job-runner.ts. */
export const COST_PER_VISUAL_USD = 0.21;

export interface CostEstimatorProps {
  /** Map<roomId, target_visual_count> — somme totale = nombre de visuels prévus. */
  roomTargets: Map<string, number>;
  /** Optionnel : titre pour aria-label (par défaut "Coût estimé"). */
  ariaLabel?: string;
}

export default function CostEstimator({ roomTargets, ariaLabel = "Coût estimé" }: CostEstimatorProps) {
  const { totalVisuals, totalCostUsd } = useMemo(() => {
    let visuals = 0;
    for (const v of roomTargets.values()) {
      visuals += Math.max(0, Math.min(5, v | 0));
    }
    return {
      totalVisuals: visuals,
      totalCostUsd: visuals * COST_PER_VISUAL_USD,
    };
  }, [roomTargets]);

  const formatted = totalCostUsd.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      data-testid="cost-estimator"
      className="inline-flex items-center gap-sm px-md py-xs rounded-md bg-info/10 border border-info/30 text-info text-xs"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
      </svg>
      <span>
        Coût estimé&nbsp;: <span className="font-semibold">{formatted}</span>
        <span className="text-text-muted ml-xs">
          ({totalVisuals} visuel{totalVisuals > 1 ? "s" : ""})
        </span>
      </span>
    </div>
  );
}
