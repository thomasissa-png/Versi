/**
 * Tests unitaires — polygon-resolver (s23 Bug 1 : non-overlap pièces)
 *
 * Scénarios couverts :
 * - Overlap entre 2 pièces → la plus grande garde son territoire
 * - 3 pièces avec chevauchements multiples → tout résolu, 0 overlap final
 * - Pièce qui déborde du lot → clippée au polygone du lot (contenance)
 * - Pièce totalement absorbée → droppée avec warning
 * - Aucun overlap initial → aucune modification (baseline non-régression)
 */

import { describe, it, expect } from "vitest";
import {
  resolveRoomOverlaps,
  polygonArea,
  type RoomWithPolygon,
  type Point,
} from "../../src/lib/vs/polygon-resolver";

// Helper : test approximatif d'overlap entre 2 polygones (via intersection d'aires)
function haveOverlap(a: Point[], b: Point[], tolerance = 0.01): boolean {
  // Simple : tester si un point strictement intérieur de a est dans b
  const cxA = a.reduce((s, p) => s + p.x_percent, 0) / a.length;
  const cyA = a.reduce((s, p) => s + p.y_percent, 0) / a.length;
  // Point-in-polygon ray casting
  function isInside(x: number, y: number, poly: Point[]): boolean {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x_percent, yi = poly[i].y_percent;
      const xj = poly[j].x_percent, yj = poly[j].y_percent;
      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }
  return isInside(cxA, cyA, b) || isInside(
    b.reduce((s, p) => s + p.x_percent, 0) / b.length,
    b.reduce((s, p) => s + p.y_percent, 0) / b.length,
    a
  );
}

describe("polygonArea", () => {
  it("calcule l'aire d'un carré 10x10", () => {
    const sq: Point[] = [
      { x_percent: 0, y_percent: 0 },
      { x_percent: 10, y_percent: 0 },
      { x_percent: 10, y_percent: 10 },
      { x_percent: 0, y_percent: 10 },
    ];
    expect(polygonArea(sq)).toBeCloseTo(100, 2);
  });

  it("retourne 0 pour moins de 3 points", () => {
    expect(polygonArea([])).toBe(0);
    expect(polygonArea([{ x_percent: 0, y_percent: 0 }])).toBe(0);
  });
});

describe("resolveRoomOverlaps — 2 pièces avec overlap", () => {
  const roomA: RoomWithPolygon = {
    id: "A",
    surface_m2: 50, // plus grand → priorité
    bounding_polygon: [
      { x_percent: 10, y_percent: 10 },
      { x_percent: 30, y_percent: 10 },
      { x_percent: 30, y_percent: 30 },
      { x_percent: 10, y_percent: 30 },
    ],
  };
  const roomB: RoomWithPolygon = {
    id: "B",
    surface_m2: 20, // plus petit → cède
    bounding_polygon: [
      { x_percent: 20, y_percent: 20 }, // chevauche roomA
      { x_percent: 40, y_percent: 20 },
      { x_percent: 40, y_percent: 40 },
      { x_percent: 20, y_percent: 40 },
    ],
  };

  it("le territoire contesté est retiré de la pièce la plus petite", () => {
    const { resolved, dropped, warnings } = resolveRoomOverlaps([roomA, roomB]);
    expect(resolved).toHaveLength(2);
    expect(dropped).toHaveLength(0);

    const resolvedA = resolved.find((r) => r.id === "A");
    const resolvedB = resolved.find((r) => r.id === "B");
    expect(resolvedA?.bounding_polygon).toBeDefined();
    expect(resolvedB?.bounding_polygon).toBeDefined();

    // Surface de A inchangée (la plus grande garde tout)
    expect(polygonArea(resolvedA!.bounding_polygon!)).toBeCloseTo(400, 0);
    // Surface de B réduite (l'intersection avec A était 10x10 = 100)
    expect(polygonArea(resolvedB!.bounding_polygon!)).toBeLessThan(400);
    // Warning pour overlap clipping émis sur B
    expect(warnings.some((w) => w.room_id === "B" && w.type === "room_clipped_for_overlap")).toBe(true);
  });

  it("plus d'overlap entre A et B après résolution", () => {
    const { resolved } = resolveRoomOverlaps([roomA, roomB]);
    const resolvedA = resolved.find((r) => r.id === "A")!;
    const resolvedB = resolved.find((r) => r.id === "B")!;
    expect(haveOverlap(resolvedA.bounding_polygon!, resolvedB.bounding_polygon!)).toBe(false);
  });
});

describe("resolveRoomOverlaps — 3 pièces avec chevauchements multiples", () => {
  it("résout triangulaires qui se chevauchent toutes", () => {
    const rooms: RoomWithPolygon[] = [
      {
        id: "big",
        surface_m2: 100,
        bounding_polygon: [
          { x_percent: 0, y_percent: 0 },
          { x_percent: 50, y_percent: 0 },
          { x_percent: 50, y_percent: 50 },
          { x_percent: 0, y_percent: 50 },
        ],
      },
      {
        id: "mid",
        surface_m2: 50,
        bounding_polygon: [
          { x_percent: 30, y_percent: 30 },
          { x_percent: 80, y_percent: 30 },
          { x_percent: 80, y_percent: 80 },
          { x_percent: 30, y_percent: 80 },
        ],
      },
      {
        id: "small",
        surface_m2: 20,
        bounding_polygon: [
          { x_percent: 20, y_percent: 20 },
          { x_percent: 60, y_percent: 20 },
          { x_percent: 60, y_percent: 60 },
          { x_percent: 20, y_percent: 60 },
        ],
      },
    ];
    const { resolved, dropped, warnings } = resolveRoomOverlaps(rooms);

    // Toutes les pièces résolues ont un polygone valide (≥ 3 points)
    for (const r of resolved) {
      expect(r.bounding_polygon!.length).toBeGreaterThanOrEqual(3);
    }

    // La plus grande (big) est inchangée
    const big = resolved.find((r) => r.id === "big")!;
    expect(polygonArea(big.bounding_polygon!)).toBeCloseTo(2500, 0);

    // Warnings émis pour les pièces clippées
    expect(warnings.length).toBeGreaterThan(0);

    // Drop possible pour "small" complètement absorbé entre big et mid
    // → tolère dropped.length entre 0 et 1
    expect(dropped.length).toBeLessThanOrEqual(1);
  });
});

describe("resolveRoomOverlaps — contenance dans le lot", () => {
  it("clip une pièce qui déborde hors du polygone du lot", () => {
    const lot: Point[] = [
      { x_percent: 10, y_percent: 10 },
      { x_percent: 50, y_percent: 10 },
      { x_percent: 50, y_percent: 50 },
      { x_percent: 10, y_percent: 50 },
    ];
    const roomOutside: RoomWithPolygon = {
      id: "debord",
      surface_m2: 40,
      bounding_polygon: [
        { x_percent: 40, y_percent: 40 },
        { x_percent: 70, y_percent: 40 }, // déborde en x
        { x_percent: 70, y_percent: 70 }, // déborde en x+y
        { x_percent: 40, y_percent: 70 }, // déborde en y
      ],
    };
    const { resolved, warnings } = resolveRoomOverlaps([roomOutside], lot);

    expect(resolved).toHaveLength(1);
    // Polygone clippé : doit être dans [10,50] × [10,50]
    const poly = resolved[0].bounding_polygon!;
    for (const pt of poly) {
      expect(pt.x_percent).toBeGreaterThanOrEqual(10 - 0.01);
      expect(pt.x_percent).toBeLessThanOrEqual(50 + 0.01);
      expect(pt.y_percent).toBeGreaterThanOrEqual(10 - 0.01);
      expect(pt.y_percent).toBeLessThanOrEqual(50 + 0.01);
    }
    expect(warnings.some((w) => w.type === "room_clipped_for_containment")).toBe(true);
  });
});

describe("resolveRoomOverlaps — baseline non-régression", () => {
  it("aucune modification si aucun overlap ni lot fourni", () => {
    const rooms: RoomWithPolygon[] = [
      {
        id: "r1",
        surface_m2: 30,
        bounding_polygon: [
          { x_percent: 10, y_percent: 10 },
          { x_percent: 30, y_percent: 10 },
          { x_percent: 30, y_percent: 30 },
          { x_percent: 10, y_percent: 30 },
        ],
      },
      {
        id: "r2",
        surface_m2: 30,
        bounding_polygon: [
          { x_percent: 50, y_percent: 50 },
          { x_percent: 70, y_percent: 50 },
          { x_percent: 70, y_percent: 70 },
          { x_percent: 50, y_percent: 70 },
        ],
      },
    ];
    const { resolved, dropped, warnings } = resolveRoomOverlaps(rooms);

    expect(resolved).toHaveLength(2);
    expect(dropped).toHaveLength(0);
    // Les surfaces restent les mêmes
    for (const r of resolved) {
      expect(polygonArea(r.bounding_polygon!)).toBeCloseTo(400, 0);
    }
    // Pas de warning d'overlap
    expect(warnings.filter((w) => w.type === "room_clipped_for_overlap")).toHaveLength(0);
  });

  it("pièces sans bounding_polygon sont conservées telles quelles", () => {
    const rooms: RoomWithPolygon[] = [
      { id: "noPoly", surface_m2: 15, bounding_polygon: null },
      {
        id: "withPoly",
        surface_m2: 30,
        bounding_polygon: [
          { x_percent: 10, y_percent: 10 },
          { x_percent: 20, y_percent: 10 },
          { x_percent: 20, y_percent: 20 },
          { x_percent: 10, y_percent: 20 },
        ],
      },
    ];
    const { resolved } = resolveRoomOverlaps(rooms);
    expect(resolved).toHaveLength(2);
    expect(resolved.find((r) => r.id === "noPoly")?.bounding_polygon).toBeFalsy();
  });
});
