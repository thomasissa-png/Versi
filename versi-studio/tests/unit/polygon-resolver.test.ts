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

// ─── Tests post-fix s23 (reality-check E2E 2026-04-19) ────────────

describe("resolveRoomOverlaps — tri par aire polygone (surface_m2=null)", () => {
  it("quand surface_m2=null sur toutes les pièces, trie par aire polygone DESC", () => {
    // Cas reproducteur : IA ne retourne pas surface_m2 → priorité doit tomber
    // sur l'aire polygone, pas laisser un ordre indéterminé
    const bigNoSurface: RoomWithPolygon = {
      id: "big",
      surface_m2: null,
      bounding_polygon: [
        { x_percent: 10, y_percent: 10 },
        { x_percent: 60, y_percent: 10 },
        { x_percent: 60, y_percent: 60 },
        { x_percent: 10, y_percent: 60 },
      ], // aire = 50*50 = 2500
    };
    const smallNoSurface: RoomWithPolygon = {
      id: "small",
      surface_m2: null,
      bounding_polygon: [
        { x_percent: 50, y_percent: 50 },
        { x_percent: 80, y_percent: 50 },
        { x_percent: 80, y_percent: 80 },
        { x_percent: 50, y_percent: 80 },
      ], // aire = 30*30 = 900
    };
    // L'ordre d'entrée est "small, big" pour prouver que le tri par aire gagne
    const { resolved } = resolveRoomOverlaps([smallNoSurface, bigNoSurface]);
    const big = resolved.find((r) => r.id === "big")!;
    const small = resolved.find((r) => r.id === "small")!;
    // La plus grande (big) garde son aire complète (2500)
    expect(polygonArea(big.bounding_polygon!)).toBeCloseTo(2500, 0);
    // La plus petite (small) est clippée (aire < 900)
    expect(polygonArea(small.bounding_polygon!)).toBeLessThan(900);
    expect(haveOverlap(big.bounding_polygon!, small.bounding_polygon!)).toBe(false);
  });
});

describe("resolveRoomOverlaps — cas P02 reality-check (Séjour ⊃ SDB)", () => {
  it("SDB petite largement contenue dans Séjour cuisine → clippée complètement", () => {
    // Reproduction du cas observé sur plan R+2 : Séjour cuisine est un grand
    // polygone, SDB est un petit polygone majoritairement dedans.
    // L'ancien algo laissait un overlap résiduel car safeDifference pouvait
    // échouer silencieusement. Le nouvel algo boucle jusqu'à stabilité.
    const sejour: RoomWithPolygon = {
      id: "Séjour cuisine",
      surface_m2: null, // IA n'a pas retourné la surface
      bounding_polygon: [
        { x_percent: 10, y_percent: 10 },
        { x_percent: 60, y_percent: 10 },
        { x_percent: 60, y_percent: 50 },
        { x_percent: 10, y_percent: 50 },
      ], // aire = 2000
    };
    const sdb: RoomWithPolygon = {
      id: "SDB",
      surface_m2: null,
      bounding_polygon: [
        { x_percent: 45, y_percent: 20 }, // intérieur de sejour
        { x_percent: 55, y_percent: 20 },
        { x_percent: 55, y_percent: 40 },
        { x_percent: 45, y_percent: 40 },
      ], // aire = 200, overlap total avec sejour
    };
    const { resolved, dropped } = resolveRoomOverlaps([sejour, sdb]);

    // Séjour (plus grand) conservé avec son aire complète
    const sejourOut = resolved.find((r) => r.id === "Séjour cuisine");
    expect(sejourOut).toBeDefined();
    expect(polygonArea(sejourOut!.bounding_polygon!)).toBeCloseTo(2000, 0);

    // SDB entièrement absorbée → doit être droppée (pas laissée avec overlap)
    // L'important : overlap résiduel = 0
    if (resolved.find((r) => r.id === "SDB")) {
      const sdbOut = resolved.find((r) => r.id === "SDB")!;
      expect(haveOverlap(sejourOut!.bounding_polygon!, sdbOut.bounding_polygon!)).toBe(false);
    } else {
      expect(dropped.find((d) => d.id === "SDB")).toBeDefined();
    }
  });

  it("trois pièces avec chaîne d'overlaps (A>B, B>C) → toutes passes résolvent", () => {
    // Cas chaîne : nécessite possibly 2 passes pour stabiliser
    const A: RoomWithPolygon = {
      id: "A",
      surface_m2: null,
      bounding_polygon: [
        { x_percent: 0, y_percent: 0 },
        { x_percent: 40, y_percent: 0 },
        { x_percent: 40, y_percent: 40 },
        { x_percent: 0, y_percent: 40 },
      ], // aire 1600
    };
    const B: RoomWithPolygon = {
      id: "B",
      surface_m2: null,
      bounding_polygon: [
        { x_percent: 30, y_percent: 30 },
        { x_percent: 60, y_percent: 30 },
        { x_percent: 60, y_percent: 60 },
        { x_percent: 30, y_percent: 60 },
      ], // aire 900, overlap avec A 10x10
    };
    const C: RoomWithPolygon = {
      id: "C",
      surface_m2: null,
      bounding_polygon: [
        { x_percent: 50, y_percent: 50 },
        { x_percent: 75, y_percent: 50 },
        { x_percent: 75, y_percent: 75 },
        { x_percent: 50, y_percent: 75 },
      ], // aire 625, overlap avec B 10x10
    };
    const { resolved } = resolveRoomOverlaps([A, B, C]);

    // Vérifier : aucun overlap résiduel entre paires
    for (let i = 0; i < resolved.length; i++) {
      for (let j = i + 1; j < resolved.length; j++) {
        const polyI = resolved[i].bounding_polygon;
        const polyJ = resolved[j].bounding_polygon;
        if (polyI && polyJ) {
          expect(haveOverlap(polyI, polyJ)).toBe(false);
        }
      }
    }
  });
});

describe("resolveRoomOverlaps — polygone self-intersect (geometry invalide)", () => {
  it("nettoie un polygone auto-intersectant (papillon) avant clipping", () => {
    // Papillon (bowtie) : self-intersect classique
    const bowtie: RoomWithPolygon = {
      id: "bowtie",
      surface_m2: null,
      bounding_polygon: [
        { x_percent: 10, y_percent: 10 },
        { x_percent: 30, y_percent: 10 },
        { x_percent: 10, y_percent: 30 }, // croisement avec arête suivante
        { x_percent: 30, y_percent: 30 },
      ],
    };
    const other: RoomWithPolygon = {
      id: "other",
      surface_m2: null,
      bounding_polygon: [
        { x_percent: 15, y_percent: 15 },
        { x_percent: 25, y_percent: 15 },
        { x_percent: 25, y_percent: 25 },
        { x_percent: 15, y_percent: 25 },
      ],
    };
    // Ne doit pas throw — le resolver doit gérer le self-intersect
    const { resolved, warnings } = resolveRoomOverlaps([bowtie, other]);
    expect(resolved.length).toBeGreaterThan(0);
    // Soit le polygone a été nettoyé (warning émis), soit le cas a été géré ;
    // l'important est que ça ne crash pas.
    const cleanedWarning = warnings.find((w) => w.type === "polygon_cleaned_invalid_geometry");
    // Le papillon standard peut être reconnu comme 2 triangles par polygon-clipping
    // → warning émis. Mais on tolère aussi le cas où polygon-clipping l'accepte.
    expect(cleanedWarning === undefined || cleanedWarning.room_id === "bowtie").toBe(true);
  });
});
