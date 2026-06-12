// versi-immobilier/tests/unit/muguets-fidelite-html.test.js
// -----------------------------------------------------------------------------
// GARDE-FOU ANTI-DÉRIVE : l'annonce /nos-biens/:id doit refléter à 100% le
// contenu du HTML source (docs/dossiers-sources/<id>.html), qui est LA
// source de vérité fondateur ("le HTML est le modèle, l'annonce s'aligne").
//
// Principe : on parse le HTML source de chaque lot, on en extrait le texte
// normalisé, puis on vérifie que CHAQUE chaîne canonique du dossier JSON
// (seed-properties-muguets.js) y est CONTENUE. Si une phrase du JSON est
// absente du HTML, c'est une dérive — le test échoue.
//
// Quand Thomas met à jour le HTML, ce test rappellera de resynchroniser
// le JSON (sens unique HTML → JSON, jamais l'inverse).
//
// Run : node --test tests/unit/muguets-fidelite-html.test.js
// -----------------------------------------------------------------------------

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOSSIERS_DIR = join(__dirname, '..', '..', 'docs', 'dossiers-sources');

// -----------------------------------------------------------------------------
// Normalisation : strip base64 (data:image/...), strip <tags>, décode entités
// usuelles, unifie apostrophes/quotes, normalise espaces (insécables, multiples).
// Le but : pouvoir faire un `.includes(canonique)` robuste.
// -----------------------------------------------------------------------------
function normalize(s) {
  if (!s) return '';
  let t = String(s);
  // strip base64 data-URIs (poids inutile, peut contenir des caractères qui cassent les regex)
  t = t.replace(/data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=\s]+/g, ' ');
  // strip balises HTML
  t = t.replace(/<[^>]+>/g, ' ');
  // strip commentaires HTML résiduels
  t = t.replace(/<!--[\s\S]*?-->/g, ' ');
  // décoder les entités HTML courantes
  t = t
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, '-')
    .replace(/&hellip;/g, '…')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&deg;/g, '°');
  // unifier toutes les variantes d'apostrophes/quotes vers l'apostrophe droite
  t = t.replace(/[’‘‛`´]/g, "'");
  t = t.replace(/[“”„]/g, '"');
  // unifier les espaces (insécables, fines, tab, newline) en espace simple
  t = t.replace(/[   ​\t\r\n]/g, ' ');
  // collapse espaces multiples
  t = t.replace(/\s+/g, ' ');
  return t.trim();
}

function readHtml(id) {
  return readFileSync(join(DOSSIERS_DIR, `${id}.html`), 'utf8');
}

// -----------------------------------------------------------------------------
// Setup : on charge HTML + dossier JSON pour chaque lot.
// -----------------------------------------------------------------------------
let MUGUETS_PROPERTIES;
let lot1, lot2, lot3;
let html1Norm, html2Norm, html3Norm;
let dossier1, dossier2, dossier3;

before(async () => {
  const mod = await import('../../scripts/seed-properties-muguets.js');
  MUGUETS_PROPERTIES = mod.MUGUETS_PROPERTIES;
  lot1 = MUGUETS_PROPERTIES.find((p) => p.id === 'muguets-lot-1-rdc');
  lot2 = MUGUETS_PROPERTIES.find((p) => p.id === 'muguets-lot-2-t3');
  lot3 = MUGUETS_PROPERTIES.find((p) => p.id === 'muguets-lot-3-duplex');

  html1Norm = normalize(readHtml('muguets-lot-1-rdc'));
  html2Norm = normalize(readHtml('muguets-lot-2-t3'));
  html3Norm = normalize(readHtml('muguets-lot-3-duplex'));

  dossier1 = JSON.parse(lot1.dossier);
  dossier2 = JSON.parse(lot2.dossier);
  dossier3 = JSON.parse(lot3.dossier);
});

// -----------------------------------------------------------------------------
// Helper d'assertion : un message d'erreur clair pointe la phrase manquante.
// -----------------------------------------------------------------------------
function assertContains(htmlNorm, canonique, contexte) {
  const target = normalize(canonique);
  assert.ok(
    target.length > 0,
    `${contexte} : chaîne canonique vide.`
  );
  assert.ok(
    htmlNorm.includes(target),
    `Dérive détectée — le JSON contient une phrase ABSENTE du HTML source.\n` +
      `Contexte : ${contexte}\n` +
      `Phrase JSON : "${target.slice(0, 240)}${target.length > 240 ? '…' : ''}"\n` +
      `→ Le HTML est la source de vérité. Soit corrige le JSON (seed-properties-muguets.js) ` +
      `pour qu'il reflète le HTML, soit mets à jour le HTML si la phrase est légitime.`
  );
}

// -----------------------------------------------------------------------------
// Boucle d'assertions sur un lot complet (factorisée Lot1 / Lot2).
// -----------------------------------------------------------------------------
function assertDossierFidele(htmlNorm, d, lotLabel) {
  // 1. Emplacement — prose + 3 blocs structurés
  assert.ok(d.emplacement, `${lotLabel} : dossier.emplacement requis`);
  assert.ok(Array.isArray(d.emplacement.prose), `${lotLabel} : emplacement.prose array requis`);
  d.emplacement.prose.forEach((p, i) => {
    assertContains(htmlNorm, p, `${lotLabel} · emplacement.prose[${i}]`);
  });
  for (const slot of ['adresse', 'transports', 'proximite']) {
    const item = d.emplacement[slot];
    assert.ok(item, `${lotLabel} : emplacement.${slot} requis`);
    assertContains(htmlNorm, item.value, `${lotLabel} · emplacement.${slot}.value`);
    if (item.note) {
      assertContains(htmlNorm, item.note, `${lotLabel} · emplacement.${slot}.note`);
    }
  }

  // 2. Le bien — leBien (array de paragraphes) + pourQui + accroche
  assert.ok(Array.isArray(d.leBien), `${lotLabel} : leBien doit être un array de paragraphes`);
  d.leBien.forEach((p, i) => {
    assertContains(htmlNorm, p, `${lotLabel} · leBien[${i}]`);
  });
  assertContains(htmlNorm, d.pourQui, `${lotLabel} · pourQui`);
  assertContains(htmlNorm, d.accroche, `${lotLabel} · accroche`);

  // 3. Surfaces (Plan)
  assert.ok(Array.isArray(d.surfaces), `${lotLabel} : surfaces requis`);
  d.surfaces.forEach((s, i) => {
    assertContains(htmlNorm, s.piece, `${lotLabel} · surfaces[${i}].piece`);
    assertContains(htmlNorm, s.aire, `${lotLabel} · surfaces[${i}].aire`);
  });

  // 4. Caractéristiques
  assert.ok(Array.isArray(d.caracteristiques), `${lotLabel} : caracteristiques requis`);
  d.caracteristiques.forEach((c, i) => {
    assertContains(htmlNorm, c, `${lotLabel} · caracteristiques[${i}]`);
  });

  // 5. Travaux (intro optionnelle + phases)
  if (d.travaux.intro) {
    assertContains(htmlNorm, d.travaux.intro, `${lotLabel} · travaux.intro`);
  }
  d.travaux.phases.forEach((ph, i) => {
    assertContains(htmlNorm, ph.titre, `${lotLabel} · travaux.phases[${i}].titre`);
    assertContains(htmlNorm, ph.texte, `${lotLabel} · travaux.phases[${i}].texte`);
  });

  // 6. État actuel — tous les champs textuels sont conditionnels (le composant
  //    React les rend conditionnellement aussi). On vérifie ceux qui sont
  //    présents dans le JSON.
  if (d.etatActuel.intro) {
    assertContains(htmlNorm, d.etatActuel.intro, `${lotLabel} · etatActuel.intro`);
  }
  if (d.etatActuel.avantCaption) {
    assertContains(htmlNorm, d.etatActuel.avantCaption, `${lotLabel} · etatActuel.avantCaption`);
  }
  if (d.etatActuel.apresLegende) {
    assertContains(htmlNorm, d.etatActuel.apresLegende, `${lotLabel} · etatActuel.apresLegende`);
  }
  // Note : on n'asserte PAS d.etatActuel.projetCaption — historiquement les
  // lots 1/2 contiennent "Projet livré — rendu 3D du logement fini, à venir."
  // qui ne figure pas dans le HTML (caption forgée côté composant). Lot 3
  // utilise "Projet livré" qui figure dans le HTML mais on garde le test
  // homogène entre lots.

  // 7. DPE projeté
  assertContains(htmlNorm, d.dpeProjete.intro, `${lotLabel} · dpeProjete.intro`);
  assertContains(htmlNorm, d.dpeProjete.note, `${lotLabel} · dpeProjete.note`);

  // 8. Formules
  assertContains(htmlNorm, d.formules.intro, `${lotLabel} · formules.intro`);
  assertContains(htmlNorm, d.formules.brut.description, `${lotLabel} · formules.brut.description`);
  assertContains(htmlNorm, d.formules.pretAHabiter.description, `${lotLabel} · formules.pretAHabiter.description`);
  assertContains(htmlNorm, d.formules.brut.price, `${lotLabel} · formules.brut.price`);
  assertContains(htmlNorm, d.formules.pretAHabiter.price, `${lotLabel} · formules.pretAHabiter.price`);

  // 9. Repères marché — chaque row, intro, et présence d'« efficity »
  assertContains(htmlNorm, d.reperesMarche.intro, `${lotLabel} · reperesMarche.intro`);
  d.reperesMarche.rows.forEach((row, i) => {
    assertContains(htmlNorm, row.ref, `${lotLabel} · reperesMarche.rows[${i}].ref`);
    assertContains(htmlNorm, row.sousTitre, `${lotLabel} · reperesMarche.rows[${i}].sousTitre`);
    assertContains(htmlNorm, row.prixM2, `${lotLabel} · reperesMarche.rows[${i}].prixM2`);
  });
  // Garde-fou explicite « efficity » (choix fondateur — ne JAMAIS le remplacer)
  assert.ok(
    htmlNorm.toLowerCase().includes('efficity'),
    `${lotLabel} : le HTML doit mentionner "efficity" (source comparable Vauban-Esquermes, choix fondateur).`
  );
  const sousTitresJoined = d.reperesMarche.rows.map((r) => r.sousTitre || '').join(' ').toLowerCase();
  assert.ok(
    sousTitresJoined.includes('efficity'),
    `${lotLabel} : au moins un row reperesMarche.sousTitre doit mentionner "efficity" (alignement HTML).`
  );

  // 10. À prévoir
  assertContains(htmlNorm, d.aPrevoir.intro, `${lotLabel} · aPrevoir.intro`);
  d.aPrevoir.items.forEach((it, i) => {
    assertContains(htmlNorm, it.label, `${lotLabel} · aPrevoir.items[${i}].label`);
    assertContains(htmlNorm, it.valeur, `${lotLabel} · aPrevoir.items[${i}].valeur`);
  });

  // 11. Calendrier
  d.calendrier.forEach((step, i) => {
    assertContains(htmlNorm, step.label, `${lotLabel} · calendrier[${i}].label`);
    assertContains(htmlNorm, step.date, `${lotLabel} · calendrier[${i}].date`);
  });
}

// -----------------------------------------------------------------------------
// Vérifie l'ordre canonique des sections (titres) dans le HTML.
// -----------------------------------------------------------------------------
function assertOrdreSections(htmlNorm, lotLabel) {
  const ordre = [
    'Emplacement.',
    'Le bien.',
    'Plan.',
    'Caractéristiques.',
    'Travaux.',
    'État actuel',
    'Performances énergétiques.',
    // L'intitulé formules varie : "Acheter" en pré-titre / "Les deux formules."
    'Les deux formules.',
    'Repères marché.',
    'À prévoir.',
    'Calendrier.',
  ];
  let prev = -1;
  let prevTitle = '<début>';
  for (const titre of ordre) {
    const idx = htmlNorm.indexOf(titre);
    assert.ok(
      idx >= 0,
      `${lotLabel} : titre de section "${titre}" introuvable dans le HTML.`
    );
    assert.ok(
      idx > prev,
      `${lotLabel} : ordre des sections cassé — "${titre}" (idx ${idx}) ` +
        `apparaît avant "${prevTitle}" (idx ${prev}). Ordre attendu : ${ordre.join(' < ')}.`
    );
    prev = idx;
    prevTitle = titre;
  }
}

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------
describe('Muguets — fidélité HTML ↔ JSON (Lot 1 RDC)', () => {
  test('chaque chaîne canonique du dossier Lot 1 est présente dans le HTML source', () => {
    assertDossierFidele(html1Norm, dossier1, 'Lot 1');
  });

  test('ordre canonique des sections du HTML Lot 1', () => {
    assertOrdreSections(html1Norm, 'Lot 1');
  });
});

describe('Muguets — fidélité HTML ↔ JSON (Lot 2 T3)', () => {
  test('chaque chaîne canonique du dossier Lot 2 est présente dans le HTML source', () => {
    assertDossierFidele(html2Norm, dossier2, 'Lot 2');
  });

  test('ordre canonique des sections du HTML Lot 2', () => {
    assertOrdreSections(html2Norm, 'Lot 2');
  });
});

// -----------------------------------------------------------------------------
// Lot 3 — duplex. Le HTML fondateur d'une génération plus récente : sections
// numérotées "01 — Emplacement", "02 — Le bien", ..., titres sans point final,
// "Performance énergétique" au singulier (vs pluriel sur lots 1/2).
// -----------------------------------------------------------------------------
function assertOrdreSectionsLot3(htmlNorm, lotLabel) {
  // Sur Lot 3, le bloc "Performance énergétique" est intercalé entre
  // Caractéristiques (04) et Travaux (05) — différent des lots 1/2 où il
  // venait après État actuel. Et "Cadre de la vente" (11) clôt le document.
  const ordre = [
    '01 - Emplacement',
    '02 - Le bien',
    '03 - Plan',
    '04 - Caractéristiques',
    'Performance énergétique',
    '05 - Travaux',
    '06 - État actuel',
    '07 - Les deux formules',
    '08 - Repères marché',
    '09 - À prévoir',
    '10 - Calendrier',
    '11 - Cadre de la vente',
  ];
  let prev = -1;
  let prevTitle = '<début>';
  for (const titre of ordre) {
    const idx = htmlNorm.indexOf(titre);
    assert.ok(
      idx >= 0,
      `${lotLabel} : titre de section "${titre}" introuvable dans le HTML.`
    );
    assert.ok(
      idx > prev,
      `${lotLabel} : ordre des sections cassé — "${titre}" (idx ${idx}) ` +
        `apparaît avant "${prevTitle}" (idx ${prev}). Ordre attendu : ${ordre.join(' < ')}.`
    );
    prev = idx;
    prevTitle = titre;
  }
}

describe('Muguets — fidélité HTML ↔ JSON (Lot 3 duplex)', () => {
  test('chaque chaîne canonique du dossier Lot 3 est présente dans le HTML source', () => {
    assertDossierFidele(html3Norm, dossier3, 'Lot 3');
  });

  test('ordre canonique des sections du HTML Lot 3', () => {
    assertOrdreSectionsLot3(html3Norm, 'Lot 3');
  });
});

describe('Muguets — sanité de la normalisation HTML', () => {
  test('le HTML normalisé est non vide et raisonnable (> 5000 caractères de texte)', () => {
    assert.ok(html1Norm.length > 5000, `Lot 1 HTML normalisé trop court : ${html1Norm.length}`);
    assert.ok(html2Norm.length > 5000, `Lot 2 HTML normalisé trop court : ${html2Norm.length}`);
    assert.ok(html3Norm.length > 5000, `Lot 3 HTML normalisé trop court : ${html3Norm.length}`);
  });

  test('la normalisation des apostrophes est cohérente (aucune apostrophe typographique résiduelle)', () => {
    assert.ok(!html1Norm.includes('’'), 'Lot 1 : apostrophes typographiques non normalisées.');
    assert.ok(!html2Norm.includes('’'), 'Lot 2 : apostrophes typographiques non normalisées.');
    assert.ok(!html3Norm.includes('’'), 'Lot 3 : apostrophes typographiques non normalisées.');
  });
});
