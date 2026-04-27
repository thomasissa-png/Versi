/**
 * Versi Studio — Module de connexion PostgreSQL
 *
 * Pool singleton avec retry pour les cold starts Replit.
 * ensureVsTables() crée les 6 tables vs_* si elles n'existent pas.
 *
 * Rendu : SSR — lecture de DATABASE_URL au runtime (pas de cache au boot).
 */

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

// ─── Erreurs typées (P1-5 : résilience DB) ────────────────────────

export class DbUnavailableError extends Error {
  code = "DB_UNAVAILABLE" as const;
  cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "DbUnavailableError";
    this.cause = cause;
  }
}

/**
 * Détecte si une erreur provient d'un problème de connexion DB
 * (cold start Replit, pool épuisé, timeout, DATABASE_URL manquante).
 */
export function isDbUnavailable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; name?: string; message?: string };
  if (e.code === "DB_UNAVAILABLE") return true;
  if (e.code === "ECONNREFUSED" || e.code === "ENOTFOUND" || e.code === "ETIMEDOUT") return true;
  if (e.message && /DATABASE_URL manquante|Connection terminated|timeout/i.test(e.message)) return true;
  return false;
}

// ─── Singleton Pool ────────────────────────────────────────────────

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL manquante. Configurez-la dans les Replit Secrets."
      );
    }
    pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

    pool.on("error", (err) => {
      console.error("[vs/db] Erreur inattendue du pool PostgreSQL :", err);
      pool = null;
    });
  }
  return pool;
}

// ─── Query helper avec retry ───────────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1_000;

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await getPool().query<T>(text, params);
    } catch (err) {
      lastError = err as Error;
      console.error(
        `[vs/db] Query attempt ${attempt}/${MAX_RETRIES} échouée :`,
        (err as Error).message
      );

      if (attempt < MAX_RETRIES) {
        // Reset pool en cas d'erreur de connexion
        pool = null;
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY_MS * attempt)
        );
      }
    }
  }

  throw lastError;
}

// ─── Transaction helper ────────────────────────────────────────────

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ─── Health check ──────────────────────────────────────────────────

export async function healthCheck(): Promise<{
  status: "healthy" | "degraded";
  latencyMs: number;
}> {
  const start = Date.now();
  try {
    await getPool().query("SELECT 1");
    return { status: "healthy", latencyMs: Date.now() - start };
  } catch {
    return { status: "degraded", latencyMs: Date.now() - start };
  }
}

// ─── Création des tables vs_* ──────────────────────────────────────

export async function ensureVsTables(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS vs_projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      adresse VARCHAR(200) NOT NULL,
      type_bien VARCHAR(20) NOT NULL CHECK (type_bien IN ('immeuble', 'maison', 'appartement')),
      surface_totale INT,
      status VARCHAR(30) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','step_1_complete','step_2_complete','step_3_complete','completed','archived')),
      archived_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    -- Migration s27 : soft delete (archivage) — colonne archived_at + statut 'archived'
    ALTER TABLE vs_projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
    -- Migration s27 : étendre la contrainte CHECK status pour inclure 'archived' (idempotent)
    DO $migration_s27_status$
    BEGIN
      ALTER TABLE vs_projects DROP CONSTRAINT IF EXISTS vs_projects_status_check;
      ALTER TABLE vs_projects ADD CONSTRAINT vs_projects_status_check
        CHECK (status IN ('draft','step_1_complete','step_2_complete','step_3_complete','completed','archived'));
    END
    $migration_s27_status$;
    CREATE INDEX IF NOT EXISTS idx_vs_projects_archived ON vs_projects(archived_at) WHERE archived_at IS NOT NULL;

    CREATE TABLE IF NOT EXISTS vs_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES vs_projects(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      mime_type VARCHAR(50) NOT NULL,
      floor_number INT NOT NULL DEFAULT 0,
      original_filename VARCHAR(255),
      extraction_data JSONB,
      extraction_status VARCHAR(20) DEFAULT 'pending'
        CHECK (extraction_status IN ('pending','processing','done','failed')),
      m2_per_pixel DECIMAL(12, 6),
      canonicalized_image_path TEXT,
      canonicalized_at TIMESTAMPTZ,
      canonical_fallback_reason VARCHAR(30),
      canonical_prompt_version VARCHAR(10),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_vs_plans_project ON vs_plans(project_id);
    -- Migration F05 (versi-s19) : ajout colonne m2_per_pixel pour bases existantes
    ALTER TABLE vs_plans ADD COLUMN IF NOT EXISTS m2_per_pixel DECIMAL(12, 6);
    -- Migration s25 : canonicalisation plan via gpt-image-2 (feature flag VS_PLAN_CANONICALIZE)
    ALTER TABLE vs_plans ADD COLUMN IF NOT EXISTS canonicalized_image_path TEXT;
    ALTER TABLE vs_plans ADD COLUMN IF NOT EXISTS canonicalized_at TIMESTAMPTZ;
    ALTER TABLE vs_plans ADD COLUMN IF NOT EXISTS canonical_fallback_reason VARCHAR(30);
    ALTER TABLE vs_plans ADD COLUMN IF NOT EXISTS canonical_prompt_version VARCHAR(10);

    CREATE TABLE IF NOT EXISTS vs_lots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES vs_projects(id) ON DELETE CASCADE,
      name VARCHAR(50) NOT NULL,
      floor_number INT NOT NULL DEFAULT 0,
      surface_m2 NUMERIC(6,2),
      zone_data JSONB NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'suggested'
        CHECK (status IN ('suggested','validated','overlap_error')),
      source VARCHAR(10) NOT NULL DEFAULT 'ai'
        CHECK (source IN ('ai','manual')),
      confidence_avg NUMERIC(4,3),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_vs_lots_project ON vs_lots(project_id);

    -- U1 versi-s21 : ajout colonne confidence_avg pour bases existantes
    ALTER TABLE vs_lots ADD COLUMN IF NOT EXISTS confidence_avg NUMERIC(4,3);

    CREATE TABLE IF NOT EXISTS vs_rooms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lot_id UUID NOT NULL REFERENCES vs_lots(id) ON DELETE CASCADE,
      plan_id UUID REFERENCES vs_plans(id),
      name VARCHAR(50),
      room_type VARCHAR(30) NOT NULL DEFAULT 'non_identifie',
      custom_label VARCHAR(50),
      surface_m2 NUMERIC(6,2),
      position JSONB,
      polygon JSONB,
      status VARCHAR(20) NOT NULL DEFAULT 'suggested'
        CHECK (status IN ('suggested','validated')),
      source VARCHAR(10) NOT NULL DEFAULT 'ai'
        CHECK (source IN ('ai','manual')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_vs_rooms_lot ON vs_rooms(lot_id);
    -- S24 : ajout colonne polygon JSONB pour contour precis des pieces
    ALTER TABLE vs_rooms ADD COLUMN IF NOT EXISTS polygon JSONB;
    -- S22 : ajout colonne touched pour flag confirmation utilisateur (option C)
    ALTER TABLE vs_rooms ADD COLUMN IF NOT EXISTS touched BOOLEAN NOT NULL DEFAULT false;

    CREATE TABLE IF NOT EXISTS vs_photos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      room_id UUID NOT NULL REFERENCES vs_rooms(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      angle_description VARCHAR(100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_vs_photos_room ON vs_photos(room_id);

    CREATE TABLE IF NOT EXISTS vs_visuals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      photo_id UUID NOT NULL REFERENCES vs_photos(id) ON DELETE CASCADE,
      style_id VARCHAR(30) NOT NULL,
      file_path TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'processing'
        CHECK (status IN ('processing','generated','validated','failed')),
      prompt_used TEXT,
      iteration_count INT NOT NULL DEFAULT 0,
      parent_visual_id UUID REFERENCES vs_visuals(id),
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_vs_visuals_photo ON vs_visuals(photo_id);
    CREATE INDEX IF NOT EXISTS idx_vs_visuals_status ON vs_visuals(status);
  `;

  try {
    await query(sql);
    console.log("[vs/db] Tables vs_* vérifiées/créées avec succès.");
  } catch (err) {
    console.error("[vs/db] Erreur lors de la création des tables :", err);
    throw err;
  }
}

// ─── Initialisation au démarrage ───────────────────────────────────

let tablesEnsured = false;

export async function ensureDbReady(): Promise<void> {
  if (tablesEnsured) return;
  try {
    await ensureVsTables();
    tablesEnsured = true;
  } catch (err) {
    // Requalifier les erreurs de connexion en DbUnavailableError
    if (isDbUnavailable(err)) {
      throw new DbUnavailableError(
        "Service de base de données temporairement indisponible.",
        err
      );
    }
    throw err;
  }
}
