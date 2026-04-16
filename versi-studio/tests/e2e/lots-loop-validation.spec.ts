/**
 * Validation P0 — non-régression bug "boucle infinie + accumulation lots" Étape 2 Lots
 *
 * Vérifie 3 points critiques (capture Thomas du 2026-04-16) :
 *  1. Canvas stable (pas de grossissement infini)
 *  2. Pas d'accumulation de rectangles (clearRect entre 2 draws)
 *  3. Header (.vs-nav) et Footer (.vs-footer) toujours visibles
 */
import { test, expect, type Route } from "@playwright/test";

const PROJECT_ID = "test-loop-validation";
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
  m2_per_pixel: 0.0001,
  status: "extracted",
  created_at: "2026-04-16T00:00:00Z",
};

const MOCK_LOTS = [
  {
    id: "lot-1",
    project_id: PROJECT_ID,
    plan_id: PLAN_ID,
    name: "Lot 1",
    zone_data: { x_percent: 5, y_percent: 5, width_percent: 25, height_percent: 25 },
    status: "suggested",
    source: "ai",
    created_at: "2026-04-16T00:00:00Z",
  },
  {
    id: "lot-2",
    project_id: PROJECT_ID,
    plan_id: PLAN_ID,
    name: "Lot 2",
    zone_data: { x_percent: 35, y_percent: 5, width_percent: 25, height_percent: 25 },
    status: "suggested",
    source: "ai",
    created_at: "2026-04-16T00:00:00Z",
  },
  {
    id: "lot-3",
    project_id: PROJECT_ID,
    plan_id: PLAN_ID,
    name: "Lot 3",
    zone_data: { x_percent: 65, y_percent: 5, width_percent: 25, height_percent: 25 },
    status: "suggested",
    source: "ai",
    created_at: "2026-04-16T00:00:00Z",
  },
];

async function setupMocks(page: Parameters<typeof test>[1] extends infer F ? F extends (...args: infer A) => unknown ? A[0] extends { page: infer P } ? P : never : never : never) {
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
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: MOCK_LOTS }) })
  );
}

test("page Lots — canvas stable + pas d'accumulation + header/footer présents", async ({ page }) => {
  await setupMocks(page);

  await page.goto(`/vs/projects/${PROJECT_ID}/lots`, { waitUntil: "load", timeout: 15000 });
  await page.waitForSelector("canvas", { timeout: 5000 });

  const canvas = page.locator("canvas").first();

  // ─── Test 1 : canvas stable dans le temps ──────────────────────
  const dim1 = await canvas.evaluate((el: HTMLCanvasElement) => ({
    cssWidth: el.getBoundingClientRect().width,
    cssHeight: el.getBoundingClientRect().height,
    bufferWidth: el.width,
    bufferHeight: el.height,
  }));
  console.log("T0 canvas:", dim1);

  await page.waitForTimeout(3000);

  const dim2 = await canvas.evaluate((el: HTMLCanvasElement) => ({
    cssWidth: el.getBoundingClientRect().width,
    cssHeight: el.getBoundingClientRect().height,
    bufferWidth: el.width,
    bufferHeight: el.height,
  }));
  console.log("T+3s canvas:", dim2);

  expect(Math.abs(dim2.cssWidth - dim1.cssWidth)).toBeLessThan(5);
  expect(Math.abs(dim2.cssHeight - dim1.cssHeight)).toBeLessThan(5);
  expect(dim2.cssWidth).toBeLessThan(2000);
  expect(dim2.cssHeight).toBeLessThan(2000);

  // ─── Test 2 : pas d'accumulation visuelle (clearRect entre draws) ──
  // Compter les pixels non-blancs (lots dessinés). Si accumulation,
  // le compte augmenterait à chaque draw. Avec clearRect, il reste stable.
  const nonWhitePixelsT0 = await canvas.evaluate((el: HTMLCanvasElement) => {
    const ctx = el.getContext("2d");
    if (!ctx) return 0;
    const data = ctx.getImageData(0, 0, el.width, el.height).data;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      if (a > 0 && (r < 240 || g < 240 || b < 240)) count++;
    }
    return count;
  });
  console.log("T0 pixels non-blancs:", nonWhitePixelsT0);

  // Simuler un trigger de redraw via resize fenêtre légère
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await page.waitForTimeout(2000);

  const nonWhitePixelsT2 = await canvas.evaluate((el: HTMLCanvasElement) => {
    const ctx = el.getContext("2d");
    if (!ctx) return 0;
    const data = ctx.getImageData(0, 0, el.width, el.height).data;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      if (a > 0 && (r < 240 || g < 240 || b < 240)) count++;
    }
    return count;
  });
  console.log("T+2s après resize pixels non-blancs:", nonWhitePixelsT2);

  // Le nombre de pixels colorés doit rester comparable (tolérance 30% pour
  // sub-pixel rendering). Si accumulation: x2-x10 facilement.
  const ratio = nonWhitePixelsT2 / Math.max(nonWhitePixelsT0, 1);
  console.log("Ratio T+2s/T0:", ratio.toFixed(2));
  expect(ratio).toBeLessThan(1.5); // pas de sur-accumulation
  expect(ratio).toBeGreaterThan(0.5); // pas de disparition

  // ─── Test 3 : header et footer présents ────────────────────────
  const header = page.locator(".vs-nav");
  const footer = page.locator(".vs-footer");
  await expect(header).toBeVisible();
  await expect(footer).toBeAttached(); // dans le DOM (peut être en bas, hors viewport)

  // Logo VERSI dans le header
  const logo = page.locator(".vs-nav__logo");
  await expect(logo).toHaveText("VERSI");

  // Screenshot pour validation visuelle
  await page.screenshot({ path: "/tmp/lots-validation-s20-final.png", fullPage: false });
  console.log("Screenshot: /tmp/lots-validation-s20-final.png");
});
