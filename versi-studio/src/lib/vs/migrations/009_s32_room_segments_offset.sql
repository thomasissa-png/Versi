-- Migration 009 — s32 (autopilot Thomas — Étape 4 wizard)
--
-- Bugs/features remontés en prod :
--  Feature A — Ajustement contour : permettre un décalage léger du polygone
--    sur les murs (translation X/Y) sans changer la forme. Cas d'usage :
--    OCR ou détection IA placée légèrement à côté du mur réel.
--  Feature B — Annotations sémantiques par segment : chaque arête du polygone
--    peut être typée (mur plein, porte, fenêtre, baie vitrée à créer,
--    ouverture, flexible). Utilisé pour enrichir le prompt de génération IA.
--
-- Choix d'implémentation :
--  - polygon_offset_x/y : NUMERIC NULL sur vs_rooms. Unité = pourcentage
--    lot-local (-10 à +10). NULL = pas d'ajustement.
--  - vs_room_segments : nouvelle table avec UNIQUE (room_id, segment_index).
--    Création à la volée côté API (lazy : un segment GET crée les rangées
--    default 'wall' si absentes pour les N segments du polygone courant).
--
-- Idempotente : ADD COLUMN IF NOT EXISTS + CREATE TABLE IF NOT EXISTS.

-- Feature A — Offsets polygone (lot-local %, plage usuelle [-10, +10])
ALTER TABLE vs_rooms ADD COLUMN IF NOT EXISTS polygon_offset_x NUMERIC NULL;
ALTER TABLE vs_rooms ADD COLUMN IF NOT EXISTS polygon_offset_y NUMERIC NULL;

-- Feature B — Annotations sémantiques par segment du polygone
CREATE TABLE IF NOT EXISTS vs_room_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES vs_rooms(id) ON DELETE CASCADE,
  segment_index INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'wall',
  notes TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (room_id, segment_index)
);

-- Contrainte type (idempotent via DROP IF EXISTS)
DO $migration_s32_segment_type$
BEGIN
  ALTER TABLE vs_room_segments DROP CONSTRAINT IF EXISTS vs_room_segments_type_check;
  ALTER TABLE vs_room_segments ADD CONSTRAINT vs_room_segments_type_check
    CHECK (type IN ('wall', 'door', 'window', 'bay_window', 'opening', 'flexible'));
END
$migration_s32_segment_type$;

CREATE INDEX IF NOT EXISTS vs_room_segments_room_id_idx
  ON vs_room_segments(room_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION vs_room_segments_set_updated_at()
RETURNS TRIGGER AS $vs_seg_upd$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$vs_seg_upd$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_vs_room_segments_updated_at ON vs_room_segments;
CREATE TRIGGER trg_vs_room_segments_updated_at
  BEFORE UPDATE ON vs_room_segments
  FOR EACH ROW EXECUTE FUNCTION vs_room_segments_set_updated_at();
