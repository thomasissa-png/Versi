/**
 * Module 3/5 — Détecteur de lignes sur bitmap (s27 refonte pipeline plan-extractor)
 *
 * Verbatim Thomas s27 : « L'outil doit pouvoir s'adapter à tous les PDF qu'on
 * reçoit : vectoriel, bitmap, image. Détecter en amont. »
 *
 * Pipeline :
 *   (1) sharp → grayscale + binarisation Otsu-like (threshold)
 *   (2) sharp → convolve Sobel (gradient X+Y) pour obtenir des edges (Canny-like)
 *   (3) Hough Transform probabilist (TS pur) sur les pixels d'edge
 *   (4) Merge des segments colinéaires proches
 *
 * Choix d'implémentation : sharp (déjà dispo) + TS pur. Justification :
 *   - `@techstark/opencv-js` = ~10 MB WASM, charge SSR Next 16 fragile, build CI lent.
 *   - `sharp` couvre déjà 90 % du pipeline image (utilisé partout dans le projet).
 *   - Hough probabilist en TS pur : ~150 LoC, debuggable, pas de dépendance ajoutée.
 *
 * Pas de fallback silencieux (learning P0 s27) — si zéro segment détecté ou input
 * invalide, throw `BitmapLineDetectorError`. Le caller route en erreur visible UI.
 *
 * Spec complète : docs/ia/s27-vs-pipeline-refonte-architecture.md
 */

export type BitmapSegment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type BitmapLineDetectorResult = {
  segments: BitmapSegment[];
  imageWidth: number;
  imageHeight: number;
};

export type BitmapLineDetectorOptions = {
  /** Score Hough min (nombre de pixels d'edge alignés) — default 50 */
  houghThreshold?: number;
  /** Longueur min d'un segment retenu (px) — default 20 */
  minSegmentLength?: number;
  /** Gap max entre deux pixels alignés pour rester sur le même segment — default 10 */
  maxLineGap?: number;
  /** Taille max (côté long) avant Hough — au-delà, downscale auto pour limiter la latence */
  maxResolutionForHough?: number;
};

export class BitmapLineDetectorError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "BitmapLineDetectorError";
  }
}

const DEFAULT_OPTIONS: Required<BitmapLineDetectorOptions> = {
  houghThreshold: 50,
  minSegmentLength: 20,
  maxLineGap: 10,
  maxResolutionForHough: 1200,
};

/**
 * Extrait les segments de murs depuis un PNG raster (issu d'un PDF bitmap).
 *
 * @throws BitmapLineDetectorError si l'input est invalide ou si zéro segment
 *         exploitable est détecté (pas de fallback silencieux — P0 s27).
 */
export async function extractWallSegmentsFromBitmap(
  pngBuffer: Buffer,
  options: BitmapLineDetectorOptions = {},
): Promise<BitmapLineDetectorResult> {
  if (!pngBuffer || pngBuffer.length === 0) {
    throw new BitmapLineDetectorError("Buffer PNG vide ou nul");
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };

  const { default: sharp } = await import("sharp");

  // (0) Lire dimensions originales
  let originalMeta: { width?: number; height?: number };
  try {
    originalMeta = await sharp(pngBuffer).metadata();
  } catch (err) {
    throw new BitmapLineDetectorError("Échec lecture métadonnées PNG", err);
  }
  const origW = originalMeta.width ?? 0;
  const origH = originalMeta.height ?? 0;
  if (origW === 0 || origH === 0) {
    throw new BitmapLineDetectorError("PNG sans dimensions valides");
  }

  // (1) Downscale si nécessaire pour respecter la latence cible (<10s)
  const longSide = Math.max(origW, origH);
  const scale = longSide > opts.maxResolutionForHough ? opts.maxResolutionForHough / longSide : 1;
  const targetW = Math.round(origW * scale);
  const targetH = Math.round(origH * scale);

  // (2) Greyscale + edges Sobel. On lit le greyscale en raw (1 canal via
  // toColourspace "b-w") puis on applique Sobel en TS pur — beaucoup plus
  // prédictible que sharp.convolve qui clippe à [0,255] et fausse les Sobel.
  let edgeRaw: Buffer;
  try {
    const grey = await sharp(pngBuffer)
      .resize(targetW, targetH, { fit: "fill" })
      .greyscale()
      .toColourspace("b-w")
      .raw()
      .toBuffer();

    // Sanity : le buffer doit faire targetW × targetH octets (1 canal).
    if (grey.length !== targetW * targetH) {
      throw new Error(
        `Buffer greyscale taille inattendue : ${grey.length} (attendu ${targetW * targetH})`,
      );
    }

    // Sobel 3×3 maison. Magnitude = |Gx| + |Gy|. Seuil de binarisation à 60
    // (calibré sur traits noirs sur fond blanc — typique d'un plan archi).
    edgeRaw = Buffer.alloc(grey.length);
    const EDGE_THRESHOLD = 60;
    for (let y = 1; y < targetH - 1; y++) {
      const rowAbove = (y - 1) * targetW;
      const rowMid = y * targetW;
      const rowBelow = (y + 1) * targetW;
      for (let x = 1; x < targetW - 1; x++) {
        const a = grey[rowAbove + x - 1];
        const b = grey[rowAbove + x];
        const c = grey[rowAbove + x + 1];
        const d = grey[rowMid + x - 1];
        const f = grey[rowMid + x + 1];
        const g = grey[rowBelow + x - 1];
        const h = grey[rowBelow + x];
        const i = grey[rowBelow + x + 1];
        const gx = -a + c - 2 * d + 2 * f - g + i;
        const gy = -a - 2 * b - c + g + 2 * h + i;
        const mag = Math.abs(gx) + Math.abs(gy);
        if (mag > EDGE_THRESHOLD) edgeRaw[rowMid + x] = 255;
      }
    }
  } catch (err) {
    throw new BitmapLineDetectorError("Échec edge detection sharp/Sobel", err);
  }

  // (3) Hough Transform probabilist (TS pur)
  const segments = probabilisticHough(edgeRaw, targetW, targetH, opts);

  // (4) Merge segments colinéaires proches
  const merged = mergeCollinearSegments(segments, 2 /* deg */, 3 /* px */);

  // Remap vers les coordonnées de l'image originale (annule le downscale)
  const inv = 1 / scale;
  const rescaled: BitmapSegment[] = merged.map((s) => ({
    x1: Math.round(s.x1 * inv),
    y1: Math.round(s.y1 * inv),
    x2: Math.round(s.x2 * inv),
    y2: Math.round(s.y2 * inv),
  }));

  if (rescaled.length === 0) {
    throw new BitmapLineDetectorError(
      "Aucun segment détecté sur le bitmap (image trop bruitée, blanche, ou sans contour)",
    );
  }

  return {
    segments: rescaled,
    imageWidth: origW,
    imageHeight: origH,
  };
}

/**
 * Hough Transform probabilist — variante simplifiée :
 *   1. Pour chaque pixel d'edge, voter dans l'accumulateur (rho, theta).
 *   2. Trouver les pics de l'accumulateur > houghThreshold.
 *   3. Pour chaque pic, parcourir la ligne et extraire des segments contigus.
 *
 * Le coût est O(N_edge × N_theta). N_theta = 180 (1° step), N_edge ~= 1-5 % des pixels.
 * Pour image 1200×1200 → ~10-50k edges × 180 = 2-9M ops → < 2s.
 */
function probabilisticHough(
  edgeRaw: Buffer,
  width: number,
  height: number,
  opts: Required<BitmapLineDetectorOptions>,
): BitmapSegment[] {
  const NUM_THETA = 180;
  const thetaStep = Math.PI / NUM_THETA;
  const diag = Math.ceil(Math.sqrt(width * width + height * height));
  const NUM_RHO = 2 * diag + 1;

  // Pré-calc cos/sin
  const cosT = new Float32Array(NUM_THETA);
  const sinT = new Float32Array(NUM_THETA);
  for (let t = 0; t < NUM_THETA; t++) {
    cosT[t] = Math.cos(t * thetaStep);
    sinT[t] = Math.sin(t * thetaStep);
  }

  // Accumulateur Hough
  const acc = new Int32Array(NUM_THETA * NUM_RHO);

  // Edges sous forme de liste (x, y) pour itérer rapidement
  const edgePoints: number[] = [];
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (edgeRaw[row + x] > 0) {
        edgePoints.push(x, y);
      }
    }
  }

  // Vote
  for (let i = 0; i < edgePoints.length; i += 2) {
    const x = edgePoints[i];
    const y = edgePoints[i + 1];
    for (let t = 0; t < NUM_THETA; t++) {
      const rho = Math.round(x * cosT[t] + y * sinT[t]) + diag;
      acc[t * NUM_RHO + rho]++;
    }
  }

  // Trouver les pics au-dessus du seuil (avec suppression non-max simple)
  type Peak = { theta: number; rho: number; votes: number };
  const peaks: Peak[] = [];
  for (let t = 0; t < NUM_THETA; t++) {
    for (let r = 1; r < NUM_RHO - 1; r++) {
      const v = acc[t * NUM_RHO + r];
      if (v < opts.houghThreshold) continue;
      // Non-max suppression locale (3×3 dans l'espace theta-rho)
      let isMax = true;
      for (let dt = -1; dt <= 1 && isMax; dt++) {
        const tt = t + dt;
        if (tt < 0 || tt >= NUM_THETA) continue;
        for (let dr = -1; dr <= 1; dr++) {
          if (dt === 0 && dr === 0) continue;
          if (acc[tt * NUM_RHO + (r + dr)] > v) {
            isMax = false;
            break;
          }
        }
      }
      if (isMax) peaks.push({ theta: t, rho: r - diag, votes: v });
    }
  }

  // Pour chaque pic, extraire les segments contigus (longueur >= minSegmentLength,
  // gap toléré <= maxLineGap)
  const segments: BitmapSegment[] = [];
  // Limite défensive : si > 500 pics, garder les meilleurs (évite explosion sur images bruitées)
  peaks.sort((a, b) => b.votes - a.votes);
  const topPeaks = peaks.slice(0, 500);

  for (const peak of topPeaks) {
    const theta = peak.theta * thetaStep;
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    const rho = peak.rho;

    // Paramétrer la droite : pour chaque pixel le long, vérifier la présence d'edge.
    // On parcourt selon l'axe dominant (x si |sin| > |cos|, sinon y).
    const useXAxis = Math.abs(st) > Math.abs(ct);
    let curStart: { x: number; y: number } | null = null;
    let lastHit: { x: number; y: number } | null = null;
    let gap = 0;

    const flush = () => {
      if (curStart && lastHit) {
        const dx = lastHit.x - curStart.x;
        const dy = lastHit.y - curStart.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len >= opts.minSegmentLength) {
          segments.push({
            x1: curStart.x,
            y1: curStart.y,
            x2: lastHit.x,
            y2: lastHit.y,
          });
        }
      }
      curStart = null;
      lastHit = null;
      gap = 0;
    };

    if (useXAxis) {
      for (let x = 0; x < width; x++) {
        // y = (rho - x*cos) / sin
        const y = Math.round((rho - x * ct) / st);
        if (y < 0 || y >= height) {
          if (curStart) {
            gap++;
            if (gap > opts.maxLineGap) flush();
          }
          continue;
        }
        const isEdge = edgeRaw[y * width + x] > 0;
        // Tolérance ±1 pixel sur y (anti-aliasing edges)
        const isEdgeNear =
          isEdge ||
          (y > 0 && edgeRaw[(y - 1) * width + x] > 0) ||
          (y < height - 1 && edgeRaw[(y + 1) * width + x] > 0);
        if (isEdgeNear) {
          if (!curStart) curStart = { x, y };
          lastHit = { x, y };
          gap = 0;
        } else if (curStart) {
          gap++;
          if (gap > opts.maxLineGap) flush();
        }
      }
    } else {
      for (let y = 0; y < height; y++) {
        // x = (rho - y*sin) / cos
        const x = Math.round((rho - y * st) / ct);
        if (x < 0 || x >= width) {
          if (curStart) {
            gap++;
            if (gap > opts.maxLineGap) flush();
          }
          continue;
        }
        const isEdge = edgeRaw[y * width + x] > 0;
        const isEdgeNear =
          isEdge ||
          (x > 0 && edgeRaw[y * width + (x - 1)] > 0) ||
          (x < width - 1 && edgeRaw[y * width + (x + 1)] > 0);
        if (isEdgeNear) {
          if (!curStart) curStart = { x, y };
          lastHit = { x, y };
          gap = 0;
        } else if (curStart) {
          gap++;
          if (gap > opts.maxLineGap) flush();
        }
      }
    }
    flush();
  }

  return segments;
}

/**
 * Merge les segments colinéaires proches : même angle (Δ < angleTolDeg) et
 * distance perpendiculaire faible (< distTolPx). Le merge produit le segment
 * englobant (extrêmes les plus éloignés sur la droite support).
 */
function mergeCollinearSegments(
  segments: BitmapSegment[],
  angleTolDeg: number,
  distTolPx: number,
): BitmapSegment[] {
  if (segments.length === 0) return [];
  const angleTolRad = (angleTolDeg * Math.PI) / 180;

  const used = new Array(segments.length).fill(false);
  const result: BitmapSegment[] = [];

  for (let i = 0; i < segments.length; i++) {
    if (used[i]) continue;
    const cluster: BitmapSegment[] = [segments[i]];
    used[i] = true;

    const a = segments[i];
    const angleA = Math.atan2(a.y2 - a.y1, a.x2 - a.x1);

    for (let j = i + 1; j < segments.length; j++) {
      if (used[j]) continue;
      const b = segments[j];
      const angleB = Math.atan2(b.y2 - b.y1, b.x2 - b.x1);
      // Diff modulo π (les segments n'ont pas d'orientation)
      let dAngle = Math.abs(angleA - angleB);
      if (dAngle > Math.PI / 2) dAngle = Math.PI - dAngle;
      if (dAngle > angleTolRad) continue;

      // Distance perpendiculaire de b par rapport à la droite support de a
      const dx = a.x2 - a.x1;
      const dy = a.y2 - a.y1;
      const lenA = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / lenA;
      const ny = dx / lenA;
      const distB1 = Math.abs((b.x1 - a.x1) * nx + (b.y1 - a.y1) * ny);
      const distB2 = Math.abs((b.x2 - a.x1) * nx + (b.y2 - a.y1) * ny);
      if (distB1 > distTolPx || distB2 > distTolPx) continue;

      cluster.push(b);
      used[j] = true;
    }

    // Fusion du cluster : projeter tous les endpoints sur la direction de a et
    // garder les extrêmes.
    const dx = a.x2 - a.x1;
    const dy = a.y2 - a.y1;
    const lenA = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / lenA;
    const uy = dy / lenA;
    let minProj = Infinity;
    let maxProj = -Infinity;
    let minP: { x: number; y: number } = { x: a.x1, y: a.y1 };
    let maxP: { x: number; y: number } = { x: a.x2, y: a.y2 };
    for (const seg of cluster) {
      for (const p of [{ x: seg.x1, y: seg.y1 }, { x: seg.x2, y: seg.y2 }]) {
        const proj = (p.x - a.x1) * ux + (p.y - a.y1) * uy;
        if (proj < minProj) {
          minProj = proj;
          minP = p;
        }
        if (proj > maxProj) {
          maxProj = proj;
          maxP = p;
        }
      }
    }
    result.push({ x1: minP.x, y1: minP.y, x2: maxP.x, y2: maxP.y });
  }

  return result;
}
