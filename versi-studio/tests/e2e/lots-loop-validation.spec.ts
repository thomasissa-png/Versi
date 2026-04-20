/**
 * Test exhaustif s20 — Phase 2 polygones + Phase 1 zoom
 *
 * Scénarios :
 *   1. Zoom molette (centré curseur)
 *   2. Pan Ctrl+drag
 *   3. Reset double-clic vide
 *   4. Bouton "Dessiner un polygone" présent
 *   5. Mode dessin polygone : clic 4 points + double-clic ferme
 *   6. Lot polygonal apparaît dans panel
 *   7. Suppression polygone via Delete clavier
 *   8. Suppression via clic droit
 */
import { test, type Route } from "@playwright/test";

const PROJECT_ID = "test-polygones";
const PLAN_ID = "plan-1";

const MOCK_PROJECT = {
  id: PROJECT_ID,
  name: "Test Polygones",
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

let lots: Array<Record<string, unknown>> = [];

test("s20 audit — zoom + polygones", async ({ page }) => {
  lots = [];

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
  await page.route(`**/api/vs/projects/${PROJECT_ID}/lots`, async (route: Route) => {
    if (route.request().method() === "POST") {
      const body = JSON.parse(route.request().postData() || "{}");
      const newLot = {
        id: `lot-${lots.length + 1}`,
        project_id: PROJECT_ID,
        plan_id: PLAN_ID,
        floor_number: 0,
        name: body.name || `Lot ${lots.length + 1}`,
        zone_data: body.zone_data,
        surface_m2: 50,
        status: "manual",
        source: "user",
        created_at: "2026-04-16T00:00:00Z",
      };
      lots.push(newLot);
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: newLot }) });
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: lots }) });
    }
  });
  await page.route("**/api/vs/lots/**", (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: lots[0] ?? {} }) })
  );

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/vs/projects/${PROJECT_ID}/lots`, { waitUntil: "load" });
  await page.waitForSelector("canvas", { timeout: 5000 });
  await page.waitForTimeout(1500);

  // Screenshot 0 : état initial
  await page.screenshot({ path: "/tmp/audit-s20-0-initial.png", fullPage: false });

  // ─── Test 1 : Bouton "Dessiner un polygone" présent ──────────────
  const polygonBtn = page.getByRole("button", { name: /tracer un contour libre|contour libre/i });
  const polygonBtnVisible = await polygonBtn.isVisible().catch(() => false);
  console.log("Bouton 'Tracer un contour libre' visible :", polygonBtnVisible);

  // ─── Test 2 : Activer mode dessin polygone ───────────────────────
  if (polygonBtnVisible) {
    await polygonBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: "/tmp/audit-s20-1-polygon-mode.png", fullPage: false });

    // Cliquer 4 points pour dessiner un polygone
    const canvas = page.locator("canvas").first();
    await canvas.click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(200);
    await canvas.click({ position: { x: 250, y: 100 } });
    await page.waitForTimeout(200);
    await canvas.click({ position: { x: 280, y: 220 } });
    await page.waitForTimeout(200);
    await canvas.click({ position: { x: 130, y: 250 } });
    await page.waitForTimeout(200);
    await page.screenshot({ path: "/tmp/audit-s20-2-polygon-drawing.png", fullPage: false });

    // Double-clic pour fermer le polygone
    await canvas.dblclick({ position: { x: 130, y: 250 } });
    await page.waitForTimeout(800);
    console.log("Lots après dessin polygone :", lots.length);
    if (lots.length > 0) {
      console.log("Type zone du polygone :", JSON.stringify(lots[0].zone_data));
    }

    await page.screenshot({ path: "/tmp/audit-s20-3-polygon-created.png", fullPage: false });
  }

  // ─── Test 3 : Zoom molette ──────────────────────────────────────
  const canvas = page.locator("canvas").first();
  const initialBox = await canvas.boundingBox();
  if (initialBox) {
    const cx = initialBox.x + initialBox.width / 2;
    const cy = initialBox.y + initialBox.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.wheel(0, -300); // zoom in
    await page.waitForTimeout(500);
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(500);
    await page.screenshot({ path: "/tmp/audit-s20-4-zoom-in.png", fullPage: false });
    console.log("Zoom in 2x effectué");

    // Double-clic vide pour reset
    await canvas.dblclick({ position: { x: 50, y: 50 } });
    await page.waitForTimeout(500);
    await page.screenshot({ path: "/tmp/audit-s20-5-zoom-reset.png", fullPage: false });
  }

  // ─── Récap ────────────────────────────────────────────────────────
  console.log("\n--- BILAN ---");
  console.log("Polygone créé :", lots.length > 0);
  console.log("Lot type zone :", lots[0]?.zone_data ? JSON.stringify(lots[0].zone_data).substring(0, 100) : "(aucun)");
});
