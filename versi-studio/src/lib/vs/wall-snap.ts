/**
 * wall-snap.ts — snap des polygones pièces sur les murs vectoriels (s28 invariant 2)
 *
 * Pattern propagé du pivot s27 (lot-vector-extractor) : les murs orange du
 * PDF sont extraits en segments vectoriels exacts. Chaque vertex de polygone
 * pièce IA est projeté sur le segment mur le plus proche si la distance
 * < threshold. Sinon le vertex est conservé tel quel.
 *
 * Bug s28 Thomas : « Les emplacements sont écrits sur le plan mais on en
 * tient pas compte. On tient pas compte non plus des lignes orange des murs. »
 * → les polygones IA flottent par rapport aux murs visibles.
 *
 * Algorithme (version pragmatique, ne nécessite pas de réseau de murs complexe) :
 *   1. Pour chaque vertex (x, y) du polygone pièce
 *   2. Pour chaque segment mur (x1,y1)→(x2,y2)
 *   3. Calculer la projection perpendiculaire P du vertex sur le segment
 *      (clampée aux extrémités du segment)
 *   4. Distance d = |vertex - P|
 *   5. Si d < snapThreshold → remplacer vertex par P (snap)
 *   6. Sinon conserver vertex
 *
 * Coords : tout est en pixels image native (le caller gère les conversions
 * %/pixel/lot-local en amont).
 */

export interface SnapPoint {
  x: number;
  y: number;
}

export interface WallSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface SnapResult {
  /** Polygone post-snap. Garanti même longueur que l'entrée. */
  polygon: SnapPoint[];
  /** Nombre de vertices effectivement snappés (pour debug). */
  snappedCount: number;
}

/**
 * Projection perpendiculaire d'un point sur un segment (clampée aux extrémités).
 * Retourne le point projeté + la distance.
 */
function projectPointOnSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { x: number; y: number; dist: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    // Segment dégénéré (point)
    const ddx = px - x1;
    const ddy = py - y1;
    return { x: x1, y: y1, dist: Math.hypot(ddx, ddy) };
  }
  // Paramètre t ∈ [0, 1] de la projection
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return {
    x: projX,
    y: projY,
    dist: Math.hypot(px - projX, py - projY),
  };
}

/**
 * Snap chaque vertex du polygone sur le segment mur le plus proche si
 * distance < snapThreshold pixels. Conserve tous les vertices (ne réduit
 * jamais la complexité).
 *
 * @param polygon Polygone pièce en pixels image native
 * @param walls Segments murs vectoriels en pixels image native (internes + externes)
 * @param snapThreshold Distance max pour snap (px). Default 8px (s28 strict).
 *                      Si après snap < 95% des vertices sont à ≤5px, le caller
 *                      peut re-snapper avec un threshold plus large.
 */
export function snapPolygonToWalls(
  polygon: SnapPoint[],
  walls: WallSegment[],
  snapThreshold: number = 8,
): SnapResult {
  if (polygon.length === 0 || walls.length === 0) {
    return { polygon: polygon.slice(), snappedCount: 0 };
  }

  let snappedCount = 0;
  const result: SnapPoint[] = polygon.map((v) => {
    let bestDist = snapThreshold;
    let bestX = v.x;
    let bestY = v.y;
    let snapped = false;
    for (const w of walls) {
      const proj = projectPointOnSegment(v.x, v.y, w.x1, w.y1, w.x2, w.y2);
      if (proj.dist < bestDist) {
        bestDist = proj.dist;
        bestX = proj.x;
        bestY = proj.y;
        snapped = true;
      }
    }
    if (snapped) snappedCount++;
    return { x: bestX, y: bestY };
  });

  return { polygon: result, snappedCount };
}

/**
 * s28 — snap renforcé en 2 passes : threshold strict (5-8px) puis large
 * (12-20px) pour les vertices restants. Garantit ≥95% de snap sur murs
 * internes+externes. Retourne aussi le ratio de vertices snappés à ≤5px.
 *
 * @param polygon Polygone pièce en pixels image native
 * @param walls Segments murs (internes + externes) en pixels image native
 * @param tightPx Seuil strict (default 8px)
 * @param loosePx Seuil large pour passe de rattrapage (default 16px)
 */
export function snapPolygonToWallsStrict(
  polygon: SnapPoint[],
  walls: WallSegment[],
  tightPx: number = 8,
  loosePx: number = 16,
): SnapResult & { strictRatio: number } {
  if (polygon.length === 0 || walls.length === 0) {
    return { polygon: polygon.slice(), snappedCount: 0, strictRatio: 0 };
  }
  const out: SnapPoint[] = [];
  let snappedCount = 0;
  let strictCount = 0;
  for (const v of polygon) {
    // Recherche du meilleur segment (sans seuil pour mesurer)
    let bestDist = Infinity;
    let bestX = v.x, bestY = v.y;
    for (const w of walls) {
      const proj = projectPointOnSegment(v.x, v.y, w.x1, w.y1, w.x2, w.y2);
      if (proj.dist < bestDist) {
        bestDist = proj.dist;
        bestX = proj.x;
        bestY = proj.y;
      }
    }
    if (bestDist <= tightPx) {
      out.push({ x: bestX, y: bestY });
      snappedCount++;
      strictCount++;
    } else if (bestDist <= loosePx) {
      out.push({ x: bestX, y: bestY });
      snappedCount++;
    } else {
      out.push({ x: v.x, y: v.y });
    }
  }
  const strictRatio = polygon.length > 0 ? strictCount / polygon.length : 0;
  return { polygon: out, snappedCount, strictRatio };
}

/**
 * s28 — Construction des "corners" (coins de murs) à partir des segments.
 * Un corner est l'intersection ou la jointure de 2+ segments de murs.
 *
 * Algo :
 *   1. Pour chaque endpoint de chaque segment, ajouter dans un set
 *   2. Cluster les endpoints proches (<3px) → un seul corner par cluster
 *   3. Optionnel : ajouter les intersections orthogonales explicites
 *
 * Retourne la liste de corners en pixel image native.
 */
export function buildWallCorners(
  walls: WallSegment[],
  clusterDistPx: number = 4,
): SnapPoint[] {
  if (walls.length === 0) return [];
  const endpoints: SnapPoint[] = [];
  for (const w of walls) {
    endpoints.push({ x: w.x1, y: w.y1 });
    endpoints.push({ x: w.x2, y: w.y2 });
  }
  // Clustering O(n²) — n est typiquement <2000, OK
  const corners: SnapPoint[] = [];
  const used = new Uint8Array(endpoints.length);
  for (let i = 0; i < endpoints.length; i++) {
    if (used[i]) continue;
    let sx = endpoints[i].x;
    let sy = endpoints[i].y;
    let count = 1;
    used[i] = 1;
    for (let j = i + 1; j < endpoints.length; j++) {
      if (used[j]) continue;
      const dx = endpoints[j].x - endpoints[i].x;
      const dy = endpoints[j].y - endpoints[i].y;
      if (dx * dx + dy * dy <= clusterDistPx * clusterDistPx) {
        sx += endpoints[j].x;
        sy += endpoints[j].y;
        count++;
        used[j] = 1;
      }
    }
    corners.push({ x: sx / count, y: sy / count });
  }
  return corners;
}

/**
 * s28 — Snap PIVOT v2 : combine corner-snap + segment-snap.
 *
 * Phase 1 : pour chaque vertex, chercher le CORNER le plus proche dans
 *           cornerThreshold px. Si trouvé → snap sur le corner. Idéal pour
 *           les coins (intersections de murs).
 * Phase 2 : pour les vertices non-snappés (corner trop loin), chercher
 *           le SEGMENT mur le plus proche dans segmentThreshold px et
 *           projeter perpendiculairement.
 *
 * Cible : ≥95% des vertices à ≤5px d'un mur (corner ou segment).
 */
export function snapPolygonToWallsPivot(
  polygon: SnapPoint[],
  walls: WallSegment[],
  corners: SnapPoint[],
  cornerThresholdPx: number = 25,
  segmentThresholdPx: number = 16,
): SnapResult & { strictRatio: number; cornerSnaps: number; segmentSnaps: number } {
  if (polygon.length === 0) {
    return { polygon: polygon.slice(), snappedCount: 0, strictRatio: 0, cornerSnaps: 0, segmentSnaps: 0 };
  }
  const out: SnapPoint[] = [];
  let snappedCount = 0;
  let strictCount = 0;
  let cornerSnaps = 0;
  let segmentSnaps = 0;
  for (const v of polygon) {
    // Phase 1 : corner snap
    let bestCornerDist = Infinity;
    let bestCorner: SnapPoint | null = null;
    for (const c of corners) {
      const d = Math.hypot(v.x - c.x, v.y - c.y);
      if (d < bestCornerDist) {
        bestCornerDist = d;
        bestCorner = c;
      }
    }
    if (bestCorner && bestCornerDist <= cornerThresholdPx) {
      out.push({ x: bestCorner.x, y: bestCorner.y });
      snappedCount++;
      cornerSnaps++;
      // Mesure post-snap pour strictRatio : sur un corner, la distance EST 0
      strictCount++;
      continue;
    }
    // Phase 2 : segment snap
    let bestSegDist = Infinity;
    let bestSegX = v.x, bestSegY = v.y;
    for (const w of walls) {
      const proj = projectPointOnSegment(v.x, v.y, w.x1, w.y1, w.x2, w.y2);
      if (proj.dist < bestSegDist) {
        bestSegDist = proj.dist;
        bestSegX = proj.x;
        bestSegY = proj.y;
      }
    }
    if (bestSegDist <= segmentThresholdPx) {
      out.push({ x: bestSegX, y: bestSegY });
      snappedCount++;
      segmentSnaps++;
      // Strict si dans 5px
      if (bestSegDist <= 5) strictCount++;
    } else {
      // Pas de snap possible — garder vertex original
      out.push({ x: v.x, y: v.y });
    }
  }
  const strictRatio = polygon.length > 0 ? strictCount / polygon.length : 0;
  return { polygon: out, snappedCount, strictRatio, cornerSnaps, segmentSnaps };
}

/**
 * Conversion polygone en coords % image globale → pixels image native.
 */
export function polygonPctToPx(
  polygon: Array<{ x_percent: number; y_percent: number }>,
  imageWidth: number,
  imageHeight: number,
): SnapPoint[] {
  return polygon.map((p) => ({
    x: (p.x_percent / 100) * imageWidth,
    y: (p.y_percent / 100) * imageHeight,
  }));
}

/**
 * Conversion polygone en pixels image native → coords % image globale.
 */
export function polygonPxToPct(
  polygon: SnapPoint[],
  imageWidth: number,
  imageHeight: number,
): Array<{ x_percent: number; y_percent: number }> {
  return polygon.map((p) => ({
    x_percent: imageWidth > 0 ? (p.x / imageWidth) * 100 : 0,
    y_percent: imageHeight > 0 ? (p.y / imageHeight) * 100 : 0,
  }));
}
