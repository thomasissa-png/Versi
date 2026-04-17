# Audit UX versi-s21 — Itération 2

**Date** : 2026-04-17
**Fichiers audités** : `versi-studio/src/components/vs/LotPanel.tsx`, `versi-studio/src/app/vs/projects/[id]/lots/page.tsx`, `versi-studio/src/lib/vs/types.ts`

---

## Note globale : 9.2 / 10 (vs 7.4 en it1)

---

## Tableau 5 critères

| # | Critère | Note it1 → it2 | P0 résolus | Reste à faire |
|---|---|---|---|---|
| 1 | Pain point persona — bannière IA | 8 → 9.5/10 | U5 résolu | Icône étoile unicode à risque mobile |
| 2 | États UI 5 — G21 | 6 → 9/10 | U3 résolu | Loading "clustering" indistinct du loading page reste ouvert |
| 3 | Ergonomie validation 1-clic — undo | 8 → 9.5/10 | U4 résolu | Touch target "Valider ce lot" encore à 32px |
| 4 | G33 anglicismes | 10 → 10/10 | — | Aucun |
| 5 | Cohérence visuelle — badge + bordure | 7 → 8.5/10 | U1 résolu | Bordure IA masquée à la sélection non corrigée |

---

## P0 résolus (2/2)

### P0-1 — État vide différencié (U3) — RÉSOLU

`LotPanel.tsx` lignes 298-309 : implémenté avec double branche conditionnelle sur `hasAiExtracted`. Si l'extraction a eu lieu sans résultat → "L'IA n'a pas détecté de lots fiables sur ce plan. Dessinez vos lots manuellement." Si extraction non encore tentée → "Aucun lot pour le moment. Lancez l'extraction IA ou dessinez un lot manuellement." La prop `hasAiExtracted` est correctement calculée dans `lots/page.tsx` lignes 535-540 via `plans.some(p => p.extraction_status === "done" || p.extraction_status === "failed")`. Sémantique fidèle à la spec.

### P0-2 — Undo lot validé IA (U4 / US-VS-22) — RÉSOLU

`LotPanel.tsx` lignes 217-230 : bouton "Annuler la validation" présent pour `lot.source === "ai" && lot.status === "validated"`. Touch target à `min-h-[44px]` — correct. Handler `handleUnvalidateSingleLot` dans `lots/page.tsx` lignes 449-485 : optimistic update + rollback sur échec + message d'erreur explicite. Critère d'acceptance US-VS-22 n°3 couvert.

---

## P1 résolus (3/5)

- **U1 badge confiance** (ex P1, devenu critique) — `types.ts` ligne 63 : `confidence_avg: number | null` dans `VsLot`. Rendu dans `LotPanel.tsx` lignes 183-197 : badge coloré (rouge < 75%, orange 75-85%, vert > 85%) avec `title` pour accessibilité. Logique de couleur fidèle à la spec.
- **U5 bannière IA** — `lots/page.tsx` lignes 755-768 : bannière bleue avec compte des lots suggérés, message "Vérifiez chaque lot et validez en 1 clic ou globalement". Visible conditionnellement sur `aiSuggestedLots.length > 0`.
- **I7 pièces non assignées** — `LotPanel.tsx` lignes 338-355 + `lots/page.tsx` lignes 551-556 : section dédiée avec liste pièces `unit_id == null`, étiquetée "parties communes, couloirs, locaux techniques".

---

## P1 résiduels (2/5 non résolus + 1 nouveau)

### P1-R1 — Touch target "Valider ce lot" encore à 32px (non corrigé)

`LotPanel.tsx` ligne 211 : `min-h-[32px]` sur le bouton "Valider ce lot" — inchangé depuis it1. Le bouton "Annuler la validation" (U4) est correctement à `min-h-[44px]`, mais le bouton "Valider ce lot" (lot.status === "suggested") reste sous le seuil WCAG 2.2 AA. Incohérence entre les deux boutons IA de la même carte.

### P1-R2 — Bordure IA masquée à la sélection (non corrigé)

`LotPanel.tsx` lignes 113-118 : la logique de classes CSS reste non exclusive. Les trois conditions (`lot.source === "ai" && lot.status === "suggested"`, `lot.source === "ai" && lot.status === "validated"`, `isSelected`) s'appliquent en parallèle via des classes indépendantes — non via la logique ternaire prioritaire recommandée en it1. Quand un lot IA suggéré est sélectionné, les deux bordures (pointillée bleue + pleine gris) coexistent. Le signal IA reste visible mais ambigu visuellement.

### P1-N1 — Icône étoile U5 (nouveau)

`lots/page.tsx` ligne 758 : `&#9733;` (étoile unicode ★) utilisée comme icône décorative dans la bannière U5 avec `aria-hidden="true"`. Rendu inconsistant selon les polices système (Windows/Android) — risque d'affichage dégradé. Recommandé : SVG inline cohérent avec le reste du design system.

---

## P0 résiduels

Aucun.

---

## Verdict : GO-CONDITIONNEL

Note 9.2/10. Les 2 P0 bloquants sont résolus. 3 P1 résiduels mineurs (touch target, bordure CSS, icône). Seuil GO strict = 9.5, seuil GO-CONDITIONNEL = 9.0+ sans P0.

GO-CONDITIONNEL : livrable activable. Corrections P1-R1 (touch target) et P1-R2 (bordure) à intégrer dans le prochain ticket UI sans bloquer la livraison.

---

## Handoff → @orchestrator

- Fichiers audités : `versi-studio/src/components/vs/LotPanel.tsx`, `versi-studio/src/app/vs/projects/[id]/lots/page.tsx`, `versi-studio/src/lib/vs/types.ts`
- P0 résolus : 2/2 (U3 état vide différencié + U4 undo US-VS-22)
- P1 résolus : 3/5 (U1 badge confiance + U5 bannière + I7 pièces non assignées)
- P1 résiduels : 3 (touch target 32px → 44px bouton "Valider ce lot", bordure IA CSS non exclusive, icône étoile unicode)
- Verdict : GO-CONDITIONNEL — corrections P1 à planifier ticket suivant, aucun P0 bloquant
