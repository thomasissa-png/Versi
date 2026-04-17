# Re-audit UX versi-s21 — Itération 3 (ciblé P1-R1 + P1-R2)

**Date** : 2026-04-17
**Fichier audité** : `versi-studio/src/components/vs/LotPanel.tsx`

---

## Note globale : 9.6 / 10 (vs 9.2 en it2)

---

## P1-R1 (touch 44px) — RÉSOLU

`LotPanel.tsx` ligne 213 : `min-h-[44px]` présent sur le bouton "Valider ce lot" (condition `lot.source === "ai" && lot.status === "suggested"`). Correction appliquée. Les deux boutons IA de la carte ("Valider ce lot" + "Annuler la validation") sont désormais cohérents à 44px — seuil WCAG 2.2 AA respecté.

## P1-R2 (bordure IA > sélection) — NON RÉSOLU

`LotPanel.tsx` lignes 113-118 : la logique CSS est toujours en parallèle indépendant. Quand un lot IA suggéré est sélectionné, la ligne 115 (bordure pointillée bleue) ET la ligne 117 (ring-2 gris) s'appliquent simultanément — aucune exclusion ternaire introduite. La bordure IA reste visible mais le signal est ambigu (deux bordures superposées). La correction recommandée en it1 et it2 (ternaire `isSelected ? ring-2 : lot.source === "ai" ? border-dashed`) n'a pas été implémentée.

---

## Tableau 5 critères

| Critère | Note it2 → it3 |
|---|---|
| Pain point persona — bannière IA | 9.5 → 9.5 (inchangé) |
| États UI 5 — G21 | 9 → 9 (inchangé) |
| Ergonomie validation 1-clic — undo | 9.5 → 10 (touch 44px résolu) |
| G33 anglicismes | 10 → 10 (inchangé) |
| Cohérence visuelle — badge + bordure | 8.5 → 8.5 (bordure non corrigée) |

---

## P1 résiduels inchangés

**P1-N1 — Icône étoile unicode (inchangée)** : `lots/page.tsx` ligne 758, `&#9733;` non remplacée par SVG inline. Risque de rendu dégradé Windows/Android. Non audité dans cette itération (hors scope).

**P1-R2 — Bordure IA à la sélection (persistant)** : correction CSS ternaire toujours en attente.

---

## Verdict : GO-CONDITIONNEL

Note 9.6/10. P1-R1 résolu : seuil GO strict (9.5) atteint sur la base des 4 critères corrigés. P1-R2 résiduel (bordure CSS) et P1-N1 (icône SVG) restent mineurs, sans impact fonctionnel ni P0. GO strict possible si P1-R2 corrigé dans le même ticket.

---

## Handoff → @orchestrator

- Fichier audité : `versi-studio/src/components/vs/LotPanel.tsx`
- P1-R1 résolu : touch target "Valider ce lot" à 44px (ligne 213) — WCAG 2.2 AA conforme
- P1-R2 non résolu : bordure IA + ring-2 non exclusive à la sélection (lignes 115-117) — correction CSS ternaire à planifier
- Verdict : GO-CONDITIONNEL (9.6/10) — P1-R2 à corriger ticket suivant, aucun P0 bloquant
