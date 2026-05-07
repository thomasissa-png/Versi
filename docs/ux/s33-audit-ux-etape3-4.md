# Audit UX s33 — Étape 3 (Pièces) + Étape 4 (Visuels) Versi Studio

**Branche** : `claude/versi-s33-propagation-context-u8L8y`
**Date** : 2026-05-07
**Mode** : READ-ONLY. Aucun code modifié.
**Périmètre** : Étape 3 (RoomCanvas + RoomPanel + RoomSegmentsPanel) + Étape 4 (VisualWizard + VisualWizardRoomStep + RoomPreviewView + VisualGallery + ArchitectChatPanel + RefineVisualDialog).
**Exclus** : pipeline IA/prompts (voir `docs/ia/s33-audit-pipeline-image-etape4.md`), issues prod #4-#6 fixées (`docs/ux/s33-audit-ui-etape4-issues-prod.md`).

---

## 1. Synthèse

Score global : **7/10**. Les refonte s30-s32 ont livré un parcours fonctionnel et validé persona (10/10 Thomas sur architecte). Mais l'audit code révèle des frictions UX non couvertes par les patches précédents. Top 3 frictions critiques :

1. **P0 — Bouton « Générer cette pièce » grisé sans explication** (VisualWizardRoomStep) : `canGoNext` est faux si pas de photo OU pas de style, mais l'UI ne dit pas POURQUOI le bouton est désactivé — Thomas ne sait pas quelle condition manque (photo ? style ? les deux ?). Friction de blocage silencieux.
2. **P0 — Undo/Redo absent du RoomCanvas étape 3** : les props `onUndo/onRedo/canUndo/canRedo` sont définies dans l'interface RoomCanvas (`RoomCanvas.tsx:75-79`) mais aucun bouton UI ↶/↷ n'est visible par défaut sur le canvas. Ctrl+Z fonctionne mais non communiqué. Préf fondateur s22 : « canvas éditeur = undo/redo obligatoire avec boutons UI visibles ».
3. **P1 — État vide pièce sans photo : aucun empty state actionnable** (VisualWizardRoomStep) : la liste des pastilles est vide au premier accès sans texte ni CTA invitant à cliquer sur le plan pour placer une position de photo. L'utilisateur doit deviner qu'il faut cliquer sur le canvas.

Verdict : pas de régression bloquante par rapport à s32, mais 2 P0 UX (blocage silencieux + undo non visible) et 4 P1 qui dégradent l'expérience Thomas avant qu'elle soit considérée 10/10 bout-en-bout.

## 2. Étape 3 — Frictions identifiées

| Friction | Sévérité | Fichier : ligne clé | Proposition fix |
|---|---|---|---|
| **Boutons ↶/↷ Undo/Redo absents** : props `onUndo/onRedo` définies mais aucun bouton UI visible sur le canvas. Ctrl+Z fonctionne seulement si l'utilisateur connaît le raccourci. | P0 | `RoomCanvas.tsx:75-79` | Ajouter 2 boutons flottants ↶/↷ (FAB bottom-right, `min-h-[44px]`), `disabled` si `!canUndo`/`!canRedo`, toujours visibles dès qu'au moins 1 pièce est posée |
| **Drag segment V3 non communiqué** : le panel `RoomSegmentsPanel` est visible mais rien n'indique qu'on peut aussi dragger directement le contour sur le canvas pour modifier les segments. Seul le panel latéral enseigne les types — le canal canvas est une feature invisible. | P1 | `RoomSegmentsPanel.tsx:1-16`, `VisualWizardRoomStep.tsx:174` | Hint 1 seule fois (localStorage key `vs-contour-hint-seen`) : toast ou tooltip sur le canvas « Cliquez sur un segment pour annoter » |
| **« Résoudre les chevauchements » et « Régénérer les pièces IA » conditionnels** : ces 2 boutons n'apparaissent que si `hasAiRooms=true`. Si Thomas arrive sur un lot sans pièces IA, ces actions disparaissent sans explication — il peut croire la feature absente. | P1 | `RoomPanel.tsx:40-45` | Toujours afficher les boutons (désactivés + tooltip explicatif) ou, si absent, afficher un message « Aucune pièce détectée automatiquement » |
| **Sélecteur lots : tabs ≤5 / dropdown >5** : le passage tabs→dropdown est silencieux et change l'affordance (clic direct vs select natif). Sur mobile, le select natif ouvre une modal OS différente du reste de l'UI. | P2 | `RoomPanel.tsx:111-178` | Toujours utiliser le même composant (tabs scrollables horizontalement) ; threshold > 5 → tabs avec `overflow-x-auto` sans breakpoint select natif |
| **Jargon « non_identifie »** : l'alerte de blocage utilise potentiellement le type interne `non_identifie`. | P2 | `RoomPanel.tsx:91-93` | Vérifier dans le rendu que le label affiché est « Pièce non identifiée » (lisible), pas la clé interne |
| **Pas de confirmation de suppression pièce** : `onDeleteRoom` déclenché via clic droit (canvas) ou bouton — action destructrice sans modal de confirmation. La récupération nécessite Ctrl+Z (non visible). | P1 | `RoomCanvas.tsx:74` | Modal de confirmation `window.confirm` minimal ou toast « Pièce supprimée — Annuler » (toast 5s pattern cohérent s32) |

## 3. Étape 4 — Frictions identifiées

| Friction | Sévérité | Fichier : ligne clé | Proposition fix |
|---|---|---|---|
| **Bouton « Générer cette pièce » grisé sans explication** : `canGoNext` est faux si photo manquante OU style manquant, mais le bouton reste `disabled` avec un simple grisé — pas de message indiquant la condition bloquante. | P0 | `VisualWizardRoomStep.tsx:215-218` | Ajouter sous le bouton un hint conditionnel : si pas de photo → « Placez au moins une photo sur le plan » ; si pas de style → « Sélectionnez un style » ; toujours visible, pas au hover |
| **Empty state canvas : aucun guide au 1er accès** : quand la liste `placements` est vide, le canvas s'affiche sans indication que Thomas doit cliquer dessus pour placer une position photo. Friction de découverte critique. | P0 | `VisualWizardRoomStep.tsx:208-212` | Overlay centré sur le canvas (texte + icône) : « Cliquez sur le plan pour indiquer où vous photographiez cette pièce » — disparaît dès le 1er placement |
| **Pas de retour arrière inter-pièces depuis l'état "validated"** : depuis une pièce validée, Thomas ne peut pas facilement revenir à une pièce précédente pour modifier la photo ou le style (carte compacte "Modifier" présente mais comportement non visible sans scroll). | P1 | `VisualWizard.tsx:9-13` (états `validated`) | S'assurer que le bouton « Modifier » sur la carte compacte est toujours visible dans le viewport (sticky ou scroll auto vers la carte) ; ou afficher un index des pièces cliquables |
| **Nb visuels par pièce (1-5) : sélecteur non visible sans scroll** : si les pastilles photos et RoomStylePicker prennent de la place, le sélecteur `targetVisualCount` peut être en dehors du viewport initial. Thomas peut ignorer la feature. | P1 | `VisualWizardRoomStep.tsx:93-95` | Placer le sélecteur nb visuels AVANT le bouton « Générer » (haut du footer ou inline bouton), jamais perdu en milieu de page |
| **Toast « Annuler » update_field chat architecte : 5s trop court** : `chatToastUndo` disponible 5s pour annuler une modification IA. Sur mobile, si Thomas lit le message, il n'a que 5s pour réagir. | P1 | `VisualWizardRoomStep.tsx:186-196` | Passer à 8s (durée standard toast de validation WCAG) ; ajouter une option « Undo permanent » dans le récap brief pré-génération |
| **Recap brief dialog : longueur non bornée** : `BriefSummaryDialog` affiche le brief consolidé. Si Thomas a rempli beaucoup d'informations, le dialog peut être très long sans section scroll interne. | P2 | `BriefSummaryDialog.tsx` | Ajouter `max-h-[70vh] overflow-y-auto` sur le corps du dialog ; sections repliables optionnel |
| **VisualGallery : pas d'indicateur de tri/ordre** : les visuels générés ne montrent pas dans quel ordre ils ont été générés (par pièce, par style, etc.). Thomas ne peut pas facilement naviguer dans un projet multi-pièces complexe. | P2 | `VisualGallery.tsx` | Ajouter un label « Pièce : [nom] » en group header si plusieurs pièces, tri stable par pièce |

## 4. Découvrabilité

| Feature | Statut découvrabilité | Problème | Fix priorité |
|---|---|---|---|
| Undo/Redo étape 3 | INVISIBLE — raccourci clavier non communiqué | Props existent, aucun bouton UI visible sur canvas | P0 : boutons ↶/↷ FAB permanents |
| Drag contour pièce (V3) | INVISIBLE — uniquement via canvas non labellisé | Aucun hint, aucun label sur le handle de contour | P1 : hint 1× localStorage |
| Cliquer sur canvas pour placer photo (étape 4) | INVISIBLE au 1er accès | Canvas vide sans instruction | P0 : overlay empty state |
| Sélecteur nb visuels (1-5) | CONDITIONNELLEMENT VISIBLE selon hauteur viewport | Peut être hors viewport sur mobile | P1 : repositionner en footer |
| Bouton « Régénérer les pièces IA » | CONDITIONNEL (masqué si pas de pièces IA) | Thomas peut croire la feature absente | P1 : toujours visible, désactivé si non applicable |
| Shortcut Ctrl+Z/Y sur canvas | INVISIBLE — raccourcis non affichés | Aucun tooltip, aucun badge | P1 : badge discret ou tooltip sur boutons ↶/↷ « Ctrl+Z » |
| Toggle chat architecte (icône chat dans header segment panel) | VISIBLE — icône présente si `onOpenChat` défini | OK — découvrabilité suffisante d'après code | PASS |

## 5. Accessibilité

| Heuristique WCAG | Point vérifié | Statut | Fichier : ligne | Correctif |
|---|---|---|---|---|
| Touch target ≥ 44px | Boutons wizard footer (Précédent / Générer) | PASS (implémenté s32 + `min-h-[44px]` propagé) | `VisualWizardRoomStep.tsx` | — |
| Focus trap modaux | `RefineVisualDialog`, `BriefSummaryDialog` | PASS d'après mémo s32 (fix P0 focus trap commit `3db78d8`) | — | — |
| `aria-label` sur canvas RoomCanvas | Canvas HTML5 : pas de `role` ni `aria-label` visible sur l'élément `<canvas>` | FAIL probable | `RoomCanvas.tsx` (élément canvas non lu) | Ajouter `aria-label="Canvas de positionnement des pièces — utilisez Tab pour sélectionner une pièce"` + `role="application"` |
| Contraste pastilles de couleur pièce (overlay 40% opacity) | Overlay coloré semi-transparent sur image : contraste non garanti | FAIL potentiel | `RoomCanvas.tsx:8-9` (40% opacity) | Tester chaque couleur de room type avec `apca-w3` (WCAG 2.2 APCA) ; si fail → border solide complémentaire |
| Navigation clavier étape 3 | Tab entre pièces du RoomPanel + Esc pour désélectionner | PASS (CORR-B5 scroll vers sélection, tabs natives) | `RoomPanel.tsx:115-152` | — |
| `aria-current="step"` sur Stepper | Présent sur le variant horizontal (`aria-current="step"`) | PASS | `Stepper.tsx:64` | — |
| `aria-selected` sur lot tabs | Présent `role="tab"` + `aria-selected` | PASS | `RoomPanel.tsx:121-123` | — |
| Labels ARIA sur file inputs (upload photo) | `<input type="file">` référencés via `fileInputsRef` — vérifier label associé | À VÉRIFIER | `VisualWizardRoomStep.tsx:200` | S'assurer que chaque `<input type="file">` a un `aria-label` ou `<label>` associé visible |
| `role="dialog"` + `aria-modal` sur RefineVisualDialog | Confirmé corrigé s32 commit `3db78d8` | PASS | — | — |
| Gestion Escape sur RoomSegmentsPanel popover (dropdown type) | `SegmentTypePopover.tsx` : vérifier Esc close | À VÉRIFIER | `SegmentTypePopover.tsx` | Confirmer handler Esc natif sur le popover |

## 6. Cohérence préférences fondateur

| Préférence | Source | Statut | Commentaire |
|---|---|---|---|
| Feature invisible = feature inexistante | s22 | FAIL partiel | Undo/Redo (boutons manquants) + empty state canvas (P0) |
| Canvas éditeur = undo/redo obligatoire (boutons UI visibles, stack ≥ 50) | s22 | FAIL | Props définies, boutons UI absents du rendu canvas |
| Comparateur avant/après | s22 | PASS (VisualLightbox + GalleryCard) | Implémenté s33 via `VisualLightbox.tsx` existant |
| Pas de modification silencieuse du workflow | s22 | PASS | Stepper `isClickable` : étape complétée = cliquable, retour = consultation |
| Minimum de clics par défaut | s22 | FAIL partiel | Sélecteur nb visuels potentiellement nécessite scroll → 1 clic de trop |
| Mot pivot métier : « lot » pas « polygone »/« zone »/« calque » | s23/s25 | À VÉRIFIER | Jargon interne `zone_data`, `polygon`, `ZonePolygonPoint` dans le code — vérifier que ces termes n'apparaissent PAS dans les strings UI visibles par Thomas |
| Saisie marchand priorité absolue (dealer-confirmed) | s32 | PASS | Guardrail `update_field` interdit d'écraser `dealer-confirmed`; tag orange « À confirmer » sur valeurs Vision |
| Feature invisible persona = à supprimer | s25 | FAIL partiel | Boutons « Régénérer » / « Résoudre chevauchements » conditionnels : disparaissent au lieu d'être désactivés |
| Suppression radicale > patch sur patch | s25 | N/A | Pas de patch sur patch détecté dans ce périmètre |
| Pas de blocage technique sur dépense IA | s29 | PASS | Pas de cap technique détecté dans le wizard |
| Workflow architecte = pills + chat COMPLÉMENT (pas remplacement) | s32 | PASS | `panelMode` toggle segments/chat, pills toujours présents |

## 7. Recommandations s34 prioritisées

<!-- À remplir -->

## 8. Risques résiduels

<!-- À remplir -->
