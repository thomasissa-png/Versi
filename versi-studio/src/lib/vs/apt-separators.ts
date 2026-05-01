/**
 * Module s28 (tour 8) — Détection des murs SÉPARATEURS d'appartements.
 *
 * Problème résolu :
 *   Sur un plan d'étage qui contient PLUSIEURS appartements (ex. R+1 Muguets =
 *   T2 + T3), les flood-fills depuis un label de pièce traversent la cloison
 *   séparatrice si elle a une porte palière ouverte ou un trait fin → un seul
 *   "Séjour" envahit l'apt voisin, la chambre voisine se rétrécit à 5m².
 *
 * Solution :
 *   Avant flood-fill, détecter les cloisons inter-appartements (longues,
 *   orthogonales aux axes principaux, traversantes — endpoints sur les murs
 *   externes du lot) et les RENFORCER dans la grille (épaississement +3px)
 *   pour créer des barrières infranchissables.
 *
 * Algorithme :
 *   1. Filtrer les segments dans le polygone du lot.
 *   2. Filtrer les segments "longs" (≥ minLengthRatio × diagonale_lot).
 *   3. Filtrer ceux orthogonaux à un axe principal (0°/90° ± angleTol).
 *   4. Filtrer ceux dont les DEUX endpoints touchent le polygone lot
 *      (vrais séparateurs traversants, pas cloisons internes d'apt).
 *   5. Retourner ces segments comme apt-separators.
 *
 * Si 0 séparateurs trouvés → 1 seul appartement, pas de modification.
 */

export type WallSegment = { x1: number; y1: number; x2: number; y2: number };
export type Vertex = { x: number; y: number };

export type AptSeparatorOptions = {
  /** Ratio min longueur séparateur / diagonale lot. Défaut 0.30 (30%). */
  minLengthRatio?: number;
  /** Tolérance angulaire (degrés) pour considérer un segment orthogonal. */
  angleTolDeg?: number;
  /** Distance max (px) entre endpoint et le polygone lot pour considérer "touchant". */
  endpointToLotTolPx?: number;
};

/**
 * Détecte les murs séparateurs d'appartements parmi un set de murs.
 *
 * Garanties :
 *   - Retourne [] si aucun séparateur évident (1 seul apt).
 *   - Retourne tous les segments candidats (peut y en avoir plusieurs si
 *     l'étage a 3+ apts).
 *   - Ne modifie jamais les segments d'entrée.
 */
export function detectAptSeparators(
  walls: WallSegment[],
  lotPolygon: Vertex[],
  options: AptSeparatorOptions = {},
): WallSegment[] {
  if (walls.length === 0 || lotPolygon.length < 3) return [];
  const minLengthRatio = options.minLengthRatio ?? 0.30;
  const angleTolDeg = options.angleTolDeg ?? 5;
  const endpointTol = options.endpointToLotTolPx ?? 25;

  // Diagonale du lot = √(W² + H²)
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const p of lotPolygon) {
    if (p.x < bx0) bx0 = p.x;
    if (p.y < by0) by0 = p.y;
    if (p.x > bx1) bx1 = p.x;
    if (p.y > by1) by1 = p.y;
  }
  const lotDiag = Math.hypot(bx1 - bx0, by1 - by0);
  const minLen = lotDiag * minLengthRatio;

  // Axes principaux : 0° (horizontal) et 90° (vertical) en coords image.
  // On ne fait pas de détection robuste de l'axe principal du PDF parce que
  // sur les plans archi, l'axe principal EST aligné aux axes image (les
  // plans sont produits orientés grille). Si futur plan en biais, étendre.
  const isOrthogonal = (segAngleDeg: number): boolean => {
    // angle ∈ [0, 180) ; orthogonal si proche de 0 ou 90
    const a = ((segAngleDeg % 180) + 180) % 180;
    return a <= angleTolDeg || Math.abs(a - 90) <= angleTolDeg ||
           Math.abs(a - 180) <= angleTolDeg;
  };

  // Distance d'un point au polygone (min sur toutes les arêtes).
  const distPointToPolygon = (px: number, py: number): number => {
    let best = Infinity;
    for (let k = 0; k < lotPolygon.length; k++) {
      const a = lotPolygon[k];
      const b = lotPolygon[(k + 1) % lotPolygon.length];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      if (len2 < 1e-6) continue;
      const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len2));
      const projX = a.x + t * dx;
      const projY = a.y + t * dy;
      const d = Math.hypot(px - projX, py - projY);
      if (d < best) best = d;
    }
    return best;
  };

  // Point-in-polygon (utilisé pour vérifier que le segment passe DANS le lot)
  const pip = (px: number, py: number): boolean => {
    let inside = false;
    for (let i = 0, j = lotPolygon.length - 1; i < lotPolygon.length; j = i++) {
      const xi = lotPolygon[i].x, yi = lotPolygon[i].y;
      const xj = lotPolygon[j].x, yj = lotPolygon[j].y;
      const inter = (yi > py) !== (yj > py) &&
        px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
      if (inter) inside = !inside;
    }
    return inside;
  };

  // Pré-cache : tous les segments orthogonaux et longs (utilisés pour
  // déterminer si un endpoint d'un candidat « touche un autre long mur »).
  const longOrthoSegs: WallSegment[] = walls.filter((w) => {
    const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
    if (len < minLen * 0.4) return false; // critère plus permissif pour les "ancrages"
    const angleDeg = Math.atan2(w.y2 - w.y1, w.x2 - w.x1) * 180 / Math.PI;
    return isOrthogonal(angleDeg);
  });
  // Distance d'un point à un set de segments (min)
  const distPointToSegments = (px: number, py: number, segs: WallSegment[]): number => {
    let best = Infinity;
    for (const s of segs) {
      const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
      const len2 = dx * dx + dy * dy;
      if (len2 < 1e-6) continue;
      const t = Math.max(0, Math.min(1, ((px - s.x1) * dx + (py - s.y1) * dy) / len2));
      const projX = s.x1 + t * dx;
      const projY = s.y1 + t * dy;
      const d = Math.hypot(px - projX, py - projY);
      if (d < best) best = d;
    }
    return best;
  };

  const candidates: Array<WallSegment & { length: number; midInside: boolean }> = [];
  for (const w of walls) {
    const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
    if (len < minLen) continue;
    const angleDeg = Math.atan2(w.y2 - w.y1, w.x2 - w.x1) * 180 / Math.PI;
    if (!isOrthogonal(angleDeg)) continue;
    // Les 2 endpoints doivent toucher SOIT le polygone lot externe SOIT un
    // autre mur long orthogonal (mur en T : la cloison séparatrice peut
    // s'arrêter sur un mur interne perpendiculaire, pas seulement sur le mur
    // externe du lot).
    // Pour exclure ce mur lui-même de la liste, on filtre par distance >= 1px
    // entre l'endpoint et lui-même (mais en pratique le min sera 0 sur ses
    // propres endpoints — ce qui est fine puisque len2 = 0 → skip).
    const otherSegs = longOrthoSegs.filter((s) => s !== w);
    const d1Lot = distPointToPolygon(w.x1, w.y1);
    const d2Lot = distPointToPolygon(w.x2, w.y2);
    const d1Ortho = distPointToSegments(w.x1, w.y1, otherSegs);
    const d2Ortho = distPointToSegments(w.x2, w.y2, otherSegs);
    const ep1Anchored = d1Lot <= endpointTol || d1Ortho <= endpointTol;
    const ep2Anchored = d2Lot <= endpointTol || d2Ortho <= endpointTol;
    if (!ep1Anchored || !ep2Anchored) continue;
    // Le milieu du segment doit être DANS le polygone (le segment traverse).
    const mx = (w.x1 + w.x2) / 2;
    const my = (w.y1 + w.y2) / 2;
    const midInside = pip(mx, my);
    if (!midInside) continue;
    candidates.push({ ...w, length: len, midInside });
  }
  // Tri descendant par longueur (séparateurs les plus longs en premier)
  candidates.sort((a, b) => b.length - a.length);
  // Dedup : segments quasi-colinéaires et chevauchants → garder le plus long
  const kept: typeof candidates = [];
  const isOverlap = (a: WallSegment, b: WallSegment): boolean => {
    // Mêmes orientation et axe ?
    const angleA = Math.atan2(a.y2 - a.y1, a.x2 - a.x1) * 180 / Math.PI;
    const angleB = Math.atan2(b.y2 - b.y1, b.x2 - b.x1) * 180 / Math.PI;
    const angleDiff = Math.abs(((angleA - angleB) % 180 + 180) % 180);
    if (angleDiff > 5 && Math.abs(angleDiff - 180) > 5) return false;
    // Distance médiane : si midpoints très proches → même mur
    const mxA = (a.x1 + a.x2) / 2, myA = (a.y1 + a.y2) / 2;
    const mxB = (b.x1 + b.x2) / 2, myB = (b.y1 + b.y2) / 2;
    return Math.hypot(mxA - mxB, myA - myB) < 30;
  };
  for (const c of candidates) {
    if (kept.some((k) => isOverlap(k, c))) continue;
    kept.push(c);
  }
  return kept.map((c) => ({ x1: c.x1, y1: c.y1, x2: c.x2, y2: c.y2 }));
}

/**
 * Épaissit une liste de segments dans une grille (Uint8Array W*H).
 * Trace chaque segment avec un pinceau circulaire de rayon `thickness`.
 *
 * Utilisé pour renforcer les murs apt-separators dans la wallMask AVANT
 * flood-fill : le passage devient infranchissable.
 */
export function thickenWallsInGrid(
  grid: Uint8Array,
  width: number,
  height: number,
  walls: WallSegment[],
  thickness: number,
): void {
  for (const w of walls) {
    const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
    const steps = Math.max(Math.abs(dx), Math.abs(dy)) | 0;
    if (steps === 0) continue;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const cx = Math.round(w.x1 + dx * t);
      const cy = Math.round(w.y1 + dy * t);
      const t2 = thickness * thickness;
      for (let oy = -thickness; oy <= thickness; oy++) {
        for (let ox = -thickness; ox <= thickness; ox++) {
          if (ox * ox + oy * oy > t2) continue;
          const px = cx + ox, py = cy + oy;
          if (px < 0 || px >= width || py < 0 || py >= height) continue;
          grid[py * width + px] = 1;
        }
      }
    }
  }
}

/**
 * Calibrage du scale m²/px² basé sur les VALEURS écrites sur le PDF.
 *
 * Pour chaque pièce qui a (a) un polygone calculé et (b) une surface_m2 lue
 * SUR le PDF (via pdf-text-extractor), on calcule :
 *     k_i = surface_m2_i / polygon_area_px2_i
 *
 * On retourne la médiane de ces k_i (robuste aux outliers).
 *
 * Garanties :
 *   - 0 si pas assez de pièces avec surface PDF (< 2).
 *   - Médiane (pas moyenne) → résistant aux pièces fusionnées par flood-fill
 *     qui faussent leur k.
 */
export function calibrateScaleFromPdfLabels(
  rooms: Array<{ areaPx2: number; surface_m2: number | null }>,
): number {
  const ks: number[] = [];
  for (const r of rooms) {
    if (r.surface_m2 == null || r.surface_m2 <= 0) continue;
    if (r.areaPx2 <= 0 || !Number.isFinite(r.areaPx2)) continue;
    const k = r.surface_m2 / r.areaPx2;
    if (k > 0 && Number.isFinite(k)) ks.push(k);
  }
  if (ks.length < 2) return 0;
  ks.sort((a, b) => a - b);
  return ks[Math.floor(ks.length / 2)];
}
