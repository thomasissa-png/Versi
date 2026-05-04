/**
 * Helpers UI — placement photos sur canvas plan (Étape 4 v2 / s30 Vague 3a)
 *
 * Conversions coordonnées :
 *  - canvas (px à l'écran) <-> normalisées (0-1, persistées en DB position_x/y)
 *  - normalisées <-> point-in-polygon (polygones pièces en x_percent/y_percent 0-100)
 *
 * Source de vérité unique (P1 sync s23) : la coordonnée normalisée 0-1 est la
 * référence persistée. La représentation pixel à l'écran est toujours dérivée.
 */

import {
  pointInPolygon,
  polygonCentroid,
  type ZonePolygonPoint,
  type VsRoom,
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

// ─── Détection polygone pièce ─────────────────────────────────────

/**
 * Trouve la pièce dont le polygone contient le point normalisé donné.
 * Les polygones VsRoom sont en x_percent/y_percent (0-100).
 *
 * Retourne la pièce dont le centroïde est le PLUS PROCHE du point si plusieurs
 * polygones contiennent le point (cas frontière — résolution silencieuse EC-1).
 */
export function findRoomAtPoint(
  point: NormalizedPoint,
  rooms: VsRoom[]
): VsRoom | null {
  // Le polygone VsRoom est en lot-local % (0-100). Le point est normalisé sur le PLAN
  // entier — pour Vague 3a on assume rooms positionnées en plan-relatif. Conversion :
  // px100 = point.x * 100 ; py100 = point.y * 100
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
 * Retour : viewport ajusté (scale + offset) à appliquer en transition 300ms.
 */
export function computeRoomZoom(
  room: VsRoom,
  viewport: { width: number; height: number },
  targetFillRatio = 0.8
): { scale: number; offsetX: number; offsetY: number } | null {
  if (!room.polygon || room.polygon.length < 3) return null;
  const bounds = getPolygonBounds(room.polygon);

  // bounds en %, viewport en px. On veut : bounds occupent targetFillRatio du viewport.
  const scaleX = (viewport.width * targetFillRatio) / ((bounds.width / 100) * viewport.width);
  const scaleY = (viewport.height * targetFillRatio) / ((bounds.height / 100) * viewport.height);
  const scale = Math.max(0.5, Math.min(4, Math.min(scaleX, scaleY)));

  // Centre la pièce dans le viewport
  const centerX = ((bounds.minX + bounds.maxX) / 2) / 100; // 0-1
  const centerY = ((bounds.minY + bounds.maxY) / 2) / 100;
  const offsetX = viewport.width / 2 - centerX * viewport.width * scale;
  const offsetY = viewport.height / 2 - centerY * viewport.height * scale;

  return { scale, offsetX, offsetY };
}
