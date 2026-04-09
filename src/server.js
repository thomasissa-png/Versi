import express from 'express';
import { Resend } from 'resend';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '100kb' }));
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
    'L\'endpoint /api/contact retournera 503.'
  );
}

const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'contact@versi.fr';
const FROM_EMAIL = process.env.FROM_EMAIL || 'formulaire@versi.fr';

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
// POST /api/contact
// ---------------------------------------------------------------------------
app.post('/api/contact', async (req, res) => {
  if (req.body._honeypot) {
    return res.json({ ok: true });
  }

  const { nom, email, telephone, message } = req.body;
  const missing = [];
  if (!nom || !String(nom).trim()) missing.push('nom');
  if (!email || !String(email).trim()) missing.push('email');
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
    ['Nom', String(nom)],
    ['Email', String(email)],
    ['Téléphone', String(telephone || '')],
    ['Message', String(message)],
  ]);

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: CONTACT_EMAIL,
      replyTo: String(email).trim(),
      subject: `[Versi] Contact de ${escapeHtml(String(nom).trim())}`,
      html: htmlBody,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('[ERROR] Envoi email contact :', err.message);
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
  console.log(`[versi] Serveur démarré sur le port ${PORT}`);
});
