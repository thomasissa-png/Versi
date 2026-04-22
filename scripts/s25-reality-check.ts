/**
 * s25 Reality check UI prod Replit - v2
 */
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const PROD_URL = 'https://versi-studio.replit.app';
const SCREENSHOTS_DIR = '/home/user/Versi/docs/screenshots/s25';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  const logs: string[] = [];
  page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => logs.push(`[PAGEERROR] ${err.message}`));
  page.on('response', (resp) => {
    if (resp.status() >= 400) logs.push(`[HTTP ${resp.status()}] ${resp.url()}`);
  });

  console.log('Step 1: Homepage /vs');
  await page.goto(`${PROD_URL}/vs`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Click on the "10 Rue des Muguets" card
  console.log('Step 2: Click project card');
  const card = page.locator('text=10 Rue des Muguets').first();
  await card.click();
  await page.waitForTimeout(5000);
  const currentUrl = page.url();
  console.log(`Landed on: ${currentUrl}`);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, '02-project-home.png'),
    fullPage: true,
  });

  // Extract projectId from URL
  const match = currentUrl.match(/\/vs\/projects\/([a-zA-Z0-9-]+)/);
  const projectId = match ? match[1] : null;
  console.log(`Project ID: ${projectId}`);

  if (!projectId) {
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'status.txt'), `NO_PROJECT_ID\nurl=${currentUrl}`);
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'console.log'), logs.join('\n'));
    await browser.close();
    return;
  }

  // Navigate to /lots (Étape 2)
  console.log('Step 3: /lots');
  await page.goto(`${PROD_URL}/vs/projects/${projectId}/lots`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page.waitForTimeout(8000); // wait for canvas render + IA call
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, '03-lots-step2-full.png'),
    fullPage: true,
  });
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, '03b-lots-step2-viewport.png'),
    fullPage: false,
  });

  // Try to get canvas bounding box screenshot
  const canvasStep2 = page.locator('canvas').first();
  if (await canvasStep2.count() > 0) {
    try {
      await canvasStep2.screenshot({
        path: path.join(SCREENSHOTS_DIR, '03c-lots-canvas-only.png'),
      });
    } catch (e) {
      logs.push(`[CANVAS-STEP2-ERR] ${(e as Error).message}`);
    }
  }

  // Navigate to /rooms (Étape 3)
  console.log('Step 4: /rooms');
  await page.goto(`${PROD_URL}/vs/projects/${projectId}/rooms`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page.waitForTimeout(10000); // rooms takes longer (IA)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, '04-rooms-step3-full.png'),
    fullPage: true,
  });
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, '04b-rooms-step3-viewport.png'),
    fullPage: false,
  });

  const canvasStep3 = page.locator('canvas').first();
  if (await canvasStep3.count() > 0) {
    try {
      await canvasStep3.screenshot({
        path: path.join(SCREENSHOTS_DIR, '04c-rooms-canvas-only.png'),
      });
    } catch (e) {
      logs.push(`[CANVAS-STEP3-ERR] ${(e as Error).message}`);
    }
  }

  fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'console.log'), logs.join('\n'));
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'status.txt'), `OK\nproject=${projectId}\nurl=${currentUrl}`);

  await browser.close();
  console.log('Done');
}

main().catch((err) => {
  console.error('FATAL', err);
  fs.writeFileSync(
    path.join(SCREENSHOTS_DIR, 'status.txt'),
    `ERROR\n${err.message}\n${err.stack}`,
  );
  process.exit(1);
});
