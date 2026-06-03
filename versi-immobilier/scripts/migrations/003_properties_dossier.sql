-- Migration 003 — properties.dossier
-- Ajoute une colonne JSONB nullable pour stocker le « dossier de pré-commercialisation »
-- riche (formules brut/prêt à habiter, surfaces, travaux, repères marché, calendrier…).
-- Idempotente, additive, non destructive : NULL = la fiche conserve le rendu standard.
--
-- Référence : docs/dossiers-sources/muguets-lot-1-rdc.txt + muguets-lot-2-t3.txt.

ALTER TABLE properties ADD COLUMN IF NOT EXISTS dossier JSONB DEFAULT NULL;
