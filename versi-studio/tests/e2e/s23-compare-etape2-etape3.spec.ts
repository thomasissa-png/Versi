import { test } from "@playwright/test";

test("Compare Étape 2 vs Étape 3 sur même projet", async ({ page }) => {
  const projectId = "1c9193a1-2d7c-4764-bf85-99071c085ea6";

  // Étape 2 — Lots
  await page.goto(`http://localhost:5000/vs/projects/${projectId}/lots`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2500);
  const canvas2 = page.locator("canvas").first();
  await canvas2.waitFor({ state: "visible", timeout: 5000 });
  const box2 = await canvas2.boundingBox();
  if (box2) {
    await page.screenshot({
      path: "/tmp/compare-etape2.png",
      clip: { x: box2.x, y: box2.y, width: box2.width, height: box2.height },
    });
    console.log("Étape 2 canvas:", box2);
  }

  // Étape 3 — Rooms
  await page.goto(`http://localhost:5000/vs/projects/${projectId}/rooms`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2500);
  const canvas3 = page.locator("canvas").first();
  await canvas3.waitFor({ state: "visible", timeout: 5000 });
  const box3 = await canvas3.boundingBox();
  if (box3) {
    await page.screenshot({
      path: "/tmp/compare-etape3.png",
      clip: { x: box3.x, y: box3.y, width: box3.width, height: box3.height },
    });
    console.log("Étape 3 canvas:", box3);
  }

  console.log("Compare screenshots: /tmp/compare-etape2.png vs /tmp/compare-etape3.png");
});
