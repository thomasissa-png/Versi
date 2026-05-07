/**
 * Tests source-level — s33 Lot B (4 fixes UX P0 Étape 3 + 4)
 *
 * Pattern s30 helper-first : tests sans jsdom — on grep le code source
 * pour vérifier que les éléments UI critiques sont bien présents (data-testid,
 * aria-label, copy clé). Évite l'install de @testing-library/react +
 * environnement jsdom dans Vitest (cap node env).
 *
 * Couvre :
 *  - Fix B-1 : Stepper Étape 4 (placement/page.tsx)
 *  - Fix B-2 : Toolbar Undo/Redo top-right RoomCanvas
 *  - Fix B-3 : Empty state canvas Étape 4 (VisualWizardRoomStep)
 *  - Fix B-4 : Checklist conditionnelle pré-requis « Générer cette pièce »
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..", "..");
const read = (relPath: string) =>
  readFileSync(join(ROOT, relPath), "utf-8");

describe("s33 Lot B Fix B-1 — Stepper en Étape 4", () => {
  const src = read("src/app/vs/projects/[id]/visuals/placement/page.tsx");

  it("importe le composant Stepper", () => {
    expect(src).toMatch(/import\s+Stepper\s+from\s+"@\/components\/vs\/Stepper"/);
  });

  it("rend Stepper avec currentStep=4 (au moins 1 fois)", () => {
    // Au moins 1 occurrence rendue (état défaut + état loading + état empty)
    const matches = src.match(/currentStep=\{4\}/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(1);
  });

  it("rend Stepper variant horizontal sur mobile (sm:hidden)", () => {
    expect(src).toMatch(/variant="horizontal"/);
    // Le bloc Stepper horizontal est visible uniquement sur mobile
    expect(src).toMatch(/sm:hidden[\s\S]{0,200}<Stepper/);
  });

  it("dérive completedSteps depuis project.status", () => {
    expect(src).toMatch(/const\s+completedSteps\s*=\s*useMemo/);
    expect(src).toMatch(/step_3_complete/);
  });
});

describe("s33 Lot B Fix B-2 — Toolbar Undo/Redo top-right RoomCanvas", () => {
  const src = read("src/components/vs/RoomCanvas.tsx");

  it("expose data-testid canvas-undo-btn et canvas-redo-btn", () => {
    expect(src).toContain('data-testid="canvas-undo-btn"');
    expect(src).toContain('data-testid="canvas-redo-btn"');
  });

  it("toolbar Undo/Redo positionnée top-right (pattern Figma)", () => {
    // top-3 right-3 ⇒ coin haut-droit
    expect(src).toMatch(/className="absolute top-3 right-3 z-20[\s\S]*?role="toolbar"[\s\S]*?aria-label="Annuler ou rétablir"/);
  });

  it("boutons Undo/Redo respectent WCAG 2.5.5 (touch target ≥ 44px)", () => {
    // Les 2 boutons utilisent w-[44px] h-[44px]
    const undoBlock = src.match(
      /data-testid="canvas-undo-btn"[\s\S]{0,300}/
    );
    expect(undoBlock).not.toBeNull();
    expect(undoBlock![0]).toMatch(/w-\[44px\]\s+h-\[44px\]/);

    const redoBlock = src.match(
      /data-testid="canvas-redo-btn"[\s\S]{0,300}/
    );
    expect(redoBlock).not.toBeNull();
    expect(redoBlock![0]).toMatch(/w-\[44px\]\s+h-\[44px\]/);
  });

  it("tooltips raccourcis clavier visibles (title)", () => {
    expect(src).toMatch(/title="Annuler \(Ctrl\+Z\)"/);
    expect(src).toMatch(/title="Rétablir \(Ctrl\+Maj\+Z\)"/);
  });

  it("disabled visuel quand stack vide (canUndo/canRedo=false)", () => {
    expect(src).toMatch(/disabled={!canUndo}/);
    expect(src).toMatch(/disabled={!canRedo}/);
  });
});

describe("s33 Lot B Fix B-3 — Empty state canvas Étape 4", () => {
  const src = read("src/components/vs/VisualWizardRoomStep.tsx");

  it("expose data-testid wizard-empty-state", () => {
    expect(src).toContain('data-testid="wizard-empty-state"');
  });

  it("affiche empty state uniquement si placements.length === 0", () => {
    expect(src).toMatch(/{placements\.length === 0 && \(/);
  });

  it("guidance copy : invitation à cliquer sur le plan", () => {
    expect(src).toContain("Cliquez sur le plan pour placer une prise de vue");
  });

  it("pointer-events-none pour ne pas bloquer le clic-pour-placer", () => {
    // Le bloc empty state utilise pointer-events-none sur le wrapper
    const emptyBlock = src.match(
      /{placements\.length === 0 && \([\s\S]{0,1500}wizard-empty-state[\s\S]{0,1500}\)\}/
    );
    expect(emptyBlock).not.toBeNull();
    expect(emptyBlock![0]).toContain("pointer-events-none");
  });

  it("respecte le mot pivot métier (pas de canvas/polygone/calque dans copy visible)", () => {
    // Extraire le bloc empty state visible (entre data-testid et la fin du bloc avant le toast)
    const emptyBlock = src.match(
      /data-testid="wizard-empty-state"[\s\S]{0,1500}\)\}/
    );
    expect(emptyBlock).not.toBeNull();
    const blockText = emptyBlock![0];
    expect(blockText).not.toMatch(/\bcanvas\b/i);
    expect(blockText).not.toMatch(/\bpolygone\b/i);
    expect(blockText).not.toMatch(/\bcalque\b/i);
  });
});

describe("s33 Lot B Fix B-4 — Checklist pré-requis « Générer cette pièce »", () => {
  const src = read("src/components/vs/VisualWizardRoomStep.tsx");

  it("expose data-testid wizard-generate-checklist", () => {
    expect(src).toContain('data-testid="wizard-generate-checklist"');
  });

  it("définit generateChecklist avec items {ok, label}", () => {
    expect(src).toMatch(/const\s+generateChecklist\s*=\s*useMemo/);
    expect(src).toMatch(/ok:\s*placementsWithPhoto\.length > 0/);
    expect(src).toMatch(/ok:\s*!!styleId/);
  });

  it("rend ✓ pour items OK et ○ pour items manquants", () => {
    expect(src).toMatch(/item\.ok\s*\?\s*"✓"\s*:\s*"○"/);
  });

  it("liste a un aria-label explicite", () => {
    expect(src).toMatch(/aria-label="Pré-requis pour générer cette pièce"/);
  });

  it("affichage conditionnel : disabledReason && !chatBriefValidated", () => {
    expect(src).toMatch(
      /{disabledReason && !chatBriefValidated && \(\s*<ul/
    );
  });
});
