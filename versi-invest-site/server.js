import express from 'express';
import { Resend } from 'resend';
import pg from 'pg';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync, spawn } from 'child_process';
import { timingSafeEqual } from 'crypto';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'contact@versi.fr';

// ---------------------------------------------------------------------------
// PostgreSQL
// ---------------------------------------------------------------------------
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Erreur inattendue sur le pool PostgreSQL :', err.message);
});

// ---------------------------------------------------------------------------
// Création des tables au démarrage
// ---------------------------------------------------------------------------
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS waitlist_entries (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        budget VARCHAR(50) NOT NULL,
        zone VARCHAR(100) NOT NULL,
        first_investment BOOLEAN NOT NULL,
        message TEXT,
        consent BOOLEAN NOT NULL DEFAULT false,
        consent_timestamp TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

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

    // ---------------------------------------------------------------------------
    // Migrations : ajouter les colonnes manquantes sur table existante
    // ---------------------------------------------------------------------------
    const migrations = [
      `ALTER TABLE blog_articles ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT '[]'`,
      `ALTER TABLE blog_articles ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft'`,
      `ALTER TABLE blog_articles ADD COLUMN IF NOT EXISTS cover_image VARCHAR(500)`,
      `ALTER TABLE blog_articles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    ];

    for (const sql of migrations) {
      try {
        await pool.query(sql);
      } catch (migErr) {
        // Ignorer les erreurs "column already exists" silencieusement
        if (!migErr.message.includes('already exists')) {
          console.warn('[DB] Migration warning :', migErr.message);
        }
      }
    }

    // Migrer les anciennes données : published=true → status='published'
    // Couvre le cas où la table existait avec l'ancien schéma (published BOOLEAN)
    await pool.query(`
      UPDATE blog_articles SET status = 'published'
      WHERE (status IS NULL OR status = 'draft')
      AND published_at IS NOT NULL
    `).catch(() => {});

    console.log('[DB] Tables initialisées avec succès.');
  } catch (err) {
    console.error('[DB] Erreur initialisation tables :', err.message);
  }
}

// ---------------------------------------------------------------------------
// Nodemailer
// ---------------------------------------------------------------------------
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL || 'contact@versi.fr';

if (resend) {
  console.log('[EMAIL] Resend configuré.');
} else {
  console.warn('[WARN] RESEND_API_KEY non configurée. Les emails de notification ne seront pas envoyés.');
}

// ---------------------------------------------------------------------------
// Liveness ultra-précoce — répond AVANT tout middleware pour éviter que
// Replit Autoscale ne renvoie "DNS cache overflow". Pas d'accès DB.
// (s26 — fix DNS cache overflow)
// ---------------------------------------------------------------------------
app.get('/api/live', (req, res) => {
  res.status(200).json({ status: 'alive', ts: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '1mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.cdnfonts.com https://fonts.googleapis.com; font-src 'self' https://fonts.cdnfonts.com https://fonts.gstatic.com; script-src 'self' https://cloud.umami.is; connect-src 'self' https://cloud.umami.is; frame-ancestors 'none';");
  next();
});

// Fichiers statiques du build Vite
const DIST_DIR = join(__dirname, 'dist');
if (!fs.existsSync(DIST_DIR)) {
  console.warn('[WARN] dist/ introuvable. Exécutez "npm run build" avant de démarrer.');
}
app.use(express.static(DIST_DIR));

// ---------------------------------------------------------------------------
// Rate limiting (5 requêtes / IP / heure)
// ---------------------------------------------------------------------------
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }

  entry.count += 1;
  return false;
}

// Nettoyage périodique
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(ip);
    }
  }
}, 10 * 60 * 1000);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------------------------------------------------------------------------
// API : POST /api/waitlist
// ---------------------------------------------------------------------------
app.post('/api/waitlist', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (isRateLimited(ip)) {
    return res.status(429).json({
      ok: false,
      error: 'Trop de requêtes. Réessayez dans une heure.',
    });
  }

  const { name, email, phone, budget, zone, first_investment, message, consent } = req.body;

  // Validation
  const errors = [];
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Le nom est requis (minimum 2 caractères).');
  }
  if (!email || !validateEmail(email)) {
    errors.push('Adresse email invalide.');
  }
  if (!phone || typeof phone !== 'string' || phone.trim().length < 6) {
    errors.push('Numéro de téléphone invalide.');
  }
  if (!budget || typeof budget !== 'string') {
    errors.push('Le budget est requis.');
  }
  if (!zone || typeof zone !== 'string') {
    errors.push('La zone de sourcing est requise.');
  }
  if (typeof first_investment !== 'boolean') {
    errors.push('Le champ "premier investissement" est requis.');
  }
  if (!consent) {
    errors.push('Le consentement RGPD est requis.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ ok: false, errors });
  }

  try {
    await pool.query(
      `INSERT INTO waitlist_entries (name, email, phone, budget, zone, first_investment, message, consent, consent_timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        phone.trim(),
        budget.trim(),
        zone.trim(),
        first_investment,
        message ? message.trim() : null,
        consent,
      ]
    );

    // Envoi email de notification
    if (resend) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: CONTACT_EMAIL,
          replyTo: email.trim().toLowerCase(),
          subject: `[Versi Invest] Nouvelle inscription liste d'attente — ${name.trim()}`,
          html: `
            <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <h2 style="color:#1B3A5C;margin-bottom:24px;">Nouvelle inscription liste d'attente</h2>
              <table style="border-collapse:collapse;font-size:14px;width:100%;">
                <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">Nom</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(name)}</td></tr>
                <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">Email</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(email)}</td></tr>
                <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">Téléphone</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(phone)}</td></tr>
                <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">Budget</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(budget)}</td></tr>
                <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">Zone souhaitée</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(zone)}</td></tr>
                <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">Premier investissement</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${first_investment ? 'Oui' : 'Non'}</td></tr>
                ${message ? `<tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">Message</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(message)}</td></tr>` : ''}
              </table>
              <p style="margin-top:24px;font-size:12px;color:#888;">Email envoyé automatiquement par versi-invest.fr</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('[EMAIL] Erreur envoi notification :', emailErr.message);
        // On ne bloque pas l'inscription si l'email échoue
      }
    }

    return res.json({
      ok: true,
      message: 'Inscription confirmée. Un fondateur Versi Invest vous recontactera sous 48h.',
    });
  } catch (err) {
    console.error('[WAITLIST] Erreur insertion :', err.message);
    return res.status(500).json({
      ok: false,
      error: 'Une erreur est survenue. Veuillez réessayer.',
    });
  }
});

// ---------------------------------------------------------------------------
// API : GET /api/blog
// ---------------------------------------------------------------------------
app.get('/api/blog', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, slug, excerpt, author, cover_image, tags, published_at, created_at
       FROM blog_articles
       WHERE status = 'published'
       ORDER BY published_at DESC NULLS LAST, created_at DESC`
    );
    return res.json({ ok: true, articles: result.rows });
  } catch (err) {
    console.error('[BLOG] Erreur récupération articles :', err.message);
    return res.status(500).json({
      ok: false,
      error: 'Impossible de charger les articles.',
    });
  }
});

// ---------------------------------------------------------------------------
// API : GET /api/blog/:slug
// ---------------------------------------------------------------------------
app.get('/api/blog/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, title, slug, excerpt, content, author, cover_image, tags, published_at, created_at
       FROM blog_articles
       WHERE slug = $1 AND status = 'published'`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Article non trouvé.' });
    }

    return res.json({ ok: true, article: result.rows[0] });
  } catch (err) {
    console.error('[BLOG] Erreur récupération article :', err.message);
    return res.status(500).json({
      ok: false,
      error: 'Impossible de charger cet article.',
    });
  }
});

// ---------------------------------------------------------------------------
// API : GET /api/health
// ---------------------------------------------------------------------------
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    return res.json({ status: 'degraded', db: 'disconnected', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Trigger externe (GitHub Actions) — génération + publication d'un article.
// Remplace le node-cron intra-process, inopérant sur Replit Autoscale
// (scale-to-zero quand pas de trafic). La requête reste ouverte avec un
// heartbeat pour garder l'instance éveillée le temps de la génération.
// Protégé par CRON_TRIGGER_TOKEN (Authorization: Bearer ... ou x-cron-token).
// ---------------------------------------------------------------------------
let blogGenRunning = false;

function safeTokenEqual(provided, expected) {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

app.post('/api/cron/blog-generate', (req, res) => {
  const expected = process.env.CRON_TRIGGER_TOKEN;
  if (!expected) return res.status(503).json({ error: 'CRON_TRIGGER_TOKEN non configuré' });

  const auth = req.get('authorization') || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : (req.get('x-cron-token') || '');
  if (!safeTokenEqual(provided, expected)) return res.status(401).json({ error: 'Token invalide' });

  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'ANTHROPIC_API_KEY absent' });
  if (blogGenRunning) return res.status(409).json({ error: 'Génération déjà en cours' });

  blogGenRunning = true;
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.write(`[CRON] ${new Date().toISOString()} — démarrage génération...\n`);

  const child = spawn('node', ['scripts/generate-blog-article.js'], { cwd: __dirname, env: process.env });
  child.stdout.on('data', (d) => res.write(d));
  child.stderr.on('data', (d) => res.write(d));

  const heartbeat = setInterval(() => res.write('.'), 15000);
  const hardTimeout = setTimeout(() => { res.write('\n[CRON] Timeout 8 min — arrêt forcé.\n'); child.kill('SIGKILL'); }, 480000);

  const finish = (code) => {
    clearInterval(heartbeat);
    clearTimeout(hardTimeout);
    blogGenRunning = false;
    res.write(`\n[CRON] RESULT exit=${code}\n`);
    res.end();
  };
  child.on('close', (code) => finish(code));
  child.on('error', (err) => { res.write(`\n[CRON] Erreur spawn : ${err.message}\n`); finish(1); });
});

// ---------------------------------------------------------------------------
// SPA fallback — toutes les routes non-API renvoient index.html
// ---------------------------------------------------------------------------
app.get('/{*splat}', (req, res) => {
  const indexPath = join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return res.status(404).send('Build introuvable. Exécutez "npm run build".');
});

// ---------------------------------------------------------------------------
// Cron blog — node-cron (génération + renouvellement éditorial)
// ---------------------------------------------------------------------------
function scheduleBlogCron() {
  if (process.env.CRON_TRIGGER_TOKEN) {
    console.log('[CRON] CRON_TRIGGER_TOKEN présent — crons intra-process désactivés (pilotés par trigger externe).');
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('[CRON] ANTHROPIC_API_KEY absent — crons blog désactivés.');
    return;
  }

  // Lundi 9h — Génération d'article (rythme adaptatif)
  cron.schedule('0 9 * * 1', async () => {
    console.log(`[CRON] ${new Date().toISOString()} — Vérification publication article...`);

    try {
      // Rythme adaptatif : <8 articles → bimensuel, ≥8 → hebdomadaire
      const countResult = await pool.query(`SELECT COUNT(*) FROM blog_articles WHERE status = 'published'`);
      const articleCount = parseInt(countResult.rows[0].count, 10);

      if (articleCount < 8) {
        const weekOfMonth = Math.ceil(new Date().getDate() / 7);
        if (weekOfMonth !== 1 && weekOfMonth !== 3) {
          console.log(`[CRON] Phase fondation (${articleCount} articles) — semaine skippée.`);
          return;
        }
        console.log(`[CRON] Phase fondation (${articleCount} articles) — publication bimensuelle.`);
      } else {
        console.log(`[CRON] Phase accélération (${articleCount} articles) — publication hebdomadaire.`);
      }

      execSync('node scripts/generate-blog-article.js', {
        cwd: __dirname,
        env: process.env,
        stdio: 'inherit',
        timeout: 300000,
      });
      console.log('[CRON] Article généré et publié.');
    } catch (err) {
      console.error('[CRON] Erreur génération article :', err.message);
    }
  });

  // Dimanche 20h — Renouvellement calendrier éditorial
  cron.schedule('0 20 * * 0', () => {
    console.log(`[CRON] ${new Date().toISOString()} — Renouvellement calendrier éditorial...`);
    try {
      execSync('node scripts/blog-orchestrator.js --site invest --plan', {
        cwd: join(__dirname, '..'),
        env: process.env,
        stdio: 'inherit',
        timeout: 60000,
      });
      console.log('[CRON] Calendrier éditorial renouvelé.');
    } catch (err) {
      console.error('[CRON] Erreur renouvellement éditorial :', err.message);
    }
  });

  console.log('[CRON] Blog planifié : articles lundi 9h, calendrier dimanche 20h.');
}

// ---------------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------------
// Binding 0.0.0.0 explicite (requis Replit Autoscale — sans ça, le proxy
// ne peut pas atteindre le process et renvoie "DNS cache overflow").
// initDatabase() et scheduleBlogCron() s'exécutent en arrière-plan APRÈS
// que listen() ait accepté des connexions — le proxy Replit reçoit donc
// une réponse immédiate sur /api/live dès le boot.
// Publie au boot les articles pré-rédigés déposés dans scripts/blog-queue/.
// Idempotent : ON CONFLICT (slug) DO NOTHING — ne touche pas aux articles existants.
// Non bloquant : toute erreur est loguée sans interrompre le boot.
async function seedBlogQueue() {
  try {
    const queueDir = join(__dirname, 'scripts', 'blog-queue');
    if (!fs.existsSync(queueDir)) return;
    let count = 0;
    for (const file of fs.readdirSync(queueDir).filter((f) => f.endsWith('.md'))) {
      try {
        const raw = fs.readFileSync(join(queueDir, file), 'utf-8');
        const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (!m) continue;
        const meta = {};
        m[1].split('\n').forEach((line) => {
          const i = line.indexOf(':');
          if (i > -1) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
        });
        if (!meta.title || !meta.slug) continue;
        const tags = meta.tags ? JSON.stringify(meta.tags.split(',').map((t) => t.trim())) : '[]';
        const res = await pool.query(
          `INSERT INTO blog_articles (title, slug, excerpt, content, author, tags, status, published_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'published', COALESCE($7::timestamptz, NOW()))
           ON CONFLICT (slug) DO UPDATE
             SET published_at = $7::timestamptz, updated_at = NOW()
           WHERE $7::timestamptz IS NOT NULL
             AND blog_articles.published_at IS DISTINCT FROM $7::timestamptz`,
          [meta.title, meta.slug, meta.excerpt || '', m[2].trim(), meta.author || 'Versi Invest', tags, meta.date || null],
        );
        if (res.rowCount > 0) count += 1;
      } catch (err) {
        console.error(`[SEED-QUEUE] Erreur sur ${file} : ${err.message}`);
      }
    }
    console.log(`[SEED-QUEUE] ${count} article(s) publié(s) depuis la file.`);
  } catch (err) {
    console.error(`[SEED-QUEUE] Erreur : ${err.message}`);
  }
}

// (s26-it2 — fix DNS cache overflow : régression it1 corrigée. Avant,
// initDatabase() était awaited AVANT listen() et bloquait le boot → 503.)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[VERSI INVEST] Serveur démarré sur le port ${PORT}`);

  // Tâches asynchrones non-bloquantes (ne doivent PAS retarder la réponse
  // du proxy Replit aux healthchecks)
  initDatabase()
    .then(() => console.log('[BOOT] initDatabase OK'))
    .then(() => seedBlogQueue())
    .catch((err) => console.error('[BOOT] initDatabase ERROR :', err.message));

  try {
    scheduleBlogCron();
  } catch (err) {
    console.error('[BOOT] scheduleBlogCron ERROR :', err.message);
  }
});
