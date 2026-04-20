import { test, expect } from '@playwright/test';

// ─── versi-invest.fr — Tests E2E ────────��──────────────────────────────

test.describe('HomePage — versi-invest.fr', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page loads and title is correct (≤60 chars)', async ({ page }) => {
    const title = await page.title();
    expect(title).toContain('Versi Invest');
    expect(title.length).toBeLessThanOrEqual(60);
  });

  test('Nav is visible', async ({ page }) => {
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible({ timeout: 10000 });
  });

  test('Hero renders with key content', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Biens rares/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: /liste d'attente/i }).first()).toBeVisible();
  });

  test('Trust stats section shows key numbers', async ({ page }) => {
    await expect(page.getByText('3,2M€')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('immeubles').first()).toBeVisible();
  });

  test('Process section shows 8 steps', async ({ page }) => {
    const section = page.locator('section[aria-label*="Comment"]');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Détection d\'opportunité')).toBeVisible();
    await expect(page.getByText('Travaux et mise en location')).toBeVisible();
    await expect(page.getByText('Optionnel')).toBeVisible();
  });

  test('Team teaser shows 3 founders', async ({ page }) => {
    const section = page.locator('section[aria-label*="fondateurs"]');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Maxime Lemoine').first()).toBeVisible();
    await expect(page.getByText('Thomas Issa').first()).toBeVisible();
    await expect(page.getByText('Carl Standertskjold').first()).toBeVisible();
  });

  test('FAQ section has accordion', async ({ page }) => {
    const section = page.locator('section[aria-label*="Questions"]');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible({ timeout: 5000 });
    const firstQ = page.getByRole('button', { name: /Combien/i });
    await expect(firstQ).toBeVisible();
    await firstQ.click();
    await expect(page.getByText('5% du prix', { exact: false })).toBeVisible();
  });

  test('Footer is visible', async ({ page }) => {
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();
  });
});

test.describe('ProcessPage — /comment-ca-marche', () => {
  test('loads with nav and footer', async ({ page }) => {
    await page.goto('/comment-ca-marche');
    const title = await page.title();
    expect(title.length).toBeLessThanOrEqual(60);
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('footer')).toBeVisible();
  });
});

test.describe('ReferencesPage — /references', () => {
  test('loads with nav and footer', async ({ page }) => {
    await page.goto('/references');
    const title = await page.title();
    expect(title.length).toBeLessThanOrEqual(60);
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('footer')).toBeVisible();
  });
});

test.describe('EquipePage — /equipe', () => {
  test('loads and shows team', async ({ page }) => {
    await page.goto('/equipe');
    const title = await page.title();
    expect(title.length).toBeLessThanOrEqual(60);
    await expect(page.getByText('Maxime Lemoine').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Thomas Issa').first()).toBeVisible();
    await expect(page.getByText('Carl Standertskjold').first()).toBeVisible();
  });
});

test.describe('ContactPage — /contact', () => {
  test('loads with form', async ({ page }) => {
    await page.goto('/contact');
    const title = await page.title();
    expect(title.length).toBeLessThanOrEqual(60);
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible({ timeout: 10000 });
    // Check form exists
    await expect(page.locator('form').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('BlogPage — /blog', () => {
  test('loads with nav', async ({ page }) => {
    await page.goto('/blog');
    const title = await page.title();
    expect(title.length).toBeLessThanOrEqual(60);
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('footer')).toBeVisible();
  });
});

test.describe('Legal pages', () => {
  test('mentions légales loads', async ({ page }) => {
    await page.goto('/mentions-legales');
    const title = await page.title();
    expect(title.length).toBeLessThanOrEqual(60);
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('footer')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Mentions légales/i })).toBeVisible();
  });

  test('politique de confidentialité loads', async ({ page }) => {
    await page.goto('/politique-de-confidentialite');
    const title = await page.title();
    expect(title.length).toBeLessThanOrEqual(60);
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('footer')).toBeVisible();
  });
});

test.describe('Page 404', () => {
  test('unknown URL shows 404', async ({ page }) => {
    await page.goto('/une-page-inexistante');
    await expect(page.getByText('404')).toBeVisible();
  });
});

test.describe('/services redirects to /comment-ca-marche', () => {
  test('redirect works', async ({ page }) => {
    await page.goto('/services');
    await page.waitForURL('**/comment-ca-marche');
    expect(page.url()).toContain('/comment-ca-marche');
  });
});

test.describe('Responsive — Mobile 375px', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('hero visible on mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Biens rares/i })).toBeVisible({ timeout: 10000 });
  });

  test('founders visible on mobile', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('section[aria-label*="fondateurs"]');
    await section.scrollIntoViewIfNeeded();
    await expect(page.getByText('Maxime Lemoine').first()).toBeVisible({ timeout: 5000 });
  });
});
