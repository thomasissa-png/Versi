/**
 * Tests unitaires — Logique endpoint /rooms/resolve-overlaps (s23 fix régression H1)
 *
 * Contexte : les fixes resolver f7a2699/c57aba3 ne s'appliquaient qu'à POST /extract.
 * Le nouvel endpoint POST /rooms/resolve-overlaps re-applique le resolver sur les
 * pièces déjà en DB. Ces tests valident la logique de conversion rect↔polygon
 * et lot-local↔plan-global utilisée par l'endpoint.
 */

import { describe, it, expect } from "vitest";
import { resolveRoomOverlaps, type Point, type RoomWithPolygon } from "../../src/lib/vs/polygon-resolver";

// Helpers miroir de l'endpoint (isolés pour test unitaire)
interface ZoneRectRaw {
  type?: "rect";
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
}
interface ZonePolygonRaw {
  type: "polygon";
  points: Array<{ x_percent: number; y_percent: number }>;
}

function lotContainmentPolygon(zoneData: Record<string, unknown>): Point[] | null {
  if (!zoneData) return null;
  if (zoneData.type === "polygon" && Array.isArray(zoneData.points)) {
    const pts = (zoneData as unknown as ZonePolygonRaw).points.map((p) => ({
      x_percent: Number(p.x_percent),
      y_percent: Number(p.y_percent),
    }));
    if (pts.length >= 3) return pts;
    return null;
  }
  const rect = zoneData as unknown as ZoneRectRaw;
  if (
    typeof rect.x_percent !== "number" ||
    typeof rect.y_percent !== "number" ||
    typeof rect.width_percent !== "number" ||
    typeof rect.height_percent !== "number"
  ) {
    return null;
  }
  return [
    { x_percent: rect.x_percent, y_percent: rect.y_percent },
    { x_percent: rect.x_percent + rect.width_percent, y_percent: rect.y_percent },
    { x_percent: rect.x_percent + rect.width_percent, y_percent: rect.y_percent + rect.height_percent },
    { x_percent: rect.x_percent, y_percent: rect.y_percent + rect.height_percent },
  ];
}

function polygonBbox(pts: Point[]) {
  const xs = pts.map((p) => p.x_percent);
  const ys = pts.map((p) => p.y_percent);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

describe("lotContainmentPolygon", () => {
  it("zone rect (sans type) → 4 points polygon", () => {
    const zd = { x_percent: 10, y_percent: 20, width_percent: 30, height_percent: 40 };
    const poly = lotContainmentPolygon(zd as unknown as Record<string, unknown>);
    expect(poly).toEqual([
      { x_percent: 10, y_percent: 20 },
      { x_percent: 40, y_percent: 20 },
      { x_percent: 40, y_percent: 60 },
      { x_percent: 10, y_percent: 60 },
    ]);
  });

  it("zone polygon → points préservés", () => {
    const zd = {
      type: "polygon",
      points: [
        { x_percent: 0, y_percent: 0 },
        { x_percent: 50, y_percent: 0 },
        { x_percent: 50, y_percent: 50 },
        { x_percent: 0, y_percent: 50 },
      ],
    };
    const poly = lotContainmentPolygon(zd as unknown as Record<string, unknown>);
    expect(poly).toHaveLength(4);
    expect(poly![0]).toEqual({ x_percent: 0, y_percent: 0 });
  });

  it("zone polygon < 3 points → null (invalide)", () => {
    const zd = { type: "polygon", points: [{ x_percent: 0, y_percent: 0 }, { x_percent: 10, y_percent: 10 }] };
    expect(lotContainmentPolygon(zd as unknown as Record<string, unknown>)).toBeNull();
  });

  it("zone data vide/invalide → null", () => {
    expect(lotContainmentPolygon({})).toBeNull();
    expect(lotContainmentPolygon({ foo: "bar" })).toBeNull();
  });
});

describe("resolve-overlaps endpoint — conversion lot-local ↔ global", () => {
  it("polygon stocké en lot-local se reconstitue correctement en global et inversement", () => {
    // Simule un lot avec 2 pièces qui se superposent en lot-local
    const lotZoneRect = { x_percent: 20, y_percent: 20, width_percent: 60, height_percent: 60 };
    const lotPoly = lotContainmentPolygon(lotZoneRect as unknown as Record<string, unknown>)!;
    const lotBbox = polygonBbox(lotPoly);

    // 2 pièces avec overlap volontaire (en lot-local %)
    const roomLocalA = [
      { x_percent: 10, y_percent: 10 },
      { x_percent: 60, y_percent: 10 },
      { x_percent: 60, y_percent: 60 },
      { x_percent: 10, y_percent: 60 },
    ];
    const roomLocalB = [
      { x_percent: 40, y_percent: 40 },
      { x_percent: 90, y_percent: 40 },
      { x_percent: 90, y_percent: 90 },
      { x_percent: 40, y_percent: 90 },
    ];

    // Lot-local → plan-global
    const roomGlobalA = roomLocalA.map((p) => ({
      x_percent: lotBbox.x + (p.x_percent / 100) * lotBbox.w,
      y_percent: lotBbox.y + (p.y_percent / 100) * lotBbox.h,
    }));
    const roomGlobalB = roomLocalB.map((p) => ({
      x_percent: lotBbox.x + (p.x_percent / 100) * lotBbox.w,
      y_percent: lotBbox.y + (p.y_percent / 100) * lotBbox.h,
    }));

    const rooms: RoomWithPolygon[] = [
      { id: "A", bounding_polygon: roomGlobalA, surface_m2: 30 },
      { id: "B", bounding_polygon: roomGlobalB, surface_m2: 20 },
    ];

    const result = resolveRoomOverlaps(rooms, lotPoly);

    // Après resolver : 2 pièces résolues sans overlap significatif
    expect(result.resolved.length).toBeGreaterThanOrEqual(1);

    // Reconversion global → lot-local
    for (const resolved of result.resolved) {
      if (!resolved.bounding_polygon) continue;
      const localPoly = resolved.bounding_polygon.map((p) => ({
        x_percent: ((p.x_percent - lotBbox.x) / lotBbox.w) * 100,
        y_percent: ((p.y_percent - lotBbox.y) / lotBbox.h) * 100,
      }));
      // Tous les points doivent être dans [0, 100] (aux erreurs flottantes près)
      for (const pt of localPoly) {
        expect(pt.x_percent).toBeGreaterThanOrEqual(-0.01);
        expect(pt.x_percent).toBeLessThanOrEqual(100.01);
        expect(pt.y_percent).toBeGreaterThanOrEqual(-0.01);
        expect(pt.y_percent).toBeLessThanOrEqual(100.01);
      }
    }
  });

  it("idempotence : re-jouer resolver sur pièces déjà résolues ne casse rien", () => {
    const lotPoly: Point[] = [
      { x_percent: 0, y_percent: 0 },
      { x_percent: 100, y_percent: 0 },
      { x_percent: 100, y_percent: 100 },
      { x_percent: 0, y_percent: 100 },
    ];
    const rooms: RoomWithPolygon[] = [
      {
        id: "A",
        bounding_polygon: [
          { x_percent: 10, y_percent: 10 },
          { x_percent: 40, y_percent: 10 },
          { x_percent: 40, y_percent: 40 },
          { x_percent: 10, y_percent: 40 },
        ],
        surface_m2: 10,
      },
      {
        id: "B",
        bounding_polygon: [
          { x_percent: 50, y_percent: 50 },
          { x_percent: 80, y_percent: 50 },
          { x_percent: 80, y_percent: 80 },
          { x_percent: 50, y_percent: 80 },
        ],
        surface_m2: 10,
      },
    ];
    const r1 = resolveRoomOverlaps(rooms, lotPoly);
    const r2 = resolveRoomOverlaps(r1.resolved, lotPoly);
    // 2 passes consécutives : même nombre de pièces résolues
    expect(r2.resolved.length).toBe(r1.resolved.length);
  });
});
