/**
 * Tests unitaires — helpers UI rendu segments (s32 autopilot Feature B).
 *
 * Couvre :
 *  - distancePointToSegment : distance point→segment + projection orthogonale
 *  - findNearestSegment : hit-test sur le polygone, tolérance configurable
 *  - SEGMENT_TYPE_LABELS : 6 types couverts (wall/door/window/bay_window/
 *    opening/flexible)
 *
 * On ne teste pas le rendu canvas (pas de jsdom : helpers purs uniquement).
 */

import { describe, it, expect } from "vitest";
import {
  distancePointToSegment,
  findNearestSegment,
  SEGMENT_TYPE_LABELS,
  type ScreenPoint,
} from "@/lib/vs/ui/segment-render";

describe("distancePointToSegment", () => {
  it("retourne 0 quand le point est exactement sur le segment", () => {
    const a: ScreenPoint = { x: 0, y: 0 };
    const b: ScreenPoint = { x: 10, y: 0 };
    const r = distancePointToSegment(5, 0, a, b);
    expect(r.distance).toBeCloseTo(0, 5);
    expect(r.closest.x).toBeCloseTo(5, 5);
    expect(r.closest.y).toBeCloseTo(0, 5);
  });

  it("calcule la distance perpendiculaire pour un segment horizontal", () => {
    const a: ScreenPoint = { x: 0, y: 0 };
    const b: ScreenPoint = { x: 10, y: 0 };
    const r = distancePointToSegment(5, 4, a, b);
    expect(r.distance).toBeCloseTo(4, 5);
    expect(r.closest.y).toBeCloseTo(0, 5);
  });

  it("clamp la projection aux bornes du segment", () => {
    const a: ScreenPoint = { x: 0, y: 0 };
    const b: ScreenPoint = { x: 10, y: 0 };
    // Point au-delà de b
    const r = distancePointToSegment(20, 0, a, b);
    expect(r.closest.x).toBeCloseTo(10, 5);
    expect(r.distance).toBeCloseTo(10, 5);
  });

  it("gère un segment dégénéré (a === b)", () => {
    const a: ScreenPoint = { x: 5, y: 5 };
    const r = distancePointToSegment(8, 9, a, a);
    expect(r.distance).toBeCloseTo(5, 5);
    expect(r.closest.x).toBe(5);
    expect(r.closest.y).toBe(5);
  });
});

describe("findNearestSegment", () => {
  // Carré 100x100
  const square: ScreenPoint[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];

  it("trouve le segment haut quand on clique près de y=0", () => {
    const hit = findNearestSegment(50, 5, square, 14);
    expect(hit).not.toBeNull();
    expect(hit!.segmentIndex).toBe(0);
    expect(hit!.distance).toBeLessThanOrEqual(14);
  });

  it("trouve le segment droit quand on clique près de x=100", () => {
    const hit = findNearestSegment(95, 50, square, 14);
    expect(hit).not.toBeNull();
    expect(hit!.segmentIndex).toBe(1);
  });

  it("trouve le segment bas quand on clique près de y=100", () => {
    const hit = findNearestSegment(50, 96, square, 14);
    expect(hit).not.toBeNull();
    expect(hit!.segmentIndex).toBe(2);
  });

  it("trouve le segment gauche (qui ferme le polygone, index 3)", () => {
    const hit = findNearestSegment(4, 50, square, 14);
    expect(hit).not.toBeNull();
    expect(hit!.segmentIndex).toBe(3);
  });

  it("retourne null si on est trop loin de tous les segments", () => {
    const hit = findNearestSegment(50, 50, square, 14);
    expect(hit).toBeNull();
  });

  it("retourne null si polygone < 3 sommets", () => {
    const hit = findNearestSegment(0, 0, [{ x: 0, y: 0 }, { x: 1, y: 1 }], 14);
    expect(hit).toBeNull();
  });

  it("respecte la tolérance personnalisée", () => {
    // À 30px du segment haut → en dehors d'une tolérance 14, dedans pour 32
    expect(findNearestSegment(50, 30, square, 14)).toBeNull();
    const hit = findNearestSegment(50, 30, square, 32);
    expect(hit).not.toBeNull();
    expect(hit!.segmentIndex).toBe(0);
  });
});

describe("SEGMENT_TYPE_LABELS", () => {
  it("contient les 6 types attendus", () => {
    const keys = Object.keys(SEGMENT_TYPE_LABELS).sort();
    expect(keys).toEqual([
      "bay_window",
      "door",
      "flexible",
      "opening",
      "wall",
      "window",
    ]);
  });

  it("a des labels FR non vides", () => {
    for (const v of Object.values(SEGMENT_TYPE_LABELS)) {
      expect(typeof v).toBe("string");
      expect(v.length).toBeGreaterThan(0);
    }
  });
});
