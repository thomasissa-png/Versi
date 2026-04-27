#!/usr/bin/env bash
# s27 — Diagnostic Étape 2 vide (Versi Studio) — VERSION CORRIGÉE
#
# Schéma DB réel (cf. versi-studio/src/lib/vs/db.ts) :
# - vs_projects(id, adresse, type_bien, surface_totale, status, archived_at, created_at, updated_at)
# - vs_plans(id, project_id, file_path, mime_type, floor_number, original_filename,
#            extraction_data, extraction_status IN ('pending','processing','done','failed'),
#            m2_per_pixel, canonicalized_image_path, canonicalized_at,
#            canonical_fallback_reason, canonical_prompt_version, created_at)
# - vs_lots(id, project_id, name, floor_number, surface_m2, zone_data,
#           status IN ('suggested','validated','overlap_error'), source IN ('ai','manual'),
#           confidence_avg, created_at)
# - vs_rooms(id, lot_id, plan_id, name, ...)
#
# USAGE :
#   bash scripts/qa/s27-vs-step2-diagnostic.sh

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
  p.adresse,
  p.status,
  COUNT(DISTINCT pl.id)                           AS n_plans,
  COUNT(DISTINCT pl.id) FILTER (WHERE pl.extraction_status = 'done')        AS n_plans_done,
  COUNT(DISTINCT pl.id) FILTER (WHERE pl.extraction_status = 'processing')  AS n_plans_processing,
  COUNT(DISTINCT pl.id) FILTER (WHERE pl.extraction_status = 'failed')      AS n_plans_failed,
  COUNT(DISTINCT l.id)                            AS n_lots,
  p.created_at
FROM vs_projects p
LEFT JOIN vs_plans pl ON pl.project_id = p.id
LEFT JOIN vs_lots  l  ON l.project_id = p.id
GROUP BY p.id, p.adresse, p.status, p.created_at
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
  pl.created_at
FROM vs_plans pl
ORDER BY pl.created_at DESC
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
  jsonb_pretty(pl.extraction_data) AS extraction_data
FROM vs_plans pl
WHERE pl.extraction_data IS NOT NULL
ORDER BY pl.created_at DESC
LIMIT 1;
"

echo ""
echo "▶ D. Lots du dernier projet ayant des plans"
echo ""

psql "$DATABASE_URL" -c "
WITH latest AS (
  SELECT project_id FROM vs_plans ORDER BY created_at DESC LIMIT 1
)
SELECT
  l.id, l.project_id, l.name, l.floor_number, l.surface_m2, l.source, l.status, l.confidence_avg,
  COUNT(r.id) AS n_rooms
FROM vs_lots l
LEFT JOIN vs_rooms r ON r.lot_id = l.id
WHERE l.project_id = (SELECT project_id FROM latest)
GROUP BY l.id, l.project_id, l.name, l.floor_number, l.surface_m2, l.source, l.status, l.confidence_avg
ORDER BY l.floor_number, l.name, l.id;
"

echo ""
echo "================================================================================"
echo "INTERPRÉTATION"
echo "================================================================================"
echo ""
echo "Section A :"
echo "  - n_plans_done > 0 ET n_lots = 0 → H2 (GPT-4.1 retourne lots vides) ou H3 (INSERT fail)"
echo "  - n_plans_processing > 0 → H5 (pipeline coincé, timeout)"
echo "  - n_plans_failed > 0 → erreur explicite, voir logs Replit"
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
