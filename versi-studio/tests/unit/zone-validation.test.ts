/**
 * Tests unitaires — Helpers de validation de zone (lib/vs/types.ts)
 *
 * Couvre les fonctions factorisées en versi-s20 :
 * isValidZoneRect, isValidZonePolygon, isValidZone,
 * polygonAreaPercent, polygonHasSelfIntersection, zonesOverlap
 *
 * Convention : chaque describe teste une fonction exportée,
 * chaque it cible un edge case identifié lors de la factorisation DRY.
 */

import { describe, it, expect } from "vitest";
import {
  isValidZoneRect,
  isValidZonePolygon,
  isValidZone,
  polygonAreaPercent,
  polygonHasSelfIntersection,
  zonesOverlap,
  MIN_RECT_SIZE_PERCENT,
  MIN_POLYGON_AREA_PERCENT,
  MAX_POLYGON_POINTS,
  type ZoneRect,
  type ZonePolygon,
  type ZonePolygonPoint,
} from "../../src/lib/vs/types";

// ─── isValidZoneRect ──────────────────────────────────────────────

describe("isValidZoneRect", () => {
  it("accepte un rectangle valide centré dans le canvas", () => {
    const rect = {
      type: "rect" as const,
      x_percent: 10,
      y_percent: 10,
      width_percent: 20,
      height_percent: 30,
    };
    expect(isValidZoneRect(rect)).toBe(true);
  });

  it("accepte un rectangle sans champ type (backward compat legacy)", () => {
    const rect = {
      x_percent: 5,
      y_percent: 5,
      width_percent: 10,
      height_percent: 10,
    };
    expect(isValidZoneRect(rect)).toBe(true);
  });

  it("rejette un rectangle avec dimensions négatives", () => {
    const rect = {
      type: "rect" as const,
      x_percent: 10,
      y_percent: 10,
      width_percent: -5,
      height_percent: 10,
    };
    expect(isValidZoneRect(rect)).toBe(false);
  });

  it("rejette un rectangle qui sort du canvas (x + w > 100)", () => {
    const rect = {
      type: "rect" as const,
      x_percent: 85,
      y_percent: 10,
      width_percent: 20,
      height_percent: 10,
    };
    expect(isValidZoneRect(rect)).toBe(false);
  });

  it("rejette un rectangle trop petit (< MIN_RECT_SIZE_PERCENT)", () => {
    const rect = {
      type: "rect" as const,
      x_percent: 10,
      y_percent: 10,
      width_percent: MIN_RECT_SIZE_PERCENT - 0.1,
      height_percent: 5,
    };
    expect(isValidZoneRect(rect)).toBe(false);
  });

  it("rejette NaN dans x_percent (anti-pattern versi-s20)", () => {
    const rect = {
      type: "rect" as const,
      x_percent: NaN,
      y_percent: 10,
      width_percent: 10,
      height_percent: 10,
    };
    expect(isValidZoneRect(rect)).toBe(false);
  });

  it("rejette Infinity dans width_percent", () => {
    const rect = {
      type: "rect" as const,
      x_percent: 10,
      y_percent: 10,
      width_percent: Infinity,
      height_percent: 10,
    };
    expect(isValidZoneRect(rect)).toBe(false);
  });

  it("rejette null en entrée", () => {
    expect(isValidZoneRect(null)).toBe(false);
  });

  it("rejette un objet avec type erroné (type: 'polygon')", () => {
    const rect = {
      type: "polygon",
      x_percent: 10,
      y_percent: 10,
      width_percent: 10,
      height_percent: 10,
    };
    expect(isValidZoneRect(rect)).toBe(false);
  });
});

// ─── isValidZonePolygon ───────────────────────────────────────────

describe("isValidZonePolygon", () => {
  it("accepte un triangle valide (3 points, aire suffisante)", () => {
    const polygon = {
      type: "polygon" as const,
      points: [
        { x_percent: 10, y_percent: 10 },
        { x_percent: 20, y_percent: 10 },
        { x_percent: 15, y_percent: 20 },
      ],
    };
    expect(isValidZonePolygon(polygon)).toBe(true);
  });

  it("accepte un polygone 8 points (octogone)", () => {
    // Octogone inscrit dans un carré 20x20 centré à (50,50)
    const points: ZonePolygonPoint[] = [
      { x_percent: 44, y_percent: 40 },
      { x_percent: 56, y_percent: 40 },
      { x_percent: 60, y_percent: 44 },
      { x_percent: 60, y_percent: 56 },
      { x_percent: 56, y_percent: 60 },
      { x_percent: 44, y_percent: 60 },
      { x_percent: 40, y_percent: 56 },
      { x_percent: 40, y_percent: 44 },
    ];
    const polygon = { type: "polygon" as const, points };
    expect(isValidZonePolygon(polygon)).toBe(true);
  });

  it("rejette un polygone avec < 3 points", () => {
    const polygon = {
      type: "polygon" as const,
      points: [
        { x_percent: 10, y_percent: 10 },
        { x_percent: 20, y_percent: 20 },
      ],
    };
    expect(isValidZonePolygon(polygon)).toBe(false);
  });

  it("rejette un polygone avec > MAX_POLYGON_POINTS (> 100)", () => {
    const points: ZonePolygonPoint[] = Array.from(
      { length: MAX_POLYGON_POINTS + 1 },
      (_, i) => ({
        x_percent: 50 + 40 * Math.cos((2 * Math.PI * i) / (MAX_POLYGON_POINTS + 1)),
        y_percent: 50 + 40 * Math.sin((2 * Math.PI * i) / (MAX_POLYGON_POINTS + 1)),
      })
    );
    const polygon = { type: "polygon" as const, points };
    expect(isValidZonePolygon(polygon)).toBe(false);
  });

  it("rejette un polygone avec aire trop petite (< MIN_POLYGON_AREA_PERCENT)", () => {
    // Trois points quasi-colinéaires => aire quasi nulle
    const polygon = {
      type: "polygon" as const,
      points: [
        { x_percent: 10, y_percent: 10 },
        { x_percent: 10.01, y_percent: 10 },
        { x_percent: 10.005, y_percent: 10.001 },
      ],
    };
    const area = polygonAreaPercent(polygon.points);
    expect(area).toBeLessThan(MIN_POLYGON_AREA_PERCENT);
    expect(isValidZonePolygon(polygon)).toBe(false);
  });

  it("rejette un polygone avec un point NaN", () => {
    const polygon = {
      type: "polygon" as const,
      points: [
        { x_percent: NaN, y_percent: 10 },
        { x_percent: 20, y_percent: 10 },
        { x_percent: 15, y_percent: 20 },
      ],
    };
    expect(isValidZonePolygon(polygon)).toBe(false);
  });

  it("rejette un objet sans type 'polygon'", () => {
    const polygon = {
      type: "rect",
      points: [
        { x_percent: 10, y_percent: 10 },
        { x_percent: 20, y_percent: 10 },
        { x_percent: 15, y_percent: 20 },
      ],
    };
    expect(isValidZonePolygon(polygon)).toBe(false);
  });
});

// ─── isValidZone ──────────────────────────────────────────────────

describe("isValidZone", () => {
  it("discrimine type 'rect' et délègue à isValidZoneRect", () => {
    const rect = {
      type: "rect" as const,
      x_percent: 5,
      y_percent: 5,
      width_percent: 15,
      height_percent: 15,
    };
    expect(isValidZone(rect)).toBe(true);
  });

  it("discrimine type 'polygon' et délègue à isValidZonePolygon", () => {
    const polygon = {
      type: "polygon" as const,
      points: [
        { x_percent: 0, y_percent: 0 },
        { x_percent: 10, y_percent: 0 },
        { x_percent: 10, y_percent: 10 },
        { x_percent: 0, y_percent: 10 },
      ],
    };
    expect(isValidZone(polygon)).toBe(true);
  });

  it("rejette un objet invalide (ni rect ni polygon)", () => {
    expect(isValidZone({ type: "circle", radius: 5 })).toBe(false);
  });
});

// ─── polygonAreaPercent ───────────────────────────────────────────

describe("polygonAreaPercent", () => {
  it("calcule l'aire d'un carré 10x10 = 100 %²", () => {
    const square: ZonePolygonPoint[] = [
      { x_percent: 0, y_percent: 0 },
      { x_percent: 10, y_percent: 0 },
      { x_percent: 10, y_percent: 10 },
      { x_percent: 0, y_percent: 10 },
    ];
    expect(polygonAreaPercent(square)).toBeCloseTo(100, 5);
  });

  it("calcule l'aire d'un triangle rectangle (base 10, hauteur 10) = 50 %²", () => {
    const triangle: ZonePolygonPoint[] = [
      { x_percent: 0, y_percent: 0 },
      { x_percent: 10, y_percent: 0 },
      { x_percent: 0, y_percent: 10 },
    ];
    expect(polygonAreaPercent(triangle)).toBeCloseTo(50, 5);
  });

  it("retourne 0 pour moins de 3 points", () => {
    expect(polygonAreaPercent([])).toBe(0);
    expect(
      polygonAreaPercent([
        { x_percent: 0, y_percent: 0 },
        { x_percent: 10, y_percent: 10 },
      ])
    ).toBe(0);
  });
});

// ─── polygonHasSelfIntersection ───────────────────────────────────

describe("polygonHasSelfIntersection", () => {
  it("retourne false pour un carré convexe (pas d'auto-intersection)", () => {
    const square: ZonePolygonPoint[] = [
      { x_percent: 0, y_percent: 0 },
      { x_percent: 10, y_percent: 0 },
      { x_percent: 10, y_percent: 10 },
      { x_percent: 0, y_percent: 10 },
    ];
    expect(polygonHasSelfIntersection(square)).toBe(false);
  });

  it("retourne true pour un papillon (4 points en X, segments croisés)", () => {
    // Papillon : segments (0,0)-(10,10) et (10,0)-(0,10) se croisent
    const butterfly: ZonePolygonPoint[] = [
      { x_percent: 0, y_percent: 0 },
      { x_percent: 10, y_percent: 10 },
      { x_percent: 10, y_percent: 0 },
      { x_percent: 0, y_percent: 10 },
    ];
    expect(polygonHasSelfIntersection(butterfly)).toBe(true);
  });

  it("retourne false pour un triangle (< 4 points, pas d'auto-intersection possible)", () => {
    const triangle: ZonePolygonPoint[] = [
      { x_percent: 0, y_percent: 0 },
      { x_percent: 10, y_percent: 0 },
      { x_percent: 5, y_percent: 10 },
    ];
    expect(polygonHasSelfIntersection(triangle)).toBe(false);
  });
});

// ─── zonesOverlap ─────────────────────────────────────────────────

describe("zonesOverlap", () => {
  it("détecte le chevauchement de 2 rects qui se recouvrent partiellement", () => {
    const a: ZoneRect = {
      type: "rect",
      x_percent: 10,
      y_percent: 10,
      width_percent: 20,
      height_percent: 20,
    };
    const b: ZoneRect = {
      type: "rect",
      x_percent: 25,
      y_percent: 25,
      width_percent: 20,
      height_percent: 20,
    };
    expect(zonesOverlap(a, b)).toBe(true);
  });

  it("retourne false pour 2 rects complètement disjoints", () => {
    const a: ZoneRect = {
      type: "rect",
      x_percent: 0,
      y_percent: 0,
      width_percent: 10,
      height_percent: 10,
    };
    const b: ZoneRect = {
      type: "rect",
      x_percent: 50,
      y_percent: 50,
      width_percent: 10,
      height_percent: 10,
    };
    expect(zonesOverlap(a, b)).toBe(false);
  });

  it("détecte l'overlap entre un rect et un polygon qui se chevauchent", () => {
    const rect: ZoneRect = {
      type: "rect",
      x_percent: 10,
      y_percent: 10,
      width_percent: 30,
      height_percent: 30,
    };
    // Triangle qui chevauche le rect (pointe à l'intérieur du rect)
    const polygon: ZonePolygon = {
      type: "polygon",
      points: [
        { x_percent: 20, y_percent: 20 },
        { x_percent: 50, y_percent: 20 },
        { x_percent: 35, y_percent: 50 },
      ],
    };
    expect(zonesOverlap(rect, polygon)).toBe(true);
  });

  it("détecte l'overlap entre 2 polygones qui se chevauchent", () => {
    const polyA: ZonePolygon = {
      type: "polygon",
      points: [
        { x_percent: 10, y_percent: 10 },
        { x_percent: 30, y_percent: 10 },
        { x_percent: 30, y_percent: 30 },
        { x_percent: 10, y_percent: 30 },
      ],
    };
    const polyB: ZonePolygon = {
      type: "polygon",
      points: [
        { x_percent: 20, y_percent: 20 },
        { x_percent: 40, y_percent: 20 },
        { x_percent: 40, y_percent: 40 },
        { x_percent: 20, y_percent: 40 },
      ],
    };
    expect(zonesOverlap(polyA, polyB)).toBe(true);
  });

  it("retourne false pour 2 polygones complètement disjoints", () => {
    const polyA: ZonePolygon = {
      type: "polygon",
      points: [
        { x_percent: 0, y_percent: 0 },
        { x_percent: 5, y_percent: 0 },
        { x_percent: 5, y_percent: 5 },
      ],
    };
    const polyB: ZonePolygon = {
      type: "polygon",
      points: [
        { x_percent: 80, y_percent: 80 },
        { x_percent: 90, y_percent: 80 },
        { x_percent: 90, y_percent: 90 },
      ],
    };
    expect(zonesOverlap(polyA, polyB)).toBe(false);
  });
});
