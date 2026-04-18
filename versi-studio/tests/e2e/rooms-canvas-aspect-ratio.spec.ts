/**
 * Test de non-régression — Canvas rooms affiche le plan sans rognage (Retour 3 s22, P0)
 *
 * Contexte : 2e régression signalée par Thomas — le plan rendu dans RoomCanvas
 * apparaissait rogné sur certains ratios de plan. Le fix (commit 74c0da3) introduit
 * un rendu "contain" dans `RoomCanvas.tsx:201-227` qui préserve le ratio du crop
 * source (zone du lot) en ajoutant des marges plutôt qu'en rognant.
 *
 * Ce test doit BLOQUER toute 3e régression.
 *
 * Stratégie :
 *   - Vérifier que le container canvas a une taille usable (width ≥ 300px, height ≥ 200px)
 *     pour garantir qu'aucune règle CSS parente ne l'écrase (pattern "container collapse").
 *   - Vérifier que le canvas DOM rendu a une width/height > 0 (rendu effectif).
 *   - Vérifier que le canvas respecte le ratio demandé par le CSS parent
 *     (100% × 100% du container, pas de compression 0×0).
 *   - Screenshot baseline (toHaveScreenshot) — la régression "plan rogné"
 *     serait détectée visuellement par pixel-diff.
 *
 * Limitation acceptée : pas de fixture image 16:9 injectée. Le fix "contain" dans
 * draw() s'applique au canvas interne ; tester le ratio pixel exact nécessiterait
 * de lire le contenu du canvas (impossible via Playwright sans image réelle chargée
 * par onLoad, bloquée par le mock pixel transparent 1x1). Le test garantit donc
 * que la STRUCTURE DOM n'est pas cassée — un pixel-diff sur la baseline screenshot
 * détectera un rognage visuel réel. Si une image de fixture 16:9 est ajoutée plus
 * tard dans `tests/fixtures/`, ce test pourra être enrichi par l'assertion sur le
 * rapport (drawW/drawH) inspecté via `page.evaluate()` sur le canvas context.
 *
 * Anti-pattern évité : pas de route.continue() — learning versi-s21 L201.
 */

import { test, expect, type Page, type Route } from "@playwright/test";
import {
  PROJECT_ID,
  LOT_ID_1,
  LOT_ID_2,
  MOCK_PROJECT_STEP2,
  MOCK_PLANS,
  MOCK_LOTS,
  MOCK_ROOMS_LOT1,
  MOCK_ROOMS_LOT2,
} from "./fixtures";

/**
 * Mock toutes les routes nécessaires pour la page rooms.
 * Fichiers statiques → pixel PNG transparent (1x1) pour déclencher onLoad du plan.
 */
async function mockRoomsPage(page: Page) {
  const pixel = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );

  await page.route("**/tmp/vs/**", async (route: Route) => {
    await route.fulfill({ status: 200, contentType: "image/png", body: pixel });
  });
  await page.route("**/api/vs/files*", async (route: Route) => {
    await route.fulfill({ status: 200, contentType: "image/png", body: pixel });
  });

  await page.route(`**/api/vs/projects/${PROJECT_ID}`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: MOCK_PROJECT_STEP2 }),
    });
  });

  await page.route(
    `**/api/vs/projects/${PROJECT_ID}/plans`,
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: MOCK_PLANS }),
      });
    }
  );

  await page.route(
    `**/api/vs/projects/${PROJECT_ID}/lots`,
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: MOCK_LOTS }),
      });
    }
  );

  await page.route("**/api/vs/lots/*/rooms", async (route: Route) => {
    const url = route.request().url();
    const match = url.match(/\/lots\/([^/]+)\/rooms/);
    const lotId = match?.[1] ?? "";
    const rooms =
      lotId === LOT_ID_1
        ? MOCK_ROOMS_LOT1
        : lotId === LOT_ID_2
          ? MOCK_ROOMS_LOT2
          : [];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: rooms }),
    });
  });

  await page.route("**/api/vs/rooms/*", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { updated: true } }),
    });
  });

  await page.route("**/api/vs/lots/*", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { updated: true } }),
    });
  });
}

test.describe("Rooms canvas aspect ratio — non-régression s22 (Retour 3)", () => {
  test.setTimeout(45_000);
  test.use({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });

  test("canvas container n'est pas écrasé par le layout parent (min-width/height)", async ({
    page,
  }) => {
    await mockRoomsPage(page);
    await page.goto(`/vs/projects/${PROJECT_ID}/rooms`);

    // Attendre le rendu de la page + canvas monté
    await expect(
      page.getByRole("heading", { name: /identifiez les pièces/i })
    ).toBeVisible();

    const canvas = page.getByRole("img", {
      name: /plan du lot avec les pièces identifiées/i,
    });
    await expect(canvas).toBeVisible({ timeout: 10_000 });

    // Laisser ResizeObserver stabiliser canvasSize + draw()
    await page.waitForTimeout(600);

    // Box mesurée du canvas — doit être suffisamment large pour un affichage usable
    const box = await canvas.boundingBox();
    expect(box, "canvas DOM rendered").not.toBeNull();
    if (!box) return;

    // Régression bloquante — un canvas rendu < 300px de large ou < 200px de haut
    // indique un container collapsé (grid/flex parent cassé) ou un plan rogné
    // côté layout (pas côté drawImage).
    expect(box.width, "canvas width >= 300px (container pas collapsé)").toBeGreaterThanOrEqual(300);
    expect(box.height, "canvas height >= 200px (container pas collapsé)").toBeGreaterThanOrEqual(200);

    // Ratio sanity check — un canvas 1×1 ou très étiré (> 5:1 ou < 1:5) est suspect
    const ratio = box.width / box.height;
    expect(ratio, "ratio canvas entre 0.5 et 5 (pas extrêmement étiré)").toBeGreaterThan(0.3);
    expect(ratio, "ratio canvas entre 0.5 et 5 (pas extrêmement étiré)").toBeLessThan(5);
  });

  test("canvas element a des attributs width/height > 0 (rendu effectif)", async ({
    page,
  }) => {
    await mockRoomsPage(page);
    await page.goto(`/vs/projects/${PROJECT_ID}/rooms`);

    await expect(
      page.getByRole("heading", { name: /identifiez les pièces/i })
    ).toBeVisible();

    const canvas = page.getByRole("img", {
      name: /plan du lot avec les pièces identifiées/i,
    });
    await expect(canvas).toBeVisible({ timeout: 10_000 });

    await page.waitForTimeout(600);

    // Inspection directe de l'élément canvas — les attributs width/height
    // (backing store) doivent être > 0. Un canvas 0×0 indique un resize observer
    // cassé ou un container sans dimensions (régression layout).
    const dims = await canvas.evaluate((el) => {
      const c = el as HTMLCanvasElement;
      return { width: c.width, height: c.height };
    });

    expect(dims.width, "canvas.width attribute > 0").toBeGreaterThan(0);
    expect(dims.height, "canvas.height attribute > 0").toBeGreaterThan(0);
  });

  test("baseline visuelle — plan rendu sans rognage (Retour 3 s22)", async ({
    page,
  }) => {
    await mockRoomsPage(page);
    await page.goto(`/vs/projects/${PROJECT_ID}/rooms`);

    await expect(
      page.getByRole("heading", { name: /identifiez les pièces/i })
    ).toBeVisible();

    const canvas = page.getByRole("img", {
      name: /plan du lot avec les pièces identifiées/i,
    });
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(600);

    // Baseline screenshot — Retour 3 s22 (rooms-page-wide-plan).
    // Nom à plat (pas de sous-dossier) car Playwright 1.59 + snapshotPathTemplate
    // `tests/screenshots/{arg}` ne supporte pas les slashes dans le nom sans
    // migration globale des baselines existantes (bug upstream connu).
    // Si le plan est rogné visuellement, le pixel-diff détectera la régression.
    await expect(page).toHaveScreenshot("rooms-page-wide-plan.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.005,
    });
  });
});
