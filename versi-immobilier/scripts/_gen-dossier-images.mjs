// scripts/_gen-dossier-images.mjs
// -----------------------------------------------------------------------------
// Script jetable — extrait les images base64 du HTML fondateur Lot 3 duplex
// vers public/properties/muguets-lot-3-duplex/ avec des noms parlants.
//
// Le HTML contient 5 images embarquées en base64 :
//   1. PNG  — plan de situation (carte du quartier, classe .mapimg)
//   2. JPEG — plan d'architecte (137 m² sur deux niveaux, classe .rimg dans section Plan)
//   3. JPEG — avant : séjour-cuisine (premier <img> dans section État actuel)
//   4. JPEG — avant : chambre
//   5. JPEG — avant : terrasse
//
// Usage : node scripts/_gen-dossier-images.mjs
// -----------------------------------------------------------------------------

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML = join(__dirname, '..', 'docs', 'dossiers-sources', 'muguets-lot-3-duplex.html');
const OUT_DIR = join(__dirname, '..', 'public', 'properties', 'muguets-lot-3-duplex');

mkdirSync(OUT_DIR, { recursive: true });

const html = readFileSync(HTML, 'utf8');

// Regex globale qui capture chaque src="data:image/...;base64,...."
const re = /src="data:image\/([a-zA-Z]+);base64,([A-Za-z0-9+/=]+)"/g;
const matches = [...html.matchAll(re)];

if (matches.length !== 5) {
  console.error(`[gen-dossier-images] Attendu 5 images, trouvé ${matches.length}.`);
  process.exit(1);
}

// Ordre d'apparition dans le HTML — cf. en-tête du fichier.
const NAMES = [
  'plan-situation.png',
  'plan-architecte.jpg',
  'avant-sejour.jpg',
  'avant-chambre.jpg',
  'avant-terrasse.jpg',
];

const written = [];
matches.forEach((m, i) => {
  const ext = m[1].toLowerCase();
  const b64 = m[2];
  const buf = Buffer.from(b64, 'base64');
  const name = NAMES[i];
  // sanity check ext
  const expectedExt = name.endsWith('.png') ? 'png' : 'jpeg';
  if (ext !== expectedExt && !(ext === 'jpg' && expectedExt === 'jpeg')) {
    console.warn(`[gen-dossier-images] Image #${i + 1} : ext HTML "${ext}" vs attendu "${expectedExt}" — on écrit quand même.`);
  }
  const out = join(OUT_DIR, name);
  writeFileSync(out, buf);
  written.push({ name, bytes: buf.length, mime: `image/${ext}` });
});

console.log('[gen-dossier-images] OK — 5 images extraites :');
for (const w of written) {
  console.log(`  - ${w.name}  (${(w.bytes / 1024).toFixed(1)} Ko, ${w.mime})`);
}

// Génère les data URIs pour LOT3_PLAN (plan d'archi #2) et LOT3_AVANT (séjour #3),
// à appender dans scripts/dossier-images.js.
const planBuf = Buffer.from(matches[1][2], 'base64');
const avantBuf = Buffer.from(matches[2][2], 'base64');
const planDataUri = `data:image/${matches[1][1]};base64,${matches[1][2]}`;
const avantDataUri = `data:image/${matches[2][1]};base64,${matches[2][2]}`;

const exportSnippet =
  `\nexport const LOT3_PLAN = '${planDataUri}';\n` +
  `\nexport const LOT3_AVANT = '${avantDataUri}';\n`;

const SNIPPET_OUT = join(__dirname, '_lot3-exports.snippet.js');
writeFileSync(SNIPPET_OUT, exportSnippet);
console.log(`[gen-dossier-images] Snippet exports écrit : ${SNIPPET_OUT}`);
console.log(`  LOT3_PLAN  = ${(planBuf.length / 1024).toFixed(1)} Ko`);
console.log(`  LOT3_AVANT = ${(avantBuf.length / 1024).toFixed(1)} Ko`);
