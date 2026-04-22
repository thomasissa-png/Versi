/**
 * Versi Studio — Mock extracteur IA (s25 Round D)
 *
 * Retourne des PlanExtractionResult fixes mais cohérents pour permettre
 * de valider tout le pipeline downstream (lots, rooms, canvas, power
 * diagram, label snap, reprojection) SANS consommer d'OpenAI key.
 *
 * Activation : `VS_USE_MOCK_EXTRACTOR=true` (branché dans extract/route.ts).
 *
 * Données conçues pour 4 plans test haussmanniens (P00 RDC → P03 R+3) :
 *   - P00 (floor=0) : 1 lot "T2 RDC" avec 5 rooms (≈52 m² habitables)
 *   - P01 (floor=1) : 2 lots (T2 + T3) soit 8 rooms
 *   - P02 (floor=2) : 2 lots (T2 + T3) soit 8 rooms
 *   - P03 (floor=3) : 2 lots (T2 + T3) soit 8 rooms
 * Total = 29 rooms réparties → matière suffisante pour valider power diagram,
 * envelope polygon, tiling 0 gap / 0 overlap, clustering par unit_id.
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
  polygon: Pt[];
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

// Polygone hexagonal léger : transforme un rect en hexagone ≈6 points
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
// Emprise bâtiment : rectangle [10,15] → [90,85] (80×70).
// Rooms ventilées pour remplir la zone sans overlap, avec murs partagés.

function roomsForFloor(floor: number): RoomSpec[] {
  if (floor === 0) {
    // P00 RDC — 1 lot T2 (5 rooms)
    const u = "u_P00_t2_rdc";
    return [
      { name_raw: "Entrée", surface_m2: 3, unit_id: u, polygon: rectToHex(10, 15, 20, 15) },
      { name_raw: "Séjour", surface_m2: 25, unit_id: u, polygon: rectToHex(30, 15, 40, 35) },
      { name_raw: "Cuisine", surface_m2: 8, unit_id: u, polygon: rectToHex(70, 15, 20, 20) },
      { name_raw: "SDB", surface_m2: 4, unit_id: u, polygon: rectToHex(70, 35, 20, 15) },
      { name_raw: "Chambre", surface_m2: 12, unit_id: u, polygon: rectToHex(10, 50, 80, 35) },
    ];
  }
  // Étages 1-3 — 2 lots (T2 gauche, T3 droite)
  const tag = `P0${floor}`;
  const uA = `u_${tag}_t2_left`;
  const uB = `u_${tag}_t3_right`;
  return [
    // Lot T2 gauche (3 rooms)
    { name_raw: "Entrée", surface_m2: 3, unit_id: uA, polygon: rectToHex(10, 15, 15, 15) },
    { name_raw: "Séjour", surface_m2: 22, unit_id: uA, polygon: rectToHex(10, 30, 30, 35) },
    { name_raw: "Chambre", surface_m2: 11, unit_id: uA, polygon: rectToHex(10, 65, 30, 20) },
    // Lot T3 droite (5 rooms)
    { name_raw: "Entrée", surface_m2: 4, unit_id: uB, polygon: rectToHex(40, 15, 20, 15) },
    { name_raw: "Séjour", surface_m2: 24, unit_id: uB, polygon: rectToHex(40, 30, 30, 30) },
    { name_raw: "Cuisine", surface_m2: 9, unit_id: uB, polygon: rectToHex(70, 15, 20, 25) },
    { name_raw: "Chambre", surface_m2: 13, unit_id: uB, polygon: rectToHex(70, 40, 20, 25) },
    { name_raw: "SDB", surface_m2: 5, unit_id: uB, polygon: rectToHex(40, 60, 50, 25) },
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
    const bbox = bboxFromPolygon(s.polygon);
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
      bounding_polygon: s.polygon,
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
