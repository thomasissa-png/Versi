/**
 * Test reproduction bugs Thomas s20 :
 * Header visible + plan affiché + ajouter 4 lots décalés + pas de double bouton
 *
 * Prend des screenshots à chaque étape pour inspection visuelle manuelle.
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

// 1 seul lot initial — on va ajouter via bouton
const initialLots: Array<Record<string, unknown>> = [];

let lots = [...initialLots];

test("Bugs Thomas — header visible + plan + ajouter 4 lots décalés", async ({ page }) => {
  lots = [...initialLots]; // reset entre runs

  await page.route("**/api/vs/files*", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      // Vraie PNG 800x600 grise pour simuler plan
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAyAAAAJYCAIAAAAuHQQoAAAAgklEQVR42u3PAREAAAQDMPofAg/q" +
          "AUBv2e7RGTTaNA8gAAgAECEAABAAAECAAEAJAUIAASAEABA0AkAQEwCACYBABAHAICAAAEAQAACAgAECAAAEAIAAAAECAAEAAAAECAAAECAAAAAAECAAECAAEAAAAECAAAECAAAAAAECAAECAAEAAAAAACyE9vEAAB+8hLwAAAAAElFTkSuQmCC",
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
        floor_number: body.floor_number ?? 0,
        name: body.name || `Lot ${lots.length + 1}`,
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
  await page.waitForTimeout(2000);

  // 1) Header visible (opaque)
  const headerBg = await page.locator(".vs-nav").evaluate((el) => window.getComputedStyle(el).backgroundColor);
  console.log("Header background:", headerBg);
  // 2) Footer visible
  const footerBg = await page.locator(".vs-footer").evaluate((el) => window.getComputedStyle(el).backgroundColor);
  console.log("Footer background:", footerBg);

  // Screenshot état initial (0 lots)
  await page.screenshot({ path: "/tmp/bug-thomas-1-initial.png", fullPage: false });

  // Cliquer "+ Ajouter un lot" 4 fois — il ne doit y avoir qu'1 seul bouton
  const addButtons = await page.getByRole("button", { name: /ajouter un lot/i }).all();
  console.log("Nombre de boutons 'Ajouter un lot' visibles :", addButtons.length);

  if (addButtons.length > 0) {
    for (let i = 0; i < 4; i++) {
      await addButtons[0].click();
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(1500);
  }

  // Compter les lots
  console.log("Lots créés :", lots.length);
  console.log("Coordonnées :", JSON.stringify(lots.map((l) => ({ name: l.name, zone: l.zone_data })), null, 2));

  // Screenshot après 4 ajouts
  await page.screenshot({ path: "/tmp/bug-thomas-2-after-add.png", fullPage: false });
  // Pleine page (inclut footer)
  await page.screenshot({ path: "/tmp/bug-thomas-3-fullpage.png", fullPage: true });
});
