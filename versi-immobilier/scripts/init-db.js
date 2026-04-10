/**
 * Script idempotent de création des tables PostgreSQL pour versi-immobilier.
 * Usage : node scripts/init-db.js
 */
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SQL = `
-- Table des biens en vente
CREATE TABLE IF NOT EXISTS properties (
  id               TEXT PRIMARY KEY,
  title            TEXT NOT NULL,
  city             TEXT NOT NULL,
  location         TEXT NOT NULL,
  neighborhood     TEXT,
  address          TEXT,
  nearby_transport TEXT,
  nearby_amenities TEXT,
  type             TEXT NOT NULL,
  surface          TEXT NOT NULL,
  rooms            INTEGER,
  price            TEXT NOT NULL,
  price_num        INTEGER,
  price_note       TEXT,
  status           TEXT NOT NULL DEFAULT 'disponible',
  dpe              TEXT,
  dpe_note         TEXT,
  floor            TEXT,
  tenancy          TEXT,
  renovation_year  TEXT,
  charges          TEXT,
  description      TEXT NOT NULL,
  works            JSONB DEFAULT '[]',
  features         JSONB DEFAULT '[]',
  sort_order       INTEGER DEFAULT 0,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Photos des biens
CREATE TABLE IF NOT EXISTS property_photos (
  id           SERIAL PRIMARY KEY,
  property_id  TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  data         TEXT NOT NULL,
  filename     TEXT NOT NULL,
  mime_type    TEXT NOT NULL,
  size_bytes   INTEGER,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_photos_property_id ON property_photos(property_id);

-- Table des réalisations (projets)
CREATE TABLE IF NOT EXISTS projects (
  id               TEXT PRIMARY KEY,
  title            TEXT NOT NULL,
  city             TEXT NOT NULL,
  type             TEXT NOT NULL,
  surface          TEXT NOT NULL,
  units            INTEGER,
  status           TEXT NOT NULL DEFAULT 'completed',
  buy_price        TEXT,
  works_amount     TEXT,
  sell_price       TEXT,
  offer_delay      INTEGER,
  signature_delay  INTEGER,
  duration         TEXT,
  description      TEXT NOT NULL,
  featured         BOOLEAN DEFAULT false,
  sort_order       INTEGER DEFAULT 0,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Photos des réalisations
CREATE TABLE IF NOT EXISTS project_photos (
  id          SERIAL PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  data        TEXT NOT NULL,
  filename    TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  size_bytes  INTEGER,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_photos_project_id ON project_photos(project_id);

-- Table des inscrits aux notifications
CREATE TABLE IF NOT EXISTS subscribers (
  id          SERIAL PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active      BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);

-- Sessions admin
CREATE TABLE IF NOT EXISTS admin_sessions (
  id          TEXT PRIMARY KEY,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
  ip          TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

-- Trigger pour updated_at automatique
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_properties_updated_at') THEN
    CREATE TRIGGER trg_properties_updated_at
      BEFORE UPDATE ON properties
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_projects_updated_at') THEN
    CREATE TRIGGER trg_projects_updated_at
      BEFORE UPDATE ON projects
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END;
$$;
`;

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(SQL);
    console.log('[init-db] Tables, index et triggers créés avec succès.');
  } catch (err) {
    console.error('[init-db] Erreur :', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initDB();
