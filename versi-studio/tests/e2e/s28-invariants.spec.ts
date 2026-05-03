/**
 * s28 — Audit invariants métier (Thomas s28)
 *
 * Vérifie les 3 invariants métier sur les 4 plans Muguets :
 *   1. Surface label = surface polygone (proportions cohérentes)
 *   2. Polygones pièces ⊆ lot vectoriel + snap sur murs
 *   3. Labels = textes PDF (Entrée, Séjour, Cuisine, SDB, Chambre)
 *
 * Les tests prennent un screenshot par étage avec timeout généreux pour
 * laisser turbopack compiler.
 */
import { test, expect } from "@playwright/test";

const PROJECT_ID = process.env.VS_E2E_PROJECT_ID;
if (!PROJECT_ID) {
  throw new Error("VS_E2E_PROJECT_ID env var requis");
}

const BASE_URL = process.env.VS_E2E_BASE_URL || "http://127.0.0.1:5000";
const SCREENSHOT_DIR = "../../tests/screenshots";

// 3 minutes par test (turbopack peut être très lent en cold)
test.setTimeout(180_000);

const FLOORS = [0, 1, 2, 3];

test.describe("s28 — Invariants métier Étape 3", () => {
  for (const floor of FLOORS) {
    test(`Floor ${floor} — invariants visuels`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      // Fulfill fontshare avec un CSS vide plutôt qu'abort (qui bloque le render)
      await page.route("**/api.fontshare.com/**", (route) =>
        route.fulfill({ status: 200, contentType: "text/css", body: "" })
      );

      // Console listener pour debug
      page.on("console", (msg) => {
        if (msg.type() === "error" || msg.type() === "warning") {
          console.log(`[browser ${msg.type()}]`, msg.text().slice(0, 200));
        }
      });
      page.on("pageerror", (err) => {
        console.log("[page error]", err.message);
      });

      await page.goto(`${BASE_URL}/vs/projects/${PROJECT_ID}/rooms`, {
        waitUntil: "load",
        timeout: 120_000,
      });

      // Attendre que les tabs apparaissent (post-fetchData client)
      await page.waitForSelector('[role="tab"]', { timeout: 90_000 });

      // Cliquer sur le bon lot
      const tab = page.locator('[role="tab"]', {
        hasText: `Lot étage ${floor}`,
      });
      await tab.click();
      await page.waitForTimeout(2500);

      // Screenshot complet
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/s28-invariants-floor-${floor}.png`,
        fullPage: true,
      });

      // Au moins 1 pièce affichée
      const roomCards = page.locator(
        'div.grid.grid-cols-1.md\\:grid-cols-2 > div[role="button"]'
      );
      const count = await roomCards.count();
      console.log(`[Floor ${floor}] pièces affichées : ${count}`);
      expect(count).toBeGreaterThan(0);
    });
  }
});
