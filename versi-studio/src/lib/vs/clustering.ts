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
