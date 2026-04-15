/**
 * Fixtures de test Versi Studio — Donnees mock pour les API routes.
 *
 * Les tests E2E mockent TOUTES les API routes /api/vs/* via Playwright route interception.
 * Raison : pas de PostgreSQL ni d'API OpenAI en environnement de test.
 *
 * Chaque fixture represente un etat metier coherent du workflow 4 etapes.
 */

// ─── Identifiants stables ─────────────────────────────────────────

export const PROJECT_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
export const PLAN_ID_1 = "plan-0001-0000-0000-000000000001";
export const PLAN_ID_2 = "plan-0002-0000-0000-000000000002";
export const LOT_ID_1 = "lot-0001-0000-0000-0000000000001";
export const LOT_ID_2 = "lot-0002-0000-0000-0000000000002";
export const ROOM_ID_1 = "room-0001-0000-0000-000000000001";
export const ROOM_ID_2 = "room-0002-0000-0000-000000000002";
export const ROOM_ID_3 = "room-0003-0000-0000-000000000003";
export const PHOTO_ID_1 = "photo-001-0000-0000-000000000001";
export const VISUAL_ID_1 = "visual-01-0000-0000-000000000001";

// ─── Projet ───────────────────────────────────────────────────────

export const MOCK_PROJECT = {
  id: PROJECT_ID,
  adresse: "10 rue des Muguets, 59000 Lille",
  type_bien: "immeuble" as const,
  surface_totale: 380,
  status: "draft" as const,
  created_at: "2026-04-15T10:00:00.000Z",
  updated_at: "2026-04-15T10:00:00.000Z",
};

export const MOCK_PROJECT_STEP1 = {
  ...MOCK_PROJECT,
  status: "step_1_complete" as const,
};

export const MOCK_PROJECT_STEP2 = {
  ...MOCK_PROJECT,
  status: "step_2_complete" as const,
};

export const MOCK_PROJECT_STEP3 = {
  ...MOCK_PROJECT,
  status: "step_3_complete" as const,
};

export const MOCK_PROJECT_COMPLETED = {
  ...MOCK_PROJECT,
  status: "completed" as const,
};

// ─── Plans ────────────────────────────────────────────────────────

export const MOCK_PLANS = [
  {
    id: PLAN_ID_1,
    project_id: PROJECT_ID,
    file_path: "/tmp/vs/plans/plan-rdc.png",
    mime_type: "image/png",
    floor_number: 0,
    original_filename: "plan_rdc.pdf",
    extraction_data: null,
    extraction_status: "pending" as const,
    created_at: "2026-04-15T10:01:00.000Z",
  },
  {
    id: PLAN_ID_2,
    project_id: PROJECT_ID,
    file_path: "/tmp/vs/plans/plan-r1.png",
    mime_type: "image/png",
    floor_number: 1,
    original_filename: "plan_r1.pdf",
    extraction_data: null,
    extraction_status: "pending" as const,
    created_at: "2026-04-15T10:01:30.000Z",
  },
];

// ─── Lots ─────────────────────────────────────────────────────────

export const MOCK_LOTS = [
  {
    id: LOT_ID_1,
    project_id: PROJECT_ID,
    name: "Lot 1 — T2 RDC",
    floor_number: 0,
    surface_m2: 55,
    zone_data: {
      x_percent: 5,
      y_percent: 10,
      width_percent: 45,
      height_percent: 80,
    },
    status: "suggested" as const,
    source: "ai" as const,
    created_at: "2026-04-15T10:05:00.000Z",
  },
  {
    id: LOT_ID_2,
    project_id: PROJECT_ID,
    name: "Lot 2 — T3 RDC",
    floor_number: 0,
    surface_m2: 72,
    zone_data: {
      x_percent: 52,
      y_percent: 10,
      width_percent: 43,
      height_percent: 80,
    },
    status: "suggested" as const,
    source: "ai" as const,
    created_at: "2026-04-15T10:05:00.000Z",
  },
];

export const MOCK_LOTS_VALIDATED = MOCK_LOTS.map((l) => ({
  ...l,
  status: "validated" as const,
}));

// ─── Rooms ────────────────────────────────────────────────────────

export const MOCK_ROOMS_LOT1 = [
  {
    id: ROOM_ID_1,
    lot_id: LOT_ID_1,
    plan_id: PLAN_ID_1,
    name: null,
    room_type: "salon",
    custom_label: null,
    surface_m2: 22,
    position: { x_percent: 10, y_percent: 15, width_percent: 35, height_percent: 30 },
    status: "suggested" as const,
    source: "ai" as const,
    created_at: "2026-04-15T10:10:00.000Z",
  },
  {
    id: ROOM_ID_2,
    lot_id: LOT_ID_1,
    plan_id: PLAN_ID_1,
    name: null,
    room_type: "chambre",
    custom_label: null,
    surface_m2: 14,
    position: { x_percent: 10, y_percent: 50, width_percent: 35, height_percent: 25 },
    status: "suggested" as const,
    source: "ai" as const,
    created_at: "2026-04-15T10:10:00.000Z",
  },
];

export const MOCK_ROOMS_LOT2 = [
  {
    id: ROOM_ID_3,
    lot_id: LOT_ID_2,
    plan_id: PLAN_ID_1,
    name: null,
    room_type: "cuisine",
    custom_label: null,
    surface_m2: 12,
    position: { x_percent: 55, y_percent: 15, width_percent: 30, height_percent: 25 },
    status: "suggested" as const,
    source: "ai" as const,
    created_at: "2026-04-15T10:10:00.000Z",
  },
];

// ─── Photos & Visuels ─────────────────────────────────────────────

export const MOCK_PHOTO = {
  id: PHOTO_ID_1,
  room_id: ROOM_ID_1,
  file_path: "/tmp/vs/photos/salon-brut.jpg",
  angle_description: "Face fenetre",
  created_at: "2026-04-15T10:20:00.000Z",
};

export const MOCK_VISUAL_PROCESSING = {
  id: VISUAL_ID_1,
  photo_id: PHOTO_ID_1,
  style_id: "scandinave",
  file_path: null,
  status: "processing" as const,
  prompt_used: null,
  iteration_count: 0,
  parent_visual_id: null,
  error_message: null,
  created_at: "2026-04-15T10:25:00.000Z",
};

export const MOCK_VISUAL_GENERATED = {
  ...MOCK_VISUAL_PROCESSING,
  status: "generated" as const,
  file_path: "/tmp/vs/visuals/salon-scandinave.png",
  prompt_used: "Salon scandinave lumineux avec parquet clair",
};

export const MOCK_VISUAL_VALIDATED = {
  ...MOCK_VISUAL_GENERATED,
  status: "validated" as const,
};

// ─── Extraction IA mock ───────────────────────────────────────────

export const MOCK_EXTRACTION_RESULT = {
  status: "done" as const,
  result: {
    building_type: "immeuble",
    floors_count: 2,
    floors: [
      {
        floor_number: 0,
        rooms: [
          { type: "salon", surface_m2: 22, bounding_box: { x: 10, y: 15, w: 35, h: 30 } },
          { type: "chambre", surface_m2: 14, bounding_box: { x: 10, y: 50, w: 35, h: 25 } },
          { type: "cuisine", surface_m2: 12, bounding_box: { x: 55, y: 15, w: 30, h: 25 } },
        ],
      },
    ],
    suggested_lots: [
      {
        name: "Lot 1 — T2 RDC",
        floor_number: 0,
        surface_m2: 55,
        zone: { x_percent: 5, y_percent: 10, width_percent: 45, height_percent: 80 },
      },
      {
        name: "Lot 2 — T3 RDC",
        floor_number: 0,
        surface_m2: 72,
        zone: { x_percent: 52, y_percent: 10, width_percent: 43, height_percent: 80 },
      },
    ],
    warnings: [],
    confidence: 0.85,
  },
  error: null,
};
