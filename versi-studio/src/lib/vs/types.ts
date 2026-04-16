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
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
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
  zone_data: ZoneRect;
}

export interface UpdateLotPayload {
  name?: string;
  floor_number?: number;
  surface_m2?: number | null;
  zone_data?: ZoneRect;
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

export type StepId = 1 | 2 | 3 | 4;

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
    label: "Lots",
    description: "Découpez vos lots",
    path: (id) => `/vs/projects/${id}/lots`,
  },
  {
    id: 3,
    label: "Pièces",
    description: "Identifiez les pièces",
    path: (id) => `/vs/projects/${id}/rooms`,
  },
  {
    id: 4,
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
