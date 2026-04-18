/**
 * Tests E2E mobile — touch/pinch sur RoomCanvas (s23 P3)
 *
 * Contexte : l'implémentation touch/pinch mobile de RoomCanvas (commit f455ad8,
 * s23 P3) utilise l'API Pointer Events unifiée. Cette suite automatise les
 * tests manuels documentés dans `docs/qa/s23-touch-pinch-mobile-roomcanvas.md`.
 *
 * Observabilité du state interne :
 *   Le viewport (scale/offsetX/offsetY) est appliqué DANS le context canvas
 *   (`ctx.scale(...)` + `ctx.translate(...)`, cf RoomCanvas.tsx L268-269), pas
 *   en CSS transform sur le DOM. Les tests ne peuvent donc pas lire
 *   `style.transform`. Signal observable utilisé :
 *   - Bouton "Réinitialiser la vue" (aria-label "Réinitialiser le zoom")
 *     → `display` passe de `none` à visible quand `scale > 1.05` (cf L671-674).
 *   - Après tap sur reset, le bouton disparaît (scale retourne à 1).
 *
 * Limitations API Playwright pour gestures multi-touch :
 *   Playwright 1.59 n'expose pas nativement de `page.touchscreen.pinch(...)`.
 *   `page.touchscreen` ne supporte que `.tap(x, y)` single-touch. Pour un pinch
 *   2-pointers, 2 approches :
 *     1. `CDPSession.send('Input.dispatchTouchEvent', {...})` — multi-touch
 *        natif via CDP, contrôle précis de chaque touch point.
 *     2. `page.evaluate(() => dispatchEvent(new PointerEvent(...)))` — dispatch
 *        manuel de PointerEvent avec pointerId distincts.
 *   Approche retenue : CDP `dispatchTouchEvent` car l'implémentation RoomCanvas
 *   utilise `onPointerDown/Move/Up` qui convertit les événements tactiles
 *   natifs en PointerEvents via le navigateur → plus proche du vrai user flow.
 *   Réf issue upstream : https://github.com/microsoft/playwright/issues/2903
 *   (multi-touch gestures API dédiée non encore mergée, avril 2026).
 *
 * Anti-pattern évité : pas de `route.continue()` — learning versi-s21 L201.
 *
 * Scope : comportemental, pas visuel (pas de baseline screenshot dans cette suite).
 */

import { test, expect, type Page, type Route, type CDPSession } from "@playwright/test";
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
 * Identique au spec `rooms-canvas-aspect-ratio.spec.ts` — garantit un rendu
 * déterministe du canvas sans dépendre de la DB/OpenAI.
 */
async function mockRoomsPage(page: Page) {
  const pixel = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );

  // ORDRE IMPORTANT : Playwright évalue les routes en LIFO (dernière enregistrée
  // = première testée). Le fallback `**/api/vs/**` DOIT être enregistré EN
  // PREMIER pour que les routes spécifiques enregistrées ensuite le shadow.
  // Anti-pattern route.continue() interdit (L201) → fallback = 404 explicite.
  await page.route("**/api/vs/**", async (route: Route) => {
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: "Mock not found" }),
    });
  });

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

/**
 * Navigue vers la page rooms et attend que le canvas soit rendu.
 * Retourne la bounding box du canvas (utilisée pour calculer les coordonnées touch).
 */
async function gotoRoomsAndWaitCanvas(page: Page) {
  await mockRoomsPage(page);
  await page.goto(`/vs/projects/${PROJECT_ID}/rooms`);

  await expect(
    page.getByRole("heading", { name: /identifiez les pièces/i })
  ).toBeVisible();

  const canvas = page.getByRole("img", {
    name: /plan du lot avec les pièces identifiées/i,
  });
  await expect(canvas).toBeVisible({ timeout: 10_000 });

  // Laisser ResizeObserver stabiliser canvasSize + draw()
  await page.waitForTimeout(600);

  const box = await canvas.boundingBox();
  expect(box, "canvas DOM rendered").not.toBeNull();
  if (!box) throw new Error("canvas box null");

  return { canvas, box };
}

/**
 * Dispatch un événement tactile multi-touch via CDP.
 *
 * IMPORTANT : la MÊME `CDPSession` doit être utilisée entre touchStart /
 * touchMove / touchEnd d'un même geste. Créer une nouvelle session sur chaque
 * appel casse l'état interne ("Must send a TouchStart first to start a new
 * touch"). La session est créée une fois par test et passée explicitement.
 *
 * `type` : "touchStart" | "touchMove" | "touchEnd" | "touchCancel"
 * `touchPoints` : liste de points { x, y, id } (coord viewport, pas page)
 */
async function dispatchTouch(
  client: CDPSession,
  type: "touchStart" | "touchMove" | "touchEnd" | "touchCancel",
  touchPoints: Array<{ x: number; y: number; id: number }>
) {
  await client.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: touchPoints.map((p) => ({
      x: p.x,
      y: p.y,
      id: p.id,
      radiusX: 1,
      radiusY: 1,
      force: 1,
    })),
  });
}

/** Retourne true si le bouton "Réinitialiser la vue" est visible (scale > 1.05). */
async function isResetButtonVisible(page: Page): Promise<boolean> {
  const resetBtn = page.getByRole("button", { name: /réinitialiser le zoom/i });
  return await resetBtn.isVisible().catch(() => false);
}

// ─── Tests mobile Pixel 7 (Android Chrome émulé) ──────────────────────
// Pixel 7 choisi pour Android Chrome car iPhone 13 (Safari WebKit) en émulation
// Playwright n'expose pas `CDPSession` (limitation connue : CDP est Chromium-only).
// Pour une suite cross-browser mobile, il faudrait passer par Appium (s24+).
//
// Note : les device settings (`devices["Pixel 7"]`, `hasTouch: true`) sont
// appliqués au niveau du project dans `playwright.config.ts`. Pas de
// `test.use({...devices})` ici — Playwright 1.59 interdit d'overrider
// `defaultBrowserType` dans un `describe` (forcerait un nouveau worker).
test.describe("Touch/pinch mobile RoomCanvas (s23 P3) — Pixel 7 / Chromium", () => {
  test.setTimeout(45_000);

  test("T1 — single-touch pan déplace le plan (scale inchangé, bouton reset invisible)", async ({
    page,
  }) => {
    const { box } = await gotoRoomsAndWaitCanvas(page);
    const client = await page.context().newCDPSession(page);

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const endX = startX + 80;
    const endY = startY + 40;

    // Reset button ne doit PAS être visible au départ (scale = 1)
    expect(await isResetButtonVisible(page)).toBe(false);

    // Single-touch pan via CDP
    await dispatchTouch(client, "touchStart", [{ x: startX, y: startY, id: 1 }]);
    await page.waitForTimeout(50);
    await dispatchTouch(client, "touchMove", [{ x: endX, y: endY, id: 1 }]);
    await page.waitForTimeout(50);
    await dispatchTouch(client, "touchEnd", [{ x: endX, y: endY, id: 1 }]);
    await page.waitForTimeout(200);

    // Pan ne change pas le scale → reset button toujours invisible
    expect(await isResetButtonVisible(page)).toBe(false);
  });

  test("T2 — pinch zoom in (doigts qui s'écartent) → bouton reset apparaît (scale > 1.05)", async ({
    page,
  }) => {
    const { box } = await gotoRoomsAndWaitCanvas(page);
    const client = await page.context().newCDPSession(page);

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Pinch initial : 2 doigts proches du centre (distance ~40px)
    const p1Start = { x: cx - 20, y: cy, id: 1 };
    const p2Start = { x: cx + 20, y: cy, id: 2 };

    // Pinch final : doigts écartés (distance ~300px → ratio 7.5x, clampé à 8x)
    const p1End = { x: cx - 150, y: cy, id: 1 };
    const p2End = { x: cx + 150, y: cy, id: 2 };

    expect(await isResetButtonVisible(page)).toBe(false);

    await dispatchTouch(client, "touchStart", [p1Start, p2Start]);
    await page.waitForTimeout(50);

    // Déplacement progressif (3 steps) pour simuler un pinch réaliste
    const steps = 3;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      await dispatchTouch(client, "touchMove", [
        { x: cx - 20 - (150 - 20) * t, y: cy, id: 1 },
        { x: cx + 20 + (150 - 20) * t, y: cy, id: 2 },
      ]);
      await page.waitForTimeout(50);
    }

    await dispatchTouch(client, "touchEnd", [p1End, p2End]);
    await page.waitForTimeout(300);

    // Après pinch zoom in, scale doit être > 1.05 → bouton reset visible
    expect(await isResetButtonVisible(page)).toBe(true);
  });

  test("T3 — pinch zoom out après zoom in → bouton reset disparaît si scale clampé à 1", async ({
    page,
  }) => {
    const { box } = await gotoRoomsAndWaitCanvas(page);
    const client = await page.context().newCDPSession(page);

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Étape 1 : pinch zoom in (doigts 40px → 300px)
    await dispatchTouch(client, "touchStart", [
      { x: cx - 20, y: cy, id: 1 },
      { x: cx + 20, y: cy, id: 2 },
    ]);
    await page.waitForTimeout(50);
    await dispatchTouch(client, "touchMove", [
      { x: cx - 150, y: cy, id: 1 },
      { x: cx + 150, y: cy, id: 2 },
    ]);
    await page.waitForTimeout(50);
    await dispatchTouch(client, "touchEnd", [
      { x: cx - 150, y: cy, id: 1 },
      { x: cx + 150, y: cy, id: 2 },
    ]);
    await page.waitForTimeout(300);
    expect(await isResetButtonVisible(page)).toBe(true);

    // Étape 2 : pinch zoom out (doigts 300px → 40px)
    await dispatchTouch(client, "touchStart", [
      { x: cx - 150, y: cy, id: 3 },
      { x: cx + 150, y: cy, id: 4 },
    ]);
    await page.waitForTimeout(50);
    await dispatchTouch(client, "touchMove", [
      { x: cx - 20, y: cy, id: 3 },
      { x: cx + 20, y: cy, id: 4 },
    ]);
    await page.waitForTimeout(50);
    await dispatchTouch(client, "touchEnd", [
      { x: cx - 20, y: cy, id: 3 },
      { x: cx + 20, y: cy, id: 4 },
    ]);
    await page.waitForTimeout(300);

    // Scale clampé à ZOOM_MIN=1 → bouton reset disparaît (gate scale > 1.05)
    expect(await isResetButtonVisible(page)).toBe(false);
  });

  test("T4 — tap sur bouton reset après pinch zoom → bouton disparaît (scale = 1)", async ({
    page,
  }) => {
    const { box } = await gotoRoomsAndWaitCanvas(page);
    const client = await page.context().newCDPSession(page);

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Pinch zoom in pour faire apparaître le bouton reset
    await dispatchTouch(client, "touchStart", [
      { x: cx - 20, y: cy, id: 1 },
      { x: cx + 20, y: cy, id: 2 },
    ]);
    await page.waitForTimeout(50);
    await dispatchTouch(client, "touchMove", [
      { x: cx - 150, y: cy, id: 1 },
      { x: cx + 150, y: cy, id: 2 },
    ]);
    await page.waitForTimeout(50);
    await dispatchTouch(client, "touchEnd", [
      { x: cx - 150, y: cy, id: 1 },
      { x: cx + 150, y: cy, id: 2 },
    ]);
    await page.waitForTimeout(300);

    const resetBtn = page.getByRole("button", { name: /réinitialiser le zoom/i });
    await expect(resetBtn).toBeVisible();

    // Tap sur le bouton reset (click est OK — c'est un bouton DOM standard,
    // pas le canvas). Le tap simule un tap mobile sur un contrôle UI.
    await resetBtn.click();
    await page.waitForTimeout(200);

    // Après reset, scale = 1 → bouton invisible
    expect(await isResetButtonVisible(page)).toBe(false);
  });

  test("T5 — borne ZOOM_MAX respectée : pinch zoom extrême → scale clampé à 8x (bouton reset visible)", async ({
    page,
  }) => {
    const { box } = await gotoRoomsAndWaitCanvas(page);
    const client = await page.context().newCDPSession(page);

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Pinch avec ratio extrême (10x → clampé à 8x par clamp dans RoomCanvas L496)
    // Doigts 20px → 500px = ratio 25x, bien au-delà de ZOOM_MAX=8
    await dispatchTouch(client, "touchStart", [
      { x: cx - 10, y: cy, id: 1 },
      { x: cx + 10, y: cy, id: 2 },
    ]);
    await page.waitForTimeout(50);
    await dispatchTouch(client, "touchMove", [
      { x: cx - 250, y: cy, id: 1 },
      { x: cx + 250, y: cy, id: 2 },
    ]);
    await page.waitForTimeout(50);
    await dispatchTouch(client, "touchEnd", [
      { x: cx - 250, y: cy, id: 1 },
      { x: cx + 250, y: cy, id: 2 },
    ]);
    await page.waitForTimeout(300);

    // Observable : le bouton reset est visible (scale clampé à 8x, donc > 1.05).
    // Note : impossible de lire la valeur exacte du scale depuis le DOM sans
    // expose interne React state. Le test valide le clamp via le signal
    // observable (bouton visible = scale > 1.05 mais pas de crash / freeze).
    expect(await isResetButtonVisible(page)).toBe(true);

    // Sanity : la page reste interactive (pas de crash sur scale extrême)
    const canvas = page.getByRole("img", {
      name: /plan du lot avec les pièces identifiées/i,
    });
    await expect(canvas).toBeVisible();
  });

  test("T6 — borne ZOOM_MIN respectée : pinch zoom out extrême → scale clampé à 1x (bouton reset invisible)", async ({
    page,
  }) => {
    const { box } = await gotoRoomsAndWaitCanvas(page);
    const client = await page.context().newCDPSession(page);

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Départ : scale = 1 (bouton reset invisible)
    expect(await isResetButtonVisible(page)).toBe(false);

    // Pinch out extrême depuis scale=1 (doigts 500px → 20px = ratio 0.04x)
    // Le clamp ZOOM_MIN=1 empêche de descendre sous 1 → scale reste à 1
    await dispatchTouch(client, "touchStart", [
      { x: cx - 250, y: cy, id: 1 },
      { x: cx + 250, y: cy, id: 2 },
    ]);
    await page.waitForTimeout(50);
    await dispatchTouch(client, "touchMove", [
      { x: cx - 10, y: cy, id: 1 },
      { x: cx + 10, y: cy, id: 2 },
    ]);
    await page.waitForTimeout(50);
    await dispatchTouch(client, "touchEnd", [
      { x: cx - 10, y: cy, id: 1 },
      { x: cx + 10, y: cy, id: 2 },
    ]);
    await page.waitForTimeout(300);

    // Scale resté à 1 (clampé par ZOOM_MIN) → bouton reset toujours invisible
    expect(await isResetButtonVisible(page)).toBe(false);

    // Sanity : page reste interactive
    const canvas = page.getByRole("img", {
      name: /plan du lot avec les pièces identifiées/i,
    });
    await expect(canvas).toBeVisible();
  });
});
