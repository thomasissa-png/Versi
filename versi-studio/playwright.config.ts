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
    // Mobile project ajouté s23 P3 pour les tests touch/pinch (RoomCanvas).
    // Scope strict : uniquement les specs `s23-touch-pinch-*.spec.ts`. Les
    // autres specs (visual baselines, workflow, upload, etc.) restent sur
    // Desktop Chrome — les baselines existantes ne sont PAS renommées.
    // Filtrage via `testMatch` pour éviter de dupliquer tous les tests.
    //
    // iPhone 13 (WebKit) n'est PAS inclus : la suite s23 utilise `CDPSession`
    // pour dispatcher des événements multi-touch (`Input.dispatchTouchEvent`),
    // et CDP est Chromium-only. Pour couvrir Safari mobile, migration Appium
    // ou équivalent à prévoir en s24+.
    {
      name: "Pixel 7",
      use: { ...devices["Pixel 7"], hasTouch: true },
      testMatch: /s23-touch-pinch-.*\.spec\.ts$/,
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
