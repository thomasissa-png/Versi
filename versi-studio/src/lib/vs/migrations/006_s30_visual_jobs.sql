-- Migration s30 — Étape 4 v2 Vague 2 : job persistant de génération visuels
-- Idempotente : peut être rejouée sans effet secondaire.
-- Appliquée automatiquement par ensureVsTables() au démarrage.
-- Exécution manuelle dev : psql $DATABASE_URL -f 006_s30_visual_jobs.sql
--
-- Rationale (P1 persona Thomas Friction 9 — continuité génération côté serveur) :
-- Quand Thomas ferme l'app mobile pendant les 7 minutes de génération, le job
-- DOIT continuer côté serveur. Cette table fait passer le pipeline d'un mode
-- "fire-and-forget tué avec la requête" à un mode "tâche reprenable" :
--   - status 'pending' = créé, pas encore démarré (pré-flight bloqué OU en file)
--   - status 'running' = worker en cours d'exécution
--   - status 'done'    = terminé succès (completed_count == expected_count)
--   - status 'failed'  = abandon (error_message expose la cause)
--
-- Un seul job actif par projet à la fois. Reprise après crash : un cron léger
-- peut requalifier les 'running' bloqués > 30 min en 'failed' (out of scope V2 bg
-- worker — on délègue au futur cron Replit).

CREATE TABLE IF NOT EXISTS vs_visual_jobs (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID         NOT NULL REFERENCES vs_projects(id) ON DELETE CASCADE,
  status          VARCHAR(20)  NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','running','done','failed')),
  expected_count  INT          NOT NULL DEFAULT 0,
  completed_count INT          NOT NULL DEFAULT 0,
  failed_count    INT          NOT NULL DEFAULT 0,
  -- Coût estimé en USD (informatif, sert au CostHint UI ; aucun blocage technique).
  estimated_cost_usd NUMERIC(6,3) DEFAULT 0,
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vs_visual_jobs_project_status
  ON vs_visual_jobs(project_id, status);

-- Garantit qu'un seul job 'running' existe par projet à un instant T.
-- Permet d'éviter les doubles déclenchements en cas de double clic frontend.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_vs_visual_jobs_running_per_project
  ON vs_visual_jobs(project_id) WHERE status = 'running';

-- Trigger updated_at idempotent.
CREATE OR REPLACE FUNCTION vs_visual_jobs_set_updated_at()
RETURNS TRIGGER AS $vs_vj_upd$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$vs_vj_upd$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vs_visual_jobs_updated_at ON vs_visual_jobs;
CREATE TRIGGER trg_vs_visual_jobs_updated_at
  BEFORE UPDATE ON vs_visual_jobs
  FOR EACH ROW EXECUTE FUNCTION vs_visual_jobs_set_updated_at();
