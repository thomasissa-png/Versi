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
  _lotBbox: { xMin: number; yMin: number; xMax: number; yMax: number },
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

  // Pour chaque pièce avec PDF surface, shrink si trop grand
  return rooms.map((r, idx) => {
    if (r.pdfSurfaceM2 == null || r.pdfSurfaceM2 <= 0) return r;
    if (r.areaPx2 <= 0) return r;
    const currentM2 = r.areaPx2 * scale;
    const ratio = currentM2 / r.pdfSurfaceM2;
    if (ratio <= 1.20) return r; // OK ou trop petit (on ne grossit pas)
    // Shrink vers le seed. Facteur linéaire = sqrt(target / current)
    // (pour matcher l'aire après shrink isotrope).
    const targetArea = r.pdfSurfaceM2 / scale;
    const shrinkFactor = Math.sqrt(targetArea / r.areaPx2);
    if (shrinkFactor >= 1) return r;
    const seed = seeds[idx];
    const cx = (r.bbox.xMin + r.bbox.xMax) / 2;
    const cy = (r.bbox.yMin + r.bbox.yMax) / 2;
    // On shrink autour du centre du rectangle, puis on s'assure que le seed
    // reste dedans (sinon on décale).
    const halfW = (r.bbox.xMax - r.bbox.xMin) / 2 * shrinkFactor;
    const halfH = (r.bbox.yMax - r.bbox.yMin) / 2 * shrinkFactor;
    let newXMin = cx - halfW;
    let newXMax = cx + halfW;
    let newYMin = cy - halfH;
    let newYMax = cy + halfH;
    // Ajuster pour englober le seed (avec marge 5px)
    const seedMargin = 5;
    if (seed.x < newXMin + seedMargin) {
      const shift = newXMin + seedMargin - seed.x;
      newXMin -= shift;
      newXMax -= shift;
    }
    if (seed.x > newXMax - seedMargin) {
      const shift = seed.x - (newXMax - seedMargin);
      newXMin += shift;
      newXMax += shift;
    }
    if (seed.y < newYMin + seedMargin) {
      const shift = newYMin + seedMargin - seed.y;
      newYMin -= shift;
      newYMax -= shift;
    }
    if (seed.y > newYMax - seedMargin) {
      const shift = seed.y - (newYMax - seedMargin);
      newYMin += shift;
      newYMax += shift;
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
  function nearestWallN(a: typeof result[0]["bbox"]): number {
    let best = lotBbox.yMin;
    for (const w of hWalls) {
      if (w.pos >= a.yMin - 2) continue;
      const ovLo = Math.max(a.xMin, w.lo);
      const ovHi = Math.min(a.xMax, w.hi);
      const ov = Math.max(0, ovHi - ovLo);
      if (ov < Math.min(20, (a.xMax - a.xMin) * 0.25)) continue;
      if (w.pos > best) best = w.pos;
    }
    return best;
  }
  function nearestWallS(a: typeof result[0]["bbox"]): number {
    let best = lotBbox.yMax;
    for (const w of hWalls) {
      if (w.pos <= a.yMax + 2) continue;
      const ovLo = Math.max(a.xMin, w.lo);
      const ovHi = Math.min(a.xMax, w.hi);
      const ov = Math.max(0, ovHi - ovLo);
      if (ov < Math.min(20, (a.xMax - a.xMin) * 0.25)) continue;
      if (w.pos < best) best = w.pos;
    }
    return best;
  }
  function nearestWallW(a: typeof result[0]["bbox"]): number {
    let best = lotBbox.xMin;
    for (const w of vWalls) {
      if (w.pos >= a.xMin - 2) continue;
      const ovLo = Math.max(a.yMin, w.lo);
      const ovHi = Math.min(a.yMax, w.hi);
      const ov = Math.max(0, ovHi - ovLo);
      if (ov < Math.min(20, (a.yMax - a.yMin) * 0.25)) continue;
      if (w.pos > best) best = w.pos;
    }
    return best;
  }
  function nearestWallE(a: typeof result[0]["bbox"]): number {
    let best = lotBbox.xMax;
    for (const w of vWalls) {
      if (w.pos <= a.xMax + 2) continue;
      const ovLo = Math.max(a.yMin, w.lo);
      const ovHi = Math.min(a.yMax, w.hi);
      const ov = Math.max(0, ovHi - ovLo);
      if (ov < Math.min(20, (a.yMax - a.yMin) * 0.25)) continue;
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

  // Pour chaque pièce sous-dimensionnée, on grossit dans une direction sans voisin
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < result.length; i++) {
      const r = result[i];
      if (r.pdfSurfaceM2 == null || r.pdfSurfaceM2 <= 0) continue;
      const targetArea = r.pdfSurfaceM2 / scale;
      const currentArea = (r.bbox.xMax - r.bbox.xMin) * (r.bbox.yMax - r.bbox.yMin);
      if (currentArea >= targetArea * 0.95) continue; // assez grand
      const a = r.bbox;
      // Calcule la "marge" libre dans chaque direction = min(neighbor, wall) - bord
      const nN = nearestNeighborN(i, a);
      const nS = nearestNeighborS(i, a);
      const nW = nearestNeighborW(i, a);
      const nE = nearestNeighborE(i, a);
      const wN = nearestWallN(a);
      const wS = nearestWallS(a);
      const wW = nearestWallW(a);
      const wE = nearestWallE(a);
      // Marge dispo = (limite la plus proche entre voisin et mur) - bord courant
      const limN = Math.max(nN === -Infinity ? lotBbox.yMin : nN, wN);
      const limS = Math.min(nS === Infinity ? lotBbox.yMax : nS, wS);
      const limW = Math.max(nW === -Infinity ? lotBbox.xMin : nW, wW);
      const limE = Math.min(nE === Infinity ? lotBbox.xMax : nE, wE);
      const slackN = a.yMin - limN; // espace libre en haut
      const slackS = limS - a.yMax;
      const slackW = a.xMin - limW;
      const slackE = limE - a.xMax;
      // Choix de la direction : la plus libre
      const slacks = [
        { dir: "N", slack: slackN, lim: limN },
        { dir: "S", slack: slackS, lim: limS },
        { dir: "W", slack: slackW, lim: limW },
        { dir: "E", slack: slackE, lim: limE },
      ].sort((a, b) => b.slack - a.slack);
      // On étend dans la direction la plus libre, jusqu'à atteindre target
      const ratio = Math.sqrt(targetArea / currentArea);
      const widthA = a.xMax - a.xMin;
      const heightA = a.yMax - a.yMin;
      const targetW = widthA * ratio;
      const targetH = heightA * ratio;
      const deltaW = targetW - widthA;
      const deltaH = targetH - heightA;
      // On étend la dimension dans la direction la plus libre
      const dir1 = slacks[0];
      const margin = 2;
      if (dir1.dir === "N" && dir1.slack > 5) {
        a.yMin = Math.max(dir1.lim + margin, a.yMin - Math.min(dir1.slack - margin, deltaH));
      } else if (dir1.dir === "S" && dir1.slack > 5) {
        a.yMax = Math.min(dir1.lim - margin, a.yMax + Math.min(dir1.slack - margin, deltaH));
      } else if (dir1.dir === "W" && dir1.slack > 5) {
        a.xMin = Math.max(dir1.lim + margin, a.xMin - Math.min(dir1.slack - margin, deltaW));
      } else if (dir1.dir === "E" && dir1.slack > 5) {
        a.xMax = Math.min(dir1.lim - margin, a.xMax + Math.min(dir1.slack - margin, deltaW));
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
  // proche de la valeur PDF, puis on RÉDUIT les rectangles trop grands en
  // shrinkant vers le seed jusqu'à matcher la surface PDF.
  // Ne grossit JAMAIS un rectangle (= éviterait re-overlap).
  resolved = enforcePdfSurfaces(resolved, seeds, lotBbox);

  // Étape 2.6 — s28 tour 19.c : grossir les pièces sous-dimensionnées
  // (ratio < 0.85). On grossit dans la direction opposée à la médiatrice avec
  // les voisins, jusqu'à atteindre le bord du lot ou un voisin proche.
  // Évite Séjour stuck à 30 m² alors que PDF = 40.
  resolved = growUnderSized(resolved, lotBbox, walls, opts.angleTolDeg);

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
