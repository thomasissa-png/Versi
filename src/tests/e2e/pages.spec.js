import { test, expect } from '@playwright/test';

// ─── versi.fr — Tests E2E ───────────────────────────────────────────────

test.describe('HomePage — One-page versi.fr', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page loads and title is correct (≤60 chars)', async ({ page }) => {
    const title = await page.title();
    expect(title).toContain('Versi');
    expect(title.length).toBeLessThanOrEqual(60);
  });

  test('Nav is visible', async ({ page }) => {
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    // On desktop, nav items are visible. On mobile, hamburger is visible.
    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 768) {
      for (const label of ['VISION', 'ACTIVITÉS', 'APPROCHE', 'ÉQUIPE']) {
        await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
      }
      await expect(nav.getByRole('link', { name: 'CONTACT', exact: true })).toBeVisible();
    } else {
      await expect(nav.locator('.nav__hamburger')).toBeVisible();
    }
  });

  test('Hero section renders with key content', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Quatre métiers/i })).toBeVisible({ timeout: 5000 });
  });

  test('Mission section is visible (not stuck at opacity:0)', async ({ page }) => {
    const mission = page.locator('#mission, section[aria-label*="Vision"], .mission');
    await mission.first().scrollIntoViewIfNeeded();
    await expect(mission.first()).toBeVisible({ timeout: 5000 });
  });

  test('Activities section exists with entity cards', async ({ page }) => {
    const section = page.locator('#activites');
    await expect(section).toBeAttached({ timeout: 5000 });
    // Check entity headings are in the DOM (grid may be fade-hidden due to IntersectionObserver)
    await expect(section.getByRole('heading', { name: 'Versi Immobilier' })).toBeAttached();
    await expect(section.getByRole('heading', { name: 'Versi Invest' })).toBeAttached();
  });

  test('Approach section is visible', async ({ page }) => {
    const section = page.locator('#approche, section[aria-label*="Approche"]');
    await section.first().scrollIntoViewIfNeeded();
    await expect(section.first()).toBeVisible({ timeout: 5000 });
  });

  test('Team section shows 3 founders', async ({ page }) => {
    const section = page.locator('#equipe, section[aria-label*="quipe"]');
    await section.first().scrollIntoViewIfNeeded();
    await expect(section.first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Trois fondateurs')).toBeVisible();
    await expect(page.getByRole('heading', { name: /MAXIME LEMOINE/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /THOMAS ISSA/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /CARL STANDERTSKJOLD/i })).toBeVisible();
  });

  test('Contact section has form with required fields', async ({ page }) => {
    const section = page.locator('#contact, section[aria-label*="Contact"]');
    await section.first().scrollIntoViewIfNeeded();
    await expect(section.first()).toBeVisible({ timeout: 5000 });
    // Email link visible (use .first() — also appears in footer)
    await expect(page.getByRole('link', { name: 'contact@versi.fr' }).first()).toBeVisible();
    // Form fields — uses name="nom", name="email", name="message"
    await expect(page.locator('input[name="nom"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('textarea[name="message"]')).toBeVisible();
  });

  test('Footer has links to legal pages', async ({ page }) => {
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Mentions légales' })).toBeVisible();
  });
});

test.describe('Mentions légales', () => {
  test('loads with Nav and content', async ({ page }) => {
    await page.goto('/mentions-legales');
    const title = await page.title();
    expect(title.length).toBeLessThanOrEqual(60);
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mentions légales' })).toBeVisible();
  });
});

test.describe('Politique de confidentialité', () => {
  test('loads with Nav and content', async ({ page }) => {
    await page.goto('/politique-de-confidentialite');
    const title = await page.title();
    expect(title.length).toBeLessThanOrEqual(60);
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    await expect(page.getByRole('heading', { name: /confidentialit/i })).toBeVisible();
  });
});

test.describe('Page 404', () => {
  test('unknown URL shows not found page', async ({ page }) => {
    await page.goto('/une-page-qui-nexiste-pas');
    await expect(page.getByText('introuvable', { exact: false })).toBeVisible();
  });
});

test.describe('Navigation par ancres', () => {
  test('clicking ÉQUIPE scrolls to team section', async ({ page }) => {
    await page.goto('/');
    const viewport = page.viewportSize();
    // On mobile, nav items are behind hamburger — skip this test
    if (!viewport || viewport.width < 768) return;
    await page.getByRole('link', { name: 'ÉQUIPE', exact: true }).first().click();
    await page.waitForTimeout(1000);
    const team = page.locator('#equipe, section[aria-label*="quipe"]');
    await expect(team.first()).toBeInViewport({ ratio: 0.3 });
  });
});

test.describe('Responsive — Mobile 375px', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('hero content visible on mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Quatre métiers/i })).toBeVisible({ timeout: 5000 });
  });

  test('team founders visible on mobile', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('#equipe, section[aria-label*="quipe"]');
    await section.first().scrollIntoViewIfNeeded();
    await expect(page.getByRole('heading', { name: /MAXIME LEMOINE/i })).toBeVisible({ timeout: 5000 });
  });
});
