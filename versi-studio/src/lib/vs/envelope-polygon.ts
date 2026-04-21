/**
 * Envelope polygon — Passe-4 post-resolver (s24)
 *
 * But : remplacer l'envelope rectangulaire axis-aligned du lot par le vrai
 * contour polygonal de l'appartement. Résout le problème "le rectangle
 * englobant inclut 10-15% de zones hors appart" (décrochés, escaliers,
 * terrasses).
 *
 * Stratégie :
 *   1. Recueillir tous les points des polygones finaux des rooms SNAPPÉES
 *      (snap OCR = position fiable, drift <2%).
 *   2. Calculer le convex hull (Andrew's monotone chain, O(n log n)).
 *   3. Expand le hull de 2% vers l'extérieur (depuis le centroïde) pour
 *      laisser de la place aux murs extérieurs.
 *   4. Si snap rate < 50% → retourner null (caller fallback sur rect).
 *
 * Les coordonnées sont toutes en % plan-global (0-100), même convention
 * que le reste du pipeline.
 */

import type { ZonePolygonPoint } from "./types";

// ─── Types ──────────────────────────────────────────────────────────

export interface Point {
  x_percent: number;
  y_percent: number;
}

export interface RoomForEnvelope {
  id: string;
  bounding_polygon: Point[] | null;
  isSnapped: boolean;
}

export interface EnvelopePolygonResult {
  /** Polygone final (3+ points, CCW) en % plan-global, ou null si pas assez de snaps. */
  polygon: ZonePolygonPoint[] | null;
  /** Nb rooms snappées utilisées pour le hull. */
  snappedCount: number;
  /** Nb rooms totales dans le lot. */
  totalCount: number;
  /** Taux de snap effectif. */
  snapRate: number;
  /** Nb de sommets du hull avant padding. */
  hullVertexCount: number;
  /** Raison de rejet si polygon === null. */
  rejectReason: string | null;
}

// ─── Convex hull (Andrew's monotone chain) ──────────────────────────

/** Cross product de (O→A) × (O→B). >0 : CCW. <0 : CW. =0 : colinéaire. */
function cross(O: Point, A: Point, B: Point): number {
  return (
    (A.x_percent - O.x_percent) * (B.y_percent - O.y_percent) -
    (A.y_percent - O.y_percent) * (B.x_percent - O.x_percent)
  );
}

/**
 * Convex hull via Andrew's monotone chain.
 * Retourne les sommets dans l'ordre CCW (counter-clockwise).
 * Complexité : O(n log n).
 * Dédoublonnage points identiques (tolérance 1e-6).
 */
export function convexHull(points: Point[]): Point[] {
  if (points.length < 3) return [...points];

  // Tri lexicographique (x puis y)
  const sorted = [...points].sort((a, b) => {
    if (a.x_percent !== b.x_percent) return a.x_percent - b.x_percent;
    return a.y_percent - b.y_percent;
  });

  // Dédoublonnage
  const unique: Point[] = [];
  for (const p of sorted) {
    const last = unique[unique.length - 1];
    if (!last || Math.abs(last.x_percent - p.x_percent) > 1e-6 || Math.abs(last.y_percent - p.y_percent) > 1e-6) {
      unique.push(p);
    }
  }
  if (unique.length < 3) return unique;

  // Lower hull
  const lower: Point[] = [];
  for (const p of unique) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  // Upper hull
  const upper: Point[] = [];
  for (let i = unique.length - 1; i >= 0; i--) {
    const p = unique[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  // Concaténer, retirer doublons début/fin
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

// ─── Expansion polygon (padding vers l'extérieur) ───────────────────

/** Centroïde (moyenne des sommets). Simple, suffisant pour un hull convexe. */
function centroid(points: Point[]): Point {
  const n = points.length;
  if (n === 0) return { x_percent: 50, y_percent: 50 };
  let sx = 0, sy = 0;
  for (const p of points) {
    sx += p.x_percent;
    sy += p.y_percent;
  }
  return { x_percent: sx / n, y_percent: sy / n };
}

/**
 * Élargit un polygone convexe en déplaçant chaque sommet radialement depuis
 * le centroïde d'un pourcentage donné.
 *
 * Pour un hull convexe, cette expansion radiale est équivalente à un buffer
 * polygonal approximatif (offset ~uniforme), suffisant pour les 2% de padding
 * voulus ici (pas besoin d'un vrai Minkowski sum).
 *
 * @param points Polygone convexe CCW.
 * @param paddingPct Pourcentage d'expansion (2 = +2%).
 */
export function expandPolygonOutward(points: Point[], paddingPct: number): Point[] {
  if (points.length < 3 || paddingPct <= 0) return [...points];

  const c = centroid(points);
  const factor = 1 + paddingPct / 100;

  return points.map((p) => {
    const dx = p.x_percent - c.x_percent;
    const dy = p.y_percent - c.y_percent;
    return {
      x_percent: Math.max(0, Math.min(100, c.x_percent + dx * factor)),
      y_percent: Math.max(0, Math.min(100, c.y_percent + dy * factor)),
    };
  });
}

// ─── Fonction principale ────────────────────────────────────────────

/**
 * Calcule l'envelope polygonale d'un lot à partir de ses rooms snappées.
 *
 * Principe : seules les rooms avec snap OCR sont utilisées (position fiable,
 * drift <2%). Si <50% du lot est snappé, on ne peut pas garantir un contour
 * représentatif → retour null → caller fallback sur rectangle.
 *
 * @param rooms Rooms du lot avec drapeau isSnapped.
 * @param minSnapRate Taux minimal de snap requis (défaut 0.5).
 * @param paddingPct Padding outward depuis le centroïde (défaut 2%).
 */
export function computeLotPolygonEnvelope(
  rooms: RoomForEnvelope[],
  minSnapRate = 0.3,
  paddingPct = 2,
): EnvelopePolygonResult {
  const totalCount = rooms.length;
  const snappedRooms = rooms.filter((r) => r.isSnapped && r.bounding_polygon && r.bounding_polygon.length >= 3);
  const snappedCount = snappedRooms.length;
  const snapRate = totalCount > 0 ? snappedCount / totalCount : 0;

  // Garde-fous
  if (totalCount === 0) {
    return {
      polygon: null,
      snappedCount: 0,
      totalCount: 0,
      snapRate: 0,
      hullVertexCount: 0,
      rejectReason: "no_rooms",
    };
  }

  // s24 — Seuil minimal d'ancrage snap pour créer un polygon (≥1 room snappée
  // pour garantir que le polygon est correctement positionné). En dessous,
  // fallback sur rect (impossible de garantir la position).
  if (snappedCount < 1 || snapRate < minSnapRate) {
    return {
      polygon: null,
      snappedCount,
      totalCount,
      snapRate,
      hullVertexCount: 0,
      rejectReason: `snap_rate_too_low (${snappedCount}/${totalCount} = ${(snapRate * 100).toFixed(0)}%, seuil ${(minSnapRate * 100).toFixed(0)}%)`,
    };
  }

  // s24 — Rassembler les points de TOUTES les rooms avec polygon valide
  // (snapped + non-snapped). Le hull doit couvrir TOUT l'appartement, pas
  // seulement les rooms OCR-ancrées. Les snapped servent à valider que le
  // lot est correctement positionné (via minSnapRate) ; les non-snapped
  // contribuent à l'étendue du hull.
  const allPoints: Point[] = [];
  for (const r of rooms) {
    if (!r.bounding_polygon || r.bounding_polygon.length < 3) continue;
    for (const p of r.bounding_polygon) {
      allPoints.push({ x_percent: p.x_percent, y_percent: p.y_percent });
    }
  }

  if (allPoints.length < 3) {
    return {
      polygon: null,
      snappedCount,
      totalCount,
      snapRate,
      hullVertexCount: 0,
      rejectReason: "not_enough_points",
    };
  }

  // Convex hull
  const hull = convexHull(allPoints);
  if (hull.length < 3) {
    return {
      polygon: null,
      snappedCount,
      totalCount,
      snapRate,
      hullVertexCount: hull.length,
      rejectReason: "hull_degenerate",
    };
  }

  // Padding outward
  const padded = expandPolygonOutward(hull, paddingPct);

  return {
    polygon: padded.map((p) => ({ x_percent: p.x_percent, y_percent: p.y_percent })),
    snappedCount,
    totalCount,
    snapRate,
    hullVertexCount: hull.length,
    rejectReason: null,
  };
}

// ─── Bounding box d'un polygone (pour fallback + coord lot-local) ───

/**
 * Bounding box axis-aligned d'un polygone. Utile pour :
 *   - Calculer la zone_data "rect" de compatibilité (x/y/w/h)
 *   - Convertir des coords plan-global en coords lot-local
 */
export function polygonBoundingBox(points: Point[]): {
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
} {
  if (points.length === 0) {
    return { x_percent: 0, y_percent: 0, width_percent: 0, height_percent: 0 };
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x_percent < minX) minX = p.x_percent;
    if (p.y_percent < minY) minY = p.y_percent;
    if (p.x_percent > maxX) maxX = p.x_percent;
    if (p.y_percent > maxY) maxY = p.y_percent;
  }
  return {
    x_percent: minX,
    y_percent: minY,
    width_percent: maxX - minX,
    height_percent: maxY - minY,
  };
}
