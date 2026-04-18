/**
 * Playwright Configuration — Versi Studio
 *
 * Tests E2E pour l'application Versi Studio (Next.js 16).
 * Le serveur Next.js est lance automatiquement sur le port 5000 (aligné
 * sur `package.json` script `dev` — convention Replit — learning versi-s21 L205).
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

  // G26 strict — baselines visuelles dans tests/screenshots/{arg}{ext}
  // Playwright 1.59 exige `{ext}` explicite : sans lui, l'extension .png est
  // strippée de `{arg}` → erreur "must have '.png' extension". Les slashes dans
  // `{arg}` sont transformés en `-` par le moteur Playwright (baseline à plat).
  // Les anciennes baselines dans `tests/screenshots/{rooms,upload,lots}/*.png`
  // nécessitent une migration séparée (voir docs/qa/s22-tests-e2e-non-regression.md).
  snapshotPathTemplate: "tests/screenshots/{arg}{ext}",

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
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:5000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    cwd: ".",
  },
});
