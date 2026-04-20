/**
 * Tests unitaires — Validation drag dans le polygone réel du lot (s23 Bug 2)
 *
 * Contexte : quand un lot est un polygone en L (ou concave), la bbox du lot
 * contient des zones "mortes" hors du polygone. Le drag doit être bloqué
 * par les murs réels du polygone, pas uniquement par la bbox.
 *
 * Ces tests valident la logique pure `pointInPolygon` appliquée à la
 * position d'une pièce (centroïde) dans un lot polygonal.
 */

import { describe, it, expect } from "vitest";
import { pointInPolygon, type ZonePolygonPoint } from "../../src/lib/vs/types";

// Helper local (miroir de RoomCanvas.isPositionValidInLot) :
// convertit le centroïde de la pièce (lot-local %) en coords globales plan,
// puis teste pointInPolygon contre le polygone du lot.
function isPositionInLotPolygon(
  pos: { x_percent: number; y_percent: number; width_percent: number; height_percent: number },
  lotZone: { x_percent: number; y_percent: number; width_percent: number; height_percent: number },
  lotPolygon: ZonePolygonPoint[] | null
): boolean {
  if (!lotPolygon || lotPolygon.length < 3) return true;
  const cxLot = pos.x_percent + pos.width_percent / 2;
  const cyLot = pos.y_percent + pos.height_percent / 2;
  const cxGlobal = lotZone.x_percent + (cxLot / 100) * lotZone.width_percent;
  const cyGlobal = lotZone.y_percent + (cyLot / 100) * lotZone.height_percent;
  return pointInPolygon(cxGlobal, cyGlobal, lotPolygon);
}

// ─── Setup : lot en L (forme concave classique) ──────────────────
//
// Coords globales plan (% plan) :
//
//   (10,10) ───── (50,10)
//     │            │
//     │   L-shape  │
//     │            │
//     │    (50,40) ───── (90,40)
//     │                   │
//     │                   │
//   (10,90) ─────────── (90,90)
//
// Bbox = [10..90, 10..90]. Le quadrant haut-droit (50..90, 10..40) est
// HORS du polygone — zone morte.

const L_LOT_POLYGON: ZonePolygonPoint[] = [
  { x_percent: 10, y_percent: 10 },
  { x_percent: 50, y_percent: 10 },
  { x_percent: 50, y_percent: 40 },
  { x_percent: 90, y_percent: 40 },
  { x_percent: 90, y_percent: 90 },
  { x_percent: 10, y_percent: 90 },
];

const L_LOT_BBOX = {
  x_percent: 10,
  y_percent: 10,
  width_percent: 80,
  height_percent: 80,
};

describe("Drag validation — lot en L polygonal (s23 Bug 2)", () => {
  it("accepte une pièce dont le centroïde est dans la jambe verticale gauche", () => {
    // Pièce positionnée à (lot-local 10%, 20%) avec taille 20%x20%
    // Centroïde lot-local : (20%, 30%) → global : (10 + 0.2*80, 10 + 0.3*80) = (26, 34)
    // Point (26, 34) est dans le L (jambe gauche). ✓
    const pos = { x_percent: 10, y_percent: 20, width_percent: 20, height_percent: 20 };
    expect(isPositionInLotPolygon(pos, L_LOT_BBOX, L_LOT_POLYGON)).toBe(true);
  });

  it("refuse une pièce dont le centroïde est dans la zone morte haut-droite", () => {
    // Pièce à (lot-local 60%, 5%) taille 20%x20%
    // Centroïde lot-local : (70%, 15%) → global : (10 + 0.7*80, 10 + 0.15*80) = (66, 22)
    // Point (66, 22) est HORS du L (zone morte haut-droite). ✗
    const pos = { x_percent: 60, y_percent: 5, width_percent: 20, height_percent: 20 };
    expect(isPositionInLotPolygon(pos, L_LOT_BBOX, L_LOT_POLYGON)).toBe(false);
  });

  it("accepte une pièce dont le centroïde est dans la base horizontale du L", () => {
    // Centroïde lot-local : (60%, 80%) → global : (58, 74) → dans le L (base). ✓
    const pos = { x_percent: 50, y_percent: 70, width_percent: 20, height_percent: 20 };
    expect(isPositionInLotPolygon(pos, L_LOT_BBOX, L_LOT_POLYGON)).toBe(true);
  });

  it("refuse une pièce dont le centroïde sort juste hors du coin concave", () => {
    // Centroïde global (55, 35) — zone morte juste au-dessus du coin concave (50,40)
    // Coin (55, 35) : x > 50 et y < 40 → HORS. ✗
    const cxGlobal = 55;
    const cyGlobal = 35;
    const width = 10, height = 10;
    const cxLot = ((cxGlobal - L_LOT_BBOX.x_percent) / L_LOT_BBOX.width_percent) * 100;
    const cyLot = ((cyGlobal - L_LOT_BBOX.y_percent) / L_LOT_BBOX.height_percent) * 100;
    const pos = {
      x_percent: cxLot - width / 2,
      y_percent: cyLot - height / 2,
      width_percent: width,
      height_percent: height,
    };
    expect(isPositionInLotPolygon(pos, L_LOT_BBOX, L_LOT_POLYGON)).toBe(false);
  });

  it("retourne toujours true si lotPolygon est null (lot rectangulaire)", () => {
    // Sans polygone, la validation délègue au clamp bbox déjà en place.
    const pos = { x_percent: 200, y_percent: 200, width_percent: 10, height_percent: 10 };
    expect(isPositionInLotPolygon(pos, L_LOT_BBOX, null)).toBe(true);
  });

  it("retourne toujours true si lotPolygon a moins de 3 points (dégénéré)", () => {
    const degenerate: ZonePolygonPoint[] = [
      { x_percent: 0, y_percent: 0 },
      { x_percent: 10, y_percent: 10 },
    ];
    const pos = { x_percent: 50, y_percent: 50, width_percent: 10, height_percent: 10 };
    expect(isPositionInLotPolygon(pos, L_LOT_BBOX, degenerate)).toBe(true);
  });
});

describe("Drag validation — lot rectangulaire (baseline non-régression)", () => {
  // Lot rectangle simple : équivalent du polygon à 4 coins = bbox.
  const RECT_POLYGON: ZonePolygonPoint[] = [
    { x_percent: 10, y_percent: 10 },
    { x_percent: 90, y_percent: 10 },
    { x_percent: 90, y_percent: 90 },
    { x_percent: 10, y_percent: 90 },
  ];
  const RECT_BBOX = { x_percent: 10, y_percent: 10, width_percent: 80, height_percent: 80 };

  it("accepte toute pièce dans le rectangle", () => {
    const pos = { x_percent: 40, y_percent: 40, width_percent: 20, height_percent: 20 };
    expect(isPositionInLotPolygon(pos, RECT_BBOX, RECT_POLYGON)).toBe(true);
  });
});
