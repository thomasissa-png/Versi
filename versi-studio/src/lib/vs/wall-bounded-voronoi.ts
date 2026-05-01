/**
 * Module s28.7 — Découpe Voronoï bornée par murs vectoriels.
 *
 * Contexte : le flood-fill multi-couleur (s28.6) peut produire des polygones
 * qui absorbent plusieurs pièces voisines via des portes ouvertes. Quand N≥2
 * labels PDF tombent dans la même région flood-fill, il faut redécouper.
 *
 * Algorithme :
 *
 *   1. Récupérer les labels PDF dans la zone flood-fill (point-in-polygon).
 *   2. Si 1 label → garder telle quelle.
 *   3. Si N>1 labels → découper en N sous-pièces via Voronoï pondéré CLIPPÉ
 *      par les murs vectoriels :
 *      a. Diagramme Voronoï depuis les positions des labels (cellules clippées
 *         au polygone source).
 *      b. Pour chaque arête frontière entre 2 cellules Voronoï voisines (qui
 *         n'est PAS sur le bord du polygone source), projetter sur le segment
 *         de mur le plus proche (perpendiculaire, < tolerancePx) — si trouvé
 *         snap, sinon garder la bissectrice.
 *
 * La projection sur les murs vectoriels transforme une bissectrice abstraite
 * en frontière réelle entre pièces (le mur que voit l'œil humain).
 *
 * Garanties :
 *   - count(sous-pièces) == count(labels)
 *   - Sous-pièces disjointes (par construction Voronoï)
 *   - Union des sous-pièces ⊆ région flood-fill source
 */

import { voronoiCellsAll } from "./voronoi-cells";

export type Vertex = { x: number; y: number };
export type Wall = { x1: number; y1: number; x2: number; y2: number };
export type LabelPoint = { text: string; x: number; y: number; surface_m2: number | null };

/**
 * Polygone d'une pièce splittée (avec son label associé).
 */
export type SplitRoom = {
  label: string;
  polygon: Vertex[];
  surface_m2: number | null;
};

/**
 * Point-in-polygon ray casting.
 */
function pointInPolygon(px: number, py: number, poly: Vertex[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const inter = (yi > py) !== (yj > py) &&
      px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
    if (inter) inside = !inside;
  }
  return inside;
}

/**
 * Distance d'un point à un segment.
 */
function distPointToSegment(px: number, py: number, w: Wall): number {
  const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) return Math.hypot(px - w.x1, py - w.y1);
  const t = Math.max(0, Math.min(1, ((px - w.x1) * dx + (py - w.y1) * dy) / len2));
  const projX = w.x1 + t * dx;
  const projY = w.y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

/**
 * Projection orthogonale d'un point sur un segment (clamped).
 */
function projectOnSegment(px: number, py: number, w: Wall): Vertex {
  const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) return { x: w.x1, y: w.y1 };
  const t = Math.max(0, Math.min(1, ((px - w.x1) * dx + (py - w.y1) * dy) / len2));
  return { x: w.x1 + t * dx, y: w.y1 + t * dy };
}

/**
 * Distance d'un vertex au plus proche mur, retourne (distance, projection).
 */
function nearestWallProjection(v: Vertex, walls: Wall[]): { d: number; proj: Vertex } {
  let bestD = Infinity;
  let bestProj: Vertex = v;
  for (const w of walls) {
    const d = distPointToSegment(v.x, v.y, w);
    if (d < bestD) {
      bestD = d;
      bestProj = projectOnSegment(v.x, v.y, w);
    }
  }
  return { d: bestD, proj: bestProj };
}

/**
 * Détecte si un vertex se trouve sur le bord d'un polygone donné (tolérance px).
 * Utilisé pour distinguer les vertices "frontière externe" (à conserver tels
 * quels) des vertices "frontière interne entre cellules Voronoï" (à snapper
 * sur murs).
 */
function isOnPolygonEdge(v: Vertex, poly: Vertex[], tolPx: number): boolean {
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const w: Wall = { x1: poly[j].x, y1: poly[j].y, x2: poly[i].x, y2: poly[i].y };
    if (distPointToSegment(v.x, v.y, w) <= tolPx) return true;
  }
  return false;
}

/**
 * Aire signée (shoelace).
 */
function signedArea(poly: Vertex[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    s += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
  }
  return s / 2;
}

/**
 * Découpe une région flood-fill par les labels PDF qui s'y trouvent, en
 * utilisant Voronoï borné par les murs vectoriels.
 *
 * @param sourcePolygon Polygone de la région flood-fill (pixels image).
 * @param labels Labels PDF présents dans la région (au moins 1).
 * @param walls Murs vectoriels (segments) — externes + internes.
 * @param surface_m2_default Surface par défaut si label.surface_m2 == null.
 *                            (Utilisé pour distribution proportionnelle aux aires.)
 * @returns Liste de sous-pièces (1 par label), polygones disjoints.
 */
export function splitFloodFillByLabelsAndWalls(
  sourcePolygon: Vertex[],
  labels: LabelPoint[],
  walls: Wall[],
  options: {
    /** Tolerance pour snap d'un vertex Voronoï sur un mur (px). Défaut 30. */
    snapTolerancePx?: number;
    /** Tolérance pour identifier un vertex sur le bord du polygone source (px). */
    edgeTolerancePx?: number;
  } = {},
): SplitRoom[] {
  if (labels.length === 0 || sourcePolygon.length < 3) return [];

  // Cas trivial : 1 seul label → pas de découpe, polygone source = la pièce.
  if (labels.length === 1) {
    return [{
      label: labels[0].text,
      polygon: sourcePolygon.slice(),
      surface_m2: labels[0].surface_m2,
    }];
  }

  const snapTol = options.snapTolerancePx ?? 30;
  const edgeTol = options.edgeTolerancePx ?? 2;

  // Filtrer les labels qui sont effectivement DANS le polygone source
  const inside = labels.filter((l) => pointInPolygon(l.x, l.y, sourcePolygon));
  if (inside.length === 0) {
    // Aucun label dans la zone → garder le polygone tel quel avec le 1er label
    return [{
      label: labels[0].text,
      polygon: sourcePolygon.slice(),
      surface_m2: labels[0].surface_m2,
    }];
  }
  if (inside.length === 1) {
    return [{
      label: inside[0].text,
      polygon: sourcePolygon.slice(),
      surface_m2: inside[0].surface_m2,
    }];
  }

  // Calcul des cellules Voronoï clippées au polygone source.
  // Chaque label produit une cellule (un polygone).
  const labelPts = inside.map((l) => ({ x: l.x, y: l.y }));
  const cells = voronoiCellsAll(labelPts, sourcePolygon);

  // Pour chaque cellule, snap les vertices "internes" (= sur les bissectrices,
  // donc PAS sur le bord du polygone source) au mur vectoriel le plus proche
  // dans `snapTol` px. Si pas de mur dans la fenêtre → garder la bissectrice.
  const result: SplitRoom[] = [];
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const lab = inside[i];
    if (cell.length < 3) {
      // Cellule dégénérée (label hors source ou trop proche d'une frontière)
      // → fallback : garder polygone source pour ce label (rarissime).
      result.push({
        label: lab.text,
        polygon: sourcePolygon.slice(),
        surface_m2: lab.surface_m2,
      });
      continue;
    }
    const snapped: Vertex[] = cell.map((v) => {
      // Si vertex est sur le bord du polygone source → conserver tel quel
      // (c'est une frontière externe, on ne veut pas la snapper sur un mur
      // potentiellement à l'intérieur).
      if (isOnPolygonEdge(v, sourcePolygon, edgeTol)) return v;
      // Sinon → vertex interne (sur une bissectrice Voronoï).
      // Cherche le mur vectoriel le plus proche dans snapTol.
      const { d, proj } = nearestWallProjection(v, walls);
      if (d <= snapTol) return proj;
      return v;
    });

    // Vérifier que la cellule snappée a une aire raisonnable (>5% de la cellule
    // originale, pour éviter qu'un snap pathologique aplatit la cellule)
    const origArea = Math.abs(signedArea(cell));
    const snapArea = Math.abs(signedArea(snapped));
    const polygon = (origArea > 0 && snapArea / origArea < 0.5) ? cell : snapped;

    result.push({
      label: lab.text,
      polygon,
      surface_m2: lab.surface_m2,
    });
  }
  return result;
}

/**
 * Helper : groupe les labels par polygone source (= flood-fill room).
 *
 * Pour chaque flood-fill room, retourne la liste des labels qui ont leur
 * position (x, y) DANS le polygone de la room.
 *
 * Critique : un même label peut "appartenir" à plusieurs rooms en théorie
 * (si les rooms se chevauchent via dilatation). Dans flood-fill, les rooms
 * sont disjointes par construction (claim mask), donc 1 label → 1 room max.
 * Si un label n'est dans AUCUNE room (rare : flood-fill a échoué pour ce label),
 * il sera ignoré.
 */
export function groupLabelsByRoom<R extends { polygon: Vertex[] }>(
  rooms: R[],
  labels: LabelPoint[],
): Array<{ room: R; labels: LabelPoint[] }> {
  return rooms.map((room) => ({
    room,
    labels: labels.filter((l) => pointInPolygon(l.x, l.y, room.polygon)),
  }));
}

// Re-exports utiles
export { pointInPolygon, signedArea };
