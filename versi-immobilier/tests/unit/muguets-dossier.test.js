// versi-immobilier/tests/unit/muguets-dossier.test.js
// -----------------------------------------------------------------------------
// Forme des données dossier + cohérence prix↔dossier pour le projet Muguets.
//
// Tests SANS base de données : on importe le module de seed (le pool pg est
// instancié au top-level mais reste lazy tant qu'aucune query n'est lancée).
// On valide la STRUCTURE des objets PROPERTIES exportés, pas leur persistance.
//
// Run : node --test tests/unit/muguets-dossier.test.js
// -----------------------------------------------------------------------------

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

let MUGUETS_PROPERTIES;
let lot1, lot2, lot3;

before(async () => {
  const mod = await import('../../scripts/seed-properties-muguets.js');
  MUGUETS_PROPERTIES = mod.MUGUETS_PROPERTIES;
  lot1 = MUGUETS_PROPERTIES.find((p) => p.id === 'muguets-lot-1-rdc');
  lot2 = MUGUETS_PROPERTIES.find((p) => p.id === 'muguets-lot-2-t3');
  lot3 = MUGUETS_PROPERTIES.find((p) => p.id === 'muguets-lot-3-duplex');
});

// -----------------------------------------------------------------------------
// Helper : parse le champ `dossier` (JSONB stocké en string JSON).
// -----------------------------------------------------------------------------
function parseDossier(prop) {
  assert.ok(prop, 'prop manquant');
  assert.strictEqual(
    typeof prop.dossier,
    'string',
    `${prop.id} : champ dossier doit être une string JSON (avant insert JSONB).`
  );
  let parsed;
  assert.doesNotThrow(() => {
    parsed = JSON.parse(prop.dossier);
  }, `${prop.id} : dossier n'est pas un JSON valide.`);
  return parsed;
}

describe('Muguets — structure de base PROPERTIES', () => {
  test('expose 3 lots avec les IDs canoniques', () => {
    assert.strictEqual(MUGUETS_PROPERTIES.length, 3);
    assert.ok(lot1, 'lot1 (muguets-lot-1-rdc) manquant');
    assert.ok(lot2, 'lot2 (muguets-lot-2-t3) manquant');
    assert.ok(lot3, 'lot3 (muguets-lot-3-duplex) manquant');
  });
});

describe('Muguets — Lot1 dossier riche', () => {
  test('Lot1 a un dossier JSON parsable avec toutes les clés attendues', () => {
    const d = parseDossier(lot1);
    // Clés racine attendues par PropertyDossier.jsx et docs/dossiers-sources.
    // NB: reperesMarche est ABSENT pour Lot1 depuis le PDF juin 2026
    // (décision fondateur). architecte est PRÉSENT (bloc Holleman).
    const expectedKeys = [
      'formules', 'surfaces', 'travaux', 'dpeProjete',
      'architecte', 'calendrier',
    ];
    for (const key of expectedKeys) {
      assert.ok(
        key in d,
        `Lot1.dossier doit contenir la clé \`${key}\` (clé absente).`
      );
    }
    // Sous-clés critiques
    assert.ok(d.formules.brut, 'Lot1.dossier.formules.brut requis');
    assert.ok(d.formules.pretAHabiter, 'Lot1.dossier.formules.pretAHabiter requis');
    assert.ok(Array.isArray(d.surfaces), 'Lot1.dossier.surfaces doit être un array');
    assert.ok(d.surfaces.length > 0, 'Lot1.dossier.surfaces non vide');
    assert.ok(d.travaux && typeof d.travaux === 'object', 'Lot1.dossier.travaux objet');
    assert.ok(d.dpeProjete && d.dpeProjete.classe, 'Lot1.dossier.dpeProjete.classe requis');
    assert.ok(d.architecte && d.architecte.texte, 'Lot1.dossier.architecte.texte requis');
    assert.ok(Array.isArray(d.calendrier), 'Lot1.dossier.calendrier array');
    // Lot 1 : reperesMarche supprimé du PDF juin 2026
    assert.ok(!('reperesMarche' in d), 'Lot1.dossier.reperesMarche doit être absent (PDF juin 2026)');
  });
});

describe('Muguets — Lot2 dossier riche', () => {
  test('Lot2 a un dossier JSON parsable avec toutes les clés attendues', () => {
    const d = parseDossier(lot2);
    const expectedKeys = [
      'formules', 'surfaces', 'travaux', 'dpeProjete',
      'reperesMarche', 'calendrier',
    ];
    for (const key of expectedKeys) {
      assert.ok(
        key in d,
        `Lot2.dossier doit contenir la clé \`${key}\` (clé absente).`
      );
    }
    assert.ok(d.formules.brut, 'Lot2.dossier.formules.brut requis');
    assert.ok(d.formules.pretAHabiter, 'Lot2.dossier.formules.pretAHabiter requis');
    assert.ok(Array.isArray(d.surfaces) && d.surfaces.length > 0, 'Lot2.surfaces non vide');
    assert.ok(Array.isArray(d.calendrier), 'Lot2.calendrier array');
  });
});

describe('Muguets — Lot3 dossier riche', () => {
  test('Lot3 a un dossier JSON parsable avec toutes les clés attendues', () => {
    const d = parseDossier(lot3);
    const expectedKeys = [
      'formules', 'surfaces', 'travaux', 'dpeProjete',
      'reperesMarche', 'calendrier',
    ];
    for (const key of expectedKeys) {
      assert.ok(
        key in d,
        `Lot3.dossier doit contenir la clé \`${key}\` (clé absente).`
      );
    }
    assert.ok(d.formules.brut, 'Lot3.dossier.formules.brut requis');
    assert.ok(d.formules.pretAHabiter, 'Lot3.dossier.formules.pretAHabiter requis');
    assert.ok(Array.isArray(d.surfaces) && d.surfaces.length > 0, 'Lot3.surfaces non vide');
    assert.ok(Array.isArray(d.calendrier), 'Lot3.calendrier array');
  });
});

describe('Muguets — cohérence prix ↔ dossier', () => {
  test('Lot1 : price_num correspond au prix brut du dossier', () => {
    const d = parseDossier(lot1);
    assert.strictEqual(
      typeof lot1.price_num,
      'number',
      'Lot1.price_num doit être un nombre.'
    );
    // Extraction numérique du prix brut affiché ("118 000 €" → 118000)
    const brutStr = d.formules.brut.price;
    assert.strictEqual(typeof brutStr, 'string', 'formules.brut.price string');
    const brutNum = Number(brutStr.replace(/[^\d]/g, ''));
    assert.strictEqual(
      lot1.price_num,
      brutNum,
      `Lot1.price_num (${lot1.price_num}) doit égaler le prix brut du dossier ` +
      `(${brutNum} extrait de "${brutStr}"). Incohérence prix↔dossier.`
    );
  });

  test('Lot1 : libellés prix sont des chaînes non vides', () => {
    const d = parseDossier(lot1);
    assert.ok(
      typeof lot1.price === 'string' && lot1.price.trim().length > 0,
      'Lot1.price doit être une chaîne non vide.'
    );
    assert.ok(
      typeof d.formules.brut.price === 'string' && d.formules.brut.price.trim().length > 0,
      'Lot1.dossier.formules.brut.price doit être une chaîne non vide.'
    );
    assert.ok(
      typeof d.formules.pretAHabiter.price === 'string' &&
        d.formules.pretAHabiter.price.trim().length > 0,
      'Lot1.dossier.formules.pretAHabiter.price doit être une chaîne non vide.'
    );
  });

  test('Lot2 : price_num correspond au prix brut du dossier', () => {
    const d = parseDossier(lot2);
    assert.strictEqual(typeof lot2.price_num, 'number');
    const brutNum = Number(d.formules.brut.price.replace(/[^\d]/g, ''));
    assert.strictEqual(
      lot2.price_num,
      brutNum,
      `Lot2.price_num (${lot2.price_num}) ≠ prix brut dossier (${brutNum}).`
    );
  });

  test('Lot2 : libellés prix sont des chaînes non vides', () => {
    const d = parseDossier(lot2);
    assert.ok(typeof lot2.price === 'string' && lot2.price.trim().length > 0);
    assert.ok(typeof d.formules.brut.price === 'string' && d.formules.brut.price.trim().length > 0);
    assert.ok(typeof d.formules.pretAHabiter.price === 'string' && d.formules.pretAHabiter.price.trim().length > 0);
  });

  test('Lot3 : price_num correspond au prix brut du dossier', () => {
    const d = parseDossier(lot3);
    assert.strictEqual(typeof lot3.price_num, 'number');
    const brutNum = Number(d.formules.brut.price.replace(/[^\d]/g, ''));
    assert.strictEqual(
      lot3.price_num,
      brutNum,
      `Lot3.price_num (${lot3.price_num}) ≠ prix brut dossier (${brutNum}).`
    );
  });

  test('Lot3 : libellés prix sont des chaînes non vides', () => {
    const d = parseDossier(lot3);
    assert.ok(typeof lot3.price === 'string' && lot3.price.trim().length > 0);
    assert.ok(typeof d.formules.brut.price === 'string' && d.formules.brut.price.trim().length > 0);
    assert.ok(typeof d.formules.pretAHabiter.price === 'string' && d.formules.pretAHabiter.price.trim().length > 0);
  });
});
