// Pré-génère un PDF PROPRE de chaque dossier de pré-commercialisation.
//
// ⚠️ NE PAS EXÉCUTER SANS INSTRUCTION DU FONDATEUR (s35) : les PDF de
// docs/dossiers-sources/ sont désormais les V7 FOURNIS PAR THOMAS, pas des
// fichiers générés. Relancer ce script les ÉCRASERAIT par une version
// régénérée depuis le HTML. Il ne sert que si Thomas demande explicitement
// de regénérer un PDF depuis le HTML.
//
// Pourquoi pré-générer (et pas window.print) : window.print ouvre la boîte du
// navigateur qui ajoute date/URL en en-tête et coupe mal. page.pdf() de Chromium
// produit un PDF net, sans ces en-têtes. On embarque la carte Google Maps en
// base64 (le navigateur headless n'a pas le réseau externe) pour qu'elle s'affiche.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const DIR = path.join(process.cwd(), 'docs', 'dossiers-sources');
const ids = ['muguets-lot-1-rdc', 'muguets-lot-2-t3'];

async function toDataUri(url) {
  const u = url.replace(/&amp;/g, '&');
  const r = await fetch(u);
  if (!r.ok) { console.error('  ⚠ map fetch', r.status, u.slice(0, 60)); return null; }
  const buf = Buffer.from(await r.arrayBuffer());
  const type = r.headers.get('content-type') || 'image/png';
  return `data:${type};base64,${buf.toString('base64')}`;
}

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
for (const id of ids) {
  let html = fs.readFileSync(path.join(DIR, `${id}.html`), 'utf-8');
  html = html.replace(/loading="lazy"/g, 'loading="eager"');
  // Embarquer chaque carte Google Maps en base64
  const maps = [...html.matchAll(/https:\/\/maps\.googleapis\.com\/maps\/api\/staticmap[^"']*/g)].map(m => m[0]);
  for (const m of [...new Set(maps)]) {
    const data = await toDataUri(m);
    if (data) html = html.split(m).join(data);
  }
  const p = await b.newPage();
  await p.emulateMedia({ media: 'screen' }); // rendu identique au web (pas print)
  await p.setContent(html, { waitUntil: 'load', timeout: 30000 });
  // La carte desktop est un <iframe> OSM (réseau requis → impossible en PDF
  // headless). On masque l'iframe et on force la carte statique Google Maps
  // (embarquée en base64 plus haut), fiable hors-ligne.
  await p.addStyleTag({ content: `
    .quartier-map__iframe, .quartier-map__iframe--desktop, .quartier-map__iframe--mobile { display: none !important; }
    .quartier-map__static-link { display: block !important; }
    .quartier-map__static { display: block !important; width: 100% !important; height: auto !important; }
  ` });
  // Attendre que TOUTES les images (base64) soient réellement décodées avant le PDF.
  const imgsOk = await p.waitForFunction(
    () => { const a = Array.from(document.images); return a.length > 0 && a.every(i => i.complete && i.naturalWidth > 0); },
    null, { timeout: 15000 }
  ).then(() => true).catch(() => false);
  const broken = await p.evaluate(() => Array.from(document.images).filter(i => !i.naturalWidth).length);
  console.log(`  images: ${await p.evaluate(() => document.images.length)} total, ${broken} cassées (toutes OK: ${imgsOk})`);
  const out = path.join(DIR, `${id}.pdf`);
  await p.pdf({ path: out, format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' }, scale: 0.72 });
  const kb = Math.round(fs.statSync(out).size / 1024);
  console.log(`✓ ${id}.pdf (${kb} Ko) — maps embarquées: ${[...new Set(maps)].length}`);
  await p.close();
}
await b.close();
process.exit(0);
