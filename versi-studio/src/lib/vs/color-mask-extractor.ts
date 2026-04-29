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

// concaveman = lib Mapbox alpha-shape éprouvée en prod (Foursquare, OpenStreetMap)
// Signature : concaveman(points: [x,y][], concavity?: number, lengthThreshold?: number)
//   - concavity : plus petit = plus concave (default 2). ∞ = convex hull.
//   - lengthThreshold : longueur min des segments du contour (px)
// Module CJS exporte default pour interop ESM, on l'extrait explicitement.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const concavemanModule = require("concaveman");
const concaveman: (
  points: number[][],
  concavity?: number,
  lengthThreshold?: number,
) => number[][] = concavemanModule.default ?? concavemanModule;

export type Pt = { x: number; y: number };

export type ColorMaskOptions = {
  /** Couleur(s) cible(s) à isoler. Default : orange Versi #ff8000 + variants. */
  targetColors?: ColorRange[];
  /** Stride d'échantillonnage des pixels (1 = tous, 4 = 1/16, 8 = 1/64). */
  sampleStride?: number;
  /** Concavity (concaveman) : 1 = très concave, 2 = défaut, ∞ = convex hull. Ignoré si useMarchingSquares. */
  alpha?: number;
  /** Longueur min des segments du contour (px). Ignoré si useMarchingSquares. */
  lengthThreshold?: number;
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
  /**
   * Tracer le contour de la zone habitable via Moore boundary trace
   * (au lieu de concaveman). Le polygone suit exactement le bord du
   * masque habitable binaire à 1 cellule près. Default : true (s27).
   */
  useMarchingSquares?: boolean;
  /**
   * Snap final : pour chaque sommet du polygone, projeter sur le pixel
   * orange le plus proche dans un rayon de `snapRadius` px. 0 = désactivé.
   * Default : sampleStride * 8 (~32px à stride=4).
   */
  snapRadius?: number;
  /**
   * Ratio orange min/max dans rayon R pour qu'un pixel soit habitable.
   * Default : [0.005, 0.3].
   */
  habitableRatioRange?: [number, number];
  /**
   * Rayon (px) de la fenêtre d'analyse pour le ratio habitable.
   * Default : sampleStride * 30.
   */
  habitableRadius?: number;
  /**
   * Mode de sortie polygone :
   *  - 'bbox' : axis-aligned bounding box (4 sommets, simple rectangle)
   *  - 'trace' : Moore boundary trace + snap-to-wall (polygone détaillé qui suit chaque coude)
   * Default : 'bbox'.
   */
  outputMode?: "bbox" | "trace";
  /**
   * Rayon d'ouverture morphologique sur le masque orange (px).
   * Élimine les fines lignes de hachures (terrasses, escaliers extérieurs)
   * tout en préservant les murs structurels épais. 0 = désactivé.
   * Default : 2.
   */
  morphOpenRadius?: number;
  /**
   * Rayon de fermeture morphologique sur le masque orange (px).
   * Comble les pointillés (murs en lignes interrompues, ex Chambre 01 R+2)
   * pour qu'ils soient traités comme des murs continus dans la détection
   * habitable. 0 = désactivé.
   * Default : 6.
   */
  morphCloseRadius?: number;
  /**
   * Snap orthogonal sur les segments du polygone (mode trace) : chaque
   * segment dont l'angle est ≤ orthogonalToleranceDeg de l'horizontale
   * ou la verticale est aligné sur cette direction. Élimine les "festons"
   * sur les murs droits. 0 = désactivé.
   * Default : 12 (degrés).
   */
  orthogonalToleranceDeg?: number;
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
  const alpha = options.alpha ?? 2; // concaveman concavity
  const lengthThreshold = options.lengthThreshold ?? 100;
  const simplifyTolerance = options.simplifyTolerance ?? 8;
  const topF = options.excludeTopFraction ?? 0.18;
  const botF = options.excludeBottomFraction ?? 0.18;
  const minClusterSize = options.minClusterSize ?? 100;
  const singleCluster = options.singleCluster ?? true;
  const useMarchingSquares = options.useMarchingSquares ?? true;
  const snapRadius = options.snapRadius ?? sampleStride * 8;
  const outputMode = options.outputMode ?? "bbox";
  const morphOpenRadius = options.morphOpenRadius ?? 2;
  const morphCloseRadius = options.morphCloseRadius ?? 6;
  const orthogonalToleranceDeg = options.orthogonalToleranceDeg ?? 12;
  const ratioMin = options.habitableRatioRange?.[0] ?? 0.005;
  const ratioMax = options.habitableRatioRange?.[1] ?? 0.3;

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

  // 2. Construire mask binaire orange + integral image pour O(1) sum-in-rect
  const orangeMask = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = raw[i * 4], g = raw[i * 4 + 1], b = raw[i * 4 + 2];
    for (const c of targetColors) {
      if (
        Math.abs(r - c.rgb[0]) <= c.tolerance &&
        Math.abs(g - c.rgb[1]) <= c.tolerance &&
        Math.abs(b - c.rgb[2]) <= c.tolerance
      ) {
        orangeMask[i] = 1;
        break;
      }
    }
  }
  const totalOrangeRaw = orangeMask.reduce((a, b) => a + b, 0);
  if (totalOrangeRaw === 0) {
    throw new ColorMaskExtractorError(
      "no_mask",
      "Aucun pixel ne correspond aux couleurs cibles",
    );
  }

  // Pré-traitement morphologique :
  //  - structuralMask : open(orange, openR) PUIS retire les zones de hachures
  //    denses (densité orange > 50% dans 30px = pattern hachuré, pas mur isolé).
  //    Sert pour le snap-to-wall final + intégral image (ratio habitable).
  //  - habitableInputMask : close(orange, closeR) → comble les pointillés.
  //    Sert pour le test "est-ce que ce pixel est un mur" (skip dans l'analyse).
  let structuralMask =
    morphOpenRadius > 0
      ? morphDilate(morphErode(orangeMask, W, H, morphOpenRadius), W, H, morphOpenRadius)
      : new Uint8Array(orangeMask);
  // Détection des zones de hachures : pixels orange dans une fenêtre où la
  // densité orange dépasse un seuil élevé (= pattern hachuré uniforme, pas mur
  // isolé). Calcul via integral image temporaire.
  // hachureMask = 1 si pixel orange ET dans zone dense (patio/escalier ext.)
  const denseFilterRadius = 25;
  const denseFilterThreshold = 0.5;
  const hachureMask = new Uint8Array(W * H);
  {
    const tmpInt = new Int32Array((W + 1) * (H + 1));
    for (let y = 1; y <= H; y++) {
      for (let x = 1; x <= W; x++) {
        tmpInt[y * (W + 1) + x] =
          orangeMask[(y - 1) * W + (x - 1)] +
          tmpInt[(y - 1) * (W + 1) + x] +
          tmpInt[y * (W + 1) + (x - 1)] -
          tmpInt[(y - 1) * (W + 1) + (x - 1)];
      }
    }
    const dr = denseFilterRadius;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (orangeMask[y * W + x] === 0) continue;
        const x0 = Math.max(0, x - dr), y0 = Math.max(0, y - dr);
        const x1 = Math.min(W, x + dr), y1 = Math.min(H, y + dr);
        const sum =
          tmpInt[y1 * (W + 1) + x1] -
          tmpInt[y0 * (W + 1) + x1] -
          tmpInt[y1 * (W + 1) + x0] +
          tmpInt[y0 * (W + 1) + x0];
        const area = (x1 - x0) * (y1 - y0);
        if (sum / area >= denseFilterThreshold) {
          hachureMask[y * W + x] = 1;
          structuralMask[y * W + x] = 0; // retire de structural aussi
        }
      }
    }
  }
  const habitableInputMask =
    morphCloseRadius > 0
      ? morphErode(morphDilate(orangeMask, W, H, morphCloseRadius), W, H, morphCloseRadius)
      : orangeMask;
  const totalOrange = structuralMask.reduce((a, b) => a + b, 0);

  // Integral image sur habitableInputMask (= orangeMask close, pointillés comblés).
  // Le ratio habitable mesure la densité de murs dans le voisinage.
  const integral = new Int32Array((W + 1) * (H + 1));
  for (let y = 1; y <= H; y++) {
    for (let x = 1; x <= W; x++) {
      integral[y * (W + 1) + x] =
        habitableInputMask[(y - 1) * W + (x - 1)] +
        integral[(y - 1) * (W + 1) + x] +
        integral[y * (W + 1) + (x - 1)] -
        integral[(y - 1) * (W + 1) + (x - 1)];
    }
  }
  // Integral image sur hachureMask (vraies zones hachurées denses).
  const hatchInt = new Int32Array((W + 1) * (H + 1));
  for (let y = 1; y <= H; y++) {
    for (let x = 1; x <= W; x++) {
      hatchInt[y * (W + 1) + x] =
        hachureMask[(y - 1) * W + (x - 1)] +
        hatchInt[(y - 1) * (W + 1) + x] +
        hatchInt[y * (W + 1) + (x - 1)] -
        hatchInt[(y - 1) * (W + 1) + (x - 1)];
    }
  }
  const sumHatchInRect = (x0: number, y0: number, x1: number, y1: number) => {
    x0 = Math.max(0, x0); y0 = Math.max(0, y0);
    x1 = Math.min(W, x1); y1 = Math.min(H, y1);
    return (
      hatchInt[y1 * (W + 1) + x1] -
      hatchInt[y0 * (W + 1) + x1] -
      hatchInt[y1 * (W + 1) + x0] +
      hatchInt[y0 * (W + 1) + x0]
    );
  };
  const sumInRect = (x0: number, y0: number, x1: number, y1: number) => {
    x0 = Math.max(0, x0); y0 = Math.max(0, y0);
    x1 = Math.min(W, x1); y1 = Math.min(H, y1);
    return (
      integral[y1 * (W + 1) + x1] -
      integral[y0 * (W + 1) + x1] -
      integral[y1 * (W + 1) + x0] +
      integral[y0 * (W + 1) + x0]
    );
  };

  // 3. Détecter les pixels HABITABLES (= non-orange entourés de murs orange dans rayon R)
  // Un pixel est habitable si dans un carré 2R×2R autour : 1% < ratio orange < 30%
  // (ratio < 1% = trop loin de tout mur = extérieur ; ratio > 30% = dans/sur un mur)
  const yMin = Math.floor(H * topF);
  const yMax = Math.floor(H * (1 - botF));
  const R = options.habitableRadius ?? sampleStride * 30; // ~240px à stride=8 = 80cm à scale=3
  const gridW = Math.ceil(W / sampleStride);
  const gridH = Math.ceil(H / sampleStride);
  const habitable = new Uint8Array(gridW * gridH);
  for (let gy = 0; gy < gridH; gy++) {
    const y = gy * sampleStride;
    if (y < yMin || y > yMax) continue;
    for (let gx = 0; gx < gridW; gx++) {
      const x = gx * sampleStride;
      if (habitableInputMask[y * W + x] === 1) continue;
      const orangeCount = sumInRect(x - R, y - R, x + R, y + R);
      const hatchCount = sumHatchInRect(x - R, y - R, x + R, y + R);
      const totalCount =
        (Math.min(W, x + R) - Math.max(0, x - R)) *
        (Math.min(H, y + R) - Math.max(0, y - R));
      const ratio = orangeCount / totalCount;
      const hatchRatio = hatchCount / totalCount;
      // Rejette si trop de hachures dans le voisinage (= adjacent à terrasse,
      // escalier ext., etc.) — la cellule habitable doit être bordée de murs
      // structurels, pas d'éléments hachurés extérieurs.
      if (hatchRatio > 0.04) continue;
      if (ratio >= ratioMin && ratio <= ratioMax) {
        habitable[gy * gridW + gx] = 1;
      }
    }
  }

  // 4. Connected components sur la grille habitable (4-connectivity)
  const labels = new Int32Array(gridW * gridH);
  let nLabels = 0;
  const compPoints: Pt[][] = [];
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const idx = gy * gridW + gx;
      if (habitable[idx] === 0 || labels[idx] !== 0) continue;
      nLabels++;
      const pts: Pt[] = [];
      const stack = [idx];
      while (stack.length > 0) {
        const p = stack.pop()!;
        if (labels[p] !== 0) continue;
        labels[p] = nLabels;
        const px = p % gridW, py = (p - px) / gridW;
        pts.push({ x: px * sampleStride, y: py * sampleStride });
        if (px > 0 && habitable[p - 1] === 1 && labels[p - 1] === 0) stack.push(p - 1);
        if (px < gridW - 1 && habitable[p + 1] === 1 && labels[p + 1] === 0) stack.push(p + 1);
        if (py > 0 && habitable[p - gridW] === 1 && labels[p - gridW] === 0) stack.push(p - gridW);
        if (py < gridH - 1 && habitable[p + gridW] === 1 && labels[p + gridW] === 0) stack.push(p + gridW);
      }
      compPoints.push(pts);
    }
  }

  // 5. Fusionner toutes les composantes significatives (≥ minClusterSize)
  // → couvre les apparts dont les pièces sont séparées par cloisons internes
  const sigComps = compPoints
    .filter((c) => c.length >= minClusterSize)
    .sort((a, b) => b.length - a.length);
  if (sigComps.length === 0) {
    throw new ColorMaskExtractorError(
      "no_clusters",
      `Mask orange trouvé (${totalOrange}px) mais aucune zone habitable ≥ ${minClusterSize}`,
    );
  }
  const allHabitablePts =
    singleCluster ? sigComps.flatMap((c) => c) : sigComps[0];
  const sortedClusters: Pt[][] = singleCluster ? [allHabitablePts] : sigComps;

  // 6. Pour chaque cluster, soit bbox simple (mode 'bbox' = 4 sommets),
  //    soit Moore boundary trace + snap-to-wall (mode 'trace' = polygone détaillé).
  const polygons: Pt[][] = [];
  for (let cIdx = 0; cIdx < sortedClusters.length; cIdx++) {
    const cluster = sortedClusters[cIdx];

    if (outputMode === "bbox") {
      // Axis-aligned bounding box du cluster habitable. Pas de snap large
      // (qui irait chercher les murs de la terrasse). On élargit juste de
      // sampleStride pour englober le mur orange périphérique le plus proche.
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of cluster) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
      // Snap court (≤ sampleStride * 2) vers l'extérieur pour aligner sur
      // le mur orange périphérique le plus proche, sans déborder.
      const search = sampleStride * 2;
      const snapBorder = (val: number, axis: "x" | "y", min: number, max: number, dir: -1 | 1) => {
        let best = val;
        if (axis === "x") {
          for (let dx = 0; dx <= search; dx++) {
            const x = val + dx * dir;
            if (x < 0 || x >= W) break;
            for (let y = Math.floor(min); y <= Math.ceil(max); y += 4) {
              if (structuralMask[y * W + x] === 1) { best = x; return best; }
            }
          }
        } else {
          for (let dy = 0; dy <= search; dy++) {
            const y = val + dy * dir;
            if (y < 0 || y >= H) break;
            for (let x = Math.floor(min); x <= Math.ceil(max); x += 4) {
              if (structuralMask[y * W + x] === 1) { best = y; return best; }
            }
          }
        }
        return best;
      };
      const left = snapBorder(minX, "x", minY, maxY, -1);
      const right = snapBorder(maxX, "x", minY, maxY, 1);
      const top = snapBorder(minY, "y", minX, maxX, -1);
      const bottom = snapBorder(maxY, "y", minX, maxX, 1);
      polygons.push([
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom },
      ]);
      continue;
    }

    let hull: Pt[];
    if (useMarchingSquares) {
      // Construire un masque binaire dédié à ce cluster
      const clusterMask = new Uint8Array(gridW * gridH);
      if (singleCluster) {
        // toutes les composantes significatives
        for (const c of sigComps) {
          for (const p of c) {
            const gx = (p.x / sampleStride) | 0;
            const gy = (p.y / sampleStride) | 0;
            if (gx >= 0 && gx < gridW && gy >= 0 && gy < gridH)
              clusterMask[gy * gridW + gx] = 1;
          }
        }
      } else {
        for (const p of cluster) {
          const gx = (p.x / sampleStride) | 0;
          const gy = (p.y / sampleStride) | 0;
          if (gx >= 0 && gx < gridW && gy >= 0 && gy < gridH)
            clusterMask[gy * gridW + gx] = 1;
        }
      }
      hull = mooreBoundaryTrace(clusterMask, gridW, gridH, sampleStride);
      if (hull.length < 3) continue;
    } else {
      const flat = cluster.map((p) => [p.x, p.y]);
      const hullFlat = concaveman(flat, alpha, lengthThreshold);
      hull = hullFlat.map(([x, y]) => ({ x, y }));
      if (hull.length < 3) continue;
    }

    // Snap-to-wall : pour chaque sommet, projeter sur le pixel STRUCTURAL
    // (mur épais, hachures déjà éliminées) le plus proche dans rayon snapRadius.
    if (snapRadius > 0) {
      hull = hull.map((p) => snapToOrangePixel(p, structuralMask, W, H, snapRadius));
    }

    let simplified = simplifyTolerance > 0
      ? douglasPeucker(hull, simplifyTolerance)
      : hull;
    if (orthogonalToleranceDeg > 0) {
      simplified = orthogonalize(simplified, orthogonalToleranceDeg);
    }
    polygons.push(simplified);
  }

  return {
    polygons,
    imageWidth: W,
    imageHeight: H,
    totalMaskPixels: totalOrange,
    clusterCount: sortedClusters.length,
  };
}

/**
 * Moore boundary trace : suit le contour d'un masque binaire en sens horaire.
 * Retourne le polygone fermé du plus grand composant connecté.
 *
 * Algo de Moore : depuis un pixel de bord, on cherche le voisin "1" suivant
 * en tournant autour du pixel courant. Garantit un contour fermé exact.
 */
function mooreBoundaryTrace(
  mask: Uint8Array,
  W: number,
  H: number,
  scale: number,
): Pt[] {
  // 1. Trouver tous les pixels frontière (= 1 mais avec ≥1 voisin 0 ou bord)
  // 2. BFS depuis le composant le + grand pour identifier les pixels du composant
  // 3. Tracer son contour avec Moore
  const labels = new Int32Array(W * H);
  const sizes: number[] = [0];
  let nLabels = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (mask[idx] === 0 || labels[idx] !== 0) continue;
      nLabels++;
      sizes.push(0);
      const stack = [idx];
      while (stack.length > 0) {
        const p = stack.pop()!;
        if (labels[p] !== 0) continue;
        labels[p] = nLabels;
        sizes[nLabels]++;
        const px = p % W, py = (p - px) / W;
        if (px > 0 && mask[p - 1] && !labels[p - 1]) stack.push(p - 1);
        if (px < W - 1 && mask[p + 1] && !labels[p + 1]) stack.push(p + 1);
        if (py > 0 && mask[p - W] && !labels[p - W]) stack.push(p - W);
        if (py < H - 1 && mask[p + W] && !labels[p + W]) stack.push(p + W);
      }
    }
  }
  if (nLabels === 0) return [];
  let bestL = 1;
  for (let i = 2; i <= nLabels; i++) if (sizes[i] > sizes[bestL]) bestL = i;

  // Cherche le pixel le plus haut-gauche du composant
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

  // Moore's algorithm — on suit le bord en sens horaire.
  // Voisins en ordre clockwise depuis "ouest" : W, NW, N, NE, E, SE, S, SW
  const N8 = [
    [-1,  0], [-1, -1], [ 0, -1], [ 1, -1],
    [ 1,  0], [ 1,  1], [ 0,  1], [-1,  1],
  ];
  const isOn = (x: number, y: number) =>
    x >= 0 && x < W && y >= 0 && y < H && labels[y * W + x] === bestL;

  const contour: Pt[] = [];
  let cx = startX, cy = startY;
  // direction d'où on vient = ouest (index 0)
  let backDir = 0;
  const startDir0 = 0;
  contour.push({ x: cx * scale, y: cy * scale });

  let iter = 0;
  const maxIter = W * H * 4;
  while (iter++ < maxIter) {
    // checked direction = (backDir + 1) mod 8 (= rotation 45° horaire depuis le "back")
    let found = false;
    let nx = cx, ny = cy;
    for (let k = 1; k <= 8; k++) {
      const dir = (backDir + k) % 8;
      const tx = cx + N8[dir][0];
      const ty = cy + N8[dir][1];
      if (isOn(tx, ty)) {
        nx = tx; ny = ty;
        // Le nouveau "back" = direction opposée de notre déplacement
        backDir = (dir + 4) % 8;
        found = true;
        break;
      }
    }
    if (!found) break; // pixel isolé
    cx = nx; cy = ny;
    if (cx === startX && cy === startY && backDir === startDir0) break;
    contour.push({ x: cx * scale, y: cy * scale });
    // Critère d'arrêt classique : on revient au pixel de départ avec le même back
    if (contour.length > 4 && cx === startX && cy === startY) break;
  }
  return contour;
}

/**
 * Snap d'un sommet vers le pixel orange le plus proche dans un rayon.
 * Si aucun pixel orange dans le rayon, retourne le point inchangé.
 */
function snapToOrangePixel(
  p: Pt,
  orangeMask: Uint8Array,
  W: number,
  H: number,
  radius: number,
): Pt {
  const px = Math.round(p.x);
  const py = Math.round(p.y);
  let bestDist = Infinity;
  let bestX = p.x, bestY = p.y;
  const x0 = Math.max(0, px - radius);
  const y0 = Math.max(0, py - radius);
  const x1 = Math.min(W - 1, px + radius);
  const y1 = Math.min(H - 1, py + radius);
  const r2 = radius * radius;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (orangeMask[y * W + x] !== 1) continue;
      const dx = x - px, dy = y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist && d2 <= r2) {
        bestDist = d2;
        bestX = x;
        bestY = y;
      }
    }
  }
  return { x: bestX, y: bestY };
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

/**
 * Dilation morphologique 1D-décomposée (carré r×r). O(W*H) au lieu de
 * O(W*H*r²). Utilise un buffer temporaire pour le passage horizontal.
 */
function morphDilate(mask: Uint8Array, W: number, H: number, r: number): Uint8Array {
  if (r <= 0) return mask;
  const tmp = new Uint8Array(W * H);
  // Horizontal
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
  // Vertical
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
 * Erosion morphologique 1D-décomposée (carré r×r).
 */
function morphErode(mask: Uint8Array, W: number, H: number, r: number): Uint8Array {
  if (r <= 0) return mask;
  const tmp = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const rowOff = y * W;
    for (let x = 0; x < W; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(W - 1, x + r);
      let all = 1;
      for (let xx = x0; xx <= x1; xx++) {
        if (!mask[rowOff + xx]) { all = 0; break; }
      }
      tmp[rowOff + x] = all;
    }
  }
  const out = new Uint8Array(W * H);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      const y0 = Math.max(0, y - r), y1 = Math.min(H - 1, y + r);
      let all = 1;
      for (let yy = y0; yy <= y1; yy++) {
        if (!tmp[yy * W + x]) { all = 0; break; }
      }
      out[y * W + x] = all;
    }
  }
  return out;
}

/**
 * Snap orthogonal : pour chaque segment du polygone, si son angle est
 * ≤ tolDeg de l'horizontale ou la verticale, redresser. Élimine les
 * "festons" sur des murs droits sans toucher aux vrais coudes obliques.
 *
 * Implémentation : pour chaque sommet, on regarde le segment précédent et
 * suivant. Si tous deux sont quasi-horizontaux, le sommet aligne son y sur
 * la moyenne des y voisins. Pareil pour verticaux. Itération 2 passes.
 */
function orthogonalize(points: Pt[], tolDeg: number): Pt[] {
  if (points.length < 3) return points;
  const tolRad = (tolDeg * Math.PI) / 180;
  let pts = points.slice();
  for (let pass = 0; pass < 2; pass++) {
    // Classifie chaque segment : 'H' (≤tol horizontal), 'V' (≤tol vertical), 'O' (oblique)
    const segDir: ("H" | "V" | "O")[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len === 0) { segDir.push("O"); continue; }
      const angle = Math.atan2(Math.abs(dy), Math.abs(dx)); // 0..π/2
      if (angle <= tolRad) segDir.push("H");
      else if (Math.PI / 2 - angle <= tolRad) segDir.push("V");
      else segDir.push("O");
    }
    // Pour chaque sommet, si segPrev='H' et segNext='H' → aligner y sur la moyenne.
    // Si segPrev='V' et segNext='V' → aligner x.
    const next = pts.map((p) => ({ x: p.x, y: p.y }));
    for (let i = 0; i < pts.length; i++) {
      const prevSeg = segDir[(i - 1 + pts.length) % pts.length];
      const nextSeg = segDir[i];
      const a = pts[(i - 1 + pts.length) % pts.length];
      const b = pts[(i + 1) % pts.length];
      if (prevSeg === "H" && nextSeg === "H") {
        next[i].y = Math.round((a.y + b.y) / 2);
      } else if (prevSeg === "V" && nextSeg === "V") {
        next[i].x = Math.round((a.x + b.x) / 2);
      } else if (prevSeg === "H" && nextSeg === "V") {
        // Coin propre : aligner x sur b.x et y sur a.y
        next[i].x = b.x;
        next[i].y = a.y;
      } else if (prevSeg === "V" && nextSeg === "H") {
        next[i].x = a.x;
        next[i].y = b.y;
      }
    }
    pts = next;
  }
  // Supprime sommets colinéaires consécutifs (3 points alignés → 2 sommets)
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[(i - 1 + pts.length) % pts.length];
    const b = pts[i];
    const c = pts[(i + 1) % pts.length];
    const dx1 = b.x - a.x, dy1 = b.y - a.y;
    const dx2 = c.x - b.x, dy2 = c.y - b.y;
    const cross = dx1 * dy2 - dy1 * dx2;
    const dotSign = dx1 * dx2 + dy1 * dy2;
    if (Math.abs(cross) < 1 && dotSign > 0) continue; // colinéaire même sens → omettre b
    out.push(b);
  }
  return out;
}
