import { test } from "@playwright/test";

test("Étape 3 P00 v2 prompt — screenshot visuel", async ({ page }) => {
  const projectId = "4e3e321f-0e2c-4e92-aa7c-1cd33be15c0e";
  const url = `http://localhost:5000/vs/projects/${projectId}/rooms`;

  await page.goto(url);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2500);

  await page.screenshot({ path: "/tmp/etape3-v2-initial.png", fullPage: true });
  console.log("Screenshot : /tmp/etape3-v2-initial.png");

  // Canvas zoom only
  const canvas = page.locator("canvas").first();
  await canvas.waitFor({ state: "visible", timeout: 5000 });
  const box = await canvas.boundingBox();
  if (box) {
    await page.screenshot({
      path: "/tmp/etape3-v2-canvas.png",
      clip: { x: box.x, y: box.y, width: box.width, height: box.height },
    });
    console.log("Canvas crop : /tmp/etape3-v2-canvas.png");
  }
});
