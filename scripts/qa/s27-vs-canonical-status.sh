#!/usr/bin/env bash
# s27 — Diagnostic du pipeline canonicalisation Versi Studio
#
# USAGE (depuis le shell Replit du Repl versi-studio) :
#   bash scripts/qa/s27-vs-canonical-status.sh
#
# OU si tu n'es pas sur Replit, exporter DATABASE_URL d'abord :
#   DATABASE_URL=postgres://... bash scripts/qa/s27-vs-canonical-status.sh
#
# But : trancher en 5 secondes l'hypothèse H1 vs H2 de l'audit @ia
#       (cf. docs/ia/s27-vs-pipeline-audit.md section C).
#
# Lecture des résultats :
# - Si "org_not_verified" ou "api_error" ≥ 60% des lignes → H2 confirmée
#   → canonicalisation tombe systématiquement en fallback, le pipeline
#     tourne sur le PDF brut. Fix = activer pipeline sharp local
#     (commit @ia v3) OU désactiver VS_PLAN_CANONICALIZE.
# - Si "success" ≥ 80% et plaintes persistent → H1 confirmée
#   → gpt-image-1 réussit mais réinvente la géométrie. Fix = remplacer
#     gpt-image-1 par sharp local par défaut.
# - Si "gate_fail" dominant → variante H1, gates G1-G4 attrapent les
#   mauvais canonicals.

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERREUR : variable d'environnement DATABASE_URL absente."
  echo "Sur Replit, elle est auto-injectée. Sinon : export DATABASE_URL=postgres://..."
  exit 1
fi

echo "================================================================================"
echo "DIAGNOSTIC CANONICALISATION VERSI STUDIO — s27"
echo "================================================================================"
echo ""
echo "Distribution des plans par statut canonicalisation (7 derniers jours) :"
echo ""

psql "$DATABASE_URL" -c "
SELECT
  COALESCE(canonical_fallback_reason, 'success') AS reason,
  canonical_prompt_version,
  COUNT(*)                                       AS n_plans,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM vs_plans
WHERE (canonicalized_at IS NOT NULL OR canonical_fallback_reason IS NOT NULL)
  AND uploaded_at > NOW() - INTERVAL '7 days'
GROUP BY canonical_fallback_reason, canonical_prompt_version
ORDER BY n_plans DESC;
"

echo ""
echo "================================================================================"
echo "INTERPRÉTATION (cf. docs/ia/s27-vs-pipeline-audit.md) :"
echo "  - reason='org_not_verified' dominant → org OpenAI non vérifiée → vérifier"
echo "    https://platform.openai.com/settings/organization/general (badge KYC)"
echo "  - reason='timeout' ou 'api_error' dominant → réseau ou API instable"
echo "  - reason='gate_fail' dominant → canonical médiocre, gates G1-G4 le rejettent"
echo "  - reason='success' avec plaintes → gpt-image-1 réinvente la géométrie (H1)"
echo "================================================================================"
