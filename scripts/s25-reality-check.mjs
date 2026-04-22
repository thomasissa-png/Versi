// s25 Reality check prod Replit Versi Studio
// Tente de capturer visuellement /vs, /vs/lots, /vs/rooms en prod
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.js';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'https://versi-studio.replit.app';
const OUT = '/home/user/Versi/docs/screenshots/s25';
fs.mkdirSync(OUT, { recursive: true });

const urls = [
  { name: '01-root', url: `${BASE}/` },
  { name: '02-vs', url: `${BASE}/vs` },
  { name: '03-vs-projects', url: `${BASE}/vs/projects` },
];

const results = [];

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const consoleMsgs = [];
  page.on('console', m => consoleMsgs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => consoleMsgs.push(`[pageerror] ${e.message}`));
  page.on('response', r => {
    if (r.status() >= 400) consoleMsgs.push(`[http ${r.status()}] ${r.url()}`);
  });

  for (const { name, url } of urls) {
    const entry = { name, url, status: null, title: null, bodyStart: null, error: null };
    consoleMsgs.length = 0;
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      entry.status = resp ? resp.status() : null;
      await page.waitForTimeout(3000); // laisse le JS hydrater
      entry.title = await page.title();
      entry.bodyStart = (await page.evaluate(() => document.body?.innerText || '')).slice(0, 400);
    } catch (e) {
      entry.error = String(e).slice(0, 300);
    }
    const shot = path.join(OUT, `${name}.png`);
    try {
      await page.screenshot({ path: shot, fullPage: true });
      entry.screenshot = shot;
    } catch (e) {
      entry.screenshot_error = String(e).slice(0, 200);
    }
    entry.console = [...consoleMsgs];
    results.push(entry);
    console.log(JSON.stringify(entry, null, 2));
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
