/**
 * Test screenshot — Validation visuelle Étape 4 v2 wizard s32.
 *
 * Refonte s32 (commit refonte wizard) : l'écran multi-pièces a été remplacé
 * par un wizard guidé pièce-par-pièce. Le screenshot capture la première
 * étape du wizard avec :
 *   - Header "Pièce 1 / N" + barre progression
 *   - RoomZoomCanvas zoomé sur le polygone de la 1re pièce (overlay
 *     atténuant les zones hors polygone)
 *   - Liste pastilles (vide au démarrage) + hint "Cliquez sur le plan..."
 *   - RoomStylePicker (12 styles en grille)
 *   - Footer Précédent désactivé / Pièce suivante désactivée (pas encore
 *     de photo + style)
 *
 * Output : test-results/placement-redesign-{desktop,mobile}.png
 */

import { test, expect, devices } from "@playwright/test";
import { setupVisualsStepV2, REALISTIC_PHOTOS } from "./helpers/setupProject";
import { blockExternalOpenAI } from "./helpers/mockOpenAI";
import { PROJECT_ID } from "./fixtures";

const PLACEMENT_URL = `/vs/projects/${PROJECT_ID}/visuals/placement`;

test.describe("s32 — Screenshots wizard refonte Étape 4", () => {
  test("desktop 1280x800 — wizard step 1 full page", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: "fr-FR",
    });
    const page = await context.newPage();

    await blockExternalOpenAI(page);
    await setupVisualsStepV2(page, { photos: REALISTIC_PHOTOS });

    await page.goto(PLACEMENT_URL);

    // Attendre le wizard et le canvas zoomé.
    await expect(page.getByTestId("visual-wizard")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("visual-wizard-room-step")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("room-zoom-canvas")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("room-style-picker")).toBeVisible();

    // Stabilisation réseau + chargement async PNG synthétique (fetch image
    // dans RoomZoomCanvas → setImageNaturalSize → recalcul viewport → redraw).
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
    await setupVisualsStepV2(page, { photos: REALISTIC_PHOTOS });

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
