/**
 * Versi Studio — Outline Shrinker (s25 P0, fix s27 R3)
 *
 * Post-process déterministe qui recalcule le `building_outline` du lot à partir
 * de l'union polygonale des rooms du même `unit_id`, au lieu de faire confiance
 * à l'outline émis par l'IA.
 *
 * Résout le bug P0 Muguets : gpt-4.1 emit un outline 47m² qui inclut
 * escalier colimaçon + terrasse, alors que les rooms sommées = 44m². Les
 * rooms sont correctes, seul l'outline déborde. Plutôt que durcir le prompt
 * (plafond 6.8/10 constaté audit s25), on IGNORE l'outline IA et on le
 * RECALCULE depuis les rooms. 0 appel IA, déterministe.
 *
 * Pattern : calcul sur données RAFFINÉES (rooms finales post-tiling /
 * resolver / snap-to-label), pas sur les bbox IA brutes. Voir learning s23.
 *
 * --- s27 R3 — abandon bbox axis-aligned ---
 * Le tight-bbox transforme tout T/L/U en RECTANGLE = perd la forme réelle
 * (audit s27 5.2/10, root cause "forme qui n'a rien à voir"). Désormais :
 *   - shrinkOutlinePolygonToRooms() = nouvelle API, retourne le POLYGONE
 *     concave (alpha-shape) de l'union des rooms. À privilégier.
 *   - shrinkOutlineToRooms() = conservée pour rétro-compat, mais documentée
 *     comme FALLBACK uniquement (bbox dégrade la forme).
 */

import type { ExtractedRoom } from "./schemas";
import { concaveHull, convexHull, type Point as HullPoint } from "./envelope-polygon";

export interface BBox {
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
}

interface Point {
  x_percent: number;
  y_percent: number;
}

/**
 * Recalcule un outline (axis-aligned bbox) en prenant le tight-bbox de l'union
 * des polygones (ou bboxes en fallback) des rooms passées.
 *
 * @param rooms Pièces du lot (déjà filtrées par unit_id en amont)
 * @param opts.margin_percent Marge ajoutée de chaque côté (clampée 0-100).
 *                            Défaut : 0.5 pour tolérer les imprécisions de
 *                            vectorisation sans réintroduire escaliers/terrasses.
 * @returns BBox ou null si aucune pièce n'a de géométrie exploitable.
 */
export function shrinkOutlineToRooms(
  rooms: ExtractedRoom[],
  opts: { margin_percent?: number } = {}
): BBox | null {
  const marginPct = opts.margin_percent ?? 0.5;
  const points: Point[] = [];

  for (const r of rooms) {
    if (r.bounding_polygon && r.bounding_polygon.length >= 3) {
      for (const p of r.bounding_polygon) {
        points.push({ x_percent: p.x_percent, y_percent: p.y_percent });
      }
      continue;
    }
    if (r.bounding_box) {
      const b = r.bounding_box;
      points.push(
        { x_percent: b.x_percent, y_percent: b.y_percent },
        { x_percent: b.x_percent + b.width_percent, y_percent: b.y_percent },
        {
          x_percent: b.x_percent + b.width_percent,
          y_percent: b.y_percent + b.height_percent,
        },
        { x_percent: b.x_percent, y_percent: b.y_percent + b.height_percent }
      );
    }
  }

  if (points.length === 0) return null;

  let minX = 100;
  let minY = 100;
  let maxX = 0;
  let maxY = 0;
  for (const p of points) {
    if (p.x_percent < minX) minX = p.x_percent;
    if (p.y_percent < minY) minY = p.y_percent;
    if (p.x_percent > maxX) maxX = p.x_percent;
    if (p.y_percent > maxY) maxY = p.y_percent;
  }

  const x = Math.max(0, minX - marginPct);
  const y = Math.max(0, minY - marginPct);
  const right = Math.min(100, maxX + marginPct);
  const bottom = Math.min(100, maxY + marginPct);

  return {
    x_percent: x,
    y_percent: y,
    width_percent: Math.max(0, right - x),
    height_percent: Math.max(0, bottom - y),
  };
}

/**
 * Groupe les rooms par `unit_id` (null ignoré — parties communes) et calcule
 * un outline shrunk par unité. Utilisé en amont de l'insertion des lots pour
 * override le `zone_data` IA par un rect déterministe.
 *
 * @deprecated s27 R3 — préférer `shrinkOutlinePolygonsByUnit` qui préserve la
 *   forme réelle. Bbox = FALLBACK uniquement (T/L/U → rectangle = perte info).
 */
export function shrinkOutlinesByUnit(
  rooms: ExtractedRoom[],
  opts: { margin_percent?: number } = {}
): Map<string, BBox> {
  const byUnit = new Map<string, ExtractedRoom[]>();
  for (const r of rooms) {
    if (!r.unit_id) continue;
    const arr = byUnit.get(r.unit_id);
    if (arr) arr.push(r);
    else byUnit.set(r.unit_id, [r]);
  }

  const outlines = new Map<string, BBox>();
  for (const [unitId, group] of byUnit) {
    const bbox = shrinkOutlineToRooms(group, opts);
    if (bbox) outlines.set(unitId, bbox);
  }
  return outlines;
}

// ─── s27 R3 — Polygone concave (forme réelle, pas bbox) ────────────

/**
 * Sortie polygonale d'un outline shrunk : polygone réel + bbox en complément.
 *
 * - `polygon` : contour CCW (concave hull / alpha-shape), préserve les formes
 *   non-convexes (L/U/T/décrochés). C'est la VRAIE forme du lot.
 * - `bbox` : tight-bbox du polygone, conservée pour compatibilité (zone_data
 *   x/y/w/h des consommateurs aval qui n'auraient pas migré).
 * - `usedFallbackBBox` : true si l'alpha-shape a échoué et qu'on a dû
 *   construire un polygone-rectangle depuis la bbox (signal pour observabilité).
 */
export interface OutlinePolygon {
  polygon: Point[];
  bbox: BBox;
  usedFallbackBBox: boolean;
}

/**
 * Récupère les points utilisables d'une room (polygon prioritaire, bbox sinon).
 */
function pointsFromRoom(r: ExtractedRoom): Point[] {
  if (r.bounding_polygon && r.bounding_polygon.length >= 3) {
    return r.bounding_polygon.map((p) => ({ x_percent: p.x_percent, y_percent: p.y_percent }));
  }
  if (r.bounding_box) {
    const b = r.bounding_box;
    return [
      { x_percent: b.x_percent, y_percent: b.y_percent },
      { x_percent: b.x_percent + b.width_percent, y_percent: b.y_percent },
      { x_percent: b.x_percent + b.width_percent, y_percent: b.y_percent + b.height_percent },
      { x_percent: b.x_percent, y_percent: b.y_percent + b.height_percent },
    ];
  }
  return [];
}

/**
 * Calcule le polygone concave (alpha-shape) de l'union des rooms d'un lot.
 *
 * Stratégie (s27 R3) :
 *   1. Collecter les sommets des `bounding_polygon` (ou bbox en fallback) des rooms.
 *   2. Calculer le concave hull (alpha = 0.5).
 *   3. Si l'alpha-shape échoue → fallback convex hull.
 *   4. Si convex échoue aussi → fallback bbox transformée en polygone-rectangle
 *      (4 sommets), `usedFallbackBBox=true` pour signal observabilité.
 *   5. Appliquer la marge en expandant légèrement chaque sommet depuis le centroïde.
 *
 * @param rooms Pièces du lot (déjà filtrées par unit_id).
 * @param opts.margin_percent Marge ajoutée (défaut 0.5).
 * @param opts.alpha Paramètre alpha-shape (défaut 0.3 — s28 P0 fix débord
 *   polygone Étape 2). Plus petit = plus concave.
 * @returns OutlinePolygon ou null si aucune géométrie exploitable.
 */
export function shrinkOutlinePolygonToRooms(
  rooms: ExtractedRoom[],
  opts: { margin_percent?: number; alpha?: number } = {}
): OutlinePolygon | null {
  const marginPct = opts.margin_percent ?? 0.5;
  const alpha = opts.alpha ?? 0.3;

  const allPoints: HullPoint[] = [];
  for (const r of rooms) {
    for (const p of pointsFromRoom(r)) {
      allPoints.push({ x_percent: p.x_percent, y_percent: p.y_percent });
    }
  }
  if (allPoints.length === 0) return null;

  // Concave hull prioritaire
  let hull = concaveHull(allPoints, alpha);
  let usedFallbackBBox = false;

  if (!hull || hull.length < 3) {
    // Fallback 1 : convex hull
    const convex = convexHull(allPoints);
    if (convex.length >= 3) {
      hull = convex;
    } else {
      // Fallback 2 (dernière chance) : bbox transformée en polygone-rectangle
      const bbox = shrinkOutlineToRooms(rooms, { margin_percent: 0 });
      if (!bbox) return null;
      hull = [
        { x_percent: bbox.x_percent, y_percent: bbox.y_percent },
        { x_percent: bbox.x_percent + bbox.width_percent, y_percent: bbox.y_percent },
        { x_percent: bbox.x_percent + bbox.width_percent, y_percent: bbox.y_percent + bbox.height_percent },
        { x_percent: bbox.x_percent, y_percent: bbox.y_percent + bbox.height_percent },
      ];
      usedFallbackBBox = true;
    }
  }

  // Marge : expansion radiale depuis le centroïde, équivalente à un buffer
  // approximatif (suffisant pour les ~0.5% de marge par défaut).
  const cx = hull.reduce((s, p) => s + p.x_percent, 0) / hull.length;
  const cy = hull.reduce((s, p) => s + p.y_percent, 0) / hull.length;
  const expanded: Point[] = hull.map((p) => {
    const dx = p.x_percent - cx;
    const dy = p.y_percent - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1e-9) return { x_percent: p.x_percent, y_percent: p.y_percent };
    const factor = (dist + marginPct) / dist;
    const nx = Math.max(0, Math.min(100, cx + dx * factor));
    const ny = Math.max(0, Math.min(100, cy + dy * factor));
    return { x_percent: nx, y_percent: ny };
  });

  // Tight-bbox du polygone final pour compat zone_data
  let minX = 100, minY = 100, maxX = 0, maxY = 0;
  for (const p of expanded) {
    if (p.x_percent < minX) minX = p.x_percent;
    if (p.y_percent < minY) minY = p.y_percent;
    if (p.x_percent > maxX) maxX = p.x_percent;
    if (p.y_percent > maxY) maxY = p.y_percent;
  }
  const bbox: BBox = {
    x_percent: minX,
    y_percent: minY,
    width_percent: Math.max(0, maxX - minX),
    height_percent: Math.max(0, maxY - minY),
  };

  return { polygon: expanded, bbox, usedFallbackBBox };
}

/**
 * Groupe les rooms par `unit_id` (null ignoré) et calcule un OutlinePolygon
 * (concave hull) par unité. À utiliser en remplacement de `shrinkOutlinesByUnit`
 * pour préserver la forme réelle du lot.
 */
export function shrinkOutlinePolygonsByUnit(
  rooms: ExtractedRoom[],
  opts: { margin_percent?: number; alpha?: number } = {}
): Map<string, OutlinePolygon> {
  const byUnit = new Map<string, ExtractedRoom[]>();
  for (const r of rooms) {
    if (!r.unit_id) continue;
    const arr = byUnit.get(r.unit_id);
    if (arr) arr.push(r);
    else byUnit.set(r.unit_id, [r]);
  }

  const outlines = new Map<string, OutlinePolygon>();
  for (const [unitId, group] of byUnit) {
    const out = shrinkOutlinePolygonToRooms(group, opts);
    if (out) outlines.set(unitId, out);
  }
  return outlines;
}
