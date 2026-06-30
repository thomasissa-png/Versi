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

// ────────────────────────────────────────────────────────────────────────────
// upsertPropertyPhotosDb(client, propertyId, photos)
// → DELETE + INSERT dans property_photos avec colonne url (pas de base64)
// photos = [{ url, alt, filename, mime_type, size_bytes, category, sort_order }, ...]
// Idempotent — DELETE + INSERT à chaque boot. Le champ `data` reste NULL
// (sert encore aux uploads admin base64 historiques).
// ────────────────────────────────────────────────────────────────────────────

export async function upsertPropertyPhotosDb(client, propertyId, photos) {
  const safeId = sanitizeProjectId(propertyId); // même règle [a-z0-9-]+
  await client.query('DELETE FROM property_photos WHERE property_id = $1', [safeId]);
  if (!Array.isArray(photos) || photos.length === 0) return;
  for (const photo of photos) {
    await client.query(
      `INSERT INTO property_photos
         (property_id, url, alt, filename, mime_type, size_bytes, sort_order, render)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        safeId,
        photo.url,
        photo.alt ?? null,
        photo.filename,
        photo.mime_type,
        photo.size_bytes,
        photo.sort_order,
        photo.render !== false,
      ],
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Migration DB property_photos : ajout colonnes url + alt, drop NOT NULL sur data.
// Idempotent — appelée au boot (autoSeed).
// ────────────────────────────────────────────────────────────────────────────

export async function ensurePropertyPhotoSchema(client) {
  await client.query(`ALTER TABLE property_photos ADD COLUMN IF NOT EXISTS url TEXT`);
  await client.query(`ALTER TABLE property_photos ADD COLUMN IF NOT EXISTS alt TEXT`);
  // render = true → vue d'architecte (rendu 3D, badge) ; false → photo réelle.
  await client.query(`ALTER TABLE property_photos ADD COLUMN IF NOT EXISTS render BOOLEAN DEFAULT true`);
  await client.query(`
    DO $$ BEGIN
      ALTER TABLE property_photos ALTER COLUMN data DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN NULL;
    WHEN others THEN NULL;
    END $$;
  `);
  await client.query(
    `CREATE INDEX IF NOT EXISTS idx_property_photos_property_sort ON property_photos(property_id, sort_order)`,
  );
}
