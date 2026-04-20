/**
 * Migration one-shot des données statiques properties.js et projects.js vers PostgreSQL.
 * Usage : node scripts/migrate-seed.js
 * Prérequis : node scripts/init-db.js doit avoir été exécuté avant.
 */
import pg from 'pg';
import { PROPERTIES } from '../src/config/properties.js';
import { PROJECTS } from '../src/config/projects.js';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Migration des biens
    for (let i = 0; i < PROPERTIES.length; i++) {
      const p = PROPERTIES[i];
      await client.query(`
        INSERT INTO properties (
          id, title, city, location, neighborhood, address,
          nearby_transport, nearby_amenities, type, surface, rooms,
          price, price_num, price_note, status, dpe, dpe_note,
          floor, tenancy, renovation_year, charges, description,
          works, features, sort_order
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
                  $15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
        ON CONFLICT (id) DO NOTHING
      `, [
        p.id, p.title, p.city, p.location, p.neighborhood, p.address,
        p.nearbyTransport, p.nearbyAmenities, p.type, p.surface, p.rooms,
        p.price, p.priceNum, p.priceNote, p.status || 'disponible', p.dpe, p.dpeNote,
        p.floor, p.tenancy, p.renovationYear, p.charges, p.description,
        JSON.stringify(p.works || []), JSON.stringify(p.features || []),
        i
      ]);
    }

    console.log(`[migrate] ${PROPERTIES.length} biens insérés.`);

    // Migration des réalisations
    for (let i = 0; i < PROJECTS.length; i++) {
      const proj = PROJECTS[i];
      await client.query(`
        INSERT INTO projects (
          id, title, city, type, surface, units, status,
          buy_price, works_amount, sell_price, offer_delay,
          signature_delay, duration, description, featured, sort_order
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT (id) DO NOTHING
      `, [
        proj.id, proj.title, proj.city, proj.type, proj.surface, proj.units,
        proj.status || 'completed', proj.buyPrice, proj.worksAmount, proj.sellPrice,
        proj.offerDelay, proj.signatureDelay, proj.duration, proj.description,
        proj.featured || false, i
      ]);
    }

    console.log(`[migrate] ${PROJECTS.length} réalisations insérées.`);

    await client.query('COMMIT');
    console.log('[migrate] Migration terminée avec succès.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[migrate] Erreur :', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
