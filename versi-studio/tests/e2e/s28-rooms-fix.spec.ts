/* eslint-disable @typescript-eslint/no-unused-vars */
// FIXME(s34): constantes/imports de test gardés pour debug local — à nettoyer si vraiment inutiles.
/**
 * s28 — Screenshots reality check pour les fixes Étape 3 (Pièces)
 *
 * Capture l'UI Étape 3 sur les 4 plans Pr2 (RDC, R+1, R+2, R+3) après
 * extraction réussie pour prouver que :
 *  - Bug 1 : pièces affichées (cards par lot)
 *  - Bug 2 : message "Tous les lots sont validés" ne s'affiche PAS prématurément
 *
 * Usage : pnpm playwright test tests/e2e/s28-rooms-fix.spec.ts
 *
 * Prérequis : projet test créé via scripts/s28-rooms-bugs-e2e.ts.
 * Le PROJECT_ID est passé via VS_E2E_PROJECT_ID env var.
 */

import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const PROJECT_ID = process.env.VS_E2E_PROJECT_ID;
if (!PROJECT_ID) {
  throw new Error(
    "VS_E2E_PROJECT_ID env var requis (créez un projet via scripts/s28-rooms-bugs-e2e.ts)"
  );
}

const BASE_URL = process.env.VS_E2E_BASE_URL || "http://127.0.0.1:5000";
const SCREENSHOT_DIR = "../../tests/screenshots";

test.describe("s28 — Étape 3 (Pièces) reality check", () => {
  test("RDC — pièces affichées + bouton régénération + pas de message hors-sujet", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/vs/projects/${PROJECT_ID}/rooms`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    // Attendre que les lots soient chargés (tabs ou heading "Identifiez les pièces")
    await page.waitForSelector("h1", { timeout: 30_000 });
    await page.waitForFunction(
      () => document.querySelectorAll('[role="tab"]').length > 0,
      { timeout: 30_000 }
    );

    // Cliquer sur "Lot étage 0"
    const lot0 = page.locator('[role="tab"]', { hasText: "Lot étage 0" });
    await lot0.click();
    await page.waitForTimeout(500);

    // Vérifier qu'au moins 1 pièce est affichée
    const roomCards = page.locator(
      'div.grid.grid-cols-1.md\\:grid-cols-2 > div[role="button"]'
    );
    const roomCount = await roomCards.count();
    console.log(`[RDC] pièces affichées : ${roomCount}`);
    expect(roomCount).toBeGreaterThan(0);

    // Vérifier que le bouton régénérer est visible
    const regenBtn = page.getByRole("button", {
      name: /Régénérer les pièces/,
    });
    await expect(regenBtn).toBeVisible();

    // Vérifier que le message "Tous les lots sont validés" N'est PAS affiché
    // (les lots sont 'suggested', pas 'validated' à ce stade)
    const successMsg = page.getByText(
      /Tous les lots sont validés.*générer les visuels/
    );
    await expect(successMsg).not.toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/s28-rooms-after-RDC.png`,
      fullPage: true,
    });
  });

  test("R+1 — 8 pièces (T2 + T3) affichées", async ({ page }) => {
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

  test("R+2 — pièces affichées", async ({ page }) => {
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

  test("R+3 — pièces affichées", async ({ page }) => {
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

    const regenBtn = page.getByRole("button", {
      name: /Régénérer les pièces/,
    });
    await regenBtn.click();

    // Attendre l'apparition du message warning de régénération (pas le message succès)
    const regenToast = page.getByText(/pièces? régénérée?s? par l'IA/);
    await expect(regenToast).toBeVisible({ timeout: 15_000 });

    // Vérifier que le message "Tous les lots sont validés" N'est PAS affiché
    const successMsg = page.getByText(
      /Tous les lots sont validés.*générer les visuels/
    );
    await expect(successMsg).not.toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/s28-rooms-regen-toast.png`,
      fullPage: true,
    });
  });
});
