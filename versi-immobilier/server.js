import express from 'express';
import { Resend } from 'resend';
import crypto from 'crypto';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync, spawn } from 'child_process';
import { timingSafeEqual } from 'crypto';
import fs from 'fs';
import pool from './db.js';
import { runGates } from './gate-runner.js';
import {
  MUGUETS_PROPERTIES,
  NANTERRE_PROJECT,
  BLOG_ARTICLES_A1_A6, BLOG_ARTICLES_A2_A8,
} from './seed-data.js';
import { LILLE_PROJECTS } from './scripts/lille-projects.js';
import {
  upsertProjectPhotosDb,
  ensurePhotoSchema,
} from './scripts/photo-sync.js';

// Lecture du manifest pré-compilé (généré en local par scripts/generate-photos.js,
// commité dans le repo). En prod, on lit ce JSON puis INSERT URLs en DB —
// zéro sharp, zéro resize, zéro I/O lourd au boot. Fix Neon timeout 57P01.
function readPhotosManifest() {
  const manifestPath = join(__dirname, 'public', 'projects', 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.warn(`[autoSeed] Manifest photos absent : ${manifestPath} — lance scripts/generate-photos.js en local.`);
    return { projects: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (err) {
    console.warn(`[autoSeed] Manifest photos illisible : ${err.message}`);
    return { projects: {} };
  }
}
function manifestPhotosFor(projectId) {
  const manifest = readPhotosManifest();
  return manifest?.projects?.[projectId]?.photos || [];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// ---------------------------------------------------------------------------
// Chemins des dossiers dist pour les deux sites
// ---------------------------------------------------------------------------
const VERSI_IMMO_DIST = join(__dirname, 'dist');
const VERSI_FR_DIST = join(__dirname, '..', 'src', 'dist');

// Vérification au boot que les dossiers dist existent
if (!fs.existsSync(VERSI_IMMO_DIST)) {
  console.error('[FATAL] versi-immobilier/dist/ introuvable. Exécutez le build avant de démarrer.');
}
if (!fs.existsSync(VERSI_FR_DIST)) {
  console.warn('[WARN] src/dist/ introuvable. Le site versi.fr ne sera pas servi. Exécutez "cd src && npm run build".');
}

if (!ADMIN_PASSWORD) {
  console.warn('[WARN] ADMIN_PASSWORD non configurée. Le login admin sera impossible.');
}

// ---------------------------------------------------------------------------
// Helper : détecter si la requête cible versi.fr (holding)
// ---------------------------------------------------------------------------
function isVersiFr(req) {
  const host = (req.hostname || req.headers.host || '').toLowerCase();
  // Matcher versi.fr mais PAS versi-immobilier.fr
  // Couvre : versi.fr, www.versi.fr, versi-fr.repl.co, etc.
  if (host.includes('versi-immobilier') || host.includes('versi--immobilier')) {
    return false;
  }
  if (host.includes('versi.fr') || host.includes('versi-fr')) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Liveness ultra-précoce — répond AVANT tout le reste pour éviter que
// Replit Autoscale ne renvoie "DNS cache overflow" pendant le boot ou si
// un middleware aval est lent/cassé. Pas d'accès DB, pas d'I/O disque.
// (s26 — fix DNS cache overflow)
// ---------------------------------------------------------------------------
app.get('/api/live', (req, res) => {
  res.status(200).json({ status: 'alive', ts: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.cdnfonts.com https://fonts.googleapis.com; font-src 'self' https://fonts.cdnfonts.com https://fonts.gstatic.com; script-src 'self' https://cloud.umami.is; connect-src 'self' https://cloud.umami.is; frame-src https://www.openstreetmap.org; frame-ancestors 'none';");
  next();
});

// ---------------------------------------------------------------------------
// Routing multi-site par hostname
// ---------------------------------------------------------------------------
// Servir les fichiers statiques du bon site selon le hostname
const versiImmoStatic = express.static(VERSI_IMMO_DIST);
const versiFrStatic = express.static(VERSI_FR_DIST);

// Photos projets : servies depuis public/ avec cache HTTP long (immutable
// car le naming inclut un sort_order figé par photo-sync). Doit être
// déclaré AVANT le routing par hostname pour s'appliquer aux deux sites.
const PUBLIC_DIR = join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR, {
  maxAge: '7d',
  etag: true,
  immutable: false, // false : si on remplace photo-NN.jpeg, le cache se rafraîchit en 7j
}));

app.use((req, res, next) => {
  if (isVersiFr(req)) {
    return versiFrStatic(req, res, next);
  }
  return versiImmoStatic(req, res, next);
});

// ---------------------------------------------------------------------------
// Resend (email transactionnel)
// ---------------------------------------------------------------------------
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

if (!resend) {
  console.warn(
    '[WARN] RESEND_API_KEY non configurée. ' +
    'Les endpoints /api/contact et /api/sell retourneront 503.'
  );
}

const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'contact@versi.fr';
const FROM_EMAIL = process.env.FROM_EMAIL || 'contact@versi.fr';

// ---------------------------------------------------------------------------
// Rate limiting simple en mémoire (max 5 envois / IP / heure)
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

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(ip);
    }
  }
}, 10 * 60 * 1000);

// Nettoyage login rate limit map (même intervalle)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginRateLimitMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      loginRateLimitMap.delete(ip);
    }
  }
}, 10 * 60 * 1000);

// Nettoyage sessions admin expirées (toutes les 30 minutes)
setInterval(async () => {
  try {
    const result = await pool.query('DELETE FROM admin_sessions WHERE expires_at < NOW()');
    if (result.rowCount > 0) {
      console.log(`[CRON] ${result.rowCount} session(s) admin expirée(s) supprimée(s)`);
    }
  } catch (err) {
    console.error('[CRON] Erreur nettoyage sessions :', err.message);
  }
}, 30 * 60 * 1000);

// Publication programmée — publie les articles validés dont scheduled_at est passé (toutes les 5 minutes)
setInterval(async () => {
  try {
    const result = await pool.query(
      `UPDATE blog_articles
       SET status = 'published', published_at = NOW()
       WHERE status = 'draft'
         AND scheduled_at IS NOT NULL
         AND scheduled_at <= NOW()
         AND gate_status = 'pass'
       RETURNING id, title, slug`
    );
    if (result.rowCount > 0) {
      for (const article of result.rows) {
        console.log(`[CRON] Article publié automatiquement : "${article.title}" (${article.slug})`);
      }
    }
  } catch (err) {
    console.error('[CRON] Erreur publication programmée :', err.message);
  }
}, 5 * 60 * 1000);

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

function buildHtmlTable(fields) {
  const rows = fields
    .map(([label, value]) => {
      const safeValue = escapeHtml(value || '').replace(/\n/g, '<br>');
      return `<tr><td style="padding:8px 12px;font-weight:600;vertical-align:top;white-space:nowrap;border-bottom:1px solid #eee;">${escapeHtml(label)}</td><td style="padding:8px 12px;vertical-align:top;border-bottom:1px solid #eee;">${safeValue}</td></tr>`;
    })
    .join('');

  return `<table style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:14px;max-width:600px;">${rows}</table>`;
}

// ---------------------------------------------------------------------------
// Slugify helper
// ---------------------------------------------------------------------------
function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ---------------------------------------------------------------------------
// Cookie parser (manual — no dependency)
// ---------------------------------------------------------------------------
function parseCookies(req) {
  const cookies = {};
  const header = req.headers.cookie;
  if (!header) return cookies;
  header.split(';').forEach(c => {
    const [name, ...rest] = c.trim().split('=');
    if (name) cookies[name.trim()] = decodeURIComponent(rest.join('='));
  });
  return cookies;
}

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------
async function checkAdminAuth(req, res, next) {
  const cookies = parseCookies(req);
  const token = cookies.vi_admin_token;
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Non authentifié' });
  }

  try {
    const result = await pool.query(
      'SELECT id FROM admin_sessions WHERE id = $1 AND expires_at > NOW()',
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ ok: false, error: 'Session expirée' });
    }
    req.adminSessionId = token;
    next();
  } catch (err) {
    console.error('[AUTH] Erreur vérification session :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
}

// ---------------------------------------------------------------------------
// Rate limiting admin login (10 tentatives / IP / heure)
// ---------------------------------------------------------------------------
const loginRateLimitMap = new Map();
const LOGIN_RATE_LIMIT_MAX = 10;

function isLoginRateLimited(ip) {
  const now = Date.now();
  const entry = loginRateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    loginRateLimitMap.set(ip, { windowStart: now, count: 1 });
    return false;
  }

  if (entry.count >= LOGIN_RATE_LIMIT_MAX) {
    return true;
  }

  entry.count += 1;
  return false;
}

// ---------------------------------------------------------------------------
// Notification email helper
// ---------------------------------------------------------------------------
async function sendPropertyNotification(property) {
  if (!resend) return;

  try {
    const subs = await pool.query('SELECT email FROM subscribers WHERE active = true');
    if (subs.rows.length === 0) return;

    const siteUrl = process.env.SITE_URL || 'https://versi-immobilier.fr';

    for (const { email } of subs.rows) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: `[Versi Immobilier] Nouveau bien disponible — ${property.title}`,
          html: `
            <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <p>Bonjour,</p>
              <p>Un nouveau bien vient d'être mis en vente sur Versi Immobilier.</p>
              <h2 style="color:#1a1a1a;margin:24px 0 16px;">${escapeHtml(property.title)}</h2>
              <table style="border-collapse:collapse;font-size:14px;margin-bottom:24px;">
                <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Ville :</td><td>${escapeHtml(property.city)}</td></tr>
                <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Surface :</td><td>${escapeHtml(property.surface)}</td></tr>
                <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Prix :</td><td>${escapeHtml(property.price)}</td></tr>
              </table>
              <p><a href="${siteUrl}/bien/${property.id}" style="display:inline-block;padding:12px 24px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:6px;">Voir ce bien</a></p>
              <hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px;">
              <p style="font-size:12px;color:#888;">Vous recevez cet email car vous vous êtes inscrit aux alertes biens de versi-immobilier.fr.<br>Pour vous désinscrire, répondez à cet email avec "STOP".</p>
            </div>
          `,
        });
      } catch (err) {
        console.error('[NOTIF] Erreur envoi à', email, ':', err.message);
      }
      await new Promise(r => setTimeout(r, 500));
    }
  } catch (err) {
    console.error('[NOTIF] Erreur récupération inscrits :', err.message);
  }
}

// ---------------------------------------------------------------------------
// Auth endpoints
// ---------------------------------------------------------------------------

// POST /api/admin/login
app.post('/api/admin/login', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  if (isLoginRateLimited(ip)) {
    res.set('Retry-After', '3600');
    return res.status(429).json({ ok: false, error: 'Trop de tentatives. Réessayez dans 1 heure.' });
  }

  const { password } = req.body;
  if (!password || !ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: 'Mot de passe incorrect' });
  }

  // Constant-time comparison to prevent timing attacks
  const passwordBuffer = Buffer.from(String(password));
  const adminBuffer = Buffer.from(ADMIN_PASSWORD);
  const isValid = passwordBuffer.length === adminBuffer.length &&
    crypto.timingSafeEqual(passwordBuffer, adminBuffer);
  if (!isValid) {
    return res.status(401).json({ ok: false, error: 'Mot de passe incorrect' });
  }

  try {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO admin_sessions (id, expires_at, ip) VALUES ($1, $2, $3)',
      [sessionId, expiresAt.toISOString(), ip]
    );

    // Set httpOnly cookie — not accessible via JavaScript
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    const securePart = isSecure ? '; Secure' : '';
    res.setHeader('Set-Cookie',
      `vi_admin_token=${sessionId}; HttpOnly; SameSite=Strict; Max-Age=${8 * 60 * 60}; Path=/api/admin${securePart}`
    );

    return res.json({ ok: true, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    console.error('[AUTH] Erreur création session :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// POST /api/admin/logout
app.post('/api/admin/logout', checkAdminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM admin_sessions WHERE id = $1', [req.adminSessionId]);
    // Clear the httpOnly cookie
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    const securePart = isSecure ? '; Secure' : '';
    res.setHeader('Set-Cookie',
      `vi_admin_token=; HttpOnly; SameSite=Strict; Max-Age=0; Path=/api/admin${securePart}`
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('[AUTH] Erreur suppression session :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// GET /api/admin/me
app.get('/api/admin/me', checkAdminAuth, (req, res) => {
  return res.json({ ok: true, authenticated: true });
});

// ---------------------------------------------------------------------------
// Public endpoints
// ---------------------------------------------------------------------------

// GET /api/public/properties
app.get('/api/public/properties', async (req, res) => {
  const VALID_PROPERTY_STATUS = ['disponible', 'archive', 'vendu', 'all'];
  const status = req.query.status || 'disponible';
  if (!VALID_PROPERTY_STATUS.includes(status)) {
    return res.status(400).json({ ok: false, error: 'Statut invalide' });
  }

  try {
    let result;
    if (status === 'all') {
      result = await pool.query(
        'SELECT id, title, city, location, neighborhood, address, nearby_transport, nearby_amenities, type, surface, rooms, price, price_num, price_note, status, dpe, dpe_note, floor, tenancy, renovation_year, charges, description, works, features, dossier, sort_order, created_at, updated_at FROM properties ORDER BY sort_order ASC, created_at DESC'
      );
    } else {
      result = await pool.query(
        'SELECT id, title, city, location, neighborhood, address, nearby_transport, nearby_amenities, type, surface, rooms, price, price_num, price_note, status, dpe, dpe_note, floor, tenancy, renovation_year, charges, description, works, features, dossier, sort_order, created_at, updated_at FROM properties WHERE status = $1 ORDER BY sort_order ASC, created_at DESC',
        [status]
      );
    }
    return res.json({ properties: result.rows });
  } catch (err) {
    console.error('[API] Erreur GET /api/public/properties :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// GET /api/public/properties/:id
app.get('/api/public/properties/:id', async (req, res) => {
  try {
    const propResult = await pool.query('SELECT * FROM properties WHERE id = $1', [req.params.id]);
    if (propResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Bien non trouvé' });
    }
    const photosResult = await pool.query(
      'SELECT id, data, filename, mime_type, size_bytes, sort_order, created_at FROM property_photos WHERE property_id = $1 ORDER BY sort_order ASC',
      [req.params.id]
    );
    return res.json({ property: propResult.rows[0], photos: photosResult.rows });
  } catch (err) {
    console.error('[API] Erreur GET /api/public/properties/:id :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// GET /api/public/projects
app.get('/api/public/projects', async (req, res) => {
  const VALID_PROJECT_STATUS = ['completed', 'in-progress', 'archive', 'all'];
  const status = req.query.status || 'completed';
  if (!VALID_PROJECT_STATUS.includes(status)) {
    return res.status(400).json({ ok: false, error: 'Statut invalide' });
  }

  try {
    // Subquery : 1ère photo "après" par sort_order ASC, fallback sur les autres.
    // Renvoie l'URL relative servie par express.static (pas de base64).
    const coverSubquery = `
      LEFT JOIN LATERAL (
        SELECT pp.url
        FROM project_photos pp
        WHERE pp.project_id = p.id AND pp.url IS NOT NULL
        ORDER BY CASE WHEN pp.category = 'apres' THEN 0 ELSE 1 END, pp.sort_order ASC
        LIMIT 1
      ) cover ON true
    `;
    const columns = 'p.id, p.title, p.city, p.type, p.surface, p.units, p.status, p.buy_price, p.works_amount, p.sell_price, p.offer_delay, p.signature_delay, p.duration, p.description, p.featured, p.sort_order, p.created_at, p.updated_at, cover.url AS cover_url';

    let result;
    if (status === 'all') {
      result = await pool.query(
        `SELECT ${columns} FROM projects p ${coverSubquery} ORDER BY p.sort_order ASC, p.created_at DESC`
      );
    } else {
      result = await pool.query(
        `SELECT ${columns} FROM projects p ${coverSubquery} WHERE p.status = $1 ORDER BY p.sort_order ASC, p.created_at DESC`,
        [status]
      );
    }

    // cover_url est déjà l'URL statique servie par express.static.
    const projects = result.rows;

    return res.json({ projects });
  } catch (err) {
    console.error('[API] Erreur GET /api/public/projects :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// GET /api/public/projects/:id
app.get('/api/public/projects/:id', async (req, res) => {
  try {
    const projResult = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (projResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Réalisation non trouvée' });
    }
    // Photos servies en statique : on retourne directement l'URL stockée
    // par photo-sync (`/projects/<id>/photo-NN.jpeg`). Tri category+sort
    // pour que les "après" passent avant les "avant" dans la galerie.
    const photosResult = await pool.query(
      `SELECT id, url, filename, mime_type, size_bytes, category, sort_order, created_at
       FROM project_photos
       WHERE project_id = $1 AND url IS NOT NULL
       ORDER BY CASE WHEN category = 'apres' THEN 0 ELSE 1 END, sort_order ASC`,
      [req.params.id]
    );
    const photos = photosResult.rows.map((p) => ({
      id: p.id,
      url: p.url,
      filename: p.filename,
      category: p.category || 'apres',
      alt: null,
      sort_order: p.sort_order,
    }));
    return res.json({ project: projResult.rows[0], photos });
  } catch (err) {
    console.error('[API] Erreur GET /api/public/projects/:id :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// POST /api/public/subscribe
app.post('/api/public/subscribe', async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    return res.status(400).json({ ok: false, error: 'Email invalide' });
  }

  try {
    await pool.query(
      'INSERT INTO subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING',
      [String(email).trim().toLowerCase()]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('[API] Erreur POST /api/public/subscribe :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// ---------------------------------------------------------------------------
// Admin CRUD — Properties
// ---------------------------------------------------------------------------

// GET /api/admin/properties
app.get('/api/admin/properties', checkAdminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM properties ORDER BY sort_order ASC, created_at DESC'
    );
    return res.json({ properties: result.rows });
  } catch (err) {
    console.error('[API] Erreur GET /api/admin/properties :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// GET /api/admin/properties/:id (single item for edit form)
app.get('/api/admin/properties/:id', checkAdminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM properties WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Bien non trouvé' });
    }
    const photos = await pool.query(
      'SELECT id, filename, mime_type, sort_order, data FROM property_photos WHERE property_id = $1 ORDER BY sort_order ASC',
      [req.params.id]
    );
    return res.json({ ok: true, property: rows[0], photos: photos.rows });
  } catch (err) {
    console.error('[ERROR] GET /api/admin/properties/:id :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur serveur' });
  }
});

// POST /api/admin/properties
app.post('/api/admin/properties', checkAdminAuth, async (req, res) => {
  const {
    title, city, location, neighborhood, address, nearby_transport, nearby_amenities,
    type, surface, rooms, price, price_num, price_note, status,
    dpe, dpe_note, floor, tenancy, renovation_year, charges,
    description, works, features, sort_order
  } = req.body;

  if (!title || !city || !location || !type || !surface || !price || !description) {
    return res.status(400).json({ ok: false, error: 'Champs requis manquants (title, city, location, type, surface, price, description)' });
  }

  const propertyStatus = status || 'disponible';
  const validStatuses = ['disponible', 'archive', 'vendu'];
  if (!validStatuses.includes(propertyStatus)) {
    return res.status(400).json({ ok: false, error: `Status invalide. Valeurs autorisées : ${validStatuses.join(', ')}` });
  }

  if (dpe && !['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(dpe)) {
    return res.status(400).json({ ok: false, error: 'DPE invalide. Valeurs autorisées : A, B, C, D, E, F, G' });
  }

  try {
    let id = slugify(title);
    if (!id) id = crypto.randomUUID().slice(0, 8);
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = attempt === 0 ? id : id + '-' + crypto.randomUUID().slice(0, 6);
      const existing = await pool.query('SELECT id FROM properties WHERE id = $1', [candidate]);
      if (existing.rows.length === 0) { id = candidate; break; }
      if (attempt === 4) return res.status(409).json({ ok: false, error: 'Impossible de générer un identifiant unique' });
    }

    const result = await pool.query(
      `INSERT INTO properties (id, title, city, location, neighborhood, address, nearby_transport, nearby_amenities, type, surface, rooms, price, price_num, price_note, status, dpe, dpe_note, floor, tenancy, renovation_year, charges, description, works, features, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
       RETURNING *`,
      [id, title, city, location, neighborhood || null, address || null, nearby_transport || null, nearby_amenities || null,
       type, surface, rooms || null, price, price_num || null, price_note || null, propertyStatus,
       dpe || null, dpe_note || null, floor || null, tenancy || null, renovation_year || null, charges || null,
       description, JSON.stringify(works || []), JSON.stringify(features || []), sort_order || 0]
    );

    const property = result.rows[0];

    if (propertyStatus === 'disponible') {
      sendPropertyNotification(property);
    }

    return res.status(201).json({ ok: true, property });
  } catch (err) {
    console.error('[API] Erreur POST /api/admin/properties :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// PUT /api/admin/properties/:id
app.put('/api/admin/properties/:id', checkAdminAuth, async (req, res) => {
  const { id } = req.params;
  const fields = req.body;

  if (fields.status) {
    const validStatuses = ['disponible', 'archive', 'vendu'];
    if (!validStatuses.includes(fields.status)) {
      return res.status(400).json({ ok: false, error: `Status invalide. Valeurs autorisées : ${validStatuses.join(', ')}` });
    }
  }

  if (fields.dpe && !['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(fields.dpe)) {
    return res.status(400).json({ ok: false, error: 'DPE invalide. Valeurs autorisées : A, B, C, D, E, F, G' });
  }

  const allowedFields = [
    'title', 'city', 'location', 'neighborhood', 'address', 'nearby_transport', 'nearby_amenities',
    'type', 'surface', 'rooms', 'price', 'price_num', 'price_note', 'status',
    'dpe', 'dpe_note', 'floor', 'tenancy', 'renovation_year', 'charges',
    'description', 'works', 'features', 'sort_order'
  ];

  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if (field in fields) {
      const value = (field === 'works' || field === 'features')
        ? JSON.stringify(fields[field])
        : fields[field];
      setClauses.push(`${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ ok: false, error: 'Aucun champ à mettre à jour' });
  }

  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE properties SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Bien non trouvé' });
    }
    return res.json({ ok: true, property: result.rows[0] });
  } catch (err) {
    console.error('[API] Erreur PUT /api/admin/properties/:id :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// PATCH /api/admin/properties/:id/archive
app.patch('/api/admin/properties/:id/archive', checkAdminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE properties SET status = 'archive' WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Bien non trouvé' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('[API] Erreur PATCH archive :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// PATCH /api/admin/properties/:id/vendu
app.patch('/api/admin/properties/:id/vendu', checkAdminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE properties SET status = 'vendu' WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Bien non trouvé' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('[API] Erreur PATCH vendu :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// PATCH /api/admin/properties/:id/restaurer
app.patch('/api/admin/properties/:id/restaurer', checkAdminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE properties SET status = 'disponible' WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Bien non trouvé' });
    }

    sendPropertyNotification(result.rows[0]);

    return res.json({ ok: true });
  } catch (err) {
    console.error('[API] Erreur PATCH restaurer :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// DELETE /api/admin/properties/:id
app.delete('/api/admin/properties/:id', checkAdminAuth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM properties WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Bien non trouvé' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('[API] Erreur DELETE property :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// ---------------------------------------------------------------------------
// Admin CRUD — Property Photos
// ---------------------------------------------------------------------------

// GET /api/admin/properties/:id/photos
app.get('/api/admin/properties/:id/photos', checkAdminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, data, filename, mime_type, size_bytes, sort_order, created_at FROM property_photos WHERE property_id = $1 ORDER BY sort_order ASC',
      [req.params.id]
    );
    return res.json({ photos: result.rows });
  } catch (err) {
    console.error('[API] Erreur GET property photos :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// POST /api/admin/properties/:id/photos
app.post('/api/admin/properties/:id/photos', checkAdminAuth, async (req, res) => {
  const { data, filename, mime_type, size_bytes } = req.body;

  if (!data || !filename || !mime_type) {
    return res.status(400).json({ ok: false, error: 'Champs requis : data, filename, mime_type' });
  }

  const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validMimes.includes(mime_type)) {
    return res.status(400).json({ ok: false, error: `Type MIME invalide. Autorisés : ${validMimes.join(', ')}` });
  }

  if (!data.startsWith('data:image/')) {
    return res.status(400).json({ ok: false, error: 'Le champ data doit commencer par data:image/' });
  }

  // Server-side size validation: compute real size from base64 (client size_bytes is untrusted)
  const base64Data = data.split(',')[1] || data;
  const realSizeBytes = Math.ceil(base64Data.length * 3 / 4);
  if (realSizeBytes > 5242880) {
    return res.status(413).json({ ok: false, error: 'Photo trop lourde (max 5 Mo)' });
  }

  try {
    const propCheck = await pool.query('SELECT id FROM properties WHERE id = $1', [req.params.id]);
    if (propCheck.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Bien non trouvé' });
    }

    const maxOrder = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM property_photos WHERE property_id = $1',
      [req.params.id]
    );

    const result = await pool.query(
      'INSERT INTO property_photos (property_id, data, filename, mime_type, size_bytes, sort_order) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, filename, mime_type, size_bytes, sort_order, created_at',
      [req.params.id, data, filename, mime_type, size_bytes || null, maxOrder.rows[0].next_order]
    );

    return res.status(201).json({ ok: true, photo: result.rows[0] });
  } catch (err) {
    console.error('[API] Erreur POST property photo :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// DELETE /api/admin/properties/:propertyId/photos/:photoId
app.delete('/api/admin/properties/:propertyId/photos/:photoId', checkAdminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM property_photos WHERE id = $1 AND property_id = $2 RETURNING id',
      [req.params.photoId, req.params.propertyId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Photo non trouvée' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('[API] Erreur DELETE property photo :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// PATCH /api/admin/properties/:id/photos/reorder
app.patch('/api/admin/properties/:id/photos/reorder', checkAdminAuth, async (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) {
    return res.status(400).json({ ok: false, error: 'Le champ order doit être un tableau d\'identifiants' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < order.length; i++) {
      await client.query(
        'UPDATE property_photos SET sort_order = $1 WHERE id = $2 AND property_id = $3',
        [i, order[i], req.params.id]
      );
    }
    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[API] Erreur reorder property photos :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// Admin CRUD — Projects
// ---------------------------------------------------------------------------

// GET /api/admin/projects
app.get('/api/admin/projects', checkAdminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM projects ORDER BY sort_order ASC, created_at DESC'
    );
    return res.json({ projects: result.rows });
  } catch (err) {
    console.error('[API] Erreur GET /api/admin/projects :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// GET /api/admin/projects/:id (single item for edit form)
app.get('/api/admin/projects/:id', checkAdminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Réalisation non trouvée' });
    }
    const photos = await pool.query(
      'SELECT id, filename, mime_type, sort_order, data FROM project_photos WHERE project_id = $1 ORDER BY sort_order ASC',
      [req.params.id]
    );
    return res.json({ ok: true, project: rows[0], photos: photos.rows });
  } catch (err) {
    console.error('[ERROR] GET /api/admin/projects/:id :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur serveur' });
  }
});

// POST /api/admin/projects
app.post('/api/admin/projects', checkAdminAuth, async (req, res) => {
  const {
    title, city, type, surface, units, status,
    buy_price, works_amount, sell_price, offer_delay, signature_delay,
    duration, description, featured, sort_order
  } = req.body;

  if (!title || !city || !type || !surface || !description) {
    return res.status(400).json({ ok: false, error: 'Champs requis manquants (title, city, type, surface, description)' });
  }

  const projectStatus = status || 'completed';
  const validStatuses = ['completed', 'in-progress', 'archive'];
  if (!validStatuses.includes(projectStatus)) {
    return res.status(400).json({ ok: false, error: `Status invalide. Valeurs autorisées : ${validStatuses.join(', ')}` });
  }

  try {
    let id = slugify(title);
    if (!id) id = crypto.randomUUID().slice(0, 8);
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = attempt === 0 ? id : id + '-' + crypto.randomUUID().slice(0, 6);
      const existing = await pool.query('SELECT id FROM projects WHERE id = $1', [candidate]);
      if (existing.rows.length === 0) { id = candidate; break; }
      if (attempt === 4) return res.status(409).json({ ok: false, error: 'Impossible de générer un identifiant unique' });
    }

    const result = await pool.query(
      `INSERT INTO projects (id, title, city, type, surface, units, status, buy_price, works_amount, sell_price, offer_delay, signature_delay, duration, description, featured, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [id, title, city, type, surface, units || null, projectStatus,
       buy_price || null, works_amount || null, sell_price || null,
       offer_delay || null, signature_delay || null, duration || null,
       description, featured || false, sort_order || 0]
    );

    return res.status(201).json({ ok: true, project: result.rows[0] });
  } catch (err) {
    console.error('[API] Erreur POST /api/admin/projects :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// PUT /api/admin/projects/:id
app.put('/api/admin/projects/:id', checkAdminAuth, async (req, res) => {
  const { id } = req.params;
  const fields = req.body;

  if (fields.status) {
    const validStatuses = ['completed', 'in-progress', 'archive'];
    if (!validStatuses.includes(fields.status)) {
      return res.status(400).json({ ok: false, error: `Status invalide. Valeurs autorisées : ${validStatuses.join(', ')}` });
    }
  }

  const allowedFields = [
    'title', 'city', 'type', 'surface', 'units', 'status',
    'buy_price', 'works_amount', 'sell_price', 'offer_delay', 'signature_delay',
    'duration', 'description', 'featured', 'sort_order'
  ];

  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if (field in fields) {
      setClauses.push(`${field} = $${paramIndex}`);
      values.push(fields[field]);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ ok: false, error: 'Aucun champ à mettre à jour' });
  }

  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE projects SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Réalisation non trouvée' });
    }
    return res.json({ ok: true, project: result.rows[0] });
  } catch (err) {
    console.error('[API] Erreur PUT /api/admin/projects/:id :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// PATCH /api/admin/projects/:id/archive
app.patch('/api/admin/projects/:id/archive', checkAdminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE projects SET status = 'archive' WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Réalisation non trouvée' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('[API] Erreur PATCH archive project :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// DELETE /api/admin/projects/:id
app.delete('/api/admin/projects/:id', checkAdminAuth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Réalisation non trouvée' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('[API] Erreur DELETE project :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// ---------------------------------------------------------------------------
// Admin CRUD — Project Photos
// ---------------------------------------------------------------------------

// GET /api/admin/projects/:id/photos
app.get('/api/admin/projects/:id/photos', checkAdminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, data, filename, mime_type, size_bytes, sort_order, created_at FROM project_photos WHERE project_id = $1 ORDER BY sort_order ASC',
      [req.params.id]
    );
    return res.json({ photos: result.rows });
  } catch (err) {
    console.error('[API] Erreur GET project photos :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// POST /api/admin/projects/:id/photos
app.post('/api/admin/projects/:id/photos', checkAdminAuth, async (req, res) => {
  const { data, filename, mime_type, size_bytes } = req.body;

  if (!data || !filename || !mime_type) {
    return res.status(400).json({ ok: false, error: 'Champs requis : data, filename, mime_type' });
  }

  const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validMimes.includes(mime_type)) {
    return res.status(400).json({ ok: false, error: `Type MIME invalide. Autorisés : ${validMimes.join(', ')}` });
  }

  if (!data.startsWith('data:image/')) {
    return res.status(400).json({ ok: false, error: 'Le champ data doit commencer par data:image/' });
  }

  // Server-side size validation: compute real size from base64 (client size_bytes is untrusted)
  const base64Data = data.split(',')[1] || data;
  const realSizeBytes = Math.ceil(base64Data.length * 3 / 4);
  if (realSizeBytes > 5242880) {
    return res.status(413).json({ ok: false, error: 'Photo trop lourde (max 5 Mo)' });
  }

  try {
    const projCheck = await pool.query('SELECT id FROM projects WHERE id = $1', [req.params.id]);
    if (projCheck.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Réalisation non trouvée' });
    }

    const maxOrder = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM project_photos WHERE project_id = $1',
      [req.params.id]
    );

    const result = await pool.query(
      'INSERT INTO project_photos (project_id, data, filename, mime_type, size_bytes, sort_order) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, filename, mime_type, size_bytes, sort_order, created_at',
      [req.params.id, data, filename, mime_type, size_bytes || null, maxOrder.rows[0].next_order]
    );

    return res.status(201).json({ ok: true, photo: result.rows[0] });
  } catch (err) {
    console.error('[API] Erreur POST project photo :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// DELETE /api/admin/projects/:projectId/photos/:photoId
app.delete('/api/admin/projects/:projectId/photos/:photoId', checkAdminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM project_photos WHERE id = $1 AND project_id = $2 RETURNING id',
      [req.params.photoId, req.params.projectId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Photo non trouvée' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('[API] Erreur DELETE project photo :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// PATCH /api/admin/projects/:id/photos/reorder
app.patch('/api/admin/projects/:id/photos/reorder', checkAdminAuth, async (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) {
    return res.status(400).json({ ok: false, error: 'Le champ order doit être un tableau d\'identifiants' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < order.length; i++) {
      await client.query(
        'UPDATE project_photos SET sort_order = $1 WHERE id = $2 AND project_id = $3',
        [i, order[i], req.params.id]
      );
    }
    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[API] Erreur reorder project photos :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// Admin — Subscribers
// ---------------------------------------------------------------------------

// GET /api/admin/subscribers
app.get('/api/admin/subscribers', checkAdminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, created_at, active FROM subscribers ORDER BY created_at DESC'
    );
    return res.json({ subscribers: result.rows, total: result.rows.length });
  } catch (err) {
    console.error('[API] Erreur GET subscribers :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// DELETE /api/admin/subscribers/:id
app.delete('/api/admin/subscribers/:id', checkAdminAuth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM subscribers WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Inscrit non trouvé' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('[API] Erreur DELETE subscriber :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// ---------------------------------------------------------------------------
// Public — Blog
// ---------------------------------------------------------------------------

// GET /api/public/blog — articles publiés (sans content)
app.get('/api/public/blog', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, slug, excerpt, cover_image, author, tags, published_at
       FROM blog_articles
       WHERE status = 'published'
       ORDER BY published_at DESC`
    );
    return res.json({ articles: result.rows });
  } catch (err) {
    console.error('[API] Erreur GET /api/public/blog :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// GET /api/public/blog/sitemap — URLs des articles publiés pour sitemap
app.get('/api/public/blog/sitemap', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT slug, published_at, updated_at
       FROM blog_articles
       WHERE status = 'published'
       ORDER BY published_at DESC`
    );
    const siteUrl = process.env.SITE_URL || 'https://versi-immobilier.fr';
    const urls = result.rows.map((a) => ({
      loc: `${siteUrl}/blog/${a.slug}`,
      lastmod: (a.updated_at || a.published_at || new Date()).toISOString().split('T')[0],
    }));
    return res.json({ urls });
  } catch (err) {
    console.error('[API] Erreur GET /api/public/blog/sitemap :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// GET /api/public/blog/:slug — article complet par slug
app.get('/api/public/blog/:slug', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM blog_articles WHERE slug = $1 AND status = 'published'`,
      [req.params.slug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Article non trouvé' });
    }
    return res.json({ article: result.rows[0] });
  } catch (err) {
    console.error('[API] Erreur GET /api/public/blog/:slug :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// ---------------------------------------------------------------------------
// Admin CRUD — Blog
// ---------------------------------------------------------------------------

// GET /api/admin/blog — tous les articles (tous statuts)
app.get('/api/admin/blog', checkAdminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM blog_articles ORDER BY created_at DESC'
    );
    return res.json({ articles: result.rows });
  } catch (err) {
    console.error('[API] Erreur GET /api/admin/blog :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// GET /api/admin/blog/:id — article complet par ID
app.get('/api/admin/blog/:id', checkAdminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM blog_articles WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Article non trouvé' });
    }
    return res.json({ ok: true, article: rows[0] });
  } catch (err) {
    console.error('[API] Erreur GET /api/admin/blog/:id :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// POST /api/admin/blog — créer un article
app.post('/api/admin/blog', checkAdminAuth, async (req, res) => {
  const { title, excerpt, content, cover_image, author, tags, status } = req.body;

  if (!title || !excerpt || !content) {
    return res.status(400).json({ ok: false, error: 'Champs requis manquants (title, excerpt, content)' });
  }

  const articleStatus = status || 'draft';
  const validStatuses = ['draft', 'published', 'archived'];
  if (!validStatuses.includes(articleStatus)) {
    return res.status(400).json({ ok: false, error: `Status invalide. Valeurs autorisées : ${validStatuses.join(', ')}` });
  }

  try {
    let slug = slugify(title);
    if (!slug) slug = crypto.randomUUID().slice(0, 8);

    // Ensure unique slug
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = attempt === 0 ? slug : slug + '-' + crypto.randomUUID().slice(0, 6);
      const existing = await pool.query('SELECT id FROM blog_articles WHERE slug = $1', [candidate]);
      if (existing.rows.length === 0) { slug = candidate; break; }
      if (attempt === 4) return res.status(409).json({ ok: false, error: 'Impossible de générer un slug unique' });
    }

    const id = slug;
    const publishedAt = articleStatus === 'published' ? new Date().toISOString() : null;

    const result = await pool.query(
      `INSERT INTO blog_articles (id, title, slug, excerpt, content, cover_image, author, tags, status, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [id, title, slug, excerpt, content, cover_image || null,
       author || 'Versi Immobilier', JSON.stringify(tags || []),
       articleStatus, publishedAt]
    );

    return res.status(201).json({ ok: true, article: result.rows[0] });
  } catch (err) {
    console.error('[API] Erreur POST /api/admin/blog :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// PUT /api/admin/blog/:id — modifier un article
app.put('/api/admin/blog/:id', checkAdminAuth, async (req, res) => {
  const { id } = req.params;
  const fields = req.body;

  if (fields.status) {
    const validStatuses = ['draft', 'published', 'archived'];
    if (!validStatuses.includes(fields.status)) {
      return res.status(400).json({ ok: false, error: `Status invalide. Valeurs autorisées : ${validStatuses.join(', ')}` });
    }
  }

  const allowedFields = ['title', 'excerpt', 'content', 'cover_image', 'author', 'tags', 'status', 'published_at'];

  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if (field in fields) {
      const value = field === 'tags' ? JSON.stringify(fields[field]) : fields[field];
      setClauses.push(`${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  // Auto-update slug if title changed
  if (fields.title) {
    const newSlug = slugify(fields.title);
    if (newSlug) {
      const existing = await pool.query('SELECT id FROM blog_articles WHERE slug = $1 AND id != $2', [newSlug, id]);
      if (existing.rows.length === 0) {
        setClauses.push(`slug = $${paramIndex}`);
        values.push(newSlug);
        paramIndex++;
      }
    }
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ ok: false, error: 'Aucun champ à mettre à jour' });
  }

  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE blog_articles SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Article non trouvé' });
    }
    return res.json({ ok: true, article: result.rows[0] });
  } catch (err) {
    console.error('[API] Erreur PUT /api/admin/blog/:id :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// PATCH /api/admin/blog/:id/publish — publier un article (gate_status vérifié)
app.patch('/api/admin/blog/:id/publish', checkAdminAuth, async (req, res) => {
  try {
    const { force } = req.body || {};

    // Vérifier le gate_status avant publication
    const { rows: check } = await pool.query(
      'SELECT gate_status FROM blog_articles WHERE id = $1',
      [req.params.id]
    );
    if (check.length === 0) {
      return res.status(404).json({ ok: false, error: 'Article non trouvé' });
    }

    const gateStatus = check[0].gate_status;
    if (!force && gateStatus && gateStatus !== 'pass') {
      return res.status(403).json({
        ok: false,
        error: `Publication bloquée : gate_status = "${gateStatus}". Validez les gates ou utilisez force=true.`,
        gate_status: gateStatus,
      });
    }

    const result = await pool.query(
      "UPDATE blog_articles SET status = 'published', published_at = NOW() WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    return res.json({ ok: true, forced: !!force && gateStatus !== 'pass' });
  } catch (err) {
    console.error('[API] Erreur PATCH publish blog :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// PATCH /api/admin/blog/:id/archive — archiver un article
app.patch('/api/admin/blog/:id/archive', checkAdminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE blog_articles SET status = 'archived' WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Article non trouvé' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('[API] Erreur PATCH archive blog :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// DELETE /api/admin/blog/:id — supprimer un article
app.delete('/api/admin/blog/:id', checkAdminAuth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM blog_articles WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Article non trouvé' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('[API] Erreur DELETE blog :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/blog/:id/validate — lancer les gates de validation
// ---------------------------------------------------------------------------
app.post('/api/admin/blog/:id/validate', checkAdminAuth, async (req, res) => {
  try {
    const result = await runGates(req.params.id, pool);
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[API] Erreur POST validate blog :', err.message);
    if (err.message === 'Article non trouvé') {
      return res.status(404).json({ ok: false, error: err.message });
    }
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// GET /api/admin/blog/:id/gates — résultats des gates
app.get('/api/admin/blog/:id/gates', checkAdminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT gate_results, gate_status FROM blog_articles WHERE id = $1',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Article non trouvé' });
    }
    return res.json({
      ok: true,
      gate_status: rows[0].gate_status,
      gates: rows[0].gate_results || {},
    });
  } catch (err) {
    console.error('[API] Erreur GET gates blog :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// PATCH /api/admin/blog/:id/gates/:gateId — override humain d'une gate
app.patch('/api/admin/blog/:id/gates/:gateId', checkAdminAuth, async (req, res) => {
  try {
    const { id, gateId } = req.params;
    const { pass, detail } = req.body;

    if (typeof pass !== 'boolean') {
      return res.status(400).json({ ok: false, error: 'Le champ "pass" (boolean) est requis' });
    }

    const { rows } = await pool.query(
      'SELECT gate_results, gate_status FROM blog_articles WHERE id = $1',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Article non trouvé' });
    }

    const gates = rows[0].gate_results || {};
    if (!gates[gateId]) {
      return res.status(404).json({ ok: false, error: `Gate ${gateId} non trouvée` });
    }

    // Appliquer l'override
    gates[gateId].pass = pass;
    gates[gateId].detail = detail || `Override humain — ${pass ? 'validé' : 'rejeté'}`;
    gates[gateId].overridden_at = new Date().toISOString();

    // Recalculer le statut global
    const entries = Object.entries(gates);
    const blockingFails = entries.filter(([, g]) => g.classe === 'BLOQUANT' && g.pass === false);
    const pendingHuman = entries.filter(([, g]) => g.pass === null);
    const newStatus = blockingFails.length > 0
      ? 'fail'
      : pendingHuman.length > 0
        ? 'pending_human'
        : 'pass';

    await pool.query(
      'UPDATE blog_articles SET gate_results = $1, gate_status = $2 WHERE id = $3',
      [JSON.stringify(gates), newStatus, id]
    );

    return res.json({ ok: true, gate_status: newStatus, gate: gates[gateId] });
  } catch (err) {
    console.error('[API] Erreur PATCH gate override :', err.message);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/contact
// ---------------------------------------------------------------------------
app.post('/api/contact', async (req, res) => {
  if (req.body._honeypot) {
    return res.json({ ok: true });
  }

  // Détection du site source pour adapter la validation et l'email
  const fromVersiFr = isVersiFr(req);

  const { prenom, nom, email, telephone, objet, message } = req.body;
  const missing = [];

  if (fromVersiFr) {
    // versi.fr : champs = nom, email, telephone (opt), message
    if (!nom || !String(nom).trim()) missing.push('nom');
    if (!email || !String(email).trim()) missing.push('email');
    if (!message || !String(message).trim()) missing.push('message');
  } else {
    // versi-immobilier.fr : champs = prenom, nom, email, telephone, objet (opt), message
    if (!prenom || !String(prenom).trim()) missing.push('prenom');
    if (!nom || !String(nom).trim()) missing.push('nom');
    if (!email || !String(email).trim()) missing.push('email');
    if (!telephone || !String(telephone).trim()) missing.push('telephone');
    if (!message || !String(message).trim()) missing.push('message');
  }

  if (missing.length > 0) {
    return res.status(400).json({ ok: false, error: `Champs requis manquants : ${missing.join(', ')}` });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    return res.status(400).json({ ok: false, error: 'Format d\'email invalide.' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    res.set('Retry-After', '3600');
    return res.status(429).json({ ok: false, error: 'Trop de demandes. Réessayez dans 1 heure.' });
  }

  if (!resend) {
    return res.status(503).json({ ok: false, error: 'Service d\'envoi d\'email temporairement indisponible.' });
  }

  let htmlBody, subject, toEmail;

  if (fromVersiFr) {
    // Email pour versi.fr (holding)
    toEmail = process.env.CONTACT_EMAIL_VERSI || 'contact@versi.fr';
    htmlBody = buildHtmlTable([
      ['Nom', String(nom)],
      ['Email', String(email)],
      ['Téléphone', String(telephone || '')],
      ['Message', String(message)],
    ]);
    subject = `[Versi] Contact de ${escapeHtml(String(nom).trim())}`;
  } else {
    // Email pour versi-immobilier.fr
    toEmail = CONTACT_EMAIL;
    htmlBody = buildHtmlTable([
      ['Prénom', String(prenom)],
      ['Nom', String(nom)],
      ['Email', String(email)],
      ['Téléphone', String(telephone)],
      ['Objet', String(objet || '')],
      ['Message', String(message)],
    ]);
    subject = `[Versi Immobilier] Contact de ${escapeHtml(String(prenom).trim())} ${escapeHtml(String(nom).trim())}`;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      replyTo: String(email).trim(),
      subject,
      html: htmlBody,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('[ERROR] Envoi email contact :', err.message);
    return res.status(500).json({ ok: false, error: 'Échec de l\'envoi. Réessayez ou contactez-nous directement.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/sell
// ---------------------------------------------------------------------------
app.post('/api/sell', async (req, res) => {
  if (req.body._honeypot) {
    return res.json({ ok: true });
  }

  const { adresse, typeBien, surface, situationLocative, prenom, nom, email, telephone, message } = req.body;
  const missing = [];
  if (!adresse || !String(adresse).trim()) missing.push('adresse');
  if (!typeBien || !String(typeBien).trim()) missing.push('typeBien');
  if (!surface || !String(surface).trim()) missing.push('surface');
  if (!situationLocative || !String(situationLocative).trim()) missing.push('situationLocative');
  if (!prenom || !String(prenom).trim()) missing.push('prenom');
  if (!nom || !String(nom).trim()) missing.push('nom');
  if (!email || !String(email).trim()) missing.push('email');
  if (!telephone || !String(telephone).trim()) missing.push('telephone');

  if (missing.length > 0) {
    return res.status(400).json({ ok: false, error: `Champs requis manquants : ${missing.join(', ')}` });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    return res.status(400).json({ ok: false, error: 'Format d\'email invalide.' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    res.set('Retry-After', '3600');
    return res.status(429).json({ ok: false, error: 'Trop de demandes. Réessayez dans 1 heure.' });
  }

  if (!resend) {
    return res.status(503).json({ ok: false, error: 'Service d\'envoi d\'email temporairement indisponible.' });
  }

  const htmlBody = buildHtmlTable([
    ['Adresse du bien', String(adresse)],
    ['Type de bien', String(typeBien)],
    ['Surface (m²)', String(surface)],
    ['Situation locative', String(situationLocative)],
    ['Prénom', String(prenom)],
    ['Nom', String(nom)],
    ['Email', String(email)],
    ['Téléphone', String(telephone)],
    ['Informations complémentaires', String(message || '')],
  ]);

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: CONTACT_EMAIL,
      replyTo: String(email).trim(),
      subject: `[Versi Immobilier] Nouveau bien soumis — ${escapeHtml(String(adresse).trim())}`,
      html: htmlBody,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('[ERROR] Envoi email sell :', err.message);
    return res.status(500).json({ ok: false, error: 'Échec de l\'envoi. Réessayez ou contactez-nous directement.' });
  }
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/api/health', async (req, res) => {
  const health = { status: 'ok', timestamp: new Date().toISOString(), services: {} };

  // Vérifier la connexion DB
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    health.services.database = { status: 'ok', latency_ms: Date.now() - start };
  } catch (err) {
    health.status = 'degraded';
    health.services.database = { status: 'error', error: err.message };
  }

  // Vérifier que les dossiers dist existent
  health.services.versi_immobilier_dist = { status: fs.existsSync(VERSI_IMMO_DIST) ? 'ok' : 'missing' };
  health.services.versi_fr_dist = { status: fs.existsSync(VERSI_FR_DIST) ? 'ok' : 'missing' };

  // Vérifier Resend
  health.services.email = { status: resend ? 'configured' : 'not_configured' };

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
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
// SPA fallback (multi-site par hostname)
// ---------------------------------------------------------------------------
app.get('/{*splat}', (req, res) => {
  if (isVersiFr(req)) {
    const indexPath = join(VERSI_FR_DIST, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    return res.status(503).send('Site versi.fr en cours de déploiement.');
  }
  res.sendFile(join(VERSI_IMMO_DIST, 'index.html'));
});

// ---------------------------------------------------------------------------
// autoSeed() — seed et cleanup au démarrage du serveur
// ---------------------------------------------------------------------------
const MUGUETS_IDS = MUGUETS_PROPERTIES.map(p => p.id);

// Publie au boot les articles pré-rédigés déposés dans scripts/blog-queue/.
// Idempotent : ON CONFLICT (slug) DO NOTHING — ne touche pas aux articles existants.
// Non bloquant : toute erreur est loguée sans interrompre le boot.
async function seedBlogQueue(client) {
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
      const res = await client.query(
        `INSERT INTO blog_articles (id, title, slug, excerpt, content, author, tags, status, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'published', COALESCE($8::timestamptz, NOW()))
         ON CONFLICT (slug) DO UPDATE
           SET published_at = $8::timestamptz, updated_at = NOW()
         WHERE $8::timestamptz IS NOT NULL
           AND blog_articles.published_at IS DISTINCT FROM $8::timestamptz`,
        [crypto.randomUUID(), meta.title, meta.slug, meta.excerpt || '', m[2].trim(), meta.author || 'Équipe Versi — Maxime, Thomas & Carl', tags, meta.date || null],
      );
      if (res.rowCount > 0) count += 1;
    } catch (err) {
      console.error(`[SEED-QUEUE] Erreur sur ${file} : ${err.message}`);
    }
  }
  console.log(`[SEED-QUEUE] ${count} article(s) publié(s) depuis la file.`);
}

async function autoSeed() {
  const client = await pool.connect();
  try {
    // 0. Migration schéma photos : ajout colonne url, drop NOT NULL sur data.
    // Idempotent — safe à rejouer à chaque boot.
    await ensurePhotoSchema(client);

    // 1. Seed properties si la table est vide
    const { rows: propCount } = await client.query('SELECT COUNT(*) AS c FROM properties');
    if (parseInt(propCount[0].c, 10) === 0) {
      console.log('[autoSeed] Table properties vide — insertion des biens Muguets...');
      for (const prop of MUGUETS_PROPERTIES) {
        await upsertProperty(client, prop);
      }
    }

    // 2. Seed projects si la table est vide
    const { rows: projCount } = await client.query('SELECT COUNT(*) AS c FROM projects');
    if (parseInt(projCount[0].c, 10) === 0) {
      console.log('[autoSeed] Table projects vide — insertion de Nanterre Barbusse...');
      await upsertNanterreProject(client);
    }

    // 3. Seed blog_articles si la table est vide
    const { rows: blogCount } = await client.query('SELECT COUNT(*) AS c FROM blog_articles');
    if (parseInt(blogCount[0].c, 10) === 0) {
      console.log('[autoSeed] Table blog_articles vide — insertion des articles...');
      const allArticles = [...BLOG_ARTICLES_A1_A6, ...BLOG_ARTICLES_A2_A8];
      for (const article of allArticles) {
        await upsertBlogArticle(client, article);
      }
    }

    // 4. Correction auteurs blog : "Thomas Issa" → "Équipe Versi — Maxime, Thomas & Carl"
    const authorFix = await client.query(
      `UPDATE blog_articles SET author = 'Équipe Versi — Maxime, Thomas & Carl' WHERE author = 'Thomas Issa' RETURNING id`
    );
    if (authorFix.rowCount > 0) {
      console.log(`[autoSeed] ${authorFix.rowCount} article(s) : auteur corrigé → Équipe Versi`);
    }

    // 4bis. Publier les articles pré-rédigés déposés dans scripts/blog-queue/
    await seedBlogQueue(client);

    // 5. Upsert biens Muguets (même si table non vide — garantit données à jour)
    for (const prop of MUGUETS_PROPERTIES) {
      await upsertProperty(client, prop);
    }

    // 6. Supprimer les biens non-Muguets (cleanup)
    const deletedProps = await client.query(
      `DELETE FROM properties WHERE NOT (id = ANY($1)) RETURNING id`,
      [MUGUETS_IDS]
    );
    if (deletedProps.rowCount > 0) {
      console.log(`[autoSeed] ${deletedProps.rowCount} bien(s) non-Muguets supprimé(s)`);
    }

    // 7. Upsert projet Nanterre + photos
    await upsertNanterreProject(client);

    // 7bis. Upsert projets Lille (Friedland + Prieuré, 8 apparts)
    await upsertLilleProjects(client);

    // 8. Supprimer les projets non-autorisés (cleanup)
    const ALLOWED_PROJECT_IDS = [NANTERRE_PROJECT.id, ...LILLE_PROJECTS.map((p) => p.id)];
    const deletedProj = await client.query(
      `DELETE FROM projects WHERE NOT (id = ANY($1)) RETURNING id`,
      [ALLOWED_PROJECT_IDS]
    );
    if (deletedProj.rowCount > 0) {
      console.log(`[autoSeed] ${deletedProj.rowCount} projet(s) hors allowlist supprimé(s)`);
    }

    console.log('[autoSeed] Terminé.');
  } catch (err) {
    console.error('[autoSeed] Erreur :', err.message);
  } finally {
    client.release();
  }
}

async function upsertProperty(client, prop) {
  await client.query(
    `INSERT INTO properties (
      id, title, city, location, neighborhood, address,
      nearby_transport, nearby_amenities, type, surface, rooms,
      price, price_num, price_note, status, dpe, dpe_note,
      floor, tenancy, renovation_year, charges, description,
      works, features, dossier, sort_order
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title, city = EXCLUDED.city, location = EXCLUDED.location,
      neighborhood = EXCLUDED.neighborhood, address = EXCLUDED.address,
      nearby_transport = EXCLUDED.nearby_transport, nearby_amenities = EXCLUDED.nearby_amenities,
      type = EXCLUDED.type, surface = EXCLUDED.surface, rooms = EXCLUDED.rooms,
      price = EXCLUDED.price, price_num = EXCLUDED.price_num, price_note = EXCLUDED.price_note,
      status = EXCLUDED.status, dpe = EXCLUDED.dpe, dpe_note = EXCLUDED.dpe_note,
      floor = EXCLUDED.floor, tenancy = EXCLUDED.tenancy, renovation_year = EXCLUDED.renovation_year,
      charges = EXCLUDED.charges, description = EXCLUDED.description,
      works = EXCLUDED.works, features = EXCLUDED.features,
      dossier = EXCLUDED.dossier, sort_order = EXCLUDED.sort_order`,
    [
      prop.id, prop.title, prop.city, prop.location, prop.neighborhood, prop.address,
      prop.nearby_transport, prop.nearby_amenities, prop.type, prop.surface, prop.rooms,
      prop.price, prop.price_num, prop.price_note, prop.status, prop.dpe, prop.dpe_note,
      prop.floor, prop.tenancy, prop.renovation_year, prop.charges, prop.description,
      prop.works, prop.features, prop.dossier ?? null, prop.sort_order,
    ]
  );
}

async function upsertNanterreProject(client) {
  const p = NANTERRE_PROJECT;
  await client.query(
    `INSERT INTO projects (
      id, title, city, type, surface, units, status,
      buy_price, works_amount, sell_price, offer_delay, signature_delay,
      duration, description, featured, sort_order
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title, city = EXCLUDED.city, type = EXCLUDED.type,
      surface = EXCLUDED.surface, units = EXCLUDED.units, status = EXCLUDED.status,
      buy_price = EXCLUDED.buy_price, works_amount = EXCLUDED.works_amount,
      sell_price = EXCLUDED.sell_price, offer_delay = EXCLUDED.offer_delay,
      signature_delay = EXCLUDED.signature_delay, duration = EXCLUDED.duration,
      description = EXCLUDED.description, featured = EXCLUDED.featured,
      sort_order = EXCLUDED.sort_order, updated_at = NOW()`,
    [
      p.id, p.title, p.city, p.type, p.surface, p.units, p.status,
      p.buy_price, p.works_amount, p.sell_price, p.offer_delay, p.signature_delay,
      p.duration, p.description, p.featured, p.sort_order,
    ]
  );

  // Photos : lecture du manifest pré-compilé (généré en local par
  // scripts/generate-photos.js puis commité dans le repo).
  // En prod : zéro sharp, zéro resize. Just INSERT URLs.
  const photos = manifestPhotosFor(p.id);
  await upsertProjectPhotosDb(client, p.id, photos);
  console.log(`[autoSeed] Projet "${p.id}" : ${photos.length} photos URL-only (manifest).`);
}

// Upsert des 8 projets Lille (Friedland + Prieuré) + photos depuis le manifest.
// Même pattern que Nanterre, en boucle sur LILLE_PROJECTS.
async function upsertLilleProjects(client) {
  for (const p of LILLE_PROJECTS) {
    await client.query(
      `INSERT INTO projects (
        id, title, city, type, surface, units, status,
        buy_price, works_amount, sell_price, offer_delay, signature_delay,
        duration, description, featured, sort_order
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title, city = EXCLUDED.city, type = EXCLUDED.type,
        surface = EXCLUDED.surface, units = EXCLUDED.units, status = EXCLUDED.status,
        buy_price = EXCLUDED.buy_price, works_amount = EXCLUDED.works_amount,
        sell_price = EXCLUDED.sell_price, offer_delay = EXCLUDED.offer_delay,
        signature_delay = EXCLUDED.signature_delay, duration = EXCLUDED.duration,
        description = EXCLUDED.description, featured = EXCLUDED.featured,
        sort_order = EXCLUDED.sort_order, updated_at = NOW()`,
      [
        p.id, p.title, p.city, p.type, p.surface, p.units, p.status,
        p.buy_price, p.works_amount, p.sell_price, p.offer_delay, p.signature_delay,
        p.duration, p.description, p.featured, p.sort_order,
      ],
    );
    const photos = manifestPhotosFor(p.id);
    await upsertProjectPhotosDb(client, p.id, photos);
    console.log(`[lille-projects] "${p.id}" : ${photos.length} photos URL-only (manifest).`);
  }
  console.log(`[lille-projects] ${LILLE_PROJECTS.length} projets Lille upsertés (Friedland + Prieuré).`);
}

async function upsertBlogArticle(client, article) {
  await client.query(
    `INSERT INTO blog_articles (id, title, slug, excerpt, content, cover_image, author, tags, status, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     ON CONFLICT (slug) DO UPDATE SET
       title = EXCLUDED.title, excerpt = EXCLUDED.excerpt,
       content = EXCLUDED.content, cover_image = EXCLUDED.cover_image,
       author = EXCLUDED.author, tags = EXCLUDED.tags,
       status = EXCLUDED.status,
       published_at = COALESCE(blog_articles.published_at, NOW()),
       updated_at = NOW()`,
    [
      article.id, article.title, article.slug, article.excerpt,
      article.content, article.cover_image, article.author,
      article.tags, article.status,
    ]
  );
}

// ---------------------------------------------------------------------------
// Cron blog — génération automatique d'articles (jeudi 9h)
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

  // Jeudi 9h — Génération d'article (rythme adaptatif)
  cron.schedule('0 9 * * 4', async () => {
    console.log(`[CRON] ${new Date().toISOString()} — Vérification publication article VI...`);

    try {
      const countResult = await pool.query(`SELECT COUNT(*) FROM blog_articles WHERE status = 'published'`);
      const articleCount = parseInt(countResult.rows[0].count, 10);

      if (articleCount < 8) {
        const weekOfMonth = Math.ceil(new Date().getDate() / 7);
        if (weekOfMonth !== 1 && weekOfMonth !== 3) {
          console.log(`[CRON] Phase fondation (${articleCount} articles) — semaine skippée.`);
          return;
        }
        console.log(`[CRON] Phase fondation (${articleCount} articles) — bimensuel.`);
      } else {
        console.log(`[CRON] Phase accélération (${articleCount} articles) — hebdomadaire.`);
      }

      execSync('node scripts/generate-blog-article.js', {
        cwd: __dirname,
        env: process.env,
        stdio: 'inherit',
        timeout: 300000,
      });
      console.log('[CRON] Article VI généré et publié.');
    } catch (err) {
      console.error('[CRON] Erreur génération article VI :', err.message);
    }
  });

  // Dimanche 20h05 — Renouvellement calendrier éditorial
  cron.schedule('5 20 * * 0', () => {
    console.log(`[CRON] ${new Date().toISOString()} — Renouvellement calendrier éditorial VI...`);
    try {
      execSync('node scripts/blog-orchestrator.js --site immobilier --plan', {
        cwd: join(__dirname, '..'),
        env: process.env,
        stdio: 'inherit',
        timeout: 60000,
      });
      console.log('[CRON] Calendrier VI renouvelé.');
    } catch (err) {
      console.error('[CRON] Erreur renouvellement éditorial VI :', err.message);
    }
  });

  console.log('[CRON] Blog VI planifié : articles jeudi 9h, calendrier dimanche 20h05.');
}

// ---------------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------------
// Binding 0.0.0.0 explicite (requis Replit Autoscale — sans ça, le proxy
// ne peut pas atteindre le process et renvoie "DNS cache overflow").
// autoSeed() et scheduleBlogCron() s'exécutent en arrière-plan APRÈS que
// listen() ait accepté des connexions — le proxy Replit reçoit donc une
// réponse immédiate sur /api/live et /api/health dès le boot.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[versi] Serveur multi-site démarré sur le port ${PORT}`);
  console.log(`  - versi-immobilier : ${VERSI_IMMO_DIST}`);
  console.log(`  - versi.fr         : ${VERSI_FR_DIST}`);

  // Tâches asynchrones non-bloquantes (ne doivent PAS retarder la réponse
  // du proxy Replit aux healthchecks)
  autoSeed()
    .then(() => console.log('[BOOT] autoSeed OK'))
    .catch((err) => console.error('[BOOT] autoSeed ERROR :', err.message));

  try {
    scheduleBlogCron();
  } catch (err) {
    console.error('[BOOT] scheduleBlogCron ERROR :', err.message);
  }
});
