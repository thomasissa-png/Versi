import { test } from "@playwright/test";

const PROJECT_ID = "433b0088-144f-4248-875f-268888aac840";

test("s23 pan Étape 3 — bornes 4 directions", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1400, height: 1400 });

  await page.goto(`http://localhost:5000/vs/projects/${PROJECT_ID}/rooms`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  const canvas = page.locator('canvas[aria-label*="Plan du lot"]').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas introuvable");

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // Pan vers la droite (ctrl+drag vers gauche = pan vers droite)
  await page.keyboard.down("Control");
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx - 500, cy, { steps: 20 });
  await page.mouse.up();
  await page.keyboard.up("Control");
  await page.waitForTimeout(500);
  await page.screenshot({
    path: "/tmp/pan-right.png",
    clip: { x: box.x, y: box.y, width: box.width, height: box.height },
  });

  // Pan vers la gauche
  await page.keyboard.down("Control");
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 800, cy, { steps: 20 });
  await page.mouse.up();
  await page.keyboard.up("Control");
  await page.waitForTimeout(500);
  await page.screenshot({
    path: "/tmp/pan-left.png",
    clip: { x: box.x, y: box.y, width: box.width, height: box.height },
  });

  console.log("[ok] /tmp/pan-right.png, /tmp/pan-left.png");
});
