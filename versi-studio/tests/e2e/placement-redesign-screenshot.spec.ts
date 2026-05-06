/**
 * Test screenshot — Validation visuelle wizard s32 (Phase 4 — itération 3).
 *
 * Couvre 3 états du wizard :
 *  1. Step 1 nu (1re pièce, Salon avec photos placées + style scandinave) — base s32
 *  2. Configuring enrichi : meublé/non-meublé toggle + commentaire saisi — itération 3
 *  3. Preview : 3 visuels générés mockés via SSE + boutons Régénérer/Valider — itération 3
 *
 * Stratégie SSE pour Test B (preview) :
 *  - Mock /api/vs/projects/[id]/visuals-stream (EventSource) avec 3 events
 *    `visual.generated` pour ROOM_ID_1 → wizard bascule auto en `preview`.
 *  - Mock /api/vs/files** sert un PNG synthétique pour les visuels.
 *
 * Output : tests/screenshots/s32-iter3-wizard-{configuring,preview}-{desktop,mobile}.png
 *          (+ baseline existant placement-redesign-{desktop,mobile}.png inchangé)
 */

import { test, expect, devices, type Page } from "@playwright/test";
import {
  setupVisualsStepV2,
  REALISTIC_PHOTOS,
  DEFAULT_ROOMS,
} from "./helpers/setupProject";
import { blockExternalOpenAI } from "./helpers/mockOpenAI";
import { PROJECT_ID, ROOM_ID_1 } from "./fixtures";

const PLACEMENT_URL = `/vs/projects/${PROJECT_ID}/visuals/placement`;

/**
 * Rooms enrichies pour validation visuelle wizard (s32) :
 *  - Salon : style "scandinave" appliqué (pour montrer état RoomStylePicker actif)
 *  - Chambre + SDB : sans style (état "à choisir")
 */
const ROOMS_WIZARD_FIXTURE = DEFAULT_ROOMS.map((r, idx) =>
  idx === 0 ? { ...r, style_id: "scandinave" } : r
);

// ─── Helper SSE mock ────────────────────────────────────────────────
/**
 * Mock /api/vs/projects/[id]/visuals-stream pour renvoyer immédiatement
 * 3 événements `visual.generated` pour ROOM_ID_1, déclenchant la bascule
 * automatique du wizard de `generating` → `preview`.
 *
 * Format SSE attendu par useVisualsStream :
 *   event: visual.generated
 *   data: {"type":"visual.generated","visual_id":"...","room_id":"...","kind":"anchor","file_path":"...","coherence_mode":null}
 */
async function mockNextImageOptimizer(page: Page): Promise<void> {
  // Next/Image proxy via /_next/image?url=... → côté SERVEUR. Cette interception
  // ne peut PAS toucher l'optimizer SSR. À la place, on accepte que le SSR
  // renvoie 502 et que <Image> lève onError → next/image affiche le alt text.
  // Pour contourner sans modifier le composant, on intercepte la requête
  // browser final `_next/image*` et on sert le PNG synthétique. Cela court-
  // circuite le pipeline d'optimisation côté browser.
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const planPath = join(__dirname, "fixtures", "synthetic-plan.png");
  const buf = readFileSync(planPath);
  await page.route(`**/_next/image**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: buf,
    });
  });
}

async function mockVisualsStreamWith3Visuals(page: Page, roomId: string): Promise<void> {
  await page.route(`**/api/vs/projects/${PROJECT_ID}/visuals-stream`, async (route) => {
    const visuals = [
      {
        type: "visual.generated",
        visual_id: "visual-mock-001-aaaa-aaaa-aaaaaaaaaaaa",
        room_id: roomId,
        kind: "anchor",
        file_path: "/tmp/vs/visuals/salon-mock-01.png",
        coherence_mode: "multi_image_native",
      },
      {
        type: "visual.generated",
        visual_id: "visual-mock-002-bbbb-bbbb-bbbbbbbbbbbb",
        room_id: roomId,
        kind: "secondary",
        file_path: "/tmp/vs/visuals/salon-mock-02.png",
        coherence_mode: "multi_image_native",
      },
      {
        type: "visual.generated",
        visual_id: "visual-mock-003-cccc-cccc-cccccccccccc",
        room_id: roomId,
        kind: "secondary",
        file_path: "/tmp/vs/visuals/salon-mock-03.png",
        coherence_mode: "multi_image_native",
      },
    ];
    const body = visuals
      .map(
        (v) =>
          `event: visual.generated\ndata: ${JSON.stringify(v)}\n\n`
      )
      .join("");
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: {
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
      body,
    });
  });
}

// ─── Suite 1 : screenshot baseline (s32 base, inchangé) ──────────────
test.describe("s32 — Screenshots wizard refonte Étape 4", () => {
  test("desktop 1280x800 — wizard step 1 full page", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: "fr-FR",
    });
    const page = await context.newPage();

    await blockExternalOpenAI(page);
    await setupVisualsStepV2(page, {
      rooms: ROOMS_WIZARD_FIXTURE,
      photos: REALISTIC_PHOTOS,
    });

    await page.goto(PLACEMENT_URL);

    // Attendre le wizard et le canvas zoomé.
    await expect(page.getByTestId("visual-wizard")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("visual-wizard-room-step")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("room-zoom-canvas")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("room-style-picker")).toBeVisible();

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: "test-results/placement-redesign-desktop.png",
      fullPage: true,
    });

    await context.close();
  });

  test("mobile iPhone 14 (390x844) — wizard step 1 full page", async ({ browser }) => {
    const iphone = devices["iPhone 14"] ?? devices["iPhone 13"];
    const context = await browser.newContext({
      ...iphone,
      viewport: { width: 390, height: 844 },
      locale: "fr-FR",
    });
    const page = await context.newPage();

    await blockExternalOpenAI(page);
    await setupVisualsStepV2(page, {
      rooms: ROOMS_WIZARD_FIXTURE,
      photos: REALISTIC_PHOTOS,
    });

    await page.goto(PLACEMENT_URL);

    await expect(page.getByTestId("visual-wizard")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("visual-wizard-room-step")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("room-zoom-canvas")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("room-style-picker")).toBeVisible();

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: "test-results/placement-redesign-mobile.png",
      fullPage: true,
    });

    await context.close();
  });
});

// ─── Suite V3 : pattern segments — 4 segments, 3 types différents ──
test.describe("s32 V3 — Pattern segments (panel latéral droit + 3 types)", () => {
  /**
   * Mocks 4 segments pour ROOM_ID_1 (polygone rectangulaire 4 points) :
   *  - segment_index 0 (haut, Nord)   → wall      (noir)
   *  - segment_index 1 (droite, Est)  → bay_window (orange)
   *  - segment_index 2 (bas, Sud)     → opening   (vert)
   *  - segment_index 3 (gauche, Ouest)→ wall      (noir)
   *
   * Note : la numérotation horaire depuis Nord est calculée côté UI
   * (segment-render.ts). Le label « 1, 2, 3, 4 » affiché dans le panel
   * peut différer du segment_index DB selon l'orientation du polygone.
   */
  async function mockSegmentsV3(page: Page): Promise<void> {
    const segments = [
      {
        id: "seg-0001",
        room_id: ROOM_ID_1,
        segment_index: 0,
        type: "wall",
        notes: null,
        updated_at: "2026-05-06T10:00:00.000Z",
      },
      {
        id: "seg-0002",
        room_id: ROOM_ID_1,
        segment_index: 1,
        type: "bay_window",
        notes: null,
        updated_at: "2026-05-06T10:00:00.000Z",
      },
      {
        id: "seg-0003",
        room_id: ROOM_ID_1,
        segment_index: 2,
        type: "opening",
        notes: null,
        updated_at: "2026-05-06T10:00:00.000Z",
      },
      {
        id: "seg-0004",
        room_id: ROOM_ID_1,
        segment_index: 3,
        type: "wall",
        notes: null,
        updated_at: "2026-05-06T10:00:00.000Z",
      },
    ];
    await page.route(`**/api/vs/rooms/*/segments`, async (route) => {
      const url = route.request().url();
      if (url.includes(ROOM_ID_1) && route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: segments }),
        });
        return;
      }
      // Autres rooms ou méthodes non-GET → liste vide / fallback PATCH success.
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [] }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: { ok: true } }),
        });
      }
    });
  }

  test("desktop 1280x800 — V3 segments panel latéral droit", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: "fr-FR",
    });
    const page = await context.newPage();

    await blockExternalOpenAI(page);
    await mockSegmentsV3(page);
    await setupVisualsStepV2(page, {
      rooms: ROOMS_WIZARD_FIXTURE,
      photos: REALISTIC_PHOTOS,
    });

    await page.goto(PLACEMENT_URL);

    await expect(page.getByTestId("visual-wizard")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("visual-wizard-room-step")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("room-zoom-canvas")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("room-segments-panel")).toBeVisible({ timeout: 10_000 });

    // Attendre le chargement des 4 segments (résumé non-loading).
    await expect(page.getByTestId("segments-panel-summary")).not.toContainText(
      "Chargement",
      { timeout: 5_000 }
    );

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: "tests/screenshots/s32-segments-v3-desktop.png",
      fullPage: true,
    });

    await context.close();
  });

  test("mobile iPhone 14 (390x844) — V3 segments panel sous canvas", async ({
    browser,
  }) => {
    const iphone = devices["iPhone 14"] ?? devices["iPhone 13"];
    const context = await browser.newContext({
      ...iphone,
      viewport: { width: 390, height: 844 },
      locale: "fr-FR",
    });
    const page = await context.newPage();

    await blockExternalOpenAI(page);
    await mockSegmentsV3(page);
    await setupVisualsStepV2(page, {
      rooms: ROOMS_WIZARD_FIXTURE,
      photos: REALISTIC_PHOTOS,
    });

    await page.goto(PLACEMENT_URL);

    await expect(page.getByTestId("visual-wizard")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("visual-wizard-room-step")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("room-zoom-canvas")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("room-segments-panel")).toBeVisible({ timeout: 10_000 });

    await expect(page.getByTestId("segments-panel-summary")).not.toContainText(
      "Chargement",
      { timeout: 5_000 }
    );

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: "tests/screenshots/s32-segments-v3-mobile.png",
      fullPage: true,
    });

    await context.close();
  });
});

// ─── Suite 2 : itération 3 — configuring enrichi + preview ─────────
test.describe("s32 iter3 — Wizard configuring enrichi + preview", () => {
  // Fixture commune : Salon avec photos placées + style + meublé=false + commentaire
  // GET /rooms/:id/settings retourne le commentaire pré-rempli pour qu'il soit
  // visible dans le textarea sans frappe utilisateur.
  const COMMENT_TEXT =
    "Pièce vide à meubler. Apporter canapé bleu marine et tapis berbère.";

  async function setupConfiguringEnriched(page: Page): Promise<void> {
    await blockExternalOpenAI(page);
    await setupVisualsStepV2(page, {
      rooms: ROOMS_WIZARD_FIXTURE,
      photos: REALISTIC_PHOTOS,
    });

    // Settings global pour rooms (déclaré AVANT la route spécifique pour que
    // Playwright LIFO donne priorité à la route ROOM_ID_1 ci-dessous).
    await page.route(`**/api/vs/rooms/*/settings`, async (route) => {
      const url = route.request().url();
      // Branche ROOM_ID_1 → commentaire pré-rempli (visible dans textarea).
      if (url.includes(ROOM_ID_1)) {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: {
                room_id: ROOM_ID_1,
                target_visual_count: 1,
                comment_text: COMMENT_TEXT,
              },
            }),
          });
          return;
        }
        if (route.request().method() === "PATCH") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true, data: { room_id: ROOM_ID_1 } }),
          });
          return;
        }
      }
      // Autres rooms → fallback (commentaire vide).
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { room_id: "x", target_visual_count: 1, comment_text: null },
          }),
        });
      } else if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: { room_id: "x" } }),
        });
      } else {
        await route.fallback();
      }
    });

    // PATCH /api/vs/rooms/:id (style, is_furnished, status=skipped)
    await page.route(`**/api/vs/rooms/*`, async (route) => {
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: { id: ROOM_ID_1, ...body } }),
        });
      } else {
        await route.fallback();
      }
    });

    // POST /api/vs/projects/:id/visuals/generate → 202 + déclenche bascule generating
    await page.route(
      `**/api/vs/projects/${PROJECT_ID}/visuals/generate`,
      async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 202,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: {
                job_id: "job-mock-iter3",
                expected_count: 3,
                estimated_cost_usd: 0.12,
              },
            }),
          });
        } else {
          await route.fallback();
        }
      }
    );
  }

  // ─── Test A : configuring enrichi ────────────────────────────────
  test("desktop — configuring enrichi (meublé toggle + commentaire)", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: "fr-FR",
    });
    const page = await context.newPage();

    await setupConfiguringEnriched(page);

    await page.goto(PLACEMENT_URL);

    await expect(page.getByTestId("visual-wizard")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("visual-wizard-room-step")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("room-zoom-canvas")).toBeVisible({ timeout: 10_000 });

    // Attendre que le commentaire pré-rempli soit chargé (fetch /settings).
    await expect(page.getByTestId("wizard-room-comment")).toHaveValue(COMMENT_TEXT, {
      timeout: 5_000,
    });

    // Cliquer sur "Non meublé" pour activer le toggle (par défaut probablement neutre).
    await page.getByTestId("wizard-furnished-no").click();

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: "tests/screenshots/s32-iter4-wizard-configuring-desktop.png",
      fullPage: true,
    });

    await context.close();
  });

  test("mobile — configuring enrichi (meublé toggle + commentaire)", async ({
    browser,
  }) => {
    const iphone = devices["iPhone 14"] ?? devices["iPhone 13"];
    const context = await browser.newContext({
      ...iphone,
      viewport: { width: 390, height: 844 },
      locale: "fr-FR",
    });
    const page = await context.newPage();

    await setupConfiguringEnriched(page);

    await page.goto(PLACEMENT_URL);

    await expect(page.getByTestId("visual-wizard")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("visual-wizard-room-step")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("room-zoom-canvas")).toBeVisible({ timeout: 10_000 });

    await expect(page.getByTestId("wizard-room-comment")).toHaveValue(COMMENT_TEXT, {
      timeout: 5_000,
    });

    await page.getByTestId("wizard-furnished-no").click();

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: "tests/screenshots/s32-iter4-wizard-configuring-mobile.png",
      fullPage: true,
    });

    await context.close();
  });

  // ─── Test B : preview avec 3 visuels mockés via SSE ─────────────
  test("desktop — preview avec 3 visuels (Régénérer / Valider)", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: "fr-FR",
    });
    const page = await context.newPage();

    await setupConfiguringEnriched(page);
    await mockNextImageOptimizer(page);
    await mockVisualsStreamWith3Visuals(page, ROOM_ID_1);

    await page.goto(PLACEMENT_URL);

    await expect(page.getByTestId("visual-wizard")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("visual-wizard-room-step")).toBeVisible({
      timeout: 10_000,
    });

    // Cliquer sur "Générer cette pièce" — bascule en `generating`, ouvre SSE.
    await page.getByTestId("wizard-generate-this-room").click();

    // Attendre la bascule en preview (SSE renvoie 3 visuels → preview auto).
    await expect(page.getByTestId("room-preview-view")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("room-preview-grid")).toBeVisible();
    await expect(page.getByTestId("room-preview-regenerate")).toBeVisible();
    await expect(page.getByTestId("room-preview-validate")).toBeVisible();

    // Scroll jusqu'à la section preview pour cadrer le screenshot.
    // Scroll au DÉBUT de la section preview (titre + grid en haut du viewport).
    await page.getByTestId("room-preview-view").evaluate((el) =>
      el.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior })
    );
    // Petit offset pour ne pas coller au header sticky.
    await page.evaluate(() => window.scrollBy(0, -80));

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // Viewport-only (pas fullPage) pour éviter la superposition du header
    // sticky lors d'un screenshot full page d'une page longue.
    await page.screenshot({
      path: "tests/screenshots/s32-iter4-wizard-preview-desktop.png",
      fullPage: false,
    });

    await context.close();
  });

  test("mobile — preview avec 3 visuels (Régénérer / Valider)", async ({
    browser,
  }) => {
    const iphone = devices["iPhone 14"] ?? devices["iPhone 13"];
    const context = await browser.newContext({
      ...iphone,
      viewport: { width: 390, height: 844 },
      locale: "fr-FR",
    });
    const page = await context.newPage();

    await setupConfiguringEnriched(page);
    await mockNextImageOptimizer(page);
    await mockVisualsStreamWith3Visuals(page, ROOM_ID_1);

    await page.goto(PLACEMENT_URL);

    await expect(page.getByTestId("visual-wizard")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("visual-wizard-room-step")).toBeVisible({
      timeout: 10_000,
    });

    await page.getByTestId("wizard-generate-this-room").click();

    await expect(page.getByTestId("room-preview-view")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("room-preview-grid")).toBeVisible();

    // Scroll au DÉBUT de la section preview (titre + grid en haut du viewport).
    await page.getByTestId("room-preview-view").evaluate((el) =>
      el.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior })
    );
    // Petit offset pour ne pas coller au header sticky.
    await page.evaluate(() => window.scrollBy(0, -80));

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: "tests/screenshots/s32-iter4-wizard-preview-mobile.png",
      fullPage: false,
    });

    await context.close();
  });
});

// ─── Suite 3 : SUJET ARCHITECTE — pills level/constraints + Vision orange + brief ─
test.describe("s32 architect — Détails architecturaux + brief modale", () => {
  /**
   * Fixture architecte (sujet strict s32) :
   *  - Sol : "Parquet" CONFIRMÉ par user (badge absent, pill bleu plein)
   *  - Murs : "Défraîchie" Vision NON confirmée (confidence 0.85) → pill orange + badge "À confirmer"
   *  - Niveau : "premium" sélectionné par user → pill bleu plein "Premium"
   *  - Contraintes techniques (multi) : "beam_preserved" + "window_sealed" user-confirmed
   */
  const ARCHITECT_ROOMS = ROOMS_WIZARD_FIXTURE.map((r, idx) =>
    idx === 0
      ? {
          ...r,
          architectural_details: {
            floor: { value: "Parquet", source: "user" as const, confirmed: true },
            walls: {
              value: "Défraîchie",
              source: "vision" as const,
              confidence: 0.85,
              confirmed: false,
            },
            lighting: { value: null, source: null },
            specifics: [],
            level: { value: "premium", source: "user" as const, confirmed: true },
            technical_constraints: [
              {
                value: "beam_preserved",
                source: "user" as const,
                confirmed: true,
              },
              {
                value: "window_sealed",
                source: "user" as const,
                confirmed: true,
              },
            ],
          },
        }
      : r
  );

  const ARCHITECT_COMMENT =
    "Salon premium avec poutre conservée. Conserver fenêtre condamnée mur Est.";

  /**
   * Setup commun : routes /settings + /chat (extra_context riche pour brief)
   * + /rooms PATCH passthrough.
   */
  async function setupArchitectFixture(page: Page): Promise<void> {
    await blockExternalOpenAI(page);
    await setupVisualsStepV2(page, {
      rooms: ARCHITECT_ROOMS,
      photos: REALISTIC_PHOTOS,
    });

    // Settings → commentaire pré-rempli pour ROOM_ID_1.
    await page.route(`**/api/vs/rooms/*/settings`, async (route) => {
      const url = route.request().url();
      if (url.includes(ROOM_ID_1) && route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              room_id: ROOM_ID_1,
              target_visual_count: 1,
              comment_text: ARCHITECT_COMMENT,
            },
          }),
        });
        return;
      }
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { room_id: "x", target_visual_count: 1, comment_text: null },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: { room_id: "x" } }),
        });
      }
    });

    // PATCH /rooms/:id passthrough (architectural_details / style / is_furnished)
    await page.route(`**/api/vs/rooms/*`, async (route) => {
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: { id: ROOM_ID_1, ...body } }),
        });
      } else {
        await route.fallback();
      }
    });

    // GET /chat → extra_context humain (utilisé par briefSummary).
    await page.route(`**/api/vs/rooms/*/chat`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              extra_context: {
                ambiance: "Lumière naturelle dominante, chaleureuse",
                public_cible: "Famille avec 1-2 enfants",
                rythme_vie: "Télétravail occasionnel, repas en famille",
              },
            },
          }),
        });
      } else {
        await route.fallback();
      }
    });

    // POST /visuals/generate (au cas où le user confirme la modale, on évite 404)
    await page.route(
      `**/api/vs/projects/${PROJECT_ID}/visuals/generate`,
      async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 202,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: {
                job_id: "job-mock-architect",
                expected_count: 3,
                estimated_cost_usd: 0.12,
              },
            }),
          });
        } else {
          await route.fallback();
        }
      }
    );
  }

  // ─── Test A : section "Détails architecturaux" enrichie (configuring) ─
  test("desktop — architect details (level Premium + constraints + Vision orange)", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: "fr-FR",
    });
    const page = await context.newPage();

    await setupArchitectFixture(page);

    await page.goto(PLACEMENT_URL);

    await expect(page.getByTestId("visual-wizard")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("visual-wizard-room-step")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("room-zoom-canvas")).toBeVisible({ timeout: 10_000 });

    // Vérifications visuelles attendues (pré-screenshot) — fail-fast si fixture mal câblée
    await expect(page.getByTestId("room-arch-level-premium")).toBeVisible();
    await expect(page.getByTestId("room-arch-constraint-beam_preserved")).toBeVisible();
    await expect(page.getByTestId("room-arch-constraint-window_sealed")).toBeVisible();
    await expect(page.getByTestId("room-arch-confirm-hint")).toBeVisible();

    // Scroll vers la section pour cadrage screenshot
    await page
      .getByTestId("room-arch-confirm-hint")
      .evaluate((el) =>
        el.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior })
      );
    await page.evaluate(() => window.scrollBy(0, -100));

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1200);

    await page.screenshot({
      path: "tests/screenshots/s32-architect-final-configuring-desktop.png",
      fullPage: true,
    });

    await context.close();
  });

  test("mobile — architect details (level Premium + constraints + Vision orange)", async ({
    browser,
  }) => {
    const iphone = devices["iPhone 14"] ?? devices["iPhone 13"];
    const context = await browser.newContext({
      ...iphone,
      viewport: { width: 390, height: 844 },
      locale: "fr-FR",
    });
    const page = await context.newPage();

    await setupArchitectFixture(page);

    await page.goto(PLACEMENT_URL);

    await expect(page.getByTestId("visual-wizard")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("visual-wizard-room-step")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("room-arch-level-premium")).toBeVisible();
    await expect(page.getByTestId("room-arch-constraint-beam_preserved")).toBeVisible();
    await expect(page.getByTestId("room-arch-constraint-window_sealed")).toBeVisible();

    await page
      .getByTestId("room-arch-confirm-hint")
      .evaluate((el) =>
        el.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior })
      );
    await page.evaluate(() => window.scrollBy(0, -80));

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1200);

    await page.screenshot({
      path: "tests/screenshots/s32-architect-final-configuring-mobile.png",
      fullPage: true,
    });

    await context.close();
  });

  // ─── Test B : modale BriefSummaryDialog ouverte ────────────────────
  test("desktop — modale brief « Avant de générer » ouverte", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: "fr-FR",
    });
    const page = await context.newPage();

    await setupArchitectFixture(page);

    await page.goto(PLACEMENT_URL);

    await expect(page.getByTestId("visual-wizard")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("visual-wizard-room-step")).toBeVisible({
      timeout: 10_000,
    });

    // Cliquer "Générer cette pièce" → ouvre BriefSummaryDialog (sans déclencher generate)
    await page.getByTestId("wizard-generate-this-room").click();

    await expect(page.getByTestId("brief-summary-dialog")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByTestId("brief-summary-text")).toBeVisible();
    await expect(page.getByTestId("brief-summary-cancel")).toBeVisible();
    await expect(page.getByTestId("brief-summary-confirm")).toBeVisible();

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);

    await page.screenshot({
      path: "tests/screenshots/s32-architect-final-brief-desktop.png",
      fullPage: false,
    });

    await context.close();
  });

  test("mobile — modale brief « Avant de générer » ouverte", async ({ browser }) => {
    const iphone = devices["iPhone 14"] ?? devices["iPhone 13"];
    const context = await browser.newContext({
      ...iphone,
      viewport: { width: 390, height: 844 },
      locale: "fr-FR",
    });
    const page = await context.newPage();

    await setupArchitectFixture(page);

    await page.goto(PLACEMENT_URL);

    await expect(page.getByTestId("visual-wizard")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("visual-wizard-room-step")).toBeVisible({
      timeout: 10_000,
    });

    await page.getByTestId("wizard-generate-this-room").click();

    await expect(page.getByTestId("brief-summary-dialog")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByTestId("brief-summary-text")).toBeVisible();

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);

    await page.screenshot({
      path: "tests/screenshots/s32-architect-final-brief-mobile.png",
      fullPage: false,
    });

    await context.close();
  });
});
