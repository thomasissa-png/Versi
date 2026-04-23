/**
 * Versi Studio — Outline Shrinker (s25 P0, pattern s23 technique adjacente)
 *
 * Post-process déterministe qui recalcule le `building_outline` du lot à partir
 * du tight-bbox des rooms du même `unit_id`, au lieu de faire confiance à
 * l'outline émis par l'IA.
 *
 * Résout le bug P0 Muguets : gpt-4.1 emit un outline 47m² qui inclut
 * escalier colimaçon + terrasse, alors que les rooms sommées = 44m². Les
 * rooms sont correctes, seul l'outline déborde. Plutôt que durcir le prompt
 * (plafond 6.8/10 constaté audit s25), on IGNORE l'outline IA et on le
 * RECALCULE depuis les rooms. 0 appel IA, déterministe.
 *
 * Pattern : calcul sur données RAFFINÉES (rooms finales post-tiling /
 * resolver / snap-to-label), pas sur les bbox IA brutes. Voir learning s23.
 */

import type { ExtractedRoom } from "./schemas";

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
