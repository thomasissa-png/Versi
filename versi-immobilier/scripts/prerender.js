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

      let html = await page.content();
      await page.close();

      // Nettoyer les balises dupliquées : react-helmet-async ajoute ses tags
      // en début de <head>, mais les tags originaux de index.html restent.
      // On garde uniquement le PREMIER <title> et la PREMIÈRE <meta name="description">.
      let titleCount = 0;
      html = html.replace(/<title>[^<]*<\/title>/g, (match) => {
        titleCount++;
        return titleCount === 1 ? match : '';
      });
      let descCount = 0;
      html = html.replace(/<meta name="description" content="[^"]*">/g, (match) => {
        descCount++;
        return descCount === 1 ? match : '';
      });

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
