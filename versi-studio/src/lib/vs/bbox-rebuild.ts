/**
 * bbox-rebuild.ts — s28 tour 15
 *
 * Quand un polygone est massivement drifted (>50% vertices à >10px du nearest
 * wall) ET son aire est correcte (ratio PDF dans [0.85, 1.15]), reconstruire
 * un rectangle bbox à partir des MURS du set audit qui entourent le polygone.
 *
 * Approche : bbox du polygone + recherche dans les 4 directions cardinales
 * (N, S, E, W) du mur ALIGNÉ à la direction le plus proche de chaque côté,
 * dans une fenêtre de ±150px depuis le bord bbox. On retient le mur ortho
 * (vertical pour bord E/W, horizontal pour bord N/S) le plus proche du bord.
 *
 * Garde-fou : aire du nouveau rectangle doit rester dans [0.80, 1.20] × aire
 * du polygone original. Sinon on garde le polygone original.
 */

export interface Pt { x: number; y: number }
export interface Wall { x1: number; y1: number; x2: number; y2: number }

export interface BboxRebuildOptions {
  /** Distance MIN edge-mid → nearest wall pour considérer outlier. Défaut 10px. */
  outlierThresholdPx: number;
  /** Ratio vertices outlier MIN pour déclencher la reconstruction. Défaut 0.5. */
  outlierRatioTrigger: number;
  /** Drift d'aire MAX autorisé pour le rebuild. Défaut 0.20 (20%). */
  maxAreaDriftRatio: number;
  /** Fenêtre de recherche depuis chaque bord bbox. Défaut 150px. */
  searchWindowPx: number;
  /** Tolérance angle pour considérer un mur "horizontal" ou "vertical". Défaut 8°. */
  orthoTolDeg: number;
  /** Longueur minimale du mur cible. Défaut 30px. */
  minWallLenPx: number;
  /**
   * Aire CIBLE en px² (typiquement issue du PDF surface_m2 / scale).
   * Si fournie, le drift est calculé contre cette aire au lieu de l'aire
   * du polygone actuel. Utile quand le polygone original est lui-même
   * mal placé/déformé : la cible PDF est plus fiable.
   */
  targetAreaPx2?: number;
  /** Tolérance ratio à la cible PDF [min, max]. Défaut [0.85, 1.15]. */
  targetAreaToleranceMin: number;
  targetAreaToleranceMax: number;
}

const DEFAULT_OPTS: BboxRebuildOptions = {
  outlierThresholdPx: 10,
  outlierRatioTrigger: 0.5,
  maxAreaDriftRatio: 0.20,
  searchWindowPx: 150,
  orthoTolDeg: 8,
  minWallLenPx: 30,
  targetAreaToleranceMin: 0.85,
  targetAreaToleranceMax: 1.15,
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

function isHorizontal(w: Wall, tolDeg: number): boolean {
  const dy = Math.abs(w.y2 - w.y1);
  const dx = Math.abs(w.x2 - w.x1);
  if (dx < 1) return false;
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  return ang < tolDeg;
}

function isVertical(w: Wall, tolDeg: number): boolean {
  const dy = Math.abs(w.y2 - w.y1);
  const dx = Math.abs(w.x2 - w.x1);
  if (dy < 1) return false;
  const ang = (Math.atan2(dx, dy) * 180) / Math.PI;
  return ang < tolDeg;
}

function wallLen(w: Wall): number {
  return Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
}

/**
 * Si le polygone est massivement drifted, reconstruire un rectangle
 * englobant snappé sur les 4 murs orthogonaux les plus proches.
 *
 * @returns polygone (rebuild ou original), nb d'outliers détectés, drift d'aire
 */
export function rebuildBboxFromWalls(
  polygon: Pt[],
  walls: Wall[],
  options: Partial<BboxRebuildOptions> = {},
): { polygon: Pt[]; rebuilt: boolean; outlierCount: number; areaDriftPct: number } {
  const opts = { ...DEFAULT_OPTS, ...options };
  if (polygon.length < 3 || walls.length === 0) {
    return { polygon: polygon.slice(), rebuilt: false, outlierCount: 0, areaDriftPct: 0 };
  }

  const origArea = polygonArea(polygon);
  if (origArea < 1e-6) {
    return { polygon: polygon.slice(), rebuilt: false, outlierCount: 0, areaDriftPct: 0 };
  }

  // Étape 1 : count vertices outliers
  let outlierCount = 0;
  for (const v of polygon) {
    let bestD = Infinity;
    for (const w of walls) {
      const d = distPtToSeg(v.x, v.y, w);
      if (d < bestD) bestD = d;
    }
    if (bestD > opts.outlierThresholdPx) outlierCount++;
  }
  const ratio = outlierCount / polygon.length;
  if (ratio < opts.outlierRatioTrigger) {
    return { polygon: polygon.slice(), rebuilt: false, outlierCount, areaDriftPct: 0 };
  }

  // Étape 2 : bbox du polygone
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const v of polygon) {
    if (v.x < bx0) bx0 = v.x;
    if (v.y < by0) by0 = v.y;
    if (v.x > bx1) bx1 = v.x;
    if (v.y > by1) by1 = v.y;
  }
  // Centre bbox
  const cx = (bx0 + bx1) / 2;
  const cy = (by0 + by1) / 2;

  // Étape 3 : recherche murs orthogonaux
  // Bord N : mur HORIZONTAL le plus proche au-dessus ou autour du bord supérieur
  // Bord S : mur HORIZONTAL le plus proche en-dessous
  // Bord E : mur VERTICAL le plus proche à droite
  // Bord W : mur VERTICAL le plus proche à gauche
  // "Le plus proche" = distance perpendiculaire MIN, et le mur "couvre" l'extension
  // X (pour H) ou Y (pour V) avec un overlap raisonnable.

  // Filtrer les murs orthogonaux assez longs
  const horizontals = walls.filter((w) =>
    isHorizontal(w, opts.orthoTolDeg) && wallLen(w) >= opts.minWallLenPx,
  );
  const verticals = walls.filter((w) =>
    isVertical(w, opts.orthoTolDeg) && wallLen(w) >= opts.minWallLenPx,
  );

  // Pour chaque direction, trouver le mur le plus proche.
  // Critère qualité : il faut que le mur "couvre" la position du centre.
  // Pour un mur horizontal : ses x doivent inclure cx (avec marge 30px tolérée).
  // Pour un mur vertical : ses y doivent inclure cy.

  // s28 tour 15 — On retourne TOP-K candidats par direction (pas juste le
  // plus proche). Permet de tester combinaisons et trouver le rect dont
  // l'aire respecte la cible PDF.
  function findHorizontalCandidates(targetY: number): Array<{ wall: Wall; y: number; delta: number }> {
    const cands: Array<{ wall: Wall; y: number; delta: number }> = [];
    for (const w of horizontals) {
      const wy = (w.y1 + w.y2) / 2;
      const wx0 = Math.min(w.x1, w.x2);
      const wx1 = Math.max(w.x1, w.x2);
      const margin = 30;
      if (cx < wx0 - margin || cx > wx1 + margin) continue;
      const delta = Math.abs(targetY - wy);
      if (delta > opts.searchWindowPx) continue;
      cands.push({ wall: w, y: wy, delta });
    }
    cands.sort((a, b) => a.delta - b.delta);
    return cands.slice(0, 5);
  }

  function findVerticalCandidates(targetX: number): Array<{ wall: Wall; x: number; delta: number }> {
    const cands: Array<{ wall: Wall; x: number; delta: number }> = [];
    for (const w of verticals) {
      const wx = (w.x1 + w.x2) / 2;
      const wy0 = Math.min(w.y1, w.y2);
      const wy1 = Math.max(w.y1, w.y2);
      const margin = 30;
      if (cy < wy0 - margin || cy > wy1 + margin) continue;
      const delta = Math.abs(targetX - wx);
      if (delta > opts.searchWindowPx) continue;
      cands.push({ wall: w, x: wx, delta });
    }
    cands.sort((a, b) => a.delta - b.delta);
    return cands.slice(0, 5);
  }

  const candsN = findHorizontalCandidates(by0);
  const candsS = findHorizontalCandidates(by1);
  const candsW = findVerticalCandidates(bx0);
  const candsE = findVerticalCandidates(bx1);

  // Si aucune direction n'a de mur, abandon
  if (candsN.length === 0 && candsS.length === 0 && candsW.length === 0 && candsE.length === 0) {
    return { polygon: polygon.slice(), rebuilt: false, outlierCount, areaDriftPct: 0 };
  }

  // Toutes combinaisons : 4 directions, chacune peut être null (= garder bbox
  // original) ou un des top-5 candidats. Chercher la combinaison avec le
  // ratio aire/cible le plus proche de 1.0 (et dans tolérance si target).
  type Combo = { y0: number; y1: number; x0: number; x1: number; area: number };
  let best: Combo | null = null;
  let bestScore = Infinity;
  const candsNExt: Array<{ y: number } | null> = [null, ...candsN.map((c) => ({ y: c.y }))];
  const candsSExt: Array<{ y: number } | null> = [null, ...candsS.map((c) => ({ y: c.y }))];
  const candsWExt: Array<{ x: number } | null> = [null, ...candsW.map((c) => ({ x: c.x }))];
  const candsEExt: Array<{ x: number } | null> = [null, ...candsE.map((c) => ({ x: c.x }))];

  for (const cN of candsNExt) {
    for (const cS of candsSExt) {
      for (const cW of candsWExt) {
        for (const cE of candsEExt) {
          // Au moins 1 mur snap (sinon on garde l'original → no-op)
          if (!cN && !cS && !cW && !cE) continue;
          const y0 = cN ? cN.y : by0;
          const y1 = cS ? cS.y : by1;
          const x0 = cW ? cW.x : bx0;
          const x1 = cE ? cE.x : bx1;
          if (y1 <= y0 || x1 <= x0) continue;
          const area = (x1 - x0) * (y1 - y0);

          // Score : si cible fournie, distance log au ratio 1.0 ; sinon drift
          // contre l'aire originale.
          let score: number;
          if (typeof opts.targetAreaPx2 === "number" && opts.targetAreaPx2 > 0) {
            const ratio = area / opts.targetAreaPx2;
            if (ratio < opts.targetAreaToleranceMin || ratio > opts.targetAreaToleranceMax) {
              continue;
            }
            score = Math.abs(Math.log(ratio));
          } else {
            const drift = origArea > 0 ? Math.abs(area - origArea) / origArea : 1;
            if (drift > opts.maxAreaDriftRatio) continue;
            score = drift;
          }

          // Bonus : préférer combinaisons avec PLUS de murs réels (pas juste
          // bbox original). Chaque mur snap = -0.05 score.
          const realCount = (cN ? 1 : 0) + (cS ? 1 : 0) + (cW ? 1 : 0) + (cE ? 1 : 0);
          score -= realCount * 0.05;

          if (score < bestScore) {
            bestScore = score;
            best = { y0, y1, x0, x1, area };
          }
        }
      }
    }
  }

  if (!best) {
    return { polygon: polygon.slice(), rebuilt: false, outlierCount, areaDriftPct: 0 };
  }

  const rect: Pt[] = [
    { x: best.x0, y: best.y0 },
    { x: best.x1, y: best.y0 },
    { x: best.x1, y: best.y1 },
    { x: best.x0, y: best.y1 },
  ];

  const newArea = best.area;
  const drift = origArea > 0 ? Math.abs(newArea - origArea) / origArea : 1;
  return { polygon: rect, rebuilt: true, outlierCount, areaDriftPct: drift };
}
