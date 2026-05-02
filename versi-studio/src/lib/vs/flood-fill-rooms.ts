/**
 * Module s28.6 — Flood-fill raster pour extraction de pièces.
 *
 * Pivot Option C : quand le graphe planaire vectoriel ne ferme pas correctement
 * les pièces (cloisons multi-lignes, hachures, murs représentés par symboles),
 * on opère directement sur le PNG rasterisé du PDF.
 *
 * Algorithme :
 *   1. PDF → PNG via pdf-to-img (déjà fait par /api/vs/files).
 *   2. Pour chaque pixel : "wall" si luminance < seuil OU couleur saturée
 *      (orange/rouge/bleu murs).
 *   3. Pour chaque label IA `(text, x_pct, y_pct)` :
 *      - Convertir en pixel.
 *      - Si seed pixel est "wall" → chercher en spirale un seed non-wall.
 *      - Flood-fill 4-connectivité depuis ce seed contre la masque "wall".
 *      - La région inondée = la pièce.
 *   4. Pour chaque masque, tracer le contour via Marching Squares ou border-walk.
 *   5. Convertir le contour px → coords %.
 *
 * Avantages :
 *   - Indépendant des couleurs de murs (toute couleur dark = barrière).
 *   - Chaque pièce a UN seed (label) → un masque disjoint par construction.
 *   - Pas d'invention : si le label tombe dans une zone grand-ouverte, on
 *     obtiendra une grande zone (pas de fallback Voronoï).
 *
 * Limitations :
 *   - Si deux pièces voisines ont une porte ouverte sans seuil (rare sur
 *     plans archi), le flood-fill peut "fuir" → on garde un fail-fast.
 *   - Performances : 2400×3500 px ≈ 8M pixels → 50-150ms par pièce.
 */

import sharp from "sharp";
import { smartLineSnap } from "./smart-line-snap";
import { vectorizeRasterWalls } from "./raster-walls-vectorize";

export type LabelSeed = {
  text: string;
  x_percent: number;
  y_percent: number;
  surface_m2: number | null;
};

export type RoomPolygonPx = {
  text: string;
  surface_m2: number | null;
  /** Polygone fermé en pixels image (résolution du PNG source). */
  polygon: Array<{ x: number; y: number }>;
  /** Aire en px² (depuis flood-fill). */
  areaPx2: number;
  /** Centroïde en pixels. */
  centroid: { x: number; y: number };
};

export type FloodFillOptions = {
  /** Seuil de luminance (0-255) pour considérer un pixel comme "mur". Plus bas = plus permissif. */
  wallLumThreshold?: number;
  /** Saturation min (0-1) pour qu'un pixel coloré (orange, bleu) compte comme mur. */
  wallSaturationThreshold?: number;
  /** Décimation du contour (Douglas-Peucker tolerance px). */
  simplifyTolerancePx?: number;
  /** Aire min en pixels² pour accepter une pièce (évite les flood-fill qui "fuient" sur 1 pixel). */
  minAreaPx2?: number;
  /** Aire max en pixels² (rejette les flood-fill qui "fuient" sur tout le plan). */
  maxAreaPx2?: number;
  /** Polygone du lot en pixels (les seeds projetés dedans). */
  lotPolygonPx: Array<{ x: number; y: number }>;
  /** Distance max recherchée pour un seed alternatif (px). */
  seedSearchRadius?: number;
  /** Rayon de dilatation morphologique de la masque wall (pour fermer les portes). Défaut 5px. */
  doorSealRadius?: number;
  /**
   * Murs vectoriels supplémentaires (segments) à dessiner dans la masque AVANT flood-fill.
   * Critique : sur les PDFs Muguets, les cloisons internes sont en gris/orange et leurs
   * pixels apparaissent fins/discontinus dans le PNG, mais le PDF vectoriel les contient
   * comme des segments propres. Les ajouter à la masque garantit qu'ils sont des barrières.
   */
  vectorWallSegments?: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  /** Épaisseur de tracé des murs vectoriels dans la masque (px). Défaut 3. */
  vectorWallThickness?: number;
  /**
   * Murs SÉPARATEURS d'appartements (s28 tour 8) — segments à renforcer ENCORE
   * plus que vectorWalls. Utilisé quand un plan d'étage contient plusieurs apts
   * (T2+T3 R+1 Muguets) : sans ces murs renforcés, le flood-fill traverse la
   * cloison palière et fusionne deux apts en un.
   */
  aptSeparatorSegments?: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  /** Épaisseur de tracé des séparateurs apt (px). Défaut 5 (plus épais que vectorWalls). */
  aptSeparatorThickness?: number;
};

/**
 * Dilatation morphologique 1D-décomposée (carré r×r). O(W*H*r) total.
 */
function morphDilate1D(mask: Uint8Array, W: number, H: number, r: number): Uint8Array {
  if (r <= 0) return mask;
  const tmp = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const rowOff = y * W;
    for (let x = 0; x < W; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(W - 1, x + r);
      let any = 0;
      for (let xx = x0; xx <= x1; xx++) {
        if (mask[rowOff + xx]) { any = 1; break; }
      }
      tmp[rowOff + x] = any;
    }
  }
  const out = new Uint8Array(W * H);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      const y0 = Math.max(0, y - r), y1 = Math.min(H - 1, y + r);
      let any = 0;
      for (let yy = y0; yy <= y1; yy++) {
        if (tmp[yy * W + x]) { any = 1; break; }
      }
      out[y * W + x] = any;
    }
  }
  return out;
}

/**
 * Construit la masque "wall" depuis le PNG :
 *   wall[i] = 1 si pixel sombre (luminance < threshold) OU pixel saturé orange.
 */
async function buildWallMask(
  pngBuffer: Buffer,
  options: { wallLumThreshold: number; wallSaturationThreshold: number },
): Promise<{ mask: Uint8Array; W: number; H: number }> {
  const img = sharp(pngBuffer).raw().ensureAlpha();
  const meta = await img.metadata();
  const W = meta.width!;
  const H = meta.height!;
  const buffer = await img.toBuffer();
  const mask = new Uint8Array(W * H);
  // RGBA stride = 4
  const lumThr = options.wallLumThreshold;
  const satThr = options.wallSaturationThreshold;
  for (let i = 0, p = 0; i < W * H; i++, p += 4) {
    const r = buffer[p];
    const g = buffer[p + 1];
    const b = buffer[p + 2];
    // Luminance perceptuelle
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    let isWall = false;
    if (lum < lumThr) {
      isWall = true;
    } else {
      // Saturation simple : (max - min) / max ; > seuil ET pas trop clair
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max > 0 ? (max - min) / max : 0;
      // Filtre : pas le blanc-cassé / beige clair (lum > 230, sat < 0.15) → ignoré
      if (sat > satThr && lum < 230) isWall = true;
    }
    mask[i] = isWall ? 1 : 0;
  }
  return { mask, W, H };
}

/**
 * Cherche un seed non-wall en spirale depuis (cx, cy) dans la mask.
 * Retourne null si rien trouvé dans le rayon.
 *
 * s28 tour 8 — Évite les "bons-mais-mauvais" seeds : si on accepte le 1er
 * pixel libre venu, on tombe parfois dans un placard de 30px collé à un mur
 * (le flood-fill se limite au placard). On préfère un seed dont le
 * VOISINAGE 11x11 est majoritairement libre (= grande pièce, pas un coin).
 */
function findNonWallSeed(
  mask: Uint8Array,
  W: number,
  H: number,
  cx: number,
  cy: number,
  radius: number,
): { x: number; y: number } | null {
  if (cx < 0 || cx >= W || cy < 0 || cy >= H) return null;
  // Mesure de "qualité" d'un seed : nombre de pixels libres dans un voisinage
  // 11×11 (rayon 5). Un seed "bien centré" dans une pièce ouverte aura ~121
  // pixels libres ; un seed dans un placard étroit aura ~30.
  const qualityRadius = 5;
  const seedQuality = (x: number, y: number): number => {
    let count = 0;
    for (let oy = -qualityRadius; oy <= qualityRadius; oy++) {
      const yy = y + oy;
      if (yy < 0 || yy >= H) continue;
      const row = yy * W;
      for (let ox = -qualityRadius; ox <= qualityRadius; ox++) {
        const xx = x + ox;
        if (xx < 0 || xx >= W) continue;
        if (mask[row + xx] === 0) count++;
      }
    }
    return count;
  };
  // Si la position originale est libre ET d'excellente qualité, on la garde.
  if (mask[cy * W + cx] === 0) {
    const q0 = seedQuality(cx, cy);
    // Voisinage 11×11 = 121 pixels max ; "très bon" = 95% libre = 115+
    if (q0 >= 115) return { x: cx, y: cy };
    // Sinon, on cherche un meilleur seed dans le rayon, en gardant la
    // position originale comme fallback.
    let bestX = cx, bestY = cy, bestQ = q0;
    for (let r = 1; r <= Math.min(radius, 30); r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || x >= W || y < 0 || y >= H) continue;
          if (mask[y * W + x] !== 0) continue;
          const q = seedQuality(x, y);
          if (q > bestQ) { bestQ = q; bestX = x; bestY = y; }
        }
      }
      // Si on a trouvé un seed de qualité parfaite, stop
      if (bestQ >= 120) break;
    }
    return { x: bestX, y: bestY };
  }
  // Position originale sur un mur → spirale stricte avec préférence pour
  // les seeds de meilleure qualité.
  let bestX = -1, bestY = -1, bestQ = -1;
  for (let r = 1; r <= radius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= W || y < 0 || y >= H) continue;
        if (mask[y * W + x] !== 0) continue;
        const q = seedQuality(x, y);
        if (q > bestQ) { bestQ = q; bestX = x; bestY = y; }
      }
    }
    // Une fois qu'on a trouvé un seed de très bonne qualité (≥80%), arrêter
    // pour éviter de chercher trop loin (sortir de la pièce attendue).
    if (bestQ >= 96) return { x: bestX, y: bestY };
  }
  if (bestX >= 0) return { x: bestX, y: bestY };
  return null;
}

/**
 * Flood-fill 4-connectivité. Retourne la masque binaire de la région.
 */
function floodFill(
  wallMask: Uint8Array,
  W: number,
  H: number,
  seedX: number,
  seedY: number,
  maxAreaPx2: number,
): { region: Uint8Array; area: number; bbox: { minX: number; minY: number; maxX: number; maxY: number } } {
  const region = new Uint8Array(W * H);
  const seedIdx = seedY * W + seedX;
  if (wallMask[seedIdx] !== 0) return { region, area: 0, bbox: { minX: 0, minY: 0, maxX: 0, maxY: 0 } };
  // Stack-based flood fill (évite stack overflow récursif)
  const stack: number[] = [seedIdx];
  region[seedIdx] = 1;
  let area = 0;
  let minX = seedX, minY = seedY, maxX = seedX, maxY = seedY;
  while (stack.length > 0 && area < maxAreaPx2) {
    const idx = stack.pop()!;
    const x = idx % W;
    const y = (idx - x) / W;
    area++;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (x > 0) {
      const n = idx - 1;
      if (!region[n] && !wallMask[n]) { region[n] = 1; stack.push(n); }
    }
    if (x < W - 1) {
      const n = idx + 1;
      if (!region[n] && !wallMask[n]) { region[n] = 1; stack.push(n); }
    }
    if (y > 0) {
      const n = idx - W;
      if (!region[n] && !wallMask[n]) { region[n] = 1; stack.push(n); }
    }
    if (y < H - 1) {
      const n = idx + W;
      if (!region[n] && !wallMask[n]) { region[n] = 1; stack.push(n); }
    }
  }
  return { region, area, bbox: { minX, minY, maxX, maxY } };
}

/**
 * Trace le contour ordonné d'une masque binaire via border-following (Moore neighborhood).
 * Limité à la composante connexe contenant (startX, startY) — ce qui est garanti par flood-fill.
 */
function traceContour(
  region: Uint8Array,
  W: number,
  H: number,
  bbox: { minX: number; minY: number; maxX: number; maxY: number },
): Array<{ x: number; y: number }> {
  // Trouver le pixel le plus haut-gauche de la région (start)
  let startX = -1, startY = -1;
  outer: for (let y = bbox.minY; y <= bbox.maxY; y++) {
    for (let x = bbox.minX; x <= bbox.maxX; x++) {
      if (region[y * W + x] === 1) {
        startX = x;
        startY = y;
        break outer;
      }
    }
  }
  if (startX < 0) return [];

  // Moore-neighbor tracing avec direction de retour
  // Voisinage 8 dans l'ordre : E, NE, N, NW, W, SW, S, SE
  const N8 = [
    [1, 0], [1, -1], [0, -1], [-1, -1],
    [-1, 0], [-1, 1], [0, 1], [1, 1],
  ];
  const isOn = (x: number, y: number) =>
    x >= 0 && x < W && y >= 0 && y < H && region[y * W + x] === 1;

  const contour: Array<{ x: number; y: number }> = [];
  let cx = startX, cy = startY;
  contour.push({ x: cx, y: cy });
  // backDir = direction d'où on vient (initialement W=4)
  let backDir = 4;
  const maxIter = (bbox.maxX - bbox.minX + 1) * (bbox.maxY - bbox.minY + 1) * 4;
  for (let iter = 0; iter < maxIter; iter++) {
    let found = false;
    for (let k = 1; k <= 8; k++) {
      const dir = (backDir + k) % 8;
      const tx = cx + N8[dir][0];
      const ty = cy + N8[dir][1];
      if (isOn(tx, ty)) {
        cx = tx;
        cy = ty;
        backDir = (dir + 4) % 8;
        found = true;
        break;
      }
    }
    if (!found) break;
    if (cx === startX && cy === startY && contour.length > 4) break;
    contour.push({ x: cx, y: cy });
  }
  return contour;
}

/**
 * Douglas-Peucker simplification.
 */
function simplifyDP(
  points: Array<{ x: number; y: number }>,
  tolerance: number,
): Array<{ x: number; y: number }> {
  if (points.length <= 2 || tolerance <= 0) return points;
  const dist = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
  };
  const recurse = (s: number, e: number, out: number[]) => {
    let mD = 0, mI = s;
    for (let i = s + 1; i < e; i++) {
      const d = dist(points[i], points[s], points[e]);
      if (d > mD) { mD = d; mI = i; }
    }
    if (mD > tolerance) {
      recurse(s, mI, out);
      out.push(mI);
      recurse(mI, e, out);
    }
  };
  const keep = [0];
  recurse(0, points.length - 1, keep);
  keep.push(points.length - 1);
  return keep.sort((a, b) => a - b).map((i) => points[i]);
}

/**
 * Snap les vertices d'un polygone aux murs vectoriels les plus proches dans
 * une fenêtre de tolérance. Pour chaque vertex, on cherche le mur le plus
 * proche dans `tolPx` ; s'il en existe un, on projette le vertex sur ce mur.
 *
 * Critique : flood-fill produit des contours pixel-by-pixel décalés du mur
 * réel par doorSealRadius. Sans snap, l'audit "vertex à ≤5px d'un mur" fail.
 */
function snapPolygonToWalls(
  polygon: Array<{ x: number; y: number }>,
  walls: Array<{ x1: number; y1: number; x2: number; y2: number }>,
  tolPx: number,
): Array<{ x: number; y: number }> {
  const tol2 = tolPx * tolPx;
  const out: Array<{ x: number; y: number }> = [];
  for (const v of polygon) {
    let bestD2 = Infinity;
    let bestX = v.x, bestY = v.y;
    for (const w of walls) {
      const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
      const len2 = dx * dx + dy * dy;
      if (len2 < 1e-6) continue;
      const t = Math.max(0, Math.min(1, ((v.x - w.x1) * dx + (v.y - w.y1) * dy) / len2));
      const projX = w.x1 + t * dx;
      const projY = w.y1 + t * dy;
      const d2 = (v.x - projX) ** 2 + (v.y - projY) ** 2;
      if (d2 < bestD2) {
        bestD2 = d2;
        bestX = projX;
        bestY = projY;
      }
    }
    if (bestD2 <= tol2) {
      out.push({ x: bestX, y: bestY });
    } else {
      out.push({ x: v.x, y: v.y });
    }
  }
  return out;
}

/**
 * Point-in-polygon ray casting.
 */
function pip(px: number, py: number, poly: Array<{ x: number; y: number }>): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const inter = (yi > py) !== (yj > py) &&
      px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
    if (inter) inside = !inside;
  }
  return inside;
}

/**
 * Projette un point (px, py) sur le polygone lot s'il est dehors.
 * Retourne le point inchangé si déjà dedans.
 */
function projectIntoLot(
  px: number,
  py: number,
  lotPolyPx: Array<{ x: number; y: number }>,
): { x: number; y: number } {
  if (pip(px, py, lotPolyPx)) return { x: px, y: py };
  let bestD = Infinity, bestX = px, bestY = py;
  for (let k = 0; k < lotPolyPx.length; k++) {
    const a = lotPolyPx[k];
    const b = lotPolyPx[(k + 1) % lotPolyPx.length];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-6) continue;
    const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len2));
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    const d = Math.hypot(px - projX, py - projY);
    if (d < bestD) { bestD = d; bestX = projX; bestY = projY; }
  }
  // Décaler 5px vers l'intérieur (centroïde)
  const cxL = lotPolyPx.reduce((s, p) => s + p.x, 0) / lotPolyPx.length;
  const cyL = lotPolyPx.reduce((s, p) => s + p.y, 0) / lotPolyPx.length;
  const dirX = cxL - bestX, dirY = cyL - bestY;
  const dl = Math.hypot(dirX, dirY);
  if (dl > 0) {
    bestX += (dirX / dl) * 5;
    bestY += (dirY / dl) * 5;
  }
  return { x: bestX, y: bestY };
}

/**
 * Extraction des polygones de pièces depuis un PNG via flood-fill.
 *
 * Garanties :
 *   - Chaque label produit AU PLUS un polygone (jamais plusieurs).
 *   - Les polygones sont DISJOINTS par construction (les pixels d'une région
 *     remplie sont marqués → flood-fill suivants les ignorent).
 *   - Le polygone trace exactement les murs visibles (toute couleur dark).
 *
 * @param pngBuffer PNG haute-déf du plan.
 * @param labels Labels IA avec position (% du plan).
 * @param options Paramètres du flood-fill.
 */
export async function extractRoomsByFloodFill(
  pngBuffer: Buffer,
  labels: LabelSeed[],
  options: FloodFillOptions,
): Promise<RoomPolygonPx[]> {
  const wallLumThreshold = options.wallLumThreshold ?? 200;
  const wallSaturationThreshold = options.wallSaturationThreshold ?? 0.30;
  const simplifyTolerancePx = options.simplifyTolerancePx ?? 3;
  const minAreaPx2 = options.minAreaPx2 ?? 500;
  const maxAreaPx2 = options.maxAreaPx2 ?? 5_000_000;
  const seedSearchRadius = options.seedSearchRadius ?? 60;
  const doorSealRadius = options.doorSealRadius ?? 5;
  const vectorWallThickness = options.vectorWallThickness ?? 3;
  const vectorWalls = options.vectorWallSegments ?? [];
  const aptSeparators = options.aptSeparatorSegments ?? [];
  const aptSeparatorThickness = options.aptSeparatorThickness ?? 5;
  const lotPolyPx = options.lotPolygonPx;

  const { mask: wallMask, W, H } = await buildWallMask(pngBuffer, {
    wallLumThreshold,
    wallSaturationThreshold,
  });

  // Tracer le contour du lot comme des "murs supplémentaires" : empêche le
  // flood-fill de fuir au-delà des frontières du lot (escaliers extérieurs,
  // terrasse, etc., qui peuvent ne pas être bien marqués sur le PNG).
  const drawSegment = (mask: Uint8Array, x1: number, y1: number, x2: number, y2: number, thickness: number) => {
    const dx = x2 - x1, dy = y2 - y1;
    const steps = Math.max(Math.abs(dx), Math.abs(dy)) | 0;
    if (steps === 0) return;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const cx = Math.round(x1 + dx * t);
      const cy = Math.round(y1 + dy * t);
      for (let oy = -thickness; oy <= thickness; oy++) {
        for (let ox = -thickness; ox <= thickness; ox++) {
          const px = cx + ox, py = cy + oy;
          if (px < 0 || px >= W || py < 0 || py >= H) continue;
          if (ox * ox + oy * oy <= thickness * thickness) mask[py * W + px] = 1;
        }
      }
    }
  };
  // Tracer les arêtes du polygone lot dans la masque (épaisseur 4px)
  if (lotPolyPx.length >= 3) {
    for (let k = 0; k < lotPolyPx.length; k++) {
      const a = lotPolyPx[k];
      const b = lotPolyPx[(k + 1) % lotPolyPx.length];
      drawSegment(wallMask, a.x, a.y, b.x, b.y, 4);
    }
  }

  // Tracer les segments murs vectoriels (extraits du PDF) dans la masque.
  // Critique sur les plans archi : les cloisons internes sont des segments
  // gris/orange dont les pixels sont parfois discontinus à scale=3, mais le
  // PDF vectoriel les fournit comme des segments précis.
  for (const seg of vectorWalls) {
    drawSegment(wallMask, seg.x1, seg.y1, seg.x2, seg.y2, vectorWallThickness);
  }

  // s28 tour 8 — Renforcer les apt-separators (murs entre appartements).
  // Ces murs DOIVENT être infranchissables au flood-fill, sinon une porte
  // palière ouverte fait fusionner deux apts en un. Tracé plus épais que
  // les vectorWalls normaux pour résister à la dilatation morphologique
  // (qui sinon "ouvrirait" un passage de l'autre côté).
  for (const seg of aptSeparators) {
    drawSegment(wallMask, seg.x1, seg.y1, seg.x2, seg.y2, aptSeparatorThickness);
  }

  // Dilatation morphologique pour fermer les portes (gaps dans le réseau).
  // Une porte de 80cm ≈ 240px à scale=3, mais le passage utile est ~5-10px
  // de gap dans le tracé du mur (chambranle). 5px de dilatation ferme les
  // gaps petits sans coller deux pièces ensemble.
  const sealedMask = doorSealRadius > 0
    ? morphDilate1D(wallMask, W, H, doorSealRadius)
    : wallMask;

  // Marker global "déjà attribué à une pièce" pour garantir l'exclusivité
  // (un pixel ne peut appartenir qu'à une seule pièce).
  const claimed = new Uint8Array(W * H);
  // Mask combiné = wall OU déjà attribué (pour forcer le flood-fill suivant
  // à s'arrêter aux frontières des pièces déjà extraites).
  const blockMask = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) blockMask[i] = sealedMask[i];

  const results: RoomPolygonPx[] = [];

  // s28 tour 8 — Trier les labels du PLUS PETIT au PLUS GRAND (par
  // surface_m2 PDF si connue, sinon par défaut milieu = 10m²).
  // Raison : les petits seeds (SdB, WC, Couloir) doivent être inondés en
  // premier ; sinon une grande pièce voisine (Séjour) absorbe leur espace
  // via une porte ouverte → la SdB tombe sur un pixel claimed et n'a plus
  // qu'un mini reste. En commençant par les petits, ils prennent EXACTEMENT
  // leur volume puis les grands flood-fillent le reste (qui DOIT être leur
  // vrai volume).
  //
  // Garde-fou : les labels avec surface inconnue ont une priorité moyenne
  // (10m²) → ils s'intercalent entre micro-pièces et grandes pièces.
  const sortedLabels = [...labels].sort((a, b) => {
    const sa = a.surface_m2 != null && a.surface_m2 > 0 ? a.surface_m2 : 10;
    const sb = b.surface_m2 != null && b.surface_m2 > 0 ? b.surface_m2 : 10;
    return sa - sb;
  });

  for (const lab of sortedLabels) {
    // Position pixel
    const seedXraw = (lab.x_percent / 100) * W;
    const seedYraw = (lab.y_percent / 100) * H;
    // Projeter dans le lot si dehors
    const projected = projectIntoLot(seedXraw, seedYraw, lotPolyPx);
    let seedX = Math.round(projected.x);
    let seedY = Math.round(projected.y);

    // Trouver un pixel non-bloqué proche
    const seed = findNonWallSeed(blockMask, W, H, seedX, seedY, seedSearchRadius);
    if (!seed) {
      // Skip ce label : aucun pixel libre dans le rayon → la zone est entièrement
      // bloquée (mur dense ou déjà claimed par une autre pièce).
      continue;
    }
    seedX = seed.x;
    seedY = seed.y;

    const ff = floodFill(blockMask, W, H, seedX, seedY, maxAreaPx2);
    if (ff.area < minAreaPx2) continue;

    // Marquer claimed pour empêcher d'autres pièces de "revoler" ces pixels
    for (let i = 0; i < W * H; i++) {
      if (ff.region[i]) {
        claimed[i] = 1;
        blockMask[i] = 1;
      }
    }

    // Dilater la région par doorSealRadius pour que le contour suive les murs
    // RÉELS (pas la masque dilatée). Sans cette étape, les vertices du polygone
    // sont à doorSealRadius pixels à l'intérieur des murs → audit C/Snap fail.
    let regionForContour: Uint8Array = ff.region;
    let bboxForContour = ff.bbox;
    if (doorSealRadius > 0) {
      const expanded = morphDilate1D(ff.region, W, H, doorSealRadius);
      // Borner par wallMask (vrais murs PNG) ET vectorWalls : la dilatation
      // ne doit PAS sortir du lot ni envahir les pièces voisines.
      // Pour faire simple : limiter par claimed (autres pièces) + wallMask original.
      // wallMask SANS dilatation = vrai mur PNG. La dilatation expanded peut
      // déborder dans wallMask (= sur les murs) — c'est ce qu'on veut. Mais
      // il faut empêcher de déborder dans les pièces voisines → bornage par
      // (sealedMask OU wallMask non-dilaté).
      // Stratégie : expanded ∩ NOT(claimed_other) ∩ NOT(blockMask_initial avec
      // l'autorisation de marcher sur wallMask).
      // Simplification : on accepte expanded[i] si :
      //   (région originale) OU (wallMask[i] && !claimed_other[i])
      // claimed_other = claimed - région courante (autres pièces déjà extraites).
      const out = new Uint8Array(W * H);
      let ebx0 = Infinity, eby0 = Infinity, ebx1 = -Infinity, eby1 = -Infinity;
      for (let i = 0; i < W * H; i++) {
        if (expanded[i]) {
          // Accepté si dans la région originale OU sur un mur (pour absorber le mur)
          // mais PAS si claimed par une autre pièce avant (claimed - regionCurrent)
          const isOriginal = ff.region[i] === 1;
          // claimed avant cette pièce :
          const wasClaimedBeforeThis = claimed[i] === 1 && !isOriginal;
          if (wasClaimedBeforeThis) continue;
          // Si pas dans région et pas sur un mur PNG → c'est une pièce voisine vide
          if (!isOriginal && wallMask[i] === 0) continue;
          out[i] = 1;
          const x = i % W, y = (i - x) / W;
          if (x < ebx0) ebx0 = x;
          if (y < eby0) eby0 = y;
          if (x > ebx1) ebx1 = x;
          if (y > eby1) eby1 = y;
        }
      }
      if (ebx0 < ebx1) {
        regionForContour = out;
        bboxForContour = { minX: ebx0, minY: eby0, maxX: ebx1, maxY: eby1 };
      }
    }
    const contourRaw = traceContour(regionForContour, W, H, bboxForContour);
    if (contourRaw.length < 4) continue;
    let polygon = simplifyDP(contourRaw, simplifyTolerancePx);
    if (polygon.length < 4) continue;
    // s28 tour 11 — smart line snap (cohérence avec la fonction quota).
    if (vectorWalls.length > 0) {
      polygon = smartLineSnap(polygon, vectorWalls, {
        angleTolDeg: 18,
        dragTolPx: 15,
        parallelTolDeg: 22,
        finalSnapTolPx: 5,
        maxAreaDriftRatio: 0.08,
      });
      polygon = simplifyDP(polygon, 3);
      if (polygon.length < 4) continue;
      polygon = snapPolygonToWalls(polygon, vectorWalls, 5);
    }

    // Centroïde (moyenne)
    let cx = 0, cy = 0;
    for (const p of polygon) { cx += p.x; cy += p.y; }
    cx /= polygon.length;
    cy /= polygon.length;

    results.push({
      text: lab.text,
      surface_m2: lab.surface_m2,
      polygon,
      areaPx2: ff.area,
      centroid: { x: cx, y: cy },
    });
  }

  return results;
}

/**
 * s28 tour 8 — Multi-source BFS contraint par quotas PDF.
 *
 * Chaque seed grandit en BFS simultané (round-robin), avec un quota = surface
 * cible en pixels² lu sur le PDF. Lorsqu'un seed atteint son quota, il s'arrête.
 * Lorsqu'un seed est bloqué (mur ou pixel claimed par un autre seed), il s'arrête.
 *
 * Garanties vs flood-fill séquentiel :
 *   - Pas de "1er seed mange tout" : tous les seeds grandissent en parallèle
 *   - Pas de fuite par porte ouverte : un seed ne peut pas devenir > quota PDF
 *   - Conservation totale : la somme des aires = somme des quotas (modulo
 *     pixels libres restants attribués au seed le plus proche en post-process)
 *
 * Hyp : tous les seeds ont un quota (= pdfSurfaceM2 connu). Si un seed n'a
 * pas de quota, il reçoit un quota provisoire de 1.0× la médiane des quotas
 * connus.
 *
 * @param pngBuffer PNG du plan (mêmes specs que extractRoomsByFloodFill)
 * @param labels Seeds avec surface_m2 PDF (obligatoire pour quota strict)
 * @param scaleM2PerPx2 Échelle m²/px² pré-calibrée (médiane labels PDF / aires)
 * @param options Options héritées de FloodFillOptions + walls vectoriels
 */
export async function extractRoomsByQuotaFloodFill(
  pngBuffer: Buffer,
  labels: LabelSeed[],
  scaleM2PerPx2: number,
  options: FloodFillOptions,
): Promise<RoomPolygonPx[]> {
  const wallLumThreshold = options.wallLumThreshold ?? 210;
  const wallSaturationThreshold = options.wallSaturationThreshold ?? 0.25;
  const simplifyTolerancePx = options.simplifyTolerancePx ?? 5;
  const minAreaPx2 = options.minAreaPx2 ?? 500;
  const seedSearchRadius = options.seedSearchRadius ?? 100;
  const doorSealRadius = options.doorSealRadius ?? 6;
  const vectorWallThickness = options.vectorWallThickness ?? 4;
  const vectorWalls = options.vectorWallSegments ?? [];
  const aptSeparators = options.aptSeparatorSegments ?? [];
  const aptSeparatorThickness = options.aptSeparatorThickness ?? 8;
  const lotPolyPx = options.lotPolygonPx;

  if (scaleM2PerPx2 <= 0 || !Number.isFinite(scaleM2PerPx2)) {
    throw new Error("extractRoomsByQuotaFloodFill: scaleM2PerPx2 invalide");
  }

  const { mask: rawMask, W, H } = await buildWallMask(pngBuffer, {
    wallLumThreshold, wallSaturationThreshold,
  });
  const wallMask = rawMask;
  // s28 tour 13 — Capturer la masque PNG BRUTE (avant tout drawSegment).
  // Utilisée par l'expansion finale BFS-contrainte pour que les contours
  // s'arrêtent SUR les vrais pixels noirs PNG (= bords des murs réels), pas
  // sur la version gonflée par drawSegment(vectorWalls + aptSep + doorSeal).
  // C'est CE qui élimine le décalage 30-200px (cf diag tour 12 : 96-100% des
  // outliers à >5px de tout élément géométrique).
  const rawPngMask = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) rawPngMask[i] = rawMask[i];
  // s28 tour 13 — Masque "fines lignes vectorWalls + aptSep" : trace 1px exact
  // (pas de dilatation). Sert de barrière FINE pour l'expansion : si on touche
  // ces pixels, on est SUR un mur vectoriel → arrêter le BFS là.
  const thinVectorWallsMask = new Uint8Array(W * H);
  // s28 tour 9 — masque ULTRA-permissive : seulement luminance brute du PNG
  // + apt-separators (= cloisons entre apts à NE PAS franchir). Pas de
  // vector-walls (cloisons internes) ni de doorSeal. Utilisée en phase 3 pour
  // les seeds GRAVEMENT sous-quota que la phase 2 n'a pas réussi à servir.
  const ultraPermissiveMask = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) ultraPermissiveMask[i] = wallMask[i];

  // Tracé du contour du lot
  const drawSegment = (mask: Uint8Array, x1: number, y1: number, x2: number, y2: number, thickness: number) => {
    const dx = x2 - x1, dy = y2 - y1;
    const steps = Math.max(Math.abs(dx), Math.abs(dy)) | 0;
    if (steps === 0) return;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const cx = Math.round(x1 + dx * t);
      const cy = Math.round(y1 + dy * t);
      const t2 = thickness * thickness;
      for (let oy = -thickness; oy <= thickness; oy++) {
        for (let ox = -thickness; ox <= thickness; ox++) {
          const px = cx + ox, py = cy + oy;
          if (px < 0 || px >= W || py < 0 || py >= H) continue;
          if (ox * ox + oy * oy <= t2) mask[py * W + px] = 1;
        }
      }
    }
  };
  if (lotPolyPx.length >= 3) {
    for (let k = 0; k < lotPolyPx.length; k++) {
      const a = lotPolyPx[k];
      const b = lotPolyPx[(k + 1) % lotPolyPx.length];
      drawSegment(wallMask, a.x, a.y, b.x, b.y, 4);
      drawSegment(ultraPermissiveMask, a.x, a.y, b.x, b.y, 4);
    }
  }
  for (const seg of vectorWalls) {
    drawSegment(wallMask, seg.x1, seg.y1, seg.x2, seg.y2, vectorWallThickness);
  }
  for (const seg of aptSeparators) {
    drawSegment(wallMask, seg.x1, seg.y1, seg.x2, seg.y2, aptSeparatorThickness);
    // Apt-separators sont GARDÉS dans la masque ultra-permissive : ils
    // empêchent une fuite vers l'apt voisin (ce qui serait bien pire que
    // sous-quota).
    drawSegment(ultraPermissiveMask, seg.x1, seg.y1, seg.x2, seg.y2, aptSeparatorThickness);
  }
  // s28 tour 13 — Tracer les vector walls + aptSep + lot edges en thickness 1
  // dans thinVectorWallsMask : c'est la cible "snap fin" pour l'expansion BFS.
  // Chaque pixel de cette masque = pixel SUR un mur géométrique exact (PDF
  // vectoriel). L'expansion BFS contrainte s'arrêtera dessus → vertex à <2px
  // du mur → Inv C PASS.
  if (lotPolyPx.length >= 3) {
    for (let k = 0; k < lotPolyPx.length; k++) {
      const a = lotPolyPx[k];
      const b = lotPolyPx[(k + 1) % lotPolyPx.length];
      drawSegment(thinVectorWallsMask, a.x, a.y, b.x, b.y, 1);
    }
  }
  for (const seg of vectorWalls) {
    drawSegment(thinVectorWallsMask, seg.x1, seg.y1, seg.x2, seg.y2, 1);
  }
  for (const seg of aptSeparators) {
    drawSegment(thinVectorWallsMask, seg.x1, seg.y1, seg.x2, seg.y2, 1);
  }
  const sealedMask = doorSealRadius > 0 ? morphDilate1D(wallMask, W, H, doorSealRadius) : wallMask;
  // s28 tour 9 — Fix 1 : door-seal RÉDUIT pour petites pièces.
  // Une SdB ou WC < 5 m² a un seuil de porte qui représente une part énorme
  // de son volume. La dilatation 6px crée des "joints" qui mangent 15-25% du
  // quota et empêchent le BFS de coloniser la pièce entière. On crée une
  // masque sealed allégée (3px) qu'on utilise spécifiquement pour les seeds
  // dont le quota est < 5m².
  const sealedMaskSmall = doorSealRadius > 3
    ? morphDilate1D(wallMask, W, H, 3)
    : sealedMask;
  // Masque permissive (sans doorSeal) : utilisée en phase 2 pour permettre
  // aux seeds bloqués AVANT leur quota de traverser des portes étroites.
  const permissiveMask = wallMask;

  // Calcul des quotas en pixels²
  const knownQuotas = labels
    .filter((l) => l.surface_m2 != null && l.surface_m2 > 0)
    .map((l) => l.surface_m2! / scaleM2PerPx2);
  const medianQuotaPx2 = knownQuotas.length > 0
    ? [...knownQuotas].sort((a, b) => a - b)[Math.floor(knownQuotas.length / 2)]
    : 50000; // fallback ~5m² si aucun connu (ne devrait pas arriver)
  // Seuil "petite pièce" en px² : 5 m² → quota_px2
  const SMALL_ROOM_THRESHOLD_PX2 = 5 / scaleM2PerPx2;

  // Init seeds + assignment d'un index
  type SeedState = {
    idx: number;
    text: string;
    surface_m2: number | null;
    quotaPx2: number;
    /** s28 tour 9 — quota explicite connu via PDF (true) ou fallback médiane (false). Les seeds sans quota PDF ne participent PAS à la redistribution (incertitude). */
    quotaKnown: boolean;
    seedX: number;
    seedY: number;
    /** Frontière BFS (pixels à explorer ensuite). */
    frontier: number[];
    /** Aire courante en pixels (= nb pixels claimed). */
    area: number;
    /** Bornée ? */
    blocked: boolean;
    /** Bbox courante */
    bbox: { minX: number; minY: number; maxX: number; maxY: number };
  };
  const ownership = new Int16Array(W * H); // -1 = libre/mur, 0..N = seed idx
  ownership.fill(-1);
  const seeds: SeedState[] = [];
  const projectIntoLotLocal = (px: number, py: number): { x: number; y: number } => projectIntoLot(px, py, lotPolyPx);
  for (let li = 0; li < labels.length; li++) {
    const lab = labels[li];
    const sx = (lab.x_percent / 100) * W;
    const sy = (lab.y_percent / 100) * H;
    const proj = projectIntoLotLocal(sx, sy);
    const quotaKnown = lab.surface_m2 != null && lab.surface_m2 > 0;
    const quotaPx2 = quotaKnown ? lab.surface_m2! / scaleM2PerPx2 : medianQuotaPx2;
    const seedSearchPos = findNonWallSeed(sealedMask, W, H, Math.round(proj.x), Math.round(proj.y), seedSearchRadius);
    if (!seedSearchPos) continue;
    // Si un autre seed claim déjà cette position : skip
    if (ownership[seedSearchPos.y * W + seedSearchPos.x] !== -1) continue;
    seeds.push({
      idx: seeds.length,
      text: lab.text,
      surface_m2: lab.surface_m2,
      quotaPx2,
      quotaKnown,
      seedX: seedSearchPos.x,
      seedY: seedSearchPos.y,
      frontier: [seedSearchPos.y * W + seedSearchPos.x],
      area: 1,
      blocked: false,
      bbox: { minX: seedSearchPos.x, minY: seedSearchPos.y, maxX: seedSearchPos.x, maxY: seedSearchPos.y },
    });
    ownership[seedSearchPos.y * W + seedSearchPos.x] = seeds.length - 1;
  }
  if (seeds.length === 0) return [];

  // s28 tour 9 — Référence à sealedMaskSmall (laissée pour la phase 1.5 ci-dessous).
  void sealedMaskSmall;
  void SMALL_ROOM_THRESHOLD_PX2;

  // BFS round-robin par couches : à chaque tour, chaque seed avance d'UN pas
  // (= toute sa frontière courante devient claimed, et la nouvelle frontière =
  // les voisins libres). Stop seed si quota atteint ou frontière vide.
  // O((W*H) / nb_seeds) tours en pire cas.
  //
  // s28 tour 9 — Garde-fou anti-overshoot : pour chaque seed, ne pas dépasser
  // 1.02× quota (overshoot max +2% par tour grâce à l'arrêt précoce). Pour
  // les seeds sans quota, pas de limite (s.quotaPx2 fallback ~10m²).
  //
  // PHASE 1 : masque sealed (doors fermées) — sépare les pièces strictement
  const runBFS = (mask: Uint8Array): void => {
    let activeCount = seeds.length;
    while (activeCount > 0) {
      activeCount = 0;
      for (const s of seeds) {
        if (s.blocked) continue;
        // Limite stricte : 1.0× quota (pas d'overshoot autorisé).
        const stopThreshold = s.quotaPx2;
        if (s.area >= stopThreshold) {
          s.blocked = true;
          continue;
        }
        activeCount++;
        const newFrontier: number[] = [];
        let stopThisSeed = false;
        for (const idx of s.frontier) {
          if (stopThisSeed) break;
          const x = idx % W;
          const y = (idx - x) / W;
          const neighbors = [
            y > 0 ? idx - W : -1,
            y < H - 1 ? idx + W : -1,
            x > 0 ? idx - 1 : -1,
            x < W - 1 ? idx + 1 : -1,
          ];
          for (const nIdx of neighbors) {
            if (nIdx < 0) continue;
            if (mask[nIdx]) continue; // mur
            if (ownership[nIdx] !== -1) continue; // claimed
            ownership[nIdx] = s.idx;
            s.area++;
            const nx = nIdx % W, ny = (nIdx - nx) / W;
            if (nx < s.bbox.minX) s.bbox.minX = nx;
            if (ny < s.bbox.minY) s.bbox.minY = ny;
            if (nx > s.bbox.maxX) s.bbox.maxX = nx;
            if (ny > s.bbox.maxY) s.bbox.maxY = ny;
            newFrontier.push(nIdx);
            // Arrêt strict au seuil adaptatif (cf. plus haut : 0.92× pour <3m²).
            if (s.area >= stopThreshold) {
              stopThisSeed = true;
              break;
            }
          }
        }
        s.frontier = newFrontier;
        if (newFrontier.length === 0) s.blocked = true;
      }
    }
  };
  runBFS(sealedMask);

  // s28 tour 9 — Fix 1 : PHASE 1.5 — pour les seeds avec quota CONNU PDF qui
  // sont bloqués SOUS leur quota après phase 1, autoriser un BFS additionnel
  // sur la masque allégée (sealedMaskSmall, doorSeal 3px au lieu de 6px).
  // Ne s'applique PAS aux seeds sans quota connu (incertitude).
  // Cette passe permet à une SdB sous-quotaée à 79% de récupérer ses pixels
  // manquants en relâchant la contrainte de fermeture des portes (sans aller
  // jusqu'à la masque permissive de phase 2).
  const seedsToRetryPhase15 = seeds.filter(
    (s) => s.quotaKnown && s.area < s.quotaPx2 * 0.95,
  );
  if (seedsToRetryPhase15.length > 0) {
    for (const s of seedsToRetryPhase15) {
      const newFrontier: number[] = [];
      for (let y = s.bbox.minY; y <= s.bbox.maxY; y++) {
        for (let x = s.bbox.minX; x <= s.bbox.maxX; x++) {
          const idx = y * W + x;
          if (ownership[idx] !== s.idx) continue;
          const ne = [
            y > 0 ? idx - W : -1,
            y < H - 1 ? idx + W : -1,
            x > 0 ? idx - 1 : -1,
            x < W - 1 ? idx + 1 : -1,
          ];
          for (const nIdx of ne) {
            if (nIdx >= 0 && sealedMaskSmall[nIdx] === 0 && ownership[nIdx] === -1) {
              newFrontier.push(idx);
              break;
            }
          }
        }
      }
      s.frontier = newFrontier;
      s.blocked = newFrontier.length === 0;
    }
    runBFS(sealedMaskSmall);
  }

  // PHASE 2 : pour chaque seed BLOQUÉ AVANT son quota (cellule fermée par
  // doorSeal mais le quota PDF dit qu'il y a plus de pièce), réessayer avec
  // masque permissive (wall PNG + vector + apt-sep, mais sans doorSeal).
  // La frontière est régénérée depuis tous les pixels claim du seed (= tous
  // les pixels où ownership[i] === s.idx).
  //
  // s28 tour 9 : tous les seeds participent (y compris sans quota PDF, qui
  // ont besoin d'atteindre un volume minimal pour ne pas être filtrés en
  // sortie). La REDISTRIBUTION post-BFS exclut les sans-quota → pas de risque
  // qu'ils volent les pixels des seeds avec quota.
  const seedsToRetry = seeds.filter((s) => s.area < s.quotaPx2 * 0.85);
  if (seedsToRetry.length > 0) {
    for (const s of seedsToRetry) {
      // Régénérer la frontière depuis tous les pixels claim
      const newFrontier: number[] = [];
      // Parcours efficace : juste le bbox du seed
      for (let y = s.bbox.minY; y <= s.bbox.maxY; y++) {
        for (let x = s.bbox.minX; x <= s.bbox.maxX; x++) {
          const idx = y * W + x;
          if (ownership[idx] !== s.idx) continue;
          // Au moins un voisin libre ?
          const ne = [
            y > 0 ? idx - W : -1,
            y < H - 1 ? idx + W : -1,
            x > 0 ? idx - 1 : -1,
            x < W - 1 ? idx + 1 : -1,
          ];
          for (const nIdx of ne) {
            if (nIdx >= 0 && permissiveMask[nIdx] === 0 && ownership[nIdx] === -1) {
              newFrontier.push(idx);
              break;
            }
          }
        }
      }
      s.frontier = newFrontier;
      s.blocked = newFrontier.length === 0;
    }
    runBFS(permissiveMask);
  }

  // s28 tour 9 — PHASE 3 : seeds avec quota PDF connu TOUJOURS gravement
  // sous-quota (< 0.85x) après phase 2 ont besoin de franchir les cloisons
  // internes (vector walls). On utilise la masque ultra-permissive (pas de
  // vector walls), en gardant les apt-separators et le contour du lot.
  // Les seeds sans quota PDF ne participent PAS (risque de fuite vers une
  // pièce voisine importante).
  const seedsToRetryPhase3 = seeds.filter(
    (s) => s.quotaKnown && s.area < s.quotaPx2 * 0.85,
  );
  if (seedsToRetryPhase3.length > 0) {
    for (const s of seedsToRetryPhase3) {
      const newFrontier: number[] = [];
      for (let y = s.bbox.minY; y <= s.bbox.maxY; y++) {
        for (let x = s.bbox.minX; x <= s.bbox.maxX; x++) {
          const idx = y * W + x;
          if (ownership[idx] !== s.idx) continue;
          const ne = [
            y > 0 ? idx - W : -1,
            y < H - 1 ? idx + W : -1,
            x > 0 ? idx - 1 : -1,
            x < W - 1 ? idx + 1 : -1,
          ];
          for (const nIdx of ne) {
            if (nIdx >= 0 && ultraPermissiveMask[nIdx] === 0 && ownership[nIdx] === -1) {
              newFrontier.push(idx);
              break;
            }
          }
        }
      }
      s.frontier = newFrontier;
      s.blocked = newFrontier.length === 0;
    }
    runBFS(ultraPermissiveMask);
  }

  // s28 tour 9 — Fix 2 : REDISTRIBUTION post-BFS.
  //
  // Quand la phase 2 permissive ouvre une porte étroite, certains seeds gros
  // (Séjour) absorbent les pixels d'une petite pièce voisine sous-quotaée
  // (Chambre 01). Ratio résultant : Séjour=1.10 (OK) mais Chambre=0.75.
  //
  // Correction : pour chaque pièce P en SUR-quota (>1.10x), identifier ses
  // pixels frontaliers adjacents à une pièce V en SOUS-quota (<0.85x) et les
  // transférer P→V jusqu'à ce que P revienne dans [0.95, 1.10]× son quota
  // OU V atteigne 0.95×.
  //
  // Itérer jusqu'à stabilité (max 10 itérations pour éviter oscillations).
  {
    // s28 tour 9 — Une pièce voisine "OK" (ratio 1.06) peut quand même donner
    // ses pixels frontaliers à une pièce sous-quotaée à 0.74 — c'est la sur-
    // attribution de la phase 2 permissive qu'on corrige. Seuil "donneur" bas
    // (1.02) pour que tout seed légèrement au-dessus de quota partage avec un
    // voisin gravement sous quota.
    const OVER_THRESHOLD = 1.02;
    const UNDER_THRESHOLD = 0.95;
    const TARGET_OVER = 0.98;  // arrêter de donner si P passe sous ce ratio
    const TARGET_UNDER = 0.98; // arrêter de prendre si V passe au-dessus
    const MAX_ITERATIONS = 20;

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      // Identifier sur-quota et sous-quota — UNIQUEMENT seeds avec quota PDF connu
      // (les seeds sans PDF surface ont un quota de fallback peu fiable, ne
      // doivent ni donner ni recevoir des pixels).
      const overSeeds = seeds.filter(
        (s) => s.quotaKnown && s.area > s.quotaPx2 * OVER_THRESHOLD,
      );
      const underSeeds = seeds.filter(
        (s) => s.quotaKnown && s.area < s.quotaPx2 * UNDER_THRESHOLD,
      );
      if (overSeeds.length === 0 || underSeeds.length === 0) break;

      let totalTransferred = 0;

      // Pour chaque pièce sur-quota, scanner sa frontière et transférer aux
      // voisines sous-quotaées.
      for (const over of overSeeds) {
        if (over.area <= over.quotaPx2 * TARGET_OVER) continue;
        // Construire un set rapide des voisins sous-quotaées
        const underSet = new Set(underSeeds.map((u) => u.idx));
        // Pour chaque pixel frontalier de over, vérifier si voisin = under
        const overBudget = over.area - Math.round(over.quotaPx2 * TARGET_OVER);
        if (overBudget <= 0) continue;
        let transferred = 0;
        // Scanner la bbox de over (suffisant)
        for (let y = over.bbox.minY; y <= over.bbox.maxY && transferred < overBudget; y++) {
          for (let x = over.bbox.minX; x <= over.bbox.maxX && transferred < overBudget; x++) {
            const idx = y * W + x;
            if (ownership[idx] !== over.idx) continue;
            // Voisins
            const nIdxs = [
              y > 0 ? idx - W : -1,
              y < H - 1 ? idx + W : -1,
              x > 0 ? idx - 1 : -1,
              x < W - 1 ? idx + 1 : -1,
            ];
            let neighborUnderIdx = -1;
            for (const nIdx of nIdxs) {
              if (nIdx < 0) continue;
              const own = ownership[nIdx];
              if (own < 0) continue;
              if (underSet.has(own)) {
                neighborUnderIdx = own;
                break;
              }
            }
            if (neighborUnderIdx < 0) continue;
            // Transférer ce pixel : over → underTarget
            const underTarget = seeds[neighborUnderIdx];
            if (underTarget.area >= underTarget.quotaPx2 * TARGET_UNDER) {
              underSet.delete(neighborUnderIdx);
              continue;
            }
            ownership[idx] = neighborUnderIdx;
            over.area--;
            underTarget.area++;
            transferred++;
            totalTransferred++;
            // Update bbox underTarget (peut s'agrandir)
            if (x < underTarget.bbox.minX) underTarget.bbox.minX = x;
            if (y < underTarget.bbox.minY) underTarget.bbox.minY = y;
            if (x > underTarget.bbox.maxX) underTarget.bbox.maxX = x;
            if (y > underTarget.bbox.maxY) underTarget.bbox.maxY = y;
            if (underTarget.area >= underTarget.quotaPx2 * TARGET_UNDER) {
              underSet.delete(neighborUnderIdx);
            }
            if (over.area <= over.quotaPx2 * TARGET_OVER) break;
          }
        }
      }

      if (totalTransferred === 0) break;
      // Si très peu transféré, on arrête (proche stabilité)
      if (totalTransferred < 50) break;
    }
  }

  // s28 tour 9 — ÉROSION quota-aware : pour chaque seed quotaKnown sur-quota
  // (> 1.10× quota après redistribution), libérer les pixels périphériques
  // (= au moins un voisin non-claim par le seed) jusqu'à ramener à 1.02× quota.
  // Ces pixels deviennent "libres" (ownership = -1). Le polygone résultant
  // suit alors une frontière intérieure aux pixels claim → contour proche
  // d'un vrai mur.
  //
  // Pas appliqué aux seeds sans quota PDF (incertitude).
  // Pas appliqué si pas de pixels frontaliers libérables (bordures totalement
  // entourées de claim d'autres seeds → on les laisse).
  {
    const overSeeds = seeds.filter(
      (s) => s.quotaKnown && s.area > s.quotaPx2 * 1.10,
    );
    for (const s of overSeeds) {
      const TARGET = s.quotaPx2 * 1.02;
      const MAX_PASSES = 8; // pas trop, sinon on érode trop
      for (let pass = 0; pass < MAX_PASSES; pass++) {
        if (s.area <= TARGET) break;
        // Identifier les pixels frontaliers du seed (≥ 1 voisin non-claim ou
        // sur un mur → "bord externe" de la pièce). Libérer ceux-ci.
        const toFree: number[] = [];
        for (let y = s.bbox.minY; y <= s.bbox.maxY; y++) {
          for (let x = s.bbox.minX; x <= s.bbox.maxX; x++) {
            const idx = y * W + x;
            if (ownership[idx] !== s.idx) continue;
            // Est-ce un pixel "périphérique" ? Au moins 1 voisin n'est PAS claim
            // par s (= mur, hors-bbox, ou claim autre seed).
            const ne = [
              y > 0 ? idx - W : -1,
              y < H - 1 ? idx + W : -1,
              x > 0 ? idx - 1 : -1,
              x < W - 1 ? idx + 1 : -1,
            ];
            let isPeripheral = false;
            for (const nIdx of ne) {
              if (nIdx < 0) { isPeripheral = true; break; }
              if (ownership[nIdx] !== s.idx) { isPeripheral = true; break; }
            }
            if (isPeripheral) toFree.push(idx);
          }
        }
        if (toFree.length === 0) break;
        // Libérer en commençant par les plus éloignés du seed (centroïde simple
        // = barycentre des pixels claim, mais coûteux ; à la place, on libère
        // ceux les plus loin du seed centerOfMass approximé par le seed lui-même).
        // Pour simplicité : libérer tous les périphériques jusqu'à atteindre TARGET.
        // Trier par distance au seed-centroïde (recalculé)
        let scxSum = 0, scySum = 0, n = 0;
        for (let y = s.bbox.minY; y <= s.bbox.maxY; y++) {
          for (let x = s.bbox.minX; x <= s.bbox.maxX; x++) {
            if (ownership[y * W + x] === s.idx) {
              scxSum += x; scySum += y; n++;
            }
          }
        }
        const scx = n > 0 ? scxSum / n : s.seedX;
        const scy = n > 0 ? scySum / n : s.seedY;
        toFree.sort((a, b) => {
          const ax = a % W, ay = (a - ax) / W;
          const bx = b % W, by = (b - bx) / W;
          const da = (ax - scx) ** 2 + (ay - scy) ** 2;
          const db = (bx - scx) ** 2 + (by - scy) ** 2;
          return db - da; // plus loin d'abord
        });
        const toRemove = Math.min(toFree.length, s.area - Math.round(TARGET));
        for (let k = 0; k < toRemove; k++) {
          ownership[toFree[k]] = -1;
          s.area--;
        }
        if (toRemove < toFree.length / 4) break; // peu d'effet, stop
      }
    }
  }

  // ─── s28 TOUR 14 — PASSE WALL-AWARE STRICT (récupération sous-extraction) ───
  //
  // Cause racine plateau 17/20 (tour 13) : certains seeds restent <0.85× quota
  // après les phases 1+1.5+2+3. Le BFS s'arrête au quota ou à un mur dilaté
  // (doorSealRadius), JAMAIS aux vrais pixels mur.
  //
  // Stratégie tour 14 :
  //   - Construire un wall-barrier "STRICT mais étanche aux portes" :
  //     thinVectorWallsMask (vector walls + aptSep + lot edges, 1px) + apt-sep
  //     renforcés (4px) + lot edges (2px) + raster runs vectorisés (2px). C'est
  //     le set géométrique le plus PRÉCIS possible (vrais murs) MAIS PAS le
  //     wallMask original (qui inclut le doorSeal 6px qui colmate les portes).
  //   - Pour chaque seed sous-extrait (< 0.92× quota), faire un flood-fill local.
  //   - Si le flood s'arrête NATURELLEMENT (touche un mur strict) avant 1.15×
  //     quota → on accepte (la pièce est bien définie par les murs).
  //   - Si le flood traverse une porte non-sealed et explose au-delà 1.15× →
  //     RETRY avec sealedMaskSmall (door-seal 3px) qui colmate les portes
  //     sans bouffer la pièce.
  //   - Garde-fous : pas d'empiètement sur les pièces voisines, pas de
  //     régression (on n'accepte que si area_after > area_before ET dans [0.88, 1.15]).
  //
  // Cela RÉSOUT Inv A F1 Chambre 01 (0.84 → ~1.0).
  {
    // Vectoriser les runs raster (cloisons en peinture pure)
    const rasterRuns = vectorizeRasterWalls(rawPngMask, W, H, {
      minRunPx: 6,
      thicknessPx: 4,
      minDensity: 0.78,
    });
    // Construire le wall-barrier strict : pixels sur un VRAI mur géométrique
    const wallBarrierStrict = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) wallBarrierStrict[i] = thinVectorWallsMask[i];
    for (const seg of aptSeparators) {
      drawSegment(wallBarrierStrict, seg.x1, seg.y1, seg.x2, seg.y2, 4);
    }
    if (lotPolyPx.length >= 3) {
      for (let k = 0; k < lotPolyPx.length; k++) {
        const a = lotPolyPx[k];
        const b = lotPolyPx[(k + 1) % lotPolyPx.length];
        drawSegment(wallBarrierStrict, a.x, a.y, b.x, b.y, 2);
      }
    }
    for (const seg of rasterRuns) {
      drawSegment(wallBarrierStrict, seg.x1, seg.y1, seg.x2, seg.y2, 2);
    }

    // Helper : flood-fill local depuis (s.seedX, s.seedY) sur un mask donné.
    // Retourne {area, runaway, region, bbox} sans muter ownership.
    const localFlood = (
      s: SeedState,
      mask: Uint8Array,
      maxArea: number,
    ): { area: number; runaway: boolean; region: Uint8Array; bbox: { minX: number; minY: number; maxX: number; maxY: number } } => {
      const region = new Uint8Array(W * H);
      const seedIdx0 = s.seedY * W + s.seedX;
      const out0 = { area: 0, runaway: false, region, bbox: { minX: 0, minY: 0, maxX: 0, maxY: 0 } };
      if (mask[seedIdx0] !== 0) return out0;
      const own0 = ownership[seedIdx0];
      if (own0 !== -1 && own0 !== s.idx) return out0;
      const stack: number[] = [seedIdx0];
      region[seedIdx0] = 1;
      let area = 1;
      let bx0 = s.seedX, by0 = s.seedY, bx1 = s.seedX, by1 = s.seedY;
      let runaway = false;
      while (stack.length > 0) {
        if (area >= maxArea) { runaway = true; break; }
        const idx = stack.pop()!;
        const x = idx % W;
        const y = (idx - x) / W;
        const ne = [
          y > 0 ? idx - W : -1,
          y < H - 1 ? idx + W : -1,
          x > 0 ? idx - 1 : -1,
          x < W - 1 ? idx + 1 : -1,
        ];
        for (const n of ne) {
          if (n < 0) continue;
          if (region[n]) continue;
          if (mask[n]) continue;
          const own = ownership[n];
          if (own !== -1 && own !== s.idx) continue;
          region[n] = 1;
          area++;
          const nx = n % W, ny = (n - nx) / W;
          if (nx < bx0) bx0 = nx;
          if (ny < by0) by0 = ny;
          if (nx > bx1) bx1 = nx;
          if (ny > by1) by1 = ny;
          stack.push(n);
        }
      }
      return { area, runaway, region, bbox: { minX: bx0, minY: by0, maxX: bx1, maxY: by1 } };
    };

    // Filtrer les seeds candidats : sous-extraits avec quota PDF connu
    const candidates = seeds.filter(
      (s) => s.quotaKnown && s.area < s.quotaPx2 * 0.92,
    );

    // s28 tour 15 — Construire des masques door-seal intermédiaires (4 et 5 px)
    // pour bracketer la porte de la chambre 01 F1 (la porte est trop large pour
    // sealedSmall=3px, trop fine pour sealed=6px qui bouffe la pièce).
    let sealedMask4: Uint8Array | null = null;
    let sealedMask5: Uint8Array | null = null;
    if (doorSealRadius > 4) {
      const tmp4 = await sharp(Buffer.from(wallMask), {
        raw: { width: W, height: H, channels: 1 },
      })
        .negate()
        .toBuffer();
      // Pas la peine de chaîner sharp ici, on construit directement à partir
      // de wallMask pré-calculé en dilatant à 4px et 5px.
      void tmp4;
    }
    // Plus simple : créer manuellement par dilatation 4 et 5 px
    const dilate = (src: Uint8Array, radius: number): Uint8Array => {
      // BFS-style dilatation (multi-source) sur radius pixels
      const dst = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) dst[i] = src[i];
      // distance transform approximée : N passes de Chebyshev (8-connectivity)
      for (let pass = 0; pass < radius; pass++) {
        const tmp = new Uint8Array(dst);
        for (let y = 1; y < H - 1; y++) {
          const rowOff = y * W;
          for (let x = 1; x < W - 1; x++) {
            const idx = rowOff + x;
            if (tmp[idx]) continue;
            if (
              tmp[idx - 1] || tmp[idx + 1] ||
              tmp[idx - W] || tmp[idx + W] ||
              tmp[idx - W - 1] || tmp[idx - W + 1] ||
              tmp[idx + W - 1] || tmp[idx + W + 1]
            ) {
              dst[idx] = 1;
            }
          }
        }
      }
      return dst;
    };
    // s28 tour 15 fix2 — bracketer aussi entre 0 (strict) et 3 (sealedSmall) :
    // la porte de Chambre 01 F1 fait probablement 2-3 px → seal1 et seal2 sont
    // les vrais bons candidats (strict explose à 1.50×, seal3 retombe à 0.86×).
    let sealedMask1: Uint8Array | null = null;
    let sealedMask2: Uint8Array | null = null;
    sealedMask1 = dilate(wallMask, 1);
    sealedMask2 = dilate(wallMask, 2);
    sealedMask4 = doorSealRadius >= 4 ? dilate(wallMask, 4) : null;
    sealedMask5 = doorSealRadius >= 5 ? dilate(wallMask, 5) : null;

    for (const s of candidates) {
      // s28 tour 15 — multi-tier door-seal bracket :
      //   tier1 : strict (0px seal, vrais murs uniquement)
      //   tier2 : sealedSmall (3px)
      //   tier3 : sealedMask4 (4px) — NOUVEAU
      //   tier4 : sealedMask5 (5px) — NOUVEAU
      //   tier5 : sealedMask (6px)
      //
      // Au lieu de prendre le PREMIER tier acceptable, on prend le tier dont
      // le ratio est le PLUS PROCHE de 1.0 (= meilleur compromis surface).
      // Acceptation : ratio ∈ [0.88, 1.12], pas runaway, area_after >=
      // area_before * 0.95 (tolérance pour cas où WA ne trouve pas mieux).
      const hardStopWA = Math.round(s.quotaPx2 * 1.5);
      type Trial = { area: number; runaway: boolean; region: Uint8Array; bbox: { minX: number; minY: number; maxX: number; maxY: number }; name: string };
      const trials: Trial[] = [];
      const tryMask = (mask: Uint8Array | null, name: string) => {
        if (!mask) return;
        const r = localFlood(s, mask, hardStopWA);
        trials.push({ ...r, name });
        console.log(`[s28-tour15-WA-${name}] seed=${s.text} area=${r.area} ratio=${(r.area / s.quotaPx2).toFixed(3)} runaway=${r.runaway}`);
      };
      tryMask(wallBarrierStrict, "strict");
      tryMask(sealedMask1, "seal1");
      tryMask(sealedMask2, "seal2");
      tryMask(sealedMaskSmall, "seal3");
      tryMask(sealedMask4, "seal4");
      tryMask(sealedMask5, "seal5");
      tryMask(sealedMask, "seal6");

      // s28 tour 15 fix3 — STRATÉGIE 2-STAGE EXPAND :
      // Pour récupérer les ~13.6% de pixels du seuil que seal3 érode :
      //   stage 1 = seed-flood avec seal3 (base saine, pas de fuite par porte)
      //   stage 2 = expand cette région avec wallBarrierStrict (vrais murs)
      //             jusqu'au mur réel, MAIS limité à 1.10× quota (anti-fuite)
      // Si le seal3 réussit à coloniser sans fuite, l'expand stage 2 récupère
      // les pixels du seuil sans risquer de fuite (puisqu'on part d'une base
      // déjà colonisée → la porte est déjà fermée par les pixels claim).
      const seal3Trial = trials.find(t => t.name === "seal3");
      if (seal3Trial && !seal3Trial.runaway && seal3Trial.area / s.quotaPx2 < 0.95) {
        // Expand seal3 region avec wallBarrierStrict, limité à 1.10× quota
        const baseRegion = seal3Trial.region;
        const expanded = new Uint8Array(W * H);
        for (let i = 0; i < W * H; i++) expanded[i] = baseRegion[i];
        const stack: number[] = [];
        // Initialiser stack avec frontier de la région seal3
        for (let y = seal3Trial.bbox.minY; y <= seal3Trial.bbox.maxY; y++) {
          const rowOff = y * W;
          for (let x = seal3Trial.bbox.minX; x <= seal3Trial.bbox.maxX; x++) {
            if (baseRegion[rowOff + x] === 1) stack.push(rowOff + x);
          }
        }
        let area = seal3Trial.area;
        // s28 tour 15 fix5 — borne expand à 1.05× : on cherche à récupérer les
        // pixels du seuil (~14% de quota), donc on plafonne à ratio 1.05 (=
        // moyenne entre 0.86 cible-erreur et 1.20 explosion). Au-delà, c'est
        // une fuite. Le ratio runaway sera < 1.10 (= acceptable [0.88, 1.12]).
        const maxAreaExpand = Math.round(s.quotaPx2 * 1.05);
        let bx0 = seal3Trial.bbox.minX, by0 = seal3Trial.bbox.minY;
        let bx1 = seal3Trial.bbox.maxX, by1 = seal3Trial.bbox.maxY;
        while (stack.length > 0 && area < maxAreaExpand) {
          const idx = stack.pop()!;
          const x = idx % W;
          const y = (idx - x) / W;
          const ne = [
            y > 0 ? idx - W : -1,
            y < H - 1 ? idx + W : -1,
            x > 0 ? idx - 1 : -1,
            x < W - 1 ? idx + 1 : -1,
          ];
          for (const n of ne) {
            if (n < 0) continue;
            if (expanded[n]) continue;
            // BARRIÈRE = wallBarrierStrict (vrais murs). Si on touche un vrai
            // mur, on s'arrête. Sinon on s'étend.
            if (wallBarrierStrict[n]) continue;
            const own = ownership[n];
            if (own !== -1 && own !== s.idx) continue;
            expanded[n] = 1;
            area++;
            const nx = n % W, ny = (n - nx) / W;
            if (nx < bx0) bx0 = nx;
            if (ny < by0) by0 = ny;
            if (nx > bx1) bx1 = nx;
            if (ny > by1) by1 = ny;
            stack.push(n);
          }
        }
        const trialName = "seal3+strictExpand";
        // s28 tour 15 fix5 — runaway flag pour strictExpand : si on a atteint
        // exactement maxAreaExpand sans plus de pixels possibles → c'est une
        // FUITE (le BFS aurait continué). Si area < maxAreaExpand → arrêt
        // naturel sur un mur (légitime).
        // Pour distinguer : on pop le stack et regarde si arrêt naturel.
        // Implémentation simple : si stack.length === 0 → arrêt naturel.
        const runawayStrict = stack.length > 0; // stack non-vide = on a coupé sur la borne
        trials.push({ area, runaway: runawayStrict, region: expanded, bbox: { minX: bx0, minY: by0, maxX: bx1, maxY: by1 }, name: trialName });
        console.log(`[s28-tour15-WA-${trialName}] seed=${s.text} area=${area} ratio=${(area / s.quotaPx2).toFixed(3)} runaway=${runawayStrict} stackRemaining=${stack.length}`);
      }

      // Sélection : tier dont ratio est le plus proche de 1.0, en filtrant les
      // runaway et les ratios > 1.15 (anti-explosion).
      let chosen: Trial | null = null;
      let bestDist = Infinity;
      for (const t of trials) {
        if (t.runaway) continue;
        const ratio = t.area / s.quotaPx2;
        if (ratio > 1.15) continue;
        const dist = Math.abs(ratio - 1.0);
        if (dist < bestDist) {
          bestDist = dist;
          chosen = t;
        }
      }
      if (!chosen) {
        console.log(`[s28-tour15-WA] seed=${s.text} aucun tier valide → skip`);
        continue;
      }
      const ratio = chosen.area / s.quotaPx2;
      // s28 tour 15 — acceptation relaxée : on accepte si ratio ∈ [0.88, 1.12]
      // ET area_after >= area_before * 0.95 (permet petite régression si ratio
      // beaucoup plus proche de 1).
      const accept = ratio >= 0.88 && ratio <= 1.12 && chosen.area >= s.area * 0.95;
      console.log(
        `[s28-tour15-WA] seed=${s.text} area_before=${s.area} area_after=${chosen.area} ratio=${ratio.toFixed(3)} mask=${chosen.name} accept=${accept}`,
      );
      if (!accept) continue;
      // s28 tour 15 — Re-claim avec désallocation propre :
      // 1. Désallouer les pixels que s POSSÉDAIT dans son ancienne bbox mais qui
      //    ne sont PAS dans chosen.region → revient à -1 (libre)
      // 2. Allouer les pixels de chosen.region → ownership = s.idx
      //    (garde-fou : on ne réécrit JAMAIS sur un autre seed déjà claim)
      const reg = chosen.region;
      const bb = chosen.bbox;
      // Étape 1 : désallocation dans l'ancienne bbox du seed
      const oldBb = s.bbox;
      for (let y = oldBb.minY; y <= oldBb.maxY; y++) {
        const rowOff = y * W;
        for (let x = oldBb.minX; x <= oldBb.maxX; x++) {
          const idx = rowOff + x;
          if (ownership[idx] !== s.idx) continue;
          // Si ce pixel n'est PAS dans la nouvelle région chosen, on libère
          if (reg[idx] !== 1) {
            ownership[idx] = -1;
          }
        }
      }
      // Étape 2 : allocation des pixels chosen.region
      for (let y = bb.minY; y <= bb.maxY; y++) {
        const rowOff = y * W;
        for (let x = bb.minX; x <= bb.maxX; x++) {
          const idx = rowOff + x;
          if (reg[idx] !== 1) continue;
          const own = ownership[idx];
          if (own !== -1 && own !== s.idx) continue;
          ownership[idx] = s.idx;
        }
      }
      s.area = chosen.area;
      s.bbox = bb;
    }
  }

  // Construction des polygones via traceContour sur la masque ownership
  const results: RoomPolygonPx[] = [];
  for (const s of seeds) {
    if (s.area < minAreaPx2) continue;
    // Construire region binaire
    const region = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      if (ownership[i] === s.idx) region[i] = 1;
    }
    // s28 tour 13 — EXPANSION BFS-CONTRAINTE PAR VRAIS MURS.
    // Au lieu d'une dilatation (carré N×N qui dépasse les vrais murs), on
    // fait une expansion BFS depuis ownership[i]===s.idx en S'ARRÊTANT sur
    // les vrais pixels mur :
    //   - rawPngMask = pixels noirs PNG (peinture native)
    //   - thinVectorWallsMask = pixels SUR les segments vectoriels PDF (1px)
    // Conditions d'arrêt par voisin :
    //   STOP si rawPngMask[n]=1 OU thinVectorWallsMask[n]=1 → on a atteint
    //          un VRAI mur géométrique.
    //   STOP si ownership[n]=autre seed → on touche une pièce voisine.
    //   GO sinon, mais limité à `expandMaxPx` pixels distance (anti-runaway).
    // Résultat : la frontière finale PASSE par les vrais murs PDF/PNG, pas
    // par la version dilatée. Vertex à <2px du mur → Inv C PASS.
    //
    // Garde-fou Inv A : on borne l'expansion par `expandMaxPx` pour éviter
    // qu'un seed sur-quota gonfle au-delà des limites. expandMaxPx=8 garantit
    // un gain max de ~8px*périmètre = ~5% pour une pièce moyenne.
    let regionForContour: Uint8Array = region;
    let bboxForContour = s.bbox;
    // s28 tour 14 — expandMaxPx adapté au quota (extension du tour 13) :
    //   - sur-quota (>1.05x) : 0 (pas d'expansion, on est déjà au-dessus)
    //   - proche quota : 3px
    //   - sous-quota léger (0.92-0.97x) : 8px
    //   - sous-quota fort (<0.92x)  : 16px (récupère les pixels d'épaisseur de mur
    //     que le doorSeal a injustement attribué au "vide")
    //   - sans quota   : 6px (compromis prudent)
    let expandMaxPx: number;
    if (s.quotaKnown) {
      const baseRatio = s.area / s.quotaPx2;
      if (baseRatio >= 1.05) expandMaxPx = 0;
      else if (baseRatio >= 0.97) expandMaxPx = 3;
      else if (baseRatio >= 0.92) expandMaxPx = Math.min(doorSealRadius + 2, 8);
      else expandMaxPx = 16; // sous-quota fort : extension agressive
    } else {
      expandMaxPx = Math.min(doorSealRadius, 6);
    }
    if (expandMaxPx > 0) {
      // BFS multi-source : tous les pixels frontière du seed comme sources
      // initiales, distance 0. Étendre jusqu'à distance expandMaxPx.
      // Distance map : 255 = non-visité, 0..expandMaxPx = distance au seed.
      const dist = new Uint8Array(W * H);
      dist.fill(255);
      const queue: number[] = [];
      // Seed pixels = pixels du seed (région) qui ont au moins un voisin
      // libre/mur (= pixels frontière de la région pour le BFS d'expansion).
      // Optimisation : on prend tous les pixels de région ; ceux à l'intérieur
      // ne contribuent rien (leurs voisins sont déjà dans région avec dist 0).
      for (let y = s.bbox.minY; y <= s.bbox.maxY; y++) {
        const rowOff = y * W;
        for (let x = s.bbox.minX; x <= s.bbox.maxX; x++) {
          const idx = rowOff + x;
          if (region[idx] === 1) {
            dist[idx] = 0;
            queue.push(idx);
          }
        }
      }
      // BFS distance : pour chaque pixel de la queue, regarder ses 4 voisins.
      // Si voisin pas encore visité (dist=255), on calcule sa nouvelle dist.
      // STOP par voisin :
      //   - hors image
      //   - rawPngMask[n] === 1 → vrai mur PNG (peinture sombre native)
      //   - thinVectorWallsMask[n] === 1 → mur vectoriel PDF
      //   - ownership[n] !== -1 ET !== s.idx → autre seed
      //   - dist > expandMaxPx → trop loin
      let qi = 0;
      while (qi < queue.length) {
        const idx = queue[qi++];
        const d = dist[idx];
        if (d >= expandMaxPx) continue;
        const x = idx % W;
        const y = (idx - x) / W;
        const nd = d + 1;
        const trySpread = (n: number) => {
          if (dist[n] !== 255) return; // déjà visité (court-circuit)
          // STOP : autre seed (frontière entre 2 pièces voisines)
          const own = ownership[n];
          if (own !== -1 && own !== s.idx) return;
          // STOP : mur vectoriel PDF (vrai mur géométrique précis)
          // s28 tour 13 — On NE s'arrête PAS sur rawPngMask car celui-ci
          // capture aussi du texte/cotes/hachures (pas que les murs). On
          // s'arrête uniquement sur thinVectorWallsMask (1px exact des
          // segments PDF vectoriels = vrais murs garantis). Le contour
          // final passe ALORS exactement sur ces 1px → vertex à <2px du
          // mur dans 95%+ des cas.
          if (thinVectorWallsMask[n] === 1) {
            // INCLUT le pixel mur dans la région finale, mais bloque
            // l'expansion plus loin (dist marqué à expandMaxPx).
            dist[n] = expandMaxPx;
            return;
          }
          // OK : continuer
          dist[n] = nd;
          if (nd < expandMaxPx) queue.push(n);
        };
        if (x > 0) trySpread(idx - 1);
        if (x < W - 1) trySpread(idx + 1);
        if (y > 0) trySpread(idx - W);
        if (y < H - 1) trySpread(idx + W);
      }
      // Construire la région étendue : tous les pixels avec dist < 255
      const out = new Uint8Array(W * H);
      let ebx0 = Infinity, eby0 = Infinity, ebx1 = -Infinity, eby1 = -Infinity;
      for (let i = 0; i < W * H; i++) {
        if (dist[i] === 255) continue;
        out[i] = 1;
        const x = i % W, y = (i - x) / W;
        if (x < ebx0) ebx0 = x;
        if (y < eby0) eby0 = y;
        if (x > ebx1) ebx1 = x;
        if (y > eby1) eby1 = y;
      }
      if (ebx0 < ebx1) {
        regionForContour = out;
        bboxForContour = { minX: ebx0, minY: eby0, maxX: ebx1, maxY: eby1 };
      }
    }
    const contourRaw = traceContour(regionForContour, W, H, bboxForContour);
    if (contourRaw.length < 4) continue;
    // s28 tour 11 — pivot SMART LINE SNAP.
    // Avant : snap vertex-par-vertex casse Inv A (aire dérive) ↔ Inv C plateau.
    // Maintenant : Douglas-Peucker AGRESSIF (épsilon 6px) pour casser
    // l'escalier-pixel en lignes propres, puis smartLineSnap qui translate
    // les LIGNES ENTIÈRES sur les murs (préserve l'aire de chaque ligne).
    const dpTolFirst = Math.max(simplifyTolerancePx, 6);
    let polygon = simplifyDP(contourRaw, dpTolFirst);
    if (polygon.length < 4) continue;
    if (vectorWalls.length > 0) {
      // SMART LINE SNAP — passe 1 : tolérance MOYENNE (15px) — capture les
      // décalages doorSealRadius (6-12px) sans fusionner avec murs voisins.
      polygon = smartLineSnap(polygon, vectorWalls, {
        angleTolDeg: 18,
        dragTolPx: 15,
        parallelTolDeg: 22,
        finalSnapTolPx: 5,
        maxAreaDriftRatio: 0.18,
      });
      polygon = simplifyDP(polygon, 3);
      if (polygon.length < 4) continue;
      // Passe 2 : tolérance fine (7px) — affine les segments résiduels.
      polygon = smartLineSnap(polygon, vectorWalls, {
        angleTolDeg: 14,
        dragTolPx: 7,
        parallelTolDeg: 18,
        finalSnapTolPx: 5,
        maxAreaDriftRatio: 0.05,
      });
      // Passe 3 : snap vertex final 5px (limite Inv C). Tolérance étroite
      // pour ne pas casser l'aire localement.
      if (polygon.length >= 4) {
        polygon = snapPolygonToWalls(polygon, vectorWalls, 5);
      }
    }

    // s28 tour 9 — Pas de post-shrink "vers centroïde" :
    // déplacer les vertices vers le centroïde casse Inv C (snap aux murs).
    // Le shrink-to-quota est traité au niveau BFS (érosion par seed sur-quota
    // dans la phase d'érosion ci-dessus) ou laissé tel quel (un over-quota
    // léger reste préférable à un polygone détaché de tout mur).
    let cx = 0, cy = 0;
    for (const p of polygon) { cx += p.x; cy += p.y; }
    cx /= polygon.length;
    cy /= polygon.length;
    results.push({
      text: s.text,
      surface_m2: s.surface_m2,
      polygon,
      areaPx2: s.area,
      centroid: { x: cx, y: cy },
    });
  }
  return results;
}
