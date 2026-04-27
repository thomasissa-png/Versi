/**
 * Envelope polygon — Passe-4 post-resolver (s24, fix s27 R3)
 *
 * But : remplacer l'envelope rectangulaire axis-aligned du lot par le vrai
 * contour polygonal de l'appartement. Résout le problème "le rectangle
 * englobant inclut 10-15% de zones hors appart" (décrochés, escaliers,
 * terrasses).
 *
 * Stratégie (s27 R3 — concave hull alpha-shape) :
 *   1. Recueillir tous les points des polygones finaux des rooms SNAPPÉES
 *      (snap OCR = position fiable, drift <2%).
 *   2. Calculer le concave hull (alpha-shape), alpha = 0.5 par défaut.
 *      Préserve les formes L / U / T / décrochés (vs convex hull qui les
 *      lissait en englobant des zones extérieures — root cause s27 5.2/10).
 *   3. Si l'alpha-shape est dégénéré → fallback convex hull (sécurité).
 *   4. Expand le hull de 2% vers l'extérieur (depuis le centroïde) pour
 *      laisser de la place aux murs extérieurs.
 *   5. Si snap rate < 50% → retourner null (caller fallback sur rect).
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

// ─── Concave hull (alpha-shape simplifié) ──────────────────────────

/** Distance euclidienne au carré entre 2 points (en unités % plan-global). */
function dist2(a: Point, b: Point): number {
  const dx = a.x_percent - b.x_percent;
  const dy = a.y_percent - b.y_percent;
  return dx * dx + dy * dy;
}

/**
 * Construit une triangulation de Delaunay simple en O(n^3) via le critère
 * du cercle circonscrit vide. Suffisant pour n ≤ 200 points (cas typique
 * d'un appart : 5-15 rooms × 4-12 vertices = 20-180 points).
 *
 * Note : on n'a pas besoin d'une vraie Delaunay parfaite — un sur-triangle
 * occasionnel sera retiré par le filtrage alpha. L'objectif est d'obtenir
 * un maillage couvrant le nuage de points.
 */
function delaunayTriangles(points: Point[]): Array<[number, number, number]> {
  const n = points.length;
  if (n < 3) return [];
  const triangles: Array<[number, number, number]> = [];

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        const A = points[i];
        const B = points[j];
        const C = points[k];

        // Skip triangles dégénérés (colinéaires)
        const crossVal =
          (B.x_percent - A.x_percent) * (C.y_percent - A.y_percent) -
          (B.y_percent - A.y_percent) * (C.x_percent - A.x_percent);
        if (Math.abs(crossVal) < 1e-9) continue;

        // Cercle circonscrit (centre + rayon²)
        const ax = A.x_percent, ay = A.y_percent;
        const bx = B.x_percent, by = B.y_percent;
        const cx = C.x_percent, cy = C.y_percent;
        const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
        if (Math.abs(D) < 1e-9) continue;
        const ux =
          ((ax * ax + ay * ay) * (by - cy) +
            (bx * bx + by * by) * (cy - ay) +
            (cx * cx + cy * cy) * (ay - by)) /
          D;
        const uy =
          ((ax * ax + ay * ay) * (cx - bx) +
            (bx * bx + by * by) * (ax - cx) +
            (cx * cx + cy * cy) * (bx - ax)) /
          D;
        const center = { x_percent: ux, y_percent: uy };
        const r2 = dist2(center, A);

        // Test cercle vide : aucun autre point dans le cercle
        let empty = true;
        for (let m = 0; m < n; m++) {
          if (m === i || m === j || m === k) continue;
          if (dist2(center, points[m]) < r2 - 1e-9) {
            empty = false;
            break;
          }
        }
        if (empty) triangles.push([i, j, k]);
      }
    }
  }
  return triangles;
}

/**
 * Concave hull via alpha-shape simplifié.
 *
 * Algorithme :
 *   1. Triangulation de Delaunay du nuage de points.
 *   2. Filtrage : garder les triangles dont le rayon circonscrit < 1/alpha
 *      (alpha = 0.5 → rayon < 2.0 unités % ≈ 2% du plan, pertinent pour
 *      des rooms de 3-10% de côté).
 *   3. Le contour = arêtes appartenant à exactement 1 triangle filtré.
 *   4. Reconstitution du polygone CCW à partir des arêtes de bord.
 *
 * Si le résultat est dégénéré (< 3 sommets, ou cycle non-fermé), retourner
 * null pour signaler au caller de fallback sur convex hull.
 *
 * Complexité : O(n^3) sur la triangulation + O(t) sur le filtrage. Pour
 * n ~ 100, ~10^6 ops < 50ms côté Node — acceptable hors hot path.
 *
 * @param points Nuage de points (peut contenir doublons — dédoublonnés en interne).
 * @param alpha Paramètre alpha (0.1 = très concave, 1.0 = quasi-convex). Défaut 0.3
 *   (s28 P0 fix débord polygone Étape 2 — verbatim Thomas "ça dépasse à gauche,
 *   à droite, en haut ne suit rien". 0.3 → radiusMax = 3.33% (vs 2% à 0.5),
 *   resserre la triangulation Delaunay sur les vraies arêtes des rooms).
 */
export function concaveHull(points: Point[], alpha = 0.3): Point[] | null {
  if (points.length < 3) return null;
  if (alpha <= 0) return null;

  // Dédoublonnage points identiques
  const unique: Point[] = [];
  const seen = new Set<string>();
  for (const p of points) {
    const key = `${p.x_percent.toFixed(4)}|${p.y_percent.toFixed(4)}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(p);
    }
  }
  if (unique.length < 3) return null;

  const triangles = delaunayTriangles(unique);
  if (triangles.length === 0) return null;

  // Filtrage alpha : on garde les triangles dont le rayon circonscrit < 1/alpha.
  // 1/alpha en unités % plan-global. alpha=0.5 → rayon max = 2 unités (~2% du plan).
  const radiusMax = 1 / alpha;
  const radiusMax2 = radiusMax * radiusMax;
  const kept: Array<[number, number, number]> = [];
  for (const t of triangles) {
    const A = unique[t[0]];
    const B = unique[t[1]];
    const C = unique[t[2]];
    const ax = A.x_percent, ay = A.y_percent;
    const bx = B.x_percent, by = B.y_percent;
    const cx = C.x_percent, cy = C.y_percent;
    const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(D) < 1e-9) continue;
    const ux =
      ((ax * ax + ay * ay) * (by - cy) +
        (bx * bx + by * by) * (cy - ay) +
        (cx * cx + cy * cy) * (ay - by)) /
      D;
    const uy =
      ((ax * ax + ay * ay) * (cx - bx) +
        (bx * bx + by * by) * (ax - cx) +
        (cx * cx + cy * cy) * (bx - ax)) /
      D;
    const r2 = (ax - ux) * (ax - ux) + (ay - uy) * (ay - uy);
    if (r2 <= radiusMax2) kept.push(t);
  }
  if (kept.length === 0) return null;

  // Comptage des arêtes : celles qui apparaissent 1 seule fois = bord.
  const edgeCount = new Map<string, { a: number; b: number; count: number }>();
  for (const t of kept) {
    const edges: Array<[number, number]> = [
      [t[0], t[1]],
      [t[1], t[2]],
      [t[2], t[0]],
    ];
    for (const [a, b] of edges) {
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      const existing = edgeCount.get(key);
      if (existing) existing.count++;
      else edgeCount.set(key, { a: Math.min(a, b), b: Math.max(a, b), count: 1 });
    }
  }
  const boundary: Array<[number, number]> = [];
  for (const e of edgeCount.values()) {
    if (e.count === 1) boundary.push([e.a, e.b]);
  }
  if (boundary.length < 3) return null;

  // Reconstitution du cycle : on chaîne les arêtes par sommets partagés.
  // Construire adjacence (chaque vertex → liste de vertices adjacents).
  const adj = new Map<number, number[]>();
  for (const [a, b] of boundary) {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push(b);
    adj.get(b)!.push(a);
  }

  // Garde-fou : si un sommet a !=2 voisins → topologie complexe (trous, plusieurs
  // composantes). On rejette → caller fallback convex.
  for (const neigh of adj.values()) {
    if (neigh.length !== 2) return null;
  }

  // Parcours du cycle depuis le sommet le plus à gauche (déterministe).
  let start = 0;
  for (let i = 1; i < unique.length; i++) {
    if (!adj.has(i)) continue;
    if (
      !adj.has(start) ||
      unique[i].x_percent < unique[start].x_percent ||
      (unique[i].x_percent === unique[start].x_percent &&
        unique[i].y_percent < unique[start].y_percent)
    ) {
      start = i;
    }
  }
  if (!adj.has(start)) return null;

  const cycle: number[] = [start];
  let prev = -1;
  let curr = start;
  while (true) {
    const neighbors = adj.get(curr)!;
    const next = neighbors[0] === prev ? neighbors[1] : neighbors[0];
    if (next === start) break;
    if (cycle.length > unique.length) return null; // cycle pathologique
    cycle.push(next);
    prev = curr;
    curr = next;
  }
  if (cycle.length < 3) return null;

  // Forcer orientation CCW (cohérent avec convex hull).
  const polygon = cycle.map((idx) => unique[idx]);
  let area2 = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    area2 += a.x_percent * b.y_percent - b.x_percent * a.y_percent;
  }
  if (area2 < 0) polygon.reverse();

  return polygon;
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
export function expandPolygonOutward(points: Point[], paddingPct = 0): Point[] {
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
 * Principe (s27 R3) : seules les rooms avec snap OCR sont utilisées (position
 * fiable, drift <2%). Si <50% du lot est snappé, on ne peut pas garantir un
 * contour représentatif → retour null → caller fallback sur rectangle.
 *
 * Le hull est calculé par alpha-shape (concave hull) qui préserve les formes
 * non-convexes (L / U / T / décrochés). Si l'alpha-shape échoue (cellule
 * dégénérée, topologie complexe) → fallback convex hull pour ne pas bloquer.
 *
 * @param rooms Rooms du lot avec drapeau isSnapped.
 * @param minSnapRate Taux minimal de snap requis (défaut 0.3).
 * @param paddingPct Padding outward depuis le centroïde (défaut 0% — s28 P0 fix
 *   débord polygone Étape 2. Anciennement 2%, retiré pour coller au plan).
 * @param alpha Paramètre alpha-shape (défaut 0.3 — s28 P0 fix débord). Plus petit
 *   = plus concave.
 */
export function computeLotPolygonEnvelope(
  rooms: RoomForEnvelope[],
  minSnapRate = 0.3,
  paddingPct = 0,
  alpha = 0.3,
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

  // s27 R3 — Concave hull (alpha-shape) prioritaire, fallback convex si dégénéré.
  // L'alpha-shape préserve les formes L / U / T / décrochés, root cause de la
  // plainte "forme qui n'a rien à voir avec le plan" (audit s27 5.2/10).
  let hull = concaveHull(allPoints, alpha);
  if (!hull || hull.length < 3) {
    // Fallback sécurité : convex hull (cellule dégénérée, topologie complexe).
    // s28 P0 — log explicite pour observabilité (Thomas saura si concave a
    // réussi ou si on est en convex degraded). Sinon le fallback est silencieux.
    console.warn(
      `[concaveHull] fallback convex (alpha=${alpha}, points=${allPoints.length}, hull=${hull ? hull.length : 0})`,
    );
    hull = convexHull(allPoints);
  }
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
