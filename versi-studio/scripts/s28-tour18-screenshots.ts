/**
 * s28 tour 18 — Capture screenshots avec nom unique (bypass cache GitHub).
 *
 * Sortie : tests/screenshots/s28-tour18-floor-{0..3}.png
 */
import { chromium, type Browser, type Page } from "playwright";

const PROJECT_ID = process.env.VS_E2E_PROJECT_ID || process.argv[2];
if (!PROJECT_ID) {
  console.error("Usage: VS_E2E_PROJECT_ID=xxx tsx scripts/s28-tour18-screenshots.ts");
  process.exit(1);
}

const BASE_URL = "http://127.0.0.1:5000";
const SCREENSHOT_DIR = "/home/user/Versi/versi-studio/tests/screenshots";

async function captureFloor(page: Page, floor: number) {
  console.log(`\n[Floor ${floor}] navigation...`);
  await page.goto(`${BASE_URL}/vs/projects/${PROJECT_ID}/rooms`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForSelector('[role="tab"]', { timeout: 60_000 });
  const tab = page.locator('[role="tab"]', { hasText: `Lot étage ${floor}` });
  await tab.click();
  await page.waitForTimeout(4000);
  const path = `${SCREENSHOT_DIR}/s28-tour18-floor-${floor}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`[Floor ${floor}] screenshot saved: ${path}`);
}

async function main() {
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.route("**/api.fontshare.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/css", body: "" }),
    );
    const page = await context.newPage();
    page.on("pageerror", (err) => console.error("[browser pageerror]", err.message));
    console.log("[pre-warm] page rooms...");
    await page.goto(`${BASE_URL}/vs/projects/${PROJECT_ID}/rooms`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    try {
      await page.waitForSelector('[role="tab"]', { timeout: 60_000 });
    } catch {
      console.log("[pre-warm] timeout tabs (continue)");
    }
    for (const floor of [0, 1, 2, 3]) {
      try {
        await captureFloor(page, floor);
      } catch (e) {
        console.error(`[Floor ${floor}] erreur :`, e instanceof Error ? e.message : e);
      }
    }
  } finally {
    if (browser) await browser.close();
  }
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
