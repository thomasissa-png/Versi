/**
 * Tests unitaires — cost-hint helpers (s30 Round 2 Friction P2 plafond visible)
 *
 * Couvre :
 *  - computeCostHint : somme + cap par room + bascule info/warning sur seuil 90%
 *  - formatUsd : format $X.XX
 *  - JAMAIS de retour "blocking" (préf fondateur s29 — PURELY INFORMATIVE)
 */

import { describe, it, expect } from "vitest";
import {
  computeCostHint,
  formatUsd,
  COST_PER_VISUAL_USD,
  COST_HINT_THRESHOLD_USD,
  COST_HINT_WARNING_RATIO,
} from "@/lib/vs/ui/cost-hint";

describe("computeCostHint", () => {
  it("retourne 0 visuel / $0.00 / tone info pour map vide", () => {
    const r = computeCostHint(new Map());
    expect(r.totalVisuals).toBe(0);
    expect(r.totalCostUsd).toBe(0);
    expect(r.tone).toBe("info");
  });

  it("somme les targets et applique cost-per-visual = $0.21", () => {
    const targets = new Map<string, number>([
      ["room-a", 3],
      ["room-b", 2],
      ["room-c", 0],
    ]);
    const r = computeCostHint(targets);
    expect(r.totalVisuals).toBe(5);
    expect(r.totalCostUsd).toBeCloseTo(5 * COST_PER_VISUAL_USD, 5);
  });

  it("cape chaque room à 5 visuels max (slider 0-5)", () => {
    const targets = new Map<string, number>([
      ["room-a", 999],
      ["room-b", -3],
    ]);
    const r = computeCostHint(targets);
    // 999 → 5, -3 → 0, total 5
    expect(r.totalVisuals).toBe(5);
  });

  it("force valeurs entières (slider envoie 3.7 ?)", () => {
    const targets = new Map<string, number>([["room-a", 3.7]]);
    const r = computeCostHint(targets);
    expect(r.totalVisuals).toBe(3);
  });

  it("tone = 'info' tant que coût < 90% du plafond ($4.50)", () => {
    // 21 visuels × $0.21 = $4.41 < $4.50
    const targets = new Map<string, number>(
      Array.from({ length: 21 }, (_, i) => [`r-${i}`, 1]),
    );
    const r = computeCostHint(targets);
    expect(r.totalCostUsd).toBeLessThan(COST_HINT_THRESHOLD_USD * COST_HINT_WARNING_RATIO);
    expect(r.tone).toBe("info");
  });

  it("tone = 'warning' dès 90% du plafond atteint ($4.50)", () => {
    // 22 visuels × $0.21 = $4.62 ≥ $4.50
    const targets = new Map<string, number>(
      Array.from({ length: 22 }, (_, i) => [`r-${i}`, 1]),
    );
    const r = computeCostHint(targets);
    expect(r.totalCostUsd).toBeGreaterThanOrEqual(
      COST_HINT_THRESHOLD_USD * COST_HINT_WARNING_RATIO,
    );
    expect(r.tone).toBe("warning");
  });

  it("tone reste 'warning' au-dessus du plafond — JAMAIS de blocage", () => {
    // 30 visuels × $0.21 = $6.30 > $5 — la fonction NE jette PAS
    const targets = new Map<string, number>(
      Array.from({ length: 30 }, (_, i) => [`r-${i}`, 1]),
    );
    const r = computeCostHint(targets);
    expect(r.totalCostUsd).toBeGreaterThan(COST_HINT_THRESHOLD_USD);
    expect(r.tone).toBe("warning"); // pas "danger" ni "blocked"
  });
});

describe("formatUsd", () => {
  it("formate avec 2 décimales et symbole $", () => {
    expect(formatUsd(3.78)).toBe("$3.78");
    expect(formatUsd(5)).toBe("$5.00");
    expect(formatUsd(0)).toBe("$0.00");
  });

  it("arrondit correctement les float imprécis", () => {
    // 21 × 0.21 = 4.41 (mais arithmétique flottante → 4.4099999...)
    expect(formatUsd(21 * 0.21)).toBe("$4.41");
  });
});
