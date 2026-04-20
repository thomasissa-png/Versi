import { test } from "@playwright/test";

const PROJECT_ID = "433b0088-144f-4248-875f-268888aac840";
const SUFFIX = process.env.SUFFIX ?? "after";

test("s23 desync — canvas Étape 3 initial + sélection Séjour", async ({ page }) => {
  test.setTimeout(60_000);
  // Viewport plus haut pour que tout le canvas soit visible
  await page.setViewportSize({ width: 1400, height: 1400 });

  await page.goto(`http://localhost:5000/vs/projects/${PROJECT_ID}/rooms`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  const canvas = page.locator('canvas[aria-label*="Plan du lot"]').first();
  await canvas.waitFor({ state: "visible", timeout: 5000 });
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error("Canvas introuvable");
  }

  // Screenshot initial (pas de sélection)
  await page.screenshot({
    path: `/tmp/canvas-initial-${SUFFIX}.png`,
    clip: { x: box.x, y: box.y, width: box.width, height: box.height },
  });

  // Clic sur Séjour (en haut à droite du plan)
  const clickX = box.x + box.width * 0.72;
  const clickY = box.y + box.height * 0.35;
  console.log(`[info] canvas box=${JSON.stringify(box)} clic=(${clickX},${clickY})`);
  await page.mouse.click(clickX, clickY);
  await page.waitForTimeout(1200);

  // Screenshot canvas après clic
  await page.screenshot({
    path: `/tmp/canvas-sejour-${SUFFIX}.png`,
    clip: { x: box.x, y: box.y, width: box.width, height: box.height },
  });
  console.log(`[ok] /tmp/canvas-initial-${SUFFIX}.png + /tmp/canvas-sejour-${SUFFIX}.png`);
});
