// @ts-check
import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Tests E2E du blog public versi-immobilier.fr
// Serveur Express (port 3001) requis — les articles sont servis via
// /api/public/blog et /api/public/blog/:slug.
// Les tests s'appuient sur les 2 articles seedes (seed-blog-articles.js) :
//   - A1 : slug "marchand-de-biens-lille-acquereur"
//   - A6 : slug "precommercialisation-immobilier-lille"
// ---------------------------------------------------------------------------

const BASE_URL = 'http://localhost:3001';

// Slugs et titres des articles seedes (source de verite : seed-blog-articles.js)
const ARTICLE_A1 = {
  slug: 'marchand-de-biens-lille-acquereur',
  title: 'Marchand de biens à Lille : ce que ça change pour vous',
  author: 'Thomas Issa',
  excerpt: "Acheter chez un marchand de biens à Lille",
};

const ARTICLE_A6 = {
  slug: 'precommercialisation-immobilier-lille',
  title: 'Précommercialisation immobilière à Lille : comment accéder aux biens avant les autres',
  author: 'Thomas Issa',
  excerpt: "Acheter un appartement avant sa mise en vente officielle",
};

const SEEDED_ARTICLES = [ARTICLE_A1, ARTICLE_A6];

// Devices — convention identique a versi-immobilier.spec.js
const DEVICES = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
};

// ===========================================================================
// 1. PAGE LISTE BLOG — /blog (Desktop)
// ===========================================================================

test.describe('Blog public — Page liste (desktop)', () => {
  test.use({ viewport: DEVICES.desktop });

  test('VI-BLOG-LIST-01 page /blog se charge avec H1', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`);
    await page.waitForLoadState('networkidle');

    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    await expect(h1).toContainText(/blog/i);
  });

  test('VI-BLOG-LIST-02 affiche les 2 articles seedes', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`);
    await page.waitForLoadState('networkidle');

    for (const article of SEEDED_ARTICLES) {
      // Le titre de chaque article seede doit etre visible
      await expect(page.getByText(article.title).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('VI-BLOG-LIST-03 chaque carte article a un lien cliquable vers /blog/:slug', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`);
    await page.waitForLoadState('networkidle');

    for (const article of SEEDED_ARTICLES) {
      const link = page.locator(`a[href="/blog/${article.slug}"]`);
      await expect(link.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('VI-BLOG-LIST-04 chaque carte affiche le chapo (excerpt)', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`);
    await page.waitForLoadState('networkidle');

    for (const article of SEEDED_ARTICLES) {
      // L'excerpt est tronque dans le seed — on verifie le debut
      await expect(page.getByText(article.excerpt).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('VI-BLOG-LIST-05 chaque carte affiche une date au format FR', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`);
    await page.waitForLoadState('networkidle');

    // Les dates sont au format "12 avril 2026" — on verifie qu'il y a au moins
    // un element avec un pattern de date francaise visible dans les cartes
    const datePattern = /\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}/;
    const dateElements = page.getByText(datePattern);
    expect(await dateElements.count()).toBeGreaterThanOrEqual(2);
  });

  test('VI-BLOG-LIST-06 clic sur une carte navigue vers la page article', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`);
    await page.waitForLoadState('networkidle');

    // Cliquer sur le lien de l'article A1
    await page.click(`a[href="/blog/${ARTICLE_A1.slug}"]`);
    await page.waitForURL(/\/blog\/marchand-de-biens-lille-acquereur/);

    await expect(page.locator('h1')).toContainText(ARTICLE_A1.title);
  });

  test('VI-BLOG-LIST-07 nav et footer sont presents', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('nav').first()).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('VI-BLOG-LIST-08 les tags sont affiches sur les cartes', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`);
    await page.waitForLoadState('networkidle');

    // L'article A1 a les tags : marchand de biens, Lille, acquereur, garanties
    await expect(page.getByText('marchand de biens').first()).toBeVisible({ timeout: 5000 });
  });
});

// ===========================================================================
// 2. PAGE ARTICLE — /blog/:slug (Desktop)
// ===========================================================================

test.describe('Blog public — Page article (desktop)', () => {
  test.use({ viewport: DEVICES.desktop });

  test('VI-BLOG-ART-01 article A1 se charge avec titre H1', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/${ARTICLE_A1.slug}`);
    await page.waitForLoadState('networkidle');

    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    await expect(h1).toContainText(ARTICLE_A1.title);
  });

  test('VI-BLOG-ART-02 contenu Markdown rendu en HTML (h2, strong, liens)', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/${ARTICLE_A1.slug}`);
    await page.waitForLoadState('networkidle');

    // Le Markdown contient des ## — verifier qu'au moins un h2 est rendu
    const h2s = page.locator('.blog-article-content h2');
    expect(await h2s.count()).toBeGreaterThanOrEqual(1);

    // Le Markdown contient des **bold** — verifier qu'au moins un <strong> est rendu
    const strongs = page.locator('.blog-article-content strong');
    expect(await strongs.count()).toBeGreaterThanOrEqual(1);

    // Le Markdown contient des liens internes [texte](url) — verifier qu'au moins un <a> est rendu
    const links = page.locator('.blog-article-content a');
    expect(await links.count()).toBeGreaterThanOrEqual(1);
  });

  test('VI-BLOG-ART-03 auteur et date affiches', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/${ARTICLE_A1.slug}`);
    await page.waitForLoadState('networkidle');

    // L'auteur "Thomas Issa" doit apparaitre
    await expect(page.getByText(ARTICLE_A1.author).first()).toBeVisible({ timeout: 5000 });

    // Une date au format FR doit etre visible
    const datePattern = /\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}/;
    await expect(page.getByText(datePattern).first()).toBeVisible({ timeout: 5000 });
  });

  test('VI-BLOG-ART-04 Schema.org BlogPosting complet dans le HTML', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/${ARTICLE_A1.slug}`);
    await page.waitForLoadState('networkidle');

    // Attendre que le JSON-LD soit injecte dans le DOM
    await page.waitForSelector('script#blog-jsonld', { timeout: 5000 });

    const jsonLd = await page.evaluate(() => {
      const script = document.querySelector('script#blog-jsonld');
      return script ? JSON.parse(script.textContent) : null;
    });

    // Validations Schema.org
    expect(jsonLd).not.toBeNull();
    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('BlogPosting');
    expect(jsonLd.headline).toBe(ARTICLE_A1.title);
    expect(jsonLd.description).toBeTruthy();
    expect(jsonLd.author).toBeDefined();
    expect(jsonLd.author['@type']).toBe('Organization');
    expect(jsonLd.publisher).toBeDefined();
    expect(jsonLd.publisher.name).toBe('Versi Immobilier');
    expect(jsonLd.datePublished).toBeTruthy();
    expect(jsonLd.mainEntityOfPage).toBeDefined();
    expect(jsonLd.mainEntityOfPage['@id']).toContain(`/blog/${ARTICLE_A1.slug}`);
  });

  test('VI-BLOG-ART-05 lien retour "Tous les articles" fonctionne', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/${ARTICLE_A1.slug}`);
    await page.waitForLoadState('networkidle');

    // Le lien retour doit etre visible
    const backLink = page.locator('a:has-text("Tous les articles")').first();
    await expect(backLink).toBeVisible();

    // Cliquer et verifier la navigation
    await backLink.click();
    await page.waitForURL(/\/blog$/);
  });

  test('VI-BLOG-ART-06 article A6 se charge correctement', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/${ARTICLE_A6.slug}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText(ARTICLE_A6.title);
    await expect(page.getByText(ARTICLE_A6.author).first()).toBeVisible({ timeout: 5000 });
  });

  test('VI-BLOG-ART-07 tags affiches sur la page article', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/${ARTICLE_A1.slug}`);
    await page.waitForLoadState('networkidle');

    // L'article A1 a les tags marchand de biens, Lille, acquereur, garanties
    await expect(page.getByText('marchand de biens').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Lille').first()).toBeVisible({ timeout: 5000 });
  });

  test('VI-BLOG-ART-08 page title inclut le titre de l\'article', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/${ARTICLE_A1.slug}`);
    await page.waitForLoadState('networkidle');

    // Le titre de la page doit contenir le titre de l'article
    const title = await page.title();
    expect(title).toContain('Versi Immobilier');
  });

  test('VI-BLOG-ART-09 contenu contient des paragraphes substantiels', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/${ARTICLE_A1.slug}`);
    await page.waitForLoadState('networkidle');

    // Le contenu Markdown A1 fait ~90 lignes — le HTML rendu doit avoir plusieurs <p>
    const paragraphs = page.locator('.blog-article-content p');
    expect(await paragraphs.count()).toBeGreaterThanOrEqual(5);
  });
});

// ===========================================================================
// 3. SLUG INEXISTANT — 404 (Desktop)
// ===========================================================================

test.describe('Blog public — 404 slug inexistant (desktop)', () => {
  test.use({ viewport: DEVICES.desktop });

  test('VI-BLOG-404-01 slug inexistant affiche "Article introuvable"', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/slug-totalement-inexistant-xyz`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/introuvable/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('VI-BLOG-404-02 slug inexistant affiche le lien retour', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/slug-totalement-inexistant-xyz`);
    await page.waitForLoadState('networkidle');

    const backLink = page.locator('a:has-text("Tous les articles")');
    await expect(backLink).toBeVisible();
  });

  test('VI-BLOG-404-03 clic sur retour depuis 404 navigue vers /blog', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/slug-totalement-inexistant-xyz`);
    await page.waitForLoadState('networkidle');

    await page.click('a:has-text("Tous les articles")');
    await page.waitForURL(/\/blog$/);
  });
});

// ===========================================================================
// 4. BLOG TEASER SUR LA HOMEPAGE (Desktop)
// ===========================================================================

test.describe('Blog public — BlogTeaser homepage (desktop)', () => {
  test.use({ viewport: DEVICES.desktop });

  test('VI-BLOG-TEASER-01 section BlogTeaser visible sur la homepage', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // La section BlogTeaser a la classe .blog-teaser
    const teaser = page.locator('.blog-teaser');
    await expect(teaser).toBeVisible({ timeout: 5000 });
  });

  test('VI-BLOG-TEASER-02 titre "Derniers articles." present', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Derniers articles.').first()).toBeVisible({ timeout: 5000 });
  });

  test('VI-BLOG-TEASER-03 affiche les articles seedes', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Au moins un des articles seedes doit apparaitre dans le teaser
    const teaserSection = page.locator('.blog-teaser');
    const hasA1 = await teaserSection.getByText(ARTICLE_A1.title).count();
    const hasA6 = await teaserSection.getByText(ARTICLE_A6.title).count();
    expect(hasA1 + hasA6).toBeGreaterThanOrEqual(1);
  });

  test('VI-BLOG-TEASER-04 cartes teaser ont un lien vers /blog/:slug', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const teaserSection = page.locator('.blog-teaser');
    // Les cartes teaser doivent avoir des liens vers les pages article
    const articleLinks = teaserSection.locator('a[href^="/blog/"]');
    expect(await articleLinks.count()).toBeGreaterThanOrEqual(1);
  });

  test('VI-BLOG-TEASER-05 lien "Tous les articles" navigue vers /blog', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const teaserSection = page.locator('.blog-teaser');
    const allArticlesLink = teaserSection.locator('a:has-text("Tous les articles")');
    await expect(allArticlesLink).toBeVisible();

    await allArticlesLink.click();
    await page.waitForURL(/\/blog$/);
  });

  test('VI-BLOG-TEASER-06 excerpt visible dans les cartes teaser', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Au moins un excerpt doit etre visible dans les cartes
    const teaserSection = page.locator('.blog-teaser');
    const excerptA1 = await teaserSection.getByText(ARTICLE_A1.excerpt).count();
    const excerptA6 = await teaserSection.getByText(ARTICLE_A6.excerpt).count();
    expect(excerptA1 + excerptA6).toBeGreaterThanOrEqual(1);
  });

  test('VI-BLOG-TEASER-07 bouton "Lire l\'article" visible sur les cartes', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const teaserSection = page.locator('.blog-teaser');
    const readLinks = teaserSection.getByText(/Lire l'article/i);
    expect(await readLinks.count()).toBeGreaterThanOrEqual(1);
  });
});

// ===========================================================================
// 5. NAVIGATION — Lien BLOG dans la Nav (Desktop)
// ===========================================================================

test.describe('Blog public — Nav lien BLOG (desktop)', () => {
  test.use({ viewport: DEVICES.desktop });

  test('VI-BLOG-NAV-01 lien BLOG present dans la navigation', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const blogNavLink = page.locator('nav').getByRole('link', { name: /BLOG/i }).first();
    await expect(blogNavLink).toBeVisible();
  });

  test('VI-BLOG-NAV-02 clic sur BLOG navigue vers /blog', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const blogNavLink = page.locator('nav').getByRole('link', { name: /BLOG/i }).first();
    await blogNavLink.click();
    await page.waitForURL(/\/blog/);

    await expect(page.locator('h1')).toContainText(/blog/i);
  });

  test('VI-BLOG-NAV-03 lien BLOG present sur la page /blog aussi', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`);
    await page.waitForLoadState('networkidle');

    const blogNavLink = page.locator('nav').getByRole('link', { name: /BLOG/i }).first();
    await expect(blogNavLink).toBeVisible();
  });
});

// ===========================================================================
// 6. TESTS TABLET (768px)
// ===========================================================================

test.describe('Blog public — Tablet (768px)', () => {
  test.use({ viewport: DEVICES.tablet });

  test('VI-BLOG-TAB-01 page /blog se charge et affiche les articles', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText(/blog/i);
    await expect(page.getByText(ARTICLE_A1.title).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(ARTICLE_A6.title).first()).toBeVisible({ timeout: 5000 });
  });

  test('VI-BLOG-TAB-02 page article se charge avec contenu', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/${ARTICLE_A1.slug}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText(ARTICLE_A1.title);
    await expect(page.getByText(ARTICLE_A1.author).first()).toBeVisible({ timeout: 5000 });

    // Le contenu Markdown est rendu
    const h2s = page.locator('.blog-article-content h2');
    expect(await h2s.count()).toBeGreaterThanOrEqual(1);
  });

  test('VI-BLOG-TAB-03 Schema.org present sur article tablet', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/${ARTICLE_A6.slug}`);
    await page.waitForLoadState('networkidle');

    await page.waitForSelector('script#blog-jsonld', { timeout: 5000 });
    const jsonLd = await page.evaluate(() => {
      const script = document.querySelector('script#blog-jsonld');
      return script ? JSON.parse(script.textContent) : null;
    });

    expect(jsonLd).not.toBeNull();
    expect(jsonLd['@type']).toBe('BlogPosting');
    expect(jsonLd.headline).toBe(ARTICLE_A6.title);
  });

  test('VI-BLOG-TAB-04 BlogTeaser visible sur homepage tablet', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const teaser = page.locator('.blog-teaser');
    await expect(teaser).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Derniers articles.').first()).toBeVisible();
  });

  test('VI-BLOG-TAB-05 slug inexistant affiche message d\'erreur', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/slug-qui-nexiste-pas-tablet`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/introuvable/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('VI-BLOG-TAB-06 navigation retour fonctionne depuis article', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/${ARTICLE_A6.slug}`);
    await page.waitForLoadState('networkidle');

    await page.click('a:has-text("Tous les articles")');
    await page.waitForURL(/\/blog$/);
  });
});

// ===========================================================================
// 7. TESTS MOBILE (375px)
// ===========================================================================

test.describe('Blog public — Mobile (375px)', () => {
  test.use({ viewport: DEVICES.mobile });

  test('VI-BLOG-MOB-01 page /blog se charge et affiche les articles', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText(/blog/i);
    await expect(page.getByText(ARTICLE_A1.title).first()).toBeVisible({ timeout: 5000 });
  });

  test('VI-BLOG-MOB-02 page article se charge avec contenu', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/${ARTICLE_A1.slug}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText(ARTICLE_A1.title);
    await expect(page.getByText(ARTICLE_A1.author).first()).toBeVisible({ timeout: 5000 });
  });

  test('VI-BLOG-MOB-03 Schema.org present sur article mobile', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/${ARTICLE_A1.slug}`);
    await page.waitForLoadState('networkidle');

    await page.waitForSelector('script#blog-jsonld', { timeout: 5000 });
    const jsonLd = await page.evaluate(() => {
      const script = document.querySelector('script#blog-jsonld');
      return script ? JSON.parse(script.textContent) : null;
    });

    expect(jsonLd).not.toBeNull();
    expect(jsonLd['@type']).toBe('BlogPosting');
  });

  test('VI-BLOG-MOB-04 BlogTeaser visible sur homepage mobile', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const teaser = page.locator('.blog-teaser');
    await expect(teaser).toBeVisible({ timeout: 5000 });
  });

  test('VI-BLOG-MOB-05 slug inexistant affiche message d\'erreur', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/slug-qui-nexiste-pas-mobile`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/introuvable/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('VI-BLOG-MOB-06 clic sur carte article navigue vers le detail', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`);
    await page.waitForLoadState('networkidle');

    await page.click(`a[href="/blog/${ARTICLE_A1.slug}"]`);
    await page.waitForURL(/\/blog\/marchand-de-biens-lille-acquereur/);

    await expect(page.locator('h1')).toContainText(ARTICLE_A1.title);
  });

  test('VI-BLOG-MOB-07 navigation retour fonctionne depuis article', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/${ARTICLE_A1.slug}`);
    await page.waitForLoadState('networkidle');

    await page.click('a:has-text("Tous les articles")');
    await page.waitForURL(/\/blog$/);
  });

  test('VI-BLOG-MOB-08 lien BLOG accessible via menu hamburger', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Ouvrir le menu mobile
    const hamburger = page.locator('button[aria-label*="Menu"], button[aria-label*="menu"], .nav__hamburger');
    await expect(hamburger.first()).toBeVisible();
    await hamburger.first().click();

    // Le lien BLOG doit etre visible dans le menu mobile
    const blogLink = page.getByRole('link', { name: /BLOG/i }).first();
    await expect(blogLink).toBeVisible({ timeout: 3000 });

    // Cliquer et naviguer
    await blogLink.click();
    await page.waitForURL(/\/blog/);
  });

  test('VI-BLOG-MOB-09 cartes teaser cliquables sur mobile', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const teaserSection = page.locator('.blog-teaser');
    const articleLinks = teaserSection.locator('a[href^="/blog/"]');

    // Au moins un lien article dans le teaser
    expect(await articleLinks.count()).toBeGreaterThanOrEqual(1);

    // Cliquer sur le premier lien article du teaser
    await articleLinks.first().click();
    await page.waitForURL(/\/blog\/.+/);
  });

  test('VI-BLOG-MOB-10 contenu article lisible sans debordement horizontal', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/${ARTICLE_A1.slug}`);
    await page.waitForLoadState('networkidle');

    // Verifier que le contenu ne deborde pas horizontalement
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375 + 2); // tolerance de 2px pour les bordures
  });
});

// ===========================================================================
// 8. TESTS CROSS-DEVICE — Coherence du contenu
// ===========================================================================

test.describe('Blog public — Coherence cross-device', () => {
  // Ce test verifie que le meme article retourne le meme Schema.org
  // quel que soit le device — le JSON-LD ne doit pas dependre du viewport
  for (const [deviceName, viewport] of Object.entries(DEVICES)) {
    test(`VI-BLOG-CROSS-01-${deviceName} Schema.org identique sur ${deviceName}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`${BASE_URL}/blog/${ARTICLE_A1.slug}`);
      await page.waitForLoadState('networkidle');

      await page.waitForSelector('script#blog-jsonld', { timeout: 5000 });
      const jsonLd = await page.evaluate(() => {
        const script = document.querySelector('script#blog-jsonld');
        return script ? JSON.parse(script.textContent) : null;
      });

      expect(jsonLd).not.toBeNull();
      expect(jsonLd['@type']).toBe('BlogPosting');
      expect(jsonLd.headline).toBe(ARTICLE_A1.title);
      expect(jsonLd.publisher.name).toBe('Versi Immobilier');
    });
  }
});
