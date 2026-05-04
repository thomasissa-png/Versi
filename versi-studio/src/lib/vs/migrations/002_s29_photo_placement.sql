-- Migration s29 — Étape 4 v2 : positionnement des photos sur le plan
-- Idempotente : peut être rejouée sans effet secondaire.
-- Appliquée automatiquement par ensureVsTables() au démarrage.
-- Exécution manuelle dev : psql $DATABASE_URL -f 002_s29_photo_placement.sql

-- Coordonnées normalisées (0.0 à 1.0) du centre de la photo sur le canvas plan,
-- relatives au plan complet (pas au polygone pièce). NULL si la photo n'a pas
-- encore été placée par Thomas sur le canvas.
ALTER TABLE vs_photos ADD COLUMN IF NOT EXISTS position_x FLOAT;
ALTER TABLE vs_photos ADD COLUMN IF NOT EXISTS position_y FLOAT;

-- Angle de vue du photographe en degrés (0 = nord/haut du plan, sens horaire,
-- valeurs valides 0-359). NULL tant que la photo n'a pas son angle défini.
ALTER TABLE vs_photos ADD COLUMN IF NOT EXISTS angle_degrees FLOAT;

-- Flag de placement : true = Thomas a déposé la photo sur le canvas (avec ou
-- sans angle confirmé). Permet de distinguer "uploadée mais en zone de dépôt"
-- de "placée sur une pièce du plan".
ALTER TABLE vs_photos ADD COLUMN IF NOT EXISTS is_placed_on_plan BOOLEAN NOT NULL DEFAULT false;

-- Métadonnées EXIF utiles V2 : heure de prise de vue (utilisée par T4 jour/nuit).
-- TIMESTAMPTZ pour préserver le fuseau de la photo source.
ALTER TABLE vs_photos ADD COLUMN IF NOT EXISTS taken_at TIMESTAMPTZ;

-- EXIF brut conservé en JSONB avant strip pour usage futur (géolocalisation, etc.).
-- Nullable : pas de blocage si la photo n'a pas d'EXIF ou si la lecture échoue.
ALTER TABLE vs_photos ADD COLUMN IF NOT EXISTS exif_raw JSONB;

-- Warnings de pré-traitement (low_light, blurry, too_small) — array JSON.
-- Affichés dans la sidebar à côté de la miniature. Ne bloquent pas la génération.
ALTER TABLE vs_photos ADD COLUMN IF NOT EXISTS preprocessing_warnings JSONB;

-- L'ancien champ angle_description (TEXT libre) reste en place pour backward compat
-- et migration progressive des données existantes. Marqué deprecated v2 — sera
-- supprimé en v3 après vérification que plus aucune route prod ne le lit.
COMMENT ON COLUMN vs_photos.angle_description IS 'DEPRECATED v2 — use angle_degrees (FLOAT 0-359) instead. Sera supprimé en v3.';

-- Index : récupération rapide des photos placées par room (commun en lecture canvas)
CREATE INDEX IF NOT EXISTS idx_vs_photos_placed
  ON vs_photos(room_id) WHERE is_placed_on_plan = true;

-- Contrainte : angle_degrees doit être dans [0, 360) si défini.
-- Idempotent via DROP IF EXISTS + ADD CONSTRAINT.
ALTER TABLE vs_photos DROP CONSTRAINT IF EXISTS vs_photos_angle_check;
ALTER TABLE vs_photos ADD CONSTRAINT vs_photos_angle_check
  CHECK (angle_degrees IS NULL OR (angle_degrees >= 0 AND angle_degrees < 360));
