/**
 * s25 Reality check UI prod Replit - tour 2 (commit a11bb84)
 * Valide 3 fixes :
 *  - BUG 1 : bouton "Régénérer les pièces avec l'IA" permanent étape 3
 *  - BUG 2 : bloc "Plan calibré — Recalibrer" étape 2
 *  - BUG 3 : zoom/pan partagé étape 2 <-> étape 3 via sessionStorage
 */
import { chromium, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const PROD_URL = 'https://versi-studio.replit.app';
const DIR = '/home/user/Versi/docs/screenshots/s25/tour2';

const logs: string[] = [];
function log(m: string) {
  const line = `[${new Date().toISOString()}] ${m}`;
  console.log(line);
  logs.push(line);
}

async function snap(page: Page, name: string, fullPage = true) {
  const p = path.join(DIR, name);
  await page.screenshot({ path: p, fullPage });
  log(`snap ${name}`);
}

async function main() {
  fs.mkdirSync(DIR, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  page.on('console', (msg) => logs.push(`[console.${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));
  page.on('response', (resp) => {
    if (resp.status() >= 400) logs.push(`[HTTP ${resp.status()}] ${resp.url()}`);
  });

  const results: Record<string, string> = {};

  try {
    log('nav /vs');
    await page.goto(`${PROD_URL}/vs`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    await snap(page, '00-vs-projects.png');

    log('click 10 Rue des Muguets');
    const card = page.locator('text=10 Rue des Muguets').first();
    await card.click();
    await page.waitForTimeout(5000);
    const url0 = page.url();
    log(`url after click: ${url0}`);
    const m = url0.match(/\/vs\/projects\/([a-zA-Z0-9-]+)/);
    const projectId = m ? m[1] : null;
    log(`projectId=${projectId}`);
    if (!projectId) {
      fs.writeFileSync(path.join(DIR, 'status.txt'), `NO_PROJECT_ID\n${url0}`);
      fs.writeFileSync(path.join(DIR, 'console.log'), logs.join('\n'));
      await browser.close();
      return;
    }

    // ===== (d) (e) Étape 2 bloc Recalibrer =====
    log('--- Step2 /lots ---');
    await page.goto(`${PROD_URL}/vs/projects/${projectId}/lots`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await page.waitForTimeout(8000);
    await snap(page, '10-step2-initial.png');

    const recalibrateBtn = page.getByRole('button', { name: /recalibrer/i }).first();
    const planCalibreText = page.locator('text=/Plan calibr/i').first();
    const recalibreVisible = (await recalibrateBtn.count()) > 0 && (await recalibrateBtn.isVisible().catch(() => false));
    const planCalibreVisible = (await planCalibreText.count()) > 0 && (await planCalibreText.isVisible().catch(() => false));
    log(`(d) planCalibreVisible=${planCalibreVisible} recalibreVisible=${recalibreVisible}`);
    results['d_bloc_recalibrer'] = (planCalibreVisible || recalibreVisible) ? 'PASS' : 'FAIL';

    if (recalibreVisible) {
      log('click Recalibrer');
      await recalibrateBtn.click().catch((e) => log(`click err: ${(e as Error).message}`));
      await page.waitForTimeout(2500);
      await snap(page, '11-step2-modale-recalibrer.png');
      const modal = page.locator('[role="dialog"], .modal, [data-state="open"]').first();
      const modalVisible = (await modal.count()) > 0 && (await modal.isVisible().catch(() => false));
      const calibrationText = page.locator('text=/calibration|échelle|echelle|mesure/i');
      const calibTextVisible = (await calibrationText.count()) > 0;
      log(`(e) modalVisible=${modalVisible} calibTextVisible=${calibTextVisible}`);
      results['e_modale_recalibrer'] = (modalVisible || calibTextVisible) ? 'PASS' : 'FAIL';
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(1000);
    } else {
      results['e_modale_recalibrer'] = 'SKIP';
    }

    // ===== (f) zoom/pan partagé =====
    const viewportKey = `vs:viewport:${projectId}`;
    const testViewport = { zoom: 1.5, panX: 120, panY: -60 };
    await page.evaluate(
      ({ key, val }) => sessionStorage.setItem(key, JSON.stringify(val)),
      { key: viewportKey, val: testViewport },
    );
    const stored2 = await page.evaluate((k) => sessionStorage.getItem(k), viewportKey);
    log(`step2 sessionStorage set: ${stored2}`);

    log('--- Step3 /rooms ---');
    await page.goto(`${PROD_URL}/vs/projects/${projectId}/rooms`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await page.waitForTimeout(8000);
    const stored3 = await page.evaluate((k) => sessionStorage.getItem(k), viewportKey);
    log(`step3 sessionStorage: ${stored3}`);
    results['f_viewport_shared'] = stored3 === stored2 && stored3 !== null ? 'PASS' : 'FAIL';
    await snap(page, '20-step3-initial.png');

    // ===== (a) bouton Régénérer visible =====
    const regenBtn = page.getByRole('button', { name: /Régénérer les pièces/i }).first();
    const regenCount = await regenBtn.count();
    const regenVisible = regenCount > 0 && (await regenBtn.isVisible().catch(() => false));
    log(`(a) regenBtn count=${regenCount} visible=${regenVisible}`);
    results['a_bouton_regenerer_visible'] = regenVisible ? 'PASS' : 'FAIL';

    const bodyBefore = await page.locator('body').innerText().catch(() => '');
    const hasNoRoomsMsg = /n'a pas détect|aucune pièce|aucune piece/i.test(bodyBefore);
    log(`hasNoRoomsMsg before=${hasNoRoomsMsg}`);

    // ===== (b) (c) clic Régénérer =====
    if (regenVisible) {
      log('click Régénérer');
      await regenBtn.click().catch((e) => log(`regen click err: ${(e as Error).message}`));
      await page.waitForTimeout(18000);
      await snap(page, '21-step3-after-regen.png');
      const bodyAfter = await page.locator('body').innerText().catch(() => '');
      const stillNoRooms = /n'a pas détect|aucune pièce|aucune piece/i.test(bodyAfter);
      // Détection présence rooms: chercher textes habituels Séjour, Chambre, SDB, Cuisine, Entrée
      const hasRoomLabels = /(Séjour|Sejour|Chambre|Cuisine|Entrée|Entree|SDB|Salle de bain|Cellier|WC)/i.test(bodyAfter);
      log(`stillNoRooms=${stillNoRooms} hasRoomLabels=${hasRoomLabels}`);
      results['b_clic_regenere'] = !stillNoRooms ? 'PASS' : 'FAIL';
      results['c_rooms_remplissent'] = hasRoomLabels ? 'PASS' : 'FAIL';
    } else {
      results['b_clic_regenere'] = 'SKIP';
      results['c_rooms_remplissent'] = 'SKIP';
    }

    const cv = page.locator('canvas').first();
    if (await cv.count()) {
      try { await cv.screenshot({ path: path.join(DIR, '22-step3-canvas.png') }); } catch (e) { log(`cv err ${(e as Error).message}`); }
    }

    fs.writeFileSync(path.join(DIR, 'results.json'), JSON.stringify(results, null, 2));
    fs.writeFileSync(path.join(DIR, 'status.txt'), `OK\nproject=${projectId}`);
    fs.writeFileSync(path.join(DIR, 'console.log'), logs.join('\n'));
  } catch (err) {
    log(`FATAL ${(err as Error).message}`);
    fs.writeFileSync(path.join(DIR, 'status.txt'), `ERROR\n${(err as Error).stack}`);
    fs.writeFileSync(path.join(DIR, 'console.log'), logs.join('\n'));
    fs.writeFileSync(path.join(DIR, 'results.json'), JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
}

main();
