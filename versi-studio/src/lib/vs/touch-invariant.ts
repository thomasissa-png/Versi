/**
 * s28 tour 29 — Invariant ARCHITECTURAL « chaque bord touche quelque chose ».
 *
 * Verbatim Thomas tour 28 :
 *   « y a encore des espaces trop vides dans certaines pièces majeurs.
 *     Je comprends pas non plus ce qui est compliqué à chaque pièce de
 *     forcément toucher une autre pièce ou le mur du lot »
 *
 * Règle absolue :
 *   Pour chaque pièce, pour chaque bord (N/S/E/W) :
 *     dist_min(bord, mur du lot OU pièce voisine) doit être ≤ TOUCH_TOL_PX (5px).
 *
 * Si non → ÉTENDRE le bord du rectangle de cette distance (= "snap to touch").
 *
 * Priorité absolue : cet invariant OVERRIDE le cap PDF * 1.10. Mieux vaut
 * avoir une pièce 1.30× la PDF surface (architecte avait des cotes externes,
 * notre rectangle inclut l'épaisseur murs) que des bandes vides aberrantes.
 *
 * Anti-régression : si l'extension produirait une pièce > PDF * MAX_OVER_PDF
 * → revert pour cette pièce (cas extrême : label PDF dans une zone non
 * habitable, ex inscription mal lue).
 *
 * Anti-overlap : si l'extension d'une pièce A vers le sud frapperait une
 * pièce B au sud avec un gap > 5px ET que B a aussi un bord nord libre → on
 * étend les deux à mi-chemin (snap au milieu du gap).
 */

import type { RectangleRoom, Vertex, Wall } from "./room-rectangle-from-walls";
import type { Pt } from "./lot-vector-extractor";

// ─── Constantes ────────────────────────────────────────────────────

/** Tolérance pour considérer qu'un bord "touche" déjà quelque chose (px image). */
export const TOUCH_TOL_PX = 5;

/** Cap dur sur surface : si extension >= MAX_OVER_INITIAL × bbox_initiale → revert.
 *  L'invariant TOUCHE est PRIORITAIRE sur le cap PDF (consigne tour 29).
 *  Cap très permissif à 6.0 (priorité absolue à toucher). Un cap est gardé
 *  uniquement comme garde-fou anti-explosion en cas de label PDF mal lu. */
const MAX_OVER_INITIAL = 6.0;

/** Itérations max de la passe (convergence par fixed-point). */
const MAX_ITERATIONS = 8;

/** Cap d'extension par direction et par itération (px image). Évite des
 *  expansions sauvages mais doit permettre d'atteindre les murs du lot.
 *  800px = couvre tous les lots normaux. */
const MAX_EXTEND_PER_ITER_PX = 800;

/** s28 tour 30 — Filtre pièces hallucinées :
 *  Pour les pièces SANS surface PDF (ECS, TGBT, gaine), si le gap maximum
 *  sur un bord > HALLUCINATION_GAP_PX → la pièce flotte → halluci, on filtre.
 *  Cas typique tour 29 R+3 : ECS/S=580px → pièce ECS hallucinée. */
const HALLUCINATION_GAP_PX = 200;

/** s28 tour 30 — Fill remaining gaps : passe finale agressive.
 *  Pour chaque bord avec gap > FILL_GAP_THRESHOLD_PX après enforceTouchInvariant,
 *  on identifie le voisin le plus proche perpendiculaire, et on l'étend
 *  AGRESSIVEMENT (cap 8x bbox initiale) pour combler le gap. */
/** s28 tour 30 — Seuil 6px (juste au-dessus de TOUCH_TOL_PX=5) pour combler
 *  même les petits gaps borderline (cas RDC ECS=10px qui flotte). */
const FILL_GAP_THRESHOLD_PX = 6;
const FILL_GAP_MAX_OVER_INITIAL = 8.0;

/** s28 tour 31 — Marge autour du label centroïde d'une AUTRE pièce qu'on
 *  refuse d'inclure dans la bbox d'une pièce courante. Une pièce ne doit
 *  JAMAIS s'étendre par-dessus le centroïde du label d'une autre pièce.
 *  Marge 8px pour absorber les imprécisions d'extraction texte PDF. */
const LABEL_BARRIER_MARGIN_PX = 8;

// ─── Types ─────────────────────────────────────────────────────────

type Bbox = { xMin: number; yMin: number; xMax: number; yMax: number };

type Direction = "N" | "S" | "E" | "W";

/** s28 tour 31 — centroïde du label d'une pièce. Utilisé comme barrière :
 *  aucune AUTRE pièce ne peut étendre sa bbox par-dessus ce point. */
export type LabelCenter = { x: number; y: number };

// ─── Helpers géométriques ──────────────────────────────────────────

function bboxOf(room: RectangleRoom): Bbox {
  return {
    xMin: room.bbox.xMin,
    yMin: room.bbox.yMin,
    xMax: room.bbox.xMax,
    yMax: room.bbox.yMax,
  };
}

function buildRectVerts(b: Bbox): Vertex[] {
  return [
    { x: b.xMin, y: b.yMin },
    { x: b.xMax, y: b.yMin },
    { x: b.xMax, y: b.yMax },
    { x: b.xMin, y: b.yMax },
  ];
}

function polyArea(verts: Vertex[]): number {
  let s = 0;
  for (let i = 0; i < verts.length; i++) {
    const j = (i + 1) % verts.length;
    s += verts[i].x * verts[j].y - verts[j].x * verts[i].y;
  }
  return Math.abs(s) / 2;
}

function lotBoundingBox(lotPolygon: Pt[]): Bbox {
  let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
  for (const p of lotPolygon) {
    if (p.x < xMin) xMin = p.x;
    if (p.y < yMin) yMin = p.y;
    if (p.x > xMax) xMax = p.x;
    if (p.y > yMax) yMax = p.y;
  }
  return { xMin, yMin, xMax, yMax };
}

/**
 * Renvoie la borne du polygone lot dans la direction `dir` pour l'intervalle
 * perpendiculaire [lo, hi] (lo,hi sur l'axe x si dir N/S, sur l'axe y si W/E).
 *
 * Pour dir=N : pour chaque x ∈ [lo, hi], trouver max(y) tel que (x, y) soit
 * sur une arête du polygone ET y < a.yMin. Renvoie le y MAX trouvé (= bord
 * N du polygone le plus bas dans cet intervalle = limite la plus haute pour
 * extension N).
 *
 * Approche simple : on parcourt les arêtes du polygone, pour chaque arête,
 * on calcule l'intersection avec les segments verticaux x=lo et x=hi (et
 * tous les x intermédiaires intéressants = sommets dans l'intervalle).
 * Pour V1 simple : on échantillonne 5 valeurs x dans [lo, hi] et on prend
 * pour chacune le y MAX (au-dessus du roomCenter) atteint via PIP-walk.
 */
function lotBorderInDirection(
  lotPolygon: Pt[],
  dir: Direction,
  perpLo: number,
  perpHi: number,
  roomCenter: { x: number; y: number },
  fallback: number,
): number {
  // Échantillonne 7 positions perpendiculaires dans [perpLo, perpHi]
  const SAMPLES = 7;
  let bestLimit = fallback;
  for (let s = 0; s < SAMPLES; s++) {
    const t = s / (SAMPLES - 1);
    const perp = perpLo + t * (perpHi - perpLo);
    // Pour chaque arête du polygone, intersection avec ligne perpendiculaire
    let edgeLimit: number | null = null;
    for (let i = 0; i < lotPolygon.length; i++) {
      const p = lotPolygon[i];
      const q = lotPolygon[(i + 1) % lotPolygon.length];
      let t_seg: number;
      let yIntersect: number | null = null;
      let xIntersect: number | null = null;
      if (dir === "N" || dir === "S") {
        // ligne x = perp, on cherche y sur l'arête
        const dx = q.x - p.x;
        if (Math.abs(dx) < 1e-6) {
          // arête verticale : couvre x=p.x; si perp ≈ p.x, l'arête entière est candidat
          if (Math.abs(p.x - perp) > 2) continue;
          // prendre le y le plus proche du centre vers la direction
          const yLo = Math.min(p.y, q.y);
          const yHi = Math.max(p.y, q.y);
          if (dir === "N" && yLo < roomCenter.y) {
            // candidat = yHi (dernier point visible vers le bas, donc bord N du polygon le plus haut)
            // Non, pour dir=N on veut y < center, le plus PROCHE du center par le haut → max(y) avec y<center
            const y = Math.min(yHi, roomCenter.y);
            yIntersect = y;
          } else if (dir === "S" && yHi > roomCenter.y) {
            const y = Math.max(yLo, roomCenter.y);
            yIntersect = y;
          } else {
            continue;
          }
        } else {
          t_seg = (perp - p.x) / dx;
          if (t_seg < -0.001 || t_seg > 1.001) continue;
          yIntersect = p.y + t_seg * (q.y - p.y);
        }
        if (yIntersect == null) continue;
        if (dir === "N" && yIntersect < roomCenter.y) {
          if (edgeLimit == null || yIntersect > edgeLimit) edgeLimit = yIntersect;
        }
        if (dir === "S" && yIntersect > roomCenter.y) {
          if (edgeLimit == null || yIntersect < edgeLimit) edgeLimit = yIntersect;
        }
      } else {
        // ligne y = perp
        const dy = q.y - p.y;
        if (Math.abs(dy) < 1e-6) {
          if (Math.abs(p.y - perp) > 2) continue;
          const xLo = Math.min(p.x, q.x);
          const xHi = Math.max(p.x, q.x);
          if (dir === "W" && xLo < roomCenter.x) {
            const x = Math.min(xHi, roomCenter.x);
            xIntersect = x;
          } else if (dir === "E" && xHi > roomCenter.x) {
            const x = Math.max(xLo, roomCenter.x);
            xIntersect = x;
          } else {
            continue;
          }
        } else {
          t_seg = (perp - p.y) / dy;
          if (t_seg < -0.001 || t_seg > 1.001) continue;
          xIntersect = p.x + t_seg * (q.x - p.x);
        }
        if (xIntersect == null) continue;
        if (dir === "W" && xIntersect < roomCenter.x) {
          if (edgeLimit == null || xIntersect > edgeLimit) edgeLimit = xIntersect;
        }
        if (dir === "E" && xIntersect > roomCenter.x) {
          if (edgeLimit == null || xIntersect < edgeLimit) edgeLimit = xIntersect;
        }
      }
    }
    if (edgeLimit != null) {
      if (dir === "N" && edgeLimit > bestLimit) bestLimit = edgeLimit;
      if (dir === "W" && edgeLimit > bestLimit) bestLimit = edgeLimit;
      if (dir === "S" && edgeLimit < bestLimit) bestLimit = edgeLimit;
      if (dir === "E" && edgeLimit < bestLimit) bestLimit = edgeLimit;
    }
  }
  return bestLimit;
}

/** True si segment [u,v] horizontal (le segment est ~horizontal). */
function isHorizontal(w: Wall, tolPx = 4): boolean {
  return Math.abs(w.y1 - w.y2) <= tolPx;
}

function isVertical(w: Wall, tolPx = 4): boolean {
  return Math.abs(w.x1 - w.x2) <= tolPx;
}

// ─── Calcul "distance touche" pour un bord donné ───────────────────

/**
 * Renvoie la distance signée que le bord `dir` de `room` doit parcourir pour
 * toucher l'élément le plus proche (mur du lot OU pièce voisine).
 * Si déjà à <= TOUCH_TOL_PX → renvoie 0.
 *
 * La "distance" est le delta à appliquer au bord :
 *   N → yMin -= delta (bord remonte)
 *   S → yMax += delta (bord descend)
 *   W → xMin -= delta
 *   E → xMax += delta
 *
 * Si aucun voisin et aucun mur lot dans la direction → 0 (on n'étend pas dans
 * le vide ; le bord du lot bbox sert de référence finale).
 */
function distanceToTouch(
  room: RectangleRoom,
  dir: Direction,
  others: RectangleRoom[],
  lotBbox: Bbox,
  lotWalls: Wall[],
  lotPolygon: Pt[],
): number {
  const a = room.bbox;

  // Recouvrement géométrique requis pour qu'un voisin soit "en face" du bord.
  // On utilise un seuil minimal (1px) pour considérer un voisin présent.
  const horizOverlapWith = (b: Bbox) =>
    Math.min(a.xMax, b.xMax) - Math.max(a.xMin, b.xMin);
  const vertOverlapWith = (b: Bbox) =>
    Math.min(a.yMax, b.yMax) - Math.max(a.yMin, b.yMin);

  // Limite du POLYGONE LOT dans cette direction (= bord visible orange).
  // C'est le bord visible que l'utilisateur attend que les pièces touchent.
  // Le bbox englobant peut être plus large (cotes/légendes en bord PDF).
  const roomCenter = { x: (a.xMin + a.xMax) / 2, y: (a.yMin + a.yMax) / 2 };
  let limit: number;
  if (dir === "N") {
    // Pour bord N : on cherche dans l'intervalle x = [a.xMin, a.xMax] le bord
    // du polygone le plus bas (max y) qui soit au-dessus du centre.
    limit = lotBorderInDirection(
      lotPolygon, "N", a.xMin, a.xMax, roomCenter, lotBbox.yMin,
    );
  } else if (dir === "S") {
    limit = lotBorderInDirection(
      lotPolygon, "S", a.xMin, a.xMax, roomCenter, lotBbox.yMax,
    );
  } else if (dir === "W") {
    limit = lotBorderInDirection(
      lotPolygon, "W", a.yMin, a.yMax, roomCenter, lotBbox.xMin,
    );
  } else {
    limit = lotBorderInDirection(
      lotPolygon, "E", a.yMin, a.yMax, roomCenter, lotBbox.xMax,
    );
  }

  // 1) Voisin le plus proche dans la direction.
  // Pour qu'un voisin "bloque" notre extension, il faut un recouvrement
  // perpendiculaire SIGNIFICATIF (>= 20% de la dimension perpendiculaire de
  // la pièce). Sinon, ce n'est pas un vrai voisin "en face" — c'est une
  // pièce diagonale ou un fragment de cote → on ne s'arrête pas dessus.
  //
  // Cette correction (vs version naïve avec overlap > 1px) évite que de
  // micro-overlaps avec une pièce diagonale bloquent l'extension. Cas
  // typique floor 0 : Chambre nord, voisin "Couloir" qui touche d'1px en
  // angle horizontal → l'algo naïf voyait un voisin en N et limitait là,
  // alors que la vraie cible est le mur N du lot.
  const aWidth = Math.max(1, a.xMax - a.xMin);
  const aHeight = Math.max(1, a.yMax - a.yMin);
  // Seuil 35% : un vrai voisin "en face" doit recouvrir au moins 35% de la
  // dimension perpendiculaire. Sinon, c'est un voisin diagonal qui ne doit
  // pas bloquer l'extension vers le mur du lot.
  const minOverlapH = aWidth * 0.35;
  const minOverlapV = aHeight * 0.35;

  for (const o of others) {
    const b = o.bbox;
    if (dir === "N" || dir === "S") {
      if (horizOverlapWith(b) <= minOverlapH) continue;
      // N : voisin AU-DESSUS (yMax du voisin <= yMin de la room)
      if (dir === "N" && b.yMax <= a.yMin + 1 && b.yMax > limit) {
        limit = b.yMax;
      }
      // S : voisin EN-DESSOUS (yMin du voisin >= yMax de la room)
      if (dir === "S" && b.yMin >= a.yMax - 1 && b.yMin < limit) {
        limit = b.yMin;
      }
    } else {
      if (vertOverlapWith(b) <= minOverlapV) continue;
      // W : voisin À GAUCHE (xMax voisin <= xMin room)
      if (dir === "W" && b.xMax <= a.xMin + 1 && b.xMax > limit) {
        limit = b.xMax;
      }
      // E : voisin À DROITE (xMin voisin >= xMax room)
      if (dir === "E" && b.xMin >= a.xMax - 1 && b.xMin < limit) {
        limit = b.xMin;
      }
    }
  }

  // 2) Mur du lot (segments du polygone lot) : si segment H/V dans la direction,
  //    avec recouvrement perpendiculaire, on contraint limit.
  for (const w of lotWalls) {
    if (dir === "N" || dir === "S") {
      if (!isHorizontal(w, 6)) continue;
      const wy = (w.y1 + w.y2) / 2;
      const wxLo = Math.min(w.x1, w.x2);
      const wxHi = Math.max(w.x1, w.x2);
      const ovx = Math.min(a.xMax, wxHi) - Math.max(a.xMin, wxLo);
      if (ovx <= 1) continue;
      // N : mur lot au-dessus du bord N (wy <= yMin)
      if (dir === "N" && wy <= a.yMin + 1 && wy > limit) {
        limit = wy;
      }
      // S : mur lot en-dessous (wy >= yMax)
      if (dir === "S" && wy >= a.yMax - 1 && wy < limit) {
        limit = wy;
      }
    } else {
      if (!isVertical(w, 6)) continue;
      const wx = (w.x1 + w.x2) / 2;
      const wyLo = Math.min(w.y1, w.y2);
      const wyHi = Math.max(w.y1, w.y2);
      const ovy = Math.min(a.yMax, wyHi) - Math.max(a.yMin, wyLo);
      if (ovy <= 1) continue;
      // W : mur lot à gauche
      if (dir === "W" && wx <= a.xMin + 1 && wx > limit) {
        limit = wx;
      }
      // E : mur lot à droite
      if (dir === "E" && wx >= a.xMax - 1 && wx < limit) {
        limit = wx;
      }
    }
  }

  // 3) Calcul du delta (= distance d'extension nécessaire pour toucher).
  let delta: number;
  if (dir === "N") delta = a.yMin - limit; // si limit < yMin, delta > 0 = remonter
  else if (dir === "S") delta = limit - a.yMax;
  else if (dir === "W") delta = a.xMin - limit;
  else delta = limit - a.xMax;

  // Tolérance : si déjà collé → 0
  if (delta <= TOUCH_TOL_PX) return 0;

  // Cap par itération (sécurité anti-explosion)
  return Math.min(delta, MAX_EXTEND_PER_ITER_PX);
}

// ─── s28 tour 31 — Barrière label : pas d'extension par-dessus un label étranger ───

/**
 * Vérifie si la bbox `b` contient le centroïde du label `lc` (avec marge).
 * Renvoie true si la bbox englobe le label.
 */
function bboxContainsLabel(b: Bbox, lc: LabelCenter): boolean {
  return (
    lc.x >= b.xMin - LABEL_BARRIER_MARGIN_PX &&
    lc.x <= b.xMax + LABEL_BARRIER_MARGIN_PX &&
    lc.y >= b.yMin - LABEL_BARRIER_MARGIN_PX &&
    lc.y <= b.yMax + LABEL_BARRIER_MARGIN_PX
  );
}

/**
 * Étant donné une bbox `candidate` étendue dans la direction `dir`, et la
 * bbox d'origine `original`, ajuste `candidate` pour respecter deux règles
 * label-barrière :
 *
 * RÈGLE 1 (label-inside) : la bbox candidate ne doit JAMAIS contenir le
 *   centroïde du label d'une autre pièce. Si extension franchit ce centroïde,
 *   stopper juste avant (marge 8px).
 *
 * RÈGLE 2 (Voronoï midpoint) : pour la direction d'extension `dir` et `myLabel`
 *   (le label de la pièce courante), la bbox candidate ne doit pas dépasser
 *   le MIDPOINT entre `myLabel` et tout autre label situé du même côté de la
 *   pièce. Ex pour dir=E avec myLabel.x=23%, autre label à x=77% → xMax cap à 50%.
 *   Cette règle empêche une petite pièce de s'étendre dans le territoire
 *   d'une grande pièce voisine selon une partition Voronoï 1D.
 *
 * Renvoie true si la bbox a été modifiée (clampée par un label).
 */
function clampToForeignLabels(
  candidate: Bbox,
  original: Bbox,
  dir: Direction,
  foreignLabels: LabelCenter[],
  myLabel?: LabelCenter,
  mySurface?: number,
  foreignSurfaces?: number[],
): boolean {
  if (foreignLabels.length === 0) return false;
  let clamped = false;

  // RÈGLE 1 — label-inside barrier
  for (const lc of foreignLabels) {
    if (!bboxContainsLabel(candidate, lc)) continue;
    if (bboxContainsLabel(original, lc)) continue;
    if (dir === "N") {
      if (lc.y > candidate.yMin && lc.y < original.yMin) {
        candidate.yMin = lc.y + LABEL_BARRIER_MARGIN_PX;
        clamped = true;
      }
    } else if (dir === "S") {
      if (lc.y < candidate.yMax && lc.y > original.yMax) {
        candidate.yMax = lc.y - LABEL_BARRIER_MARGIN_PX;
        clamped = true;
      }
    } else if (dir === "W") {
      if (lc.x > candidate.xMin && lc.x < original.xMin) {
        candidate.xMin = lc.x + LABEL_BARRIER_MARGIN_PX;
        clamped = true;
      }
    } else {
      if (lc.x < candidate.xMax && lc.x > original.xMax) {
        candidate.xMax = lc.x - LABEL_BARRIER_MARGIN_PX;
        clamped = true;
      }
    }
  }

  // RÈGLE 2 — Weighted Voronoï 1D pendant l'extension.
  // Pour chaque direction d'extension, on cap au boundary pondéré sqrt(surface)
  // entre myLabel et tout label étranger COMPATIBLE perpendiculairement.
  // "Compatible" = écart perpendiculaire < CROSS_BAND_PX (200px ≈ 4m).
  // C'est crucial pour empêcher Entrée de s'étendre E à travers tout le lot
  // alors qu'il y a SDB, ECS, etc. plus à l'est dans des bandes Y proches.
  const CROSS_BAND_PX = 200;
  if (myLabel) {
    const myWeight = Math.sqrt(Math.max(0.5, mySurface ?? 1.0));
    if (dir === "E") {
      let cap = candidate.xMax;
      for (let k = 0; k < foreignLabels.length; k++) {
        const lc = foreignLabels[k];
        if (lc.x <= myLabel.x + LABEL_BARRIER_MARGIN_PX) continue;
        if (Math.abs(lc.y - myLabel.y) >= CROSS_BAND_PX) continue;
        const lcSurf = foreignSurfaces?.[k] ?? 1.0;
        const ow = Math.sqrt(Math.max(0.5, lcSurf));
        const boundary = myLabel.x + (lc.x - myLabel.x) * myWeight / (myWeight + ow);
        if (boundary < cap) cap = boundary;
      }
      if (cap < candidate.xMax) {
        candidate.xMax = cap;
        clamped = true;
      }
    } else if (dir === "W") {
      let cap = candidate.xMin;
      for (let k = 0; k < foreignLabels.length; k++) {
        const lc = foreignLabels[k];
        if (lc.x >= myLabel.x - LABEL_BARRIER_MARGIN_PX) continue;
        if (Math.abs(lc.y - myLabel.y) >= CROSS_BAND_PX) continue;
        const lcSurf = foreignSurfaces?.[k] ?? 1.0;
        const ow = Math.sqrt(Math.max(0.5, lcSurf));
        const boundary = myLabel.x + (lc.x - myLabel.x) * myWeight / (myWeight + ow);
        if (boundary > cap) cap = boundary;
      }
      if (cap > candidate.xMin) {
        candidate.xMin = cap;
        clamped = true;
      }
    } else if (dir === "S") {
      let cap = candidate.yMax;
      for (let k = 0; k < foreignLabels.length; k++) {
        const lc = foreignLabels[k];
        if (lc.y <= myLabel.y + LABEL_BARRIER_MARGIN_PX) continue;
        if (Math.abs(lc.x - myLabel.x) >= CROSS_BAND_PX) continue;
        const lcSurf = foreignSurfaces?.[k] ?? 1.0;
        const ow = Math.sqrt(Math.max(0.5, lcSurf));
        const boundary = myLabel.y + (lc.y - myLabel.y) * myWeight / (myWeight + ow);
        if (boundary < cap) cap = boundary;
      }
      if (cap < candidate.yMax) {
        candidate.yMax = cap;
        clamped = true;
      }
    } else if (dir === "N") {
      let cap = candidate.yMin;
      for (let k = 0; k < foreignLabels.length; k++) {
        const lc = foreignLabels[k];
        if (lc.y >= myLabel.y - LABEL_BARRIER_MARGIN_PX) continue;
        if (Math.abs(lc.x - myLabel.x) >= CROSS_BAND_PX) continue;
        const lcSurf = foreignSurfaces?.[k] ?? 1.0;
        const ow = Math.sqrt(Math.max(0.5, lcSurf));
        const boundary = myLabel.y + (lc.y - myLabel.y) * myWeight / (myWeight + ow);
        if (boundary > cap) cap = boundary;
      }
      if (cap > candidate.yMin) {
        candidate.yMin = cap;
        clamped = true;
      }
    }
  }

  return clamped;
}

/**
 * s28 tour 31 — Pré-passe : pour chaque pièce A dont la bbox contient le
 * centroïde du label d'une AUTRE pièce B, on shrink la bbox de A dans la
 * direction la plus courte pour exclure le centroïde de B (marge 8px).
 *
 * Cas R+1 tour 30 : Entrée (label x=23%, y=93%) finit avec bbox xMax=70%
 * incluant Salon (label x=77%, y=30%). Erreur : Entrée englobe le label
 * Salon — la pièce attribuée à "Entrée" couvre une zone qui appartient
 * en réalité au Salon.
 *
 * Cette passe corrige : Entrée.xMax sera ramené à 77%-marge.
 */
export function enforceLabelOwnership(
  rooms: RectangleRoom[],
  labelCenters: LabelCenter[],
): RectangleRoom[] {
  if (rooms.length === 0 || labelCenters.length !== rooms.length) return rooms;
  const next: RectangleRoom[] = rooms.map((r) => ({
    ...r,
    bbox: { ...r.bbox },
    polygon: r.polygon.map((v) => ({ ...v })),
  }));

  let totalShrunk = 0;

  // PASSE 1 — WEIGHTED Voronoï 1D selon chaque axe.
  //
  // Idée : pour chaque pièce r et chaque autre label lc, on calcule la
  // frontière de partage selon X et Y séparément, pondérée par sqrt(surface)
  // pour donner plus de territoire aux grandes pièces. Le cap n'est appliqué
  // que si l'axe perpendiculaire est "compatible" (les deux labels sont dans
  // une bande commune perpendiculaire).
  //
  // Compatibilité perpendiculaire : pour cap E/W (axe X), les deux labels
  // doivent être dans une bande Y commune ; pour cap N/S, dans une bande X.
  // "Bande commune" = projection des bboxes initiales BBOX_BAND_FACTOR (1.5)
  // se chevauche sur l'axe perpendiculaire.
  //
  // Pondération : sqrt(surface) — Salon 40m² claim 6.3/(6.3+2.6) = 71% du
  // segment Salon-Entrée vs Entrée 30%. Standard "additively weighted Voronoï".
  for (let i = 0; i < next.length; i++) {
    const r = next[i];
    const myLabel = labelCenters[i];
    const myWeight = Math.sqrt(Math.max(0.5, r.pdfSurfaceM2 ?? 1.0));
    const before = { ...r.bbox };
    for (let j = 0; j < labelCenters.length; j++) {
      if (j === i) continue;
      const lc = labelCenters[j];
      const otherSurf = next[j].pdfSurfaceM2 ?? 1.0;
      const otherWeight = Math.sqrt(Math.max(0.5, otherSurf));
      const totalW = myWeight + otherWeight;

      // Boundary X (entre les deux labels) :
      //   boundaryX = myLabel.x + (lc.x - myLabel.x) × myWeight / totalW
      // Si lc.x > myLabel.x (lc à droite), boundaryX > myLabel.x.
      // r.bbox.xMax doit être ≤ boundaryX si la bande Y est compatible.
      // r.bbox.xMin doit être ≥ boundaryX si lc.x < myLabel.x.

      // Compatibilité Y : myLabel.y et lc.y dans la même "bande" architecturale.
      // Approche conservatrice : seuil dist_y < CROSS_BAND_PX (200px ≈ 4m).
      // Si les labels sont à plus de 4m perpendiculairement, ils ne sont pas
      // en compétition pour le même territoire X.
      const CROSS_BAND_PX = 200;

      // Cap X — uniquement si labels alignés en Y dans la bande.
      if (Math.abs(lc.y - myLabel.y) < CROSS_BAND_PX) {
        const boundaryX = myLabel.x + (lc.x - myLabel.x) * myWeight / totalW;
        if (lc.x > myLabel.x + LABEL_BARRIER_MARGIN_PX) {
          // lc à droite → cap r.bbox.xMax
          if (boundaryX < r.bbox.xMax) r.bbox.xMax = boundaryX;
        } else if (lc.x < myLabel.x - LABEL_BARRIER_MARGIN_PX) {
          if (boundaryX > r.bbox.xMin) r.bbox.xMin = boundaryX;
        }
      }
      // Cap Y — uniquement si labels alignés en X dans la bande.
      if (Math.abs(lc.x - myLabel.x) < CROSS_BAND_PX) {
        const boundaryY = myLabel.y + (lc.y - myLabel.y) * myWeight / totalW;
        if (lc.y > myLabel.y + LABEL_BARRIER_MARGIN_PX) {
          if (boundaryY < r.bbox.yMax) r.bbox.yMax = boundaryY;
        } else if (lc.y < myLabel.y - LABEL_BARRIER_MARGIN_PX) {
          if (boundaryY > r.bbox.yMin) r.bbox.yMin = boundaryY;
        }
      }
    }
    // Sécurité : si shrink rend bbox dégénérée OU exclut myLabel, rollback.
    const stillValid =
      r.bbox.xMax - r.bbox.xMin > 5 &&
      r.bbox.yMax - r.bbox.yMin > 5 &&
      myLabel.x >= r.bbox.xMin - 1 &&
      myLabel.x <= r.bbox.xMax + 1 &&
      myLabel.y >= r.bbox.yMin - 1 &&
      myLabel.y <= r.bbox.yMax + 1;
    if (!stillValid) {
      r.bbox = before;
      continue;
    }
    const moved =
      Math.abs(before.xMin - r.bbox.xMin) > 1 ||
      Math.abs(before.yMin - r.bbox.yMin) > 1 ||
      Math.abs(before.xMax - r.bbox.xMax) > 1 ||
      Math.abs(before.yMax - r.bbox.yMax) > 1;
    if (moved) {
      r.polygon = buildRectVerts(r.bbox);
      r.areaPx2 = polyArea(r.polygon);
      totalShrunk++;
      console.log(
        `[labelOwnership-voronoi] ${r.label} bbox shrink (${(before.xMax - before.xMin).toFixed(0)}x${(before.yMax - before.yMin).toFixed(0)} → ${(r.bbox.xMax - r.bbox.xMin).toFixed(0)}x${(r.bbox.yMax - r.bbox.yMin).toFixed(0)})`,
      );
    }
  }

  // PASSE 2 — label-inside (filet de sécurité au cas où Voronoï a laissé
  // passer une violation, p.ex. labels alignés sur un axe).
  for (let i = 0; i < next.length; i++) {
    const r = next[i];
    const myLabel = labelCenters[i];
    for (let j = 0; j < labelCenters.length; j++) {
      if (j === i) continue;
      const lc = labelCenters[j];
      if (!bboxContainsLabel(r.bbox, lc)) continue;

      // Le label de la pièce j est dans la bbox de la pièce i. Shrink i
      // dans la direction où le label de j est le plus proche du bord de i,
      // de manière à exclure ce label.
      // Calculer les 4 distances du label aux 4 bords de la bbox.
      const dN = lc.y - r.bbox.yMin; // distance bord nord
      const dS = r.bbox.yMax - lc.y; // distance bord sud
      const dW = lc.x - r.bbox.xMin;
      const dE = r.bbox.xMax - lc.x;

      // Eviter la direction qui coupe le label de la pièce courante (myLabel).
      // Si on shrink dans la direction `dir`, le nouveau bord doit rester du
      // bon côté de myLabel. Filtrer les directions qui couperaient myLabel.
      const candidates: Array<{ dir: Direction; cost: number }> = [];
      if (lc.y + LABEL_BARRIER_MARGIN_PX < myLabel.y) {
        // label étranger AU-DESSUS de mon label → shrink N (yMin↓→haut)
        candidates.push({ dir: "N", cost: dN });
      }
      if (lc.y - LABEL_BARRIER_MARGIN_PX > myLabel.y) {
        // label étranger EN-DESSOUS de mon label → shrink S
        candidates.push({ dir: "S", cost: dS });
      }
      if (lc.x + LABEL_BARRIER_MARGIN_PX < myLabel.x) {
        // label étranger À GAUCHE de mon label → shrink W
        candidates.push({ dir: "W", cost: dW });
      }
      if (lc.x - LABEL_BARRIER_MARGIN_PX > myLabel.x) {
        candidates.push({ dir: "E", cost: dE });
      }
      if (candidates.length === 0) continue; // labels alignés → on ne sait pas couper proprement

      // Choisir la direction avec le coût (= distance bord-label) le plus
      // petit (moins de surface perdue).
      candidates.sort((a, b) => a.cost - b.cost);
      const { dir } = candidates[0];

      const before = { ...r.bbox };
      if (dir === "N") r.bbox.yMin = lc.y + LABEL_BARRIER_MARGIN_PX;
      else if (dir === "S") r.bbox.yMax = lc.y - LABEL_BARRIER_MARGIN_PX;
      else if (dir === "W") r.bbox.xMin = lc.x + LABEL_BARRIER_MARGIN_PX;
      else r.bbox.xMax = lc.x - LABEL_BARRIER_MARGIN_PX;

      // Sécurité : si shrink rend la bbox dégénérée ou ne contient plus
      // myLabel, rollback.
      const stillValid =
        r.bbox.xMax - r.bbox.xMin > 5 &&
        r.bbox.yMax - r.bbox.yMin > 5 &&
        myLabel.x >= r.bbox.xMin - 1 &&
        myLabel.x <= r.bbox.xMax + 1 &&
        myLabel.y >= r.bbox.yMin - 1 &&
        myLabel.y <= r.bbox.yMax + 1;
      if (!stillValid) {
        r.bbox = before;
        continue;
      }

      r.polygon = buildRectVerts(r.bbox);
      r.areaPx2 = polyArea(r.polygon);
      totalShrunk++;
      console.log(
        `[labelOwnership] ${r.label}/${dir} shrink (englobe label "${rooms[j].label}" en (${Math.round(lc.x)},${Math.round(lc.y)}))`,
      );
    }
  }

  if (totalShrunk > 0) {
    console.log(
      `[enforceLabelOwnership] ${totalShrunk} shrink(s) pour exclure labels étrangers`,
    );
  }
  return next;
}

// ─── Détection chevauchement bbox ──────────────────────────────────

function bboxesOverlap(a: Bbox, b: Bbox): boolean {
  return (
    a.xMin < b.xMax - 1 &&
    a.xMax > b.xMin + 1 &&
    a.yMin < b.yMax - 1 &&
    a.yMax > b.yMin + 1
  );
}

// ─── Passe principale : enforceTouchInvariant ──────────────────────

/**
 * Applique l'invariant "chaque bord touche" sur toutes les rooms.
 *
 * @param rooms Rectangles d'entrée (polygones rectangulaires bbox-based).
 * @param lotPolygon Polygone du lot (pixel image).
 * @param walls Pool complet de murs (vectoriels + raster + bords lot).
 * @returns Rooms avec bords étendus jusqu'à toucher voisins ou mur lot.
 */
export function enforceTouchInvariant(
  rooms: RectangleRoom[],
  lotPolygon: Pt[],
  walls: Wall[],
  labelCenters: LabelCenter[] = [],
): RectangleRoom[] {
  if (rooms.length === 0) return rooms;
  const lotBbox = lotBoundingBox(lotPolygon);

  // Pool de murs utilisable pour "toucher" :
  //   1) Bords du polygone lot (visibles en orange dashed)
  //   2) Murs vectoriels long (>= 60px) du pool complet — captent les murs
  //      extérieurs du BÂTIMENT (différents du lot polygon qui peut inclure
  //      des bandes de cotes ou terrasses).
  //
  // Pour Muguets, lotPolygon est un rectangle large qui englobe les cotes
  // PDF. Le vrai "mur extérieur du bâtiment habitable" est dans walls[],
  // c'est un long segment H ou V à ~25% du lotBbox.
  const lotEdges: Wall[] = [];
  for (let i = 0; i < lotPolygon.length; i++) {
    const p = lotPolygon[i];
    const q = lotPolygon[(i + 1) % lotPolygon.length];
    lotEdges.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y });
  }
  // Murs TRÈS longs (>= 200px) : candidats murs extérieurs bâtiment.
  // Seuil 200px (plutôt que 60px) pour éviter de capter des cloisons internes
  // qui bloqueraient à tort l'extension. Un vrai mur extérieur fait toujours
  // au moins 200px sur un plan d'archi (Muguets : ~600px).
  const longWalls: Wall[] = walls.filter((w) => {
    const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
    return len >= 200;
  });
  const lotWalls: Wall[] = [...lotEdges, ...longWalls];

  // Travail sur copie profonde
  const next: RectangleRoom[] = rooms.map((r) => ({
    ...r,
    bbox: { ...r.bbox },
    polygon: r.polygon.map((v) => ({ ...v })),
  }));

  // Sauvegarde des bbox initiales pour cap PDF (rollback si nécessaire)
  const initialBbox = next.map((r) => ({ ...r.bbox }));

  let totalExtended = 0;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let changedThisIter = false;

    for (let i = 0; i < next.length; i++) {
      const room = next[i];
      const others = next.filter((_, j) => j !== i);

      for (const dir of ["N", "S", "W", "E"] as Direction[]) {
        const delta = distanceToTouch(room, dir, others, lotBbox, lotWalls, lotPolygon);
        if (delta <= 0) continue;

        // Tentative d'extension : on construit la bbox candidate.
        const candidate: Bbox = { ...room.bbox };
        if (dir === "N") candidate.yMin -= delta;
        else if (dir === "S") candidate.yMax += delta;
        else if (dir === "W") candidate.xMin -= delta;
        else candidate.xMax += delta;

        // Anti-régression 1 : NE PAS sortir du lot bbox
        if (candidate.xMin < lotBbox.xMin - 1) candidate.xMin = lotBbox.xMin;
        if (candidate.yMin < lotBbox.yMin - 1) candidate.yMin = lotBbox.yMin;
        if (candidate.xMax > lotBbox.xMax + 1) candidate.xMax = lotBbox.xMax;
        if (candidate.yMax > lotBbox.yMax + 1) candidate.yMax = lotBbox.yMax;

        // Anti-régression 1.5 (s28 tour 31) : NE PAS franchir le label
        // d'une autre pièce + Voronoï midpoint cap pondéré sqrt(surface).
        if (labelCenters.length === next.length) {
          const foreignLabels = labelCenters.filter((_, j) => j !== i);
          const foreignSurfs = next
            .filter((_, j) => j !== i)
            .map((rr) => rr.pdfSurfaceM2 ?? 1.0);
          clampToForeignLabels(
            candidate, room.bbox, dir, foreignLabels, labelCenters[i],
            room.pdfSurfaceM2 ?? 1.0, foreignSurfs,
          );
        }

        // Anti-régression 2 : NE PAS chevaucher un voisin (avec marge 2px).
        // Si chevauchement : s'arrêter à mi-chemin entre le bord actuel et le
        // voisin (split du gap). Si le voisin a aussi un bord libre côté
        // opposé, l'invariant tournera côté voisin à l'itération suivante.
        let overlap = false;
        for (const o of others) {
          if (bboxesOverlap(candidate, o.bbox)) {
            overlap = true;
            // Reculer le bord candidat de l'autre côté du voisin + 1px.
            if (dir === "N") candidate.yMin = Math.max(candidate.yMin, o.bbox.yMax + 1);
            else if (dir === "S") candidate.yMax = Math.min(candidate.yMax, o.bbox.yMin - 1);
            else if (dir === "W") candidate.xMin = Math.max(candidate.xMin, o.bbox.xMax + 1);
            else candidate.xMax = Math.min(candidate.xMax, o.bbox.xMin - 1);
          }
        }
        if (overlap && bboxesOverlap(candidate, room.bbox) === false) {
          // Édge-case : après recul, plus d'overlap mais bbox dégénérée
          if (
            candidate.xMax - candidate.xMin < 5 ||
            candidate.yMax - candidate.yMin < 5
          ) continue;
        }

        // Anti-régression 3 : cap MAX_OVER_INITIAL × bbox initiale (anti-explosion).
        // L'invariant TOUCHE est PRIORITAIRE sur le cap PDF (consigne tour 29) →
        // on autorise jusqu'à 2× la bbox initiale. Au-delà, c'est probablement
        // un label PDF mal lu qui ferait grandir hors zone habitable.
        const newArea = (candidate.xMax - candidate.xMin) * (candidate.yMax - candidate.yMin);
        const initBbox = initialBbox[i];
        const initArea = (initBbox.xMax - initBbox.xMin) * (initBbox.yMax - initBbox.yMin);
        if (initArea > 0 && newArea > initArea * MAX_OVER_INITIAL) {
          // Cap : on étend uniquement jusqu'à initArea * MAX_OVER_INITIAL.
          const allowedRatio = (initArea * MAX_OVER_INITIAL) / newArea;
          if (allowedRatio < 1) {
            // Réduire le delta : recule le bord proportionnellement.
            if (dir === "N") {
              const cur = candidate.yMin;
              const orig = room.bbox.yMin;
              candidate.yMin = orig - (orig - cur) * allowedRatio;
            } else if (dir === "S") {
              const cur = candidate.yMax;
              const orig = room.bbox.yMax;
              candidate.yMax = orig + (cur - orig) * allowedRatio;
            } else if (dir === "W") {
              const cur = candidate.xMin;
              const orig = room.bbox.xMin;
              candidate.xMin = orig - (orig - cur) * allowedRatio;
            } else {
              const cur = candidate.xMax;
              const orig = room.bbox.xMax;
              candidate.xMax = orig + (cur - orig) * allowedRatio;
            }
          }
        }

        // Vérifier qu'on a vraiment bougé (post-cap)
        const movedN = dir === "N" && room.bbox.yMin - candidate.yMin > 1;
        const movedS = dir === "S" && candidate.yMax - room.bbox.yMax > 1;
        const movedW = dir === "W" && room.bbox.xMin - candidate.xMin > 1;
        const movedE = dir === "E" && candidate.xMax - room.bbox.xMax > 1;
        if (!(movedN || movedS || movedW || movedE)) continue;

        // Appliquer l'extension
        room.bbox = candidate;
        room.polygon = buildRectVerts(candidate);
        room.areaPx2 = polyArea(room.polygon);
        changedThisIter = true;
        totalExtended++;
      }
    }

    if (!changedThisIter) break; // convergence
  }

  if (totalExtended > 0) {
    console.log(
      `[enforceTouchInvariant] ${totalExtended} extension(s) de bord pour respecter "chaque bord touche"`,
    );
  }

  // Audit final : liste les bords qui ne touchent rien (gap > 5px).
  // CRITIQUE : on utilise un seuil overlap 1px (vs 35% pendant extension) car
  // ici on veut savoir si un bord est "visuellement collé" à QUELQUE CHOSE,
  // peu importe que ce soit un voisin partiel ou un mur lot.
  const remainingGaps: string[] = [];
  for (let i = 0; i < next.length; i++) {
    const room = next[i];
    const others = next.filter((_, j) => j !== i);
    for (const dir of ["N", "S", "W", "E"] as Direction[]) {
      const remaining = auditDistanceToTouch(room, dir, others, lotBbox, lotWalls, lotPolygon);
      if (remaining > 5) {
        remainingGaps.push(`${room.label}/${dir}=${Math.round(remaining)}px`);
      }
    }
  }
  if (remainingGaps.length > 0) {
    console.log(`[touchInv-audit] gaps restants : ${remainingGaps.join(", ")}`);
  } else {
    console.log(`[touchInv-audit] OK — tous les bords touchent quelque chose (gap ≤ 5px)`);
  }

  return next;
}

/**
 * Variante audit de distanceToTouch : seuil overlap 1px (vs 35% pour
 * extension). Utilisée pour savoir si un bord est visuellement collé à
 * QUELQUE CHOSE — peu importe la couverture perpendiculaire.
 */
function auditDistanceToTouch(
  room: RectangleRoom,
  dir: Direction,
  others: RectangleRoom[],
  lotBbox: Bbox,
  lotWalls: Wall[],
  lotPolygon: Pt[],
): number {
  const a = room.bbox;
  const horizOverlapWith = (b: Bbox) =>
    Math.min(a.xMax, b.xMax) - Math.max(a.xMin, b.xMin);
  const vertOverlapWith = (b: Bbox) =>
    Math.min(a.yMax, b.yMax) - Math.max(a.yMin, b.yMin);

  const roomCenter = { x: (a.xMin + a.xMax) / 2, y: (a.yMin + a.yMax) / 2 };
  let limit: number;
  if (dir === "N") {
    limit = lotBorderInDirection(lotPolygon, "N", a.xMin, a.xMax, roomCenter, lotBbox.yMin);
  } else if (dir === "S") {
    limit = lotBorderInDirection(lotPolygon, "S", a.xMin, a.xMax, roomCenter, lotBbox.yMax);
  } else if (dir === "W") {
    limit = lotBorderInDirection(lotPolygon, "W", a.yMin, a.yMax, roomCenter, lotBbox.xMin);
  } else {
    limit = lotBorderInDirection(lotPolygon, "E", a.yMin, a.yMax, roomCenter, lotBbox.xMax);
  }

  // Voisins (seuil overlap 1px en mode audit)
  for (const o of others) {
    const b = o.bbox;
    if (dir === "N" || dir === "S") {
      if (horizOverlapWith(b) <= 1) continue;
      if (dir === "N" && b.yMax <= a.yMin + 1 && b.yMax > limit) limit = b.yMax;
      if (dir === "S" && b.yMin >= a.yMax - 1 && b.yMin < limit) limit = b.yMin;
    } else {
      if (vertOverlapWith(b) <= 1) continue;
      if (dir === "W" && b.xMax <= a.xMin + 1 && b.xMax > limit) limit = b.xMax;
      if (dir === "E" && b.xMin >= a.xMax - 1 && b.xMin < limit) limit = b.xMin;
    }
  }

  // Murs lot/longs
  for (const w of lotWalls) {
    if (dir === "N" || dir === "S") {
      if (!isHorizontal(w, 6)) continue;
      const wy = (w.y1 + w.y2) / 2;
      const wxLo = Math.min(w.x1, w.x2);
      const wxHi = Math.max(w.x1, w.x2);
      const ovx = Math.min(a.xMax, wxHi) - Math.max(a.xMin, wxLo);
      if (ovx <= 1) continue;
      if (dir === "N" && wy <= a.yMin + 1 && wy > limit) limit = wy;
      if (dir === "S" && wy >= a.yMax - 1 && wy < limit) limit = wy;
    } else {
      if (!isVertical(w, 6)) continue;
      const wx = (w.x1 + w.x2) / 2;
      const wyLo = Math.min(w.y1, w.y2);
      const wyHi = Math.max(w.y1, w.y2);
      const ovy = Math.min(a.yMax, wyHi) - Math.max(a.yMin, wyLo);
      if (ovy <= 1) continue;
      if (dir === "W" && wx <= a.xMin + 1 && wx > limit) limit = wx;
      if (dir === "E" && wx >= a.xMax - 1 && wx < limit) limit = wx;
    }
  }

  let delta: number;
  if (dir === "N") delta = a.yMin - limit;
  else if (dir === "S") delta = limit - a.yMax;
  else if (dir === "W") delta = a.xMin - limit;
  else delta = limit - a.xMax;
  return Math.max(0, delta);
}

// ─── s28 tour 30 : Filtre pièces hallucinées ───────────────────────

/**
 * Calcule le gap maximum (audit, seuil 1px) sur tous les bords d'une pièce
 * vs voisins + murs lot. Utilisé pour détecter les pièces qui flottent.
 */
function computeMaxBoundaryGap(
  room: RectangleRoom,
  others: RectangleRoom[],
  lotPolygon: Pt[],
  walls: Wall[],
): number {
  const lotBbox = lotBoundingBox(lotPolygon);
  let maxGap = 0;
  for (const dir of ["N", "S", "W", "E"] as Direction[]) {
    const gap = auditDistanceToTouch(room, dir, others, lotBbox, walls, lotPolygon);
    if (gap > maxGap) maxGap = gap;
  }
  return maxGap;
}

/**
 * Filtre les pièces hallucinées : pièces SANS surface PDF qui flottent
 * (gap > 200px ET aucun voisin avec overlap >= 50%) sont retirées.
 *
 * Cas tour 29 R+3 : ECS/S=580px de gap, pièce ECS sans surface PDF qui flotte
 * dans le vide → halluci, on la filtre.
 *
 * Pièces avec surface PDF (architecte annoté) : jamais filtrées.
 */
export function filterHallucinatedRooms(
  rooms: RectangleRoom[],
  lotPolygon: Pt[],
  walls: Wall[],
): RectangleRoom[] {
  console.log(`[filterHallucinated] ENTRY rooms=${rooms.length}`);
  if (rooms.length === 0) return rooms;
  const lotEdges: Wall[] = [];
  for (let i = 0; i < lotPolygon.length; i++) {
    const p = lotPolygon[i];
    const q = lotPolygon[(i + 1) % lotPolygon.length];
    lotEdges.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y });
  }
  const longWalls: Wall[] = walls.filter((w) => {
    const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
    return len >= 200;
  });
  const lotWalls: Wall[] = [...lotEdges, ...longWalls];

  const filtered = rooms.filter((room, idx) => {
    // Pièces avec surface PDF : jamais filtrées (vérité architecte)
    if (room.pdfSurfaceM2 != null && room.pdfSurfaceM2 > 0) {
      return true;
    }

    // Pièces sans surface PDF : tester si halluci.
    // Critère simple : si le gap max sur un bord > 200px, c'est qu'aucun
    // voisin ni mur lot ne touche cette pièce → elle flotte → halluci.
    // (le critère "best_overlap" était mauvais : une pièce peut avoir overlap
    // perpendiculaire 100% avec un voisin et rester flottante sur ses 4 bords).
    const others = rooms.filter((_, j) => j !== idx);
    const maxGap = computeMaxBoundaryGap(room, others, lotPolygon, lotWalls);
    console.log(
      `[filterHallucinated] ${room.label} sans PDF — gap_max=${Math.round(maxGap)}px`,
    );

    if (maxGap > HALLUCINATION_GAP_PX) {
      console.log(
        `[filterHallucinated] ${room.label} RETIRÉE — gap_max=${Math.round(maxGap)}px > ${HALLUCINATION_GAP_PX}px`,
      );
      return false;
    }
    return true;
  });

  if (filtered.length !== rooms.length) {
    console.log(
      `[filterHallucinated] ${rooms.length - filtered.length} pièce(s) hallucinée(s) retirée(s)`,
    );
  }
  return filtered;
}

// ─── s28 tour 30 : Passe finale fill remaining gaps ────────────────

/**
 * Pour un bord donné qui a un gap résiduel, trouve la pièce voisine la plus
 * proche perpendiculairement qui POURRAIT être étendue pour combler ce gap.
 *
 * Ex : pièce A bord N a un gap de 120px (rien au-dessus à 120px) → on cherche
 * une pièce B perpendiculaire (à gauche/droite de la zone vide) qui pourrait
 * être étendue VERS A pour couvrir ce gap.
 */
function findExpandableNeighbor(
  room: RectangleRoom,
  dir: Direction,
  others: RectangleRoom[],
): { neighbor: RectangleRoom; expandDir: Direction } | null {
  const a = room.bbox;
  // La zone du gap est devant le bord `dir` de la pièce, jusqu'à `gap` px de profondeur.
  // On cherche une pièce voisine qui partage l'espace perpendiculaire et est ADJACENTE
  // à la zone vide (pourrait l'étendre pour la combler).
  let best: { neighbor: RectangleRoom; expandDir: Direction; score: number } | null = null;
  for (const o of others) {
    const b = o.bbox;
    if (dir === "N") {
      // Gap est au-dessus de room (yMin de room va vers le haut).
      // Voisin candidat : pièce dont le yMin <= a.yMin (donc qui a déjà du
      // "stock" au nord), et qui est latéralement proche de room.
      // Direction d'extension du voisin : E ou W (vers room).
      if (b.yMin > a.yMin + 5) continue; // pas de stock au nord
      // Voisin à gauche → étendre E ; à droite → étendre W
      if (b.xMax <= a.xMin + 5) {
        // voisin à gauche, étendre E
        const score = (a.xMin - b.xMax); // plus proche = meilleur (score négatif = meilleur)
        if (!best || score < best.score) best = { neighbor: o, expandDir: "E", score };
      } else if (b.xMin >= a.xMax - 5) {
        const score = (b.xMin - a.xMax);
        if (!best || score < best.score) best = { neighbor: o, expandDir: "W", score };
      }
    } else if (dir === "S") {
      if (b.yMax < a.yMax - 5) continue;
      if (b.xMax <= a.xMin + 5) {
        const score = (a.xMin - b.xMax);
        if (!best || score < best.score) best = { neighbor: o, expandDir: "E", score };
      } else if (b.xMin >= a.xMax - 5) {
        const score = (b.xMin - a.xMax);
        if (!best || score < best.score) best = { neighbor: o, expandDir: "W", score };
      }
    } else if (dir === "W") {
      if (b.xMin > a.xMin + 5) continue;
      if (b.yMax <= a.yMin + 5) {
        const score = (a.yMin - b.yMax);
        if (!best || score < best.score) best = { neighbor: o, expandDir: "S", score };
      } else if (b.yMin >= a.yMax - 5) {
        const score = (b.yMin - a.yMax);
        if (!best || score < best.score) best = { neighbor: o, expandDir: "N", score };
      }
    } else {
      if (b.xMax < a.xMax - 5) continue;
      if (b.yMax <= a.yMin + 5) {
        const score = (a.yMin - b.yMax);
        if (!best || score < best.score) best = { neighbor: o, expandDir: "S", score };
      } else if (b.yMin >= a.yMax - 5) {
        const score = (b.yMin - a.yMax);
        if (!best || score < best.score) best = { neighbor: o, expandDir: "N", score };
      }
    }
  }
  return best ? { neighbor: best.neighbor, expandDir: best.expandDir } : null;
}

/**
 * Étend AGRESSIVEMENT le bord d'une pièce vers une cible (pièce ou bord).
 * `targetCoord` = coord cible où le bord doit aller (image px).
 * Cap : 8x bbox initiale.
 *
 * NOUVEAU tour 30 : clamping anti-overlap intelligent — si l'extension
 * candidate chevauche un voisin, on TRONQUE jusqu'à juste avant le voisin
 * (au lieu de fail). Le bord ira aussi loin qu'il peut SANS chevauchement.
 *
 * Renvoie true si le bord a effectivement bougé (>1px), false sinon.
 *
 * Ex : extendRoomEdge(neighbor, "E", room.bbox.xMin) → étend xMax de neighbor
 * jusqu'à room.bbox.xMin (couvre le gap latéralement).
 */
function extendRoomEdge(
  room: RectangleRoom,
  expandDir: Direction,
  targetCoord: number,
  initialBbox: Bbox,
  others: RectangleRoom[] = [],
  foreignLabels: LabelCenter[] = [],
  myLabel?: LabelCenter,
  mySurface?: number,
  foreignSurfaces?: number[],
): boolean {
  const candidate: Bbox = { ...room.bbox };
  const orig = { ...room.bbox };
  if (expandDir === "N") {
    if (targetCoord >= candidate.yMin) return false;
    candidate.yMin = targetCoord;
  } else if (expandDir === "S") {
    if (targetCoord <= candidate.yMax) return false;
    candidate.yMax = targetCoord;
  } else if (expandDir === "W") {
    if (targetCoord >= candidate.xMin) return false;
    candidate.xMin = targetCoord;
  } else {
    if (targetCoord <= candidate.xMax) return false;
    candidate.xMax = targetCoord;
  }

  // Clamping anti-overlap : si chevauche un voisin, tronquer jusqu'à
  // juste avant le voisin (1px de marge).
  for (const o of others) {
    const b = o.bbox;
    if (!bboxesOverlap(candidate, b)) continue;
    if (expandDir === "N") {
      // candidate.yMin a baissé. Tronquer à b.yMax + 1
      // mais seulement si b est dans la zone X de candidate
      const xOv = Math.min(candidate.xMax, b.xMax) - Math.max(candidate.xMin, b.xMin);
      if (xOv <= 1) continue;
      candidate.yMin = Math.max(candidate.yMin, b.yMax + 1);
    } else if (expandDir === "S") {
      const xOv = Math.min(candidate.xMax, b.xMax) - Math.max(candidate.xMin, b.xMin);
      if (xOv <= 1) continue;
      candidate.yMax = Math.min(candidate.yMax, b.yMin - 1);
    } else if (expandDir === "W") {
      const yOv = Math.min(candidate.yMax, b.yMax) - Math.max(candidate.yMin, b.yMin);
      if (yOv <= 1) continue;
      candidate.xMin = Math.max(candidate.xMin, b.xMax + 1);
    } else {
      const yOv = Math.min(candidate.yMax, b.yMax) - Math.max(candidate.yMin, b.yMin);
      if (yOv <= 1) continue;
      candidate.xMax = Math.min(candidate.xMax, b.xMin - 1);
    }
  }

  // s28 tour 31 — Barrière label : ne JAMAIS franchir le centroïde du label
  // d'une autre pièce + Voronoï midpoint cap pondéré sqrt(surface).
  if (foreignLabels.length > 0) {
    clampToForeignLabels(
      candidate, orig, expandDir, foreignLabels, myLabel, mySurface, foreignSurfaces,
    );
  }

  // Vérifier qu'il y a vraiment eu mouvement (>1px) après clamping
  const moved =
    Math.abs(candidate.xMin - orig.xMin) > 1 ||
    Math.abs(candidate.yMin - orig.yMin) > 1 ||
    Math.abs(candidate.xMax - orig.xMax) > 1 ||
    Math.abs(candidate.yMax - orig.yMax) > 1;
  if (!moved) return false;

  // Cap surface : 8x bbox initiale (anti-explosion en cas de label PDF aberrant)
  const newArea = (candidate.xMax - candidate.xMin) * (candidate.yMax - candidate.yMin);
  const initArea = (initialBbox.xMax - initialBbox.xMin) * (initialBbox.yMax - initialBbox.yMin);
  if (initArea > 0 && newArea > initArea * FILL_GAP_MAX_OVER_INITIAL) {
    return false;
  }

  // Vérification finale anti-overlap (au cas où clamping insuffisant)
  for (const o of others) {
    if (bboxesOverlap(candidate, o.bbox)) return false;
  }

  room.bbox = candidate;
  room.polygon = buildRectVerts(candidate);
  room.areaPx2 = polyArea(room.polygon);
  return true;
}

/**
 * Passe finale agressive : pour chaque gap résiduel > 50px, identifier le
 * voisin perpendiculaire et l'étendre (cap 8x) pour combler.
 *
 * Cas tour 29 R+2 :
 *   - Séjour cuisine/W=99px : voisin (Entrée à l'est) ne peut pas combler
 *     car le gap est à l'OUEST de Séjour. On cherche un voisin qui partage
 *     y avec Séjour ET qui est à l'ouest → si trouvé, étendre son E vers
 *     Séjour pour combler.
 *   - Entrée/N=94px, Entrée/E=122px : idem, voisins perpendiculaires.
 */
export function fillRemainingGaps(
  rooms: RectangleRoom[],
  lotPolygon: Pt[],
  walls: Wall[],
  labelCenters: LabelCenter[] = [],
): RectangleRoom[] {
  console.log(`[fillRemainingGaps] ENTRY rooms=${rooms.length}`);
  if (rooms.length === 0) return rooms;
  const lotBbox = lotBoundingBox(lotPolygon);

  // Pool murs (idem enforceTouchInvariant)
  const lotEdges: Wall[] = [];
  for (let i = 0; i < lotPolygon.length; i++) {
    const p = lotPolygon[i];
    const q = lotPolygon[(i + 1) % lotPolygon.length];
    lotEdges.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y });
  }
  const longWalls: Wall[] = walls.filter((w) => {
    const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
    return len >= 200;
  });
  const lotWalls: Wall[] = [...lotEdges, ...longWalls];

  const next = rooms.map((r) => ({
    ...r,
    bbox: { ...r.bbox },
    polygon: r.polygon.map((v) => ({ ...v })),
  }));
  const initialBboxes = next.map((r) => ({ ...r.bbox }));

  let totalFills = 0;

  for (let iter = 0; iter < 4; iter++) {
    let changedThisIter = false;

    for (let i = 0; i < next.length; i++) {
      const room = next[i];
      const others = next.filter((_, j) => j !== i);

      for (const dir of ["N", "S", "W", "E"] as Direction[]) {
        const gap = auditDistanceToTouch(room, dir, others, lotBbox, lotWalls, lotPolygon);
        if (gap <= FILL_GAP_THRESHOLD_PX) continue;

        const a = room.bbox;
        let target: number;
        if (dir === "N") target = a.yMin - gap;
        else if (dir === "S") target = a.yMax + gap;
        else if (dir === "W") target = a.xMin - gap;
        else target = a.xMax + gap;

        // Clamper target dans lotBbox
        if (dir === "N" && target < lotBbox.yMin) target = lotBbox.yMin;
        else if (dir === "S" && target > lotBbox.yMax) target = lotBbox.yMax;
        else if (dir === "W" && target < lotBbox.xMin) target = lotBbox.xMin;
        else if (dir === "E" && target > lotBbox.xMax) target = lotBbox.xMax;

        // s28 tour 31 — labels étrangers pour barrière
        const foreignLabelsForRoom =
          labelCenters.length === next.length
            ? labelCenters.filter((_, j) => j !== i)
            : [];

        const myLabel = labelCenters.length === next.length ? labelCenters[i] : undefined;
        const foreignSurfs = labelCenters.length === next.length
          ? next.filter((_, j) => j !== i).map((rr) => rr.pdfSurfaceM2 ?? 1.0)
          : undefined;
        const mySurf = room.pdfSurfaceM2 ?? 1.0;

        // Tentative 1 : étendre la pièce elle-même (cap 8x, clamping anti-overlap).
        const extended = extendRoomEdge(
          room, dir, target, initialBboxes[i], others, foreignLabelsForRoom, myLabel,
          mySurf, foreignSurfs,
        );
        if (extended) {
          changedThisIter = true;
          totalFills++;
          console.log(
            `[fillGaps] ${room.label}/${dir} étendue (gap=${Math.round(gap)}px)`,
          );
          continue;
        }

        // Tentative 2 : étendre un voisin perpendiculaire pour combler.
        const expandable = findExpandableNeighbor(room, dir, others);
        if (!expandable) {
          console.log(
            `[fillGaps] ${room.label}/${dir} aucune action possible (gap=${Math.round(gap)}px)`,
          );
          continue;
        }
        const { neighbor, expandDir } = expandable;
        const neighborIdx = next.indexOf(neighbor);
        if (neighborIdx === -1) continue;
        let neighborTarget: number;
        if (expandDir === "E") neighborTarget = a.xMin;
        else if (expandDir === "W") neighborTarget = a.xMax;
        else if (expandDir === "S") neighborTarget = a.yMin;
        else neighborTarget = a.yMax;

        // Important : pour le voisin, "others" doit exclure le voisin lui-même
        // mais inclure room (qui n'est PAS dans `others` actuel — on l'a filtré).
        // On reconstruit la liste "tous sauf voisin" :
        const othersForNeighbor = next.filter((_, j) => j !== neighborIdx);
        const foreignLabelsForNeighbor =
          labelCenters.length === next.length
            ? labelCenters.filter((_, j) => j !== neighborIdx)
            : [];
        const neighborLabel =
          labelCenters.length === next.length ? labelCenters[neighborIdx] : undefined;
        const neighborForeignSurfs = labelCenters.length === next.length
          ? next.filter((_, j) => j !== neighborIdx).map((rr) => rr.pdfSurfaceM2 ?? 1.0)
          : undefined;
        const neighborSurf = neighbor.pdfSurfaceM2 ?? 1.0;
        const ok = extendRoomEdge(
          neighbor, expandDir, neighborTarget, initialBboxes[neighborIdx], othersForNeighbor,
          foreignLabelsForNeighbor, neighborLabel, neighborSurf, neighborForeignSurfs,
        );
        if (ok) {
          changedThisIter = true;
          totalFills++;
          console.log(
            `[fillGaps] voisin ${neighbor.label}/${expandDir} étendu vers ${room.label}/${dir} (gap=${Math.round(gap)}px)`,
          );
        } else {
          console.log(
            `[fillGaps] voisin ${neighbor.label}/${expandDir} bloqué (cap ou clamp) — gap résiduel ${Math.round(gap)}px`,
          );
        }
      }
    }

    if (!changedThisIter) break;
  }

  if (totalFills > 0) {
    console.log(`[fillRemainingGaps] ${totalFills} extension(s) finale(s) pour combler gaps`);
  }
  return next;
}

// ─── s28 tour 32 — FORCE MAIN ROOMS TOUCH LOT WALLS ────────────────────
//
// Verbatim Thomas tour 31 :
//   « As tu l'impression que la zone séjour touche le bas du lot? Et qu'il
//     n'y a pas un énorme espace vide? »
//
// Pour chaque pièce principale (PDF ≥ 15 m²), pour chaque direction (N/S/E/W) :
//   1) Trouver le mur du lot dans cette direction (lotBorderInDirection).
//   2) Si le bord de la pièce est à plus de TOUCH_TOL_PX de ce mur ET que
//      le mur est à moins de FORCE_MAX_DIST_PX → étendre la pièce jusqu'au
//      mur du lot, en SHRINKANT les pièces secondaires bloquantes.
//
// Les pièces principales (≥15 m²) ont PRIORITÉ ABSOLUE sur les secondaires
// (<15 m²). Une pièce secondaire qui bloque le passage est shrinkée jusqu'à
// libérer le chemin (mais pas effacée — surface min conservée).
//
// Cette passe TOURNE APRÈS enforceTouchInvariant et fillRemainingGaps.
// Elle override TOUS les caps surface intermédiaires.

const FORCE_MAX_DIST_PX = 400;
/** Surface min en px² qu'on conserve pour une pièce secondaire shrinkée
 *  pour libérer le chemin. ≈ 50% de sa bbox initiale. */
const SECONDARY_MIN_AREA_RATIO = 0.5;
/** Seuil PDF pour qu'une pièce soit considérée "principale". */
const MAIN_ROOM_PDF_THRESHOLD = 15;

/**
 * Pour chaque pièce principale (PDF ≥ 15 m²), force chaque bord à toucher
 * le mur du lot dans cette direction, en shrinkant les bloqueurs secondaires.
 *
 * Principe :
 *  - Pour chaque direction, calculer la cible (mur du lot dans cette direction).
 *  - Identifier les pièces secondaires (PDF < 15 m²) dans le chemin.
 *  - Shrinker ces secondaires (côté opposé à la pièce principale) pour
 *    libérer le passage.
 *  - Étendre la pièce principale jusqu'au mur du lot.
 */
export function forceMainRoomsTouchLotWalls(
  rooms: RectangleRoom[],
  lotPolygon: Pt[],
): RectangleRoom[] {
  if (rooms.length === 0) return rooms;
  const lotBbox = lotBoundingBox(lotPolygon);
  const next = rooms.map((r) => ({
    ...r,
    bbox: { ...r.bbox },
    polygon: r.polygon.map((v) => ({ ...v })),
  }));

  // Index des pièces principales (PDF ≥ 15 m²)
  const mainIdxs: number[] = [];
  for (let i = 0; i < next.length; i++) {
    if ((next[i].pdfSurfaceM2 ?? 0) >= MAIN_ROOM_PDF_THRESHOLD) mainIdxs.push(i);
  }
  if (mainIdxs.length === 0) {
    console.log(`[forceMainRoomsTouchLotWalls] aucune pièce principale ≥${MAIN_ROOM_PDF_THRESHOLD}m²`);
    return next;
  }

  // Sauver les bbox initiales des secondaires (pour cap shrink min surface)
  const initialBboxes: Bbox[] = next.map((r) => ({ ...r.bbox }));

  let totalExtensions = 0;

  // Pour chaque pièce principale, pour chaque direction
  for (const i of mainIdxs) {
    const main = next[i];
    const a = main.bbox;
    const roomCenter = { x: (a.xMin + a.xMax) / 2, y: (a.yMin + a.yMax) / 2 };

    for (const dir of ["N", "S", "E", "W"] as Direction[]) {
      // Cible = mur du lot dans cette direction
      let lotTarget: number;
      if (dir === "N") {
        lotTarget = lotBorderInDirection(lotPolygon, "N", a.xMin, a.xMax, roomCenter, lotBbox.yMin);
      } else if (dir === "S") {
        lotTarget = lotBorderInDirection(lotPolygon, "S", a.xMin, a.xMax, roomCenter, lotBbox.yMax);
      } else if (dir === "W") {
        lotTarget = lotBorderInDirection(lotPolygon, "W", a.yMin, a.yMax, roomCenter, lotBbox.xMin);
      } else {
        lotTarget = lotBorderInDirection(lotPolygon, "E", a.yMin, a.yMax, roomCenter, lotBbox.xMax);
      }

      // Distance signée du bord courant au mur lot
      let dist: number;
      if (dir === "N") dist = a.yMin - lotTarget;
      else if (dir === "S") dist = lotTarget - a.yMax;
      else if (dir === "W") dist = a.xMin - lotTarget;
      else dist = lotTarget - a.xMax;

      // Déjà touche ou trop loin pour forcer (>400px = la pièce n'est
      // pas censée toucher ce mur, ex Séjour vs mur nord opposé)
      if (dist <= TOUCH_TOL_PX) continue;
      if (dist > FORCE_MAX_DIST_PX) continue;

      // Identifier les pièces secondaires bloquantes dans le chemin.
      // "Dans le chemin" = recouvrement perpendiculaire ET situé entre
      // le bord courant et la cible.
      const blockers: number[] = [];
      for (let j = 0; j < next.length; j++) {
        if (j === i) continue;
        const b = next[j].bbox;
        // Pièce principale = jamais shrinkée
        if ((next[j].pdfSurfaceM2 ?? 0) >= MAIN_ROOM_PDF_THRESHOLD) continue;

        let inPath = false;
        if (dir === "N") {
          // Recouvrement X significatif
          const xOv = Math.min(a.xMax, b.xMax) - Math.max(a.xMin, b.xMin);
          if (xOv <= 1) continue;
          // Bloqueur = situé entre lotTarget (au nord) et a.yMin (bord courant)
          inPath = b.yMax > lotTarget && b.yMin < a.yMin;
        } else if (dir === "S") {
          const xOv = Math.min(a.xMax, b.xMax) - Math.max(a.xMin, b.xMin);
          if (xOv <= 1) continue;
          inPath = b.yMin < lotTarget && b.yMax > a.yMax;
        } else if (dir === "W") {
          const yOv = Math.min(a.yMax, b.yMax) - Math.max(a.yMin, b.yMin);
          if (yOv <= 1) continue;
          inPath = b.xMax > lotTarget && b.xMin < a.xMin;
        } else {
          const yOv = Math.min(a.yMax, b.yMax) - Math.max(a.yMin, b.yMin);
          if (yOv <= 1) continue;
          inPath = b.xMin < lotTarget && b.xMax > a.xMax;
        }
        if (inPath) blockers.push(j);
      }

      // Shrinker chaque bloqueur côté opposé à main, pour libérer
      // le chemin. Cap : ne pas descendre sous SECONDARY_MIN_AREA_RATIO
      // de la bbox initiale du bloqueur.
      let pathClear = true;
      for (const bIdx of blockers) {
        const blocker = next[bIdx];
        const bb = blocker.bbox;
        const initB = initialBboxes[bIdx];
        const initArea = (initB.xMax - initB.xMin) * (initB.yMax - initB.yMin);
        const minArea = initArea * SECONDARY_MIN_AREA_RATIO;

        // Direction opposée à main pour pousser le bloqueur
        // (ex : main étend vers S → blocker pousse son yMin vers le sud,
        // côté opposé à main au nord. Mais si blocker est entre main et
        // la cible sud, on pousse son yMax vers la cible (=lotTarget) pour
        // qu'il se compresse contre la cible).
        // Stratégie simple : on collapse le bloqueur dans la direction
        // perpendiculaire à `dir`, en le poussant CONTRE le mur du lot
        // (= libère le chemin pour main).
        const newBlockerBbox = { ...bb };
        if (dir === "N") {
          // Main veut yMin → lotTarget (au nord). Bloqueur entre les deux.
          // On compresse le bloqueur contre lotTarget : son yMax = lotTarget (collé au mur N),
          // son yMin = lotTarget + epsilon ; pas de surface.
          // Approche meilleure : pousser blocker au nord (yMax = a.yMin original
          // = ne change pas) mais réduire son yMin au-dessus pour libérer.
          // En réalité : on veut main.yMin descendre, donc le bloqueur doit
          // aller vers le N (collé au mur N). Son yMax devient juste au-dessus
          // de la nouvelle position visée pour main.yMin, mais comme main.yMin
          // = lotTarget, le bloqueur est COMPLÈTEMENT mangé. Mauvais.
          //
          // Stratégie correcte : déplacer le bloqueur sur le côté (E ou W),
          // hors du chemin de main. Identifier de quel côté de main le
          // centroïde du bloqueur est plus proche, puis pousser hors zone.
          const blockerCx = (bb.xMin + bb.xMax) / 2;
          const blockerCy = (bb.yMin + bb.yMax) / 2;
          // Pousser vers le côté E ou W
          if (blockerCx < (a.xMin + a.xMax) / 2) {
            // Bloqueur à gauche du centre de main → pousser à gauche
            newBlockerBbox.xMax = Math.min(bb.xMax, a.xMin - 2);
          } else {
            newBlockerBbox.xMin = Math.max(bb.xMin, a.xMax + 2);
          }
          void blockerCy;
        } else if (dir === "S") {
          const blockerCx = (bb.xMin + bb.xMax) / 2;
          if (blockerCx < (a.xMin + a.xMax) / 2) {
            newBlockerBbox.xMax = Math.min(bb.xMax, a.xMin - 2);
          } else {
            newBlockerBbox.xMin = Math.max(bb.xMin, a.xMax + 2);
          }
        } else if (dir === "W") {
          const blockerCy = (bb.yMin + bb.yMax) / 2;
          if (blockerCy < (a.yMin + a.yMax) / 2) {
            newBlockerBbox.yMax = Math.min(bb.yMax, a.yMin - 2);
          } else {
            newBlockerBbox.yMin = Math.max(bb.yMin, a.yMax + 2);
          }
        } else {
          const blockerCy = (bb.yMin + bb.yMax) / 2;
          if (blockerCy < (a.yMin + a.yMax) / 2) {
            newBlockerBbox.yMax = Math.min(bb.yMax, a.yMin - 2);
          } else {
            newBlockerBbox.yMin = Math.max(bb.yMin, a.yMax + 2);
          }
        }

        const newW = newBlockerBbox.xMax - newBlockerBbox.xMin;
        const newH = newBlockerBbox.yMax - newBlockerBbox.yMin;
        const newArea = newW * newH;

        // Garde-fou : si le shrink fait passer sous minArea ou rend
        // une dimension <5px, on abandonne (chemin pas libérable
        // sans détruire le bloqueur).
        if (newW < 5 || newH < 5 || newArea < minArea) {
          console.log(
            `[forceMain] ${main.label}/${dir} : bloqueur ${blocker.label} non-shrinkable (newArea=${newArea.toFixed(0)}, min=${minArea.toFixed(0)}) — chemin non libéré`,
          );
          pathClear = false;
          break;
        }

        blocker.bbox = newBlockerBbox;
        blocker.polygon = buildRectVerts(newBlockerBbox);
        blocker.areaPx2 = polyArea(blocker.polygon);
        console.log(
          `[forceMain] ${main.label}/${dir} : shrink bloqueur ${blocker.label} (${(newArea/initArea*100).toFixed(0)}% bbox initiale)`,
        );
      }

      if (!pathClear) continue;

      // Étendre la pièce principale jusqu'au mur du lot
      const newMainBbox = { ...a };
      if (dir === "N") newMainBbox.yMin = lotTarget;
      else if (dir === "S") newMainBbox.yMax = lotTarget;
      else if (dir === "W") newMainBbox.xMin = lotTarget;
      else newMainBbox.xMax = lotTarget;

      // Vérifier qu'on ne chevauche plus aucune pièce après shrink
      let overlapAfter = false;
      for (let j = 0; j < next.length; j++) {
        if (j === i) continue;
        const b = next[j].bbox;
        if (bboxesOverlap(newMainBbox, b)) {
          // Si le voisin est aussi une pièce principale, on respecte (overlap = NO-GO).
          // Si secondaire, on devrait avoir shrinké → si overlap subsiste,
          // on cap l'extension de main au bord du voisin.
          if ((next[j].pdfSurfaceM2 ?? 0) >= MAIN_ROOM_PDF_THRESHOLD) {
            overlapAfter = true;
            break;
          }
          // Cap au voisin secondaire (qui a survécu)
          if (dir === "N" && b.yMax > newMainBbox.yMin) {
            newMainBbox.yMin = Math.max(newMainBbox.yMin, b.yMax + 2);
          } else if (dir === "S" && b.yMin < newMainBbox.yMax) {
            newMainBbox.yMax = Math.min(newMainBbox.yMax, b.yMin - 2);
          } else if (dir === "W" && b.xMax > newMainBbox.xMin) {
            newMainBbox.xMin = Math.max(newMainBbox.xMin, b.xMax + 2);
          } else if (dir === "E" && b.xMin < newMainBbox.xMax) {
            newMainBbox.xMax = Math.min(newMainBbox.xMax, b.xMin - 2);
          }
        }
      }

      if (overlapAfter) {
        console.log(
          `[forceMain] ${main.label}/${dir} : extension annulée (overlap pièce principale)`,
        );
        continue;
      }

      // Vérifier que le bord a effectivement bougé
      const moved = Math.abs(newMainBbox.yMin - a.yMin) > 1 ||
                    Math.abs(newMainBbox.yMax - a.yMax) > 1 ||
                    Math.abs(newMainBbox.xMin - a.xMin) > 1 ||
                    Math.abs(newMainBbox.xMax - a.xMax) > 1;
      if (!moved) continue;

      main.bbox = newMainBbox;
      main.polygon = buildRectVerts(newMainBbox);
      main.areaPx2 = polyArea(main.polygon);
      totalExtensions++;
      console.log(
        `[forceMain] ${main.label}/${dir} ÉTENDU (dist=${dist.toFixed(0)}px → 0px, blockers=${blockers.length})`,
      );

      // Re-update center pour les itérations suivantes (même pièce, autre dir)
      // (a est une référence à main.bbox courante, on doit re-créer)
      const a2 = main.bbox;
      roomCenter.x = (a2.xMin + a2.xMax) / 2;
      roomCenter.y = (a2.yMin + a2.yMax) / 2;
    }
  }

  if (totalExtensions > 0) {
    console.log(
      `[forceMainRoomsTouchLotWalls] ${totalExtensions} extension(s) forcée(s) vers murs lot`,
    );
  }
  return next;
}

// ─── s28 tour 33 — Cap final PDF pour pièces secondaires ─────────────
//
// Auto-critique tour 32 : les passes touch-invariant + forceMainRooms
// peuvent enfler une pièce secondaire (WC, Cellier, Entrée) jusqu'à 4-5×
// sa surface PDF (ratio observé : WC R+1=3.82, WC R+2=4.81). Le label PDF
// est un INDICATEUR pour ces pièces, mais ratio > 2.0 = défaut visuel
// évident.
//
// Cette passe FINALE shrink les secondaires (PDF < 15 m²) au-delà d'un
// cap PDF strict, EN PRESERVANT le label PDF inscrit dans la bbox.
//
// Stratégie :
//   1. Pour chaque secondaire, si ratio actuel > cap → cible = bbox PDF
//      réduite anisotropiquement vers le label.
//   2. Cap par taille :
//      - PDF < 5 m² (très petit : WC, Cell, ECS) : cap 1.20
//      - PDF 5-15 m² (moyen : SDB, Entrée) : cap 1.25
//   3. Shrink uniquement les bords NON adjacents aux pièces voisines
//      (= bords libres ou touchant lot). Si tous bords adjacents → revert.
//   4. Pas de shrink si bbox label ne tient plus dedans.
//
// Verbatim Thomas tour 32 : « WC ratios 2.64 et 4.18 (effets de bord du
// bypass cap PDF) ». Cette passe corrige cet effet de bord.
const FINAL_CAP_SMALL = 1.20; // PDF < 5 m²
const FINAL_CAP_MEDIUM = 1.25; // PDF 5-15 m²
const FINAL_LABEL_MARGIN = 5;  // px : marge autour bbox label à préserver

export function enforceFinalPdfCapForSecondaries(
  rooms: RectangleRoom[],
  scaleM2PerPx2: number,
  labelBboxes: Array<{ xMin: number; yMin: number; xMax: number; yMax: number } | null>,
): RectangleRoom[] {
  if (rooms.length === 0) return rooms;
  const next = rooms.map((r) => ({
    ...r,
    bbox: { ...r.bbox },
    polygon: r.polygon.map((v) => ({ ...v })),
  }));

  let totalShrunk = 0;

  for (let i = 0; i < next.length; i++) {
    const room = next[i];
    const pdf = room.pdfSurfaceM2 ?? 0;
    if (pdf <= 0) continue;
    if (pdf >= MAIN_ROOM_PDF_THRESHOLD) continue; // skip principales

    const currentM2 = room.areaPx2 * scaleM2PerPx2;
    const ratio = currentM2 / pdf;
    const cap = pdf < 5 ? FINAL_CAP_SMALL : FINAL_CAP_MEDIUM;
    if (ratio <= cap) continue;

    // Cible aire en px² : pdf * cap / scale
    const targetAreaPx2 = (pdf * cap) / scaleM2PerPx2;
    const a = room.bbox;
    const currentAreaPx2 = (a.xMax - a.xMin) * (a.yMax - a.yMin);
    if (currentAreaPx2 <= 0) continue;
    const shrinkRatio = Math.sqrt(targetAreaPx2 / currentAreaPx2);
    if (shrinkRatio >= 0.99) continue; // pas besoin

    // s28 tour 33 — TOUS les bords sont éligibles au shrink (pas seulement
    // ceux libres). Quand un voisin est adjacent, le shrink LIBÈRE de
    // l'espace que le voisin pourra absorber via re-enforce ultérieur.
    // Sans cette permissivité, les secondaires entourées de voisins
    // (cas WC/Cellier collés à Entrée + Séjour) ne peuvent pas rétrécir.
    const freeN = true, freeS = true, freeW = true, freeE = true;

    // Limite : bbox label DOIT rester inscrite (avec marge)
    // s28 tour 33 — Si la bbox label est elle-même plus large que la cible
    // (cas WC où "WC 1.3 m²" est groupé en un label de 50×20px alors que
    // PDF=1.3m² ↔ targetArea peut être 35×15px), on RELÂCHE la contrainte :
    // on utilise le centre du label avec une marge fixe (10×10px) pour ne
    // pas sur-contraindre le shrink.
    const lbRaw = labelBboxes[i];
    const lbAreaPx2 = lbRaw
      ? (lbRaw.xMax - lbRaw.xMin) * (lbRaw.yMax - lbRaw.yMin)
      : 0;
    const lbTooLarge = lbRaw && lbAreaPx2 > targetAreaPx2 * 0.6;
    const lb = lbTooLarge && lbRaw
      ? {
          // Centre du label avec marge fixe 10×10px (zone label minimum
          // garantie même si bbox PDF aberrante)
          xMin: (lbRaw.xMin + lbRaw.xMax) / 2 - 10,
          yMin: (lbRaw.yMin + lbRaw.yMax) / 2 - 10,
          xMax: (lbRaw.xMin + lbRaw.xMax) / 2 + 10,
          yMax: (lbRaw.yMin + lbRaw.yMax) / 2 + 10,
        }
      : lbRaw;
    const minXMin = lb ? lb.xMin - FINAL_LABEL_MARGIN : a.xMin + (a.xMax - a.xMin) * 0.4;
    const minXMax = lb ? lb.xMax + FINAL_LABEL_MARGIN : a.xMin + (a.xMax - a.xMin) * 0.6;
    const minYMin = lb ? lb.yMin - FINAL_LABEL_MARGIN : a.yMin + (a.yMax - a.yMin) * 0.4;
    const minYMax = lb ? lb.yMax + FINAL_LABEL_MARGIN : a.yMin + (a.yMax - a.yMin) * 0.6;

    // Surplus à shrinker en px² (largeur+hauteur target)
    const targetW = (a.xMax - a.xMin) * shrinkRatio;
    const targetH = (a.yMax - a.yMin) * shrinkRatio;
    const surplusW = (a.xMax - a.xMin) - targetW;
    const surplusH = (a.yMax - a.yMin) - targetH;

    // Distribuer surplusW : si freeW et freeE, split 50/50 ; sinon shrink le bord libre
    // s28 tour 33 — Logique correcte :
    //   xMin shrink = INCRÉMENTER xMin (réduire taille à gauche).
    //   target_xMin = a.xMin + surplus (où on veut arriver)
    //   On cap par minXMin (borne maximale = label margin) → ne pas dépasser.
    //   On cap par a.xMin (jamais ÉLARGIR vers la gauche).
    // Soit : newXMin = clamp(target_xMin, a.xMin, minXMin).
    // Si minXMin < a.xMin (label déjà très à gauche), pas de shrink possible.
    const newBbox = { ...a };
    if (surplusW > 1) {
      if (freeW && freeE) {
        const targetXMin = a.xMin + surplusW / 2;
        const targetXMax = a.xMax - surplusW / 2;
        if (minXMin > a.xMin) newBbox.xMin = Math.min(targetXMin, minXMin);
        if (minXMax < a.xMax) newBbox.xMax = Math.max(targetXMax, minXMax);
      } else if (freeW) {
        const targetXMin = a.xMin + surplusW;
        if (minXMin > a.xMin) newBbox.xMin = Math.min(targetXMin, minXMin);
      } else if (freeE) {
        const targetXMax = a.xMax - surplusW;
        if (minXMax < a.xMax) newBbox.xMax = Math.max(targetXMax, minXMax);
      }
    }
    if (surplusH > 1) {
      if (freeN && freeS) {
        const targetYMin = a.yMin + surplusH / 2;
        const targetYMax = a.yMax - surplusH / 2;
        if (minYMin > a.yMin) newBbox.yMin = Math.min(targetYMin, minYMin);
        if (minYMax < a.yMax) newBbox.yMax = Math.max(targetYMax, minYMax);
      } else if (freeN) {
        const targetYMin = a.yMin + surplusH;
        if (minYMin > a.yMin) newBbox.yMin = Math.min(targetYMin, minYMin);
      } else if (freeS) {
        const targetYMax = a.yMax - surplusH;
        if (minYMax < a.yMax) newBbox.yMax = Math.max(targetYMax, minYMax);
      }
    }
    // (sanity label déjà géré par les bornes minXMin/minXMax/minYMin/minYMax)

    // Vérif mouvement >= 2px sur au moins un bord
    const moved =
      Math.abs(newBbox.xMin - a.xMin) > 2 ||
      Math.abs(newBbox.xMax - a.xMax) > 2 ||
      Math.abs(newBbox.yMin - a.yMin) > 2 ||
      Math.abs(newBbox.yMax - a.yMax) > 2;
    if (!moved) continue;

    // Anti-chevauchement : si nouveau bbox crée un overlap → revert
    let overlap = false;
    for (let j = 0; j < next.length; j++) {
      if (j === i) continue;
      const b = next[j].bbox;
      if (
        newBbox.xMin < b.xMax && newBbox.xMax > b.xMin &&
        newBbox.yMin < b.yMax && newBbox.yMax > b.yMin
      ) { overlap = true; break; }
    }
    if (overlap) continue;

    // Capture deltas pour extension des voisins
    const deltaXMin = newBbox.xMin - a.xMin; // > 0 si shrink à gauche
    const deltaXMax = a.xMax - newBbox.xMax; // > 0 si shrink à droite
    const deltaYMin = newBbox.yMin - a.yMin;
    const deltaYMax = a.yMax - newBbox.yMax;

    room.bbox = newBbox;
    room.polygon = buildRectVerts(newBbox);
    room.areaPx2 = polyArea(room.polygon);
    const newM2 = room.areaPx2 * scaleM2PerPx2;
    totalShrunk++;
    console.log(
      `[finalCapPdf] ${room.label} shrink ratio ${ratio.toFixed(2)} → ${(newM2/pdf).toFixed(2)} (PDF=${pdf.toFixed(1)}m², cap=${cap})`,
    );

    // s28 tour 33 — Étendre les voisins pour combler l'espace libéré.
    // Pour chaque bord shrinké, identifier le voisin adjacent à ce bord
    // (ancienne adjacency) et étendre son bord opposé du delta.
    if (deltaXMin > 1) {
      // Bord W de room s'est déplacé vers la droite de deltaXMin → étendre
      // le voisin dont le bord E touchait l'ancien xMin de room (=a.xMin).
      for (let j = 0; j < next.length; j++) {
        if (j === i) continue;
        const nb = next[j].bbox;
        // Voisin avec bord E à ≤3px de a.xMin et overlap Y avec room
        if (Math.abs(nb.xMax - a.xMin) <= 3) {
          const ovY = Math.min(nb.yMax, a.yMax) - Math.max(nb.yMin, a.yMin);
          if (ovY > 1) {
            // Étendre xMax du voisin jusqu'à newBbox.xMin
            const nbExtended = { ...nb, xMax: newBbox.xMin };
            // Anti-overlap avec d'autres voisins
            let canExtend = true;
            for (let k = 0; k < next.length; k++) {
              if (k === j || k === i) continue;
              const c = next[k].bbox;
              if (
                nbExtended.xMin < c.xMax && nbExtended.xMax > c.xMin &&
                nbExtended.yMin < c.yMax && nbExtended.yMax > c.yMin
              ) { canExtend = false; break; }
            }
            if (canExtend) {
              next[j].bbox = nbExtended;
              next[j].polygon = buildRectVerts(nbExtended);
              next[j].areaPx2 = polyArea(next[j].polygon);
            }
          }
        }
      }
    }
    if (deltaXMax > 1) {
      for (let j = 0; j < next.length; j++) {
        if (j === i) continue;
        const nb = next[j].bbox;
        if (Math.abs(nb.xMin - a.xMax) <= 3) {
          const ovY = Math.min(nb.yMax, a.yMax) - Math.max(nb.yMin, a.yMin);
          if (ovY > 1) {
            const nbExtended = { ...nb, xMin: newBbox.xMax };
            let canExtend = true;
            for (let k = 0; k < next.length; k++) {
              if (k === j || k === i) continue;
              const c = next[k].bbox;
              if (
                nbExtended.xMin < c.xMax && nbExtended.xMax > c.xMin &&
                nbExtended.yMin < c.yMax && nbExtended.yMax > c.yMin
              ) { canExtend = false; break; }
            }
            if (canExtend) {
              next[j].bbox = nbExtended;
              next[j].polygon = buildRectVerts(nbExtended);
              next[j].areaPx2 = polyArea(next[j].polygon);
            }
          }
        }
      }
    }
    if (deltaYMin > 1) {
      for (let j = 0; j < next.length; j++) {
        if (j === i) continue;
        const nb = next[j].bbox;
        if (Math.abs(nb.yMax - a.yMin) <= 3) {
          const ovX = Math.min(nb.xMax, a.xMax) - Math.max(nb.xMin, a.xMin);
          if (ovX > 1) {
            const nbExtended = { ...nb, yMax: newBbox.yMin };
            let canExtend = true;
            for (let k = 0; k < next.length; k++) {
              if (k === j || k === i) continue;
              const c = next[k].bbox;
              if (
                nbExtended.xMin < c.xMax && nbExtended.xMax > c.xMin &&
                nbExtended.yMin < c.yMax && nbExtended.yMax > c.yMin
              ) { canExtend = false; break; }
            }
            if (canExtend) {
              next[j].bbox = nbExtended;
              next[j].polygon = buildRectVerts(nbExtended);
              next[j].areaPx2 = polyArea(next[j].polygon);
            }
          }
        }
      }
    }
    if (deltaYMax > 1) {
      for (let j = 0; j < next.length; j++) {
        if (j === i) continue;
        const nb = next[j].bbox;
        if (Math.abs(nb.yMin - a.yMax) <= 3) {
          const ovX = Math.min(nb.xMax, a.xMax) - Math.max(nb.xMin, a.xMin);
          if (ovX > 1) {
            const nbExtended = { ...nb, yMin: newBbox.yMax };
            let canExtend = true;
            for (let k = 0; k < next.length; k++) {
              if (k === j || k === i) continue;
              const c = next[k].bbox;
              if (
                nbExtended.xMin < c.xMax && nbExtended.xMax > c.xMin &&
                nbExtended.yMin < c.yMax && nbExtended.yMax > c.yMin
              ) { canExtend = false; break; }
            }
            if (canExtend) {
              next[j].bbox = nbExtended;
              next[j].polygon = buildRectVerts(nbExtended);
              next[j].areaPx2 = polyArea(next[j].polygon);
            }
          }
        }
      }
    }
  }

  if (totalShrunk > 0) {
    console.log(`[enforceFinalPdfCapForSecondaries] ${totalShrunk} pièce(s) secondaire(s) shrinkée(s) au cap PDF`);
  }
  return next;
}

// ─── s28 tour 33 — Re-grow pour pièces sous-dimensionnées ────────────
//
// Auto-critique tour 32 : SdB RDC ratio 0.70 et Chambre 02 R+3 ratio 0.78
// sont sous-dimensionnées (< 0.85 cap-bas audit). Cause : enforceLabelOwnership
// (Voronoï) a shrinké leur bbox pour exclure un label voisin.
//
// Cette passe re-grow chaque pièce avec ratio < 0.85 :
//   1. Calcule le gap dans chaque direction (vers voisin ou lot bbox)
//   2. Étend les bords avec gap > 3px proportionnellement
//   3. Cap : ratio cible 0.95 (sous le seuil 1.0 pour éviter cap-haut)
//   4. Anti-overlap : ne franchit JAMAIS le label (zone label élargie 5px)
//      d'une autre pièce.
const REGROW_TARGET_RATIO = 0.95;
const REGROW_MIN_RATIO_TRIGGER = 0.85;

export function growUnderSizedRooms(
  rooms: RectangleRoom[],
  scaleM2PerPx2: number,
  lotPolygon: Pt[],
  labelCenters: LabelCenter[] = [],
): RectangleRoom[] {
  if (rooms.length === 0) return rooms;
  const lotBbox = lotBoundingBox(lotPolygon);
  const next = rooms.map((r) => ({
    ...r,
    bbox: { ...r.bbox },
    polygon: r.polygon.map((v) => ({ ...v })),
  }));

  let totalGrown = 0;

  for (let i = 0; i < next.length; i++) {
    const room = next[i];
    const pdf = room.pdfSurfaceM2 ?? 0;
    if (pdf <= 0) continue;

    const currentM2 = room.areaPx2 * scaleM2PerPx2;
    const ratio = currentM2 / pdf;
    if (ratio >= REGROW_MIN_RATIO_TRIGGER) continue;

    const targetArea = (pdf * REGROW_TARGET_RATIO) / scaleM2PerPx2;
    const a = room.bbox;
    const wA = a.xMax - a.xMin;
    const hA = a.yMax - a.yMin;

    // Gap dans chaque direction = distance jusqu'au voisin ou lot bbox
    function gapInDir(dir: "N" | "S" | "W" | "E"): number {
      let limit: number;
      if (dir === "N") limit = lotBbox.yMin;
      else if (dir === "S") limit = lotBbox.yMax;
      else if (dir === "W") limit = lotBbox.xMin;
      else limit = lotBbox.xMax;

      for (let j = 0; j < next.length; j++) {
        if (j === i) continue;
        const b = next[j].bbox;
        const ovX = Math.min(a.xMax, b.xMax) - Math.max(a.xMin, b.xMin);
        const ovY = Math.min(a.yMax, b.yMax) - Math.max(a.yMin, b.yMin);
        if (dir === "N" || dir === "S") {
          if (ovX <= 1) continue;
          if (dir === "N" && b.yMax <= a.yMin + 1 && b.yMax > limit) limit = b.yMax;
          if (dir === "S" && b.yMin >= a.yMax - 1 && b.yMin < limit) limit = b.yMin;
        } else {
          if (ovY <= 1) continue;
          if (dir === "W" && b.xMax <= a.xMin + 1 && b.xMax > limit) limit = b.xMax;
          if (dir === "E" && b.xMin >= a.xMax - 1 && b.xMin < limit) limit = b.xMin;
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

    if (gN < 3 && gS < 3 && gW < 3 && gE < 3) continue; // pas d'espace libre

    // Cible : grandir vers targetArea en distribuant aux bords libres.
    const newBbox = { ...a };

    // Étendre H (N+S) si gap dispo
    if (gN > 3 || gS > 3) {
      const targetH = Math.min(targetArea / wA, hA + gN + gS);
      const totalGrow = Math.max(0, targetH - hA);
      const totalAvail = gN + gS;
      if (totalAvail > 0) {
        const growN = (gN / totalAvail) * totalGrow;
        const growS = (gS / totalAvail) * totalGrow;
        newBbox.yMin -= Math.min(gN, growN);
        newBbox.yMax += Math.min(gS, growS);
      }
    }

    // Si encore sous-dim, étendre W+E
    const newH = newBbox.yMax - newBbox.yMin;
    const currentAreaAfter = wA * newH;
    if (currentAreaAfter < targetArea && (gW > 3 || gE > 3)) {
      const targetW = Math.min(targetArea / newH, wA + gW + gE);
      const totalGrowW = Math.max(0, targetW - wA);
      const totalAvailW = gW + gE;
      if (totalAvailW > 0) {
        const growW = (gW / totalAvailW) * totalGrowW;
        const growE = (gE / totalAvailW) * totalGrowW;
        newBbox.xMin -= Math.min(gW, growW);
        newBbox.xMax += Math.min(gE, growE);
      }
    }

    // Anti-franchissement labels d'autres pièces
    let labelClash = false;
    for (let j = 0; j < labelCenters.length; j++) {
      if (j === i) continue;
      const lc = labelCenters[j];
      if (
        lc.x > newBbox.xMin - LABEL_BARRIER_MARGIN_PX &&
        lc.x < newBbox.xMax + LABEL_BARRIER_MARGIN_PX &&
        lc.y > newBbox.yMin - LABEL_BARRIER_MARGIN_PX &&
        lc.y < newBbox.yMax + LABEL_BARRIER_MARGIN_PX
      ) { labelClash = true; break; }
    }
    if (labelClash) continue;

    // Anti-overlap final
    let overlap = false;
    for (let j = 0; j < next.length; j++) {
      if (j === i) continue;
      const b = next[j].bbox;
      if (
        newBbox.xMin < b.xMax - 1 && newBbox.xMax > b.xMin + 1 &&
        newBbox.yMin < b.yMax - 1 && newBbox.yMax > b.yMin + 1
      ) { overlap = true; break; }
    }
    if (overlap) continue;

    const newArea = (newBbox.xMax - newBbox.xMin) * (newBbox.yMax - newBbox.yMin);
    const oldArea = wA * hA;
    if (newArea / oldArea < 1.02) continue; // pas de mouvement significatif

    room.bbox = newBbox;
    room.polygon = buildRectVerts(newBbox);
    room.areaPx2 = polyArea(room.polygon);
    const newM2 = room.areaPx2 * scaleM2PerPx2;
    totalGrown++;
    console.log(
      `[growUnderSized] ${room.label} ratio ${ratio.toFixed(2)} → ${(newM2/pdf).toFixed(2)} (PDF=${pdf.toFixed(1)}m²)`,
    );
  }

  if (totalGrown > 0) {
    console.log(`[growUnderSizedRooms] ${totalGrown} pièce(s) re-grandie(s) (ratio < ${REGROW_MIN_RATIO_TRIGGER})`);
  }
  return next;
}
