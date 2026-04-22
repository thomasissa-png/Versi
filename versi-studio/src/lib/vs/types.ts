/**
 * Versi Studio — Types partagés
 *
 * Types TypeScript mappés sur le schéma SQL vs_*.
 * Source de vérité pour les API routes et composants.
 */

// ─── Enums ─────────────────────────────────────────────────────────

export type TypeBien = "immeuble" | "maison" | "appartement";

export type ProjectStatus =
  | "draft"
  | "step_1_complete"
  | "step_2_complete"
  | "step_3_complete"
  | "completed";

export type ExtractionStatus = "pending" | "processing" | "done" | "failed";

export type LotStatus = "suggested" | "validated" | "overlap_error";

export type LotSource = "ai" | "manual";

export type RoomStatus = "suggested" | "validated";

export type VisualStatus = "processing" | "generated" | "validated" | "failed";

// ─── Entités ───────────────────────────────────────────────────────

export interface VsProject {
  id: string;
  adresse: string;
  type_bien: TypeBien;
  surface_totale: number | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface VsPlan {
  id: string;
  project_id: string;
  file_path: string;
  mime_type: string;
  floor_number: number;
  original_filename: string | null;
  extraction_data: Record<string, unknown> | null;
  extraction_status: ExtractionStatus;
  m2_per_pixel: number | null;
  /** s25 — chemin local du plan canonicalisé (feature flag VS_PLAN_CANONICALIZE). Null si canonicalisation désactivée ou fallback. */
  canonicalized_image_path: string | null;
  /** s25 — horodatage de la canonicalisation (null si jamais canonicalisé). */
  canonicalized_at: string | null;
  /** s25 — raison du fallback (null si succès ou pas tenté). */
  canonical_fallback_reason: string | null;
  /** s25 — version du prompt utilisé (ex "1.0"). */
  canonical_prompt_version: string | null;
  created_at: string;
}

export interface VsLot {
  id: string;
  project_id: string;
  name: string;
  floor_number: number;
  surface_m2: number | null;
  zone_data: Record<string, unknown>;
  status: LotStatus;
  source: LotSource;
  confidence_avg: number | null;
  created_at: string;
}

export interface VsRoom {
  id: string;
  lot_id: string;
  plan_id: string | null;
  name: string | null;
  room_type: string;
  custom_label: string | null;
  surface_m2: number | null;
  position: Record<string, unknown> | null;
  /** Contour polygonal de la piece (lot-local %). 4-8 sommets aux coins des murs. */
  polygon: Array<{ x_percent: number; y_percent: number }> | null;
  /** true si l'utilisateur a modifié, déplacé ou confirmé cette pièce IA */
  touched: boolean;
  status: RoomStatus;
  source: LotSource;
  created_at: string;
}

export interface VsPhoto {
  id: string;
  room_id: string;
  file_path: string;
  angle_description: string | null;
  created_at: string;
}

export interface VsVisual {
  id: string;
  photo_id: string;
  style_id: string;
  file_path: string | null;
  status: VisualStatus;
  prompt_used: string | null;
  iteration_count: number;
  parent_visual_id: string | null;
  error_message: string | null;
  created_at: string;
}

// ─── Zone Data (coordonnées % pour le canvas) ────────────────────

export interface ZoneRect {
  type?: "rect"; // optional pour backward compat (zones legacy sans type sont des rect)
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
}

export interface ZonePolygonPoint {
  x_percent: number;
  y_percent: number;
}

export interface ZonePolygon {
  type: "polygon";
  points: ZonePolygonPoint[]; // au moins 3 points
}

export type Zone = ZoneRect | ZonePolygon;

export function isPolygon(zone: Zone | Record<string, unknown>): zone is ZonePolygon {
  return (zone as ZonePolygon).type === "polygon";
}

// Helper backward-compat : convertit un zone_data brut (rect ou polygon) en Zone typé.
// Les zones sans champ "type" sont implicitement des rect (legacy).
export function parseZone(raw: Record<string, unknown>): Zone {
  if (raw.type === "polygon" && Array.isArray(raw.points)) {
    return {
      type: "polygon",
      points: (raw.points as ZonePolygonPoint[]).map((p) => ({
        x_percent: Number(p.x_percent ?? 0),
        y_percent: Number(p.y_percent ?? 0),
      })),
    };
  }
  return {
    type: "rect",
    x_percent: Number(raw.x_percent ?? 10),
    y_percent: Number(raw.y_percent ?? 10),
    width_percent: Number(raw.width_percent ?? 20),
    height_percent: Number(raw.height_percent ?? 20),
  };
}

// Bounding box d'une zone (utile pour overlap detection rapide et label position)
export function zoneBoundingBox(zone: Zone): { x: number; y: number; w: number; h: number } {
  if (isPolygon(zone)) {
    const xs = zone.points.map((p) => p.x_percent);
    const ys = zone.points.map((p) => p.y_percent);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  return {
    x: zone.x_percent,
    y: zone.y_percent,
    w: zone.width_percent,
    h: zone.height_percent,
  };
}

// Surface d'un polygone (formule shoelace) en % carrés (0-10000)
export function polygonAreaPercent(points: ZonePolygonPoint[]): number {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    sum += points[i].x_percent * points[j].y_percent;
    sum -= points[j].x_percent * points[i].y_percent;
  }
  return Math.abs(sum / 2);
}

// Surface d'une zone en % carrés (0-10000) — rect ou polygon.
// Utile pour dériver la surface m² réelle d'un lot à partir de sa geometry.
export function zoneAreaPercent(zone: Zone): number {
  if (isPolygon(zone)) {
    return polygonAreaPercent(zone.points);
  }
  return zone.width_percent * zone.height_percent;
}

// Calcule la surface en m² d'une zone, à partir de :
//   - zone : geometry (rect ou polygon) en coords % (0-100)
//   - m2PerPixelNative : m² par pixel carré NATIF de l'image source (stable,
//     indépendant du rendu à l'écran). Null ou ≤ 0 → pas calibré, retourne null.
//   - naturalWidth/naturalHeight : dimensions natives de l'image plan (pixels).
//
// Formule : areaPct (0-10000) / 10000 × naturalWidth × naturalHeight = areaPx²
//           areaPx² × m2PerPixelNative = surface en m².
//
// Garde-fous :
//   - Dimensions natives invalides (≤ 0) → retourne null plutôt qu'une valeur fausse.
//   - Surface calculée NaN/Infinity → retourne null.
//
// C'est la source de vérité pour la surface affichée d'un lot post-calibration.
// Reste en sync avec l'overlay temps réel de PlanCanvas (calibration unifiée
// sur les pixels natifs — voir PlanCalibration.handleConfirm).
export function computeZoneAreaM2(
  zone: Zone,
  m2PerPixelNative: number | null | undefined,
  naturalWidth: number | null | undefined,
  naturalHeight: number | null | undefined
): number | null {
  if (
    m2PerPixelNative == null ||
    !Number.isFinite(m2PerPixelNative) ||
    m2PerPixelNative <= 0
  ) {
    return null;
  }
  if (
    naturalWidth == null ||
    naturalHeight == null ||
    !Number.isFinite(naturalWidth) ||
    !Number.isFinite(naturalHeight) ||
    naturalWidth <= 0 ||
    naturalHeight <= 0
  ) {
    return null;
  }
  const areaPct = zoneAreaPercent(zone);
  const areaPixelsSq = (areaPct / 10000) * naturalWidth * naturalHeight;
  const surfaceM2 = areaPixelsSq * m2PerPixelNative;
  if (!Number.isFinite(surfaceM2) || surfaceM2 < 0) return null;
  return surfaceM2;
}

// Centroïde d'un polygone (pour positionner le label) — moyenne des points
export function polygonCentroid(points: ZonePolygonPoint[]): ZonePolygonPoint {
  if (points.length === 0) return { x_percent: 50, y_percent: 50 };
  const sumX = points.reduce((acc, p) => acc + p.x_percent, 0);
  const sumY = points.reduce((acc, p) => acc + p.y_percent, 0);
  return {
    x_percent: sumX / points.length,
    y_percent: sumY / points.length,
  };
}

// Test point-in-polygon (algorithme ray casting)
export function pointInPolygon(
  px: number,
  py: number,
  points: ZonePolygonPoint[]
): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x_percent, yi = points[i].y_percent;
    const xj = points[j].x_percent, yj = points[j].y_percent;
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Bounding boxes overlap (rapide)
export function boundingBoxOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

// Test segment-segment intersection (pour polygon overlap V1)
export function segmentsIntersect(
  p1: ZonePolygonPoint,
  p2: ZonePolygonPoint,
  p3: ZonePolygonPoint,
  p4: ZonePolygonPoint
): boolean {
  const d1 = (p4.x_percent - p3.x_percent) * (p1.y_percent - p3.y_percent) -
    (p4.y_percent - p3.y_percent) * (p1.x_percent - p3.x_percent);
  const d2 = (p4.x_percent - p3.x_percent) * (p2.y_percent - p3.y_percent) -
    (p4.y_percent - p3.y_percent) * (p2.x_percent - p3.x_percent);
  const d3 = (p2.x_percent - p1.x_percent) * (p3.y_percent - p1.y_percent) -
    (p2.y_percent - p1.y_percent) * (p3.x_percent - p1.x_percent);
  const d4 = (p2.x_percent - p1.x_percent) * (p4.y_percent - p1.y_percent) -
    (p2.y_percent - p1.y_percent) * (p4.x_percent - p1.x_percent);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

// Détection chevauchement entre deux zones (rect ou polygon)
export function zonesOverlap(a: Zone, b: Zone): boolean {
  // Optim : si bounding boxes ne se chevauchent pas, pas d'overlap.
  const bbA = zoneBoundingBox(a);
  const bbB = zoneBoundingBox(b);
  if (!boundingBoxOverlap(bbA, bbB)) return false;
  // Si les deux sont des rects, le bounding-box overlap suffit.
  if (!isPolygon(a) && !isPolygon(b)) return true;
  // Convertir rect → polygon pour usage uniforme
  const polyA: ZonePolygonPoint[] = isPolygon(a)
    ? a.points
    : [
        { x_percent: a.x_percent, y_percent: a.y_percent },
        { x_percent: a.x_percent + a.width_percent, y_percent: a.y_percent },
        { x_percent: a.x_percent + a.width_percent, y_percent: a.y_percent + a.height_percent },
        { x_percent: a.x_percent, y_percent: a.y_percent + a.height_percent },
      ];
  const polyB: ZonePolygonPoint[] = isPolygon(b)
    ? b.points
    : [
        { x_percent: b.x_percent, y_percent: b.y_percent },
        { x_percent: b.x_percent + b.width_percent, y_percent: b.y_percent },
        { x_percent: b.x_percent + b.width_percent, y_percent: b.y_percent + b.height_percent },
        { x_percent: b.x_percent, y_percent: b.y_percent + b.height_percent },
      ];
  // Tester segment-segment intersection sur toutes les arêtes
  for (let i = 0; i < polyA.length; i++) {
    const a1 = polyA[i];
    const a2 = polyA[(i + 1) % polyA.length];
    for (let j = 0; j < polyB.length; j++) {
      const b1 = polyB[j];
      const b2 = polyB[(j + 1) % polyB.length];
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  // Tester si un point de A est dans B (et inversement) — cas d'inclusion
  if (pointInPolygon(polyA[0].x_percent, polyA[0].y_percent, polyB)) return true;
  if (pointInPolygon(polyB[0].x_percent, polyB[0].y_percent, polyA)) return true;
  return false;
}

// Détecte une auto-intersection dans un polygone (segments non adjacents qui se croisent).
// Utilisé pour empêcher la fermeture d'un polygone "papillon" qui produit une surface
// shoelace incorrecte et un rendu visuellement cassé.
export function polygonHasSelfIntersection(points: ZonePolygonPoint[]): boolean {
  const n = points.length;
  if (n < 4) return false; // 3 points = triangle, pas d'auto-intersection possible
  for (let i = 0; i < n; i++) {
    const a1 = points[i];
    const a2 = points[(i + 1) % n];
    // Tester contre tous les segments NON-adjacents (i+2 à i+n-2)
    for (let j = i + 2; j < n; j++) {
      // Skip le segment qui partage le sommet de fermeture avec le segment i
      if (i === 0 && j === n - 1) continue;
      const b1 = points[j];
      const b2 = points[(j + 1) % n];
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

// ─── Validation des zones (côté API) ──────────────────────────────
// Constantes partagées : limites de robustesse pour empêcher les payloads
// pathologiques (DoS) et les zones dégénérées.

export const MAX_POLYGON_POINTS = 100;
export const MIN_POLYGON_AREA_PERCENT = 0.5; // % carrés (formule shoelace)
export const MIN_RECT_SIZE_PERCENT = 0.5; // % minimum largeur/hauteur

// Helper : vérifie qu'une valeur est un nombre fini et borné dans [0, 100].
function isValidPercent(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100;
}

export function isValidZoneRect(zone: unknown): zone is ZoneRect {
  if (!zone || typeof zone !== "object") return false;
  const z = zone as Record<string, unknown>;
  // Le champ "type" est optionnel pour rect (backward compat) — si présent, doit valoir "rect".
  if (z.type !== undefined && z.type !== "rect") return false;
  if (
    !isValidPercent(z.x_percent) ||
    !isValidPercent(z.y_percent) ||
    typeof z.width_percent !== "number" || !Number.isFinite(z.width_percent) ||
    typeof z.height_percent !== "number" || !Number.isFinite(z.height_percent)
  ) {
    return false;
  }
  if (z.width_percent < MIN_RECT_SIZE_PERCENT || z.width_percent > 100) return false;
  if (z.height_percent < MIN_RECT_SIZE_PERCENT || z.height_percent > 100) return false;
  // Le rectangle doit rester dans le canvas : x + w <= 100, y + h <= 100.
  if (z.x_percent + z.width_percent > 100) return false;
  if (z.y_percent + z.height_percent > 100) return false;
  return true;
}

export function isValidZonePolygon(zone: unknown): zone is ZonePolygon {
  if (!zone || typeof zone !== "object") return false;
  const z = zone as Record<string, unknown>;
  if (z.type !== "polygon") return false;
  if (!Array.isArray(z.points)) return false;
  if (z.points.length < 3 || z.points.length > MAX_POLYGON_POINTS) return false;
  for (const p of z.points) {
    if (!p || typeof p !== "object") return false;
    const pt = p as Record<string, unknown>;
    if (!isValidPercent(pt.x_percent) || !isValidPercent(pt.y_percent)) return false;
  }
  // Aire minimum (anti-polygone dégénéré aplati)
  if (polygonAreaPercent(z.points as ZonePolygonPoint[]) < MIN_POLYGON_AREA_PERCENT) return false;
  return true;
}

export function isValidZone(zone: unknown): zone is Zone {
  return isValidZoneRect(zone) || isValidZonePolygon(zone);
}

// ─── Palette de couleurs lots (8 couleurs, cyclique) ──────────────

export const LOT_COLORS = [
  { name: "argile", hex: "#C4725A" },
  { name: "sable", hex: "#D4B896" },
  { name: "ardoise", hex: "#6B7D8A" },
  { name: "lin", hex: "#C8B89A" },
  { name: "lichen", hex: "#7A9A7E" },
  { name: "calcite", hex: "#E8DDD0" },
  { name: "silex", hex: "#8C8478" },
  { name: "ocre", hex: "#C49B40" },
] as const;

export function getLotColor(index: number): string {
  return LOT_COLORS[index % LOT_COLORS.length].hex;
}

// ─── API Payloads ──────────────────────────────────────────────────

export interface CreateProjectPayload {
  adresse: string;
  type_bien: TypeBien;
  surface_totale?: number | null;
}

export interface UpdateProjectPayload {
  adresse?: string;
  type_bien?: TypeBien;
  surface_totale?: number | null;
  status?: ProjectStatus;
}

export interface CreateLotPayload {
  name: string;
  floor_number?: number;
  surface_m2?: number | null;
  zone_data: Zone;
}

export interface UpdateLotPayload {
  name?: string;
  floor_number?: number;
  surface_m2?: number | null;
  zone_data?: Zone;
  status?: LotStatus;
}

// ─── API Responses ─────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Stepper ───────────────────────────────────────────────────────

export type StepId = 1 | 2 | 3 | 4 | 5;

export interface StepDefinition {
  id: StepId;
  label: string;
  description: string;
  path: (projectId: string) => string;
}

export const STEPS: StepDefinition[] = [
  {
    id: 1,
    label: "Plans",
    description: "Déposez vos plans",
    path: (id) => `/vs/projects/${id}/upload`,
  },
  {
    id: 2,
    label: "Reformatage",
    description: "Vérifiez le plan reformaté",
    path: (id) => `/vs/projects/${id}/reformatage`,
  },
  {
    id: 3,
    label: "Lots",
    description: "Découpez vos lots",
    path: (id) => `/vs/projects/${id}/lots`,
  },
  {
    id: 4,
    label: "Pièces",
    description: "Identifiez les pièces",
    path: (id) => `/vs/projects/${id}/rooms`,
  },
  {
    id: 5,
    label: "Visuels",
    description: "Créez vos visuels",
    path: (id) => `/vs/projects/${id}/visuals`,
  },
];

// ─── Constantes ────────────────────────────────────────────────────

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 Mo
export const MAX_FILES_PER_PROJECT = 10;
export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const TYPE_BIEN_OPTIONS: { value: TypeBien; label: string }[] = [
  { value: "immeuble", label: "Immeuble" },
  { value: "maison", label: "Maison" },
  { value: "appartement", label: "Appartement" },
];
