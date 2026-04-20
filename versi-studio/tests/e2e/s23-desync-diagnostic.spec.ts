import { test } from "@playwright/test";

// s23 desync diag — Projet créé via API avant le run
const PROJECT_ID = "433b0088-144f-4248-875f-268888aac840";
const SUFFIX = process.env.SUFFIX ?? "before";

test("s23 desync — Étape 2 + Étape 3 initial + clic Séjour", async ({ page }) => {
  test.setTimeout(90_000);

  // Étape 2 — Lots
  await page.goto(`http://localhost:5000/vs/projects/${PROJECT_ID}/lots`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `/tmp/etape2-${SUFFIX}.png`, fullPage: true });

  // Étape 3 — Rooms
  await page.goto(`http://localhost:5000/vs/projects/${PROJECT_ID}/rooms`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `/tmp/etape3-initial-${SUFFIX}.png`, fullPage: true });

  // Clic direct sur le RoomCanvas (aria-label "Plan du lot avec les pièces")
  const canvas = page.locator('canvas[aria-label*="Plan du lot"]').first();
  const box = await canvas.boundingBox();
  if (box) {
    const clickX = box.x + box.width * 0.72;
    const clickY = box.y + box.height * 0.45;
    console.log(`[info] canvas box=${JSON.stringify(box)} clic=(${clickX},${clickY})`);
    await page.mouse.click(clickX, clickY);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `/tmp/etape3-sejour-${SUFFIX}.png`, fullPage: true });
    // Screenshot zoomé sur le canvas uniquement
    await page.screenshot({
      path: `/tmp/etape3-sejour-canvas-${SUFFIX}.png`,
      clip: { x: box.x, y: box.y, width: box.width, height: box.height },
    });
    console.log(`[ok] canvas cliqué — /tmp/etape3-sejour-${SUFFIX}.png + canvas`);
  } else {
    console.log("[warn] RoomCanvas introuvable");
  }
});
