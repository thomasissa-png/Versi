-- Migration s27 : soft delete (archivage) des projets Versi Studio
-- Idempotente : peut être rejouée sans effet secondaire.
--
-- Contexte : audit @ux 3.5/10 + @design 5.5/10 NO-GO sur l'Étape 0 (`/vs`).
-- Verbatim Thomas (marchand de biens) : "impossible de supprimer/archiver".
--
-- Effet :
--   1. Ajoute la colonne archived_at TIMESTAMPTZ NULL sur vs_projects.
--   2. Étend la contrainte CHECK status pour inclure 'archived'.
--   3. Crée un index partiel pour les requêtes WHERE archived_at IS NOT NULL.
--
-- L'auto-migration équivalente est appliquée par db.ts ensureVsTables() au boot
-- (pattern Versi Studio : pas de driver de migration externe).
-- Ce fichier sert de trace versionnée pour audit / rollback manuel.

-- 1. Colonne archived_at (idempotent)
ALTER TABLE vs_projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 2. Étendre la contrainte CHECK status (drop + recreate, idempotent)
DO $migration_s27_status$
BEGIN
  ALTER TABLE vs_projects DROP CONSTRAINT IF EXISTS vs_projects_status_check;
  ALTER TABLE vs_projects ADD CONSTRAINT vs_projects_status_check
    CHECK (status IN (
      'draft',
      'step_1_complete',
      'step_2_complete',
      'step_3_complete',
      'completed',
      'archived'
    ));
END
$migration_s27_status$;

-- 3. Index partiel pour les listes d'archives (peu fréquent, mais query-able)
CREATE INDEX IF NOT EXISTS idx_vs_projects_archived
  ON vs_projects(archived_at)
  WHERE archived_at IS NOT NULL;
