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
 * 3. Drop les pièces dont l'aire résiduelle est trop faible (< 20 % initiale)
 *    → signal que le polygone initial était très erroné, on log un warning
 *
 * Post-fix s23 (reality-check E2E, 2026-04-19) :
 * - Priorité de tri par aire polygone (surface_m2 trop souvent null côté IA)
 * - Nettoyage via polygonClipping.union (fix self-intersect / geometry invalide)
 * - Retry difference après cleaning si premier appel échoue
 * - Fallback 2e passe : si overlap résiduel détecté, rejouer le resolver
 * - Seuil drop abaissé 50% → 20% (moins agressif, évite drops inutiles)
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
    | "room_dropped_low_residual_area"
    | "polygon_cleaned_invalid_geometry"
    | "resolver_retry_pass";
  room_id: string;
  note: string;
}

export interface ResolverResult<T extends RoomWithPolygon> {
  /** Pièces dont le polygone a été résolu (non-overlap + contenance) */
  resolved: T[];
  /** Pièces retirées car leur polygone a trop diminué (< 20 % aire initiale) */
  dropped: T[];
  warnings: ResolverWarning[];
}

export interface ResolverOptions {
  /** Seuil minimum d'aire résiduelle pour ne pas dropper (0.2 = 20%) */
  minResidualRatio?: number;
  /** Active les logs verbeux (stdout) — pour debug reality-check */
  debug?: boolean;
  /** Nombre max de passes (boucle jusqu'à stabilité). Défaut : 3. */
  maxPasses?: number;
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

/**
 * Nettoie un polygone potentiellement self-intersect via polygonClipping.union.
 * polygon-clipping normalise la geometry : supprime auto-intersections, fixe
 * l'orientation, fusionne les points doublons. Retourne null si geometry
 * irrécupérable.
 */
function cleanPolygon(points: Point[]): Point[] | null {
  if (points.length < 3) return null;
  try {
    // Union avec soi-même = normalisation / resolve self-intersect
    const cleaned = polygonClipping.union(toPC(points));
    return fromPC(cleaned);
  } catch {
    return null;
  }
}

/** Opération difference sécurisée : retourne null si résultat vide/dégénéré.
 *  Retry automatique avec polygones nettoyés en cas d'échec initial. */
function safeDifference(subject: Point[], clipper: Point[]): Point[] | null {
  try {
    const result = polygonClipping.difference(toPC(subject), toPC(clipper));
    const out = fromPC(result);
    if (out && out.length >= 3) return out;
    // Résultat dégénéré : retry avec cleaning
  } catch {
    // Premier appel échoué : retry avec cleaning
  }
  // Retry avec polygones nettoyés (fix self-intersect)
  const cleanedSubject = cleanPolygon(subject);
  const cleanedClipper = cleanPolygon(clipper);
  if (!cleanedSubject || !cleanedClipper) return null;
  try {
    const result = polygonClipping.difference(toPC(cleanedSubject), toPC(cleanedClipper));
    return fromPC(result);
  } catch {
    return null;
  }
}

/** Opération intersection sécurisée (avec retry cleaning) */
function safeIntersection(a: Point[], b: Point[]): Point[] | null {
  try {
    const result = polygonClipping.intersection(toPC(a), toPC(b));
    const out = fromPC(result);
    if (out && out.length >= 3) return out;
  } catch {
    // Retry ci-dessous
  }
  const ca = cleanPolygon(a);
  const cb = cleanPolygon(b);
  if (!ca || !cb) return null;
  try {
    const result = polygonClipping.intersection(toPC(ca), toPC(cb));
    return fromPC(result);
  } catch {
    return null;
  }
}

/** Aire d'intersection entre deux polygones (0 si disjoints ou erreur). */
function intersectionArea(a: Point[], b: Point[]): number {
  const inter = safeIntersection(a, b);
  if (!inter || inter.length < 3) return 0;
  return polygonArea(inter);
}

/**
 * Clippe un polygone contre un polygone de frontière (ex: building_outline).
 *
 * Garanties (s23 EXTERIOR-EXCLUSION) :
 * - Si l'intersection a au moins 4 points ET >= minResidualRatio de l'aire
 *   originale → retourne le polygone clippé.
 * - Sinon retourne null → l'appelant conserve l'original et log un warning.
 *
 * Usage : après les passes 1/2/3 + resolver, avant la persist DB, clipper
 * chaque room.bounding_polygon contre le rectangle du bâtiment pour empêcher
 * tout débord sur la terrasse / l'extérieur.
 */
export function clipPolygonToBoundary(
  polygon: Point[],
  boundary: Point[],
  minResidualRatio: number = 0.5,
): { polygon: Point[] | null; residualRatio: number } {
  if (!polygon || polygon.length < 3) return { polygon: null, residualRatio: 0 };
  if (!boundary || boundary.length < 3) return { polygon: null, residualRatio: 0 };

  const originalArea = polygonArea(polygon);
  if (originalArea <= 0) return { polygon: null, residualRatio: 0 };

  const clipped = safeIntersection(polygon, boundary);
  if (!clipped || clipped.length < 4) {
    return { polygon: null, residualRatio: 0 };
  }

  const residualArea = polygonArea(clipped);
  const ratio = residualArea / originalArea;
  if (ratio < minResidualRatio) {
    return { polygon: null, residualRatio: ratio };
  }

  return { polygon: clipped, residualRatio: ratio };
}

// ─── Passe principale (1 itération) ───────────────────────────────

interface ResolveOnePassInput<T extends RoomWithPolygon> {
  room: T;
  polygon: Point[];
  initialArea: number;
}

function resolveOnePass<T extends RoomWithPolygon>(
  inputs: ResolveOnePassInput<T>[],
  lotPolygon: Point[] | null,
  minResidualRatio: number,
  warnings: ResolverWarning[],
  dropped: T[],
  debug: boolean,
): ResolveOnePassInput<T>[] {
  // Tri par priorité : aire polygone DESC (plus robuste que surface_m2 qui
  // est souvent null côté IA), tie-break sur surface_m2 DESC
  const sorted = [...inputs].sort((a, b) => {
    if (a.initialArea !== b.initialArea) return b.initialArea - a.initialArea;
    const surfA = a.room.surface_m2 ?? 0;
    const surfB = b.room.surface_m2 ?? 0;
    return surfB - surfA;
  });

  const claimed: Point[][] = [];
  const survivors: ResolveOnePassInput<T>[] = [];

  for (const input of sorted) {
    const { room, polygon, initialArea } = input;
    let current: Point[] | null = polygon;

    // Étape pré : nettoyer le polygone d'entrée si self-intersect
    const cleaned = cleanPolygon(current);
    if (cleaned && polygonArea(cleaned) > 0) {
      if (Math.abs(polygonArea(cleaned) - initialArea) / initialArea > 0.01) {
        warnings.push({
          type: "polygon_cleaned_invalid_geometry",
          room_id: room.id,
          note: `polygone nettoyé (self-intersect détecté), aire ${initialArea.toFixed(2)} → ${polygonArea(cleaned).toFixed(2)}`,
        });
      }
      current = cleaned;
    }

    // Étape A : contenance dans le lot (si lotPolygon fourni)
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
        dropped.push(room);
        warnings.push({
          type: "room_dropped_low_residual_area",
          room_id: room.id,
          note: "polygone entièrement hors du polygone du lot",
        });
        continue;
      }
    }

    const containedArea = polygonArea(current);

    // Étape B : retirer les territoires déjà claim par les pièces antérieures
    for (const claimPoly of claimed) {
      if (!current) break;
      // Skip si pas d'overlap mesurable (évite appels polygon-clipping inutiles)
      if (intersectionArea(current, claimPoly) < 1e-6) continue;
      const diff = safeDifference(current, claimPoly);
      if (diff && diff.length >= 3) {
        current = diff;
      } else {
        // safeDifference a échoué malgré le retry avec cleaning.
        // Fallback robuste : abandonner la pièce (la claim est intouchable).
        // On la drop plutôt que de la conserver avec l'overlap — c'est le
        // comportement safe : mieux vaut perdre une pièce que laisser un
        // overlap visible sur le rendu.
        if (debug) {
          console.log(`[resolver] ${room.id}: safeDifference a échoué après cleaning, drop`);
        }
        current = null;
        break;
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
    if (residualArea < containedArea * minResidualRatio) {
      dropped.push(room);
      warnings.push({
        type: "room_dropped_low_residual_area",
        room_id: room.id,
        note: `aire résiduelle ${residualArea.toFixed(2)} < ${(minResidualRatio * 100).toFixed(0)}% aire contenue ${containedArea.toFixed(2)}`,
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

    survivors.push({ room, polygon: current, initialArea });
    claimed.push(current);
  }

  return survivors;
}

// ─── API publique ─────────────────────────────────────────────────

/**
 * Résout les overlaps entre pièces d'un même lot via greedy clipping.
 *
 * @param rooms  Pièces du lot avec bounding_polygon (coords % plan-global)
 * @param lotPolygon  Polygone du lot englobant (coords % plan-global, optionnel)
 * @param options  Options avancées (seuils, debug, nombre de passes)
 * @returns Pièces résolues + pièces droppées + warnings
 *
 * Algorithme :
 * 1. Trier les pièces par aire polygone DESC (surface_m2 DESC en tie-break)
 * 2. Pour chaque pièce i dans l'ordre :
 *    a. Nettoyer le polygone (fix self-intersect via polygon-clipping union)
 *    b. Clip au lotPolygon (contenance)
 *    c. Retirer les territoires déjà claim (pairwise difference greedy)
 * 3. Drop les pièces dont l'aire résiduelle < 20 % aire contenue
 * 4. Boucler jusqu'à stabilité (max 3 passes) — sécurité anti-overlap résiduel
 */
export function resolveRoomOverlaps<T extends RoomWithPolygon>(
  rooms: T[],
  lotPolygon: Point[] | null = null,
  options: ResolverOptions = {},
): ResolverResult<T> {
  const minResidualRatio = options.minResidualRatio ?? 0.2;
  const debug = options.debug ?? false;
  const maxPasses = options.maxPasses ?? 3;

  const warnings: ResolverWarning[] = [];
  const dropped: T[] = [];

  // Filtrer les pièces sans polygone (aucun traitement possible)
  const withPolygon: ResolveOnePassInput<T>[] = [];
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

  // Passe 1..N jusqu'à stabilité (plus d'overlap résiduel ou max atteint)
  let current = withPolygon;
  let pass = 0;
  // Seuil en "% carrés" (0-10000, où 100 = 1% du plan). Reality-check use 0.05..0.5.
  const OVERLAP_EPSILON = 0.5;

  while (pass < maxPasses) {
    const passDropped: T[] = [];
    const survivors = resolveOnePass(
      current,
      lotPolygon,
      minResidualRatio,
      warnings,
      passDropped,
      debug,
    );

    // Merger les drops de cette passe dans la liste globale (dédup par id)
    for (const d of passDropped) {
      if (!dropped.some((x) => x.id === d.id)) dropped.push(d);
    }

    // Vérifier les overlaps résiduels
    let maxOverlap = 0;
    let overlapPair: [string, string] | null = null;
    for (let i = 0; i < survivors.length; i++) {
      for (let j = i + 1; j < survivors.length; j++) {
        const ov = intersectionArea(survivors[i].polygon, survivors[j].polygon);
        if (ov > maxOverlap) {
          maxOverlap = ov;
          overlapPair = [survivors[i].room.id, survivors[j].room.id];
        }
      }
    }

    if (debug) {
      console.log(
        `[resolver] passe ${pass + 1}/${maxPasses} : ${survivors.length} survivants, max overlap = ${maxOverlap.toFixed(3)}` +
          (overlapPair ? ` (${overlapPair[0]} ∩ ${overlapPair[1]})` : ""),
      );
    }

    if (maxOverlap < OVERLAP_EPSILON) {
      // Stabilité atteinte — on peut sortir
      current = survivors;
      break;
    }

    // Overlap résiduel : rejouer une passe
    warnings.push({
      type: "resolver_retry_pass",
      room_id: overlapPair ? `${overlapPair[0]}/${overlapPair[1]}` : "?",
      note: `overlap résiduel ${maxOverlap.toFixed(2)} après passe ${pass + 1}, relance passe ${pass + 2}`,
    });
    current = survivors;
    pass++;
  }

  // Pièces résolues : on applique les polygones mis à jour
  const resolved: T[] = current.map((input) => ({
    ...input.room,
    bounding_polygon: input.polygon,
  }));

  // Ajouter les pièces sans polygone (aucun changement)
  resolved.push(...withoutPolygon);

  return { resolved, dropped, warnings };
}
