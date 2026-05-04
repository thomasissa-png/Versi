-- Migration s29 — Étape 4 v2 : questions bloquantes IA (T1-T5)
-- Idempotente : peut être rejouée sans effet secondaire.
-- Appliquée automatiquement par ensureVsTables() au démarrage.
-- Exécution manuelle dev : psql $DATABASE_URL -f 004_s29_visual_questions.sql

CREATE TABLE IF NOT EXISTS vs_visual_questions (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID         NOT NULL REFERENCES vs_projects(id) ON DELETE CASCADE,
  room_id       UUID         REFERENCES vs_rooms(id) ON DELETE CASCADE,
  -- NULL si question de niveau projet (rare V2 — réservé pour évolutions futures).
  trigger_type  VARCHAR(40)  NOT NULL,
  -- Valeurs : 'surface_aberrante' | 'photo_manquante' | 'conflit_style_commentaire'
  --         | 'photos_incoherentes' | 'surface_inconnue'
  -- Pas de contrainte CHECK pour rester souple en évolution V3 (ajout de triggers).
  question_text TEXT         NOT NULL,
  -- Libellé exact affiché à Thomas dans la modale chat.
  user_answer   TEXT,
  -- NULL tant que Thomas n'a pas répondu = état bloquant.
  status        VARCHAR(20)  NOT NULL DEFAULT 'asked'
                             CHECK (status IN ('asked','answered','expired')),
  -- 'asked' = en attente de réponse (bloque la génération)
  -- 'answered' = Thomas a répondu (user_answer NOT NULL, answered_at NOT NULL)
  -- 'expired' = TTL 24h dépassé sans réponse (cron de nettoyage)
  asked_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  answered_at   TIMESTAMPTZ
);

-- Index partiel : récupération rapide des questions bloquantes en attente
-- (le cas chaud à chaque rendu de modale chat / check pré-génération).
CREATE INDEX IF NOT EXISTS idx_vs_visual_questions_unanswered
  ON vs_visual_questions(project_id, asked_at)
  WHERE status = 'asked';

-- Index secondaire : lookup par room (utilisé par buildUserAnswersForRoom dans
-- coherent-visual-generator).
CREATE INDEX IF NOT EXISTS idx_vs_visual_questions_room
  ON vs_visual_questions(room_id) WHERE room_id IS NOT NULL;
