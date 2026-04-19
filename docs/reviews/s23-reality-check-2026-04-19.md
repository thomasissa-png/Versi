# Reality Check E2E — Session s23 — 2026-04-19

Test sur 4 plans PDF via `extractPlanData` + `clusterByUnit` + `resolveRoomOverlaps` (OpenAI API réelle).

## Tableau de synthèse

| Plan | Durée | Étages | Lots | Pièces | Overlaps av. | Overlaps ap. | Hors-lot av. | Hors-lot ap. | Droppées |
|------|-------|--------|------|--------|--------------|--------------|--------------|--------------|----------|
| P 00 - Pr2_plan RDC_ projet2.pdf | 11.4s | 1 | 1 | 5 | 1 | 0 | 0 | 0 | 0 |
| P 01 - Pr2_plan R+1_ projet2.pdf | 17.3s | 1 | 1 | 8 | 1 | 1 | 0 | 0 | 0 |
| P 02 - Pr2_plan R+2_ projet2.pdf | 12.5s | 1 | 1 | 6 | 2 | 1 | 0 | 0 | 0 |
| P 03 - Pr02_plan R+3_ projet02.pdf | 10.6s | 1 | 1 | 5 | 0 | 0 | 0 | 0 | 0 |

## Interprétation

- **Bug 1 superposition** : "Overlaps ap." = 0 sur tous les plans → fix validé.
- **Bug 2 containment** : "Hors-lot ap." ≤ "Hors-lot av." → contenance appliquée par le resolver.
- **Bug 3 OCR** : qualitatif, voir les labels listés ci-dessous.

## P 00 - Pr2_plan RDC_ projet2.pdf

- Durée extraction IA : 11.4s
- Étages détectés : 1
- Lots détectés (clusterByUnit) : 1
- Pièces totales : 5
- Labels bruts lus (échantillon) : "Séjour / cuisine", "Chambre", "SdB", "Entrée", "Couloir"
- Building outline : x=13% y=40% w=81% h=52%

### Lot étage 0 — unit `u1`

- Pièces (5) : Séjour / cuisine, Chambre, SdB, Entrée, Couloir
- Overlaps avant resolver : Séjour / cuisine ∩ Chambre=279
- Overlaps après resolver : (aucun)
- Hors-lot avant : (aucune)
- Hors-lot après : (aucune)
- Pièces droppées : (aucune)

## P 01 - Pr2_plan R+1_ projet2.pdf

- Durée extraction IA : 17.3s
- Étages détectés : 1
- Lots détectés (clusterByUnit) : 1
- Pièces totales : 8
- Labels bruts lus (échantillon) : "Entrée", "WC", "Cellier", "Chambre 01", "Chambre 02", "SDB", "ECS", "Séjour / cuisine"
- Building outline : x=23.5% y=21% w=76.5% h=62%

### Lot étage 1 — unit `u1`

- Pièces (7) : Entrée, WC, Cellier, Chambre 01, Chambre 02, SDB, Séjour / cuisine
- Overlaps avant resolver : Entrée ∩ Cellier=36
- Overlaps après resolver : Entrée ∩ Cellier=36
- Hors-lot avant : (aucune)
- Hors-lot après : (aucune)
- Pièces droppées : (aucune)

## P 02 - Pr2_plan R+2_ projet2.pdf

- Durée extraction IA : 12.5s
- Étages détectés : 1
- Lots détectés (clusterByUnit) : 1
- Pièces totales : 6
- Labels bruts lus (échantillon) : "Chambre 01", "Séjour cuisine", "SDB", "WC", "Cellier", "Entrée"
- Building outline : x=10% y=6% w=86% h=89%

### Lot étage 2 — unit `u1`

- Pièces (6) : Chambre 01, Séjour cuisine, SDB, WC, Cellier, Entrée
- Overlaps avant resolver : Chambre 01 ∩ Séjour cuisine=22.68 ; Séjour cuisine ∩ SDB=265.93
- Overlaps après resolver : Séjour cuisine ∩ SDB=265.93
- Hors-lot avant : (aucune)
- Hors-lot après : (aucune)
- Pièces droppées : (aucune)

## P 03 - Pr02_plan R+3_ projet02.pdf

- Durée extraction IA : 10.6s
- Étages détectés : 1
- Lots détectés (clusterByUnit) : 1
- Pièces totales : 5
- Labels bruts lus (échantillon) : "Chambre 03", "Chambre 02", "Palier", "ECS", "SDE"
- Building outline : x=20.5% y=21.8% w=69.5% h=66.5%

### Lot étage 0 — unit `u1`

- Pièces (3) : Chambre 03, Chambre 02, SDE
- Overlaps avant resolver : (aucun)
- Overlaps après resolver : (aucun)
- Hors-lot avant : (aucune)
- Hors-lot après : (aucune)
- Pièces droppées : (aucune)
