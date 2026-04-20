import { test } from "@playwright/test";

const PROJECT_ID = "433b0088-144f-4248-875f-268888aac840";
const SUFFIX = process.env.SUFFIX ?? "after";

test("s23 zoom Séjour — handles visibles", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1400, height: 1400 });

  await page.goto(`http://localhost:5000/vs/projects/${PROJECT_ID}/rooms`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  const canvas = page.locator('canvas[aria-label*="Plan du lot"]').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas introuvable");

  // Clic sur Séjour
  const clickX = box.x + box.width * 0.72;
  const clickY = box.y + box.height * 0.35;
  await page.mouse.click(clickX, clickY);
  await page.waitForTimeout(1000);

  // Zoom molette à x2 (centre ~Séjour)
  for (let i = 0; i < 6; i++) {
    await page.mouse.move(clickX, clickY);
    await page.mouse.wheel(0, -200);
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(500);

  await page.screenshot({
    path: `/tmp/canvas-sejour-zoom-${SUFFIX}.png`,
    clip: { x: box.x, y: box.y, width: box.width, height: box.height },
  });
  console.log(`[ok] /tmp/canvas-sejour-zoom-${SUFFIX}.png`);
});
