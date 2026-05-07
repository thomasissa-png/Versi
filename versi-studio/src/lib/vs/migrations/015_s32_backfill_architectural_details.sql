-- Migration 015 — s32 HOTFIX P0 : backfill architectural_details
-- Idempotente : peut être rejouée sans effet secondaire.
--
-- Source : symptôme prod s32 — Thomas (verbatim) :
--   « En passant de l'étape 3 à 4 j'ai le message : Une erreur est survenue.
--     Cannot read properties of undefined (reading 'source') »
--
-- Cause : la migration 012 a posé `architectural_details JSONB NOT NULL DEFAULT '{}'`
-- — toutes les pièces existantes ont donc `{}` comme valeur. Le code UI
-- consomme `details.floor.source` mais `details.floor` est undefined sur ces
-- rows → crash au render Étape 4.
--
-- Fix code (commit du même push) : `normalizeArchitecturalDetails()` est
-- appliqué au point d'entrée API (rooms GET / PATCH) ET en defensive UI.
-- Cette migration en complément backfill toutes les rows existantes pour
-- qu'elles aient la structure complète directement en BDD — belt-and-suspenders.
--
-- Critère de match : `architectural_details` est NULL OU '{}'::jsonb (default
-- migration 012 jamais touché par PATCH). On NE TOUCHE PAS aux rows qui ont
-- déjà des données partielles (au cas où certains champs sont remplis et
-- d'autres absents — préserver le partiel est plus prudent que d'écraser).

UPDATE vs_rooms
SET architectural_details = jsonb_build_object(
  'floor', jsonb_build_object('value', NULL, 'source', NULL),
  'walls', jsonb_build_object('value', NULL, 'source', NULL),
  'lighting', jsonb_build_object('value', NULL, 'source', NULL),
  'specifics', '[]'::jsonb,
  'level', jsonb_build_object('value', NULL, 'source', NULL),
  'technical_constraints', '[]'::jsonb
)
WHERE architectural_details IS NULL
   OR architectural_details = '{}'::jsonb;

-- Met à jour aussi le DEFAULT futur de la colonne pour les nouvelles pièces
-- (pas critique car le code passe par normalize, mais cohérent).
ALTER TABLE vs_rooms
  ALTER COLUMN architectural_details SET DEFAULT jsonb_build_object(
    'floor', jsonb_build_object('value', NULL, 'source', NULL),
    'walls', jsonb_build_object('value', NULL, 'source', NULL),
    'lighting', jsonb_build_object('value', NULL, 'source', NULL),
    'specifics', '[]'::jsonb,
    'level', jsonb_build_object('value', NULL, 'source', NULL),
    'technical_constraints', '[]'::jsonb
  );
