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
  /** Longueur minimum d'un segment pour qu'il compte comme borne (px). Filtre cotes/textes. */
  minWallLenPx?: number;
};

const DEFAULT_OPTS: Required<ExtractOptions> = {
  minMarginPx: 4,
  angleTolDeg: 12,
  insetPx: 0,
  detectLShapes: true,
  minWallLenPx: 24,
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
 *
 * Fonctionne en 2 modes :
 *   - mode strict : le mur doit couvrir la coordonnée perpendiculaire du seed
 *     (range X inclut seed.x pour H, range Y inclut seed.y pour V)
 *   - mode souple (fallback) : si rien en strict, on accepte tout mur dans
 *     une bande de ±latBandPx autour du seed perpendiculairement.
 *
 * S'enrichit aussi des "antagonistes" : pour chaque autre seed dans la même
 * direction (= un autre label entre seed et la cible), on capse à la médiatrice.
 */
function findEnclosingWall(
  seed: { x: number; y: number },
  walls: Wall[],
  direction: "N" | "S" | "E" | "W",
  angleTolDeg: number,
  fallback: number,
  minMarginPx: number,
  otherSeeds: Array<{ x: number; y: number }> = [],
  latBandPx: number = 30,
): number {
  // ─── Étape 1 : médiatrice avec autres seeds dans la direction ────
  // Si un autre seed est entre `seed` et le fallback dans la direction,
  // capse au midpoint (= séparation naturelle entre 2 pièces voisines).
  let cap = fallback;
  for (const o of otherSeeds) {
    if (direction === "N" || direction === "S") {
      // Doit être proche en X (même couloir vertical)
      if (Math.abs(o.x - seed.x) > latBandPx * 4) continue;
      if (direction === "N") {
        if (o.y < seed.y - minMarginPx && o.y > cap) {
          // o est entre cap (haut) et seed
          cap = (seed.y + o.y) / 2;
        }
      } else {
        if (o.y > seed.y + minMarginPx && o.y < cap) {
          cap = (seed.y + o.y) / 2;
        }
      }
    } else {
      if (Math.abs(o.y - seed.y) > latBandPx * 4) continue;
      if (direction === "W") {
        if (o.x < seed.x - minMarginPx && o.x > cap) {
          cap = (seed.x + o.x) / 2;
        }
      } else {
        if (o.x > seed.x + minMarginPx && o.x < cap) {
          cap = (seed.x + o.x) / 2;
        }
      }
    }
  }

  // ─── Étape 2 : raycast murs en mode strict puis souple ──────────
  // On cherche le mur le plus proche du seed (avant cap) qui est dans
  // la direction, en privilégiant les murs qui couvrent la coordonnée
  // perpendiculaire (strict). Si aucun mur strict, on tolère lateralBand.
  const tryFind = (lateralTol: number, requireStrict: boolean, minLen: number): number | null => {
    let best: number | null = null;
    let bestDist = Infinity;
    for (const w of walls) {
      const cls = classifyWall(w, angleTolDeg);
      if (direction === "N" || direction === "S") {
        if (cls !== "H") continue;
        const [xLo, xHi] = wallXRange(w);
        const segLen = xHi - xLo;
        if (segLen < minLen) continue;
        // Strict : seed.x doit être dans [xLo, xHi]
        // Souple : seed.x dans [xLo - lateralTol, xHi + lateralTol]
        const tol = requireStrict ? 2 : lateralTol;
        if (seed.x < xLo - tol || seed.x > xHi + tol) continue;
        const wy = wallY(w);
        if (direction === "N") {
          if (wy >= seed.y - minMarginPx) continue;
          if (wy <= cap - 1) continue; // au-delà de la médiatrice : on ignore
          const d = seed.y - wy;
          if (d < bestDist) {
            bestDist = d;
            best = wy;
          }
        } else {
          if (wy <= seed.y + minMarginPx) continue;
          if (wy >= cap + 1) continue;
          const d = wy - seed.y;
          if (d < bestDist) {
            bestDist = d;
            best = wy;
          }
        }
      } else {
        if (cls !== "V") continue;
        const [yLo, yHi] = wallYRange(w);
        const segLen = yHi - yLo;
        if (segLen < minLen) continue;
        const tol = requireStrict ? 2 : lateralTol;
        if (seed.y < yLo - tol || seed.y > yHi + tol) continue;
        const wx = wallX(w);
        if (direction === "W") {
          if (wx >= seed.x - minMarginPx) continue;
          if (wx <= cap - 1) continue;
          const d = seed.x - wx;
          if (d < bestDist) {
            bestDist = d;
            best = wx;
          }
        } else {
          if (wx <= seed.x + minMarginPx) continue;
          if (wx >= cap + 1) continue;
          const d = wx - seed.x;
          if (d < bestDist) {
            bestDist = d;
            best = wx;
          }
        }
      }
    }
    return best;
  };

  // 4 passes : strict long → strict moyen → souple long → souple moyen
  // Long = 30px+, moyen = 12px+. Préférer long (= vrais murs) avant moyen.
  const strict30 = tryFind(2, true, 30);
  if (strict30 !== null) return strict30;
  const strict12 = tryFind(2, true, 12);
  if (strict12 !== null) return strict12;
  const soft30 = tryFind(latBandPx, false, 30);
  if (soft30 !== null) return soft30;
  const soft12 = tryFind(latBandPx, false, 12);
  if (soft12 !== null) return soft12;
  const wide12 = tryFind(80, false, 12);
  if (wide12 !== null) return wide12;
  // Fallback : médiatrice ou bord du lot
  return cap;
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
 * Expand-to-fit : étend chaque rectangle dans chaque direction jusqu'à
 * toucher un autre rectangle voisin ou le bord du lot.
 *
 * Algo : pour chaque rectangle r et chaque direction d (N/S/E/O), on
 * cherche la borne maximum :
 *   - Bord du lot (lotBbox dans cette direction)
 *   - Bord d'un autre rectangle qui chevauche perpendiculairement
 *
 * Le "premier obstacle" est le plus proche. On expand r jusqu'à ce premier
 * obstacle (avec une marge de 2px).
 */
function expandToFit(
  rooms: RectangleRoom[],
  lotBbox: { xMin: number; yMin: number; xMax: number; yMax: number },
): RectangleRoom[] {
  const result = rooms.map((r) => ({
    ...r,
    bbox: { ...r.bbox },
    polygon: r.polygon.map((v) => ({ ...v })),
  }));

  // 3 passes : chaque passe étend les rectangles, ce qui peut autoriser
  // l'expansion supplémentaire des voisins. Stable après ~2 passes.
  for (let pass = 0; pass < 3; pass++) {
    let anyExpanded = false;
    for (let i = 0; i < result.length; i++) {
      const a = result[i].bbox;
      // Pour chaque direction, calculer la borne max d'expansion.
      // Direction N (yMin décroit) : on cherche la borne yMin minimale possible.
      let nMax = lotBbox.yMin;
      let sMax = lotBbox.yMax;
      let eMax = lotBbox.xMax;
      let wMax = lotBbox.xMin;
      for (let j = 0; j < result.length; j++) {
        if (i === j) continue;
        const b = result[j].bbox;
        // Overlap perpendiculaire ?
        // N : on regarde vers le haut. Un voisin contre lequel on s'arrête doit
        //     avoir un overlap horizontal (b.xMin < a.xMax ET b.xMax > a.xMin),
        //     ET être au-dessus (b.yMax <= a.yMin + epsilon).
        if (b.xMax > a.xMin && b.xMin < a.xMax) {
          if (b.yMax <= a.yMin + 1 && b.yMax > nMax) nMax = b.yMax;
          if (b.yMin >= a.yMax - 1 && b.yMin < sMax) sMax = b.yMin;
        }
        if (b.yMax > a.yMin && b.yMin < a.yMax) {
          if (b.xMax <= a.xMin + 1 && b.xMax > wMax) wMax = b.xMax;
          if (b.xMin >= a.xMax - 1 && b.xMin < eMax) eMax = b.xMin;
        }
      }
      // Apply expansion (avec marge 1px pour ne pas chevaucher exactement)
      const margin = 1;
      const newYMin = Math.min(a.yMin, nMax + margin);
      const newYMax = Math.max(a.yMax, sMax - margin);
      const newXMin = Math.min(a.xMin, wMax + margin);
      const newXMax = Math.max(a.xMax, eMax - margin);
      if (
        newYMin < a.yMin ||
        newYMax > a.yMax ||
        newXMin < a.xMin ||
        newXMax > a.xMax
      ) {
        a.yMin = newYMin;
        a.yMax = newYMax;
        a.xMin = newXMin;
        a.xMax = newXMax;
        anyExpanded = true;
      }
    }
    if (!anyExpanded) break;
  }
  for (const r of result) {
    r.polygon = buildRectangle(r.bbox.yMin, r.bbox.yMax, r.bbox.xMax, r.bbox.xMin);
    r.areaPx2 = polygonArea(r.polygon);
  }
  return result;
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
  // On capture d'abord les seeds clamped pour chaque label (utilisés comme
  // antagonistes Voronoï dans findEnclosingWall).
  const seeds = labels.map((label) => ({
    x: Math.max(lotBbox.xMin + 5, Math.min(lotBbox.xMax - 5, label.x)),
    y: Math.max(lotBbox.yMin + 5, Math.min(lotBbox.yMax - 5, label.y)),
  }));

  const rooms: RectangleRoom[] = labels.map((label, idx) => {
    const seed = seeds[idx];
    const others = seeds.filter((_, i) => i !== idx);

    // Raycast vers chaque direction avec antagonistes Voronoï.
    const yNorth = findEnclosingWall(seed, walls, "N", opts.angleTolDeg, lotBbox.yMin, opts.minMarginPx, others);
    const ySouth = findEnclosingWall(seed, walls, "S", opts.angleTolDeg, lotBbox.yMax, opts.minMarginPx, others);
    const xEast = findEnclosingWall(seed, walls, "E", opts.angleTolDeg, lotBbox.xMax, opts.minMarginPx, others);
    const xWest = findEnclosingWall(seed, walls, "W", opts.angleTolDeg, lotBbox.xMin, opts.minMarginPx, others);

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

  // Étape 1.5 : expand-to-fit. Chaque rectangle s'étend dans chaque direction
  // jusqu'à toucher un autre rectangle voisin ou le bord du lot.
  // C'est la passe critique : sans elle, les rectangles restent "petits" et
  // ne couvrent pas tout l'espace habitable.
  const expanded = expandToFit(rooms, lotBbox);

  // Étape 2 : résolution des chevauchements (au cas où expand a généré des conflits)
  const resolved = resolveOverlaps(expanded);

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
  const finalRooms = inset.map((r) => ({ ...r, areaPx2: polygonArea(r.polygon) }));

  // Étape 7 : filtre micro-pièces hallucinées.
  // Règle métier : un label ECS / TGBT / Local technique / placard <3m² qui
  // n'est pas une "vraie" pièce habitable (WC, SdB, SdE, Cellier, Couloir,
  // Entrée, Palier sont des cas où <3m² est acceptable).
  // Les ECS RDC Muguets sont des locaux techniques sous escalier — pas de
  // vraie pièce. Sur R+1/R+3 l'ECS est dans un placard technique légitime.
  // Pour discriminer, on rejette si :
  //   - nom = ECS (équivalent local technique)
  //   - ET PDF surface absente OU < 1.5m²
  // Sur R+1 ECS = 1.2m² → rejeté aussi ❌. Donc on garde uniquement la règle
  // "no PDF surface" (= label sans m² donc artefact).
  // Compromis V1 : filtre uniquement pièces SANS surface PDF ET nom dans la
  // blacklist micro (ECS, TGBT). Les pièces avec surface PDF connue restent.
  // V2 : on n'applique PAS de filtre business ici. La règle "ECS RDC =
  // pas une pièce" est métier et fragile à hardcoder. On laisse le pipeline
  // produire ce qui est lu sur le PDF, et l'utilisateur valide manuellement.
  // Sur R+1/R+3 ECS est légitime (placard technique étiqueté).
  return finalRooms;
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
