/**
 * s28 — Capture l'état BEFORE-fix (rooms vides, extraction_data null)
 * pour comparaison avec les screenshots after-fix.
 *
 * Crée par scripts/s28-create-before-state.ts. ID passé via env.
 */

import { test, expect } from "@playwright/test";

const PROJECT_ID = process.env.VS_E2E_PROJECT_ID;
if (!PROJECT_ID) throw new Error("VS_E2E_PROJECT_ID requis");
const BASE_URL = process.env.VS_E2E_BASE_URL || "http://127.0.0.1:5000";
const SCREENSHOT_DIR = "/home/user/Versi/versi-studio/tests/screenshots";

test.describe("s28 — Étape 3 (Pièces) BEFORE-fix snapshot", () => {
  test("RDC — état pré-fix (rooms vides, message hors-sujet)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/vs/projects/${PROJECT_ID}/rooms`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForSelector("h1", { timeout: 30_000 });
    await page.waitForFunction(
      () => document.querySelectorAll('[role="tab"]').length > 0,
      { timeout: 30_000 }
    );

    const lot0 = page.locator('[role="tab"]', { hasText: "Lot étage 0" });
    await lot0.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/s28-rooms-before-RDC.png`,
      fullPage: true,
    });
  });

  test("R+1 — état pré-fix", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/vs/projects/${PROJECT_ID}/rooms`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForSelector("h1", { timeout: 30_000 });
    await page.waitForFunction(
      () => document.querySelectorAll('[role="tab"]').length > 0,
      { timeout: 30_000 }
    );
    const lot1 = page.locator('[role="tab"]', { hasText: "Lot étage 1" });
    await lot1.click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/s28-rooms-before-R+1.png`,
      fullPage: true,
    });
  });

  test("R+2 — état pré-fix", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/vs/projects/${PROJECT_ID}/rooms`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForSelector("h1", { timeout: 30_000 });
    await page.waitForFunction(
      () => document.querySelectorAll('[role="tab"]').length > 0,
      { timeout: 30_000 }
    );
    const lot2 = page.locator('[role="tab"]', { hasText: "Lot étage 2" });
    await lot2.click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/s28-rooms-before-R+2.png`,
      fullPage: true,
    });
  });

  test("R+3 — état pré-fix", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/vs/projects/${PROJECT_ID}/rooms`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForSelector("h1", { timeout: 30_000 });
    await page.waitForFunction(
      () => document.querySelectorAll('[role="tab"]').length > 0,
      { timeout: 30_000 }
    );
    const lot3 = page.locator('[role="tab"]', { hasText: "Lot étage 3" });
    await lot3.click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/s28-rooms-before-R+3.png`,
      fullPage: true,
    });
    // Verdict avant fix : rooms vide + bouton régénération va échouer (extraction_data null)
    const roomCards = page.locator(
      'div.grid.grid-cols-1.md\\:grid-cols-2 > div[role="button"]'
    );
    const roomCount = await roomCards.count();
    console.log(`[BEFORE/R+3] pièces : ${roomCount}`);
    expect(roomCount).toBe(0);
  });
});
