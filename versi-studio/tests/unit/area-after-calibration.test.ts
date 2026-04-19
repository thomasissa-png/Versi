/**
 * Tests unitaires — Calcul de surface d'un lot après calibration (S23).
 *
 * Couvre computeZoneAreaM2 + zoneAreaPercent, dérivés de la géométrie zone_data
 * + calibration m2_per_pixel (m²/pixel natif).
 *
 * Contexte bug Thomas (s23) : après calibration, un lot de 47m² réel
 * s'affichait à 120m² car surface_m2 était figé sur la valeur LLM initiale,
 * indépendante du plan calibré. Le fix dérive la surface directement de la
 * géométrie + calibration ; ces tests protègent contre une régression du
 * calcul.
 */

import { describe, it, expect } from "vitest";
import {
  computeZoneAreaM2,
  zoneAreaPercent,
  type ZoneRect,
  type ZonePolygon,
} from "../../src/lib/vs/types";

// ─── zoneAreaPercent ──────────────────────────────────────────────

describe("zoneAreaPercent", () => {
  it("retourne w * h pour un rectangle", () => {
    const rect: ZoneRect = {
      type: "rect",
      x_percent: 10,
      y_percent: 10,
      width_percent: 40,
      height_percent: 25,
    };
    expect(zoneAreaPercent(rect)).toBe(40 * 25);
  });

  it("retourne la shoelace area pour un polygone", () => {
    // Carré 20x20 en %, aire = 400 % carrés
    const poly: ZonePolygon = {
      type: "polygon",
      points: [
        { x_percent: 10, y_percent: 10 },
        { x_percent: 30, y_percent: 10 },
        { x_percent: 30, y_percent: 30 },
        { x_percent: 10, y_percent: 30 },
      ],
    };
    expect(zoneAreaPercent(poly)).toBe(400);
  });
});

// ─── computeZoneAreaM2 ────────────────────────────────────────────

describe("computeZoneAreaM2 — cas nominal", () => {
  it("retourne la surface attendue pour un rectangle simple sur un plan calibré", () => {
    // Plan natif 1000x1000 px, calibré à 1 m par 100 px natifs.
    // Donc 1 m² = 100 × 100 = 10000 px² natifs.
    // m2PerPixelNative = 1 / 10000 = 0.0001.
    const m2PerPixel = 0.0001;
    const naturalW = 1000;
    const naturalH = 1000;

    // Rectangle 10% × 10% du plan = 100 × 100 px² natifs = 10000 px² = 1 m².
    const rect: ZoneRect = {
      type: "rect",
      x_percent: 0,
      y_percent: 0,
      width_percent: 10,
      height_percent: 10,
    };
    const surface = computeZoneAreaM2(rect, m2PerPixel, naturalW, naturalH);
    expect(surface).not.toBeNull();
    expect(surface!).toBeCloseTo(1, 5);
  });

  it("reproduit le scénario Thomas : lot 47 m² sur plan calibré correctement", () => {
    // Hypothèse : plan natif 2000x1500 (A3 scan ~150 dpi), calibré sur un
    // mur de 5 m mesurant 250 px natifs (échelle 1 m / 50 px).
    // m2PerPixelNative = 1 / (50 × 50) = 1 / 2500 = 0.0004.
    const m2PerPixel = 1 / 2500;
    const naturalW = 2000;
    const naturalH = 1500;

    // Pour un lot de 47 m² : 47 m² = 47 × 2500 = 117500 px² natifs.
    // Si on fait un rectangle large = 500 px, hauteur = 235 px :
    // 500 × 235 = 117500 px² = 47 m² exactement.
    // En % : largeur = 500/2000 = 25%, hauteur = 235/1500 ≈ 15.6667%.
    const rect: ZoneRect = {
      type: "rect",
      x_percent: 10,
      y_percent: 10,
      width_percent: 25,
      height_percent: (235 / 1500) * 100,
    };
    const surface = computeZoneAreaM2(rect, m2PerPixel, naturalW, naturalH);
    expect(surface).not.toBeNull();
    expect(surface!).toBeCloseTo(47, 1);
  });

  it("scale correctement quand on double la taille du lot (surface ×4)", () => {
    const m2PerPixel = 0.0001;
    const naturalW = 1000;
    const naturalH = 1000;
    const small: ZoneRect = {
      type: "rect",
      x_percent: 0,
      y_percent: 0,
      width_percent: 10,
      height_percent: 10,
    };
    const doubled: ZoneRect = {
      type: "rect",
      x_percent: 0,
      y_percent: 0,
      width_percent: 20,
      height_percent: 20,
    };
    const sSmall = computeZoneAreaM2(small, m2PerPixel, naturalW, naturalH)!;
    const sDoubled = computeZoneAreaM2(doubled, m2PerPixel, naturalW, naturalH)!;
    // Doubler les dimensions quadruple la surface (facteur carré).
    expect(sDoubled / sSmall).toBeCloseTo(4, 5);
  });

  it("scale correctement quand on double la résolution du plan (surface inchangée)", () => {
    // Même lot en % sur deux rendus natifs différents → même surface si m2PerPixel
    // a été calibré sur chaque résolution native. C'est ce qui garantit la
    // stabilité de l'affichage quand on change l'écran (cœur du fix s23).
    const rect: ZoneRect = {
      type: "rect",
      x_percent: 10,
      y_percent: 10,
      width_percent: 20,
      height_percent: 20,
    };
    // Résolution A : 1000x1000, calibré à 1 m / 100 px → m²/px² = 1/10000
    const sA = computeZoneAreaM2(rect, 1 / 10000, 1000, 1000)!;
    // Résolution B : 2000x2000 (double), calibré à 1 m / 200 px → m²/px² = 1/40000
    const sB = computeZoneAreaM2(rect, 1 / 40000, 2000, 2000)!;
    expect(sA).toBeCloseTo(sB, 5);
  });
});

describe("computeZoneAreaM2 — cas polygone", () => {
  it("calcule la surface d'un polygone calibré", () => {
    // Plan 1000x1000, 1 m = 100 px natifs → m²/px² = 1/10000.
    const m2PerPixel = 1 / 10000;
    // Carré 30%x30% = 300×300 px = 90000 px² = 9 m².
    const poly: ZonePolygon = {
      type: "polygon",
      points: [
        { x_percent: 10, y_percent: 10 },
        { x_percent: 40, y_percent: 10 },
        { x_percent: 40, y_percent: 40 },
        { x_percent: 10, y_percent: 40 },
      ],
    };
    const surface = computeZoneAreaM2(poly, m2PerPixel, 1000, 1000);
    expect(surface).not.toBeNull();
    expect(surface!).toBeCloseTo(9, 5);
  });
});

describe("computeZoneAreaM2 — garde-fous", () => {
  const validRect: ZoneRect = {
    type: "rect",
    x_percent: 10,
    y_percent: 10,
    width_percent: 20,
    height_percent: 20,
  };

  it("retourne null si m2PerPixel est null", () => {
    expect(computeZoneAreaM2(validRect, null, 1000, 1000)).toBeNull();
  });

  it("retourne null si m2PerPixel est 0 ou négatif", () => {
    expect(computeZoneAreaM2(validRect, 0, 1000, 1000)).toBeNull();
    expect(computeZoneAreaM2(validRect, -0.001, 1000, 1000)).toBeNull();
  });

  it("retourne null si m2PerPixel est NaN ou Infinity", () => {
    expect(computeZoneAreaM2(validRect, NaN, 1000, 1000)).toBeNull();
    expect(computeZoneAreaM2(validRect, Infinity, 1000, 1000)).toBeNull();
  });

  it("retourne null si les dimensions natives sont invalides", () => {
    expect(computeZoneAreaM2(validRect, 0.0001, null, 1000)).toBeNull();
    expect(computeZoneAreaM2(validRect, 0.0001, 1000, null)).toBeNull();
    expect(computeZoneAreaM2(validRect, 0.0001, 0, 1000)).toBeNull();
    expect(computeZoneAreaM2(validRect, 0.0001, 1000, -1)).toBeNull();
    expect(computeZoneAreaM2(validRect, 0.0001, NaN, 1000)).toBeNull();
  });

  it("ne retourne PAS null avec une zone ponctuelle (aire 0 valide)", () => {
    // Zone dégénérée width=0 : aire = 0, mais pas une erreur de calibration.
    const zeroRect: ZoneRect = {
      type: "rect",
      x_percent: 10,
      y_percent: 10,
      width_percent: 0,
      height_percent: 0,
    };
    const surface = computeZoneAreaM2(zeroRect, 0.0001, 1000, 1000);
    expect(surface).toBe(0);
  });
});
