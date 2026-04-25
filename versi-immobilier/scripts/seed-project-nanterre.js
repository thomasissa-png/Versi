// Seed script — Nanterre Barbusse reference project
// Idempotent: uses ON CONFLICT DO UPDATE
//
// Photos : déléguées à scripts/photo-sync.js qui copie + resize chaque
// fichier source de Photos/references/nanterre-barbusse/ vers
// versi-immobilier/public/projects/nanterre-barbusse/ puis stocke
// uniquement l'URL relative en DB (pattern versi-invest).
// → Plus aucun base64 stocké dans le code ni dans la DB.

import pg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';
import { syncProjectPhotos, upsertProjectPhotosDb, ensurePhotoSchema } from './photo-sync.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Sélection figée des "après" Nanterre (hand-picked par le fondateur).
// Le dossier source contient ~26 fichiers WhatsApp, on garde uniquement
// ceux-ci dans cet ordre précis (sort = position dans la galerie publique).
// Le premier (sort: 0) sert de hero / cover_url pour la liste des projets.
const NANTERRE_APRES_FILES = [
  { file: 'WhatsApp Image 2026-04-13 at 09.42.54917.jpeg', sort: 0 },
  { file: 'WhatsApp Image 2026-04-13 at 09.42.54918.jpeg', sort: 1 },
  { file: 'WhatsApp Image 2026-04-13 at 09.42.54915.jpeg', sort: 2 },
  { file: 'WhatsApp Image 2026-04-13 at 09.42.5495.jpeg',  sort: 3 },
  { file: 'WhatsApp Image 2026-04-13 at 09.42.591.jpeg',   sort: 4 },
  { file: 'WhatsApp Image 2026-04-13 at 09.42.54916.jpeg', sort: 5 },
];

const PROJECT = {
  id: 'nanterre-barbusse',
  title: 'Nanterre Barbusse — Loft 7 pièces, 136 m²',
  city: 'Nanterre',
  type: 'Réhabilitation complète en loft 7 pièces avec patio privatif',
  surface: '136 m²',
  units: 1,
  status: 'completed',
  buy_price: null,
  works_amount: null,
  sell_price: '750 000 €',
  offer_delay: null,
  signature_delay: null,
  duration: '6 mois',
  description: `136 m² de bureaux désaffectés, un seul volume sans cloison. Le choix : ne pas subdiviser, transformer le plateau brut en un loft de 7 pièces avec patio intérieur privatif.

Le projet est structuré autour de la lumière naturelle traversante. Double hauteur sous mezzanine, verrière d'atelier, baies vitrées toute hauteur côté patio. On passe du séjour au patio sans transition, dedans et dehors communiquent. Escalier sur mesure en chêne massif, garde-corps verre trempé, parquet contrecollé chêne. Cuisine intégrée sous escalier, rangements muraux bois et laqué blanc.

Opération bouclée en 6 mois. Cession à 750 000 €.`,
  featured: true,
  sort_order: 99,
  photos: {
    scanDir: 'nanterre-barbusse',
    apresFiles: NANTERRE_APRES_FILES,
  },
};

// Export public utilisé par seed-data.js → server.js (autoSeed).
// NANTERRE_PHOTOS supprimé : photo-sync gère la persistance désormais.
export { PROJECT as NANTERRE_PROJECT };

// CLI standalone : `node scripts/seed-project-nanterre.js` (rare, debug only).
// Le pipeline normal passe par autoSeed() dans server.js.
async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error('[seed-nanterre] DATABASE_URL manquant.');
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await ensurePhotoSchema(client);
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
        PROJECT.id, PROJECT.title, PROJECT.city, PROJECT.type, PROJECT.surface,
        PROJECT.units, PROJECT.status, PROJECT.buy_price, PROJECT.works_amount,
        PROJECT.sell_price, PROJECT.offer_delay, PROJECT.signature_delay,
        PROJECT.duration, PROJECT.description, PROJECT.featured, PROJECT.sort_order,
      ]
    );
    const manifest = await syncProjectPhotos(PROJECT);
    await upsertProjectPhotosDb(client, PROJECT.id, manifest);
    console.log(`[seed-nanterre] OK — ${manifest.length} photos URL-only.`);
  } finally {
    client.release();
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed().catch((err) => {
    console.error('[seed-nanterre] Erreur :', err);
    process.exit(1);
  });
}
