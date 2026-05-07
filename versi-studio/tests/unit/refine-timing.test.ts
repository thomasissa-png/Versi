/**
 * Tests unitaires — refine-timing helpers (s33 issue #5)
 *
 * Couvre :
 *  - computeRefinePhase : transitions 'generating' → 'long-wait' → 'background'
 *  - shouldStopPolling : true uniquement à T+240 s
 *  - shouldClearErrorOnSuccess : cleanup setError quand succès tardif arrive
 *  - REFINE_COPY : zéro anglicisme, mots pivots métier (G33)
 *  - constantes : 240 s timeout, 90 s warning, 4 s polling
 *
 * Pattern helper-first (s30 règle) : pas besoin de jsdom, env=node OK.
 */

import { describe, it, expect } from "vitest";
import {
  REFINE_COPY,
  REFINE_LONG_WAIT_THRESHOLD_MS,
  REFINE_MAX_INSTRUCTION_LENGTH,
  REFINE_POLL_INTERVAL_MS,
  REFINE_POLL_MAX_DURATION_MS,
  computeRefinePhase,
  shouldClearErrorOnSuccess,
  shouldStopPolling,
} from "@/lib/vs/ui/refine-timing";

describe("constantes refine-timing", () => {
  it("timeout total = 240 s (4 min, couvre cold start Replit + gpt-image-2)", () => {
    expect(REFINE_POLL_MAX_DURATION_MS).toBe(240_000);
  });

  it("warning intermédiaire = 90 s (médiane gpt-image-2 nominal)", () => {
    expect(REFINE_LONG_WAIT_THRESHOLD_MS).toBe(90_000);
  });

  it("interval polling = 4 s (cohérent avec useVisualsStream parent)", () => {
    expect(REFINE_POLL_INTERVAL_MS).toBe(4_000);
  });

  it("max instruction = 500 chars (limite UX raisonnable)", () => {
    expect(REFINE_MAX_INSTRUCTION_LENGTH).toBe(500);
  });

  it("warning < timeout (sinon le warning ne s'affiche jamais)", () => {
    expect(REFINE_LONG_WAIT_THRESHOLD_MS).toBeLessThan(REFINE_POLL_MAX_DURATION_MS);
  });
});

describe("computeRefinePhase", () => {
  it("retourne 'generating' à T=0", () => {
    expect(computeRefinePhase(0)).toBe("generating");
  });

  it("retourne 'generating' juste avant 90 s", () => {
    expect(computeRefinePhase(89_999)).toBe("generating");
  });

  it("bascule en 'long-wait' à exactement 90 s", () => {
    expect(computeRefinePhase(90_000)).toBe("long-wait");
  });

  it("reste 'long-wait' juste avant 240 s", () => {
    expect(computeRefinePhase(239_999)).toBe("long-wait");
  });

  it("bascule en 'background' à exactement 240 s", () => {
    expect(computeRefinePhase(240_000)).toBe("background");
  });

  it("reste 'background' au-delà de 240 s (jamais d'erreur figée)", () => {
    expect(computeRefinePhase(500_000)).toBe("background");
  });
});

describe("shouldStopPolling", () => {
  it("false avant 240 s", () => {
    expect(shouldStopPolling(0)).toBe(false);
    expect(shouldStopPolling(120_000)).toBe(false);
    expect(shouldStopPolling(239_999)).toBe(false);
  });

  it("true à partir de 240 s (UI rend la main au polling parent)", () => {
    expect(shouldStopPolling(240_000)).toBe(true);
    expect(shouldStopPolling(300_000)).toBe(true);
  });
});

describe("shouldClearErrorOnSuccess (cleanup setError s33 issue #5)", () => {
  it("clear si succès arrive en phase 'background' (cas Thomas prod)", () => {
    expect(shouldClearErrorOnSuccess("background", "generated")).toBe(true);
    expect(shouldClearErrorOnSuccess("background", "validated")).toBe(true);
  });

  it("clear si succès arrive en phase 'long-wait' (warning affiché)", () => {
    expect(shouldClearErrorOnSuccess("long-wait", "generated")).toBe(true);
  });

  it("clear si succès arrive après une phase 'failed' (rare mais possible)", () => {
    expect(shouldClearErrorOnSuccess("failed", "generated")).toBe(true);
  });

  it("ne fait rien si status reste 'processing'", () => {
    expect(shouldClearErrorOnSuccess("background", "processing")).toBe(false);
    expect(shouldClearErrorOnSuccess("long-wait", "processing")).toBe(false);
  });

  it("ne fait rien si status est 'failed' (l'erreur serveur reste affichée)", () => {
    expect(shouldClearErrorOnSuccess("background", "failed")).toBe(false);
  });
});

describe("REFINE_COPY — validation copy G33 (zéro anglicisme, mot pivot métier)", () => {
  it("ne contient pas le mot 'Délai dépassé' (anciennement source du bug Thomas)", () => {
    const allCopy = Object.values(REFINE_COPY).join(" ");
    expect(allCopy.toLowerCase()).not.toContain("délai dépassé");
  });

  it("ne contient pas d'anglicismes interdits (loading, spinner, retry, timeout)", () => {
    const allCopy = Object.values(REFINE_COPY).join(" ").toLowerCase();
    const forbidden = ["loading", "spinner", "retry", "timeout", "loader", "fail"];
    for (const word of forbidden) {
      expect(allCopy).not.toContain(word);
    }
  });

  it("phase 'background' a un ton non alarmiste (pas 'erreur', pas 'échec')", () => {
    const bg = REFINE_COPY.background.toLowerCase();
    expect(bg).not.toContain("erreur");
    expect(bg).not.toContain("échec");
    expect(bg).not.toContain("dépassé");
    // contient le mot pivot métier "galerie" (terme du domaine)
    expect(bg).toContain("galerie");
  });

  it("phase 'generating' indique le délai estimé pour cadrer l'attente", () => {
    expect(REFINE_COPY.generating).toContain("30 secondes");
  });

  it("phase 'long-wait' rassure sans alarmer", () => {
    const lw = REFINE_COPY.longWait.toLowerCase();
    expect(lw).toContain("patientez");
    expect(lw).not.toContain("erreur");
  });

  it("CTA 'background' = mot français standard ('Voir la galerie')", () => {
    expect(REFINE_COPY.backgroundCta).toBe("Voir la galerie");
  });
});
