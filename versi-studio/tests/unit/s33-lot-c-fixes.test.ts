/**
 * Tests source-level — s33 Lot C (6 fixes Design tokens + WCAG Étape 3 + 4)
 *
 * Pattern s30 helper-first : tests sans jsdom — on grep le code source pour
 * vérifier que les corrections design système / accessibilité sont bien
 * appliquées. Évite l'install de @testing-library/react + environnement jsdom
 * dans Vitest (cap node env).
 *
 * Couvre :
 *  - Fix C-1 : badge "Ancre" VisualGallery → variante stone (zéro bg-info/text-info)
 *  - Fix C-2 : tokens segments dans @theme + RoomSegmentsPanel sans hex hardcodés
 *  - Fix C-3 : ArchitectChatPanel label "Suggestions" en text-xs (pas text-[11px])
 *  - Fix C-4 : Toggle chat min-w/min-h ≥ 44px (WCAG 2.5.5)
 *  - Fix C-5 : GenerationProgressView bouton "Revenir aux paramètres" focus-visible
 *  - Fix C-6 : ArchitectChatPanel typing indicator → spinner SVG simple (pas animate-bounce)
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..", "..");
const read = (relPath: string) =>
  readFileSync(join(ROOT, relPath), "utf-8");

describe("s33 Lot C Fix C-1 — Badge Ancre VisualGallery (variante stone)", () => {
  const src = read("src/components/vs/VisualGallery.tsx");

  it("le badge Ancre n'utilise plus bg-info/10 ni text-info", () => {
    // Capture le bloc isAnchor → span (peut faire jusqu'à 1000 chars selon les lignes commentées)
    const anchorBadge = src.match(/isAnchor \? \(\s*<span[\s\S]+?Ancre/);
    expect(anchorBadge).not.toBeNull();
    expect(anchorBadge![0]).not.toMatch(/bg-info\/10/);
    expect(anchorBadge![0]).not.toMatch(/\btext-info\b/);
  });

  it("le badge Ancre utilise une variante palette stone (bg-bg-canvas + text-text-default)", () => {
    expect(src).toMatch(/bg-bg-canvas\s+text-text-default\s+border\s+border-border-default/);
  });
});

describe("s33 Lot C Fix C-2 — Tokens segments dans @theme + RoomSegmentsPanel sans hex hardcodés", () => {
  const css = read("src/app/globals.css");
  const panel = read("src/components/vs/RoomSegmentsPanel.tsx");

  it("globals.css définit --color-segment-wall, --color-segment-bay, --color-segment-opening", () => {
    expect(css).toMatch(/--color-segment-wall:\s*#0B0B0B/);
    expect(css).toMatch(/--color-segment-bay:\s*#C9844C/);
    expect(css).toMatch(/--color-segment-opening:\s*#5A8060/);
  });

  it("RoomSegmentsPanel.tsx ne contient plus les hex bruts #C9844C et #5A8060", () => {
    expect(panel).not.toMatch(/#C9844C/);
    expect(panel).not.toMatch(/#5A8060/);
  });

  it("RoomSegmentsPanel.tsx utilise les classes Tailwind bg-segment-* (référence tokens)", () => {
    expect(panel).toMatch(/bg-segment-wall/);
    expect(panel).toMatch(/bg-segment-bay/);
    expect(panel).toMatch(/bg-segment-opening/);
  });

  it("RoomSegmentsPanel.tsx ne contient plus de style={{ backgroundColor: PASTILLE", () => {
    expect(panel).not.toMatch(/style=\{\{\s*backgroundColor:\s*PASTILLE/);
  });
});

describe("s33 Lot C Fix C-3 — Label Suggestions en text-xs (WCAG AA)", () => {
  const src = read("src/components/vs/ArchitectChatPanel.tsx");

  it("le label 'Suggestions' n'utilise plus text-[11px]", () => {
    // On cherche le bloc qui contient "Suggestions" (texte brut JSX)
    const block = src.match(/<p[^>]+>\s*Suggestions\s*<\/p>/);
    expect(block).not.toBeNull();
    expect(block![0]).not.toMatch(/text-\[11px\]/);
  });

  it("le label 'Suggestions' utilise text-xs (13px scale typo)", () => {
    const block = src.match(/<p[^>]+>\s*Suggestions\s*<\/p>/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/\btext-xs\b/);
  });
});

describe("s33 Lot C Fix C-4 — Toggle chat ≥ 44px (WCAG 2.5.5)", () => {
  const src = read("src/components/vs/RoomSegmentsPanel.tsx");

  it("le toggle 'open-architect-chat' utilise min-w-[44px] min-h-[44px] (pas w-8 h-8)", () => {
    // On localise le bloc data-testid="open-architect-chat" et on regarde sa className
    const block = src.match(/data-testid="open-architect-chat"[\s\S]{0,500}/);
    // Le data-testid est dans un <button ...> juste avant — on remonte différemment
    const buttonBlock = src.match(/<button[\s\S]{0,800}data-testid="open-architect-chat"/);
    expect(buttonBlock).not.toBeNull();
    expect(buttonBlock![0]).toMatch(/min-w-\[44px\]/);
    expect(buttonBlock![0]).toMatch(/min-h-\[44px\]/);
    expect(buttonBlock![0]).not.toMatch(/\bw-8 h-8\b/);
    // Étouffe le warning unused
    expect(block).not.toBeNull();
  });
});

describe("s33 Lot C Fix C-5 — GenerationProgressView focus-visible sur bouton retour", () => {
  const src = read("src/components/vs/GenerationProgressView.tsx");

  it("le bouton 'Revenir aux paramètres' a un indicateur focus-visible", () => {
    // On cherche le bouton onClick={onCancel}
    const button = src.match(/<button[\s\S]{0,500}onCancel[\s\S]{0,500}Revenir aux paramètres/);
    expect(button).not.toBeNull();
    expect(button![0]).toMatch(/focus-visible:outline-2/);
    expect(button![0]).toMatch(/focus-visible:outline-offset-2/);
    expect(button![0]).toMatch(/focus-visible:outline-interactive-primary/);
  });
});

describe("s33 Lot C Fix C-6 — Spinner SVG simple (pas animate-bounce cascade)", () => {
  const src = read("src/components/vs/ArchitectChatPanel.tsx");

  it("le typing indicator n'utilise plus animate-bounce (préf fondateur anti-cascade)", () => {
    // Localise le bloc avec data-testid="chat-typing-indicator"
    const indicator = src.match(/data-testid="chat-typing-indicator"[\s\S]{0,1500}/);
    expect(indicator).not.toBeNull();
    expect(indicator![0]).not.toMatch(/animate-bounce/);
  });

  it("le typing indicator utilise un spinner SVG unique (animate-spin)", () => {
    const indicator = src.match(/data-testid="chat-typing-indicator"[\s\S]{0,1500}/);
    expect(indicator).not.toBeNull();
    expect(indicator![0]).toMatch(/animate-spin/);
    expect(indicator![0]).toMatch(/<svg/);
  });

  it("le typing indicator affiche un texte explicite ('rédige')", () => {
    const indicator = src.match(/data-testid="chat-typing-indicator"[\s\S]{0,1500}/);
    expect(indicator).not.toBeNull();
    expect(indicator![0]).toMatch(/rédige/);
  });
});
