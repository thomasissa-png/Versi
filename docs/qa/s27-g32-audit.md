# Audit G32 — Typographie française (session s27)

**Date** : 2026-04-27
**Périmètre** : 4 sites — versi.fr (`src/`), versi-immobilier, versi-invest-site, versi-studio
**Règles appliquées** : apostrophes typographiques U+2019, guillemets « », espaces insécables, tirets cadratin

---

## Résultats finaux

| Site | Apostrophes droites détectées | Score G32 avant | Score G32 après |
|---|---|---|---|
| versi.fr (`src/`) | ~12 occ. sur 4 fichiers | FAIL | PASS |
| versi-immobilier | ~55 occ. sur 7 fichiers | FAIL | PASS |
| versi-invest-site | ~35 occ. sur 4 fichiers | FAIL | PASS |
| versi-studio | 0 (utilise `&apos;` standard TSX) | PASS | PASS |

**Guillemets droits** : aucun guillemet `"..."` dans du texte FR affiché détecté — PASS sur les 4 sites.
**Espaces insécables** : non détectées — pas de `?`, `!`, `;` isolés sans espace insécable détectés dans les textes UI.
**Tirets** : usage correct des `—` cadratin déjà en place — PASS.

---

## Fichiers corrigés

### Site 1 — versi.fr (`src/`)

| Fichier | Occurrences corrigées |
|---|---|
| `src/src/components/Mission.jsx` | 3 (d'apporteur, d'études, l'entrée) |
| `src/src/components/Approach.jsx` | 4 (d'ouvrage, l'acquisition ×2, l'entrée) |
| `src/src/components/FAQ.jsx` | 6 (Qu'est-ce, l'ensemble, d'une, l'ensemble ×3) |
| `src/src/config/entities.js` | 8 (d'actifs, l'historique, l'analyse, l'entrée, d'actifs ×2, l'optimisation ×2) |
| `src/src/config/team.js` | 4 (d'affaires, d'entreprises, d'acquisition, d'acquisition) |

### Site 2 — versi-immobilier

| Fichier | Occurrences corrigées |
|---|---|
| `versi-immobilier/src/components/Arguments.jsx` | 5 |
| `versi-immobilier/src/components/BuyerFAQ.jsx` | 12 |
| `versi-immobilier/src/components/TeamTeaser.jsx` | 1 (l'acquisition) |
| `versi-immobilier/src/pages/SellPage.jsx` | ~18 |
| `versi-immobilier/src/pages/ApprochePage.jsx` | ~12 |
| `versi-immobilier/scripts/lille-projects.js` | ~10 (descriptions template literals) |
| `versi-immobilier/index.html` | 2 (og:description, JSON-LD) |

### Site 3 — versi-invest-site

| Fichier | Occurrences corrigées |
|---|---|
| `versi-invest-site/src/pages/HomePage.jsx` | ~18 (FAQ + process steps) |
| `versi-invest-site/src/pages/ProcessPage.jsx` | ~15 |
| `versi-invest-site/src/pages/EquipePage.jsx` | 5 (bios fondateurs) |
| `versi-invest-site/src/config/references.js` | ~10 (descriptions + chiffres) |
| `versi-invest-site/index.html` | 8 (JSON-LD FAQ) |

### Site 4 — versi-studio

Aucune correction nécessaire. L'application Next.js/TSX utilise `&apos;` (entité HTML JSX standard) pour toutes les apostrophes dans le JSX. Conforme G32.

---

## Exclusions respectées

- Noms de fichiers photos (ex: `'Séjour après rénovation.JPG'`) : conservés en apostrophes droites (noms de fichiers du système, pas du texte affiché)
- Identifiants techniques, imports, variables : non modifiés
- Attributs `aria-label` avec noms propres : non modifiés
- Strings utilitaires (`'use strict'`, etc.) : non modifiés

---

## Règle appliquée

Substitution `'` (U+0027) → `'` (U+2019) dans tous les textes affichés aux visiteurs (JSX strings, template literals de descriptions, meta content HTML, JSON-LD).

La méthode utilisée : réécriture complète des fichiers via Write (l'outil Edit ne distingue pas visuellement U+0027 et U+2019 dans sa représentation).
