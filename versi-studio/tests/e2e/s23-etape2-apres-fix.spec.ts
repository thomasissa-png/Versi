import { test } from "@playwright/test";

test("Étape 2 après fix envelope", async ({ page }) => {
  const projectId = "00fab566-8166-47fb-ae00-94e1c6ff77ad";
  await page.goto(`http://localhost:5000/vs/projects/${projectId}/lots`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "/tmp/etape2-apres-fix-envelope.png", fullPage: true });
  console.log("Saved /tmp/etape2-apres-fix-envelope.png");
});
