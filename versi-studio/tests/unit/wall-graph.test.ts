/**
 * Tests unitaires du graphe lignes murs + détection pièces (Module 4/5 — s27).
 *
 * Fixtures : segments synthétiques inline (pas de PDF réel — M4 est purement
 * géométrique, indépendant de la source M2/M3).
 *
 * Couvre :
 *   (a) rectangle 4 segments → 1 pièce
 *   (b) L-shape (2 rectangles connectés partageant un côté) → 2 pièces
 *   (c) H-shape (2 chambres + couloir) → 3 pièces
 *   (d) segments déconnectés → throw WallGraphError
 *   (e) snap tolerance fonctionne sur endpoints presque-coincidents
 */

import { describe, it, expect } from "vitest";
import {
  buildWallGraph,
  detectRooms,
  filterValidRooms,
  WallGraphError,
} from "../../src/lib/vs/wall-graph";

describe("buildWallGraph + detectRooms", () => {
  it("(a) rectangle 4 segments → 1 pièce détectée", () => {
    // Carré 100x100 : 4 segments fermant un cycle.
    const segments = [
      { x1: 0, y1: 0, x2: 100, y2: 0 },
      { x1: 100, y1: 0, x2: 100, y2: 100 },
      { x1: 100, y1: 100, x2: 0, y2: 100 },
      { x1: 0, y1: 100, x2: 0, y2: 0 },
    ];
    const graph = buildWallGraph(segments);
    expect(graph.nodes.length).toBe(4);
    expect(graph.edges.length).toBe(4);

    const rooms = detectRooms(graph);
    // L'algo trouve 2 faces (intérieure + externe). filterValidRooms exclut l'externe.
    const valid = filterValidRooms(rooms, 100);
    expect(valid.length).toBe(1);
    expect(valid[0].area).toBeCloseTo(10000, 1);
  });

  it("(b) L-shape (2 rectangles partageant un mur) → 2 pièces", () => {
    // Deux carrés côte-à-côte : (0,0)-(100,100) et (100,0)-(200,100), mur partagé à x=100.
    // Total 7 segments uniques (6 contour + 1 mur partagé).
    const segments = [
      // Carré gauche
      { x1: 0, y1: 0, x2: 100, y2: 0 },
      { x1: 100, y1: 0, x2: 100, y2: 100 },
      { x1: 100, y1: 100, x2: 0, y2: 100 },
      { x1: 0, y1: 100, x2: 0, y2: 0 },
      // Carré droit (partage mur x=100)
      { x1: 100, y1: 0, x2: 200, y2: 0 },
      { x1: 200, y1: 0, x2: 200, y2: 100 },
      { x1: 200, y1: 100, x2: 100, y2: 100 },
    ];
    const graph = buildWallGraph(segments);
    expect(graph.nodes.length).toBe(6);

    const rooms = detectRooms(graph);
    const valid = filterValidRooms(rooms, 100);
    expect(valid.length).toBe(2);
    // Chaque pièce ~10000 d'aire.
    for (const r of valid) {
      expect(r.area).toBeCloseTo(10000, 1);
    }
  });

  it("(c) H-shape (2 chambres + couloir) → 3 pièces", () => {
    // Trois rectangles côte-à-côte partageant deux murs verticaux :
    //   chambre1 : (0,0)-(100,100)
    //   couloir  : (100,0)-(150,100)
    //   chambre2 : (150,0)-(250,100)
    // Murs : 4 horizontaux extérieurs (top/bottom × 3 pas tous) + 4 verticaux
    // Total : top1, top2, top3, bottom1, bottom2, bottom3, left, right, mid1, mid2 = 10 segments
    const segments = [
      // Bottom edges
      { x1: 0, y1: 0, x2: 100, y2: 0 },
      { x1: 100, y1: 0, x2: 150, y2: 0 },
      { x1: 150, y1: 0, x2: 250, y2: 0 },
      // Top edges
      { x1: 0, y1: 100, x2: 100, y2: 100 },
      { x1: 100, y1: 100, x2: 150, y2: 100 },
      { x1: 150, y1: 100, x2: 250, y2: 100 },
      // Vertical edges
      { x1: 0, y1: 0, x2: 0, y2: 100 }, // left
      { x1: 100, y1: 0, x2: 100, y2: 100 }, // mid1
      { x1: 150, y1: 0, x2: 150, y2: 100 }, // mid2
      { x1: 250, y1: 0, x2: 250, y2: 100 }, // right
    ];
    const graph = buildWallGraph(segments);
    expect(graph.nodes.length).toBe(8);

    const rooms = detectRooms(graph);
    const valid = filterValidRooms(rooms, 100);
    expect(valid.length).toBe(3);
    // Aires attendues : 10000, 5000, 10000.
    const areas = valid.map((r) => r.area).sort((a, b) => a - b);
    expect(areas[0]).toBeCloseTo(5000, 1);
    expect(areas[1]).toBeCloseTo(10000, 1);
    expect(areas[2]).toBeCloseTo(10000, 1);
  });

  it("(d) segments vides → throw WallGraphError(empty_segments)", () => {
    expect(() => buildWallGraph([])).toThrow(WallGraphError);
    try {
      buildWallGraph([]);
    } catch (e) {
      expect(e).toBeInstanceOf(WallGraphError);
      expect((e as WallGraphError).code).toBe("empty_segments");
    }
  });

  it("(d-bis) graphe arborescent (sans cycle) → throw no_faces_detected ou disconnected", () => {
    // 3 segments en chaîne sans jamais boucler.
    const segments = [
      { x1: 0, y1: 0, x2: 100, y2: 0 },
      { x1: 100, y1: 0, x2: 200, y2: 0 },
      { x1: 200, y1: 0, x2: 300, y2: 0 },
    ];
    const graph = buildWallGraph(segments);
    expect(() => detectRooms(graph)).toThrow(WallGraphError);
  });

  it("(e) snap tolerance fusionne les endpoints presque-coincidents", () => {
    // Carré dont les coins ne se touchent pas exactement (drift 2 unités).
    // Avec tolérance 5 → snap → 1 pièce détectée.
    const segments = [
      { x1: 0, y1: 0, x2: 100, y2: 0 },
      { x1: 101, y1: 1, x2: 100, y2: 100 },
      { x1: 99, y1: 99, x2: 1, y2: 100 },
      { x1: 0, y1: 101, x2: 0, y2: 0 },
    ];
    const graph = buildWallGraph(segments, 5);
    // 4 endpoints distincts après snap (1 par coin).
    expect(graph.nodes.length).toBe(4);
    expect(graph.edges.length).toBe(4);

    const rooms = detectRooms(graph);
    const valid = filterValidRooms(rooms, 100);
    expect(valid.length).toBe(1);
    // Aire ~10000 (légèrement variable selon snap).
    expect(valid[0].area).toBeGreaterThan(9000);
    expect(valid[0].area).toBeLessThan(11000);

    // Sans tolérance (0), seuls les endpoints exactement coïncidents
    // fusionnent. Ici segment[0] démarre à (0,0) et segment[3] termine à
    // (0,0) → fusion exacte → 7 nodes (un par drift, plus le (0,0) commun).
    const graphNoSnap = buildWallGraph(segments, 0);
    expect(graphNoSnap.nodes.length).toBe(7);
  });
});
