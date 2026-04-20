/**
 * Script de pré-rendu statique pour les routes sans dépendance API.
 *
 * Utilise Playwright pour visiter chaque route après un build Vite,
 * attend que react-helmet-async ait injecté les balises <head>,
 * puis sauvegarde le HTML complet dans dist/<route>/index.html.
 *
 * Usage : node scripts/prerender.js
 * Pré-requis : `npm run build` doit avoir été exécuté avant.
 */

import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST_DIR = join(__dirname, '..', 'dist');
const PORT = 4173;

// Routes statiques à pré-rendre (pas de paramètre dynamique, pas de dépendance API critique)
const ROUTES = [
  '/',
  '/nos-biens',
  '/vendre',
  '/realisations',
  '/notre-approche',
  '/contact',
  '/blog',
  '/investir',
  '/mentions-legales',
];

// MIME types pour le serveur statique minimal
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml',
};

/**
 * Serveur statique minimal qui sert dist/ et retourne index.html pour les routes SPA.
 */
function startStaticServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let filePath = join(DIST_DIR, req.url === '/' ? '/index.html' : req.url);

      // Si le fichier n'existe pas et n'a pas d'extension, servir index.html (SPA fallback)
      if (!existsSync(filePath) && !extname(filePath)) {
        filePath = join(DIST_DIR, 'index.html');
      }

      try {
        const content = readFileSync(filePath);
        const ext = extname(filePath);
        const mime = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime });
        res.end(content);
      } catch {
        // Fichier introuvable — fallback index.html
        try {
          const fallback = readFileSync(join(DIST_DIR, 'index.html'));
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(fallback);
        } catch {
          res.writeHead(404);
          res.end('Not found');
        }
      }
    });

    server.listen(PORT, () => {
      console.log(`  Serveur statique démarré sur http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

async function prerender() {
  console.log('\n--- Pré-rendu statique (Playwright) ---\n');

  if (!existsSync(DIST_DIR)) {
    console.error('  ERREUR : dist/ introuvable. Exécuter `npm run build` avant.');
    process.exit(1);
  }

  const server = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  let success = 0;
  let failed = 0;

  for (const route of ROUTES) {
    const url = `http://localhost:${PORT}${route}`;
    console.log(`  Rendu : ${route}`);

    try {
      const page = await context.newPage();

      // Bloquer les requêtes API pour éviter les timeouts
      // (les pages statiques ne dépendent pas des données API pour leur structure)
      await page.route('**/api/**', (routeObj) => routeObj.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      }));

      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

      // Attendre que react-helmet-async ait injecté le title
      await page.waitForFunction(
        () => document.title && !document.title.includes('Marchand de biens | Lille et Paris'),
        { timeout: 5000 }
      ).catch(() => {
        // Pas grave si le title n'a pas changé (page d'accueil garde un title similaire)
      });

      // Petit délai pour laisser les animations de fade-in se déclencher
      await page.waitForTimeout(500);

      // Extraire le title et la description actifs du DOM.
      // react-helmet-async ajoute ses tags en plus des originaux du index.html.
      // Les tags de helmet sont les DERNIERS dans le DOM, donc on prend le dernier de chaque.
      const activeTitle = await page.title();
      const activeDesc = await page.evaluate(() => {
        const metas = document.querySelectorAll('meta[name="description"]');
        return metas.length > 0 ? metas[metas.length - 1].getAttribute('content') || '' : '';
      });
      const activeCanonical = await page.evaluate(() => {
        const links = document.querySelectorAll('link[rel="canonical"]');
        return links.length > 0 ? links[links.length - 1].getAttribute('href') || '' : '';
      });
      const noindex = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="robots"][content*="noindex"]');
        return !!meta;
      });

      let html = await page.content();
      await page.close();

      // Supprimer TOUTES les balises title, description, canonical et robots dupliquées,
      // puis injecter les bonnes valeurs une seule fois.
      html = html.replace(/<title>[^<]*<\/title>/g, '');
      html = html.replace(/<meta name="description" content="[^"]*"\s*\/?>/g, '');
      html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/g, '');
      html = html.replace(/<meta name="robots" content="[^"]*"\s*\/?>/g, '');
      // Supprimer aussi le commentaire placeholder laissé dans index.html
      html = html.replace(/<!-- Canonical géré par react-helmet-async \(par page\) -->\n?\s*/g, '');

      // Injecter les balises correctes juste après <meta charset>
      const seoTags = [
        `<title>${activeTitle}</title>`,
        `<meta name="description" content="${activeDesc}">`,
        activeCanonical ? `<link rel="canonical" href="${activeCanonical}">` : '',
        noindex ? '<meta name="robots" content="noindex, follow">' : '',
      ].filter(Boolean).join('\n    ');

      html = html.replace(
        /(<meta charset="UTF-8">)/i,
        `$1\n    ${seoTags}`
      );

      // Écrire le HTML dans dist/<route>/index.html
      const outputDir = route === '/'
        ? DIST_DIR
        : join(DIST_DIR, route.replace(/^\//, ''));

      if (route !== '/') {
        mkdirSync(outputDir, { recursive: true });
      }

      const outputPath = join(outputDir, 'index.html');
      writeFileSync(outputPath, html, 'utf-8');

      console.log(`    -> ${outputPath.replace(DIST_DIR, 'dist')}`);
      success++;
    } catch (err) {
      console.error(`    ERREUR sur ${route}: ${err.message}`);
      failed++;
    }
  }

  await browser.close();
  server.close();

  console.log(`\n  Terminé : ${success} pages pré-rendues, ${failed} erreurs.\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

prerender();
