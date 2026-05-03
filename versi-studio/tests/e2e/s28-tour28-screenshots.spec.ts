import { test } from "@playwright/test";

const PROJECT_ID = "ffa70ed7-acbd-4ffb-9ae6-f7a091893632";
const BASE_URL = "http://127.0.0.1:5000";
const FLOORS = [0, 1, 2, 3];
test.setTimeout(180_000);

for (const floor of FLOORS) {
  test(`floor ${floor}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.route("**/api.fontshare.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/css", body: "" })
    );
    await page.goto(`${BASE_URL}/vs/projects/${PROJECT_ID}/rooms`, {
      waitUntil: "load",
      timeout: 120_000,
    });
    await page.waitForTimeout(2500);
    // click on floor button
    const button = page.locator(`button:has-text("Lot étage ${floor}")`);
    if (await button.count() > 0) await button.first().click();
    await page.waitForTimeout(2500);
    await page.screenshot({
      path: `../../tests/screenshots/s28-tour28-floor-${floor}.png`,
      fullPage: true,
    });
  });
}
