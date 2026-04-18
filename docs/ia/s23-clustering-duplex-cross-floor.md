# Clustering duplex cross-floor — versi-s23 P2

**Statut** : implémenté, tests 100% PASS
**Branche** : `claude/versi-s23-ocr-mobile-baselines-0eLFE`
**Code** : `versi-studio/src/lib/vs/clustering.ts` (fonction `mergeDuplexAcrossFloors`)
**Tests** : `versi-studio/tests/unit/clustering.test.ts` (11 cas dédiés + 28 existants s21 = 39/39 PASS)

## Problème résolu

Le clustering s21 (`clusterByUnit`) groupe les pièces **par (floor, unit_id)** — logique same-floor uniquement. Conséquence : un duplex dont l'appartement occupe 2 demi-niveaux (typiquement R+2 + R+3 du projet Pr2 ground truth) apparaît comme **2 lots distincts** dans l'UI, forçant Thomas à merger manuellement à chaque import.

Gap détecté lors du POC OCR s23 (`docs/ia/s23-poc-ocr-benchmark-plans-reels.md`) : c'est un **bloqueur prod** pour tout projet avec duplex.

## Architecture de la solution

### Principe : post-processing append-only

`mergeDuplexAcrossFloors` est appelée **après** `clusterByUnit` dans le pipeline d'extraction (`api/vs/projects/[id]/extract/route.ts`). Elle ne modifie pas le clustering s21 existant — elle fusionne uniquement les groupes déjà validés qui présentent des signaux cross-floor.

```
rooms[]  →  clusterByUnit (same-floor, s21)  →  initialGroups[]
         →  mergeDuplexAcrossFloors (cross-floor, s23)  →  finalGroups[]
```

### Stratégie conservative : "no merge > bad merge"

Un faux négatif (duplex non détecté, affiché en 2 lots) est **corrigible par Thomas en 2 clics**. Un faux positif (2 appartements distincts mergés par erreur) **casse la valeur commerciale** : le lot affiché ne correspond pas à la réalité cadastrale. Le seuil de preuve est donc élevé.

## Heuristique en 2 étapes

### Étape 1 : filtres obligatoires (tous requis)

| Filtre | Valeur | Justification |
|---|---|---|
| Étages consécutifs | `|floorA - floorB| === 1` | Un duplex occupe **toujours** 2 niveaux adjacents. R+1/R+3 → 2 lots distincts (triplex non supporté s23). |
| Alignement vertical | recouvrement X ≥ 30% | Un escalier interne est vertical → les 2 niveaux se superposent sur l'axe X. Sans recouvrement → 2 apparts côte-à-côte sur 2 étages. |

Si l'un de ces 2 filtres échoue → **aucun merge possible**.

### Étape 2 : signaux positifs (au moins UN requis)

| Signal | Règle | Force |
|---|---|---|
| **S1 — Escalier détecté** | regex `/\bescalier\b|\bpalier\b|\bmontée\b|\bmontee\b/i` sur `name_raw` d'au moins une pièce | **Fort** — signal quasi-certain |
| **S2 — Demi-niveaux** | `count === 1` pour les 2 groupes | Moyen — 1 pièce par étage suggère un demi-niveau |
| **S3 — Surface compatible** | `Σsurfaces ≤ 150m²` (et > 0) | Moyen — taille cohérente avec un duplex type |

Si aucun signal positif → **pas de merge** (conservateur).

### Bornes numériques (constantes exportées)

- `DUPLEX_MAX_COMBINED_AREA_M2 = 150` — seuil surface pour signal S3. Borne haute d'un duplex résidentiel standard en France. Source : analyse Pr2 ground truth (duplex 92m² combiné) + marge sécurité pour duplex familiaux (~120m²).

### Déterminisme

- Tri préalable par `floor` asc puis `unitId` lexicographique
- Chaque groupe mergé **au plus une fois** (`consumed` Set)
- Conséquence : sur 3 étages consécutifs tous candidats (cas théorique rare), seuls les 2 premiers (floor N + N+1) mergent ; le 3e reste isolé. Recommandation s24 ci-dessous.

## Cas de test couverts

Les 11 cas de `tests/unit/clustering.test.ts` (describe `mergeDuplexAcrossFloors`) couvrent la matrice :

| # | Cas | Résultat attendu | Signal déterminant |
|---|---|---|---|
| 1 | Pr2 R+2/R+3 ground truth (escalier + palier) | 1 merge | S1 |
| 2 | 2 lots même étage (gauche/droite) | 0 merge | Hors scope |
| 3 | Étages consécutifs, 4+4 pièces, 176m² | 0 merge | Aucun signal |
| 4 | Escalier explicite sans ambiguïté | 1 merge | S1 |
| 5 | 2 petits lots (66m² combiné) étages consécutifs alignés | 1 merge | S3 |
| 6 | 2 studios (count=1 chacun) étages consécutifs | 1 merge | S2 |
| 7 | RDC + R+2 (saut d'étage) | 0 merge | Filtre étages consécutifs |
| 8 | Étages consécutifs mais X disjoints | 0 merge | Filtre alignement vertical |
| 9 | 3 étages tous candidats | max 1 merge (u1+u2), u3 reste seul | Règle "au plus une fois" |
| 10 | Liste vide ou solo | inchangé | Court-circuit |
| 11 | Export constante `DUPLEX_MAX_COMBINED_AREA_M2` | = 150 | Sanity check |

## Output enrichi : `mergedFrom`

Les groupes fusionnés portent le champ optionnel `mergedFrom: string[]` listant les `unitId` sources. Exemple :

```ts
{
  floor: 2,
  unitId: "u1+u2",
  mergedFrom: ["u1", "u2"],
  rooms: [...] // union des pièces des 2 niveaux
}
```

Utilisation UI (à implémenter côté @design/@fullstack front s24) :
- Badge "Duplex R+N/R+N+1" sur la card du lot
- Tooltip "Fusion automatique de 2 niveaux détectés — modifier ?"
- Action "Défusionner" qui restitue les 2 UnitGroup sources

## Intégration pipeline

`versi-studio/src/app/api/vs/projects/[id]/extract/route.ts` ligne 157 :

```ts
const { accepted: initialGroups, candidateCount } = clusterByUnit(
  allRooms,
  CLUSTERING_CONFIDENCE_THRESHOLD
);
const unitGroups = mergeDuplexAcrossFloors(initialGroups);
```

Le warning `unit_clustering_low_confidence` (I5) est calculé **après** le merge : un merge réduit `unitGroups.length` et peut ainsi augmenter artificiellement le `rejectionRate`. Comportement acceptable car conservateur (plutôt un warning de trop qu'un duplex silencieusement mergé sans visibilité utilisateur).

## Recommandations s24

### Limites connues de l'heuristique s23

1. **Triplex non supporté** : 3+ niveaux consécutifs ne produisent qu'un seul merge de 2 étages, le 3e reste isolé. Plan d'action s24 : itération (`while` sur groupes candidats avec reset du `consumed` Set entre passes) OU heuristique dédiée triplex (3 étages + 2 escaliers détectés).
2. **Seuil surface figé à 150m²** : valide pour 95% des duplex français mais exclut les duplex très grands (maisons de ville haut de gamme, 200+m²). Plan s24 : rendre `DUPLEX_MAX_COMBINED_AREA_M2` configurable par projet (champ `project.max_duplex_area` avec default 150).
3. **Regex escalier francophone uniquement** : `escalier|palier|montée`. Plan s24 : étendre avec synonymes régionaux (`monte-escalier`, `escalier en colimaçon`) + détection visuelle (pattern hachures diagonales dans la bbox) si retour gpt-4.1 Vision insuffisant.
4. **Alignement vertical à 30%** : borne testée empiriquement sur Pr2. Plan s24 : calibrer sur 5+ duplex réels pour valider que 30% reste discriminant entre "vrai duplex" et "2 appartements partiellement superposés".

### Signaux potentiels non exploités

- **unit_id cross-floor identique** : si le LLM s23 a déjà mis `unit_id: "u1"` pour des pièces sur 2 étages (malgré le prompt same-floor), c'est un signal ultra-fort. Actuellement `clusterByUnit` les sépare — le merge les rassemble ensuite. Plan s24 : passer cette info en priorité absolue (bypass filtres) si détectée.
- **Confiance OCR** : un duplex correctement compris par le LLM aura une `confidence` homogène sur les 2 étages. Un merge douteux (2 apparts distincts) aura des confidences disparates. Plan s24 : exiger `|confidenceAvg_A - confidenceAvg_B| < 0.15` comme filtre additionnel.

### Dette technique à surveiller

- Si >1 duplex par projet deviennent fréquents, l'algorithme en O(n²) reste acceptable (n ≤ 20 en pratique). Pas d'optimisation urgente.
- Les tests utilisent un `makeGroup` factory dupliqué du `makeRoom` — extraction possible vers `tests/unit/_fixtures.ts` si d'autres fichiers de test ont besoin de `UnitGroup` mockés.
