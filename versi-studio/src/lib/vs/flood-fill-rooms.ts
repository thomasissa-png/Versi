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
  if (mask[cy * W + cx] === 0) return { x: cx, y: cy };
  for (let r = 1; r <= radius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= W || y < 0 || y >= H) continue;
        if (mask[y * W + x] === 0) return { x, y };
      }
    }
  }
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
    // Snap final : pour chaque vertex, chercher le mur vectoriel le plus proche
    // dans une fenêtre de 12px et y projeter. Garantit que les vertices du
    // polygone sont sur les murs réels du PDF (essentiel pour l'audit C).
    if (vectorWalls.length > 0) {
      // Tolérance 30px ≈ épaisseur d'un mur PDF (10cm × scale=3 = 30px).
      // Les vertices flood-fill décalés par doorSealRadius (~6px) + l'épaisseur
      // du tracé (~3px) sont absorbés. Au-delà de 30, risque de "coller" à
      // un mur d'une pièce voisine.
      polygon = snapPolygonToWalls(polygon, vectorWalls, 40);
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
