/**
 * Test screenshot — Validation visuelle Étape 4 v2 refonte s32.
 *
 * Mission Thomas : « montre-moi visuellement le résultat ».
 * Produit 2 PNG full-page (desktop 1280x800 + mobile 390x844) du nouvel écran
 * placement avec :
 *   - Canvas plan en haut (s32 BUG 1 : polygones contenus dans lot via
 *     computeRenderLayout + lotLocal↔planGlobal pattern étape 3)
 *   - Grille de cartes pièces dessous (s32 BUG 3 : layout étapes 2/3)
 *   - Bouton "+ Ajouter des photos" sur chaque carte (s32 BUG 4)
 *   - PAS de CostEstimator (s32 BUG 2 : retiré du DOM)
 *
 * Output : test-results/placement-redesign-{desktop,mobile}.png
 */

import { test, expect, devices } from "@playwright/test";
import { setupVisualsStepV2, DEFAULT_PHOTO_PLACED } from "./helpers/setupProject";
import { blockExternalOpenAI } from "./helpers/mockOpenAI";
import { PROJECT_ID } from "./fixtures";

const PLACEMENT_URL = `/vs/projects/${PROJECT_ID}/visuals/placement`;

test.describe("s32 — Screenshots refonte placement (validation visuelle Thomas)", () => {
  test("desktop 1280x800 — full page screenshot", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: "fr-FR",
    });
    const page = await context.newPage();

    await blockExternalOpenAI(page);
    await setupVisualsStepV2(page, { photos: [DEFAULT_PHOTO_PLACED] });

    await page.goto(PLACEMENT_URL);

    // Attendre le canvas plan + au moins une carte pièce.
    await expect(page.getByTestId("visual-plan-canvas")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("visual-placement-view")).toBeVisible();
    // Première carte pièce visible (au moins 1 doit être rendue).
    const firstCard = page.locator('[data-testid^="room-placement-card-"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });

    // Petit délai pour que les images du plan + transitions CSS finissent.
    await page.waitForTimeout(800);

    // s32 — la refonte met le contenu dans un container avec overflow-y-auto
    // (vs-placement-view). Un screenshot fullPage classique ne capture que ce
    // qui est visible dans le viewport, pas le contenu scrollable interne.
    // On expand le container temporairement pour capturer tout le rendu.
    await page.evaluate(() => {
      const view = document.querySelector('[data-testid="visual-placement-view"]') as HTMLElement | null;
      if (view) {
        view.style.height = "auto";
        view.style.overflow = "visible";
      }
      // Le wrapper parent peut aussi clipper.
      let parent = view?.parentElement;
      while (parent && parent !== document.body) {
        parent.style.overflow = "visible";
        parent.style.height = "auto";
        parent = parent.parentElement;
      }
    });
    await page.waitForTimeout(300);

    await page.screenshot({
      path: "test-results/placement-redesign-desktop.png",
      fullPage: true,
    });

    await context.close();
  });

  test("mobile iPhone 14 (390x844) — full page screenshot", async ({ browser }) => {
    const iphone = devices["iPhone 14"] ?? devices["iPhone 13"];
    const context = await browser.newContext({
      ...iphone,
      viewport: { width: 390, height: 844 },
      locale: "fr-FR",
    });
    const page = await context.newPage();

    await blockExternalOpenAI(page);
    await setupVisualsStepV2(page, { photos: [DEFAULT_PHOTO_PLACED] });

    await page.goto(PLACEMENT_URL);

    await expect(page.getByTestId("visual-plan-canvas")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("visual-placement-view")).toBeVisible();
    const firstCard = page.locator('[data-testid^="room-placement-card-"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });

    await page.waitForTimeout(800);

    // s32 — expand container scrollable pour capturer tout le contenu.
    await page.evaluate(() => {
      const view = document.querySelector('[data-testid="visual-placement-view"]') as HTMLElement | null;
      if (view) {
        view.style.height = "auto";
        view.style.overflow = "visible";
      }
      let parent = view?.parentElement;
      while (parent && parent !== document.body) {
        parent.style.overflow = "visible";
        parent.style.height = "auto";
        parent = parent.parentElement;
      }
    });
    await page.waitForTimeout(300);

    await page.screenshot({
      path: "test-results/placement-redesign-mobile.png",
      fullPage: true,
    });

    await context.close();
  });
});
