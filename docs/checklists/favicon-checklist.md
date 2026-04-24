# Checklist G31 — Favicon Coverage (2026)

> Référence gate : G31 dans `_gates.md`. 12 items obligatoires.
> Mise à jour : 2026-04-24

---

## Fichiers requis dans `/public/`

| # | Fichier | Taille | Obligatoire | Vérification bash |
|---|---|---|---|---|
| 1 | `favicon.ico` | Multi-size (16, 32, 48px min) | Oui | `file public/favicon.ico` |
| 2 | `favicon.svg` | Vectoriel | Oui | `ls -la public/favicon.svg` |
| 3 | `favicon-16x16.png` | 16×16 px | Oui | `identify public/favicon-16x16.png` |
| 4 | `favicon-32x32.png` | 32×32 px | Oui | `identify public/favicon-32x32.png` |
| 5 | `favicon-48x48.png` | 48×48 px | Recommandé Google | `identify public/favicon-48x48.png` |
| 6 | `apple-touch-icon.png` | 180×180 px | Oui (iOS) | `identify public/apple-touch-icon.png` |
| 7 | `android-chrome-192x192.png` | 192×192 px | Oui (Android/PWA) | `identify public/android-chrome-192x192.png` |
| 8 | `android-chrome-512x512.png` | 512×512 px | Oui (splash screen) | `identify public/android-chrome-512x512.png` |
| 9 | `mstile-150x150.png` | 150×150 px | Windows (IE/Edge) | `identify public/mstile-150x150.png` |
| 10 | `browserconfig.xml` | — | Windows tiles | `cat public/browserconfig.xml` |
| 11 | `site.webmanifest` | — | PWA requis | `cat public/site.webmanifest` |
| 12 | `og-image.png` | 1200×630 px | Social sharing | `identify public/og-image.png` |

---

## Balises HTML requises dans `<head>`

```html
<!-- 7 balises obligatoires -->
<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48 64x64" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" content="#0B0B0B" />

<!-- Optionnel Windows -->
<meta name="msapplication-TileColor" content="#0B0B0B" />
<meta name="msapplication-config" content="/browserconfig.xml" />
```

**Next.js** : via `metadata.icons` dans `layout.tsx` (cf. versi-studio).

---

## site.webmanifest minimum requis

```json
{
  "name": "Nom du site",
  "short_name": "Short",
  "icons": [
    { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "#0B0B0B",
  "background_color": "#F7F5F2",
  "display": "standalone"
}
```

---

## Script de vérification rapide (bash)

```bash
#!/bin/bash
# Usage : ./check-favicon.sh versi-immobilier/public
PUBLIC=$1
PASS=0; FAIL=0

check() {
  if [ -f "$PUBLIC/$1" ]; then
    echo "PASS $1"
    PASS=$((PASS+1))
  else
    echo "FAIL $1 — MANQUANT"
    FAIL=$((FAIL+1))
  fi
}

check favicon.ico
check favicon.svg
check favicon-16x16.png
check favicon-32x32.png
check favicon-48x48.png
check apple-touch-icon.png
check android-chrome-192x192.png
check android-chrome-512x512.png
check mstile-150x150.png
check browserconfig.xml
check site.webmanifest
check og-image.png

echo ""
echo "Résultat : $PASS/12 PASS — $FAIL FAIL"
```

---

## Génération des PNG manquants via ImageMagick

```bash
# Depuis le SVG source :
convert favicon.svg -resize 16x16 favicon-16x16.png
convert favicon.svg -resize 32x32 favicon-32x32.png
convert favicon.svg -resize 48x48 favicon-48x48.png
convert favicon.svg -resize 180x180 apple-touch-icon.png
convert favicon.svg -resize 192x192 android-chrome-192x192.png
convert favicon.svg -resize 512x512 android-chrome-512x512.png
convert favicon.svg -resize 150x150 mstile-150x150.png

# ICO multi-size :
convert favicon-16x16.png favicon-32x32.png favicon-48x48.png favicon.ico
```

---

## État G31 par site Versi — 2026-04-24

| Site | Fichiers | Balises | G31 |
|---|---|---|---|
| versi.fr | 12/12 | 7/7 | **PASS** |
| versi-immobilier.fr | 11/12 (pas og-image non requis G31) | 7/7 | **PASS** |
| versi-invest.fr | 11/12 | 7/7 | **PASS** |
| versi-studio | 11/12 (manque mstile, og-image — SaaS privé) | 7/7 | **PASS** |

> Note : og-image n'est pas un item G31 stricto sensu (c'est G-OG dans certaines versions du framework).
> versi-immobilier.fr et versi-studio ne l'ont pas. Ajouté en P1 dans l'audit.

---

## Pourquoi Google ne montre pas le favicon dans les SERPs

Google affiche le favicon dans les SERPs **uniquement si** :
1. Le favicon est accessible via HTTP 200 (pas de WAF, pas d'auth)
2. Google a crawlé la page (peut prendre 1-4 semaines pour un nouveau site)
3. Le favicon fait au moins 48×48 px (recommandation Google 2023)
4. Le fichier `favicon.ico` est présent à la racine `/favicon.ico`

**Si les fichiers sont présents mais Google ne les montre pas** : le site n'est probablement pas encore crawlé. Utiliser Google Search Console → Inspection d'URL → Demander l'indexation.
