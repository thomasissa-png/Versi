/**
 * s28 — Screenshots Étape 3 AVEC plan PDF visible en background
 *
 * Différences vs s28-rooms-fix.spec.ts :
 *  - waitUntil="networkidle" pour que /api/vs/files (PDF→PNG, 1-3s) finisse
 *  - timeouts généreux (60s) pour turbopack en mode dev
 *  - attente explicite que le plan PDF soit chargé dans le canvas
 *    (le RoomCanvas appelle new Image().src = "/api/vs/files?path=..."
 *    et il faut laisser le temps au pdf-to-img + drawImage de finir)
 *
 * Usage : VS_E2E_PROJECT_ID=xxx pnpm playwright test tests/e2e/s28-rooms-with-plan-bg.spec.ts
 */

import { test, expect } from "@playwright/test";

const PROJECT_ID = process.env.VS_E2E_PROJECT_ID;
if (!PROJECT_ID) {
  throw new Error(
    "VS_E2E_PROJECT_ID env var requis (lance scripts/s28-rooms-with-plan-bg.ts d'abord)"
  );
}

const BASE_URL = process.env.VS_E2E_BASE_URL || "http://127.0.0.1:5000";
const SCREENSHOT_DIR = "/home/user/Versi/versi-studio/tests/screenshots";

// Test timeout global 90s (turbopack + pdf-to-img)
test.setTimeout(90_000);

async function gotoRoomsAndWait(page: import("@playwright/test").Page) {
  await page.setViewportSize({ width: 1440, height: 900 });

  // Bloquer les requêtes externes (fontshare cert invalid → bloque networkidle)
  await page.route("**/api.fontshare.com/**", (route) => route.abort());

  await page.goto(`${BASE_URL}/vs/projects/${PROJECT_ID}/rooms`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  // Attendre que les tabs lots soient présents (post-fetchData)
  await page.waitForFunction(
    () => document.querySelectorAll('[role="tab"]').length > 0,
    { timeout: 30_000 }
  );

  // Attendre que le canvas soit présent
  await page.waitForSelector("canvas", { timeout: 15_000 });

  // Attendre que l'image du plan PDF soit chargée et drawImage exécuté.
  // Le RoomCanvas appelle new Image() puis draw — pas d'événement DOM,
  // donc marge de 4s (PDF→PNG ~1-2s + draw + render).
  await page.waitForTimeout(4000);
}

test.describe("s28 — Étape 3 (Pièces) AVEC plan PDF en background", () => {
  test("RDC — plan PDF + polygones pièces visibles", async ({ page }) => {
    await gotoRoomsAndWait(page);

    const lot0 = page.locator('[role="tab"]', { hasText: "Lot étage 0" });
    await lot0.click();
    await page.waitForTimeout(1500);

    // Vérifier qu'au moins 1 pièce est affichée dans la liste cards
    const roomCards = page.locator(
      'div.grid.grid-cols-1.md\\:grid-cols-2 > div[role="button"]'
    );
    const roomCount = await roomCards.count();
    console.log(`[RDC] pièces affichées : ${roomCount}`);
    expect(roomCount).toBeGreaterThan(0);

    // Bouton régénérer présent
    const regenBtn = page.getByRole("button", {
      name: /Régénérer les pièces/,
    });
    await expect(regenBtn).toBeVisible();

    // Pas de message "Tous les lots sont validés" prématuré
    const successMsg = page.getByText(
      /Tous les lots sont validés.*générer les visuels/
    );
    await expect(successMsg).not.toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/s28-rooms-after-RDC.png`,
      fullPage: true,
    });
  });

  test("R+1 — plan PDF + polygones pièces visibles", async ({ page }) => {
    await gotoRoomsAndWait(page);

    const lot1 = page.locator('[role="tab"]', { hasText: "Lot étage 1" });
    await lot1.click();
    await page.waitForTimeout(1500);

    const roomCards = page.locator(
      'div.grid.grid-cols-1.md\\:grid-cols-2 > div[role="button"]'
    );
    const roomCount = await roomCards.count();
    console.log(`[R+1] pièces affichées : ${roomCount}`);
    expect(roomCount).toBeGreaterThanOrEqual(3);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/s28-rooms-after-R+1.png`,
      fullPage: true,
    });
  });

  test("R+2 — plan PDF + polygones pièces visibles", async ({ page }) => {
    await gotoRoomsAndWait(page);

    const lot2 = page.locator('[role="tab"]', { hasText: "Lot étage 2" });
    await lot2.click();
    await page.waitForTimeout(1500);

    const roomCards = page.locator(
      'div.grid.grid-cols-1.md\\:grid-cols-2 > div[role="button"]'
    );
    const roomCount = await roomCards.count();
    console.log(`[R+2] pièces affichées : ${roomCount}`);
    expect(roomCount).toBeGreaterThanOrEqual(3);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/s28-rooms-after-R+2.png`,
      fullPage: true,
    });
  });

  test("R+3 — plan PDF + polygones pièces visibles", async ({ page }) => {
    await gotoRoomsAndWait(page);

    const lot3 = page.locator('[role="tab"]', { hasText: "Lot étage 3" });
    await lot3.click();
    await page.waitForTimeout(1500);

    const roomCards = page.locator(
      'div.grid.grid-cols-1.md\\:grid-cols-2 > div[role="button"]'
    );
    const roomCount = await roomCards.count();
    console.log(`[R+3] pièces affichées : ${roomCount}`);
    expect(roomCount).toBeGreaterThanOrEqual(3);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/s28-rooms-after-R+3.png`,
      fullPage: true,
    });
  });

  test("régénération — toast cohérent (pas message hors-sujet)", async ({
    page,
  }) => {
    await gotoRoomsAndWait(page);

    const lot0 = page.locator('[role="tab"]', { hasText: "Lot étage 0" });
    await lot0.click();
    await page.waitForTimeout(1500);

    const regenBtn = page.getByRole("button", {
      name: /Régénérer les pièces/,
    });
    await regenBtn.click();

    const regenToast = page.getByText(/pièces? régénérée?s? par l'IA/);
    await expect(regenToast).toBeVisible({ timeout: 30_000 });

    const successMsg = page.getByText(
      /Tous les lots sont validés.*générer les visuels/
    );
    await expect(successMsg).not.toBeVisible();

    // Attendre que le canvas re-render avec le PDF en background
    // (après régénération, fetchData → setLoading(true) → reload PDF + draw)
    await page.waitForTimeout(4000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/s28-rooms-regen-toast.png`,
      fullPage: true,
    });
  });
});
