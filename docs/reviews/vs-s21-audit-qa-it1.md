# Audit QA versi-s21 -- Iteration 1

## Note globale : 5.8 / 10

## Tableau 5 criteres

| # | Critere | Note /10 | Corrections EXACTES |
|---|---|---|---|
| 1 | Code quality | 7/10 | Voir P1-1 a P1-4 |
| 2 | Test coverage | 3/10 | Voir P0-1 (critique) + P0-2 |
| 3 | Gates binaires | 5/10 | Voir P0-3 (G27), P1-5 (G28) |
| 4 | Edge cases | 5/10 | Voir P0-4 a P0-6 |
| 5 | Pipeline CI | 6/10 | vitest.config.ts existe, mais 0 test unitaire dedans |

## P0 bloquants (corrections obligatoires avant merge)

**P0-1 -- ZERO test unitaire Vitest pour `clustering.ts`** : le fichier `tests/unit/` est vide. Les 5 fonctions exportees (`clusterByUnit`, `generateLotName`, `computeEnvelopeBbox`, `countHabitableRooms`, `computeAvgX`) n'ont aucun test unitaire. C'est le coeur algorithmique de la feature. Creer `versi-studio/tests/unit/clustering.test.ts` avec au minimum :
- `clusterByUnit` : filtre confiance < 0.7, confiance = 0.7 exactement (inclusif), groupement correct cross-floors (meme `unit_id` etages differents = groupes distincts), rooms sans `unit_id` ignorees, rooms sans `floor` ignorees
- `generateLotName` : 0 habitable = "Lot", 1 = "Studio", 3 = "T3", floor 0 = "RDC", doublon etage = suffixe gauche/droite, 3+ lots meme etage (collision)
- `computeEnvelopeBbox` : rooms sans bounding_box (skippees), clamp 0-100, room unique
- `countHabitableRooms` : WC/SdB/couloir/entree exclus, chambre/salon/cuisine inclus, "Salle de bain" (variante) exclue
- `computeAvgX` : rooms sans bounding_box (fallback 50)

**P0-2 -- E2E `clustering-ia.spec.ts` : `waitForTimeout(500)` flaky** : ligne 332, `waitForTimeout` est un anti-pattern. Remplacer par `await expect(() => expect(patchedLotIds.length).toBeGreaterThanOrEqual(2)).toPass({ timeout: 5000 })` ou un `waitForResponse` sur les PATCH.

**P0-3 -- Gate G27 FAIL : zero tracabilite US-VS-21 / US-VS-22 -> tests**. Aucun fichier `docs/qa/TESTING.md` ni matrice de tracabilite n'existe. Les tests E2E ne referent pas les US. Creer la matrice.

**P0-4 -- `key.split("::")` vulnerable** : `clustering.ts:128` -- si un `unit_id` retourne par GPT contient `::` (ex: `u::1`), le split casse. Le `unitId` recupe serait `u` au lieu de `u::1`. Corriger : `const sepIdx = key.indexOf("::"); const floorStr = key.slice(0, sepIdx); const unitId = key.slice(sepIdx + 2);`

**P0-5 -- 3+ lots meme etage : collision de nommage** : `generateLotName` ne gere que "gauche"/"droite" (binaire, base sur avgX < 50). Avec 3 lots au meme etage, 2 lots du meme cote auront le meme nom exact (ex: "T3 RDC gauche" x2). Ajouter un index numerique si `totalOnFloor > 2` : `suffix = ` (${indexOnFloor + 1})`.

**P0-6 -- `computeEnvelopeBbox` avec 0 rooms ayant un `bounding_box`** : si toutes les rooms ont `bounding_box = null`, la fonction retourne `{ x: 100, y: 100, w: -100, h: -100 }` (valeurs initiales non modifiees, clampees a 0). Resultat : `width_percent: -100` clampee a `min(100, -100) = -100` -- pas de garde. Ajouter un early return si aucune room n'a de `bounding_box`.

## P1 (corrections recommandees)

**P1-1 -- Regex `countHabitableRooms` double insensibilite** : la regex utilise `/i` ET `nameLC = r.name_raw.toLowerCase()`. Le `.toLowerCase()` est redondant avec le flag `i`. Supprimer le `.toLowerCase()` ou le flag `/i` (pas les deux).

**P1-2 -- `computeEnvelopeBbox` : `maxX - minX` peut etre negatif** si toutes les rooms sont skippees (bounding_box null). Meme probleme que P0-6. Retourner un bbox par defaut ou `null`.

**P1-3 -- `clusterByUnit` : seuil >= 1 room est toujours vrai** : la condition `groupRooms.length >= 1` (ligne 133) est toujours vraie puisque le groupe est cree uniquement quand il y a au moins 1 room. La spec dit ">= 2 pieces" (section 2, point 2). Aligner sur la spec : `groupRooms.length >= 2`.

**P1-4 -- E2E : duplication massive des mock routes** : les tests 2 et 3 dupliquent integralement les routes mock au lieu de reutiliser `setupMockRoutes`. Refactorer pour DRY.

**P1-5 -- Gate G28 partiel** : `vitest.config.ts` existe mais `tests/unit/` est vide. Le pipeline n'a rien a executer. Tant que P0-1 n'est pas corrige, G28 est en FAIL pour la partie unit tests.

**P1-6 -- `route.continue()` dans le mock E2E** : les tests utilisent `route.continue()` en fallback (ligne 172, 257, 324). En CI sans backend, cela enverra des requetes au reseau reel et echouera. Utiliser `route.fulfill({ status: 404 })` ou `route.fallback()` a la place.

## Verdict

- Note : 5.8/10
- P0 : 6 bloquants
- **ITERATION 2 obligatoire** -- 6 P0 a corriger avant merge

---

**Handoff -> @orchestrator**
- Fichiers produits : `docs/reviews/vs-s21-audit-qa-it1.md`
- Decisions : note 5.8 honnete, 6 P0 identifies, tests unitaires absents = critique
- Points d'attention : P0-1 (tests unitaires clustering) est le plus impactant, P0-4/P0-5/P0-6 sont des bugs logiques dans le code de production
