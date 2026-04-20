# s23 — Prompt passe-1 v3 : ancrage mural + tuilage + passe-3 de vérification visuelle

**Date** : 2026-04-19
**Contexte** : versi-s23 / bug fondamental "3 m de drift" identifié par Thomas sur P00.
**Auteur** : @ia
**Scope** : `plan-extractor.ts` (passe-1 v3) + `visual-verifier.ts` (passe-3 nouvelle) + intégration `route.ts`.

---

## 1. Diagnostic

Thomas a testé visuellement l'Étape 3 sur P00 et a constaté deux problèmes structurels non résolus par la passe-2 (prompt v2 du `polygon-refiner`) :

1. **Drift de position** : l'IA identifie correctement le LABEL de la pièce (SdB, Chambre, Cuisine) mais place son `bounding_box` à ~3 m à côté de sa vraie localisation sur le plan. La passe-2 affinait la FORME du polygone mais autour d'une POSITION erronée — raffiner une forme sur une erreur de position = erreur de position raffinée.

2. **Tuilage absent intra-lot** : à l'intérieur d'un appartement, l'IA laissait des gaps vides (15-30 % de l'enveloppe du lot). Résultat : des pièces manquantes (WC, placard, cellier, palier, SAS) et des pièces existantes mal dimensionnées pour "rattraper" le gap.

Le prompt v2 imposait le no-overlap et le no-swallow, mais n'imposait AUCUN ancrage spatial explicite ni aucune contrainte de tuilage intra-lot.

---

## 2. Approche retenue — 3 leviers complémentaires

### Levier A — STEP 0 Reference Landmarks (nouveau)

Forcer l'IA à identifier 3-4 repères d'ancrage AVANT de positionner toute pièce :
- L1 entrée principale
- L2 escalier
- L3 coin NO du bâtiment
- L4 coin SE du bâtiment

Objectif : ancrer le système de coordonnées avant toute extraction. Pour chaque pièce ensuite, l'IA doit pouvoir répondre "cette pièce est à X% à l'est de L_N". Si elle ne peut pas, la pièce est mal positionnée → re-examiner.

**Pattern validé versi-s22** : les contraintes mentales explicites avant l'extraction améliorent la fidélité spatiale.

### Levier B — STEP 5 Wall Anchoring + Tiling (renforcé)

Ajout d'une règle absolue au début de STEP 5 + 5 règles négatives (N1-N5) :

- **N1** NEVER place a bbox >1 m away from the labeled location (estimation via door 0.83 m, WC 1.5×1.2 m).
- **N2** NEVER approximate coordinates by "reasonable guess" — trace visible walls.
- **N3** NEVER size the bbox around the text label (bbox ≫ label extent).
- **N4** NEVER omit a labeled small space (WC, placard, cellier, palier, SAS, dressing).
- **N5** NEVER leave >15 % of the unit envelope empty.

**Contrainte de tuilage intra-unit** (nouvelle, obligatoire pour "immeuble") :
- Grouper les rooms par `unit_id`.
- Calculer l'enveloppe du unit = rectangle contenant toutes les bboxes du unit.
- Calculer sum_bbox_area / envelope_area.
- Si < 0.85 → il y a des pièces manquantes, re-examiner.
- Suspects typiques : WC 1m² sous-nommé, placards, palier central, cellier/buanderie.

**Learning versi-s22 appliqué** : les règles négatives (`NEVER X, NEVER Y, ZERO Z`) surperforment les règles positives sur les contraintes dures. Validé sur transformations structurelles gpt-image-1 (open-plan, murs supprimés).

### Levier C — Passe-3 `visual-verifier` (nouvelle)

Nouveau fichier `src/lib/vs/visual-verifier.ts`. Appelée APRÈS la passe-2 (raffinement polygone) et APRÈS le resolver (non-overlap), AVANT persistance en base.

**Principe** :
1. Pour chaque lot, composer un overlay SVG des polygones colorés + labels sur l'image du plan (via `sharp.composite`).
2. Envoyer l'image composée à GPT-4.1 vision avec prompt d'audit : "chaque polygone coloré labellisé représente une pièce détectée. Compare avec le plan sous-jacent. Identifie chaque polygone qui dérive de >1 m de sa vraie position."
3. Récupérer les corrections (polygone corrigé + confidence + drift estimé).
4. Appliquer les corrections avec confidence ≥ 0.8.

**Palette colorimétrique** : 15 couleurs saturées distinctes (E63946, 2A9D8F, F4A261, 264653…) avec fill-opacity 0.22 pour laisser voir le plan sous-jacent. Labels en blanc bordé noir (paint-order: stroke fill) pour lisibilité.

**Budget** : 1 appel GPT-4.1 par lot ≈ $0.04-0.06. Total pipeline : passe-1 ($0.08) + passe-2 ($0.06/plan) + passe-3 ($0.05/lot) ≈ $0.20/plan. Conforme à l'enveloppe Thomas (+0.10/plan acceptable pour fiabilité).

**Garde-fous** :
- Ne jamais inventer de nouvelle room (R8 du prompt passe-3) — la passe-3 corrige des polygones existants, elle ne peut pas ajouter.
- Refuser les corrections pour room_id inconnu.
- Fallback sur polygone passe-2 si la passe-3 échoue.
- Désactivable via `VS_VISUAL_VERIFY=false` (flag env).

---

## 3. Contrôle de robustesse — règles négatives > positives

Le prompt passe-3 contient :
- 8 règles R1-R8 (positives + négatives mélangées).
- Explicit "NEVER fabricate a new room" (R8).
- Explicit "confidence < 0.6 when unsure" (R4).
- Explicit "empty corrections array if all correct" (R7).

La palette + l'opacité 0.22 + les labels bordés garantissent que l'IA peut LIRE le plan SOUS les polygones — critique pour qu'elle puisse comparer.

---

## 4. Risques résiduels & mitigations

| Risque | Mitigation |
|---|---|
| Passe-3 invente une correction qui déplace un polygone correct | Seuil confidence ≥ 0.8 (strict) + instruction explicite "empty if all correct" |
| GPT-4.1 ne voit pas le plan à travers l'overlay coloré | Opacité 0.22 (choisie après tuning mental), 15 couleurs distinctes, labels petit format |
| Coût explose si beaucoup de lots | 1 appel par lot (pas par pièce), flag `VS_VISUAL_VERIFY=false` si nécessaire |
| Passe-3 échoue / timeout | Try/catch autour de l'appel, fallback sur polygone passe-2 |
| Régression vs passe-2 actuelle | Passe-3 additive seulement — si 0 correction acceptée, polygones passe-2 inchangés |

---

## 5. Critères de succès (à valider sur P00/P01/P02/P03)

- **Position** : chaque pièce a son polygone qui touche les murs visibles de cette pièce (tolérance < 1 m).
- **Tuilage** : union des polygones d'un unit ≥ 85 % de l'enveloppe du unit.
- **Overlap** : 0 overlap (déjà garanti par resolver, inchangé).
- **Surface totale bbox / building_outline** : ≥ 70 % (quality gate G existant).

---

## 6. Reality check E2E — voir section "Reality check" du rapport session s23

Conformément à la règle s22 "pas de claim `fixé` sans screenshot visuel" :
- Dev server lancé sur `localhost:5000`.
- Projet P00 créé via API, upload + run `/extract`.
- Vérification DB `vs_rooms` : polygones à la BONNE position.
- Screenshot Étape 3 avant/après via Playwright.
- Les 4 plans P00-P03 seront à re-tester empiriquement par Thomas. Le reality check dans cette session se limite à P00 (le plan utilisé pour le diagnostic initial).

---

## 7. Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/lib/vs/plan-extractor.ts` | +STEP 0 landmarks, renforcement STEP 5 (wall-anchor + tiling + 5 règles négatives), +3 self-review checks (18-20). |
| `src/lib/vs/visual-verifier.ts` | **NOUVEAU** — passe-3 overlay + audit GPT-4.1 + corrections. |
| `src/app/api/vs/projects/[id]/extract/route.ts` | Mémorisation imageBuffer par plan, appel passe-3 après resolver, avant conversion lot-local. |

---

## 8. Rollback

En cas de régression constatée en prod :
```
export VS_VISUAL_VERIFY=false
```
Désactive la passe-3, conserve passe-1 v3 + passe-2 v2. Si la passe-1 v3 cause régression, revert git du commit s23.
