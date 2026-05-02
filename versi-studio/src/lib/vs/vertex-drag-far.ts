/**
 * vertex-drag-far.ts — s28 tour 15 dernière tentative
 *
 * Pour les pièces dont >50% des vertices sont à >20px du nearest wall, on
 * ne peut pas faire de translation d'edge propre (les edges sont diagonaux
 * sans correspondance ortho). On fait alors un drag VERTEX par VERTEX :
 * chaque vertex outlier est tiré sur le point projeté du mur le plus
 * proche (jusqu'à 120px). Sans contrainte d'angle.
 *
 * Garde-fou : drift d'aire global du polygone borné à maxAreaDriftRatio.
 * Si dépassé, rollback complet.
 *
 * Note : cette fonction PEUT déformer la pièce. Elle s'applique uniquement
 * en dernier recours pour les pièces à >50% outliers ET déjà bonne aire
 * Inv A. Le but est d'AJUSTER la forme pour faire passer Inv C.
 */

export interface Pt { x: number; y: number }
export interface Wall { x1: number; y1: number; x2: number; y2: number }

export interface VertexDragOptions {
  /** Tolérance en deçà de laquelle on NE drag PAS (déjà OK). Défaut 20px. */
  alreadyOkPx: number;
  /** Distance MAX de recherche du mur cible. Défaut 120px. */
  searchRadiusPx: number;
  /** Drift d'aire MAX accepté pour le rollback. Défaut 0.12 (12%). */
  maxAreaDriftRatio: number;
}

const DEFAULT_OPTS: VertexDragOptions = {
  alreadyOkPx: 20,
  searchRadiusPx: 120,
  maxAreaDriftRatio: 0.12,
};

function polyArea(p: Pt[]): number {
  if (p.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const j = (i + 1) % p.length;
    s += p[i].x * p[j].y - p[j].x * p[i].y;
  }
  return Math.abs(s / 2);
}

function projectOnSeg(
  px: number, py: number,
  x1: number, y1: number, x2: number, y2: number,
): { x: number; y: number; dist: number } {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  if (l2 < 1e-9) return { x: x1, y: y1, dist: Math.hypot(px - x1, py - y1) };
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return { x: projX, y: projY, dist: Math.hypot(px - projX, py - projY) };
}

/**
 * Drag chaque vertex outlier sur le mur le plus proche (sans contrainte angle).
 * Si le drift d'aire global dépasse le seuil, rollback total.
 */
export function dragOutlierVerticesFar(
  polygon: Pt[],
  walls: Wall[],
  options: Partial<VertexDragOptions> = {},
): { polygon: Pt[]; verticesSnapped: number; areaDriftPct: number } {
  const opts = { ...DEFAULT_OPTS, ...options };
  if (polygon.length < 3 || walls.length === 0) {
    return { polygon: polygon.slice(), verticesSnapped: 0, areaDriftPct: 0 };
  }

  const origArea = polyArea(polygon);
  if (origArea < 1e-6) {
    return { polygon: polygon.slice(), verticesSnapped: 0, areaDriftPct: 0 };
  }

  let snapped = 0;
  const out: Pt[] = polygon.map((v) => {
    let bestDist = Infinity;
    let bestX = v.x, bestY = v.y;
    for (const w of walls) {
      const proj = projectOnSeg(v.x, v.y, w.x1, w.y1, w.x2, w.y2);
      if (proj.dist < bestDist) {
        bestDist = proj.dist;
        bestX = proj.x;
        bestY = proj.y;
      }
    }
    // Si vertex déjà OK, garder
    if (bestDist <= opts.alreadyOkPx) return { x: v.x, y: v.y };
    // Si trop loin, ne pas drag (impossible)
    if (bestDist > opts.searchRadiusPx) return { x: v.x, y: v.y };
    // Drag
    snapped++;
    return { x: bestX, y: bestY };
  });

  const newArea = polyArea(out);
  const drift = origArea > 0 ? Math.abs(newArea - origArea) / origArea : 1;
  if (drift > opts.maxAreaDriftRatio) {
    return { polygon: polygon.slice(), verticesSnapped: 0, areaDriftPct: drift };
  }
  return { polygon: out, verticesSnapped: snapped, areaDriftPct: drift };
}
