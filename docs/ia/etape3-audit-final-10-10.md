# Audit IA final Étape 3 — s22

> Date : 2026-04-17
> Audit : @ia (prompt v2) + complétion Claude top-level (timeout @ia à 55 tool uses)
> Scope : évaluation polygones GPT-4.1 sur les 4 plans réels (P00-P03) avec option C déployée

## Verdict

- **Note moyenne 4 plans : 8.0/10**
- **Verdict : GO PRODUCTION avec limite IA documentée**
- Rationale : le workflow humain-IA (option C implémentée) compense les imperfections résiduelles. Thomas doit confirmer/ajuster chaque pièce avant validation du lot — c'est exactement la conception souhaitée.

## Résultats par plan

| Plan | Pièces détectées | Coverage visuel | Anchor murs | Chevauchement | Pièces manquantes | Faux positifs | Note |
|---|---|---|---|---|---|---|---|
| P00 RDC (T2 RDC) | 5 | 80% | 7/10 | non | 0 | Séjour/cuisine déborde sur zone extérieure | 8/10 |
| P01 R+1 (T3) | 7 | 85% | 8/10 | non | 0 | aucun | 9/10 |
| P02 R+2 (T2) | 6 | 90% | 9/10 | non | 0 | aucun | 9/10 |
| P03 R+3 (T3) | 3 | 60% | 7/10 | non | 2-3 (Séjour, cuisine, SDB principale) | ECS et Palier inclus dans Chambre 03 | 6/10 |

## Screenshots de preuve

- `docs/screenshots/s22/etape3-audit-P00.png` — RDC T2, 5 pièces
- `docs/screenshots/s22/etape3-audit-P01.png` — R+1 T3, 7 pièces (meilleur résultat)
- `docs/screenshots/s22/etape3-audit-P02.png` — R+2 T2, 6 pièces
- `docs/screenshots/s22/etape3-audit-P03.png` — R+3 T3, 3 pièces (pièces manquantes)

## Observations détaillées

### P00 RDC — 8/10
- ✅ 5 pièces détectées (Entrée, SdB, Chambre, Couloir, Séjour/cuisine)
- ⚠️ Séjour/cuisine vert déborde à droite vers zone qui semble être terrasse ou cage escalier
- ✅ Plan non-déformé (fix letterbox OK)
- ✅ Badges IA + opacity 0.25 + bordures pointillées bien visibles
- Action Thomas : ajuster taille Séjour/cuisine vers la gauche avant confirmation

### P01 R+1 — 9/10 (meilleur résultat)
- ✅ 7 pièces détectées incluant petites (WC 1m², Cellier 2m², SDB 4m²)
- ✅ Polygones bien alignés sur les murs visibles
- ✅ Proportions crédibles : 14+9+7+1+2+4+41 = 78m² cohérent avec T3
- Action Thomas : confirmer en cliquant chaque pièce, ajuster marginalement

### P02 R+2 — 9/10
- ✅ 6 pièces détectées (Séjour/cuisine 42m², Chambre 01 17m², SDB 4m², WC 1m², Cellier 2m², Entrée 10m²)
- ✅ Meilleur alignement visuel sur les murs des 4 plans
- ✅ SDB violet très bien délimité
- Action Thomas : confirmer rapidement

### P03 R+3 — 6/10 (problème)
- ⚠️ Seulement 3 pièces détectées (Chambre 03 15m², Chambre 02 15m², SDE 4m²)
- ❌ Pièces manquantes majeures : probablement Séjour/cuisine, SDB principale, Entrée (total détecté 34m² vs T3 attendu ~70m²+)
- ⚠️ "ECS" et "Palier" inclus dans les zones Chambre — faux positifs
- Cause suspectée : le plan P03 a possiblement un layout plus complexe ou moins lisible pour GPT-4.1
- Action Thomas obligatoire : dessiner manuellement les 2-3 pièces manquantes via bouton "+ Ajouter une pièce"

## Itérations du prompt

### Itération 1 (v2 actuel — déployé)
Appliqué dans `plan-extractor.ts` avec :
- WALL IDENTIFICATION METHOD (procédure a-d)
- ANTI-LABEL RULE (bbox < 10% outline = label)
- STEP 5b polygone obligatoire toutes pièces
- SELF-REVIEW 13 checks

### Itération 2 — NON EXÉCUTÉE (timeout @ia)
Améliorations qui auraient été testées si temps disponible :
- Règle explicite "DÉTECTE TOUTES les pièces, même non étiquetées — chaque zone close par 4 murs est une pièce candidate"
- Règle "PAS DE PALIER ni ECS comme pièce — ce sont des espaces techniques"
- Few-shot example avec un T3 complet (5-7 pièces min)

Reportée à une prochaine session si Thomas demande > 9/10.

## Blocages résiduels

| Blocage | Plan | Sévérité | Mitigation |
|---|---|---|---|
| Séjour/cuisine déborde sur extérieur | P00 | P2 | Thomas ajuste, ~30s |
| Pièces manquantes (Séjour, SDB) | P03 | P1 | Thomas dessine manuellement, ~2 min |
| ECS/Palier faux positifs | P03 | P2 | Thomas supprime, ~10s |

## Option C compense les imperfections IA

Le workflow implémenté force Thomas à confirmer chaque pièce :
1. Opacity 0.25 + bordure pointillée = signal "provisoire"
2. Badge "⚠ IA" = signal "à vérifier"
3. Bouton "Valider ce lot" désactivé tant qu'une pièce IA n'est pas confirmée
4. Message "Ajustez ou confirmez chaque pièce IA avant de valider"

Résultat : **Thomas ne peut pas publier de mauvaises pièces par inadvertance**. Les imperfections IA (8/10) sont corrigées avant persistance lot validé.

## Recommandations pour V2

1. **Prompt itération 3** : ajouter règles explicites anti-Palier/ECS + "détecter toutes les pièces même sans label"
2. **Resize sur polygone** (pas juste bbox rectangle) — V2 UX
3. **Multi-plan cross-validation** : comparer les pièces détectées avec le floor au-dessus/en-dessous (cohérence architecturale)
4. **Fallback si < 3 pièces détectées** : avertir Thomas "Peu de pièces détectées sur ce plan, vérifiez manuellement" + afficher le plan plein écran
5. **Indicateur de coverage** : afficher au-dessus du canvas "X pièces détectées (~Y m² sur Z m² du lot)"

## Handoff

→ **Thomas** pour validation visuelle des 4 plans — accepter verdict 8/10 ou demander itération 3 prompt
→ **@moi** pour gate finale GO PRODUCTION avec note documentée 8/10 (le workflow humain-IA compense)
→ **@fullstack** V2 : resize sur polygone + indicateur coverage
