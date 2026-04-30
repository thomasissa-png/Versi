/**
 * Module s28.5 — Graphe planaire COMPLET (avec intersections segment-segment).
 *
 * ROOT CAUSE des tours 1-4 (s27 → s28.4) :
 *   `wall-graph.ts` snappe uniquement les ENDPOINTS proches en mêmes nodes.
 *   Si deux segments se croisent en X sans partager d'endpoint (cas standard
 *   d'un mur interne qui touche un mur externe sans s'y arrêter exactement),
 *   le graphe N'A PAS le node d'intersection → l'algorithme de face traversal
 *   retombe sur la grande face externe qui couvre plusieurs pièces réelles.
 *
 * Symptôme observé Muguets RDC : polygone "Séjour/cuisine" qui couvre
 * Entrée + Couloir + une partie du séjour parce que les murs internes
 * "Entrée" et "Couloir" ne forment pas de cycles fermés dans le graphe.
 *
 * Ce module :
 *   1. Snap endpoints proches (comme wall-graph.ts)
 *   2. **Calcule TOUTES les intersections segment-segment** (nouveau)
 *   3. Découpe chaque segment aux intersections → edges atomiques
 *   4. Trace les faces fermées via half-edge twin/next CCW
 *   5. Filtre par : centroid dans lot + aire min + compactness ratio
 *   6. Permet de matcher chaque face à un label PDF par centroid-in-face
 *
 * Aucune face ne peut être créée si elle n'est pas géométriquement fermée
 * par des segments réels : par construction, on N'INVENTE PAS de pièce.
 */

export type Wall = { x1: number; y1: number; x2: number; y2: number };
export type Vertex = { x: number; y: number };
export type Edge = { from: number; to: number };

export type Face = {
  /** Indices dans le tableau vertices (premier ≠ dernier — fermeture implicite). */
  vertexIndices: number[];
  /** Points (x,y) dans le même ordre. */
  points: Vertex[];
  /** Aire signée (positive = CCW). */
  signedArea: number;
  /** Aire absolue. */
  area: number;
  /** Centroïde géométrique. */
  centroid: Vertex;
  /** Bounding box. */
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  /** Périmètre. */
  perimeter: number;
  /** Compactness 4πA/P² ∈ [0..1]. 1 = cercle parfait, ~0.7 carré, faible = bande. */
  compactness: number;
};

export type PlanarGraph = {
  vertices: Vertex[];
  edges: Edge[];
};

export type FaceFilterOptions = {
  /** Polygone du lot (en pixels image). Faces dont centroid hors lot = rejetées. */
  lotPolygon: Vertex[];
  /** Aire minimale en m² (par défaut 1.0). */
  minAreaM2: number;
  /** Échelle px²→m² (calculée en amont). */
  scaleM2PerPx2: number;
  /** Compactness min (par défaut 0.15 — élimine bandes très fines = murs/cotes). */
  minCompactness?: number;
  /** Aire max en m² (par défaut 200 — élimine la face "tout le lot" si elle survient). */
  maxAreaM2?: number;
};

export class WallGraphFacesError extends Error {
  constructor(
    public readonly code: "empty_walls" | "no_faces",
    message: string,
  ) {
    super(`[wall-graph-faces:${code}] ${message}`);
    this.name = "WallGraphFacesError";
  }
}

const DEFAULT_SNAP_TOLERANCE = 4; // pixels — un peu plus serré que wall-graph.ts (8)
const EPS = 1e-9;

// ─── Snap helpers ─────────────────────────────────────────────────

function snapDist2(a: Vertex, b: Vertex): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Trouve un vertex existant à distance ≤ snapTolerance, sinon en crée un.
 * Bucket spatial pour O(1) amorti.
 */
class VertexIndex {
  private buckets = new Map<string, number[]>();
  private cellSize: number;
  private tolSq: number;
  public vertices: Vertex[] = [];

  constructor(snapTolerance: number) {
    this.cellSize = Math.max(1, snapTolerance * 1.5);
    this.tolSq = snapTolerance * snapTolerance;
  }

  private key(x: number, y: number): string {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }

  findOrCreate(x: number, y: number): number {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const k = `${cx + dx},${cy + dy}`;
        const ids = this.buckets.get(k);
        if (!ids) continue;
        for (const id of ids) {
          if (snapDist2(this.vertices[id], { x, y }) <= this.tolSq) return id;
        }
      }
    }
    const id = this.vertices.length;
    this.vertices.push({ x, y });
    const k = this.key(x, y);
    const arr = this.buckets.get(k);
    if (arr) arr.push(id);
    else this.buckets.set(k, [id]);
    return id;
  }
}

// ─── Intersection segment-segment ─────────────────────────────────

type SegmentLite = { ax: number; ay: number; bx: number; by: number };

/**
 * Retourne l'intersection STRICTE (pas aux endpoints) entre deux segments,
 * ou null. On exclut les endpoints car ils sont déjà gérés par snap.
 *
 * Algorithme classique paramétrique : t,u ∈ (eps, 1-eps).
 */
function segmentIntersection(
  s1: SegmentLite,
  s2: SegmentLite,
): Vertex | null {
  const r_x = s1.bx - s1.ax;
  const r_y = s1.by - s1.ay;
  const s_x = s2.bx - s2.ax;
  const s_y = s2.by - s2.ay;
  const denom = r_x * s_y - r_y * s_x;
  if (Math.abs(denom) < EPS) return null; // parallèles ou colinéaires

  const t = ((s2.ax - s1.ax) * s_y - (s2.ay - s1.ay) * s_x) / denom;
  const u = ((s2.ax - s1.ax) * r_y - (s2.ay - s1.ay) * r_x) / denom;

  // On accepte les intersections sur les bords (pas seulement strictes) car
  // un mur interne peut "buter" sur un mur externe — c'est exactement le cas
  // qu'on veut capturer.
  const eps = 1e-3;
  if (t < -eps || t > 1 + eps || u < -eps || u > 1 + eps) return null;

  return { x: s1.ax + t * r_x, y: s1.ay + t * r_y };
}

// ─── buildPlanarGraph ─────────────────────────────────────────────

/**
 * Construit le graphe planaire complet :
 *   - snap endpoints proches
 *   - calcule toutes les intersections seg-seg
 *   - découpe chaque segment aux points d'intersection (split)
 *
 * Chaque edge retournée est ATOMIQUE (ne croise plus aucune autre edge sauf
 * aux endpoints qui sont des nodes du graphe).
 *
 * Complexité : O(n²) en intersections — acceptable pour n ≤ 500 segments
 * (Muguets : ~80 segments par étage).
 */
export function buildPlanarGraph(
  walls: Wall[],
  snapTolerance: number = DEFAULT_SNAP_TOLERANCE,
): PlanarGraph {
  if (!walls || walls.length === 0) {
    throw new WallGraphFacesError("empty_walls", "Aucun mur fourni");
  }

  const vIndex = new VertexIndex(snapTolerance);

  // Étape 1 : pour chaque segment, on collecte tous les points (endpoints +
  // intersections avec les autres segments) puis on les trie le long du
  // segment (par paramètre t) → on génère les sous-edges atomiques.
  const segments: SegmentLite[] = walls.map((w) => ({
    ax: w.x1, ay: w.y1, bx: w.x2, by: w.y2,
  }));

  // Pour chaque segment, ajouter les endpoints ET toutes les intersections
  // comme "points sur ce segment", paramétrés par t ∈ [0, 1].
  type PointOnSeg = { t: number; vId: number };
  const pointsOnSeg: PointOnSeg[][] = segments.map(() => []);

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    // Endpoints
    const idA = vIndex.findOrCreate(s.ax, s.ay);
    const idB = vIndex.findOrCreate(s.bx, s.by);
    if (idA === idB) continue; // segment dégénéré (longueur < snap)
    pointsOnSeg[i].push({ t: 0, vId: idA });
    pointsOnSeg[i].push({ t: 1, vId: idB });
  }

  // Intersections seg-seg (i < j pour éviter doublons)
  for (let i = 0; i < segments.length; i++) {
    const si = segments[i];
    for (let j = i + 1; j < segments.length; j++) {
      const sj = segments[j];
      const inter = segmentIntersection(si, sj);
      if (!inter) continue;
      const iv = vIndex.findOrCreate(inter.x, inter.y);
      // Calcul de t pour chaque segment
      const len_i_sq = (si.bx - si.ax) ** 2 + (si.by - si.ay) ** 2;
      const len_j_sq = (sj.bx - sj.ax) ** 2 + (sj.by - sj.ay) ** 2;
      if (len_i_sq < EPS || len_j_sq < EPS) continue;
      const ti = ((inter.x - si.ax) * (si.bx - si.ax) + (inter.y - si.ay) * (si.by - si.ay)) / len_i_sq;
      const tj = ((inter.x - sj.ax) * (sj.bx - sj.ax) + (inter.y - sj.ay) * (sj.by - sj.ay)) / len_j_sq;
      if (ti > 0.001 && ti < 0.999) pointsOnSeg[i].push({ t: ti, vId: iv });
      if (tj > 0.001 && tj < 0.999) pointsOnSeg[j].push({ t: tj, vId: iv });
    }
  }

  // Génération des edges atomiques : pour chaque segment, trier les points
  // par t puis chaîner.
  const edgeSet = new Set<string>();
  const edges: Edge[] = [];
  const addEdge = (a: number, b: number) => {
    if (a === b) return;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push({ from: a, to: b });
  };

  for (let i = 0; i < pointsOnSeg.length; i++) {
    const pts = pointsOnSeg[i];
    if (pts.length < 2) continue;
    pts.sort((a, b) => a.t - b.t);
    for (let k = 0; k < pts.length - 1; k++) {
      addEdge(pts[k].vId, pts[k + 1].vId);
    }
  }

  return { vertices: vIndex.vertices, edges };
}

// ─── detectFaces (DCEL half-edge traversal) ───────────────────────

/**
 * Détecte toutes les faces FERMÉES du graphe planaire.
 *
 * Algorithme : pour chaque edge, on crée 2 half-edges (A→B, B→A). Pour
 * chaque half-edge, on calcule next = la half-edge sortante de B qui suit
 * immédiatement la twin(h) dans l'ordre CCW autour de B → "tourner à gauche
 * le plus serré". On suit next→next→next jusqu'à boucler → on a tracé une
 * face. La face externe (la plus grande aire absolue) est exclue.
 */
export function detectFaces(graph: PlanarGraph): Face[] {
  const { vertices, edges } = graph;
  if (vertices.length < 3 || edges.length < 3) {
    return [];
  }

  type HalfEdge = {
    id: number;
    from: number;
    to: number;
    twin: number;
    angle: number;
    next: number;
  };
  const halfEdges: HalfEdge[] = [];
  for (const e of edges) {
    const a = vertices[e.from];
    const b = vertices[e.to];
    const angAB = Math.atan2(b.y - a.y, b.x - a.x);
    const angBA = Math.atan2(a.y - b.y, a.x - b.x);
    const idAB = halfEdges.length;
    const idBA = halfEdges.length + 1;
    halfEdges.push({ id: idAB, from: e.from, to: e.to, twin: idBA, angle: angAB, next: -1 });
    halfEdges.push({ id: idBA, from: e.to, to: e.from, twin: idAB, angle: angBA, next: -1 });
  }

  // Pour chaque vertex, half-edges sortantes triées par angle CCW
  const outgoing: number[][] = vertices.map(() => []);
  for (const he of halfEdges) outgoing[he.from].push(he.id);
  for (const list of outgoing) {
    list.sort((a, b) => halfEdges[a].angle - halfEdges[b].angle);
  }

  // next(h) = sortante de h.to qui suit twin(h) en CCW autour de h.to
  for (const he of halfEdges) {
    const list = outgoing[he.to];
    const idxTwin = list.indexOf(he.twin);
    if (idxTwin === -1) continue;
    const nextIdx = (idxTwin + 1) % list.length;
    he.next = list[nextIdx];
  }

  // Trace les faces
  const visited = new Set<number>();
  const rawFaces: number[][] = [];
  for (const he of halfEdges) {
    if (visited.has(he.id)) continue;
    const cycle: number[] = [];
    let cur = he.id;
    let guard = 0;
    while (!visited.has(cur)) {
      visited.add(cur);
      cycle.push(cur);
      const nxt = halfEdges[cur].next;
      if (nxt < 0) { cur = -1; break; }
      cur = nxt;
      if (guard++ > halfEdges.length + 5) { cur = -1; break; }
    }
    if (cur === he.id && cycle.length >= 3) {
      rawFaces.push(cycle);
    }
  }

  // Convertir en Face avec géométrie
  const faces: Face[] = [];
  for (const cycle of rawFaces) {
    const indices = cycle.map((heId) => halfEdges[heId].from);
    const points = indices.map((i) => vertices[i]);
    const signedArea = computeSignedArea(points);
    const area = Math.abs(signedArea);
    if (area < 1e-3) continue;
    const centroid = computeCentroid(points);
    const bbox = computeBbox(points);
    const perimeter = computePerimeter(points);
    const compactness =
      perimeter > 0 ? (4 * Math.PI * area) / (perimeter * perimeter) : 0;
    faces.push({
      vertexIndices: indices,
      points,
      signedArea,
      area,
      centroid,
      bbox,
      perimeter,
      compactness,
    });
  }

  return faces;
}

// ─── filterRoomFaces ──────────────────────────────────────────────

/**
 * Filtre les faces candidates pour ne garder que celles qui sont des PIÈCES
 * réelles :
 *   1. Centroid à l'intérieur du polygone du lot (élimine la face externe
 *      infinie + les faces extérieures au lot)
 *   2. Aire ≥ minAreaM2 (élimine les vides résiduels et les "trous" entre
 *      les cotes architecte)
 *   3. Aire ≤ maxAreaM2 (élimine la face "tout le lot" qui peut survenir si
 *      les murs internes ne ferment aucun cycle interne — sécurité)
 *   4. Compactness ≥ minCompactness (élimine les bandes très fines qui sont
 *      des murs ou des espaces de cotation)
 *
 * Les faces SONT TRIÉES par aire DESC (utile pour matching greedy).
 */
export function filterRoomFaces(
  faces: Face[],
  options: FaceFilterOptions,
): Face[] {
  const { lotPolygon, minAreaM2, scaleM2PerPx2 } = options;
  const minCompactness = options.minCompactness ?? 0.05; // détendu : 0.15 rejetait les pièces L-shape étroites
  const maxAreaM2 = options.maxAreaM2 ?? 200;

  if (lotPolygon.length < 3) return [];

  const lotArea = Math.abs(computeSignedArea(lotPolygon));

  const kept = faces.filter((f) => {
    // 1. Centroid in lot — règle dure : la face DOIT être à l'intérieur de l'enveloppe
    if (!pointInPolygon(f.centroid, lotPolygon)) return false;
    // 2. Aire min en m². Si scaleM2PerPx2 incertain (<= 0), on bascule sur un
    // ratio relatif : aire face >= 0.5% du lot.
    if (scaleM2PerPx2 > 0) {
      const areaM2 = f.area * scaleM2PerPx2;
      if (areaM2 < minAreaM2) return false;
      if (areaM2 > maxAreaM2) return false;
    } else {
      if (f.area < lotArea * 0.005) return false;
    }
    // 3. Élimine la face qui est ~ le lot entier (≥ 85% du lot) — c'est la face
    // externe ou une face qui a "swallow" tout le lot par cycle non-fermé.
    if (f.area > lotArea * 0.85) return false;
    // 4. Compactness (détendu) — élimine les bandes très très fines (cotes,
    // murs entre 2 pièces si jamais l'algo en a fait une face). 0.05 garde les
    // pièces étroites (couloir L-shape) tout en virant les slivers.
    if (f.compactness < minCompactness) return false;
    return true;
  });

  kept.sort((a, b) => b.area - a.area);
  return kept;
}

// ─── Helpers géométriques ─────────────────────────────────────────

export function computeSignedArea(points: Vertex[]): number {
  let s = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

export function computeCentroid(points: Vertex[]): Vertex {
  let cx = 0;
  let cy = 0;
  for (const p of points) {
    cx += p.x;
    cy += p.y;
  }
  return { x: cx / points.length, y: cy / points.length };
}

export function computeBbox(
  points: Vertex[],
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export function computePerimeter(points: Vertex[]): number {
  let p = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    p += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return p;
}

export function pointInPolygon(pt: Vertex, polygon: Vertex[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
