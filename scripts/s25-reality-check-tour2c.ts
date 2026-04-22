/**
 * s25 tour 2c - focus (e) : clic Recalibrer ouvre modale
 */
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const PROD_URL = 'https://versi-studio.replit.app';
const DIR = '/home/user/Versi/docs/screenshots/s25/tour2';
const logs: string[] = [];

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  page.on('console', (m) => logs.push(`[c.${m.type()}] ${m.text()}`));

  try {
    await page.goto(`${PROD_URL}/vs`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2500);
    await page.locator('text=10 Rue des Muguets').first().click();
    await page.waitForTimeout(4000);
    const projectId = page.url().match(/\/vs\/projects\/([a-zA-Z0-9-]+)/)![1];
    await page.goto(`${PROD_URL}/vs/projects/${projectId}/lots`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(8000);

    // Cliquer sur un lot pour activer affichage plan (sinon bandeau n'apparaît pas)
    const lotCards = page.locator('text=/Lot 1.*RDC/i');
    if (await lotCards.count()) {
      await lotCards.first().click();
      await page.waitForTimeout(2500);
    }

    // Trouver le bouton Recalibrer
    const recalBtn = page.getByRole('button', { name: /^recalibrer$/i }).first();
    const count = await recalBtn.count();
    const visible = count > 0 && await recalBtn.isVisible().catch(() => false);
    logs.push(`recal count=${count} visible=${visible}`);

    await page.screenshot({ path: path.join(DIR, '40-before-recalibrer-click.png'), fullPage: true });

    if (visible) {
      await recalBtn.click();
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(DIR, '41-after-recalibrer-click.png'), fullPage: true });
      // Rechercher indicateurs de modale ouverte
      const dialog = page.locator('[role="dialog"]');
      const dialogCount = await dialog.count();
      const modalOverlay = page.locator('[class*="modal" i], [class*="overlay" i]');
      const overlayCount = await modalOverlay.count();
      // Rechercher texte de modale calibration
      const calibText = page.locator('text=/PlanCalibration|Calibration|Entrez|mesure|segment|cm|mètres|meters/i');
      const calibCount = await calibText.count();
      logs.push(`dialog=${dialogCount} overlay=${overlayCount} calibText=${calibCount}`);
      const modalOK = dialogCount > 0 || overlayCount > 0 || calibCount > 0;
      logs.push(`MODAL_OPEN=${modalOK}`);
      fs.writeFileSync(path.join(DIR, 'e-result.json'), JSON.stringify({
        dialog: dialogCount, overlay: overlayCount, calibText: calibCount, modalOK,
      }, null, 2));
    }

    fs.writeFileSync(path.join(DIR, 'console-2c.log'), logs.join('\n'));
  } catch (err) {
    logs.push(`FATAL ${(err as Error).message}`);
    fs.writeFileSync(path.join(DIR, 'console-2c.log'), logs.join('\n'));
  } finally {
    await browser.close();
  }
}
main();
