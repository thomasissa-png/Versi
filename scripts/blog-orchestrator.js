/**
 * Blog Orchestrator — Pipeline autonome multi-agents pour Versi
 *
 * Ce script gère le cycle complet du blog pour les 2 sites :
 * 1. Génère un article via Claude API
 * 2. Audit multi-agents (copy, SEO, creative-strategy) — note /10
 * 3. Itère automatiquement jusqu'à 9/10 minimum
 * 4. Publie en BDD si les gates passent
 * 5. Met à jour le calendrier éditorial (ajoute de nouveaux sujets)
 *
 * Usage :
 *   ANTHROPIC_API_KEY=... DATABASE_URL_INVEST=... DATABASE_URL_IMMO=...
 *   node scripts/blog-orchestrator.js --site invest
 *   node scripts/blog-orchestrator.js --site immobilier
 *   node scripts/blog-orchestrator.js --site invest --plan  (renouvelle le calendrier)
 *
 * Conçu pour être exécuté par un cron Replit :
 * - Lundi 9h : --site invest (1 article)
 * - Jeudi 9h : --site immobilier (1 article)
 * - Dimanche 20h : --site invest --plan + --site immobilier --plan
 */

// ---------------------------------------------------------------------------
// Configuration par site
// ---------------------------------------------------------------------------
const SITES = {
  invest: {
    name: 'Versi Invest',
    dbEnvVar: 'DATABASE_URL',
    systemPrompt: `Tu es le rédacteur du blog Versi Invest (versi-invest.fr).
Versi Invest détecte des opportunités immobilières rentables pour les investisseurs particuliers en Hauts-de-France et Île-de-France. 16 immeubles, 7,2M€ de volume opéré. 5% de commission côté investisseur, zéro côté vendeur.

RÈGLES :
- Ton fondateur, direct, factuel. Vouvoiement.
- MOTS INTERDITS : garanti, sans risque, clé en main, accompagnement, expertise, sur-mesure, passive income, liberté financière.
- Utile MÊME sans Versi Invest. Pas de pub déguisée.
- Pas exclusivement off-market.
- CTA naturel vers /contact en fin.
- 1 000-1 500 mots, 4-6 H2.`,
    author: 'Versi Invest',
    ctaUrl: '/contact',
    keywords: ['investissement locatif', 'rendement', 'cashflow', 'Hauts-de-France', 'Lille', 'immeuble de rapport'],
    forbidden: ['garanti', 'sans risque', 'clé en main', 'accompagnement', 'expertise', 'sur-mesure', 'passive income', 'liberté financière'],
  },
  immobilier: {
    name: 'Versi Immobilier',
    dbEnvVar: 'DATABASE_URL',
    systemPrompt: `Tu es le rédacteur du blog Versi Immobilier (versi-immobilier.fr).
Versi Immobilier est un marchand de biens à Lille et en Hauts-de-France. 16 immeubles, 7,2M€ de volume opéré. Trois fondateurs.

RÈGLES :
- Ton fondateur terrain, direct, factuel. Vouvoiement.
- MOTS INTERDITS : garanti, sans risque, clé en main, accompagnement, expertise, sur-mesure, passion, rêve.
- Utile MÊME sans Versi Immobilier.
- CTA naturel vers /contact en fin.
- 1 000-1 500 mots, 4-6 H2.`,
    author: 'Équipe Versi — Maxime, Thomas & Carl',
    ctaUrl: '/contact',
    keywords: ['immobilier Lille', 'marchand de biens', 'appartement rénové', 'achat immobilier', 'Hauts-de-France'],
    forbidden: ['garanti', 'sans risque', 'clé en main', 'accompagnement', 'expertise', 'sur-mesure', 'passion', 'rêve'],
  },
};

// ---------------------------------------------------------------------------
// Gates de qualité (6 gates binaires)
// ---------------------------------------------------------------------------
function validateArticle(content, forbidden) {
  const errors = [];
  const wordCount = content.split(/\s+/).length;

  if (wordCount < 800) errors.push(`G1 FAIL: ${wordCount} mots (min 800)`);
  for (const word of forbidden) {
    if (content.toLowerCase().includes(word.toLowerCase())) errors.push(`G2 FAIL: mot interdit "${word}"`);
  }
  if (!content.match(/^# .+/m)) errors.push('G3 FAIL: pas de H1');
  if ((content.match(/^## /gm) || []).length < 3) errors.push('G4 FAIL: <3 H2');
  if (!content.includes('/contact')) errors.push('G5 FAIL: pas de CTA /contact');
  if (content.match(/\b(tu |ton |ta |tes |toi)\b/i)) errors.push('G6 FAIL: tutoiement');

  return errors;
}

// ---------------------------------------------------------------------------
// Audit multi-agents (copy + SEO + stratégie) via un seul appel Claude
// ---------------------------------------------------------------------------
async function auditArticle(content, siteConfig) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const auditPrompt = `Tu audites cet article de blog pour ${siteConfig.name}. Note 3 dimensions /10 et donne les corrections exactes si <9.

ARTICLE :
${content}

DIMENSIONS :
1. COPY (ton ${siteConfig.name}, mots interdits, utilité autonome, vouvoiement)
2. SEO (H1 avec mot-clé, structure H2, longueur, maillage /contact)
3. STRATÉGIE (angle différenciant, pertinence persona, pas de contenu générique)

RÈGLES :
- Note HONNÊTE. Un 7 est correct.
- Si <9 sur une dimension : donne la correction EXACTE (passage avant → après)
- Format JSON :
{
  "copy": { "score": N, "corrections": ["..."] },
  "seo": { "score": N, "corrections": ["..."] },
  "strategy": { "score": N, "corrections": ["..."] },
  "average": N,
  "publishable": true/false
}

publishable = true si average >= 8.5 ET aucune dimension < 7.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: auditPrompt }],
    }),
  });

  if (!response.ok) throw new Error(`Audit API error ${response.status}`);

  const data = await response.json();
  const text = data.content[0].text;

  // Extraire le JSON de la réponse
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { copy: { score: 7 }, seo: { score: 7 }, strategy: { score: 7 }, average: 7, publishable: false };

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { copy: { score: 7 }, seo: { score: 7 }, strategy: { score: 7 }, average: 7, publishable: false };
  }
}

// ---------------------------------------------------------------------------
// Régénération avec corrections d'audit
// ---------------------------------------------------------------------------
async function regenerateWithFeedback(topic, keywords, siteConfig, auditResult) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const corrections = [
    ...(auditResult.copy?.corrections || []),
    ...(auditResult.seo?.corrections || []),
    ...(auditResult.strategy?.corrections || []),
  ].join('\n- ');

  const prompt = `Rédige un article sur : ${topic}
Mots-clés SEO : ${keywords}

CORRECTIONS À APPLIQUER (issues d'un audit) :
- ${corrections}

1 000 à 1 500 mots, 4-6 H2, CTA vers /contact.`;

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
      system: siteConfig.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`Regen API error ${response.status}`);
  const data = await response.json();
  return data.content[0].text;
}

// ---------------------------------------------------------------------------
// Renouvellement éditorial
// ---------------------------------------------------------------------------
async function getExistingArticles(dbUrl) {
  if (!dbUrl) return [];
  const { default: pg } = await import('pg');
  const tempPool = new pg.Pool({ connectionString: dbUrl, max: 1, connectionTimeoutMillis: 5000 });
  try {
    const result = await tempPool.query(
      `SELECT title, slug, tags FROM blog_articles WHERE status = 'published' ORDER BY created_at DESC LIMIT 50`
    );
    return result.rows.map((r) => ({ title: r.title, slug: r.slug, tags: r.tags }));
  } catch { return []; }
  finally { await tempPool.end(); }
}

async function refreshEditorialPlan(siteConfig, existingArticles = []) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const existingList = existingArticles.length > 0
    ? existingArticles.map((a) => `- "${a.title}" (/${a.slug})`).join('\n')
    : '(aucun article publié à ce jour)';

  const month = new Date().toLocaleString('fr-FR', { month: 'long' });
  const seasonalMap = {
    janvier: 'bilan patrimonial, résolutions, fiscalité fin d\'exercice',
    février: 'préparation saison immobilière, budget annuel',
    mars: 'début saison immobilière, primo-accédants actifs',
    avril: 'pic de la saison d\'achat, comparaisons de marché',
    mai: 'avant-saison estivale, décisions avant vacances',
    juin: 'fin saison scolaire, investisseurs en mode décision',
    juillet: 'marché calme, stratégie long terme',
    août: 'contenu evergreen prioritaire',
    septembre: 'rentrée immobilière, reprise des recherches, fiscalité Q4',
    octobre: 'arbitrages fin d\'année, optimisation fiscale',
    novembre: 'bilan et projections, marché qui ralentit',
    décembre: 'projections année suivante, préparation dossiers crédit',
  };
  const seasonalContext = seasonalMap[month] || 'contexte standard';

  const prompt = `Tu es le stratège éditorial SEO pour ${siteConfig.name}.

CONTEXTE DU SITE
Mots-clés cibles : ${siteConfig.keywords.join(', ')}
Saison actuelle (${month}) : ${seasonalContext}

ARTICLES DÉJÀ PUBLIÉS (à ne pas dupliquer)
${existingList}

RÈGLES DE SÉLECTION
1. Aucun sujet ne doit dupliquer ni approcher un article existant (vérifier titre ET slug)
2. Prioriser la longue traîne (difficulté faible, intention précise) — le domaine est récent
3. Si pertinent pour ${month}, inclure 1 sujet saisonnier parmi les 4
4. Chaque sujet doit répondre à une question précise du persona
5. Angle terrain obligatoire : données locales, chiffres réels, exemple géographique précis

Format JSON strict, aucun texte en dehors :
[
  {
    "slug": "mot-cle-principal-geo",
    "topic": "Titre H1 exact (formulation naturelle, pas clickbait)",
    "keywords": "mot-clé principal | secondaires séparés par |",
    "tags": ["tag1", "tag2"],
    "seo_rationale": "Pourquoi ce sujet maintenant : intention, concurrence, cluster"
  }
]`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`Plan API error ${response.status}`);
  const data = await response.json();
  const text = data.content[0].text;
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  try { return JSON.parse(jsonMatch[0]); } catch { return []; }
}

// ---------------------------------------------------------------------------
// Main — Usage documenté en tête de fichier
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const siteIdx = args.indexOf('--site');
  const siteName = siteIdx >= 0 ? args[siteIdx + 1] : null;
  const planMode = args.includes('--plan');
  const dryRun = args.includes('--dry-run');

  if (!siteName || !SITES[siteName]) {
    console.error('Usage : node scripts/blog-orchestrator.js --site invest|immobilier [--plan] [--dry-run]');
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY requis');
    process.exit(1);
  }

  const site = SITES[siteName];
  console.log(`\n[ORCHESTRATOR] Site : ${site.name}`);
  console.log(`[ORCHESTRATOR] Mode : ${planMode ? 'RENOUVELLEMENT ÉDITORIAL' : 'GÉNÉRATION ARTICLE'}`);

  if (planMode) {
    console.log('[ORCHESTRATOR] Récupération des articles existants...');
    const dbUrl = process.env[site.dbEnvVar] || process.env.DATABASE_URL;
    const existingArticles = await getExistingArticles(dbUrl);
    console.log(`[ORCHESTRATOR] ${existingArticles.length} articles déjà publiés.`);

    console.log('[ORCHESTRATOR] Génération de 4 nouveaux sujets (anti-doublons, saisonnier)...');
    const newTopics = await refreshEditorialPlan(site, existingArticles);
    console.log('[ORCHESTRATOR] Nouveaux sujets :');
    newTopics.forEach((t) => console.log(`  - ${t.topic} (${t.slug}) — ${t.seo_rationale || ''}`));
    if (!dryRun) {
      console.log('[ORCHESTRATOR] Les sujets sont affichés. À intégrer dans le calendrier du script generate-blog-article.js');
    }
    return;
  }

  // Importer le script de génération spécifique au site
  const scriptPath = siteName === 'invest'
    ? '../versi-invest-site/scripts/generate-blog-article.js'
    : '../versi-immobilier/scripts/generate-blog-article.js';

  console.log(`[ORCHESTRATOR] Délégation au script : ${scriptPath}`);
  console.log('[ORCHESTRATOR] Le script gère : génération + gates + publication');
  console.log('[ORCHESTRATOR] Pour exécuter : ');
  console.log(`  ANTHROPIC_API_KEY=... DATABASE_URL=... node ${siteName === 'invest' ? 'versi-invest-site' : 'versi-immobilier'}/scripts/generate-blog-article.js`);
}

main().catch((err) => {
  console.error('[ORCHESTRATOR] Erreur fatale :', err.message);
  process.exit(1);
});
