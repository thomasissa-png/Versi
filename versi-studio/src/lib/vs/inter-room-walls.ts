/**
 * s28 tour 12 — SYNTHÈSE DE MURS DEPUIS FRONTIÈRES INTER-PIÈCES
 *
 * Le problème
 * -----------
 * Tour 11 a fixé Inv A 4/4 via smart-line-snap mais Inv C plafonne 52-92%
 * car certains vertices sont à 50-240px du mur PDF le plus proche. Cause
 * racine : extractInternalWallSegments() rate certaines cloisons fines ou
 * dashées, particulièrement aux jonctions ouvertes (Séjour/Cuisine/Couloir).
 *
 * L'observation décisive
 * ----------------------
 * Si la pièce A et la pièce B ont des arêtes qui se touchent (distance <5px
 * et angles parallèles), cette frontière EST un mur — qu'il soit visible
 * dans extractInternalWallSegments ou non. Les contours flood-fill sont
 * cohérents entre voisins (même grille pixel) ; leur frontière commune est
 * la matérialisation de la cloison réelle.
 *
 * Ce module
 * ---------
 * Extrait les segments de mur SYNTHÉTISÉS depuis les contours des pièces
 * voisines. Ces murs synthétiques sont ENSUITE re-snappés via
 * smartLineSnap pour normaliser les contours et minimiser les dérives
 * pixel-par-pixel.
 *
 * Limites
 * -------
 * - Les murs synthétisés ne remplacent PAS les murs PDF : ils s'AJOUTENT.
 * - Le snap audit Inv C utilise UNIQUEMENT les murs PDF. Donc l'amélioration
 *   d'Inv C vient indirectement : en snappant les contours sur les murs
 *   synthétiques, on régularise les escaliers pixel — les vertices se
 *   regroupent sur des lignes communes — qui SOUVENT coïncident à <5px
 *   avec un mur PDF voisin (cloison principale qui était juste hors radar
 *   du smart-line-snap par tolérance angulaire).
 */

export interface Pt { x: number; y: number }
export interface Wall { x1: number; y1: number; x2: number; y2: number }
export interface RoomLike {
  name: string;
  polygon: Pt[];
}

/**
 * Distance perpendiculaire signée d'un point à une droite (a→b).
 */
function perpDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return Math.hypot(px - ax, py - ay);
  return Math.abs(((dx) * (py - ay) - (dy) * (px - ax)) / len);
}

/**
 * Distance non-signée d'un point au SEGMENT (a→b), avec clamp aux extrémités.
 */
function distPointToSegment(
  px: number, py: number,
  ax: number, ay: number, bx: number, by: number,
): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Angle ABSOLU [0, 90°] entre 2 vecteurs (orientation ignorée).
 */
function vectorAngleAbsDeg(
  ax: number, ay: number, bx: number, by: number,
): number {
  const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
  if (la < 1e-9 || lb < 1e-9) return 0;
  const c = Math.abs((ax * bx + ay * by) / (la * lb));
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
}

/**
 * Test si 2 segments sont "proches et parallèles" : leurs droites supports
 * coïncident à `lateralTol` près, ils se chevauchent sur leur axe commun,
 * et l'angle entre eux est < `parallelTolDeg`.
 *
 * Retourne true si les deux segments matérialisent la même frontière physique
 * (= arête partagée entre 2 pièces).
 */
function segmentsAreCoincident(
  a: Wall, b: Wall,
  lateralTolPx: number,
  parallelTolDeg: number,
  overlapMinPx: number,
): boolean {
  const adx = a.x2 - a.x1, ady = a.y2 - a.y1;
  const bdx = b.x2 - b.x1, bdy = b.y2 - b.y1;
  const aLen = Math.hypot(adx, ady);
  const bLen = Math.hypot(bdx, bdy);
  if (aLen < 1e-6 || bLen < 1e-6) return false;
  // 1. Angle parallèle ?
  const ang = vectorAngleAbsDeg(adx, ady, bdx, bdy);
  if (ang > parallelTolDeg) return false;
  // 2. Les 4 endpoints de B sont-ils proches de la droite-A (latéralement) ?
  const d1 = perpDist(b.x1, b.y1, a.x1, a.y1, a.x2, a.y2);
  const d2 = perpDist(b.x2, b.y2, a.x1, a.y1, a.x2, a.y2);
  if (d1 > lateralTolPx || d2 > lateralTolPx) return false;
  // 3. Overlap longitudinal — projeter B sur l'axe de A
  const axn = adx / aLen, ayn = ady / aLen;
  const tB1 = ((b.x1 - a.x1) * axn + (b.y1 - a.y1) * ayn);
  const tB2 = ((b.x2 - a.x1) * axn + (b.y2 - a.y1) * ayn);
  const tBmin = Math.min(tB1, tB2);
  const tBmax = Math.max(tB1, tB2);
  // Segment-A va de t=0 à t=aLen
  const overlapMin = Math.max(0, tBmin);
  const overlapMax = Math.min(aLen, tBmax);
  return (overlapMax - overlapMin) >= overlapMinPx;
}

/**
 * Convertit un polygone en liste d'arêtes (Wall).
 */
function polygonEdges(polygon: Pt[]): Wall[] {
  const edges: Wall[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    edges.push({
      x1: polygon[i].x, y1: polygon[i].y,
      x2: polygon[j].x, y2: polygon[j].y,
    });
  }
  return edges;
}

export interface SynthesizeOptions {
  /** Distance latérale max entre 2 arêtes pour les considérer "même mur". */
  lateralTolPx?: number;
  /** Angle max entre 2 arêtes parallèles. */
  parallelTolDeg?: number;
  /** Longueur minimale d'overlap pour valider la frontière commune. */
  overlapMinPx?: number;
  /** Longueur minimale du mur synthétique retourné. */
  minWallLenPx?: number;
}

/**
 * Pour chaque PAIRE de pièces, identifie les arêtes coïncidentes (= frontière
 * commune) et retourne la liste des murs synthétiques (= arêtes ré-utilisables
 * comme cibles de snap).
 *
 * Le mur retourné est l'arête de la PREMIÈRE pièce (arbitraire mais cohérent).
 *
 * Garantie : les murs retournés sont des arêtes RÉELLES de pièces existantes,
 * pas des murs inventés. Donc le snap dessus = snap sur une frontière déjà
 * cohérente de la géométrie.
 */
export function synthesizeInterRoomWalls(
  rooms: RoomLike[],
  options: SynthesizeOptions = {},
): Wall[] {
  const {
    lateralTolPx = 5,
    parallelTolDeg = 8,
    overlapMinPx = 8,
    minWallLenPx = 8,
  } = options;

  if (rooms.length < 2) return [];

  // Précalculer les arêtes de chaque pièce
  const allEdges: Wall[][] = rooms.map((r) => polygonEdges(r.polygon));
  const synthetic: Wall[] = [];
  const seenKeys = new Set<string>();

  for (let i = 0; i < rooms.length; i++) {
    const edgesA = allEdges[i];
    for (let j = i + 1; j < rooms.length; j++) {
      const edgesB = allEdges[j];
      for (const eA of edgesA) {
        const lenA = Math.hypot(eA.x2 - eA.x1, eA.y2 - eA.y1);
        if (lenA < minWallLenPx) continue;
        for (const eB of edgesB) {
          const lenB = Math.hypot(eB.x2 - eB.x1, eB.y2 - eB.y1);
          if (lenB < minWallLenPx) continue;
          if (!segmentsAreCoincident(eA, eB, lateralTolPx, parallelTolDeg, overlapMinPx)) continue;
          // Frontière commune trouvée → garder l'arête de A comme mur synthétique
          // Dédup : utilise une clé arrondie pour éviter doublons quasi-identiques
          const key = [
            Math.round(eA.x1 / 2) * 2,
            Math.round(eA.y1 / 2) * 2,
            Math.round(eA.x2 / 2) * 2,
            Math.round(eA.y2 / 2) * 2,
          ].sort().join(",");
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);
          synthetic.push({ x1: eA.x1, y1: eA.y1, x2: eA.x2, y2: eA.y2 });
        }
      }
    }
  }
  return synthetic;
}

/**
 * Pour chaque pièce, identifie les arêtes en contact avec le contour LOT
 * (les murs externes du lot ne sont pas dans extractInternalWallSegments).
 *
 * Retourne les arêtes-pièce qui longent à <`tolPx` près une arête du lotPolygon.
 */
export function synthesizeRoomToLotWalls(
  rooms: RoomLike[],
  lotPolygon: Pt[],
  options: SynthesizeOptions = {},
): Wall[] {
  const {
    lateralTolPx = 5,
    parallelTolDeg = 8,
    overlapMinPx = 8,
    minWallLenPx = 8,
  } = options;

  if (rooms.length === 0 || lotPolygon.length < 3) return [];
  const lotEdges = polygonEdges(lotPolygon);
  const synthetic: Wall[] = [];
  const seenKeys = new Set<string>();

  for (const r of rooms) {
    const roomEdges = polygonEdges(r.polygon);
    for (const eR of roomEdges) {
      const lenR = Math.hypot(eR.x2 - eR.x1, eR.y2 - eR.y1);
      if (lenR < minWallLenPx) continue;
      for (const eL of lotEdges) {
        const lenL = Math.hypot(eL.x2 - eL.x1, eL.y2 - eL.y1);
        if (lenL < minWallLenPx) continue;
        if (!segmentsAreCoincident(eR, eL, lateralTolPx, parallelTolDeg, overlapMinPx)) continue;
        const key = [
          Math.round(eR.x1 / 2) * 2,
          Math.round(eR.y1 / 2) * 2,
          Math.round(eR.x2 / 2) * 2,
          Math.round(eR.y2 / 2) * 2,
        ].sort().join(",");
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        synthetic.push({ x1: eR.x1, y1: eR.y1, x2: eR.x2, y2: eR.y2 });
      }
    }
  }
  return synthetic;
}

/**
 * Statistiques d'une synthèse, pour debug/audit.
 */
export interface SynthesizeStats {
  roomsCount: number;
  pairsTested: number;
  interRoomWalls: number;
  lotWalls: number;
  totalSyntheticWalls: number;
}

/**
 * Variante "with stats" qui retourne aussi des métriques.
 */
export function synthesizeAllSyntheticWalls(
  rooms: RoomLike[],
  lotPolygon: Pt[],
  options: SynthesizeOptions = {},
): { walls: Wall[]; stats: SynthesizeStats } {
  const interRoom = synthesizeInterRoomWalls(rooms, options);
  const lotW = synthesizeRoomToLotWalls(rooms, lotPolygon, options);
  return {
    walls: [...interRoom, ...lotW],
    stats: {
      roomsCount: rooms.length,
      pairsTested: (rooms.length * (rooms.length - 1)) / 2,
      interRoomWalls: interRoom.length,
      lotWalls: lotW.length,
      totalSyntheticWalls: interRoom.length + lotW.length,
    },
  };
}

/**
 * Compte les vertices "outliers" : à distance > tolPx de tout mur dans `walls`.
 */
export function countOutliers(
  rooms: RoomLike[],
  walls: Wall[],
  tolPx: number,
): { total: number; outliers: number } {
  let total = 0, outliers = 0;
  for (const r of rooms) {
    for (const v of r.polygon) {
      total++;
      let bestD = Infinity;
      for (const w of walls) {
        const d = distPointToSegment(v.x, v.y, w.x1, w.y1, w.x2, w.y2);
        if (d < bestD) bestD = d;
        if (bestD <= tolPx) break;
      }
      if (bestD > tolPx) outliers++;
    }
  }
  return { total, outliers };
}
