# Patterns post-processing IA vision — Versi

> Source : s23 (snap-to-label OCR). Documenté pour réutilisation sur futurs pipelines IA vision avec drift systémique non-fixable par prompt.

## Principe général

Quand un modèle vision (GPT-4.1, Claude, Gemini) produit un biais systémique insensible aux prompts (≥3 itérations testées), **explorer post-processing code-level AVANT de changer de modèle**. Le post-process est souvent plus rapide, moins coûteux et plus stable qu'un changement de modèle.

## Pattern snap-to-label (plans, cartes, schémas annotés)

### Stack validée s23
- **OCR** : Tesseract local (gratuit, ~3-5s/plan)
- **Matching** : Levenshtein distance + accent-strip
- **Géométrie** : translation du centroïde du polygone sur position label

### Critères d'application
- Modèle vision produit polygones/bbox **avec dérive systémique** (ex : drift y ~10% sur plans architecturaux)
- Document source contient des **labels imprimés lisibles** (ex : "SdB", "Chambre", "Cuisine")
- Drift non-fixable après ≥3 itérations de prompt (testé 3 formulations distinctes)

### Résultats mesurés (P00, s23)
- Baseline prompt-only : **6.03/10** (plafond)
- Avec snap-to-label : **pic 9.35/10** (+3.32 pts), median 7.96/10
- 5/6 rooms snappées, 4/6 drift ≤2.2% (~50cm)
- Limitations : labels trop petits (ECS) non détectés, variance amont passe-2 IA

### Feature flag obligatoire
`VS_SNAP_LABELS=true|false`. Permet désactivation rapide si régression détectée en prod.

## Pattern preserve-complexity (vérifieurs IA)

### Principe
Toute passe de vérification IA (visual-verifier, auditeur) DOIT retourner une sortie **au moins aussi riche que l'entrée** :
- N vertices in → ≥N vertices out
- N polygones in → ≥N polygones out
- Confidence in → ≥confidence out

### Règle de rejet
Si la passe de vérification retourne une sortie **moins riche** que l'entrée (downgrade vertex count, drop polygone sans raison explicite), **rejeter la correction** et conserver la donnée d'entrée.

### Implémentation s23
Règles R9/R10/R11 dans `visual-verifier.ts` : refuser downgrade N vertices + baisser seuil confidence 0.8→0.6 (correction moins agressive).

### Motivation
Source s23 : passe-3 GPT-4.1 dégradait parfois polygones raffinés (6-8 pts → 4 pts mal placés). Scores P00 **sans passe-3 > avec passe-3** (+1.5 pts sur certains plans). La vérification doit **mitiger** les cas limites, pas dégrader la médiane.

## Checklist intégration nouveau pipeline

Pour tout nouveau pipeline IA vision Versi Studio (polygones, annotations, extraction) :

1. Baseline prompt-only mesurée empiriquement sur N≥3 cas représentatifs
2. Si plafond < 9/10 après 3 itérations prompt → envisager post-processing
3. Identifier la donnée ground-truth disponible dans le document (labels, cotes, échelle, coordonnées)
4. Implémenter correction code-level minimale (OCR, edge detection, heuristique géométrique)
5. Feature flag obligatoire (désactivable en prod)
6. Tests unit + reality check E2E (Playwright screenshot ou DB read)
7. Score post-correction empirique documenté dans `docs/ia/s[N]-*-result.md`

## À ne pas faire

- ❌ Itérer 5+ fois sur un prompt quand la dérive est systémique — signal d'un plafond technique
- ❌ Changer de modèle sans avoir tenté le post-process (souvent le post-process est suffisant)
- ❌ Livrer sans feature flag de désactivation (risque régression silencieuse en prod)
- ❌ Ajouter une passe de vérification qui dégrade la médiane (preserve-complexity obligatoire)
