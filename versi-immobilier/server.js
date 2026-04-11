import express from 'express';
import { Resend } from 'resend';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.warn('[WARN] ADMIN_PASSWORD non configurée. Le login admin sera impossible.');
}

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
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none';");
  next();
});

app.use(express.static(join(__dirname, 'dist')));

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

const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'contact@versi-immobilier.fr';
const FROM_EMAIL = process.env.FROM_EMAIL || 'formulaire@versi-immobilier.fr';

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
    res.setHeader('Set-Cookie',
      `vi_admin_token=${sessionId}; HttpOnly; SameSite=Strict; Max-Age=${8 * 60 * 60}; Path=/api/admin`
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
    res.setHeader('Set-Cookie',
      'vi_admin_token=; HttpOnly; SameSite=Strict; Max-Age=0; Path=/api/admin'
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
        'SELECT id, title, city, location, neighborhood, address, nearby_transport, nearby_amenities, type, surface, rooms, price, price_num, price_note, status, dpe, dpe_note, floor, tenancy, renovation_year, charges, description, works, features, sort_order, created_at, updated_at FROM properties ORDER BY sort_order ASC, created_at DESC'
      );
    } else {
      result = await pool.query(
        'SELECT id, title, city, location, neighborhood, address, nearby_transport, nearby_amenities, type, surface, rooms, price, price_num, price_note, status, dpe, dpe_note, floor, tenancy, renovation_year, charges, description, works, features, sort_order, created_at, updated_at FROM properties WHERE status = $1 ORDER BY sort_order ASC, created_at DESC',
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
    let result;
    if (status === 'all') {
      result = await pool.query(
        'SELECT id, title, city, type, surface, units, status, buy_price, works_amount, sell_price, offer_delay, signature_delay, duration, description, featured, sort_order, created_at, updated_at FROM projects ORDER BY sort_order ASC, created_at DESC'
      );
    } else {
      result = await pool.query(
        'SELECT id, title, city, type, surface, units, status, buy_price, works_amount, sell_price, offer_delay, signature_delay, duration, description, featured, sort_order, created_at, updated_at FROM projects WHERE status = $1 ORDER BY sort_order ASC, created_at DESC',
        [status]
      );
    }
    return res.json({ projects: result.rows });
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
    const photosResult = await pool.query(
      'SELECT id, data, filename, mime_type, size_bytes, sort_order, created_at FROM project_photos WHERE project_id = $1 ORDER BY sort_order ASC',
      [req.params.id]
    );
    return res.json({ project: projResult.rows[0], photos: photosResult.rows });
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
// POST /api/contact
// ---------------------------------------------------------------------------
app.post('/api/contact', async (req, res) => {
  if (req.body._honeypot) {
    return res.json({ ok: true });
  }

  const { prenom, nom, email, telephone, objet, message } = req.body;
  const missing = [];
  if (!prenom || !String(prenom).trim()) missing.push('prenom');
  if (!nom || !String(nom).trim()) missing.push('nom');
  if (!email || !String(email).trim()) missing.push('email');
  if (!telephone || !String(telephone).trim()) missing.push('telephone');
  if (!message || !String(message).trim()) missing.push('message');

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
    ['Prénom', String(prenom)],
    ['Nom', String(nom)],
    ['Email', String(email)],
    ['Téléphone', String(telephone)],
    ['Objet', String(objet || '')],
    ['Message', String(message)],
  ]);

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: CONTACT_EMAIL,
      replyTo: String(email).trim(),
      subject: `[Versi Immobilier] Contact de ${escapeHtml(String(prenom).trim())} ${escapeHtml(String(nom).trim())}`,
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
// SPA fallback
// ---------------------------------------------------------------------------
app.get('/{*splat}', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// ---------------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`[versi-immobilier] Serveur démarré sur le port ${PORT}`);
});
