/**
 * Tests unitaires — Clamp drag dans polygone lot (s23 fix régression)
 *
 * Contexte : le fix drag s23 ignorait silencieusement les mouvements hors
 * polygone → effet "mur invisible" côté Thomas, "impossible de placer à gauche".
 *
 * Le nouveau comportement PROJETTE le centroïde sur le polygone (projection
 * perpendiculaire sur le segment le plus proche) au lieu d'IGNORER. Effet :
 * le drag reste fluide, la pièce "glisse" le long du mur au lieu de bloquer.
 */

import { describe, it, expect } from "vitest";
import { pointInPolygon, type ZonePolygonPoint } from "../../src/lib/vs/types";

// Helper miroir de RoomCanvas.clampPositionInLot (projection sur segment le plus proche)
function clampPositionInLot(
  pos: { x_percent: number; y_percent: number; width_percent: number; height_percent: number },
  lotZone: { x_percent: number; y_percent: number; width_percent: number; height_percent: number },
  lotPolygon: ZonePolygonPoint[] | null
) {
  if (!lotPolygon || lotPolygon.length < 3) return pos;
  const cxLot = pos.x_percent + pos.width_percent / 2;
  const cyLot = pos.y_percent + pos.height_percent / 2;
  const cxGlobal = lotZone.x_percent + (cxLot / 100) * lotZone.width_percent;
  const cyGlobal = lotZone.y_percent + (cyLot / 100) * lotZone.height_percent;
  if (pointInPolygon(cxGlobal, cyGlobal, lotPolygon)) {
    return pos;
  }
  let bestDistSq = Infinity;
  let bestPx = cxGlobal;
  let bestPy = cyGlobal;
  let bestSegDx = 0;
  let bestSegDy = 0;
  for (let i = 0; i < lotPolygon.length; i++) {
    const a = lotPolygon[i];
    const b = lotPolygon[(i + 1) % lotPolygon.length];
    const dx = b.x_percent - a.x_percent;
    const dy = b.y_percent - a.y_percent;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 0) {
      t = ((cxGlobal - a.x_percent) * dx + (cyGlobal - a.y_percent) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }
    const px = a.x_percent + t * dx;
    const py = a.y_percent + t * dy;
    const ddx = cxGlobal - px;
    const ddy = cyGlobal - py;
    const distSq = ddx * ddx + ddy * ddy;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestPx = px;
      bestPy = py;
      bestSegDx = dx;
      bestSegDy = dy;
    }
  }
  const polyCx = lotPolygon.reduce((s, p) => s + p.x_percent, 0) / lotPolygon.length;
  const polyCy = lotPolygon.reduce((s, p) => s + p.y_percent, 0) / lotPolygon.length;
  const segLen = Math.sqrt(bestSegDx * bestSegDx + bestSegDy * bestSegDy);
  let nx = 0;
  let ny = 0;
  if (segLen > 0) {
    const n1x = -bestSegDy / segLen;
    const n1y = bestSegDx / segLen;
    const toCenterX = polyCx - bestPx;
    const toCenterY = polyCy - bestPy;
    const dot = n1x * toCenterX + n1y * toCenterY;
    if (dot >= 0) {
      nx = n1x;
      ny = n1y;
    } else {
      nx = -n1x;
      ny = -n1y;
    }
  } else {
    const dx0 = polyCx - bestPx;
    const dy0 = polyCy - bestPy;
    const dLen = Math.sqrt(dx0 * dx0 + dy0 * dy0);
    if (dLen > 0) {
      nx = dx0 / dLen;
      ny = dy0 / dLen;
    }
  }
  const EPS = 0.5;
  const clampedCxGlobal = bestPx + nx * EPS;
  const clampedCyGlobal = bestPy + ny * EPS;
  const clampedCxLot =
    lotZone.width_percent > 0
      ? ((clampedCxGlobal - lotZone.x_percent) / lotZone.width_percent) * 100
      : cxLot;
  const clampedCyLot =
    lotZone.height_percent > 0
      ? ((clampedCyGlobal - lotZone.y_percent) / lotZone.height_percent) * 100
      : cyLot;
  return {
    x_percent: Math.max(0, Math.min(100 - pos.width_percent, clampedCxLot - pos.width_percent / 2)),
    y_percent: Math.max(0, Math.min(100 - pos.height_percent, clampedCyLot - pos.height_percent / 2)),
    width_percent: pos.width_percent,
    height_percent: pos.height_percent,
  };
}

// Lot en L
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

describe("clampPositionInLot — fix régression s23 (projection sur polygone)", () => {
  it("lot rect (polygon null) : retourne la position telle quelle", () => {
    const pos = { x_percent: 10, y_percent: 10, width_percent: 20, height_percent: 20 };
    const result = clampPositionInLot(pos, L_LOT_BBOX, null);
    expect(result).toEqual(pos);
  });

  it("centroïde dans le polygone : retourne la position telle quelle", () => {
    // Pièce dans la branche gauche du L (centroïde lot ~= 15, 30 → global 22, 34 — dans la branche verticale)
    const pos = { x_percent: 5, y_percent: 25, width_percent: 20, height_percent: 10 };
    const result = clampPositionInLot(pos, L_LOT_BBOX, L_LOT_POLYGON);
    expect(result).toEqual(pos);
  });

  it("centroïde dans zone morte (haut-droit du L) : position projetée, PAS ignorée", () => {
    // Centroïde lot-local : 70, 15 → global 66, 22 (hors polygone — zone morte)
    const pos = { x_percent: 60, y_percent: 10, width_percent: 20, height_percent: 10 };
    const result = clampPositionInLot(pos, L_LOT_BBOX, L_LOT_POLYGON);
    // Le clamp doit projeter sur le segment le plus proche (le mur interne à y=40
    // ou le mur à x=50). Position différente de l'entrée.
    expect(result).not.toEqual(pos);
    expect(Number.isFinite(result.x_percent)).toBe(true);
    expect(Number.isFinite(result.y_percent)).toBe(true);
    expect(result.width_percent).toBe(20);
    expect(result.height_percent).toBe(10);
    // Vérifier que la projection ramène bien dans le polygone (test clé)
    const cxLot = result.x_percent + result.width_percent / 2;
    const cyLot = result.y_percent + result.height_percent / 2;
    const cxGlobal = L_LOT_BBOX.x_percent + (cxLot / 100) * L_LOT_BBOX.width_percent;
    const cyGlobal = L_LOT_BBOX.y_percent + (cyLot / 100) * L_LOT_BBOX.height_percent;
    expect(pointInPolygon(cxGlobal, cyGlobal, L_LOT_POLYGON)).toBe(true);
  });

  it("drag 'tout à gauche' dans branche basse : la pièce se déplace (pas de blocage)", () => {
    // Centroïde lot-local : 10, 60 → global 18, 58 (DANS le polygone — branche basse)
    const pos = { x_percent: 0, y_percent: 55, width_percent: 20, height_percent: 10 };
    const result = clampPositionInLot(pos, L_LOT_BBOX, L_LOT_POLYGON);
    // Pas de clamp car centroïde dans polygone
    expect(result.x_percent).toBe(0);
  });

  it("drag hors bbox globale : projection ramène dans le polygone", () => {
    // Position négative : centroïde lot-local -40, -40 → global -22, -22 (hors polygone)
    const pos = { x_percent: -50, y_percent: -50, width_percent: 20, height_percent: 20 };
    const result = clampPositionInLot(pos, L_LOT_BBOX, L_LOT_POLYGON);
    expect(result.x_percent).toBeGreaterThanOrEqual(0);
    expect(result.y_percent).toBeGreaterThanOrEqual(0);
    // Le centroïde final doit être dans le polygone
    const cxLot = result.x_percent + result.width_percent / 2;
    const cyLot = result.y_percent + result.height_percent / 2;
    const cxGlobal = L_LOT_BBOX.x_percent + (cxLot / 100) * L_LOT_BBOX.width_percent;
    const cyGlobal = L_LOT_BBOX.y_percent + (cyLot / 100) * L_LOT_BBOX.height_percent;
    expect(pointInPolygon(cxGlobal, cyGlobal, L_LOT_POLYGON)).toBe(true);
  });
});
