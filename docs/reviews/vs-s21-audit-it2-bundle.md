# Bundle audit cross-agents versi-s21 — Itération 2

**Date** : 2026-04-17
**Scope** : Corrections P0 du bundle itération 1 (commits `bba3dc8`, `9d0e4cb`)
**5 agents** : @qa, @ux, @product-manager, @ia, @creative-strategy (proxy Thomas)

## Synthèse notes

| Agent | it1 /10 | it2 /10 | Δ | Verdict | P0 résiduels | P1 résiduels |
|---|---|---|---|---|---|---|
| QA | 5.8 | 8.8 | +3.0 | GO-CONDITIONNEL | 0 | 4 |
| UX | 7.4 | 9.2 | +1.8 | GO-CONDITIONNEL | 0 | 3 |
| Product Manager | 7.4 | 9.2 | +1.8 | **GO** | 0 | 1 (reporté Phase 6) |
| IA | 7.2 | 9.2 | +2.0 | GO-CONDITIONNEL | 0 | 2 |
| Persona Thomas | 7.2 | 8.8 | +1.6 | GO-CONDITIONNEL | 0 | 2 |
| **Moyenne** | **7.0** | **9.04** | **+2.04** | — | **0** | **~12** |

## Verdict d'itération 2

**0 P0 résiduels** — les 10 P0 du bundle it1 (5 unanimes U1-U5 + 5 isolés I1-I10) sont tous corrigés. Les 5 agents l'ont vérifié indépendamment.

**1 GO + 4 GO-CONDITIONNEL** — pas d'unanimité GO (cible 10/10 non atteinte), mais aucun blocage.

**Moyenne 9.04/10** — dépasse le seuil GO production-ready 9.5 ? Non (9.04 < 9.5). → itération 3 MINI nécessaire OU arbitrage fondateur "GO-CONDITIONNEL activable".

## P1 résiduels — classification criticité

### P1 critiques (à corriger avant merge)

**QA-P1-6** : `route.continue()` dans `clustering-ia.spec.ts` lignes 171, 256, 323 enverra des requêtes au réseau réel en CI sans backend. Risque : tests flaky/failing en CI, impossibilité d'activer le pipeline. **Fix** : remplacer par `route.fulfill()` avec mocks explicites.

**UX-P1-R1** : bouton "Valider ce lot" à `min-h-[32px]` (ligne 211 LotPanel) — incohérence avec bouton "Annuler validation" à 44px sur la même carte. Accessibility WCAG 2.2 AA. **Fix** : `min-h-[44px]` ligne 211.

**Persona-P1-2** : H1 "Découpez vos lots" non conditionnel — absurde affiché quand l'IA a pré-créé les lots (Thomas n'a pas à découper, juste valider). **Fix** : H1 dynamique selon `hasAiExtracted && aiSuggestedLots.length > 0`.

### P1 importants (à corriger dans une itération mini)

**Persona-P1-1** : note bbox approximative absente. Thomas ne sait pas que le rectangle est une approximation de l'union des pièces. Risque confusion "c'est la vraie forme". **Fix** : phrase en italique sous compteur de lots dans LotPanel.

**UX-P1-R2** : bordure IA masquée à la sélection d'un lot IA suggéré (les 3 conditions CSS restent parallèles, pas prioritaires). Signal IA perdu visuellement. **Fix** : priorité conditionnelle IA > sélection.

### P1 mineurs (reportables)

- **UX-P1-N1** : icône `&#9733;` unicode dans bannière U5 (rendu inconsistant selon OS) — recommander SVG inline
- **QA-P1-1** : double insensibilité regex dans `countHabitableRooms`
- **QA-P1-4** : duplication mock routes dans E2E
- **QA-P1-new** : `computeAvgX([])` = NaN (edge case tableau vide)
- **IA-P1-A** : `bounding_polygon` `.nullable().optional()` type plus large que nécessaire
- **IA-P1-B** : `exclusiveMinimum` OpenAI strict mode non vérifié (hors scope clustering)

### P1 reportés (hors scope itération)

- **PM-P1-E8** : 4 events analytics (`lot_auto_created`, `lot_auto_validated`, `lot_manually_adjusted`, `ia_fallback_triggered`) — reporté Phase 6 planifiée

## Décision itération 3

**Option A — Itération 3 MINI (pattern typist)** : 5 fix ciblés en un seul @fullstack (~50-80 lignes total) :
1. `clustering-ia.spec.ts` : `route.continue()` → `route.fulfill()` avec mocks (QA-P1-6)
2. `LotPanel.tsx` ligne 211 : `min-h-[32px]` → `min-h-[44px]` (UX-P1-R1)
3. `lots/page.tsx` H1 : conditionnel selon pré-création IA (Persona-P1-2)
4. `LotPanel.tsx` : note bbox approximative sous compteur (Persona-P1-1)
5. `LotPanel.tsx` : priorité bordure IA > sélection CSS (UX-P1-R2)

Durée estimée : 1 Task @fullstack + re-audit ciblé 3 agents (QA + UX + persona). Cible : 9.5/10 moyenne → GO complet.

**Option B — GO-CONDITIONNEL immédiat** : livrer en l'état, traiter les P1 dans une session maintenance ultérieure. Risque : QA-P1-6 bloque activation CI → pipeline non déployable.

## Recommandation

**Option A — itération 3 MINI** : l'écart 9.04 → 9.5 est faible, les fix sont triviaux (< 100 lignes), QA-P1-6 bloque réellement le CI. ROI it3 mini = maximum.

## Handoff

→ @fullstack (typist, brief avec code exact)
→ puis @qa + @ux + @creative-strategy (re-audit ciblé it3 sur les 5 fix)
→ puis @moi (gate finale persona Thomas)
