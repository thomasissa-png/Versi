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

// ─── Types ──────────────────────────────────────────────────────────

export interface RoomFixture {
  id: string;
  name: string;
  type: string;
  surface_m2: number | null;
  polygon: Array<{ x: number; y: number }>;
  lot_id: string;
  plan_id: string;
}

export interface PhotoFixture {
  id: string;
  filename: string;
  file_path: string;
  is_placed_on_plan: boolean;
  placed_room_id: string | null;
  position_x: number | null;
  position_y: number | null;
  angle_degrees: number | null;
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

export const DEFAULT_ROOMS: RoomFixture[] = [
  {
    id: ROOM_ID_1,
    name: "Salon",
    type: "salon",
    surface_m2: 28,
    polygon: [
      { x: 0.10, y: 0.10 },
      { x: 0.45, y: 0.10 },
      { x: 0.45, y: 0.50 },
      { x: 0.10, y: 0.50 },
    ],
    lot_id: LOT_ID_1,
    plan_id: PLAN_ID_1,
  },
  {
    id: ROOM_ID_2,
    name: "Chambre",
    type: "chambre",
    surface_m2: 12,
    polygon: [
      { x: 0.50, y: 0.10 },
      { x: 0.85, y: 0.10 },
      { x: 0.85, y: 0.50 },
      { x: 0.50, y: 0.50 },
    ],
    lot_id: LOT_ID_1,
    plan_id: PLAN_ID_1,
  },
  {
    id: ROOM_ID_3,
    name: "SDB",
    type: "sdb",
    surface_m2: 4,
    polygon: [
      { x: 0.10, y: 0.55 },
      { x: 0.40, y: 0.55 },
      { x: 0.40, y: 0.80 },
      { x: 0.10, y: 0.80 },
    ],
    lot_id: LOT_ID_1,
    plan_id: PLAN_ID_1,
  },
];

export const DEFAULT_PHOTO_PLACED: PhotoFixture = {
  id: PHOTO_ID_1,
  filename: "salon-01.jpg",
  file_path: "/test-fixtures/salon-01.jpg",
  is_placed_on_plan: true,
  placed_room_id: ROOM_ID_1,
  position_x: 0.27,
  position_y: 0.30,
  angle_degrees: 0,
};

export const DEFAULT_PHOTO_UNPLACED: PhotoFixture = {
  id: PHOTO_ID_1,
  filename: "salon-01.jpg",
  file_path: "/test-fixtures/salon-01.jpg",
  is_placed_on_plan: false,
  placed_room_id: null,
  position_x: null,
  position_y: null,
  angle_degrees: null,
};

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

  // GET visuals par room (page itère pour charger photos+visuals existants)
  await page.route(`**/api/vs/rooms/*/visuals`, async (route: Route) => {
    const roomId = route.request().url().match(/rooms\/([^/]+)\/visuals/)?.[1];
    const photosForRoom = state.photos.filter((p) => p.placed_room_id === roomId);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { photos: photosForRoom, visuals: [] } }),
    });
  });

  // GET fichier plan (route cosmétique — retourne 200 vide pour ne pas casser <img>)
  await page.route(`**/api/vs/files**`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=",
        "base64"
      ),
    });
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
        photo.placed_room_id = body.room_id;
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
