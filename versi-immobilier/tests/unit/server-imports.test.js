// versi-immobilier/tests/unit/server-imports.test.js
// -----------------------------------------------------------------------------
// Garde-fou anti-P0 : valide que CHAQUE export importé par server.js existe
// réellement dans le module source. Un import manquant (ex. s31 :
// `upsertLilleProjects` absent de `scripts/lille-projects.js`) doit faire
// ÉCHOUER les tests, pas seulement le boot prod.
//
// Stratégie : import dynamique de chaque module applicatif importé en tête de
// `server.js`, puis assertion de la présence (et du type) des exports utilisés.
// On NE booe PAS server.js (qui appelle listen() et ouvre Express).
//
// Run : node --test tests/unit/server-imports.test.js
// -----------------------------------------------------------------------------

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

// -----------------------------------------------------------------------------
// Source de vérité : liste des imports applicatifs en tête de server.js.
// Si server.js change, ce tableau doit être mis à jour. Le test
// `server.js imports drift` détecte les ajouts non répertoriés ici.
// -----------------------------------------------------------------------------
const EXPECTED_IMPORTS = [
  {
    spec: './db.js',
    exports: [{ name: 'default', type: 'object' }],
  },
  {
    spec: './gate-runner.js',
    exports: [{ name: 'runGates', type: 'function' }],
  },
  {
    spec: './seed-data.js',
    exports: [
      { name: 'MUGUETS_PROPERTIES', type: 'object' },
      { name: 'NANTERRE_PROJECT', type: 'object' },
      { name: 'BLOG_ARTICLES_A1_A6', type: 'object' },
      { name: 'BLOG_ARTICLES_A2_A8', type: 'object' },
    ],
  },
  {
    // server.js importe uniquement { LILLE_PROJECTS } ; upsertLilleProjects est
    // défini localement dans server.js (sur le modèle de upsertNanterreProject),
    // pas exporté par ce module. Le garde-fou vérifie donc l'import réellement
    // résolu — c'est ce qui empêche le P0 de boot de revenir.
    spec: './scripts/lille-projects.js',
    exports: [
      { name: 'LILLE_PROJECTS', type: 'object' },
    ],
  },
  {
    spec: './scripts/photo-sync.js',
    exports: [
      { name: 'upsertProjectPhotosDb', type: 'function' },
      { name: 'ensurePhotoSchema', type: 'function' },
      { name: 'upsertPropertyPhotosDb', type: 'function' },
      { name: 'ensurePropertyPhotoSchema', type: 'function' },
    ],
  },
];

describe('server.js imports — garde-fou anti-P0', () => {
  for (const { spec, exports: expected } of EXPECTED_IMPORTS) {
    test(`${spec} expose tous les exports attendus`, async () => {
      const absUrl = new URL(spec, `file://${ROOT}/`).href;
      let mod;
      try {
        mod = await import(absUrl);
      } catch (err) {
        assert.fail(
          `Import dynamique de ${spec} a échoué : ${err.message}\n` +
          `→ server.js ne pourra pas booter en prod.`
        );
      }

      for (const { name, type } of expected) {
        assert.ok(
          name in mod,
          `Export manquant : ${spec} n'expose pas \`${name}\` ` +
          `(server.js l'importe pourtant). ` +
          `→ Ajouter \`export ${type === 'function' ? 'async function' : 'const'} ${name}\` dans ${spec}.`
        );
        const value = mod[name];
        assert.notStrictEqual(
          value,
          undefined,
          `Export ${name} de ${spec} est undefined.`
        );
        if (type === 'function') {
          assert.strictEqual(
            typeof value,
            'function',
            `Export ${name} de ${spec} devrait être une fonction, reçu : ${typeof value}.`
          );
        } else if (type === 'object') {
          // tolère array, object, default-export pool
          assert.ok(
            typeof value === 'object' || typeof value === 'function',
            `Export ${name} de ${spec} devrait être un objet/array, reçu : ${typeof value}.`
          );
        }
      }
    });
  }

  test('server.js imports drift — aucun import applicatif non répertorié', () => {
    // Parse les imports en tête de server.js et compare au tableau ci-dessus.
    // Les imports node natifs / npm (express, resend, crypto, node-cron, url,
    // path, child_process, fs) sont ignorés car non-applicatifs.
    const NODE_BUILTINS_OR_NPM = new Set([
      'express', 'resend', 'crypto', 'node-cron', 'url', 'path',
      'child_process', 'fs', 'node:fs', 'node:path', 'node:url', 'node:crypto',
    ]);
    const serverSrc = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf-8');

    // Capture tous les `from '...';` au top-level (avant le premier
    // `app.use` / `app.get`, en pratique les imports sont groupés en tête).
    const importBlock = serverSrc.split(/\n(?=const |function |app\.)/)[0];
    const fromRegex = /from\s+['"]([^'"]+)['"]/g;
    const found = [];
    let m;
    while ((m = fromRegex.exec(importBlock)) !== null) {
      const spec = m[1];
      if (NODE_BUILTINS_OR_NPM.has(spec)) continue;
      // Spec applicatif = commence par ./ ou ../
      if (spec.startsWith('./') || spec.startsWith('../')) {
        found.push(spec);
      }
    }

    const expectedSpecs = new Set(EXPECTED_IMPORTS.map((e) => e.spec));
    const drift = found.filter((s) => !expectedSpecs.has(s));
    assert.deepEqual(
      drift,
      [],
      `server.js importe des modules applicatifs non répertoriés dans ` +
      `EXPECTED_IMPORTS : ${JSON.stringify(drift)}. ` +
      `→ Ajouter ces specs dans tests/unit/server-imports.test.js.`
    );
  });
});
