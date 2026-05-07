# Re-audit Persona Marchand de Biens — Vague 2 (Lots A→F, 22 fixes)
**Session** : s33 Phase 5 — 2026-05-07
**Branche** : `claude/versi-s33-propagation-context-u8L8y`
**Référence** : Phase 1 `s33-audit-persona-marchand-etape3-4.md` — score 7.5/10
**Commits évalués** : 10af1f8 (A), ca4c1e2 (B), b99d45d (D), 8fcc212 (C), bb0112e (E), 1707c94 (F)

---

## 1. Grille GP1-GP10 v2

| # | Gate | Statut Phase 1 | Statut Phase 5 | Preuve | Verbatim Thomas |
|---|---|---|---|---|---|
| GP1 | Compréhension immédiate | PASS | PASS | Étape 3 : titre "Identifiez les pièces" stable. Étape 4 : Stepper présent → progression visible immédiatement | "Je sais où j'en suis dès l'ouverture — lot en cours, étape 4 sur 4, c'est clair." |
| GP2 | Valeur percue | BLOQUANT PARTIAL | PASS | `handleConfirmAllPending` dans `rooms/page.tsx` L.654 : 8 clics → 1. Toast F-2 8s visible. Undo suppression F-3 fonctionnel. | "8 pièces IA à confirmer = 1 clic 'Tout confirmer (8)'. C'est exactement ce que je voulais." |
| GP3 | Crédibilité | PASS | PASS | Surfaces temps réel inchangées. Design tokens Lot C appliqués (badge, focus, 44px hit target). Pas de régression. | "L'interface fait pro, les pièces sont bien typées visuellement. Je fais confiance." |
| GP4 | Parcours fluide | BLOQUANT PARTIAL | PASS | Bulk confirm retire le blocage de validation lot. Undo suppression (F-3) avec toast "Annuler" clair. UndoRedo Lot B visible. | "Je confirme tout en 1 clic, je valide le lot, je passe à l'Étape 4. Plus de friction inutile." |
| GP5 | Pricing acceptable | N/A | N/A | Outil interne | — |
| GP6 | Recommandation | N/A | N/A | Outil interne | — |
| GP7 | Conviction | BLOQUANT PARTIAL | PASS | Stepper Étape 4 présent (`placement/page.tsx` L.236, L.269). Bulk confirm. Toast 8s standard. Parcours bout-en-bout sans cassure. | "Je dépose le plan, je valide les lots, je confirme les pièces en 1 clic, je génère les visuels. Workflow qui tient la route." |
| GP8 | Look and feel | FAIL | PASS | Stepper importé et rendu en Étape 4 (`placement/page.tsx` L.26 `import Stepper`, L.236 `<Stepper currentStep={4} ...>`). Lot C : badges design tokens, focus ring visible. | "Le stepper latéral est là comme en Étape 3. Je reconnais l'interface. C'est le même outil." |
| GP9 | Outputs utiles | PASS | PASS | Pièces IA pré-positionnées inchangées. Bulk confirm ne change pas la qualité de détection. Brief architecte toujours injecté dans génération. | "Les pièces sont là, les surfaces sont là, les visuels vont s'appuyer sur mon brief complet." |
| GP10 | Fidélisation | REQUIS PARTIAL | PASS | Toast undo suppression (F-3, 8s) = confiance dans les actions destructives. Bulk confirm = gain temps constant à chaque opération multi-pièces. | "Sur chaque immeuble avec 6-8 pièces par lot, je gagne 7 clics. C'est du temps réel à chaque opération." |

---

## 2. Score Phase 5 vs Phase 1

| Dimension | Phase 1 | Phase 5 |
|---|---|---|
| BLOQUANT (GP1, GP2, GP3, GP4, GP7, GP9) | 4/6 PASS (GP3+GP7 PARTIAL) | **6/6 PASS** |
| REQUIS (GP8, GP10) | 1/2 PASS (GP8 FAIL) | **2/2 PASS** |
| Score | **7.5/10** | **9.5/10** |
| Verdict | GO CONDITIONNEL | **GO PROD** |

Progression : +2 points, résolution du seul FAIL dur (GP8 stepper) et des deux PARTIAL bloquants (GP2+GP7 bulk confirm).

---

## 3. Frustrations résolues (top 5)

1. **Confirmation individuelle pièces IA** (GP2+GP7 PARTIAL → PASS) : 8 clics individuels → 1 clic "Tout confirmer (8)". `RoomPanel.tsx` + `rooms/page.tsx` L.654. Le PATCH parallèle + optimistic update = invisible pour Thomas.

2. **Stepper absent Étape 4** (GP8 FAIL → PASS) : `Stepper currentStep={4}` dans `placement/page.tsx` L.236/269/300. Cohérence visuelle Étape 3 → Étape 4 restaurée. Plus de cassure de paradigme.

3. **Suppression irréversible sans filet** (risque utilisateur) : Undo 8s avec toast "Annuler" + restauration à la position originale (F-3). Pattern Gmail = réflexe naturel pour Thomas.

4. **Toast trop court/trop long** : `TOAST_DURATION_MS = 8000ms` centralisé dans `toast-duration.ts`. Cohérence sur toutes les actions. 8s = assez pour lire + réagir sans être intrusif.

5. **Undo/Redo invisibles** (Lot B) : Keyboard shortcuts + boutons visibles dans l'UI. Thomas peut Ctrl+Z sans chercher.

---

## 4. Frustrations résiduelles

### Résiduel mineur — "uploadez" non corrigé (Lot A)
`VisualWizardRoomStep.tsx` ligne 1263 : *"Cliquez sur le plan pour placer une prise de vue, puis uploadez la photo."*
Le Lot A ciblait 3 copy quick wins (anglicisme `uploadez`, jargon dev, double libellé). Ce fichier porte encore l'anglicisme. Impact Thomas : faible — il lit "uploadez" comme "déposez la photo", le sens passe. Mais c'est incohérent avec la correction Lot A revendiquée.
**Correction** : `VisualWizardRoomStep.tsx:1263` → "puis déposez la photo."

### Résiduel mineur — Navigation non-linéaire wizard Étape 4
Le wizard reste strictement Précédent/Suivant sur les pièces. Si Thomas a 6 pièces et veut sauter à la pièce 4, il navigue linéairement.
Impact : acceptable pour la majorité des opérations (3-4 pièces). Devient friction sur des immeubles 6+ pièces par lot.
**Correction future** : mini-sommaire cliquable pièces dans `VisualWizard.tsx`.

### Résiduel risque runtime — `useVisualsStream` non testé E2E
Lot E couvre 70 tests régression mais le hook `useVisualsStream` qui gère le SSE génération visuels n'a pas de test runtime live signalé. Si le SSE se déconnecte à 30s sur une génération de 240s, Thomas voit un spinner muet jusqu'au timeout.
Impact : non bloquant en usage nominal mais visible sur des connexions moyennes (4G terrain).

---

## 5. Verdict

**GO PROD 9.5/10**

"L'Étape 3 et l'Étape 4 forment maintenant un workflow cohérent de bout en bout. Le stepper est là en Étape 4, je confirme mes pièces IA en 1 clic, je peux annuler une suppression en 8 secondes si je me plante. C'est le niveau de finition que j'attends d'un outil professionnel. Les 0.5 manquants c'est 'uploadez' qui traîne en Étape 4 et le jump non-linéaire entre pièces — des petits défauts qui ne m'empêchent pas de travailler."

---

## 6. Reality check Thomas live obligatoire ?

**OUI — recommandé avant mise en production**, sur les deux risques résiduels signalés :

1. **Divergence audit Lot B-2** : l'audit statique confirme le stepper et les boutons Undo/Redo dans le DOM. Mais le comportement du stepper (étapes complétées calculées depuis `project.status`) dépend du statut DB réel. Sans un projet au statut `step_3_complete`, le stepper Étape 4 pourrait afficher 0 étapes complétées → regressive sur GP8. Un smoke test avec projet réel (PDF Muguets en `step_3_complete`) prend 5 minutes.

2. **`useVisualsStream` runtime** : Lot E couvre la régression unitaire mais la génération SSE 240s en conditions réseau normales n'est pas validée. Un test live avec génération réelle sur 1 pièce confirmerait ou invaliderait le comportement du spinner + timeout.

**Effort requis** : 20 minutes, 1 projet de test avec données réelles.
**Risque si non fait** : GP7 Conviction potentiellement fragilisé si SSE drop silencieux sur génération longue.

---

**Handoff -> @orchestrator**
- Fichier produit : `docs/qa/s33-reaudit-persona-marchand-vague2.md`
- Verdicts : BLOQUANT 6/6 PASS, REQUIS 2/2 PASS, **GO PROD 9.5/10** (vs 7.5/10 Phase 1)
- Points d'attention :
  - Anglicisme "uploadez" résiduel : `VisualWizardRoomStep.tsx:1263` (correction 1 ligne, hors scope re-audit)
  - Reality check Thomas live recommandé avant prod : smoke test stepper `step_3_complete` + SSE 240s génération (20 min)
- Prochaines étapes recommandées : correction micro anglicisme @fullstack (1 ligne) + smoke test live @qa → production si OK
