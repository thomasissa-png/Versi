// versi-immobilier/tests/unit/muguets-fidelite-pdf.test.js
// -----------------------------------------------------------------------------
// GARDE-FOU ANTI-DÉRIVE : l'annonce /nos-biens/:id doit refléter à 100% le
// contenu du PDF source (docs/dossiers-sources/<id>.pdf.txt), qui est LA
// source de vérité fondateur (juin 2026, dossiers de pré-commercialisation).
//
// Principe : on charge le texte extrait du PDF de chaque lot, on le normalise,
// puis on vérifie que CHAQUE chaîne canonique du dossier JSON
// (seed-properties-muguets.js) y est CONTENUE. Si une phrase du JSON est
// absente du PDF, c'est une dérive — le test échoue.
//
// Quand Thomas met à jour le PDF, ce test rappelle de resynchroniser
// le JSON (sens unique PDF → JSON, jamais l'inverse).
//
// Run : node --test tests/unit/muguets-fidelite-pdf.test.js
// -----------------------------------------------------------------------------

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOSSIERS_DIR = join(__dirname, '..', '..', 'docs', 'dossiers-sources');

// -----------------------------------------------------------------------------
// Normalisation aplatie : minuscule, suppression des retours ligne (le PDF
// coupe les phrases en colonnes), unification cadratins (— –) → tiret,
// apostrophes typographiques → apostrophe droite, espaces insécables / fines
// → espace simple, collapse espaces multiples.
//
// Le seed est purgé des cadratins (utilise " - ") mais le PDF en contient :
// la normalisation des deux côtés permet de matcher.
// -----------------------------------------------------------------------------
function normalize(s) {
  if (!s) return '';
  let t = String(s);
  // PDF capitalise certains labels avec une initiale isolée (ex: "C HARGES
  // COPRO"). Avant lowercase, recoller : majuscule isolée + espace + mot
  // majuscule -> mot complet.
  t = t.replace(/\b([A-ZÉÈÊ])\s+([A-ZÉÈÊ]{3,})\b/g, '$1$2');
  t = t.toLowerCase();
  // recoller les mots coupés en fin de ligne dans le PDF
  // (ex: "vous-\nmême" -> "vous-même")
  t = t.replace(/-\s*[\r\n]+\s*/g, '-');
  // unifier cadratins et demi-cadratins vers le tiret simple
  t = t.replace(/[—–]/g, '-');
  // unifier toutes les variantes d'apostrophes vers l'apostrophe droite
  t = t.replace(/[’‘‛`´]/g, "'");
  // unifier les guillemets courbes
  t = t.replace(/[“”„«»]/g, '"');
  // unifier les espaces (insécables, fines, tab, newline) en espace simple
  t = t.replace(/[    ​\t\r\n]/g, ' ');
  // collapse espaces multiples
  t = t.replace(/\s+/g, ' ');
  return t.trim();
}

function readPdfText(id) {
  return readFileSync(join(DOSSIERS_DIR, `${id}.pdf.txt`), 'utf8');
}

// -----------------------------------------------------------------------------
// Setup : on charge PDF text + dossier JSON pour chaque lot.
// -----------------------------------------------------------------------------
let MUGUETS_PROPERTIES;
let lot1, lot2, lot3;
let pdf1Norm, pdf2Norm, pdf3Norm;
let dossier1, dossier2, dossier3;

before(async () => {
  const mod = await import('../../scripts/seed-properties-muguets.js');
  MUGUETS_PROPERTIES = mod.MUGUETS_PROPERTIES;
  lot1 = MUGUETS_PROPERTIES.find((p) => p.id === 'muguets-lot-1-rdc');
  lot2 = MUGUETS_PROPERTIES.find((p) => p.id === 'muguets-lot-2-t3');
  lot3 = MUGUETS_PROPERTIES.find((p) => p.id === 'muguets-lot-3-duplex');

  pdf1Norm = normalize(readPdfText('muguets-lot-1-rdc'));
  pdf2Norm = normalize(readPdfText('muguets-lot-2-t3'));
  pdf3Norm = normalize(readPdfText('muguets-lot-3-duplex'));

  dossier1 = JSON.parse(lot1.dossier);
  dossier2 = JSON.parse(lot2.dossier);
  dossier3 = JSON.parse(lot3.dossier);
});

// -----------------------------------------------------------------------------
// Helper d'assertion : un message d'erreur clair pointe la phrase manquante.
// -----------------------------------------------------------------------------
function assertContains(pdfNorm, canonique, contexte) {
  const target = normalize(canonique);
  assert.ok(
    target.length > 0,
    `${contexte} : chaîne canonique vide.`
  );
  assert.ok(
    pdfNorm.includes(target),
    `Dérive détectée - le JSON contient une phrase ABSENTE du PDF source.\n` +
      `Contexte : ${contexte}\n` +
      `Phrase JSON : "${target.slice(0, 240)}${target.length > 240 ? '...' : ''}"\n` +
      `-> Le PDF est la source de vérité. Soit corrige le JSON (seed-properties-muguets.js) ` +
      `pour qu'il reflète le PDF, soit signale la divergence au fondateur.`
  );
}

// -----------------------------------------------------------------------------
// Boucle d'assertions sur un lot complet.
// -----------------------------------------------------------------------------
function assertDossierFidele(pdfNorm, d, lotLabel) {
  // 0. Hook (EN BREF)
  if (d.hook) {
    assertContains(pdfNorm, d.hook, `${lotLabel} · hook`);
  }

  // 1. Emplacement - prose + POI + 3 blocs structurés
  assert.ok(d.emplacement, `${lotLabel} : dossier.emplacement requis`);
  assert.ok(Array.isArray(d.emplacement.prose), `${lotLabel} : emplacement.prose array requis`);
  d.emplacement.prose.forEach((p, i) => {
    assertContains(pdfNorm, p, `${lotLabel} · emplacement.prose[${i}]`);
  });
  // POI : grille de 7 points fidèle au PDF
  assert.ok(
    Array.isArray(d.emplacement.pois) && d.emplacement.pois.length === 7,
    `${lotLabel} : emplacement.pois doit contenir exactement 7 entrées`
  );
  d.emplacement.pois.forEach((poi, i) => {
    // Le PDF coupe les noms POI longs en colonne (ex: "Métro Porte des"/"Postes").
    // Sur > 3 mots, on tokenise en bigrammes.
    // Les noms POI sont systématiquement coupés en colonne dans le PDF
    // (ex: "Métro Oscar" / "Lambret"). On asserte chaque mot >= 3 lettres
    // individuellement (garde-fou : chaque mot DOIT figurer dans le PDF).
    const nomWords = poi.nom.split(/\s+/).filter((w) => w.length >= 3);
    nomWords.forEach((w, k) => {
      assertContains(pdfNorm, w, `${lotLabel} · emplacement.pois[${i}].nom.word[${k}]=${w}`);
    });
    if (poi.detail) {
      // Le PDF coupe les détails POI sur plusieurs lignes (mise en colonne).
      // Ex : "12 min à pied" devient "12 min à" + "pied" séparés par d'autres
      // colonnes après aplatissement. On découpe sur · puis on tokenise en
      // bigrammes courts (≤ 3 mots) pour rester robuste au formatage colonne.
      const parts = poi.detail.split(/\s+·\s+/);
      parts.forEach((part, j) => {
        const words = part.split(/\s+/);
        if (words.length <= 3) {
          assertContains(pdfNorm, part, `${lotLabel} · emplacement.pois[${i}].detail[${j}]`);
        } else {
          // Phrase trop longue pour être contiguë dans le PDF (colonne) :
          // assert chaque tri-gramme isolément.
          for (let k = 0; k <= words.length - 2; k++) {
            const bigram = words.slice(k, k + 2).join(' ');
            assertContains(pdfNorm, bigram, `${lotLabel} · emplacement.pois[${i}].detail[${j}].bigram[${k}]`);
          }
        }
      });
    }
  });

  // 2. Le bien - leBien (array de paragraphes) + pourQui + accroche
  assert.ok(Array.isArray(d.leBien), `${lotLabel} : leBien doit être un array de paragraphes`);
  d.leBien.forEach((p, i) => {
    assertContains(pdfNorm, p, `${lotLabel} · leBien[${i}]`);
  });
  assertContains(pdfNorm, d.pourQui, `${lotLabel} · pourQui`);
  assertContains(pdfNorm, d.accroche, `${lotLabel} · accroche`);

  // 3. Surfaces (Plan) - chaque pièce + son aire
  assert.ok(Array.isArray(d.surfaces), `${lotLabel} : surfaces requis`);
  d.surfaces.forEach((s, i) => {
    assertContains(pdfNorm, s.piece, `${lotLabel} · surfaces[${i}].piece`);
    assertContains(pdfNorm, s.aire, `${lotLabel} · surfaces[${i}].aire`);
  });

  // 4. Caractéristiques
  assert.ok(Array.isArray(d.caracteristiques), `${lotLabel} : caracteristiques requis`);
  d.caracteristiques.forEach((c, i) => {
    assertContains(pdfNorm, c, `${lotLabel} · caracteristiques[${i}]`);
  });

  // 5. Travaux - phases (intro optionnelle ; les nouveaux PDF n'ont plus d'intro)
  if (d.travaux.intro) {
    assertContains(pdfNorm, d.travaux.intro, `${lotLabel} · travaux.intro`);
  }
  d.travaux.phases.forEach((ph, i) => {
    assertContains(pdfNorm, ph.titre, `${lotLabel} · travaux.phases[${i}].titre`);
    // Les phases sont rendues sur 3 colonnes côte-à-côte dans le PDF :
    // après aplatissement, les phrases d'une même phase ne sont PLUS
    // contiguës (entrelacées avec les autres phases). Garde-fou robuste :
    // chaque mot significatif (>= 5 lettres) DOIT figurer dans le PDF.
    const motsSignif = ph.texte
      .toLowerCase()
      .split(/[\s,.;:()'"’]+/)
      .filter((w) => w.length >= 5 && !/^\d/.test(w));
    motsSignif.forEach((w, k) => {
      assertContains(pdfNorm, w, `${lotLabel} · travaux.phases[${i}].texte.word[${k}]=${w}`);
    });
  });

  // 6. DPE projeté
  assertContains(pdfNorm, d.dpeProjete.intro, `${lotLabel} · dpeProjete.intro`);
  assertContains(pdfNorm, d.dpeProjete.note, `${lotLabel} · dpeProjete.note`);

  // 7. Formules - intro + descriptions BRUT et PRÊT À HABITER.
  // L'intro est rendue en pleine largeur dans le PDF : split sur point en
  // sous-phrases longues, OK. Les descriptions BRUT et PAH sont en colonnes
  // entrelacées : garde-fou par mots significatifs (chaque mot >= 6 lettres
  // DOIT figurer dans le PDF).
  const splitPhrases = (s) =>
    s
      .split(/\.\s+/)
      .map((p) => p.trim().replace(/\.$/, ''))
      .filter((p) => p.length > 0);
  splitPhrases(d.formules.intro).forEach((sp, j) => {
    assertContains(pdfNorm, sp, `${lotLabel} · formules.intro[sp ${j}]`);
  });
  const motsSignifFormule = (s) =>
    s
      .toLowerCase()
      .split(/[\s,.;:()'"’/-]+/)
      .filter((w) => w.length >= 6 && !/^\d/.test(w));
  motsSignifFormule(d.formules.brut.description).forEach((w, k) => {
    assertContains(pdfNorm, w, `${lotLabel} · formules.brut.description.word[${k}]=${w}`);
  });
  motsSignifFormule(d.formules.pretAHabiter.description).forEach((w, k) => {
    assertContains(pdfNorm, w, `${lotLabel} · formules.pretAHabiter.description.word[${k}]=${w}`);
  });
  assertContains(pdfNorm, d.formules.brut.price, `${lotLabel} · formules.brut.price`);
  assertContains(pdfNorm, d.formules.pretAHabiter.price, `${lotLabel} · formules.pretAHabiter.price`);
  if (d.formules.garanties) {
    assertContains(pdfNorm, d.formules.garanties, `${lotLabel} · formules.garanties`);
  }

  // 8. Architecte (nouveau bloc PDF juin 2026 - obligatoire)
  assert.ok(d.architecte, `${lotLabel} : dossier.architecte requis (bloc Holleman)`);
  assertContains(pdfNorm, d.architecte.titre, `${lotLabel} · architecte.titre`);
  // Le texte est long et coupé en colonnes : on découpe en phrases courtes
  const phrasesArchitecte = d.architecte.texte
    .split(/\.\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  phrasesArchitecte.forEach((phrase, i) => {
    // Retire la parenthèse finale qui peut être coupée
    if (phrase.length > 20) {
      assertContains(pdfNorm, phrase, `${lotLabel} · architecte.texte[phrase ${i}]`);
    }
  });

  // 9. Repères marché - optionnel (Lot 1 ne l'a plus depuis PDF juin 2026)
  if (d.reperesMarche) {
    assertContains(pdfNorm, d.reperesMarche.intro, `${lotLabel} · reperesMarche.intro`);
    d.reperesMarche.rows.forEach((row, i) => {
      assertContains(pdfNorm, row.ref, `${lotLabel} · reperesMarche.rows[${i}].ref`);
      assertContains(pdfNorm, row.sousTitre, `${lotLabel} · reperesMarche.rows[${i}].sousTitre`);
      assertContains(pdfNorm, row.prixM2, `${lotLabel} · reperesMarche.rows[${i}].prixM2`);
    });
    // Garde-fou « efficity » (choix fondateur - ne JAMAIS remplacer)
    assert.ok(
      pdfNorm.includes('efficity'),
      `${lotLabel} : le PDF doit mentionner "efficity" (source comparable Vauban-Esquermes, choix fondateur).`
    );
    const sousTitresJoined = d.reperesMarche.rows.map((r) => r.sousTitre || '').join(' ').toLowerCase();
    assert.ok(
      sousTitresJoined.includes('efficity'),
      `${lotLabel} : au moins un row reperesMarche.sousTitre doit mentionner "efficity" (alignement PDF).`
    );
  }

  // 10. À prévoir
  // Le PDF capitalise les labels avec une lettre initiale isolée
  // ("C HARGES COPRO · MOIS") - on découpe le label sur · et on asserte
  // chaque token individuellement.
  assertContains(pdfNorm, d.aPrevoir.intro, `${lotLabel} · aPrevoir.intro`);
  d.aPrevoir.items.forEach((it, i) => {
    it.label.split(/\s*·\s*/).forEach((tok, k) => {
      // tokens type "Charges copro" : on asserte chaque mot >= 4 lettres
      // séparément (le PDF peut intercaler des mots-outils comme "de").
      const words = tok.trim().split(/\s+/).filter((w) => w.length >= 4);
      words.forEach((w, m) => {
        assertContains(pdfNorm, w, `${lotLabel} · aPrevoir.items[${i}].label[tok ${k}].word[${m}]=${w}`);
      });
    });
    assertContains(pdfNorm, it.valeur, `${lotLabel} · aPrevoir.items[${i}].valeur`);
  });

  // 11. Calendrier - phases canoniques PDF juin 2026
  d.calendrier.forEach((step, i) => {
    assertContains(pdfNorm, step.label, `${lotLabel} · calendrier[${i}].label`);
    assertContains(pdfNorm, step.date, `${lotLabel} · calendrier[${i}].date`);
  });
}

// -----------------------------------------------------------------------------
// Garde-fou Lot 1 : repèresMarche DOIT être absent (supprimé du PDF juin 2026)
// -----------------------------------------------------------------------------
function assertLot1SansRepereMarche(d) {
  assert.ok(
    !d.reperesMarche,
    `Lot 1 : dossier.reperesMarche doit être absent (supprimé du PDF juin 2026 - le fondateur a tranché).`
  );
}

// -----------------------------------------------------------------------------
// Garde-fou Lot 1 : extérieur 15 m² PARTOUT (décision fondateur — le « 10 m² »
// du plan PDF était une coquille, corrigé en 15 sur tous les champs).
// -----------------------------------------------------------------------------
function assertLot1Exterieur15(d) {
  const ficheExt = d.ficheTechnique.find((f) => f.label === 'Extérieur');
  assert.ok(
    ficheExt && ficheExt.value.includes('15'),
    `Lot 1 : ficheTechnique.Extérieur doit valoir "15 m² privatif".`
  );
  const surfaceExt = d.surfaces.find((s) => /extérieur/i.test(s.piece));
  assert.ok(
    surfaceExt && surfaceExt.aire.includes('15') && !surfaceExt.aire.includes('10'),
    `Lot 1 : surfaces[Extérieur privatif].aire doit valoir "15 m²" (15 partout).`
  );
}

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------
describe('Muguets - fidélité PDF <-> JSON (Lot 1 RDC)', () => {
  test('chaque chaîne canonique du dossier Lot 1 est présente dans le PDF source', () => {
    assertDossierFidele(pdf1Norm, dossier1, 'Lot 1');
  });

  test('Lot 1 : reperesMarche absent (conformité PDF juin 2026)', () => {
    assertLot1SansRepereMarche(dossier1);
  });

  test('Lot 1 : extérieur 15 m² partout (décision fondateur)', () => {
    assertLot1Exterieur15(dossier1);
  });
});

describe('Muguets - fidélité PDF <-> JSON (Lot 2 T3)', () => {
  test('chaque chaîne canonique du dossier Lot 2 est présente dans le PDF source', () => {
    assertDossierFidele(pdf2Norm, dossier2, 'Lot 2');
  });
});

describe('Muguets - fidélité PDF <-> JSON (Lot 3 duplex)', () => {
  test('chaque chaîne canonique du dossier Lot 3 est présente dans le PDF source', () => {
    assertDossierFidele(pdf3Norm, dossier3, 'Lot 3');
  });
});

describe('Muguets - sanité de la normalisation PDF', () => {
  test('le texte PDF normalisé est non vide et raisonnable (> 3000 caractères)', () => {
    assert.ok(pdf1Norm.length > 3000, `Lot 1 PDF normalisé trop court : ${pdf1Norm.length}`);
    assert.ok(pdf2Norm.length > 3000, `Lot 2 PDF normalisé trop court : ${pdf2Norm.length}`);
    assert.ok(pdf3Norm.length > 3000, `Lot 3 PDF normalisé trop court : ${pdf3Norm.length}`);
  });

  test('la normalisation des cadratins est complète (aucun cadratin résiduel)', () => {
    assert.ok(!pdf1Norm.includes('—'), 'Lot 1 : cadratins non normalisés.');
    assert.ok(!pdf2Norm.includes('—'), 'Lot 2 : cadratins non normalisés.');
    assert.ok(!pdf3Norm.includes('—'), 'Lot 3 : cadratins non normalisés.');
  });

  test('la normalisation des apostrophes typographiques est complète', () => {
    assert.ok(!pdf1Norm.includes('’'), 'Lot 1 : apostrophes typographiques non normalisées.');
    assert.ok(!pdf2Norm.includes('’'), 'Lot 2 : apostrophes typographiques non normalisées.');
    assert.ok(!pdf3Norm.includes('’'), 'Lot 3 : apostrophes typographiques non normalisées.');
  });
});
