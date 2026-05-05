-- Migration 007 — s32 refonte Étape 4 wizard
-- Ajoute la colonne `style_id` par pièce (vs_rooms) pour permettre un style
-- propre à chaque pièce (au lieu d'un style projet unique).
--
-- Idempotente : ADD COLUMN IF NOT EXISTS + index IF NOT EXISTS.
-- Pas de back-fill : NULL = pas encore choisi → le wizard force le choix
-- pour pouvoir avancer à la pièce suivante.

ALTER TABLE vs_rooms ADD COLUMN IF NOT EXISTS style_id TEXT NULL;

CREATE INDEX IF NOT EXISTS vs_rooms_style_id_idx
  ON vs_rooms(style_id)
  WHERE style_id IS NOT NULL;
