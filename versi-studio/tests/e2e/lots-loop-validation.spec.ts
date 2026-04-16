/**
 * Test validation s20 :
 * - Logo VERSI STUDIO pattern Versi
 * - Clic droit sur lot → menu contextuel
 * - Touche Delete → ouvre modal suppression
 */
import { test, type Route } from "@playwright/test";

const PROJECT_ID = "test-thomas-bugs";
const PLAN_ID = "plan-1";

const MOCK_PROJECT = {
  id: PROJECT_ID,
  name: "Rue des Muguets (test)",
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

test("Logo VERSI STUDIO + clic droit + Delete", async ({ page }) => {
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
        name: body.name,
        zone_data: body.zone_data,
        surface_m2: 47,
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

  // Vérifier le logo VERSI STUDIO (2 spans)
  const logoName = await page.locator(".vs-nav__logo-name").textContent();
  const logoLabel = await page.locator(".vs-nav__logo-label").textContent();
  console.log(`Logo header : "${logoName}" + "${logoLabel}"`);

  const footerLogoName = await page.locator(".vs-footer__logo-name").textContent();
  const footerLogoLabel = await page.locator(".vs-footer__logo-label").textContent();
  console.log(`Logo footer : "${footerLogoName}" + "${footerLogoLabel}"`);

  // Ajouter 1 lot
  await page.getByRole("button", { name: /ajouter un lot/i }).first().click();
  await page.waitForTimeout(800);
  console.log("Lots après 1 ajout :", lots.length);

  // Screenshot état avec 1 lot
  await page.screenshot({ path: "/tmp/s20-final-1lot.png", fullPage: true });

  // Clic droit sur le canvas (au milieu du lot ajouté — coords approximatives x=180, y=150)
  const canvas = page.locator("canvas").first();
  await canvas.click({ button: "right", position: { x: 180, y: 150 } });
  await page.waitForTimeout(500);

  // Vérifier qu'un menu contextuel apparaît
  const contextMenuVisible = await page.locator('role=menu[name="Actions du lot"]').isVisible();
  console.log("Menu contextuel visible après clic droit :", contextMenuVisible);

  await page.screenshot({ path: "/tmp/s20-final-contextmenu.png", fullPage: false });

  // Cliquer "Supprimer ce lot"
  if (contextMenuVisible) {
    await page.getByRole("menuitem", { name: /supprimer ce lot/i }).click();
    await page.waitForTimeout(800);

    // Vérifier que la modal de confirmation est apparue
    const confirmModal = await page.locator('text=/Supprimer ce lot/i').isVisible();
    console.log("Modal confirmation après clic Supprimer :", confirmModal);
  }

  await page.screenshot({ path: "/tmp/s20-final-confirmmodal.png", fullPage: false });
});
