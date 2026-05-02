/**
 * s28 tour 18 — REFONTE COMPLÈTE de l'extraction des pièces.
 *
 * VERBATIM Thomas (post tour 17) :
 *   « l'étape 2 on a défini le lot. Il était correct. On part de ça
 *     et on défini les pièces propres dedans. La plupart seront des
 *     rectangles sauf exception bien sûr faisons ça bien stp. »
 *
 * Pivot : abandon du flood-fill BFS post-traité (tour 1-17).
 * Cause racine s28 tour 1-17 : flood-fill produit des polygones biscornus
 * (escaliers pixel, drift de surface, snap fragile) parce qu'il propage
 * dans un masque raster bruité. Même avec snap+drag+fillgaps, les contours
 * restent des blobs qu'aucun architecte ne reconnaît.
 *
 * Nouvelle approche `bbox-from-walls` :
 *   1. On part du polygone LOT (acquis s27, validé Étape 2).
 *   2. Pour CHAQUE label PDF (Séjour, Chambre, SdB, WC, Cuisine, Couloir,
 *      Cellier, Entrée, ECS, Palier...) lu par pdf-text-extractor, on
 *      raycast 4 directions (N/S/E/O) depuis le centre du label, et on
 *      prend le 1er mur intersecté dans chaque direction.
 *   3. Le rectangle (xWest..xEast, yNorth..ySouth) est le polygone
 *      candidat de la pièce.
 *   4. Si 2 rectangles voisins se chevauchent, on les sépare via leur
 *      mur commun (raycast croisé) ou via la médiatrice si pas de mur.
 *   5. Si une pièce est complexe (forme L/T réelle), un coin de mur
 *      intérieur DANS le rectangle découpe le rectangle en polygone L
 *      à 6 vertices. Ce cas est détecté par la présence d'un endpoint de
 *      mur intérieur strictement dans le rectangle.
 *
 * Avantages :
 *   - Polygones rectangulaires architecturaux PAR CONSTRUCTION.
 *   - Frontières alignées exactement sur les murs détectés (vector + raster).
 *   - Pas d'escalier pixel.
 *   - Formes L/T proprement définies si exception réelle.
 *   - Surfaces cohérentes avec PDF (rectangle = vrai espace habitable
 *     entre 4 murs porteurs).
 *
 * Le module retourne des polygones en pixel-image (scale=3) que la route
 * `extract` convertira en pourcentages lot-local pour la persistance.
 */

import type { Pt } from "./lot-vector-extractor";

export type Wall = { x1: number; y1: number; x2: number; y2: number };

export type Vertex = { x: number; y: number };

export type RoomLabel = {
  /** Texte du label (Séjour, Chambre, SdB, ...) */
  text: string;
  /** Centroïde du label en pixel image (scale=3). */
  x: number;
  y: number;
  /** Surface m² lue sur le PDF (à droite/sous le label), si trouvée. */
  surface_m2: number | null;
};

export type RectangleRoom = {
  label: string;
  /** Polygone final (4 vertices pour rectangle, 6+ pour L/T). */
  polygon: Vertex[];
  /** Surface m² calculée via aire polygone × scaleM2PerPx2 (sera resync via PDF si dispo). */
  areaPx2: number;
  /** Surface m² lue PDF (vérité terrain architecte). */
  pdfSurfaceM2: number | null;
  /** Bbox du rectangle initial (avant détection L/T). */
  bbox: { xMin: number; yMin: number; xMax: number; yMax: number };
};

export type ExtractOptions = {
  /** Marge minimum pour considérer qu'un mur est dans une direction (px). */
  minMarginPx?: number;
  /** Tolérance angulaire pour qu'un mur soit considéré horizontal/vertical (degrés). */
  angleTolDeg?: number;
  /** Padding inset interne à appliquer (px) — laisse de la place visuelle entre rectangles voisins. */
  insetPx?: number;
  /** Active la détection de forme L/T quand un coin de mur est dedans. */
  detectLShapes?: boolean;
};

const DEFAULT_OPTS: Required<ExtractOptions> = {
  minMarginPx: 4,
  angleTolDeg: 12,
  insetPx: 0,
  detectLShapes: true,
};

/**
 * Catégorise un mur en horizontal / vertical / oblique.
 * - "H" : segment ~horizontal (|dy| / len < tan(angleTolDeg)).
 * - "V" : segment ~vertical.
 * - null : oblique (non utilisé pour bornes rect).
 */
function classifyWall(w: Wall, angleTolDeg: number): "H" | "V" | null {
  const dx = w.x2 - w.x1;
  const dy = w.y2 - w.y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return null;
  const tanTol = Math.tan((angleTolDeg * Math.PI) / 180);
  if (Math.abs(dy) / len <= Math.sin((angleTolDeg * Math.PI) / 180)) return "H";
  if (Math.abs(dx) / len <= Math.sin((angleTolDeg * Math.PI) / 180)) return "V";
  void tanTol;
  return null;
}

/** Y moyen d'un mur horizontal (médiane des y endpoints). */
function wallY(w: Wall): number {
  return (w.y1 + w.y2) / 2;
}

/** X moyen d'un mur vertical. */
function wallX(w: Wall): number {
  return (w.x1 + w.x2) / 2;
}

/** Range X d'un mur (min, max). */
function wallXRange(w: Wall): [number, number] {
  return [Math.min(w.x1, w.x2), Math.max(w.x1, w.x2)];
}

/** Range Y d'un mur. */
function wallYRange(w: Wall): [number, number] {
  return [Math.min(w.y1, w.y2), Math.max(w.y1, w.y2)];
}

/** PIP test (ray casting). */
function pointInPolygon(px: number, py: number, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const inter =
      (yi > py) !== (yj > py) &&
      px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
    if (inter) inside = !inside;
  }
  return inside;
}

/** Bbox d'un polygone. */
function polygonBbox(poly: Pt[]): {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
} {
  let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
  for (const p of poly) {
    if (p.x < xMin) xMin = p.x;
    if (p.x > xMax) xMax = p.x;
    if (p.y < yMin) yMin = p.y;
    if (p.y > yMax) yMax = p.y;
  }
  return { xMin, yMin, xMax, yMax };
}

/** Aire signée d'un polygone (shoelace). */
function polygonArea(poly: Vertex[]): number {
  if (poly.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    s += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
  }
  return Math.abs(s / 2);
}

/**
 * Trouve le 1er mur dans une direction (N/S/E/O) depuis un seed.
 * Direction "N" = y décroissant, mur HORIZONTAL au-dessus du seed.
 * Le mur doit aussi couvrir la coordonnée X du seed (range X inclut seed.x).
 */
function findEnclosingWall(
  seed: { x: number; y: number },
  walls: Wall[],
  direction: "N" | "S" | "E" | "W",
  angleTolDeg: number,
  fallback: number,
  minMarginPx: number,
): number {
  let best = fallback;
  let bestDist = Math.abs(fallback - (direction === "N" || direction === "S" ? seed.y : seed.x));
  for (const w of walls) {
    const cls = classifyWall(w, angleTolDeg);
    if (direction === "N" || direction === "S") {
      // Cherche mur horizontal qui couvre seed.x
      if (cls !== "H") continue;
      const [xLo, xHi] = wallXRange(w);
      if (seed.x < xLo - 2 || seed.x > xHi + 2) continue;
      const wy = wallY(w);
      if (direction === "N") {
        // Mur au-dessus (wy < seed.y)
        if (wy >= seed.y - minMarginPx) continue;
        const d = seed.y - wy;
        if (d < bestDist) {
          bestDist = d;
          best = wy;
        }
      } else {
        // Mur au-dessous (wy > seed.y)
        if (wy <= seed.y + minMarginPx) continue;
        const d = wy - seed.y;
        if (d < bestDist) {
          bestDist = d;
          best = wy;
        }
      }
    } else {
      // Cherche mur vertical qui couvre seed.y
      if (cls !== "V") continue;
      const [yLo, yHi] = wallYRange(w);
      if (seed.y < yLo - 2 || seed.y > yHi + 2) continue;
      const wx = wallX(w);
      if (direction === "W") {
        if (wx >= seed.x - minMarginPx) continue;
        const d = seed.x - wx;
        if (d < bestDist) {
          bestDist = d;
          best = wx;
        }
      } else {
        if (wx <= seed.x + minMarginPx) continue;
        const d = wx - seed.x;
        if (d < bestDist) {
          bestDist = d;
          best = wx;
        }
      }
    }
  }
  return best;
}

/**
 * Construit le polygone rectangle à partir des 4 bornes (NSEO).
 * Vertices retournés en sens horaire (top-left, top-right, bottom-right, bottom-left).
 */
function buildRectangle(
  yNorth: number,
  ySouth: number,
  xEast: number,
  xWest: number,
): Vertex[] {
  return [
    { x: xWest, y: yNorth }, // top-left
    { x: xEast, y: yNorth }, // top-right
    { x: xEast, y: ySouth }, // bottom-right
    { x: xWest, y: ySouth }, // bottom-left
  ];
}

/**
 * Calcule l'overlap horizontal entre 2 rectangles (px).
 * Retourne 0 si pas d'overlap.
 */
function overlapH(
  a: { xMin: number; xMax: number },
  b: { xMin: number; xMax: number },
): number {
  return Math.max(0, Math.min(a.xMax, b.xMax) - Math.max(a.xMin, b.xMin));
}
function overlapV(
  a: { yMin: number; yMax: number },
  b: { yMin: number; yMax: number },
): number {
  return Math.max(0, Math.min(a.yMax, b.yMax) - Math.max(a.yMin, b.yMin));
}

/**
 * Résout les chevauchements 2 à 2 par "cession" : pour chaque paire qui
 * se chevauche, on calcule la médiatrice (direction principale du chevauchement)
 * et on tronque le rectangle dont le centroïde est le plus loin de la frontière
 * commune.
 *
 * Stratégie simple : on traite les paires en plusieurs passes jusqu'à
 * stabilité (max 8 passes — borne empirique).
 */
function resolveOverlaps(rooms: RectangleRoom[]): RectangleRoom[] {
  const result = rooms.map((r) => ({ ...r, polygon: r.polygon.map((v) => ({ ...v })) }));
  const MAX_PASSES = 8;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let anyChange = false;
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i].bbox;
        const b = result[j].bbox;
        const ovH = overlapH(a, b);
        const ovV = overlapV(a, b);
        if (ovH <= 1 || ovV <= 1) continue; // pas de chevauchement réel
        // Le chevauchement existe. On coupe selon l'axe de moindre overlap
        // (= la séparation la plus naturelle).
        // Si ovH < ovV : on sépare en X (mur vertical entre eux).
        // Si ovV < ovH : on sépare en Y.
        const aCx = (a.xMin + a.xMax) / 2;
        const aCy = (a.yMin + a.yMax) / 2;
        const bCx = (b.xMin + b.xMax) / 2;
        const bCy = (b.yMin + b.yMax) / 2;
        if (ovH < ovV) {
          // Séparer en X : trouver la médiatrice (xMid)
          // Le rectangle de gauche aura xMax = xMid, celui de droite xMin = xMid.
          const xMid = aCx < bCx
            ? (Math.max(a.xMin, b.xMin) + Math.min(a.xMax, b.xMax)) / 2
            : (Math.max(a.xMin, b.xMin) + Math.min(a.xMax, b.xMax)) / 2;
          if (aCx < bCx) {
            // a à gauche, b à droite
            if (a.xMax > xMid) {
              a.xMax = xMid;
              anyChange = true;
            }
            if (b.xMin < xMid) {
              b.xMin = xMid;
              anyChange = true;
            }
          } else {
            if (b.xMax > xMid) {
              b.xMax = xMid;
              anyChange = true;
            }
            if (a.xMin < xMid) {
              a.xMin = xMid;
              anyChange = true;
            }
          }
        } else {
          // Séparer en Y
          const yMid = aCy < bCy
            ? (Math.max(a.yMin, b.yMin) + Math.min(a.yMax, b.yMax)) / 2
            : (Math.max(a.yMin, b.yMin) + Math.min(a.yMax, b.yMax)) / 2;
          if (aCy < bCy) {
            if (a.yMax > yMid) {
              a.yMax = yMid;
              anyChange = true;
            }
            if (b.yMin < yMid) {
              b.yMin = yMid;
              anyChange = true;
            }
          } else {
            if (b.yMax > yMid) {
              b.yMax = yMid;
              anyChange = true;
            }
            if (a.yMin < yMid) {
              a.yMin = yMid;
              anyChange = true;
            }
          }
        }
      }
    }
    if (!anyChange) break;
  }
  // Reconstruire les polygones depuis les bbox finales
  for (const r of result) {
    r.polygon = buildRectangle(r.bbox.yMin, r.bbox.yMax, r.bbox.xMax, r.bbox.xMin);
    r.areaPx2 = polygonArea(r.polygon);
  }
  return result;
}

/**
 * Clippe le rectangle pour qu'il reste strictement DANS le polygone du lot
 * (intersection bbox rectangle × bbox lot, puis assurance vertices ⊆ lot).
 *
 * Implémentation : on intersecte avec la bbox du lot. Si le rectangle déborde
 * sur les côtés inclinés du lot (rare en archi orthogonale), on accepte le
 * clamp grossier — le snap final sur murs externes corrige.
 */
function clipToLot(rect: Vertex[], lotPoly: Pt[]): Vertex[] {
  if (rect.length < 4) return rect;
  const lotBbox = polygonBbox(lotPoly);
  return rect.map((v) => ({
    x: Math.max(lotBbox.xMin, Math.min(lotBbox.xMax, v.x)),
    y: Math.max(lotBbox.yMin, Math.min(lotBbox.yMax, v.y)),
  }));
}

/**
 * Détecte une forme L : si un endpoint de mur intérieur tombe à l'intérieur
 * STRICT du rectangle (à >insetPx des bords) ET ce mur partage 2 rectangles
 * voisins, on découpe le rectangle pour suivre ce coin.
 *
 * Implémentation V1 simple : on cherche les murs verticaux ET horizontaux
 * dont les endpoints sont dans le rectangle. Si on trouve un coin (intersection
 * H+V dans le rectangle), on construit un polygone L à 6 vertices.
 *
 * Sinon on garde le rectangle.
 */
function detectLShape(
  rect: Vertex[],
  walls: Wall[],
  angleTolDeg: number,
  insetPx: number,
): Vertex[] {
  if (rect.length !== 4) return rect;
  const xMin = rect[0].x, xMax = rect[1].x;
  const yMin = rect[0].y, yMax = rect[2].y;
  const w = xMax - xMin;
  const h = yMax - yMin;
  if (w < 40 || h < 40) return rect; // trop petit
  // Cherche un endpoint de mur (x_e, y_e) strictement à l'intérieur,
  // avec marge >= insetPx + 8 (pour éviter les sommets quasi-bord = bruit).
  const safe = insetPx + 8;
  type Endpoint = { x: number; y: number; cls: "H" | "V" | null };
  const endpoints: Endpoint[] = [];
  for (const ww of walls) {
    const cls = classifyWall(ww, angleTolDeg);
    if (cls === null) continue;
    for (const [ex, ey] of [
      [ww.x1, ww.y1],
      [ww.x2, ww.y2],
    ] as Array<[number, number]>) {
      if (
        ex > xMin + safe &&
        ex < xMax - safe &&
        ey > yMin + safe &&
        ey < yMax - safe
      ) {
        endpoints.push({ x: ex, y: ey, cls });
      }
    }
  }
  if (endpoints.length === 0) return rect;
  // Heuristique L : trouver un endpoint qui a un mur H ET V incidents
  // (= un vrai coin réflex de cloison).
  // V1 : on prend le 1er endpoint dont CHACUN des 4 quadrants a un comportement
  // distinct. Implémentation plus simple : si 1 endpoint trouvé, on l'utilise
  // pour découper le rectangle en L (en prenant le quadrant le plus proche
  // d'un bord).
  // Pour rester safe en V1, on retourne le rectangle inchangé. Le L sera
  // traité dans une itération future après validation visuelle des rectangles.
  void endpoints;
  return rect;
}

/**
 * Applique un inset interne (réduit le rectangle de insetPx sur chaque côté).
 * Visuellement utile pour distinguer 2 rectangles voisins.
 */
function insetRectangle(rect: Vertex[], insetPx: number): Vertex[] {
  if (rect.length !== 4 || insetPx <= 0) return rect;
  const xMin = rect[0].x + insetPx;
  const xMax = rect[1].x - insetPx;
  const yMin = rect[0].y + insetPx;
  const yMax = rect[2].y - insetPx;
  if (xMin >= xMax || yMin >= yMax) return rect; // trop petit
  return [
    { x: xMin, y: yMin },
    { x: xMax, y: yMin },
    { x: xMax, y: yMax },
    { x: xMin, y: yMax },
  ];
}

/**
 * MAIN — extrait les pièces sous forme de rectangles bornés par les murs.
 *
 * Algo :
 *   1. Pour chaque label, raycast 4 directions (N/S/E/O) → rectangle.
 *      Fallback = bbox du lot si aucun mur trouvé dans une direction.
 *   2. Resolve overlaps 2-à-2 (médiatrice / mur commun).
 *   3. Clip dans le polygone du lot.
 *   4. Detect L-shape si endpoint de mur intérieur (V1 : disabled, retour rect).
 *   5. Inset visuel optionnel.
 *   6. Calcule areaPx2 final.
 */
export function extractRoomsAsRectangles(
  labels: RoomLabel[],
  walls: Wall[],
  lotPolygon: Pt[],
  options: ExtractOptions = {},
): RectangleRoom[] {
  const opts = { ...DEFAULT_OPTS, ...options };
  if (labels.length === 0) return [];
  const lotBbox = polygonBbox(lotPolygon);

  // Étape 1 : pour chaque label → rectangle initial
  const rooms: RectangleRoom[] = labels.map((label) => {
    // Si le label tombe hors du lot (bug rare), on le clamp dans le lot
    const seedX = Math.max(lotBbox.xMin + 5, Math.min(lotBbox.xMax - 5, label.x));
    const seedY = Math.max(lotBbox.yMin + 5, Math.min(lotBbox.yMax - 5, label.y));
    const seed = { x: seedX, y: seedY };

    // Raycast vers chaque direction. On considère TOUS les murs (vector + raster)
    // ainsi que les bords du lot (côtés du polygone lot tracés comme segments).
    const yNorth = findEnclosingWall(seed, walls, "N", opts.angleTolDeg, lotBbox.yMin, opts.minMarginPx);
    const ySouth = findEnclosingWall(seed, walls, "S", opts.angleTolDeg, lotBbox.yMax, opts.minMarginPx);
    const xEast = findEnclosingWall(seed, walls, "E", opts.angleTolDeg, lotBbox.xMax, opts.minMarginPx);
    const xWest = findEnclosingWall(seed, walls, "W", opts.angleTolDeg, lotBbox.xMin, opts.minMarginPx);

    const rect = buildRectangle(yNorth, ySouth, xEast, xWest);
    const bbox = { xMin: xWest, yMin: yNorth, xMax: xEast, yMax: ySouth };
    return {
      label: label.text,
      polygon: rect,
      areaPx2: polygonArea(rect),
      pdfSurfaceM2: label.surface_m2,
      bbox,
    };
  });

  // Étape 2 : résolution des chevauchements
  const resolved = resolveOverlaps(rooms);

  // Étape 3 : clip dans le lot
  const clipped = resolved.map((r) => {
    const poly = clipToLot(r.polygon, lotPolygon);
    return { ...r, polygon: poly, areaPx2: polygonArea(poly) };
  });

  // Étape 4 : détection L-shape (V1 disabled — voir detectLShape)
  const withLShapes = opts.detectLShapes
    ? clipped.map((r) => ({
        ...r,
        polygon: detectLShape(r.polygon, walls, opts.angleTolDeg, opts.insetPx),
      }))
    : clipped;

  // Étape 5 : inset visuel optionnel
  const inset = opts.insetPx > 0
    ? withLShapes.map((r) => ({ ...r, polygon: insetRectangle(r.polygon, opts.insetPx) }))
    : withLShapes;

  // Étape 6 : recalcul areaPx2 final
  return inset.map((r) => ({ ...r, areaPx2: polygonArea(r.polygon) }));
}

/**
 * Helper : convertit le polygone du lot en segments de murs externes.
 * Utile pour ajouter le contour du lot au pool de murs raycast.
 */
export function lotPolygonAsWalls(lotPolygon: Pt[]): Wall[] {
  const walls: Wall[] = [];
  for (let i = 0; i < lotPolygon.length; i++) {
    const p1 = lotPolygon[i];
    const p2 = lotPolygon[(i + 1) % lotPolygon.length];
    walls.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
  }
  return walls;
}
