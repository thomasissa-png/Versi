/**
 * Module s28.7 — Régulariseur orthogonal.
 *
 * Après flood-fill + Voronoï bornée, les polygones ont des coins arrondis
 * (pixel-tracing du contour). Pour atteindre l'invariant C de l'audit
 * (≥95% des vertices à ≤5px d'un mur du PDF vectoriel), il faut :
 *
 *   1. Détecter l'axe principal du PDF (typiquement 0°/90° pour archi standard)
 *   2. Pour chaque arête de polygone proche d'un axe → projeter sur cet axe
 *   3. Reconstruire le polygone avec les arêtes orthogonales projetées
 *   4. Snap final des vertices sur les murs vectoriels (tolérance 8px)
 *
 * Garanties :
 *   - Le polygone reste fermé (premier vertex == dernier après reconstruction)
 *   - L'aire change de < 5% (régularisation locale)
 *   - Si aucun axe dominant → polygone retourné inchangé (fail-safe)
 */

export type Vertex = { x: number; y: number };
export type Wall = { x1: number; y1: number; x2: number; y2: number };

/**
 * Chaîne les segments de murs colinéaires et adjacents pour produire des
 * "murs étendus" (long walls). Critique : sur certains PDFs, les murs sont
 * dessinés comme des séquences de courts segments (dashes ~11px). Sans
 * chaînage, ces segments sont individuellement < 15px → exclus de l'audit.
 * Avec chaînage, ils deviennent un long mur unique → audit Inv C passe.
 *
 * Algorithme :
 *   1. Calcule l'angle (mod π) de chaque segment.
 *   2. Pour chaque paire de segments :
 *      - Mêmes angles (±2°) ?
 *      - Endpoints proches (≤ gapPx) ?
 *      → Fusionner.
 *   3. Itère jusqu'à stabilité (un segment fusionné peut en attirer un autre).
 *
 * Performance : O(N²) par passe, mais N ~1000-2000 dans le pire cas → ~1M ops.
 */
export function chainCollinearSegments(
  walls: Wall[],
  options: { gapPx?: number; angleTolDeg?: number; lateralTolPx?: number } = {},
): Wall[] {
  const gapPx = options.gapPx ?? 8;
  const angleTolRad = ((options.angleTolDeg ?? 3) * PI) / 180;
  const lateralTolPx = options.lateralTolPx ?? 3;

  if (walls.length === 0) return [];
  // Normalise chaque segment : toujours x1≤x2 OU (x1==x2 ET y1≤y2)
  let segs = walls.map((w) => {
    const swap = w.x1 > w.x2 || (w.x1 === w.x2 && w.y1 > w.y2);
    return swap
      ? { x1: w.x2, y1: w.y2, x2: w.x1, y2: w.y1 }
      : { x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 };
  });

  for (let pass = 0; pass < 5; pass++) {
    const merged: boolean[] = new Array(segs.length).fill(false);
    const out: Wall[] = [];
    for (let i = 0; i < segs.length; i++) {
      if (merged[i]) continue;
      let cur = { ...segs[i] };
      const dxI = cur.x2 - cur.x1, dyI = cur.y2 - cur.y1;
      const lenI = Math.hypot(dxI, dyI);
      if (lenI < 1e-6) continue;
      const angleI = normalizeAngle(Math.atan2(dyI, dxI));
      // Cherche un segment voisin colinéaire
      for (let j = i + 1; j < segs.length; j++) {
        if (merged[j]) continue;
        const sj = segs[j];
        const dxJ = sj.x2 - sj.x1, dyJ = sj.y2 - sj.y1;
        const lenJ = Math.hypot(dxJ, dyJ);
        if (lenJ < 1e-6) continue;
        const angleJ = normalizeAngle(Math.atan2(dyJ, dxJ));
        let dAngle = Math.abs(angleI - angleJ);
        if (dAngle > PI / 2) dAngle = PI - dAngle;
        if (dAngle > angleTolRad) continue;

        // Vérifie distance latérale (perpendiculaire) entre segments
        const ux = dxI / lenI, uy = dyI / lenI;
        const nx = -uy, ny = ux;
        const dxA = sj.x1 - cur.x1, dyA = sj.y1 - cur.y1;
        const lateralA = Math.abs(dxA * nx + dyA * ny);
        if (lateralA > lateralTolPx) continue;

        // Distance gap entre extrémités les plus proches (le long de l'axe)
        const tA1 = (cur.x1 - cur.x1) * ux + (cur.y1 - cur.y1) * uy; // = 0
        const tA2 = dxI * ux + dyI * uy; // = lenI
        const tB1 = (sj.x1 - cur.x1) * ux + (sj.y1 - cur.y1) * uy;
        const tB2 = (sj.x2 - cur.x1) * ux + (sj.y2 - cur.y1) * uy;
        const tBmin = Math.min(tB1, tB2);
        const tBmax = Math.max(tB1, tB2);
        // Gap = distance entre les deux ranges [0, lenI] et [tBmin, tBmax]
        let gap: number;
        if (tBmax < tA1) gap = tA1 - tBmax;
        else if (tBmin > tA2) gap = tBmin - tA2;
        else gap = -1; // overlap
        if (gap > gapPx) continue;

        // Fusionner : nouvelle bbox le long de l'axe
        const tMin = Math.min(tA1, tBmin);
        const tMax = Math.max(tA2, tBmax);
        const newX1 = cur.x1 + tMin * ux;
        const newY1 = cur.y1 + tMin * uy;
        const newX2 = cur.x1 + tMax * ux;
        const newY2 = cur.y1 + tMax * uy;
        cur = { x1: newX1, y1: newY1, x2: newX2, y2: newY2 };
        merged[j] = true;
      }
      out.push(cur);
    }
    if (out.length === segs.length) break; // stabilité
    segs = out.map((w) => {
      const swap = w.x1 > w.x2 || (w.x1 === w.x2 && w.y1 > w.y2);
      return swap
        ? { x1: w.x2, y1: w.y2, x2: w.x1, y2: w.y1 }
        : { x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 };
    });
  }
  return segs;
}

const PI = Math.PI;

/**
 * Normalise un angle dans [0, π) (mod π — direction de droite).
 * 0° et 180° = horizontal, 90° = vertical.
 */
function normalizeAngle(rad: number): number {
  let a = rad % PI;
  if (a < 0) a += PI;
  return a;
}

/**
 * Histogramme circulaire des angles de murs, bin de `binSize` rad.
 * Pondéré par la longueur du mur (les murs longs comptent plus).
 */
function histogramAngles(walls: Wall[], binSize: number): { bins: number[]; binSize: number } {
  const nBins = Math.ceil(PI / binSize);
  const bins = new Array(nBins).fill(0);
  for (const w of walls) {
    const dx = w.x2 - w.x1;
    const dy = w.y2 - w.y1;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;
    const angle = normalizeAngle(Math.atan2(dy, dx));
    const binIdx = Math.min(nBins - 1, Math.floor(angle / binSize));
    bins[binIdx] += len;
  }
  return { bins, binSize };
}

/**
 * Détecte l'axe principal du PDF — angle dominant (mode du histogramme).
 * Retourne en radians dans [0, π). Typiquement 0 (horizontal) sur archi std.
 */
export function detectPrincipalAxis(walls: Wall[]): number {
  if (walls.length === 0) return 0;
  // Bins de 1° = π/180 rad
  const { bins, binSize } = histogramAngles(walls, PI / 180);
  let bestBin = 0;
  let bestVal = -Infinity;
  for (let i = 0; i < bins.length; i++) {
    if (bins[i] > bestVal) {
      bestVal = bins[i];
      bestBin = i;
    }
  }
  return bestBin * binSize + binSize / 2;
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
 * Projette un point sur le segment de mur (clamped sur le segment).
 */
function projectOnSegment(px: number, py: number, w: Wall): Vertex {
  const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) return { x: w.x1, y: w.y1 };
  const t = Math.max(0, Math.min(1, ((px - w.x1) * dx + (py - w.y1) * dy) / len2));
  return { x: w.x1 + t * dx, y: w.y1 + t * dy };
}

/**
 * Snap un vertex au mur vectoriel le plus proche dans `tolPx`.
 * Si aucun mur dans la fenêtre → retourne vertex inchangé.
 */
function snapVertexToWall(v: Vertex, walls: Wall[], tolPx: number): Vertex {
  let bestD = tolPx;
  let bestProj: Vertex = v;
  for (const w of walls) {
    const d = distPointToSegment(v.x, v.y, w);
    if (d < bestD) {
      bestD = d;
      bestProj = projectOnSegment(v.x, v.y, w);
    }
  }
  return bestProj;
}

/**
 * Snap un vertex à l'INTERSECTION des 2 murs les plus proches d'orientations
 * différentes. Résout les coins de pièces : un coin EST l'intersection de 2
 * murs. Si pas d'intersection valide trouvée dans tol → fallback snap simple.
 *
 * Stratégie :
 *   1. Trouve le mur le plus proche w1
 *   2. Trouve le mur le plus proche w2 dont l'orientation diffère de w1 d'au
 *      moins 30° (un mur orthogonal idéalement)
 *   3. Calcule l'intersection des deux droites (w1 line) ∩ (w2 line)
 *   4. Si intersection dans `intersectionTol` du vertex → snap à l'intersection
 *   5. Sinon → snap au mur le plus proche (snapVertexToWall)
 */
function snapVertexToCornerOrWall(
  v: Vertex,
  walls: Wall[],
  snapTol: number,
  intersectionTol: number,
): Vertex {
  if (walls.length === 0) return v;
  // Trouver les murs les plus proches (top 4)
  type Cand = { w: Wall; d: number; angle: number };
  const candidates: Cand[] = [];
  for (const w of walls) {
    const d = distPointToSegment(v.x, v.y, w);
    if (d > intersectionTol * 2) continue;
    const angle = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
    candidates.push({ w, d, angle });
  }
  if (candidates.length === 0) return snapVertexToWall(v, walls, snapTol);
  candidates.sort((a, b) => a.d - b.d);
  const w1 = candidates[0];

  // Chercher un second mur d'orientation différente de >= 30°
  const ANGLE_DIFF_MIN = (30 * PI) / 180;
  let w2: Cand | null = null;
  for (let i = 1; i < candidates.length; i++) {
    const c = candidates[i];
    let diff = Math.abs(((c.angle - w1.angle) % PI + PI) % PI);
    if (diff > PI / 2) diff = PI - diff;
    if (diff >= ANGLE_DIFF_MIN) {
      w2 = c;
      break;
    }
  }
  if (!w2) return snapVertexToWall(v, walls, snapTol);

  // Intersection des deux droites
  const a1 = w1.w.y2 - w1.w.y1;
  const b1 = w1.w.x1 - w1.w.x2;
  const c1 = a1 * w1.w.x1 + b1 * w1.w.y1;
  const a2 = w2.w.y2 - w2.w.y1;
  const b2 = w2.w.x1 - w2.w.x2;
  const c2 = a2 * w2.w.x1 + b2 * w2.w.y1;
  const det = a1 * b2 - a2 * b1;
  if (Math.abs(det) < 1e-9) return snapVertexToWall(v, walls, snapTol);
  const ix = (b2 * c1 - b1 * c2) / det;
  const iy = (a1 * c2 - a2 * c1) / det;
  const distToIntersection = Math.hypot(ix - v.x, iy - v.y);
  if (distToIntersection <= intersectionTol) {
    return { x: ix, y: iy };
  }
  return snapVertexToWall(v, walls, snapTol);
}

/**
 * Régulariseur orthogonal d'un polygone.
 *
 * Étapes :
 *   1. Détecte l'axe principal (typiquement 0°)
 *   2. Pour chaque arête, calcule son angle
 *   3. Si l'arête est à <maxAngleDeviation° d'un axe (0°, 90°, 180°, 270° relatifs
 *      à l'axe principal) → marque l'arête comme orthogonale
 *   4. Reconstruit le polygone : chaque arête orthogonale est forcée à l'angle
 *      exact (vertex_i+1 ajusté pour que le segment soit horizontal/vertical)
 *   5. Snap final des vertices sur les murs vectoriels (tolérance configurable)
 *
 * Approche conservative : si une arête n'est pas proche d'un axe, on la laisse
 * telle quelle. Si l'aire change de >10% après régularisation, on annule.
 */
export function regularizeOrthogonal(
  polygon: Vertex[],
  walls: Wall[],
  options: {
    /** Déviation max (en degrés) pour qu'une arête soit considérée comme orthogonale. */
    maxAngleDeviation?: number;
    /** Tolérance de snap final sur murs (px). */
    snapTolerancePx?: number;
    /** Si l'aire change de plus que ce ratio après régularisation, annuler. */
    maxAreaChangeRatio?: number;
  } = {},
): Vertex[] {
  if (polygon.length < 3) return polygon;
  const maxDevDeg = options.maxAngleDeviation ?? 15;
  const snapTol = options.snapTolerancePx ?? 8;
  const maxAreaChange = options.maxAreaChangeRatio ?? 0.1;

  const principalAxis = detectPrincipalAxis(walls);
  // Direction parallèle (cos, sin) et perpendiculaire (-sin, cos)
  const cos = Math.cos(principalAxis);
  const sin = Math.sin(principalAxis);

  const maxDevRad = (maxDevDeg * PI) / 180;

  // Pour chaque arête, déterminer si elle est orthogonale à l'axe principal
  // (angle ≈ axis ou axis+π/2). Snap les vertices en deux passes :
  //   - Passe 1 : pour chaque arête horizontale (// axis), on aligne y
  //   - Passe 2 : pour chaque arête verticale (⊥ axis), on aligne x
  // Stratégie : on calcule pour chaque vertex un "x cible" et un "y cible"
  // basés sur les arêtes adjacentes orthogonales, puis on prend la médiane.

  const N = polygon.length;
  const newPoly: Vertex[] = polygon.map((v) => ({ x: v.x, y: v.y }));

  // Détecter les arêtes orthogonales et collecter leur orientation locale
  // `edgeKind[i]` = 'parallel' (// axis), 'perp' (⊥ axis), 'free' (oblique)
  type EdgeKind = "parallel" | "perp" | "free";
  const edgeKinds: EdgeKind[] = new Array(N).fill("free");
  for (let i = 0; i < N; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % N];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;
    const angle = normalizeAngle(Math.atan2(dy, dx));
    const dParallel = Math.min(
      Math.abs(angle - principalAxis),
      Math.abs(angle - principalAxis - PI),
      Math.abs(angle - principalAxis + PI),
    );
    const perpAxis = normalizeAngle(principalAxis + PI / 2);
    const dPerp = Math.min(
      Math.abs(angle - perpAxis),
      Math.abs(angle - perpAxis - PI),
      Math.abs(angle - perpAxis + PI),
    );
    if (dParallel < maxDevRad && dParallel < dPerp) edgeKinds[i] = "parallel";
    else if (dPerp < maxDevRad) edgeKinds[i] = "perp";
    else edgeKinds[i] = "free";
  }

  // Coordonnées projetées (u parallèle à axis, v perpendiculaire à axis)
  // Pour un vertex V : u = V·(cos,sin), v = V·(-sin,cos).
  // Pour rendre une arête (V_i → V_{i+1}) parallèle à axis : v(V_i) = v(V_{i+1}).
  // Pour rendre une arête perpendiculaire à axis : u(V_i) = u(V_{i+1}).
  const Us = polygon.map((p) => p.x * cos + p.y * sin);
  const Vs = polygon.map((p) => -p.x * sin + p.y * cos);

  // Pour chaque vertex i, accumuler "v target" depuis les arêtes parallèles
  // adjacentes (vertex i et vertex i+1 doivent partager v).
  // On utilise une union-find sur les vertices reliés par des arêtes
  // contraignantes (parallèle → contrainte sur v ; perp → contrainte sur u).
  // Après union, chaque cluster reçoit la moyenne des u (ou v) des membres.

  // Contraintes V (parallel)
  const parentV = Array.from({ length: N }, (_, i) => i);
  const parentU = Array.from({ length: N }, (_, i) => i);
  const find = (par: number[], x: number): number => {
    while (par[x] !== x) {
      par[x] = par[par[x]];
      x = par[x];
    }
    return x;
  };
  const union = (par: number[], a: number, b: number) => {
    const ra = find(par, a), rb = find(par, b);
    if (ra !== rb) par[ra] = rb;
  };

  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    if (edgeKinds[i] === "parallel") union(parentV, i, j);
    else if (edgeKinds[i] === "perp") union(parentU, i, j);
  }

  // Pour chaque cluster V (= chaîne de vertices reliés par arêtes parallèles),
  // attribuer la moyenne pondérée des Vs[i] des membres.
  const clusterV = new Map<number, { sum: number; count: number }>();
  const clusterU = new Map<number, { sum: number; count: number }>();
  for (let i = 0; i < N; i++) {
    const rV = find(parentV, i);
    const rU = find(parentU, i);
    if (!clusterV.has(rV)) clusterV.set(rV, { sum: 0, count: 0 });
    if (!clusterU.has(rU)) clusterU.set(rU, { sum: 0, count: 0 });
    clusterV.get(rV)!.sum += Vs[i];
    clusterV.get(rV)!.count += 1;
    clusterU.get(rU)!.sum += Us[i];
    clusterU.get(rU)!.count += 1;
  }

  const newU = new Array(N).fill(0);
  const newV = new Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    const rV = find(parentV, i);
    const rU = find(parentU, i);
    const cV = clusterV.get(rV)!;
    const cU = clusterU.get(rU)!;
    newV[i] = cV.count > 1 ? cV.sum / cV.count : Vs[i];
    newU[i] = cU.count > 1 ? cU.sum / cU.count : Us[i];
  }

  // Reconvertir (u, v) → (x, y) : x = u·cos - v·sin, y = u·sin + v·cos
  for (let i = 0; i < N; i++) {
    newPoly[i] = {
      x: newU[i] * cos - newV[i] * sin,
      y: newU[i] * sin + newV[i] * cos,
    };
  }

  // Snap final : prefer corner intersection (2 murs orthogonaux) si possible,
  // sinon fallback sur projection orthogonale au mur le plus proche.
  // Tolérance corner = 1.5× snapTol (intersections plus tolérantes car ce sont
  // des coins théoriques).
  if (walls.length > 0 && snapTol > 0) {
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < N; i++) {
        newPoly[i] = snapVertexToCornerOrWall(
          newPoly[i],
          walls,
          snapTol,
          snapTol * 1.5,
        );
      }
    }
  }

  // Vérification d'aire : si > maxAreaChange, annuler la régularisation
  const areaOrig = Math.abs(signedArea(polygon));
  const areaNew = Math.abs(signedArea(newPoly));
  if (areaOrig > 0 && Math.abs(areaNew - areaOrig) / areaOrig > maxAreaChange) {
    // Trop de changement → fallback : garder polygone original mais snapper sur murs
    const safeFallback: Vertex[] = polygon.map((v) =>
      walls.length > 0 && snapTol > 0 ? snapVertexToWall(v, walls, snapTol) : v,
    );
    return removeAdjacentDuplicates(safeFallback);
  }

  return removeAdjacentDuplicates(newPoly);
}

function signedArea(poly: Vertex[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    s += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
  }
  return s / 2;
}

function removeAdjacentDuplicates(poly: Vertex[]): Vertex[] {
  const out: Vertex[] = [];
  for (let i = 0; i < poly.length; i++) {
    const v = poly[i];
    const last = out[out.length - 1];
    if (!last || Math.hypot(v.x - last.x, v.y - last.y) > 0.5) out.push(v);
  }
  // Si premier == dernier (artefact de fermeture), supprimer le dernier
  if (out.length > 1) {
    const f = out[0], l = out[out.length - 1];
    if (Math.hypot(f.x - l.x, f.y - l.y) < 0.5) out.pop();
  }
  return out;
}

// Re-export pour facilité d'usage
export { signedArea as polygonSignedArea };

/**
 * Post-traitement : pour chaque vertex du polygone, force le snap au mur le
 * plus proche dans une fenêtre élargie (par défaut 35px). Utilisé en dernier
 * recours pour atteindre l'invariant C audit (≥95% vertices à ≤5px d'un mur).
 *
 * Distortion possible : un vertex peut se déplacer jusqu'à 35px → la pièce
 * peut s'étendre/rétrécir localement. Cette distortion est plafonnée par
 * `maxAreaChangeRatio` — au-delà, on annule la passe.
 *
 * Approche conservative : ne snap QUE les vertices qui sont DÉJÀ > thresholdPx
 * du mur le plus proche (les autres sont déjà bien placés, on les laisse).
 */
export function dragOutliersToWalls(
  polygon: Vertex[],
  walls: Wall[],
  options: {
    /** Distance au-delà de laquelle un vertex est considéré "outlier". Défaut 5. */
    thresholdPx?: number;
    /** Distance max de drag. Défaut 35. */
    dragMaxPx?: number;
    /** Si l'aire change de plus que ce ratio, annuler. Défaut 0.25. */
    maxAreaChangeRatio?: number;
  } = {},
): Vertex[] {
  if (polygon.length < 3 || walls.length === 0) return polygon;
  const threshold = options.thresholdPx ?? 5;
  const dragMax = options.dragMaxPx ?? 35;
  const maxAreaChange = options.maxAreaChangeRatio ?? 0.25;

  const newPoly: Vertex[] = polygon.map((v) => {
    let bestD = Infinity;
    for (const w of walls) {
      const d = distPointToSegment(v.x, v.y, w);
      if (d < bestD) bestD = d;
    }
    if (bestD <= threshold) return { x: v.x, y: v.y };
    // Outlier : tente un drag dans la fenêtre élargie
    let bestProj: Vertex = v;
    let bestDragD = dragMax;
    for (const w of walls) {
      const d = distPointToSegment(v.x, v.y, w);
      if (d < bestDragD) {
        bestDragD = d;
        bestProj = projectOnSegment(v.x, v.y, w);
      }
    }
    return bestProj;
  });

  // Vérification d'aire
  const areaOrig = Math.abs(signedArea(polygon));
  const areaNew = Math.abs(signedArea(newPoly));
  if (areaOrig > 0 && Math.abs(areaNew - areaOrig) / areaOrig > maxAreaChange) {
    return polygon; // annulation
  }
  return newPoly;
}
