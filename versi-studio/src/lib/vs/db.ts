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
    -- S32 (migration 007) : style propre à chaque pièce (refonte Étape 4 wizard)
    ALTER TABLE vs_rooms ADD COLUMN IF NOT EXISTS style_id TEXT NULL;
    CREATE INDEX IF NOT EXISTS vs_rooms_style_id_idx
      ON vs_rooms(style_id) WHERE style_id IS NOT NULL;
    -- S32 (migration 008) : meublé / skip pièce (autopilot Thomas prod)
    ALTER TABLE vs_rooms ADD COLUMN IF NOT EXISTS is_furnished BOOLEAN NOT NULL DEFAULT TRUE;
    DO $migration_s32_room_status$
    BEGIN
      ALTER TABLE vs_rooms DROP CONSTRAINT IF EXISTS vs_rooms_status_check;
      ALTER TABLE vs_rooms ADD CONSTRAINT vs_rooms_status_check
        CHECK (status IN ('suggested','validated','skipped'));
    END
    $migration_s32_room_status$;
    -- S32 (migration 009) : ajustement contour + annotations segments (autopilot)
    ALTER TABLE vs_rooms ADD COLUMN IF NOT EXISTS polygon_offset_x NUMERIC NULL;
    ALTER TABLE vs_rooms ADD COLUMN IF NOT EXISTS polygon_offset_y NUMERIC NULL;
    CREATE TABLE IF NOT EXISTS vs_room_segments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      room_id UUID NOT NULL REFERENCES vs_rooms(id) ON DELETE CASCADE,
      segment_index INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'wall',
      notes TEXT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (room_id, segment_index)
    );
    DO $migration_s32_segment_type$
    BEGIN
      ALTER TABLE vs_room_segments DROP CONSTRAINT IF EXISTS vs_room_segments_type_check;
      ALTER TABLE vs_room_segments ADD CONSTRAINT vs_room_segments_type_check
        CHECK (type IN ('wall', 'door', 'window', 'bay_window', 'opening', 'flexible'));
    END
    $migration_s32_segment_type$;
    CREATE INDEX IF NOT EXISTS vs_room_segments_room_id_idx
      ON vs_room_segments(room_id);
    CREATE OR REPLACE FUNCTION vs_room_segments_set_updated_at()
    RETURNS TRIGGER AS $vs_seg_upd$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $vs_seg_upd$ LANGUAGE plpgsql;
    DROP TRIGGER IF EXISTS trg_vs_room_segments_updated_at ON vs_room_segments;
    CREATE TRIGGER trg_vs_room_segments_updated_at
      BEFORE UPDATE ON vs_room_segments
      FOR EACH ROW EXECUTE FUNCTION vs_room_segments_set_updated_at();

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

    -- ─── Migrations s29 — Étape 4 v2 (Vague 1 backend) ──────────────

    -- 002_s29_photo_placement : positionnement des photos sur le plan
    ALTER TABLE vs_photos ADD COLUMN IF NOT EXISTS position_x FLOAT;
    ALTER TABLE vs_photos ADD COLUMN IF NOT EXISTS position_y FLOAT;
    ALTER TABLE vs_photos ADD COLUMN IF NOT EXISTS angle_degrees FLOAT;
    ALTER TABLE vs_photos ADD COLUMN IF NOT EXISTS is_placed_on_plan BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE vs_photos ADD COLUMN IF NOT EXISTS taken_at TIMESTAMPTZ;
    ALTER TABLE vs_photos ADD COLUMN IF NOT EXISTS exif_raw JSONB;
    ALTER TABLE vs_photos ADD COLUMN IF NOT EXISTS preprocessing_warnings JSONB;
    CREATE INDEX IF NOT EXISTS idx_vs_photos_placed
      ON vs_photos(room_id) WHERE is_placed_on_plan = true;
    -- Contrainte angle dans [0,360) — idempotent via DROP IF EXISTS
    DO $migration_s29_angle$
    BEGIN
      ALTER TABLE vs_photos DROP CONSTRAINT IF EXISTS vs_photos_angle_check;
      ALTER TABLE vs_photos ADD CONSTRAINT vs_photos_angle_check
        CHECK (angle_degrees IS NULL OR (angle_degrees >= 0 AND angle_degrees < 360));
    END
    $migration_s29_angle$;

    -- 003_s29_room_settings : paramètres visuels par pièce
    CREATE TABLE IF NOT EXISTS vs_room_settings (
      room_id              UUID         PRIMARY KEY REFERENCES vs_rooms(id) ON DELETE CASCADE,
      comment_text         TEXT,
      target_visual_count  INT          NOT NULL DEFAULT 3
                                        CHECK (target_visual_count BETWEEN 0 AND 5),
      created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
    -- s32 (migration 010) : nouveau default à 3 + backfill pièces non touchées
    ALTER TABLE vs_room_settings
      ALTER COLUMN target_visual_count SET DEFAULT 3;
    UPDATE vs_room_settings
       SET target_visual_count = 3, updated_at = NOW()
     WHERE target_visual_count = 1
       AND comment_text IS NULL;
    CREATE OR REPLACE FUNCTION vs_room_settings_set_updated_at()
    RETURNS TRIGGER AS $vs_rs_upd$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $vs_rs_upd$ LANGUAGE plpgsql;
    DROP TRIGGER IF EXISTS trg_vs_room_settings_updated_at ON vs_room_settings;
    CREATE TRIGGER trg_vs_room_settings_updated_at
      BEFORE UPDATE ON vs_room_settings
      FOR EACH ROW EXECUTE FUNCTION vs_room_settings_set_updated_at();

    -- 004_s29_visual_questions : questions bloquantes IA (T1-T5)
    CREATE TABLE IF NOT EXISTS vs_visual_questions (
      id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id    UUID         NOT NULL REFERENCES vs_projects(id) ON DELETE CASCADE,
      room_id       UUID         REFERENCES vs_rooms(id) ON DELETE CASCADE,
      trigger_type  VARCHAR(40)  NOT NULL,
      question_text TEXT         NOT NULL,
      user_answer   TEXT,
      status        VARCHAR(20)  NOT NULL DEFAULT 'asked'
                                 CHECK (status IN ('asked','answered','expired')),
      asked_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      answered_at   TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_vs_visual_questions_unanswered
      ON vs_visual_questions(project_id, asked_at)
      WHERE status = 'asked';
    CREATE INDEX IF NOT EXISTS idx_vs_visual_questions_room
      ON vs_visual_questions(room_id) WHERE room_id IS NOT NULL;

    -- 005_s29_visuals_coherence : extension vs_visuals
    ALTER TABLE vs_visuals ADD COLUMN IF NOT EXISTS anchor_visual_id UUID REFERENCES vs_visuals(id);
    ALTER TABLE vs_visuals ADD COLUMN IF NOT EXISTS visual_signature_json JSONB;
    ALTER TABLE vs_visuals ADD COLUMN IF NOT EXISTS coherence_mode VARCHAR(30);
    ALTER TABLE vs_visuals ADD COLUMN IF NOT EXISTS prompt_version VARCHAR(20);
    CREATE INDEX IF NOT EXISTS idx_vs_visuals_anchor
      ON vs_visuals(anchor_visual_id) WHERE anchor_visual_id IS NOT NULL;

    -- ─── Migrations s30 — Étape 4 v2 (Vague 2 backend) ──────────────

    -- 006_s30_visual_jobs : job persistant de génération (continuité serveur)
    CREATE TABLE IF NOT EXISTS vs_visual_jobs (
      id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id      UUID         NOT NULL REFERENCES vs_projects(id) ON DELETE CASCADE,
      status          VARCHAR(20)  NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending','running','done','failed')),
      expected_count  INT          NOT NULL DEFAULT 0,
      completed_count INT          NOT NULL DEFAULT 0,
      failed_count    INT          NOT NULL DEFAULT 0,
      estimated_cost_usd NUMERIC(6,3) DEFAULT 0,
      error_message   TEXT,
      started_at      TIMESTAMPTZ,
      completed_at    TIMESTAMPTZ,
      created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_vs_visual_jobs_project_status
      ON vs_visual_jobs(project_id, status);
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_vs_visual_jobs_running_per_project
      ON vs_visual_jobs(project_id) WHERE status = 'running';
    CREATE OR REPLACE FUNCTION vs_visual_jobs_set_updated_at()
    RETURNS TRIGGER AS $vs_vj_upd$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $vs_vj_upd$ LANGUAGE plpgsql;
    DROP TRIGGER IF EXISTS trg_vs_visual_jobs_updated_at ON vs_visual_jobs;
    CREATE TRIGGER trg_vs_visual_jobs_updated_at
      BEFORE UPDATE ON vs_visual_jobs
      FOR EACH ROW EXECUTE FUNCTION vs_visual_jobs_set_updated_at();
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
