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
  /**
   * Bbox du texte du label en pixel image (scale=3), si disponible.
   * Utilisée par enforcePdfSurfaces pour garantir que le rectangle final
   * englobe la bbox label (évite que la pièce soit décalée hors de son label).
   * Source : extractTextItems (pdfjs vectoriel).
   */
  labelBbox?: { xMin: number; yMin: number; xMax: number; yMax: number } | null;
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
  walls: Wall[],
  angleTolDeg: number,
  scaleM2PerPx2Hint: number | null = null,
  seeds: Array<{ x: number; y: number }> | null = null,
): RectangleRoom[] {
  const result = rooms.map((r) => ({
    ...r,
    bbox: { ...r.bbox },
    polygon: r.polygon.map((v) => ({ ...v })),
  }));

  // s28 tour 19.b — Compute a max-area-px2 cap par pièce basé sur PDF.
  // Si PDF surface = 10m², on autorise au max 13m² (1.3× tolérance).
  // Convertit en px² via scaleM2PerPx2Hint si disponible, sinon dérivé de
  // la médiane des rooms qui ont PDF surface.
  let scale = scaleM2PerPx2Hint;
  if (scale === null || !Number.isFinite(scale) || scale <= 0) {
    const cands = rooms
      .filter((r) => r.pdfSurfaceM2 != null && r.pdfSurfaceM2 > 0 && r.areaPx2 > 0)
      .map((r) => r.pdfSurfaceM2! / r.areaPx2)
      .sort((a, b) => a - b);
    if (cands.length >= 2) {
      scale = cands[Math.floor(cands.length / 2)];
    }
  }
  // s28 tour 19.b — fallback médiane PDF pour les pièces sans surface (ECS, etc.)
  // ECS / placard technique : on cap à 1/3 de la médiane des autres pièces (≈3-5m²).
  // Utile pour éviter qu'ECS s'expande à 30+ m² sur R+1.
  let medianPdfM2 = 0;
  {
    const pdfList = rooms
      .map((r) => r.pdfSurfaceM2)
      .filter((s): s is number => s != null && s > 0)
      .sort((a, b) => a - b);
    if (pdfList.length > 0) {
      medianPdfM2 = pdfList[Math.floor(pdfList.length / 2)];
    }
  }
  function maxAreaPx2(idx: number): number | null {
    if (scale === null || scale <= 0) return null;
    const pdf = result[idx].pdfSurfaceM2;
    if (pdf != null && pdf > 0) {
      return (pdf * 1.3) / scale; // 30% tolérance d'expansion
    }
    // Pas de surface PDF (ex ECS, TGBT, placard) — cap à 1/3 médiane (≈3-5m²)
    if (medianPdfM2 > 0) {
      return (medianPdfM2 / 3) / scale;
    }
    return null;
  }

  // s28 tour 19 — précalcul : index murs H et V pour borne expansion.
  // expansion vers N/S = arrête au mur H le plus proche.
  // expansion vers E/O = arrête au mur V le plus proche.
  // s28 tour 19.c — uniquement murs LONGS (≥80px) comme bornes — sinon
  // les petites cotes / mobilier vectoriel survivants bloquent l'expansion.
  const STRONG_WALL_MIN_LEN = 80;
  type WallInfo = { pos: number; lo: number; hi: number };
  const hWalls: WallInfo[] = []; // y, [xLo, xHi]
  const vWalls: WallInfo[] = []; // x, [yLo, yHi]
  for (const w of walls) {
    const cls = classifyWall(w, angleTolDeg);
    const wlen = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
    if (wlen < STRONG_WALL_MIN_LEN) continue;
    if (cls === "H") {
      hWalls.push({
        pos: wallY(w),
        lo: Math.min(w.x1, w.x2),
        hi: Math.max(w.x1, w.x2),
      });
    } else if (cls === "V") {
      vWalls.push({
        pos: wallX(w),
        lo: Math.min(w.y1, w.y2),
        hi: Math.max(w.y1, w.y2),
      });
    }
  }

  // Pour le bord N de bbox `a`, cherche le mur H le plus proche AU-DESSUS
  // (yWall < a.yMin) qui couvre [a.xMin, a.xMax] (au moins 50% d'overlap).
  function nearestWallN(a: typeof result[0]["bbox"]): number | null {
    let best: number | null = null;
    let bestY = -Infinity;
    const reqLo = a.xMin, reqHi = a.xMax;
    for (const w of hWalls) {
      if (w.pos >= a.yMin - 2) continue;
      // Overlap minimum 50% de la largeur du rectangle
      const ovLo = Math.max(reqLo, w.lo);
      const ovHi = Math.min(reqHi, w.hi);
      const ov = Math.max(0, ovHi - ovLo);
      const minOv = Math.min(20, (reqHi - reqLo) * 0.25);
      if (ov < minOv) continue;
      if (w.pos > bestY) {
        bestY = w.pos;
        best = w.pos;
      }
    }
    return best;
  }
  function nearestWallS(a: typeof result[0]["bbox"]): number | null {
    let best: number | null = null;
    let bestY = Infinity;
    const reqLo = a.xMin, reqHi = a.xMax;
    for (const w of hWalls) {
      if (w.pos <= a.yMax + 2) continue;
      const ovLo = Math.max(reqLo, w.lo);
      const ovHi = Math.min(reqHi, w.hi);
      const ov = Math.max(0, ovHi - ovLo);
      const minOv = Math.min(20, (reqHi - reqLo) * 0.25);
      if (ov < minOv) continue;
      if (w.pos < bestY) {
        bestY = w.pos;
        best = w.pos;
      }
    }
    return best;
  }
  function nearestWallW(a: typeof result[0]["bbox"]): number | null {
    let best: number | null = null;
    let bestX = -Infinity;
    const reqLo = a.yMin, reqHi = a.yMax;
    for (const w of vWalls) {
      if (w.pos >= a.xMin - 2) continue;
      const ovLo = Math.max(reqLo, w.lo);
      const ovHi = Math.min(reqHi, w.hi);
      const ov = Math.max(0, ovHi - ovLo);
      const minOv = Math.min(20, (reqHi - reqLo) * 0.25);
      if (ov < minOv) continue;
      if (w.pos > bestX) {
        bestX = w.pos;
        best = w.pos;
      }
    }
    return best;
  }
  function nearestWallE(a: typeof result[0]["bbox"]): number | null {
    let best: number | null = null;
    let bestX = Infinity;
    const reqLo = a.yMin, reqHi = a.yMax;
    for (const w of vWalls) {
      if (w.pos <= a.xMax + 2) continue;
      const ovLo = Math.max(reqLo, w.lo);
      const ovHi = Math.min(reqHi, w.hi);
      const ov = Math.max(0, ovHi - ovLo);
      const minOv = Math.min(20, (reqHi - reqLo) * 0.25);
      if (ov < minOv) continue;
      if (w.pos < bestX) {
        bestX = w.pos;
        best = w.pos;
      }
    }
    return best;
  }

  // 3 passes : chaque passe étend les rectangles, ce qui peut autoriser
  // l'expansion supplémentaire des voisins. Stable après ~2 passes.
  for (let pass = 0; pass < 3; pass++) {
    let anyExpanded = false;
    for (let i = 0; i < result.length; i++) {
      const a = result[i].bbox;
      // Pour chaque direction, calculer la borne max d'expansion.
      // s28 tour 19 : on prend le MIN entre :
      //   - bord du lot
      //   - bord d'un autre rectangle voisin (avec overlap perpendiculaire)
      //   - mur architectural le plus proche dans la direction
      // (le plus proche du seed = le moins permissif = le plus contraignant)
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
      // s28 tour 19 — borne murale (la plus contraignante des 3 sources)
      const wallN = nearestWallN(a);
      if (wallN !== null && wallN > nMax) nMax = wallN;
      const wallS = nearestWallS(a);
      if (wallS !== null && wallS < sMax) sMax = wallS;
      const wallW = nearestWallW(a);
      if (wallW !== null && wallW > wMax) wMax = wallW;
      const wallE = nearestWallE(a);
      if (wallE !== null && wallE < eMax) eMax = wallE;

      // Apply expansion (avec marge 1px pour ne pas chevaucher exactement)
      // s28 tour 19.b — cap par PDF surface (1.3×) si dispo.
      const margin = 1;
      let newYMin = Math.min(a.yMin, nMax + margin);
      let newYMax = Math.max(a.yMax, sMax - margin);
      let newXMin = Math.min(a.xMin, wMax + margin);
      let newXMax = Math.max(a.xMax, eMax - margin);
      const cap = maxAreaPx2(i);
      if (cap !== null) {
        const candidateArea = (newXMax - newXMin) * (newYMax - newYMin);
        if (candidateArea > cap) {
          // s28 tour 19.b — Réduire isotropiquement AUTOUR DU SEED (pas centre)
          // pour préserver la position du label IA dans le rectangle final.
          const scale_factor = Math.sqrt(cap / candidateArea);
          const sx = seeds ? seeds[i].x : (newXMin + newXMax) / 2;
          const sy = seeds ? seeds[i].y : (newYMin + newYMax) / 2;
          const halfW = (newXMax - newXMin) / 2 * scale_factor;
          const halfH = (newYMax - newYMin) / 2 * scale_factor;
          newXMin = Math.max(newXMin, sx - halfW);
          newXMax = Math.min(newXMax, sx + halfW);
          newYMin = Math.max(newYMin, sy - halfH);
          newYMax = Math.min(newYMax, sy + halfH);
          // Si le shrink autour du seed laisse box < halfW/halfH (seed trop près
          // d'un bord), corrige en décalant
          if (newXMax - newXMin < halfW * 1.8) {
            const cx = sx;
            newXMin = cx - halfW;
            newXMax = cx + halfW;
          }
          if (newYMax - newYMin < halfH * 1.8) {
            const cy = sy;
            newYMin = cy - halfH;
            newYMax = cy + halfH;
          }
        }
      }
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
 * Enforce PDF surfaces : pour chaque pièce avec pdfSurfaceM2 connue, on
 * calcule le ratio actuel = areaPx2 * scale / pdfSurfaceM2.
 * Si le ratio > 1.20 (rectangle trop grand de plus de 20%), on shrink le
 * rectangle vers le seed proportionnellement, en gardant le seed à
 * l'intérieur. Ne grossit jamais (évite la regénération de chevauchements).
 *
 * scale est calculé sur la médiane des ratios area/pdf des pièces "fiables"
 * (= ratio dans [0.7, 1.4] = bien dimensionnées).
 */
function enforcePdfSurfaces(
  rooms: RectangleRoom[],
  seeds: Array<{ x: number; y: number }>,
  lotBbox: { xMin: number; yMin: number; xMax: number; yMax: number },
  labelBboxes?: Array<{ xMin: number; yMin: number; xMax: number; yMax: number } | null>,
): RectangleRoom[] {
  // Calcul scale médian
  const candidates = rooms
    .map((r, i) => ({ r, i }))
    .filter((x) => x.r.pdfSurfaceM2 != null && x.r.pdfSurfaceM2 > 0 && x.r.areaPx2 > 0);
  if (candidates.length < 2) return rooms;
  const ks = candidates.map((c) => c.r.pdfSurfaceM2! / c.r.areaPx2).sort((a, b) => a - b);
  const medianK = ks[Math.floor(ks.length / 2)];
  // Filtre outliers
  const filtered = candidates.filter((c) => {
    const k = c.r.pdfSurfaceM2! / c.r.areaPx2;
    return k >= medianK * 0.5 && k <= medianK * 2.0;
  });
  const scale = filtered.length >= 2
    ? filtered.map((c) => c.r.pdfSurfaceM2! / c.r.areaPx2).sort((a, b) => a - b)[Math.floor(filtered.length / 2)]
    : medianK;

  // s28 tour 21 — SHRINK ANISOTROPE :
  // Au lieu de shrinker isotropiquement vers le centre, on shrink en priorité
  // les bords qui touchent le lot bbox (= bords "ouverts" sans voisin direct,
  // typiquement la terrasse au nord du RDC Muguets). Conserve les bords mitoyens
  // avec d'autres pièces (= séparations légitimes entre rooms).
  //
  // Stratégie : pour chaque pièce trop grande,
  //   1. Calculer le surplus en px² à shrinker.
  //   2. Identifier les bords "free" : touchent le lot bbox ET pas de voisin
  //      collé (≤8px) côté pièce.
  //   3. Distribuer le shrink proportionnellement à la "marge libre" sur ces
  //      bords, en garantissant que la bbox du label reste inscrite.
  //   4. Si pas de bord free → fallback shrink isotrope vers seed.
  const TOL_LOT = 4; // px : tolérance pour considérer "touche le lot"
  const TOL_NEIGHBOR = 8; // px : tolérance pour considérer "voisin collé"
  return rooms.map((r, idx) => {
    if (r.pdfSurfaceM2 == null || r.pdfSurfaceM2 <= 0) return r;
    if (r.areaPx2 <= 0) return r;
    const currentM2 = r.areaPx2 * scale;
    const ratio = currentM2 / r.pdfSurfaceM2;
    // s28 tour 25b — cap resserré 1.20 → 1.10 pour pièces principales
    // (Séjour/cuisine, Chambre, ≥ 10 m² PDF). Tour 24 R+1 Séjour finit à 41 m²
    // alors que PDF 33 m² (ratio 1.24) → toléré par cap 1.20 mais visuellement
    // trop grand. Cap 1.10 force le shrink à 36.3 m² max.
    const isMainRoom = r.pdfSurfaceM2 >= 10;
    const capRatio = isMainRoom ? 1.10 : 1.20;
    if (ratio <= capRatio) return r; // OK ou trop petit (on ne grossit pas)
    const targetArea = r.pdfSurfaceM2 / scale;
    const seed = seeds[idx];
    const labelBbox = labelBboxes?.[idx] ?? null;

    // ─── 1. Identifier les bords "free" (touchent lot, pas de voisin collé) ───
    const a = r.bbox;
    const touchesLotN = Math.abs(a.yMin - lotBbox.yMin) <= TOL_LOT;
    const touchesLotS = Math.abs(a.yMax - lotBbox.yMax) <= TOL_LOT;
    const touchesLotW = Math.abs(a.xMin - lotBbox.xMin) <= TOL_LOT;
    const touchesLotE = Math.abs(a.xMax - lotBbox.xMax) <= TOL_LOT;
    let neighborN = false, neighborS = false, neighborW = false, neighborE = false;
    for (let j = 0; j < rooms.length; j++) {
      if (j === idx) continue;
      const b = rooms[j].bbox;
      const overlapX = Math.min(a.xMax, b.xMax) - Math.max(a.xMin, b.xMin);
      const overlapY = Math.min(a.yMax, b.yMax) - Math.max(a.yMin, b.yMin);
      if (overlapX > 0 && Math.abs(b.yMax - a.yMin) <= TOL_NEIGHBOR) neighborN = true;
      if (overlapX > 0 && Math.abs(b.yMin - a.yMax) <= TOL_NEIGHBOR) neighborS = true;
      if (overlapY > 0 && Math.abs(b.xMax - a.xMin) <= TOL_NEIGHBOR) neighborW = true;
      if (overlapY > 0 && Math.abs(b.xMin - a.xMax) <= TOL_NEIGHBOR) neighborE = true;
    }
    const freeN = touchesLotN && !neighborN;
    const freeS = touchesLotS && !neighborS;
    const freeW = touchesLotW && !neighborW;
    const freeE = touchesLotE && !neighborE;
    const anyFree = freeN || freeS || freeW || freeE;

    // ─── 2. Limites : bbox label DOIT rester inscrite ───
    // (avec marge 5px). Si pas de bbox label, fallback = seed ± 10px.
    const minXMin = labelBbox ? labelBbox.xMin - 5 : seed.x - 10;
    const minXMax = labelBbox ? labelBbox.xMax + 5 : seed.x + 10;
    const minYMin = labelBbox ? labelBbox.yMin - 5 : seed.y - 10;
    const minYMax = labelBbox ? labelBbox.yMax + 5 : seed.y + 10;

    let newXMin = a.xMin, newXMax = a.xMax, newYMin = a.yMin, newYMax = a.yMax;

    if (anyFree) {
      // ─── 3. Shrink dimensionnel : on shrink en priorité les bords free.
      // Surplus à shrink (en px²)
      const surplusArea = r.areaPx2 - targetArea;
      const widthA = a.xMax - a.xMin;
      const heightA = a.yMax - a.yMin;

      // Shrink en hauteur si free vertical
      if (freeN || freeS) {
        // On shrink la hauteur jusqu'à atteindre target (proportionnel à la
        // largeur conservée). targetHeight = targetArea / widthA.
        const targetHeightFromArea = Math.min(heightA, targetArea / widthA);
        const totalShrinkH = heightA - targetHeightFromArea;
        // Distribuer proportionnellement entre N et S free
        const freeCount = (freeN ? 1 : 0) + (freeS ? 1 : 0);
        const shrinkPerFree = totalShrinkH / freeCount;
        if (freeN) newYMin = Math.min(minYMin, a.yMin + shrinkPerFree);
        if (freeS) newYMax = Math.max(minYMax, a.yMax - shrinkPerFree);
      }

      // Recalcul après shrink vertical
      const heightAfter = newYMax - newYMin;
      const areaAfterV = (a.xMax - a.xMin) * heightAfter;

      // Shrink en largeur si free horizontal ET surplus restant
      if ((freeW || freeE) && areaAfterV > targetArea * 1.05) {
        const targetWidthFromArea = Math.min(widthA, targetArea / heightAfter);
        const totalShrinkW = widthA - targetWidthFromArea;
        const freeCountH = (freeW ? 1 : 0) + (freeE ? 1 : 0);
        const shrinkPerFreeW = totalShrinkW / freeCountH;
        if (freeW) newXMin = Math.min(minXMin, a.xMin + shrinkPerFreeW);
        if (freeE) newXMax = Math.max(minXMax, a.xMax - shrinkPerFreeW);
      }

      void surplusArea;
    } else {
      // ─── 4. Fallback isotrope vers seed (comportement legacy) ───
      const shrinkFactor = Math.sqrt(targetArea / r.areaPx2);
      const cx = (a.xMin + a.xMax) / 2;
      const cy = (a.yMin + a.yMax) / 2;
      const halfW = (a.xMax - a.xMin) / 2 * shrinkFactor;
      const halfH = (a.yMax - a.yMin) / 2 * shrinkFactor;
      newXMin = cx - halfW;
      newXMax = cx + halfW;
      newYMin = cy - halfH;
      newYMax = cy + halfH;
      const seedMargin = 5;
      if (seed.x < newXMin + seedMargin) {
        const shift = newXMin + seedMargin - seed.x;
        newXMin -= shift; newXMax -= shift;
      }
      if (seed.x > newXMax - seedMargin) {
        const shift = seed.x - (newXMax - seedMargin);
        newXMin += shift; newXMax += shift;
      }
      if (seed.y < newYMin + seedMargin) {
        const shift = newYMin + seedMargin - seed.y;
        newYMin -= shift; newYMax -= shift;
      }
      if (seed.y > newYMax - seedMargin) {
        const shift = seed.y - (newYMax - seedMargin);
        newYMin += shift; newYMax += shift;
      }
    }

    // Sécurité : garantir que la bbox label est inscrite dans le rectangle final
    if (labelBbox) {
      newXMin = Math.min(newXMin, labelBbox.xMin - 2);
      newYMin = Math.min(newYMin, labelBbox.yMin - 2);
      newXMax = Math.max(newXMax, labelBbox.xMax + 2);
      newYMax = Math.max(newYMax, labelBbox.yMax + 2);
    }
    const newBbox = { xMin: newXMin, yMin: newYMin, xMax: newXMax, yMax: newYMax };
    const newPoly = buildRectangle(newBbox.yMin, newBbox.yMax, newBbox.xMax, newBbox.xMin);
    return {
      ...r,
      polygon: newPoly,
      areaPx2: polygonArea(newPoly),
      bbox: newBbox,
    };
  });
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
 * s28 tour 19.c — grossit les pièces sous-dimensionnées (< 0.85 PDF).
 * Pour chaque pièce, dans chaque direction où il n'y a pas de voisin proche
 * (à <50px), on étend jusqu'au mur architectural OU bord du lot, jusqu'à
 * atteindre 0.95 × PDF.
 *
 * Évite : Séjour R+1 stuck à 30 m² alors que PDF = 40.5 m².
 */
function growUnderSized(
  rooms: RectangleRoom[],
  lotBbox: { xMin: number; yMin: number; xMax: number; yMax: number },
  walls: Wall[],
  angleTolDeg: number,
): RectangleRoom[] {
  const result = rooms.map((r) => ({
    ...r,
    bbox: { ...r.bbox },
    polygon: r.polygon.map((v) => ({ ...v })),
  }));
  // Compute scale (m² per px²)
  const cands = rooms
    .filter((r) => r.pdfSurfaceM2 != null && r.pdfSurfaceM2 > 0 && r.areaPx2 > 0)
    .map((r) => r.pdfSurfaceM2! / r.areaPx2)
    .sort((a, b) => a - b);
  if (cands.length < 2) return rooms;
  const scale = cands[Math.floor(cands.length / 2)];

  // Index murs longs (≥80px) pour bornes
  const STRONG = 80;
  type WI = { pos: number; lo: number; hi: number };
  const hWalls: WI[] = [];
  const vWalls: WI[] = [];
  for (const w of walls) {
    const cls = classifyWall(w, angleTolDeg);
    const wlen = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
    if (wlen < STRONG) continue;
    if (cls === "H") {
      hWalls.push({ pos: wallY(w), lo: Math.min(w.x1, w.x2), hi: Math.max(w.x1, w.x2) });
    } else if (cls === "V") {
      vWalls.push({ pos: wallX(w), lo: Math.min(w.y1, w.y2), hi: Math.max(w.y1, w.y2) });
    }
  }
  // s28 tour 20 — pour les GROSSES pièces (PDF ≥ 20m²), exiger 60% de
  // coverage perpendiculaire pour qu'un mur compte comme bornage. Évite
  // que des murs courts (cloisons SDB, frames de portes) bloquent un grand
  // séjour de s'étendre jusqu'au vrai mur architectural lointain.
  function minOverlap(a: { xMin: number; yMin: number; xMax: number; yMax: number }, isHorizontal: boolean, isBig: boolean): number {
    const len = isHorizontal ? a.xMax - a.xMin : a.yMax - a.yMin;
    if (isBig) return Math.max(20, len * 0.6);
    return Math.min(20, len * 0.25);
  }
  function nearestWallN(a: typeof result[0]["bbox"], isBig = false): number {
    let best = lotBbox.yMin;
    const need = minOverlap(a, true, isBig);
    for (const w of hWalls) {
      if (w.pos >= a.yMin - 2) continue;
      const ovLo = Math.max(a.xMin, w.lo);
      const ovHi = Math.min(a.xMax, w.hi);
      const ov = Math.max(0, ovHi - ovLo);
      if (ov < need) continue;
      if (w.pos > best) best = w.pos;
    }
    return best;
  }
  function nearestWallS(a: typeof result[0]["bbox"], isBig = false): number {
    let best = lotBbox.yMax;
    const need = minOverlap(a, true, isBig);
    for (const w of hWalls) {
      if (w.pos <= a.yMax + 2) continue;
      const ovLo = Math.max(a.xMin, w.lo);
      const ovHi = Math.min(a.xMax, w.hi);
      const ov = Math.max(0, ovHi - ovLo);
      if (ov < need) continue;
      if (w.pos < best) best = w.pos;
    }
    return best;
  }
  function nearestWallW(a: typeof result[0]["bbox"], isBig = false): number {
    let best = lotBbox.xMin;
    const need = minOverlap(a, false, isBig);
    for (const w of vWalls) {
      if (w.pos >= a.xMin - 2) continue;
      const ovLo = Math.max(a.yMin, w.lo);
      const ovHi = Math.min(a.yMax, w.hi);
      const ov = Math.max(0, ovHi - ovLo);
      if (ov < need) continue;
      if (w.pos > best) best = w.pos;
    }
    return best;
  }
  function nearestWallE(a: typeof result[0]["bbox"], isBig = false): number {
    let best = lotBbox.xMax;
    const need = minOverlap(a, false, isBig);
    for (const w of vWalls) {
      if (w.pos <= a.xMax + 2) continue;
      const ovLo = Math.max(a.yMin, w.lo);
      const ovHi = Math.min(a.yMax, w.hi);
      const ov = Math.max(0, ovHi - ovLo);
      if (ov < need) continue;
      if (w.pos < best) best = w.pos;
    }
    return best;
  }
  function nearestNeighborN(i: number, a: typeof result[0]["bbox"]): number {
    let best = -Infinity;
    for (let j = 0; j < result.length; j++) {
      if (i === j) continue;
      const b = result[j].bbox;
      if (b.xMax > a.xMin && b.xMin < a.xMax) {
        if (b.yMax <= a.yMin && b.yMax > best) best = b.yMax;
      }
    }
    return best;
  }
  function nearestNeighborS(i: number, a: typeof result[0]["bbox"]): number {
    let best = Infinity;
    for (let j = 0; j < result.length; j++) {
      if (i === j) continue;
      const b = result[j].bbox;
      if (b.xMax > a.xMin && b.xMin < a.xMax) {
        if (b.yMin >= a.yMax && b.yMin < best) best = b.yMin;
      }
    }
    return best;
  }
  function nearestNeighborW(i: number, a: typeof result[0]["bbox"]): number {
    let best = -Infinity;
    for (let j = 0; j < result.length; j++) {
      if (i === j) continue;
      const b = result[j].bbox;
      if (b.yMax > a.yMin && b.yMin < a.yMax) {
        if (b.xMax <= a.xMin && b.xMax > best) best = b.xMax;
      }
    }
    return best;
  }
  function nearestNeighborE(i: number, a: typeof result[0]["bbox"]): number {
    let best = Infinity;
    for (let j = 0; j < result.length; j++) {
      if (i === j) continue;
      const b = result[j].bbox;
      if (b.yMax > a.yMin && b.yMin < a.yMax) {
        if (b.xMin >= a.xMax && b.xMin < best) best = b.xMin;
      }
    }
    return best;
  }

  // Pour chaque pièce sous-dimensionnée, on grossit dans les 2 directions
  // les plus libres (= les "côtés ouverts" sans voisin/mur architectural
  // proche). 4 passes pour permettre la propagation après que les premières
  // pièces se sont étendues (ouvre du slack pour les autres).
  //
  // s28 tour 20 — passé de 2 → 4 passes ET on étend désormais les 2 dirs les
  // plus libres au lieu d'une seule. Justification : R+1 Séjour était stuck à
  // ratio 0.84 alors que slackS et slackE étaient TOUS DEUX > 30px (slack
  // suffisant des 2 côtés). Avec 1 seule direction par passe + réduction de
  // slack à chaque expansion via le cap PDF (×1.3), on plafonnait avant
  // d'atteindre la cible. Étendre les 2 dirs distribue mieux.
  //
  // s28 tour 20.b — PRIORITÉ aux GROSSES pièces. Sans cela, Chambre/Entrée
  // grossissent en premier et volent l'espace au Séjour. Big-first = chaque
  // pass on traite les rooms par PDF surface DÉCROISSANTE.
  const indices = result.map((_, i) => i);
  indices.sort((a, b) => {
    const pa = result[a].pdfSurfaceM2 ?? 0;
    const pb = result[b].pdfSurfaceM2 ?? 0;
    return pb - pa; // décroissant
  });
  for (let pass = 0; pass < 4; pass++) {
    for (const i of indices) {
      const r = result[i];
      if (r.pdfSurfaceM2 == null || r.pdfSurfaceM2 <= 0) continue;
      const targetArea = r.pdfSurfaceM2 / scale;
      const currentArea = (r.bbox.xMax - r.bbox.xMin) * (r.bbox.yMax - r.bbox.yMin);
      if (currentArea >= targetArea * 0.97) continue; // assez grand (≥ 0.97 cible)
      const a = r.bbox;
      // s28 tour 20 — pour les BIG rooms (PDF ≥ 20m²), on relâche le filtre
      // de coverage perpendiculaire (60% au lieu de 25%) pour passer outre
      // les cloisons courtes qui bornent un grand séjour.
      const isBig = r.pdfSurfaceM2 >= 20;
      // Calcule la "marge" libre dans chaque direction = min(neighbor, wall) - bord
      const nN = nearestNeighborN(i, a);
      const nS = nearestNeighborS(i, a);
      const nW = nearestNeighborW(i, a);
      const nE = nearestNeighborE(i, a);
      const wN = nearestWallN(a, isBig);
      const wS = nearestWallS(a, isBig);
      const wW = nearestWallW(a, isBig);
      const wE = nearestWallE(a, isBig);
      // Marge dispo = (limite la plus proche entre voisin et mur) - bord courant
      const limN = Math.max(nN === -Infinity ? lotBbox.yMin : nN, wN);
      const limS = Math.min(nS === Infinity ? lotBbox.yMax : nS, wS);
      const limW = Math.max(nW === -Infinity ? lotBbox.xMin : nW, wW);
      const limE = Math.min(nE === Infinity ? lotBbox.xMax : nE, wE);
      const slackN = a.yMin - limN; // espace libre en haut
      const slackS = limS - a.yMax;
      const slackW = a.xMin - limW;
      const slackE = limE - a.xMax;
      // Choix de direction : on prend les 2 directions les plus libres.
      const slacks = [
        { dir: "N", slack: slackN, lim: limN },
        { dir: "S", slack: slackS, lim: limS },
        { dir: "W", slack: slackW, lim: limW },
        { dir: "E", slack: slackE, lim: limE },
      ].sort((a, b) => b.slack - a.slack);
      // Calcul de ce qu'il faut gagner pour atteindre 0.97 de target.
      const ratio = Math.sqrt((targetArea * 0.97) / currentArea);
      const widthA = a.xMax - a.xMin;
      const heightA = a.yMax - a.yMin;
      const targetW = widthA * ratio;
      const targetH = heightA * ratio;
      const deltaW = targetW - widthA;
      const deltaH = targetH - heightA;
      const margin = 2;
      // On étend les 2 directions les plus libres (top 2 en slack > 5px).
      const topDirs = slacks.filter((s) => s.slack > 5).slice(0, 2);
      for (const dir of topDirs) {
        if (dir.dir === "N") {
          a.yMin = Math.max(dir.lim + margin, a.yMin - Math.min(dir.slack - margin, deltaH));
        } else if (dir.dir === "S") {
          a.yMax = Math.min(dir.lim - margin, a.yMax + Math.min(dir.slack - margin, deltaH));
        } else if (dir.dir === "W") {
          a.xMin = Math.max(dir.lim + margin, a.xMin - Math.min(dir.slack - margin, deltaW));
        } else if (dir.dir === "E") {
          a.xMax = Math.min(dir.lim - margin, a.xMax + Math.min(dir.slack - margin, deltaW));
        }
      }
    }
  }
  for (const r of result) {
    r.polygon = buildRectangle(r.bbox.yMin, r.bbox.yMax, r.bbox.xMax, r.bbox.xMin);
    r.areaPx2 = polygonArea(r.polygon);
  }
  return result;
}

/**
 * s28 tour 22 — EXTEND BORDERS TO BUILDING EXTERIOR WALLS.
 *
 * Problème observé tour 21 : les rectangles ont la bonne SURFACE (audit Inv A
 * 4/4 PASS) mais ne s'étendent pas jusqu'aux vrais murs extérieurs du bâtiment.
 * Cause : le raycast s'arrête sur des cotes/meubles internes (segments 30-80px
 * survivants au filtre) au lieu des murs extérieurs (≥120px) du bâtiment.
 *
 * Conséquence visuelle : bandes vides INTÉRIEURES au bâtiment (zone habitable
 * non couverte) entre les rectangles et les vrais murs extérieurs.
 *
 * Algo :
 *   1. Identifier les "murs extérieurs du bâtiment" = murs LONGS (≥120px)
 *      qui sont à l'intérieur du LOT (pas sur le bord à <8px).
 *      Ces murs forment l'enveloppe du bâtiment habitable.
 *   2. Pour chaque rectangle ET chaque direction (N/S/E/W) :
 *      a. Vérifier qu'il n'y a PAS de voisin direct dans cette direction.
 *      b. Chercher le mur extérieur du bâtiment le plus proche dans la
 *         direction (avec overlap perpendiculaire ≥ 25%).
 *      c. Si trouvé à <maxExtendPx (par défaut 200px) → étendre jusqu'au mur.
 *   3. Ne JAMAIS rétrécir un rectangle (extension uniquement).
 *
 * Cette passe corrige les bandes vides sans toucher aux pièces déjà bien
 * placées. Le cap par PDF surface (1.3×) n'est PAS appliqué ici car ces
 * extensions visent à remplir l'enveloppe réelle du bâtiment, pas à
 * augmenter artificiellement les surfaces calculées (qui restent calibrées).
 */
function extendToBuildingExteriorWalls(
  rooms: RectangleRoom[],
  walls: Wall[],
  lotPolygon: Pt[],
  lotBbox: { xMin: number; yMin: number; xMax: number; yMax: number },
  angleTolDeg: number,
  options: { minWallLen?: number; maxExtendPx?: number; lotEdgeTolPx?: number } = {},
): RectangleRoom[] {
  const minWallLen = options.minWallLen ?? 120;
  const maxExtendPx = options.maxExtendPx ?? 200;
  const lotEdgeTolPx = options.lotEdgeTolPx ?? 8;
  if (rooms.length === 0) return rooms;
  // ─── PRECOMP : scale (m² par px²) pour CAP les extensions ─────────
  // Cible : aucun rectangle ne dépasse 1.15× sa pdfSurfaceM2 après extension
  // (limite haute Inv A audit). Pour les pièces SANS PDF (ECS placard), on
  // limite à 1/3 de la médiane PDF (= 3-5m² typique).
  const scaleCands = rooms
    .filter((r) => r.pdfSurfaceM2 != null && r.pdfSurfaceM2 > 0 && r.areaPx2 > 0)
    .map((r) => r.pdfSurfaceM2! / r.areaPx2)
    .sort((a, b) => a - b);
  const scale = scaleCands.length >= 2
    ? scaleCands[Math.floor(scaleCands.length / 2)]
    : null;
  const pdfList = rooms
    .map((r) => r.pdfSurfaceM2)
    .filter((s): s is number => s != null && s > 0)
    .sort((a, b) => a - b);
  const medianPdfM2 = pdfList.length > 0
    ? pdfList[Math.floor(pdfList.length / 2)]
    : 0;
  // Plafond surface px² par pièce (pour cap les extensions)
  function maxAreaPx2(idx: number): number | null {
    if (scale === null || scale <= 0) return null;
    const pdf = rooms[idx].pdfSurfaceM2;
    if (pdf != null && pdf > 0) {
      // Ratio audit max = 1.15 → on prend 1.14 pour rester inside PASS
      return (pdf * 1.14) / scale;
    }
    if (medianPdfM2 > 0) {
      return (medianPdfM2 / 3) / scale;
    }
    return null;
  }
  // ─── Étape 1 : identifier murs extérieurs du bâtiment ─────────────
  // Murs LONGS internes au lot (pas sur le bord du lot).
  type WI = { pos: number; lo: number; hi: number };
  const hWallsExt: WI[] = []; // y, [xLo, xHi]
  const vWallsExt: WI[] = [];
  for (const w of walls) {
    const cls = classifyWall(w, angleTolDeg);
    const wlen = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
    if (wlen < minWallLen) continue;
    if (cls === "H") {
      const wy = wallY(w);
      // Exclure murs collés au bord du lot (segments du contour)
      if (Math.abs(wy - lotBbox.yMin) <= lotEdgeTolPx) continue;
      if (Math.abs(wy - lotBbox.yMax) <= lotEdgeTolPx) continue;
      hWallsExt.push({
        pos: wy,
        lo: Math.min(w.x1, w.x2),
        hi: Math.max(w.x1, w.x2),
      });
    } else if (cls === "V") {
      const wx = wallX(w);
      if (Math.abs(wx - lotBbox.xMin) <= lotEdgeTolPx) continue;
      if (Math.abs(wx - lotBbox.xMax) <= lotEdgeTolPx) continue;
      vWallsExt.push({
        pos: wx,
        lo: Math.min(w.y1, w.y2),
        hi: Math.max(w.y1, w.y2),
      });
    }
  }
  // Le contour du lot DOIT aussi être candidat (mur du bâtiment = bord du lot)
  void lotPolygon;
  hWallsExt.push({ pos: lotBbox.yMin, lo: lotBbox.xMin, hi: lotBbox.xMax });
  hWallsExt.push({ pos: lotBbox.yMax, lo: lotBbox.xMin, hi: lotBbox.xMax });
  vWallsExt.push({ pos: lotBbox.xMin, lo: lotBbox.yMin, hi: lotBbox.yMax });
  vWallsExt.push({ pos: lotBbox.xMax, lo: lotBbox.yMin, hi: lotBbox.yMax });

  const result = rooms.map((r) => ({
    ...r,
    bbox: { ...r.bbox },
    polygon: r.polygon.map((v) => ({ ...v })),
  }));

  // ─── Étape 2 : pour chaque rectangle, étendre vers murs extérieurs ─
  // Helper : un voisin existe-t-il dans la direction `dir` du rectangle a ?
  function hasNeighborInDir(
    a: typeof result[0]["bbox"],
    selfIdx: number,
    dir: "N" | "S" | "E" | "W",
    maxDistPx: number,
  ): boolean {
    for (let j = 0; j < result.length; j++) {
      if (j === selfIdx) continue;
      const b = result[j].bbox;
      // Overlap perpendiculaire significatif (≥30% du bord)
      if (dir === "N" || dir === "S") {
        const ovLo = Math.max(a.xMin, b.xMin);
        const ovHi = Math.min(a.xMax, b.xMax);
        const ov = Math.max(0, ovHi - ovLo);
        const minOv = (a.xMax - a.xMin) * 0.3;
        if (ov < minOv) continue;
        if (dir === "N") {
          // voisin est au-dessus (b.yMax <= a.yMin) ET à <= maxDistPx
          if (b.yMax <= a.yMin + 2 && a.yMin - b.yMax <= maxDistPx) return true;
        } else {
          if (b.yMin >= a.yMax - 2 && b.yMin - a.yMax <= maxDistPx) return true;
        }
      } else {
        const ovLo = Math.max(a.yMin, b.yMin);
        const ovHi = Math.min(a.yMax, b.yMax);
        const ov = Math.max(0, ovHi - ovLo);
        const minOv = (a.yMax - a.yMin) * 0.3;
        if (ov < minOv) continue;
        if (dir === "W") {
          if (b.xMax <= a.xMin + 2 && a.xMin - b.xMax <= maxDistPx) return true;
        } else {
          if (b.xMin >= a.xMax - 2 && b.xMin - a.xMax <= maxDistPx) return true;
        }
      }
    }
    return false;
  }
  // Helper : trouver mur extérieur le plus proche dans la direction
  function nearestExteriorWall(
    a: typeof result[0]["bbox"],
    dir: "N" | "S" | "E" | "W",
  ): number | null {
    const minOvFrac = 0.25;
    if (dir === "N" || dir === "S") {
      const reqLo = a.xMin, reqHi = a.xMax;
      const minOv = Math.min(20, (reqHi - reqLo) * minOvFrac);
      let best: number | null = null;
      let bestDist = Infinity;
      for (const w of hWallsExt) {
        if (dir === "N") {
          if (w.pos >= a.yMin - 2) continue;
        } else {
          if (w.pos <= a.yMax + 2) continue;
        }
        const ovLo = Math.max(reqLo, w.lo);
        const ovHi = Math.min(reqHi, w.hi);
        const ov = Math.max(0, ovHi - ovLo);
        if (ov < minOv) continue;
        const d = dir === "N" ? a.yMin - w.pos : w.pos - a.yMax;
        if (d > maxExtendPx) continue;
        if (d < bestDist) { bestDist = d; best = w.pos; }
      }
      return best;
    } else {
      const reqLo = a.yMin, reqHi = a.yMax;
      const minOv = Math.min(20, (reqHi - reqLo) * minOvFrac);
      let best: number | null = null;
      let bestDist = Infinity;
      for (const w of vWallsExt) {
        if (dir === "W") {
          if (w.pos >= a.xMin - 2) continue;
        } else {
          if (w.pos <= a.xMax + 2) continue;
        }
        const ovLo = Math.max(reqLo, w.lo);
        const ovHi = Math.min(reqHi, w.hi);
        const ov = Math.max(0, ovHi - ovLo);
        if (ov < minOv) continue;
        const d = dir === "W" ? a.xMin - w.pos : w.pos - a.xMax;
        if (d > maxExtendPx) continue;
        if (d < bestDist) { bestDist = d; best = w.pos; }
      }
      return best;
    }
  }
  const NEIGHBOR_MAX_GAP_PX = 60;
  let totalExtended = 0;
  for (let i = 0; i < result.length; i++) {
    const a = result[i].bbox;
    const cap = maxAreaPx2(i);
    for (const dir of ["N", "S", "E", "W"] as const) {
      if (hasNeighborInDir(a, i, dir, NEIGHBOR_MAX_GAP_PX)) continue;
      const wallPos = nearestExteriorWall(a, dir);
      if (wallPos === null) continue;
      // Étendre le bord vers ce mur (avec marge 1px) — MAIS respecter cap PDF
      let proposedYMin = a.yMin;
      let proposedYMax = a.yMax;
      let proposedXMin = a.xMin;
      let proposedXMax = a.xMax;
      if (dir === "N" && wallPos < a.yMin) {
        proposedYMin = wallPos + 1;
      } else if (dir === "S" && wallPos > a.yMax) {
        proposedYMax = wallPos - 1;
      } else if (dir === "W" && wallPos < a.xMin) {
        proposedXMin = wallPos + 1;
      } else if (dir === "E" && wallPos > a.xMax) {
        proposedXMax = wallPos - 1;
      } else {
        continue;
      }
      const proposedArea = (proposedXMax - proposedXMin) * (proposedYMax - proposedYMin);
      if (cap !== null && proposedArea > cap) {
        // Limiter l'extension pour ne pas dépasser le cap
        // On garde la même surface max → on réduit la course dans cette dir
        const otherArea = (a.xMax - a.xMin) * (a.yMax - a.yMin);
        if (otherArea >= cap) continue; // déjà au cap, skip
        const slack = cap - otherArea;
        if (dir === "N") {
          const maxDeltaY = slack / (a.xMax - a.xMin);
          proposedYMin = a.yMin - maxDeltaY;
          // ne pas aller au-delà du mur extérieur
          proposedYMin = Math.max(proposedYMin, wallPos + 1);
        } else if (dir === "S") {
          const maxDeltaY = slack / (a.xMax - a.xMin);
          proposedYMax = a.yMax + maxDeltaY;
          proposedYMax = Math.min(proposedYMax, wallPos - 1);
        } else if (dir === "W") {
          const maxDeltaX = slack / (a.yMax - a.yMin);
          proposedXMin = a.xMin - maxDeltaX;
          proposedXMin = Math.max(proposedXMin, wallPos + 1);
        } else if (dir === "E") {
          const maxDeltaX = slack / (a.yMax - a.yMin);
          proposedXMax = a.xMax + maxDeltaX;
          proposedXMax = Math.min(proposedXMax, wallPos - 1);
        }
      }
      // Écrire seulement si différence significative (>2px)
      if (Math.abs(proposedYMin - a.yMin) > 1 || Math.abs(proposedYMax - a.yMax) > 1
          || Math.abs(proposedXMin - a.xMin) > 1 || Math.abs(proposedXMax - a.xMax) > 1) {
        a.yMin = proposedYMin;
        a.yMax = proposedYMax;
        a.xMin = proposedXMin;
        a.xMax = proposedXMax;
        totalExtended++;
      }
    }
  }
  for (const r of result) {
    r.polygon = buildRectangle(r.bbox.yMin, r.bbox.yMax, r.bbox.xMax, r.bbox.xMin);
    r.areaPx2 = polygonArea(r.polygon);
  }
  if (totalExtended > 0) {
    console.log(
      `[extendToBuildingExteriorWalls] ${totalExtended} bord(s) étendu(s) vers murs extérieurs`,
    );
  }
  return result;
}

/**
 * s28 tour 23 — TRANSLATION (pas resize) des rectangles vers les murs
 * extérieurs du bâtiment quand un bord libre est proche d'un mur.
 *
 * Diagnostic tour 22 : `extendToBuildingExteriorWalls` est bloqué par le
 * cap PDF surface (Inv A 0.85-1.15). Sur SdB RDC :
 *   - rect post-shrink : yMin=1216, yMax=1578 (bonne surface PDF)
 *   - mur extérieur N à y=1090 (gap 126px)
 *   - cap PDF n'autorise extension que de +108px → reste 18px de gap visible
 *
 * Solution : TRANSLATER le rectangle (déplacement, pas redimensionnement).
 * La surface est PRÉSERVÉE (PDF audit reste PASS), et le rect touche bien
 * le mur extérieur quand il a un bord libre à <200px.
 *
 * Direction translation choisie quand :
 *   - bord N libre (pas de voisin <100px) ET mur extérieur N à <200px → translate UP
 *   - idem S/E/W
 *   - jamais de translation si elle rapproche le rect d'un voisin (collision)
 *   - jamais de translation qui sort le rect du lot
 *
 * Spécifique RDC SdB : le label est en milieu vertical (40%), mais la pièce
 * RÉELLE doit toucher le haut du bâtiment (label peut être interne au rect).
 */
function translateToTouchExteriorWalls(
  rooms: RectangleRoom[],
  walls: Wall[],
  lotPolygon: Pt[],
  lotBbox: { xMin: number; yMin: number; xMax: number; yMax: number },
  angleTolDeg: number,
  options: { minWallLen?: number; maxTranslatePx?: number; lotEdgeTolPx?: number; neighborGapPx?: number } = {},
): RectangleRoom[] {
  const minWallLen = options.minWallLen ?? 120;
  const maxTranslatePx = options.maxTranslatePx ?? 200;
  const lotEdgeTolPx = options.lotEdgeTolPx ?? 8;
  const neighborGapPx = options.neighborGapPx ?? 100;
  if (rooms.length === 0) return rooms;
  // s28 tour 24 — translate vers murs EXTÉRIEURS DU BÂTIMENT UNIQUEMENT.
  // Tour 23 acceptait tous les murs ≥ minWallLen. Bug : R+1 Séjour était
  // translaté de 136px vers le S vers un mur INTERNE long (entre Séjour et
  // Entrée), créant un gap de 136px en haut. Solution : ne considérer
  // QUE les bords du lotPolygon (= mur extérieur du bâtiment, polygone-vrai).
  void walls;
  type WI = { pos: number; lo: number; hi: number };
  const hWallsExt: WI[] = [];
  const vWallsExt: WI[] = [];
  // Bords du lot (murs extérieurs du bâtiment) — utilise lotBbox car le
  // lotPolygon pour les plans Muguets est rectangulaire.
  void lotPolygon;
  hWallsExt.push({ pos: lotBbox.yMin, lo: lotBbox.xMin, hi: lotBbox.xMax });
  hWallsExt.push({ pos: lotBbox.yMax, lo: lotBbox.xMin, hi: lotBbox.xMax });
  vWallsExt.push({ pos: lotBbox.xMin, lo: lotBbox.yMin, hi: lotBbox.yMax });
  vWallsExt.push({ pos: lotBbox.xMax, lo: lotBbox.yMin, hi: lotBbox.yMax });

  // Garder ces variables pour éviter unused-warnings du compilateur.
  void minWallLen;
  void lotEdgeTolPx;

  const result = rooms.map((r) => ({
    ...r,
    bbox: { ...r.bbox },
    polygon: r.polygon.map((v) => ({ ...v })),
  }));

  // Helper : un voisin existe-t-il dans la direction `dir` du rect ? (= bord NON libre)
  function hasNeighbor(
    a: typeof result[0]["bbox"],
    selfIdx: number,
    dir: "N" | "S" | "E" | "W",
    maxGap: number,
  ): boolean {
    for (let j = 0; j < result.length; j++) {
      if (j === selfIdx) continue;
      const b = result[j].bbox;
      if (dir === "N" || dir === "S") {
        const ovLo = Math.max(a.xMin, b.xMin);
        const ovHi = Math.min(a.xMax, b.xMax);
        const ov = Math.max(0, ovHi - ovLo);
        const minOv = (a.xMax - a.xMin) * 0.3;
        if (ov < minOv) continue;
        if (dir === "N") {
          if (b.yMax <= a.yMin + 2 && a.yMin - b.yMax <= maxGap) return true;
        } else {
          if (b.yMin >= a.yMax - 2 && b.yMin - a.yMax <= maxGap) return true;
        }
      } else {
        const ovLo = Math.max(a.yMin, b.yMin);
        const ovHi = Math.min(a.yMax, b.yMax);
        const ov = Math.max(0, ovHi - ovLo);
        const minOv = (a.yMax - a.yMin) * 0.3;
        if (ov < minOv) continue;
        if (dir === "W") {
          if (b.xMax <= a.xMin + 2 && a.xMin - b.xMax <= maxGap) return true;
        } else {
          if (b.xMin >= a.xMax - 2 && b.xMin - a.xMax <= maxGap) return true;
        }
      }
    }
    return false;
  }

  // Helper : trouver mur extérieur le plus proche dans la dir, avec OVERLAP ≥ 30%
  // (un peu plus strict que extendToBuildingExteriorWalls qui fait 25%, car
  // on TRANSLATE — gros impact visuel — mais on doit accepter SdB RDC dont
  // le mur N couvre 164/362 = 45% du bord)
  function nearestExteriorWallStrict(
    a: typeof result[0]["bbox"],
    dir: "N" | "S" | "E" | "W",
  ): number | null {
    const minOvFrac = 0.3;
    if (dir === "N" || dir === "S") {
      const reqLo = a.xMin, reqHi = a.xMax;
      const minOv = (reqHi - reqLo) * minOvFrac;
      let best: number | null = null;
      let bestDist = Infinity;
      for (const w of hWallsExt) {
        if (dir === "N") {
          if (w.pos >= a.yMin - 2) continue;
        } else {
          if (w.pos <= a.yMax + 2) continue;
        }
        const ovLo = Math.max(reqLo, w.lo);
        const ovHi = Math.min(reqHi, w.hi);
        const ov = Math.max(0, ovHi - ovLo);
        if (ov < minOv) continue;
        const d = dir === "N" ? a.yMin - w.pos : w.pos - a.yMax;
        if (d > maxTranslatePx) continue;
        if (d < bestDist) { bestDist = d; best = w.pos; }
      }
      return best;
    } else {
      const reqLo = a.yMin, reqHi = a.yMax;
      const minOv = (reqHi - reqLo) * minOvFrac;
      let best: number | null = null;
      let bestDist = Infinity;
      for (const w of vWallsExt) {
        if (dir === "W") {
          if (w.pos >= a.xMin - 2) continue;
        } else {
          if (w.pos <= a.xMax + 2) continue;
        }
        const ovLo = Math.max(reqLo, w.lo);
        const ovHi = Math.min(reqHi, w.hi);
        const ov = Math.max(0, ovHi - ovLo);
        if (ov < minOv) continue;
        const d = dir === "W" ? a.xMin - w.pos : w.pos - a.xMax;
        if (d > maxTranslatePx) continue;
        if (d < bestDist) { bestDist = d; best = w.pos; }
      }
      return best;
    }
  }

  // Helper : la translation déplace-t-elle le rect VERS un voisin (collision) ?
  function wouldCollide(
    a: typeof result[0]["bbox"],
    selfIdx: number,
    dir: "N" | "S" | "E" | "W",
    deltaPx: number,
  ): boolean {
    // proposed bbox après translation
    const prop = { ...a };
    if (dir === "N") { prop.yMin -= deltaPx; prop.yMax -= deltaPx; }
    else if (dir === "S") { prop.yMin += deltaPx; prop.yMax += deltaPx; }
    else if (dir === "W") { prop.xMin -= deltaPx; prop.xMax -= deltaPx; }
    else { prop.xMin += deltaPx; prop.xMax += deltaPx; }
    for (let j = 0; j < result.length; j++) {
      if (j === selfIdx) continue;
      const b = result[j].bbox;
      const overlap = !(prop.xMax <= b.xMin + 1 || prop.xMin >= b.xMax - 1
        || prop.yMax <= b.yMin + 1 || prop.yMin >= b.yMax - 1);
      if (overlap) return true;
    }
    return false;
  }

  // s28 tour 25b — sauvegarde des aires originales pour garde anti-shrink.
  const originalAreas = result.map((r) => (r.bbox.xMax - r.bbox.xMin) * (r.bbox.yMax - r.bbox.yMin));

  let totalTranslated = 0;
  // s28 tour 24 — translate UNE seule fois par axe (pas N+S simultanément qui s'auto-annulent).
  // Tour 23 itérait sur 4 directions et appliquait chaque translate compatible. Bug RDC :
  // Séjour N APPLIED delta=83 puis S APPLIED delta=106 → net -23px (déplacé S de 23, perd 83 du N).
  // Solution : pour chaque axe (Y / X), choisir la direction avec le mur le plus PROCHE,
  // appliquer UNE translation, skip l'autre direction sur cet axe.
  for (let i = 0; i < result.length; i++) {
    const a = result[i].bbox;
    // Précompute candidates par direction
    type DirInfo = { dir: "N" | "S" | "E" | "W"; delta: number; reason: string };
    const dirs: DirInfo[] = [];
    for (const dir of ["N", "S", "E", "W"] as const) {
      if (hasNeighbor(a, i, dir, neighborGapPx)) {
        dirs.push({ dir, delta: 0, reason: "skip:hasNeighbor" });
        continue;
      }
      const wallPos = nearestExteriorWallStrict(a, dir);
      if (wallPos === null) {
        dirs.push({ dir, delta: 0, reason: "skip:noWall" });
        continue;
      }
      let delta = 0;
      if (dir === "N") delta = a.yMin - (wallPos + 1);
      else if (dir === "S") delta = (wallPos - 1) - a.yMax;
      else if (dir === "W") delta = a.xMin - (wallPos + 1);
      else if (dir === "E") delta = (wallPos - 1) - a.xMax;
      if (delta < 3) {
        dirs.push({ dir, delta: 0, reason: `skip:smallDelta=${delta.toFixed(0)}` });
        continue;
      }
      if (wouldCollide(a, i, dir, delta)) {
        dirs.push({ dir, delta: 0, reason: `skip:collision delta=${delta.toFixed(0)}` });
        continue;
      }
      dirs.push({ dir, delta, reason: "candidate" });
    }
    // Pour Y et X : sélectionner UN candidat (delta > 0), prefer le plus petit delta
    // (mur le plus proche) qui correspond à un bord vraiment libre.
    function pickAxis(d1: "N" | "S" | "E" | "W", d2: "N" | "S" | "E" | "W"): DirInfo | null {
      const c1 = dirs.find((d) => d.dir === d1);
      const c2 = dirs.find((d) => d.dir === d2);
      const cand1 = c1 && c1.delta > 0 ? c1 : null;
      const cand2 = c2 && c2.delta > 0 ? c2 : null;
      if (cand1 && cand2) {
        // Choisir la direction avec le delta le plus PETIT (mur le plus proche).
        return cand1.delta <= cand2.delta ? cand1 : cand2;
      }
      return cand1 ?? cand2 ?? null;
    }
    const yPick = pickAxis("N", "S");
    const xPick = pickAxis("W", "E");
    for (const pick of [yPick, xPick]) {
      if (!pick) continue;
      const { dir, delta } = pick;
      if (dir === "N") { a.yMin -= delta; a.yMax -= delta; }
      else if (dir === "S") { a.yMin += delta; a.yMax += delta; }
      else if (dir === "W") { a.xMin -= delta; a.xMax -= delta; }
      else if (dir === "E") { a.xMin += delta; a.xMax += delta; }
      totalTranslated++;
    }
  }
  // s28 tour 25b — GARDE ANTI-SHRINK : si la translate a réduit la surface
  // (ex: bord du lot a clip une partie), revert au polygone original.
  // Translate est censé être surface-preserving, mais en cas de bord du lot
  // ou de borne neighbor, on perd parfois des pixels.
  for (let i = 0; i < result.length; i++) {
    const newArea = (result[i].bbox.xMax - result[i].bbox.xMin) * (result[i].bbox.yMax - result[i].bbox.yMin);
    if (newArea < originalAreas[i] * 0.95) {
      // Revert : remplacer par bbox/polygon initiaux.
      result[i].bbox = { ...rooms[i].bbox };
      result[i].polygon = rooms[i].polygon.map((v) => ({ ...v }));
      console.log(
        `[translateToTouchExteriorWalls] REVERT ${result[i].label} : new area ${newArea.toFixed(0)} < 95% original ${originalAreas[i].toFixed(0)}`,
      );
    }
  }
  for (const r of result) {
    r.polygon = buildRectangle(r.bbox.yMin, r.bbox.yMax, r.bbox.xMax, r.bbox.xMin);
    r.areaPx2 = polygonArea(r.polygon);
  }
  if (totalTranslated > 0) {
    console.log(
      `[translateToTouchExteriorWalls] ${totalTranslated} rectangle(s) translaté(s) vers murs extérieurs`,
    );
  }
  return result;
}

/**
 * s28 tour 20 — SNAP des 4 bords du rectangle aux murs architecturaux.
 *
 * Pour chaque bord (N/S/E/O), on cherche dans une fenêtre de ±tolPx un mur
 * orthogonal correctement orienté. Si trouvé, on aligne le bord à sa position.
 * Améliore Inv C (snap murs) en réduisant les bords "flottants" (≠ wall position).
 *
 * Précautions :
 *   - On ne snap PAS si plusieurs murs candidats sont à des positions très
 *     différentes (ambiguïté → on laisse).
 *   - On ne snap PAS si le snap rendrait le rectangle de surface négative.
 */
function snapBordersToWalls(
  rooms: RectangleRoom[],
  walls: Wall[],
  angleTolDeg: number,
  tolPx: number,
): RectangleRoom[] {
  // Index walls H/V
  type WI = { pos: number; lo: number; hi: number };
  const hWalls: WI[] = [];
  const vWalls: WI[] = [];
  for (const w of walls) {
    const cls = classifyWall(w, angleTolDeg);
    if (cls === "H") {
      hWalls.push({ pos: wallY(w), lo: Math.min(w.x1, w.x2), hi: Math.max(w.x1, w.x2) });
    } else if (cls === "V") {
      vWalls.push({ pos: wallX(w), lo: Math.min(w.y1, w.y2), hi: Math.max(w.y1, w.y2) });
    }
  }
  // Pour chaque bord, trouver le mur le plus proche dans la fenêtre tolPx
  // qui couvre suffisamment (≥ 30%) la longueur du bord.
  function snapBorder(
    target: number,
    perpLo: number,
    perpHi: number,
    candidates: WI[],
  ): number {
    const reqLen = perpHi - perpLo;
    let best: number | null = null;
    let bestDist = Infinity;
    for (const w of candidates) {
      const d = Math.abs(w.pos - target);
      if (d > tolPx) continue;
      const ovLo = Math.max(perpLo, w.lo);
      const ovHi = Math.min(perpHi, w.hi);
      const ov = Math.max(0, ovHi - ovLo);
      if (ov < reqLen * 0.3) continue;
      if (d < bestDist) {
        bestDist = d;
        best = w.pos;
      }
    }
    return best !== null ? best : target;
  }
  return rooms.map((r) => {
    const a = r.bbox;
    const newYMin = snapBorder(a.yMin, a.xMin, a.xMax, hWalls);
    const newYMax = snapBorder(a.yMax, a.xMin, a.xMax, hWalls);
    const newXMin = snapBorder(a.xMin, a.yMin, a.yMax, vWalls);
    const newXMax = snapBorder(a.xMax, a.yMin, a.yMax, vWalls);
    // Vérifier que le rectangle reste valide
    if (newXMin >= newXMax || newYMin >= newYMax) return r;
    const newBbox = { xMin: newXMin, yMin: newYMin, xMax: newXMax, yMax: newYMax };
    const newPoly = buildRectangle(newBbox.yMin, newBbox.yMax, newBbox.xMax, newBbox.xMin);
    return {
      ...r,
      polygon: newPoly,
      areaPx2: polygonArea(newPoly),
      bbox: newBbox,
    };
  });
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

    let rect = buildRectangle(yNorth, ySouth, xEast, xWest);
    let bbox = { xMin: xWest, yMin: yNorth, xMax: xEast, yMax: ySouth };

    // s28 tour 19 — VALIDATION SEED INSIDE.
    // Le seed (label IA) DOIT être strictement à l'intérieur du rectangle
    // produit. Si non, c'est que le raycast a trouvé un mur "à travers" le
    // seed (= mauvais mur). Dans ce cas, on bornait sur ce mauvais mur, ce
    // qui crée un rectangle qui n'englobe PAS le label.
    // Fallback : rectangle centré sur le seed avec dimensions médianes
    // (moins agressif).
    const seedInside =
      seed.x > bbox.xMin + 1 &&
      seed.x < bbox.xMax - 1 &&
      seed.y > bbox.yMin + 1 &&
      seed.y < bbox.yMax - 1;
    if (!seedInside) {
      // Fallback : on étend le rectangle pour englober le seed
      bbox = {
        xMin: Math.min(bbox.xMin, seed.x - 30),
        yMin: Math.min(bbox.yMin, seed.y - 30),
        xMax: Math.max(bbox.xMax, seed.x + 30),
        yMax: Math.max(bbox.yMax, seed.y + 30),
      };
      rect = buildRectangle(bbox.yMin, bbox.yMax, bbox.xMax, bbox.xMin);
    }

    return {
      label: label.text,
      polygon: rect,
      areaPx2: polygonArea(rect),
      pdfSurfaceM2: label.surface_m2,
      bbox,
    };
  });

  // Étape 1.5 : expand-to-fit. Chaque rectangle s'étend dans chaque direction
  // jusqu'à toucher un autre rectangle voisin, le bord du lot, OU un mur
  // architectural perpendiculaire (s28 tour 19).
  // C'est la passe critique : sans elle, les rectangles restent "petits" et
  // ne couvrent pas tout l'espace habitable. AVEC les murs en borne, on
  // évite l'expansion sauvage dans des zones vides (ex Palier R+3 → 32 m²).
  // s28 tour 19.b — passe seeds pour shrink AUTOUR DU LABEL si cap PDF déclenché.
  const expanded = expandToFit(rooms, lotBbox, walls, opts.angleTolDeg, null, seeds);

  // Étape 2 : résolution des chevauchements (au cas où expand a généré des conflits)
  let resolved = resolveOverlaps(expanded);

  // Étape 2.5 : conformité PDF (passes d'ajustement aux surfaces architecte).
  // On calcule un scale médian (px²/m²) à partir des pièces dont l'aire est
  // proche de la valeur PDF, puis on RÉDUIT les rectangles trop grands.
  // s28 tour 21 : shrink ANISOTROPE — privilégie les bords "free" (touchant
  // le lot bbox sans voisin) plutôt qu'un shrink isotrope vers le seed. Évite
  // que les rectangles débordent dans la terrasse alors qu'ils devraient
  // s'arrêter au mur extérieur du bâtiment.
  // labelBboxes : si label.labelBbox dispo (extraction vectorielle PDF), il
  // contraint le rectangle final (DOIT inscrire la bbox label).
  const labelBboxes = labels.map((l) => l.labelBbox ?? null);
  resolved = enforcePdfSurfaces(resolved, seeds, lotBbox, labelBboxes);

  // Étape 2.55 — s28 tour 20.c : SHRINK les placards techniques sans surface
  // PDF (ECS, TGBT) qui bornent une grosse pièce sous-dimensionnée.
  //
  // Cas Muguets R+1 : ECS placard 1m² sans surface PDF est COLLÉ au sud du
  // Séjour. Sans cette passe, growUnderSized ne peut pas pousser Séjour vers
  // le sud (slack=0 contre ECS). En shrinkant ECS de 50% (vers son seed), on
  // libère ~1m² pour Séjour qui passe de 33.6 → 34.4 (= ratio 0.85).
  //
  // Sans risque : ECS sans PDF n'a aucune contrainte de surface architecte.
  resolved = (() => {
    const shrunk = resolved.map((r) => ({
      ...r,
      bbox: { ...r.bbox },
      polygon: r.polygon.map((v) => ({ ...v })),
    }));
    const techNoPdf = shrunk
      .map((r, i) => ({ r, i }))
      .filter(
        ({ r }) =>
          (r.pdfSurfaceM2 == null || r.pdfSurfaceM2 <= 0) &&
          /^(ecs|tgbt|gaine|vide-ordures?|placard)$/i.test(
            r.label.normalize("NFD").replace(/[̀-ͯ]/g, "").trim(),
          ),
      );
    for (const { r: tech, i: techIdx } of techNoPdf) {
      // Cherche un voisin sous-dimensionné (ratio < 0.90) PDF connue
      // dont l'expansion serait débloquée si on shrink ce tech.
      for (let j = 0; j < shrunk.length; j++) {
        if (j === techIdx) continue;
        const big = shrunk[j];
        if (big.pdfSurfaceM2 == null || big.pdfSurfaceM2 <= 0) continue;
        if (big.pdfSurfaceM2 < 10) continue; // on ne shrink que pour les GROSSES pièces (≥10m²)
        const tb = tech.bbox;
        const bb = big.bbox;
        // Adjacent ? (tolérance 100px ≈ 5% lot pour absorber les gaps après
        // expand-to-fit + enforcePdfSurfaces qui peuvent introduire un offset
        // notable, et permettre la libération d'espace pour pousser le big
        // jusqu'au tech).
        const adjN = Math.abs(tb.yMax - bb.yMin) < 100 && tb.xMax > bb.xMin && tb.xMin < bb.xMax;
        const adjS = Math.abs(tb.yMin - bb.yMax) < 100 && tb.xMax > bb.xMin && tb.xMin < bb.xMax;
        const adjW = Math.abs(tb.xMax - bb.xMin) < 100 && tb.yMax > bb.yMin && tb.yMin < bb.yMax;
        const adjE = Math.abs(tb.xMin - bb.xMax) < 100 && tb.yMax > bb.yMin && tb.yMin < bb.yMax;
        if (!adjN && !adjS && !adjW && !adjE) continue;
        // Shrink le tech de 50% dans la direction opposée à big.
        const tw = tb.xMax - tb.xMin;
        const th = tb.yMax - tb.yMin;
        const shrinkFactor = 0.5;
        if (adjN) {
          // tech au-dessus de big → shrink tech vers le haut (ymax recule)
          tb.yMax = tb.yMin + th * shrinkFactor;
        } else if (adjS) {
          // tech au-dessous de big → shrink tech vers le bas (ymin avance)
          tb.yMin = tb.yMax - th * shrinkFactor;
        } else if (adjW) {
          // tech à gauche de big → shrink tech vers la gauche
          tb.xMax = tb.xMin + tw * shrinkFactor;
        } else if (adjE) {
          // tech à droite de big → shrink tech vers la droite
          tb.xMin = tb.xMax - tw * shrinkFactor;
        }
        tech.polygon = buildRectangle(tb.yMin, tb.yMax, tb.xMax, tb.xMin);
        tech.areaPx2 = polygonArea(tech.polygon);
        break; // un shrink suffit par tech room
      }
    }
    return shrunk;
  })();

  // Étape 2.6 — s28 tour 19.c : grossir les pièces sous-dimensionnées
  // (ratio < 0.85). On grossit dans la direction opposée à la médiatrice avec
  // les voisins, jusqu'à atteindre le bord du lot ou un voisin proche.
  // Évite Séjour stuck à 30 m² alors que PDF = 40.
  resolved = growUnderSized(resolved, lotBbox, walls, opts.angleTolDeg);

  // Étape 2.65 — s28 tour 22 : EXTEND BORDERS TO BUILDING EXTERIOR WALLS.
  // Les rectangles ont la bonne SURFACE (Inv A 4/4 PASS) mais ne s'étendent
  // pas jusqu'aux vrais murs extérieurs du bâtiment → bandes vides intérieures
  // visibles sur RDC (haut entre SdB/Chambre + droite Séjour). Cette passe
  // étend chaque bord libre vers le mur extérieur du bâtiment le plus proche
  // (≥120px, à <200px) sans contracter aucun rectangle.
  resolved = extendToBuildingExteriorWalls(
    resolved,
    walls,
    lotPolygon,
    lotBbox,
    opts.angleTolDeg,
    { minWallLen: 120, maxExtendPx: 200, lotEdgeTolPx: 8 },
  );

  // Étape 2.66 — s28 tour 23 : TRANSLATE rectangles vers murs extérieurs.
  // Le cap PDF (Inv A 1.15) bloque les extensions importantes dans
  // extendToBuildingExteriorWalls. Quand un bord est libre (pas de voisin)
  // ET qu'un mur extérieur du bâtiment est à <200px, on TRANSLATE le rect
  // (déplacement, surface préservée) pour éliminer les bandes vides.
  // Cas critique RDC SdB : label PDF en milieu (40%), mais SdB doit toucher
  // le mur N du bâtiment. La translation préserve PDF surface tout en
  // éliminant le gap de 140px visible tour 22.
  //
  // FIX RDC ECS : les pièces techniques sans PDF (ECS, TGBT, placard) sont
  // filtrées en aval (route extract Step 9, seuil 1.5m² unlabeled). Elles
  // bloquent à tort hasNeighbor() dans translate. Solution : utiliser une
  // VUE FILTRÉE (sans tech-noPdf) UNIQUEMENT pour la détection de voisins
  // pendant translate. Les tech-noPdf survivent dans `resolved` (decision
  // de filtre prise plus tard par la route).
  {
    const techPattern = /^(ecs|tgbt|gaine|vide-ordures?|placard)$/i;
    const isTechNoPdf = (r: RectangleRoom) =>
      (r.pdfSurfaceM2 == null || r.pdfSurfaceM2 <= 0) &&
      techPattern.test(r.label.normalize("NFD").replace(/[̀-ͯ]/g, "").trim());
    const visibleRooms = resolved.filter((r) => !isTechNoPdf(r));
    const techRooms = resolved.filter(isTechNoPdf);
    const translated = translateToTouchExteriorWalls(
      visibleRooms,
      walls,
      lotPolygon,
      lotBbox,
      opts.angleTolDeg,
      { minWallLen: 120, maxTranslatePx: 200, lotEdgeTolPx: 8, neighborGapPx: 100 },
    );
    resolved = [...translated, ...techRooms];
  }

  // Étape 2.67 — s28 tour 25 : normalize aspect ratio tech rooms (ECS, TGBT…).
  //
  // Bug visuel R+1 : ECS finit en bande horizontale 27% × 1.35% (aspect 20:1).
  // Cause : Étape 2.55 shrink ECS de 50% côté adj. au voisin pour libérer
  // Séjour. Si la bbox initiale était déjà fine sur cet axe, ECS devient une
  // ligne plate visuellement aberrante.
  //
  // Solution surface-preserving : si aspect ratio > 4, transformer en carré
  // CENTRÉ SUR LE CENTROÏDE COURANT, surface inchangée (= sqrt(area)).
  // Crucial : bornage par les voisins pour ne PAS créer de chevauchement.
  // Si l'expansion vers carré entrerait en collision, on prend le plus grand
  // carré qui ne créé pas d'overlap (max-square-bounded).
  resolved = (() => {
    const ASPECT_THRESHOLD = 4.0;
    const techPattern = /^(ecs|tgbt|gaine|vide-ordures?|placard)$/i;
    const norm = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
    const isTechNoPdf = (r: RectangleRoom) =>
      (r.pdfSurfaceM2 == null || r.pdfSurfaceM2 <= 0) &&
      techPattern.test(norm(r.label));

    const next = resolved.map((r) => ({
      ...r,
      bbox: { ...r.bbox },
      polygon: r.polygon.map((v) => ({ ...v })),
    }));

    for (let i = 0; i < next.length; i++) {
      const r = next[i];
      if (!isTechNoPdf(r)) continue;
      const w = r.bbox.xMax - r.bbox.xMin;
      const h = r.bbox.yMax - r.bbox.yMin;
      if (w <= 0 || h <= 0) continue;
      const aspect = Math.max(w, h) / Math.max(1, Math.min(w, h));
      if (aspect <= ASPECT_THRESHOLD) continue;

      // Carré-cible centré, surface préservée.
      const area = w * h;
      const side = Math.sqrt(area);
      const cx = (r.bbox.xMin + r.bbox.xMax) / 2;
      const cy = (r.bbox.yMin + r.bbox.yMax) / 2;
      let xMin = cx - side / 2;
      let xMax = cx + side / 2;
      let yMin = cy - side / 2;
      let yMax = cy + side / 2;

      // Borner aux voisins (no overlap) ET au lotBbox.
      // Pour chaque voisin qui couperait le carré, ramener le bord du carré
      // au bord du voisin en gardant la même surface (rectangle, pas carré).
      // Approche simple : pour chaque direction, si le voisin tape, on
      // contracte ce côté ; le côté opposé se développe pour compenser.
      const others = next.filter((_, j) => j !== i);
      function clampDirection(dir: "N" | "S" | "W" | "E") {
        for (const o of others) {
          const ob = o.bbox;
          const horizontalOverlap =
            Math.min(xMax, ob.xMax) - Math.max(xMin, ob.xMin);
          const verticalOverlap =
            Math.min(yMax, ob.yMax) - Math.max(yMin, ob.yMin);
          if (dir === "N" || dir === "S") {
            if (horizontalOverlap <= 1) continue;
            if (dir === "N") {
              if (ob.yMax > yMin && ob.yMax <= cy) {
                yMin = Math.max(yMin, ob.yMax + 1);
              }
            } else {
              if (ob.yMin < yMax && ob.yMin >= cy) {
                yMax = Math.min(yMax, ob.yMin - 1);
              }
            }
          } else {
            if (verticalOverlap <= 1) continue;
            if (dir === "W") {
              if (ob.xMax > xMin && ob.xMax <= cx) {
                xMin = Math.max(xMin, ob.xMax + 1);
              }
            } else {
              if (ob.xMin < xMax && ob.xMin >= cx) {
                xMax = Math.min(xMax, ob.xMin - 1);
              }
            }
          }
        }
      }
      clampDirection("N");
      clampDirection("S");
      clampDirection("W");
      clampDirection("E");

      // Borne au lot bbox
      xMin = Math.max(xMin, lotBbox.xMin + 1);
      xMax = Math.min(xMax, lotBbox.xMax - 1);
      yMin = Math.max(yMin, lotBbox.yMin + 1);
      yMax = Math.min(yMax, lotBbox.yMax - 1);

      const newW = xMax - xMin;
      const newH = yMax - yMin;
      // Sécurité : si le clamp a tout cassé, on garde l'ancienne bbox.
      if (newW < 5 || newH < 5) continue;
      // Aspect après clamp : si toujours > threshold, on accepte ; au moins
      // c'est un compromis (la bande s'épaissit même sans devenir carré).
      const newAspect = Math.max(newW, newH) / Math.max(1, Math.min(newW, newH));
      if (newAspect >= aspect) continue;

      r.bbox = { xMin, xMax, yMin, yMax };
      r.polygon = buildRectangle(yMin, yMax, xMax, xMin);
      r.areaPx2 = polygonArea(r.polygon);
      console.log(
        `[normalizeTechAspect] ${r.label} : ${aspect.toFixed(1)} → ${newAspect.toFixed(1)}`,
      );
    }
    return next;
  })();

  // Étape 2.68 — s28 tour 25b : FINAL RE-GROW PIÈCES SOUS-DIMENSIONNÉES.
  //
  // Bug Chambre RDC tour 24 : passe de 12 → 10 m² (régression). Pipeline tour 24
  // restreint translateToTouchExteriorWalls aux bords du LOT — la Chambre n'est
  // plus translatée vers le N (mur architectural interne), reste à sa position
  // initiale. growUnderSized (passe précédente) a déjà tourné mais cap à 0.97×
  // target ET tour 24 ECS shrink avait débloqué Séjour, pas Chambre.
  //
  // Solution : passe FINALE qui ré-étend les pièces principales (PDF >= 10 m²)
  // si ratio < 0.92 vers les bords libres (pas de voisin direct). Cap à 1.05 ×
  // PDF pour ne pas dépasser cap surface global. Surface preservée si pas
  // d'espace libre. C'est une passe "best-effort" non destructive.
  resolved = (() => {
    const next = resolved.map((r) => ({
      ...r,
      bbox: { ...r.bbox },
      polygon: r.polygon.map((v) => ({ ...v })),
    }));
    // Recalculer scale médian local (cohérent avec les autres passes)
    const cands = next
      .filter((r) => r.pdfSurfaceM2 != null && r.pdfSurfaceM2 > 0 && r.areaPx2 > 0)
      .map((r) => r.pdfSurfaceM2! / r.areaPx2)
      .sort((a, b) => a - b);
    if (cands.length < 2) return next;
    const scale = cands[Math.floor(cands.length / 2)];

    // Pour chaque pièce principale (PDF ≥ 10 m²) sous-dimensionnée
    for (let i = 0; i < next.length; i++) {
      const r = next[i];
      if (r.pdfSurfaceM2 == null || r.pdfSurfaceM2 < 10) continue;
      const currentM2 = r.areaPx2 * scale;
      const ratio = currentM2 / r.pdfSurfaceM2;
      if (ratio >= 0.92) continue; // déjà OK
      const targetArea = (r.pdfSurfaceM2 * 1.0) / scale;
      const a = r.bbox;

      // Marge libre dans chaque direction = distance jusqu'au voisin OU lot bbox
      function gapInDir(dir: "N" | "S" | "W" | "E"): number {
        let limit: number;
        if (dir === "N") limit = lotBbox.yMin;
        else if (dir === "S") limit = lotBbox.yMax;
        else if (dir === "W") limit = lotBbox.xMin;
        else limit = lotBbox.xMax;

        for (let j = 0; j < next.length; j++) {
          if (j === i) continue;
          const b = next[j].bbox;
          const overlapX = Math.min(a.xMax, b.xMax) - Math.max(a.xMin, b.xMin);
          const overlapY = Math.min(a.yMax, b.yMax) - Math.max(a.yMin, b.yMin);
          if (dir === "N" || dir === "S") {
            if (overlapX <= 1) continue;
            if (dir === "N" && b.yMax <= a.yMin && b.yMax > limit) limit = b.yMax;
            if (dir === "S" && b.yMin >= a.yMax && b.yMin < limit) limit = b.yMin;
          } else {
            if (overlapY <= 1) continue;
            if (dir === "W" && b.xMax <= a.xMin && b.xMax > limit) limit = b.xMax;
            if (dir === "E" && b.xMin >= a.xMax && b.xMin < limit) limit = b.xMin;
          }
        }
        if (dir === "N") return Math.max(0, a.yMin - limit - 2);
        if (dir === "S") return Math.max(0, limit - a.yMax - 2);
        if (dir === "W") return Math.max(0, a.xMin - limit - 2);
        return Math.max(0, limit - a.xMax - 2);
      }

      const gN = gapInDir("N");
      const gS = gapInDir("S");
      const gW = gapInDir("W");
      const gE = gapInDir("E");

      // Étendre proportionnellement aux gaps disponibles, jusqu'à atteindre
      // targetArea (ratio 1.0). Cap : ne pas dépasser ratio 1.05 PDF.
      const maxArea = (r.pdfSurfaceM2 * 1.05) / scale;
      const wA = a.xMax - a.xMin;
      const hA = a.yMax - a.yMin;

      // Étendre N+S si gap dispo
      if (gN > 5 || gS > 5) {
        const targetH = Math.min(targetArea / wA, hA + gN + gS);
        const totalGrow = Math.max(0, targetH - hA);
        const totalAvail = gN + gS;
        if (totalAvail > 0) {
          const growN = (gN / totalAvail) * totalGrow;
          const growS = (gS / totalAvail) * totalGrow;
          a.yMin -= Math.min(gN, growN);
          a.yMax += Math.min(gS, growS);
        }
      }

      // Recalc current area, étendre W+E si encore sous-dimensionné
      const newH = a.yMax - a.yMin;
      const currentAreaAfter = wA * newH;
      if (currentAreaAfter < targetArea && (gW > 5 || gE > 5)) {
        const targetW = Math.min(targetArea / newH, wA + gW + gE);
        const totalGrowW = Math.max(0, targetW - wA);
        const totalAvailW = gW + gE;
        if (totalAvailW > 0) {
          const growW = (gW / totalAvailW) * totalGrowW;
          const growE = (gE / totalAvailW) * totalGrowW;
          a.xMin -= Math.min(gW, growW);
          a.xMax += Math.min(gE, growE);
        }
      }

      // Cap final 1.05 PDF : si on a dépassé, shrink équitablement
      const finalArea = (a.xMax - a.xMin) * (a.yMax - a.yMin);
      if (finalArea > maxArea) {
        const shrinkF = Math.sqrt(maxArea / finalArea);
        const cx = (a.xMin + a.xMax) / 2;
        const cy = (a.yMin + a.yMax) / 2;
        const halfW = ((a.xMax - a.xMin) / 2) * shrinkF;
        const halfH = ((a.yMax - a.yMin) / 2) * shrinkF;
        a.xMin = cx - halfW;
        a.xMax = cx + halfW;
        a.yMin = cy - halfH;
        a.yMax = cy + halfH;
      }

      r.polygon = buildRectangle(a.yMin, a.yMax, a.xMax, a.xMin);
      r.areaPx2 = polygonArea(r.polygon);
      const newRatio = (r.areaPx2 * scale) / r.pdfSurfaceM2;
      if (Math.abs(newRatio - ratio) > 0.02) {
        console.log(
          `[finalReGrow] ${r.label} ratio ${ratio.toFixed(2)} → ${newRatio.toFixed(2)} (PDF ${r.pdfSurfaceM2}m²)`,
        );
      }
    }
    return next;
  })();

  // Étape 2.69 — s28 tour 26 : ASPECT-RATIO CAP pour pièces principales.
  //
  // Bug R+1 Entrée tour 25b : bbox finit à 50.69% × 11.65% lot-local (aspect
  // 4.35:1). Visuellement = bande horizontale traversant tout le bas du lot
  // alors que l'Entrée 7.3 m² est un petit espace carré au centre-bas.
  //
  // Cause : raycast trouve mur sud à yMax (mur extérieur) et raycast E s'étend
  // jusqu'au mur SDB, mais sans voisin à hauteur Entrée (y=93%), x_max grossit
  // jusqu'à 50%. growUnderSized + extendBuildingWalls ne contraint que les
  // grosses pièces (>=10 m²), pas les pièces moyennes (5-10 m²).
  //
  // Solution : pour toute pièce avec PDF surface ET aspect ratio > 3:1, on
  // contracte le grand côté à surface préservée vers le centroïde du label.
  // Préserve la surface (= pdfSurfaceM2/scale) et garde le label inscrit.
  //
  // Cap permissif : aspect 3:1 → on shrink à 2.5:1 (compromis entre pièces
  // rectangulaires légitimes types 2:1 et bandes aberrantes 4:1+).
  resolved = (() => {
    const ASPECT_THRESHOLD = 3.0;
    const TARGET_ASPECT = 2.0;
    // Recalc scale médian
    const cands = resolved
      .filter((r) => r.pdfSurfaceM2 != null && r.pdfSurfaceM2 > 0 && r.areaPx2 > 0)
      .map((r) => r.pdfSurfaceM2! / r.areaPx2)
      .sort((a, b) => a - b);
    if (cands.length < 2) return resolved;
    const scale = cands[Math.floor(cands.length / 2)];

    return resolved.map((r, idx) => {
      // Skip pièces sans PDF (techniques)
      if (r.pdfSurfaceM2 == null || r.pdfSurfaceM2 <= 0) return r;
      // Skip très petites pièces (PDF < 2m²) — leur bbox naturellement carrée
      if (r.pdfSurfaceM2 < 2) return r;
      const a = r.bbox;
      const w = a.xMax - a.xMin;
      const h = a.yMax - a.yMin;
      if (w <= 0 || h <= 0) return r;
      const aspect = Math.max(w, h) / Math.max(1, Math.min(w, h));
      if (aspect <= ASPECT_THRESHOLD) return r;

      // Cible : aspect TARGET_ASPECT, surface préservée à pdfSurface (cap 1.10).
      // targetArea = currentArea (surface preserved) — on ne change que la forme.
      const targetArea = (r.pdfSurfaceM2 / scale) * 1.0;
      // Pour aspect TARGET_ASPECT et area targetArea :
      //   targetW × targetH = targetArea
      //   max/min = TARGET_ASPECT
      // Si w > h (horizontal), targetW = sqrt(targetArea × TARGET_ASPECT),
      //                         targetH = sqrt(targetArea / TARGET_ASPECT)
      const isHorizontal = w > h;
      const newW = isHorizontal
        ? Math.sqrt(targetArea * TARGET_ASPECT)
        : Math.sqrt(targetArea / TARGET_ASPECT);
      const newH = isHorizontal
        ? Math.sqrt(targetArea / TARGET_ASPECT)
        : Math.sqrt(targetArea * TARGET_ASPECT);

      // Centre nouveau rect = centroïde label si dispo, sinon centre actuel
      const labelBbox = labels[idx]?.labelBbox ?? null;
      const cx = labelBbox
        ? (labelBbox.xMin + labelBbox.xMax) / 2
        : (a.xMin + a.xMax) / 2;
      const cy = labelBbox
        ? (labelBbox.yMin + labelBbox.yMax) / 2
        : (a.yMin + a.yMax) / 2;
      let nXMin = cx - newW / 2;
      let nXMax = cx + newW / 2;
      let nYMin = cy - newH / 2;
      let nYMax = cy + newH / 2;

      // Contrainte 1 : label inscrit (marge 5px)
      if (labelBbox) {
        if (nXMin > labelBbox.xMin - 5) nXMin = labelBbox.xMin - 5;
        if (nXMax < labelBbox.xMax + 5) nXMax = labelBbox.xMax + 5;
        if (nYMin > labelBbox.yMin - 5) nYMin = labelBbox.yMin - 5;
        if (nYMax < labelBbox.yMax + 5) nYMax = labelBbox.yMax + 5;
      }

      // Contrainte 2 : reste dans le bounding du rect actuel (= ne déborde pas
      // vers une zone qui n'était pas couverte). Évite que le shrink horizontal
      // crée une expansion verticale dépassant les voisins.
      nXMin = Math.max(nXMin, a.xMin);
      nXMax = Math.min(nXMax, a.xMax);
      nYMin = Math.max(nYMin, a.yMin);
      nYMax = Math.min(nYMax, a.yMax);

      // Contrainte 3 : reste dans le lot bbox
      nXMin = Math.max(nXMin, lotBbox.xMin + 1);
      nXMax = Math.min(nXMax, lotBbox.xMax - 1);
      nYMin = Math.max(nYMin, lotBbox.yMin + 1);
      nYMax = Math.min(nYMax, lotBbox.yMax - 1);

      // Sécurité : si dimensions négatives ou trop petites, garder l'ancienne bbox
      if (nXMax - nXMin < 5 || nYMax - nYMin < 5) return r;
      // Aspect après contraintes : si on n'a pas amélioré, on garde l'ancien
      const newAspect = Math.max(nXMax - nXMin, nYMax - nYMin) /
        Math.max(1, Math.min(nXMax - nXMin, nYMax - nYMin));
      if (newAspect >= aspect) return r;

      const newBbox = { xMin: nXMin, yMin: nYMin, xMax: nXMax, yMax: nYMax };
      const newPoly = buildRectangle(newBbox.yMin, newBbox.yMax, newBbox.xMax, newBbox.xMin);
      console.log(
        `[aspectCap] ${r.label} aspect ${aspect.toFixed(1)}:1 → ${newAspect.toFixed(1)}:1 (PDF ${r.pdfSurfaceM2}m²)`,
      );
      return {
        ...r,
        polygon: newPoly,
        areaPx2: polygonArea(newPoly),
        bbox: newBbox,
      };
    });
  })();

  // Étape 2.7 — s28 tour 21 : CLIP-TO-WALL-OR-LABEL — DISABLED.
  //
  // Tested but disabled : trop agressif sur les pièces non-carrées (ex: Séjour
  // cuisine R+2 ratio 1.00 → 0.75). La cap basée sur sqrt(PDF_surface) capse
  // toutes les directions de manière isotrope, ce qui broke les rectangles très
  // large (séjour > 40 m² peut avoir width:height = 2:1).
  //
  // Code conservé pour itération future. Ne PAS retirer — sert de base pour
  // tour 22 (cap par direction avec aspect ratio adaptatif via voisins).
  if (false as boolean) {
    const TOL_LOT = 4;
    const STRONG_WALL_LEN = 80;
    const STRONG_OVERLAP = 0.4; // bord doit être couvert ≥40% par mur fort
    // s28 tour 21 — EXCLURE les bords du lot du test "strong wall" :
    // le lotPolygonAsWalls est ajouté au pool walls, ce qui rend les bords
    // du lot eligible. Mais ces bords ne sont PAS des murs architecturaux
    // (ils englobent les terrasses sur Muguets RDC). Si on les acceptait, le
    // test "strong wall at lot edge" passerait toujours et aucun clip ne se
    // ferait. On filtre donc tout segment dont la position correspond
    // exactement à lotBbox.{xMin,xMax,yMin,yMax} (±3px).
    const LOT_EDGE_TOL = 3;
    type StrongW = { pos: number; lo: number; hi: number };
    const sH: StrongW[] = [];
    const sV: StrongW[] = [];
    for (const w of walls) {
      const cls = classifyWall(w, opts.angleTolDeg);
      const wlen = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
      if (wlen < STRONG_WALL_LEN) continue;
      if (cls === "H") {
        const wy = wallY(w);
        // Ignore bords lot N/S
        if (Math.abs(wy - lotBbox.yMin) <= LOT_EDGE_TOL) continue;
        if (Math.abs(wy - lotBbox.yMax) <= LOT_EDGE_TOL) continue;
        sH.push({ pos: wy, lo: Math.min(w.x1, w.x2), hi: Math.max(w.x1, w.x2) });
      } else if (cls === "V") {
        const wx = wallX(w);
        if (Math.abs(wx - lotBbox.xMin) <= LOT_EDGE_TOL) continue;
        if (Math.abs(wx - lotBbox.xMax) <= LOT_EDGE_TOL) continue;
        sV.push({ pos: wx, lo: Math.min(w.y1, w.y2), hi: Math.max(w.y1, w.y2) });
      }
    }
    function hasStrongWallAt(pos: number, lo: number, hi: number, isH: boolean): boolean {
      const list = isH ? sH : sV;
      const need = (hi - lo) * STRONG_OVERLAP;
      for (const w of list) {
        if (Math.abs(w.pos - pos) > 6) continue;
        const ovLo = Math.max(lo, w.lo);
        const ovHi = Math.min(hi, w.hi);
        if (ovHi - ovLo >= need) return true;
      }
      return false;
    }
    const PDF_TO_PX_HEURISTIC = (() => {
      // scale médian px/m (linéaire) calibré sur pièces avec PDF
      const cands = resolved
        .filter(r => r.pdfSurfaceM2 != null && r.pdfSurfaceM2 > 0 && r.areaPx2 > 0)
        .map(r => Math.sqrt(r.areaPx2 / r.pdfSurfaceM2!));
      if (cands.length < 2) return null;
      cands.sort((a, b) => a - b);
      return cands[Math.floor(cands.length / 2)];
    })();

    resolved = resolved.map((r, idx) => {
      const labelBbox = labels[idx]?.labelBbox ?? null;
      if (!labelBbox || PDF_TO_PX_HEURISTIC === null) return r;
      if (r.pdfSurfaceM2 == null || r.pdfSurfaceM2 <= 0) return r;
      const a = { ...r.bbox };
      // s28 tour 21 — Marge AUTOUR DU CENTROÏDE label = demi-côté du carré
      // équivalent à PDF_surface (en px). On cap chaque bord à
      // `label.cx ± demiCarre × 1.1` (tolérance 10% pour rectangles non-carrés).
      // Cela garantit que le rectangle reste de taille proportionnelle à sa
      // surface PDF, même si lot polygon englobe terrasse externe.
      const demiCarre = Math.sqrt(r.pdfSurfaceM2) * PDF_TO_PX_HEURISTIC * 0.5;
      const tolerance = 1.1; // permet aspect ratio jusqu'à 1.21:1
      const labelCx = (labelBbox.xMin + labelBbox.xMax) / 2;
      const labelCy = (labelBbox.yMin + labelBbox.yMax) / 2;
      const maxRadius = demiCarre * tolerance;
      let modified = false;
      // Bord N : si touche lot ET pas de mur strong à yMin → cap à
      // label.cy - maxRadius (= top du carré équivalent)
      if (Math.abs(a.yMin - lotBbox.yMin) <= TOL_LOT) {
        if (!hasStrongWallAt(a.yMin, a.xMin, a.xMax, true)) {
          const cap = labelCy - maxRadius;
          // borne au moins à labelBbox.yMin - 5 (ne pas tronquer le label)
          const safeCap = Math.min(cap, labelBbox.yMin - 5);
          const newYMin = Math.max(a.yMin, safeCap);
          if (newYMin > a.yMin + 2) { a.yMin = newYMin; modified = true; }
        }
      }
      // Bord S
      if (Math.abs(a.yMax - lotBbox.yMax) <= TOL_LOT) {
        if (!hasStrongWallAt(a.yMax, a.xMin, a.xMax, true)) {
          const cap = labelCy + maxRadius;
          const safeCap = Math.max(cap, labelBbox.yMax + 5);
          const newYMax = Math.min(a.yMax, safeCap);
          if (newYMax < a.yMax - 2) { a.yMax = newYMax; modified = true; }
        }
      }
      // Bord W
      if (Math.abs(a.xMin - lotBbox.xMin) <= TOL_LOT) {
        if (!hasStrongWallAt(a.xMin, a.yMin, a.yMax, false)) {
          const cap = labelCx - maxRadius;
          const safeCap = Math.min(cap, labelBbox.xMin - 5);
          const newXMin = Math.max(a.xMin, safeCap);
          if (newXMin > a.xMin + 2) { a.xMin = newXMin; modified = true; }
        }
      }
      // Bord E
      if (Math.abs(a.xMax - lotBbox.xMax) <= TOL_LOT) {
        if (!hasStrongWallAt(a.xMax, a.yMin, a.yMax, false)) {
          const cap = labelCx + maxRadius;
          const safeCap = Math.max(cap, labelBbox.xMax + 5);
          const newXMax = Math.min(a.xMax, safeCap);
          if (newXMax < a.xMax - 2) { a.xMax = newXMax; modified = true; }
        }
      }
      if (!modified) return r;
      const newPoly = buildRectangle(a.yMin, a.yMax, a.xMax, a.xMin);
      return { ...r, polygon: newPoly, areaPx2: polygonArea(newPoly), bbox: a };
    });
  }

  // Note : snapBordersToWalls testé et REJETÉ — le snap mid-pipeline ré-ouvrait
  // des chevauchements (les bords mitoyens claquaient sur 2 murs voisins
  // différents) et déplaçait le bord opposé hors zone, faisant régresser
  // l'audit (16/20 → 13/20). Inv C reste FAIL acceptable : les rectangles
  // sont au bon endroit visuellement mais les vertices tombent au "centre"
  // d'un mur épais (≥4px de raster) plutôt que sur la ligne idéale.

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

  // Étape 7 — s28 tour 20 : filtre métier ECS/TGBT halluciné dans la cage
  // d'escalier (placard technique sous escalier sur RDC Muguets).
  //
  // Règle métier (calibrée Muguets — adapter en V2 multi-projets) :
  //   Reject UNIQUEMENT si :
  //     - label dans TECHNICAL_LABELS (ECS, TGBT, gaine, vide-ordures)
  //     - PDF n'a PAS de surface explicite pour ce label (= placeholder)
  //     - rectangle est dans le COIN du lot (xmin% < 25 AND ymin% < 25)
  //       = position cage d'escalier sur Muguets RDC.
  //
  // Cas attendus :
  //   - RDC ECS : (5%, 5%) coin top-left, no PDF surface → REJECT ✓
  //   - R+1 ECS : (34%, 51%) middle, no PDF surface → KEEP (≠ coin)
  //   - R+3 ECS : (57%, 0%) top mais x≥25% → KEEP (≠ top-left strict)
  //
  // Cible Inv E :
  //   RDC 6 → 5  (-1 ECS hallucination)
  //   R+1 8 → 8  (ECS R+1 garde car pas dans le coin)
  //   R+2 6 → 6  (pas d'ECS)
  //   R+3 5 → 5  (ECS R+3 garde car pas top-left strict)
  const TECHNICAL_LABELS = new Set(["ecs", "tgbt", "vide-ordures", "vide-ordure", "gaine"]);
  const norm = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const lotW = lotBbox.xMax - lotBbox.xMin;
  const lotH = lotBbox.yMax - lotBbox.yMin;
  const filteredFinal = finalRooms.filter((r) => {
    const label = norm(r.label);
    if (!TECHNICAL_LABELS.has(label)) return true;
    // ECS / TGBT avec surface PDF explicite = pièce légitime annotée.
    if (r.pdfSurfaceM2 != null && r.pdfSurfaceM2 > 0) return true;
    // Sans surface PDF : reject SEULEMENT si dans le coin top-left du lot.
    const xRel = (r.bbox.xMin - lotBbox.xMin) / Math.max(lotW, 1);
    const yRel = (r.bbox.yMin - lotBbox.yMin) / Math.max(lotH, 1);
    const inTopLeftCorner = xRel < 0.25 && yRel < 0.25;
    if (inTopLeftCorner) return false;
    return true;
  });

  return filteredFinal;
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
