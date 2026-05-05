/**
 * Helpers UI — placement photos sur canvas plan (Étape 4 v2 / s30 Vague 3a)
 *
 * Conversions coordonnées :
 *  - canvas (px à l'écran) <-> normalisées (0-1, persistées en DB position_x/y)
 *  - normalisées <-> point-in-polygon (polygones pièces en x_percent/y_percent 0-100)
 *
 * Source de vérité unique (P1 sync s23) : la coordonnée normalisée 0-1 est la
 * référence persistée. La représentation pixel à l'écran est toujours dérivée.
 *
 * s32 fix BUG 1 — polygones débordant du cadre plan :
 *  - Les polygones des pièces sont en LOT-LOCAL % (0-100 dans le repère du lot).
 *  - L'image plan affiche le PLAN ENTIER avec letterbox (préservation ratio).
 *  - On introduit `lotZone` pour convertir lot-local → plan-global.
 *  - Le `screenToPlanLocal` compose letterbox + lot-zone pour les hit-tests.
 */

import {
  pointInPolygon,
  polygonCentroid,
  type ZonePolygonPoint,
  type VsRoom,
  type ZoneRect,
} from "../types";

// ─── Coordonnées normalisées (0-1) ────────────────────────────────

export interface NormalizedPoint {
  x: number; // 0.0 - 1.0
  y: number; // 0.0 - 1.0
}

export interface CanvasViewport {
  width: number; // pixels affichage
  height: number; // pixels affichage
  /** Décalage du plan dans le viewport canvas (pan). */
  offsetX: number;
  offsetY: number;
  /** Facteur de zoom (1.0 = vue normale, > 1 = zoom in). */
  scale: number;
}

/** Convertit un point écran (clientX/Y relatif au canvas) en coords normalisées. */
export function screenToNormalized(
  clientX: number,
  clientY: number,
  viewport: CanvasViewport
): NormalizedPoint {
  const x = (clientX - viewport.offsetX) / (viewport.width * viewport.scale);
  const y = (clientY - viewport.offsetY) / (viewport.height * viewport.scale);
  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
  };
}

/** Convertit des coords normalisées (0-1) en pixels canvas pour rendu. */
export function normalizedToScreen(
  point: NormalizedPoint,
  viewport: CanvasViewport
): { x: number; y: number } {
  return {
    x: point.x * viewport.width * viewport.scale + viewport.offsetX,
    y: point.y * viewport.height * viewport.scale + viewport.offsetY,
  };
}

// ─── Conversions lot-local <-> plan-global ────────────────────────

/**
 * Convertit un % lot-local en % plan-global (le plan entier est la référence visuelle).
 * Le lot occupe une zone {x,y,w,h} en % du plan.
 */
export function lotLocalToPlanGlobalPercent(
  lotPct: number,
  lotStart: number,
  lotSize: number
): number {
  return lotStart + (lotPct / 100) * lotSize;
}

/** Inverse : plan-global % → lot-local %. */
export function planGlobalToLotLocalPercent(
  globalPct: number,
  lotStart: number,
  lotSize: number
): number {
  if (lotSize === 0) return 0;
  return ((globalPct - lotStart) / lotSize) * 100;
}

// ─── Détection polygone pièce ─────────────────────────────────────

/**
 * Trouve la pièce dont le polygone contient le point.
 *
 * Les polygones VsRoom sont en LOT-LOCAL % (0-100). Le `point` est en lot-local
 * normalisé (0-1) — l'appelant doit avoir converti via `screenToLotLocal`.
 *
 * Retourne la pièce dont le centroïde est le PLUS PROCHE du point si plusieurs
 * polygones contiennent le point (cas frontière — résolution silencieuse EC-1).
 */
export function findRoomAtPoint(
  point: NormalizedPoint,
  rooms: VsRoom[]
): VsRoom | null {
  const px100 = point.x * 100;
  const py100 = point.y * 100;

  const candidates: VsRoom[] = [];
  for (const room of rooms) {
    if (!room.polygon || room.polygon.length < 3) continue;
    if (pointInPolygon(px100, py100, room.polygon)) {
      candidates.push(room);
    }
  }

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Tie-break : centroïde le plus proche (EC-1)
  let best = candidates[0];
  let bestDist = Infinity;
  for (const room of candidates) {
    if (!room.polygon) continue;
    const c = polygonCentroid(room.polygon);
    const dx = c.x_percent - px100;
    const dy = c.y_percent - py100;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      best = room;
    }
  }
  return best;
}

// ─── Letterbox / pillarbox (préserve ratio image plan) ────────────

export interface RenderLayout {
  /** Dimensions de rendu de l'image plan (lettrée dans le canvas). */
  renderW: number;
  renderH: number;
  /** Décalage du plan dans le canvas (centrage). */
  offsetX: number;
  offsetY: number;
}

/**
 * Calcule la zone de rendu effective de l'image plan en mode letterbox/pillarbox.
 * Garantit que le plan est ENTIÈREMENT visible et centré (préserve le ratio).
 *
 * Aligné sur RoomCanvas.renderLayout (pattern étape 3 — qui marche).
 */
export function computeRenderLayout(
  containerW: number,
  containerH: number,
  imageW: number,
  imageH: number
): RenderLayout {
  if (containerW <= 0 || containerH <= 0 || imageW <= 0 || imageH <= 0) {
    return { renderW: containerW, renderH: containerH, offsetX: 0, offsetY: 0 };
  }
  const srcRatio = imageW / imageH;
  const dstRatio = containerW / containerH;
  if (srcRatio > dstRatio) {
    const renderW = containerW;
    const renderH = containerW / srcRatio;
    return { renderW, renderH, offsetX: 0, offsetY: (containerH - renderH) / 2 };
  }
  const renderH = containerH;
  const renderW = containerH * srcRatio;
  return { renderW, renderH, offsetX: (containerW - renderW) / 2, offsetY: 0 };
}

// ─── Coords écran ↔ lot-local (utilisé pour hit-test polygones) ───

/**
 * Convertit un point écran (px relatif au canvas) en coords LOT-LOCAL normalisées
 * (0-1 dans le repère du lot). C'est dans ce repère que les polygones pièces
 * sont définis et que le hit-test (`findRoomAtPoint`) opère.
 *
 * Étapes :
 *  1. Pixel canvas → pixel image plan (soustraction offset letterbox + viewport).
 *  2. Pixel plan → plan-global % (rapporté à renderW/renderH).
 *  3. Plan-global % → lot-local % via lotZone.
 *  4. % → 0-1.
 */
export function screenToLotLocal(
  clientX: number,
  clientY: number,
  layout: RenderLayout,
  viewport: { offsetX: number; offsetY: number; scale: number },
  lotZone: ZoneRect
): NormalizedPoint {
  // Pixel canvas → pixel logique (avant transform viewport)
  const logicalX = (clientX - viewport.offsetX) / viewport.scale;
  const logicalY = (clientY - viewport.offsetY) / viewport.scale;
  // Pixel logique → plan-global %
  const planGlobalXPct =
    layout.renderW > 0 ? ((logicalX - layout.offsetX) / layout.renderW) * 100 : 0;
  const planGlobalYPct =
    layout.renderH > 0 ? ((logicalY - layout.offsetY) / layout.renderH) * 100 : 0;
  // Plan-global % → lot-local %
  const lotLocalXPct = planGlobalToLotLocalPercent(
    planGlobalXPct,
    lotZone.x_percent,
    lotZone.width_percent
  );
  const lotLocalYPct = planGlobalToLotLocalPercent(
    planGlobalYPct,
    lotZone.y_percent,
    lotZone.height_percent
  );
  // % → 0-1, clamp
  return {
    x: Math.max(0, Math.min(1, lotLocalXPct / 100)),
    y: Math.max(0, Math.min(1, lotLocalYPct / 100)),
  };
}

/** Inverse : lot-local 0-1 → pixels canvas (pour rendu pastilles photos). */
export function lotLocalToScreen(
  point: NormalizedPoint,
  layout: RenderLayout,
  viewport: { offsetX: number; offsetY: number; scale: number },
  lotZone: ZoneRect
): { x: number; y: number } {
  const planGlobalXPct = lotLocalToPlanGlobalPercent(
    point.x * 100,
    lotZone.x_percent,
    lotZone.width_percent
  );
  const planGlobalYPct = lotLocalToPlanGlobalPercent(
    point.y * 100,
    lotZone.y_percent,
    lotZone.height_percent
  );
  const logicalX = (planGlobalXPct / 100) * layout.renderW + layout.offsetX;
  const logicalY = (planGlobalYPct / 100) * layout.renderH + layout.offsetY;
  return {
    x: logicalX * viewport.scale + viewport.offsetX,
    y: logicalY * viewport.scale + viewport.offsetY,
  };
}

// ─── Bounding box polygone (pour zoom auto P0 GP5) ────────────────

export interface PolygonBounds {
  minX: number; // %
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function getPolygonBounds(points: ZonePolygonPoint[]): PolygonBounds {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x_percent < minX) minX = p.x_percent;
    if (p.y_percent < minY) minY = p.y_percent;
    if (p.x_percent > maxX) maxX = p.x_percent;
    if (p.y_percent > maxY) maxY = p.y_percent;
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calcule scale + offset pour zoomer sur une pièce et l'occuper à `targetFill`
 * du viewport (P0 fix GP5 — par défaut 80% pour respecter spec persona Friction 1).
 *
 * `room.polygon` est en LOT-LOCAL %. Le `layout` + `lotZone` permettent de
 * convertir en pixels plan-global pour le centrage.
 *
 * Retour : viewport ajusté (scale + offset) à appliquer en transition 300ms.
 */
export function computeRoomZoom(
  room: VsRoom,
  container: { width: number; height: number },
  layout: RenderLayout,
  lotZone: ZoneRect,
  targetFillRatio = 0.8
): { scale: number; offsetX: number; offsetY: number } | null {
  if (!room.polygon || room.polygon.length < 3) return null;
  if (layout.renderW <= 0 || layout.renderH <= 0) return null;
  const bounds = getPolygonBounds(room.polygon);

  // Bounds (lot-local %) → pixels plan-global (logique, pré-viewport)
  const minXGlobalPct = lotLocalToPlanGlobalPercent(
    bounds.minX,
    lotZone.x_percent,
    lotZone.width_percent
  );
  const minYGlobalPct = lotLocalToPlanGlobalPercent(
    bounds.minY,
    lotZone.y_percent,
    lotZone.height_percent
  );
  const maxXGlobalPct = lotLocalToPlanGlobalPercent(
    bounds.maxX,
    lotZone.x_percent,
    lotZone.width_percent
  );
  const maxYGlobalPct = lotLocalToPlanGlobalPercent(
    bounds.maxY,
    lotZone.y_percent,
    lotZone.height_percent
  );

  const minXPx = (minXGlobalPct / 100) * layout.renderW + layout.offsetX;
  const minYPx = (minYGlobalPct / 100) * layout.renderH + layout.offsetY;
  const maxXPx = (maxXGlobalPct / 100) * layout.renderW + layout.offsetX;
  const maxYPx = (maxYGlobalPct / 100) * layout.renderH + layout.offsetY;

  const widthPx = Math.max(1, maxXPx - minXPx);
  const heightPx = Math.max(1, maxYPx - minYPx);

  const scaleX = (container.width * targetFillRatio) / widthPx;
  const scaleY = (container.height * targetFillRatio) / heightPx;
  const scale = Math.max(0.5, Math.min(4, Math.min(scaleX, scaleY)));

  // Centre du polygone (pixels logique) → on positionne au centre du container
  const centerXPx = (minXPx + maxXPx) / 2;
  const centerYPx = (minYPx + maxYPx) / 2;
  const offsetX = container.width / 2 - centerXPx * scale;
  const offsetY = container.height / 2 - centerYPx * scale;

  return { scale, offsetX, offsetY };
}
