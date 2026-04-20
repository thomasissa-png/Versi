import { chromium } from 'playwright';

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812, label: 'iPhone 13 (375px)' },
  { name: 'tablet', width: 768, height: 1024, label: 'iPad (768px)' },
  { name: 'desktop', width: 1280, height: 900, label: 'Desktop (1280px)' },
];

const SECTIONS = [
  { id: 'hero', label: 'Hero' },
  { id: 'mission', label: 'Mission' },
  { id: 'activites', label: 'Activities' },
  { id: 'approche', label: 'Approach' },
  { id: 'implantation', label: 'Location' },
  { id: 'equipe', label: 'Team' },
  { id: 'contact', label: 'Contact' },
];

async function capture() {
  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Scroll through each section to trigger IntersectionObserver
    for (const section of SECTIONS) {
      await page.evaluate((id) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'instant' });
      }, section.id);
      await page.waitForTimeout(600);
    }

    // Scroll back to top for full page screenshot
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // Full page screenshot
    await page.screenshot({
      path: `tests/screenshots/${vp.name}-full.png`,
      fullPage: true,
    });
    console.log(`${vp.label} — full page captured`);

    // Section screenshots
    for (const section of SECTIONS) {
      await page.evaluate((id) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'instant' });
      }, section.id);
      await page.waitForTimeout(300);

      const el = await page.$(`#${section.id}`);
      if (el) {
        await el.screenshot({
          path: `tests/screenshots/${vp.name}-${section.id}.png`,
        });
        console.log(`  ${vp.label} — ${section.label} captured`);
      }
    }

    await context.close();
  }

  await browser.close();
  console.log('\nDone — all screenshots captured.');
}

capture().catch(console.error);
