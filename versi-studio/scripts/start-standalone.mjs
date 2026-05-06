#!/usr/bin/env node
/**
 * s32 — Lance le serveur Next.js standalone avec détection dynamique du path.
 *
 * Next.js standalone monorepo produit `.next/standalone/<subdir>/server.js` où
 * <subdir> = nom du dossier projet, qui DIFFÈRE entre environnements :
 *  - Local (versi-studio/) → `.next/standalone/versi-studio/server.js`
 *  - Replit (sous-dossier src/) → `.next/standalone/server.js` à la racine
 *
 * Ce script détecte dynamiquement où est server.js et le lance avec
 * HOSTNAME=0.0.0.0 et PORT=process.env.PORT (ou 5000 par défaut).
 *
 * Remplace l'ancien hardcode `node .next/standalone/versi-studio/server.js`
 * qui cassait sur Replit avec MODULE_NOT_FOUND.
 */
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const STANDALONE_ROOT = join(ROOT, ".next", "standalone");

function findServer() {
  // Cas 1 : server.js directement à la racine standalone (Replit)
  const directServer = join(STANDALONE_ROOT, "server.js");
  if (existsSync(directServer)) return directServer;

  // Cas 2 : monorepo — premier sous-dossier contenant server.js
  if (!existsSync(STANDALONE_ROOT)) {
    throw new Error(
      `[start-standalone] ${STANDALONE_ROOT} introuvable. ` +
        `Avez-vous lancé 'npm run build' ?`,
    );
  }
  const entries = readdirSync(STANDALONE_ROOT, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const candidate = join(STANDALONE_ROOT, entry.name, "server.js");
      if (existsSync(candidate)) return candidate;
    }
  }
  throw new Error(
    `[start-standalone] Impossible de trouver server.js dans ${STANDALONE_ROOT} ` +
      `(ni à la racine, ni dans un sous-dossier).`,
  );
}

const serverPath = findServer();
console.log(`[start-standalone] Lancement de ${serverPath}`);

// HOSTNAME forcé à 0.0.0.0 (et NON via fallback ??) car Cloud Run définit
// process.env.HOSTNAME à l'IP publique externe (ex: 34.117.33.233) qui n'est
// PAS bindable par le serveur → EADDRNOTAVAIL crash loop. Le fallback `??`
// ne se déclenche que sur null/undefined, donc inopérant ici.
const proc = spawn("node", [serverPath], {
  stdio: "inherit",
  env: {
    ...process.env,
    HOSTNAME: "0.0.0.0",
    PORT: process.env.PORT ?? "5000",
  },
});

proc.on("exit", (code) => process.exit(code ?? 0));
proc.on("error", (err) => {
  console.error(`[start-standalone] Erreur de spawn : ${err.message}`);
  process.exit(1);
});
