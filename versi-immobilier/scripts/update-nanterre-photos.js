// Script — Replace Nanterre "après" photos with 6 selected images
// Run on Replit: node scripts/update-nanterre-photos.js
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const PROJECT_ID = 'nanterre-barbusse';

// 6 photos "après" sélectionnées par le fondateur (ordre = sort_order)
const APRES_PHOTOS = [
  { file: 'WhatsApp Image 2026-04-13 at 09.42.54917.jpeg', sort: 0 }, // Hero / cover
  { file: 'WhatsApp Image 2026-04-13 at 09.42.54918.jpeg', sort: 1 },
  { file: 'WhatsApp Image 2026-04-13 at 09.42.54915.jpeg', sort: 2 },
  { file: 'WhatsApp Image 2026-04-13 at 09.42.5495.jpeg',  sort: 3 },
  { file: 'WhatsApp Image 2026-04-13 at 09.42.591.jpeg',   sort: 4 },
  { file: 'WhatsApp Image 2026-04-13 at 09.42.54916.jpeg', sort: 5 },
];

const PHOTOS_DIR = path.resolve(__dirname, '../../Photos/references/nanterre-barbusse');

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Delete existing "apres" photos
    const deleted = await client.query(
      'DELETE FROM project_photos WHERE project_id = $1 AND category = $2',
      [PROJECT_ID, 'apres']
    );
    console.log(`[OK] Supprimé ${deleted.rowCount} photos "après" existantes`);

    // 2. Insert new photos
    for (const photo of APRES_PHOTOS) {
      const filePath = path.join(PHOTOS_DIR, photo.file);
      if (!fs.existsSync(filePath)) {
        console.error(`[ERREUR] Fichier introuvable : ${filePath}`);
        await client.query('ROLLBACK');
        process.exit(1);
      }

      const buffer = fs.readFileSync(filePath);
      const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
      const sizeBytes = buffer.length;

      await client.query(
        `INSERT INTO project_photos (project_id, data, filename, mime_type, size_bytes, category, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [PROJECT_ID, base64, photo.file, 'image/jpeg', sizeBytes, 'apres', photo.sort]
      );
      console.log(`[OK] Photo ${photo.sort + 1}/6 insérée : ${photo.file} (${(sizeBytes / 1024).toFixed(0)} Ko)`);
    }

    await client.query('COMMIT');
    console.log('\n[TERMINÉ] 6 photos "après" Nanterre remplacées avec succès.');
    console.log('La photo hero (sort_order 0) sera utilisée comme cover sur la page réalisations.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ERREUR]', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

run();
