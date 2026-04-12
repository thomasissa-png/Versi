import express from 'express';
import { Resend } from 'resend';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

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
    'Les endpoints /api/contact et /api/sell retourneront 503.'
  );
}

const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'contact@versi-immobilier.fr';
const FROM_EMAIL = process.env.FROM_EMAIL || 'formulaire@versi-immobilier.fr';

// ---------------------------------------------------------------------------
// Anthropic (génération d'annonces IA)
// ---------------------------------------------------------------------------
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

if (!anthropic) {
  console.warn(
    '[WARN] ANTHROPIC_API_KEY non configurée. ' +
    "L'endpoint /api/admin/generate-listing retournera 503."
  );
}

// ---------------------------------------------------------------------------
// Auth admin (cookie httpOnly — mot de passe en variable d'environnement)
// ---------------------------------------------------------------------------
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || null;
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const ADMIN_COOKIE_NAME = 'versi_admin_session';
const ADMIN_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// Sessions admin en mémoire (suffisant pour un admin solo)
const adminSessions = new Map();

function createAdminSession() {
  const token = crypto.randomBytes(32).toString('hex');
  adminSessions.set(token, { createdAt: Date.now() });
  return token;
}

function isValidAdminSession(token) {
  if (!token) return false;
  const session = adminSessions.get(token);
  if (!session) return false;
  if (Date.now() - session.createdAt > ADMIN_SESSION_TTL_MS) {
    adminSessions.delete(token);
    return false;
  }
  return true;
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach((pair) => {
    const [name, ...rest] = pair.trim().split('=');
    if (name) cookies[name.trim()] = rest.join('=').trim();
  });
  return cookies;
}

function requireAdmin(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[ADMIN_COOKIE_NAME];
  if (!isValidAdminSession(token)) {
    return res.status(401).json({ ok: false, error: 'Non authentifié. Connectez-vous à /admin.' });
  }
  next();
}

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
// POST /api/admin/login
// ---------------------------------------------------------------------------
app.post('/api/admin/login', (req, res) => {
  if (!ADMIN_PASSWORD) {
    return res.status(503).json({ ok: false, error: 'Authentification admin non configurée.' });
  }

  const { password } = req.body;
  if (!password || String(password) !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: 'Mot de passe incorrect.' });
  }

  const token = createAdminSession();
  res.setHeader('Set-Cookie', `${ADMIN_COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(ADMIN_SESSION_TTL_MS / 1000)}`);
  return res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// GET /api/admin/check — vérifie si la session admin est active
// ---------------------------------------------------------------------------
app.get('/api/admin/check', (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[ADMIN_COOKIE_NAME];
  if (isValidAdminSession(token)) {
    return res.json({ ok: true, authenticated: true });
  }
  return res.json({ ok: true, authenticated: false });
});

// ---------------------------------------------------------------------------
// POST /api/admin/generate-listing — Génération d'annonce IA
// ---------------------------------------------------------------------------
app.post('/api/admin/generate-listing', requireAdmin, async (req, res) => {
  if (!anthropic) {
    return res.status(503).json({
      ok: false,
      error: 'Service de génération IA indisponible. Vérifiez la configuration ANTHROPIC_API_KEY.',
    });
  }

  const { adresse, surface, nbPieces, type, prix, etage, dpe, etat } = req.body;

  if (!adresse || !String(adresse).trim()) {
    return res.status(400).json({ ok: false, error: 'L\'adresse est obligatoire pour générer une annonce.' });
  }

  // -------------------------------------------------------------------------
  // 1. Géocodage via API Adresse gouv.fr — normaliser adresse, extraire ville/CP
  // -------------------------------------------------------------------------
  let city = '';
  let postcode = '';
  let normalizedAddress = String(adresse).trim();

  try {
    const geoUrl = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(normalizedAddress)}&limit=1`;
    const geoController = new AbortController();
    const geoTimeout = setTimeout(() => geoController.abort(), 5000);

    const geoRes = await fetch(geoUrl, { signal: geoController.signal });
    clearTimeout(geoTimeout);

    if (geoRes.ok) {
      const geoData = await geoRes.json();
      if (geoData.features && geoData.features.length > 0) {
        const props = geoData.features[0].properties;
        city = props.city || '';
        postcode = props.postcode || '';
        if (props.label) {
          normalizedAddress = props.label;
        }
      }
    }
  } catch (geoErr) {
    // Le géocodage est best-effort — on continue sans
    console.warn('[WARN] Géocodage échoué :', geoErr.message);
  }

  // -------------------------------------------------------------------------
  // 2. Construire le prompt et appeler Claude
  // -------------------------------------------------------------------------
  const systemPrompt = `Tu es un rédacteur d'annonces immobilières expert du marché français. Tu rédiges des descriptions commerciales pour Versi Immobilier, marchand de biens basé à Lille et Hauts-de-France. Ton : professionnel, factuel, sobre — pas d'exagération. Prix toujours net vendeur.

Ton style : précis, factuel, sobre. Aucun superlatif sans preuve. Chaque affirmation est vérifiable.

Structure de sortie (respecter cet ordre) :
1. ACCROCHE (2-3 phrases) : projeter le lecteur dans la vie possible, ancrage local concret, ambiance du quartier
2. DESCRIPTION DU BIEN (3-4 phrases) : surface, distribution des pièces, état général, orientation, étage, luminosité
3. LE QUARTIER (3-4 phrases) : transports à proximité avec lignes et temps à pied, commerces nommés, écoles si pertinent. Déduis ces informations à partir de l'adresse — tu connais les quartiers français.
4. POINTS FORTS (2-3 phrases) : résumé des atouts principaux, potentiel d'aménagement si applicable
5. POTENTIEL (optionnel, 2-3 phrases) : si le bien est brut, à rénover ou a une configuration optimisable, décrire le potentiel factuel.

Mise en forme OBLIGATOIRE :
- Sépare chaque section par UNE ligne vide (double retour à la ligne).
- NE PAS écrire les numéros de section ni les titres — enchaîner directement les paragraphes.
- Le texte final doit contenir exactement 3 à 5 paragraphes séparés par des lignes vides.

Règles :
- NE JAMAIS écrire "bel appartement", "charmant", "magnifique", "spacieux" sans donnée factuelle
- NE JAMAIS écrire "proche de toutes commodités" — citer les transports et commerces spécifiques
- Si une donnée n'est pas fournie, la déduire intelligemment de l'adresse ou l'omettre — ne PAS écrire "[DONNÉE MANQUANTE]"
- Si le DPE n'est pas fourni, conclure par : "Le diagnostic de performance énergétique (DPE) sera communiqué sur demande."

Longueur cible : 200-350 mots. Réponds uniquement avec la description, sans guillemets ni préfixe ni numérotation.`;

  const bienDetails = [];
  bienDetails.push(`Adresse : ${normalizedAddress}`);
  if (surface) bienDetails.push(`Surface : ${surface} m²`);
  if (nbPieces) bienDetails.push(`Nombre de pièces : ${nbPieces}`);
  if (type) bienDetails.push(`Type de bien : ${type}`);
  if (prix) bienDetails.push(`Prix : ${prix} € net vendeur`);
  if (etage) bienDetails.push(`Étage : ${etage}`);
  if (dpe) bienDetails.push(`DPE : ${dpe}`);
  if (etat) bienDetails.push(`État : ${etat}`);

  const userPrompt = `Génère l'annonce immobilière pour ce bien :\n\n${bienDetails.join('\n')}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    clearTimeout(timeout);

    const description = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    // Générer le titre : "Type — Surface m² — Ville"
    const typeLabel = type || 'Bien';
    const surfaceLabel = surface ? `${surface} m²` : '';
    const locationLabel = city || normalizedAddress.split(',').pop()?.trim() || '';
    const titleParts = [typeLabel, surfaceLabel, locationLabel].filter(Boolean);
    const title = titleParts.join(' — ');

    // Normaliser le type de bien
    const typeNormalized = normalizePropertyType(type);

    return res.json({
      ok: true,
      title,
      description,
      city,
      postcode,
      type_normalized: typeNormalized,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[ERROR] Génération annonce — timeout 30s dépassé');
      return res.status(504).json({
        ok: false,
        error: 'La génération a pris trop de temps. Réessayez dans quelques instants.',
      });
    }
    console.error('[ERROR] Génération annonce :', err.message);
    return res.status(500).json({
      ok: false,
      error: 'Erreur lors de la génération de l\'annonce. Réessayez.',
    });
  }
});

/**
 * Normalise le type de bien vers une catégorie standard.
 */
function normalizePropertyType(raw) {
  if (!raw) return '';
  const lower = String(raw).toLowerCase().trim();
  const mapping = {
    appartement: 'Appartement',
    appart: 'Appartement',
    t1: 'Appartement',
    t2: 'Appartement',
    t3: 'Appartement',
    t4: 'Appartement',
    t5: 'Appartement',
    studio: 'Appartement',
    maison: 'Maison',
    pavillon: 'Maison',
    villa: 'Maison',
    local: 'Local professionnel',
    'local commercial': 'Local professionnel',
    'local professionnel': 'Local professionnel',
    commerce: 'Local professionnel',
    bureau: 'Local professionnel',
    immeuble: 'Immeuble',
    'immeuble de rapport': 'Immeuble',
    terrain: 'Terrain',
    parking: 'Parking',
    garage: 'Parking',
  };
  return mapping[lower] || String(raw).trim();
}

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
