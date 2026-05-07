/**
 * Tests source-level — s33 Lot F (4 fixes UX P1 ergonomie Étape 3 + 4)
 *
 * Pattern s30 helper-first : tests sans jsdom — on teste les helpers purs
 * (TOAST_DURATION_MS, UNDO_WINDOW_MS) ET on grep le code source pour vérifier
 * que les éléments UI critiques sont bien câblés (data-testid, props,
 * handlers exposés).
 *
 * Couvre :
 *  - Fix F-1 : Bulk "Tout confirmer" pièces IA Étape 3
 *  - Fix F-2 : Toast duration 5s → 8s (constante centralisée)
 *  - Fix F-3 : Suppression pièce avec toast undo (8s)
 *  - Fix F-4 : Sélecteur nb visuels repositionné dans le footer wizard
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  TOAST_DURATION_MS,
  UNDO_WINDOW_MS,
} from "@/lib/vs/ui/toast-duration";

const ROOT = join(__dirname, "..", "..");
const read = (relPath: string) => readFileSync(join(ROOT, relPath), "utf-8");

// ─── F-2 : constantes durée toast ─────────────────────────────────

describe("s33 Lot F #F-2 — Toast duration centralisée 8s", () => {
  it("TOAST_DURATION_MS vaut 8000ms (audit @persona lecture difficile à 5s)", () => {
    expect(TOAST_DURATION_MS).toBe(8000);
  });

  it("UNDO_WINDOW_MS vaut 8000ms (cohérent avec toast duration pour undo)", () => {
    expect(UNDO_WINDOW_MS).toBe(8000);
  });

  it("rooms/page.tsx importe les constantes toast-duration", () => {
    const src = read("src/app/vs/projects/[id]/rooms/page.tsx");
    expect(src).toMatch(
      /from\s+["']@\/lib\/vs\/ui\/toast-duration["']/
    );
    expect(src).toMatch(/TOAST_DURATION_MS/);
    expect(src).toMatch(/UNDO_WINDOW_MS/);
  });

  it("rooms/page.tsx n'utilise plus la durée 5000ms hardcodée pour les warnings", () => {
    const src = read("src/app/vs/projects/[id]/rooms/page.tsx");
    // Tous les setTimeout(setWarningMessage(null), ...) doivent utiliser
    // TOAST_DURATION_MS et plus 5000.
    const matches = src.match(
      /setTimeout\(\s*\(\)\s*=>\s*setWarningMessage\(null\),\s*5000\)/g
    );
    expect(matches).toBeNull();
  });
});

// ─── F-1 : bouton bulk "Tout confirmer" ───────────────────────────

describe("s33 Lot F #F-1 — Bulk Tout confirmer pièces IA pending", () => {
  const panelSrc = read("src/components/vs/RoomPanel.tsx");
  const pageSrc = read("src/app/vs/projects/[id]/rooms/page.tsx");

  it("RoomPanel expose la prop onConfirmAllPending", () => {
    expect(panelSrc).toMatch(/onConfirmAllPending\?:\s*\(\)\s*=>\s*void/);
    expect(panelSrc).toMatch(/isConfirmingAll\?:\s*boolean/);
  });

  it("RoomPanel rend le bouton avec data-testid=rooms-confirm-all-pending", () => {
    expect(panelSrc).toMatch(/data-testid="rooms-confirm-all-pending"/);
  });

  it("RoomPanel calcule pendingAiCount depuis les rooms IA non touched", () => {
    expect(panelSrc).toMatch(
      /pendingAiCount\s*=\s*rooms\.filter\([\s\S]{0,200}source\s*===\s*"ai"[\s\S]{0,80}!r\.touched/
    );
  });

  it("RoomPanel désactive le bouton quand pendingAiCount === 0", () => {
    // Soit dans le disabled, soit via un check pendingAiCount === 0
    expect(panelSrc).toMatch(
      /disabled=\{[^}]*pendingAiCount\s*===\s*0[^}]*\}/
    );
  });

  it("RoomPanel affiche le compteur dans le label du bouton bulk", () => {
    expect(panelSrc).toMatch(/Tout confirmer\s*\(\$\{pendingAiCount\}\)/);
  });

  it("rooms/page.tsx définit handleConfirmAllPending et le passe à RoomPanel", () => {
    expect(pageSrc).toMatch(/const\s+handleConfirmAllPending\s*=\s*useCallback/);
    expect(pageSrc).toMatch(/onConfirmAllPending=\{handleConfirmAllPending\}/);
    expect(pageSrc).toMatch(/isConfirmingAll=\{isConfirmingAll\}/);
  });

  it("handleConfirmAllPending utilise Promise.allSettled pour tolérer les échecs", () => {
    expect(pageSrc).toMatch(/Promise\.allSettled/);
  });

  it("handleConfirmAllPending filtre uniquement les pièces source=ai && !touched", () => {
    expect(pageSrc).toMatch(
      /currentRooms\.filter\([\s\S]{0,150}source\s*===\s*"ai"[\s\S]{0,50}!r\.touched/
    );
  });
});

// ─── F-3 : suppression réversible avec toast undo ─────────────────

describe("s33 Lot F #F-3 — Suppression pièce avec toast undo 8s", () => {
  const pageSrc = read("src/app/vs/projects/[id]/rooms/page.tsx");

  it("rooms/page.tsx définit le type PendingDelete avec snapshot, timer, lotId", () => {
    expect(pageSrc).toMatch(/interface\s+PendingDelete\s*\{[\s\S]{0,500}snapshot:/);
    expect(pageSrc).toMatch(/commitTimer:\s*ReturnType<typeof setTimeout>/);
    expect(pageSrc).toMatch(/lotId:\s*string/);
  });

  it("rooms/page.tsx remplace l'ancien ConfirmModal par un toast undo", () => {
    // L'ancien ConfirmModal pour suppression pièce ne doit plus être présent.
    expect(pageSrc).not.toMatch(/<ConfirmModal[\s\S]{0,300}roomToDelete/);
    expect(pageSrc).not.toMatch(/setRoomToDelete/);
  });

  it("rooms/page.tsx rend le toast avec data-testid=rooms-delete-undo-toast", () => {
    expect(pageSrc).toMatch(/data-testid="rooms-delete-undo-toast"/);
    expect(pageSrc).toMatch(/data-testid="rooms-delete-undo-button"/);
  });

  it("handleDeleteRoom programme le commit après UNDO_WINDOW_MS", () => {
    // Le setTimeout du commit utilise UNDO_WINDOW_MS comme délai (présence
    // du pattern `}, UNDO_WINDOW_MS)`).
    expect(pageSrc).toMatch(/\},\s*UNDO_WINDOW_MS\)/);
    expect(pageSrc).toMatch(/commitTimer:\s*setTimeout/);
  });

  it("handleUndoDelete annule le timer et restaure le snapshot", () => {
    expect(pageSrc).toMatch(/const\s+handleUndoDelete\s*=\s*useCallback/);
    expect(pageSrc).toMatch(/clearTimeout\(current\.commitTimer\)/);
    expect(pageSrc).toMatch(/current\.snapshot/);
  });

  it("commitPendingDelete appelle DELETE /api/vs/rooms/:id", () => {
    expect(pageSrc).toMatch(
      /fetch\(`\/api\/vs\/rooms\/\$\{target\.roomId\}`,\s*\{\s*method:\s*"DELETE"/
    );
  });

  it("cleanup useEffect flushe le commit si pendingDelete au unmount", () => {
    // Le useEffect avec return cleanup doit appeler commitPendingDelete.
    expect(pageSrc).toMatch(
      /return\s+\(\)\s*=>\s*\{[\s\S]{0,300}commitPendingDelete\(pendingDelete\)/
    );
  });
});

// ─── F-4 : sélecteur nb visuels repositionné footer wizard ────────

describe("s33 Lot F #F-4 — Sélecteur nb visuels dans le footer wizard", () => {
  const wizardSrc = read("src/components/vs/VisualWizardRoomStep.tsx");

  it("VisualWizardRoomStep expose data-testid=wizard-footer", () => {
    expect(wizardSrc).toMatch(/data-testid="wizard-footer"/);
  });

  it("le sélecteur est marqué data-testid=wizard-footer-target-count (dans le footer)", () => {
    expect(wizardSrc).toMatch(/data-testid="wizard-footer-target-count"/);
  });

  it("la section block 'Visuels par pièce' inline a été supprimée", () => {
    // L'ancien titre <h3> "Visuels par pièce" en gros uppercase n'existe plus.
    expect(wizardSrc).not.toMatch(
      /<h3[^>]*id="room-target-count-title"[^>]*>[\s\S]{0,80}Visuels par pièce[\s\S]{0,80}<\/h3>/
    );
  });

  it("les pills 1..5 sont toujours présentes (data-testid wizard-target-count-${n} + map sur [1..5])", () => {
    // Le data-testid est un template literal `wizard-target-count-${n}` sur
    // un map [1, 2, 3, 4, 5]. On vérifie le template + l'array.
    expect(wizardSrc).toMatch(/data-testid=\{`wizard-target-count-\$\{n\}`\}/);
    expect(wizardSrc).toMatch(/\[1,\s*2,\s*3,\s*4,\s*5\]\.map\(\(n\)\s*=>/);
  });

  it("le footer contient à la fois le sélecteur ET le bouton générer", () => {
    // Vérifie que le footer (data-testid=wizard-footer) contient les deux
    // marqueurs (proximité visuelle).
    const footerRegion = wizardSrc.match(
      /data-testid="wizard-footer"[\s\S]{0,8000}<\/div>\s*\{\/\*\s*s32 Phase 5/
    );
    expect(footerRegion).not.toBeNull();
    if (footerRegion) {
      expect(footerRegion[0]).toMatch(/wizard-footer-target-count/);
      expect(footerRegion[0]).toMatch(/wizard-generate-this-room/);
    }
  });

  it("le sélecteur conserve role=radiogroup avec aria-label explicite", () => {
    expect(wizardSrc).toMatch(
      /aria-label="Nombre de visuels à générer pour cette pièce"/
    );
  });
});
