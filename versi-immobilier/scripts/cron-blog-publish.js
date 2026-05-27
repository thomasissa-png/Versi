/**
 * Cron : publie automatiquement les articles de blog prévus (Versi Immobilier).
 *
 * Fonctionnement :
 * 1. Lit tous les fichiers .md dans scripts/blog-queue/
 * 2. Parse chaque fichier (frontmatter YAML + contenu markdown)
 * 3. Insère ou met à jour dans la BDD (table blog_articles)
 * 4. Déplace le fichier vers scripts/blog-published/
 *
 * Usage (manuel) :  DATABASE_URL=... node scripts/cron-blog-publish.js
 *
 * Format d'un fichier .md dans blog-queue/ :
 * ---
 * title: Mon article
 * slug: mon-article
 * excerpt: Description courte
 * tags: financement, Lille, acquéreur
 * author: Équipe Versi — Maxime, Thomas & Carl
 * ---
 * # Titre de l'article
 * Contenu markdown...
 */

import pg from 'pg';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const QUEUE_DIR = join(__dirname, 'blog-queue');
const PUBLISHED_DIR = join(__dirname, 'blog-published');
const DEFAULT_AUTHOR = 'Équipe Versi — Maxime, Thomas & Carl';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  connectionTimeoutMillis: 5000,
});

/**
 * Parse un fichier markdown avec frontmatter simple (--- ... --- + contenu).
 */
function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, content: raw };

  const meta = {};
  match[1].split('\n').forEach((line) => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    meta[key] = value;
  });

  return { meta, content: match[2].trim() };
}

async function publishFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { meta, content } = parseFrontmatter(raw);

  if (!meta.title || !meta.slug) {
    console.warn(`[CRON] Fichier ignoré (title ou slug manquant) : ${basename(filePath)}`);
    return false;
  }

  const tags = meta.tags
    ? JSON.stringify(meta.tags.split(',').map((t) => t.trim()))
    : '[]';

  await pool.query(
    `INSERT INTO blog_articles (id, title, slug, excerpt, content, author, tags, status, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'published', NOW())
     ON CONFLICT (slug) DO UPDATE
       SET title = $2, excerpt = $4, content = $5, author = $6, tags = $7,
           status = 'published', updated_at = NOW()`,
    [randomUUID(), meta.title, meta.slug, meta.excerpt || '', content, meta.author || DEFAULT_AUTHOR, tags],
  );
  console.log(`[CRON] Article publié : "${meta.title}"`);
  return true;
}

async function run() {
  console.log(`[CRON] Vérification de ${QUEUE_DIR}...`);

  if (!fs.existsSync(QUEUE_DIR)) {
    fs.mkdirSync(QUEUE_DIR, { recursive: true });
    console.log('[CRON] Dossier blog-queue/ créé.');
  }
  if (!fs.existsSync(PUBLISHED_DIR)) {
    fs.mkdirSync(PUBLISHED_DIR, { recursive: true });
    console.log('[CRON] Dossier blog-published/ créé.');
  }

  const files = fs.readdirSync(QUEUE_DIR).filter((f) => f.endsWith('.md'));

  if (files.length === 0) {
    console.log('[CRON] Aucun article en attente.');
    await pool.end();
    return;
  }

  console.log(`[CRON] ${files.length} article(s) en attente de publication.`);

  for (const file of files) {
    const filePath = join(QUEUE_DIR, file);
    try {
      const published = await publishFile(filePath);
      if (published) {
        fs.renameSync(filePath, join(PUBLISHED_DIR, file));
        console.log(`[CRON] Fichier déplacé → blog-published/${file}`);
      }
    } catch (err) {
      console.error(`[CRON] Erreur sur ${file} :`, err.message);
    }
  }

  await pool.end();
  console.log('[CRON] Terminé.');
}

run();
