// gate-runner.js — Système de gates de validation des articles de blog
// Exécute V1-V22 (auto) + GE/GS/GP (IA) + GH (humain conditionnel)

// ─────────────────────────────────────────────────────────────────────
// 1. Orchestrateur principal
// ─────────────────────────────────────────────────────────────────────

export async function runGates(articleId, pool) {
  const { rows } = await pool.query('SELECT * FROM blog_articles WHERE id = $1', [articleId]);
  if (!rows.length) throw new Error('Article non trouvé');
  const article = rows[0];
  const brief = article.brief_json || {};

  await pool.query(
    `UPDATE blog_articles SET gate_status = 'running' WHERE id = $1`,
    [articleId]
  );

  const results = {};

  // 1. Gates auto (V1-V22) — synchrone, ~10ms
  Object.assign(results, runAutoGates(article, brief));

  // 2. Gates IA (GE/GS/GP) — appel Claude, ~15s
  if (process.env.ANTHROPIC_API_KEY) {
    Object.assign(results, await runIAGates(article, brief));
  }

  // 3. Gates humaines — marquées pending si déclenchées
  Object.assign(results, resolveHumanGates(article, brief, results));

  // 4. Calcul du statut global
  const entries = Object.entries(results);
  const blockingFails = entries.filter(([, g]) => g.classe === 'BLOQUANT' && g.pass === false);
  const pendingHuman = entries.filter(([, g]) => g.pass === null);

  const gateStatus = blockingFails.length > 0
    ? 'fail'
    : pendingHuman.length > 0
      ? 'pending_human'
      : 'pass';

  // 5. Persistence
  await pool.query(
    `UPDATE blog_articles SET gate_results = $1, gate_status = $2 WHERE id = $3`,
    [JSON.stringify(results), gateStatus, articleId]
  );

  return {
    gateStatus,
    summary: {
      total: entries.length,
      pass: entries.filter(([, g]) => g.pass === true).length,
      fail: entries.filter(([, g]) => g.pass === false).length,
      pending_human: pendingHuman.length,
    },
    gates: results,
    blocking_failures: blockingFails.map(([k]) => k),
    pending_human: pendingHuman.map(([k]) => k),
  };
}

// ─────────────────────────────────────────────────────────────────────
// 2. Gates automatiques (V1-V22)
// ─────────────────────────────────────────────────────────────────────

const FORBIDDEN_WORDS = ['Expertise', 'Clé en main', 'Solutions', 'Découvrez', "N'hésitez pas", 'Bienvenue'];

function runAutoGates(article, brief) {
  const content = article.content || '';
  const r = {};

  // V1 — Mots interdits
  const found = FORBIDDEN_WORDS.filter(w => content.toLowerCase().includes(w.toLowerCase()));
  r['V1'] = gate(found.length === 0, 'Mots interdits absents', 'BLOQUANT', found.length ? `Trouvés : ${found.join(', ')}` : null);

  // V2 — Zéro exclamation
  const excl = (content.match(/!/g) || []).length;
  r['V2'] = gate(excl === 0, 'Zéro point d\'exclamation', 'BLOQUANT', excl ? `${excl} occurrence(s)` : null);

  // V3 — Vouvoiement
  const tu = content.match(/\b(tu |ton |ta |tes |toi )/gi) || [];
  r['V3'] = gate(tu.length === 0, 'Vouvoiement systématique', 'BLOQUANT', tu.length ? `Tutoiement : ${tu.slice(0, 3).join(', ')}` : null);

  // V4-V6 — Requête cible
  const mainQuery = (brief.seo?.main_query || '').toLowerCase();
  const h1Match = content.match(/^#\s+(.+)/m);
  const h1Text = h1Match ? h1Match[1].toLowerCase() : '';
  r['V4'] = gate(!mainQuery || h1Text.includes(mainQuery), 'Requête cible dans H1', 'BLOQUANT');

  const firstPara = content.split('\n\n').find(p => p && !p.startsWith('#')) || '';
  r['V5'] = gate(!mainQuery || firstPara.toLowerCase().includes(mainQuery), 'Requête cible dans chapeau', 'BLOQUANT');

  const h2s = (content.match(/^##\s+(.+)/gm) || []).map(h => h.toLowerCase());
  const h2Matches = mainQuery ? h2s.filter(h => h.includes(mainQuery)).length : 2;
  r['V6'] = gate(h2Matches >= 2, 'Requête cible dans >= 2 H2', 'BLOQUANT', `${h2Matches} H2 matchent`);

  // V7 — Longueur
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const target = brief.editorial?.word_count_target || 1000;
  const tolerance = target * 0.1;
  r['V7'] = gate(wordCount >= target - tolerance && wordCount <= target + tolerance, 'Longueur dans fourchette', 'REQUIS', `${wordCount} mots (cible ${target})`);

  // V8 — Nombre de H2
  r['V8'] = gate(h2s.length >= 3 && h2s.length <= 5, 'Nombre de H2 (3-5)', 'REQUIS', `${h2s.length} H2`);

  // V9 — CTA
  const ctaUrl = brief.conversion?.cta_url || '/nos-biens';
  r['V9'] = gate(content.includes(ctaUrl), 'CTA présent avec bonne URL', 'BLOQUANT');

  // V10 — Liens internes blog
  const blogLinks = (content.match(/\/blog\/[a-z0-9-]+/g) || []).length;
  r['V10'] = gate(blogLinks >= 1, 'Liens internes présents', 'REQUIS', `${blogLinks} lien(s)`);

  // V11 — Slug conforme
  r['V11'] = gate(/^[a-z0-9-]+$/.test(article.slug || ''), 'Slug conforme', 'BLOQUANT', article.slug);

  // V12 — Champs obligatoires
  const missing = ['title', 'slug', 'excerpt', 'author'].filter(f => !article[f]);
  r['V12'] = gate(missing.length === 0, 'Champs obligatoires complets', 'BLOQUANT', missing.length ? `Manquants : ${missing.join(', ')}` : null);

  // V13 — Zéro placeholder
  const ph = content.match(/\{\{[A-Z_]+\}\}|\[A REMPLIR\]|\[TODO\]|\[PLACEHOLDER\]/g) || [];
  r['V13'] = gate(ph.length === 0, 'Zéro placeholder', 'BLOQUANT', ph.length ? ph.join(', ') : null);

  // V14 — Paragraphes courts
  const longParas = content.split('\n\n').filter(p => p.split('\n').length > 5 && !p.startsWith('#'));
  r['V14'] = gate(longParas.length === 0, 'Paragraphes <= 5 lignes', 'REQUIS', longParas.length ? `${longParas.length} trop longs` : null);

  // V15 — Intro non molle
  const molle = /^(dans le monde|vous vous demandez|il est important|de nos jours|aujourd'hui plus que jamais)/i;
  r['V15'] = gate(!molle.test(firstPara.trim()), 'Intro non molle', 'REQUIS');

  // V16 — Données chiffrées sourcées (semi-auto)
  const numbers = content.match(/\d[\d\s]*[€%]/g) || [];
  const sourced = content.match(/\d[\d\s]*[€%].*?\(.*?(source|selon|d'après)/gi) || [];
  r['V16'] = gate(numbers.length === 0 || sourced.length > 0, 'Données chiffrées sourcées', 'REQUIS', `${numbers.length} chiffres, ${sourced.length} sourcés`);

  // V17 — Meta title
  const metaTitle = brief.seo?.meta_title || article.title || '';
  r['V17'] = gate(metaTitle.length <= 60, 'Meta title <= 60 chars', 'BLOQUANT', `${metaTitle.length} chars`);

  // V18 — Meta description
  const metaDesc = brief.seo?.meta_description || article.excerpt || '';
  r['V18'] = gate(metaDesc.length <= 155, 'Meta desc <= 155 chars', 'BLOQUANT', `${metaDesc.length} chars`);

  // V19 — Canonical
  r['V19'] = gate(!!article.slug, 'Canonical présent', 'BLOQUANT');

  // V20 — Image alt
  const imageAlt = brief.technique?.image_alt || '';
  r['V20'] = gate(imageAlt.length > 0, 'image_alt présent', 'REQUIS', imageAlt || 'absent');

  // V21 — Lien transactionnel
  const transLinks = content.match(/\/(nos-biens|vendre|contact|realisations)/g) || [];
  r['V21'] = gate(transLinks.length >= 1, 'Lien page transactionnelle', 'REQUIS', `${transLinks.length} lien(s)`);

  // V22 — Schema.org
  const schemaFields = ['title', 'author', 'excerpt'].filter(f => !article[f]);
  r['V22'] = gate(schemaFields.length === 0, 'Schema.org complet', 'BLOQUANT', schemaFields.length ? `Manquants : ${schemaFields.join(', ')}` : null);

  return r;
}

// ─────────────────────────────────────────────────────────────────────
// 3. Gates IA (GE/GS/GP) — appel Claude batch
// ─────────────────────────────────────────────────────────────────────

const IA_GATES = [
  { id: 'GE-1', label: 'Ton conforme brand voice', classe: 'BLOQUANT',
    prompt: 'Évalue si le ton respecte la brand voice Versi : confiant, direct, zéro blabla, premium par la substance. Vouvoiement systématique. Score 1-10, PASS >= 7.' },
  { id: 'GE-2', label: 'Zéro formule IA', classe: 'BLOQUANT',
    prompt: 'Détecte les formules IA : "en conclusion", "il est important de noter", "ainsi", "en effet". Liste chaque occurrence. PASS si 0.' },
  { id: 'GE-3', label: 'Spécificité Versi', classe: 'BLOQUANT',
    prompt: 'L\'article contient-il au moins 1 donnée/exemple propre à Versi Immobilier (adresse, chiffre, délai réel) ? PASS si oui.' },
  { id: 'GE-4', label: 'Rythme et fluidité', classe: 'REQUIS',
    prompt: 'La lecture est-elle fluide ? Paragraphes courts, transitions naturelles, pas de rupture de rythme. Score 1-10, PASS >= 7.' },
  { id: 'GE-5', label: 'Chapeau accrocheur', classe: 'REQUIS',
    prompt: 'Le premier paragraphe entre-t-il directement dans le sujet ? Pas de banalité. Score 1-10, PASS >= 7.' },
  { id: 'GS-1', label: 'Alignement persona', classe: 'BLOQUANT',
    prompt: 'L\'article s\'adresse-t-il au persona cible avec son vocabulaire et ses préoccupations ? Score 1-10, PASS >= 7.' },
  { id: 'GS-2', label: 'Positionnement Versi', classe: 'REQUIS',
    prompt: 'Versi est-il positionné comme opérateur crédible sans autopromotion excessive ? Score 1-10, PASS >= 7.' },
  { id: 'GS-3', label: 'Différenciation', classe: 'REQUIS',
    prompt: 'L\'article apporte-t-il un angle que seul un marchand de biens actif pourrait fournir ? Score 1-10, PASS >= 7.' },
  { id: 'GP-1', label: 'Compréhension immédiate', classe: 'BLOQUANT',
    prompt: 'En tant que lecteur cible, je comprends en 10 secondes de quoi parle cet article. Score 1-10, PASS >= 7.' },
  { id: 'GP-2', label: 'Crédibilité perçue', classe: 'BLOQUANT',
    prompt: 'L\'article me donne confiance. Les affirmations sont étayées. Score 1-10, PASS >= 7.' },
  { id: 'GP-3', label: 'Utilité perçue', classe: 'REQUIS',
    prompt: 'Je trouve cet article utile pour mon projet immobilier. Score 1-10, PASS >= 7.' },
];

async function runIAGates(article, brief) {
  const results = {};
  const content = article.content || '';
  const persona = brief.editorial?.persona || 'Kévin';

  const batchPrompt = IA_GATES.map(g =>
    `[${g.id}] ${g.prompt.replace(/persona cible|lecteur cible/g, persona)}`
  ).join('\n\n');

  const systemPrompt = `Tu es un évaluateur qualité pour le blog de Versi Immobilier (marchand de biens premium, Lille). Pour chaque gate, évalue l'article. Réponds UNIQUEMENT en JSON valide : {"gates": [{"id": "GE-1", "score": 8, "pass": true, "detail": "explication courte"}, ...]}. Seuil PASS = score >= 7 (sauf GE-2 et GE-3 qui sont binaires).`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: `ARTICLE :\n${content.slice(0, 8000)}\n\nGATES :\n${batchPrompt}` }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      for (const g of parsed.gates || []) {
        const def = IA_GATES.find(d => d.id === g.id);
        if (def) {
          results[g.id] = gate(g.pass, def.label, def.classe, `Score IA : ${g.score}/10 — ${g.detail || ''}`);
        }
      }
    }
  } catch (err) {
    console.error('[GATES] Erreur API Claude :', err.message);
    for (const g of IA_GATES) {
      results[g.id] = gate(null, g.label, g.classe, `Erreur API : ${err.message}`);
    }
  }

  // Fallback : gates non remplies → null (pending)
  for (const g of IA_GATES) {
    if (!results[g.id]) {
      results[g.id] = gate(null, g.label, g.classe, 'Non évaluée');
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────
// 4. Gates humaines (conditionnelles)
// ─────────────────────────────────────────────────────────────────────

function resolveHumanGates(article, brief, currentResults) {
  const results = {};
  const pillar = brief.editorial?.pillar || '';
  const requiresProprietary = brief.editorial?.requires_proprietary_data || false;

  // GH-1 — Validation fondateur si pilier P2
  if (pillar === 'P2') {
    results['GH-1'] = gate(null, 'Validation fondateur (P2)', 'BLOQUANT', 'En attente — réalisation terrain');
  }

  // GH-2 — Données propriétaires
  if (requiresProprietary) {
    results['GH-2'] = gate(null, 'Validation données propriétaires', 'BLOQUANT', 'En attente — chiffres à vérifier');
  }

  // GH-4 — Prévisualisation mobile (toujours)
  results['GH-4'] = gate(null, 'Prévisualisation mobile', 'REQUIS', 'À valider dans l\'admin');

  return results;
}

// ─────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────

function gate(pass, label, classe, detail = null) {
  return { pass, label, classe, detail };
}
