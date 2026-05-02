/**
 * edge-translate-snap.ts — s28 tour 15
 *
 * PROBLÈME RÉSOLU : SDE F3 a 10/11 vertices à 30-91px du nearest wall, parce
 * que le BFS s'est arrêté au quota PDF (4.4m²) avant d'atteindre les murs
 * raster (qui sont dans le set audit). Le pipeline existant snap à 5/10/15/20px
 * de tolérance maximum, ce qui ne capture pas ces gaps.
 *
 * SOLUTION : pour chaque edge du polygone dont le MILIEU est éloigné (>10px)
 * du nearest wall, on cherche dans la direction NORMALE à l'edge (perpendiculaire)
 * un mur PARALLÈLE et ALIGNÉ à plus grande tolérance (jusqu'à 100px). Si
 * trouvé, on translate l'edge ENTIÈREMENT (les 2 vertices) sur ce mur.
 *
 * Garde-fou anti-Inv-A :
 *   - Si la translation fait dériver l'aire de plus de `maxAreaDriftRatio`,
 *     on l'annule.
 *   - On traite les edges du PLUS LONG au PLUS COURT (les longs comptent plus
 *     pour la forme, on les snap d'abord ; les courts s'ajusteront ensuite).
 *
 * Cette fonction est PUREMENT additive : si aucun gain trouvé, retourne
 * le polygone identique.
 */

export interface Pt { x: number; y: number }
export interface Wall { x1: number; y1: number; x2: number; y2: number }

interface EdgeSnapOptions {
  /** Distance MIN edge-mid → nearest wall pour considérer l'edge "fantôme". Défaut 10px. */
  ghostThresholdPx: number;
  /** Distance MAX dans la normale pour chercher un mur cible. Défaut 100px. */
  searchRadiusPx: number;
  /** Différence d'angle MAX (degrés) entre edge et mur cible pour parallélisme. Défaut 12°. */
  parallelTolDeg: number;
  /** Drift d'aire MAX autorisé après translation. Défaut 0.05 (5%). */
  maxAreaDriftRatio: number;
  /** Longueur MIN de l'edge pour être traité (skip micro-edges). Défaut 8px. */
  minEdgeLenPx: number;
}

const DEFAULT_OPTS: EdgeSnapOptions = {
  ghostThresholdPx: 10,
  searchRadiusPx: 100,
  parallelTolDeg: 12,
  maxAreaDriftRatio: 0.05,
  minEdgeLenPx: 8,
};

function polygonArea(poly: Pt[]): number {
  if (poly.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    s += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
  }
  return Math.abs(s / 2);
}

function distPtToSeg(px: number, py: number, w: Wall): number {
  const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-9) return Math.hypot(px - w.x1, py - w.y1);
  const t = Math.max(0, Math.min(1, ((px - w.x1) * dx + (py - w.y1) * dy) / l2));
  return Math.hypot(px - (w.x1 + t * dx), py - (w.y1 + t * dy));
}

function angleDeg(dx: number, dy: number): number {
  let a = (Math.atan2(dy, dx) * 180) / Math.PI;
  // Normaliser [0, 180) (un edge et son inverse = même direction)
  if (a < 0) a += 180;
  if (a >= 180) a -= 180;
  return a;
}

function angleDelta(a: number, b: number): number {
  const d = Math.abs(a - b) % 180;
  return Math.min(d, 180 - d);
}

/**
 * Translate l'edge [v0, v1] vers le mur cible. Calcule la projection
 * perpendiculaire du milieu de l'edge sur la ligne du mur, puis applique
 * le même décalage aux 2 vertices.
 */
function translateEdgeToWall(v0: Pt, v1: Pt, wall: Wall): { v0: Pt; v1: Pt } {
  const mx = (v0.x + v1.x) / 2;
  const my = (v0.y + v1.y) / 2;
  // Projection du milieu sur la LIGNE du mur (pas seulement le segment)
  const wdx = wall.x2 - wall.x1, wdy = wall.y2 - wall.y1;
  const l2 = wdx * wdx + wdy * wdy;
  if (l2 < 1e-9) return { v0, v1 };
  const t = ((mx - wall.x1) * wdx + (my - wall.y1) * wdy) / l2;
  const projX = wall.x1 + t * wdx;
  const projY = wall.y1 + t * wdy;
  // Décalage à appliquer aux 2 vertices
  const dx = projX - mx;
  const dy = projY - my;
  return {
    v0: { x: v0.x + dx, y: v0.y + dy },
    v1: { x: v1.x + dx, y: v1.y + dy },
  };
}

/**
 * Snap les edges fantômes vers les murs paralleles distants.
 *
 * @param polygon Polygone en pixels image native
 * @param walls Murs PDF (set complet : ext + int + raster) en pixels image native
 * @param options Options de snap
 */
export function snapEdgesToFarWalls(
  polygon: Pt[],
  walls: Wall[],
  options: Partial<EdgeSnapOptions> = {},
): { polygon: Pt[]; edgesSnapped: number; areaDriftPct: number } {
  const opts = { ...DEFAULT_OPTS, ...options };
  if (polygon.length < 3 || walls.length === 0) {
    return { polygon: polygon.slice(), edgesSnapped: 0, areaDriftPct: 0 };
  }

  const origArea = polygonArea(polygon);
  if (origArea < 1e-6) {
    return { polygon: polygon.slice(), edgesSnapped: 0, areaDriftPct: 0 };
  }

  // Travailler sur une copie mutable
  const work: Pt[] = polygon.map((p) => ({ ...p }));
  const N = work.length;

  // Construire la liste des edges, triés du PLUS LONG au PLUS COURT
  const edges = Array.from({ length: N }, (_, i) => {
    const a = work[i];
    const b = work[(i + 1) % N];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    return { i, len };
  });
  edges.sort((a, b) => b.len - a.len);

  let snappedCount = 0;

  for (const e of edges) {
    if (e.len < opts.minEdgeLenPx) continue;
    const i0 = e.i;
    const i1 = (e.i + 1) % N;
    const v0 = work[i0];
    const v1 = work[i1];
    const mx = (v0.x + v1.x) / 2;
    const my = (v0.y + v1.y) / 2;

    // Distance du MILIEU de l'edge au nearest wall
    let bestD = Infinity;
    for (const w of walls) {
      const d = distPtToSeg(mx, my, w);
      if (d < bestD) bestD = d;
    }
    // Si l'edge est déjà proche d'un mur, on n'y touche pas
    if (bestD < opts.ghostThresholdPx) continue;

    // Calculer l'angle de l'edge
    const edx = v1.x - v0.x;
    const edy = v1.y - v0.y;
    const edgeAngle = angleDeg(edx, edy);

    // Chercher dans la direction NORMALE à l'edge un mur PARALLÈLE et ALIGNÉ.
    // La normale à l'edge est (-edy, edx) / |edge|.
    // On cherche le mur le plus proche en distance perpendiculaire ET parallèle.
    let bestWall: Wall | null = null;
    let bestPerpDist = opts.searchRadiusPx;
    for (const w of walls) {
      // Filtre 1 : parallélisme angle
      const wdx = w.x2 - w.x1, wdy = w.y2 - w.y1;
      const wlen = Math.hypot(wdx, wdy);
      if (wlen < 4) continue;
      const wallAngle = angleDeg(wdx, wdy);
      const dAng = angleDelta(edgeAngle, wallAngle);
      if (dAng > opts.parallelTolDeg) continue;

      // Filtre 2 : distance perpendiculaire MILIEU edge → ligne mur
      const w2 = wlen * wlen;
      const t = ((mx - w.x1) * wdx + (my - w.y1) * wdy) / w2;
      const projX = w.x1 + t * wdx;
      const projY = w.y1 + t * wdy;
      const perpD = Math.hypot(mx - projX, my - projY);
      if (perpD > bestPerpDist) continue;

      // Filtre 3 : la projection doit "tomber" raisonnablement dans le mur,
      // sinon on snap sur un mur qui ne se trouve pas en face de l'edge.
      // On accepte un dépassement de 30% de la longueur de l'edge.
      const edgeLen = e.len;
      const overshoot = edgeLen * 0.3;
      // tEdgeStart : projection de v0 sur la ligne du mur
      const tStart = ((v0.x - w.x1) * wdx + (v0.y - w.y1) * wdy) / w2;
      const tEnd = ((v1.x - w.x1) * wdx + (v1.y - w.y1) * wdy) / w2;
      const tMin = Math.min(tStart, tEnd);
      const tMax = Math.max(tStart, tEnd);
      // Pour que l'edge "voit" le mur, il faut un overlap : [tMin, tMax] ∩ [0, 1] non vide
      // après tolérance overshoot/wlen.
      const overshootRatio = overshoot / wlen;
      if (tMax < -overshootRatio) continue;
      if (tMin > 1 + overshootRatio) continue;

      bestPerpDist = perpD;
      bestWall = w;
    }

    if (!bestWall) continue;

    // Tester la translation : appliquer + vérifier drift d'aire
    const trans = translateEdgeToWall(v0, v1, bestWall);
    const trial = work.map((p, k) =>
      k === i0 ? trans.v0 : k === i1 ? trans.v1 : p,
    );
    const newArea = polygonArea(trial);
    const drift = origArea > 0 ? Math.abs(newArea - origArea) / origArea : 1;
    if (drift > opts.maxAreaDriftRatio) continue;

    // Vérifier qu'on AMÉLIORE bien le nearest wall (sécurité paranoïaque)
    const newMx = (trans.v0.x + trans.v1.x) / 2;
    const newMy = (trans.v0.y + trans.v1.y) / 2;
    let newBestD = Infinity;
    for (const w of walls) {
      const d = distPtToSeg(newMx, newMy, w);
      if (d < newBestD) newBestD = d;
    }
    if (newBestD >= bestD - 0.5) continue; // pas d'amélioration

    // Commit translation
    work[i0] = trans.v0;
    work[i1] = trans.v1;
    snappedCount++;
  }

  const finalArea = polygonArea(work);
  const totalDrift = origArea > 0 ? Math.abs(finalArea - origArea) / origArea : 0;
  return { polygon: work, edgesSnapped: snappedCount, areaDriftPct: totalDrift };
}
