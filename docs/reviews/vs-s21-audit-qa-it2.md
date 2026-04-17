# Audit QA versi-s21 -- Iteration 2

## Note globale : 8.8 / 10 (vs 5.8 en it1)

## Tableau 5 criteres

| # | Critere | Note /10 it1 -> it2 | P0 resolus | P0 residuels |
|---|---|---|---|---|
| 1 | Code quality | 7 -> 9 | U2, I1, I3 corrigees proprement | 0 |
| 2 | Test coverage | 3 -> 9 | P0-1 (28 cas Vitest), P0-2 (flaky fix) | 0 |
| 3 | Gates binaires | 5 -> 9 | G27 matrice 21/22 AC mappees | 0 |
| 4 | Edge cases | 5 -> 9 | P0-4 split :: (I1), P0-5 suffixe #N (I2), P0-6 bbox fallback (I3) | 0 |
| 5 | Pipeline CI | 6 -> 8 | 28 tests Vitest executables, E2E non flaky | P1 residuel route.continue() |

## P0 resolus depuis iteration 1

**P0-1 (I4) -- Tests unitaires Vitest** : RESOLU. 28 cas dans `clustering.test.ts` couvrant les 5 helpers. Factory `makeRoom()` propre, edge cases U2/I1/I2/I3/I10 tous couverts. Qualite des assertions correcte -- chaque test verifie un comportement precis.

**P0-2 (I8) -- waitForTimeout flaky** : RESOLU. Ligne 333 remplacee par `expect(() => {...}).toPass({ timeout: 5000 })`. Pattern correct.

**P0-3 (I9) -- Gate G27 matrice tracabilite** : RESOLU. Matrice ajoutee dans TESTING.md : 18/18 AC pour US-VS-21, 3/4 pour US-VS-22 (AC-22 "undo" en attente Bundle B). Le 1 AC manquant est documente et justifie.

**P0-4 (I1) -- Split "::" fragile** : RESOLU. `clusterByUnit` utilise desormais un `Map<number, Map<string, ExtractedRoom[]>>` (nested map floor -> unitId). Plus aucun split de string. Test unitaire confirme que `unit_id = "A::B"` est gere correctement.

**P0-5 (I2) -- Suffixe 3+ lots** : RESOLU. `generateLotName` accepte `positionIndex` et `totalOnFloor`. Si >= 3, suffixe `#N` par position X croissante. Route.ts trie par `computeAvgX` avant nommage. Test unitaire couvre le cas 3 lots.

**P0-6 (I3) -- Bbox negative** : RESOLU. Guard `if (maxX <= minX || maxY <= minY)` retourne fallback plein cadre `{0,0,100,100}`. Test unitaire couvre le cas 0 bbox.

## P0 residuels

Aucun. Les 6 P0 de l'iteration 1 sont tous resolus.

## P1 residuels

**P1-1 (non corrige) -- Double insensibilite `countHabitableRooms`** : `nameLC = r.name_raw.toLowerCase()` puis regex `/i` sur `nameLC`. Redondant, pas un bug, mais code impur. Impact : zero. Correction triviale.

**P1-6 (non corrige) -- `route.continue()` en fallback E2E** : 3 occurrences (lignes 171, 256, 323). En CI sans backend, ces requetes partent au reseau reel et echouent. Devrait etre `route.fulfill({ status: 404 })` ou `route.fallback()`. Impact : E2E flaky en CI headless. Ce P1 devient quasi-P0 si les tests tournent en CI sans backend.

**P1-4 (non corrige) -- Duplication mock routes E2E** : tests 2 et 3 dupliquent integralement les routes au lieu de reutiliser `setupMockRoutes`. ~120 lignes de duplication. Impact : maintenabilite.

**P1-new -- `computeAvgX([])` retourne NaN** : division par zero si rooms est vide. Jamais appele en pratique (clusterByUnit garantit >= 1 room), mais la fonction est exportee publiquement sans guard. Pas de test unitaire pour ce cas. Impact : defensif.

## Verdict : GO-CONDITIONNEL (8.8/10, 0 P0, 4 P1 mineurs)

Les 6 P0 sont resolus. Le code clustering est propre, type-safe, bien teste (28 cas). La matrice G27 couvre 21/22 AC. Le refactor nested Map (I1) et le suffixe numerique (I2) sont des corrections de qualite.

Les 4 P1 residuels ne bloquent pas le merge mais doivent etre traites avant d'activer la CI E2E :
- **P1-6 est le plus urgent** : `route.continue()` cassera en CI sans backend.
- P1-1, P1-4, P1-new sont du nettoyage.

---

**Handoff -> @orchestrator**
- Fichiers audites : `clustering.ts`, `route.ts`, `db.ts`, `clustering.test.ts`, `clustering-ia.spec.ts`, `TESTING.md`
- Decisions : note 8.8 honnete -- progression significative (+3.0) mais 4 P1 empechent le 9.5
- Points d'attention : P1-6 (`route.continue()`) bloquera la CI E2E sans backend -- a corriger avant activation pipeline
