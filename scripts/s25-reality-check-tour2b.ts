/**
 * s25 tour 2b - focus (d)(e)(f) : calibration manuelle + viewport partagé
 */
import { chromium, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const PROD_URL = 'https://versi-studio.replit.app';
const DIR = '/home/user/Versi/docs/screenshots/s25/tour2';
const logs: string[] = [];
const log = (m: string) => { const l = `[${new Date().toISOString()}] ${m}`; console.log(l); logs.push(l); };

async function snap(page: Page, name: string) {
  await page.screenshot({ path: path.join(DIR, name), fullPage: true });
  log(`snap ${name}`);
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  page.on('console', (m) => logs.push(`[c.${m.type()}] ${m.text()}`));

  const results: Record<string, string> = {};
  try {
    log('nav /vs');
    await page.goto(`${PROD_URL}/vs`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2500);
    await page.locator('text=10 Rue des Muguets').first().click();
    await page.waitForTimeout(4000);
    const url = page.url();
    const m = url.match(/\/vs\/projects\/([a-zA-Z0-9-]+)/);
    const projectId = m![1];
    log(`projectId=${projectId}`);

    // --- ÉTAPE 2 ---
    await page.goto(`${PROD_URL}/vs/projects/${projectId}/lots`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(6000);

    // Chercher bouton "Calibrer le plan" (plan pas calibré)
    const calibrerBtn = page.getByRole('button', { name: /^calibrer le plan$/i }).first();
    const calibrerVisible = (await calibrerBtn.count()) > 0;
    log(`calibrer btn visible=${calibrerVisible}`);

    if (calibrerVisible) {
      log('click Calibrer le plan');
      await calibrerBtn.click();
      await page.waitForTimeout(2500);
      await snap(page, '30-modale-calibration.png');

      // Modale doit afficher textes cote + mesure cm + mètres
      // Tenter remplir un input mètres (placeholder ou label)
      // Pattern: cliquer 2 points sur canvas puis entrer une valeur en mètres
      // Plus simple: écrire directement dans input numérique s'il y en a
      const numInputs = page.locator('input[type="number"]');
      const numCount = await numInputs.count();
      log(`num inputs in modale=${numCount}`);

      // Fermer la modale via Escape (on n'essaie pas de calibrer vraiment, scope: vérifier le trigger)
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1500);
    }

    // FORCER calibration côté DB via sessionStorage ? Non — on ne peut pas changer la DB.
    // On teste (d)(e) dans l'état NON calibré: le bloc "Plan calibré — Recalibrer" NE DOIT PAS être visible (condition m2PerPixel != null)
    // Donc le (d) FAIL initial est correct dans cet état. Vérifions la logique:
    // Le bloc permanent "Plan calibré — Recalibrer" est CONDITIONNEL à plan calibré.
    // Sur ce projet, plan PAS calibré → bloc absent → comportement ATTENDU.
    // Pour valider vraiment (d), il faudrait un projet avec plan calibré.

    // Inspecter le DOM pour voir si la bannière "Calibrez un plan" existe + bouton "Calibrer le plan"
    const bannerCalibrer = page.locator('text=/Calibrez un plan/i').first();
    const bannerVisible = (await bannerCalibrer.count()) > 0;
    log(`banner "Calibrez un plan"=${bannerVisible}`);
    results['plan_calibré_état'] = bannerVisible ? 'NOT_CALIBRATED (d)(e) not applicable' : 'CALIBRATED';

    // --- TEST (f) VIEWPORT ---
    // Étape 2 : lire la valeur sessionStorage (écrite par PlanCanvas)
    const vk = `vs:viewport:${projectId}`;
    let vp2 = await page.evaluate((k) => sessionStorage.getItem(k), vk);
    log(`step2 sessionStorage BEFORE any scroll: ${vp2}`);

    // Simuler zoom: scroll sur canvas avec Ctrl+wheel
    const canvas = page.locator('canvas').first();
    if (await canvas.count()) {
      const box = await canvas.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        // Zoom in: simulate 5 wheel ticks
        for (let i = 0; i < 5; i++) {
          await page.mouse.wheel(0, -120);
          await page.waitForTimeout(100);
        }
        await page.waitForTimeout(800); // debounce 120ms
      }
    }
    vp2 = await page.evaluate((k) => sessionStorage.getItem(k), vk);
    log(`step2 sessionStorage AFTER zoom: ${vp2}`);
    await snap(page, '31-step2-after-zoom.png');

    // Naviguer étape 3
    await page.goto(`${PROD_URL}/vs/projects/${projectId}/rooms`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(6000);

    // Lire sessionStorage immédiatement
    const vp3 = await page.evaluate((k) => sessionStorage.getItem(k), vk);
    log(`step3 sessionStorage (after hydration): ${vp3}`);
    await snap(page, '32-step3-after-nav.png');

    // Critère : vp3 doit être un JSON valide avec scale défini, idéalement scale ≈ vp2.scale
    let p2: {scale?: number} | null = null;
    let p3: {scale?: number} | null = null;
    try { p2 = vp2 ? JSON.parse(vp2) : null; } catch {}
    try { p3 = vp3 ? JSON.parse(vp3) : null; } catch {}
    const delta = p2?.scale && p3?.scale ? Math.abs(p2.scale - p3.scale) : null;
    log(`step2.scale=${p2?.scale} step3.scale=${p3?.scale} delta=${delta}`);
    // Si delta < 0.1 on considère viewport partagé
    results['f_viewport_shared'] = (delta !== null && delta < 0.1) ? 'PASS' : (vp3 !== null ? 'PARTIAL' : 'FAIL');

    fs.writeFileSync(path.join(DIR, 'results-2b.json'), JSON.stringify(results, null, 2));
    fs.writeFileSync(path.join(DIR, 'console-2b.log'), logs.join('\n'));
  } catch (err) {
    log(`FATAL ${(err as Error).message}`);
    fs.writeFileSync(path.join(DIR, 'status-2b.txt'), `ERROR\n${(err as Error).stack}`);
    fs.writeFileSync(path.join(DIR, 'console-2b.log'), logs.join('\n'));
  } finally {
    await browser.close();
  }
}

main();
