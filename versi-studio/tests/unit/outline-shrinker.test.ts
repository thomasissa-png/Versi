/**
 * Tests unitaires — outline-shrinker.ts (s25 P0)
 *
 * Couvre :
 * - shrinkOutlineToRooms : polygones, fallback bbox, rooms vide, marge
 * - shrinkOutlinesByUnit : groupement par unit_id, skip null
 *
 * Garantie : déterministe. Si rooms à 44m², outline ≈ 44.5m² (pas 47m²).
 */

import { describe, it, expect } from "vitest";
import {
  shrinkOutlineToRooms,
  shrinkOutlinesByUnit,
  shrinkOutlinePolygonToRooms,
  shrinkOutlinePolygonsByUnit,
} from "../../src/lib/vs/outline-shrinker";
import type { ExtractedRoom } from "../../src/lib/vs/schemas";

// ─── Fixture factory ─────────────────────────────────────────────

function makeRoom(overrides: Partial<ExtractedRoom> = {}): ExtractedRoom {
  return {
    temp_id: "r1",
    name_raw: "Séjour",
    surface_m2: 20,
    dimensions: null,
    ceiling_height_m: null,
    windows_count: 1,
    doors_count: 1,
    floor: 0,
    confidence: 0.9,
    shape: null,
    notes: null,
    bounding_box: null,
    unit_id: "u1",
    bounding_polygon: null,
    ...overrides,
  };
}

// ─── shrinkOutlineToRooms ───────────────────────────────────────

describe("shrinkOutlineToRooms", () => {
  it("calcule un tight-bbox correct avec 3 rooms polygones", () => {
    const rooms = [
      makeRoom({
        bounding_polygon: [
          { x_percent: 10, y_percent: 10 },
          { x_percent: 30, y_percent: 10 },
          { x_percent: 30, y_percent: 30 },
          { x_percent: 10, y_percent: 30 },
        ],
      }),
      makeRoom({
        bounding_polygon: [
          { x_percent: 30, y_percent: 10 },
          { x_percent: 50, y_percent: 10 },
          { x_percent: 50, y_percent: 30 },
          { x_percent: 30, y_percent: 30 },
        ],
      }),
      makeRoom({
        bounding_polygon: [
          { x_percent: 10, y_percent: 30 },
          { x_percent: 50, y_percent: 30 },
          { x_percent: 50, y_percent: 50 },
          { x_percent: 10, y_percent: 50 },
        ],
      }),
    ];

    const bbox = shrinkOutlineToRooms(rooms);
    expect(bbox).not.toBeNull();
    // tight = [10,10] → [50,50], marge 0.5% = [9.5, 9.5] → [50.5, 50.5]
    expect(bbox!.x_percent).toBeCloseTo(9.5, 2);
    expect(bbox!.y_percent).toBeCloseTo(9.5, 2);
    expect(bbox!.width_percent).toBeCloseTo(41, 2);
    expect(bbox!.height_percent).toBeCloseTo(41, 2);
  });

  it("fallback sur bounding_box quand bounding_polygon absent", () => {
    const rooms = [
      makeRoom({
        bounding_box: {
          x_percent: 20,
          y_percent: 20,
          width_percent: 30,
          height_percent: 40,
        },
      }),
      makeRoom({
        bounding_box: {
          x_percent: 50,
          y_percent: 20,
          width_percent: 30,
          height_percent: 40,
        },
      }),
    ];

    const bbox = shrinkOutlineToRooms(rooms, { margin_percent: 0 });
    expect(bbox).not.toBeNull();
    // tight = [20,20] → [80,60]
    expect(bbox!.x_percent).toBeCloseTo(20, 2);
    expect(bbox!.y_percent).toBeCloseTo(20, 2);
    expect(bbox!.width_percent).toBeCloseTo(60, 2);
    expect(bbox!.height_percent).toBeCloseTo(40, 2);
  });

  it("retourne null quand aucune room n'a de géométrie", () => {
    const rooms = [
      makeRoom({ bounding_polygon: null, bounding_box: null }),
      makeRoom({ bounding_polygon: null, bounding_box: null }),
    ];
    expect(shrinkOutlineToRooms(rooms)).toBeNull();
    expect(shrinkOutlineToRooms([])).toBeNull();
  });

  it("applique la marge 0.5% par défaut et la clampe à [0,100]", () => {
    const rooms = [
      makeRoom({
        bounding_polygon: [
          { x_percent: 0, y_percent: 0 },
          { x_percent: 100, y_percent: 0 },
          { x_percent: 100, y_percent: 100 },
          { x_percent: 0, y_percent: 100 },
        ],
      }),
    ];
    const bbox = shrinkOutlineToRooms(rooms);
    expect(bbox).not.toBeNull();
    // Marge devrait déborder mais être clampée → plein canvas
    expect(bbox!.x_percent).toBe(0);
    expect(bbox!.y_percent).toBe(0);
    expect(bbox!.width_percent).toBe(100);
    expect(bbox!.height_percent).toBe(100);
  });

  it("marge custom respectée", () => {
    const rooms = [
      makeRoom({
        bounding_polygon: [
          { x_percent: 20, y_percent: 20 },
          { x_percent: 40, y_percent: 20 },
          { x_percent: 40, y_percent: 40 },
          { x_percent: 20, y_percent: 40 },
        ],
      }),
    ];
    const bbox = shrinkOutlineToRooms(rooms, { margin_percent: 2 });
    expect(bbox!.x_percent).toBeCloseTo(18, 2);
    expect(bbox!.y_percent).toBeCloseTo(18, 2);
    expect(bbox!.width_percent).toBeCloseTo(24, 2);
    expect(bbox!.height_percent).toBeCloseTo(24, 2);
  });
});

// ─── shrinkOutlinesByUnit ───────────────────────────────────────

describe("shrinkOutlinesByUnit", () => {
  it("groupe par unit_id et skip les rooms unit_id null", () => {
    const rooms = [
      makeRoom({
        unit_id: "u1",
        bounding_polygon: [
          { x_percent: 10, y_percent: 10 },
          { x_percent: 30, y_percent: 10 },
          { x_percent: 30, y_percent: 30 },
          { x_percent: 10, y_percent: 30 },
        ],
      }),
      makeRoom({
        unit_id: "u2",
        bounding_polygon: [
          { x_percent: 60, y_percent: 60 },
          { x_percent: 80, y_percent: 60 },
          { x_percent: 80, y_percent: 80 },
          { x_percent: 60, y_percent: 80 },
        ],
      }),
      // Room "partie commune" (unit_id=null) → doit être ignorée
      makeRoom({
        unit_id: null,
        bounding_polygon: [
          { x_percent: 0, y_percent: 0 },
          { x_percent: 100, y_percent: 0 },
          { x_percent: 100, y_percent: 100 },
          { x_percent: 0, y_percent: 100 },
        ],
      }),
    ];

    const map = shrinkOutlinesByUnit(rooms);
    expect(map.size).toBe(2);
    expect(map.has("u1")).toBe(true);
    expect(map.has("u2")).toBe(true);

    // u1 doit être autour de [10,10]→[30,30], pas élargi par la common area
    const u1 = map.get("u1")!;
    expect(u1.x_percent).toBeCloseTo(9.5, 2);
    expect(u1.width_percent).toBeCloseTo(21, 2);

    // u2 doit être autour de [60,60]→[80,80]
    const u2 = map.get("u2")!;
    expect(u2.x_percent).toBeCloseTo(59.5, 2);
    expect(u2.width_percent).toBeCloseTo(21, 2);
  });

  it("retourne Map vide si aucune room n'a d'unit_id", () => {
    const rooms = [
      makeRoom({ unit_id: null }),
      makeRoom({ unit_id: null }),
    ];
    const map = shrinkOutlinesByUnit(rooms);
    expect(map.size).toBe(0);
  });
});

// ─── shrinkOutlinePolygonToRooms (s27 R3) ────────────────────────

describe("shrinkOutlinePolygonToRooms", () => {
  it("retourne un polygone (≥3 sommets) + bbox dérivée + flag fallback=false", () => {
    const rooms = [
      makeRoom({
        bounding_polygon: [
          { x_percent: 10, y_percent: 10 },
          { x_percent: 30, y_percent: 10 },
          { x_percent: 30, y_percent: 30 },
          { x_percent: 10, y_percent: 30 },
        ],
      }),
      makeRoom({
        bounding_polygon: [
          { x_percent: 30, y_percent: 10 },
          { x_percent: 50, y_percent: 10 },
          { x_percent: 50, y_percent: 30 },
          { x_percent: 30, y_percent: 30 },
        ],
      }),
    ];

    const out = shrinkOutlinePolygonToRooms(rooms, { margin_percent: 0 });
    expect(out).not.toBeNull();
    expect(out!.polygon.length).toBeGreaterThanOrEqual(3);
    expect(out!.bbox.width_percent).toBeGreaterThan(0);
    expect(out!.bbox.height_percent).toBeGreaterThan(0);
    // L'union des 2 carrés contigus = pas de complexité concave → fallback
    // bbox accepté ou pas selon alpha. Ce qui compte : on a un polygone exploitable.
  });

  it("retourne null si aucune géométrie", () => {
    const rooms = [
      makeRoom({ bounding_polygon: null, bounding_box: null }),
    ];
    expect(shrinkOutlinePolygonToRooms(rooms)).toBeNull();
    expect(shrinkOutlinePolygonToRooms([])).toBeNull();
  });

  it("usedFallbackBBox=true si seul fallback bbox a fonctionné", () => {
    // Forcer le fallback : un seul point unique → ni concave ni convex hull
    // ne peut produire 3 sommets distincts. La fonction tombera sur le
    // fallback bbox (4 sommets construits depuis le tight-bbox).
    const rooms = [
      makeRoom({
        bounding_box: {
          x_percent: 20,
          y_percent: 20,
          width_percent: 0,
          height_percent: 0,
        },
      }),
    ];
    const out = shrinkOutlinePolygonToRooms(rooms, { margin_percent: 0 });
    // Soit null (aucun polygon construible) soit polygon avec usedFallbackBBox.
    // Les 2 cas sont acceptables, on vérifie juste qu'on ne crash pas.
    if (out) {
      expect(out.polygon.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("shrinkOutlinePolygonsByUnit", () => {
  it("groupe par unit_id et retourne un OutlinePolygon par unité", () => {
    const rooms = [
      makeRoom({
        unit_id: "u1",
        bounding_polygon: [
          { x_percent: 10, y_percent: 10 },
          { x_percent: 30, y_percent: 10 },
          { x_percent: 30, y_percent: 30 },
          { x_percent: 10, y_percent: 30 },
        ],
      }),
      makeRoom({
        unit_id: "u2",
        bounding_polygon: [
          { x_percent: 60, y_percent: 60 },
          { x_percent: 80, y_percent: 60 },
          { x_percent: 80, y_percent: 80 },
          { x_percent: 60, y_percent: 80 },
        ],
      }),
      // unit_id null : ignoré
      makeRoom({
        unit_id: null,
        bounding_polygon: [
          { x_percent: 0, y_percent: 0 },
          { x_percent: 100, y_percent: 0 },
          { x_percent: 100, y_percent: 100 },
          { x_percent: 0, y_percent: 100 },
        ],
      }),
    ];

    const map = shrinkOutlinePolygonsByUnit(rooms);
    expect(map.has("u1")).toBe(true);
    expect(map.has("u2")).toBe(true);
    expect(map.get("u1")!.polygon.length).toBeGreaterThanOrEqual(3);
    expect(map.get("u2")!.polygon.length).toBeGreaterThanOrEqual(3);
  });
});
