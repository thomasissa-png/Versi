-- Migration 008 — s32 (autopilot Thomas prod) : meublé/skip + commentaire pièce
--
-- Bug remontés en prod :
--  #3 Toggle meublé/non-meublé par pièce (l'IA doit savoir si la photo
--     représente une pièce déjà meublée à améliorer ou une pièce vide à
--     meubler intégralement).
--  #5 Skip pièce ("Pas de visuels pour cette pièce" — couloir/cellier).
--
-- Choix d'implémentation :
--  - is_furnished : nouveau champ sur vs_rooms (DEFAULT TRUE — comportement
--    actuel implicite = pièce déjà meublée à transformer).
--  - skipped : étend la contrainte CHECK existante de vs_rooms.status pour
--    accepter 'skipped' en plus de 'suggested'/'validated'. Pas de nouvelle
--    colonne — on reste cohérent avec le pattern status existant.
--  - Le commentaire pièce existe DÉJÀ via vs_room_settings.comment_text
--    (s29 migration 003). On NE crée PAS de doublon. La phase 3 du brief
--    devra exposer ce champ existant dans l'UI wizard.
--
-- Idempotente : ADD COLUMN IF NOT EXISTS + DROP/ADD CONSTRAINT.

-- #3 — Toggle meublé/non-meublé par pièce
ALTER TABLE vs_rooms
  ADD COLUMN IF NOT EXISTS is_furnished BOOLEAN NOT NULL DEFAULT TRUE;

-- #5 — Skip pièce : étendre CHECK status pour accepter 'skipped'
DO $migration_s32_room_status$
BEGIN
  ALTER TABLE vs_rooms DROP CONSTRAINT IF EXISTS vs_rooms_status_check;
  ALTER TABLE vs_rooms ADD CONSTRAINT vs_rooms_status_check
    CHECK (status IN ('suggested','validated','skipped'));
END
$migration_s32_room_status$;
