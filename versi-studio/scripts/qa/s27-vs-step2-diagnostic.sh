#!/usr/bin/env bash
# s27 — Diagnostic Étape 2 vide (Versi Studio)
#
# USAGE (shell Replit du Repl versi-studio) :
#   bash scripts/qa/s27-vs-step2-diagnostic.sh
#
# But : trancher pourquoi l'Étape 2 n'affiche aucun lot après extraction.
# Hypothèses :
#   H1. Pipeline tombé en fallback canonicalisation (PDF brut input pourri)
#   H2. GPT-4.1 Vision a renvoyé { lots: [] } (extraction valide mais vide)
#   H3. INSERT lots en DB a échoué silencieusement (try/catch muet)
#   H4. Lots en DB mais frontend ne les lit pas (bug rendu UI)
#   H5. extraction_status bloqué en "extracting" (pipeline jamais terminé)

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERREUR : DATABASE_URL absente."
  exit 1
fi

echo "================================================================================"
echo "DIAGNOSTIC ÉTAPE 2 VIDE — versi-studio s27"
echo "================================================================================"
echo ""
echo "▶ A. État des 5 derniers projets (statut + nombre de lots détectés)"
echo ""

psql "$DATABASE_URL" -c "
SELECT
  p.id                                            AS project_id,
  p.title,
  p.status,
  COUNT(DISTINCT pl.id)                           AS n_plans,
  COUNT(DISTINCT pl.id) FILTER (WHERE pl.extraction_status = 'done')           AS n_plans_done,
  COUNT(DISTINCT pl.id) FILTER (WHERE pl.extraction_status = 'extracting')     AS n_plans_extracting,
  COUNT(DISTINCT pl.id) FILTER (WHERE pl.extraction_status = 'error')          AS n_plans_error,
  COUNT(DISTINCT l.id)                            AS n_lots,
  p.created_at
FROM projects p
LEFT JOIN vs_plans pl ON pl.project_id = p.id
LEFT JOIN vs_lots  l  ON l.project_id = p.id
GROUP BY p.id, p.title, p.status, p.created_at
ORDER BY p.created_at DESC
LIMIT 5;
"

echo ""
echo "▶ B. Détail canonicalisation 5 derniers plans (qui a réussi vs fallback ?)"
echo ""

psql "$DATABASE_URL" -c "
SELECT
  pl.id                              AS plan_id,
  pl.project_id,
  pl.original_filename,
  pl.extraction_status,
  pl.canonical_fallback_reason,
  pl.canonical_prompt_version,
  CASE WHEN pl.canonicalized_image_path IS NOT NULL THEN 'OUI' ELSE 'NON' END  AS canonical_persisted,
  pl.uploaded_at
FROM vs_plans pl
ORDER BY pl.uploaded_at DESC
LIMIT 5;
"

echo ""
echo "▶ C. Extraction_data du dernier plan (raw JSON GPT-4.1 Vision)"
echo "   Permet de voir si l'IA a retourné des lots ou un objet vide"
echo ""

psql "$DATABASE_URL" -c "
SELECT
  pl.id           AS plan_id,
  pl.project_id,
  pl.original_filename,
  jsonb_pretty(pl.extraction_data::jsonb) AS extraction_data
FROM vs_plans pl
WHERE pl.extraction_data IS NOT NULL
ORDER BY pl.uploaded_at DESC
LIMIT 1;
"

echo ""
echo "▶ D. Lots du dernier projet ayant des plans"
echo ""

psql "$DATABASE_URL" -c "
WITH latest AS (
  SELECT project_id FROM vs_plans ORDER BY uploaded_at DESC LIMIT 1
)
SELECT
  l.id, l.project_id, l.unit_id, l.label, l.floor_number, l.surface, l.source, l.status,
  COUNT(r.id) AS n_rooms
FROM vs_lots l
LEFT JOIN vs_rooms r ON r.lot_id = l.id
WHERE l.project_id = (SELECT project_id FROM latest)
GROUP BY l.id, l.project_id, l.unit_id, l.label, l.floor_number, l.surface, l.source, l.status
ORDER BY l.unit_id, l.id;
"

echo ""
echo "================================================================================"
echo "INTERPRÉTATION"
echo "================================================================================"
echo ""
echo "Section A :"
echo "  - n_plans_done > 0 ET n_lots = 0 → H2 (GPT-4.1 retourne lots vides) ou H3 (INSERT fail)"
echo "  - n_plans_extracting > 0 → H5 (pipeline coincé, timeout)"
echo "  - n_plans_error > 0 → erreur explicite, voir logs Replit"
echo ""
echo "Section B :"
echo "  - canonical_fallback_reason='timeout'/'api_error'/'org_not_verified' → H1"
echo "  - canonical_fallback_reason=NULL ET canonical_persisted=OUI → canonicalisation OK"
echo "  - canonical_prompt_version='1.1' → fix afa382e gpt-image-2 actif"
echo ""
echo "Section C : extraction_data brut"
echo "  - lots: [] vide → H2 (GPT-4.1 ne détecte rien — input image trop dégradé ou prompt KO)"
echo "  - lots: [...] non vide → H3 ou H4 (lot perdu en DB ou rendu UI cassé)"
echo ""
echo "Section D : lots persistés en DB"
echo "  - 0 ligne ET extraction_data.lots non vide → H3 (INSERT fail silencieux)"
echo "  - >0 lignes ET UI vide → H4 (bug frontend rendu)"
echo "================================================================================"
