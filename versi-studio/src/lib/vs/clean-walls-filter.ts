/**
 * s28 tour 19 — Filtre agressif des murs vectorisés pour ne garder que
 * les VRAIS murs architecturaux (cloisons + porteurs).
 *
 * Problème identifié tour 18 :
 *   `extractRoomsAsRectangles` reçoit un pool de murs incluant :
 *     - cotes architecturales (segments 5-25px)
 *     - mobilier vectoriel (canapé/table/lit dessinés en lignes ≥30px)
 *     - hachures (terrasse, escalier, mur épais)
 *     - bords du lot (corrects)
 *     - cloisons internes (corrects)
 *   Le raycaster `findEnclosingWall` accroche le 1er mur trouvé dans une
 *   direction, donc une chaise dans le séjour devient une cloison fictive
 *   → rectangle pièce mal placé/sur-dimensionné.
 *
 * Heuristiques de filtrage (cumulatives) :
 *   1. Longueur ≥ 30px (déjà fait par minWallLenPx, mais on re-vérifie ici)
 *   2. Connexion : un VRAI mur a typiquement ≥1 endpoint adjacent à
 *      un autre mur (jonction T/L). Mobilier isolé = canapé/table.
 *      Tolérance : endpoint à ≤8px d'un autre endpoint.
 *   3. Hachure : si ≥3 segments parallèles (±5°) à ≤8px d'écart latéral,
 *      on considère que c'est une hachure (terrasse, mur épais hatché).
 *      On garde alors UN seul des segments centraux.
 *   4. Mobilier interne : si un segment forme un petit rectangle fermé
 *      (4 segments forming a quad de surface ≤ 0.5m² ≈ 1500px²), on
 *      l'exclut (chaise, table, lavabo).
 *
 * Stratégie : on retourne un set RÉDUIT (~50-150 murs vs ~5500 brutes)
 * qui ne contient QUE les cloisons + porteurs.
 */

export type Wall = { x1: number; y1: number; x2: number; y2: number };

export type Pt = { x: number; y: number };

const EPS_ENDPOINT = 8; // distance max entre 2 endpoints pour être "connectés"
const HATCH_LATERAL_PX = 5; // distance latérale max entre 2 segments d'une hachure (réduit s28 t19.b)
const HATCH_ANGLE_TOL_DEG = 3;
const HATCH_MIN_GROUP = 5; // ≥5 parallèles ⇒ hachure (s28 t19.b — préserve les murs épais double-trait)
const FURNITURE_MAX_AREA_PX2 = 2500; // ~0.7m² à scale=3 ⇒ chaise/table/lavabo
const MIN_WALL_LEN_PX = 30;

function len(w: Wall): number {
  return Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
}

function angleDeg(w: Wall): number {
  const a = (Math.atan2(w.y2 - w.y1, w.x2 - w.x1) * 180) / Math.PI;
  return ((a % 180) + 180) % 180; // mod 180 (mur sans direction)
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Distance d'un point à un segment.
 */
function distPointToSegment(p: Pt, w: Wall): number {
  const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-6) return dist(p, { x: w.x1, y: w.y1 });
  const t = Math.max(0, Math.min(1, ((p.x - w.x1) * dx + (p.y - w.y1) * dy) / l2));
  return dist(p, { x: w.x1 + t * dx, y: w.y1 + t * dy });
}

/**
 * Distance latérale entre 2 segments quasi-parallèles.
 * Utilise la projection des endpoints du 2nd segment sur le 1er.
 */
function lateralDistance(a: Wall, b: Wall): number {
  const d1 = distPointToSegment({ x: b.x1, y: b.y1 }, a);
  const d2 = distPointToSegment({ x: b.x2, y: b.y2 }, a);
  return (d1 + d2) / 2;
}

/**
 * Test : 2 segments sont-ils ~parallèles ?
 */
function isParallel(a: Wall, b: Wall, tolDeg: number): boolean {
  const da = angleDeg(a);
  const db = angleDeg(b);
  const diff = Math.abs(da - db);
  return Math.min(diff, 180 - diff) <= tolDeg;
}

/**
 * Filtre 1 : longueur minimum.
 */
function filterTooShort(walls: Wall[]): Wall[] {
  return walls.filter((w) => len(w) >= MIN_WALL_LEN_PX);
}

/**
 * Filtre 2 : retire les murs ISOLÉS (aucun endpoint à ≤EPS_ENDPOINT
 * d'un autre endpoint de mur). Un vrai mur a presque toujours une
 * jonction T ou L avec un autre mur.
 *
 * Exception : on garde les murs LONGS (≥120px) même isolés (= mur
 * extérieur droit, vrai mur porteur isolé légitime).
 */
function filterIsolated(walls: Wall[]): Wall[] {
  const KEEP_IF_LONG = 60;
  return walls.filter((w) => {
    if (len(w) >= KEEP_IF_LONG) return true;
    const e1 = { x: w.x1, y: w.y1 };
    const e2 = { x: w.x2, y: w.y2 };
    for (const other of walls) {
      if (other === w) continue;
      const o1 = { x: other.x1, y: other.y1 };
      const o2 = { x: other.x2, y: other.y2 };
      if (
        dist(e1, o1) <= EPS_ENDPOINT ||
        dist(e1, o2) <= EPS_ENDPOINT ||
        dist(e2, o1) <= EPS_ENDPOINT ||
        dist(e2, o2) <= EPS_ENDPOINT
      ) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Filtre 3 : retire les hachures.
 *
 * Algo :
 *   - Pour chaque mur, compte combien d'autres murs sont parallèles ET
 *     à distance latérale ≤ HATCH_LATERAL_PX.
 *   - Si compte ≥ HATCH_MIN_GROUP - 1 (donc ≥3 dans le groupe avec lui),
 *     on marque comme "hachure".
 *   - On retire TOUS les murs marqués hachure, sauf le plus long du
 *     groupe (qu'on garde comme représentant — utile si la hachure est
 *     un mur épais hatché).
 *
 * Implémentation : naïve O(N²) mais N est filtré à <500 → OK.
 */
function filterHatching(walls: Wall[]): Wall[] {
  const N = walls.length;
  if (N < HATCH_MIN_GROUP) return walls;
  // group[i] = ids des murs parallèles à walls[i] et à <HATCH_LATERAL_PX
  const groups: number[][] = walls.map(() => []);
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      if (!isParallel(walls[i], walls[j], HATCH_ANGLE_TOL_DEG)) continue;
      const lat = lateralDistance(walls[i], walls[j]);
      if (lat <= HATCH_LATERAL_PX) {
        groups[i].push(j);
        groups[j].push(i);
      }
    }
  }
  // Murs qui font partie d'un cluster de hachure (≥3 parallèles proches)
  const inHatch = new Set<number>();
  for (let i = 0; i < N; i++) {
    if (groups[i].length >= HATCH_MIN_GROUP - 1) {
      inHatch.add(i);
      for (const j of groups[i]) inHatch.add(j);
    }
  }
  if (inHatch.size === 0) return walls;
  // Conserver UN représentant par cluster (le plus long).
  // Algo : Union-Find sur les clusters.
  const parent: number[] = walls.map((_, i) => i);
  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }
  function union(a: number, b: number): void {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }
  for (const i of inHatch) {
    for (const j of groups[i]) {
      if (inHatch.has(j)) union(i, j);
    }
  }
  // Pour chaque cluster, garder le mur le plus long
  const bestPerCluster = new Map<number, number>();
  for (const i of inHatch) {
    const root = find(i);
    const cur = bestPerCluster.get(root);
    if (cur === undefined || len(walls[i]) > len(walls[cur])) {
      bestPerCluster.set(root, i);
    }
  }
  const keepHatch = new Set(bestPerCluster.values());
  return walls.filter((_, i) => !inHatch.has(i) || keepHatch.has(i));
}

/**
 * Filtre 4 : mobilier interne.
 * Détecte les petits rectangles fermés (4 segments) de surface ≤ FURNITURE_MAX_AREA_PX2.
 * Ces rectangles sont des chaises, tables, lavabos dessinés en vectoriel.
 *
 * Algo simplifié V1 : pour chaque mur court (30-80px), on cherche s'il
 * fait partie d'un quadrilatère fermé (4 endpoints connectés en chaîne).
 * Si oui ET surface du quad < FURNITURE_MAX_AREA_PX2 → on retire les 4
 * murs du quad.
 *
 * Optimisation : on indexe les endpoints par grid spatial pour
 * accélérer la recherche.
 */
function filterFurniture(walls: Wall[]): Wall[] {
  const N = walls.length;
  if (N < 4) return walls;
  const SHORT_MAX = 80;
  // Index endpoints par grille 10×10
  const GRID = 10;
  type EP = { x: number; y: number; wallIdx: number; which: 1 | 2 };
  const endpointGrid = new Map<string, EP[]>();
  function key(x: number, y: number): string {
    return `${Math.floor(x / GRID)},${Math.floor(y / GRID)}`;
  }
  for (let i = 0; i < N; i++) {
    const w = walls[i];
    const eps: EP[] = [
      { x: w.x1, y: w.y1, wallIdx: i, which: 1 },
      { x: w.x2, y: w.y2, wallIdx: i, which: 2 },
    ];
    for (const ep of eps) {
      // Insère dans 9 cellules autour pour gérer EPS_ENDPOINT
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const k = `${Math.floor(ep.x / GRID) + dx},${Math.floor(ep.y / GRID) + dy}`;
          if (!endpointGrid.has(k)) endpointGrid.set(k, []);
          endpointGrid.get(k)!.push(ep);
        }
      }
    }
  }
  function endpointsNear(p: Pt, excludeWall: number): EP[] {
    const k = key(p.x, p.y);
    const cands = endpointGrid.get(k) || [];
    return cands.filter(
      (ep) => ep.wallIdx !== excludeWall && dist(p, ep) <= EPS_ENDPOINT,
    );
  }
  // Pour chaque mur court, BFS jusqu'à profondeur 4 pour trouver un cycle
  const isFurniture = new Set<number>();
  for (let i0 = 0; i0 < N; i0++) {
    const w0 = walls[i0];
    if (len(w0) > SHORT_MAX) continue;
    // Tente de trouver un cycle de 4 murs depuis w0.
    // Représentation : (wallIdx, currentEndpoint)
    // BFS DFS depth-limited.
    function followFromEndpoint(
      startWall: number,
      startEnd: Pt,
      otherEnd: Pt,
      _depth: number,
      visited: number[],
    ): { cycle: number[]; area: number } | null {
      void startEnd;
      // Cherche un mur connecté à `otherEnd` (l'autre extrémité du mur courant)
      const neighbors = endpointsNear(otherEnd, startWall);
      for (const nb of neighbors) {
        if (visited.includes(nb.wallIdx)) {
          // boucle : si on revient à w0 et visited.length===4, c'est un quad
          if (nb.wallIdx === i0 && visited.length === 4) {
            // Calculer surface du polygone formé par les midpoints des murs
            const verts: Pt[] = visited.map((idx, k) => {
              if (k === 0) return { x: w0.x1, y: w0.y1 };
              const w = walls[idx];
              // On utilise l'endpoint qui n'est pas dans le précédent
              return { x: w.x1, y: w.y1 };
            });
            // Aire shoelace
            let s = 0;
            for (let p = 0; p < verts.length; p++) {
              const q = (p + 1) % verts.length;
              s += verts[p].x * verts[q].y - verts[q].x * verts[p].y;
            }
            const area = Math.abs(s / 2);
            if (area > 0 && area <= FURNITURE_MAX_AREA_PX2) {
              return { cycle: visited, area };
            }
          }
          continue;
        }
        if (visited.length >= 4) continue;
        const nbWall = walls[nb.wallIdx];
        const nbStart = nb.which === 1 ? { x: nbWall.x1, y: nbWall.y1 } : { x: nbWall.x2, y: nbWall.y2 };
        const nbOther = nb.which === 1 ? { x: nbWall.x2, y: nbWall.y2 } : { x: nbWall.x1, y: nbWall.y1 };
        const res = followFromEndpoint(
          nb.wallIdx,
          nbStart,
          nbOther,
          _depth + 1,
          [...visited, nb.wallIdx],
        );
        if (res) return res;
      }
      return null;
    }
    const e1 = { x: w0.x1, y: w0.y1 };
    const e2 = { x: w0.x2, y: w0.y2 };
    const found = followFromEndpoint(i0, e1, e2, 0, [i0]);
    if (found) {
      for (const idx of found.cycle) isFurniture.add(idx);
    }
  }
  if (isFurniture.size === 0) return walls;
  return walls.filter((_, i) => !isFurniture.has(i));
}

/**
 * Pipeline complet : applique les 4 filtres dans l'ordre.
 *
 * Stats avant/après loggées via console.log si verbose=true.
 */
export function filterRealWalls(
  walls: Wall[],
  options: { verbose?: boolean } = {},
): Wall[] {
  const verbose = options.verbose ?? false;
  if (walls.length === 0) return [];
  const t0 = walls.length;
  const f1 = filterTooShort(walls);
  const t1 = f1.length;
  const f2 = filterFurniture(f1); // furniture avant isolated (4 murs courts forment un quad → isolated les garderait)
  const t2 = f2.length;
  const f3 = filterHatching(f2);
  const t3 = f3.length;
  const f4 = filterIsolated(f3);
  const t4 = f4.length;
  if (verbose) {
    console.log(
      `[clean-walls] ${t0} → too-short ${t1} → furniture ${t2} → hatching ${t3} → isolated ${t4}`,
    );
  }
  return f4;
}
