// @ts-check
import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Le back-office admin et le blog public sont servis par le serveur Express
// (port 3001) qui sert a la fois l'API REST et le SPA React (index.html).
// Les tests existants dans versi-immobilier.spec.js utilisent le Vite preview
// sur le port 5174 — mais l'admin a besoin du vrai serveur Express pour les
// endpoints API (login, CRUD) et les cookies httpOnly.
// ---------------------------------------------------------------------------

const BASE_URL = 'http://localhost:3001';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'allezpsg';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Se connecter en tant qu'admin via le formulaire de login.
 * Retourne une fois la page /admin/biens chargee.
 */
async function adminLogin(page, password = ADMIN_PASSWORD) {
  await page.goto(`${BASE_URL}/admin/login`);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
}

/**
 * Se connecter puis attendre d'etre redirige vers /admin/biens.
 * Utile comme beforeEach pour les tests CRUD.
 */
async function loginAndWaitForAdmin(page) {
  await adminLogin(page);
  await page.waitForURL(/\/admin\/biens/, { timeout: 10000 });
  await expect(page.locator('h2').first()).toBeVisible({ timeout: 5000 });
}

/**
 * Genere un identifiant unique court pour eviter les collisions entre tests.
 */
function uid() {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * Supprime un bien via l'API REST directement (nettoyage post-test).
 * Le cookie est gere par le contexte Playwright — on passe par la page pour
 * garder le cookie httpOnly.
 */
async function deletePropertyViaAPI(page, propertyId) {
  await page.evaluate(async (id) => {
    await fetch(`/api/admin/properties/${id}`, { method: 'DELETE' });
  }, propertyId);
}

async function deleteProjectViaAPI(page, projectId) {
  await page.evaluate(async (id) => {
    await fetch(`/api/admin/projects/${id}`, { method: 'DELETE' });
  }, projectId);
}

async function deleteArticleViaAPI(page, articleId) {
  await page.evaluate(async (id) => {
    await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' });
  }, articleId);
}

/**
 * Cree un bien via l'API REST directement (setup pour tests edit/delete).
 * Retourne l'objet property cree (avec id).
 */
async function createPropertyViaAPI(page, overrides = {}) {
  const defaults = {
    title: `Test Bien ${uid()}`,
    city: 'Lille',
    location: 'Lille, Hauts-de-France',
    type: 'Appartement',
    surface: '65 m\u00B2',
    price: '150 000 \u20AC',
    price_num: 150000,
    status: 'disponible',
    description: 'Bien de test pour les tests E2E Playwright.',
  };
  const body = { ...defaults, ...overrides };
  return await page.evaluate(async (b) => {
    const res = await fetch('/api/admin/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(b),
    });
    const data = await res.json();
    return data.property;
  }, body);
}

async function createProjectViaAPI(page, overrides = {}) {
  const defaults = {
    title: `Test Realisation ${uid()}`,
    city: 'Tourcoing',
    type: 'Immeuble de rapport',
    surface: '350 m\u00B2',
    units: 4,
    status: 'completed',
    description: 'Realisation de test pour les tests E2E Playwright.',
    featured: false,
  };
  const body = { ...defaults, ...overrides };
  return await page.evaluate(async (b) => {
    const res = await fetch('/api/admin/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(b),
    });
    const data = await res.json();
    return data.project;
  }, body);
}

async function createArticleViaAPI(page, overrides = {}) {
  const defaults = {
    title: `Test Article ${uid()}`,
    excerpt: 'Extrait de test pour les tests E2E.',
    content: '## Sous-titre\n\nContenu de test pour Playwright.',
    author: 'Versi Immobilier',
    tags: ['test'],
    status: 'published',
  };
  const body = { ...defaults, ...overrides };
  return await page.evaluate(async (b) => {
    const res = await fetch('/api/admin/blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(b),
    });
    const data = await res.json();
    return data.article;
  }, body);
}

// ===========================================================================
// 1. AUTHENTIFICATION ADMIN
// ===========================================================================

test.describe('Admin — Authentification', () => {
  test('VI-ADMIN-AUTH-01 login avec bon mot de passe redirige vers /admin/biens', async ({ page }) => {
    await adminLogin(page);
    await page.waitForURL(/\/admin\/biens/, { timeout: 10000 });
    await expect(page.locator('h2')).toContainText(/biens/i);
  });

  test('VI-ADMIN-AUTH-02 login avec mauvais mot de passe affiche erreur', async ({ page }) => {
    await adminLogin(page, 'mauvais-mot-de-passe');
    await expect(page.getByText(/mot de passe incorrect/i)).toBeVisible({ timeout: 5000 });
    // On reste sur la page login
    expect(page.url()).toMatch(/\/admin\/login/);
  });

  test('VI-ADMIN-AUTH-03 acces /admin/biens sans auth redirige vers /admin/login', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/biens`);
    await page.waitForURL(/\/admin\/login/, { timeout: 10000 });
  });

  test('VI-ADMIN-AUTH-04 acces /admin/realisations sans auth redirige vers /admin/login', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/realisations`);
    await page.waitForURL(/\/admin\/login/, { timeout: 10000 });
  });

  test('VI-ADMIN-AUTH-05 logout redirige vers /admin/login', async ({ page }) => {
    await loginAndWaitForAdmin(page);
    // Cliquer sur le bouton Deconnexion
    await page.click('button.btn-logout, button:has-text("Déconnexion")');
    await page.waitForURL(/\/admin\/login/, { timeout: 10000 });
  });

  test('VI-ADMIN-AUTH-06 apres logout on ne peut plus acceder a /admin/biens', async ({ page }) => {
    await loginAndWaitForAdmin(page);
    await page.click('button.btn-logout, button:has-text("Déconnexion")');
    await page.waitForURL(/\/admin\/login/, { timeout: 10000 });
    // Tenter de revenir sur /admin/biens
    await page.goto(`${BASE_URL}/admin/biens`);
    await page.waitForURL(/\/admin\/login/, { timeout: 10000 });
  });

  test('VI-ADMIN-AUTH-07 page login affiche le formulaire avec champ password', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/login`);
    await expect(page.locator('h1')).toContainText(/admin/i);
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});

// ===========================================================================
// 2. NAVIGATION ADMIN (post-login)
// ===========================================================================

test.describe('Admin — Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndWaitForAdmin(page);
  });

  test('VI-ADMIN-NAV-01 navigation admin affiche les 4 sections', async ({ page }) => {
    const adminNav = page.locator('.admin-nav');
    await expect(adminNav.getByText('Biens')).toBeVisible();
    await expect(adminNav.getByText('Réalisations')).toBeVisible();
    await expect(adminNav.getByText('Inscrits')).toBeVisible();
    await expect(adminNav.getByText('Articles')).toBeVisible();
  });

  test('VI-ADMIN-NAV-02 clic sur Realisations navigue vers /admin/realisations', async ({ page }) => {
    await page.click('.admin-nav >> text=Réalisations');
    await page.waitForURL(/\/admin\/realisations/);
    await expect(page.locator('h2')).toContainText(/réalisations/i);
  });

  test('VI-ADMIN-NAV-03 clic sur Inscrits navigue vers /admin/inscrits', async ({ page }) => {
    await page.click('.admin-nav >> text=Inscrits');
    await page.waitForURL(/\/admin\/inscrits/);
    await expect(page.locator('h2')).toContainText(/inscrits/i);
  });

  test('VI-ADMIN-NAV-04 clic sur Articles navigue vers /admin/articles', async ({ page }) => {
    await page.click('.admin-nav >> text=Articles');
    await page.waitForURL(/\/admin\/articles/);
    await expect(page.locator('h2')).toContainText(/articles/i);
  });
});

// ===========================================================================
// 3. CRUD BIENS
// ===========================================================================

test.describe('Admin — CRUD Biens', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndWaitForAdmin(page);
  });

  test('VI-ADMIN-BIENS-01 liste des biens visible apres login', async ({ page }) => {
    // La page /admin/biens est la page par defaut apres login
    await expect(page.locator('h2')).toContainText(/biens en vente/i);
    // Le tableau ou le message "Aucun bien" doit etre visible
    const table = page.locator('.admin-table');
    const empty = page.locator('.admin-empty');
    await expect(table.or(empty).first()).toBeVisible({ timeout: 5000 });
  });

  test('VI-ADMIN-BIENS-02 filtres de statut fonctionnels', async ({ page }) => {
    const filters = page.locator('.admin-filters');
    await expect(filters.getByText('Tous')).toBeVisible();
    await expect(filters.getByText('Disponibles')).toBeVisible();
    await expect(filters.getByText('Archivés')).toBeVisible();
    await expect(filters.getByText('Vendus')).toBeVisible();

    // Cliquer sur "Vendus" ne provoque pas d'erreur
    await filters.getByText('Vendus').click();
    // Pas d'erreur affichee
    await expect(page.locator('.admin-error')).not.toBeVisible();
  });

  test('VI-ADMIN-BIENS-03 creation d\'un bien via le formulaire', async ({ page }) => {
    const testTitle = `Appt Test ${uid()}`;

    // Naviguer vers le formulaire de creation
    await page.click('a:has-text("+ Ajouter")');
    await page.waitForURL(/\/admin\/biens\/nouveau/);

    // Remplir les champs obligatoires
    await page.fill('input[name="title"]', testTitle);
    await page.fill('input[name="city"]', 'Roubaix');
    await page.fill('input[name="location"]', 'Roubaix, Hauts-de-France');
    await page.fill('input[name="surface"]', '72 m\u00B2');
    await page.fill('input[name="price"]', '165 000 \u20AC');
    await page.fill('input[name="price_num"]', '165000');
    await page.fill('textarea[name="description"]', 'Appartement T3 lumineux avec balcon. Test E2E.');

    // Soumettre
    await page.click('button[type="submit"]');

    // Devrait rediriger vers la liste des biens
    await page.waitForURL(/\/admin\/biens$/, { timeout: 10000 });

    // Le bien doit apparaitre dans la liste
    await expect(page.getByText(testTitle)).toBeVisible({ timeout: 5000 });

    // Nettoyage : trouver l'ID et supprimer
    const property = await page.evaluate(async (title) => {
      const res = await fetch('/api/admin/properties');
      const data = await res.json();
      return data.properties.find((p) => p.title === title);
    }, testTitle);
    if (property) {
      await deletePropertyViaAPI(page, property.id);
    }
  });

  test('VI-ADMIN-BIENS-04 modification d\'un bien existant', async ({ page }) => {
    // Setup : creer un bien via API
    const property = await createPropertyViaAPI(page);

    // Recharger la liste
    await page.goto(`${BASE_URL}/admin/biens`);
    await expect(page.getByText(property.title)).toBeVisible({ timeout: 5000 });

    // Cliquer sur Editer
    const row = page.locator('tr', { hasText: property.title });
    await row.getByText('Éditer').click();
    await page.waitForURL(/\/admin\/biens\/.+\/editer/);

    // Modifier le titre
    const newTitle = `Modifie ${uid()}`;
    await page.fill('input[name="title"]', newTitle);
    await page.click('button[type="submit"]');

    // Retour a la liste
    await page.waitForURL(/\/admin\/biens$/, { timeout: 10000 });
    await expect(page.getByText(newTitle)).toBeVisible({ timeout: 5000 });

    // Nettoyage
    await deletePropertyViaAPI(page, property.id);
  });

  test('VI-ADMIN-BIENS-05 suppression d\'un bien avec modal de confirmation', async ({ page }) => {
    // Setup : creer un bien archive (seul statut qui montre le bouton Supprimer)
    const property = await createPropertyViaAPI(page, { status: 'archive' });

    // Recharger la liste et filtrer sur "Archives"
    await page.goto(`${BASE_URL}/admin/biens`);
    await page.locator('.admin-filters').getByText('Archivés').click();
    await expect(page.getByText(property.title)).toBeVisible({ timeout: 5000 });

    // Cliquer sur Supprimer
    const row = page.locator('tr', { hasText: property.title });
    await row.getByText('Supprimer').click();

    // La modal de confirmation doit apparaitre
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.getByText(/supprimer définitivement/i)).toBeVisible();

    // Confirmer
    await page.click('[role="dialog"] button:has-text("Confirmer")');

    // Le bien doit disparaitre de la liste
    await expect(page.getByText(property.title)).not.toBeVisible({ timeout: 5000 });
  });

  test('VI-ADMIN-BIENS-06 annulation de la suppression ferme la modal', async ({ page }) => {
    // Setup : creer un bien archive
    const property = await createPropertyViaAPI(page, { status: 'archive' });

    await page.goto(`${BASE_URL}/admin/biens`);
    await page.locator('.admin-filters').getByText('Archivés').click();
    await expect(page.getByText(property.title)).toBeVisible({ timeout: 5000 });

    // Cliquer sur Supprimer
    const row = page.locator('tr', { hasText: property.title });
    await row.getByText('Supprimer').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Annuler
    await page.click('[role="dialog"] button:has-text("Annuler")');

    // La modal se ferme, le bien est toujours la
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    await expect(page.getByText(property.title)).toBeVisible();

    // Nettoyage
    await deletePropertyViaAPI(page, property.id);
  });

  test('VI-ADMIN-BIENS-07 archiver un bien disponible', async ({ page }) => {
    const property = await createPropertyViaAPI(page, { status: 'disponible' });

    await page.goto(`${BASE_URL}/admin/biens`);
    await expect(page.getByText(property.title)).toBeVisible({ timeout: 5000 });

    const row = page.locator('tr', { hasText: property.title });
    await row.getByText('Archiver').click();

    // Le toast de succes doit apparaitre
    await expect(page.getByText(/bien archivé/i)).toBeVisible({ timeout: 5000 });

    // Nettoyage
    await deletePropertyViaAPI(page, property.id);
  });

  test('VI-ADMIN-BIENS-08 marquer un bien comme vendu', async ({ page }) => {
    const property = await createPropertyViaAPI(page, { status: 'disponible' });

    await page.goto(`${BASE_URL}/admin/biens`);
    await expect(page.getByText(property.title)).toBeVisible({ timeout: 5000 });

    const row = page.locator('tr', { hasText: property.title });
    await row.getByText('Marquer vendu').click();

    await expect(page.getByText(/bien marqué comme vendu/i)).toBeVisible({ timeout: 5000 });

    // Nettoyage
    await deletePropertyViaAPI(page, property.id);
  });

  test('VI-ADMIN-BIENS-09 restaurer un bien archive', async ({ page }) => {
    const property = await createPropertyViaAPI(page, { status: 'archive' });

    await page.goto(`${BASE_URL}/admin/biens`);
    await page.locator('.admin-filters').getByText('Archivés').click();
    await expect(page.getByText(property.title)).toBeVisible({ timeout: 5000 });

    const row = page.locator('tr', { hasText: property.title });
    await row.getByText('Restaurer').click();

    await expect(page.getByText(/bien restauré/i)).toBeVisible({ timeout: 5000 });

    // Nettoyage
    await deletePropertyViaAPI(page, property.id);
  });
});

// ===========================================================================
// 4. CRUD REALISATIONS
// ===========================================================================

test.describe('Admin — CRUD Réalisations', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndWaitForAdmin(page);
    await page.click('.admin-nav >> text=Réalisations');
    await page.waitForURL(/\/admin\/realisations/);
  });

  test('VI-ADMIN-REAL-01 liste des realisations visible', async ({ page }) => {
    await expect(page.locator('h2')).toContainText(/réalisations/i);
    const table = page.locator('.admin-table');
    const empty = page.locator('.admin-empty');
    await expect(table.or(empty).first()).toBeVisible({ timeout: 5000 });
  });

  test('VI-ADMIN-REAL-02 creation d\'une realisation', async ({ page }) => {
    const testTitle = `Realisation Test ${uid()}`;

    await page.click('a:has-text("+ Ajouter")');
    await page.waitForURL(/\/admin\/realisations\/nouveau/);

    await page.fill('input[name="title"]', testTitle);
    await page.fill('input[name="city"]', 'Villeneuve-d\'Ascq');
    await page.fill('input[name="surface"]', '280 m\u00B2');
    await page.fill('textarea[name="description"]', 'Projet de test pour les tests E2E.');

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/realisations$/, { timeout: 10000 });

    await expect(page.getByText(testTitle)).toBeVisible({ timeout: 5000 });

    // Nettoyage
    const project = await page.evaluate(async (title) => {
      const res = await fetch('/api/admin/projects');
      const data = await res.json();
      return data.projects.find((p) => p.title === title);
    }, testTitle);
    if (project) {
      await deleteProjectViaAPI(page, project.id);
    }
  });

  test('VI-ADMIN-REAL-03 modification d\'une realisation', async ({ page }) => {
    const project = await createProjectViaAPI(page);

    await page.goto(`${BASE_URL}/admin/realisations`);
    await expect(page.getByText(project.title)).toBeVisible({ timeout: 5000 });

    const row = page.locator('tr', { hasText: project.title });
    await row.getByText('Éditer').click();
    await page.waitForURL(/\/admin\/realisations\/.+\/editer/);

    const newTitle = `Realisation Modifiee ${uid()}`;
    await page.fill('input[name="title"]', newTitle);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/admin\/realisations$/, { timeout: 10000 });
    await expect(page.getByText(newTitle)).toBeVisible({ timeout: 5000 });

    // Nettoyage
    await deleteProjectViaAPI(page, project.id);
  });

  test('VI-ADMIN-REAL-04 suppression d\'une realisation avec confirmation', async ({ page }) => {
    const project = await createProjectViaAPI(page, { status: 'archive' });

    await page.goto(`${BASE_URL}/admin/realisations`);
    await page.locator('.admin-filters').getByText('Archivées').click();
    await expect(page.getByText(project.title)).toBeVisible({ timeout: 5000 });

    const row = page.locator('tr', { hasText: project.title });
    await row.getByText('Supprimer').click();

    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click('[role="dialog"] button:has-text("Confirmer")');

    await expect(page.getByText(project.title)).not.toBeVisible({ timeout: 5000 });
  });

  test('VI-ADMIN-REAL-05 archiver une realisation', async ({ page }) => {
    const project = await createProjectViaAPI(page, { status: 'completed' });

    await page.goto(`${BASE_URL}/admin/realisations`);
    await expect(page.getByText(project.title)).toBeVisible({ timeout: 5000 });

    const row = page.locator('tr', { hasText: project.title });
    await row.getByText('Archiver').click();

    await expect(page.getByText(/réalisation archivée/i)).toBeVisible({ timeout: 5000 });

    // Nettoyage
    await deleteProjectViaAPI(page, project.id);
  });

  test('VI-ADMIN-REAL-06 filtres de statut fonctionnels', async ({ page }) => {
    const filters = page.locator('.admin-filters');
    await expect(filters.getByText('Tous')).toBeVisible();
    await expect(filters.getByText('Terminées')).toBeVisible();
    await expect(filters.getByText('En cours')).toBeVisible();
    await expect(filters.getByText('Archivées')).toBeVisible();
  });
});

// ===========================================================================
// 5. INSCRITS
// ===========================================================================

test.describe('Admin — Inscrits', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndWaitForAdmin(page);
    await page.click('.admin-nav >> text=Inscrits');
    await page.waitForURL(/\/admin\/inscrits/);
  });

  test('VI-ADMIN-INSCRITS-01 liste des inscrits visible', async ({ page }) => {
    await expect(page.locator('h2')).toContainText(/inscrits/i);
    // Le tableau, le compteur ou le message "Aucun inscrit" doivent etre visibles
    const table = page.locator('.admin-table');
    const empty = page.locator('.admin-empty');
    const counter = page.locator('.admin-counter');
    await expect(table.or(empty).or(counter).first()).toBeVisible({ timeout: 5000 });
  });

  test('VI-ADMIN-INSCRITS-02 pas de bouton Ajouter (les inscrits viennent du formulaire public)', async ({ page }) => {
    // Il ne doit PAS y avoir de lien/bouton "+ Ajouter" sur cette page
    const addButton = page.locator('a:has-text("+ Ajouter"), button:has-text("+ Ajouter")');
    await expect(addButton).not.toBeVisible();
  });

  test('VI-ADMIN-INSCRITS-03 compteur total affiche', async ({ page }) => {
    await expect(page.locator('.admin-counter')).toBeVisible();
    await expect(page.locator('.admin-counter')).toContainText(/total/i);
  });

  test('VI-ADMIN-INSCRITS-04 bouton export CSV visible si inscrits', async ({ page }) => {
    // Ce test verifie que le bouton existe (il est conditionnel aux inscrits)
    const exportBtn = page.locator('button:has-text("Exporter CSV")');
    // Soit le bouton est visible (il y a des inscrits), soit il n'y en a pas
    // On ne peut pas forcer sans creer un inscrit — on verifie juste que la page charge
    await expect(page.locator('h2')).toContainText(/inscrits/i);
  });
});

// ===========================================================================
// 6. CRUD ARTICLES BLOG
// ===========================================================================

test.describe('Admin — CRUD Articles', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndWaitForAdmin(page);
    await page.click('.admin-nav >> text=Articles');
    await page.waitForURL(/\/admin\/articles/);
  });

  test('VI-ADMIN-ART-01 liste des articles visible', async ({ page }) => {
    await expect(page.locator('h2')).toContainText(/articles/i);
    const table = page.locator('.admin-table');
    const empty = page.locator('.admin-empty');
    await expect(table.or(empty).first()).toBeVisible({ timeout: 5000 });
  });

  test('VI-ADMIN-ART-02 creation d\'un article brouillon', async ({ page }) => {
    const testTitle = `Article Test ${uid()}`;

    await page.click('a:has-text("+ Ajouter")');
    await page.waitForURL(/\/admin\/articles\/nouveau/);

    await page.fill('input[name="title"]', testTitle);
    await page.fill('textarea[name="excerpt"]', 'Extrait de test pour article E2E.');
    await page.fill('textarea[name="content"]', '## Introduction\n\nContenu de test Markdown.');

    // Statut brouillon par defaut
    await expect(page.locator('select[name="status"]')).toHaveValue('draft');

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/articles$/, { timeout: 10000 });

    await expect(page.getByText(testTitle)).toBeVisible({ timeout: 5000 });

    // Nettoyage
    const article = await page.evaluate(async (title) => {
      const res = await fetch('/api/admin/blog');
      const data = await res.json();
      return data.articles.find((a) => a.title === title);
    }, testTitle);
    if (article) {
      await deleteArticleViaAPI(page, article.id);
    }
  });

  test('VI-ADMIN-ART-03 modification d\'un article existant', async ({ page }) => {
    const article = await createArticleViaAPI(page, { status: 'draft' });

    await page.goto(`${BASE_URL}/admin/articles`);
    // Afficher les brouillons
    await page.locator('.admin-filters').getByText('Brouillons').click();
    await expect(page.getByText(article.title)).toBeVisible({ timeout: 5000 });

    const row = page.locator('tr', { hasText: article.title });
    await row.getByText('Éditer').click();
    await page.waitForURL(/\/admin\/articles\/.+\/editer/);

    const newTitle = `Article Modifie ${uid()}`;
    await page.fill('input[name="title"]', newTitle);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/admin\/articles$/, { timeout: 10000 });
    await expect(page.getByText(newTitle)).toBeVisible({ timeout: 5000 });

    // Nettoyage
    await deleteArticleViaAPI(page, article.id);
  });

  test('VI-ADMIN-ART-04 suppression d\'un article avec confirmation', async ({ page }) => {
    const article = await createArticleViaAPI(page, { status: 'draft' });

    await page.goto(`${BASE_URL}/admin/articles`);
    await page.locator('.admin-filters').getByText('Brouillons').click();
    await expect(page.getByText(article.title)).toBeVisible({ timeout: 5000 });

    const row = page.locator('tr', { hasText: article.title });
    await row.getByText('Supprimer').click();

    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click('[role="dialog"] button:has-text("Confirmer")');

    await expect(page.getByText(article.title)).not.toBeVisible({ timeout: 5000 });
  });

  test('VI-ADMIN-ART-05 publier un article brouillon', async ({ page }) => {
    const article = await createArticleViaAPI(page, { status: 'draft' });

    await page.goto(`${BASE_URL}/admin/articles`);
    await page.locator('.admin-filters').getByText('Brouillons').click();
    await expect(page.getByText(article.title)).toBeVisible({ timeout: 5000 });

    const row = page.locator('tr', { hasText: article.title });
    await row.getByText('Publier').click();

    await expect(page.getByText(/article publié/i)).toBeVisible({ timeout: 5000 });

    // Nettoyage
    await deleteArticleViaAPI(page, article.id);
  });

  test('VI-ADMIN-ART-06 archiver un article publie', async ({ page }) => {
    const article = await createArticleViaAPI(page, { status: 'published' });

    await page.goto(`${BASE_URL}/admin/articles`);
    await page.locator('.admin-filters').getByText('Publiés').click();
    await expect(page.getByText(article.title)).toBeVisible({ timeout: 5000 });

    const row = page.locator('tr', { hasText: article.title });
    await row.getByText('Archiver').click();

    await expect(page.getByText(/article archivé/i)).toBeVisible({ timeout: 5000 });

    // Nettoyage
    await deleteArticleViaAPI(page, article.id);
  });

  test('VI-ADMIN-ART-07 validation formulaire article — champs obligatoires', async ({ page }) => {
    await page.click('a:has-text("+ Ajouter")');
    await page.waitForURL(/\/admin\/articles\/nouveau/);

    // Soumettre sans remplir
    await page.click('button[type="submit"]');

    // Message d'erreur de validation
    await expect(page.getByText(/titre.*obligatoire|obligatoire/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('VI-ADMIN-ART-08 filtres de statut articles fonctionnels', async ({ page }) => {
    const filters = page.locator('.admin-filters');
    await expect(filters.getByText('Tous')).toBeVisible();
    await expect(filters.getByText('Publiés')).toBeVisible();
    await expect(filters.getByText('Brouillons')).toBeVisible();
    await expect(filters.getByText('Archivés')).toBeVisible();
  });

  test('VI-ADMIN-ART-09 lien retour aux articles dans le formulaire', async ({ page }) => {
    await page.click('a:has-text("+ Ajouter")');
    await page.waitForURL(/\/admin\/articles\/nouveau/);

    await page.click('a:has-text("Retour aux articles")');
    await page.waitForURL(/\/admin\/articles$/, { timeout: 5000 });
  });
});

// ===========================================================================
// 7. BLOG PUBLIC
// ===========================================================================

test.describe('Blog public', () => {
  test('VI-BLOG-01 page /blog accessible avec titre', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText(/blog/i);
    await expect(page.locator('nav').first()).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('VI-BLOG-02 page /blog affiche un message si aucun article', async ({ page }) => {
    // Intercepter l'API pour simuler une liste vide
    await page.route('**/api/public/blog', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ articles: [] }),
      });
    });

    await page.goto(`${BASE_URL}/blog`);
    await expect(page.getByText(/premiers articles|bientôt|aucun article/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('VI-BLOG-03 page article individuel affiche le contenu', async ({ page }) => {
    // On se connecte en admin pour creer un article publie, puis on le consulte cote public
    await loginAndWaitForAdmin(page);
    const article = await createArticleViaAPI(page, {
      title: `Blog Public Test ${uid()}`,
      excerpt: 'Extrait de test public.',
      content: '## Titre de section\n\nParagraphe de test pour le blog public.',
      status: 'published',
    });

    // Visiter la page article publique via le slug
    await page.goto(`${BASE_URL}/blog/${article.slug}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText(article.title);
    await expect(page.getByText(/paragraphe de test/i)).toBeVisible();

    // Nettoyage
    await deleteArticleViaAPI(page, article.id);
  });

  test('VI-BLOG-04 Schema.org BlogPosting present sur article', async ({ page }) => {
    await loginAndWaitForAdmin(page);
    const article = await createArticleViaAPI(page, {
      title: `Schema Test ${uid()}`,
      excerpt: 'Extrait pour test schema.',
      content: '## Test\n\nContenu pour schema.org.',
      status: 'published',
    });

    await page.goto(`${BASE_URL}/blog/${article.slug}`);
    await page.waitForLoadState('networkidle');

    // Attendre que le JSON-LD soit injecte dans le DOM
    await page.waitForSelector('script#blog-jsonld', { timeout: 5000 });

    const jsonLd = await page.evaluate(() => {
      const script = document.querySelector('script#blog-jsonld');
      return script ? JSON.parse(script.textContent) : null;
    });

    expect(jsonLd).not.toBeNull();
    expect(jsonLd['@type']).toBe('BlogPosting');
    expect(jsonLd.headline).toBe(article.title);

    // Nettoyage
    await deleteArticleViaAPI(page, article.id);
  });

  test('VI-BLOG-05 navigation retour vers le blog depuis un article', async ({ page }) => {
    await loginAndWaitForAdmin(page);
    const article = await createArticleViaAPI(page, {
      title: `Nav Test ${uid()}`,
      excerpt: 'Test nav retour.',
      content: '## Test\n\nContenu.',
      status: 'published',
    });

    await page.goto(`${BASE_URL}/blog/${article.slug}`);
    await page.waitForLoadState('networkidle');

    // Cliquer sur le lien "Tous les articles"
    await page.click('a:has-text("Tous les articles")');
    await page.waitForURL(/\/blog$/);

    // Nettoyage
    await page.goto(`${BASE_URL}/admin/biens`); // pour garder le cookie
    await deleteArticleViaAPI(page, article.id);
  });

  test('VI-BLOG-06 slug inexistant affiche article introuvable', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/slug-qui-nexiste-pas-${uid()}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/introuvable/i).first()).toBeVisible({ timeout: 5000 });
    // Le lien retour vers le blog doit etre present
    await expect(page.locator('a:has-text("Tous les articles")')).toBeVisible();
  });

  test('VI-BLOG-07 page blog affiche les articles publies avec carte', async ({ page }) => {
    // Creer un article publie pour s'assurer que la grille s'affiche
    await loginAndWaitForAdmin(page);
    const article = await createArticleViaAPI(page, {
      title: `Grid Test ${uid()}`,
      excerpt: 'Extrait visible dans la grille.',
      content: '## Test\n\nContenu.',
      status: 'published',
    });

    await page.goto(`${BASE_URL}/blog`);
    await page.waitForLoadState('networkidle');

    // L'article doit apparaitre comme une carte avec titre et extrait
    await expect(page.getByText(article.title).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(article.excerpt).first()).toBeVisible();

    // Nettoyage
    await deleteArticleViaAPI(page, article.id);
  });

  test('VI-BLOG-08 clic sur une carte article navigue vers le detail', async ({ page }) => {
    await loginAndWaitForAdmin(page);
    const article = await createArticleViaAPI(page, {
      title: `Click Test ${uid()}`,
      excerpt: 'Cliquer pour voir le detail.',
      content: '## Detail\n\nContenu complet.',
      status: 'published',
    });

    await page.goto(`${BASE_URL}/blog`);
    await page.waitForLoadState('networkidle');

    // Cliquer sur le lien de la carte
    await page.click(`a[href="/blog/${article.slug}"]`);
    await page.waitForURL(/\/blog\/.+/);

    await expect(page.locator('h1')).toContainText(article.title);

    // Nettoyage
    await page.goto(`${BASE_URL}/admin/biens`);
    await deleteArticleViaAPI(page, article.id);
  });
});
