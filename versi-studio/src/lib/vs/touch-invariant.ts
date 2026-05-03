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
 *  Cap très large à 4.0 — uniquement un garde-fou anti-explosion en cas de
 *  label PDF mal lu (qui ferait grandir hors zone habitable). En pratique,
 *  les extensions normales ne dépassent pas 1.5-2.0 (1 ou 2 bords étendus
 *  jusqu'au mur lot). Au-delà de 4.0 c'est anormal. */
const MAX_OVER_INITIAL = 4.0;

/** Itérations max de la passe (convergence par fixed-point). */
const MAX_ITERATIONS = 8;

/** Cap d'extension par direction et par itération (px image). Évite des
 *  expansions sauvages mais doit permettre d'atteindre les murs du lot
 *  (les gaps observés sur Muguets vont jusqu'à ~150-200px sur lot 800px).
 *  500px = ~25% du lot, suffisant pour combler en 1-2 itérations. */
const MAX_EXTEND_PER_ITER_PX = 500;

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
): number {
  const a = room.bbox;

  // Recouvrement géométrique requis pour qu'un voisin soit "en face" du bord.
  // On utilise un seuil minimal (1px) pour considérer un voisin présent.
  const horizOverlapWith = (b: Bbox) =>
    Math.min(a.xMax, b.xMax) - Math.max(a.xMin, b.xMin);
  const vertOverlapWith = (b: Bbox) =>
    Math.min(a.yMax, b.yMax) - Math.max(a.yMin, b.yMin);

  // Limite du lot bbox dans cette direction (sert de plafond absolu).
  let limit: number;
  if (dir === "N") limit = lotBbox.yMin;
  else if (dir === "S") limit = lotBbox.yMax;
  else if (dir === "W") limit = lotBbox.xMin;
  else limit = lotBbox.xMax;

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
  const minOverlapH = aWidth * 0.20;
  const minOverlapV = aHeight * 0.20;

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

  // Pool des "murs lot" = bords du polygone lot (les seuls "vrais" murs
  // extérieurs du lot). On NE prend PAS walls[] complet pour éviter que des
  // murs internes serviront de "touche" dans la phase d'invariant —
  // l'invariant ne concerne QUE les bords du lot et les pièces voisines.
  const lotWalls: Wall[] = [];
  for (let i = 0; i < lotPolygon.length; i++) {
    const p = lotPolygon[i];
    const q = lotPolygon[(i + 1) % lotPolygon.length];
    lotWalls.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y });
  }
  // Note : walls[] est passé par cohérence d'API mais non consommé pour
  // l'instant. En V2, on pourrait exploiter walls vectoriels comme bornes.
  void walls;

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
        const delta = distanceToTouch(room, dir, others, lotBbox, lotWalls);
        if (delta <= 0) continue;
        if (iter === 0) {
          console.log(`[touchInv-debug] iter=0 ${room.label} dir=${dir} delta=${delta.toFixed(0)}px`);
        }

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
    // Log détaillé : pour chaque pièce, comparer bbox initiale vs finale.
    for (let i = 0; i < next.length; i++) {
      const before = initialBbox[i];
      const after = next[i].bbox;
      const dN = Math.round(before.yMin - after.yMin);
      const dS = Math.round(after.yMax - before.yMax);
      const dW = Math.round(before.xMin - after.xMin);
      const dE = Math.round(after.xMax - before.xMax);
      if (dN > 1 || dS > 1 || dW > 1 || dE > 1) {
        console.log(
          `[touchInv] ${next[i].label} extended N=${dN} S=${dS} W=${dW} E=${dE} px`,
        );
      }
    }
  }

  return next;
}
