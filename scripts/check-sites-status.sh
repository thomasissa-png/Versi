#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# check-sites-status.sh — monitoring HTTP des 4 domaines Versi.
#
# Usage :
#   bash scripts/check-sites-status.sh
#   bash scripts/check-sites-status.sh --alert-only   # n'affiche que les KO
#
# Exit code :
#   0 si tous les sites critiques sont OK (200)
#   1 si au moins un site critique est KO (503, timeout, body "DNS cache overflow")
#
# À appeler en local (Thomas) ou en cron externe (UptimeRobot-like).
# Sites critiques : versi.fr, versi-immobilier.fr, versi-invest.fr
# Site non-critique : versi-studio.fr (domaine vitrine non déployé s26)
# ---------------------------------------------------------------------------

set -u

SITES_CRITIQUES=(
  "https://versi.fr"
  "https://versi-immobilier.fr"
  "https://versi-invest.fr"
)
SITES_OPTIONNELS=(
  "https://versi-studio.fr"
)

ALERT_ONLY=0
if [[ "${1:-}" == "--alert-only" ]]; then
  ALERT_ONLY=1
fi

GLOBAL_STATUS=0
TIMESTAMP="$(date -Iseconds)"

check_one() {
  local url="$1"
  local critique="$2"

  # -s silent, -L follow redirects, -m 10 timeout 10s
  # Capture body + status code séparément
  local tmp_body
  tmp_body="$(mktemp)"
  local http_code
  http_code="$(curl -sL -m 10 -o "$tmp_body" -w "%{http_code}" "$url" 2>/dev/null || echo "000")"
  # curl -L concat les codes sur redirects (ex: "301200"), on garde les 3 derniers
  http_code="${http_code: -3}"
  local body_head
  body_head="$(head -c 200 "$tmp_body" 2>/dev/null | tr -d '\n' | head -c 120)"
  rm -f "$tmp_body"

  local verdict
  if [[ "$http_code" == "200" ]]; then
    verdict="OK"
  elif [[ "$http_code" == "000" ]]; then
    verdict="DNS/timeout KO"
  else
    verdict="HTTP $http_code KO"
  fi

  # Détection spécifique "DNS cache overflow" (signature Replit Autoscale KO)
  if [[ "$body_head" == *"DNS cache overflow"* ]]; then
    verdict="Replit proxy KO (DNS cache overflow body)"
    http_code="503"
  fi

  if [[ "$http_code" != "200" ]] && [[ "$critique" == "1" ]]; then
    GLOBAL_STATUS=1
  fi

  if [[ "$ALERT_ONLY" == "1" ]] && [[ "$http_code" == "200" ]]; then
    return
  fi

  printf "[%s] %-30s %s (http=%s)\n" "$TIMESTAMP" "$url" "$verdict" "$http_code"
}

echo "== Versi sites status =="
for url in "${SITES_CRITIQUES[@]}"; do
  check_one "$url" "1"
done
for url in "${SITES_OPTIONNELS[@]}"; do
  check_one "$url" "0"
done

if [[ "$GLOBAL_STATUS" != "0" ]]; then
  echo ""
  echo "ALERTE : au moins un site critique est KO. Vérifier Replit Deployments > Logs."
fi

exit "$GLOBAL_STATUS"
