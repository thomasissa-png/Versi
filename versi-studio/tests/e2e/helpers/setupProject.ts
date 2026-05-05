/**
 * Helper E2E — setupProject (s30)
 *
 * Provisionne un projet Versi Studio en état "Étape 4 v2" via mocks API
 * Playwright route interception. Évite la création UI multi-étapes (faster).
 *
 * Pattern s28 : itérer sur tous les contextes (étages, lots) — exposer un
 * setup multi-étages pour S4 (régression bug `plans[0]`).
 */

import type { Page, Route } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PROJECT_ID,
  PLAN_ID_1,
  PLAN_ID_2,
  LOT_ID_1,
  LOT_ID_2,
  ROOM_ID_1,
  ROOM_ID_2,
  ROOM_ID_3,
  PHOTO_ID_1,
  MOCK_PROJECT_STEP3,
  MOCK_LOTS,
  MOCK_PLANS,
} from "../fixtures";

// PNG plan synthétique partagé — chargé une fois, sert toutes les routes /api/vs/files
const SYNTHETIC_PLAN_PATH = join(__dirname, "..", "fixtures", "synthetic-plan.png");
let _syntheticPlanCache: Buffer | null = null;
function loadSyntheticPlan(): Buffer {
  if (_syntheticPlanCache) return _syntheticPlanCache;
  _syntheticPlanCache = readFileSync(SYNTHETIC_PLAN_PATH);
  return _syntheticPlanCache;
}

// ─── Types ──────────────────────────────────────────────────────────

export interface RoomFixture {
  id: string;
  name: string | null;
  /** room_type — aligné VsRoom (salon, chambre, sdb, ...) */
  room_type: string;
  custom_label: string | null;
  surface_m2: number | null;
  /**
   * Polygone LOT-LOCAL en % (0-100) — shape aligné VsRoom.polygon.
   * Cohérent avec le PNG synthetic-plan.png généré par
   * tests/e2e/fixtures/generate-synthetic-plan.ts.
   */
  polygon: Array<{ x_percent: number; y_percent: number }>;
  /** position rect (lot-local %) — fallback compatibilité legacy. */
  position?: { x_percent: number; y_percent: number; width_percent: number; height_percent: number };
  status?: "suggested" | "validated";
  source?: "ai" | "user";
  created_at?: string;
  lot_id: string;
  plan_id: string;
  /** Style appliqué à la pièce (s32 wizard). null = pas encore choisi. */
  style_id?: string | null;
}

export interface PhotoFixture {
  id: string;
  /** room_id sur lequel la photo est rattachée (pas placed_room_id — VsPhoto.room_id). */
  room_id: string;
  filename: string;
  file_path: string;
  is_placed_on_plan: boolean;
  /** Position normalisée 0-1 LOT-LOCAL — center de la pastille sur le plan. */
  position_x: number | null;
  position_y: number | null;
  /** Angle 0-359, 0 = nord, sens horaire. null si non placée. */
  angle_degrees: number | null;
  /** EXIF + warnings (alignés VsPhoto). */
  taken_at?: string | null;
  exif_raw?: Record<string, unknown> | null;
  preprocessing_warnings?: unknown[] | null;
  angle_description?: string | null;
  created_at?: string;
}

export interface ProjectSetupOpts {
  /** Plans (étages) — défaut 1 plan. S4 utilise 2 plans. */
  plans?: Array<{ id: string; image_url: string; floor_label: string }>;
  /** Pièces — défaut 3 (salon, chambre, sdb). */
  rooms?: RoomFixture[];
  /** Photos — défaut 0. */
  photos?: PhotoFixture[];
}

// ─── Defaults ───────────────────────────────────────────────────────

export const DEFAULT_PLAN = {
  id: PLAN_ID_1,
  image_url: "/test-fixtures/plan-rdc.jpg",
  floor_label: "RDC",
};

export const DEFAULT_PLAN_R1 = {
  id: PLAN_ID_2,
  image_url: "/test-fixtures/plan-r1.jpg",
  floor_label: "R+1",
};

/**
 * Pièces alignées avec le PNG synthetic-plan.png (lot=5%-95% du plan global,
 * pièces en LOT-LOCAL %).
 *  Salon   : (5,10) → (50,60)   gauche du lot
 *  Chambre : (55,10) → (95,50)  droite haut du lot
 *  SDB     : (55,55) → (90,90)  droite bas du lot
 */
export const DEFAULT_ROOMS: RoomFixture[] = [
  {
    id: ROOM_ID_1,
    name: null,
    room_type: "salon",
    custom_label: null,
    surface_m2: 28,
    polygon: [
      { x_percent: 5, y_percent: 10 },
      { x_percent: 50, y_percent: 10 },
      { x_percent: 50, y_percent: 60 },
      { x_percent: 5, y_percent: 60 },
    ],
    position: { x_percent: 5, y_percent: 10, width_percent: 45, height_percent: 50 },
    status: "validated",
    source: "ai",
    created_at: "2026-04-15T10:10:00.000Z",
    lot_id: LOT_ID_1,
    plan_id: PLAN_ID_1,
  },
  {
    id: ROOM_ID_2,
    name: null,
    room_type: "chambre",
    custom_label: null,
    surface_m2: 12,
    polygon: [
      { x_percent: 55, y_percent: 10 },
      { x_percent: 95, y_percent: 10 },
      { x_percent: 95, y_percent: 50 },
      { x_percent: 55, y_percent: 50 },
    ],
    position: { x_percent: 55, y_percent: 10, width_percent: 40, height_percent: 40 },
    status: "validated",
    source: "ai",
    created_at: "2026-04-15T10:10:00.000Z",
    lot_id: LOT_ID_1,
    plan_id: PLAN_ID_1,
  },
  {
    id: ROOM_ID_3,
    name: null,
    room_type: "sdb",
    custom_label: null,
    surface_m2: 4,
    polygon: [
      { x_percent: 55, y_percent: 55 },
      { x_percent: 90, y_percent: 55 },
      { x_percent: 90, y_percent: 90 },
      { x_percent: 55, y_percent: 90 },
    ],
    position: { x_percent: 55, y_percent: 55, width_percent: 35, height_percent: 35 },
    status: "validated",
    source: "ai",
    created_at: "2026-04-15T10:10:00.000Z",
    lot_id: LOT_ID_1,
    plan_id: PLAN_ID_1,
  },
];

export const DEFAULT_PHOTO_PLACED: PhotoFixture = {
  id: PHOTO_ID_1,
  room_id: ROOM_ID_1,
  filename: "salon-01.jpg",
  file_path: "/test-fixtures/salon-01.jpg",
  is_placed_on_plan: true,
  // Centre du polygone Salon en LOT-LOCAL 0-1 : (5+50)/2/100 = 0.275, (10+60)/2/100 = 0.35
  position_x: 0.275,
  position_y: 0.35,
  angle_degrees: 0,
  taken_at: null,
  exif_raw: null,
  preprocessing_warnings: null,
  angle_description: null,
  created_at: "2026-04-15T10:20:00.000Z",
};

export const DEFAULT_PHOTO_UNPLACED: PhotoFixture = {
  id: PHOTO_ID_1,
  room_id: ROOM_ID_1,
  filename: "salon-01.jpg",
  file_path: "/test-fixtures/salon-01.jpg",
  is_placed_on_plan: false,
  position_x: null,
  position_y: null,
  angle_degrees: null,
  taken_at: null,
  exif_raw: null,
  preprocessing_warnings: null,
  angle_description: null,
  created_at: "2026-04-15T10:20:00.000Z",
};

/**
 * Set de photos REALISTE pour screenshots placement (s32).
 * Couvre :
 *  - 2 photos placées dans Salon (états multi → polygone bleu, angles 45° et 180°)
 *  - 1 photo placée dans Chambre (état placée seule → polygone vert, angle 270°)
 *  - 1 photo placée dans SDB (angle 0°/nord)
 *  - 1 photo NON placée dans Salon (mix « placée / à placer »)
 *
 * Positions LOT-LOCAL 0-1 calées sur les polygones.
 * Angles 0/45/180/270 montrent les 4 directions cardinales.
 */
export const REALISTIC_PHOTOS: PhotoFixture[] = [
  // Salon — 2 photos placées (multi → polygone bleu)
  {
    id: "photo-salon-01-aaaa-aaaa-aaaaaaaaaaaa",
    room_id: ROOM_ID_1,
    filename: "salon-fenetre.jpg",
    file_path: "/tmp/vs/photos/salon-fenetre.jpg",
    is_placed_on_plan: true,
    position_x: 0.20, // gauche du Salon
    position_y: 0.25,
    angle_degrees: 45, // nord-est
    taken_at: null, exif_raw: null, preprocessing_warnings: null,
    angle_description: null, created_at: "2026-04-15T10:20:00.000Z",
  },
  {
    id: "photo-salon-02-bbbb-bbbb-bbbbbbbbbbbb",
    room_id: ROOM_ID_1,
    filename: "salon-canape.jpg",
    file_path: "/tmp/vs/photos/salon-canape.jpg",
    is_placed_on_plan: true,
    position_x: 0.32,
    position_y: 0.50,
    angle_degrees: 180, // sud
    taken_at: null, exif_raw: null, preprocessing_warnings: null,
    angle_description: null, created_at: "2026-04-15T10:21:00.000Z",
  },
  // Chambre — 1 photo placée (placée seule → polygone vert)
  {
    id: "photo-chambre-01-cccc-cccc-cccccccccccc",
    room_id: ROOM_ID_2,
    filename: "chambre-lit.jpg",
    file_path: "/tmp/vs/photos/chambre-lit.jpg",
    is_placed_on_plan: true,
    position_x: 0.75, // centre Chambre
    position_y: 0.30,
    angle_degrees: 270, // ouest
    taken_at: null, exif_raw: null, preprocessing_warnings: null,
    angle_description: null, created_at: "2026-04-15T10:22:00.000Z",
  },
  // SDB — 1 photo placée (placée seule → polygone vert)
  {
    id: "photo-sdb-01-dddd-dddd-dddddddddddd",
    room_id: ROOM_ID_3,
    filename: "sdb-douche.jpg",
    file_path: "/tmp/vs/photos/sdb-douche.jpg",
    is_placed_on_plan: true,
    position_x: 0.725, // centre SDB
    position_y: 0.725,
    angle_degrees: 0, // nord
    taken_at: null, exif_raw: null, preprocessing_warnings: null,
    angle_description: null, created_at: "2026-04-15T10:23:00.000Z",
  },
  // Salon — 1 photo NON placée (état mixte « à placer »)
  {
    id: "photo-salon-03-eeee-eeee-eeeeeeeeeeee",
    room_id: ROOM_ID_1,
    filename: "salon-cuisine-ouverte.jpg",
    file_path: "/tmp/vs/photos/salon-cuisine.jpg",
    is_placed_on_plan: false,
    position_x: null,
    position_y: null,
    angle_degrees: null,
    taken_at: null, exif_raw: null, preprocessing_warnings: null,
    angle_description: null, created_at: "2026-04-15T10:24:00.000Z",
  },
];

// ─── Mock Setup ─────────────────────────────────────────────────────

/**
 * Mock toutes les routes /api/vs/* nécessaires pour l'écran Étape 4 v2.
 * Le state est partagé via closures (mutable) : un appel PATCH met à jour
 * le state pour les requêtes GET ultérieures.
 */
export async function setupVisualsStepV2(
  page: Page,
  opts: ProjectSetupOpts = {}
): Promise<{ state: { rooms: RoomFixture[]; photos: PhotoFixture[]; plans: typeof opts.plans } }> {
  const plans = opts.plans ?? [DEFAULT_PLAN];
  const rooms = opts.rooms ?? DEFAULT_ROOMS;
  const photos = opts.photos ?? [];

  // State mutable partagé entre les routes — simule la BDD.
  const state = { rooms: [...rooms], photos: [...photos], plans };

  // GET projet (status step_3_complete pour autoriser Étape 4)
  await page.route(`**/api/vs/projects/${PROJECT_ID}`, async (route: Route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: MOCK_PROJECT_STEP3 }),
      });
    } else {
      await route.fallback();
    }
  });

  // GET plans (page lit ce endpoint pour résoudre planImageUrl par étage)
  await page.route(`**/api/vs/projects/${PROJECT_ID}/plans`, async (route: Route) => {
    // Si plans custom fournis → mapper sur le shape MOCK_PLANS attendu (file_path).
    const plansShaped = state.plans
      ? state.plans.map((p, i) => ({
          ...MOCK_PLANS[Math.min(i, MOCK_PLANS.length - 1)],
          id: p.id,
          file_path: p.image_url,
          floor_number: i,
        }))
      : MOCK_PLANS;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: plansShaped }),
    });
  });

  // GET lots (page placement charge la liste des lots avant d'inférer le plan)
  await page.route(`**/api/vs/projects/${PROJECT_ID}/lots`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: MOCK_LOTS }),
    });
  });

  // GET rooms par lot (page itère sur chaque lot pour récupérer ses pièces)
  await page.route(`**/api/vs/lots/*/rooms`, async (route: Route) => {
    const lotId = route.request().url().match(/lots\/([^/]+)\/rooms/)?.[1];
    const filtered = state.rooms.filter((r) => r.lot_id === lotId);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: filtered }),
    });
  });

  // GET visuals par room (page itère pour charger photos+visuals existants).
  // Filtre par room_id (aligné VsPhoto.room_id, pas placed_room_id).
  await page.route(`**/api/vs/rooms/*/visuals`, async (route: Route) => {
    const roomId = route.request().url().match(/rooms\/([^/]+)\/visuals/)?.[1];
    const photosForRoom = state.photos.filter((p) => p.room_id === roomId);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { photos: photosForRoom, visuals: [] } }),
    });
  });

  // GET fichier plan — sert le PNG synthétique (tests/e2e/fixtures/synthetic-plan.png)
  // pour que VisualPlanCanvas charge un VRAI plan visible (pas un 1×1 transparent).
  await page.route(`**/api/vs/files**`, async (route: Route) => {
    try {
      const buf = loadSyntheticPlan();
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        body: buf,
      });
    } catch {
      // Fallback 1×1 si le PNG synthétique est absent (CI minimal).
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=",
          "base64"
        ),
      });
    }
  });

  // GET rooms (filtré par plan_id si query string présent)
  await page.route(`**/api/vs/projects/${PROJECT_ID}/rooms*`, async (route: Route) => {
    const url = new URL(route.request().url());
    const planId = url.searchParams.get("plan_id");
    const filtered = planId ? state.rooms.filter((r) => r.plan_id === planId) : state.rooms;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: filtered }),
    });
  });

  // GET photos
  await page.route(`**/api/vs/projects/${PROJECT_ID}/photos`, async (route: Route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: state.photos }),
      });
    } else {
      await route.fallback();
    }
  });

  // PATCH photo place — placement xy + angle
  await page.route(`**/api/vs/photos/*/place`, async (route: Route) => {
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON() as {
        room_id: string; position_x: number; position_y: number; angle_degrees?: number;
      };
      const photoId = route.request().url().match(/photos\/([^/]+)\/place/)?.[1];
      const photo = state.photos.find((p) => p.id === photoId);
      if (photo) {
        photo.is_placed_on_plan = true;
        photo.room_id = body.room_id;
        photo.position_x = body.position_x;
        photo.position_y = body.position_y;
        if (body.angle_degrees !== undefined) photo.angle_degrees = body.angle_degrees;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: photo }),
      });
    } else {
      await route.fallback();
    }
  });

  return { state };
}

// ─── Setup Vague 3b — settings + preflight + generate ──────────────

export interface GenerateMockOpts {
  /** Si true, preflight retourne questions T1-T5 → modale s'ouvre. */
  triggerQuestions?: boolean;
  /** Liste des questions à retourner (sinon défaut T1 surface). */
  questions?: Array<{ id: string; trigger: string; question: string; question_type: string }>;
  /** Si true, le 2e visuel généré échouera (pour S9 régen individuelle). */
  failSecondVisual?: boolean;
}

export async function setupGenerationMocks(
  page: Page,
  opts: GenerateMockOpts = {}
): Promise<void> {
  // GET settings
  await page.route(`**/api/vs/projects/${PROJECT_ID}/settings`, async (route: Route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { settings: [], style_id: null, comment_pending: false },
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // PATCH room settings (slider visuels + commentaire)
  await page.route(`**/api/vs/projects/${PROJECT_ID}/rooms/*/settings`, async (route: Route) => {
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { ...body, room_id: "x" } }),
      });
    } else {
      await route.fallback();
    }
  });

  // POST preflight
  await page.route(`**/api/vs/projects/${PROJECT_ID}/preflight`, async (route: Route) => {
    if (route.request().method() === "POST") {
      const questions = opts.triggerQuestions
        ? opts.questions ?? [
            {
              id: "q-t1-001",
              trigger: "T1",
              question: "La surface détectée est 3 m² pour Salon. Quelle est la vraie surface ?",
              question_type: "number",
            },
          ]
        : [];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { has_questions: questions.length > 0, questions, job_id: null },
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // PATCH question answer
  await page.route(`**/api/vs/projects/${PROJECT_ID}/questions/*`, async (route: Route) => {
    if (route.request().method() === "PATCH") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { answered: true } }),
      });
    } else {
      await route.fallback();
    }
  });

  // POST generate
  await page.route(`**/api/vs/projects/${PROJECT_ID}/visuals/generate`, async (route: Route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { job_id: "job-test-001", status: "running", expected_count: 5 },
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // POST regenerate (EC-5)
  await page.route(`**/api/vs/visuals/*/regenerate`, async (route: Route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { regen_job_id: "regen-001" } }),
      });
    } else {
      await route.fallback();
    }
  });
}
