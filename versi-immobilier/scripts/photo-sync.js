// photo-sync.js — Persistance DB des photos projets (URL-only)
//
// Pattern reproduit depuis versi-invest (public/references/<slug>/photo-NN.jpeg).
// Source : scripts/generate-photos.js (local, lit Photos/references/, resize sharp,
// écrit public/projects/<id>/*.jpeg + manifest.json — commité dans le repo).
// Cible runtime : INSERT URLs dans project_photos depuis le manifest.
//
// Avantages :
// - Cache HTTP (express.static envoie ETag + Cache-Control)
// - Payload API léger (URLs courtes au lieu de ~2 Mo de base64 par photo)
// - DB allégée (~262 Mo → < 5 Mo)
// - Boot prod ~1s : zéro sharp, zéro resize, zéro I/O lourd au boot
//   (fix Neon timeout 57P01 — la connexion DB ne reste plus idle > 60s)
//
// Naming standard (généré en local par generate-photos.js) :
// - photo-01.jpeg = hero (première "après")
// - photo-02..NN.jpeg = autres "après"
// - avant-01..MM.jpeg = photos "avant"
//
// Idempotent : DELETE + INSERT à chaque boot.

// Sanitize project_id pour éviter path traversal (alphanum + tirets uniquement)
function sanitizeProjectId(id) {
  if (typeof id !== 'string' || !/^[a-z0-9-]+$/i.test(id)) {
    throw new Error(`[photo-sync] project_id invalide (caractères interdits) : ${id}`);
  }
  return id;
}

// ────────────────────────────────────────────────────────────────────────────
// upsertProjectPhotosDb(client, projectId, photos)
// → DELETE + INSERT dans project_photos avec colonne url (pas de base64)
// photos = [{ url, filename, mime_type, size_bytes, category, sort_order }, ...]
// ────────────────────────────────────────────────────────────────────────────

export async function upsertProjectPhotosDb(client, projectId, photos) {
  const safeId = sanitizeProjectId(projectId);
  await client.query('DELETE FROM project_photos WHERE project_id = $1', [safeId]);
  if (!Array.isArray(photos) || photos.length === 0) return;
  for (const photo of photos) {
    await client.query(
      `INSERT INTO project_photos (project_id, url, filename, mime_type, size_bytes, category, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [safeId, photo.url, photo.filename, photo.mime_type, photo.size_bytes, photo.category, photo.sort_order]
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Migration DB : ajout colonne url + relâchement contrainte data NOT NULL
// Idempotent — appelée au boot.
// ────────────────────────────────────────────────────────────────────────────

export async function ensurePhotoSchema(client) {
  await client.query(`ALTER TABLE project_photos ADD COLUMN IF NOT EXISTS url TEXT`);
  // Si data était NOT NULL, le relâcher (ancien schéma)
  await client.query(`
    DO $$ BEGIN
      ALTER TABLE project_photos ALTER COLUMN data DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN NULL;
    WHEN others THEN NULL;
    END $$;
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_project_photos_project_url ON project_photos(project_id, sort_order)`);
}
