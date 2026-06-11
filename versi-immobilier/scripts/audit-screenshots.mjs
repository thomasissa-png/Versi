// Capture des annonces Muguets — mobile + desktop, pleine page
import { chromium } from 'playwright';

const BASE = 'http://localhost:3001';
const OUT = '/tmp/audit-annonces';
const pages = [
  { id: 'muguets-lot-1-rdc', label: 'lot1' },
  { id: 'muguets-lot-2-t3', label: 'lot2' },
];
const viewports = [
  { name: 'mobile', width: 375, height: 812, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: 'desktop', width: 1280, height: 900, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
];

const browser = await chromium.launch();
for (const vp of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile,
    hasTouch: vp.hasTouch,
    deviceScaleFactor: vp.deviceScaleFactor,
  });
  const page = await ctx.newPage();
  for (const p of pages) {
    await page.goto(`${BASE}/nos-biens/${p.id}`, { waitUntil: 'networkidle' });
    // attendre le rendu des données (titre du bien)
    await page.waitForSelector('.property-detail__title', { timeout: 15000 });
    await page.waitForTimeout(1200); // fade-in + images
    await page.screenshot({ path: `${OUT}/${p.label}-${vp.name}-full.png`, fullPage: true });
    console.log(`OK ${p.label} ${vp.name}`);
  }
  await ctx.close();
}
await browser.close();
