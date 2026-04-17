/**
 * Screenshots de validation — Session s22
 * Navigation stepper + comparateur avant/après
 */
import { test, expect } from "@playwright/test";

const PROJECT_ID = "63ad6de2-9df8-4acd-b4df-5e1889c03a18";
const BASE_URL = "http://localhost:5000";
const SCREENSHOT_DIR = "/home/user/Versi/docs/screenshots/s22";

test("stepper lots page — completedSteps dynamique", async ({ page }) => {
  await page.goto(`${BASE_URL}/vs/projects/${PROJECT_ID}/lots`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  // Attendre que le stepper soit rendu
  await page.waitForSelector('nav[aria-label="Étapes du projet"]', {
    timeout: 10000,
  });

  const stepperNav = page.locator('nav[aria-label="Étapes du projet"]');
  await expect(stepperNav).toBeVisible();

  await page.screenshot({
    path: `${SCREENSHOT_DIR}/navigation-stepper-clickable.png`,
    fullPage: false,
  });
});

test("visuals page — comparateur avant/après desktop", async ({ page }) => {
  await page.goto(`${BASE_URL}/vs/projects/${PROJECT_ID}/visuals`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  await page.waitForSelector("h1", { timeout: 10000 });

  // Cliquer sur une pièce qui a un visuel pour voir le comparateur
  const chambreButton = page
    .locator("button")
    .filter({ hasText: /Chambre/i })
    .first();
  if (await chambreButton.isVisible()) {
    await chambreButton.click();
    await page.waitForTimeout(3000);
  }

  await page.screenshot({
    path: `${SCREENSHOT_DIR}/etape4-comparateur-avant-apres.png`,
    fullPage: true,
  });
});

test("visuals page — comparateur mobile 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });

  await page.goto(`${BASE_URL}/vs/projects/${PROJECT_ID}/visuals`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  await page.waitForSelector("h1", { timeout: 10000 });

  // Cliquer sur une pièce qui a un visuel
  const chambreButton = page
    .locator("button")
    .filter({ hasText: /Chambre/i })
    .first();
  if (await chambreButton.isVisible()) {
    await chambreButton.click();
    await page.waitForTimeout(3000);
  }

  await page.screenshot({
    path: `${SCREENSHOT_DIR}/etape4-comparateur-mobile.png`,
    fullPage: true,
  });
});
