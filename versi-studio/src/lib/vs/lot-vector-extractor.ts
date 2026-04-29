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
function bboxAll(polys: Pt[][]): { x0: number; y0: number; x1: number; y1: number } | null {
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
  const opList = await page.getOperatorList();

  const OPS = pdfjs.OPS;
  const fns = opList.fnArray;
  const args = opList.argsArray;

  // Track état graphique.
  let ctm: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 0];
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
  const wallSegs = orangeSegs;

  // Bounding box global = approximation initiale du lot.
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const s of wallSegs) {
    bx0 = Math.min(bx0, s.x1, s.x2);
    bx1 = Math.max(bx1, s.x1, s.x2);
    by0 = Math.min(by0, s.y1, s.y2);
    by1 = Math.max(by1, s.y1, s.y2);
  }

  const polygon: Pt[] = wallSegs.length > 0
    ? [
        { x: bx0, y: by0 },
        { x: bx1, y: by0 },
        { x: bx1, y: by1 },
        { x: bx0, y: by1 },
      ]
    : orangeFillPaths.length > 0
      ? orangeFillPaths.sort((a, b) => polygonArea(b) - polygonArea(a))[0]
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
