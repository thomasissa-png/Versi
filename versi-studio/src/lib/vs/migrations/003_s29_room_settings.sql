-- Migration s29 — Étape 4 v2 : paramètres visuels par pièce
-- Idempotente : peut être rejouée sans effet secondaire.
-- Appliquée automatiquement par ensureVsTables() au démarrage.
-- Exécution manuelle dev : psql $DATABASE_URL -f 003_s29_room_settings.sql

CREATE TABLE IF NOT EXISTS vs_room_settings (
  room_id              UUID         PRIMARY KEY REFERENCES vs_rooms(id) ON DELETE CASCADE,
  comment_text         TEXT,
  -- Commentaire libre Thomas (contraintes matériaux, travaux, état cible).
  -- Ex : "parquet chêne clair à conserver", "abattre le mur entre salon et cuisine".
  target_visual_count  INT          NOT NULL DEFAULT 1
                                    CHECK (target_visual_count BETWEEN 0 AND 5),
  -- Nombre de visuels souhaités (slider 0-5 dans la sidebar).
  -- 0 = pièce désactivée (pas de génération).
  -- 1-5 = nombre de visuels cohérents générés (1 ancre + N-1 secondaires).
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Trigger updated_at — idempotent via DROP IF EXISTS + CREATE
CREATE OR REPLACE FUNCTION vs_room_settings_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vs_room_settings_updated_at ON vs_room_settings;
CREATE TRIGGER trg_vs_room_settings_updated_at
  BEFORE UPDATE ON vs_room_settings
  FOR EACH ROW EXECUTE FUNCTION vs_room_settings_set_updated_at();

-- Pas d'index supplémentaire : room_id est déjà PK (lookup direct par room).
