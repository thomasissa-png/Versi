#!/usr/bin/env bash
# IndexNow Bing — Préparation des 3 fichiers de vérification
#
# USAGE (une seule commande, depuis la racine du repo Versi) :
#   ./scripts/seo/indexnow-prepare.sh
#
# OU si tu as déjà une clé existante :
#   INDEXNOW_KEY=ta_cle_existante ./scripts/seo/indexnow-prepare.sh
#
# Ce que fait le script :
# 1. Génère une clé IndexNow (32 chars hex) si non fournie via env
# 2. Crée les 3 fichiers <KEY>.txt dans src/public/, versi-immobilier/public/,
#    versi-invest-site/public/ (chacun contenant la clé sans retour à la ligne)
# 3. Affiche la commande exacte pour la suite (déploiement + lancement script
#    IndexNow)
#
# Pré-requis : python3 (générateur de clé) — déjà présent partout.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

# Étape 1 — Génération clé (ou réutilisation)
if [ -z "${INDEXNOW_KEY:-}" ]; then
  INDEXNOW_KEY=$(python3 -c "import secrets; print(secrets.token_hex(16))")
  echo "[indexnow-prepare] Nouvelle clé générée : $INDEXNOW_KEY"
else
  echo "[indexnow-prepare] Clé fournie via env : $INDEXNOW_KEY"
fi

# Étape 2 — Dépôt des 3 fichiers <KEY>.txt
SITES=(
  "src/public"
  "versi-immobilier/public"
  "versi-invest-site/public"
)

for site_dir in "${SITES[@]}"; do
  if [ ! -d "$site_dir" ]; then
    echo "[indexnow-prepare] WARN : $site_dir absent, skip"
    continue
  fi
  file_path="$site_dir/$INDEXNOW_KEY.txt"
  echo -n "$INDEXNOW_KEY" > "$file_path"
  echo "[indexnow-prepare] OK : $file_path ($(wc -c < "$file_path") octets)"
done

# Étape 3 — Instructions suite
cat <<EOF

================================================================================
ÉTAPES SUIVANTES
================================================================================

1. Commit + push les 3 fichiers dans leurs repos respectifs :

   cd src && git add public/$INDEXNOW_KEY.txt && \\
     git commit -m "feat(seo): IndexNow verification key" && git push

   cd ../versi-immobilier && git add public/$INDEXNOW_KEY.txt && \\
     git commit -m "feat(seo): IndexNow verification key" && git push

   cd ../versi-invest-site && git add public/$INDEXNOW_KEY.txt && \\
     git commit -m "feat(seo): IndexNow verification key" && git push

2. Redéployer les 3 sites sur Replit (Autoscale) pour que les fichiers .txt
   soient accessibles en HTTPS.

3. Vérifier l'accessibilité (1 site suffit pour valider le pattern) :

   curl -s https://versi.fr/$INDEXNOW_KEY.txt
   # Doit afficher exactement : $INDEXNOW_KEY (sans retour à la ligne)

4. Lancer la soumission IndexNow (depuis cette même machine, pas Replit) :

   INDEXNOW_KEY=$INDEXNOW_KEY node scripts/seo/indexnow-submit.js

5. Conserver la clé dans un secret manager (1Password, Bitwarden) pour les
   futures soumissions — pas besoin d'en regénérer une à chaque fois.

================================================================================
EOF
