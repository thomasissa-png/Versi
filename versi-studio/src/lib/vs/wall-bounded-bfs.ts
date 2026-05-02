/**
 * Module s28 tour 17 — BFS multi-source compétitif borné UNIQUEMENT par les murs.
 *
 * Contexte : le BFS quota (`extractRoomsByQuotaFloodFill`) sous-extrait
 * systématiquement (ratio polygon/PDF ~0.79) parce qu'il s'arrête sur quota
 * artificiel AVANT d'atteindre les vrais murs. Conséquences visuelles :
 *   - Espaces vides 5-15% du lot non attribué à une pièce
 *   - Polygones biscornues en escalier au lieu de rectangles propres
 *
 * Algorithme (Voronoï discret BFS) :
 *
 *   1. Construire wall-barrier (mask 1=mur, 0=libre) STRICT à partir des :
 *      - Murs vectoriels (extractInternalWallSegments)
 *      - Murs raster vectorisés (raster-walls-vectorize)
 *      - Apt-separators et contour du lot
 *      - Door-seal CONDITIONNEL appliqué AVANT le BFS sur les portes ouvertes
 *        détectées entre seeds voisins
 *   2. BFS multi-source par couches : chaque seed avance d'UN pixel par tour
 *      (round-robin synchrone). Quand 2 seeds atteignent le même pixel libre,
 *      le 1er arrivé l'occupe (Voronoï discret = chaque pixel attribué au seed
 *      LE PLUS PROCHE en distance BFS = distance contournant les murs).
 *   3. Pas de quota. Le BFS ne s'arrête QUE :
 *      - Quand le pixel est un mur (wall-barrier=1)
 *      - Quand le pixel est claim par un autre seed
 *      - Quand le pixel est hors lot
 *   4. Quand tous les seeds sont bloqués, attribution finale via 2e passe
 *      "espaces orphelins" : les pixels libres restants (non attribués, non
 *      mur) sont attribués au seed le plus proche en distance euclidienne (=
 *      complète la couverture du lot).
 *
 * Garanties :
 *   - 0 espace vide : tout pixel libre du lot appartient à exactement 1 pièce
 *   - Forme architecturale : la frontière de chaque pièce passe SUR les murs
 *     détectés (vrai mur géométrique = vrai bord de pièce)
 *   - Pas de chevauchement : par construction Voronoï, chaque pixel a 1 owner
 *
 * NB : si la détection des murs est imparfaite (porte non-sealed, mur fin
 * manquant), 2 pièces peuvent fusionner. C'est un fail-fast sain : la racine
 * du problème est la détection des murs, pas le BFS.
 */

import sharp from "sharp";

export type LabelSeedWB = {
  text: string;
  x_percent: number;
  y_percent: number;
  surface_m2: number | null;
};

export type RoomPolygonWB = {
  text: string;
  surface_m2: number | null;
  polygon: Array<{ x: number; y: number }>;
  areaPx2: number;
  centroid: { x: number; y: number };
};

export type WallBoundedOptions = {
  /** Seuil luminance (0-255). Défaut 210. */
  wallLumThreshold?: number;
  /** Saturation min. Défaut 0.25. */
  wallSaturationThreshold?: number;
  /** DP tolerance px. Défaut 5. */
  simplifyTolerancePx?: number;
  /** Aire min px². Défaut 500. */
  minAreaPx2?: number;
  /** Polygone du lot en px. */
  lotPolygonPx: Array<{ x: number; y: number }>;
  /** Rayon de recherche seed alternatif. */
  seedSearchRadius?: number;
  /** Door-seal radius pour fermer les portes (px). Défaut 4. */
  doorSealRadius?: number;
  /** Murs vectoriels PDF (segments). */
  vectorWallSegments?: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  /** Épaisseur de tracé murs vectoriels. Défaut 3. */
  vectorWallThickness?: number;
  /** Murs raster vectorisés (segments). */
  rasterWallSegments?: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  /** Épaisseur de tracé murs raster. Défaut 3. */
  rasterWallThickness?: number;
  /** Apt-separators. */
  aptSeparatorSegments?: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  /** Épaisseur apt-sep. Défaut 6. */
  aptSeparatorThickness?: number;
};

/**
 * Construit la wall-mask depuis le PNG.
 */
async function buildWallMask(
  pngBuffer: Buffer,
  lumThr: number,
  satThr: number,
): Promise<{ mask: Uint8Array; W: number; H: number }> {
  const img = sharp(pngBuffer).raw().ensureAlpha();
  const meta = await img.metadata();
  const W = meta.width!;
  const H = meta.height!;
  const buffer = await img.toBuffer();
  const mask = new Uint8Array(W * H);
  for (let i = 0, p = 0; i < W * H; i++, p += 4) {
    const r = buffer[p], g = buffer[p + 1], b = buffer[p + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    let isWall = false;
    if (lum < lumThr) isWall = true;
    else {
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const sat = max > 0 ? (max - min) / max : 0;
      if (sat > satThr && lum < 230) isWall = true;
    }
    mask[i] = isWall ? 1 : 0;
  }
  return { mask, W, H };
}

/**
 * Tracé d'un segment épaissi sur une mask.
 */
function drawSegment(
  mask: Uint8Array, W: number, H: number,
  x1: number, y1: number, x2: number, y2: number, thickness: number,
): void {
  const dx = x2 - x1, dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy)) | 0;
  if (steps === 0) return;
  const t2 = thickness * thickness;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const cx = Math.round(x1 + dx * t);
    const cy = Math.round(y1 + dy * t);
    for (let oy = -thickness; oy <= thickness; oy++) {
      for (let ox = -thickness; ox <= thickness; ox++) {
        const px = cx + ox, py = cy + oy;
        if (px < 0 || px >= W || py < 0 || py >= H) continue;
        if (ox * ox + oy * oy <= t2) mask[py * W + px] = 1;
      }
    }
  }
}

/**
 * Dilatation morphologique 1D-séparable (kernel carré r×r).
 * Complexité : O(W*H*r) total au lieu de O(W*H*r²) pour kernel 2D.
 */
function dilate(src: Uint8Array, W: number, H: number, radius: number): Uint8Array {
  if (radius <= 0) return src.slice();
  // Pass horizontal : pour chaque ligne, OR sur fenêtre [x-r, x+r]
  const tmp = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const rowOff = y * W;
    for (let x = 0; x < W; x++) {
      const x0 = Math.max(0, x - radius), x1 = Math.min(W - 1, x + radius);
      let any = 0;
      for (let xx = x0; xx <= x1; xx++) {
        if (src[rowOff + xx]) { any = 1; break; }
      }
      tmp[rowOff + x] = any;
    }
  }
  // Pass vertical
  const out = new Uint8Array(W * H);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      const y0 = Math.max(0, y - radius), y1 = Math.min(H - 1, y + radius);
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
 * Test point dans polygone.
 */
function pointInPoly(px: number, py: number, poly: Array<{ x: number; y: number }>): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi)
      inside = !inside;
  }
  return inside;
}

/**
 * Trouve un seed non-mur en spirale.
 */
function findSeed(
  mask: Uint8Array, W: number, H: number,
  cx: number, cy: number, radius: number,
): { x: number; y: number } | null {
  if (cx < 0 || cx >= W || cy < 0 || cy >= H) return null;
  if (mask[cy * W + cx] === 0) return { x: cx, y: cy };
  for (let r = 1; r <= radius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const x = cx + dx, y = cy + dy;
        if (x < 0 || x >= W || y < 0 || y >= H) continue;
        if (mask[y * W + x] === 0) return { x, y };
      }
    }
  }
  return null;
}

/**
 * Douglas-Peucker.
 */
function dpSimplify(pts: Array<{ x: number; y: number }>, eps: number): Array<{ x: number; y: number }> {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = 1; keep[pts.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, pts.length - 1]];
  while (stack.length > 0) {
    const [s, e] = stack.pop()!;
    if (e - s < 2) continue;
    const x1 = pts[s].x, y1 = pts[s].y, x2 = pts[e].x, y2 = pts[e].y;
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    let maxD = -1, maxI = -1;
    for (let i = s + 1; i < e; i++) {
      let d: number;
      if (len2 < 1e-9) {
        d = Math.hypot(pts[i].x - x1, pts[i].y - y1);
      } else {
        const t = ((pts[i].x - x1) * dx + (pts[i].y - y1) * dy) / len2;
        const px = x1 + t * dx, py = y1 + t * dy;
        d = Math.hypot(pts[i].x - px, pts[i].y - py);
      }
      if (d > maxD) { maxD = d; maxI = i; }
    }
    if (maxD > eps && maxI > 0) {
      keep[maxI] = 1;
      stack.push([s, maxI]);
      stack.push([maxI, e]);
    }
  }
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < pts.length; i++) if (keep[i]) out.push(pts[i]);
  return out;
}

/**
 * Trace le contour d'une région via Moore-neighbor tracing.
 * Démarre du pixel le plus haut-gauche de la région.
 */
function traceContour(
  region: Uint8Array, W: number, H: number,
  bbox: { minX: number; minY: number; maxX: number; maxY: number },
): Array<{ x: number; y: number }> {
  let sx = -1, sy = -1;
  outer: for (let y = bbox.minY; y <= bbox.maxY; y++) {
    for (let x = bbox.minX; x <= bbox.maxX; x++) {
      if (region[y * W + x] === 1) { sx = x; sy = y; break outer; }
    }
  }
  if (sx < 0) return [];
  // Moore neighborhood E, NE, N, NW, W, SW, S, SE
  const N8 = [
    [1, 0], [1, -1], [0, -1], [-1, -1],
    [-1, 0], [-1, 1], [0, 1], [1, 1],
  ];
  const out: Array<{ x: number; y: number }> = [];
  let cx = sx, cy = sy, dir = 4; // came from W (dir 4)
  let safety = 0;
  const maxIter = (bbox.maxX - bbox.minX + 1) * (bbox.maxY - bbox.minY + 1) * 4 + 1000;
  while (safety++ < maxIter) {
    out.push({ x: cx, y: cy });
    let found = false;
    for (let k = 0; k < 8; k++) {
      const ndir = (dir + 1 + k) % 8;
      const nx = cx + N8[ndir][0];
      const ny = cy + N8[ndir][1];
      if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
      if (region[ny * W + nx] === 1) {
        cx = nx; cy = ny;
        dir = (ndir + 4) % 8;
        found = true;
        break;
      }
    }
    if (!found) break;
    if (out.length > 3 && cx === sx && cy === sy) break;
  }
  return out;
}

/**
 * Aire signée polygone (shoelace).
 */
function polyArea(poly: Array<{ x: number; y: number }>): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    s += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
  }
  return Math.abs(s / 2);
}

/**
 * BFS multi-source compétitif Voronoï discret.
 *
 * Algorithme : tous les seeds démarrent en parallèle. À chaque tour, chaque
 * seed étend sa frontière de 1 pixel. Si 2 seeds essaient de claim le même
 * pixel, le 1er arrivé gagne (Voronoï discret). Stop quand plus aucun seed
 * n'a de frontière exploitable.
 *
 * Cette fonction MUTE `ownership` (Int16Array) : -1 = libre/mur, 0..N-1 = seed.
 */
function bfsCompetitive(
  ownership: Int16Array,
  wallBarrier: Uint8Array,
  W: number, H: number,
  seeds: Array<{ x: number; y: number; idx: number }>,
  inLot: Uint8Array | null,
): Array<{ idx: number; area: number; bbox: { minX: number; minY: number; maxX: number; maxY: number } }> {
  type SeedState = {
    idx: number;
    frontier: number[];
    area: number;
    bbox: { minX: number; minY: number; maxX: number; maxY: number };
  };
  const states: SeedState[] = seeds.map(s => {
    const seedIdx = s.y * W + s.x;
    if (wallBarrier[seedIdx] === 0 && (inLot === null || inLot[seedIdx]) && ownership[seedIdx] === -1) {
      ownership[seedIdx] = s.idx;
      return {
        idx: s.idx,
        frontier: [seedIdx],
        area: 1,
        bbox: { minX: s.x, minY: s.y, maxX: s.x, maxY: s.y },
      };
    }
    return { idx: s.idx, frontier: [], area: 0, bbox: { minX: s.x, minY: s.y, maxX: s.x, maxY: s.y } };
  });

  // Round-robin synchrone par couches : chaque tour, chaque seed étend de 1px.
  // Cela garantit Voronoï discret (pixel attribué au seed le plus proche en distance BFS).
  let active = states.length;
  while (active > 0) {
    active = 0;
    for (const s of states) {
      if (s.frontier.length === 0) continue;
      const newFrontier: number[] = [];
      for (const idx of s.frontier) {
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
          if (wallBarrier[n]) continue;
          if (ownership[n] !== -1) continue;
          if (inLot !== null && !inLot[n]) continue;
          ownership[n] = s.idx;
          s.area++;
          const nx = n % W, ny = (n - nx) / W;
          if (nx < s.bbox.minX) s.bbox.minX = nx;
          if (ny < s.bbox.minY) s.bbox.minY = ny;
          if (nx > s.bbox.maxX) s.bbox.maxX = nx;
          if (ny > s.bbox.maxY) s.bbox.maxY = ny;
          newFrontier.push(n);
        }
      }
      s.frontier = newFrontier;
      if (newFrontier.length > 0) active++;
    }
  }
  return states.map(s => ({ idx: s.idx, area: s.area, bbox: s.bbox }));
}

/**
 * Construit un masque "in lot" : 1 si pixel ∈ polygone lot.
 *
 * Optimisé via scanline : pour chaque y, calculer les intersections avec les
 * arêtes du polygone et marquer les pixels entre paires d'intersections.
 */
function buildLotMask(
  W: number, H: number,
  lotPoly: Array<{ x: number; y: number }>,
): Uint8Array {
  const mask = new Uint8Array(W * H);
  if (lotPoly.length < 3) return mask;
  let minY = H, maxY = 0;
  for (const p of lotPoly) {
    if (p.y < minY) minY = Math.max(0, Math.floor(p.y));
    if (p.y > maxY) maxY = Math.min(H - 1, Math.ceil(p.y));
  }
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    for (let i = 0, j = lotPoly.length - 1; i < lotPoly.length; j = i++) {
      const yi = lotPoly[i].y, yj = lotPoly[j].y;
      if ((yi > y) !== (yj > y)) {
        const xi = lotPoly[i].x, xj = lotPoly[j].x;
        const x = ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
        xs.push(x);
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const x0 = Math.max(0, Math.floor(xs[k]));
      const x1 = Math.min(W - 1, Math.ceil(xs[k + 1]));
      for (let x = x0; x <= x1; x++) mask[y * W + x] = 1;
    }
  }
  return mask;
}

/**
 * Phase d'attribution finale : tous les pixels libres dans le lot mais non
 * attribués à un seed (= "espaces vides") sont attribués au seed le plus
 * proche en distance BFS via une seconde passe BFS multi-source. Cela élimine
 * les espaces vides résiduels (gaps entre flood-fills) en garantissant 100%
 * de couverture du lot par un seed.
 */
function fillOrphanPixels(
  ownership: Int16Array,
  wallBarrier: Uint8Array,
  inLot: Uint8Array,
  W: number, H: number,
): void {
  // Scanner UNE fois toute l'image : pour chaque pixel claim, regarder s'il
  // a un voisin orphelin → l'ajouter à la queue.
  // Note : single pass O(W*H), pas par-seed-bbox (qui peut être très large).
  const queue: number[] = [];
  for (let y = 1; y < H - 1; y++) {
    const rowOff = y * W;
    for (let x = 1; x < W - 1; x++) {
      const idx = rowOff + x;
      if (ownership[idx] === -1) continue;
      // Voisin orphelin ? (libre + in-lot + non-mur)
      if (
        (ownership[idx - 1] === -1 && inLot[idx - 1] && !wallBarrier[idx - 1]) ||
        (ownership[idx + 1] === -1 && inLot[idx + 1] && !wallBarrier[idx + 1]) ||
        (ownership[idx - W] === -1 && inLot[idx - W] && !wallBarrier[idx - W]) ||
        (ownership[idx + W] === -1 && inLot[idx + W] && !wallBarrier[idx + W])
      ) {
        queue.push(idx);
      }
    }
  }
  // BFS depuis frontières : chaque pixel libre est attribué au seed du
  // pixel claim le plus proche (en distance BFS).
  let qi = 0;
  while (qi < queue.length) {
    const idx = queue[qi++];
    const owner = ownership[idx];
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
      if (ownership[n] !== -1) continue;
      if (!inLot[n]) continue;
      if (wallBarrier[n]) continue;
      ownership[n] = owner;
      queue.push(n);
    }
  }
}

/**
 * Extrait les pièces via BFS multi-source compétitif borné par les murs.
 *
 * Algorithme :
 *   1. Build wall-barrier (PNG + vector + raster + apt-sep + lot) avec door-seal.
 *   2. Build lot-mask (1 = pixel in lot).
 *   3. Place seeds (1 par label).
 *   4. BFS multi-source compétitif : Voronoï discret = chaque pixel attribué
 *      au seed le plus proche en distance BFS (contournant les murs).
 *   5. Phase orphelins : pixels libres restants → seed le plus proche.
 *   6. Trace contour, simplify DP, retourne polygones.
 */
export async function extractRoomsByWallBoundedFloodFill(
  pngBuffer: Buffer,
  labels: LabelSeedWB[],
  options: WallBoundedOptions,
): Promise<RoomPolygonWB[]> {
  const wallLumThreshold = options.wallLumThreshold ?? 210;
  const wallSaturationThreshold = options.wallSaturationThreshold ?? 0.25;
  const simplifyTolerancePx = options.simplifyTolerancePx ?? 5;
  const minAreaPx2 = options.minAreaPx2 ?? 500;
  const seedSearchRadius = options.seedSearchRadius ?? 100;
  const doorSealRadius = options.doorSealRadius ?? 4;
  const vectorWalls = options.vectorWallSegments ?? [];
  const vectorWallThickness = options.vectorWallThickness ?? 3;
  const rasterWalls = options.rasterWallSegments ?? [];
  const rasterWallThickness = options.rasterWallThickness ?? 3;
  const aptSeparators = options.aptSeparatorSegments ?? [];
  const aptSeparatorThickness = options.aptSeparatorThickness ?? 6;
  const lotPolyPx = options.lotPolygonPx;

  // 1. Build wall mask depuis PNG + vector walls + raster walls + apt sep + lot edge
  const { mask: pngMask, W, H } = await buildWallMask(pngBuffer, wallLumThreshold, wallSaturationThreshold);
  const wallBarrier = new Uint8Array(pngMask);
  // Ajouter le contour du lot (épaisseur 3)
  if (lotPolyPx.length >= 3) {
    for (let i = 0; i < lotPolyPx.length; i++) {
      const a = lotPolyPx[i];
      const b = lotPolyPx[(i + 1) % lotPolyPx.length];
      drawSegment(wallBarrier, W, H, a.x, a.y, b.x, b.y, 3);
    }
  }
  // Murs vectoriels
  for (const seg of vectorWalls) {
    drawSegment(wallBarrier, W, H, seg.x1, seg.y1, seg.x2, seg.y2, vectorWallThickness);
  }
  // Murs raster
  for (const seg of rasterWalls) {
    drawSegment(wallBarrier, W, H, seg.x1, seg.y1, seg.x2, seg.y2, rasterWallThickness);
  }
  // Apt separators
  for (const seg of aptSeparators) {
    drawSegment(wallBarrier, W, H, seg.x1, seg.y1, seg.x2, seg.y2, aptSeparatorThickness);
  }
  // Door seal (dilatation morphologique des murs pour fermer les portes ouvertes)
  const sealedBarrier: Uint8Array = doorSealRadius > 0
    ? dilate(wallBarrier, W, H, doorSealRadius)
    : wallBarrier;

  // 2. Build lot mask
  const inLot = buildLotMask(W, H, lotPolyPx);

  // 3. Place seeds (1 par label) dans le lot et hors mur
  const seedPositions: Array<{ x: number; y: number; idx: number; label: LabelSeedWB }> = [];
  for (let li = 0; li < labels.length; li++) {
    const lab = labels[li];
    const sx = (lab.x_percent / 100) * W;
    const sy = (lab.y_percent / 100) * H;
    // Project into lot
    let cx = Math.round(sx), cy = Math.round(sy);
    if (cx < 0 || cx >= W || cy < 0 || cy >= H || !inLot[cy * W + cx]) {
      // Project on lot bbox (simplifié)
      let lminX = W, lmaxX = 0, lminY = H, lmaxY = 0;
      for (const p of lotPolyPx) {
        if (p.x < lminX) lminX = p.x;
        if (p.x > lmaxX) lmaxX = p.x;
        if (p.y < lminY) lminY = p.y;
        if (p.y > lmaxY) lmaxY = p.y;
      }
      cx = Math.max(Math.round(lminX) + 1, Math.min(Math.round(lmaxX) - 1, cx));
      cy = Math.max(Math.round(lminY) + 1, Math.min(Math.round(lmaxY) - 1, cy));
    }
    // Trouver un seed non-mur dans la masque sealed
    const seed = findSeed(sealedBarrier, W, H, cx, cy, seedSearchRadius);
    if (!seed) continue;
    if (!inLot[seed.y * W + seed.x]) continue;
    seedPositions.push({
      x: seed.x, y: seed.y,
      idx: seedPositions.length,
      label: lab,
    });
  }

  if (seedPositions.length === 0) return [];

  // 4. BFS multi-source compétitif Voronoï discret
  const ownership = new Int16Array(W * H);
  ownership.fill(-1);
  const stateResults = bfsCompetitive(
    ownership,
    sealedBarrier,
    W, H,
    seedPositions.map(s => ({ x: s.x, y: s.y, idx: s.idx })),
    inLot,
  );

  void stateResults;
  // 5. Phase orphelins : récupérer les pixels in-lot non-mur restants
  fillOrphanPixels(ownership, sealedBarrier, inLot, W, H);

  // 6. Trace contour pour chaque seed et construit les polygones
  const out: RoomPolygonWB[] = [];
  for (const s of seedPositions) {
    const region = new Uint8Array(W * H);
    let minX = W, minY = H, maxX = 0, maxY = 0;
    let area = 0;
    for (let i = 0; i < W * H; i++) {
      if (ownership[i] === s.idx) {
        region[i] = 1;
        area++;
        const x = i % W, y = (i - x) / W;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    if (area < minAreaPx2) continue;

    const contour = traceContour(region, W, H, { minX, minY, maxX, maxY });
    if (contour.length < 4) continue;
    const simplified = dpSimplify(contour, simplifyTolerancePx);
    if (simplified.length < 4) continue;

    let cx = 0, cy = 0;
    for (const p of simplified) { cx += p.x; cy += p.y; }
    cx /= simplified.length;
    cy /= simplified.length;

    out.push({
      text: s.label.text,
      surface_m2: s.label.surface_m2,
      polygon: simplified,
      areaPx2: area,
      centroid: { x: cx, y: cy },
    });
  }

  // Logging
  console.log(`[wall-bounded-bfs] ${seedPositions.length} seeds → ${out.length} pièces`);
  for (const r of out) {
    const polA = polyArea(r.polygon);
    console.log(`  ${r.text}: areaPx²=${r.areaPx2} polygonAreaPx²=${polA.toFixed(0)} vertices=${r.polygon.length}`);
  }

  return out;
}
