/**
 * Tests unitaires — Round 3 Audit Fixes (s30)
 *
 * Couvre les 6 défauts D1-D6 identifiés par @design dans
 * docs/design/s30-visual-audit-vague3.md.
 *
 * Stratégie : tests source-level (lecture fichiers) car l'environnement
 * Vitest est `node` (pas jsdom). Pour tester le rendu DOM réel, voir les
 * tests E2E Playwright (tests/e2e/).
 *
 * Validations :
 *  - D1 : CostEstimator hors du canvas absolute, dans la sidebar sticky
 *  - D2 : safe-area-inset-bottom sur footer PlacementBottomSheet
 *  - D3 : safe-area-inset-bottom sur footer QuestionsModal
 *  - D4 : AngleController utilise des CSS vars, pas de hex hardcodés
 *  - D5 : QuestionsModal handler Tab pour focus trap
 *  - D6 : alt VisualGallery inclut le contexte pièce (roomLabel)
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const COMPONENTS_DIR = resolve(__dirname, "../../src/components/vs");

function readComponent(name: string): string {
  return readFileSync(resolve(COMPONENTS_DIR, name), "utf-8");
}

describe("Round 3 audit fixes — D1 chevauchement CostEstimator/AngleController", () => {
  const src = readComponent("VisualPlacementView.tsx");

  it("D1 : CostEstimator n'est plus en absolute top-md right-md sur le canvas", () => {
    // Avant : <div className="absolute top-md right-md z-10"><CostEstimator />
    // Après : <div className="sticky top-0 z-10 ... px-md py-sm"><CostEstimator />
    expect(src).not.toMatch(/absolute\s+top-md\s+right-md[^"]*">\s*<CostEstimator/);
  });

  it("D1 : CostEstimator est désormais dans un wrapper sticky en header sidebar", () => {
    expect(src).toMatch(/sticky\s+top-0[^"]*">\s*<CostEstimator/);
  });
});

describe("Round 3 audit fixes — D2 safe-area PlacementBottomSheet", () => {
  const src = readComponent("PlacementBottomSheet.tsx");

  it("D2 : footer wrapper utilise env(safe-area-inset-bottom) pour iOS notch", () => {
    expect(src).toMatch(/env\(safe-area-inset-bottom/);
  });

  it("D2 : paddingBottom est calculé avec calc() (pb-xl + safe-area)", () => {
    expect(src).toMatch(/calc\(2rem\s*\+\s*env\(safe-area-inset-bottom/);
  });
});

describe("Round 3 audit fixes — D3 safe-area QuestionsModal", () => {
  const src = readComponent("QuestionsModal.tsx");

  it("D3 : footer modal utilise env(safe-area-inset-bottom) pour iOS notch", () => {
    expect(src).toMatch(/env\(safe-area-inset-bottom/);
  });
});

describe("Round 3 audit fixes — D4 hex hardcodés AngleController", () => {
  const src = readComponent("AngleController.tsx");

  it("D4 : aucun hex hardcodé #141C28 (ancien stroke noir-bleu)", () => {
    expect(src).not.toMatch(/#141C28/);
  });

  it("D4 : aucun hex hardcodé #2E66DC (ancien fill bleu pointe)", () => {
    expect(src).not.toMatch(/#2E66DC/);
  });

  it("D4 : aucun rgba hardcodé hors tokens (124,134,145)", () => {
    expect(src).not.toMatch(/rgba\(124\s*,\s*134\s*,\s*145/);
  });

  it("D4 : aucun hex hardcodé #7C8691 (ancien fill repère N)", () => {
    expect(src).not.toMatch(/#7C8691/i);
  });

  it("D4 : utilise au moins 4 CSS vars du design system Versi", () => {
    const usedVars = src.match(/var\(--color-[a-z-]+\)/g) ?? [];
    expect(usedVars.length).toBeGreaterThanOrEqual(4);
  });

  it("D4 : utilise --color-text-default, --color-interactive-primary, --color-bg-canvas, --color-border-default, --color-text-muted, --color-bg-default", () => {
    const expectedVars = [
      "--color-text-default",
      "--color-interactive-primary",
      "--color-bg-canvas",
      "--color-border-default",
      "--color-text-muted",
      "--color-bg-default",
    ];
    for (const v of expectedVars) {
      expect(src).toContain(`var(${v})`);
    }
  });
});

describe("Round 3 audit fixes — D5 focus trap QuestionsModal", () => {
  const src = readComponent("QuestionsModal.tsx");

  it("D5 : handler keydown gère la touche Tab (focus trap)", () => {
    expect(src).toMatch(/e\.key\s*===\s*"Tab"/);
  });

  it("D5 : focus trap utilise dialogRef.current.querySelectorAll pour collecter les focusables", () => {
    expect(src).toMatch(/dialogRef\.current\.querySelectorAll/);
  });

  it("D5 : focus trap couvre buttons, inputs, textareas non-disabled", () => {
    expect(src).toMatch(/button:not\(\[disabled\]\)/);
    expect(src).toMatch(/input:not\(\[disabled\]\)/);
    expect(src).toMatch(/textarea:not\(\[disabled\]\)/);
  });

  it("D5 : Shift+Tab depuis le premier élément renvoie au dernier (preventDefault + last.focus)", () => {
    expect(src).toMatch(/e\.shiftKey\s*&&\s*document\.activeElement\s*===\s*first/);
    expect(src).toMatch(/last\.focus\(\)/);
  });

  it("D5 : Tab depuis le dernier élément renvoie au premier (preventDefault + first.focus)", () => {
    expect(src).toMatch(/!e\.shiftKey\s*&&\s*document\.activeElement\s*===\s*last/);
    expect(src).toMatch(/first\.focus\(\)/);
  });
});

describe("Round 3 audit fixes — D6 alt descriptifs + cursor + focus ring", () => {
  it("D6 VisualGallery : alt inclut le contexte pièce (roomLabel)", () => {
    const src = readComponent("VisualGallery.tsx");
    // Avant : alt={`Visuel ${isAnchor ? "ancre" : "secondaire"}`}
    // Après : alt={`Visuel ${...} — ${roomLabel}`}
    expect(src).toMatch(/alt=\{`Visuel\s+\$\{[^}]+\}\s+—\s+\$\{roomLabel\}`\}/);
  });

  it("D6 VisualGallery : prop roomLabel propagée à VisualCard", () => {
    const src = readComponent("VisualGallery.tsx");
    expect(src).toMatch(/roomLabel:\s*string/);
    expect(src).toMatch(/roomLabel=\{label\}/);
  });

  it("D6 PlacementBottomSheet : boutons ont cursor-pointer et focus-visible:ring", () => {
    const src = readComponent("PlacementBottomSheet.tsx");
    expect(src).toMatch(/cursor-pointer/);
    // Au moins un bouton doit avoir le focus ring (Confirmer ou Annuler)
    expect(src).toMatch(/focus-visible:ring-2/);
  });

  it("D6 RoomSettingsSidebar : textarea a focus-visible:ring-2 (parité avec QuestionsModal)", () => {
    const src = readComponent("RoomSettingsSidebar.tsx");
    expect(src).toMatch(/focus-visible:ring-2/);
  });

  it("D6 VisualGallery : bouton Régénérer a cursor-pointer + focus-visible:ring-2", () => {
    const src = readComponent("VisualGallery.tsx");
    // Le seul bouton "Régénérer" doit avoir le focus ring + cursor
    expect(src).toMatch(/regenerate-\$\{visual\.visual_id\}/);
    expect(src).toMatch(/cursor-pointer/);
    expect(src).toMatch(/focus-visible:ring-2/);
  });

  it("D6 QuestionsModal : inputs number et textarea ont focus-visible:ring-2", () => {
    const src = readComponent("QuestionsModal.tsx");
    // Au moins 2 occurrences (input number + textarea text)
    const matches = src.match(/focus-visible:ring-2/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});
