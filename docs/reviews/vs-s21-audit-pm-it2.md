# Audit Product Manager versi-s21 — Itération 2

**Date** : 2026-04-17
**Auditeur** : @product-manager
**Scope** : Re-audit clustering IA — corrections it1 (P0 E7 + P1 E1/E4/E5/E8)
**Persona** : Thomas, marchand de biens, 8-12 opérations/an

---

## Note globale : 9.2 / 10 (vs 7.4 en it1)

---

## Tableau 5 critères

| # | Critère | Note it1 → it2 | Écarts résolus | Écarts résiduels |
|---|---|---|---|---|
| 1 | Conformité US-VS-21 | 7/10 → 9.5/10 | E1 (≥2 pièces + confidenceMin ≥0.5 + exception studio) — I1 (nested map) — I2 (suffixe numérique) — I3 (guard bbox) | E2 (fallback maison) P2 — non bloquant |
| 2 | Conformité US-VS-22 | 8/10 → 9.5/10 | E4/U4 (bouton "Annuler la validation" — handler + rollback) — "Tout valider" toujours opérationnel | Aucun |
| 3 | Règle "no AI > bad AI" | 8/10 → 9/10 | I5 (warning `unit_clustering_low_confidence` émis backend si >50% rejet) — I6 (`extraction_reason` 3 valeurs) — seuil 0.7 confirmé | E8/P1-4 (events analytics) — reporté Phase 6 |
| 4 | Backward compat | 9/10 → 10/10 | `confidence_avg: number \| null` ajouté dans `VsLot` (types.ts:63) — nullable, lots manuels non impactés — DELETE cible `source='ai'` uniquement | Aucun |
| 5 | Valeur persona Thomas | 7/10 → 9/10 | U5 (bannière "L'IA a pré-créé N lots") — U3 (état vide différencié) — U1 (badge confiance %) — I7 (pièces non assignées) | E8 events analytics absents (bloque mesure KPI) |

---

## Écarts résolus depuis itération 1

### E1 / U2 — RÉSOLU — Filtre ≥2 pièces + confidenceMin ≥0.5 + exception studios

`clustering.ts:171-176` : la condition multi-critères est implémentée.
- `confidenceAvg >= 0.7` (seuil existant)
- `confidenceMin >= 0.5` (nouvelle guard)
- `groupRooms.length >= 2` (nouvelle guard)
- Exception studio : `isStudioException` accepte 1 pièce si `name_raw` contient `studio` ou `t1`

Arbitrage I10 documenté dans le code (commentaire ligne 127). Conforme spec.

### E4 / U4 — RÉSOLU — Bouton "Annuler la validation" (undo lot validé IA)

`LotPanel.tsx:218-230` : bouton "Annuler la validation" présent pour `lot.source === "ai" && lot.status === "validated"`, conditionné sur prop `onUnvalidateSingle`. Touch target `min-h-[44px]` respecté.

`lots/page.tsx:449-485` : handler `handleUnvalidateSingleLot` — PATCH `{ status: "suggested" }` + rollback optimistic si échec. Wiring complet vers `LotPanel` (ligne 808).

Critère d'acceptance US-VS-22 #3 : PASS.

### E5 / U3 — RÉSOLU — État vide différencié

`LotPanel.tsx:298-310` : deux branches selon `hasAiExtracted`.
- Si `hasAiExtracted=true` : "L'IA n'a pas détecté de lots fiables sur ce plan. Dessinez vos lots manuellement."
- Sinon : "Aucun lot pour le moment. Lancez l'extraction IA ou dessinez un lot manuellement."

`lots/page.tsx:535-540` : `hasAiExtracted` dérivé via `plans.some(p => p.extraction_status === "done" || "failed")`. Logique correcte.

### E7 (P0) / U5 — RÉSOLU — Bannière feedback post-extraction IA

`lots/page.tsx:756-768` : bannière `bg-blue-50` affichée si `aiSuggestedLots.length > 0`.
Texte : "L'IA a pré-créé N lot(s) depuis votre plan. Vérifiez chaque lot et validez en 1 clic ou globalement."

La bannière est conditionnelle (disparaît quand tous les lots sont validés — `aiSuggestedLots` se met à jour via `lots` state). Thomas comprend immédiatement que l'IA a travaillé pour lui.

P0 levé. Valeur centrale de la feature maintenant visible.

### I1 — RÉSOLU — Nested Map (plus de split `::`)

`clustering.ts:139-154` : `Map<number, Map<string, ExtractedRoom[]>>` — structure robuste indépendante du contenu de `unit_id`.

### I2 — RÉSOLU — Suffixe numérique pour ≥3 lots par étage

`clustering.ts:66-68` + `extract/route.ts:180-190` : tri par `avgX` avant attribution de `positionIndex` → suffixes `#1`, `#2`, `#3` sans collision.

### I3 — RÉSOLU — Guard bbox négative

`clustering.ts:108-110` : fallback `{x:0, y:0, w:100, h:100}` si `maxX <= minX || maxY <= minY`.

### I5 — RÉSOLU — Warning `unit_clustering_low_confidence` backend

`extract/route.ts:154-161` : si `rejectionRate > 0.5`, warning émis dans `warnings[]`. Le calcul est backend, indépendant du LLM. Conforme spec.

### I6 — RÉSOLU — `extraction_reason` enrichi

`extract/route.ts:228-233` : `extractionReason` = `"success"` | `"no_units_detected"` | `"low_confidence"`. Exploitable côté `lots/page.tsx` pour le feedback U5 (actuellement U5 se base sur `aiSuggestedLots.length`, ce qui est suffisant en pratique).

### I7 / E3 — RÉSOLU (bonus it2) — Section "Pièces non assignées"

`lots/page.tsx:551-556` : `unassignedRooms` dérivé depuis `currentPlan.extraction_data.rooms.filter(r => r.unit_id == null)`.
`LotPanel.tsx:339-355` : section dédiée "Pièces non assignées (N)" avec liste nom/surface/étage + note explicative. Thomas voit les couloirs et parties communes non rattachés.

### U1 — RÉSOLU (bonus it2) — Badge confiance % dans LotCard

`LotPanel.tsx:183-197` : badge coloré rouge/orange/vert selon seuils (< 0.75 / 0.75-0.85 / > 0.85). `confidence_avg` persisté en base à l'INSERT (route.ts:211-221).

---

## Écarts résiduels

### E2 — P2 (non bloquant) — Fallback maison individuelle non géré explicitement

Non traité en it2 (scope P2 confirmé). Le comportement dépend du prompt GPT qui assigne `unit_id="u1"` à toutes les pièces d'une maison. Si GPT retourne `unit_id=null` → 0 lot créé, état vide affiché avec guide manuel. Risque acceptable en V1, à gérer en Phase 2 si remontée utilisateur.

### E8 — P1 (reporté) — Events analytics absents

Les 4 events (`lot_auto_created`, `lot_auto_validated`, `lot_manually_adjusted`, `ia_fallback_triggered`) ne sont pas implémentés. Sans ces events, le KPI "taux de validation 1-clic" n'est pas mesurable. Reporté Phase 6 analytics (accord bundle it1).

---

## Verdict : GO

L'implémentation it2 résout le P0 bloquant (E7 → U5) et les 3 P1 actionnables (E1 → U2, E4 → U4, E5 → U3) plus 3 items bonus (U1, I7 et les corrections algo I1/I2/I3). La valeur persona Thomas est désormais visible : la bannière annonce le travail de l'IA, le badge confiance permet de prioriser la vérification, le undo sécurise l'action.

Le seul P1 résiduel (E8 — events analytics) ne bloque pas la mise en production — il bloque la mesure du gain ×5-10x. À traiter en Phase 6.

**Ratio couverture critères d'acceptance** :
- US-VS-21 : 9/10 critères PASS (E2 P2 ouvert — non bloquant)
- US-VS-22 : 4/4 critères PASS

---

**Handoff → @orchestrator**
- Fichiers produits : `docs/reviews/vs-s21-audit-pm-it2.md`
- Décisions prises : verdict GO — 1 P1 résiduel (events analytics Phase 6) + 1 P2 résiduel (fallback maison)
- Points d'attention :
  - E8 (events analytics) : bloquer la mesure du KPI North Star — priorité Phase 6 avant toute décision de scaling
  - E2 (fallback maison) : à surveiller en production — si 1+ retour Thomas sur "0 lot détecté pour une maison", ajouter le fallback explicite
  - `extraction_reason` retourné par l'API non encore exploité pour différencier les messages U5 selon la cause (success vs low_confidence vs no_units) — amélioration UX future
