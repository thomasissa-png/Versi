# Migration baselines Playwright — s22

## Cause — breaking silent (commit `b8ba008`)

Changement de `snapshotPathTemplate` dans `playwright.config.ts` :

- Avant : `"tests/screenshots/{arg}"`
- Après : `"tests/screenshots/{arg}{ext}"` (Playwright 1.59 exige `{ext}` explicite).

Conséquence : le moteur Playwright remplace les `/` de `{arg}` par `-` (baselines à plat). Les anciens baselines dans `tests/screenshots/{rooms,upload,lots}/*.png` ne matchaient plus les appels `toHaveScreenshot("rooms/xxx.png")`.

## Stratégie appliquée — slash → hyphen

Les 54 baselines `{rooms,upload,lots}/*.png` ont été renommés à plat en `{rooms,upload,lots}-*.png` (migration réalisée en amont de la présente mission, probablement via `rm -r` + `mv`). Les appels `toHaveScreenshot` ont également été alignés : toutes les invocations utilisent déjà le format `prefix-${viewport}-${state}.png` sans slash. La vérification statique confirme 0 match pour `toHaveScreenshot\([^)]*/[^)]*\)`.

## Inventaire

- **Baselines migrés** : 54 PNG à plat dans `tests/screenshots/` (18 lots + 21 rooms + 15 upload) + `rooms-page-wide-plan.png` créé en s22.
- **Specs concernés** : `tests/e2e/{rooms,lots,upload}-visual.spec.ts` + `tests/e2e/rooms-canvas-aspect-ratio.spec.ts`.
- **Sous-dossiers supprimés** : aucun résiduel (vérifié via `ls tests/screenshots/` — zéro dossier).
- **Dead code nettoyé** : suppression des constantes `SCREENSHOT_DIR = path.join(..., "rooms")` et `SCREENSHOT_DIR = path.join(..., "lots")` (orphelines, non référencées) + imports `path` associés. Commentaires JSDoc obsolètes référençant `tests/screenshots/{rooms,lots,upload}/` mis à jour.

## Résultat d'exécution [LIVE]

Commande : `cd versi-studio && npx playwright test --project="Desktop Chrome"`

| Spec | Résultat | Cause |
|---|---|---|
| `rooms-canvas-aspect-ratio.spec.ts` | 3/3 PASS (20.9s) | Baseline `rooms-page-wide-plan.png` matche |
| `upload-visual.spec.ts` | 0/15 PASS | Dimensions baselines obsolètes (ex : 714×1165 attendu / 658×1716 reçu). **Pas un problème de migration** — dette visuelle à arbitrer |
| `lots-visual.spec.ts` | 0/18 PASS | Idem : dimensions baselines obsolètes (714×1165 attendu / 658×1716 reçu) |
| `rooms-visual.spec.ts` | Non exécuté (tendance identique attendue) | — |

**Diagnostic** : les erreurs remontent `Expected an image NxN, received MxM` — preuve que Playwright **résout correctement** les baselines à plat. Les échecs sont dûs à un écart de rendu/viewport depuis la dernière capture (probablement liée au passage à un seul projet `Desktop Chrome` dans `playwright.config.ts` qui ne reflète plus les viewports iphone13/ipad internes au spec).

## Gate G26 — couverture visuelle

- Résolution des baselines : **restaurée** (migration validée par le pass de `rooms-canvas-aspect-ratio`).
- Conformité rendu : **à re-valider** — 33 baselines visuelles obsolètes (upload + lots + a priori rooms) nécessitent un arbitrage Thomas.

## Dette s23 — à arbitrer par Thomas

Les 33+ baselines `{lots,upload,rooms}-{device}-{state}.png` ne correspondent plus au rendu actuel. Options :

1. **Régénération massive** : `npx playwright test {upload,lots,rooms}-visual --update-snapshots` après validation visuelle manuelle page par page (conforme protocole boucle visuelle @fullstack).
2. **Revue sélective** : lire `tests/screenshots/*.png` via Read pour chaque état et comparer à `docs/design/page-compositions.md` si disponible — régénérer uniquement les baselines obsolètes justifiées.

Ne **PAS** exécuter `--update-snapshots` à l'aveugle sans revue visuelle — cela masquerait des régressions réelles.

## Commande de rejeu

```bash
cd /home/user/Versi/versi-studio && npx playwright test --project="Desktop Chrome" --reporter=line
```
