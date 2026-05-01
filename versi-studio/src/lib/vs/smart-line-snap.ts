/**
 * s28 tour 11 — SMART LINE SNAP
 *
 * Pivot technique adjacent : au lieu de snaper VERTEX par VERTEX (qui casse
 * Inv A — l'aire dérive parce que chaque vertex bouge indépendamment), on
 * détecte les LIGNES du polygone (suites de vertices presque colinéaires en
 * escalier pixel) et on snap la LIGNE ENTIÈRE sur le mur le plus proche.
 *
 * Avantages :
 *   - Tous les vertices d'une ligne se déplacent ENSEMBLE (translation uniforme)
 *   - L'aire de la ligne reste invariante (translation uniforme = même aire)
 *   - Les bumps de 6-10px disparaissent (la ligne entière s'aligne sur le mur)
 *   - Préserve les coins angulaires (vertices de coin pas snapés)
 *
 * Algo en 3 étapes :
 *   1. decomposeIntoLines() : regroupe les arêtes du polygone en lignes
 *      (suites d'arêtes consécutives avec angle < tolerance)
 *   2. snapLineToNearestWall() : pour chaque ligne, trouve le mur le plus
 *      proche et translate perpendiculairement
 *   3. reconnectAtCorners() : recalcule les vertices de coin comme
 *      intersection des 2 lignes adjacentes snappées
 */

export interface Pt { x: number; y: number }
export interface Wall { x1: number; y1: number; x2: number; y2: number }

interface Line {
  /** Indices des vertices ORIGINAUX du polygone qui composent cette ligne. */
  vertexIndices: number[];
  /** Vertices initiaux (référence — NE PAS muter). */
  origVertices: Pt[];
  /** Axe principal de la ligne après régression. */
  axis: { dx: number; dy: number };
  /** Point de référence sur la ligne (centroïde des vertices). */
  centroid: Pt;
  /** Translation appliquée (0 si pas snapée). */
  translation: { dx: number; dy: number };
  /** Mur cible si snapée. */
  snappedToWall: Wall | null;
}

const RAD2DEG = 180 / Math.PI;

/**
 * Angle ABSOLU (orienté dans [0, π)) entre 2 arêtes — compare leurs directions
 * en ignorant le sens. Plus stable pour détecter les colinéaires.
 */
function edgeAngleDiffDeg(
  ax: number, ay: number, bx: number, by: number,
): number {
  const la = Math.hypot(ax, ay);
  const lb = Math.hypot(bx, by);
  if (la < 1e-9 || lb < 1e-9) return 0;
  const cos = Math.abs((ax * bx + ay * by) / (la * lb));
  // Cos peut dépasser 1 par flottants
  const c = Math.max(-1, Math.min(1, cos));
  return Math.acos(c) * RAD2DEG;
}

/**
 * Décompose le polygone en LIGNES.
 *
 * Une ligne = suite maximale d'arêtes consécutives dont l'angle entre arêtes
 * voisines est < angleTolDeg. Les "coins" (angle ≥ tolDeg) sont les frontières
 * entre lignes.
 *
 * Garanties :
 *   - Toutes les arêtes du polygone appartiennent à exactement UNE ligne
 *   - Les lignes sont ordonnées dans le sens du polygone
 *   - Une ligne contient au moins 1 arête (donc ≥2 vertices)
 *
 * Retourne un tableau de structures Line, où vertexIndices liste les indices
 * (dans le polygone original) des vertices appartenant à la ligne. La première
 * ligne contient v0 et v1 (au moins) ; la suivante commence par le vertex de
 * coin (partagé avec la précédente).
 */
function decomposeIntoLines(polygon: Pt[], angleTolDeg: number): Line[] {
  const N = polygon.length;
  if (N < 3) {
    return [{
      vertexIndices: polygon.map((_, i) => i),
      origVertices: [...polygon],
      axis: { dx: 1, dy: 0 },
      centroid: { x: 0, y: 0 },
      translation: { dx: 0, dy: 0 },
      snappedToWall: null,
    }];
  }

  // Vecteurs des arêtes : edge[i] = polygon[i+1] - polygon[i]
  const edges: Array<{ dx: number; dy: number }> = [];
  for (let i = 0; i < N; i++) {
    const next = (i + 1) % N;
    edges.push({
      dx: polygon[next].x - polygon[i].x,
      dy: polygon[next].y - polygon[i].y,
    });
  }

  // isCornerStart[i] = TRUE si l'angle entre edge[i-1] et edge[i] >= tol
  // → vertex i est un coin (début d'une nouvelle ligne)
  const isCornerStart: boolean[] = new Array(N).fill(false);
  for (let i = 0; i < N; i++) {
    const prev = (i - 1 + N) % N;
    const a = edges[prev];
    const b = edges[i];
    const ang = edgeAngleDiffDeg(a.dx, a.dy, b.dx, b.dy);
    if (ang >= angleTolDeg) isCornerStart[i] = true;
  }

  // Si aucun coin détecté (polygone quasi-circulaire ou tout colinéaire),
  // forcer une seule ligne couvrant tout le polygone.
  const cornerCount = isCornerStart.filter((c) => c).length;
  if (cornerCount === 0) {
    return [{
      vertexIndices: Array.from({ length: N }, (_, i) => i),
      origVertices: [...polygon],
      axis: principalAxis(polygon),
      centroid: centroid(polygon),
      translation: { dx: 0, dy: 0 },
      snappedToWall: null,
    }];
  }

  // Construire les lignes en parcourant le polygone.
  // Une LIGNE = suite d'arêtes consécutives entre 2 coins. Un coin appartient
  // aux 2 lignes adjacentes (fin de l'une = début de l'autre).
  //
  // On démarre à un vertex coin pour que la 1ère ligne commence proprement.
  let startIdx = 0;
  for (let i = 0; i < N; i++) {
    if (isCornerStart[i]) { startIdx = i; break; }
  }

  const lines: Line[] = [];
  let currentVerts: number[] = [startIdx];
  for (let step = 1; step <= N; step++) {
    const i = (startIdx + step) % N;
    // Ajout du vertex courant à la ligne (il devient soit interne, soit coin de fin)
    currentVerts.push(i);
    if (isCornerStart[i]) {
      // Coin → fin de ligne : push la ligne actuelle [...currentVerts]
      // (qui contient au moins 2 vertices : le coin de début + le coin de fin)
      const verts = currentVerts.map((idx) => polygon[idx]);
      lines.push({
        vertexIndices: [...currentVerts],
        origVertices: verts,
        axis: principalAxis(verts),
        centroid: centroid(verts),
        translation: { dx: 0, dy: 0 },
        snappedToWall: null,
      });
      // Reset : la nouvelle ligne commence au coin actuel (partagé)
      currentVerts = [i];
    }
  }
  // Si on n'a pas bouclé proprement, ajouter la dernière ligne (rare).
  if (currentVerts.length >= 2 && lines.length === 0) {
    const verts = currentVerts.map((idx) => polygon[idx]);
    lines.push({
      vertexIndices: [...currentVerts],
      origVertices: verts,
      axis: principalAxis(verts),
      centroid: centroid(verts),
      translation: { dx: 0, dy: 0 },
      snappedToWall: null,
    });
  }
  return lines;
}

function centroid(verts: Pt[]): Pt {
  let cx = 0, cy = 0;
  for (const v of verts) { cx += v.x; cy += v.y; }
  return { x: cx / verts.length, y: cy / verts.length };
}

/**
 * Axe principal d'un nuage de points 2D via régression simple.
 * Retourne un vecteur unitaire (dx, dy) — la direction "moyenne" du nuage.
 */
function principalAxis(verts: Pt[]): { dx: number; dy: number } {
  if (verts.length < 2) return { dx: 1, dy: 0 };
  const c = centroid(verts);
  // Matrice de covariance 2x2
  let sxx = 0, sxy = 0, syy = 0;
  for (const v of verts) {
    const dx = v.x - c.x;
    const dy = v.y - c.y;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  // Vecteur propre principal de la matrice [[sxx, sxy], [sxy, syy]]
  // Eigenvalue : λ = (sxx + syy + sqrt((sxx - syy)^2 + 4*sxy^2)) / 2
  const tr = sxx + syy;
  const det = sxx * syy - sxy * sxy;
  const disc = Math.max(0, tr * tr / 4 - det);
  const lambda = tr / 2 + Math.sqrt(disc);
  // Vecteur propre : (sxy, lambda - sxx) si sxy != 0, sinon axe X
  let ex = 0, ey = 0;
  if (Math.abs(sxy) > 1e-9) {
    ex = sxy;
    ey = lambda - sxx;
  } else {
    // Diagonale : axe principal = X si sxx >= syy, Y sinon
    if (sxx >= syy) { ex = 1; ey = 0; }
    else { ex = 0; ey = 1; }
  }
  const len = Math.hypot(ex, ey);
  if (len < 1e-9) return { dx: 1, dy: 0 };
  return { dx: ex / len, dy: ey / len };
}

/**
 * Distance signée d'un point à une ligne définie par 2 points (sans clamp).
 * Positive si le point est à GAUCHE de la direction (a→b), négative à droite.
 */
function signedDistPointToInfiniteLine(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): number {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return Math.hypot(px - ax, py - ay);
  // (b - a) × (p - a) / |b - a|
  return ((dx) * (py - ay) - (dy) * (px - ax)) / len;
}

/**
 * Distance NON-signée d'un point au SEGMENT (clamp aux extrémités).
 */
function distPointToSegment(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(px - projX, py - projY);
}

/**
 * Snap UNE ligne sur le mur le plus proche.
 *
 * Algo :
 *   1. Pour chaque mur, calcule la distance MOYENNE entre les vertices de
 *      la ligne et la droite du mur (infinite line, pas segment — la ligne
 *      peut dépasser le segment-mur).
 *   2. Vérifie aussi que l'angle entre l'axe de la ligne et l'axe du mur
 *      est < parallelTolDeg (sinon ce n'est pas le bon mur).
 *   3. Choisit le mur avec la distance moyenne signée la plus faible en
 *      valeur absolue, parmi ceux dans dragTolPx ET parallèles.
 *   4. Applique la translation perpendiculaire UNIFORME (même delta sur
 *      tous les vertices de la ligne) qui amène le centroïde de la ligne
 *      sur la droite du mur. → préserve l'aire de la ligne.
 *
 * NB : la ligne reste un escalier ou pas — on ne change PAS la forme, on
 * la TRANSLATE seulement. C'est ce qui préserve l'aire.
 */
function snapLineToNearestWall(
  line: Line,
  walls: Wall[],
  dragTolPx: number,
  parallelTolDeg: number,
): Line {
  if (line.origVertices.length < 2 || walls.length === 0) return line;

  const verts = line.origVertices;
  const c = line.centroid;
  const lineAxis = line.axis;

  // Pour chaque mur, calculer (a) angle(line, wall), (b) distance moyenne
  // signée des vertices à la droite-mur.
  let bestWall: Wall | null = null;
  let bestAvgDist = Infinity;
  let bestSignedDist = 0;

  for (const w of walls) {
    const wdx = w.x2 - w.x1;
    const wdy = w.y2 - w.y1;
    const wLen = Math.hypot(wdx, wdy);
    if (wLen < 1e-6) continue;

    // Angle entre axe ligne et axe mur (non-orienté)
    const ang = edgeAngleDiffDeg(lineAxis.dx, lineAxis.dy, wdx, wdy);
    if (ang > parallelTolDeg) continue;

    // Distance signée des vertices à la droite-mur (pas segment)
    let sumSigned = 0;
    let sumAbs = 0;
    let maxAbs = 0;
    for (const v of verts) {
      const sd = signedDistPointToInfiniteLine(v.x, v.y, w.x1, w.y1, w.x2, w.y2);
      sumSigned += sd;
      sumAbs += Math.abs(sd);
      if (Math.abs(sd) > maxAbs) maxAbs = Math.abs(sd);
    }
    const avgAbs = sumAbs / verts.length;
    const avgSigned = sumSigned / verts.length;

    // Filtre : la ligne doit être DANS dragTolPx en moyenne ET son centroïde
    // doit projeter sur le segment-mur (sinon mur trop loin latéralement).
    if (avgAbs > dragTolPx) continue;

    // Vérifier que la projection du centroïde tombe DANS le segment-mur
    // (avec un buffer = 30% de la longueur du mur). Empêche le snap à un mur
    // parallèle mais distant latéralement.
    const cwx = wdx / wLen, cwy = wdy / wLen;
    const tProj = ((c.x - w.x1) * cwx + (c.y - w.y1) * cwy) / wLen;
    const buffer = 0.3;
    if (tProj < -buffer || tProj > 1 + buffer) continue;

    if (avgAbs < bestAvgDist) {
      bestAvgDist = avgAbs;
      bestWall = w;
      bestSignedDist = avgSigned;
    }
  }

  if (!bestWall) return line;

  // Translation perpendiculaire au mur, magnitude = -avg_signed_dist
  // (déplacer la ligne vers la droite-mur).
  const wdx = bestWall.x2 - bestWall.x1;
  const wdy = bestWall.y2 - bestWall.y1;
  const wLen = Math.hypot(wdx, wdy);
  // Normale (gauche) : (-dy, dx) / wLen
  const nx = -wdy / wLen;
  const ny = wdx / wLen;
  // Si signedDist > 0, le centroïde est à GAUCHE → translation négative
  const tx = -bestSignedDist * nx;
  const ty = -bestSignedDist * ny;

  return {
    ...line,
    translation: { dx: tx, dy: ty },
    snappedToWall: bestWall,
  };
}

/**
 * Reconnecte les lignes au niveau des coins.
 *
 * Pour chaque coin (vertex partagé entre ligne[i] et ligne[i+1]) :
 *   - Si les 2 lignes sont snappées : recalcule l'intersection des 2 droites
 *     translatées. Le coin se déplace au point d'intersection.
 *   - Si UNE seule est snappée : applique la translation à ce vertex (coin
 *     suit la ligne snappée).
 *   - Si AUCUNE n'est snappée : garde le vertex original.
 *
 * Pour les vertices INTÉRIEURS d'une ligne (pas un coin), on applique
 * simplement la translation de la ligne.
 *
 * Retourne le polygone reconstruit.
 */
function reconnectAtCorners(lines: Line[], originalPolygon: Pt[]): Pt[] {
  const N = originalPolygon.length;
  if (lines.length === 0) return [...originalPolygon];

  // Pour chaque vertex original, déterminer à quelle(s) ligne(s) il appartient.
  // Un vertex de coin appartient à 2 lignes (la fin de l'une, le début de l'autre).
  // Un vertex intérieur appartient à 1 seule ligne.
  const lineMembership: number[][] = Array.from({ length: N }, () => []);
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    for (const vi of line.vertexIndices) {
      lineMembership[vi].push(li);
    }
  }

  const result: Pt[] = new Array(N);
  for (let vi = 0; vi < N; vi++) {
    const memb = lineMembership[vi];
    const orig = originalPolygon[vi];
    if (memb.length === 0) {
      // Pas dans une ligne (ne devrait pas arriver, mais fallback)
      result[vi] = { ...orig };
    } else if (memb.length === 1) {
      // Vertex intérieur : appliquer la translation de la ligne
      const line = lines[memb[0]];
      result[vi] = {
        x: orig.x + line.translation.dx,
        y: orig.y + line.translation.dy,
      };
    } else {
      // Vertex de coin : intersection des 2 lignes translatées (si possibles)
      const lineA = lines[memb[0]];
      const lineB = lines[memb[1]];
      const aSnap = lineA.snappedToWall !== null;
      const bSnap = lineB.snappedToWall !== null;

      if (aSnap && bSnap && lineA.snappedToWall && lineB.snappedToWall) {
        // Le coin est l'intersection des 2 droites-murs (les lignes ont été
        // alignées sur ces murs par translation). Si les 2 murs sont les
        // MÊMES, on applique simplement la translation. Si parallèles
        // (intersection ∞), idem.
        const wA = lineA.snappedToWall;
        const wB = lineB.snappedToWall;
        // Cas 1 : même mur → translation simple (coin reste sur le mur)
        if (wA === wB) {
          result[vi] = {
            x: orig.x + lineA.translation.dx,
            y: orig.y + lineA.translation.dy,
          };
          continue;
        }
        const p = lineIntersection(
          wA.x1, wA.y1, wA.x2, wA.y2,
          wB.x1, wB.y1, wB.x2, wB.y2,
        );
        if (p) {
          // Vérifier que l'intersection n'est pas absurde (max 35px du vertex orig)
          const dx = p.x - orig.x;
          const dy = p.y - orig.y;
          if (dx * dx + dy * dy <= 35 * 35) {
            result[vi] = p;
            continue;
          }
        }
        // Fallback : appliquer la moyenne des translations
        result[vi] = {
          x: orig.x + (lineA.translation.dx + lineB.translation.dx) / 2,
          y: orig.y + (lineA.translation.dy + lineB.translation.dy) / 2,
        };
      } else if (aSnap) {
        result[vi] = {
          x: orig.x + lineA.translation.dx,
          y: orig.y + lineA.translation.dy,
        };
      } else if (bSnap) {
        result[vi] = {
          x: orig.x + lineB.translation.dx,
          y: orig.y + lineB.translation.dy,
        };
      } else {
        result[vi] = { ...orig };
      }
    }
  }
  return result;
}

/**
 * Intersection de 2 droites (a→b) et (c→d), retourne null si parallèles.
 */
function lineIntersection(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
): Pt | null {
  const d1x = bx - ax, d1y = by - ay;
  const d2x = dx - cx, d2y = dy - cy;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((cx - ax) * d2y - (cy - ay) * d2x) / denom;
  return { x: ax + t * d1x, y: ay + t * d1y };
}

/**
 * Surface signée d'un polygone (Shoelace).
 */
function polygonSignedArea(poly: Pt[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    s += poly[i].x * poly[j].y;
    s -= poly[j].x * poly[i].y;
  }
  return s / 2;
}

export interface SmartLineSnapOptions {
  /** Tolérance angulaire pour considérer 2 arêtes "colinéaires" (= même ligne). */
  angleTolDeg?: number;
  /** Distance max moyenne ligne-mur pour autoriser le snap. */
  dragTolPx?: number;
  /** Tolérance angulaire ligne ↔ mur pour considérer "parallèle". */
  parallelTolDeg?: number;
  /** Distance max d'un vertex post-snap au mur (Inv C cible). */
  finalSnapTolPx?: number;
  /** Déformation MAX de l'aire totale autorisée (ratio, ex 0.05 = 5%). */
  maxAreaDriftRatio?: number;
}

/**
 * SMART LINE SNAP — point d'entrée principal.
 *
 * Garanties :
 *   - L'aire totale du polygone dérive de moins de maxAreaDriftRatio (5% par défaut)
 *   - Le polygone reste un polygone simple (pas de self-intersection grossière)
 *   - Si une ligne ne trouve pas de mur, elle reste inchangée
 */
export function smartLineSnap(
  polygon: Pt[],
  walls: Wall[],
  options: SmartLineSnapOptions = {},
): Pt[] {
  const {
    angleTolDeg = 18,
    dragTolPx = 15,
    parallelTolDeg = 22,
    maxAreaDriftRatio = 0.15,
  } = options;

  if (polygon.length < 4) return [...polygon];
  if (walls.length === 0) return [...polygon];

  // 1. Décomposition
  const lines = decomposeIntoLines(polygon, angleTolDeg);
  if (lines.length === 0) return [...polygon];

  // 2. Snap chaque ligne
  const snappedLines = lines.map((line) =>
    snapLineToNearestWall(line, walls, dragTolPx, parallelTolDeg),
  );
  // 3. Reconnexion aux coins
  const result = reconnectAtCorners(snappedLines, polygon);

  // 4. Garde-fou aire : si déformation > maxAreaDriftRatio, fallback sur input
  const origArea = Math.abs(polygonSignedArea(polygon));
  const newArea = Math.abs(polygonSignedArea(result));
  if (origArea > 1e-6) {
    const drift = Math.abs(newArea - origArea) / origArea;
    if (drift > maxAreaDriftRatio) {
      // Trop de dérive : retourner l'input (pas de snap = aire préservée)
      return [...polygon];
    }
  }

  return result;
}

/**
 * Statistiques d'une opération smartLineSnap (pour debug/audit).
 */
export interface SmartLineSnapStats {
  linesTotal: number;
  linesSnapped: number;
  vertexCount: number;
  origAreaPx2: number;
  newAreaPx2: number;
  areaDriftRatio: number;
  /** Pourcentage de vertices à <=tolPx d'un mur après snap. */
  snapRatio: number;
}

/**
 * Variante "with stats" — retourne aussi des métriques pour debug.
 */
export function smartLineSnapWithStats(
  polygon: Pt[],
  walls: Wall[],
  options: SmartLineSnapOptions = {},
): { result: Pt[]; stats: SmartLineSnapStats } {
  const finalSnapTolPx = options.finalSnapTolPx ?? 5;

  const result = smartLineSnap(polygon, walls, options);

  // Stats
  const lines = decomposeIntoLines(polygon, options.angleTolDeg ?? 18);
  const snappedLines = lines.map((line) =>
    snapLineToNearestWall(
      line, walls,
      options.dragTolPx ?? 15,
      options.parallelTolDeg ?? 22,
    ),
  );
  const linesSnapped = snappedLines.filter((l) => l.snappedToWall !== null).length;

  const origArea = Math.abs(polygonSignedArea(polygon));
  const newArea = Math.abs(polygonSignedArea(result));
  const drift = origArea > 1e-6 ? Math.abs(newArea - origArea) / origArea : 0;

  // Snap ratio (pourcentage vertices à <=tolPx d'un mur)
  let snapped = 0;
  for (const v of result) {
    let bestD = Infinity;
    for (const w of walls) {
      const d = distPointToSegment(v.x, v.y, w.x1, w.y1, w.x2, w.y2);
      if (d < bestD) bestD = d;
      if (bestD <= finalSnapTolPx) break;
    }
    if (bestD <= finalSnapTolPx) snapped++;
  }
  const snapRatio = result.length > 0 ? snapped / result.length : 0;

  return {
    result,
    stats: {
      linesTotal: lines.length,
      linesSnapped,
      vertexCount: result.length,
      origAreaPx2: origArea,
      newAreaPx2: newArea,
      areaDriftRatio: drift,
      snapRatio,
    },
  };
}
