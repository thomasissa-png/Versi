// Diagnostic DOM mobile : position/taille réelles des sections de l'annonce
import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto('http://localhost:3001/nos-biens/muguets-lot-1-rdc', { waitUntil: 'networkidle' });
await page.waitForSelector('.property-detail__title');
await page.waitForTimeout(1000);

const report = await page.evaluate(() => {
  const out = [];
  const layout = document.querySelector('.property-detail__layout');
  const cs = getComputedStyle(layout);
  out.push(`LAYOUT grid-template-columns: ${cs.gridTemplateColumns} | display:${cs.display}`);
  document.querySelectorAll('h2, .property-price-card, .property-detail__dossier-cta, .property-dossier__aprevoir, .property-dossier__timeline').forEach((el) => {
    const r = el.getBoundingClientRect();
    const top = Math.round(r.top + window.scrollY);
    const label = el.classList.contains('property-price-card') ? '[PRICE CARD]'
      : el.classList.contains('property-detail__dossier-cta') ? '[CTA DOSSIER]'
      : el.classList.contains('property-dossier__aprevoir') ? '[liste à prévoir]'
      : el.classList.contains('property-dossier__timeline') ? '[timeline calendrier]'
      : (el.textContent || '').trim().slice(0, 40);
    const visible = r.width > 0 && r.height > 0;
    out.push(`y=${String(top).padStart(6)} h=${String(Math.round(r.height)).padStart(5)} w=${Math.round(r.width)} visible=${visible} ${label}`);
  });
  out.push(`BODY scrollHeight: ${document.body.scrollHeight}`);
  const aside = document.querySelector('aside');
  const ar = aside.getBoundingClientRect();
  out.push(`ASIDE y=${Math.round(ar.top + window.scrollY)} h=${Math.round(ar.height)}`);
  const card = document.querySelector('.property-price-card');
  out.push(`PRICE CARD position: ${getComputedStyle(card).position} top:${getComputedStyle(card).top}`);
  return out.join('\n');
});
console.log(report);
await browser.close();
