import express from 'express';
import { Resend } from 'resend';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
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
// Démarrage
// ---------------------------------------------------------------------------
async function start() {
  await initDatabase();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VERSI INVEST] Serveur démarré sur le port ${PORT}`);
  });
}

start();
