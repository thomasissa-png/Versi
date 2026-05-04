/**
 * Tests unitaires — room-mini-preview helpers (s30 Round 2 Friction P2)
 *
 * Couvre :
 *  - polygonToSvgPath : format M x y L x y L x y Z
 *  - buildRoomMiniPreviewData : target + others, fallback null si invalides
 *  - Robustesse : roomId valide, polygone manquant, polygones voisins corrompus
 */

import { describe, it, expect } from "vitest";
import {
  buildRoomMiniPreviewData,
  polygonToSvgPath,
} from "@/lib/vs/ui/room-mini-preview";
import type { VsRoom } from "@/lib/vs/types";

function makeRoom(
  id: string,
  polygon: Array<{ x_percent: number; y_percent: number }> | null,
  surface = 12,
): VsRoom {
  return {
    id,
    lot_id: "lot-1",
    plan_id: "plan-1",
    name: `room-${id}`,
    room_type: "salon",
    custom_label: null,
    surface_m2: surface,
    position: null,
    polygon,
    touched: false,
    status: "validated",
    source: "ai",
    created_at: new Date().toISOString(),
  };
}

describe("polygonToSvgPath", () => {
  it("formate un quad en path M/L/Z", () => {
    const p = polygonToSvgPath([
      { x_percent: 10, y_percent: 20 },
      { x_percent: 30, y_percent: 20 },
      { x_percent: 30, y_percent: 40 },
      { x_percent: 10, y_percent: 40 },
    ]);
    expect(p).toBe("M 10.00 20.00 L 30.00 20.00 L 30.00 40.00 L 10.00 40.00 Z");
  });

  it("retourne chaîne vide si < 3 points", () => {
    expect(polygonToSvgPath([])).toBe("");
    expect(polygonToSvgPath([{ x_percent: 0, y_percent: 0 }])).toBe("");
    expect(
      polygonToSvgPath([
        { x_percent: 0, y_percent: 0 },
        { x_percent: 10, y_percent: 0 },
      ]),
    ).toBe("");
  });
});

describe("buildRoomMiniPreviewData", () => {
  const validQuad = [
    { x_percent: 10, y_percent: 10 },
    { x_percent: 40, y_percent: 10 },
    { x_percent: 40, y_percent: 40 },
    { x_percent: 10, y_percent: 40 },
  ];

  it("retourne null si targetRoom est null", () => {
    expect(buildRoomMiniPreviewData(null, [])).toBeNull();
  });

  it("retourne null si polygone du target absent", () => {
    const target = makeRoom("a", null);
    expect(buildRoomMiniPreviewData(target, [])).toBeNull();
  });

  it("retourne null si polygone du target a < 3 points", () => {
    const target = makeRoom("a", [{ x_percent: 0, y_percent: 0 }]);
    expect(buildRoomMiniPreviewData(target, [])).toBeNull();
  });

  it("retourne target path + others vides si seul sur l'étage", () => {
    const target = makeRoom("a", validQuad);
    const r = buildRoomMiniPreviewData(target, [target]);
    expect(r).not.toBeNull();
    expect(r!.target).toContain("M 10.00 10.00");
    expect(r!.others).toHaveLength(0);
  });

  it("inclut les autres pièces de l'étage avec polygones valides", () => {
    const target = makeRoom("a", validQuad);
    const sibling = makeRoom("b", [
      { x_percent: 50, y_percent: 50 },
      { x_percent: 80, y_percent: 50 },
      { x_percent: 80, y_percent: 80 },
      { x_percent: 50, y_percent: 80 },
    ]);
    const r = buildRoomMiniPreviewData(target, [target, sibling]);
    expect(r).not.toBeNull();
    expect(r!.others).toHaveLength(1);
    expect(r!.others[0].id).toBe("b");
    expect(r!.others[0].d).toContain("M 50.00 50.00");
  });

  it("filtre silencieusement les voisins sans polygone valide", () => {
    const target = makeRoom("a", validQuad);
    const broken1 = makeRoom("b", null);
    const broken2 = makeRoom("c", [{ x_percent: 0, y_percent: 0 }]); // < 3 pts
    const ok = makeRoom("d", validQuad);
    const r = buildRoomMiniPreviewData(target, [target, broken1, broken2, ok]);
    expect(r).not.toBeNull();
    // Seul "d" passe le filtre — "b" et "c" ignorés sans crash.
    expect(r!.others.map((o) => o.id)).toEqual(["d"]);
  });

  it("ne s'inclut JAMAIS lui-même dans others (anti-doublon)", () => {
    const target = makeRoom("a", validQuad);
    const r = buildRoomMiniPreviewData(target, [target]);
    expect(r!.others.find((o) => o.id === "a")).toBeUndefined();
  });
});
