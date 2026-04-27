/**
 * Module 4/5 — Graphe lignes murs + détection pièces (s27 refonte pipeline plan-extractor)
 *
 * Verbatim Thomas s27 : « tracé EXACTEMENT sur les lignes du lot ». Ce module
 * transforme un nuage de segments (issu M2 vectoriel ou M3 bitmap) en un graphe
 * planaire dont les **faces finies** sont les pièces candidates.
 *
 * Algorithme planar face detection (de Berg, "Computational Geometry" ch.2) :
 *   (1) snap endpoints proches → nodes uniques
 *   (2) edges = segments (chaque segment devient 2 half-edges orientées)
 *   (3) à chaque node, on trie les half-edges sortantes par angle polaire
 *   (4) chaque half-edge a un "next" = next-CCW autour du node de destination
 *       (= "tourner à gauche le plus serré possible")
 *   (5) on suit les next jusqu'à boucler → on a tracé une face
 *   (6) on exclut la face externe (la plus grande aire signée, ou aire négative)
 *
 * Anti-pattern (learning P0 s27) : aucun fallback silencieux. Si segments vides
 * ou graphe complètement déconnecté → throw WallGraphError typée. Le caller
 * route en erreur visible UI.
 *
 * Spec : docs/ia/s27-vs-pipeline-refonte-architecture.md (Module 4).
 */

export type WallSegmentInput = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type GraphNode = {
  id: number;
  x: number;
  y: number;
};

export type GraphEdge = {
  nodeA: number;
  nodeB: number;
  segment: WallSegmentInput;
};

export type Graph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type Polygon = {
  /** Liste des nodeIds dans l'ordre de parcours (premier ≠ dernier — fermeture implicite). */
  nodeIds: number[];
  /** Liste des points (x,y) dans le même ordre. */
  points: Array<{ x: number; y: number }>;
  /** Aire signée (positive = CCW, négative = CW). Utilisée pour exclure la face externe. */
  signedArea: number;
  /** Aire absolue (toujours positive). */
  area: number;
};

export type WallGraphErrorCode =
  | "empty_segments"
  | "disconnected_graph"
  | "no_faces_detected";

export class WallGraphError extends Error {
  constructor(
    public readonly code: WallGraphErrorCode,
    message: string,
  ) {
    super(`[${code}] ${message}`);
    this.name = "WallGraphError";
  }
}

const DEFAULT_SNAP_TOLERANCE = 5;

/**
 * Construit le graphe planaire à partir d'un nuage de segments en snappant
 * les endpoints proches en mêmes nodes.
 *
 * @throws WallGraphError("empty_segments") si aucun segment fourni.
 */
export function buildWallGraph(
  segments: WallSegmentInput[],
  snapTolerance: number = DEFAULT_SNAP_TOLERANCE,
): Graph {
  if (!segments || segments.length === 0) {
    throw new WallGraphError("empty_segments", "Aucun segment fourni");
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const tol = Math.max(0, snapTolerance);
  const tolSq = tol * tol;

  // Bucket spatial pour O(n) amorti sur le snapping. Cellule ~tol*1.5.
  const cellSize = Math.max(1, tol * 1.5);
  const buckets = new Map<string, number[]>();
  const bucketKey = (x: number, y: number) =>
    `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)}`;

  const findOrCreateNode = (x: number, y: number): number => {
    const cx = Math.floor(x / cellSize);
    const cy = Math.floor(y / cellSize);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cx + dx},${cy + dy}`;
        const ids = buckets.get(key);
        if (!ids) continue;
        for (const id of ids) {
          const n = nodes[id];
          const ddx = n.x - x;
          const ddy = n.y - y;
          if (ddx * ddx + ddy * ddy <= tolSq) return id;
        }
      }
    }
    const id = nodes.length;
    nodes.push({ id, x, y });
    const key = bucketKey(x, y);
    const arr = buckets.get(key);
    if (arr) arr.push(id);
    else buckets.set(key, [id]);
    return id;
  };

  for (const seg of segments) {
    const a = findOrCreateNode(seg.x1, seg.y1);
    const b = findOrCreateNode(seg.x2, seg.y2);
    if (a === b) continue; // segment dégénéré (longueur < tolérance)
    // Évite les doublons exacts (a,b) déjà présents.
    const dup = edges.some(
      (e) =>
        (e.nodeA === a && e.nodeB === b) ||
        (e.nodeA === b && e.nodeB === a),
    );
    if (dup) continue;
    edges.push({ nodeA: a, nodeB: b, segment: seg });
  }

  return { nodes, edges };
}

/**
 * Détecte les pièces (faces finies du graphe planaire) via rotational sort
 * + face traversal sur les half-edges.
 *
 * @throws WallGraphError("disconnected_graph") si le graphe n'a aucune
 *         composante connexe contenant ≥ 1 cycle (zéro face possible).
 * @throws WallGraphError("no_faces_detected") si l'algorithme tourne mais
 *         ne trouve aucune face finie (graphe arborescent par exemple).
 */
export function detectRooms(graph: Graph): Polygon[] {
  const { nodes, edges } = graph;
  if (nodes.length < 3 || edges.length < 3) {
    throw new WallGraphError(
      "disconnected_graph",
      `Graphe trop petit pour contenir un cycle (${nodes.length} nodes, ${edges.length} edges)`,
    );
  }

  // Construction des half-edges. Chaque edge non-orientée → 2 half-edges (A→B, B→A).
  type HalfEdge = {
    id: number;
    from: number;
    to: number;
    twin: number;
    angle: number; // angle polaire from→to
    next: number; // half-edge suivante dans la même face (calculée plus bas)
  };
  const halfEdges: HalfEdge[] = [];
  for (const e of edges) {
    const a = nodes[e.nodeA];
    const b = nodes[e.nodeB];
    const angAB = Math.atan2(b.y - a.y, b.x - a.x);
    const angBA = Math.atan2(a.y - b.y, a.x - b.x);
    const idAB = halfEdges.length;
    const idBA = halfEdges.length + 1;
    halfEdges.push({
      id: idAB,
      from: e.nodeA,
      to: e.nodeB,
      twin: idBA,
      angle: angAB,
      next: -1,
    });
    halfEdges.push({
      id: idBA,
      from: e.nodeB,
      to: e.nodeA,
      twin: idAB,
      angle: angBA,
      next: -1,
    });
  }

  // Pour chaque node, lister les half-edges sortantes triées par angle CCW.
  const outgoing: number[][] = nodes.map(() => []);
  for (const he of halfEdges) outgoing[he.from].push(he.id);
  for (const list of outgoing) {
    list.sort((a, b) => halfEdges[a].angle - halfEdges[b].angle);
  }

  // Calcul du `next` de chaque half-edge.
  // Convention "tourner à gauche le plus serré" = en arrivant sur node `to`
  // par la half-edge h, on prend la half-edge sortante de `to` qui suit
  // immédiatement la twin(h) dans l'ordre CCW autour de `to`.
  for (const he of halfEdges) {
    const list = outgoing[he.to];
    const twin = he.twin;
    const idx = list.indexOf(twin);
    if (idx === -1) continue; // ne devrait pas arriver
    const nextIdx = (idx + 1) % list.length;
    he.next = list[nextIdx];
  }

  // Trace les faces en suivant les `next` jusqu'à revenir au point de départ.
  const visited = new Set<number>();
  const faces: number[][] = []; // chaque face = liste de halfEdge ids
  for (const he of halfEdges) {
    if (visited.has(he.id)) continue;
    const face: number[] = [];
    let cur = he.id;
    let guard = 0;
    while (!visited.has(cur)) {
      visited.add(cur);
      face.push(cur);
      cur = halfEdges[cur].next;
      if (cur === -1 || guard++ > halfEdges.length + 1) break;
    }
    if (cur === he.id && face.length >= 3) {
      faces.push(face);
    }
  }

  // Convertir chaque face en Polygon avec aire signée. On filtre tout de
  // suite les faces dégénérées (aire ≈ 0) — en planar face traversal sur
  // un graphe arborescent (ou une branche pendante), une face "fait l'aller-
  // retour" sur les mêmes arêtes et a une aire nulle. Ce ne sont pas des
  // pièces réelles.
  const EPSILON_AREA = 1e-6;
  const polygons: Polygon[] = faces
    .map((face) => {
      const nodeIds = face.map((heId) => halfEdges[heId].from);
      const points = nodeIds.map((id) => ({ x: nodes[id].x, y: nodes[id].y }));
      const signedArea = computeSignedArea(points);
      return { nodeIds, points, signedArea, area: Math.abs(signedArea) };
    })
    .filter((p) => p.area > EPSILON_AREA);

  if (polygons.length === 0) {
    throw new WallGraphError(
      "no_faces_detected",
      "Aucune face finie détectée — graphe possiblement arborescent ou sans cycle fermé",
    );
  }

  return polygons;
}

/**
 * Filtre les faces dégénérées (aire trop petite) ET la face externe.
 *
 * La face externe est identifiée comme celle d'aire signée NÉGATIVE la plus
 * grande en valeur absolue (parcours dans le sens horaire dans un repère
 * mathématique standard où Y monte). En pratique, sur les sources PDF/raster
 * où Y descend, c'est l'inverse — on prend simplement la face d'aire absolue
 * maximale comme face externe (= enveloppe globale).
 */
export function filterValidRooms(
  polygons: Polygon[],
  minArea: number,
): Polygon[] {
  if (polygons.length === 0) return [];

  // Identifier la face externe = aire absolue maximale.
  let maxArea = -Infinity;
  let externalIdx = -1;
  for (let i = 0; i < polygons.length; i++) {
    if (polygons[i].area > maxArea) {
      maxArea = polygons[i].area;
      externalIdx = i;
    }
  }

  return polygons.filter(
    (p, i) => i !== externalIdx && p.area >= minArea,
  );
}

/**
 * Aire signée d'un polygone fermé via la formule du lacet (shoelace).
 * Positive = CCW dans repère math standard (Y monte), négative = CW.
 */
function computeSignedArea(points: Array<{ x: number; y: number }>): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}
