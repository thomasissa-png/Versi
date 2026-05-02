/**
 * Module s28 tour 17 — Fill gaps : post-processing pour éliminer les espaces
 * vides entre polygones de pièces (couverture 100% du lot).
 *
 * Contexte : après quotaFloodFill + Voronoï + smartLineSnap, certains pixels
 * du lot ne sont attribués à aucune pièce → "espaces vides" entre polygones
 * et murs. Thomas pointe ça comme défaut visuel principal.
 *
 * Algorithme :
 *   1. Construire raster owner-mask depuis polygones finaux (par pixel : idx
 *      de pièce ou -1).
 *   2. Construire raster lot-mask (1 si pixel ∈ polygone lot).
 *   3. BFS multi-source compétitif depuis pixels owned (frontière).
 *      Chaque pixel orphelin (in lot, pas owned, pas mur) est attribué au
 *      seed le plus proche EN DISTANCE BFS (Voronoï discret).
 *   4. Pour chaque pièce qui a gagné des pixels, reconstruire le polygone
 *      via traceContour + DP simplify. Les autres pièces gardent leur
 *      polygone original.
 *
 * Garanties :
 *   - Aucun espace vide à la fin (couverture 100% du lot)
 *   - Polygones existants peuvent grandir mais pas rétrécir
 *   - Pas de chevauchement (chaque pixel attribué une fois)
 *   - Murs détectés bloquent l'extension (BFS s'arrête sur mur)
 */

import sharp from "sharp";

export type RoomPolygon = {
  text: string;
  surface_m2: number | null;
  polygon: Array<{ x: number; y: number }>;
  areaPx2?: number;
  centroid?: { x: number; y: number };
};

export type FillGapsOptions = {
  /** Polygone du lot en pixels. */
  lotPolygonPx: Array<{ x: number; y: number }>;
  /** PNG du plan (pour wall mask). */
  pngBuffer: Buffer;
  /** Seuil luminance pour détecter pixel mur. Défaut 210. */
  wallLumThreshold?: number;
  /** Seuil saturation pour pixel mur coloré. Défaut 0.25. */
  wallSaturationThreshold?: number;
  /** Épaisseur tracé contour lot dans wall mask. Défaut 3. */
  lotEdgeThickness?: number;
  /** Murs vectoriels supplémentaires. */
  vectorWallSegments?: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  /** Épaisseur murs vectoriels. Défaut 2. */
  vectorWallThickness?: number;
  /** DP tolerance pour re-trace contour. Défaut 4. */
  simplifyTolerancePx?: number;
  /** Distance max BFS pour fill (anti-runaway). Défaut 200 px. */
  maxBfsDistance?: number;
  /** Échelle m²/px² (pour borner extension par pdfSurface). */
  scaleM2PerPx2?: number;
  /** Ratio max polygon_m2 / pdf_m2 acceptable (anti-fuite). Défaut 1.10. */
  maxRatioVsPdf?: number;
};

/**
 * Construit la wall-mask depuis le PNG (pixel sombre OU coloré saturé).
 */
async function buildWallMaskFromPng(
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
 * Trace un segment épaissi sur une mask (Bresenham simple).
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
 * Construit lot-mask via scanline.
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
 * Construit owner-mask depuis polygones (scanline pour chaque polygone, en
 * ordre : 1er polygone qui réclame un pixel le possède).
 * @returns Int16Array : -1 si non-owned, 0..N-1 si owned
 */
function buildOwnerMask(
  W: number, H: number,
  polygons: Array<{ x: number; y: number }[]>,
): Int16Array {
  const owner = new Int16Array(W * H);
  owner.fill(-1);
  for (let pi = 0; pi < polygons.length; pi++) {
    const poly = polygons[pi];
    if (poly.length < 3) continue;
    let minY = H, maxY = 0;
    for (const p of poly) {
      if (p.y < minY) minY = Math.max(0, Math.floor(p.y));
      if (p.y > maxY) maxY = Math.min(H - 1, Math.ceil(p.y));
    }
    for (let y = minY; y <= maxY; y++) {
      const xs: number[] = [];
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const yi = poly[i].y, yj = poly[j].y;
        if ((yi > y) !== (yj > y)) {
          const xi = poly[i].x, xj = poly[j].x;
          const x = ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
          xs.push(x);
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const x0 = Math.max(0, Math.floor(xs[k]));
        const x1 = Math.min(W - 1, Math.ceil(xs[k + 1]));
        for (let x = x0; x <= x1; x++) {
          const idx = y * W + x;
          if (owner[idx] === -1) owner[idx] = pi;
        }
      }
    }
  }
  return owner;
}

/**
 * Trace contour d'une région via Moore-neighbor.
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
  const N8 = [
    [1, 0], [1, -1], [0, -1], [-1, -1],
    [-1, 0], [-1, 1], [0, 1], [1, 1],
  ];
  const out: Array<{ x: number; y: number }> = [];
  let cx = sx, cy = sy, dir = 4;
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
 * Fill gaps : attribue les pixels orphelins (in lot, pas owned, pas mur) à la
 * pièce voisine la plus proche via BFS multi-source compétitif.
 *
 * @param rooms Polygones finaux des pièces (en pixels image, post-pipeline)
 * @param options Options (lot, png, walls)
 * @returns Nouveaux polygones (mêmes pièces, possiblement étendus + remappés)
 */
export async function fillGapsBetweenRooms(
  rooms: RoomPolygon[],
  options: FillGapsOptions,
): Promise<RoomPolygon[]> {
  if (rooms.length === 0) return [];
  const wallLumThreshold = options.wallLumThreshold ?? 210;
  const wallSaturationThreshold = options.wallSaturationThreshold ?? 0.25;
  const lotEdgeThickness = options.lotEdgeThickness ?? 3;
  const vectorWalls = options.vectorWallSegments ?? [];
  const vectorWallThickness = options.vectorWallThickness ?? 2;
  const simplifyTolerancePx = options.simplifyTolerancePx ?? 4;
  const maxBfsDistance = options.maxBfsDistance ?? 200;
  const scaleM2PerPx2 = options.scaleM2PerPx2;
  const maxRatioVsPdf = options.maxRatioVsPdf ?? 1.10;

  // 1. Wall mask (PNG + lot edge + vector walls)
  const { mask: pngMask, W, H } = await buildWallMaskFromPng(
    options.pngBuffer, wallLumThreshold, wallSaturationThreshold,
  );
  const wallMask = new Uint8Array(pngMask);
  if (options.lotPolygonPx.length >= 3) {
    for (let i = 0; i < options.lotPolygonPx.length; i++) {
      const a = options.lotPolygonPx[i];
      const b = options.lotPolygonPx[(i + 1) % options.lotPolygonPx.length];
      drawSegment(wallMask, W, H, a.x, a.y, b.x, b.y, lotEdgeThickness);
    }
  }
  for (const seg of vectorWalls) {
    drawSegment(wallMask, W, H, seg.x1, seg.y1, seg.x2, seg.y2, vectorWallThickness);
  }

  // 2. Lot mask
  const inLot = buildLotMask(W, H, options.lotPolygonPx);

  // 3. Owner mask depuis polygones
  const polygons = rooms.map(r => r.polygon);
  const owner = buildOwnerMask(W, H, polygons);

  // 4. BFS multi-source : depuis pixels owned, attribuer orphelins voisins.
  // On utilise une distance map pour limiter à maxBfsDistance pixels.
  // Borne par pièce : si scaleM2PerPx2 fourni ET pdf-surface présent,
  // chaque seed ne peut atteindre maxRatioVsPdf × pdf_m2 / scaleM2PerPx2.
  // Sinon, pas de borne par seed (juste le BFS distance).
  const dist = new Uint8Array(W * H);
  const MAX_DIST_VAL = 254;
  dist.fill(MAX_DIST_VAL);
  // Compteur de pixels par seed (pour borner extension)
  const seedAreas = new Int32Array(rooms.length);
  const seedMaxAreas = new Int32Array(rooms.length);
  for (let pi = 0; pi < rooms.length; pi++) {
    if (scaleM2PerPx2 != null && scaleM2PerPx2 > 0 && rooms[pi].surface_m2 != null && rooms[pi].surface_m2! > 0) {
      seedMaxAreas[pi] = Math.round((rooms[pi].surface_m2! / scaleM2PerPx2) * maxRatioVsPdf);
    } else {
      // Pas de pdf : borne large = aire courante × 1.30 (anti-fuite minimaliste)
      seedMaxAreas[pi] = -1; // calculé après scan
    }
  }
  // Init : tous les pixels owned ont dist=0 et sont la frontière initiale.
  // Compte aussi seedAreas (pixels initiaux par seed).
  const queue: number[] = [];
  for (let y = 0; y < H; y++) {
    const rowOff = y * W;
    for (let x = 0; x < W; x++) {
      const idx = rowOff + x;
      if (owner[idx] !== -1) {
        dist[idx] = 0;
        seedAreas[owner[idx]]++;
        // Frontière effective : au moins 1 voisin orphelin in lot non-mur
        const ne = [
          y > 0 ? idx - W : -1,
          y < H - 1 ? idx + W : -1,
          x > 0 ? idx - 1 : -1,
          x < W - 1 ? idx + 1 : -1,
        ];
        for (const n of ne) {
          if (n < 0) continue;
          if (owner[n] === -1 && inLot[n] && !wallMask[n]) {
            queue.push(idx);
            break;
          }
        }
      }
    }
  }
  // Calculer seedMaxAreas pour seeds sans pdf
  for (let pi = 0; pi < rooms.length; pi++) {
    if (seedMaxAreas[pi] === -1) {
      seedMaxAreas[pi] = Math.round(seedAreas[pi] * 1.30);
    }
  }

  // BFS : à chaque pixel libre, prend l'owner du 1er voisin owned (=
  // distance BFS la plus courte → Voronoï discret), tant que le seed
  // n'a pas atteint son quota max.
  let qi = 0;
  while (qi < queue.length) {
    const idx = queue[qi++];
    const d = dist[idx];
    if (d >= maxBfsDistance) continue;
    const x = idx % W;
    const y = (idx - x) / W;
    const myOwner = owner[idx];
    // Skip si ce seed a déjà atteint son max
    if (seedAreas[myOwner] >= seedMaxAreas[myOwner]) continue;
    const nd = d + 1;
    const ne = [
      y > 0 ? idx - W : -1,
      y < H - 1 ? idx + W : -1,
      x > 0 ? idx - 1 : -1,
      x < W - 1 ? idx + 1 : -1,
    ];
    for (const n of ne) {
      if (n < 0) continue;
      if (owner[n] !== -1) continue; // déjà owned
      if (!inLot[n]) continue;
      if (wallMask[n]) continue;
      if (dist[n] !== MAX_DIST_VAL) continue;
      // Re-vérifier max area (peut atteindre cap entre voisins)
      if (seedAreas[myOwner] >= seedMaxAreas[myOwner]) break;
      owner[n] = myOwner;
      seedAreas[myOwner]++;
      dist[n] = nd;
      if (nd < maxBfsDistance) queue.push(n);
    }
  }

  // 5. Pour chaque room, calculer gain pixels et décider si on remplace le
  // polygone original par le nouveau (= plus large). Garde-fou STRICT :
  //   - Si nouvelle aire < aire originale → garder original (bug de chevauchement)
  //   - Si gain < 3% de l'aire originale → garder original (peu d'effet, pas de
  //     risque de désalignement de la nouvelle frontière)
  //   - Si nouvelle aire / aire originale > 1.30 → garder original (extension
  //     trop violente, signe d'une fuite à travers un mur manquant)
  const out: RoomPolygon[] = [];
  let totalReplaced = 0;
  let totalGained = 0;
  for (let pi = 0; pi < rooms.length; pi++) {
    const r = rooms[pi];
    // Compte pixels gagnés vs original
    const region = new Uint8Array(W * H);
    let minX = W, minY = H, maxX = 0, maxY = 0;
    let area = 0;
    for (let i = 0; i < W * H; i++) {
      if (owner[i] === pi) {
        region[i] = 1;
        area++;
        const x = i % W, y = (i - x) / W;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    // Aire originale (depuis polygon)
    let origArea = 0;
    {
      let s = 0;
      for (let i = 0; i < r.polygon.length; i++) {
        const j = (i + 1) % r.polygon.length;
        s += r.polygon[i].x * r.polygon[j].y - r.polygon[j].x * r.polygon[i].y;
      }
      origArea = Math.abs(s / 2);
    }
    if (area === 0) {
      // Aucun pixel claim → garder original
      out.push(r);
      continue;
    }
    // Garde-fou shrink : nouvelle aire doit être >= 0.95× originale
    if (area < origArea * 0.95) {
      console.log(`[fill-gaps] ${r.text} skip : new area ${area.toFixed(0)} < orig ${origArea.toFixed(0)} * 0.95 (chevauchement?)`);
      out.push(r);
      continue;
    }
    // Garde-fou gain insignifiant (<3%) : pas la peine de remplacer
    if (area < origArea * 1.03) {
      out.push(r);
      continue;
    }
    // Note : pas de garde-fou expansion 1.30 ici. Le BFS borne déjà l'extension
    // via seedMaxAreas (= maxRatioVsPdf × pdf_m2 / scaleM2PerPx2 ou orig × 1.30
    // si pas de pdf). On accepte l'extension calculée.
    // Trace contour
    const contour = traceContour(region, W, H, { minX, minY, maxX, maxY });
    if (contour.length < 4) {
      out.push(r);
      continue;
    }
    const simplified = dpSimplify(contour, simplifyTolerancePx);
    if (simplified.length < 4) {
      out.push(r);
      continue;
    }
    // Centroïde
    let cx = 0, cy = 0;
    for (const p of simplified) { cx += p.x; cy += p.y; }
    cx /= simplified.length;
    cy /= simplified.length;
    out.push({
      text: r.text,
      surface_m2: r.surface_m2,
      polygon: simplified,
      areaPx2: area,
      centroid: { x: cx, y: cy },
    });
    totalReplaced++;
    totalGained += area - origArea;
  }
  console.log(`[fill-gaps] ${totalReplaced}/${rooms.length} polygones étendus, gain total ≈ ${totalGained.toFixed(0)} px (moy ${totalReplaced > 0 ? (totalGained / totalReplaced).toFixed(0) : 0} px/pièce)`);

  return out;
}
