-- Migration s32 — Architecte conversationnel (Phase 9 par-dessus V3 architectural data)
-- Idempotente : peut être rejouée sans effet secondaire.
--
-- Source : Thomas s32 — clarification intent :
--   « Je veux presque que ce soit un dialogue pour avoir le visuel parfait
--    du premier coup, il faut nourrir l'outil d'info. »
--   « Il faut que ce soit les 2 : toutes les infos standards champs ET puis
--    questions si besoins de choses en plus. »
--
-- Solution V4 (validée @persona) : par-dessus les pills V3, ajouter un
-- chat architecte qui pose des questions ciblées sur les ambiguïtés non
-- couvertes par les pills. Mémoire opération partagée entre pièces du
-- même lot.

-- ─── vs_lots.operation_chat_context ───────────────────────────────
-- Mémoire opération partagée par lot (style, public, budget, notes).
-- Persistée entre pièces : pièce 2+ peut référer aux décisions pièce 1.
ALTER TABLE vs_lots
  ADD COLUMN IF NOT EXISTS operation_chat_context JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ─── vs_room_chats ─────────────────────────────────────────────────
-- Transcript chat architecte par pièce :
--   transcript[]            : liste ordonnée de ChatMessage (assistant/user/system/tool)
--   brief_validated         : signal LLM `validate_brief` reçu → bouton Générer vert
--   extra_context           : infos hors-pills capturées via tool record_extra_context
--                             (ex: « cloison amovible mur Sud », « cheminée déco seulement »)
--                             Injectées dans le prompt génération (Phase 7).
CREATE TABLE IF NOT EXISTS vs_room_chats (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         UUID         NOT NULL REFERENCES vs_rooms(id) ON DELETE CASCADE,
  transcript      JSONB        NOT NULL DEFAULT '[]'::jsonb,
  brief_validated BOOLEAN      NOT NULL DEFAULT FALSE,
  extra_context   JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (room_id)
);
CREATE INDEX IF NOT EXISTS vs_room_chats_room_idx
  ON vs_room_chats(room_id);

-- Trigger updated_at (idempotent via DROP + CREATE)
CREATE OR REPLACE FUNCTION vs_room_chats_set_updated_at()
RETURNS TRIGGER AS $vs_rc_upd$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$vs_rc_upd$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_vs_room_chats_updated_at ON vs_room_chats;
CREATE TRIGGER trg_vs_room_chats_updated_at
  BEFORE UPDATE ON vs_room_chats
  FOR EACH ROW EXECUTE FUNCTION vs_room_chats_set_updated_at();
