/**
 * Tests visuels — Page Rooms (US-VS-04)
 *
 * Produit les baselines screenshots pour la gate G26 :
 *   3 devices (iPhone 13 375x812, iPad 768x1024, Desktop 1280x800)
 *   × 7 états UI (default-empty, rooms-detected, room-selected, lot-validated,
 *                 validation-blocked, modal-delete, all-lots-validated)
 *   = 21 PNG dans `tests/screenshots/rooms/`
 *
 * APIs mockées via route interception Playwright (pattern aligné sur upload-visual.spec.ts).
 *
 * Stratégie :
 *   - Chaque test correspond à un état métier figé côté mock.
 *   - "default-empty" = lot 1 sélectionné, aucune pièce détectée encore.
 *   - "rooms-detected" = 2 pièces IA suggérées dans le lot 1.
 *   - "room-selected" = pièce 1 (salon) sélectionnée → carte active dans le panel.
 *   - "lot-validated" = lot 1 validé (status=validated), peut passer au lot 2.
 *   - "validation-blocked" = pièce sans surface → surbrillance rouge sur le canvas.
 *   - "modal-delete" = ConfirmModal "Supprimer cette pièce ?" ouvert.
 *   - "all-lots-validated" = tous les lots validés → message succès final + CTA "Continuer".
 *
 * IMPORTANT — Ordre de routes Playwright (learning versi-s13 P1 #2) :
 *   `page.route()` applique la DERNIÈRE route enregistrée qui matche.
 *   Donc enregistrer le wildcard d'abord, puis la route spécifique APRÈS.
 *
 * Exécution locale :
 *   npx playwright test rooms-visual --update-snapshots
 */

import { test, expect, type Page, type Route } from "@playwright/test";
import path from "node:path";
import {
  PROJECT_ID,
  LOT_ID_1,
  LOT_ID_2,
  MOCK_PROJECT_STEP2,
  MOCK_PROJECT_STEP3,
  MOCK_PLANS,
  MOCK_LOTS,
  MOCK_LOTS_VALIDATED,
  MOCK_ROOMS_LOT1,
  MOCK_ROOMS_LOT2,
} from "./fixtures";

// ─── Constantes ──────────────────────────────────────────────────

const SCREENSHOT_DIR = path.join(__dirname, "..", "screenshots", "rooms");

// Pièce sans surface → surbrillance rouge bloquant la validation
const ROOM_INVALID = {
  ...MOCK_ROOMS_LOT1[0],
  surface_m2: null,
};

const MOCK_ROOMS_LOT1_INVALID = [ROOM_INVALID, MOCK_ROOMS_LOT1[1]];

// Lot 1 validé pour scénario all-lots-validated (les 2 lots = validated)
const MOCK_LOTS_BOTH_VALIDATED = MOCK_LOTS.map((l) => ({
  ...l,
  status: "validated" as const,
}));

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Mock de base : project, lots, plans, rooms par lot.
 * Les tests individuels passent leurs datasets et statuts.
 */
async function mockBase(
  page: Page,
  {
    project = MOCK_PROJECT_STEP2,
    lots = MOCK_LOTS,
    plans = MOCK_PLANS,
    roomsByLot = {} as Record<string, unknown[]>,
  }: {
    project?: unknown;
    lots?: unknown[];
    plans?: unknown[];
    roomsByLot?: Record<string, unknown[]>;
  } = {}
) {
  // Static files (plan images) → pixel transparent
  await page.route("**/tmp/vs/**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      ),
    });
  });
  await page.route("**/api/vs/files*", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      ),
    });
  });

  // GET project (+ PATCH pour transition step_3_complete)
  await page.route(`**/api/vs/projects/${PROJECT_ID}`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: project }),
    });
  });

  // GET plans
  await page.route(
    `**/api/vs/projects/${PROJECT_ID}/plans`,
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: plans }),
      });
    }
  );

  // GET lots du projet
  await page.route(
    `**/api/vs/projects/${PROJECT_ID}/lots`,
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: lots }),
      });
    }
  );

  // GET/POST rooms par lot
  await page.route("**/api/vs/lots/*/rooms", async (route: Route) => {
    const url = route.request().url();
    const match = url.match(/\/lots\/([^/]+)\/rooms/);
    const lotId = match?.[1] ?? "";
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: roomsByLot[lotId] ?? [],
        }),
      });
      return;
    }
    // POST = ajout manuel d'une pièce
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          id: `room-${Date.now()}`,
          lot_id: lotId,
          plan_id: MOCK_PLANS[0].id,
          name: null,
          room_type: "salon",
          custom_label: null,
          surface_m2: 10,
          position: { x_percent: 30, y_percent: 30, width_percent: 25, height_percent: 25 },
          status: "manual",
          source: "manual",
          created_at: new Date().toISOString(),
        },
      }),
    });
  });

  // PATCH/DELETE individual room
  await page.route("**/api/vs/rooms/*", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { updated: true } }),
    });
  });

  // PATCH individual lot (validation)
  await page.route("**/api/vs/lots/*", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { updated: true } }),
    });
  });
}

/**
 * Device → taille de viewport. On pilote explicitement la viewport pour
 * produire un nom de fichier stable sans multiplier les projets Playwright.
 */
const VIEWPORTS = [
  { name: "iphone13", width: 375, height: 812, isMobile: true },
  { name: "ipad", width: 768, height: 1024, isMobile: true },
  { name: "desktop", width: 1280, height: 800, isMobile: false },
] as const;

// ─── Tests ────────────────────────────────────────────────────────

test.describe("Rooms — baselines visuelles", () => {
  test.setTimeout(45_000);

  for (const vp of VIEWPORTS) {
    test.describe(`viewport ${vp.name} (${vp.width}x${vp.height})`, () => {
      test.use({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      });

      test("default (lot 1 sélectionné, aucune pièce)", async ({ page }) => {
        await mockBase(page, {
          lots: MOCK_LOTS,
          roomsByLot: { [LOT_ID_1]: [], [LOT_ID_2]: [] },
        });
        await page.goto(`/vs/projects/${PROJECT_ID}/rooms`);

        await expect(
          page.getByRole("heading", { name: /identifiez les pièces/i })
        ).toBeVisible();

        await page.waitForTimeout(400);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `${vp.name}-default.png`),
          fullPage: true,
          animations: "disabled",
        });
      });

      test("rooms-detected (2 pièces IA dans lot 1)", async ({ page }) => {
        await mockBase(page, {
          lots: MOCK_LOTS,
          roomsByLot: {
            [LOT_ID_1]: MOCK_ROOMS_LOT1,
            [LOT_ID_2]: MOCK_ROOMS_LOT2,
          },
        });
        await page.goto(`/vs/projects/${PROJECT_ID}/rooms`);

        await expect(
          page.getByRole("heading", { name: /identifiez les pièces/i })
        ).toBeVisible();
        // Attendre qu'au moins une carte de pièce (RoomPanel) soit rendue
        await expect(
          page.getByRole("button", { name: /pièce \d+ : salon/i }).first()
        ).toBeVisible();

        await page.waitForTimeout(400);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `${vp.name}-rooms-detected.png`),
          fullPage: true,
          animations: "disabled",
        });
      });

      test("room-selected (pièce salon active)", async ({ page }) => {
        await mockBase(page, {
          lots: MOCK_LOTS,
          roomsByLot: {
            [LOT_ID_1]: MOCK_ROOMS_LOT1,
            [LOT_ID_2]: MOCK_ROOMS_LOT2,
          },
        });
        await page.goto(`/vs/projects/${PROJECT_ID}/rooms`);

        // Cibler la carte de pièce dans RoomPanel (aria-label exposé par le composant)
        const roomCard = page.getByRole("button", {
          name: /pièce \d+ : salon/i,
        });
        await expect(roomCard.first()).toBeVisible();
        await page.waitForTimeout(300);

        await roomCard.first().click();
        await page.waitForTimeout(300);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `${vp.name}-room-selected.png`),
          fullPage: true,
          animations: "disabled",
        });
      });

      test("lot-validated (lot 1 validé, lot 2 en attente)", async ({
        page,
      }) => {
        const lot1Validated = { ...MOCK_LOTS[0], status: "validated" as const };
        await mockBase(page, {
          lots: [lot1Validated, MOCK_LOTS[1]],
          roomsByLot: {
            [LOT_ID_1]: MOCK_ROOMS_LOT1,
            [LOT_ID_2]: MOCK_ROOMS_LOT2,
          },
        });
        await page.goto(`/vs/projects/${PROJECT_ID}/rooms`);

        await expect(
          page.getByRole("heading", { name: /identifiez les pièces/i })
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: /pièce \d+ : salon/i }).first()
        ).toBeVisible();

        await page.waitForTimeout(400);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `${vp.name}-lot-validated.png`),
          fullPage: true,
          animations: "disabled",
        });
      });

      test("validation-blocked (pièce sans surface — surbrillance rouge)", async ({
        page,
      }) => {
        await mockBase(page, {
          lots: MOCK_LOTS,
          roomsByLot: {
            [LOT_ID_1]: MOCK_ROOMS_LOT1_INVALID,
            [LOT_ID_2]: MOCK_ROOMS_LOT2,
          },
        });
        await page.goto(`/vs/projects/${PROJECT_ID}/rooms`);

        await expect(
          page.getByRole("button", { name: /pièce \d+ : salon/i }).first()
        ).toBeVisible();
        await page.waitForTimeout(300);

        // Tenter de valider le lot — déclenche le mode validationBlocked
        const validateButton = page
          .getByRole("button", { name: /valider/i })
          .first();
        if (await validateButton.isVisible().catch(() => false)) {
          await validateButton.click();
          await page.waitForTimeout(400);
        }

        await page.screenshot({
          path: path.join(
            SCREENSHOT_DIR,
            `${vp.name}-validation-blocked.png`
          ),
          fullPage: true,
          animations: "disabled",
        });
      });

      test("modal confirmation suppression pièce", async ({ page }) => {
        await mockBase(page, {
          lots: MOCK_LOTS,
          roomsByLot: {
            [LOT_ID_1]: MOCK_ROOMS_LOT1,
            [LOT_ID_2]: MOCK_ROOMS_LOT2,
          },
        });
        await page.goto(`/vs/projects/${PROJECT_ID}/rooms`);

        const roomCard = page.getByRole("button", {
          name: /pièce \d+ : salon/i,
        });
        await expect(roomCard.first()).toBeVisible();
        await page.waitForTimeout(300);

        // Sélectionner la pièce avant de cliquer sur supprimer
        await roomCard.first().click();
        await page.waitForTimeout(200);

        // Bouton supprimer ciblé par aria-label exposé dans RoomPanel.tsx
        const deleteBtn = page.getByRole("button", {
          name: /supprimer la pièce/i,
        });
        await deleteBtn.first().click();

        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeAttached();
        await page.waitForTimeout(300);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `${vp.name}-modal-delete.png`),
          fullPage: false,
          animations: "disabled",
        });
      });

      test("all-lots-validated (succès final, CTA continuer)", async ({
        page,
      }) => {
        await mockBase(page, {
          project: MOCK_PROJECT_STEP3,
          lots: MOCK_LOTS_BOTH_VALIDATED,
          roomsByLot: {
            [LOT_ID_1]: MOCK_ROOMS_LOT1,
            [LOT_ID_2]: MOCK_ROOMS_LOT2,
          },
        });
        await page.goto(`/vs/projects/${PROJECT_ID}/rooms`);

        await expect(
          page.getByRole("heading", { name: /identifiez les pièces/i })
        ).toBeVisible();

        // Attendre le message succès "Tous les lots sont validés"
        await expect(
          page.getByText(/tous les lots sont validés/i)
        ).toBeVisible({ timeout: 10_000 });

        await page.waitForTimeout(400);

        await page.screenshot({
          path: path.join(
            SCREENSHOT_DIR,
            `${vp.name}-all-lots-validated.png`
          ),
          fullPage: true,
          animations: "disabled",
        });
      });
    });
  }
});
