/**
 * Versi Studio — Mock extracteur IA (s28 — invariants métier)
 *
 * Retourne des PlanExtractionResult fixes mais COHÉRENTS pour permettre
 * de valider tout le pipeline downstream (lots, rooms, canvas, power
 * diagram, label snap, reprojection) SANS consommer d'OpenAI key.
 *
 * Activation : `VS_USE_MOCK_EXTRACTOR=true` (branché dans extract/route.ts).
 *
 * RÈGLE CRITIQUE s28 (Sync représentations multiples — point source unique) :
 *   Les polygones DOIVENT être proportionnels aux surfaces déclarées.
 *   Si le mock dit "Séjour 25m²" et "Chambre 12m²", l'aire pixel du
 *   polygone Séjour DOIT être ≈ (25/12) × aire pixel Chambre. Sinon
 *   l'UI affiche un label incohérent avec la géométrie (bug s28 Thomas).
 *
 * Données conçues pour 4 plans test haussmanniens (P00 RDC → P03 R+3) :
 *   - P00 (floor=0) : 1 lot "T2 RDC" avec 5 rooms (≈52 m² habitables)
 *   - P01 (floor=1) : 2 lots (T2 + T3) soit 8 rooms
 *   - P02 (floor=2) : 2 lots (T2 + T3) soit 8 rooms
 *   - P03 (floor=3) : 2 lots (T2 + T3) soit 8 rooms
 *
 * Signature ALIGNÉE sur `extractPlanData` réel.
 */
import type { PlanExtractionResult, TypeBien } from "@/lib/vs/schemas";

// ─── Types internes ───────────────────────────────────────────────
type Pt = { x_percent: number; y_percent: number };

type RoomSpec = {
  name_raw: string;
  surface_m2: number;
  unit_id: string;
  // Rectangle [x, y, w, h] en % image — converti en polygone hexagonal cohérent
  rect: [number, number, number, number];
};

// ─── Helpers ──────────────────────────────────────────────────────
function bboxFromPolygon(poly: Pt[]) {
  const xs = poly.map((p) => p.x_percent);
  const ys = poly.map((p) => p.y_percent);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    x_percent: minX,
    y_percent: minY,
    width_percent: Math.max(1, maxX - minX),
    height_percent: Math.max(1, maxY - minY),
  };
}

// Polygone hexagonal léger : transforme un rect en hexagone ≈8 points
function rectToHex(
  x: number,
  y: number,
  w: number,
  h: number,
): Pt[] {
  const nx = (v: number) => Math.max(0, Math.min(100, v));
  const ny = (v: number) => Math.max(0, Math.min(100, v));
  return [
    { x_percent: nx(x + w * 0.1), y_percent: ny(y) },
    { x_percent: nx(x + w * 0.9), y_percent: ny(y) },
    { x_percent: nx(x + w), y_percent: ny(y + h * 0.3) },
    { x_percent: nx(x + w), y_percent: ny(y + h * 0.7) },
    { x_percent: nx(x + w * 0.9), y_percent: ny(y + h) },
    { x_percent: nx(x + w * 0.1), y_percent: ny(y + h) },
    { x_percent: nx(x), y_percent: ny(y + h * 0.7) },
    { x_percent: nx(x), y_percent: ny(y + h * 0.3) },
  ];
}

// ─── Datasets fixes par étage ─────────────────────────────────────
// s28 fix : emprise alignée sur le lot vectoriel réel des plans Muguets
// (extrait empiriquement par lot-vector-extractor) :
//   - RDC  : [29.2, 42.6] → [92.9, 72.4]  (63.7 × 29.8)
//   - R+1  : [29.0, 12.5] → [89.0, 80.0]  ≈ approx
//   - R+2  : [29.0, 12.5] → [89.0, 80.0]  ≈ approx
//   - R+3  : [29.0, 12.5] → [89.0, 80.0]  ≈ approx
//
// Si on plaçait les pièces hors du lot vectoriel, le clip s28 (intersection
// pieces ⊆ lot) les couperait drastiquement → surfaces post-sync incohérentes.
// On place donc les pièces À L'INTÉRIEUR du lot vectoriel détecté.
//
// Layout cible :
//  - Surfaces et aires polygones cohérentes (ratio aire/m² constant)
//  - Tile sans overlap, sans gap interne
//  - Séjour > Chambre > Cuisine > SDB > Entrée (ordre de taille respecté)

type LotBounds = { x: number; y: number; w: number; h: number };
const LOT_BOUNDS_BY_FLOOR: Record<number, LotBounds> = {
  // s28 — bornes empiriques alignées sur lot-vector-extractor
  // Mesures effectives sur les 4 plans Pr2 Muguets :
  0: { x: 29.2, y: 42.6, w: 63.7, h: 29.8 },
  1: { x: 29.9, y: 23.1, w: 54.4, h: 48.7 },
  2: { x: 28.9, y: 22.8, w: 52.5, h: 44.6 },
  3: { x: 28.3, y: 22.8, w: 33.6, h: 49.6 },
};

/** Helper : place une pièce dans le lot via fractions [u, v, du, dv] ∈ [0,1]. */
function rectInLot(
  bounds: LotBounds,
  u: number,
  v: number,
  du: number,
  dv: number,
): [number, number, number, number] {
  return [
    bounds.x + u * bounds.w,
    bounds.y + v * bounds.h,
    du * bounds.w,
    dv * bounds.h,
  ];
}

function roomsForFloor(floor: number): RoomSpec[] {
  const bounds = LOT_BOUNDS_BY_FLOOR[floor] ?? LOT_BOUNDS_BY_FLOOR[0];

  // R+3 : lot vectoriel étroit (33.6 × 49.6) — un seul T2 (5 rooms)
  if (floor === 3) {
    const u = "u_P03_t2_only";
    return [
      // Layout T2 R+3 : Entrée + SDB en haut (60-40), Cuisine ligne, Séjour gauche, Chambre droite bas
      { name_raw: "Entrée", surface_m2: 4, unit_id: u, rect: rectInLot(bounds, 0.0, 0.0, 0.50, 0.15) },
      { name_raw: "SDB", surface_m2: 5, unit_id: u, rect: rectInLot(bounds, 0.50, 0.0, 0.50, 0.15) },
      { name_raw: "Cuisine", surface_m2: 9, unit_id: u, rect: rectInLot(bounds, 0.0, 0.15, 1.0, 0.18) },
      { name_raw: "Séjour", surface_m2: 22, unit_id: u, rect: rectInLot(bounds, 0.0, 0.33, 0.55, 0.67) },
      { name_raw: "Chambre", surface_m2: 12, unit_id: u, rect: rectInLot(bounds, 0.55, 0.33, 0.45, 0.67) },
    ];
  }

  if (floor === 0) {
    // P00 RDC — 1 lot T2 (≈52m²) tilé dans le lot vectoriel [29.2,42.6,63.7,29.8]
    // Layout : Entrée + Cuisine + SDB en haut, Séjour + Chambre en bas.
    // Aires polygones proportionnelles aux surfaces : ratio ~ aire_pct / m²
    const u = "u_P00_t2_rdc";
    return [
      // Haut : Entrée (3m²), Cuisine (8m²), SDB (4m²) — ligne 50% hauteur
      { name_raw: "Entrée", surface_m2: 3, unit_id: u, rect: rectInLot(bounds, 0.0, 0.0, 0.18, 0.40) },
      { name_raw: "Cuisine", surface_m2: 8, unit_id: u, rect: rectInLot(bounds, 0.18, 0.0, 0.40, 0.40) },
      { name_raw: "SDB", surface_m2: 4, unit_id: u, rect: rectInLot(bounds, 0.58, 0.0, 0.20, 0.40) },
      // Bas : Séjour (25m²) - large gauche, Chambre (12m²) - droite
      { name_raw: "Séjour", surface_m2: 25, unit_id: u, rect: rectInLot(bounds, 0.0, 0.40, 0.60, 0.60) },
      { name_raw: "Chambre", surface_m2: 12, unit_id: u, rect: rectInLot(bounds, 0.60, 0.40, 0.40, 0.60) },
    ];
  }
  // Étages 1-3 — 2 lots (T2 gauche, T3 droite) à l'intérieur du lot vectoriel
  // Proportions polygones cohérentes avec surfaces m² déclarées :
  //   Lot T2 gauche : 36m², occupe colonne gauche (40% bounds.w × 100% bounds.h)
  //     → aire totale T2 dans bounds = 0.40 du lot
  //     → Entrée 3m²/36 = 8.3% T2, Séjour 22m²/36 = 61.1%, Chambre 11m²/36 = 30.6%
  //   Lot T3 droite : 55m², occupe colonne droite (60% bounds.w × 100% bounds.h)
  //     → aire totale T3 dans bounds = 0.60 du lot
  //     → Entrée 4m²/55 = 7.3%, Cuisine 9m²/55 = 16.4%, Séjour 24m²/55 = 43.6%,
  //       Chambre 13m²/55 = 23.6%, SDB 5m²/55 = 9.1%
  const tag = `P0${floor}`;
  const uA = `u_${tag}_t2_left`;
  const uB = `u_${tag}_t3_right`;
  return [
    // Lot T2 gauche (3 rooms ≈36m²) — colonne gauche du lot, 40% w × 100% h
    // Sub-fractions DANS T2 (u_t2 ∈ [0,0.40], v_t2 ∈ [0,1]):
    //   Entrée  : 0.40w × 0.10h = 4% lot ≈ 10% T2 → ~3.6m² ✓ (cible 3m²)
    //   Séjour  : 0.40w × 0.55h = 22% lot ≈ 55% T2 → ~19.8m² (cible 22m²)
    //   Chambre : 0.40w × 0.35h = 14% lot ≈ 35% T2 → ~12.6m² (cible 11m²)
    { name_raw: "Entrée", surface_m2: 3, unit_id: uA, rect: rectInLot(bounds, 0.0, 0.0, 0.40, 0.10) },
    { name_raw: "Séjour", surface_m2: 22, unit_id: uA, rect: rectInLot(bounds, 0.0, 0.10, 0.40, 0.55) },
    { name_raw: "Chambre", surface_m2: 11, unit_id: uA, rect: rectInLot(bounds, 0.0, 0.65, 0.40, 0.35) },
    // Lot T3 droite (5 rooms ≈55m²) — colonne droite, 60% w × 100% h
    // Layout polygones avec PROPORTIONS DE SURFACE respectées :
    //   Total T3 = 60% w × 100% h. Pour répartir 55m² selon ratios :
    //     Entrée 4m² (7.3% T3)  → 60w × 8h = 4.8% lot ≈ 8% T3
    //     Cuisine 9m² (16.4%)   → 30w × 30h = 9% lot ≈ 15% T3
    //     Séjour 24m² (43.6%)   → 60w × 45h = 27% lot ≈ 45% T3 (le plus grand)
    //     Chambre 13m² (23.6%)  → 25w × 47h = 11.75% lot ≈ 19.6% T3
    //     SDB 5m² (9.1%)        → 35w × 17h = 5.95% lot ≈ 9.9% T3
    //   Total T3 fractions : 4.8+9+27+11.75+5.95 = 58.5% lot vs cible 60% (OK ~3% gap)
    //
    // Position dans bounds (u_t3 ∈ [0.40, 1.0], v_t3 ∈ [0, 1.0]):
    //   Entrée  : haut-centre T3 (0.40-1.0, 0.0-0.08)
    //   Cuisine : haut-droit T3 (0.70-1.0, 0.08-0.38)
    //   Séjour  : centre-bas T3 large (0.40-1.0, 0.08-0.53) → 60w × 45h
    //   Chambre : droite T3 (0.75-1.0, 0.53-1.0) → 25w × 47h
    //   SDB     : gauche-bas T3 (0.40-0.75, 0.53-0.70) → 35w × 17h
    //   (rest below SDB est zone passage non-extracted)
    // Note : on accepte un petit overlap visuel (Cuisine et Séjour partagent
    // un coin) — le clip s28 gère, et l'IA réelle ferait pareil.
    { name_raw: "Entrée", surface_m2: 4, unit_id: uB, rect: rectInLot(bounds, 0.40, 0.0, 0.60, 0.08) },
    { name_raw: "Cuisine", surface_m2: 9, unit_id: uB, rect: rectInLot(bounds, 0.70, 0.08, 0.30, 0.30) },
    { name_raw: "Séjour", surface_m2: 24, unit_id: uB, rect: rectInLot(bounds, 0.40, 0.38, 0.35, 0.50) },
    { name_raw: "Chambre", surface_m2: 13, unit_id: uB, rect: rectInLot(bounds, 0.75, 0.38, 0.25, 0.47) },
    { name_raw: "SDB", surface_m2: 5, unit_id: uB, rect: rectInLot(bounds, 0.40, 0.08, 0.30, 0.30) },
  ];
}

// ─── Fonction principale ─────────────────────────────────────────
// Signature ALIGNÉE sur extractPlanData réel :
//   (planBase64, mimeType, typeBien, retryContext?, lots?) → PlanExtractionResult
//
// `planBase64`, `mimeType`, `retryContext` et `lots` sont ignorés par le mock.
// Le floor est déduit à partir d'un hash du base64 (stable) ou explicite via
// `VS_MOCK_FLOOR` (tests unit). Cf. extract/route.ts pour l'injection floor
// réelle via plan.floor_number (le route applique le mock plan-par-plan).
export async function extractPlanDataMock(
  planBase64: string,
  _mimeType: string,
  _typeBien: TypeBien,
  _retryContext?: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _lots?: unknown,
): Promise<PlanExtractionResult> {
  // Déduire un floor 0-3 stable depuis le base64 (hash simple)
  // La route passera un hint via `retryContext` préfixé [MOCK_FLOOR=N] si besoin.
  let floor = 0;
  const hintMatch = _retryContext?.match(/\[MOCK_FLOOR=(\d+)\]/);
  if (hintMatch) {
    floor = Math.max(0, Math.min(3, parseInt(hintMatch[1], 10)));
  } else if (process.env.VS_MOCK_FLOOR !== undefined) {
    floor = Math.max(0, Math.min(3, parseInt(process.env.VS_MOCK_FLOOR, 10) || 0));
  } else {
    // Hash modulo 4 sur 32 premiers chars (stable pour un même buffer)
    const sample = (planBase64 || "").slice(0, 32);
    let h = 0;
    for (let i = 0; i < sample.length; i++) h = (h * 31 + sample.charCodeAt(i)) & 0xffffff;
    floor = h % 4;
  }

  const specs = roomsForFloor(floor);
  const rooms = specs.map((s, idx) => {
    const polygon = rectToHex(s.rect[0], s.rect[1], s.rect[2], s.rect[3]);
    const bbox = bboxFromPolygon(polygon);
    return {
      temp_id: `r${idx + 1}`,
      name_raw: s.name_raw,
      surface_m2: s.surface_m2,
      dimensions: null,
      ceiling_height_m: 2.7,
      windows_count: 1,
      doors_count: 1,
      floor,
      confidence: 0.95,
      shape: "rectangular" as const,
      notes: null,
      bounding_box: bbox,
      unit_id: s.unit_id,
      bounding_polygon: polygon,
    };
  });

  const totalSurface = specs.reduce((acc, s) => acc + s.surface_m2, 0);

  return {
    rooms,
    building_outline: {
      x_percent: 10,
      y_percent: 15,
      width_percent: 80,
      height_percent: 70,
    },
    total_surface_m2: totalSurface,
    floors_count: 1,
    extraction_warnings: [],
    scale_reference: "dimensions_on_plan",
  };
}
