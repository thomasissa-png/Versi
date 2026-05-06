-- Migration s32 — Architectural data (profil lot + détails pièce)
-- Idempotente : peut être rejouée sans effet secondaire.
--
-- Source : Thomas prod s32 — feedback critique :
--   « L'outil ne fait pas un vrai travail d'architecte. Pas d'analyse murs/
--    plafonds/dimensions. Portes aléatoires. Il faudrait : (1) plus d'info
--    marchand avant génération, (2) vrai travail architecte avec questions
--    avant image. »
--
-- Solution V3 (validée 10/10 @persona) : enrichir le brief marchand avec
-- 5 champs profil lot (panneau Étape 2) + 4 champs pièce (wizard Étape 4).
-- Vision OpenAI pré-remplit les champs pièce avec confidence ≥ 0.7. Saisie
-- marchand toujours prioritaire (source='user' écrase source='vision').

-- ─── vs_lots.architectural_profile ─────────────────────────────────
-- Profil architectural du lot (5 champs niveau lot, partagés entre pièces) :
--   { ceiling_height, orientation, general_state, target_level, target_audience }
ALTER TABLE vs_lots
  ADD COLUMN IF NOT EXISTS architectural_profile JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ─── vs_rooms.architectural_details ────────────────────────────────
-- Détails architecturaux pièce (4 champs niveau pièce) :
--   {
--     floor:    { value, source: 'user'|'vision', confidence? },
--     walls:    { value, source: 'user'|'vision', confidence? },
--     lighting: { value, source: 'user'|'vision', confidence? },
--     specifics: [{ value, source, confidence? }, ...]
--   }
-- - source='user'   → saisie marchand (pas de confidence)
-- - source='vision' → analyse OpenAI Vision (confidence 0..1, ≥ 0.7 pré-rempli)
ALTER TABLE vs_rooms
  ADD COLUMN IF NOT EXISTS architectural_details JSONB NOT NULL DEFAULT '{}'::jsonb;
