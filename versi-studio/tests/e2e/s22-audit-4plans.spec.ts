/**
 * S22 — Audit final : screenshots Etape 3 sur les 4 plans P00-P03
 *
 * Pour chaque plan : naviguer vers la page rooms, attendre le canvas,
 * prendre un screenshot pleine page.
 */

import { test } from "@playwright/test";

const SCREENSHOT_DIR = "/home/user/Versi/docs/screenshots/s22";

const TEST_PROJECTS = [
  { id: "63ad6de2-9df8-4acd-b4df-5e1889c03a18", name: "P00" },
  { id: "db1aab68-3e43-4951-a261-da43fff7620a", name: "P01" },
  { id: "caf5737b-624c-4c5e-9ecd-42a13ad9d429", name: "P02" },
  { id: "e3a789cf-aa24-4eb1-96f5-cdf2bccac1c3", name: "P03" },
];

for (const project of TEST_PROJECTS) {
  test(`Audit ${project.name} — screenshot Etape 3`, async ({ page }) => {
    await page.goto(`/vs/projects/${project.id}/rooms`);
    await page.waitForSelector("canvas", { timeout: 15_000 });
    // Attendre le chargement de l'image du plan
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/etape3-audit-${project.name}.png`,
      fullPage: false,
    });
  });
}
