/**
 * Tests E2E edge cases — versi-s20 itération 3 (audit QA P0).
 *
 * Couverture :
 *  1. Delete clavier supprime le lot sélectionné (modale + DELETE /api/vs/lots)
 *  2. Reset zoom via double-clic zone vide (bouton reset disparaît)
 *  3. Overlap rect+polygone détecté visuellement (bandeau "Ces lots se chevauchent")
 *  4. Escape annule dessin polygone (bandeau disparaît, 0 POST)
 *  5. Backward compat lot legacy sans champ "type" (rendu sans erreur console)
 *  6. API rejette polygone < 3 points (400)
 *  7. API rejette zone avec NaN (400)
 *
 * Stack : Playwright + mocks API. Les tests API (6, 7) tapent les routes Next.js
 * réelles : sans DB connectée la validation est testée AVANT toute requête SQL,
 * donc on s'attend bien à un 400 même hors environnement DB.
 */
import { test, expect, type Route, type Page } from "@playwright/test";

// UUID valide (validé par isValidUUID côté API)
const PROJECT_ID = "f1e2d3c4-b5a6-4789-9abc-def012345678";
const PLAN_ID = "plan-0001-0000-0000-000000000001";

const MOCK_PROJECT = {
  id: PROJECT_ID,
  adresse: "10 rue des Edge Cases, 59000 Lille",
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

// PNG 1x1 transparent encodé en base64 (asset minimal pour ne pas charger un fichier réel)
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

let lots: Array<Record<string, unknown>> = [];
let deletedIds: string[] = [];

/**
 * Setup mocks de base. Le paramètre `initialLots` permet d'initialiser le state
 * avec des lots préexistants (utile pour les scénarios delete / overlap / legacy).
 */
async function setupMocks(page: Page, initialLots: Array<Record<string, unknown>> = []) {
  lots = [...initialLots];
  deletedIds = [];

  await page.route("**/api/vs/files*", (route: Route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: PNG_1X1 })
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
    const method = route.request().method();
    if (method === "POST") {
      const body = JSON.parse(route.request().postData() || "{}");
      const newLot = {
        id: `lot-${lots.length + 1}-0000-0000-000000000000`,
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
  // DELETE /api/vs/lots/[id]
  await page.route("**/api/vs/lots/**", async (route: Route) => {
    const url = route.request().url();
    const id = url.split("/").pop() || "";
    if (route.request().method() === "DELETE") {
      deletedIds.push(id);
      lots = lots.filter((l) => l.id !== id);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { deleted: true } }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: lots[0] ?? {} }),
    });
  });
}

test.beforeEach(() => {
  lots = [];
  deletedIds = [];
});

// ─────────────────────────────────────────────────────────────────────
// 1. Delete clavier supprime le lot sélectionné
// ─────────────────────────────────────────────────────────────────────
test("Delete clavier supprime le lot sélectionné", async ({ page }) => {
  const initialLot = {
    id: "lot-edge-del-0000-0000-000000000001",
    project_id: PROJECT_ID,
    floor_number: 0,
    name: "Lot 1 — RDC",
    zone_data: { type: "rect", x_percent: 20, y_percent: 20, width_percent: 30, height_percent: 30 },
    surface_m2: 25,
    status: "suggested",
    source: "manual",
    created_at: "2026-04-16T00:00:00Z",
  };
  await setupMocks(page, [initialLot]);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/vs/projects/${PROJECT_ID}/lots`, { waitUntil: "load" });
  await page.waitForSelector("canvas", { timeout: 5000 });
  await page.waitForTimeout(800);

  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas bounding box not found");

  // Clic au centre du lot pour le sélectionner (35% en x, 35% en y du canvas)
  const lotCenterX = box.x + box.width * 0.35;
  const lotCenterY = box.y + box.height * 0.35;
  await page.mouse.click(lotCenterX, lotCenterY);
  await page.waitForTimeout(200);

  // Press Delete → modale "Supprimer ce lot ?" doit apparaître
  await canvas.focus();
  await page.keyboard.press("Delete");
  await expect(page.getByText("Supprimer ce lot ?")).toBeVisible({ timeout: 2000 });

  // Cliquer "Supprimer" dans la modale
  const deleteRequest = page.waitForRequest(
    (req) =>
      req.url().includes("/api/vs/lots/") &&
      req.method() === "DELETE",
    { timeout: 3000 }
  );
  await page.getByRole("button", { name: /^Supprimer$/i }).click();
  const req = await deleteRequest;
  expect(req.url()).toContain(initialLot.id);
  await page.waitForTimeout(300);
  // Le lot est retiré du state (vérification visuelle souple)
  await expect(page.getByText("Supprimer ce lot ?")).toHaveCount(0);
});

// ─────────────────────────────────────────────────────────────────────
// 2. Reset zoom via double-clic zone vide
// ─────────────────────────────────────────────────────────────────────
test("Reset zoom via double-clic zone vide", async ({ page }) => {
  // Lot positionné au centre, on double-cliquera dans un coin vide.
  const initialLot = {
    id: "lot-edge-zoom-0000-0000-000000000001",
    project_id: PROJECT_ID,
    floor_number: 0,
    name: "Lot Zoom",
    zone_data: { type: "rect", x_percent: 40, y_percent: 40, width_percent: 20, height_percent: 20 },
    surface_m2: 25,
    status: "suggested",
    source: "manual",
    created_at: "2026-04-16T00:00:00Z",
  };
  await setupMocks(page, [initialLot]);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/vs/projects/${PROJECT_ID}/lots`, { waitUntil: "load" });
  await page.waitForSelector("canvas", { timeout: 5000 });
  await page.waitForTimeout(800);

  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas bounding box not found");

  // Wheel zoom in au centre du canvas → bouton reset visible
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(120);
  }
  await expect(
    page.getByRole("button", { name: /Réinitialiser le zoom/i })
  ).toBeVisible({ timeout: 3000 });

  // Double-clic dans un coin vide (haut-gauche du canvas, hors lot)
  await page.mouse.dblclick(box.x + 20, box.y + 20);
  await page.waitForTimeout(300);

  // Le bouton reset doit avoir disparu (scale revenu à 1)
  await expect(
    page.getByRole("button", { name: /Réinitialiser le zoom/i })
  ).toHaveCount(0);
});

// ─────────────────────────────────────────────────────────────────────
// 3. Overlap rect + polygone détecté visuellement
// ─────────────────────────────────────────────────────────────────────
test("Overlap rect+polygone détecté", async ({ page }) => {
  const rectLot = {
    id: "lot-edge-rect-0000-0000-000000000001",
    project_id: PROJECT_ID,
    floor_number: 0,
    name: "Lot Rect",
    zone_data: { type: "rect", x_percent: 30, y_percent: 30, width_percent: 40, height_percent: 40 },
    surface_m2: 50,
    status: "suggested",
    source: "manual",
    created_at: "2026-04-16T00:00:00Z",
  };
  const polyLot = {
    id: "lot-edge-poly-0000-0000-000000000002",
    project_id: PROJECT_ID,
    floor_number: 0,
    name: "Lot Poly",
    zone_data: {
      type: "polygon",
      points: [
        { x_percent: 40, y_percent: 40 },
        { x_percent: 60, y_percent: 40 },
        { x_percent: 60, y_percent: 60 },
        { x_percent: 40, y_percent: 60 },
      ],
    },
    surface_m2: 30,
    status: "suggested",
    source: "manual",
    created_at: "2026-04-16T00:00:00Z",
  };
  await setupMocks(page, [rectLot, polyLot]);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/vs/projects/${PROJECT_ID}/lots`, { waitUntil: "load" });
  await page.waitForSelector("canvas", { timeout: 5000 });
  await page.waitForTimeout(800);

  // Bandeau d'erreur d'overlap doit être visible
  await expect(
    page.getByText(/Ces lots se chevauchent/i)
  ).toBeVisible({ timeout: 3000 });

  // Le bouton "Continuer" / "Valider" doit être désactivé (s'il existe)
  const continueBtn = page.getByRole("button", { name: /Valider|Continuer/i }).first();
  const exists = (await continueBtn.count()) > 0;
  if (exists) {
    await expect(continueBtn).toBeDisabled();
  }
});

// ─────────────────────────────────────────────────────────────────────
// 4. Escape annule dessin polygone
// ─────────────────────────────────────────────────────────────────────
test("Escape annule dessin polygone", async ({ page }) => {
  await setupMocks(page, []);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/vs/projects/${PROJECT_ID}/lots`, { waitUntil: "load" });
  await page.waitForSelector("canvas", { timeout: 5000 });
  await page.waitForTimeout(800);

  // Compteur de POST
  let postCount = 0;
  page.on("request", (req) => {
    if (
      req.url().includes(`/api/vs/projects/${PROJECT_ID}/lots`) &&
      req.method() === "POST"
    ) {
      postCount++;
    }
  });

  // Activer dessin polygone
  await page.getByRole("button", { name: /Dessiner un polygone/i }).click();
  await expect(page.getByText(/Mode dessin polygone actif/i)).toBeVisible();

  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas bounding box not found");
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // 2 clics canvas (pas assez pour fermer)
  await page.mouse.click(cx - 60, cy - 30);
  await page.waitForTimeout(80);
  await page.mouse.click(cx + 60, cy - 30);
  await page.waitForTimeout(80);

  // Escape annule
  await canvas.focus();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  // Bandeau dessin doit avoir disparu, aucun POST envoyé
  await expect(page.getByText(/Mode dessin polygone actif/i)).toHaveCount(0);
  expect(postCount).toBe(0);
});

// ─────────────────────────────────────────────────────────────────────
// 5. Backward compat lot legacy sans champ "type"
// ─────────────────────────────────────────────────────────────────────
test("Backward compat lot legacy sans type", async ({ page }) => {
  const legacyLot = {
    id: "lot-edge-legacy-0000-0000-00000000001",
    project_id: PROJECT_ID,
    floor_number: 0,
    name: "Lot Legacy",
    // Pas de champ "type" — format pré-versi-s20 (rect implicite)
    zone_data: {
      x_percent: 25,
      y_percent: 25,
      width_percent: 40,
      height_percent: 40,
    },
    surface_m2: 40,
    status: "suggested",
    source: "manual",
    created_at: "2026-04-16T00:00:00Z",
  };
  await setupMocks(page, [legacyLot]);
  await page.setViewportSize({ width: 1280, height: 800 });

  // Capturer les erreurs console
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  await page.goto(`/vs/projects/${PROJECT_ID}/lots`, { waitUntil: "load" });
  await page.waitForSelector("canvas", { timeout: 5000 });
  await page.waitForTimeout(1000);

  // Canvas doit être rendu (pas d'erreur runtime)
  await expect(page.locator("canvas").first()).toBeVisible();
  expect(pageErrors).toEqual([]);
  // Filtrage : on ignore les erreurs réseau de fonts/sources externes éventuelles.
  const realErrors = consoleErrors.filter(
    (e) => !e.includes("favicon") && !e.includes("Failed to load resource")
  );
  expect(realErrors).toEqual([]);
});

// ─────────────────────────────────────────────────────────────────────
// 6. API rejette polygone < 3 points
// ─────────────────────────────────────────────────────────────────────
test("API rejette polygone <3 points", async ({ request }) => {
  const r = await request.post(`/api/vs/projects/${PROJECT_ID}/lots`, {
    data: {
      name: "Polygone invalide",
      floor_number: 0,
      zone_data: {
        type: "polygon",
        points: [
          { x_percent: 10, y_percent: 10 },
          { x_percent: 20, y_percent: 20 },
        ],
      },
    },
  });
  expect(r.status()).toBe(400);
});

// ─────────────────────────────────────────────────────────────────────
// 7. API rejette zone avec NaN
// ─────────────────────────────────────────────────────────────────────
test("API rejette zone avec NaN", async ({ request }) => {
  const r = await request.post(`/api/vs/projects/${PROJECT_ID}/lots`, {
    data: {
      name: "Rect NaN",
      floor_number: 0,
      zone_data: {
        type: "rect",
        x_percent: NaN,
        y_percent: 10,
        width_percent: 30,
        height_percent: 30,
      },
    },
  });
  expect(r.status()).toBe(400);
});
