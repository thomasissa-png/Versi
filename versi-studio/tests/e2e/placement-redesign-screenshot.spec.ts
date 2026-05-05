/**
 * Test screenshot — Validation visuelle Étape 4 v2 refonte s32 (réalité Thomas).
 *
 * Mission Thomas : « montre-moi visuellement le résultat ».
 *
 * Itération 2 (s32) : remplacement de DEFAULT_PHOTO_PLACED (1 photo, fixture
 * pauvre) par REALISTIC_PHOTOS (5 photos : 4 placées avec angles 0/45/180/270
 * sur Salon/Chambre/SDB + 1 non-placée). Le PNG synthetic-plan.png remplace
 * le 1×1 transparent. Polygones VsRoom corrigés ({x_percent, y_percent}).
 *
 * Le screenshot montre maintenant :
 *   - Plan synthétique 800x500 visible (Salon, Chambre, SDB lisibles)
 *   - 3 polygones overlay teintés (vert=1 photo, bleu=2 photos, gris=vide)
 *     contenus dans le cadre du lot (s32 BUG 1 — pattern lot-local→plan-global)
 *   - 4 pastilles photos placées + flèches d'angle directionnelles
 *   - Cartes pièces avec compteur photos placées (BUG 3 + BUG 4)
 *   - PAS de CostEstimator (BUG 2)
 *
 * Output : test-results/placement-redesign-{desktop,mobile}.png
 */

import { test, expect, devices } from "@playwright/test";
import { setupVisualsStepV2, REALISTIC_PHOTOS } from "./helpers/setupProject";
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
    await setupVisualsStepV2(page, { photos: REALISTIC_PHOTOS });

    await page.goto(PLACEMENT_URL);

    // Attendre le canvas plan + au moins une carte pièce.
    await expect(page.getByTestId("visual-plan-canvas")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("visual-placement-view")).toBeVisible();
    // Première carte pièce visible (au moins 1 doit être rendue).
    const firstCard = page.locator('[data-testid^="room-placement-card-"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });

    // Attendre stabilisation réseau + chargement async du PNG plan synthétique
    // (fetch image dans VisualPlanCanvas, puis useEffect → setImageNaturalSize
    // → re-draw canvas avec polygones + photos + angles).
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // Post-fix scroll body (commit 213dd88) : capture naturelle full-page,
    // sans manip artificielle. Ce screenshot reflète exactement ce que
    // Thomas verra en prod.
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
    await setupVisualsStepV2(page, { photos: REALISTIC_PHOTOS });

    await page.goto(PLACEMENT_URL);

    await expect(page.getByTestId("visual-plan-canvas")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("visual-placement-view")).toBeVisible();
    const firstCard = page.locator('[data-testid^="room-placement-card-"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });

    // Attendre stabilisation réseau + chargement async du PNG plan synthétique
    // (fetch image dans VisualPlanCanvas, puis useEffect → setImageNaturalSize
    // → re-draw canvas avec polygones + photos + angles).
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // Post-fix scroll body (commit 213dd88) : capture naturelle full-page,
    // sans manip artificielle.
    await page.screenshot({
      path: "test-results/placement-redesign-mobile.png",
      fullPage: true,
    });

    await context.close();
  });
});
