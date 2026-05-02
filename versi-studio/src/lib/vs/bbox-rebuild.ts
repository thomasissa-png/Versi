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
}

const DEFAULT_OPTS: BboxRebuildOptions = {
  outlierThresholdPx: 10,
  outlierRatioTrigger: 0.5,
  maxAreaDriftRatio: 0.20,
  searchWindowPx: 150,
  orthoTolDeg: 8,
  minWallLenPx: 30,
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

  function findHorizontalNearestY(targetY: number, side: "N" | "S"): Wall | null {
    let best: Wall | null = null;
    let bestDelta = opts.searchWindowPx;
    for (const w of horizontals) {
      const wy = (w.y1 + w.y2) / 2;
      const wx0 = Math.min(w.x1, w.x2);
      const wx1 = Math.max(w.x1, w.x2);
      // Le mur doit couvrir cx (ou être proche)
      const margin = 30;
      if (cx < wx0 - margin || cx > wx1 + margin) continue;
      // s28 tour 15 — Pas de filtre "mauvais côté" : un mur peut être
      // dedans la bbox actuelle (cas où le bbox est trop large, contour
      // chaotique). On accepte tout mur dans la fenêtre searchWindow.
      // L'absDelta capture la distance au bord ciblé.
      const absDelta = Math.abs(side === "N" ? targetY - wy : wy - targetY);
      if (absDelta > bestDelta) continue;
      bestDelta = absDelta;
      best = w;
    }
    return best;
  }

  function findVerticalNearestX(targetX: number, side: "W" | "E"): Wall | null {
    let best: Wall | null = null;
    let bestDelta = opts.searchWindowPx;
    for (const w of verticals) {
      const wx = (w.x1 + w.x2) / 2;
      const wy0 = Math.min(w.y1, w.y2);
      const wy1 = Math.max(w.y1, w.y2);
      const margin = 30;
      if (cy < wy0 - margin || cy > wy1 + margin) continue;
      const absDelta = Math.abs(side === "W" ? targetX - wx : wx - targetX);
      if (absDelta > bestDelta) continue;
      bestDelta = absDelta;
      best = w;
    }
    return best;
  }

  const wN = findHorizontalNearestY(by0, "N");
  const wS = findHorizontalNearestY(by1, "S");
  const wW = findVerticalNearestX(bx0, "W");
  const wE = findVerticalNearestX(bx1, "E");

  // s28 tour 15 mode "soft" : si un mur n'est pas trouvé à <= softCapPx,
  // garder le bord original (pas reconstruit). Au moins UN mur doit être
  // trouvé sinon pas de reconstruction.
  // Pour SDE F3 : seuls les bords S et E ont un mur proche. Bord N/W
  // gardent leurs bbox originales → rectangle "fonctionnel" qui touche
  // les murs réels là où ils existent.
  if (!wN && !wS && !wW && !wE) {
    return { polygon: polygon.slice(), rebuilt: false, outlierCount, areaDriftPct: 0 };
  }

  const newY0 = wN ? (wN.y1 + wN.y2) / 2 : by0;
  const newY1 = wS ? (wS.y1 + wS.y2) / 2 : by1;
  const newX0 = wW ? (wW.x1 + wW.x2) / 2 : bx0;
  const newX1 = wE ? (wE.x1 + wE.x2) / 2 : bx1;

  if (newY1 <= newY0 || newX1 <= newX0) {
    return { polygon: polygon.slice(), rebuilt: false, outlierCount, areaDriftPct: 0 };
  }

  const rect: Pt[] = [
    { x: newX0, y: newY0 },
    { x: newX1, y: newY0 },
    { x: newX1, y: newY1 },
    { x: newX0, y: newY1 },
  ];

  const newArea = polygonArea(rect);
  const drift = origArea > 0 ? Math.abs(newArea - origArea) / origArea : 1;
  if (drift > opts.maxAreaDriftRatio) {
    return { polygon: polygon.slice(), rebuilt: false, outlierCount, areaDriftPct: drift };
  }

  return { polygon: rect, rebuilt: true, outlierCount, areaDriftPct: drift };
}
