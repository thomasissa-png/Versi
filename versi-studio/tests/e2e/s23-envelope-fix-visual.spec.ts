import { test } from "@playwright/test";

test("Verif visuelle fix envelope lot Etape 3", async ({ page }) => {
  const projectId = "00fab566-8166-47fb-ae00-94e1c6ff77ad";

  await page.goto(`http://localhost:5000/vs/projects/${projectId}/rooms`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2500);
  const canvas = page.locator("canvas").first();
  await canvas.waitFor({ state: "visible", timeout: 5000 });
  const box = await canvas.boundingBox();
  if (box) {
    await page.screenshot({
      path: "/tmp/etape3-envelope-fixed.png",
      clip: { x: box.x, y: box.y, width: box.width, height: box.height },
    });
    console.log("Étape 3 fix envelope:", box);
  }
});
