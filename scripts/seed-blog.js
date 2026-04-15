/**
 * Proxy — redirige vers le vrai seed dans versi-invest-site/
 * Existe à la racine pour que Replit puisse le trouver avec :
 *   node scripts/seed-blog.js
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const investSeedPath = join(__dirname, '..', 'versi-invest-site', 'scripts', 'seed-blog.js');

console.log('[SEED PROXY] Redirection vers versi-invest-site/scripts/seed-blog.js');

try {
  execSync(`node "${investSeedPath}"`, {
    env: process.env,
    stdio: 'inherit',
    timeout: 60000,
  });
} catch (err) {
  console.warn('[SEED PROXY] Seed échoué (non-bloquant) :', err.message);
}
