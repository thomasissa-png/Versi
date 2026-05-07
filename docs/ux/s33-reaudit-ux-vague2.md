# Re-audit UX s33 Vague 2 — Vérification fixes Lots A/B/F

**Branche** : `claude/versi-s33-propagation-context-u8L8y`
**Date** : 2026-05-07
**Mode** : READ-ONLY ciblé sur commits `ca4c1e2` (Lot B), `1707c94` (Lot F), `10af1f8` (Lot A).
**Référence** : Phase 1 audit `docs/ux/s33-audit-ux-etape3-4.md` — score initial 7/10.

---

## 1. Verdict ciblé par fix UX

| Fix # | Désignation | Statut | Preuve grep/lecture | Commentaire |
|---|---|---|---|---|
| **B-1** | Stepper Étape 4 visible | **PASS** | `placement/page.tsx:206-228` + JSX lignes 292-312 : deux instances Stepper (aside sm:block variant vertical + sm:hidden variant horizontal). Pattern identique à rooms/page.tsx. | Stepper correctement injecté sur desktop et mobile. `completedSteps` dérivé depuis `project.status`. |
| **B-2** | Undo/Redo visibles RoomCanvas | **PASS** | `RoomCanvas.tsx:1563-1601` : toolbar dédiée `absolute top-3 right-3` avec 2 boutons 44×44px, `title="Annuler (Ctrl+Z)"` / `title="Rétablir (Ctrl+Maj+Z)"`, `data-testid="canvas-undo-btn"` / `canvas-redo-btn`. Conditionnée sur `(onUndo || onRedo)`. Props passées depuis rooms/page.tsx:1120-1123. | P0 de l'audit initial résolu. Pattern Figma/Miro respecté (top-right, pas noyé dans barre de zoom). |
| **B-3** | Empty state canvas Étape 4 | **PASS** | `VisualWizardRoomStep.tsx:1057-1093` : overlay `absolute inset-0 z-10 pointer-events-none` conditionné sur `placements.length === 0`. Icône + texte « Cliquez sur le plan pour placer une prise de vue » + sous-titre. `data-testid="wizard-empty-state"` présent. | P0 résolu. L'overlay disparaît dès qu'un placement est créé. Double guidance : overlay canvas + zone liste sous le canvas (ligne 1261-1264). |
| **B-4** | Hint conditionnel bouton Générer | **PASS** | `VisualWizardRoomStep.tsx:221-249` : `generateChecklist` (useMemo) retourne un tableau `{ok, label}` à 2 items. Rendu lignes 1599-1635 : liste `ul` visible si `disabledReason && !chatBriefValidated`, icône ✓/○ par item. `data-testid="wizard-generate-checklist"`. | P0 résolu. La checklist remplace le message texte unique. Les deux pré-requis (photo + style) sont listés distinctement. |
| **F-1** | Bulk « Tout confirmer » | **PASS** | `rooms/page.tsx:654-717` : `handleConfirmAllPending` avec optimistic update + `Promise.allSettled` parallèle. `RoomPanel.tsx:39-41` : props `onConfirmAllPending`/`isConfirmingAll` + `pendingAiCount` (ligne 106-108) pour labelliser le bouton. Toast succès via `setWarningMessage` + `TOAST_DURATION_MS`. | P1 résolu. 1 clic vs N clics pour confirmer les pièces IA. |
| **F-2** | Toast 8s | **PASS** | `src/lib/vs/ui/toast-duration.ts` : `TOAST_DURATION_MS = 8000`, `UNDO_WINDOW_MS = 8000`. Importé et utilisé dans rooms/page.tsx lignes 22-25, 705, 867, 906. Fichier documenté avec scope (inclus/exclus). | P1 résolu. Constante centralisée, testable sans jsdom. |
| **F-3** | Suppression pièce avec toast undo | **PASS** | `rooms/page.tsx:47-60` : interface `PendingDelete` complète (snapshot, originalIndex, commitTimer, displayName). `handleDeleteRoom` (lignes 549-614) : optimistic delete + `setTimeout(UNDO_WINDOW_MS)`. Toast JSX lignes 1156-1179 : `role="status"` `aria-live="polite"` `data-testid="rooms-delete-undo-toast"`. `handleUndoDelete` (lignes 618-636) : restauration à index original. Cleanup unmount (lignes 640-648). | P1 résolu. Pattern Gmail/Linear complet : toast 8s, restauration à la position originale, cleanup unmount. |
| **F-4** | Sélecteur nb visuels footer | **PASS** | `VisualWizardRoomStep.tsx:1403-1406` (commentaire) + lignes 1513-1560 : sélecteur dans le `div[data-testid="wizard-footer"]`, AVANT le footer de navigation. `role="radiogroup"` + `aria-labelledby` + boutons 44×44px. `data-testid="wizard-footer-target-count"`. | P1 résolu. Sélecteur sorti de la zone de contenu et repositionné dans le footer juste avant le CTA « Générer ». |

---

## 2. Score UX nouveau /10

| Dimension | Phase 1 | Vague 2 | Delta |
|---|---|---|---|
| P0 résolus | 1/3 (0%) | 3/3 (100%) | +3 P0 |
| P1 résolus | 0/4 (0%) | 4/4 (100%) | +4 P1 |
| Score global | **7/10** | **9/10** | **+2 pts** |

Détail du calcul : les 3 P0 (undo UI invisible, empty state absent, hint blocage silencieux) et 4 P1 (toast 8s, suppression undo, checklist, sélecteur footer) sont tous PASS. Restent les frictions P2 et risques résiduels de la Phase 1 non couverts par cette vague.

---

## 3. Frictions résiduelles détectées dans la nouvelle version

### 3.1 Frictions P2 confirmées non corrigées (hors scope vague 2)

| Friction | Sévérité | Origine | Statut |
|---|---|---|---|
| Sélecteur lots : tabs ≤ 5 / dropdown > 5 (affordance différente) | P2 | Audit Phase 1 §2 | Non corrigé — hors scope Lot B/F |
| Recap brief dialog : longueur non bornée (`max-h` absent) | P2 | Audit Phase 1 §3 | Non vérifié dans cette vague (`BriefSummaryDialog.tsx` non lu) |
| VisualGallery : pas d'indicateur tri/ordre multi-pièces | P2 | Audit Phase 1 §3 | Non corrigé — hors scope |
| `aria-label` canvas HTML5 RoomCanvas | P2 | Audit Phase 1 §5 | **CORRIGÉ** dans Lot B : `role="application"` + `aria-label` complet présent ligne 1472 |
| Jargon `non_identifie` dans les strings UI | P2 | Audit Phase 1 §2 | `getDropdownLabel` présent (RoomPanel.tsx:58-61) — le jargon est traduit via ROOM_TYPE_DROPDOWN. PASS partiel : non vérifié exhaustivement sur les toasts |

### 3.2 Nouvelle friction détectée en lecture vague 2

**Toast chat architecte : durée 3-5s maintenue (hors scope F-2)**
`VisualWizardRoomStep.tsx:314-322` : `const duration = chatToastUndo !== null ? 5000 : 3000`. Le fichier `toast-duration.ts` mentionne explicitement que `chatToast/chatToastUndo` est hors scope F-2 avec durées spécifiques. Le P1-1 de la Phase 1 (passer à 8s) n'est donc **pas appliqué** sur le toast chat architecte. La constante `TOAST_DURATION_MS = 8000` ne couvre pas ce cas.

Sévérité maintenue : **P1** (Thomas sur mobile a 5s pour cliquer "Annuler" sur une suggestion IA du chat architecte).

### 3.3 Risques résiduels Phase 1 toujours ouverts

1. Contraste pastilles overlay 40% opacity — non testé (besoin outil apca-w3).
2. File inputs sans label associé — `VisualWizardRoomStep.tsx:1344-1352` : chaque `<input type="file">` a un `aria-label` dynamique (`Uploader la photo position N` / `Remplacer...`). **CORRIGÉ** non signalé en Phase 1 — PASS.
3. Test persona Thomas smoke test bout-en-bout — toujours recommandé après vague 2.

---

## 4. Recommandations s34 — frictions résiduelles à adresser

| Priorité | Action | Effort estimé | Impact |
|---|---|---|---|
| **P1** | **Toast chat architecte : 5s → 8s.** `VisualWizardRoomStep.tsx:317` : remplacer `5000` par `UNDO_WINDOW_MS` (importer depuis `toast-duration.ts`). Cohérence totale avec le pattern Lot F. | 10 min | Thomas ne rate plus le bouton Annuler sur mobile |
| **P2-1** | **Recap brief dialog : `max-h-[70vh] overflow-y-auto`.** `BriefSummaryDialog.tsx` : contraindre la hauteur du corps du dialog pour éviter le scroll de page quand le brief est long (Thomas multi-pièces avec chat architecte rempli). | 15 min | Confort lecture brief avant génération |
| **P2-2** | **Sélecteur lots : toujours tabs scrollables** (`overflow-x-auto`), supprimer le threshold dropdown >5. Sur les projets multi-bâtiments (5+ lots), le select natif mobile ouvre un picker OS qui casse l'expérience visuelle. | 30 min | Cohérence affordance Étape 3 |
| **P2-3** | **Test persona Thomas complet bout-en-bout** après vague 2 : parcours Plans → Lots → Pièces → Visuels sur un projet réel 3 lots, 12 pièces. Objectif : valider le 10/10 en conditions réelles. | — | Gate finale persona |

---

## 5. Verdict GO 10/10 ou itération nécessaire

**Score actuel : 9/10. Itération s34 nécessaire avant validation 10/10.**

Tous les P0 et P1 de la vague 2 sont PASS. Le delta +2 pts est validé par lecture du code. Le point résiduel bloquant pour le 10/10 est unique :

- **P1 toast chat architecte 5s** (ligne 317 `VisualWizardRoomStep.tsx`) : fix 10 minutes, cohérence avec `UNDO_WINDOW_MS` déjà disponible. Ce seul P1 résiduel empêche le 10/10 strict selon la préférence fondateur.

Une fois ce P1 corrigé + P2 optionnels au choix du fondateur, le score atteint **10/10** pour le périmètre étape 3-4.

---

## Tests UX — Vague 2

| Test | Critère de succès | Statut |
|---|---|---|
| B-1 Stepper Étape 4 visible sur desktop et mobile | Stepper présent dans placement/page.tsx, deux variants | ✅ |
| B-2 Undo/Redo visibles sans scroll | Toolbar top-right RoomCanvas, 44×44px, toujours visible si props passées | ✅ |
| B-3 Empty state canvas : Thomas sait où cliquer au 1er accès | Overlay centré + pointer-events-none + disparaît au 1er placement | ✅ |
| B-4 Checklist ✓/✗ : Thomas sait pourquoi le bouton est grisé | generateChecklist useMemo, visible si disabledReason, 2 items distincts | ✅ |
| F-1 Bulk 1 clic pour confirmer N pièces IA | handleConfirmAllPending + Promise.allSettled + toast résultat | ✅ |
| F-2 Toast 8s standard (étape 3) | TOAST_DURATION_MS = 8000, centralisé, utilisé partout dans rooms/page.tsx | ✅ |
| F-3 Suppression pièce réversible 8s | PendingDelete complet, toast undo, restauration index original, cleanup unmount | ✅ |
| F-4 Sélecteur visuels visible avant CTA | Dans wizard-footer, avant boutons navigation, toujours dans viewport | ✅ |
| Toast chat architecte 8s (P1 résiduel) | duration = 5000 hardcodé, pas encore migré vers UNDO_WINDOW_MS | ❌ |

---

**Handoff → @orchestrator**
- Fichier produit : `/home/user/Versi/docs/ux/s33-reaudit-ux-vague2.md`
- Verdict : 9/10. 8 fixes sur 8 PASS. 1 P1 résiduel (toast chat 5s → 8s, 10 min de fix).
- Décisions UX : aucune décision de parcours modifiée — vérification uniquement.
- Points d'attention pour s34 : P1 `VisualWizardRoomStep.tsx:317` (remplacer `5000` par `UNDO_WINDOW_MS`) + P2 BriefSummaryDialog max-h + test persona bout-en-bout.
- Pour atteindre 10/10 strict : P1 résiduel à corriger en priorité avant test persona.
