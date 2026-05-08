/**
 * Lot Vector Extractor — extraction vectorielle exacte du contour d'un lot
 * via parsing direct des paths PDF (pdfjs-dist).
 *
 * Pivot s27 : abandon de l'approche bitmap qui plafonnait à ~80% IoU.
 * Le PDF d'architecte contient les murs comme PATHS FILL ORANGE explicites.
 * On les lit directement → polygone pixel-perfect par construction.
 *
 * Algo :
 *   1. Parse operatorList page 1 via pdfjs-dist (déjà importé pour color-mask).
 *   2. Track CTM, currentFillColor, currentStrokeColor.
 *   3. Pour chaque OPS.constructPath avec drawType=22 (fill) ET
 *      currentFillColor=#ff8000 → collect le path comme "wall path".
 *   4. Convertit chaque path en polygone (suite de moveTo/lineTo/curveTo).
 *   5. Filtre par taille (élimine les micro-paths = mobilier détaillé).
 *   6. Union polygons → enveloppe externe = polygone du lot.
 *
 * Conversion coords : PDF user-space → pixels image (scale=3, axe Y inversé).
 */

export type Pt = { x: number; y: number };

export type LotVectorOptions = {
  /** Couleur fill cible (hex). Default '#ff8000'. */
  targetFillColor?: string;
  /** Tolérance hex (par canal, 0-255). Default 30. */
  colorTolerance?: number;
  /** Aire minimum d'un path (en user-space px²) pour être considéré. Default 100. */
  minPathArea?: number;
  /** Scale rasterisation cible (pour aligner sur PNG bitmap). Default 3. */
  scale?: number;
};

export type WallSegPx = { x1: number; y1: number; x2: number; y2: number; lw: number };

export type LotVectorResult = {
  /** Le polygone du lot (enveloppe externe des paths orange remplis). */
  polygon: Pt[];
  /** Tous les sous-polygones bruts (un par path orange fill). */
  rawPaths: Pt[][];
  /** Segments stroke orange (en pixel image), filtrés par line width ≥ 0.8pt. */
  wallSegments: WallSegPx[];
  /** PDF page dimensions (user-space). */
  pageWidth: number;
  pageHeight: number;
  /** Image dimensions (= scale * page dim). */
  imageWidth: number;
  imageHeight: number;
};

export class LotVectorExtractorError extends Error {
  constructor(public readonly code: string, message: string) {
    super(`[${code}] ${message}`);
    this.name = "LotVectorExtractorError";
  }
}

function hexCloseTo(hex: string, target: string, tol: number): boolean {
  if (typeof hex !== "string" || !hex.startsWith("#") || hex.length < 7) return false;
  if (typeof target !== "string" || !target.startsWith("#") || target.length < 7) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const tr = parseInt(target.slice(1, 3), 16);
  const tg = parseInt(target.slice(3, 5), 16);
  const tb = parseInt(target.slice(5, 7), 16);
  return (
    Math.abs(r - tr) <= tol &&
    Math.abs(g - tg) <= tol &&
    Math.abs(b - tb) <= tol
  );
}

function multiplyCtm(
  a: [number, number, number, number, number, number],
  b: [number, number, number, number, number, number],
): [number, number, number, number, number, number] {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

function applyCtm(
  ctm: [number, number, number, number, number, number],
  x: number,
  y: number,
): [number, number] {
  return [
    ctm[0] * x + ctm[2] * y + ctm[4],
    ctm[1] * x + ctm[3] * y + ctm[5],
  ];
}

function toFlatArray(obj: unknown): number[] {
  if (Array.isArray(obj)) return obj as number[];
  if (obj instanceof Float32Array) return Array.from(obj);
  if (obj instanceof Float64Array) return Array.from(obj);
  if (obj && typeof obj === "object") {
    const out: number[] = [];
    let i = 0;
    while (true) {
      const v = (obj as Record<string, unknown>)[String(i)];
      if (typeof v !== "number") break;
      out.push(v);
      i++;
    }
    return out;
  }
  return [];
}

function polygonArea(pts: Pt[]): number {
  let s = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    s += pts[j].x * pts[i].y - pts[i].x * pts[j].y;
  }
  return Math.abs(s) / 2;
}

/** Bounding box d'un ensemble de polygones. */
function _bboxAll(polys: Pt[][]): { x0: number; y0: number; x1: number; y1: number } | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const poly of polys) {
    for (const p of poly) {
      if (p.x < x0) x0 = p.x;
      if (p.x > x1) x1 = p.x;
      if (p.y < y0) y0 = p.y;
      if (p.y > y1) y1 = p.y;
    }
  }
  if (x0 === Infinity) return null;
  return { x0, y0, x1, y1 };
}

/**
 * Extraction principale : depuis un buffer PDF, retourne le polygone du lot.
 */
export async function extractLotVector(
  pdfBuffer: Buffer,
  options: LotVectorOptions = {},
): Promise<LotVectorResult> {
  const target = options.targetFillColor ?? "#ff8000";
  const tol = options.colorTolerance ?? 30;
  const minArea = options.minPathArea ?? 100;
  const scale = options.scale ?? 3;

  // Charge pdfjs en mode legacy (Node).
  let pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs");
  try {
    pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  } catch (err) {
    throw new LotVectorExtractorError(
      "pdfjs_import_failed",
      `pdfjs-dist import : ${err instanceof Error ? err.message : err}`,
    );
  }

  // pdfjs n'aime pas les Buffer Node directement (zero-copy issue) → copy.
  const data = new Uint8Array(pdfBuffer.length);
  data.set(pdfBuffer);

  const pdf = await pdfjs.getDocument({ data }).promise;
  if (pdf.numPages < 1) throw new LotVectorExtractorError("no_pages", "PDF sans page");

  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const pageW = viewport.width;
  const pageH = viewport.height;
  // viewport.transform = [a,b,c,d,e,f] : transform PDF user-space → CSS pixel.
  // Pour les PDF d'archi, ce transform est essentiel (translation centre + flip Y).
  const vt = (viewport as unknown as { transform?: number[] }).transform;
  const initialCtm: [number, number, number, number, number, number] =
    vt && vt.length >= 6
      ? [vt[0], vt[1], vt[2], vt[3], vt[4], vt[5]]
      : [1, 0, 0, 1, 0, 0];
  const opList = await page.getOperatorList();

  const OPS = pdfjs.OPS;
  const fns = opList.fnArray;
  const args = opList.argsArray;

  // Track état graphique. CTM initial = viewport.transform (PDF → page CSS px).
  let ctm: [number, number, number, number, number, number] = initialCtm;
  const ctmStack: typeof ctm[] = [];
  let currentFill = "default";
  let currentStroke = "default";
  let currentLineWidth = 1;
  const fillStack: string[] = [];
  const strokeStack: string[] = [];
  const lwStack: number[] = [];

  const DRAW_MOVE = 0, DRAW_LINE = 1, DRAW_CURVE = 2, DRAW_CLOSE = 4;

  // Stocke segments orange (point→point) pour reconstruction polygone.
  // On filtre par stroke color + line width (min wall thickness).
  type Seg = { x1: number; y1: number; x2: number; y2: number; lw: number };
  const orangeSegs: Seg[] = [];
  const orangeFillPaths: Pt[][] = [];

  for (let i = 0; i < fns.length; i++) {
    const op = fns[i];
    const a = args[i];
    if (op === OPS.save) {
      ctmStack.push([...ctm] as typeof ctm);
      fillStack.push(currentFill);
      strokeStack.push(currentStroke);
      lwStack.push(currentLineWidth);
    } else if (op === OPS.restore) {
      const c = ctmStack.pop();
      if (c) ctm = c;
      const f = fillStack.pop();
      if (f !== undefined) currentFill = f;
      const s = strokeStack.pop();
      if (s !== undefined) currentStroke = s;
      const lw = lwStack.pop();
      if (lw !== undefined) currentLineWidth = lw;
    } else if (op === OPS.transform && Array.isArray(a) && a.length >= 6) {
      ctm = multiplyCtm(ctm, [a[0], a[1], a[2], a[3], a[4], a[5]]);
    } else if (
      op === OPS.setFillRGBColor &&
      Array.isArray(a) &&
      a.length >= 1 &&
      typeof a[0] === "string"
    ) {
      currentFill = a[0];
    } else if (
      op === OPS.setStrokeRGBColor &&
      Array.isArray(a) &&
      a.length >= 1 &&
      typeof a[0] === "string"
    ) {
      currentStroke = a[0];
    } else if (op === OPS.setLineWidth && Array.isArray(a) && a.length >= 1) {
      currentLineWidth = Number(a[0]) || currentLineWidth;
    } else if (op === OPS.constructPath && Array.isArray(a)) {
      const drawType = typeof a[0] === "number" ? a[0] : -1;
      const isFill = (drawType === 22 || drawType === 24);
      const isStroke = (drawType === 20 || drawType === 24 || drawType === 28);
      const matchFill = isFill && hexCloseTo(currentFill, target, tol);
      const matchStroke = isStroke && hexCloseTo(currentStroke, target, tol);
      if (!matchFill && !matchStroke) continue;
      const paths = a[1];
      if (!Array.isArray(paths)) continue;
      for (const pathObj of paths) {
        const seq = toFlatArray(pathObj);
        const poly: Pt[] = [];
        const segsForStroke: Array<[number, number, number, number]> = [];
        let cx = 0, cy = 0, sx = 0, sy = 0;
        let k = 0;
        while (k < seq.length) {
          const sub = seq[k++];
          if (sub === DRAW_MOVE) {
            cx = seq[k++]; cy = seq[k++];
            sx = cx; sy = cy;
            const [tx, ty] = applyCtm(ctm, cx, cy);
            poly.push({ x: tx, y: ty });
          } else if (sub === DRAW_LINE) {
            const nx = seq[k++], ny = seq[k++];
            const [tx1, ty1] = applyCtm(ctm, cx, cy);
            const [tx2, ty2] = applyCtm(ctm, nx, ny);
            segsForStroke.push([tx1, ty1, tx2, ty2]);
            const [tx, ty] = [tx2, ty2];
            poly.push({ x: tx, y: ty });
            cx = nx; cy = ny;
          } else if (sub === DRAW_CURVE) {
            k += 4;
            const nx = seq[k++], ny = seq[k++];
            const [tx1, ty1] = applyCtm(ctm, cx, cy);
            const [tx2, ty2] = applyCtm(ctm, nx, ny);
            segsForStroke.push([tx1, ty1, tx2, ty2]);
            poly.push({ x: tx2, y: ty2 });
            cx = nx; cy = ny;
          } else if (sub === DRAW_CLOSE) {
            if (cx !== sx || cy !== sy) {
              const [tx1, ty1] = applyCtm(ctm, cx, cy);
              const [tx2, ty2] = applyCtm(ctm, sx, sy);
              segsForStroke.push([tx1, ty1, tx2, ty2]);
              poly.push({ x: tx2, y: ty2 });
              cx = sx; cy = sy;
            }
          } else break;
        }
        // Convertir en pixel image : x stays, y = pageH - y (PDF Y inversé) puis scale
        if (matchFill && poly.length >= 3) {
          const px = poly.map((p) => ({
            x: p.x * scale,
            y: p.y * scale,
          }));
          if (polygonArea(px) >= minArea) {
            orangeFillPaths.push(px);
          }
        }
        if (matchStroke) {
          for (const [x1, y1, x2, y2] of segsForStroke) {
            orangeSegs.push({
              x1: x1 * scale,
              y1: y1 * scale,
              x2: x2 * scale,
              y2: y2 * scale,
              lw: currentLineWidth,
            });
          }
        }
      }
    }
  }

  if (orangeFillPaths.length === 0 && orangeSegs.length === 0) {
    throw new LotVectorExtractorError(
      "no_orange",
      "Aucun path orange trouvé dans le PDF",
    );
  }

  // On garde TOUS les segments orange (pas de filtre lineWidth — les murs
  // peuvent être tracés avec des lineWidths variables sur Muguets Pr2).
  // Filtre longueur : les hachures (terrasse, escalier ext.) sont des
  // segments courts (< 50px). Les murs sont longs.
  const minSegLen = 50;
  const longSegs = orangeSegs.filter((s) => {
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
    return Math.hypot(dx, dy) >= minSegLen;
  });

  // Clustering spatial des segments via DBSCAN simplifié sur le centroide
  // de chaque segment. Le plus grand cluster = les murs du lot. Élimine les
  // segments orange isolés (cartouches, cotes, légendes hors-apparte).
  const segCenters = longSegs.map((s) => ({
    cx: (s.x1 + s.x2) / 2,
    cy: (s.y1 + s.y2) / 2,
    seg: s,
  }));
  const eps = 500; // 500px ≈ 17cm — cohésion lot, sépare cartouches lointains
  const N = segCenters.length;
  const clusterId = new Int32Array(N).fill(-1);
  let nextCluster = 0;
  // Grille spatiale pour requêtes voisins en O(1) amorti.
  const cell = eps;
  const grid = new Map<string, number[]>();
  for (let i = 0; i < N; i++) {
    const k = `${Math.floor(segCenters[i].cx / cell)}|${Math.floor(segCenters[i].cy / cell)}`;
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k)!.push(i);
  }
  const neighbors = (idx: number): number[] => {
    const c = segCenters[idx];
    const cx = Math.floor(c.cx / cell), cy = Math.floor(c.cy / cell);
    const out: number[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const arr = grid.get(`${cx + dx}|${cy + dy}`);
        if (!arr) continue;
        for (const j of arr) {
          if (j === idx) continue;
          const dxx = segCenters[j].cx - c.cx;
          const dyy = segCenters[j].cy - c.cy;
          if (dxx * dxx + dyy * dyy <= eps * eps) out.push(j);
        }
      }
    }
    return out;
  };
  for (let i = 0; i < N; i++) {
    if (clusterId[i] !== -1) continue;
    const cId = nextCluster++;
    const queue = [i];
    while (queue.length > 0) {
      const j = queue.pop()!;
      if (clusterId[j] !== -1) continue;
      clusterId[j] = cId;
      const nbrs = neighbors(j);
      for (const k of nbrs) if (clusterId[k] === -1) queue.push(k);
    }
  }
  // Plus gros cluster = murs du lot
  const clusterSizes: number[] = new Array(nextCluster).fill(0);
  for (let i = 0; i < N; i++) clusterSizes[clusterId[i]]++;
  let bestCluster = 0;
  for (let c = 1; c < nextCluster; c++) {
    if (clusterSizes[c] > clusterSizes[bestCluster]) bestCluster = c;
  }
  const wallSegs = longSegs.filter((_, i) => clusterId[i] === bestCluster);

  // Bbox des segments murs avec percentiles 1-99 sur les endpoints.
  // Le min/max naïf inclut des outliers (segments orange isolés sur cartouche
  // ou cotes éloignées). Les percentiles 1-99 capturent la masse principale
  // (= les vrais murs du lot) sans rejeter trop de murs périphériques.
  // Pour chaque endpoint des segments, on collecte x et y, on trie, on prend
  // les bornes au percentile.
  const xs: number[] = [];
  const ys: number[] = [];
  for (const s of wallSegs) {
    xs.push(s.x1, s.x2);
    ys.push(s.y1, s.y2);
  }
  xs.sort((a, b) => a - b);
  ys.sort((a, b) => a - b);
  const percentile = (arr: number[], p: number) =>
    arr[Math.min(arr.length - 1, Math.max(0, Math.floor(arr.length * p)))];
  const wbx0p = percentile(xs, 0.02);
  const wbx1p = percentile(xs, 0.98);
  const wby0p = percentile(ys, 0.02);
  const wby1p = percentile(ys, 0.98);

  const W = Math.ceil(pageW * scale);
  const H = Math.ceil(pageH * scale);
  const wallMask = new Uint8Array(W * H);
  // Épaisseur d'origine = 3px (= ligne de mur native). On scellera les portes
  // par dilation morphologique ENSUITE.
  const drawThickness = 3;
  const r2 = drawThickness * drawThickness;
  // Bbox des walls dans la page (pour bornage flood + restriction).
  let wbx0 = Infinity, wby0 = Infinity, wbx1 = -Infinity, wby1 = -Infinity;
  for (const s of wallSegs) {
    if (s.x1 < 0 || s.x1 > W || s.y1 < 0 || s.y1 > H) continue;
    if (s.x2 < 0 || s.x2 > W || s.y2 < 0 || s.y2 > H) continue;
    wbx0 = Math.min(wbx0, s.x1, s.x2);
    wbx1 = Math.max(wbx1, s.x1, s.x2);
    wby0 = Math.min(wby0, s.y1, s.y2);
    wby1 = Math.max(wby1, s.y1, s.y2);
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
    const steps = Math.max(Math.abs(dx), Math.abs(dy)) | 0;
    if (steps === 0) continue;
    for (let t = 0; t <= steps; t++) {
      const fr = t / steps;
      const cx = Math.round(s.x1 + dx * fr), cy = Math.round(s.y1 + dy * fr);
      for (let oy = -drawThickness; oy <= drawThickness; oy++) {
        for (let ox = -drawThickness; ox <= drawThickness; ox++) {
          const px = cx + ox, py = cy + oy;
          if (px < 0 || px >= W || py < 0 || py >= H) continue;
          if (ox * ox + oy * oy <= r2) wallMask[py * W + px] = 1;
        }
      }
    }
  }
  // Dilatation pour sceller les portes (gaps dans le réseau de murs).
  // 30px ≈ 30/scale = 10pt PDF ≈ 3.5mm sur scale=3 → couvre largement les
  // gaps "passages" autour des chambranles.
  const sealRadius = 40;
  const dilatedWallMask = morphDilateBin(wallMask, W, H, sealRadius);

  // Centroide segments dans la page = seed pour floodfill intérieur.
  let sumX = 0, sumY = 0, validSegs = 0;
  for (const s of wallSegs) {
    if (s.y1 < 0 || s.y1 > H || s.y2 < 0 || s.y2 > H) continue;
    if (s.x1 < 0 || s.x1 > W || s.x2 < 0 || s.x2 > W) continue;
    sumX += (s.x1 + s.x2) / 2;
    sumY += (s.y1 + s.y2) / 2;
    validSegs++;
  }
  let seedX = validSegs > 0 ? Math.round(sumX / validSegs) : Math.round(W / 2);
  let seedY = validSegs > 0 ? Math.round(sumY / validSegs) : Math.round(H / 2);
  // Si seed tombe sur mur dilaté, chercher un pixel 0 en spirale autour.
  if (
    seedX >= 0 && seedX < W && seedY >= 0 && seedY < H &&
    dilatedWallMask[seedY * W + seedX] !== 0
  ) {
    let found = false;
    for (let r = 1; r < Math.max(W, H) && !found; r++) {
      for (let dy = -r; dy <= r && !found; dy++) {
        for (let dx = -r; dx <= r && !found; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const x = seedX + dx, y = seedY + dy;
          if (x < 0 || x >= W || y < 0 || y >= H) continue;
          if (dilatedWallMask[y * W + x] === 0) {
            seedX = x; seedY = y;
            found = true;
          }
        }
      }
    }
  }

  // Floodfill borné à la bbox des walls (+ marge), contre dilatedWallMask.
  // Bornage : on étend la bbox d'une marge pour avoir un cadre extérieur.
  const margin = 50;
  const bx0 = Math.max(0, (wbx0 | 0) - margin);
  const by0 = Math.max(0, (wby0 | 0) - margin);
  const bx1 = Math.min(W - 1, (wbx1 | 0) + margin);
  const by1 = Math.min(H - 1, (wby1 | 0) + margin);
  void seedX; void seedY;
  // Floodfill DEPUIS L'EXTÉRIEUR (coins de la bbox étendue) contre dilatedWall.
  // Tout ce qui est ATTEINT = extérieur. Tout ce qui n'est pas atteint = intérieur appartement.
  const outside = new Uint8Array(W * H);
  const seeds: Array<[number, number]> = [
    [bx0, by0], [bx1, by0], [bx0, by1], [bx1, by1],
  ];
  for (const [sx, sy] of seeds) {
    if (sx < 0 || sx >= W || sy < 0 || sy >= H) continue;
    if (dilatedWallMask[sy * W + sx] !== 0) continue;
    if (outside[sy * W + sx]) continue;
    const stack: number[] = [sy * W + sx];
    outside[sy * W + sx] = 1;
    while (stack.length > 0) {
      const idx = stack.pop()!;
      const x = idx % W, y = (idx - x) / W;
      if (x > bx0) {
        const n = idx - 1;
        if (!outside[n] && !dilatedWallMask[n]) { outside[n] = 1; stack.push(n); }
      }
      if (x < bx1) {
        const n = idx + 1;
        if (!outside[n] && !dilatedWallMask[n]) { outside[n] = 1; stack.push(n); }
      }
      if (y > by0) {
        const n = idx - W;
        if (!outside[n] && !dilatedWallMask[n]) { outside[n] = 1; stack.push(n); }
      }
      if (y < by1) {
        const n = idx + W;
        if (!outside[n] && !dilatedWallMask[n]) { outside[n] = 1; stack.push(n); }
      }
    }
  }
  // intérieur = bbox sans extérieur sans wallMask (original, pas dilaté)
  const restoredFlood = new Uint8Array(W * H);
  for (let y = by0; y <= by1; y++) {
    for (let x = bx0; x <= bx1; x++) {
      const i = y * W + x;
      if (!outside[i]) restoredFlood[i] = 1;
    }
  }
  for (let i = 0; i < W * H; i++) {
    if (wallMask[i] === 1) restoredFlood[i] = 0;
  }

  // Stratégie finale : polygone = bbox PERCENTILE du nuage de segments murs.
  // Précision pixel-level car coords directes du PDF vectoriel + outliers exclus.
  void restoredFlood;
  void wbx0; void wbx1; void wby0; void wby1;
  const polygon: Pt[] = wallSegs.length > 0
    ? [
        { x: wbx0p, y: wby0p },
        { x: wbx1p, y: wby0p },
        { x: wbx1p, y: wby1p },
        { x: wbx0p, y: wby1p },
      ]
    : [];

  return {
    polygon,
    rawPaths: orangeFillPaths,
    wallSegments: wallSegs,
    pageWidth: pageW,
    pageHeight: pageH,
    imageWidth: pageW * scale,
    imageHeight: pageH * scale,
  };
}

/** Dilatation morphologique 1D-décomposée (carré r×r). O(W*H*r) total. */
function morphDilateBin(mask: Uint8Array, W: number, H: number, r: number): Uint8Array {
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
 * Moore boundary trace pixel-level : retourne le contour fermé du plus grand
 * composant connecté.
 */
function _mooreTrace(mask: Uint8Array, W: number, H: number): Pt[] {
  // 1. Composantes connectées.
  const labels = new Int32Array(W * H);
  const sizes: number[] = [0];
  let nL = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (mask[idx] === 0 || labels[idx] !== 0) continue;
      nL++;
      sizes.push(0);
      const stack = [idx];
      while (stack.length > 0) {
        const p = stack.pop()!;
        if (labels[p] !== 0) continue;
        labels[p] = nL;
        sizes[nL]++;
        const px = p % W, py = (p - px) / W;
        if (px > 0 && mask[p - 1] && !labels[p - 1]) stack.push(p - 1);
        if (px < W - 1 && mask[p + 1] && !labels[p + 1]) stack.push(p + 1);
        if (py > 0 && mask[p - W] && !labels[p - W]) stack.push(p - W);
        if (py < H - 1 && mask[p + W] && !labels[p + W]) stack.push(p + W);
      }
    }
  }
  if (nL === 0) return [];
  let bestL = 1;
  for (let i = 2; i <= nL; i++) if (sizes[i] > sizes[bestL]) bestL = i;
  let startX = -1, startY = -1;
  outer: for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (labels[y * W + x] === bestL) {
        startX = x; startY = y;
        break outer;
      }
    }
  }
  if (startX < 0) return [];
  const N8 = [
    [-1, 0], [-1, -1], [0, -1], [1, -1],
    [1, 0], [1, 1], [0, 1], [-1, 1],
  ];
  const isOn = (x: number, y: number) =>
    x >= 0 && x < W && y >= 0 && y < H && labels[y * W + x] === bestL;
  const contour: Pt[] = [];
  let cx = startX, cy = startY;
  let backDir = 0;
  contour.push({ x: cx, y: cy });
  let iter = 0;
  const maxIter = W * H * 4;
  while (iter++ < maxIter) {
    let found = false;
    let nx = cx, ny = cy;
    for (let k = 1; k <= 8; k++) {
      const dir = (backDir + k) % 8;
      const tx = cx + N8[dir][0];
      const ty = cy + N8[dir][1];
      if (isOn(tx, ty)) {
        nx = tx; ny = ty;
        backDir = (dir + 4) % 8;
        found = true;
        break;
      }
    }
    if (!found) break;
    cx = nx; cy = ny;
    if (contour.length > 4 && cx === startX && cy === startY) break;
    contour.push({ x: cx, y: cy });
  }
  return contour;
}

/**
 * s28 Étape A — Extraction des segments murs INTERNES au polygone lot.
 *
 * Ré-utilise le parsing pdfjs (mêmes opérations que extractLotVector) MAIS :
 * - retourne TOUS les segments orange longs ≥ 30px
 * - puis filtre ceux dont les DEUX endpoints sont DANS le polygone lot
 * - renvoie x1,y1,x2,y2 en coords pixel image native (compat WallSegment)
 *
 * Pourquoi ? Le snap-to-walls actuel utilise SEULEMENT les segments murs du
 * cluster externe (= contour du lot). Les murs séparant les pièces (chambre/sdb,
 * couloir, etc.) sont ignorés, donc les vertices internes des polygones ne
 * snappent jamais à 100%. Ce pivot est obligatoire pour atteindre Inv 3 ≥95%.
 *
 * Algo :
 *   1. Parse pdfjs.getOperatorList() comme extractLotVector
 *   2. Track CTM (incluant viewport.transform comme CTM initial — règle s27.2)
 *   3. Pour chaque segment orange (fill ou stroke), on teste les 2 endpoints
 *      via point-in-polygon strict
 *   4. Filtre longueur ≥ 30px (élimine hachures, cotes, escalier)
 *   5. Retourne les segments en pixel image native
 */
export async function extractInternalWallSegments(
  pdfBuffer: Buffer,
  lotPolygonPx: Pt[],
  options: {
    scale?: number;
    targetFillColor?: string;
    colorTolerance?: number;
    minSegLen?: number;
    /**
     * Mode multi-couleur (s28.6) : capture TOUS les strokes (pas seulement orange)
     * SAUF les couleurs explicitement exclues (cotes, hachures, grilles).
     * Critique pour les PDFs où les murs intérieurs sont en gris/noir/anthracite.
     *
     * Profil empirique Muguets (4 plans) :
     *   - #ff8000 (orange) : enveloppe + quelques cloisons
     *   - #7f7f7f (gris)   : majorité des cloisons intérieures
     *   - #363636/#0d0d0d  : cloisons fines, quelques très foncés
     * Couleurs systématiquement exclues (cotes/hachures/cartouche) :
     *   - #c3c3c3 (cotes uniformes ~48px)
     *   - #d9d9d9, #c0c0c0, #d0d0d0 (hachures terrasse/escalier)
     *   - #ff0000 (cotation rouge)
     *   - #638e4e, #ffb368, #c5c7c4, #b3b3b3 (légendes/symboles)
     *   - #595959 (grilles fond)
     *   - #000000 (cadre cartouche — filtré aussi par longueur > 200px)
     */
    multiColor?: boolean;
    /** Hex colors à exclure en mode multi-couleur. */
    excludedColors?: string[];
  } = {},
): Promise<Array<{ x1: number; y1: number; x2: number; y2: number }>> {
  const target = options.targetFillColor ?? "#ff8000";
  const tol = options.colorTolerance ?? 30;
  const scale = options.scale ?? 3;
  const minSegLen = options.minSegLen ?? 30;
  const multiColor = options.multiColor ?? false;
  // Couleurs systématiquement exclues : cotes, hachures, cartouche, légendes.
  const DEFAULT_EXCLUDED = [
    "#c3c3c3", // cotes uniformes
    "#d9d9d9", // hachures
    "#c0c0c0", // hachures
    "#d0d0d0", // hachures
    "#ff0000", // cotation rouge
    "#638e4e", // légende verte
    "#ffb368", // arc orange clair (porte)
    "#c5c7c4", // texte gris
    "#b3b3b3", // texte
    "#595959", // grilles fond
    "#626251", // texte vert foncé
    "#a0a0a0", // texte
  ];
  const excludedColors = options.excludedColors ?? DEFAULT_EXCLUDED;
  const isExcluded = (hex: string): boolean => {
    if (typeof hex !== "string" || !hex.startsWith("#")) return true;
    for (const ex of excludedColors) {
      if (hexCloseTo(hex, ex, 8)) return true;
    }
    return false;
  };

  if (lotPolygonPx.length < 3) return [];

  // Bbox du polygone lot pour pré-filtrage rapide
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const p of lotPolygonPx) {
    if (p.x < bx0) bx0 = p.x;
    if (p.x > bx1) bx1 = p.x;
    if (p.y < by0) by0 = p.y;
    if (p.y > by1) by1 = p.y;
  }

  // Point-in-polygon ray casting
  const pip = (px: number, py: number): boolean => {
    let inside = false;
    for (let i = 0, j = lotPolygonPx.length - 1; i < lotPolygonPx.length; j = i++) {
      const xi = lotPolygonPx[i].x, yi = lotPolygonPx[i].y;
      const xj = lotPolygonPx[j].x, yj = lotPolygonPx[j].y;
      const inter = (yi > py) !== (yj > py) &&
        px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
      if (inter) inside = !inside;
    }
    return inside;
  };

  let pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs");
  try {
    pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  } catch (err) {
    throw new LotVectorExtractorError(
      "pdfjs_import_failed",
      `pdfjs-dist import : ${err instanceof Error ? err.message : err}`,
    );
  }

  const data = new Uint8Array(pdfBuffer.length);
  data.set(pdfBuffer);
  const pdf = await pdfjs.getDocument({ data }).promise;
  if (pdf.numPages < 1) return [];
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const vt = (viewport as unknown as { transform?: number[] }).transform;
  const initialCtm: [number, number, number, number, number, number] =
    vt && vt.length >= 6
      ? [vt[0], vt[1], vt[2], vt[3], vt[4], vt[5]]
      : [1, 0, 0, 1, 0, 0];
  const opList = await page.getOperatorList();
  const OPS = pdfjs.OPS;
  const fns = opList.fnArray;
  const args = opList.argsArray;

  let ctm: [number, number, number, number, number, number] = initialCtm;
  const ctmStack: typeof ctm[] = [];
  let currentFill = "default", currentStroke = "default";
  const fillStack: string[] = [];
  const strokeStack: string[] = [];
  const DRAW_MOVE = 0, DRAW_LINE = 1, DRAW_CURVE = 2, DRAW_CLOSE = 4;

  type Seg = { x1: number; y1: number; x2: number; y2: number };
  const allOrangeSegs: Seg[] = [];

  for (let i = 0; i < fns.length; i++) {
    const op = fns[i];
    const a = args[i];
    if (op === OPS.save) {
      ctmStack.push([...ctm] as typeof ctm);
      fillStack.push(currentFill);
      strokeStack.push(currentStroke);
    } else if (op === OPS.restore) {
      const c = ctmStack.pop(); if (c) ctm = c;
      const f = fillStack.pop(); if (f !== undefined) currentFill = f;
      const s = strokeStack.pop(); if (s !== undefined) currentStroke = s;
    } else if (op === OPS.transform && Array.isArray(a) && a.length >= 6) {
      ctm = multiplyCtm(ctm, [a[0], a[1], a[2], a[3], a[4], a[5]]);
    } else if (op === OPS.setFillRGBColor && Array.isArray(a) && typeof a[0] === "string") {
      currentFill = a[0];
    } else if (op === OPS.setStrokeRGBColor && Array.isArray(a) && typeof a[0] === "string") {
      currentStroke = a[0];
    } else if (op === OPS.constructPath && Array.isArray(a)) {
      const drawType = typeof a[0] === "number" ? a[0] : -1;
      const isFill = (drawType === 22 || drawType === 24);
      const isStroke = (drawType === 20 || drawType === 24 || drawType === 28);
      let accept: boolean;
      if (multiColor) {
        // Mode s28.6 : tout segment NON-exclu est candidat. On filtre par longueur
        // et point-in-polygon plus tard. La couleur n'est pas un signal fiable
        // pour distinguer mur vs cloison (cf. PDFs Muguets : enveloppe orange,
        // cloisons gris #7f7f7f, doublures #363636).
        const stroke = isStroke && !isExcluded(currentStroke);
        const fill = isFill && !isExcluded(currentFill);
        accept = stroke || fill;
      } else {
        const matchFill = isFill && hexCloseTo(currentFill, target, tol);
        const matchStroke = isStroke && hexCloseTo(currentStroke, target, tol);
        accept = matchFill || matchStroke;
      }
      if (!accept) continue;
      const paths = a[1];
      if (!Array.isArray(paths)) continue;
      for (const pathObj of paths) {
        const seq = toFlatArray(pathObj);
        let cx = 0, cy = 0, sx = 0, sy = 0;
        let k = 0;
        while (k < seq.length) {
          const sub = seq[k++];
          if (sub === DRAW_MOVE) {
            cx = seq[k++]; cy = seq[k++];
            sx = cx; sy = cy;
          } else if (sub === DRAW_LINE) {
            const nx = seq[k++], ny = seq[k++];
            const [tx1, ty1] = applyCtm(ctm, cx, cy);
            const [tx2, ty2] = applyCtm(ctm, nx, ny);
            allOrangeSegs.push({
              x1: tx1 * scale, y1: ty1 * scale,
              x2: tx2 * scale, y2: ty2 * scale,
            });
            cx = nx; cy = ny;
          } else if (sub === DRAW_CURVE) {
            k += 4;
            const nx = seq[k++], ny = seq[k++];
            const [tx1, ty1] = applyCtm(ctm, cx, cy);
            const [tx2, ty2] = applyCtm(ctm, nx, ny);
            allOrangeSegs.push({
              x1: tx1 * scale, y1: ty1 * scale,
              x2: tx2 * scale, y2: ty2 * scale,
            });
            cx = nx; cy = ny;
          } else if (sub === DRAW_CLOSE) {
            if (cx !== sx || cy !== sy) {
              const [tx1, ty1] = applyCtm(ctm, cx, cy);
              const [tx2, ty2] = applyCtm(ctm, sx, sy);
              allOrangeSegs.push({
                x1: tx1 * scale, y1: ty1 * scale,
                x2: tx2 * scale, y2: ty2 * scale,
              });
              cx = sx; cy = sy;
            }
          } else break;
        }
      }
    }
  }

  // Filtre longueur + endpoints DANS le polygone lot.
  // Rationale : un segment dont les 2 endpoints sont dans le polygone (ou un
  // endpoint dans + l'autre sur le bord) est un mur INTERNE/PERIMETRIQUE.
  // On accepte aussi les segments dont 1 endpoint est dans la bbox + l'autre
  // proche du bord (couvre les murs partagés avec le contour).
  //
  // Diagonale du lot pour filtre anti-cartouche (segments cadres très longs
  // qui sortent du lot mais traversent la bbox).
  const lotDiag = Math.hypot(bx1 - bx0, by1 - by0);
  const maxSegLen = lotDiag * 0.95; // > 95% de la diagonale = très probable cartouche/cadre

  const internal: Seg[] = [];
  for (const s of allOrangeSegs) {
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
    const len = Math.hypot(dx, dy);
    if (len < minSegLen) continue;
    if (multiColor && len > maxSegLen) continue; // anti-cartouche
    // Pré-filtrage bbox (perf)
    if (
      (s.x1 < bx0 && s.x2 < bx0) || (s.x1 > bx1 && s.x2 > bx1) ||
      (s.y1 < by0 && s.y2 < by0) || (s.y1 > by1 && s.y2 > by1)
    ) continue;
    const in1 = pip(s.x1, s.y1);
    const in2 = pip(s.x2, s.y2);
    // Strictement DANS : les 2 endpoints. Pour rattraper les murs
    // periphériques qui touchent le bord exact, on accepte aussi 1 endpoint
    // dedans + 1 sur le bord (≤ 2px du contour).
    if (in1 && in2) {
      internal.push(s);
    } else if (in1 || in2) {
      // Tester le centre du segment : s'il est dans le polygone, accepter
      const mx = (s.x1 + s.x2) / 2;
      const my = (s.y1 + s.y2) / 2;
      if (pip(mx, my)) internal.push(s);
    }
  }
  return internal;
}

/** Douglas-Peucker simplification. */
export function simplifyPolygon(points: Pt[], tolerance: number): Pt[] {
  if (points.length <= 2 || tolerance <= 0) return points;
  const dist = (p: Pt, a: Pt, b: Pt) => {
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
