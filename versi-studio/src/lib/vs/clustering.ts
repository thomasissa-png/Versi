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
 */
export function generateLotName(
  habitableCount: number,
  floor: number,
  _indexOnFloor: number,
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

  // Suffixe position si doublon sur le même étage
  let suffix = "";
  if (totalOnFloor > 1) {
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
 * Retourne les groupes avec confiance >= seuil.
 */
export function clusterByUnit(
  rooms: ExtractedRoom[],
  confidenceThreshold: number
): UnitGroup[] {
  const groups = new Map<string, ExtractedRoom[]>();

  for (const room of rooms) {
    if (!room.unit_id || room.floor == null) continue;
    const key = `${room.floor}::${room.unit_id}`;
    const existing = groups.get(key);
    if (existing) {
      existing.push(room);
    } else {
      groups.set(key, [room]);
    }
  }

  const result: UnitGroup[] = [];
  for (const [key, groupRooms] of groups) {
    const [floorStr, unitId] = key.split("::");
    const floor = parseInt(floorStr, 10);
    const confidenceAvg =
      groupRooms.reduce((sum, r) => sum + r.confidence, 0) / groupRooms.length;

    if (confidenceAvg >= confidenceThreshold && groupRooms.length >= 1) {
      result.push({ floor, unitId, rooms: groupRooms, confidenceAvg });
    }
  }

  return result;
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
