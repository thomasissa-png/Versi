# S23 P3 — Tests E2E mobile touch/pinch RoomCanvas (Playwright)

**Session** : versi-s23 (P3 — automatisation des tests mobile)
**Branche** : `claude/versi-s23-ocr-mobile-baselines-0eLFE`
**Agent** : @qa
**Statut** : 6/6 PASS (25.0s) — [LIVE]

---

## Contexte

L'implémentation touch/pinch mobile de `RoomCanvas` livrée en s23 P3 (commit `f455ad8`) utilise l'API Pointer Events unifiée (souris + tactile dans les mêmes handlers). La procédure de test manuel (`docs/qa/s23-touch-pinch-mobile-roomcanvas.md`) repose sur Chrome DevTools device emulation ou ngrok sur device réel — pas reproductible en CI.

P3 automatise cette couverture via Playwright + émulation `Pixel 7` + CDP `Input.dispatchTouchEvent` pour le multi-touch.

---

## Livrables

| Fichier | Nature |
|---|---|
| `versi-studio/playwright.config.ts` | Ajout project `Pixel 7` (testMatch strict : `s23-touch-pinch-*.spec.ts`) |
| `versi-studio/tests/e2e/s23-touch-pinch-roomcanvas.spec.ts` | 6 tests comportementaux (T1–T6) |
| `docs/qa/s23-tests-e2e-mobile-touch-pinch.md` | Ce document |

---

## Matrice des tests

| # | Nom | Scénario | Observable | Statut |
|---|---|---|---|---|
| T1 | single-touch pan | 1 doigt qui bouge de 80×40px sur le canvas | bouton reset reste invisible (scale inchangé) | PASS |
| T2 | pinch zoom in | 2 doigts qui s'écartent 40px → 300px (ratio 7.5×) | bouton reset devient visible (scale > 1.05) | PASS |
| T3 | pinch zoom out après zoom in | zoom in puis zoom out 300px → 40px | bouton reset redevient invisible (scale clampé à 1) | PASS |
| T4 | tap sur bouton reset | pinch zoom in puis clic sur "Réinitialiser le zoom" | bouton disparaît (scale = 1) | PASS |
| T5 | borne `ZOOM_MAX` | pinch extrême 20px → 500px (ratio 25×) | bouton reset visible + pas de crash (clampé à 8×) | PASS |
| T6 | borne `ZOOM_MIN` | pinch out extrême depuis scale=1 | bouton reset reste invisible (clampé à 1×) | PASS |

Résultat : `6 passed (25.0s)` — exécuté avec `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers npx playwright test tests/e2e/s23-touch-pinch-roomcanvas.spec.ts --project="Pixel 7"`.

---

## Choix d'implémentation — pourquoi CDP et pas `page.touchscreen`

Playwright 1.59 expose `page.touchscreen.tap(x, y)` mais **pas** de `pinch(...)` natif. Les issues upstream (notamment [microsoft/playwright#2903](https://github.com/microsoft/playwright/issues/2903) pour l'API gesture dédiée) sont ouvertes depuis plusieurs années sans merge. Pour dispatcher 2 pointers simultanés on a 3 options :

1. **`CDPSession.send('Input.dispatchTouchEvent', ...)`** — natif multi-touch, supporté uniquement par Chromium (CDP = Chrome DevTools Protocol). **Retenu.**
2. `page.evaluate(() => dispatchEvent(new PointerEvent(...)))` — contourne le navigateur, ne teste pas le vrai pipeline Pointer Events.
3. Appium / WebdriverIO avec vrais devices. Lourd pour CI, pertinent en s24+ pour Safari Mobile (WebKit).

Implication : **la suite s23 P3 tourne uniquement sur Chromium Pixel 7 émulé** — pas sur iPhone 13 / WebKit. Le code RoomCanvas utilise Pointer Events standards, donc le comportement devrait être identique sur Safari iOS, mais ce n'est **pas vérifié par ces tests**.

---

## Choix d'implémentation — signal observable du scale

Le viewport du canvas (scale, offsetX, offsetY) est appliqué DANS le context 2D via `ctx.scale()` + `ctx.translate()` (cf `RoomCanvas.tsx` L268-269), pas en CSS transform sur le DOM. Conséquence : **impossible de lire le scale depuis le DOM** (ni via `element.style.transform`, ni via bounding box).

Signal observable utilisé : **le bouton "Réinitialiser la vue"** qui affiche/masque via `display: scale > 1.05 ? 'block' : 'none'` (RoomCanvas L671-674). Donc :
- `bouton visible` ⇔ `scale > 1.05`
- `bouton invisible` ⇔ `scale <= 1.05`

Limitation assumée : on ne valide pas la **valeur exacte** du scale final. T5 vérifie "scale > 1.05 + pas de crash" mais pas "scale = 8 exactement". Pour valider le clamp précis il faudrait exposer le state via `data-scale` sur le canvas ou via un `window.__roomCanvasDebug` de test. **Non implémenté en s23 P3** — jugé suffisant pour couvrir les régressions fonctionnelles (pan ne zoom pas, pinch zoom change le scale, clamp empêche l'explosion/l'inversion).

---

## Pièges rencontrés (documentés pour s24+)

### 1. Ordre d'enregistrement des `page.route()` — LIFO

Playwright évalue les handlers de routes dans l'ordre **inverse** d'enregistrement (dernière enregistrée = première testée). Un fallback `**/api/vs/**` enregistré **après** les routes spécifiques les shadow toutes → toutes les APIs retournent 404 "Mock not found".

**Pattern correct** : enregistrer le fallback 404 **en premier**, puis les routes spécifiques (qui prennent précédence).

### 2. `test.use({...devices})` dans un `describe` — interdit

```
Cannot use({ defaultBrowserType }) in a describe group, because it forces a new worker.
```

**Solution** : appliquer les device settings au niveau `project` dans `playwright.config.ts`, pas dans `test.use()` à l'intérieur d'un `describe`.

### 3. `CDPSession` partagée — OBLIGATOIRE entre touchStart/Move/End

Créer une nouvelle `CDPSession` sur chaque appel CDP casse l'état interne du touch dispatcher :

```
Protocol error (Input.dispatchTouchEvent): Must send a TouchStart first to start a new touch.
```

**Pattern correct** : créer **une** session par test (`await page.context().newCDPSession(page)`), la réutiliser pour toutes les séquences touchStart/Move/End.

---

## Scope explicite

- Pas de modification `RoomCanvas.tsx` (livré s23 P3, intact)
- Pas de baseline visuelle ajoutée (ces tests sont comportementaux, pas visuels)
- Les baselines Desktop Chrome existantes (`tests/screenshots/`) sont inchangées (project `Pixel 7` utilise `testMatch` strict → pas de collision de nom de screenshot)
- `tsc --noEmit` PASS (0 erreur)

---

## Recommandations s24+

1. **Safari Mobile (WebKit)** : CDP étant Chromium-only, aucune couverture iOS Safari. Options : (a) Appium + real devices, (b) BrowserStack Automate, (c) écrire un fallback `page.evaluate` dispatching PointerEvents directement (moins fidèle au vrai pipeline natif).
2. **Validation du scale exact** : exposer `data-scale` sur le canvas (test-only attr derrière une env `NEXT_PUBLIC_VS_E2E=1`) pour que T5/T6 puissent asserter `scale === 8` et `scale === 1` au pixel près.
3. **Test drag pièce** : non couvert en s23 P3 (focus pan + pinch). En s24, ajouter T7 "drag une pièce sur le canvas → coord persistées via PATCH /api/vs/rooms/*".
4. **Test inertie / double-tap to zoom** : si implémentés en s24 (cf "Limitations connues" du doc s23-touch-pinch-mobile), ajouter T8/T9.

---

## Fichiers modifiés

```
versi-studio/playwright.config.ts            (+15 / project Pixel 7)
versi-studio/tests/e2e/s23-touch-pinch-roomcanvas.spec.ts  (NEW, 441 lignes)
docs/qa/s23-tests-e2e-mobile-touch-pinch.md  (NEW)
```
