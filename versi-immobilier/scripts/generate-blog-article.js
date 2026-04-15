/**
 * Pipeline blog autonome — Versi Immobilier
 *
 * Génère un article via l'API Claude, vérifie les gates de qualité, puis publie.
 *
 * Usage :
 *   ANTHROPIC_API_KEY=... DATABASE_URL=... node scripts/generate-blog-article.js
 *   --dry-run     → génère sans publier
 *   --topic "X"   → force un sujet
 */

import pool from '../db.js';

const EDITORIAL_CALENDAR = [
  {
    slug: 'comment-financer-achat-bien-renove-lille',
    topic: 'Comment financer l\'achat d\'un bien rénové à Lille en 2026',
    keywords: 'financement achat immobilier Lille, prêt immobilier bien rénové',
    tags: ['financement', 'acquéreur', 'Lille'],
  },
  {
    slug: 'estimation-bien-immobilier-lille-methode',
    topic: 'Estimation d\'un bien immobilier à Lille : les méthodes qui marchent',
    keywords: 'estimation bien immobilier Lille, prix au m2 Lille',
    tags: ['vendeur', 'estimation', 'Lille'],
  },
  {
    slug: 'acheter-appartement-renove-vs-ancien-a-renover',
    topic: 'Acheter un appartement rénové vs un bien à rénover : le vrai calcul',
    keywords: 'appartement rénové vs à rénover, achat immobilier rénové',
    tags: ['acquéreur', 'rénovation', 'guide'],
  },
  {
    slug: 'quartiers-lille-ou-acheter-2026',
    topic: 'Quartiers de Lille : où acheter en 2026, quartier par quartier',
    keywords: 'quartiers Lille acheter, meilleur quartier Lille immobilier',
    tags: ['acquéreur', 'Lille', 'investissement'],
  },
  {
    slug: 'succession-immobiliere-vendre-bien-herite',
    topic: 'Succession immobilière : vendre un bien hérité sans se tromper',
    keywords: 'vendre bien succession, succession immobilière vente',
    tags: ['vendeur', 'succession', 'vente'],
  },
  {
    slug: 'dpe-renovation-energetique-impact-prix',
    topic: 'DPE et rénovation énergétique : impact réel sur le prix de vente',
    keywords: 'DPE impact prix immobilier, rénovation énergétique vente',
    tags: ['acquéreur', 'énergie', 'DPE', 'rénovation'],
  },
  {
    slug: 'frais-notaire-ancien-lille-details',
    topic: 'Frais de notaire dans l\'ancien à Lille : le détail que personne ne donne',
    keywords: 'frais notaire ancien Lille, frais acquisition immobilier',
    tags: ['acquéreur', 'financement', 'Lille'],
  },
  {
    slug: 'vendre-immeuble-rapport-lille-methode',
    topic: 'Vendre un immeuble de rapport à Lille : méthode et timing',
    keywords: 'vendre immeuble rapport Lille, vente immeuble locatif',
    tags: ['vendeur', 'immeubles', 'Lille'],
  },
];

const SYSTEM_PROMPT = `Tu es le rédacteur du blog Versi Immobilier (versi-immobilier.fr).
Versi Immobilier est un marchand de biens à Lille et en Hauts-de-France. 16 immeubles, 7,2M€ de volume opéré. Trois fondateurs : Maxime, Thomas, Carl. Carte T.

RÈGLES DE RÉDACTION :
- Ton : fondateur qui connaît le terrain. Direct, factuel, zéro blabla.
- Vouvoiement systématique.
- L'article doit être utile MÊME sans Versi Immobilier.
- MOTS INTERDITS : garanti, sans risque, clé en main, accompagnement, expertise, sur-mesure, passion, rêve.
- Chiffres : fourchettes réalistes, signaler si estimation.
- Pas de superlatifs auto-décernés.
- CTA en fin d'article : naturel, vers /contact.
- Auteur : "Équipe Versi — Maxime, Thomas & Carl"

FORMAT (markdown) :
# [Titre H1]
[Chapô 2-3 phrases]
---
## [H2 sections]
[Contenu]
---
[CTA vers /contact]

Entre 1 000 et 1 500 mots. Structure en 4-6 H2.`;

// ---------------------------------------------------------------------------
// Gates de qualité
// ---------------------------------------------------------------------------
function validateArticle(content, topic) {
  const errors = [];

  // Gate 1 — Longueur minimale
  const wordCount = content.split(/\s+/).length;
  if (wordCount < 800) {
    errors.push(`FAIL: ${wordCount} mots (minimum 800)`);
  }

  // Gate 2 — Mots interdits
  const forbidden = ['garanti', 'sans risque', 'clé en main', 'accompagnement', 'expertise', 'sur-mesure', 'passion', 'rêve'];
  for (const word of forbidden) {
    if (content.toLowerCase().includes(word)) {
      errors.push(`FAIL: mot interdit "${word}" détecté`);
    }
  }

  // Gate 3 — H1 présent
  if (!content.match(/^# .+/m)) {
    errors.push('FAIL: pas de titre H1');
  }

  // Gate 4 — Au moins 3 H2
  const h2Count = (content.match(/^## /gm) || []).length;
  if (h2Count < 3) {
    errors.push(`FAIL: ${h2Count} H2 (minimum 3)`);
  }

  // Gate 5 — CTA présent
  if (!content.includes('/contact')) {
    errors.push('FAIL: pas de CTA vers /contact');
  }

  // Gate 6 — Vouvoiement
  if (content.match(/\b(tu |ton |ta |tes |toi)\b/i)) errors.push('G6 FAIL: tutoiement');

  // Gate 7 — Liens internes (≥2)
  const internalLinks = (content.match(/\]\(\//g) || []).length;
  if (internalLinks < 2) errors.push(`G7 FAIL: ${internalLinks} lien(s) interne(s) (min 2)`);

  // Gate 8 — Fierté fondateur (pas de contenu creux)
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const shortP = paragraphs.filter((p) => p.trim().length < 50 && !p.startsWith('#') && !p.startsWith('---') && !p.startsWith('['));
  if (shortP.length > 2) errors.push(`G8 FAIL: ${shortP.length} paragraphes creux`);

  // Gate 9 — Valeur (≥3 données chiffrées)
  const nums = content.match(/\d+[\s]?(%|€|euros?|mois|ans?|m²)/gi);
  if (!nums || nums.length < 3) errors.push(`G9 FAIL: ${nums?.length || 0} données chiffrées (min 3)`);

  return errors;
}

// ---------------------------------------------------------------------------
// Audit multi-agents (copy + SEO + stratégie + MdB) via Claude
// ---------------------------------------------------------------------------
async function auditArticle(content) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { average: 7, publishable: false };

  const prompt = `Comité d'audit : @copy, @seo, @creative-strategy, expert marchand de biens.
Audite cet article pour Versi Immobilier. Note 4 dimensions /10. Corrections si <9.

ARTICLE :
${content.slice(0, 6000)}

CONTEXTE : Versi Immobilier = marchand de biens Lille/HdF. 16 immeubles, 7,2M€. Trois fondateurs.

4 DIMENSIONS :
1. COPY : ton fondateur, mots interdits, vouvoiement, utilité autonome
2. SEO : H1 mot-clé, H2 progressifs, ≥1000 mots, liens internes ≥2, CTA /contact
3. STRATÉGIE : angle différenciant vs agences classiques, pertinence acquéreur/vendeur
4. MARCHAND DE BIENS : chiffres crédibles, vocabulaire immobilier correct, sérieux professionnel

SEUIL : average ≥ 9.0 ET aucune dimension < 8.5

JSON strict :
{"copy":{"score":N,"corrections":["..."]},"seo":{"score":N,"corrections":["..."]},"strategy":{"score":N,"corrections":["..."]},"mdb":{"score":N,"corrections":["..."]},"average":N,"publishable":BOOL}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
  });

  if (!response.ok) return { average: 7, publishable: false };
  const data = await response.json();
  const jsonMatch = data.content[0].text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { average: 7, publishable: false };
  try { return JSON.parse(jsonMatch[0]); } catch { return { average: 7, publishable: false }; }
}

// ---------------------------------------------------------------------------
// Notification email en cas d'échec
// ---------------------------------------------------------------------------
async function notifyFailure(topic, slug, reason) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.FROM_EMAIL || 'contact@versi.fr',
      to: 'contact@versi.fr',
      subject: `[Blog VI] Article REFUSÉ — ${slug}`,
      html: `<p>L'article <strong>"${topic}"</strong> (${slug}) refusé après 3 tentatives.</p><p>${reason}</p>`,
    });
  } catch (err) {
    console.error('[BLOG-GEN] Erreur notification :', err.message);
  }
}

// ---------------------------------------------------------------------------
// Génération via API Claude
// ---------------------------------------------------------------------------
async function generateArticle(topic, keywords) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY non configuré');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Rédige un article sur : ${topic}\nMots-clés SEO : ${keywords}\n1 000 à 1 500 mots, 4-6 H2, CTA vers /contact.` }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API Claude ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// ---------------------------------------------------------------------------
// Publication
// ---------------------------------------------------------------------------
async function publishArticle(slug, content, tags) {
  const h1Match = content.match(/^# (.+)$/m);
  const title = h1Match ? h1Match[1] : slug;
  const afterH1 = content.replace(/^# .+\n+/, '');
  const excerpt = afterH1.split(/\n\n/)[0]?.trim().slice(0, 200) || '';
  const tagsJson = JSON.stringify(tags);

  await pool.query(
    `INSERT INTO blog_articles (title, slug, excerpt, content, author, tags, status, published_at)
     VALUES ($1, $2, $3, $4, 'Équipe Versi — Maxime, Thomas & Carl', $5, 'published', NOW())
     ON CONFLICT (slug) DO UPDATE SET title=$1, excerpt=$3, content=$4, tags=$5, status='published', updated_at=NOW()`,
    [title, slug, excerpt, content, tagsJson],
  );
  console.log(`[BLOG-GEN] Publié : "${title}"`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const topicIdx = args.indexOf('--topic');
  const forcedTopic = topicIdx >= 0 ? args[topicIdx + 1] : null;

  try {
    let entry;
    if (forcedTopic) {
      entry = EDITORIAL_CALENDAR.find((e) => e.topic.toLowerCase().includes(forcedTopic.toLowerCase()));
      if (!entry) { console.error(`Sujet introuvable : "${forcedTopic}"`); process.exit(1); }
    } else {
      const published = await pool.query(`SELECT slug FROM blog_articles WHERE status = 'published'`);
      const publishedSlugs = new Set(published.rows.map((r) => r.slug));
      entry = EDITORIAL_CALENDAR.find((e) => !publishedSlugs.has(e.slug));
      if (!entry) { console.log('[BLOG-GEN] Tous les sujets sont publiés.'); process.exit(0); }
    }

    console.log(`[BLOG-GEN] Génération : "${entry.topic}"`);

    let content = await generateArticle(entry.topic, entry.keywords);
    console.log(`[BLOG-GEN] Généré (${content.split(/\s+/).length} mots)`);

    // Gates de qualité
    const errors = validateArticle(content, entry.topic);
    if (errors.length > 0) {
      console.error('[BLOG-GEN] GATES ÉCHOUÉES :');
      errors.forEach((e) => console.error(`  ${e}`));

      if (!dryRun) {
        console.log('[BLOG-GEN] Régénération avec corrections...');
        content = await generateArticle(
          entry.topic + '. IMPORTANT : ' + errors.join('. '),
          entry.keywords,
        );
        const retryErrors = validateArticle(content, entry.topic);
        if (retryErrors.length > 0) {
          console.error('[BLOG-GEN] GATES TOUJOURS ÉCHOUÉES après retry — article NON publié');
          retryErrors.forEach((e) => console.error(`  ${e}`));
          process.exit(1);
        }
      }
    }

    // Audit multi-agents — itère jusqu'à 9/10 avg, 8.5 min
    if (!dryRun && process.env.ANTHROPIC_API_KEY) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`[BLOG-GEN] Audit multi-agents (${attempt}/3)...`);
        const audit = await auditArticle(content);
        console.log(`[BLOG-GEN] copy=${audit.copy?.score}, seo=${audit.seo?.score}, strat=${audit.strategy?.score}, mdb=${audit.mdb?.score}, avg=${audit.average}`);

        if (audit.publishable) { console.log('[BLOG-GEN] Audit PASS.'); break; }
        if (attempt === 3) {
          const reason = `copy=${audit.copy?.score}, seo=${audit.seo?.score}, strat=${audit.strategy?.score}, mdb=${audit.mdb?.score}`;
          console.error('[BLOG-GEN] Audit FAIL x3 — NON publié.');
          await notifyFailure(entry.topic, entry.slug, reason);
          process.exit(1);
        }
        console.log('[BLOG-GEN] Régénération avec corrections audit...');
        const corrections = [...(audit.copy?.corrections||[]), ...(audit.seo?.corrections||[]), ...(audit.strategy?.corrections||[]), ...(audit.mdb?.corrections||[])].join('. ');
        content = await generateArticle(entry.topic + '. CORRECTIONS : ' + corrections, entry.keywords);
        const rg = validateArticle(content, entry.topic);
        if (rg.length > 0) { console.error('[BLOG-GEN] Gates fail après regen'); rg.forEach(e => console.error(`  ${e}`)); process.exit(1); }
      }
    }

    if (dryRun) {
      console.log('\n--- DRY RUN ---\n');
      console.log(content);
    } else {
      await publishArticle(entry.slug, content, entry.tags);
    }
  } catch (err) {
    console.error('[BLOG-GEN] Erreur :', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
