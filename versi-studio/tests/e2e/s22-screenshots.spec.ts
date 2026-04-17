/**
 * s22 — Screenshots de preuve pour les changements UX navigation/layout
 * Usage : PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers npx playwright test tests/s22-screenshots.ts
 */

import { test, expect, type Page, type Route } from "@playwright/test";
import path from "node:path";
import {
  PROJECT_ID,
  LOT_ID_1,
  LOT_ID_2,
  MOCK_PROJECT_STEP2,
  MOCK_PROJECT_STEP3,
  MOCK_PLANS,
  MOCK_LOTS,
  MOCK_ROOMS_LOT1,
  MOCK_ROOMS_LOT2,
} from "./fixtures";

const SCREENSHOT_DIR = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "docs",
  "screenshots",
  "s22"
);

// ─── Helpers ────────────────────────────────────────────────────────

async function mockLotsPage(page: Page) {
  // Mock API responses for lots page
  await page.route("**/api/vs/projects/*/plans", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: MOCK_PLANS }),
    })
  );
  await page.route("**/api/vs/projects/*/lots", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: MOCK_LOTS }),
    })
  );
  await page.route(`**/api/vs/projects/${PROJECT_ID}`, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: MOCK_PROJECT_STEP2 }),
    })
  );
  // Mock plan image
  await page.route("**/api/vs/files*", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.alloc(100),
    })
  );
}

async function mockRoomsPage(page: Page) {
  await page.route(`**/api/vs/projects/${PROJECT_ID}`, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: MOCK_PROJECT_STEP3 }),
    })
  );
  await page.route("**/api/vs/projects/*/plans", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: MOCK_PLANS }),
    })
  );
  await page.route("**/api/vs/projects/*/lots", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: MOCK_LOTS }),
    })
  );
  await page.route(`**/api/vs/lots/${LOT_ID_1}/rooms`, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: MOCK_ROOMS_LOT1 }),
    })
  );
  await page.route(`**/api/vs/lots/${LOT_ID_2}/rooms`, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: MOCK_ROOMS_LOT2 }),
    })
  );
  await page.route("**/api/vs/files*", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.alloc(100),
    })
  );
}

// ─── Tests ─────────────────���────────────────────────────────────────

test.describe("s22 — Screenshots de preuve", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("etape2-new-layout — lots stack vertical + 2 boutons distincts", async ({
    page,
  }) => {
    await mockLotsPage(page);
    await page.goto(`/vs/projects/${PROJECT_ID}/lots`);
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "etape2-new-layout.png"),
      fullPage: true,
    });
  });

  test("etape3-new-layout — rooms stack vertical", async ({ page }) => {
    await mockRoomsPage(page);
    await page.goto(`/vs/projects/${PROJECT_ID}/rooms`);
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "etape3-new-layout.png"),
      fullPage: true,
    });
  });

  test("etape3-retour-button — bouton Retour visible", async ({ page }) => {
    await mockRoomsPage(page);
    await page.goto(`/vs/projects/${PROJECT_ID}/rooms`);
    await page.waitForTimeout(1500);
    // Focus on the back button area
    const backButton = page.locator("button", { hasText: "Lots" }).first();
    await expect(backButton).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "etape3-retour-button.png"),
      fullPage: false,
    });
  });

  test("etape2-retour-button — bouton Retour Plans visible", async ({
    page,
  }) => {
    await mockLotsPage(page);
    await page.goto(`/vs/projects/${PROJECT_ID}/lots`);
    await page.waitForTimeout(1500);
    const backButton = page.locator("button", { hasText: "Plans" }).first();
    await expect(backButton).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "etape2-retour-button.png"),
      fullPage: false,
    });
  });
});
