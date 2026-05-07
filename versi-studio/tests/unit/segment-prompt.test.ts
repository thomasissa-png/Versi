/**
 * Tests unitaires — segment-prompt (s32 autopilot Feature B).
 *
 * Couvre :
 *  - describeSegments : calcul des positions relatives (haut/bas/gauche/droite)
 *  - buildSegmentDescription / buildSegmentDescriptionEn : format texte injecté
 *  - cas dégradés : polygone null, segments vides, tous walls (= no inject)
 */

import { describe, it, expect } from "vitest";
import {
  describeSegments,
  buildSegmentDescription,
  buildSegmentDescriptionEn,
} from "@/lib/vs/ui/segment-prompt";
import type { ZonePolygonPoint, VsRoomSegment } from "@/lib/vs/types";

// Carré 100x100 (centroïde 50,50)
const square: ZonePolygonPoint[] = [
  { x_percent: 0, y_percent: 0 }, // sommet 0 (TL)
  { x_percent: 100, y_percent: 0 }, // sommet 1 (TR)
  { x_percent: 100, y_percent: 100 }, // sommet 2 (BR)
  { x_percent: 0, y_percent: 100 }, // sommet 3 (BL)
];

function seg(idx: number, type: VsRoomSegment["type"], notes: string | null = null): VsRoomSegment {
  return {
    id: `seg-${idx}`,
    room_id: "room-1",
    segment_index: idx,
    type,
    notes,
    updated_at: new Date().toISOString(),
  };
}

describe("describeSegments", () => {
  it("retourne tableau vide si polygone null", () => {
    expect(describeSegments(null, [seg(0, "door")])).toEqual([]);
  });

  it("retourne tableau vide si polygone < 3 sommets", () => {
    expect(
      describeSegments([{ x_percent: 0, y_percent: 0 }, { x_percent: 1, y_percent: 1 }], [seg(0, "door")])
    ).toEqual([]);
  });

  it("retourne tableau vide si segments vides", () => {
    expect(describeSegments(square, [])).toEqual([]);
  });

  it("ignore les segments avec index >= polygone.length", () => {
    const r = describeSegments(square, [seg(0, "door"), seg(99, "window")]);
    expect(r).toHaveLength(1);
    expect(r[0].segmentIndex).toBe(0);
  });

  it("calcule la position relative haut pour le segment 0 du carré (TL→TR)", () => {
    // Segment 0 : milieu (50, 0), centroïde (50, 50). Milieu au-dessus du
    // centroïde → side = 'haut'
    const r = describeSegments(square, [seg(0, "door")]);
    expect(r[0].side).toBe("haut");
  });

  it("calcule la position relative droit pour le segment 1 (TR→BR)", () => {
    const r = describeSegments(square, [seg(1, "window")]);
    expect(r[0].side).toBe("droit");
  });

  it("calcule la position relative bas pour le segment 2 (BR→BL)", () => {
    const r = describeSegments(square, [seg(2, "window")]);
    expect(r[0].side).toBe("bas");
  });

  it("calcule la position relative gauche pour le segment 3 (BL→TL)", () => {
    const r = describeSegments(square, [seg(3, "wall")]);
    expect(r[0].side).toBe("gauche");
  });
});

describe("buildSegmentDescription (FR)", () => {
  it("retourne string vide si segments vides", () => {
    expect(buildSegmentDescription(square, [])).toBe("");
  });

  it("retourne string vide si TOUS les segments sont 'wall' (no-pollution)", () => {
    const all = [
      seg(0, "wall"),
      seg(1, "wall"),
      seg(2, "wall"),
      seg(3, "wall"),
    ];
    expect(buildSegmentDescription(square, all)).toBe("");
  });

  it("inclut une ligne porte avec position relative", () => {
    const out = buildSegmentDescription(square, [seg(0, "door")]);
    expect(out).toContain("Caractéristiques de la pièce");
    expect(out).toContain("porte");
    expect(out).toContain("haut"); // segment 0 = haut
  });

  it("groupe deux portes au même côté", () => {
    // 2 portes au côté haut (segments 0 et 0 — on simule avec 2 segments différents
    // dont les milieux sont au-dessus du centroïde)
    const out = buildSegmentDescription(square, [seg(0, "door"), seg(0, "door")]);
    expect(out).toContain("portes"); // pluriel
  });

  it("place les murs en dernier", () => {
    const out = buildSegmentDescription(square, [
      seg(0, "wall"),
      seg(1, "door"),
      seg(2, "wall"),
    ]);
    const idxDoor = out.indexOf("porte");
    const idxWall = out.indexOf("Mur(s) plein(s)");
    expect(idxDoor).toBeGreaterThanOrEqual(0);
    expect(idxWall).toBeGreaterThan(idxDoor);
  });

  it("traite bay_window comme transformation à ajouter", () => {
    const out = buildSegmentDescription(square, [seg(0, "bay_window")]);
    expect(out).toContain("À ajouter dans le rendu");
    expect(out).toContain("baie");
  });

  it("inclut les notes utilisateur si présentes", () => {
    const out = buildSegmentDescription(square, [
      seg(0, "door", "entrée principale donnant sur le couloir"),
    ]);
    expect(out).toContain("entrée principale donnant sur le couloir");
  });
});

describe("buildSegmentDescriptionEn (EN)", () => {
  it("retourne string vide si tous walls", () => {
    expect(
      buildSegmentDescriptionEn(square, [
        seg(0, "wall"),
        seg(1, "wall"),
        seg(2, "wall"),
        seg(3, "wall"),
      ])
    ).toBe("");
  });

  it("inclut le bloc ROOM OPENINGS AUTHORITATIVE quand annotation utilisateur (s33)", () => {
    const out = buildSegmentDescriptionEn(square, [seg(0, "door")]);
    expect(out).toContain("ROOM OPENINGS");
    expect(out).toContain("dealer-confirmed");
    expect(out).toContain("AUTHORITATIVE");
    expect(out).toContain("override anything inferred from the source photo");
    expect(out).toContain("door");
    expect(out).toContain("top side");
  });

  it("flag bay_window comme structurel", () => {
    const out = buildSegmentDescriptionEn(square, [seg(0, "bay_window")]);
    expect(out).toContain("TO BE ADDED in the render");
    expect(out).toContain("bay window");
  });

  it("flag flexible comme réinterprétable", () => {
    const out = buildSegmentDescriptionEn(square, [seg(0, "flexible")]);
    expect(out).toContain("Flexible segment");
    expect(out).toContain("reinterpret");
  });
});
