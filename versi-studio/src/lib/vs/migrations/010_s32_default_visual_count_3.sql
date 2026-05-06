-- Migration s32 — Étape 4 v2 : default target_visual_count à 3
-- Idempotente : peut être rejouée sans effet secondaire.
-- Source : Thomas prod (s32 #P3) — wizard générait 1 visuel par pièce
-- alors que la cible métier est 3 minimum. Le default DB applicatif (1)
-- était hérité d'un test E2E ; on l'aligne avec la cible utilisateur.

-- 1) Default colonne (s'applique aux nouvelles lignes après cette migration)
ALTER TABLE vs_room_settings
  ALTER COLUMN target_visual_count SET DEFAULT 3;

-- 2) Backfill conservateur : ne touche QUE les pièces n'ayant jamais été
-- configurées par l'utilisateur (target_visual_count = 1 ET pas de
-- commentaire). Toute pièce où Thomas a explicitement choisi 1 visuel
-- (improbable) ou tapé un commentaire (= configuration intentionnelle)
-- reste à sa valeur. On préserve aussi les pièces désactivées (count=0).
UPDATE vs_room_settings
   SET target_visual_count = 3, updated_at = NOW()
 WHERE target_visual_count = 1
   AND comment_text IS NULL;
