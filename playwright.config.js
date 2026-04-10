import { defineConfig, devices } from '@playwright/test';

const VERSI_FR_PORT = 5173;
const VERSI_IMMO_PORT = 5174;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // V1: Chromium only — no cross-browser requirement for showcase sites
    browserName: 'chromium',
  },
  projects: [
    {
      name: 'Desktop',
      use: {
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'Tablet',
      use: {
        // iPad dimensions but Chromium engine (not WebKit)
        viewport: { width: 810, height: 1080 },
        deviceScaleFactor: 2,
        isMobile: false,
        hasTouch: true,
      },
    },
    {
      name: 'Mobile',
      use: {
        // iPhone 13 dimensions but Chromium engine
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: [
    {
      command: 'cd src && npm run preview -- --port ' + VERSI_FR_PORT,
      port: VERSI_FR_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
    {
      command: 'cd versi-immobilier && npm run preview -- --port ' + VERSI_IMMO_PORT,
      port: VERSI_IMMO_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
  ],
});
