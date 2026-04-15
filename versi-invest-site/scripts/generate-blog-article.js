/**
 * Pipeline blog autonome — Versi Invest
 *
 * Génère un article de blog via l'API Claude, puis le publie en BDD.
 * Conçu pour être exécuté périodiquement (cron) sans intervention humaine.
 *
 * Usage :
 *   ANTHROPIC_API_KEY=... DATABASE_URL=... node scripts/generate-blog-article.js
 *
 * Optionnel :
 *   --topic "rendement locatif Valenciennes"  → force un sujet
 *   --dry-run                                 → génère sans publier
 *
 * Le script :
 * 1. Charge le calendrier éditorial (topics non encore publiés)
 * 2. Sélectionne le prochain sujet
 * 3. Génère l'article via Claude API
 * 4. Insert en BDD avec status='published'
 * 5. Log le résultat
 */

import pg from 'pg';
import { writeFileSync, readFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';

const { Pool } = pg;

// ---------------------------------------------------------------------------
// Lock file — empêche les exécutions concurrentes
// ---------------------------------------------------------------------------
const LOCK_FILE = '/tmp/versi-blog-gen.lock';

function acquireLock() {
  if (existsSync(LOCK_FILE)) {
    const pid = parseInt(readFileSync(LOCK_FILE, 'utf-8').trim(), 10);
    // Vérifier si le process est encore vivant
    try { process.kill(pid, 0); console.error(`[BLOG-GEN] Exécution déjà en cours (PID ${pid}). Abandon.`); process.exit(0); } catch { /* process mort, on prend le lock */ }
  }
  writeFileSync(LOCK_FILE, String(process.pid));
}

function releaseLock() {
  try { unlinkSync(LOCK_FILE); } catch { /* ignore */ }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  connectionTimeoutMillis: 5000,
});

// ---------------------------------------------------------------------------
// Calendrier éditorial — sujets disponibles pour la génération automatique
// ---------------------------------------------------------------------------
const EDITORIAL_CALENDAR = [
  {
    slug: 'rendement-locatif-valenciennes-2026',
    topic: 'Rendement locatif à Valenciennes en 2026 : quartiers, prix, cashflow',
    keywords: 'rendement locatif Valenciennes, investissement locatif Valenciennes',
    tags: ['investissement', 'Valenciennes', 'Hauts-de-France', 'rendement'],
  },
  {
    slug: 'investir-roubaix-immobilier-locatif',
    topic: 'Investir à Roubaix : les chiffres réels derrière les rendements à deux chiffres',
    keywords: 'rendement locatif Roubaix, investissement Roubaix',
    tags: ['investissement', 'Roubaix', 'Hauts-de-France', 'rendement'],
  },
  {
    slug: 'sci-is-investissement-locatif-quand',
    topic: 'SCI à l\'IS pour l\'investissement locatif : quand ça vaut le coup, quand non',
    keywords: 'SCI IS investissement locatif, SCI vs LMNP',
    tags: ['fiscalité', 'SCI', 'LMNP', 'investissement'],
  },
  {
    slug: 'investir-tourcoing-immobilier',
    topic: 'Investir à Tourcoing : rendement, risques, quartiers à cibler',
    keywords: 'rendement locatif Tourcoing, investissement Tourcoing',
    tags: ['investissement', 'Tourcoing', 'Hauts-de-France', 'rendement'],
  },
  {
    slug: 'charges-investissement-locatif-liste-complete',
    topic: 'Toutes les charges d\'un investissement locatif : la liste que personne ne donne',
    keywords: 'charges investissement locatif, frais investissement locatif',
    tags: ['charges', 'cashflow', 'méthode', 'investissement'],
  },
  {
    slug: 'immeuble-rapport-financement-2026',
    topic: 'Financer un immeuble de rapport en 2026 : taux, apport, structure',
    keywords: 'immeuble de rapport financement, financer immeuble rapport',
    tags: ['financement', 'immeubles', 'investissement'],
  },
  {
    slug: 'vacance-locative-hauts-de-france',
    topic: 'Vacance locative en Hauts-de-France : la vraie durée entre deux locataires',
    keywords: 'vacance locative Lille, vacance locative Hauts-de-France',
    tags: ['Hauts-de-France', 'gestion', 'rendement'],
  },
  {
    slug: 'division-appartement-immeuble-rapport',
    topic: 'Division d\'appartement et immeuble de rapport : règles, rentabilité, pièges',
    keywords: 'division appartement immobilier, immeuble de rapport division',
    tags: ['immeubles', 'travaux', 'rendement'],
  },
];

// ---------------------------------------------------------------------------
// Prompt système pour la génération d'article
// ---------------------------------------------------------------------------
const INTERNAL_ROUTES = ['/', '/comment-ca-marche', '/references', '/equipe', '/contact', '/blog'];

const SYSTEM_PROMPT = `Tu es le rédacteur du blog Versi Invest (versi-invest.fr).
Versi Invest détecte des opportunités immobilières rentables pour les investisseurs particuliers en Hauts-de-France et Île-de-France. 7 immeubles, 3,2M€ de volume opéré. 5% de commission côté investisseur, zéro côté vendeur. Carte T obtenue.

RÈGLES DE RÉDACTION :
- Ton : fondateur qui sait de quoi il parle. Direct, factuel, zéro blabla.
- Exemple de ton correct : "À Valenciennes, un T3 en centre-ville tourne à 8-9% brut. Pas exceptionnel, mais solide si vous achetez au bon prix."
- Exemple de ton à éviter : "Découvrez les incroyables opportunités de Valenciennes !"
- Vouvoiement systématique.
- Vocabulaire investisseur supposé connu : cashflow, rendement brut/net, LMNP, SCI, vacance locative.
- MOTS INTERDITS : garanti, sans risque, clé en main, accompagnement, expertise, sur-mesure, passive income, liberté financière, opportunité unique, investissement passif, meilleur, leader.
- L'article doit être utile MÊME sans Versi Invest — pas de pub déguisée.
- Versi Invest ne fait PAS exclusivement de l'off-market. Les biens viennent du réseau terrain ET du marché.
- Chiffres : utiliser des fourchettes réalistes, signaler si estimation.
- Pas de superlatifs auto-décernés.
- Le MOT-CLÉ PRINCIPAL doit apparaître dans le H1 et dans les 100 premiers mots.
- CTA en fin d'article : naturel, vers /contact, sans forcer.
- LIENS INTERNES : inclure au moins 2 liens vers les pages existantes du site : /, /comment-ca-marche, /references, /equipe, /contact, /blog.
- MÉTA-DESCRIPTION : la première phrase après le H1 doit pouvoir servir de meta-description SEO (150-160 chars).

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
// Gates de qualité — vérification avant publication
// ---------------------------------------------------------------------------
function validateArticle(content) {
  const errors = [];

  // G1 — Longueur minimale
  const wordCount = content.split(/\s+/).length;
  if (wordCount < 800) errors.push(`G1 FAIL: ${wordCount} mots (minimum 800)`);

  // G2 — Mots interdits
  const forbidden = ['garanti', 'sans risque', 'clé en main', 'accompagnement', 'expertise', 'sur-mesure', 'passive income', 'liberté financière'];
  for (const word of forbidden) {
    if (content.toLowerCase().includes(word)) errors.push(`G2 FAIL: mot interdit "${word}"`);
  }

  // G3 — H1 présent
  if (!content.match(/^# .+/m)) errors.push('G3 FAIL: pas de titre H1');

  // G4 — Au moins 3 H2
  const h2Count = (content.match(/^## /gm) || []).length;
  if (h2Count < 3) errors.push(`G4 FAIL: ${h2Count} H2 (minimum 3)`);

  // G5 — CTA /contact présent
  if (!content.includes('/contact')) errors.push('G5 FAIL: pas de CTA vers /contact');

  // G6 — Vouvoiement (pas de tutoiement)
  if (content.match(/\b(tu|ton|ta|tes|toi)\b/i)) errors.push('G6 FAIL: tutoiement détecté');

  // G7 — Liens internes (≥2, vers des routes existantes)
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

  // G9 — Valeur terrain : ≥3 données chiffrées
  const hasNumbers = content.match(/\d[\d\s.,]*\s?(%|€|euros?|mois|ans?|m²)/gi);
  if (!hasNumbers || hasNumbers.length < 3) errors.push(`G9 FAIL: ${hasNumbers?.length || 0} données chiffrées (min 3)`);

  return errors;
}

// Version enrichie avec vérification mot-clé (appelée quand keywords disponible)
function validateArticleWithKeywords(content, keywords) {
  const errors = validateArticle(content);

  // G10 — Densité mot-clé principal ≥3 occurrences
  const primaryKeyword = keywords.split(',')[0].trim().toLowerCase();
  const keywordRegex = new RegExp(primaryKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const keywordCount = (content.match(keywordRegex) || []).length;
  if (keywordCount < 3) errors.push(`G10 FAIL: mot-clé "${primaryKeyword}" apparaît ${keywordCount} fois (min 3)`);

  return errors;
}

// ---------------------------------------------------------------------------
// Génération via API Claude
// ---------------------------------------------------------------------------
async function generateArticle(topic, keywords) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY non configuré');
  }

  const userPrompt = `Rédige un article de blog sur le sujet suivant :

Sujet : ${topic}
Mots-clés SEO à intégrer naturellement : ${keywords}

L'article doit :
- Apporter de la valeur terrain (chiffres locaux, fourchettes de prix, rendements)
- Être structuré en 4-6 sections H2
- Faire 1 000 à 1 500 mots
- Se terminer par un CTA naturel vers /contact`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
    },
    signal: AbortSignal.timeout(120000),
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API Claude erreur ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// ---------------------------------------------------------------------------
// Audit multi-agents (copy + SEO + stratégie) via Claude
// ---------------------------------------------------------------------------
const AUDIT_SYSTEM_PROMPT = `Tu es un auditeur impitoyable. Ton rôle : TROUVER LES DÉFAUTS. Tu n'es PAS l'auteur de l'article — tu es l'avocat du diable.

BIAIS À COMBATTRE : tu as naturellement tendance à être indulgent. Résiste. Un 9/10 signifie qu'il n'y a qu'UNE SEULE correction mineure. Un 10/10 est exceptionnel.

CONTEXTE : Versi Invest détecte des opportunités immobilières rentables en Hauts-de-France et IDF. 7 immeubles, 3,2M€ opérés. 5% côté investisseur. Pas exclusivement off-market.

BARÈME STRICT : 10=zéro correction, 9=1 mineure, 8=mineures multiples, 7=correction structurelle, <7=réécriture nécessaire.

SEUIL DE PUBLICATION : average ≥ 9.0 ET aucune dimension < 8.5. En cas de doute, REFUSE.`;

async function auditArticle(content) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const userPrompt = `Audite cet article pour le blog Versi Invest.

ARTICLE :
${content}

4 DIMENSIONS :
1. COPY : ton fondateur direct, mots interdits (garanti, sans risque, clé en main, accompagnement, expertise, sur-mesure), utilité autonome, vouvoiement strict
2. SEO : H1 avec mot-clé, structure H2 progressive, longueur ≥1000 mots, liens internes ≥2, CTA /contact naturel
3. STRATÉGIE : angle différenciant vs portails, pas de contenu générique, pertinence pour un investisseur avec 60-80k€ d'apport
4. MARCHAND DE BIENS : les chiffres sont-ils crédibles ? Le vocabulaire immobilier est-il correct ? Un professionnel de l'immobilier trouverait-il cet article sérieux ?

Format JSON strict :
{"copy":{"score":N,"corrections":["..."]},"seo":{"score":N,"corrections":["..."]},"strategy":{"score":N,"corrections":["..."]},"mdb":{"score":N,"corrections":["..."]},"average":N,"publishable":BOOL}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
    },
    signal: AbortSignal.timeout(60000),
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [{ type: 'text', text: AUDIT_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) return { copy: { score: 7, corrections: [] }, seo: { score: 7, corrections: [] }, strategy: { score: 7, corrections: [] }, mdb: { score: 7, corrections: [] }, average: 7, publishable: false };
  const data = await response.json();
  const text = data.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { copy: { score: 7, corrections: [] }, seo: { score: 7, corrections: [] }, strategy: { score: 7, corrections: [] }, mdb: { score: 7, corrections: [] }, average: 7, publishable: false };
  try { return JSON.parse(jsonMatch[0]); } catch { return { copy: { score: 7, corrections: [] }, seo: { score: 7, corrections: [] }, strategy: { score: 7, corrections: [] }, mdb: { score: 7, corrections: [] }, average: 7, publishable: false }; }
}

// ---------------------------------------------------------------------------
// Notification email en cas d'échec (via Resend si configuré)
// ---------------------------------------------------------------------------
async function notifyFailure(topic, slug, reason) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[BLOG-GEN] Pas de RESEND_API_KEY — notification email non envoyée.');
    return;
  }
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.FROM_EMAIL || 'contact@versi.fr',
      to: 'contact@versi.fr',
      subject: `[Blog Versi Invest] Article REFUSÉ — ${slug}`,
      html: `<p>L'article <strong>"${topic}"</strong> (slug: ${slug}) a été refusé après 3 tentatives.</p><p>Raison : ${reason}</p><p>Action requise : vérifier le calendrier éditorial et relancer manuellement.</p>`,
    });
    console.log('[BLOG-GEN] Email de notification envoyé à contact@versi.fr');
  } catch (err) {
    console.error('[BLOG-GEN] Erreur envoi notification :', err.message);
  }
}

// ---------------------------------------------------------------------------
// Publication en BDD
// ---------------------------------------------------------------------------
async function publishArticle(slug, content, tags, topic) {
  // Extraire le titre H1 du markdown
  const h1Match = content.match(/^# (.+)$/m);
  const title = h1Match ? h1Match[1] : topic;

  // Extraire le chapô (premier paragraphe après le H1)
  const afterH1 = content.replace(/^# .+\n+/, '');
  const firstPara = afterH1.split(/\n\n/)[0]?.trim() || '';
  const excerpt = firstPara.slice(0, 200);

  const tagsJson = JSON.stringify(tags);

  const existing = await pool.query('SELECT id FROM blog_articles WHERE slug = $1', [slug]);

  if (existing.rows.length > 0) {
    await pool.query(
      `UPDATE blog_articles SET title=$1, excerpt=$2, content=$3, tags=$4, status='published', published_at=COALESCE(published_at, NOW()), updated_at=NOW() WHERE slug=$5`,
      [title, excerpt, content, tagsJson, slug],
    );
    console.log(`[BLOG-GEN] Article mis à jour : "${title}"`);
  } else {
    await pool.query(
      `INSERT INTO blog_articles (title, slug, excerpt, content, author, tags, status, published_at) VALUES ($1,$2,$3,$4,'Versi Invest',$5,'published',NOW())`,
      [title, slug, excerpt, content, tagsJson],
    );
    console.log(`[BLOG-GEN] Article publié : "${title}"`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const topicIdx = args.indexOf('--topic');
  const forcedTopic = topicIdx >= 0 ? args[topicIdx + 1] : null;

  // P1-3 : Lock file — empêcher exécutions concurrentes
  acquireLock();

  try {
    // Trouver le prochain sujet non publié
    let entry;

    if (forcedTopic) {
      entry = EDITORIAL_CALENDAR.find((e) => e.topic.toLowerCase().includes(forcedTopic.toLowerCase()));
      if (!entry) {
        console.error(`[BLOG-GEN] Sujet introuvable : "${forcedTopic}"`);
        process.exit(1);
      }
    } else {
      // Vérifier quels slugs sont déjà publiés
      const published = await pool.query(
        `SELECT slug FROM blog_articles WHERE status = 'published'`,
      );
      const publishedSlugs = new Set(published.rows.map((r) => r.slug));

      entry = EDITORIAL_CALENDAR.find((e) => !publishedSlugs.has(e.slug));

      if (!entry) {
        console.log('[BLOG-GEN] Tous les sujets du calendrier sont déjà publiés.');
        await pool.end();
        return;
      }
    }

    console.log(`[BLOG-GEN] Génération : "${entry.topic}"`);
    console.log(`[BLOG-GEN] Slug : ${entry.slug}`);
    console.log(`[BLOG-GEN] Keywords : ${entry.keywords}`);

    let content = await generateArticle(entry.topic, entry.keywords);
    console.log(`[BLOG-GEN] Généré (${content.split(/\s+/).length} mots)`);

    // Gates de qualité (avec G10 densité mot-clé)
    const errors = validateArticleWithKeywords(content, entry.keywords);
    if (errors.length > 0) {
      console.error('[BLOG-GEN] GATES ÉCHOUÉES :');
      errors.forEach((e) => console.error(`  ${e}`));

      if (!dryRun) {
        console.log('[BLOG-GEN] Régénération avec corrections...');
        content = await generateArticle(
          entry.topic + '. IMPORTANT : ' + errors.join('. '),
          entry.keywords,
        );
        const retryErrors = validateArticleWithKeywords(content, entry.keywords);
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

    // Audit multi-agents (copy, SEO, stratégie) — itère jusqu'à 8.5+/10
    if (!dryRun && process.env.ANTHROPIC_API_KEY) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`[BLOG-GEN] Audit multi-agents (tentative ${attempt}/3)...`);
        const audit = await auditArticle(content);
        console.log(`[BLOG-GEN] Scores : copy=${audit.copy?.score}, seo=${audit.seo?.score}, strategy=${audit.strategy?.score}, mdb=${audit.mdb?.score}, avg=${audit.average}`);

        if (audit.publishable) {
          console.log('[BLOG-GEN] Audit PASS — article validé pour publication.');
          break;
        }

        if (attempt === 3) {
          console.error('[BLOG-GEN] Audit FAIL après 3 tentatives — article NON publié.');
          const reason = `Scores finaux : copy=${audit.copy?.score}, seo=${audit.seo?.score}, strategy=${audit.strategy?.score}, mdb=${audit.mdb?.score}, avg=${audit.average}`;
          await notifyFailure(entry.topic, entry.slug, reason);
          process.exit(1);
        }

        console.log('[BLOG-GEN] Audit FAIL — régénération avec corrections...');
        const corrections = [
          ...(audit.copy?.corrections || []),
          ...(audit.seo?.corrections || []),
          ...(audit.strategy?.corrections || []),
          ...(audit.mdb?.corrections || []),
        ].join('. ');
        content = await generateArticle(
          entry.topic + '. CORRECTIONS : ' + corrections,
          entry.keywords,
        );
        const retryGates = validateArticleWithKeywords(content, entry.keywords);
        if (retryGates.length > 0) {
          console.error('[BLOG-GEN] Gates échouées après régénération');
          retryGates.forEach((e) => console.error(`  ${e}`));
          process.exit(1);
        }
      }
    }

    // P1-5 : Backup markdown local avant publication BDD
    const BACKUP_DIR = new URL('../blog-backups', import.meta.url).pathname;
    mkdirSync(BACKUP_DIR, { recursive: true });
    const backupPath = `${BACKUP_DIR}/${entry.slug}-${new Date().toISOString().slice(0, 10)}.md`;
    writeFileSync(backupPath, content, 'utf-8');
    console.log(`[BLOG-GEN] Backup sauvegardé : ${backupPath}`);

    if (dryRun) {
      console.log('\n--- DRY RUN ---\n');
      console.log(content);
    } else {
      await publishArticle(entry.slug, content, entry.tags, entry.topic);
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
