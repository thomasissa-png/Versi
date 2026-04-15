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

  // Gate 6 — Vouvoiement (pas de tutoiement)
  if (content.match(/\b(tu |ton |ta |tes |toi)\b/i)) {
    errors.push('FAIL: tutoiement détecté');
  }

  return errors;
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
