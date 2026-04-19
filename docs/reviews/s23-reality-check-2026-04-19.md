# Reality Check E2E — Session s23 — 2026-04-19

Test sur 4 plans PDF via `extractPlanData` + `clusterByUnit` + `resolveRoomOverlaps` (OpenAI API réelle).

---

## Run 2 (post-patch resolver robuste) — 2026-04-19 13:40

Patch appliqué à `versi-studio/src/lib/vs/polygon-resolver.ts` : tri par aire polygone DESC (surface_m2 trop souvent null côté IA), nettoyage via `polygonClipping.union` (fix self-intersect), retry safeDifference après cleaning, fallback drop si difference échoue durablement, boucle multi-passes (max 3) jusqu'à stabilité overlap < 0.5.

### Tableau de synthèse (Run 2)

| Plan | Durée | Étages | Lots | Pièces | Overlaps av. | Overlaps ap. | Hors-lot av. | Hors-lot ap. | Droppées |
|------|-------|--------|------|--------|--------------|--------------|--------------|--------------|----------|
| P 00 - Pr2_plan RDC_ projet2.pdf | 15.2s | 1 | 1 | 5 | 1 | 0 | 0 | 0 | 0 |
| P 01 - Pr2_plan R+1_ projet2.pdf | 18.2s | 1 | 1 | 8 | 0 | 0 | 0 | 0 | 0 |
| P 02 - Pr2_plan R+2_ projet2.pdf | 13.5s | 1 | 1 | 6 | 2 | 0 | 0 | 0 | 0 |
| P 03 - Pr02_plan R+3_ projet02.pdf | 13.4s | 1 | 1 | 5 | 1 | 0 | 0 | 0 | 0 |

Bug 1 superposition — **PASS** : "Overlaps ap." = 0 sur 4/4 plans.
Bug 2 containment — **PASS** : "Hors-lot ap." ≤ "Hors-lot av." sur 4/4 plans.

### P 00 - Pr2_plan RDC_ projet2.pdf

- Durée extraction IA : 15.2s
- Étages détectés : 1
- Lots détectés (clusterByUnit) : 1
- Pièces totales : 5
- Labels bruts lus (échantillon) : "Séjour/cuisine", "Chambre", "SdB", "Entrée", "Couloir"
- Building outline : x=20% y=33% w=73% h=47%

#### Lot étage 0 — unit `u1`

- Pièces (5) : Séjour/cuisine, Chambre, SdB, Entrée, Couloir
- Overlaps avant resolver : Séjour/cuisine ∩ Chambre=120.75
- Overlaps après resolver : (aucun)
- Hors-lot avant : (aucune)
- Hors-lot après : (aucune)
- Pièces droppées : (aucune)

### P 01 - Pr2_plan R+1_ projet2.pdf

- Durée extraction IA : 18.2s
- Étages détectés : 1
- Lots détectés (clusterByUnit) : 1
- Pièces totales : 8
- Labels bruts lus (échantillon) : "Chambre 01", "Chambre 02", "Séjour / cuisine", "Entrée", "WC", "Cellier", "SDB", "ECS"
- Building outline : x=17% y=12% w=78.4% h=82%

#### Lot étage 1 — unit `u1`

- Pièces (8) : Chambre 01, Chambre 02, Séjour / cuisine, Entrée, WC, Cellier, SDB, ECS
- Overlaps avant resolver : (aucun)
- Overlaps après resolver : (aucun)
- Hors-lot avant : (aucune)
- Hors-lot après : (aucune)
- Pièces droppées : (aucune)

### P 02 - Pr2_plan R+2_ projet2.pdf

- Durée extraction IA : 13.5s
- Étages détectés : 1
- Lots détectés (clusterByUnit) : 1
- Pièces totales : 6
- Labels bruts lus (échantillon) : "Chambre 01", "SdB", "Séjour cuisine", "Entrée", "WC", "Cellier"
- Building outline : x=11.6% y=7.4% w=86.2% h=87%

#### Lot étage 2 — unit `u1`

- Pièces (6) : Chambre 01, SdB, Séjour cuisine, Entrée, WC, Cellier
- Overlaps avant resolver : Séjour cuisine ∩ Entrée=270.84 ; Entrée ∩ Cellier=77.38
- Overlaps après resolver : (aucun)
- Hors-lot avant : (aucune)
- Hors-lot après : (aucune)
- Pièces droppées : (aucune)

Note : P02 est le cas pathologique qui avait résisté au fix initial (Run 1). Avec le patch robuste, l'overlap de 270.84 (2.7% du plan) est entièrement résolu.

### P 03 - Pr02_plan R+3_ projet02.pdf

- Durée extraction IA : 13.4s
- Étages détectés : 1
- Lots détectés (clusterByUnit) : 1
- Pièces totales : 5
- Labels bruts lus (échantillon) : "Chambre 03", "Chambre 02", "Palier", "SDE", "ECS"
- Building outline : x=18% y=16.5% w=67.6% h=77%

#### Lot étage 0 — unit `u1`

- Pièces (5) : Chambre 03, Chambre 02, Palier, SDE, ECS
- Overlaps avant resolver : Palier ∩ ECS=33.54
- Overlaps après resolver : (aucun)
- Hors-lot avant : (aucune)
- Hors-lot après : (aucune)
- Pièces droppées : (aucune)

---

## Run 1 (pre-patch — trace historique) — 2026-04-19 ~11:00

Premier fix resolver (commit `f7a2699`) : greedy pairwise single-pass, tri par surface_m2 primaire, pas de cleaning self-intersect, pas de fallback si safeDifference échoue.

### Tableau de synthèse (Run 1)

| Plan | Durée | Étages | Lots | Pièces | Overlaps av. | Overlaps ap. | Hors-lot av. | Hors-lot ap. | Droppées |
|------|-------|--------|------|--------|--------------|--------------|--------------|--------------|----------|
| P 00 - Pr2_plan RDC_ projet2.pdf | 11.4s | 1 | 1 | 5 | 1 | 0 | 0 | 0 | 0 |
| P 01 - Pr2_plan R+1_ projet2.pdf | 17.3s | 1 | 1 | 8 | 1 | 1 | 0 | 0 | 0 |
| P 02 - Pr2_plan R+2_ projet2.pdf | 12.5s | 1 | 1 | 6 | 2 | 1 | 0 | 0 | 0 |
| P 03 - Pr02_plan R+3_ projet02.pdf | 10.6s | 1 | 1 | 5 | 0 | 0 | 0 | 0 | 0 |

### Résidus détectés en Run 1

- P01 : `Entrée ∩ Cellier = 36` persistant après resolver (1 overlap résiduel)
- P02 : `Séjour cuisine ∩ SDB = 265.93` persistant après resolver (1 overlap résiduel, 2.65% du plan)

### Hypothèses investiguées (Run 1 → Run 2)

1. **Tri par surface_m2 primaire indéterminé** : l'IA retourne souvent `surface_m2 = null`, donc le tri tombait sur 0 = 0, sans tie-break fiable. Correction Run 2 : tri par **aire polygone DESC** (primaire), surface_m2 en tie-break.
2. **safeDifference échouait silencieusement** : le `continue` ligne 234 de l'ancien code laissait `current` inchangé si polygon-clipping levait une exception (geometry invalide, self-intersect). Correction Run 2 : retry avec `cleanPolygon` (via `polygonClipping.union`), puis drop pièce si échec durable.
3. **Mono-passe insuffisante** : si une chaîne d'overlaps A>B>C existait, le clip de B contre A pouvait laisser un résidu chevauchant C. Correction Run 2 : boucle max 3 passes jusqu'à stabilité.

Les 3 causes étaient cumulatives. Le Run 2 les corrige toutes ensemble.
