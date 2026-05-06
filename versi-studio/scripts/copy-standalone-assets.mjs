#!/usr/bin/env node
/**
 * s32 — Post-build : copie les assets statiques dans le standalone build.
 *
 * Next.js `output: "standalone"` génère `.next/standalone/` avec uniquement
 * le serveur Node + deps minimales. Mais il N'INCLUT PAS :
 *  - `.next/static/` (chunks JS/CSS hashés référencés par les pages)
 *  - `public/` (images, favicons, fichiers servis directement)
 *
 * DÉTECTION DYNAMIQUE DU SUBDIR (s32 fix) :
 * Next.js standalone monorepo place le serveur soit :
 *  - directement à `.next/standalone/server.js` (cas Replit, sous-dossier `src/`)
 *  - dans un sous-dossier `.next/standalone/<projectName>/server.js` (cas monorepo local)
 * Le nom du subdir varie selon la racine git/lockfile détectée. On détecte donc
 * dynamiquement où se trouve `server.js` au lieu de hardcoder `versi-studio/`.
 *
 * Pattern documenté Next.js :
 * https://nextjs.org/docs/app/api-reference/config/next-config-js/output#automatically-copying-traced-files
 */
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const STANDALONE_ROOT = join(ROOT, ".next", "standalone");

function detectStandaloneApp() {
  // Cas 1 : server.js directement à la racine du standalone (Replit / app au top)
  if (existsSync(join(STANDALONE_ROOT, "server.js"))) {
    return STANDALONE_ROOT;
  }
  // Cas 2 : monorepo — chercher le premier sous-dossier contenant server.js
  if (!existsSync(STANDALONE_ROOT)) {
    return null;
  }
  const entries = readdirSync(STANDALONE_ROOT, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const candidate = join(STANDALONE_ROOT, entry.name);
      if (existsSync(join(candidate, "server.js"))) {
        return candidate;
      }
    }
  }
  return null;
}

const STANDALONE_APP = detectStandaloneApp();

if (!STANDALONE_APP) {
  console.error(
    `[copy-standalone-assets] ERREUR : aucun server.js trouvé dans ${STANDALONE_ROOT} ` +
      `(ni à la racine, ni dans un sous-dossier). Le build standalone a-t-il bien tourné ? ` +
      `Vérifier next.config.ts (output: "standalone").`,
  );
  process.exit(1);
}

console.log(`[copy-standalone-assets] standalone app détecté : ${STANDALONE_APP}`);

const STATIC_SRC = join(ROOT, ".next", "static");
const STATIC_DST = join(STANDALONE_APP, ".next", "static");
const PUBLIC_SRC = join(ROOT, "public");
const PUBLIC_DST = join(STANDALONE_APP, "public");

// Copie .next/static (chunks JS/CSS) — INDISPENSABLE
if (existsSync(STATIC_SRC)) {
  mkdirSync(dirname(STATIC_DST), { recursive: true });
  cpSync(STATIC_SRC, STATIC_DST, { recursive: true });
  console.log(`[copy-standalone-assets] OK .next/static → ${STATIC_DST}`);
} else {
  console.warn(`[copy-standalone-assets] WARN : ${STATIC_SRC} absent`);
}

// Copie public/ (favicons, images)
if (existsSync(PUBLIC_SRC)) {
  cpSync(PUBLIC_SRC, PUBLIC_DST, { recursive: true });
  console.log(`[copy-standalone-assets] OK public → ${PUBLIC_DST}`);
} else {
  console.warn(`[copy-standalone-assets] WARN : ${PUBLIC_SRC} absent`);
}

console.log("[copy-standalone-assets] standalone prêt pour déploiement Replit.");
