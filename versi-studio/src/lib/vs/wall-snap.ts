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
 * @param walls Segments murs vectoriels en pixels image native
 * @param snapThreshold Distance max pour snap (px). Default 12px.
 *                      À scale=3 sur PDF A4, 12px ≈ 4mm dans le PDF, ie un
 *                      vertex IA "près" du mur (typique drift LLM ~1-3%).
 */
export function snapPolygonToWalls(
  polygon: SnapPoint[],
  walls: WallSegment[],
  snapThreshold: number = 12,
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
