/**
 * CostEstimator — Étape 4 v2 / s30 Vague 3b + Round 2 (s30)
 *
 * Compteur coût IA estimé en temps réel (P0 persona Thomas Marchand).
 *
 * RÈGLE FONDATEUR (s29 propagée s30) : PURELY INFORMATIVE.
 * - JAMAIS de blocage technique
 * - JAMAIS de modale de confirmation
 * - JAMAIS de circuit breaker / threshold qui empêche l'action
 * - Crédits utilisateur gérés en V3 — V2 affiche juste l'estimation
 *
 * Round 2 (s30) — Friction P2 persona "absence de plafond visible" :
 * Affichage `$X.XX / $5.00 max` avec couleur indicative (info → warning à 90%).
 * La couleur change MAIS le bouton Générer reste actif (pattern CostHint).
 *
 * Calcul : Σ (target_visual_count × cost_per_visual) sur toutes les pièces actives.
 * Cost per visual : $0.21 (constant V2, source visual-job-runner.estimateJobCost).
 */

"use client";

import { useMemo } from "react";
import {
  computeCostHint,
  formatUsd,
  COST_HINT_THRESHOLD_USD,
} from "@/lib/vs/ui/cost-hint";

// Re-exports pour rétro-compat (anciens imports depuis le composant).
export {
  COST_PER_VISUAL_USD,
  COST_HINT_THRESHOLD_USD,
  COST_HINT_WARNING_RATIO,
} from "@/lib/vs/ui/cost-hint";

export interface CostEstimatorProps {
  /** Map<roomId, target_visual_count> — somme totale = nombre de visuels prévus. */
  roomTargets: Map<string, number>;
  /** Optionnel : titre pour aria-label (par défaut "Coût estimé"). */
  ariaLabel?: string;
}

export default function CostEstimator({ roomTargets, ariaLabel = "Coût estimé" }: CostEstimatorProps) {
  const hint = useMemo(() => computeCostHint(roomTargets), [roomTargets]);

  const formatted = formatUsd(hint.totalCostUsd);
  const cap = formatUsd(COST_HINT_THRESHOLD_USD);
  const isWarning = hint.tone === "warning";

  const containerClass = isWarning
    ? "inline-flex items-center gap-sm px-md py-xs rounded-md bg-warning/10 border border-warning/30 text-warning text-xs"
    : "inline-flex items-center gap-sm px-md py-xs rounded-md bg-info/10 border border-info/30 text-info text-xs";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      data-testid="cost-estimator"
      data-tone={hint.tone}
      className={containerClass}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
      </svg>
      <span>
        Coût estimé&nbsp;: <span className="font-semibold">{formatted}</span>
        <span className="ml-2xs opacity-80">/ {cap} max</span>
        <span className="text-text-muted ml-xs">
          ({hint.totalVisuals} visuel{hint.totalVisuals > 1 ? "s" : ""})
        </span>
      </span>
    </div>
  );
}
