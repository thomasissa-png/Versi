/**
 * Tests visuels — Page Lots (US-VS-03)
 *
 * Produit les baselines screenshots pour la gate G26 :
 *   3 devices (iPhone 13 375x812, iPad 768x1024, Desktop 1280x800)
 *   × 6 états UI (default-empty, lots-detected, lot-selected, lot-validated, modal-delete, error)
 *   = 18 PNG dans `tests/screenshots/lots/`
 *
 * APIs mockées via route interception Playwright (pattern aligné sur upload-visual.spec.ts).
 *
 * Stratégie :
 *   - Chaque test correspond à un état métier figé côté mock.
 *   - L'état "default-empty" = projet sans lots (analyse pas encore lancée).
 *   - L'état "lots-detected" = 2 lots IA suggérés visibles dans le panneau + canvas.
 *   - L'état "lot-selected" = lot 1 sélectionné (rectangle actif sur le canvas).
 *   - L'état "lot-validated" = lots après PATCH /lots/validate (status=validated).
 *   - L'état "modal-delete" = ConfirmModal "Supprimer ce lot ?" ouvert.
 *   - L'état "error" = GET /lots renvoie 500 → message d'erreur global affiché.
 *
 * IMPORTANT — Ordre de routes Playwright (learning versi-s13 P1 #2) :
 *   `page.route()` applique la DERNIÈRE route enregistrée qui matche.
 *   Donc enregistrer le wildcard d'abord, puis la route spécifique APRÈS.
 *
 * Exécution locale :
 *   npx playwright test lots-visual --update-snapshots
 */

import { test, expect, type Page, type Route } from "@playwright/test";
import path from "node:path";
import {
  PROJECT_ID,
  LOT_ID_1,
  MOCK_PROJECT_STEP1,
  MOCK_PROJECT_STEP2,
  MOCK_PLANS,
  MOCK_LOTS,
  MOCK_LOTS_VALIDATED,
} from "./fixtures";

// ─── Constantes ──────────────────────────────────────────────────

const SCREENSHOT_DIR = path.join(__dirname, "..", "screenshots", "lots");

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Mock de base : project, plans, lots. Les tests individuels passent leur
 * dataset de lots (vide, suggérés, validés) et un éventuel statut d'erreur.
 */
async function mockBase(
  page: Page,
  {
    lots = [] as unknown[],
    project = MOCK_PROJECT_STEP1,
    plans = MOCK_PLANS,
    lotsStatus = 200,
  }: {
    lots?: unknown[];
    project?: unknown;
    plans?: unknown[];
    lotsStatus?: number;
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

  // GET project
  await page.route(`**/api/vs/projects/${PROJECT_ID}`, async (route: Route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: project }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: project }),
      });
    }
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

  // GET/POST lots
  await page.route(
    `**/api/vs/projects/${PROJECT_ID}/lots`,
    async (route: Route) => {
      const method = route.request().method();
      if (method === "GET") {
        if (lotsStatus >= 400) {
          // Pattern API Versi Studio : status 200 + body {success: false, error}
          // L'app lit `json.success` pour brancher l'état d'erreur (pas le status HTTP).
          // Cf. /api/vs/projects/[id]/lots/route.ts.
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: false,
              error:
                "Impossible de charger les lots — réessayez dans quelques instants.",
            }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: lots }),
        });
        return;
      }
      // POST = ajout manuel d'un lot
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            ...MOCK_LOTS[0],
            id: `lot-${Date.now()}`,
            name: "Nouveau lot",
            status: "manual",
          },
        }),
      });
    }
  );

  // PATCH/DELETE individual lot
  await page.route("**/api/vs/lots/*", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { updated: true } }),
    });
  });

  // POST validate lots
  await page.route(
    `**/api/vs/projects/${PROJECT_ID}/lots/validate`,
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { validated_count: 2 },
        }),
      });
    }
  );
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

test.describe("Lots — baselines visuelles", () => {
  test.setTimeout(45_000);

  for (const vp of VIEWPORTS) {
    test.describe(`viewport ${vp.name} (${vp.width}x${vp.height})`, () => {
      test.use({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      });

      test("default (aucun lot — étape 1 complétée)", async ({ page }) => {
        await mockBase(page, { lots: [] });
        await page.goto(`/vs/projects/${PROJECT_ID}/lots`);

        await expect(
          page.getByRole("heading", { name: /découpez vos lots/i })
        ).toBeVisible();

        // Pause pour laisser le canvas se stabiliser
        await page.waitForTimeout(400);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `${vp.name}-default.png`),
          fullPage: true,
          animations: "disabled",
        });
      });

      test("lots-detected (2 lots IA suggérés)", async ({ page }) => {
        await mockBase(page, { lots: MOCK_LOTS });
        await page.goto(`/vs/projects/${PROJECT_ID}/lots`);

        await expect(
          page.getByRole("heading", { name: /découpez vos lots/i })
        ).toBeVisible();

        // Attendre que le panneau latéral affiche les 2 lots
        await expect(page.getByText(/lot 1/i).first()).toBeVisible();
        await expect(page.getByText(/lot 2/i).first()).toBeVisible();

        await page.waitForTimeout(400);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `${vp.name}-lots-detected.png`),
          fullPage: true,
          animations: "disabled",
        });
      });

      test("lot-selected (lot 1 actif)", async ({ page }) => {
        await mockBase(page, { lots: MOCK_LOTS });
        await page.goto(`/vs/projects/${PROJECT_ID}/lots`);

        // Attendre le rendu initial
        await expect(page.getByText(/lot 1/i).first()).toBeVisible();
        await page.waitForTimeout(300);

        // Cliquer sur le lot 1 dans le panneau latéral
        await page.getByText(/lot 1/i).first().click();
        await page.waitForTimeout(300);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `${vp.name}-lot-selected.png`),
          fullPage: true,
          animations: "disabled",
        });
      });

      test("lot-validated (status=validated, projet step_2_complete)", async ({
        page,
      }) => {
        await mockBase(page, {
          lots: MOCK_LOTS_VALIDATED,
          project: MOCK_PROJECT_STEP2,
        });
        await page.goto(`/vs/projects/${PROJECT_ID}/lots`);

        await expect(
          page.getByRole("heading", { name: /découpez vos lots/i })
        ).toBeVisible();
        await expect(page.getByText(/lot 1/i).first()).toBeVisible();

        await page.waitForTimeout(400);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `${vp.name}-lot-validated.png`),
          fullPage: true,
          animations: "disabled",
        });
      });

      test("modal confirmation suppression", async ({ page }) => {
        await mockBase(page, { lots: MOCK_LOTS });
        await page.goto(`/vs/projects/${PROJECT_ID}/lots`);

        await expect(page.getByText(/lot 1/i).first()).toBeVisible();
        await page.waitForTimeout(300);

        // Le bouton supprimer dans LotPanel — fallback sur title/aria-label
        const deleteButtons = page.getByRole("button", {
          name: /supprimer/i,
        });
        await deleteButtons.first().click();

        // Attendre que le modal soit attaché
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeAttached();
        await page.waitForTimeout(300);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `${vp.name}-modal-delete.png`),
          fullPage: false, // Modal : on veut le viewport avec overlay
          animations: "disabled",
        });
      });

      test("error (GET /lots échoue — fallback opération introuvable)", async ({
        page,
      }) => {
        // Quand un fetch initial échoue côté API (success: false), la page
        // courante retourne tôt sans set `project` → rend l'écran fallback
        // "Opération introuvable" avec CTA "Retour aux opérations".
        // C'est l'état d'erreur RÉEL produit par l'app pour cette page.
        await mockBase(page, { lots: [], lotsStatus: 500 });
        await page.goto(`/vs/projects/${PROJECT_ID}/lots`);

        await expect(page.getByText(/opération introuvable/i)).toBeVisible({
          timeout: 10_000,
        });

        await page.waitForTimeout(300);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `${vp.name}-error.png`),
          fullPage: true,
          animations: "disabled",
        });
      });
    });
  }
});
