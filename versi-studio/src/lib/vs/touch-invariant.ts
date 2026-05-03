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

// ─── Types ─────────────────────────────────────────────────────────

type Bbox = { xMin: number; yMin: number; xMax: number; yMax: number };

type Direction = "N" | "S" | "E" | "W";

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

        // Tentative 1 : étendre la pièce elle-même (cap 8x, clamping anti-overlap).
        const extended = extendRoomEdge(room, dir, target, initialBboxes[i], others);
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
        const ok = extendRoomEdge(
          neighbor, expandDir, neighborTarget, initialBboxes[neighborIdx], othersForNeighbor,
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
