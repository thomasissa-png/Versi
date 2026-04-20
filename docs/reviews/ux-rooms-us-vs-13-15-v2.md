# UX Audit v2 — Étape 3 Pièces (US-13 à US-15)
# Session versi-s18 — Branche claude/versi-s18-pieces-autopilot-Vlowg

Date : 2026-04-16
Auditeur : @ux (re-audit post-corrections Batch 2)
Référence v1 : docs/reviews/ux-rooms-us-vs-13-15-v1.md (score 6.8/10)

---

## Tableau comparatif v1 → v2

| Critère | v1 /10 | v2 /10 | Verdict |
|---|---|---|---|
| 1. Conformité spec §5 | 6.5 | 9.0 | PASS |
| 2. 5 états UI (G21) | 7 | 8.5 | PASS |
| 3. A11y (focus, ARIA, keyboard, touch 44px) | 6 | 8.5 | PASS |
| 4. Cohérence Étape 2 Lots | 7.5 | 9.0 | PASS |
| 5. Parcours fluide (sync, surbrillance) | 7 | 9.0 | PASS |

**Note v2** : 8.8 /10
**Verdict** : GO CONDITIONNEL (1 P1 résiduel — aria-describedby absent sur bouton disabled)

---

## Vérification des 8 corrections Batch 2

### P0-1 — window.confirm() → ConfirmModal (page.tsx:695-709)
CORRIGE. `handleDeleteRoom` (ligne 371-376) positionne `roomToDelete` via `setRoomToDelete({id, name})`. La `<ConfirmModal>` est montée en ligne 695-709 avec `isOpen={roomToDelete !== null}`, `confirmLabel="Supprimer"`, `cancelLabel="Annuler"`, `variant="danger"`. Plus de `window.confirm()`. P0 levé.

### P0-2 — Canvas navigable clavier (SR-only ul/buttons) (RoomCanvas.tsx:416-438)
CORRIGE. `<ul className="sr-only" aria-label="Liste des pièces du lot">` présente en ligne 417. Chaque pièce est rendue comme `<li><button>` avec handler `onClick` et `onKeyDown` (Enter/Space). Les lecteurs d'écran peuvent naviguer et sélectionner chaque pièce. P0 levé.

### P0-3 — Surbrillance rouge blocage validation (RoomCanvas.tsx:229-245 + RoomPanel.tsx:181-186)
CORRIGE. Dans `draw()` (RoomCanvas.tsx ligne 229-245) : `isBlockedRoom = validationBlocked && room.room_type === "non_identifie"` → fill `rgba(220, 38, 38, 0.5)` + stroke `#DC2626` épaisseur 3. Dans RoomPanel.tsx ligne 181-186 : `isBlockedRoom` → classe CSS `border-error border-2 bg-bg-card`. La surbrillance rouge est cohérente sur les deux surfaces (canvas + panel). P0 levé.

### P1-1 — Debounce PATCH room_type désactivé (page.tsx:225-313)
CORRIGE. `patchRoomImmediate` défini lignes 226-250 : annule tout timer debounce en attente pour la pièce, puis PATCH direct sans délai. Dans `handleUpdateRoom` (ligne 308-313) : si `isRoomTypeChange` → `patchRoomImmediate`, sinon `patchRoom` (debounce normal). Les positions et autres champs continuent d'utiliser le debounce. P1 levé.

### P1-2 — Empty state CTA inline (RoomPanel.tsx:339-351)
CORRIGE. Lignes 340-351 : quand `rooms.length === 0`, un bloc centré affiche "L'IA n'a pas détecté de pièces — ajoutez-en manuellement" suivi d'un `<button>` "Ajouter une pièce" avec classes `min-h-[44px]`, styles primaires et `focus-visible`. Le bouton pied-de-panel (ligne 362-373) reste également présent pour cohérence. P1 levé.

### P1-3 — Lot validé → invalidé après changement type (page.tsx:282-293 + 624-651)
CORRIGE. Dans `handleUpdateRoom` lignes 282-293 : si `isRoomTypeChange && lotWasValidated` → `setLots` rebascule le lot sur `status: "suggested"` (optimistic) + `setWarningMessage("Le lot a été invalidé — validez-le à nouveau avant de continuer")`. Bandeau warning lignes 624-651 : `role="status"`, message, bouton fermeture avec `aria-label`. L'utilisateur sait immédiatement que son action a une conséquence. P1 levé.

### P1-4 — Touch target Supprimer ≥44px (RoomPanel.tsx:293-299)
CORRIGE. Bouton Supprimer ligne 294-299 : classes `min-h-[44px] min-w-[44px]` présentes, conformes WCAG 2.5.5 (cible 44×44px). P1 levé.

### P1-5 — Scroll-to-selected dans panel (RoomPanel.tsx:81-88)
CORRIGE. `useEffect` lignes 81-88 : `if (selectedRoomId && cardRefs.current[selectedRoomId])` → `scrollIntoView({ behavior: "smooth", block: "nearest" })`. Les refs sont assignées dans `renderRoom` (ligne 176-178). Quand une pièce est sélectionnée via le canvas, la card correspondante devient visible sans scroll manuel. P1 levé.

### GAP CORR-5 — aria-describedby bouton "Valider ce lot" disabled
NON CORRIGE. Bouton "Valider ce lot" (RoomPanel.tsx lignes 376-403) : présence d'un attribut `title` conditionnel (ligne 388-392) mais absence d'`aria-describedby` pointant vers le texte d'avertissement. Le `title` est inaccessible sur mobile et n'est pas lu par les SR dans tous les contextes. Le texte d'avertissement "Définissez le type de toutes les pièces avant de valider" existe en `<p>` (lignes 406-410) mais n'est pas lié au bouton. P1 résiduel confirmé.

---

## P0 résiduels
Aucun. Les 3 P0 (window.confirm, clavier canvas, surbrillance rouge) sont levés.

## P1 résiduels
- **CORR-5** — `aria-describedby` absent sur bouton "Valider ce lot" disabled. RoomPanel.tsx ligne 377. Correction : ajouter `id="validate-warning"` sur le `<p>` d'avertissement (ligne 407) + `aria-describedby="validate-warning"` sur le bouton. Correction < 5 min.

## Verdict final
**GO CONDITIONNEL** — 8.8/10.

Tous les P0 sont levés. 7/8 corrections P1 validées. 1 P1 résiduel (aria-describedby) non bloquant pour la livraison mais à corriger avant déploiement production.

Correction requise avant GO définitif :
- RoomPanel.tsx ligne 377 : ajouter `aria-describedby` sur bouton "Valider ce lot" + `id` sur le `<p>` d'avertissement associé.

---

**Handoff → @fullstack**
- Fichier produit : docs/reviews/ux-rooms-us-vs-13-15-v2.md
- Décisions prises : 8/8 corrections vérifiées en code, 7/8 PASS, 1 P1 résiduel documenté avec correction exacte
- Action requise : RoomPanel.tsx — ajouter `id="validate-lot-warning"` sur `<p>` ligne ~407 + `aria-describedby="validate-lot-warning"` sur `<button>` ligne ~377. Aucune autre correction nécessaire.
