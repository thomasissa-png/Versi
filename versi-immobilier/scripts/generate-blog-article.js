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
import { writeFileSync, readFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';

// ---------------------------------------------------------------------------
// Lock file — empêche les exécutions concurrentes
// ---------------------------------------------------------------------------
const LOCK_FILE = '/tmp/versi-immo-blog-gen.lock';

function acquireLock() {
  if (existsSync(LOCK_FILE)) {
    const pid = parseInt(readFileSync(LOCK_FILE, 'utf-8').trim(), 10);
    try { process.kill(pid, 0); console.error(`[BLOG-GEN] Exécution déjà en cours (PID ${pid}). Abandon.`); process.exit(0); } catch { /* process mort, on prend le lock */ }
  }
  writeFileSync(LOCK_FILE, String(process.pid));
}

function releaseLock() {
  try { unlinkSync(LOCK_FILE); } catch { /* ignore */ }
}

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

const INTERNAL_ROUTES = ['/', '/nos-biens', '/realisations', '/notre-approche', '/contact', '/blog', '/vendre'];

const SYSTEM_PROMPT = `Tu es le rédacteur du blog Versi Immobilier (versi-immobilier.fr).
Versi Immobilier est un marchand de biens à Lille et en Hauts-de-France. 16 immeubles, 7,2M€ de volume opéré. Trois fondateurs : Maxime, Thomas, Carl. Carte T.

RÈGLES DE RÉDACTION :
- Ton : fondateur qui connaît le terrain. Direct, factuel, zéro blabla.
- Exemple de ton correct : "À Lille-Sud, un T3 rénové se vend entre 180 000 et 210 000 €. Pas donné, mais le quartier se valorise vite si vous achetez au bon moment."
- Exemple de ton à éviter : "Découvrez nos incroyables biens rénovés avec passion !"
- Vouvoiement systématique.
- L'article doit être utile MÊME sans Versi Immobilier — pas de pub déguisée.
- MOTS INTERDITS : garanti, sans risque, clé en main, accompagnement, expertise, sur-mesure, passion, rêve, opportunité unique, meilleur, leader.
- Chiffres : fourchettes réalistes, signaler si estimation.
- Pas de superlatifs auto-décernés.
- Le MOT-CLÉ PRINCIPAL doit apparaître dans le H1 et dans les 100 premiers mots.
- CTA en fin d'article : naturel, vers /contact, sans forcer.
- LIENS INTERNES : inclure au moins 2 liens vers les pages existantes du site : ${INTERNAL_ROUTES.join(', ')}.
- MÉTA-DESCRIPTION : la première phrase après le H1 doit pouvoir servir de meta-description SEO (150-160 chars).
- Auteur : "Équipe Versi — Maxime, Thomas & Carl"

FORMAT DE SORTIE (markdown) :
# [Titre H1]

[Chapô — 2-3 phrases d'accroche]

---

## [H2 section 1]
[Contenu]

## [H2 section 2]
[Contenu]

[... autant de H2 que nécessaire]

---

[CTA naturel vers /contact]

L'article doit faire entre 1 000 et 1 500 mots. Structure en 4-6 H2.`;

// ---------------------------------------------------------------------------
// Gates de qualité
// ---------------------------------------------------------------------------
function validateArticle(content, topic, keywords) {
  const errors = [];

  // G1 — Longueur minimale
  const wordCount = content.split(/\s+/).length;
  if (wordCount < 800) errors.push(`G1 FAIL: ${wordCount} mots (minimum 800)`);

  // G2 — Mots interdits
  const forbidden = ['garanti', 'sans risque', 'clé en main', 'accompagnement', 'expertise', 'sur-mesure', 'passion', 'rêve', 'opportunité unique', 'meilleur', 'leader'];
  for (const word of forbidden) {
    const re = new RegExp('(?<![\\p{L}\\p{M}])' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}\\p{M}])', 'iu');
    if (re.test(content)) errors.push(`G2 FAIL: mot interdit "${word}"`);
  }

  // G3 — H1 présent
  if (!content.match(/^# .+/m)) errors.push('G3 FAIL: pas de titre H1');

  // G4 — Au moins 3 H2
  const h2Count = (content.match(/^## /gm) || []).length;
  if (h2Count < 3) errors.push(`G4 FAIL: ${h2Count} H2 (minimum 3)`);

  // G5 — CTA /contact présent
  if (!content.includes('/contact')) errors.push('G5 FAIL: pas de CTA vers /contact');

  // G6 — Vouvoiement (pas de tutoiement)
  if (content.match(/(?<![\p{L}\p{M}])(tu|ton|ta|tes|toi)(?![\p{L}\p{M}])/iu)) errors.push('G6 FAIL: tutoiement détecté');

  // G7 — Liens internes (>=2, vers des routes existantes)
  const linkMatches = content.match(/\]\(\/[a-z-]*\)/g) || [];
  const validLinks = linkMatches.filter((l) => {
    const path = l.match(/\]\((\/[a-z-]*)\)/)?.[1];
    return INTERNAL_ROUTES.includes(path);
  });
  if (validLinks.length < 2) errors.push(`G7 FAIL: ${validLinks.length} lien(s) interne(s) valide(s) (min 2). Routes valides : ${INTERNAL_ROUTES.join(', ')}`);

  // G8 — Densité minimale : pas de paragraphes creux
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const shortP = paragraphs.filter((p) => p.trim().length < 50 && !p.startsWith('#') && !p.startsWith('---') && !p.startsWith('['));
  if (shortP.length > 2) errors.push(`G8 FAIL: ${shortP.length} paragraphes creux (<50 chars)`);

  // G9 — Valeur terrain : >=3 données chiffrées
  const hasNumbers = content.match(/\d[\d\s.,]*\s?(%|€|euros?|mois|ans?|m²)/gi);
  if (!hasNumbers || hasNumbers.length < 3) errors.push(`G9 FAIL: ${hasNumbers?.length || 0} données chiffrées (min 3)`);

  // G10 — Densité mots-clés : le mot-clé principal apparaît >=3 fois
  if (keywords) {
    const mainKw = keywords.split(',')[0].trim().toLowerCase();
    const kwTokens = mainKw.split(/\s+/).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const kwSep = "(?:\\s+(?:à|au|aux|de|du|des|d'|l'|le|la|les|en|sur|pour|et)\\s+|\\s+)";
    const kwCount = (content.match(new RegExp(kwTokens.join(kwSep), 'giu')) || []).length;
    if (kwCount < 3) errors.push(`G10 FAIL: mot-clé "${mainKw}" apparaît ${kwCount} fois (min 3)`);
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Audit multi-agents (copy + SEO + stratégie + MdB) via Claude
// ---------------------------------------------------------------------------
async function auditArticle(content) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { average: 7, publishable: false };

  const prompt = `Tu es un comité d'audit composé de 4 experts : @copy, @seo, @creative-strategy, et un expert marchand de biens immobilier.

Audite cet article pour Versi Immobilier. Note 4 dimensions /10. BARÈME : 10=aucune correction, 9=1 mineure, 8=mineures multiples, 7=correction structurelle, <7=réécriture.

ARTICLE :
${content}

CONTEXTE : Versi Immobilier = marchand de biens Lille/HdF. 16 immeubles, 7,2M€ de volume opéré. Trois fondateurs : Maxime, Thomas, Carl. Carte T.

4 DIMENSIONS :
1. COPY : ton fondateur direct, mots interdits (garanti, sans risque, clé en main, accompagnement, expertise, sur-mesure, passion, rêve, opportunité unique, meilleur, leader), utilité autonome, vouvoiement strict
2. SEO : H1 avec mot-clé, structure H2 progressive, longueur >=1000 mots, liens internes >=2 vers routes existantes, CTA /contact naturel
3. STRATÉGIE : angle différenciant vs agences classiques, pertinence acquéreur/vendeur, pas de contenu générique
4. MARCHAND DE BIENS : chiffres crédibles, vocabulaire immobilier correct, un professionnel trouverait cet article sérieux

SEUIL DE PUBLICATION : average >= 9.0 ET aucune dimension < 8.5

Format JSON strict :
{"copy":{"score":N,"corrections":["..."]},"seo":{"score":N,"corrections":["..."]},"strategy":{"score":N,"corrections":["..."]},"mdb":{"score":N,"corrections":["..."]},"average":N,"publishable":BOOL}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    signal: AbortSignal.timeout(60000),
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
  });

  if (!response.ok) return { copy: { score: 7 }, seo: { score: 7 }, strategy: { score: 7 }, mdb: { score: 7 }, average: 7, publishable: false };
  const data = await response.json();
  const text = data.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
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

  const userPrompt = `Rédige un article de blog sur le sujet suivant :

Sujet : ${topic}
Mots-clés SEO à intégrer naturellement : ${keywords}

L'article doit :
- Apporter de la valeur terrain (chiffres locaux, fourchettes de prix)
- Être structuré en 4-6 sections H2
- Faire 1 000 à 1 500 mots
- Se terminer par un CTA naturel vers /contact`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    signal: AbortSignal.timeout(120000),
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
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
  acquireLock();
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const topicIdx = args.indexOf('--topic');
  const forcedTopic = topicIdx >= 0 ? args[topicIdx + 1] : null;

  try {
    let entry;
    if (forcedTopic) {
      entry = EDITORIAL_CALENDAR.find((e) => e.topic.toLowerCase().includes(forcedTopic.toLowerCase()));
      if (!entry) { console.error(`[BLOG-GEN] Sujet introuvable : "${forcedTopic}"`); process.exit(1); }
    } else {
      const published = await pool.query(`SELECT slug FROM blog_articles WHERE status = 'published'`);
      const publishedSlugs = new Set(published.rows.map((r) => r.slug));
      entry = EDITORIAL_CALENDAR.find((e) => !publishedSlugs.has(e.slug));
      if (!entry) { console.log('[BLOG-GEN] Tous les sujets sont publiés.'); process.exit(0); }
    }

    console.log(`[BLOG-GEN] Génération : "${entry.topic}"`);
    console.log(`[BLOG-GEN] Slug : ${entry.slug}`);
    console.log(`[BLOG-GEN] Keywords : ${entry.keywords}`);

    let content = await generateArticle(entry.topic, entry.keywords);
    console.log(`[BLOG-GEN] Généré (${content.split(/\s+/).length} mots)`);

    // Backup local avant toute publication
    const backupDir = new URL('../backups/blog', import.meta.url).pathname;
    try { mkdirSync(backupDir, { recursive: true }); } catch { /* existe déjà */ }
    const backupPath = `${backupDir}/${entry.slug}-${Date.now()}.md`;
    writeFileSync(backupPath, content, 'utf-8');
    console.log(`[BLOG-GEN] Backup : ${backupPath}`);

    // Gates de qualité
    const errors = validateArticle(content, entry.topic, entry.keywords);
    if (errors.length > 0) {
      console.error('[BLOG-GEN] GATES ÉCHOUÉES :');
      errors.forEach((e) => console.error(`  ${e}`));

      if (!dryRun) {
        console.log('[BLOG-GEN] Régénération avec corrections...');
        content = await generateArticle(
          entry.topic + '. IMPORTANT : ' + errors.join('. '),
          entry.keywords,
        );
        const retryErrors = validateArticle(content, entry.topic, entry.keywords);
        if (retryErrors.length > 0) {
          console.error('[BLOG-GEN] GATES TOUJOURS ÉCHOUÉES — article NON publié');
          retryErrors.forEach((e) => console.error(`  ${e}`));
          await notifyFailure(entry.topic, entry.slug, 'Gates fail x2 : ' + retryErrors.join(', '));
          process.exit(1);
        }
        console.log('[BLOG-GEN] Gates OK après retry.');
      }
    } else {
      console.log('[BLOG-GEN] Gates OK.');
    }

    // Audit multi-agents — itère jusqu'à 9/10 avg, 8.5 min par dimension
    if (!dryRun && process.env.ANTHROPIC_API_KEY) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`[BLOG-GEN] Audit multi-agents (tentative ${attempt}/3)...`);
        const audit = await auditArticle(content);
        console.log(`[BLOG-GEN] Scores : copy=${audit.copy?.score}, seo=${audit.seo?.score}, strat=${audit.strategy?.score}, mdb=${audit.mdb?.score}, avg=${audit.average}`);

        if (audit.publishable) { console.log('[BLOG-GEN] Audit PASS — article validé pour publication.'); break; }
        if (attempt === 3) {
          const reason = `Scores finaux : copy=${audit.copy?.score}, seo=${audit.seo?.score}, strat=${audit.strategy?.score}, mdb=${audit.mdb?.score}, avg=${audit.average}`;
          console.error('[BLOG-GEN] Audit FAIL après 3 tentatives — article NON publié.');
          await notifyFailure(entry.topic, entry.slug, reason);
          process.exit(1);
        }
        console.log('[BLOG-GEN] Audit FAIL — régénération avec corrections...');
        const corrections = [
          ...(audit.copy?.corrections || []),
          ...(audit.seo?.corrections || []),
          ...(audit.strategy?.corrections || []),
          ...(audit.mdb?.corrections || []),
        ].filter(Boolean).join('. ');
        content = await generateArticle(
          entry.topic + (corrections ? '. CORRECTIONS : ' + corrections : ''),
          entry.keywords,
        );
        const retryGates = validateArticle(content, entry.topic, entry.keywords);
        if (retryGates.length > 0) {
          console.error('[BLOG-GEN] Gates échouées après régénération');
          retryGates.forEach((e) => console.error(`  ${e}`));
          await notifyFailure(entry.topic, entry.slug, 'Gates fail post-audit : ' + retryGates.join(', '));
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
    releaseLock();
    await pool.end();
  }
}

main();
