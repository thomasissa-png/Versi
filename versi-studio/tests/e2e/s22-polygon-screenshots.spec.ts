/**
 * S22 — Screenshots polygon rendering + Option C UI
 *
 * Captures des 4 états visuels pour le rapport :
 * 1. Polygones IA semi-transparents (vue complète Step 3)
 * 2. Sidebar avec indicateurs "IA" (pastilles jaunes)
 * 3. Après confirmation d'une pièce (opacity 1, pastille verte)
 * 4. Bouton "Valider ce lot" désactivé tant que pièces non confirmées
 */

import { test, expect } from "@playwright/test";

const PROJECT_ID = "63ad6de2-9df8-4acd-b4df-5e1889c03a18";
const ROOMS_URL = `/vs/projects/${PROJECT_ID}/rooms`;
const SCREENSHOT_DIR = "/home/user/Versi/docs/screenshots/s22";

test.describe("S22 — Polygones + Option C", () => {
  test("1. Vue complète polygones IA semi-transparents", async ({ page }) => {
    await page.goto(ROOMS_URL);
    // Attendre que le canvas soit rendu et les rooms chargées
    await page.waitForSelector("canvas", { timeout: 15_000 });
    // Attendre un peu pour que l'image du plan se charge
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/etape3-polygons-rendered.png`,
      fullPage: false,
    });
  });

  test("2. Sidebar avec indicateurs IA en attente", async ({ page }) => {
    await page.goto(ROOMS_URL);
    await page.waitForSelector("canvas", { timeout: 15_000 });
    await page.waitForTimeout(2000);
    // Capturer le panel latéral (aside droite)
    const panel = page.locator("aside").last();
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await panel.screenshot({
      path: `${SCREENSHOT_DIR}/etape3-sidebar-ia-pending.png`,
    });
  });

  test("3. Après confirmation d'une pièce — rendu opaque", async ({ page }) => {
    await page.goto(ROOMS_URL);
    await page.waitForSelector("canvas", { timeout: 15_000 });
    await page.waitForTimeout(2000);
    // Cliquer sur le premier bouton "Confirmer" dans le sidebar
    const confirmBtn = page.locator("button", { hasText: "Confirmer" }).first();
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
      await page.waitForTimeout(1500);
    }
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/etape3-room-touched.png`,
      fullPage: false,
    });
  });

  test("4. Bouton Valider désactivé — pièces non confirmées", async ({ page }) => {
    await page.goto(ROOMS_URL);
    await page.waitForSelector("canvas", { timeout: 15_000 });
    await page.waitForTimeout(2000);
    // Chercher le bouton "Valider ce lot" et vérifier qu'il est disabled
    const validateBtn = page.locator("button", { hasText: "Valider ce lot" });
    if (await validateBtn.isVisible()) {
      await expect(validateBtn).toBeDisabled();
    }
    // Capturer le bas du panel avec le bouton + le message d'avertissement
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/etape3-valider-disabled.png`,
      fullPage: false,
    });
  });
});
