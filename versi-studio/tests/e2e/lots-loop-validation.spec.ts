/**
 * Validation P0 — non-régression bug "boucle infinie surface" Étape 2 Lots
 * Test minimal : ouvre la page /lots avec mocks, vérifie pas de crash + canvas stable.
 */
import { test, expect, type Route } from "@playwright/test";

const PROJECT_ID = "test-loop-validation";
const LOT_ID = "lot-1";
const PLAN_ID = "plan-1";

const MOCK_PROJECT = {
  id: PROJECT_ID,
  name: "Test Loop Fix",
  status: "step_2_in_progress",
  step_status: "step_2_in_progress",
  created_at: "2026-04-16T00:00:00Z",
  updated_at: "2026-04-16T00:00:00Z",
};

const MOCK_PLAN = {
  id: PLAN_ID,
  project_id: PROJECT_ID,
  file_path: "/tmp/vs/test.png",
  floor_number: 0,
  m2_per_pixel: 0.0001, // surfacique m²/px²
  status: "extracted",
  created_at: "2026-04-16T00:00:00Z",
};

const MOCK_LOT = {
  id: LOT_ID,
  project_id: PROJECT_ID,
  plan_id: PLAN_ID,
  name: "Lot A",
  zone_data: { x_percent: 10, y_percent: 10, width_percent: 30, height_percent: 30 },
  status: "suggested",
  source: "ai",
  created_at: "2026-04-16T00:00:00Z",
};

test("page Lots ne boucle pas et canvas stable", async ({ page }) => {
  // Mock toutes les routes API
  await page.route("**/api/vs/files*", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      ),
    })
  );
  await page.route(`**/api/vs/projects/${PROJECT_ID}`, (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: MOCK_PROJECT }) })
  );
  await page.route(`**/api/vs/projects/${PROJECT_ID}/plans`, (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [MOCK_PLAN] }) })
  );
  await page.route(`**/api/vs/projects/${PROJECT_ID}/lots`, (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [MOCK_LOT] }) })
  );

  // Naviguer vers la page lots
  await page.goto(`/vs/projects/${PROJECT_ID}/lots`, { waitUntil: "load", timeout: 15000 });

  // Vérifier que le canvas est présent
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible({ timeout: 5000 });

  // Mesure 1 du canvas
  const dim1 = await canvas.evaluate((el: HTMLCanvasElement) => ({
    cssWidth: el.getBoundingClientRect().width,
    cssHeight: el.getBoundingClientRect().height,
    width: el.width,
    height: el.height,
  }));
  console.log("Dimensions canvas T0:", dim1);

  // Attendre 3 secondes (laisser le temps à un éventuel render loop de se manifester)
  await page.waitForTimeout(3000);

  // Mesure 2 du canvas
  const dim2 = await canvas.evaluate((el: HTMLCanvasElement) => ({
    cssWidth: el.getBoundingClientRect().width,
    cssHeight: el.getBoundingClientRect().height,
    width: el.width,
    height: el.height,
  }));
  console.log("Dimensions canvas T+3s:", dim2);

  // Le canvas doit être stable (pas avoir grossi de plus de 5px)
  expect(Math.abs(dim2.width - dim1.width)).toBeLessThan(5);
  expect(Math.abs(dim2.height - dim1.height)).toBeLessThan(5);
  expect(dim2.cssWidth).toBeLessThan(2000); // sanity check : pas de grossissement absurde
  expect(dim2.cssHeight).toBeLessThan(2000);

  // Screenshot pour validation visuelle
  await page.screenshot({ path: "/tmp/lots-validation-s20.png", fullPage: false });
  console.log("Screenshot sauvé dans /tmp/lots-validation-s20.png");
});
