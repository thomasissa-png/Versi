/**
 * Test validation versi-s20 phases 1 et 2 :
 *
 * Phase 1 (zoom + pan) :
 * - Wheel scroll → vérifier que le bouton "Réinitialiser le zoom" apparaît (preuve viewport.scale > 1.05)
 *
 * Phase 2 (polygones) :
 * - Bouton "Dessiner un polygone" cliquable → active le mode dessin
 * - Cliquer 3 points + double-clic → POST /api/vs/projects/[id]/lots avec zone_data.type === "polygon"
 *
 * Stack : Playwright + mocks API (project, plans, lots).
 */
import { test, expect, type Route } from "@playwright/test";

const PROJECT_ID = "test-zoom-polygon";
const PLAN_ID = "plan-1";

const MOCK_PROJECT = {
  id: PROJECT_ID,
  adresse: "Test Zoom + Polygone",
  type_bien: "appartement",
  surface_totale: 100,
  status: "step_1_complete",
  created_at: "2026-04-16T00:00:00Z",
  updated_at: "2026-04-16T00:00:00Z",
};

const MOCK_PLAN = {
  id: PLAN_ID,
  project_id: PROJECT_ID,
  file_path: "/tmp/vs/test.png",
  mime_type: "image/png",
  floor_number: 0,
  original_filename: "test.png",
  extraction_data: null,
  extraction_status: "done",
  m2_per_pixel: 0.0001,
  created_at: "2026-04-16T00:00:00Z",
};

let lots: Array<Record<string, unknown>> = [];

async function setupMocks(page: import("@playwright/test").Page) {
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
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: MOCK_PROJECT }),
    })
  );
  await page.route(`**/api/vs/projects/${PROJECT_ID}/plans`, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [MOCK_PLAN] }),
    })
  );
  await page.route(`**/api/vs/projects/${PROJECT_ID}/lots`, async (route: Route) => {
    if (route.request().method() === "POST") {
      const body = JSON.parse(route.request().postData() || "{}");
      const newLot = {
        id: `lot-${lots.length + 1}`,
        project_id: PROJECT_ID,
        floor_number: body.floor_number ?? 0,
        name: body.name,
        zone_data: body.zone_data,
        surface_m2: 30,
        status: "suggested",
        source: "manual",
        created_at: "2026-04-16T00:00:00Z",
      };
      lots.push(newLot);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: newLot }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: lots }),
      });
    }
  });
  await page.route("**/api/vs/lots/**", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: lots[0] ?? {} }),
    })
  );
}

test.beforeEach(() => {
  lots = [];
});

test("Phase 1 — wheel scroll active le bouton Réinitialiser le zoom", async ({ page }) => {
  await setupMocks(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/vs/projects/${PROJECT_ID}/lots`, { waitUntil: "load" });
  await page.waitForSelector("canvas", { timeout: 5000 });
  await page.waitForTimeout(1000);

  // Vérifier que le bouton n'est PAS visible avant zoom (scale = 1.0)
  await expect(
    page.getByRole("button", { name: /Réinitialiser le zoom/i })
  ).toHaveCount(0);

  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas bounding box not found");

  // Simuler 3 wheel scrolls (negative deltaY = zoom in) au centre du canvas
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(150);
  }

  // Le bouton doit maintenant être visible (preuve scale > 1.05)
  await expect(
    page.getByRole("button", { name: /Réinitialiser le zoom/i })
  ).toBeVisible({ timeout: 3000 });

  // Screenshot
  await page.screenshot({
    path: "tests/screenshots/zoom-polygon-phase1-zoomed.png",
    fullPage: false,
  });

  // Click sur reset → bouton disparaît
  await page.getByRole("button", { name: /Réinitialiser le zoom/i }).click();
  await page.waitForTimeout(300);
  await expect(
    page.getByRole("button", { name: /Réinitialiser le zoom/i })
  ).toHaveCount(0);
});

test("Phase 2 — création d'un lot polygonal via dessin manuel", async ({ page }) => {
  await setupMocks(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/vs/projects/${PROJECT_ID}/lots`, { waitUntil: "load" });
  await page.waitForSelector("canvas", { timeout: 5000 });
  await page.waitForTimeout(1000);

  // Cliquer sur "Dessiner un polygone"
  const drawBtn = page.getByRole("button", { name: /Tracer un contour libre/i });
  await expect(drawBtn).toBeVisible();
  await drawBtn.click();

  // Bandeau "Mode dessin polygone actif" doit apparaître
  await expect(page.getByText(/Tracé libre en cours/i)).toBeVisible();

  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas bounding box not found");

  // Capturer les requêtes POST pour vérifier le payload
  const postRequest = page.waitForRequest(
    (req) =>
      req.url().includes(`/api/vs/projects/${PROJECT_ID}/lots`) &&
      req.method() === "POST"
  );

  // Cliquer 3 points (triangle)
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.click(cx - 80, cy - 40); // point 1
  await page.waitForTimeout(100);
  await page.mouse.click(cx + 80, cy - 40); // point 2
  await page.waitForTimeout(100);
  await page.mouse.click(cx, cy + 60); // point 3
  await page.waitForTimeout(100);

  // Double-clic = fermer le polygone
  await page.mouse.dblclick(cx, cy + 60);

  // Vérifier le payload POST
  const req = await postRequest;
  const body = JSON.parse(req.postData() || "{}");
  expect(body.zone_data).toBeDefined();
  expect(body.zone_data.type).toBe("polygon");
  expect(Array.isArray(body.zone_data.points)).toBe(true);
  expect(body.zone_data.points.length).toBeGreaterThanOrEqual(3);

  // Bandeau dessin doit disparaître
  await expect(page.getByText(/Tracé libre en cours/i)).toHaveCount(0);

  // Screenshot
  await page.screenshot({
    path: "tests/screenshots/zoom-polygon-phase2-created.png",
    fullPage: false,
  });
});
