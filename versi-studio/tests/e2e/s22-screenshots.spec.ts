/**
 * Screenshots de validation — Session s22
 * Transformations structurelles Etape 4
 */
import { test } from "@playwright/test";

const PROJECT_URL =
  "http://localhost:5000/vs/projects/63ad6de2-9df8-4acd-b4df-5e1889c03a18/visuals";

const SCREENSHOT_DIR = "../docs/screenshots/s22";

test("Etape 4 — page visuels avec micro-copy", async ({ page }) => {
  await page.goto(PROJECT_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/etape4-page-visuels.png`,
    fullPage: true,
  });
});

test("Etape 4 — clic sur premiere piece, textarea transformations visible", async ({
  page,
}) => {
  await page.goto(PROJECT_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // Cliquer sur la premiere piece disponible dans le panneau lateral
  const roomButton = page.locator('[data-testid="room-card"]').first();
  if (await roomButton.isVisible()) {
    await roomButton.click();
    await page.waitForTimeout(2000);
  } else {
    // Essayer un bouton dans la grille des pieces
    const anyRoomButton = page.locator("button").filter({ hasText: /salon|chambre|cuisine|séjour|salle/i }).first();
    if (await anyRoomButton.isVisible()) {
      await anyRoomButton.click();
      await page.waitForTimeout(2000);
    }
  }

  await page.screenshot({
    path: `${SCREENSHOT_DIR}/etape4-textarea-transformations.png`,
    fullPage: true,
  });
});

test("Etape 4 — piece Chambre: bouton Affiner le visuel visible", async ({
  page,
}) => {
  await page.goto(PROJECT_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // Cliquer sur la piece "Chambre" qui a deja un visuel genere
  const chambreButton = page.locator("button").filter({ hasText: /Chambre/i }).first();
  if (await chambreButton.isVisible()) {
    await chambreButton.click();
    await page.waitForTimeout(3000);
  }

  // Screenshot de la zone result avec bouton "Affiner le visuel"
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/etape4-affiner-le-visuel.png`,
    fullPage: true,
  });

  // Cliquer "Essayer un autre style" pour revenir a select-style (ou le textarea apparait)
  const autreStyleBtn = page.locator("button").filter({ hasText: /autre style/i }).first();
  if (await autreStyleBtn.isVisible()) {
    await autreStyleBtn.click();
    await page.waitForTimeout(2000);
  }

  // Maintenant on est en select-style avec le textarea visible
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/etape4-textarea-transformations-visible.png`,
    fullPage: true,
  });

  // Cliquer sur un badge exemple
  const badge = page.locator("button").filter({ hasText: /Supprimer un mur/ }).first();
  if (await badge.isVisible()) {
    await badge.click();
    await page.waitForTimeout(500);
  }

  await page.screenshot({
    path: `${SCREENSHOT_DIR}/etape4-badges-suggestions.png`,
    fullPage: true,
  });
});
