/**
 * Clustering IA — Helpers pour le regroupement des pièces par unit_id.
 *
 * Extraits de la route d'extraction pour permettre le test unitaire.
 * Utilisés par POST /api/vs/projects/[id]/extract.
 *
 * versi-s21 : Clustering IA + Polygones IA
 */

import type { ExtractedRoom } from "./schemas";

// ─── Types ──────────────────────────────────────────────────────────

export interface UnitGroup {
  floor: number;
  unitId: string;
  rooms: ExtractedRoom[];
  confidenceAvg: number;
  confidenceMin: number;
  /**
   * versi-s23 P2 : si ce groupe est le résultat d'un merge duplex cross-floor,
   * liste des unitIds sources mergés. Absent si groupe non mergé (cas nominal s21).
   * Utilisé pour traçabilité + affichage UI (badge "Duplex R+2/R+3").
   */
  mergedFrom?: string[];
}

export interface EnvelopeBbox {
  type: "rect";
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
}

// ─── Constantes ─────────────────────────────────────────────────────

/** Seuil de confiance minimum pour pré-créer un lot IA */
export const CLUSTERING_CONFIDENCE_THRESHOLD = 0.7;

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Génère le nom d'un lot depuis le nombre de pièces habitables.
 * Ex: 3 pièces habitables → "T3", 1 → "Studio", 0 → "Lot".
 *
 * I2 versi-s21 : si 3+ lots sur le même étage, suffixe numérique
 * triable (#1, #2, #3) par position X croissante au lieu du
 * binaire gauche/droite qui produisait des collisions.
 * `positionIndex` = index du groupe trié par avgX sur l'étage.
 */
export function generateLotName(
  habitableCount: number,
  floor: number,
  positionIndex: number,
  totalOnFloor: number,
  avgX: number
): string {
  let typeName: string;
  if (habitableCount <= 0) {
    typeName = "Lot";
  } else if (habitableCount === 1) {
    typeName = "Studio";
  } else {
    typeName = `T${habitableCount}`;
  }

  const floorLabel = floor === 0 ? "RDC" : `Étage ${floor}`;

  // Suffixe position si plusieurs lots sur le même étage
  let suffix = "";
  if (totalOnFloor >= 3) {
    // Numéroter 1..N par position X croissante (positionIndex fourni par le caller)
    suffix = ` #${positionIndex + 1}`;
  } else if (totalOnFloor === 2) {
    suffix = avgX < 50 ? " gauche" : " droite";
  }

  return `${typeName} ${floorLabel}${suffix}`;
}

/**
 * Calcule la bounding box englobante d'un ensemble de pièces.
 * Retourne un objet zone_data au format ZoneRect pour vs_lots.
 */
export function computeEnvelopeBbox(rooms: ExtractedRoom[]): EnvelopeBbox {
  let minX = 100,
    minY = 100,
    maxX = 0,
    maxY = 0;

  for (const room of rooms) {
    const bb = room.bounding_box;
    if (!bb) continue;
    const rx = bb.x_percent;
    const ry = bb.y_percent;
    const rw = bb.width_percent;
    const rh = bb.height_percent;
    if (rx < minX) minX = rx;
    if (ry < minY) minY = ry;
    if (rx + rw > maxX) maxX = rx + rw;
    if (ry + rh > maxY) maxY = ry + rh;
  }

  // Clamp
  minX = Math.max(0, minX);
  minY = Math.max(0, minY);
  maxX = Math.min(100, maxX);
  maxY = Math.min(100, maxY);

  // I3 versi-s21 : si aucune pièce n'avait de bounding_box valide,
  // minX/maxX restent à leurs valeurs initiales (100/0) → dimensions négatives.
  // Fallback plein cadre pour éviter une zone invalide.
  if (maxX <= minX || maxY <= minY) {
    return { type: "rect", x_percent: 0, y_percent: 0, width_percent: 100, height_percent: 100 };
  }

  return {
    type: "rect",
    x_percent: minX,
    y_percent: minY,
    width_percent: maxX - minX,
    height_percent: maxY - minY,
  };
}

/**
 * Groupe les pièces par (floor, unit_id) et calcule la confiance moyenne.
 *
 * U2 versi-s21 : filtre groupes ≥ 2 pièces + confidenceMin ≥ 0.5.
 * I1 versi-s21 : nested Map<floor, Map<unitId, rooms>> au lieu de
 *   clé string `floor::unitId` fragile (cassait si unit_id contenait "::").
 * I10 versi-s21 : exception studios — un groupe de 1 pièce est accepté
 *   si name_raw contient "studio" ou "t1" (logement complet mono-pièce).
 *
 * Retourne :
 * - `accepted` : groupes retenus (confiance + taille OK)
 * - `candidateCount` : nombre total de groupes avant filtrage (pour I5 warning)
 */
export function clusterByUnit(
  rooms: ExtractedRoom[],
  confidenceThreshold: number
): { accepted: UnitGroup[]; candidateCount: number } {
  // I1 — Nested map par floor → unitId (plus de split "::")
  const byFloor = new Map<number, Map<string, ExtractedRoom[]>>();

  for (const room of rooms) {
    if (!room.unit_id || room.floor == null) continue;
    let floorMap = byFloor.get(room.floor);
    if (!floorMap) {
      floorMap = new Map<string, ExtractedRoom[]>();
      byFloor.set(room.floor, floorMap);
    }
    const existing = floorMap.get(room.unit_id);
    if (existing) {
      existing.push(room);
    } else {
      floorMap.set(room.unit_id, [room]);
    }
  }

  const accepted: UnitGroup[] = [];
  let candidateCount = 0;

  for (const [floor, floorMap] of byFloor) {
    for (const [unitId, groupRooms] of floorMap) {
      candidateCount++;
      const confidenceAvg =
        groupRooms.reduce((sum, r) => sum + r.confidence, 0) / groupRooms.length;
      const confidenceMin = Math.min(...groupRooms.map((r) => r.confidence));

      // I10 — Exception studios : 1 pièce acceptée si nom évoque un logement complet
      const isStudioException =
        groupRooms.length === 1 &&
        /\bstudio\b|\bt1\b/i.test(groupRooms[0].name_raw);

      // U2 — Filtre : avg >= seuil, min >= 0.5, et >= 2 pièces (sauf studio)
      if (
        confidenceAvg >= confidenceThreshold &&
        confidenceMin >= 0.5 &&
        (groupRooms.length >= 2 || isStudioException)
      ) {
        accepted.push({ floor, unitId, rooms: groupRooms, confidenceAvg, confidenceMin });
      }
    }
  }

  return { accepted, candidateCount };
}

/**
 * Compte les pièces habitables dans un groupe.
 * WC, SdB, couloir, entrée, cellier, cave, dégagement → non habitable.
 */
export function countHabitableRooms(rooms: ExtractedRoom[]): number {
  return rooms.filter((r) => {
    const nameLC = r.name_raw.toLowerCase();
    if (
      /\bwc\b|\btoilette|\bsdb\b|\bsalle.*bain|\bsalle.*eau|\bcouloir|\bentr[ée]e|\bcellier|\bcave|\bdég/i.test(
        nameLC
      )
    ) {
      return false;
    }
    return true;
  }).length;
}

/**
 * Calcule la position X moyenne d'un groupe de pièces.
 * Utilisé pour le suffixe gauche/droite dans le nommage.
 */
export function computeAvgX(rooms: ExtractedRoom[]): number {
  return (
    rooms.reduce((sum, r) => {
      const bb = r.bounding_box;
      return sum + (bb ? bb.x_percent + bb.width_percent / 2 : 50);
    }, 0) / rooms.length
  );
}

// ─── versi-s23 P2 — Merge duplex cross-floor ────────────────────────

/** Surface combinée maximale (m²) pour considérer 2 groupes comme un duplex plausible */
export const DUPLEX_MAX_COMBINED_AREA_M2 = 150;

/** Regex détection escalier/palier dans name_raw — indicateur fort de duplex */
const STAIRCASE_REGEX = /\bescalier\b|\bpalier\b|\bmontée\b|\bmontee\b/i;

/**
 * Somme des surfaces d'un groupe de pièces (ignore les surface_m2 null).
 */
function computeTotalArea(rooms: ExtractedRoom[]): number {
  return rooms.reduce((sum, r) => sum + (r.surface_m2 ?? 0), 0);
}

/**
 * Détecte si un groupe contient une pièce "escalier" ou "palier".
 * Indicateur fort de demi-niveau (duplex avec escalier interne).
 */
function hasStaircase(group: UnitGroup): boolean {
  return group.rooms.some((r) => STAIRCASE_REGEX.test(r.name_raw));
}

/**
 * Vérifie si 2 groupes ont un recouvrement X significatif (≥ 30%).
 * Un vrai duplex a son escalier aligné verticalement : les bboxes des 2
 * étages se recouvrent sur l'axe X. Sans recouvrement → probablement
 * 2 lots distincts qui se trouvent être à des étages adjacents.
 */
function hasVerticalAlignment(a: UnitGroup, b: UnitGroup): boolean {
  const envA = computeEnvelopeBbox(a.rooms);
  const envB = computeEnvelopeBbox(b.rooms);
  const aLeft = envA.x_percent;
  const aRight = envA.x_percent + envA.width_percent;
  const bLeft = envB.x_percent;
  const bRight = envB.x_percent + envB.width_percent;

  const overlap = Math.max(0, Math.min(aRight, bRight) - Math.max(aLeft, bLeft));
  const minWidth = Math.min(envA.width_percent, envB.width_percent);
  if (minWidth <= 0) return false;
  return overlap / minWidth >= 0.3;
}

/**
 * Fusionne 2 UnitGroup en 1 seul (cas duplex).
 * - floor = étage le plus bas (convention : lot référencé par son étage d'entrée)
 * - unitId = concat avec "+" pour traçabilité visuelle
 * - rooms = union
 * - confidenceAvg/Min = recalculés sur l'union
 * - mergedFrom = [unitIdA, unitIdB]
 */
function mergeTwoGroups(a: UnitGroup, b: UnitGroup): UnitGroup {
  const lower = a.floor <= b.floor ? a : b;
  const upper = a.floor <= b.floor ? b : a;
  const allRooms = [...lower.rooms, ...upper.rooms];
  const confidenceAvg =
    allRooms.reduce((sum, r) => sum + r.confidence, 0) / allRooms.length;
  const confidenceMin = Math.min(...allRooms.map((r) => r.confidence));

  return {
    floor: lower.floor,
    unitId: `${lower.unitId}+${upper.unitId}`,
    rooms: allRooms,
    confidenceAvg,
    confidenceMin,
    mergedFrom: [lower.unitId, upper.unitId],
  };
}

/**
 * Évalue si 2 groupes sur étages consécutifs sont candidats à un merge duplex.
 *
 * Conditions (stratégie conservative : "no merge > bad merge") :
 * - Étages consécutifs (floor N et N+1) obligatoire
 * - Alignement vertical (recouvrement X ≥ 30%) obligatoire
 * - ET au moins UN des 3 signaux positifs :
 *   1. Escalier/palier détecté dans name_raw d'un des 2 groupes (signal fort)
 *   2. Les 2 groupes ont count === 1 chacun (demi-niveau plausible)
 *   3. Surface totale combinée ≤ 150m² (taille cohérente avec un duplex)
 *
 * Retourne `false` en cas d'ambiguïté (2 lots distincts préférables à 1 lot erroné).
 */
function shouldMergeAsDuplex(a: UnitGroup, b: UnitGroup): boolean {
  // Étages consécutifs uniquement
  if (Math.abs(a.floor - b.floor) !== 1) return false;

  // Alignement vertical obligatoire : sans ça, on a probablement 2 lots distincts
  if (!hasVerticalAlignment(a, b)) return false;

  // Signal 1 (fort) : escalier explicite dans un des groupes
  if (hasStaircase(a) || hasStaircase(b)) return true;

  // Signal 2 : demi-niveaux (1 pièce par étage)
  if (a.rooms.length === 1 && b.rooms.length === 1) return true;

  // Signal 3 : surface combinée raisonnable pour un duplex
  const totalArea = computeTotalArea(a.rooms) + computeTotalArea(b.rooms);
  if (totalArea > 0 && totalArea <= DUPLEX_MAX_COMBINED_AREA_M2) return true;

  // Ambiguïté → pas de merge
  return false;
}

/**
 * Post-processing des UnitGroup pour détecter les duplex cross-floor.
 *
 * Gap détecté s23 : `clusterByUnit` s21 groupe UNIQUEMENT same-floor (un
 * duplex R+2/R+3 apparaît comme 2 lots distincts). Cette fonction fusionne
 * les groupes d'étages consécutifs qui présentent des signaux de duplex.
 *
 * Stratégie : conservative, append-only (n'est PAS appelée dans clusterByUnit).
 * Le pipeline extract appelle clusterByUnit → mergeDuplexAcrossFloors.
 *
 * Garanties :
 * - Chaque groupe source est mergé au plus une fois (pas de triple-niveau s23 —
 *   si besoin, itérer manuellement ou étendre en s24)
 * - Ordre de traitement déterministe (tri par floor asc, puis unitId) pour
 *   résultats reproductibles
 * - Les groupes non-mergés sont retournés inchangés (aucune mutation)
 */
export function mergeDuplexAcrossFloors(groups: UnitGroup[]): UnitGroup[] {
  if (groups.length < 2) return groups;

  // Copie + tri déterministe (floor asc, puis unitId lexicographique)
  const sorted = [...groups].sort((a, b) => {
    if (a.floor !== b.floor) return a.floor - b.floor;
    return a.unitId.localeCompare(b.unitId);
  });

  const merged: UnitGroup[] = [];
  const consumed = new Set<number>(); // indices déjà mergés

  for (let i = 0; i < sorted.length; i++) {
    if (consumed.has(i)) continue;
    const groupA = sorted[i];

    // Cherche un candidat sur l'étage N+1
    let pairIndex = -1;
    for (let j = i + 1; j < sorted.length; j++) {
      if (consumed.has(j)) continue;
      const groupB = sorted[j];
      // Optimisation : dès que floor > floorA+1, plus de candidat possible
      if (groupB.floor > groupA.floor + 1) break;
      if (groupB.floor !== groupA.floor + 1) continue;
      if (shouldMergeAsDuplex(groupA, groupB)) {
        pairIndex = j;
        break;
      }
    }

    if (pairIndex >= 0) {
      merged.push(mergeTwoGroups(groupA, sorted[pairIndex]));
      consumed.add(i);
      consumed.add(pairIndex);
    } else {
      merged.push(groupA);
      consumed.add(i);
    }
  }

  return merged;
}
