/**
 * room-surface-sync.ts — sync surface m² ↔ polygone (s28 invariant 1)
 *
 * Pattern : Sync représentations multiples — point source unique.
 * Le polygone est la SOURCE DE VÉRITÉ. La surface m² affichée DOIT être
 * dérivée du polygone, jamais stockée indépendamment.
 *
 * Bug s28 Thomas : « Le séjour y a écrit 25m² mais la taille est plus petite
 * que la chambre alors que y a écrit 12m² pour la chambre. »
 * → polygone (rendu visuel) et surface_m2 (label) viennent de sources
 *   différentes du LLM, qui peut être incohérent.
 *
 * Stratégie de réconciliation :
 *
 * 1. **Si on a un scale m²/pixel calibré** (m2_per_pixel sur vs_plans) →
 *    surface_m2 = polygonAreaM2(polygon, m2PerPixel, w, h). Source unique.
 *
 * 2. **Si on n'a pas de scale mais un total connu** (somme IA cohérente) →
 *    réallouer proportionnellement : surface_i = (area_i / Σ area) × totalM2.
 *    Le ratio entre pièces est PRÉSERVÉ, le total absolu est ancré sur
 *    la valeur IA.
 *
 * 3. **Si rien** → surface = null, on n'affiche pas de m² au lieu d'afficher
 *    une valeur potentiellement fausse.
 */

export interface RoomPolygonInput {
  /** Identifiant stable (utilisé pour debug). */
  id: string;
  /** Polygone en coords % lot-local OU plan-global (peu importe, ratio préservé). */
  polygon: Array<{ x_percent: number; y_percent: number }> | null | undefined;
  /** Surface m² brute IA (peut être null, peut être incohérente avec polygon). */
  rawSurfaceM2: number | null | undefined;
}

export interface RoomSurfaceSyncResult {
  id: string;
  /** Surface m² synchronisée avec le polygone. Null si ni scale ni total. */
  surfaceM2: number | null;
  /** Aire du polygone en % carrés (0-10000). */
  polygonAreaPct: number;
  /** Méthode appliquée pour debug/log. */
  method: "scale_m2_per_pixel" | "proportional_to_total" | "raw_kept" | "null";
}

/** Aire d'un polygone (formule shoelace) en % carrés (0-10000). */
function polygonAreaPercent(
  points: Array<{ x_percent: number; y_percent: number }>,
): number {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    sum += points[i].x_percent * points[j].y_percent;
    sum -= points[j].x_percent * points[i].y_percent;
  }
  return Math.abs(sum / 2);
}

/**
 * Synchronise les surfaces m² avec les polygones pour un ensemble de pièces.
 *
 * Si scale m²/pixel calibré → calcul exact depuis polygone (mode 1).
 * Sinon, si total IA cohérent → réallocation proportionnelle (mode 2).
 * Sinon → conservation des valeurs brutes IA (mode 3 fallback).
 *
 * @param rooms Liste des pièces avec leurs polygones et surface brute IA
 * @param opts Options de calibration
 */
export function syncRoomSurfacesWithPolygons(
  rooms: RoomPolygonInput[],
  opts: {
    /** m² par pixel natif image (si calibré sur vs_plans). */
    m2PerPixelNative?: number | null;
    /** Largeur native image px (requise avec m2PerPixelNative). */
    naturalWidth?: number | null;
    /** Hauteur native image px (requise avec m2PerPixelNative). */
    naturalHeight?: number | null;
  } = {},
): RoomSurfaceSyncResult[] {
  const results: RoomSurfaceSyncResult[] = [];
  const useScale =
    opts.m2PerPixelNative != null &&
    opts.m2PerPixelNative > 0 &&
    opts.naturalWidth != null &&
    opts.naturalWidth > 0 &&
    opts.naturalHeight != null &&
    opts.naturalHeight > 0;

  // Pré-calcul des aires polygones
  const areas = rooms.map((r) => {
    if (!r.polygon || r.polygon.length < 3) return 0;
    return polygonAreaPercent(r.polygon);
  });

  // ─── Mode 1 : scale calibré → calcul exact ───────────────────────
  if (useScale) {
    const naturalW = opts.naturalWidth!;
    const naturalH = opts.naturalHeight!;
    const m2pp = opts.m2PerPixelNative!;
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      const areaPct = areas[i];
      if (areaPct <= 0) {
        results.push({
          id: room.id,
          surfaceM2: null,
          polygonAreaPct: areaPct,
          method: "null",
        });
        continue;
      }
      const areaPxSq = (areaPct / 10000) * naturalW * naturalH;
      const surfaceM2 = areaPxSq * m2pp;
      results.push({
        id: room.id,
        surfaceM2: Number.isFinite(surfaceM2) && surfaceM2 > 0
          ? Math.round(surfaceM2 * 10) / 10
          : null,
        polygonAreaPct: areaPct,
        method: "scale_m2_per_pixel",
      });
    }
    return results;
  }

  // ─── Mode 2 : pas de scale mais total IA cohérent → proportionnel ──
  // Calcul du total IA cohérent : somme des surfaces brutes non-nulles.
  let rawTotal = 0;
  let rawCount = 0;
  for (const r of rooms) {
    if (typeof r.rawSurfaceM2 === "number" && r.rawSurfaceM2 > 0) {
      rawTotal += r.rawSurfaceM2;
      rawCount++;
    }
  }
  // Aire polygone totale
  const polyTotal = areas.reduce((s, a) => s + a, 0);

  // On applique le mode proportionnel si :
  //   - Au moins 2 pièces ont une surface brute IA
  //   - Le total polygone est cohérent (> 0)
  //   - Le total IA est cohérent (> 0)
  const useProportional =
    rawCount >= 2 && rawTotal > 0 && polyTotal > 0;

  if (useProportional) {
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      const areaPct = areas[i];
      if (areaPct <= 0 || polyTotal <= 0) {
        results.push({
          id: room.id,
          surfaceM2: null,
          polygonAreaPct: areaPct,
          method: "null",
        });
        continue;
      }
      // Réallocation proportionnelle au polygone, ancrée sur le total IA.
      const surfaceM2 = (areaPct / polyTotal) * rawTotal;
      results.push({
        id: room.id,
        surfaceM2: Math.round(surfaceM2 * 10) / 10,
        polygonAreaPct: areaPct,
        method: "proportional_to_total",
      });
    }
    return results;
  }

  // ─── Mode 3 : fallback — conserver les valeurs brutes IA ────────
  // Pas de polygone fiable ou pas de total cohérent : on garde l'IA telle quelle.
  // Au moins l'utilisateur peut corriger manuellement.
  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    const raw =
      typeof room.rawSurfaceM2 === "number" && room.rawSurfaceM2 > 0
        ? Math.round(room.rawSurfaceM2 * 10) / 10
        : null;
    results.push({
      id: room.id,
      surfaceM2: raw,
      polygonAreaPct: areas[i],
      method: raw !== null ? "raw_kept" : "null",
    });
  }
  return results;
}

/**
 * Variante simple : pour 1 polygone, dériver une surface m² à partir d'un
 * scale m²/pixel + dimensions image natives. Retourne null si non calibré.
 */
export function polygonToSurfaceM2(
  polygon: Array<{ x_percent: number; y_percent: number }> | null | undefined,
  m2PerPixelNative: number | null | undefined,
  naturalWidth: number | null | undefined,
  naturalHeight: number | null | undefined,
): number | null {
  if (!polygon || polygon.length < 3) return null;
  if (!m2PerPixelNative || m2PerPixelNative <= 0) return null;
  if (!naturalWidth || naturalWidth <= 0) return null;
  if (!naturalHeight || naturalHeight <= 0) return null;
  const areaPct = polygonAreaPercent(polygon);
  const areaPxSq = (areaPct / 10000) * naturalWidth * naturalHeight;
  const surfaceM2 = areaPxSq * m2PerPixelNative;
  if (!Number.isFinite(surfaceM2) || surfaceM2 <= 0) return null;
  return Math.round(surfaceM2 * 10) / 10;
}
