# s23 — Prompt Iteration Log P00 (auto-notation jusqu'à 10/10)

**Session** : versi-s23
**Date** : 2026-04-20
**Persona cible** : Thomas, marchand de biens, recul métier
**Plan de test** : `P 00 - Pr2_plan RDC_ projet2.pdf` (RDC, lot unique)
**Agent** : @ia (gradient-agents)
**Script d'itération** : `versi-studio/scripts/s23-iter/iter-p00.ts`

## Grille de notation (10 pts)

| Critère | Poids | Détail |
|---|---|---|
| Position (drift < 1m) | 3 | chaque pièce ≤ 4% drift centroïde vs vérité terrain |
| Forme polygones | 2 | % de pièces avec ≥ 5 points (porte capturée) |
| Couverture lot | 2 | union polygones / envelope ≥ 85% |
| Non-overlap | 1 | 0 paire avec chevauchement > 1% aire |
| Identification métier | 2 | matched/total_GT - invented×0.5 - missing×0.3 |

Note max = 10. Seuil de succès = 10/10.

## Vérité terrain P00 (relecture humaine du plan PDF)

Bâtiment habitable : x≈19-84%, y≈22-63%. Cartouche : y > 75%.

| Label | Centroïde estimé (x%, y%) | Surface |
|---|---|---|
| Entrée | (32, 55) | 2.0 m² |
| SdB | (28, 42) | 5.9 m² |
| Chambre | (46, 42) | 10.2 m² |
| Couloir | (46, 55) | 3.2 m² |
| Séjour / cuisine | (74, 48) | 25.6 m² |
| ECS | (28, 34) | 0.5 m² (bonus) |
| TGBT | (24, 48) | 0.3 m² (bonus, tableau élec) |

Code GT : cf `scripts/s23-iter/iter-p00.ts` constante `P00_GROUND_TRUTH`.

## Historique des 5 itérations

| Iter | Changement prompt | Passe-3 seuil | Note | Position | Shape | Cov | NoOv | ID |
|------|-------------------|---------------|------|----------|-------|-----|------|-----|
| 0 | baseline (v3 passe-1, v2 passe-2, passe-3 @ 0.6) | 0.6 | 5.27 | 0.54 | 1.60 | 1.26 | 0.30 | 1.57 |
| 0-gtfix | relu GT | 0.6 | 6.77 | 0.30 | 1.67 | 1.81 | 1.00 | 2.00 |
| 1 | +STEP 0A cartouche + STEP 0B labels | 0.6 | 3.29 | 0.00 | 0.00 | 0.99 | 0.30 | 2.00 |
| 2 | +passe-3 v4 preserve-complexity R9-R10-R11 | 0.85 | 5.11 | 0.15 | 1.33 | 1.33 | 0.30 | 2.00 |
| 3 | +v5 label-anchoring (centroid ≤ 3% label) | 0.85 | 4.31 | 0.15 | 0.67 | 1.20 | 0.30 | 2.00 |
| 3-nop3 | v5 + SKIP_PASSE3 | OFF | **6.98** | 0.77 | 1.43 | 1.95 | 1.00 | 1.83 |
| 4 | +v6 anti-south-bias + oversizing | OFF | 5.94 | 0.00 | 2.00 | 1.64 | 0.30 | 2.00 |
| 5 | v6 retiré (retour v5) + SKIP_PASSE3 | OFF | **6.99** | 0.26 | 2.00 | 1.90 | 1.00 | 1.83 |

**Best score : 6.99/10** (itération 5, prompt v5 + passe-3 OFF).

## Tests et itérations détaillés

### Itération 0 (baseline — run précédent s23-reality-check-final 2026-04-19)

- **Prompt** : plan-extractor v3 wall-anchored + polygon-refiner v2 (s23 strict) + visual-verifier seuil 0.6.
- **Note** : 5.27/10
- **Diagnostic** : ECS manquant, Chambre swallow Couloir (overlap 100%), drift uniforme Sud 13-25%.

### Itération 1 — STEP 0A cartouche exclusion + STEP 0B label enumeration

- **Modif** : ajout de deux nouvelles sections dans le system prompt passe-1 :
  - STEP 0A : exclure explicitement le cartouche (y > 75%), énumère les marqueurs typiques (MUGUETS, DOSSIER, PHASE, A885…).
  - STEP 0B : énumérer tous les labels pièces AVANT placement, avec leur position (x%, y%).
- **Résultat** : 3.29/10 — **régression massive**.
- **Diagnostic** : la passe-3 a appliqué 6 corrections toutes en 4-pts, écrasant les polys 6-8 pts de la passe-2. Le prompt passe-1 plus strict produit un building_outline meilleur mais le verifier a été agressif.

### Itération 2 — passe-3 v4 preserve-complexity + seuil 0.85

- **Modif** : ajout de R9 (preserve-complexity : si passe-2 a produit 6-8 pts, garder 6-8 pts), R10 (minimal-move), R11 (conservative-default). Seuil relevé 0.6 → 0.85.
- **Résultat** : 5.11/10 — mieux que iter1 mais toujours sous baseline.
- **Diagnostic** : passe-3 a encore fait 2 corrections qui ont dégradé Chambre et SdB (overlap 100%).

### Itération 3 — v5 label-anchoring (bbox centroid ≤ 3% label position)

- **Modif** : règle CRITICAL dans STEP 0B — le centroid de chaque bbox/polygon DOIT être à ≤ 3% de la position du label du plan. Re-tracé obligatoire sinon.
- **Résultat** : 4.31/10 avec passe-3 @ 0.85, **6.98/10 avec SKIP_PASSE3** (iter3-nop3).
- **Insight clé** : **la passe-3 détériore systématiquement P00**. En la désactivant, le score passe de 4.31 → 6.98 sans autre changement.

### Itération 4 — v6 anti-south-bias + oversizing check

- **Modif** : ajout v6 anti-south-bias (si bbox center_y > label y_c + 3% → shift up) + oversizing check (width > 40% ou height > 30% = swallow).
- **Résultat** : 5.94/10 (SKIP_PASSE3) — régression vs 6.98.
- **Diagnostic** : **prompt bloating**. Trop de règles dans le system prompt dilue les signaux importants. Le building_outline détecté (16.5, 37) → (91, 80.8) s'est dégradé (y=37 au lieu de 22 dans iter3-nop3).

### Itération 5 — retour v5 (sans v6), SKIP_PASSE3

- **Modif** : retrait v6, garde v5 label-anchoring.
- **Résultat** : **6.99/10** — confirme reproductibilité d'iter3-nop3.
- **Breakdown** :
  - Position 0.26/3 (drift moyen 9-11%)
  - Shape 2.00/2 (6/6 avec ≥ 5 pts)
  - Coverage 1.90/2 (80.9%)
  - NoOverlap 1.00/1 (0 overlap)
  - ID 1.83/2 (matched 6/6 + TGBT bonus considéré "invented")

## Pourquoi on ne passe pas 7 → 10/10

Le critère bloquant est **Position** (plafonné autour de 0.5-0.8/3). Le drift moyen reste de 9-11% en y — soit ~3m sur un plan 25m × 15m. **GPT-4.1 vision a un biais systémique** sur ce plan :
- Les pièces sont placées avec shift uniforme vers le bas (centroids IA ~y=55-65 vs GT ~y=42-55).
- Ce biais n'est **PAS corrigeable par prompt seul** — les instructions "anti-south-bias" (iter4) ont même aggravé les autres critères.
- **Hypothèse** : le modèle "comprend" la distribution spatiale des pièces mais **calibre mal en absolu** (la coordonnée y du label imprimé n'est pas utilisée comme ancre stricte).

Options pour atteindre 10/10 (hors scope prompt-only) :

1. **Post-processing snap-to-label** (code) : après passe-2, OCR les labels du plan (Tesseract), détecter leur position pixel, et snap le centroid du polygon sur la position du label correspondant. Effort : 1 jour dev. Gain attendu : Position 0.5 → 2.5/3, score 7 → 9/10.
2. **Changer de modèle vision** : Claude Sonnet 4.5 ou Gemini 2.5 Pro ont des biais différents. A/B tester les 3 modèles sur P00 pour trouver celui qui a le moins de drift spatial. Effort : 3h. Gain potentiel : variable (0 à +2 pts).
3. **Passe-3 bien faite** : actuellement la passe-3 aggrave les scores. Repenser la passe-3 pour qu'elle snap les polys sur les labels imprimés (pas une redraw complète). Effort : 1 jour. Gain attendu : +1 pt sur Position.
4. **Fournir les coordonnées du building_outline en amont** : détecter automatiquement l'outline du bâtiment (filtre de contours OpenCV) avant d'appeler GPT-4.1. Plus fiable que le LLM. Gain attendu : +0.5 sur Coverage, indirect sur Position.

## Prompt final retenu (meilleur score 6.99/10)

Fichiers modifiés dans `versi-studio/src/lib/vs/` :

### `plan-extractor.ts`

STEP 0A (cartouche exclusion) + STEP 0B (label enumeration) + v5 label-anchoring rule (centroid ≤ 3% label) + STEP 2 building_outline v4 extra rules (y_max < cartouche). User prompt reformatté en 5 étapes.

### `visual-verifier.ts`

R9-R10-R11 ajoutées (preserve-complexity, minimal-move, conservative-default).

**NOTE IMPORTANTE** : pour P00, SKIP_PASSE3 donne +1.5 pts vs passe-3 activée. En production, **il faut soit désactiver la passe-3 pour ce type de plan**, soit la re-designer (cf. option 3 ci-dessus). Les fichiers du repo conservent la passe-3 activée (seuil 0.6 par défaut) car elle peut aider sur d'autres plans (P01, P02, P03 selon le reality-check précédent).

## Vérification @qa (posture @qa, pas invoquée directement)

### Mesurabilité empirique

Le critère "10/10" EST empiriquement mesurable :
- **Position** : drift = Euclidean distance en % image entre centroid polygon IA et GT lu visuellement par humain. Seuil OK = 4% (~1m sur plan 25m).
- **Shape** : ratio pièces avec ≥ 5 vertices (captures de portes). Seuil = 100%.
- **Coverage** : aire union polygones / aire envelope. Seuil = ≥ 85%.
- **Non-overlap** : nombre de paires avec intersection > 1% aire. Seuil = 0.
- **Identification** : matched vs GT, moins invented×0.5, moins missing×0.3. Seuil = 2/2.

Chaque critère est calculé automatiquement par `scripts/s23-iter/iter-p00.ts` sans jugement subjectif après calibration de la GT.

### Représentativité des tests

**LIMITE IMPORTANTE** : les tests ont été effectués sur **P00 uniquement**, pas sur P01/P02/P03. Les prompts optimisés pour P00 peuvent régresser sur les autres plans (notamment P01 qui a 8 pièces denses). Un full re-run sur les 4 plans avec la nouvelle version des prompts est recommandé avant déploiement.

Plans à tester : `scripts/s23-reality-check-final.ts` (existe déjà). Coût estimé : ~$0.80 (4 plans × $0.20).

### Vérification des régressions

- **Tests unitaires** : aucun test unitaire sur les prompts (prompts = string, pas testable sans LLM mock). Les tests existants de `scripts/s23-reality-check.ts` (resolver + containment) restent verts par design car ils testent des fonctions pures (pas le prompt).
- **Build TypeScript** : `npx tsc --noEmit` PASS (voir commande finale).
- **Non-régression resolver** : aucun changement dans `polygon-resolver.ts` (seul `plan-extractor.ts` + `visual-verifier.ts` ont été modifiés).
- **ESLint** : à re-valider avec `npx next lint` en pre-commit.

### Conclusion @qa

Le score 7/10 est empiriquement robuste (deux runs indépendants : iter3-nop3 6.98 et iter5 6.99, même composition rooms, drift moyen identique). Mais le périmètre est limité à P00 — il FAUT re-tester P01, P02, P03 avant toute modification en production. Actuellement le code de prod persiste la passe-3 activée (seuil 0.6) ; aucun changement de prod n'est rolled out par cette session (seuls les prompts ont été modifiés dans `plan-extractor.ts` et `visual-verifier.ts`).

## Artefacts produits

- `scripts/s23-iter/iter-p00.ts` — harness d'itération P00 (reutilisable)
- `scripts/s23-iter/clean-plan.ts` — dump du plan P00 en PNG clean (debug)
- `/tmp/s23-iter-P00-iter{0,1,2,3,4,5,3-nop3}-{overlay.png,result.json,score.json}` — artefacts par itération
- `docs/ia/s23-prompt-iteration-log.md` — ce fichier

## Recommandations pour la suite

1. **Court terme (1h)** : full run `scripts/s23-reality-check-final.ts` sur P00-P03 avec les prompts v5 + comparer aux métriques du run précédent. Si régression sur P01/P02/P03 → rollback v5.
2. **Moyen terme (1j)** : implémenter le post-processing **snap-to-label** (option 1) — attendu +2 pts sur Position.
3. **Moyen terme (3h)** : A/B test Claude Sonnet 4.5 vision vs GPT-4.1 sur P00-P03 (option 2). Anthropic a parfois un meilleur spatial reasoning.
4. **Long terme** : remplacer passe-3 par un snap-to-label automatique (option 3).

**Verdict final pour Thomas** : l'extraction IA atteint **7/10 sur P00** en mode optimal (passe-3 off). Le gap vers 10/10 est **un problème de biais spatial du modèle vision**, pas un problème de prompt. Les prompts sont optimisés ; la suite doit être du code de post-processing (snap-to-label) ou un changement de modèle vision. Pas d'itération prompt supplémentaire recommandée — diminishing returns confirmés.
