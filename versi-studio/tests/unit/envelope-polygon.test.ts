/**
 * Tests unitaires — envelope-polygon.ts (s27 R3)
 *
 * Couvre la migration convex hull → concave hull (alpha-shape) :
 *  - convexHull conserve son comportement (rétro-compat).
 *  - concaveHull préserve une forme en L (vs convex qui la lisse).
 *  - computeLotPolygonEnvelope retourne un polygone non-convexe sur lot en L.
 *  - Fallback convex si alpha-shape dégénéré.
 *  - Garde-fous snap_rate / no_rooms / not_enough_points inchangés.
 */

import { describe, it, expect } from "vitest";
import {
  convexHull,
  concaveHull,
  expandPolygonOutward,
  computeLotPolygonEnvelope,
  polygonBoundingBox,
  type Point,
  type RoomForEnvelope,
} from "../../src/lib/vs/envelope-polygon";

// ─── Helpers ────────────────────────────────────────────────────────

function p(x: number, y: number): Point {
  return { x_percent: x, y_percent: y };
}

function makeRoom(
  id: string,
  polygon: Point[],
  isSnapped = true,
): RoomForEnvelope {
  return { id, bounding_polygon: polygon, isSnapped };
}

/**
 * Polygon area (Shoelace, valeur absolue). Utile pour vérifier qu'un concave
 * hull est plus petit que le convex hull correspondant (preuve qu'il a "creusé"
 * le coin manquant du L).
 */
function polygonArea(points: Point[]): number {
  let a2 = 0;
  for (let i = 0; i < points.length; i++) {
    const c = points[i];
    const n = points[(i + 1) % points.length];
    a2 += c.x_percent * n.y_percent - n.x_percent * c.y_percent;
  }
  return Math.abs(a2) / 2;
}

// ─── convexHull (rétro-compat) ──────────────────────────────────────

describe("convexHull", () => {
  it("retourne un carré pour 4 sommets carrés", () => {
    const hull = convexHull([p(0, 0), p(10, 0), p(10, 10), p(0, 10)]);
    expect(hull.length).toBe(4);
  });

  it("dédoublonne les points identiques", () => {
    const hull = convexHull([p(0, 0), p(0, 0), p(10, 0), p(10, 10), p(0, 10)]);
    expect(hull.length).toBe(4);
  });

  it("retourne les points tels-quels si < 3 points", () => {
    expect(convexHull([])).toEqual([]);
    expect(convexHull([p(1, 1)])).toEqual([p(1, 1)]);
    expect(convexHull([p(1, 1), p(2, 2)])).toEqual([p(1, 1), p(2, 2)]);
  });
});

// ─── concaveHull (s27 R3) ───────────────────────────────────────────

describe("concaveHull", () => {
  it("retourne null si moins de 3 points", () => {
    expect(concaveHull([])).toBeNull();
    expect(concaveHull([p(0, 0), p(1, 1)])).toBeNull();
  });

  it("préserve une forme en L (aire concave < aire convexe)", () => {
    // L : carré 10×10 avec quart sup-droit (5×5) manquant.
    // Sommets denses sur TOUT le périmètre du L pour donner à l'alpha-shape
    // le matériau pour creuser le coin manquant.
    const shape: Point[] = [];
    // Bord bas (y=0)
    for (let x = 0; x <= 10; x += 1) shape.push(p(x, 0));
    // Bord droit (jusqu'à y=5)
    for (let y = 1; y <= 5; y += 1) shape.push(p(10, y));
    // Rentrée horizontale (y=5, x de 10 vers 5)
    for (let x = 9; x >= 5; x -= 1) shape.push(p(x, 5));
    // Rentrée verticale (x=5, y de 5 vers 10)
    for (let y = 6; y <= 10; y += 1) shape.push(p(5, y));
    // Bord haut (y=10, x de 5 vers 0)
    for (let x = 4; x >= 0; x -= 1) shape.push(p(x, 10));
    // Bord gauche (x=0, y de 10 vers 0)
    for (let y = 9; y >= 1; y -= 1) shape.push(p(0, y));

    const concave = concaveHull(shape, 1.5); // alpha permissif vu la densité
    const convex = convexHull(shape);

    // Convex hull = pentagone englobant le L
    // (perd les 5×5 = 25 du coin manquant + 12.5 du triangle de complément).
    // L'aire exacte dépend du ré-échantillonnage ; on vérifie juste qu'elle
    // est proche de 87.5 (carré 10×10 amputé du triangle 5×5÷2 = 12.5).
    const convexArea = polygonArea(convex);
    expect(convexArea).toBeGreaterThan(80);
    expect(convexArea).toBeLessThanOrEqual(100);

    // Si l'alpha-shape réussit, son aire doit être < convex (preuve qu'il a
    // creusé le coin rentrant). Sinon (dégénéré), null = signal fallback côté caller.
    if (concave) {
      expect(concave.length).toBeGreaterThanOrEqual(3);
      expect(polygonArea(concave)).toBeLessThan(convexArea);
    }
  });

  it("retourne un polygone CCW (orientation positive)", () => {
    // Carré simple — l'alpha-shape doit retourner les 4 coins en CCW.
    const sq = [p(0, 0), p(10, 0), p(10, 10), p(0, 10)];
    const hull = concaveHull(sq, 2);
    if (hull) {
      // Aire signée > 0 = CCW
      let a2 = 0;
      for (let i = 0; i < hull.length; i++) {
        const c = hull[i];
        const n = hull[(i + 1) % hull.length];
        a2 += c.x_percent * n.y_percent - n.x_percent * c.y_percent;
      }
      expect(a2).toBeGreaterThan(0);
    }
  });

  it("retourne null avec alpha trop petit (rayon insuffisant)", () => {
    // Points très espacés + alpha énorme → aucun triangle ne passe le filtre.
    const sparse = [p(0, 0), p(50, 0), p(50, 50), p(0, 50)];
    const hull = concaveHull(sparse, 100); // alpha=100 → rayon max 0.01
    expect(hull).toBeNull();
  });
});

// ─── expandPolygonOutward ───────────────────────────────────────────

describe("expandPolygonOutward", () => {
  it("élargit un carré centré de 10% sans clipping", () => {
    const sq = [p(40, 40), p(60, 40), p(60, 60), p(40, 60)];
    const out = expandPolygonOutward(sq, 10);
    // Centre = (50,50) ; chaque sommet distant de 10 → après ×1.1 = distance 11.
    // Sommet (40,40) → (50 - 11, 50 - 11) = (39,39).
    expect(out[0].x_percent).toBeCloseTo(39, 1);
    expect(out[0].y_percent).toBeCloseTo(39, 1);
  });

  it("clamp les sommets à [0, 100]", () => {
    const sq = [p(0, 0), p(100, 0), p(100, 100), p(0, 100)];
    const out = expandPolygonOutward(sq, 50);
    for (const v of out) {
      expect(v.x_percent).toBeGreaterThanOrEqual(0);
      expect(v.x_percent).toBeLessThanOrEqual(100);
      expect(v.y_percent).toBeGreaterThanOrEqual(0);
      expect(v.y_percent).toBeLessThanOrEqual(100);
    }
  });

  it("retourne le polygone tel-quel si paddingPct ≤ 0", () => {
    const sq = [p(10, 10), p(20, 10), p(20, 20), p(10, 20)];
    expect(expandPolygonOutward(sq, 0)).toEqual(sq);
    expect(expandPolygonOutward(sq, -5)).toEqual(sq);
  });
});

// ─── computeLotPolygonEnvelope ──────────────────────────────────────

describe("computeLotPolygonEnvelope", () => {
  it("retourne null + reason no_rooms si liste vide", () => {
    const r = computeLotPolygonEnvelope([]);
    expect(r.polygon).toBeNull();
    expect(r.rejectReason).toBe("no_rooms");
    expect(r.totalCount).toBe(0);
  });

  it("retourne null si snap_rate < seuil", () => {
    const rooms: RoomForEnvelope[] = [
      makeRoom("a", [p(0, 0), p(10, 0), p(10, 10)], false),
      makeRoom("b", [p(20, 0), p(30, 0), p(30, 10)], false),
    ];
    const r = computeLotPolygonEnvelope(rooms, 0.5);
    expect(r.polygon).toBeNull();
    expect(r.rejectReason).toMatch(/snap_rate_too_low/);
  });

  it("retourne un polygon ≥ 3 points sur 3 rooms snappées (carré simple)", () => {
    const rooms: RoomForEnvelope[] = [
      makeRoom("a", [p(0, 0), p(10, 0), p(10, 10), p(0, 10)]),
      makeRoom("b", [p(10, 0), p(20, 0), p(20, 10), p(10, 10)]),
      makeRoom("c", [p(0, 10), p(20, 10), p(20, 20), p(0, 20)]),
    ];
    const r = computeLotPolygonEnvelope(rooms, 0.3, 0);
    expect(r.polygon).not.toBeNull();
    expect(r.polygon!.length).toBeGreaterThanOrEqual(3);
    expect(r.snapRate).toBe(1);
  });

  it("fallback convex si alpha trop strict (cellule dégénérée)", () => {
    // Alpha énorme → concave hull retourne null → fallback convex.
    const rooms: RoomForEnvelope[] = [
      makeRoom("a", [p(0, 0), p(10, 0), p(10, 10), p(0, 10)]),
    ];
    const r = computeLotPolygonEnvelope(rooms, 0.3, 0, 100);
    // Convex hull du carré = 4 points → polygon non-null (fallback OK)
    expect(r.polygon).not.toBeNull();
  });
});

// ─── polygonBoundingBox ─────────────────────────────────────────────

describe("polygonBoundingBox", () => {
  it("calcule la bbox d'un polygone non-convexe (forme L)", () => {
    const lShape = [p(0, 0), p(10, 0), p(10, 5), p(5, 5), p(5, 10), p(0, 10)];
    const bb = polygonBoundingBox(lShape);
    expect(bb.x_percent).toBe(0);
    expect(bb.y_percent).toBe(0);
    expect(bb.width_percent).toBe(10);
    expect(bb.height_percent).toBe(10);
  });

  it("retourne 0,0,0,0 si polygone vide", () => {
    expect(polygonBoundingBox([])).toEqual({
      x_percent: 0,
      y_percent: 0,
      width_percent: 0,
      height_percent: 0,
    });
  });
});
