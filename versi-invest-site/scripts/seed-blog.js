/**
 * Seed : insère les 4 articles du blog Versi Invest.
 * Usage : DATABASE_URL=... node scripts/seed-blog.js
 */

import pg from 'pg';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  connectionTimeoutMillis: 5000,
});

/**
 * Parse le fichier vi2-blog-strategy.md pour extraire les articles.
 * Chaque article commence par "### Article N" et se termine avant le suivant.
 */
function parseArticles(mdContent) {
  const articles = [];
  const articleRegex = /### Article \d+\n\n\*\*Slug\*\* : `\/blog\/([^`]+)`\n\*\*Méta-titre\*\* : ([^\n]+)\n\*\*Méta-description\*\* : ([^\n]+)\n\*\*Auteur\*\* : ([^\n]+)\n\*\*Date\*\* : ([^\n]+)\n\n---\n\n# ([^\n]+)\n\n([\s\S]*?)(?=\n### Article |\n## Hypothèses|$)/g;

  let match;
  while ((match = articleRegex.exec(mdContent)) !== null) {
    const slug = match[1];
    const title = match[6];
    const excerpt = match[3].slice(0, 200);
    // Content = everything after the H1 title
    const rawContent = match[7].trim();
    // Remove trailing "---" and CTA section
    const content = rawContent.replace(/\n---\s*$/, '').trim();

    articles.push({
      title,
      slug,
      excerpt,
      content,
      author: match[4],
    });
  }

  return articles;
}

async function seed() {
  console.log('[SEED] Connexion à la base de données...');

  try {
    // Créer la table si elle n'existe pas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_articles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        excerpt TEXT,
        content TEXT NOT NULL,
        author VARCHAR(100) DEFAULT 'Versi Invest',
        cover_image VARCHAR(500),
        tags TEXT DEFAULT '[]',
        status VARCHAR(20) DEFAULT 'draft',
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Lire le fichier blog strategy
    const mdPath = join(__dirname, '..', '..', 'docs', 'seo', 'vi2-blog-strategy.md');
    if (!fs.existsSync(mdPath)) {
      console.warn(`[SEED] Fichier introuvable : ${mdPath} - skip seed.`);
      await pool.end();
      return;
    }

    const mdContent = fs.readFileSync(mdPath, 'utf-8');
    const articles = parseArticles(mdContent);

    if (articles.length === 0) {
      console.warn('[SEED] Aucun article trouvé dans le fichier markdown.');
      console.log('[SEED] Insertion des articles en fallback...');
      // Fallback : articles minimaux
      const fallbackArticles = [
        {
          title: 'Investir dans l\'immobilier locatif à Lille en 2026 : les chiffres qu\'on ne vous montre pas',
          slug: 'investissement-locatif-lille-2026',
          excerpt: 'Rendement brut, net, cashflow : voici ce que rapporte vraiment un bien locatif à Lille en 2026.',
          content: 'Article complet disponible prochainement.',
          author: 'Versi Invest',
        },
        {
          title: 'Comment calculer le cashflow réel d\'un investissement locatif',
          slug: 'calculer-cashflow-investissement-locatif',
          excerpt: 'La formule complète pour calculer le cashflow d\'un bien locatif sans les hypothèses optimistes.',
          content: 'Article complet disponible prochainement.',
          author: 'Versi Invest',
        },
        {
          title: 'Immeubles de rapport en Hauts-de-France : rendement réel et méthode',
          slug: 'immeubles-rapport-hauts-de-france-rendement',
          excerpt: 'Roubaix, Tourcoing, Valenciennes, Douai : où les immeubles de rapport dépassent 8% brut.',
          content: 'Article complet disponible prochainement.',
          author: 'Versi Invest',
        },
        {
          title: 'LMNP ancien en 2026 : ce qui a vraiment changé',
          slug: 'lmnp-ancien-2026-ce-qui-a-change',
          excerpt: 'La réforme 2025, ses conséquences concrètes, et dans quels cas le LMNP reste avantageux.',
          content: 'Article complet disponible prochainement.',
          author: 'Versi Invest',
        },
      ];

      for (const article of fallbackArticles) {
        await upsertArticle(article);
      }
    } else {
      console.log(`[SEED] ${articles.length} articles trouvés dans le markdown.`);
      for (const article of articles) {
        await upsertArticle(article);
      }
    }

    console.log('[SEED] Seed terminé avec succès.');
  } catch (err) {
    console.error('[SEED] Erreur (non-bloquant) :', err.message);
    console.log('[SEED] Le seed sera réessayé au prochain démarrage.');
  } finally {
    await pool.end();
  }
}

// Map slug → tags
const TAGS_MAP = {
  'investissement-locatif-lille-2026': ['investissement', 'Lille', 'Hauts-de-France', 'rendement'],
  'calculer-cashflow-investissement-locatif': ['cashflow', 'rendement', 'charges', 'méthode'],
  'immeubles-rapport-hauts-de-france-rendement': ['immeubles', 'Hauts-de-France', 'Roubaix', 'Tourcoing', 'rendement'],
  'lmnp-ancien-2026-ce-qui-a-change': ['LMNP', 'fiscalité', 'amortissement', 'investissement'],
};

async function upsertArticle(article) {
  const tags = JSON.stringify(TAGS_MAP[article.slug] || []);

  const existing = await pool.query(
    'SELECT id FROM blog_articles WHERE slug = $1',
    [article.slug],
  );

  if (existing.rows.length > 0) {
    await pool.query(
      `UPDATE blog_articles SET title = $1, excerpt = $2, content = $3, author = $4, tags = $5, status = 'published', published_at = COALESCE(published_at, NOW()), updated_at = NOW()
       WHERE slug = $6`,
      [article.title, article.excerpt, article.content, article.author, tags, article.slug],
    );
    console.log(`[SEED] Article mis à jour : "${article.title}"`);
  } else {
    await pool.query(
      `INSERT INTO blog_articles (title, slug, excerpt, content, author, tags, status, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'published', NOW())`,
      [article.title, article.slug, article.excerpt, article.content, article.author, tags],
    );
    console.log(`[SEED] Article inséré : "${article.title}"`);
  }
}

seed();
