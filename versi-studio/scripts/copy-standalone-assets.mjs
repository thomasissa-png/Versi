#!/usr/bin/env node
/**
 * s32 — Post-build : copie les assets statiques dans le standalone build.
 *
 * Next.js `output: "standalone"` génère `.next/standalone/` avec uniquement
 * le serveur Node + deps minimales. Mais il N'INCLUT PAS :
 *  - `.next/static/` (chunks JS/CSS hashés référencés par les pages)
 *  - `public/` (images, favicons, fichiers servis directement)
 *
 * En monorepo (versi-studio est un sous-dossier du repo Versi), Next.js
 * place le serveur dans `.next/standalone/versi-studio/server.js`.
 * On copie donc :
 *   .next/static  →  .next/standalone/versi-studio/.next/static
 *   public        →  .next/standalone/versi-studio/public
 *
 * Sans cette copie, le déploiement Replit boote mais sert 404 sur tous les
 * chunks JS, et next/image crash sur les fichiers de `public/`.
 *
 * Pattern documenté Next.js :
 * https://nextjs.org/docs/app/api-reference/config/next-config-js/output#automatically-copying-traced-files
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// En monorepo, le standalone server est dans .next/standalone/versi-studio/
// Détection automatique : on cherche server.js récursivement dans .next/standalone
const STANDALONE_ROOT = join(ROOT, ".next", "standalone");
const STANDALONE_APP = join(STANDALONE_ROOT, "versi-studio"); // monorepo path

if (!existsSync(STANDALONE_APP)) {
  console.error(
    `[copy-standalone-assets] ERREUR : ${STANDALONE_APP} introuvable. ` +
      `Le build standalone a-t-il bien tourné ? Vérifier next.config.ts (output: "standalone").`,
  );
  process.exit(1);
}

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
