/**
 * polygon-resolver.ts — Post-process non-overlap des pièces (s23 Bug 1)
 *
 * Contexte (spec @ia docs/ia/s23-etape3-diagnostic-fixes.md) :
 * Le prompt vision contient une règle NO-OVERLAP mais GPT-4.1 l'ignore sur
 * les plans denses. Aucun post-process code ne garantit que les polygones
 * des pièces ne se superposent pas, ni qu'ils restent dans le lot.
 *
 * Ce module applique un greedy pairwise clipping déterministe :
 * 1. Clip chaque pièce au polygone du lot (contenance stricte)
 * 2. Pour chaque paire (i, j) avec j > i triée par aire DESC, si overlap
 *    significatif, retirer l'intersection de la pièce la plus petite
 *    (la plus grande garde son territoire — heuristique robuste)
 * 3. Drop les pièces dont l'aire résiduelle est trop faible (< 50 % initiale)
 *    → signal que le polygone initial était très erroné, on log un warning
 *
 * Toutes les coordonnées sont en POURCENTAGES PLAN-GLOBAL (même référentiel
 * que `bounding_polygon` dans ExtractedRoom). L'appel doit se faire avant
 * la conversion lot-local pour persist DB.
 *
 * Dépendance : polygon-clipping (~40 kB, 0 transitive).
 */

import polygonClipping from "polygon-clipping";
import type { Polygon as PCPolygon, MultiPolygon as PCMultiPolygon, Pair as PCPair } from "polygon-clipping";

// ─── Types ────────────────────────────────────────────────────────

export interface Point {
  x_percent: number;
  y_percent: number;
}

export interface RoomWithPolygon {
  /** Identifiant stable (nom_raw ou index) — utile pour les logs */
  id: string;
  bounding_polygon: Point[] | null | undefined;
  /** Surface en m², utilisée comme priorité (plus grande gagne) */
  surface_m2?: number | null;
}

export interface ResolverWarning {
  type:
    | "room_clipped_for_overlap"
    | "room_clipped_for_containment"
    | "room_dropped_low_residual_area";
  room_id: string;
  note: string;
}

export interface ResolverResult<T extends RoomWithPolygon> {
  /** Pièces dont le polygone a été résolu (non-overlap + contenance) */
  resolved: T[];
  /** Pièces retirées car leur polygone a trop diminué (< 50 % aire initiale) */
  dropped: T[];
  warnings: ResolverWarning[];
}

// ─── Helpers internes ─────────────────────────────────────────────

/** Convertit un polygone Point[] en format polygon-clipping (Ring[]) */
function toPC(points: Point[]): PCPolygon {
  // polygon-clipping attend un ring fermé (1er = dernier) — on le normalise
  const ring: PCPair[] = points.map((p) => [p.x_percent, p.y_percent]);
  if (ring.length > 0) {
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push([first[0], first[1]]);
    }
  }
  return [ring];
}

/** Extrait le premier polygone d'un MultiPolygon (le plus grand par aire). */
function fromPC(mp: PCMultiPolygon): Point[] | null {
  if (!mp || mp.length === 0) return null;
  // Prendre le polygone avec la plus grande aire (outer ring uniquement)
  let best: Point[] | null = null;
  let bestArea = 0;
  for (const poly of mp) {
    if (!poly || poly.length === 0) continue;
    const outer = poly[0];
    if (!outer || outer.length < 3) continue;
    const pts: Point[] = outer.map(([x, y]) => ({ x_percent: x, y_percent: y }));
    // Retirer le point de fermeture si présent
    if (pts.length >= 2) {
      const first = pts[0];
      const last = pts[pts.length - 1];
      if (first.x_percent === last.x_percent && first.y_percent === last.y_percent) {
        pts.pop();
      }
    }
    const area = polygonArea(pts);
    if (area > bestArea) {
      bestArea = area;
      best = pts;
    }
  }
  return best;
}

/** Aire signée d'un polygone (formule shoelace). */
export function polygonArea(points: Point[]): number {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x_percent * b.y_percent - b.x_percent * a.y_percent;
  }
  return Math.abs(sum) / 2;
}

/** Opération difference sécurisée : retourne null si résultat vide/dégénéré */
function safeDifference(subject: Point[], clipper: Point[]): Point[] | null {
  try {
    const result = polygonClipping.difference(toPC(subject), toPC(clipper));
    return fromPC(result);
  } catch {
    return null;
  }
}

/** Opération intersection sécurisée */
function safeIntersection(a: Point[], b: Point[]): Point[] | null {
  try {
    const result = polygonClipping.intersection(toPC(a), toPC(b));
    return fromPC(result);
  } catch {
    return null;
  }
}

// ─── API publique ─────────────────────────────────────────────────

/**
 * Résout les overlaps entre pièces d'un même lot via greedy clipping.
 *
 * @param rooms  Pièces du lot avec bounding_polygon (coords % plan-global)
 * @param lotPolygon  Polygone du lot englobant (coords % plan-global, optionnel)
 * @returns Pièces résolues + pièces droppées + warnings
 *
 * Algorithme :
 * 1. Trier les pièces par surface (la plus grande en priorité)
 * 2. Pour chaque pièce i dans l'ordre :
 *    a. Clip au lotPolygon (contenance)
 *    b. Retirer des pièces i tous les polygones des pièces j<i déjà résolues
 *       (pairwise difference greedy)
 * 3. Drop les pièces dont l'aire résiduelle < 50 % initiale (erreur IA)
 */
export function resolveRoomOverlaps<T extends RoomWithPolygon>(
  rooms: T[],
  lotPolygon: Point[] | null = null,
): ResolverResult<T> {
  const warnings: ResolverWarning[] = [];
  const dropped: T[] = [];
  const resolved: T[] = [];

  // Filtrer les pièces sans polygone (aucun traitement possible)
  const withPolygon: Array<{ room: T; polygon: Point[]; initialArea: number }> = [];
  const withoutPolygon: T[] = [];

  for (const room of rooms) {
    if (room.bounding_polygon && room.bounding_polygon.length >= 3) {
      const initialArea = polygonArea(room.bounding_polygon);
      if (initialArea > 0) {
        withPolygon.push({
          room,
          polygon: [...room.bounding_polygon],
          initialArea,
        });
      } else {
        withoutPolygon.push(room);
      }
    } else {
      withoutPolygon.push(room);
    }
  }

  // Tri par priorité : surface DESC (puis aire polygone DESC en fallback)
  withPolygon.sort((a, b) => {
    const surfA = a.room.surface_m2 ?? 0;
    const surfB = b.room.surface_m2 ?? 0;
    if (surfA !== surfB) return surfB - surfA;
    return b.initialArea - a.initialArea;
  });

  // Pièces déjà "claim" du territoire — utilisé pour le clipping greedy
  const claimed: Point[][] = [];

  for (const { room, polygon, initialArea } of withPolygon) {
    let current: Point[] | null = polygon;

    // Étape A : contenance dans le lot (si lotPolygon fourni)
    // Note : la contenance est toujours appliquée, même si elle réduit
    // significativement l'aire — une pièce NE PEUT PAS déborder du lot,
    // c'est une contrainte physique stricte. Le seuil "50 % drop" ne
    // s'applique qu'aux clippings d'overlap pairwise (étape B).
    if (lotPolygon && lotPolygon.length >= 3) {
      const clipped = safeIntersection(current, lotPolygon);
      if (clipped && clipped.length >= 3) {
        if (polygonArea(clipped) < initialArea * 0.99) {
          warnings.push({
            type: "room_clipped_for_containment",
            room_id: room.id,
            note: "polygone étendait hors du lot, recoupé au polygone du lot",
          });
        }
        current = clipped;
      } else {
        // Pièce entièrement hors du lot — drop avec warning
        dropped.push(room);
        warnings.push({
          type: "room_dropped_low_residual_area",
          room_id: room.id,
          note: "polygone entièrement hors du polygone du lot",
        });
        continue;
      }
    }

    // Aire après contenance = nouveau baseline pour le seuil "50 % drop"
    const containedArea = polygonArea(current);

    // Étape B : retirer les territoires déjà claim par les pièces antérieures
    for (const claimPoly of claimed) {
      if (!current) break;
      const diff = safeDifference(current, claimPoly);
      if (diff && diff.length >= 3) {
        current = diff;
      } else if (diff === null) {
        // Échec polygone-clipping : fallback sûr = conserver current inchangé
        continue;
      } else {
        // Résultat dégénéré (< 3 points) — current vidé
        current = null;
      }
    }

    if (!current || current.length < 3) {
      dropped.push(room);
      warnings.push({
        type: "room_dropped_low_residual_area",
        room_id: room.id,
        note: "polygone entièrement clippé par pièces voisines",
      });
      continue;
    }

    const residualArea = polygonArea(current);
    if (residualArea < containedArea * 0.5) {
      // Aire résiduelle < 50 % de l'aire après contenance — on drop
      dropped.push(room);
      warnings.push({
        type: "room_dropped_low_residual_area",
        room_id: room.id,
        note: `aire résiduelle ${residualArea.toFixed(2)} < 50 % aire contenue ${containedArea.toFixed(2)}`,
      });
      continue;
    }

    if (residualArea < containedArea * 0.99) {
      warnings.push({
        type: "room_clipped_for_overlap",
        room_id: room.id,
        note: `polygone réduit de ${containedArea.toFixed(2)} à ${residualArea.toFixed(2)} pour éviter overlap`,
      });
    }

    // Mettre à jour le bounding_polygon de la pièce (in-place via spread)
    const updated = { ...room, bounding_polygon: current } as T;
    resolved.push(updated);
    claimed.push(current);
  }

  // Ajouter les pièces sans polygone (aucun changement)
  resolved.push(...withoutPolygon);

  return { resolved, dropped, warnings };
}
