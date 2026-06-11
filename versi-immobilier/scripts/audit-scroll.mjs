// Simulation utilisateur réel : scroll progressif + vérification opacité
import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto('http://localhost:3001/nos-biens/muguets-lot-1-rdc', { waitUntil: 'networkidle' });
await page.waitForSelector('.property-detail__title');
await page.waitForTimeout(800);

// Opacité AVANT tout scroll
const before = await page.evaluate(() => {
  const probe = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return 'absent';
    return `opacity=${getComputedStyle(el).opacity} classes=${el.className}`;
  };
  return {
    fadeRoots: [...document.querySelectorAll('.fade-hidden, .fade-in')].map((e) => `${e.tagName}.${e.className.split(' ').filter((c) => c.startsWith('fade')).join('.')}`),
    priceCard: probe('.property-price-card'),
    timeline: probe('.property-dossier__timeline'),
  };
});
console.log('AVANT SCROLL:', JSON.stringify(before, null, 1));

// Scroll progressif comme un pouce (12 paliers), screenshots viewport
const H = await page.evaluate(() => document.body.scrollHeight);
const steps = 12;
for (let i = 0; i <= steps; i++) {
  const y = Math.round((H - 812) * (i / steps));
  await page.evaluate((yy) => window.scrollTo({ top: yy }), y);
  await page.waitForTimeout(450); // laisse le fade-in se jouer
  await page.screenshot({ path: `/tmp/audit-annonces/scroll-${String(i).padStart(2, '0')}.png` });
}
// Opacité APRÈS scroll complet
const after = await page.evaluate(() => {
  const probe = (sel) => {
    const el = document.querySelector(sel);
    return el ? `opacity=${getComputedStyle(el).opacity}` : 'absent';
  };
  return { priceCard: probe('.property-price-card'), timeline: probe('.property-dossier__timeline') };
});
console.log('APRÈS SCROLL:', JSON.stringify(after));
await browser.close();
