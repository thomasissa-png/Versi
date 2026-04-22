import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const PROD_URL = 'https://versi-studio.replit.app';
const DIR = '/home/user/Versi/docs/screenshots/s25/tour2';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const logs: string[] = [];
  page.on('console', (m) => logs.push(`[c.${m.type()}] ${m.text()}`));

  try {
    await page.goto(`${PROD_URL}/vs`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.locator('text=10 Rue des Muguets').first().click();
    await page.waitForTimeout(5000);
    const projectId = page.url().match(/\/vs\/projects\/([a-zA-Z0-9-]+)/)![1];
    await page.goto(`${PROD_URL}/vs/projects/${projectId}/lots`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(10000);

    // Listing de tous les boutons visibles
    const allBtns = await page.locator('button').all();
    const btnTexts: string[] = [];
    for (const b of allBtns) {
      const t = await b.innerText().catch(() => '');
      const vis = await b.isVisible().catch(() => false);
      if (vis && t.trim()) btnTexts.push(t.trim().substring(0, 60));
    }
    logs.push(`BUTTONS visibles (${btnTexts.length}):\n${btnTexts.join('\n')}`);

    // Test regex Recalibrer insensible casse et sans anchor
    const recal = page.getByRole('button', { name: /recalibrer/i });
    const count = await recal.count();
    logs.push(`recal (non-strict) count=${count}`);
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const vis = await recal.nth(i).isVisible().catch(() => false);
        const txt = await recal.nth(i).innerText().catch(() => '');
        logs.push(`  [${i}] visible=${vis} text="${txt}"`);
      }
      // Clique le premier visible
      const first = recal.first();
      await first.scrollIntoViewIfNeeded();
      await first.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(DIR, '42-modale-opened.png'), fullPage: true });

      // Check modale state
      const dialog = await page.locator('[role="dialog"]').count();
      const overlay = await page.locator('div[data-state="open"]').count();
      const fixedOverlay = await page.locator('.fixed, [class*="modal" i]').count();
      const modalText = await page.locator('text=/Calibration|calibrer le plan|cote|mesure|segment|Tracez|tracer/i').count();
      logs.push(`APRES CLIC: dialog=${dialog} overlayOpen=${overlay} fixed=${fixedOverlay} modalText=${modalText}`);

      fs.writeFileSync(path.join(DIR, 'e-result.json'), JSON.stringify({
        count, dialog, overlay, fixedOverlay, modalText,
        modalOK: dialog > 0 || overlay > 0 || modalText > 0,
      }, null, 2));
    }
    fs.writeFileSync(path.join(DIR, 'console-2d.log'), logs.join('\n'));
  } catch (e) {
    logs.push(`FATAL ${(e as Error).message}`);
    fs.writeFileSync(path.join(DIR, 'console-2d.log'), logs.join('\n'));
  } finally {
    await browser.close();
  }
}
main();
