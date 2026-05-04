/**
 * Playwright Configuration — Versi Studio
 *
 * Tests E2E pour l'application Versi Studio (Next.js 16).
 * Le serveur Next.js est lance automatiquement sur le port 3000.
 * Les APIs IA (OpenAI) sont mockees dans les tests via route interception.
 * Les APIs DB (PostgreSQL) sont mockees via route interception (pas de DB en CI).
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "html",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },

  // G26 strict — baselines visuelles dans tests/screenshots/{arg}
  // Permet à `await expect(page).toHaveScreenshot("upload/desktop-default.png")`
  // de résoudre le baseline en `tests/screenshots/upload/desktop-default.png`.
  snapshotPathTemplate: "tests/screenshots/{arg}",

  use: {
    baseURL: "http://localhost:5000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "fr-FR",
  },

  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    // ─── Matrice s30 — Étape 4 v2 (visuals-step-v2-*.spec.ts) ──────────
    // Pattern s28 : tester device réel, pas juste viewport.
    // Mobile Safari et Mobile Chrome divergent sur events touch.
    {
      name: "desktop-chrome",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: /visuals-step-v2-.*\.spec\.ts/,
    },
    {
      name: "tablet-ipad",
      use: {
        ...devices["iPad (gen 7)"],
        hasTouch: true,
      },
      testMatch: /visuals-step-v2-.*\.spec\.ts/,
    },
    {
      name: "mobile-iphone",
      use: {
        ...devices["iPhone 13"],
        hasTouch: true,
        isMobile: true,
      },
      testMatch: /visuals-step-v2-.*\.spec\.ts/,
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:5000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    cwd: ".",
  },
});
