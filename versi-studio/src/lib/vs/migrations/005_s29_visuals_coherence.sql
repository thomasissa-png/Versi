-- Migration s29 — Étape 4 v2 : extension vs_visuals pour cohérence ancre/secondaires
-- Idempotente : peut être rejouée sans effet secondaire.
-- Appliquée automatiquement par ensureVsTables() au démarrage.
-- Exécution manuelle dev : psql $DATABASE_URL -f 005_s29_visuals_coherence.sql

-- Référence vers le visuel "ancre" de la pièce (même room).
-- NULL si CE visuel EST l'ancre (premier visuel généré, sert de référence).
-- NOT NULL si CE visuel est un secondaire qui doit hériter de l'ancre.
ALTER TABLE vs_visuals ADD COLUMN IF NOT EXISTS anchor_visual_id UUID REFERENCES vs_visuals(id);

-- Signature visuelle textuelle extraite de l'ancre via gpt-4o-mini vision.
-- JSON structuré : { palette: ["#hex", ...], meubles: [...], sols_murs: "...", lumiere: "..." }
-- Présent UNIQUEMENT sur les visuels ancres (NULL sur les secondaires — ils héritent
-- de la signature de leur anchor_visual_id).
ALTER TABLE vs_visuals ADD COLUMN IF NOT EXISTS visual_signature_json JSONB;

-- Mode de cohérence utilisé pour ce visuel :
-- - NULL pour les ancres (pas de cohérence à hériter)
-- - 'multi_image_native' pour secondaires si gpt-image-2 a accepté l'array d'images
-- - 'textual_signature' pour secondaires si fallback signature textuelle uniquement
-- Permet de tracer la qualité de cohérence et d'afficher un badge UI "réduite" si textual.
ALTER TABLE vs_visuals ADD COLUMN IF NOT EXISTS coherence_mode VARCHAR(30);

-- Version du prompt utilisé (traçabilité régressions). v2.0.0 = pipeline V2 cohérent.
ALTER TABLE vs_visuals ADD COLUMN IF NOT EXISTS prompt_version VARCHAR(20);

-- Index : récupération rapide des secondaires d'une ancre (pour régénération individuelle EC-5).
CREATE INDEX IF NOT EXISTS idx_vs_visuals_anchor
  ON vs_visuals(anchor_visual_id) WHERE anchor_visual_id IS NOT NULL;
