/**
 * Tests visuels — Page Upload (US-VS-02)
 *
 * Produit les baselines screenshots pour la gate G26 :
 *   3 devices (iPhone 13 375x812, iPad 768x1024, Desktop 1280x800)
 *   × 4-5 états UI (defaut, uploading, succès, erreur, [modal confirmation])
 *   = 12 à 15 PNG à plat dans `tests/screenshots/` (convention slash → hyphen,
 *     cf. snapshotPathTemplate dans playwright.config.ts)
 *
 * APIs mockées via route interception Playwright.
 *
 * Stratégie :
 *   - Chaque test correspond à un état métier figé côté mock.
 *   - L'état "uploading" est simulé en retardant artificiellement la route POST /plans.
 *   - L'état "erreur" est simulé en renvoyant 500 sur /plans pendant un upload.
 *   - L'état "modal" est simulé en cliquant sur le bouton supprimer d'une tuile.
 *
 * Exécution locale :
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
 *   npx playwright test upload-visual --project="Desktop Chrome" --project="iPhone 13" --project="iPad"
 */

import { test, expect, type Page, type Route } from "@playwright/test";
import {
  PROJECT_ID,
  MOCK_PROJECT,
  MOCK_PLANS,
} from "./fixtures";

// ─── Constantes ──────────────────────────────────────────────────

// Baselines visuelles : `tests/screenshots/upload-<viewport>-<state>.png`
// (baselines à plat, convention slash → hyphen ; résolution Playwright via
// `snapshotPathTemplate: "tests/screenshots/{arg}{ext}"` dans playwright.config.ts)

// 3 plans mockés pour l'état "succès" (suffisant pour afficher la grille)
const MOCK_PLANS_3 = [
  { ...MOCK_PLANS[0], id: "plan-success-1", floor_number: 0, original_filename: "plan_rdc.pdf" },
  { ...MOCK_PLANS[1], id: "plan-success-2", floor_number: 1, original_filename: "plan_r1.pdf" },
  { ...MOCK_PLANS[0], id: "plan-success-3", floor_number: 2, original_filename: "plan_r2.pdf" },
];

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Mock de base : project + plans vides. Les tests individuels surchargent
 * les routes spécifiques à leur état.
 */
async function mockBase(
  page: Page,
  {
    plans = [] as unknown[],
    project = MOCK_PROJECT,
    uploadDelay = 0,
    uploadStatus = 201,
  }: {
    plans?: unknown[];
    project?: unknown;
    uploadDelay?: number;
    uploadStatus?: number;
  } = {}
) {
  // GET project
  await page.route(`**/api/vs/projects/${PROJECT_ID}`, async (route: Route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: project }),
      });
    } else if (route.request().method() === "PATCH") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: project }),
      });
    } else {
      await route.continue();
    }
  });

  // GET/POST plans
  await page.route(`**/api/vs/projects/${PROJECT_ID}/plans`, async (route: Route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: plans }),
      });
      return;
    }
    if (route.request().method() === "POST") {
      if (uploadDelay > 0) {
        // Freeze la requête suffisamment longtemps pour capturer l'état "uploading"
        await new Promise((r) => setTimeout(r, uploadDelay));
      }
      if (uploadStatus >= 400) {
        await route.fulfill({
          status: uploadStatus,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: "Le serveur n'a pas pu traiter le fichier — réessayez dans quelques instants.",
          }),
        });
        return;
      }
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            ...MOCK_PLANS[0],
            id: `plan-${Date.now()}-${Math.random()}`,
            original_filename: "uploaded.pdf",
          },
        }),
      });
      return;
    }
    await route.continue();
  });

  // PATCH/DELETE individual plan
  await page.route("**/api/vs/plans/*", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { deleted: true } }),
    });
  });

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
}

/**
 * Sélectionne des fichiers factices directement via l'input file caché
 * de la DropZone. Contourne le filechooser natif (plus fiable en CI).
 */
async function dropFakeFiles(page: Page, count: number) {
  const files = Array.from({ length: count }, (_, i) => ({
    name: `plan_${i + 1}.pdf`,
    mimeType: "application/pdf",
    buffer: Buffer.from(`%PDF-1.4 fake ${i}`, "utf-8"),
  }));
  // Le <input type="file"> est masqué (class="hidden"), mais Playwright peut
  // lui injecter des fichiers directement via son locator.
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(files);
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

test.describe("Upload — baselines visuelles", () => {
  test.setTimeout(45_000);

  for (const vp of VIEWPORTS) {
    test.describe(`viewport ${vp.name} (${vp.width}x${vp.height})`, () => {
      test.use({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      });

      test("default (dropzone vide)", async ({ page }) => {
        await mockBase(page, { plans: [] });
        await page.goto(`/vs/projects/${PROJECT_ID}/upload`);

        await expect(page.getByRole("heading", { name: /déposez vos plans/i })).toBeVisible();
        // La dropzone est rendue (texte caractéristique)
        await expect(page.getByText(/glissez.*plans|formats acceptés/i).first()).toBeVisible();

        await expect(page).toHaveScreenshot(`upload-${vp.name}-default.png`, {
          fullPage: true,
          animations: "disabled",
          maxDiffPixelRatio: 0.005,
        });
      });

      test("success (3 plans déposés)", async ({ page }) => {
        await mockBase(page, { plans: MOCK_PLANS_3 });
        await page.goto(`/vs/projects/${PROJECT_ID}/upload`);

        await expect(page.getByText(/3 plans déposés/i)).toBeVisible();
        await expect(page.getByRole("button", { name: /lancer l'analyse/i })).toBeVisible();

        await expect(page).toHaveScreenshot(`upload-${vp.name}-success.png`, {
          fullPage: true,
          animations: "disabled",
          maxDiffPixelRatio: 0.005,
        });
      });

      test("error (toast rouge + tuile réessayer)", async ({ page }) => {
        // Upload échoué : POST /plans répond 500 → tuile "Réessayer" affichée
        await mockBase(page, { plans: [], uploadStatus: 500 });
        await page.goto(`/vs/projects/${PROJECT_ID}/upload`);

        await dropFakeFiles(page, 1);

        // Attendre qu'une tuile d'erreur "Réessayer" soit visible
        await expect(
          page.getByRole("button", { name: /réessayer/i }).first()
        ).toBeVisible({ timeout: 15_000 });

        await expect(page).toHaveScreenshot(`upload-${vp.name}-error.png`, {
          fullPage: true,
          animations: "disabled",
          maxDiffPixelRatio: 0.005,
        });
      });

      test("uploading (progression parallèle 3 fichiers)", async ({ page }) => {
        // Upload retardé de 8s → capture l'état "Dépôt en cours…" stable
        await mockBase(page, { plans: [], uploadDelay: 8000 });
        await page.goto(`/vs/projects/${PROJECT_ID}/upload`);

        await dropFakeFiles(page, 3);

        // Attendre qu'au moins un spinner "Dépôt de … en cours" soit visible
        await expect(page.getByText(/dépôt de .* en cours/i).first()).toBeVisible({
          timeout: 5_000,
        });

        // Pause courte pour laisser le layout se stabiliser
        await page.waitForTimeout(400);

        await expect(page).toHaveScreenshot(`upload-${vp.name}-uploading.png`, {
          fullPage: true,
          animations: "disabled",
          maxDiffPixelRatio: 0.005,
        });
      });

      test("modal confirmation suppression", async ({ page }) => {
        await mockBase(page, { plans: MOCK_PLANS_3 });
        await page.goto(`/vs/projects/${PROJECT_ID}/upload`);

        // Attendre que les tuiles soient rendues
        await expect(page.getByText(/3 plans déposés/i)).toBeVisible();

        // Cliquer sur le premier bouton "Supprimer" (tuile, pas modal)
        const deleteButtons = page.getByRole("button", { name: /^supprimer\s/i });
        await deleteButtons.first().click();

        // Attendre que le modal dialog soit rendu (role=dialog + aria-modal)
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeAttached();
        // Laisser le focus-trap se stabiliser
        await page.waitForTimeout(300);

        await expect(page).toHaveScreenshot(`upload-${vp.name}-modal-delete.png`, {
          fullPage: false, // Modal : on veut le viewport avec overlay
          animations: "disabled",
          maxDiffPixelRatio: 0.005,
        });
      });
    });
  }
});
