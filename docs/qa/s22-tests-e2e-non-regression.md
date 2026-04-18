# Tests E2E non-régression s22

Suite à la session s22 (commits 56c56d7 + 74c0da3), 2 suites E2E Playwright
protègent désormais les régressions signalées par Thomas.

## Tests ajoutés

| Fichier | Retour | Tests | Résultat |
|---|---|---|---|
| `tests/e2e/plan-delete-persistence.spec.ts` | Retour 1 (P1) | 2 | 2/2 PASS [LIVE] |
| `tests/e2e/rooms-canvas-aspect-ratio.spec.ts` | Retour 3 (P0) | 3 | 3/3 PASS [LIVE] |

Total : **5/5 PASS** en ~16s (2e run sans `--update-snapshots` pour valider le match).

## Baseline screenshot produite

- `tests/screenshots/rooms-page-wide-plan.png` (~75 KB) — baseline canvas rooms plein écran desktop 1280×800. Pixel-diff seuil 0.5% détecte tout rognage visuel ultérieur.

## Commande pour rejouer

```bash
cd versi-studio && npx playwright test \
  plan-delete-persistence rooms-canvas-aspect-ratio \
  --project="Desktop Chrome"
```

Pour régénérer la baseline après changement intentionnel : ajouter `--update-snapshots`.

## Blockers corrigés pendant la mission (hors scope initial)

1. **Port mismatch `playwright.config.ts` vs `package.json`** — L205 s21. `baseURL` passait de `localhost:3000` à `localhost:5000` (aligné sur `npm run dev -p 5000`). Sans ce fix, `webServer.url` timeout garanti.
2. **Binaire Playwright chromium manquant** — `npx playwright install chromium` exécuté (browsers pas présents sur la sandbox).
3. **`snapshotPathTemplate` cassé en Playwright 1.59** — le template `tests/screenshots/{arg}` strippait l'extension `.png` de l'argument → erreur bloquante sur TOUS les tests visuels (rooms-visual, upload-visual inclus, pas uniquement la mission s22). Fix : `snapshotPathTemplate: "tests/screenshots/{arg}{ext}"`.

## Limitation documentée

Playwright 1.59 transforme le `/` dans `{arg}` en `-` → impossible de créer des baselines en sous-dossiers via le nom. Les anciens baselines dans `tests/screenshots/{rooms,upload,lots}/*.png` ne seront plus matchés si rooms-visual/upload-visual sont re-exécutés (ils écriront à plat `tests/screenshots/rooms-iphone13-default.png` au lieu de `tests/screenshots/rooms/iphone13-default.png`).

**Options futures** pour réaligner :
- A. Migrer les baselines existantes vers des noms à plat (déplacer `rooms/desktop-default.png` → `rooms-desktop-default.png` et mettre à jour tous les `toHaveScreenshot()`).
- B. Personnaliser `snapshotPathTemplate` par test file (ex : `tests/screenshots/{testFileName}/{arg}{ext}`).

Option A recommandée pour cohérence — brief @fullstack ou @qa future session.

## Fixture absente acceptée

Pas de fixture image 16:9 ajoutée (`tests/fixtures/plan-wide-16-9.png`). Le mock actuel utilise un pixel PNG 1×1 transparent. Le test rooms-canvas-aspect-ratio valide la **structure DOM** (canvas non collapsé, dimensions > 0, ratio dans bornes raisonnables) et baseline pixel-diff. Une vraie image 16:9 permettrait d'asserter le rendu "contain" côté `ctx.drawImage()` via inspection pixel du canvas — enrichissement futur non bloquant.
