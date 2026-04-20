/**
 * Proxy seed-blog — redirige vers versi-invest-site/scripts/seed-blog.js
 * Compatible CommonJS (pas de "type": "module" à la racine)
 * Non-bloquant : échoue silencieusement si le fichier cible n'existe pas
 */
const { execSync } = require('child_process');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'versi-invest-site', 'scripts', 'seed-blog.js');

try {
  const fs = require('fs');
  if (!fs.existsSync(targetPath)) {
    console.warn('[SEED PROXY] Fichier cible introuvable :', targetPath, '— skip.');
    process.exit(0);
  }
  console.log('[SEED PROXY] Redirection vers', targetPath);
  execSync(`node "${targetPath}"`, {
    env: process.env,
    stdio: 'inherit',
    timeout: 60000,
  });
} catch (err) {
  console.warn('[SEED PROXY] Seed échoué (non-bloquant) :', err.message);
  process.exit(0); // Exit 0 = ne pas bloquer le build
}
