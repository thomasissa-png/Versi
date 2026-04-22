-- Migration s25 — Canonicalisation plan (feature flag VS_PLAN_CANONICALIZE)
-- Idempotente : peut être rejouée sans effet secondaire.
-- Appliquée automatiquement par ensureVsTables() au démarrage.
-- Exécution manuelle dev : psql $DATABASE_URL -f 001_s25_canonicalized_plan.sql

ALTER TABLE vs_plans ADD COLUMN IF NOT EXISTS canonicalized_image_path TEXT;
ALTER TABLE vs_plans ADD COLUMN IF NOT EXISTS canonicalized_at TIMESTAMPTZ;
ALTER TABLE vs_plans ADD COLUMN IF NOT EXISTS canonical_fallback_reason VARCHAR(30);
ALTER TABLE vs_plans ADD COLUMN IF NOT EXISTS canonical_prompt_version VARCHAR(10);

-- Pas d'index nécessaire : lookup systématique par plan.id (déjà PK).
-- Le `canonical_fallback_reason` est une étiquette descriptive (timeout / api_error /
-- gate_fail / empty_input). Pas de contrainte CHECK pour rester souple en itération s25.
