# Audit `route.continue()` — résidu versi-s18 P6

**Date** : 2026-04-16
**Branche** : `claude/versi-s19-visuels-autopilot-K7mQr`
**Référence learning** : versi-s18 P6 — `route.continue()` part au RÉSEAU RÉEL (pas au mock suivant). Pour chaîner des handlers `page.route()`, utiliser `route.fallback()`.

## Synthèse

| Spec | Occurrences | Remplacées | Conservées | À arbitrer |
|---|---|---|---|---|
| `lots-visual.spec.ts` | 0 | 0 | 0 | 0 |
| `rooms-visual.spec.ts` | 0 | 0 | 0 | 0 |
| `workflow.spec.ts` | 8 | 1 | 5 | 2 |
| `pages.spec.ts` | 4 | 0 | 4 | 0 |
| `upload-visual.spec.ts` | 2 | 0 | 2 | 0 |
| `upload-p0.spec.ts` (déjà touché s18) | 3 | 0 | 1 | 2 |
| **TOTAL** | **17** | **1** | **12** | **4** |

**Verdict** : 1 correction appliquée sur `workflow.spec.ts:541`. 12 occurrences conservées (pas de chaîne de mocks — `continue()` sur méthode non-prévue acceptable). 4 cas ambigus marqués À ARBITRER (chaînes existantes non bloquantes mais potentiellement risquées).

## Analyse par occurrence

| Spec | Ligne | Contexte (1 phrase) | Décision | Justification |
|---|---|---|---|---|
| `workflow.spec.ts` | 75 | Helper `mockAllApiRoutes` route `/projects` (else après GET/POST) | CONSERVER | Route unique sur `**/api/vs/projects` — pas de chaîne, méthode autre que GET/POST jamais appelée |
| `workflow.spec.ts` | 93 | Helper `mockAllApiRoutes` route `/projects/[id]` (else après GET/PATCH) | CONSERVER | Route unique, méthodes DELETE/OPTIONS jamais testées |
| `workflow.spec.ts` | 111 | Helper `mockAllApiRoutes` route `/projects/[id]/plans` (else après GET/POST) | CONSERVER | Route unique dans le helper, méthodes non-prévues jamais émises |
| `workflow.spec.ts` | 132 | Helper `mockAllApiRoutes` route `/projects/[id]/lots` (else après GET/POST) | CONSERVER | Route unique, idem |
| `workflow.spec.ts` | 178 | Helper `mockAllApiRoutes` boucle `/lots/[id]/rooms` (else après GET/POST) | CONSERVER | Route unique par lotId, pas de chaîne |
| `workflow.spec.ts` | 314 | Test "suppression plan" : route `/plans` GET avant `mockAllApiRoutes` | À ARBITRER | Chaîne existe (mockAllApiRoutes ligne 331 enregistre une route concurrente APRÈS, invoquée en premier par LIFO). Test passe car méthode autre que GET non émise |
| `workflow.spec.ts` | 327 | Test "suppression plan" : route `/plans/*` DELETE avant `mockAllApiRoutes` | À ARBITRER | Idem ci-dessus, méthode autre que DELETE non émise |
| `workflow.spec.ts` | 541 | Test "erreur POST plan" : override POST 500 APRÈS `mockAllApiRoutes` | **REMPLACER** | Chaîne nette : sur GET, doit déléguer au helper (POST → 500, GET → liste vide) |
| `pages.spec.ts` | 77 | Helper `mockAllApiRoutes` route `/projects` (else après GET/POST) | CONSERVER | Route unique, idem workflow.spec |
| `pages.spec.ts` | 96 | Helper `mockAllApiRoutes` route `/projects/[id]` (else après GET/PATCH) | CONSERVER | Route unique |
| `pages.spec.ts` | 121 | Helper `mockAllApiRoutes` route `/projects/[id]/plans` (else après GET/POST) | CONSERVER | Route unique |
| `pages.spec.ts` | 309 | Test "Operation introuvable" route wildcard `/projects/**` (else après GET 404) | CONSERVER | Test négatif : seul GET émis, pas de chaîne avec ligne 313 (URL différente `*/plans`) |
| `upload-visual.spec.ts` | 76 | Helper route `/projects/[id]` (else après GET/PATCH) | CONSERVER | Route unique |
| `upload-visual.spec.ts` | 120 | Helper route `/projects/[id]/plans` (else après GET) | CONSERVER | Route unique |
| `upload-p0.spec.ts` | 64 | Helper `mockProjectAndPlansGet` route `/projects/[id]` | À ARBITRER | Helper est PREMIÈRE route enregistrée, donc DERNIER appelé via fallback. `continue()` ici sort au réseau réel (acceptable car aucun test n'émet PATCH/DELETE sur cette URL) |
| `upload-p0.spec.ts` | 76 | Helper `mockProjectAndPlansGet` route `/projects/[id]/plans` | À ARBITRER | Idem ligne 64 — pattern défensif possible si un futur wildcard `**/*` est ajouté en amont |
| `upload-p0.spec.ts` | 297 | Test P0-T5 route `/extract` (early return sur méthode != POST) | CONSERVER | Route unique sur `/extract`, méthode != POST jamais émise |

## Edits appliqués

- `versi-studio/tests/e2e/workflow.spec.ts:541` → `route.continue()` remplacé par `route.fallback()` + commentaire explicatif (référence learning versi-s18 P6).

## Vérification post-edit

- `npx playwright test --list` : SKIP — `node_modules` Playwright absent dans le sandbox (`MODULE_NOT_FOUND`).
- `npx tsc --noEmit` : exécuté, aucune erreur TypeScript spécifique à `workflow.spec.ts` après l'edit (seules erreurs : modules `next`, `@playwright/test` introuvables — pré-existantes, dépendances non installées).
- L'API `Route.fallback()` existe officiellement dans Playwright (signature : `route.fallback(options?)`). Modification syntaxique valide.

## Handoff

**Recommandation** : **re-run E2E recommandé** sur `workflow.spec.ts` (le test "POST /plans erreur 500" ligne 528+ pourrait avoir un comportement différent si jamais une assertion vérifiait que la liste des plans s'affiche vide).

Pour les 4 cas À ARBITRER :
- `workflow.spec.ts:314,327` : risque résiduel si un futur test ajoute un override sur la même URL avec une méthode HTTP supplémentaire. Recommandation @qa : remplacer en pattern défensif (`fallback()`) lors de la prochaine session de maintenance.
- `upload-p0.spec.ts:64,76` : helpers `mockProjectAndPlansGet` — pattern défensif souhaitable mais non bloquant. À traiter dans le même sweep que `mockAllApiRoutes`.

**Impact à confirmer** : aucun test ne devrait régresser sur `workflow.spec.ts` (l'edit ne change le comportement que pour les méthodes GET/PATCH/DELETE émises sur `/plans` durant ce test, qui ne sont pas testées explicitement). Risque = quasi nul.

---

**Handoff → @orchestrator**
- Fichiers modifiés : `versi-studio/tests/e2e/workflow.spec.ts` (1 occurrence)
- Fichiers audités sans modification : `lots-visual.spec.ts`, `rooms-visual.spec.ts`, `pages.spec.ts`, `upload-visual.spec.ts`, `upload-p0.spec.ts`
- Décisions : 1 remplacement net, 12 conservations, 4 à arbitrer (pattern défensif optionnel)
- Points d'attention : re-run `workflow.spec.ts` recommandé pour valider non-régression sur le test "POST /plans erreur 500"
