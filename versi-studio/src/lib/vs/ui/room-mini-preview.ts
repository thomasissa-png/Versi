/**
 * room-mini-preview — Helpers purs pour PlacementBottomSheet mini-aperçu (s30 Round 2)
 *
 * Logique de dérivation polygone → SVG path extraite pour testabilité Vitest (env "node").
 * Le composant React consomme ces helpers, le rendu DOM reste dans le .tsx.
 *
 * Friction P2 persona Thomas (verbatim s30) :
 * "un mini-aperçu du plan zoomé sur la pièce ciblée pour confirmer
 *  que j'ai bien tapé la bonne pièce et pas la chambre adjacente"
 *
 * Robustesse : fallback null si polygones invalides → composant n'affiche pas le SVG.
 */

import type { VsRoom } from "@/lib/vs/types";

/** Nombre minimal de sommets pour un polygone exploitable (triangle). */
const MIN_POLYGON_POINTS = 3;

export interface RoomMiniPreviewData {
  /** Path SVG de la pièce ciblée (highlight vert dans le rendu). */
  target: string;
  /** Paths SVG des autres pièces de l'étage (gris clair, contexte). */
  others: ReadonlyArray<{ id: string; d: string }>;
}

/**
 * Convertit un polygone (lot-local %, x_percent/y_percent ∈ [0..100]) en path SVG.
 * ViewBox cible : 0 0 100 100 → mapping direct.
 * Retourne "" si polygone invalide (le caller gère le fallback).
 */
export function polygonToSvgPath(
  points: ReadonlyArray<{ x_percent: number; y_percent: number }>,
): string {
  if (points.length < MIN_POLYGON_POINTS) return "";
  const [first, ...rest] = points;
  const head = `M ${first.x_percent.toFixed(2)} ${first.y_percent.toFixed(2)}`;
  const tail = rest
    .map((p) => `L ${p.x_percent.toFixed(2)} ${p.y_percent.toFixed(2)}`)
    .join(" ");
  return `${head} ${tail} Z`;
}

/**
 * Dérive les données nécessaires au rendu du mini-aperçu.
 * Fallback robuste :
 *  - targetRoom null/sans polygone valide → null (pas d'aperçu, juste label texte côté UI)
 *  - allRoomsOnFloor avec polygones invalides → ignorées silencieusement
 *
 * Pure : aucune dépendance React/DOM, testable env "node".
 */
export function buildRoomMiniPreviewData(
  targetRoom: VsRoom | null,
  allRoomsOnFloor: ReadonlyArray<VsRoom> | undefined,
): RoomMiniPreviewData | null {
  if (!targetRoom?.polygon || targetRoom.polygon.length < MIN_POLYGON_POINTS) {
    return null;
  }
  const target = polygonToSvgPath(targetRoom.polygon);
  if (!target) return null;
  const others = (allRoomsOnFloor ?? [])
    .filter(
      (r) =>
        r.id !== targetRoom.id &&
        r.polygon &&
        r.polygon.length >= MIN_POLYGON_POINTS,
    )
    .map((r) => ({ id: r.id, d: polygonToSvgPath(r.polygon!) }))
    .filter((o) => o.d !== "");
  return { target, others };
}
