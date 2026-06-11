// versi-immobilier/tests/unit/blog-generate.test.js
// -----------------------------------------------------------------------------
// Tests de la pipeline de génération d'articles de blog.
//
// Objectifs :
//   1. Le prompt initial contient les mots interdits et l'exigence de densité
//      mot-clé (dérivés de GATE_CONFIG, pas de duplication en dur).
//   2. La boucle de correction s'arrête au 1er PASS.
//   3. Après 3 itérations infructueuses, la pipeline retourne des errors > 0
//      (le caller — main() — décidera de ne pas publier et d'exit 1).
//
// Aucun appel API réel : on injecte un client mock via { client } pour
// court-circuiter defaultAnthropicClient(). Le module est importable sans
// déclencher main() (gate `isDirectRun` dans le script).
// -----------------------------------------------------------------------------

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  GATE_CONFIG,
  PROMPT_VERSION,
  buildConstraintsBlock,
  buildUserPrompt,
  buildCorrectionPrompt,
  validateArticle,
  generateArticle,
  correctArticle,
  runGenerationPipeline,
} from '../../scripts/generate-blog-article.js';

// -----------------------------------------------------------------------------
// Helpers de fabrication d'articles valides / invalides
// -----------------------------------------------------------------------------
const TOPIC = 'Quartiers de Lille : où acheter en 2026';
const KEYWORDS = 'quartiers Lille acheter, meilleur quartier Lille immobilier';
const MAIN_KW = 'quartiers lille acheter';

// Article qui PASSE toutes les gates : 1000+ mots, 3 H2, /contact, 2 liens
// internes, 3+ chiffres, mot-clé 3+ fois, pas de mot interdit, pas de
// tutoiement, pas de paragraphe creux.
function makeValidArticle() {
  const longPara = (label) => `Voici un paragraphe substantiel pour la section ${label} qui dépasse largement les 50 caractères requis. Vous y trouverez des données terrain concrètes et utiles pour structurer votre décision d'investissement immobilier.`;
  const filler = Array.from({ length: 60 }, (_, i) => `Phrase numéro ${i + 1} avec du contenu narratif suffisamment long pour passer le seuil de densité.`).join(' ');
  return [
    '# Quartiers Lille acheter en 2026 : guide complet',
    '',
    `Acheter dans les bons quartiers Lille acheter demande de la méthode. Voici une analyse terrain pour identifier les zones où acheter à Lille en 2026, avec des prix au m² entre 3 200 € et 4 800 €.`,
    '',
    '---',
    '',
    '## Quartiers Lille acheter : Vauban et Wazemmes',
    '',
    longPara('Vauban'),
    '',
    `À Wazemmes, le m² oscille entre 3 200 € et 3 800 € en 2026. ${filler}`,
    '',
    '## Quartiers Lille acheter côté Sud',
    '',
    longPara('Lille-Sud'),
    '',
    `Le rendement brut tourne autour de 5 % sur 12 mois. Voir notre page [nos biens](/nos-biens) pour des exemples concrets.`,
    '',
    '## Quartiers Lille acheter : timing 2026',
    '',
    longPara('Timing'),
    '',
    `Comptez 18 mois pour boucler un dossier. Consultez aussi [nos réalisations](/realisations).`,
    '',
    '---',
    '',
    `Pour un échange terrain sur les quartiers Lille acheter, contactez-nous via /contact.`,
  ].join('\n');
}

function fakeClient(responses) {
  let i = 0;
  const calls = [];
  const fn = async (req) => {
    calls.push(req);
    const resp = responses[Math.min(i, responses.length - 1)];
    i += 1;
    return typeof resp === 'function' ? resp(req, calls.length) : resp;
  };
  fn.calls = calls;
  return fn;
}

// -----------------------------------------------------------------------------
// 1. buildConstraintsBlock / buildUserPrompt — contraintes injectées
// -----------------------------------------------------------------------------
describe('buildConstraintsBlock', () => {
  test('inclut tous les mots interdits de GATE_CONFIG', () => {
    const block = buildConstraintsBlock(KEYWORDS);
    for (const word of GATE_CONFIG.FORBIDDEN_WORDS) {
      assert.ok(block.includes(word), `Mot interdit "${word}" absent du bloc de contraintes`);
    }
  });

  test('inclut l\'exigence de densité du mot-clé principal', () => {
    const block = buildConstraintsBlock(KEYWORDS);
    assert.ok(block.includes(MAIN_KW.split(' ').slice(0, 3).join(' ')) || block.toLowerCase().includes('quartiers lille acheter'),
      'Le mot-clé principal n\'apparaît pas dans le bloc de contraintes');
    assert.ok(block.includes(`au moins ${GATE_CONFIG.MIN_KEYWORD_OCCURRENCES} fois`),
      'L\'exigence d\'occurrences minimum n\'est pas mentionnée');
  });

  test('inclut la contrainte de longueur minimale', () => {
    const block = buildConstraintsBlock(KEYWORDS);
    assert.ok(block.includes(String(GATE_CONFIG.MIN_WORD_COUNT)));
  });

  test('inclut la contrainte de paragraphes creux (G8)', () => {
    const block = buildConstraintsBlock(KEYWORDS);
    assert.ok(block.includes(String(GATE_CONFIG.PARAGRAPH_MIN_CHARS)));
  });
});

describe('buildUserPrompt', () => {
  test('contient le bloc de contraintes complet', () => {
    const prompt = buildUserPrompt(TOPIC, KEYWORDS);
    const constraints = buildConstraintsBlock(KEYWORDS);
    assert.ok(prompt.includes(constraints));
  });

  test('contient le sujet et les keywords', () => {
    const prompt = buildUserPrompt(TOPIC, KEYWORDS);
    assert.ok(prompt.includes(TOPIC));
    assert.ok(prompt.includes(KEYWORDS));
  });
});

// -----------------------------------------------------------------------------
// 2. buildCorrectionPrompt — correction chirurgicale
// -----------------------------------------------------------------------------
describe('buildCorrectionPrompt', () => {
  test('inclut l\'article complet à corriger', () => {
    const article = makeValidArticle();
    const errors = ['G2 FAIL: mot interdit "meilleur"'];
    const prompt = buildCorrectionPrompt(article, errors, TOPIC, KEYWORDS);
    assert.ok(prompt.includes(article));
  });

  test('liste les erreurs exactes à corriger', () => {
    const errors = ['G2 FAIL: mot interdit "meilleur"', 'G10 FAIL: mot-clé "x" apparaît 1 fois (min 3)'];
    const prompt = buildCorrectionPrompt('contenu', errors, TOPIC, KEYWORDS);
    for (const e of errors) {
      assert.ok(prompt.includes(e), `Erreur "${e}" absente du prompt de correction`);
    }
  });

  test('demande de préserver la structure et la longueur', () => {
    const prompt = buildCorrectionPrompt('contenu', ['G1 FAIL: 100 mots'], TOPIC, KEYWORDS);
    assert.ok(/préserve/i.test(prompt));
    assert.ok(/longueur/i.test(prompt));
    assert.ok(/structure/i.test(prompt) || /H1|H2/.test(prompt));
  });
});

// -----------------------------------------------------------------------------
// 3. validateArticle — gates utilisent GATE_CONFIG
// -----------------------------------------------------------------------------
describe('validateArticle', () => {
  test('un article valide passe toutes les gates', () => {
    const errors = validateArticle(makeValidArticle(), TOPIC, KEYWORDS);
    assert.deepEqual(errors, [], `Erreurs inattendues : ${errors.join(' | ')}`);
  });

  test('détecte le mot interdit "meilleur"', () => {
    const article = makeValidArticle().replace('Quartiers Lille acheter : timing 2026', 'Le meilleur quartier de Lille');
    const errors = validateArticle(article, TOPIC, KEYWORDS);
    assert.ok(errors.some((e) => e.includes('G2') && e.includes('meilleur')));
  });

  test('détecte une densité mot-clé insuffisante (G10)', () => {
    const article = makeValidArticle().replace(/quartiers lille acheter/gi, 'lille');
    const errors = validateArticle(article, TOPIC, KEYWORDS);
    assert.ok(errors.some((e) => e.includes('G10')));
  });
});

// -----------------------------------------------------------------------------
// 4. Pipeline — boucle s'arrête au premier PASS
// -----------------------------------------------------------------------------
describe('runGenerationPipeline', () => {
  test('un article valide dès la génération initiale → 1 seul appel client', async () => {
    const client = fakeClient([makeValidArticle()]);
    const result = await runGenerationPipeline(TOPIC, KEYWORDS, { client, log: () => {} });
    assert.equal(result.errors.length, 0);
    assert.equal(result.attempts, 1);
    assert.equal(client.calls.length, 1);
  });

  test('correction réussie à la 1ère itération → 2 appels client, errors vides', async () => {
    const invalid = makeValidArticle().replace('Quartiers Lille acheter : timing 2026', 'Le meilleur quartier de Lille');
    const client = fakeClient([invalid, makeValidArticle()]);
    const result = await runGenerationPipeline(TOPIC, KEYWORDS, { client, log: () => {} });
    assert.equal(result.errors.length, 0);
    assert.equal(result.attempts, 2);
    assert.equal(client.calls.length, 2);
  });

  test('3 échecs consécutifs → 4 appels (1 initial + 3 corrections), errors > 0', async () => {
    const invalid = makeValidArticle().replace('Quartiers Lille acheter : timing 2026', 'Le meilleur quartier de Lille');
    // Toujours invalide → la pipeline doit s'arrêter après 3 corrections
    const client = fakeClient([invalid, invalid, invalid, invalid]);
    const result = await runGenerationPipeline(TOPIC, KEYWORDS, { client, log: () => {}, maxCorrectionIterations: 3 });
    assert.ok(result.errors.length > 0, 'La pipeline aurait dû retourner des errors');
    assert.equal(result.attempts, 4);
    assert.equal(client.calls.length, 4);
  });

  test('le 1er appel utilise buildUserPrompt (contraintes injectées)', async () => {
    const client = fakeClient([makeValidArticle()]);
    await runGenerationPipeline(TOPIC, KEYWORDS, { client, log: () => {} });
    const firstUserMsg = client.calls[0].messages[0].content;
    // Vérifie que les contraintes des gates sont dans le prompt
    for (const word of GATE_CONFIG.FORBIDDEN_WORDS) {
      assert.ok(firstUserMsg.includes(word), `Mot interdit "${word}" absent du prompt initial`);
    }
    assert.ok(firstUserMsg.includes(`au moins ${GATE_CONFIG.MIN_KEYWORD_OCCURRENCES} fois`));
  });

  test('le 2ème appel (correction) utilise buildCorrectionPrompt (article complet renvoyé)', async () => {
    const invalid = makeValidArticle().replace('Quartiers Lille acheter : timing 2026', 'Le meilleur quartier de Lille');
    const client = fakeClient([invalid, makeValidArticle()]);
    await runGenerationPipeline(TOPIC, KEYWORDS, { client, log: () => {} });
    const correctionMsg = client.calls[1].messages[0].content;
    assert.ok(correctionMsg.includes(invalid), 'L\'article invalide aurait dû être renvoyé in extenso pour correction chirurgicale');
    assert.ok(/G2 FAIL.*meilleur/i.test(correctionMsg), 'L\'erreur exacte aurait dû être listée');
  });
});

// -----------------------------------------------------------------------------
// 5. generateArticle / correctArticle — wrappers
// -----------------------------------------------------------------------------
describe('generateArticle / correctArticle (wrappers)', () => {
  test('generateArticle accepte un client mock', async () => {
    const client = fakeClient(['# Mock article\n\nContenu.']);
    const out = await generateArticle(TOPIC, KEYWORDS, { client });
    assert.equal(out, '# Mock article\n\nContenu.');
    assert.equal(client.calls.length, 1);
  });

  test('correctArticle accepte un client mock et passe les errors au prompt', async () => {
    const client = fakeClient(['# Corrigé\n\nOK.']);
    await correctArticle('article', ['G2 FAIL: mot interdit "leader"'], TOPIC, KEYWORDS, { client });
    const msg = client.calls[0].messages[0].content;
    assert.ok(msg.includes('G2 FAIL: mot interdit "leader"'));
  });
});

// -----------------------------------------------------------------------------
// 6. PROMPT_VERSION exporté (traçabilité)
// -----------------------------------------------------------------------------
describe('métadonnées', () => {
  test('PROMPT_VERSION est exporté et non vide', () => {
    assert.ok(typeof PROMPT_VERSION === 'string' && PROMPT_VERSION.length > 0);
  });

  test('GATE_CONFIG est gelé (Object.freeze)', () => {
    assert.ok(Object.isFrozen(GATE_CONFIG));
    assert.ok(Object.isFrozen(GATE_CONFIG.FORBIDDEN_WORDS));
  });
});
