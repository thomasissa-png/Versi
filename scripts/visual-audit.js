const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
];

const SITES = [
  {
    name: 'versi-fr',
    baseUrl: 'http://localhost:5173',
    pages: [
      { path: '/', label: 'homepage' },
    ],
  },
  {
    name: 'versi-immobilier',
    baseUrl: 'http://localhost:5174',
    pages: [
      { path: '/', label: 'homepage' },
      { path: '/nos-biens', label: 'biens' },
      { path: '/vendre', label: 'vendre' },
      { path: '/realisations', label: 'realisations' },
    ],
  },
];

const OUT_DIR = path.join(__dirname, '../audit-screenshots');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const site of SITES) {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.name === 'mobile' ? 2 : 1,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();

      for (const pg of site.pages) {
        const url = `${site.baseUrl}${pg.path}`;
        console.log(`Capturing ${site.name} / ${pg.label} @ ${viewport.name} (${viewport.width}x${viewport.height})...`);

        try {
          await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
          // Wait for potential fade-in animations
          await page.waitForTimeout(600);

          // Check for horizontal overflow
          const hasOverflow = await page.evaluate(() => {
            return document.body.scrollWidth > document.body.clientWidth;
          });

          // Check if hero content is visible and not behind nav
          const heroCheck = await page.evaluate(() => {
            const heroContent = document.querySelector('.hero__content, .sell-hero');
            const nav = document.querySelector('nav');
            if (!heroContent || !nav) return { hasHero: false };

            const heroRect = heroContent.getBoundingClientRect();
            const navRect = nav.getBoundingClientRect();

            return {
              hasHero: true,
              heroTop: Math.round(heroRect.top),
              navBottom: Math.round(navRect.bottom),
              overlap: heroRect.top < navRect.bottom,
            };
          });

          // Check for text-heading-sm class usage (undefined class)
          const undefinedClasses = await page.evaluate(() => {
            const issues = [];
            const elements = document.querySelectorAll('[class]');
            const undefinedTokens = ['text-heading-sm'];
            elements.forEach(el => {
              undefinedTokens.forEach(cls => {
                if (el.classList.contains(cls)) {
                  issues.push({
                    class: cls,
                    tag: el.tagName,
                    text: el.textContent.substring(0, 50),
                  });
                }
              });
            });
            return issues;
          });

          // Full page screenshot
          const filename = `${site.name}__${pg.label}__${viewport.name}.png`;
          await page.screenshot({
            path: path.join(OUT_DIR, filename),
            fullPage: true,
          });

          console.log(`  ✓ Screenshot: ${filename}`);
          console.log(`  ↳ Horizontal overflow: ${hasOverflow}`);
          if (heroCheck.hasHero) {
            console.log(`  ↳ Hero top: ${heroCheck.heroTop}px, Nav bottom: ${heroCheck.navBottom}px, Overlap: ${heroCheck.overlap}`);
          }
          if (undefinedClasses.length > 0) {
            console.log(`  ↳ Undefined CSS classes found: ${JSON.stringify(undefinedClasses)}`);
          }

        } catch (err) {
          console.error(`  ✗ Error on ${url}: ${err.message}`);
        }
      }

      await context.close();
    }
  }

  await browser.close();
  console.log('\nDone. Screenshots in: ' + OUT_DIR);
})();
