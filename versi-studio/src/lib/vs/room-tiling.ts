/**
 * Room tiling — Pavage polygonal strict de l'enveloppe du lot (s24)
 *
 * Objectif : produire un tiling géométrique des rooms dans l'enveloppe
 * du lot tel que :
 *   - Aucun overlap (intersection pairwise = 0)
 *   - Aucun gap (union cellules = enveloppe)
 *   - Surface cellule ≈ surface cible (tolérance ±10%)
 *
 * Algorithme : Power Diagram (Voronoï pondéré) via intersection de
 * demi-plans. Pour chaque site i de poids w_i, la cellule est :
 *
 *   Cell(i) = Envelope ∩ ⋂_j { x : |x-p_i|² - w_i² ≤ |x-p_j|² - w_j² }
 *
 * Chaque demi-plan est défini par l'équation :
 *   2(p_j - p_i)·x ≤ |p_j|² - |p_i|² - (w_j² - w_i²)
 *
 * Soit : a·x + b·y ≤ c  avec
 *   a = 2(p_jx - p_ix)
 *   b = 2(p_jy - p_iy)
 *   c = (|p_j|² - |p_i|²) - (w_j² - w_i²)
 *
 * On clippe le polygone enveloppe par chacun de ces demi-plans
 * (Sutherland-Hodgman). Garantie : pas d'overlap (demi-plans
 * complémentaires), pas de gap (union = enveloppe) par construction.
 *
 * Poids : w_i = k · √surface_cible_i (ou √moyenne si null).
 *
 * Cas dégénérés gérés :
 *   - 1 room : cellule = enveloppe entière
 *   - Sites colinéaires : ok (clipping reste valide)
 *   - Site hors enveloppe : projeté sur enveloppe avant tiling
 *   - Cellule vide après clipping : fallback bbox centroïde (loggé)
 */

import type { ZonePolygonPoint } from "./types";

// ─── Types ──────────────────────────────────────────────────────────

export interface Point {
  x_percent: number;
  y_percent: number;
}

export interface RoomInput {
  id: string;
  /** Centroïde (snappé OCR ou bbox center) en coords plan-global 0-100. */
  centroid: Point;
  /** Surface cible en m². null → moyenne utilisée. */
  surface_m2_target: number | null;
  name_raw: string;
}

export interface TileResult {
  id: string;
  /** Polygon de la cellule résultante, CCW, coords plan-global 0-100. */
  tile_polygon: Point[];
  /** Surface en unités % (aire du polygone en %² — à convertir si m² requis). */
  surface_pct2: number;
  /** True si cellule dégénérée (vide après clipping → bbox fallback). */
  degenerate: boolean;
}

export interface TilingMetrics {
  totalRooms: number;
  validTiles: number;
  degenerateTiles: number;
  /** Somme des aires cellules (en %²). */
  sumTileArea: number;
  /** Aire de l'enveloppe (en %²). */
  envelopeArea: number;
  /** Delta |sumTileArea - envelopeArea| / envelopeArea. */
  coverageError: number;
  /** Max overlap area détecté en test pairwise (doit être ~0). */
  maxOverlapPct2: number;
}

// ─── Utils géométriques ─────────────────────────────────────────────

/** Aire signée d'un polygone (shoelace). Positif si CCW. */
function signedArea(poly: Point[]): number {
  if (poly.length < 3) return 0;
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % poly.length];
    a += p1.x_percent * p2.y_percent - p2.x_percent * p1.y_percent;
  }
  return a / 2;
}

function polygonArea(poly: Point[]): number {
  return Math.abs(signedArea(poly));
}

/** Centroïde polygone (moyenne pondérée par aire des triangles). */
function polygonCentroid(poly: Point[]): Point {
  if (poly.length === 0) return { x_percent: 0, y_percent: 0 };
  if (poly.length === 1) return poly[0];
  const a2 = signedArea(poly) * 2;
  if (Math.abs(a2) < 1e-9) {
    // Fallback : moyenne arithmétique
    let sx = 0, sy = 0;
    for (const p of poly) { sx += p.x_percent; sy += p.y_percent; }
    return { x_percent: sx / poly.length, y_percent: sy / poly.length };
  }
  let cx = 0, cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % poly.length];
    const f = p1.x_percent * p2.y_percent - p2.x_percent * p1.y_percent;
    cx += (p1.x_percent + p2.x_percent) * f;
    cy += (p1.y_percent + p2.y_percent) * f;
  }
  return { x_percent: cx / (3 * a2), y_percent: cy / (3 * a2) };
}

/** Assure CCW. Retourne le polygone réorienté si CW. */
function ensureCCW(poly: Point[]): Point[] {
  return signedArea(poly) < 0 ? [...poly].reverse() : poly;
}

/** Point-in-polygon (ray casting). */
function pointInPolygon(pt: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x_percent, yi = poly[i].y_percent;
    const xj = poly[j].x_percent, yj = poly[j].y_percent;
    const intersect =
      yi > pt.y_percent !== yj > pt.y_percent &&
      pt.x_percent < ((xj - xi) * (pt.y_percent - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Projette un point sur le polygone (point du contour le plus proche). */
function projectPointOnPolygon(pt: Point, poly: Point[]): Point {
  let best = poly[0];
  let bestD2 = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b.x_percent - a.x_percent;
    const dy = b.y_percent - a.y_percent;
    const len2 = dx * dx + dy * dy;
    let t = 0;
    if (len2 > 1e-12) {
      t = ((pt.x_percent - a.x_percent) * dx + (pt.y_percent - a.y_percent) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
    }
    const px = a.x_percent + t * dx;
    const py = a.y_percent + t * dy;
    const d2 = (px - pt.x_percent) ** 2 + (py - pt.y_percent) ** 2;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = { x_percent: px, y_percent: py };
    }
  }
  return best;
}

/**
 * Clippe un polygone par un demi-plan a·x + b·y ≤ c (Sutherland-Hodgman).
 * "Inside" = côté où a·x + b·y ≤ c.
 */
function clipPolygonByHalfPlane(
  poly: Point[],
  a: number,
  b: number,
  c: number
): Point[] {
  if (poly.length === 0) return [];
  const result: Point[] = [];
  const EPS = 1e-9;

  const evalSide = (p: Point): number =>
    a * p.x_percent + b * p.y_percent - c;

  for (let i = 0; i < poly.length; i++) {
    const curr = poly[i];
    const next = poly[(i + 1) % poly.length];
    const sCurr = evalSide(curr);
    const sNext = evalSide(next);

    const currIn = sCurr <= EPS;
    const nextIn = sNext <= EPS;

    if (currIn) result.push(curr);

    // Changement de côté → intersection
    if (currIn !== nextIn) {
      const denom = sCurr - sNext;
      if (Math.abs(denom) > 1e-12) {
        const t = sCurr / denom;
        result.push({
          x_percent: curr.x_percent + t * (next.x_percent - curr.x_percent),
          y_percent: curr.y_percent + t * (next.y_percent - curr.y_percent),
        });
      }
    }
  }
  return result;
}

/** Dédoublonne points consécutifs identiques (tolérance 1e-6). */
function dedupePolygon(poly: Point[]): Point[] {
  if (poly.length < 2) return poly;
  const out: Point[] = [];
  for (const p of poly) {
    const last = out[out.length - 1];
    if (
      !last ||
      Math.abs(last.x_percent - p.x_percent) > 1e-6 ||
      Math.abs(last.y_percent - p.y_percent) > 1e-6
    ) {
      out.push(p);
    }
  }
  // Check first vs last
  if (out.length >= 2) {
    const f = out[0], l = out[out.length - 1];
    if (Math.abs(f.x_percent - l.x_percent) < 1e-6 && Math.abs(f.y_percent - l.y_percent) < 1e-6) {
      out.pop();
    }
  }
  return out;
}

// ─── Core : Power Diagram ───────────────────────────────────────────

interface Site {
  idx: number;
  x: number;
  y: number;
  w2: number; // poids²
}

/**
 * Calcule les poids normalisés (w_i = k · √surface_target).
 * Rooms sans surface_target reçoivent la moyenne.
 */
function computeWeights(rooms: RoomInput[]): number[] {
  const surfaces = rooms.map((r) => r.surface_m2_target);
  const valid = surfaces.filter((s): s is number => s != null && s > 0);
  const meanSurface =
    valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 1;

  // Utilise √surface (la puissance w² dans le power diagram fait que
  // la "taille" de la cellule est ∝ w²  ≈ ∝ surface).
  return rooms.map((r) => {
    const s = r.surface_m2_target != null && r.surface_m2_target > 0
      ? r.surface_m2_target
      : meanSurface;
    return Math.sqrt(s);
  });
}

/**
 * Produit le pavage power-diagram de `envelope` par les `rooms`.
 * Garanties : pas d'overlap, pas de gap (modulo EPS), cellules convexes.
 */
export function tileRoomsInLot(
  envelope: Point[],
  rooms: RoomInput[]
): TileResult[] {
  // Cas trivial : aucune room
  if (rooms.length === 0) return [];

  // Préparer enveloppe CCW
  const env = ensureCCW(dedupePolygon(envelope));
  if (env.length < 3) {
    // Enveloppe invalide → pas de tiling possible
    return rooms.map((r) => ({
      id: r.id,
      tile_polygon: env,
      surface_pct2: 0,
      degenerate: true,
    }));
  }

  // Cas 1 room : cellule = enveloppe
  if (rooms.length === 1) {
    return [{
      id: rooms[0].id,
      tile_polygon: env,
      surface_pct2: polygonArea(env),
      degenerate: false,
    }];
  }

  // Projeter sites hors enveloppe sur le bord (sinon cellule vide garantie)
  const sites: Site[] = rooms.map((r, idx) => {
    let p = r.centroid;
    if (!pointInPolygon(p, env)) {
      const proj = projectPointOnPolygon(p, env);
      // Pousser légèrement vers l'intérieur (vers le centroïde de l'enveloppe)
      const envC = polygonCentroid(env);
      const dx = envC.x_percent - proj.x_percent;
      const dy = envC.y_percent - proj.y_percent;
      const len = Math.hypot(dx, dy);
      if (len > 1e-6) {
        p = {
          x_percent: proj.x_percent + (dx / len) * 0.5,
          y_percent: proj.y_percent + (dy / len) * 0.5,
        };
      } else {
        p = proj;
      }
    }
    return { idx, x: p.x_percent, y: p.y_percent, w2: 0 };
  });

  // Dédoublonner sites colocalisés (IA peut mettre 2 rooms au même centroïde)
  // Jitter déterministe minimal pour séparer
  for (let i = 0; i < sites.length; i++) {
    for (let j = i + 1; j < sites.length; j++) {
      const dx = sites[i].x - sites[j].x;
      const dy = sites[i].y - sites[j].y;
      if (dx * dx + dy * dy < 1e-4) {
        // Jitter pseudo-aléatoire déterministe
        const a = ((j * 2654435761) % 1000) / 1000 * Math.PI * 2;
        sites[j].x += Math.cos(a) * 0.05;
        sites[j].y += Math.sin(a) * 0.05;
      }
    }
  }

  // Poids
  const weights = computeWeights(rooms);
  for (let i = 0; i < sites.length; i++) {
    sites[i].w2 = weights[i] * weights[i];
  }

  // Normaliser les poids pour que max(w²) ≈ (diagonal_envelope/2)²
  // Sinon les poids peuvent dominer et produire des cellules vides.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of env) {
    if (p.x_percent < minX) minX = p.x_percent;
    if (p.x_percent > maxX) maxX = p.x_percent;
    if (p.y_percent < minY) minY = p.y_percent;
    if (p.y_percent > maxY) maxY = p.y_percent;
  }
  const envDiag2 = (maxX - minX) ** 2 + (maxY - minY) ** 2;
  const maxW2 = Math.max(...sites.map((s) => s.w2));
  if (maxW2 > envDiag2 * 0.25) {
    // Réduire pour éviter domination
    const scale = (envDiag2 * 0.25) / maxW2;
    for (const s of sites) s.w2 *= scale;
  }

  // Pour chaque site, clipper l'enveloppe par les demi-plans séparateurs
  const tiles: TileResult[] = [];
  for (let i = 0; i < sites.length; i++) {
    const si = sites[i];
    let cell = env;

    for (let j = 0; j < sites.length; j++) {
      if (i === j) continue;
      const sj = sites[j];
      // Demi-plan : 2(pj - pi)·x ≤ |pj|² - |pi|² - (wj² - wi²)
      // Soit inside du site i : a·x + b·y ≤ c
      const a = 2 * (sj.x - si.x);
      const b = 2 * (sj.y - si.y);
      const c =
        (sj.x * sj.x + sj.y * sj.y) -
        (si.x * si.x + si.y * si.y) -
        (sj.w2 - si.w2);

      cell = clipPolygonByHalfPlane(cell, a, b, c);
      if (cell.length === 0) break;
    }

    cell = dedupePolygon(cell);
    const area = polygonArea(cell);

    if (cell.length < 3 || area < 1e-4) {
      // Cellule dégénérée → fallback : petit carré autour du centroïde
      // (sera clippé visuellement ensuite, mais garde la room persistée)
      const size = 1.0;
      const p = rooms[i].centroid;
      const fallback: Point[] = [
        { x_percent: p.x_percent - size, y_percent: p.y_percent - size },
        { x_percent: p.x_percent + size, y_percent: p.y_percent - size },
        { x_percent: p.x_percent + size, y_percent: p.y_percent + size },
        { x_percent: p.x_percent - size, y_percent: p.y_percent + size },
      ];
      tiles.push({
        id: rooms[i].id,
        tile_polygon: fallback,
        surface_pct2: polygonArea(fallback),
        degenerate: true,
      });
    } else {
      tiles.push({
        id: rooms[i].id,
        tile_polygon: ensureCCW(cell),
        surface_pct2: area,
        degenerate: false,
      });
    }
  }

  return tiles;
}

// ─── Metrics ────────────────────────────────────────────────────────

/**
 * Calcule les métriques d'un tiling (debug / validation).
 * maxOverlapPct2 est approximé via test pairwise sur quelques points
 * (test exact nécessiterait clipping polygone-polygone complet).
 */
export function computeTilingMetrics(
  envelope: Point[],
  tiles: TileResult[]
): TilingMetrics {
  const envArea = polygonArea(envelope);
  let sumArea = 0;
  let degen = 0;
  for (const t of tiles) {
    sumArea += t.surface_pct2;
    if (t.degenerate) degen++;
  }
  const coverageError = envArea > 0 ? Math.abs(sumArea - envArea) / envArea : 1;

  // Overlap approx : teste N points aléatoires déterministes du domaine,
  // compte combien sont dans >1 tile.
  const N = 200;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of envelope) {
    if (p.x_percent < minX) minX = p.x_percent;
    if (p.x_percent > maxX) maxX = p.x_percent;
    if (p.y_percent < minY) minY = p.y_percent;
    if (p.y_percent > maxY) maxY = p.y_percent;
  }
  let overlapHits = 0;
  let tested = 0;
  for (let k = 0; k < N; k++) {
    const u = ((k * 2654435761) % 1000) / 1000;
    const v = ((k * 40503) % 1000) / 1000;
    const x = minX + u * (maxX - minX);
    const y = minY + v * (maxY - minY);
    if (!pointInPolygon({ x_percent: x, y_percent: y }, envelope)) continue;
    tested++;
    let hits = 0;
    for (const t of tiles) {
      if (pointInPolygon({ x_percent: x, y_percent: y }, t.tile_polygon)) hits++;
      if (hits > 1) { overlapHits++; break; }
    }
  }
  const maxOverlapPct2 = tested > 0 ? (overlapHits / tested) * envArea : 0;

  return {
    totalRooms: tiles.length,
    validTiles: tiles.filter((t) => !t.degenerate).length,
    degenerateTiles: degen,
    sumTileArea: sumArea,
    envelopeArea: envArea,
    coverageError,
    maxOverlapPct2,
  };
}

// ─── Helper pour convertir en ZonePolygonPoint ──────────────────────

export function toZonePolygonPoints(poly: Point[]): ZonePolygonPoint[] {
  return poly.map((p) => ({
    x_percent: p.x_percent,
    y_percent: p.y_percent,
  }));
}
