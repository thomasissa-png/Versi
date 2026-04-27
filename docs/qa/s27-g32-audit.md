# Audit G32 — Typographie française (session s27)

**Date** : 2026-04-27
**Périmètre** : 4 sites — versi.fr (`src/`), versi-immobilier, versi-invest-site, versi-studio
**Règles** : apostrophes typographiques U+2019, guillemets « », espaces insécables, tirets cadratin

---

## Synthèse

| Site | Apostrophes droites | Guillemets droits | Espaces manquantes | Score G32 |
|---|---|---|---|---|
| versi.fr (`src/`) | FAIL — 12 occ. | PASS | PASS | FAIL |
| versi-immobilier | FAIL — 38 occ. | PASS | PASS | FAIL |
| versi-invest-site | EN COURS | — | — | — |
| versi-studio | EN COURS | — | — | — |

---

## SITE 1 — versi.fr (`src/`)

### FAIL : apostrophes droites dans texte affiché

| Fichier | Ligne | Texte fautif |
|---|---|---|
| `src/src/components/Mission.jsx` | 23 | `d'apporteur d'affaires`, `d'études`, `l'entrée` → apostrophes droites dans JSX string |
| `src/src/components/Approach.jsx` | 18 | `Maîtrise d\'ouvrage en direct` |
| `src/src/components/Approach.jsx` | 23 | `dès l\'acquisition`, `dès l\'entrée` |
| `src/src/config/entities.js` | 13 | `d\'actifs résidentiels`, `l\'historique complet` |
| `src/src/config/entities.js` | 22 | `l\'analyse`, `la structuration`, `l\'entrée` |
| `src/src/config/team.js` | 22 | `d\'affaires`, `d\'entreprises` |
| `src/src/config/team.js` | 32 | `d\'acquisition B2B` |

**Nb total occurrences estimées** : ~12

---

## SITE 2 — versi-immobilier

### FAIL : apostrophes droites dans texte affiché

| Fichier | Ligne | Occurrences |
|---|---|---|
| `versi-immobilier/src/components/Arguments.jsx` | 8 | `d\'intermédiaire`, `l\'historique`, `l\'acquéreur` (×3) |
| `versi-immobilier/src/components/Arguments.jsx` | 12 | `l\'acquéreur` |
| `versi-immobilier/src/components/Arguments.jsx` | 18 | `l\'acquéreur` |
| `versi-immobilier/src/components/BuyerFAQ.jsx` | 9 | `Qu\'est-ce qu\'un`, `l\'historique`, `d\'agence`, `l\'acquéreur` (×8) |
| `versi-immobilier/src/pages/SellPage.jsx` | 18–71 | ~15 occ. : `l\'estimation`, `n\'attendez`, `l\'équipe`, `d\'agence`, etc. |
| `versi-immobilier/src/pages/ApprochePage.jsx` | 20–71 | ~10 occ. : `l\'équipe`, `d\'affaires`, `d\'acquisition`, etc. |

**Nb total occurrences estimées** : ~38

---

## SITES 3 & 4 — versi-invest-site et versi-studio

> Audit en cours — voir sections ajoutées après lecture.

---

## Règle de correction appliquée

- `\'` → `'` (U+2019) dans tous les textes affichés (JSX strings, template literals)
- `'` seul (apostrophe droite isolée dans du texte) → `'` (U+2019)
- Exclusions respectées : imports, noms de variables, attributs techniques, URLs

---

## Statut final (à compléter post-corrections)

- [ ] versi.fr : corrections appliquées
- [ ] versi-immobilier : corrections appliquées
- [ ] versi-invest-site : audit + corrections
- [ ] versi-studio : audit + corrections
- [ ] Build PASS sur chaque site touché
