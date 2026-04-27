-- Migration 002 — property_photos : préparer le passage à un storage externe (R2 / Replit OS).
-- Idempotente, additive, NON-DESTRUCTIVE : la colonne `data` (base64) reste en place
-- pendant la fenêtre de rollback. À jouer une fois Thomas a tranché stratégie A vs B.
--
-- Référence : docs/infra/property-photos-storage-options.md §4 Plan implémentation Étape 1.
-- Déclenchement : NE PAS appliquer tant que PHOTO_STORAGE_BACKEND reste "db" (default).

ALTER TABLE property_photos ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE property_photos ADD COLUMN IF NOT EXISTS storage_key TEXT;
ALTER TABLE property_photos ADD COLUMN IF NOT EXISTS storage_backend TEXT NOT NULL DEFAULT 'db';

-- Index pour lookup par storage_key (utile lors du backfill et cleanup).
CREATE INDEX IF NOT EXISTS idx_property_photos_storage_backend ON property_photos(storage_backend);
CREATE INDEX IF NOT EXISTS idx_property_photos_storage_key ON property_photos(storage_key) WHERE storage_key IS NOT NULL;

-- NOTE : la colonne `data` (base64) ne sera DROP qu'après 1 semaine de stabilité
-- post-bascule (cf. doc §4 Étape 3). Pas dans cette migration.
