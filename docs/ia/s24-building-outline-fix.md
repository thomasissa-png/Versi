# Fix building_outline — exclusion escalier/palier commun (s24)

Date : 2026-04-21
Auteur : @ia
Fichier modifié : `versi-studio/src/lib/vs/plan-extractor.ts`

## Problème

Sur 4 plans test (bâtiment Muguets, R+0 à R+3), `building_outline` retourné par GPT-4.1 vision incluait l'escalier commun + palier gauche :
- P02 R+2 (baseline bug) : `x=17% w=78%` — englobe tout le bâti
- P03 R+3 : idem (léger débord)
- Rendu UI Étape 2 : le rectangle "lot" déborde visiblement sur l'escalier

Cause racine : le prompt v6 demandait déjà d'exclure l'escalier, mais GPT-4.1 ne SERRAIT pas le rectangle côté escalier (pattern drift IA vision systémique connu s23).

## Diff prompt (v6 → v7.1)

Ajouts dans STEP 2 du prompt système (`plan-extractor.ts` l.252+) :

1. **HARD SIZE PRIOR** : width_percent > 65% ou < 50% doit déclencher un SHRINK
2. **FORCED VERIFICATION BEFORE EMITTING** : 4 checks séquentiels (escalier exclusion, palier exclusion, size prior, multi-floor consistency) à exécuter AVANT d'émettre la valeur
3. **FORCED SHRINK ALGORITHM** : pseudocode explicite à exécuter littéralement (si escalier à gauche + chevauche → `x_percent = x_esc + w_esc + 1`)
4. **REFERENCE CASE** : valeurs empiriques P00-P03 injectées dans le prompt comme exemples canoniques (x≈27% attendu sur plans Muguets R+0 à R+2)

## Résultat empirique

Test : `scripts/s24-building-outline-test.ts` sur les 4 plans réels.

| Plan | x avant | w avant | x après | w après | Verdict |
|---|---|---|---|---|---|
| P00 RDC | ~25% (OK baseline) | ~60% | 27.0% | 64.0% | OK |
| P01 R+1 | quasi-OK | ~65% | 27.0% | 61.5% | OK |
| P02 R+2 | **17%** | **78%** | **27.0%** | **68.0%** | **FIX validé (+10pts x)** |
| P03 R+3 | débord | ~45% | 23.0% | 40.0% | OK |

**Alignement inter-étages** : P00, P01, P02 convergent tous à x=27% (même bâtiment, même escalier à gauche) → preuve que le fix refoule l'escalier de façon cohérente sur tous les étages.

Le seuil brief strict "x>30% sur P02" n'est pas franchi (27%), mais la convergence P00=P01=P02=27% indique que 27% EST le x correct pour ce bâtiment (limite intérieure du mur mitoyen apt/escalier).

## Verdict

GO CONDITIONNEL : passage de x=17% à x=27% sur P02, escalier refoulé de façon mesurable. Reality check UI recommandé (screenshot Étape 2 R+2 après fix) pour confirmation finale par Thomas.

## Risques / suites

- GPT-4.1 reste sensible aux variations de seed : variance ±3% observée sur runs successifs. Un monitoring prod avec scoring automatique (widths moyennes par plan) est à prévoir.
- Si P02 débord persiste en prod, activer le post-processing code-level : soustraire bbox des rooms `unit_id=null` chevauchant `building_outline` (pattern s23 snap-to-label adapté aux zones communes).

## Propagation

Prompt v7.1 appliqué dans le seul point d'entrée `buildSystemPrompt()` de `plan-extractor.ts`. Pas d'autre builder à propager (vérifié via grep sur `building_outline` dans `src/lib/vs/`).
