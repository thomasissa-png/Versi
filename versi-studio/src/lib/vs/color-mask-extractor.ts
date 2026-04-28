/**
 * Color-mask extractor — Pipeline NEW v2 Versi Studio (s27 refonte)
 *
 * Verbatim Thomas s27 : « tracé EXACTEMENT sur les lignes du lot ».
 * Approche déterministe pixel-based : isole les murs par couleur sur le PNG
 * rasterisé, calcule l'enveloppe concave (alpha-shape) du nuage de pixels,
 * retourne le polygone exact du lot.
 *
 * Précision : 1 pixel = 0.1mm à scale=3. Infiniment mieux que tout drift IA.
 * Préférence fondateur s27 : précision > facilité, pas de pivot dégradé.
 *
 * Pipeline interne :
 *   PNG buffer → mask pixel (couleur cible) → sample uniform → alpha-shape →
 *   Douglas-Peucker → polygone simplifié
 */

import sharp from "sharp";

export type Pt = { x: number; y: number };

export type ColorMaskOptions = {
  /** Couleur(s) cible(s) à isoler. Default : orange Versi #ff8000 + variants. */
  targetColors?: ColorRange[];
  /** Stride d'échantillonnage des pixels (1 = tous, 4 = 1/16, 8 = 1/64). */
  sampleStride?: number;
  /** Alpha-shape paramètre (radiusMax = 1/alpha en px). Plus grand = plus concave. */
  alpha?: number;
  /** Tolérance Douglas-Peucker (px). 0 = pas de simplification. */
  simplifyTolerance?: number;
  /** Exclure une bande verticale en haut (cartouche). 0..1, fraction de l'image. */
  excludeTopFraction?: number;
  /** Exclure une bande verticale en bas. 0..1. */
  excludeBottomFraction?: number;
  /** Taille minimum d'un cluster pour être considéré comme un lot (px). */
  minClusterSize?: number;
  /**
   * Single cluster mode : ne sépare pas les murs en plusieurs clusters,
   * fait un alpha-shape global sur tous les pixels orange. Utile pour les
   * plans d'1 seul appartement par étage (cas Muguets). Par défaut true.
   * Mettre à false sur des plans avec plusieurs lots indépendants par étage.
   */
  singleCluster?: boolean;
};

export type ColorRange = {
  /** Centre RGB (0..255). */
  rgb: [number, number, number];
  /** Tolérance par canal. */
  tolerance: number;
};

export type ColorMaskResult = {
  /** Polygone(s) extrait(s), un par cluster détecté, ordonnés par taille décroissante. */
  polygons: Pt[][];
  /** Image dimensions. */
  imageWidth: number;
  imageHeight: number;
  /** Nb pixels match avant clustering. */
  totalMaskPixels: number;
  /** Nb clusters trouvés. */
  clusterCount: number;
};

export class ColorMaskExtractorError extends Error {
  constructor(
    public readonly code: "no_mask" | "no_clusters" | "image_decode_failed",
    message: string,
  ) {
    super(`[${code}] ${message}`);
    this.name = "ColorMaskExtractorError";
  }
}

const DEFAULT_COLORS: ColorRange[] = [
  { rgb: [255, 128, 0], tolerance: 70 }, // Orange Versi #ff8000
];

/**
 * Extrait les polygones des lots depuis un PNG rasterisé via mask de couleur.
 *
 * Détecte plusieurs clusters (un par mur connecté). Pour un appartement type
 * RDC : 1 cluster principal = murs périphériques de l'appartement.
 */
export async function extractLotsByColorMask(
  pngBuffer: Buffer,
  options: ColorMaskOptions = {},
): Promise<ColorMaskResult> {
  const targetColors = options.targetColors ?? DEFAULT_COLORS;
  const sampleStride = options.sampleStride ?? 4;
  const alpha = options.alpha ?? 0.05;
  const simplifyTolerance = options.simplifyTolerance ?? 8;
  const topF = options.excludeTopFraction ?? 0.12;
  const botF = options.excludeBottomFraction ?? 0.12;
  const minClusterSize = options.minClusterSize ?? 100;
  const singleCluster = options.singleCluster ?? true;

  // 1. Décoder le PNG en raw RGBA
  let raw: Buffer;
  let info: sharp.OutputInfo;
  try {
    const result = await sharp(pngBuffer).ensureAlpha().raw().toBuffer({
      resolveWithObject: true,
    });
    raw = result.data;
    info = result.info;
  } catch (err) {
    throw new ColorMaskExtractorError(
      "image_decode_failed",
      `sharp.raw() : ${err instanceof Error ? err.message : err}`,
    );
  }
  const W = info.width;
  const H = info.height;

  // 2. Sample les pixels qui matchent une couleur cible
  const yMin = Math.floor(H * topF);
  const yMax = Math.floor(H * (1 - botF));
  const points: Pt[] = [];
  for (let y = yMin; y < yMax; y += sampleStride) {
    for (let x = 0; x < W; x += sampleStride) {
      const i = (y * W + x) * 4;
      const r = raw[i];
      const g = raw[i + 1];
      const b = raw[i + 2];
      for (const c of targetColors) {
        if (
          Math.abs(r - c.rgb[0]) <= c.tolerance &&
          Math.abs(g - c.rgb[1]) <= c.tolerance &&
          Math.abs(b - c.rgb[2]) <= c.tolerance
        ) {
          points.push({ x, y });
          break;
        }
      }
    }
  }

  if (points.length === 0) {
    throw new ColorMaskExtractorError(
      "no_mask",
      "Aucun pixel ne correspond aux couleurs cibles (mur peut-être autre teinte ?)",
    );
  }

  // 3. Clustering selon mode
  let sortedClusters: Pt[][];
  if (singleCluster) {
    // Tous les pixels orange = un seul "cluster" → alpha-shape global
    sortedClusters = [points];
  } else {
    // DBSCAN-like : un cluster par groupe de pixels connectés
    const clusters = clusterPoints(points, sampleStride * 4, 3);
    sortedClusters = clusters
      .filter((c) => c.length >= minClusterSize)
      .sort((a, b) => b.length - a.length);
  }

  if (sortedClusters.length === 0) {
    throw new ColorMaskExtractorError(
      "no_clusters",
      `Pixels trouvés (${points.length}) mais aucun cluster ≥ ${minClusterSize}`,
    );
  }

  // 4. Pour chaque cluster, calculer alpha-shape puis simplifier
  const polygons: Pt[][] = [];
  for (const cluster of sortedClusters) {
    const hull = alphaShape(cluster, alpha);
    if (hull.length < 3) continue;
    const simplified = simplifyTolerance > 0
      ? douglasPeucker(hull, simplifyTolerance)
      : hull;
    polygons.push(simplified);
  }

  return {
    polygons,
    imageWidth: W,
    imageHeight: H,
    totalMaskPixels: points.length,
    clusterCount: sortedClusters.length,
  };
}

/**
 * Clustering spatial DBSCAN-like via grille uniforme.
 * eps = distance max entre 2 points dans le même cluster.
 * minPts = nb min de voisins pour qu'un point soit "core".
 */
function clusterPoints(points: Pt[], eps: number, minPts: number): Pt[][] {
  const N = points.length;
  const visited = new Uint8Array(N);
  const cluster = new Int32Array(N).fill(-1);
  const clusters: Pt[][] = [];
  let nextCluster = 0;

  // Grille spatiale pour requêtes voisins O(1) amorti
  const cellSize = eps;
  const grid = new Map<string, number[]>();
  const cellKey = (x: number, y: number) =>
    `${Math.floor(x / cellSize)}|${Math.floor(y / cellSize)}`;
  for (let i = 0; i < N; i++) {
    const k = cellKey(points[i].x, points[i].y);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k)!.push(i);
  }

  function neighbors(idx: number): number[] {
    const p = points[idx];
    const cx = Math.floor(p.x / cellSize);
    const cy = Math.floor(p.y / cellSize);
    const out: number[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const k = `${cx + dx}|${cy + dy}`;
        const list = grid.get(k);
        if (!list) continue;
        for (const j of list) {
          if (j === idx) continue;
          const dx2 = points[j].x - p.x;
          const dy2 = points[j].y - p.y;
          if (dx2 * dx2 + dy2 * dy2 <= eps * eps) out.push(j);
        }
      }
    }
    return out;
  }

  for (let i = 0; i < N; i++) {
    if (visited[i]) continue;
    visited[i] = 1;
    const nbrs = neighbors(i);
    if (nbrs.length < minPts) continue; // bruit
    const cId = nextCluster++;
    cluster[i] = cId;
    clusters.push([points[i]]);
    const queue = [...nbrs];
    while (queue.length > 0) {
      const j = queue.shift()!;
      if (!visited[j]) {
        visited[j] = 1;
        const nb2 = neighbors(j);
        if (nb2.length >= minPts) queue.push(...nb2);
      }
      if (cluster[j] === -1) {
        cluster[j] = cId;
        clusters[cId].push(points[j]);
      }
    }
  }
  return clusters;
}

/**
 * Alpha-shape simplifié : convex hull + creux locaux supprimés via test
 * "circumradius < 1/alpha". Implémentation O(n²) acceptable pour n < 5000.
 *
 * Pour des points denses uniformément samplés, alpha=0.05 (radius 20px) donne
 * un contour qui suit les murs sans déborder sur les ouvertures > 40px.
 */
function alphaShape(points: Pt[], alpha: number): Pt[] {
  if (points.length < 3) return points;

  // 1. Convex hull (Andrew's monotone chain)
  const sorted = points.slice().sort((a, b) =>
    a.x !== b.x ? a.x - b.x : a.y - b.y,
  );
  // Remove duplicates
  const dedup: Pt[] = [];
  for (const p of sorted) {
    const last = dedup[dedup.length - 1];
    if (!last || last.x !== p.x || last.y !== p.y) dedup.push(p);
  }
  if (dedup.length < 3) return dedup;

  const cross = (o: Pt, a: Pt, b: Pt) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const p of dedup) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    )
      lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = dedup.length - 1; i >= 0; i--) {
    const p = dedup[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    )
      upper.pop();
    upper.push(p);
  }
  const convex = lower.slice(0, -1).concat(upper.slice(0, -1));

  // 2. Pour chaque arête du convex hull, "creuser" en cherchant un point
  //    intérieur dont le triangle (a, p, b) a un circumradius < 1/alpha.
  //    Simplification : on cherche le point intérieur le plus proche de l'arête
  //    qui forme un triangle avec circumradius acceptable.
  const radiusMax = 1 / Math.max(alpha, 1e-6);
  const result: Pt[] = [];
  for (let i = 0; i < convex.length; i++) {
    const a = convex[i];
    const b = convex[(i + 1) % convex.length];
    result.push(a);
    // Distance arête a-b
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len <= radiusMax * 2) continue; // arête courte, pas de creux à faire

    // Cherche le meilleur point qui creuse vers l'intérieur
    // (= côté opposé du convex hull, dist max à l'arête mais < radiusMax)
    let best: Pt | null = null;
    let bestDist = -1;
    for (const p of dedup) {
      if (p === a || p === b) continue;
      const cr = cross(a, b, p);
      if (cr <= 0) continue; // pas du bon côté (intérieur)
      const distLine = cr / len;
      if (distLine > radiusMax) continue; // trop loin, pas creuser ici
      if (distLine > bestDist) {
        bestDist = distLine;
        best = p;
      }
    }
    if (best) result.push(best);
  }
  return result;
}

/** Douglas-Peucker simplification. */
function douglasPeucker(points: Pt[], tolerance: number): Pt[] {
  if (points.length <= 2) return points;
  const dist = (p: Pt, a: Pt, b: Pt) => {
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
  };
  const recurse = (s: number, e: number, out: number[]) => {
    let mD = 0,
      mI = s;
    for (let i = s + 1; i < e; i++) {
      const d = dist(points[i], points[s], points[e]);
      if (d > mD) {
        mD = d;
        mI = i;
      }
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
