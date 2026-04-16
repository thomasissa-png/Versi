# Audit UX — Étape 3 Pièces (US-VS-13/14/15) v1
**Session** : versi-s18 | **Date** : 2026-04-16 | **Persona** : Thomas marchand de biens (outil interne)

---

## Tableau d'audit

| Critère | Note /10 | Findings (P0/P1/P2) | Corrections EXACTES |
|---|---|---|---|
| 1. Conformité spec §5 | 6,5/10 | P0 RoomCanvas:389 — canvas `role="img"` sans interaction clavier (non sélectionnable au clavier) ; P0 page:317 — `confirm()` natif pour suppression (non conforme, pas de ConfirmModal) ; P1 RoomCanvas:388 — pas d'overlay de surbrillance rouge pour pièces `non_identifie` lors du blocage validation (spec l.838-839) ; P1 RoomPanel:378-380 — warning texte seul sans surbrillance rouge sur items de la liste ; P1 page:37 — debounce 1s sur PATCH alors que spec l.805 dit "pas de debounce ici car changement discret" ; P2 RoomPanel:141-146 — option `non_identifie` en dropdown est `disabled` mais le placeholder bloquant n'a pas de couleur distinctive rouge en list item | P0 canvas: remplacer `role="img"` par une surcouche accessible (voir §3) ; P0 suppression: remplacer `confirm()` par un ConfirmModal cohérent avec Étape 2 ; P1 overlay rouge: dans `draw()` RoomCanvas ajouter `ctx.strokeStyle = "#DC2626"` + `lineWidth = 3` si `room.room_type === "non_identifie"` quand `validationBlocked === true` (prop à passer) ; P1 debounce: passer `DEBOUNCE_MS` à 0 ou supprimer le debounce sur room_type change uniquement |
| 2. 5 états UI documentés (G21) | 7/10 | P1 loading page:417-433 — message "Identification des pièces en cours..." correct mais le skeleton ne couvre pas le RoomPanel (le panneau latéral apparaît vide/blanc pendant le chargement, pas de skeleton drawer) ; P1 état vide RoomPanel:318-323 — le message existe mais pas de bouton "Ajouter une pièce" prominent centré (spec l.688 : "bouton Ajouter une pièce" dans l'état vide — le bouton est dans la section actions en bas, pas dans l'empty state) ; P2 succès — aucun toast "Lot validé" ni message de transition explicite quand on passe au lot suivant, juste un badge silencieux ; P2 loading par lot — quand on change de lot, pas d'état loading individuel (les pièces du lot sont chargées en bloc au démarrage, donc OK fonctionnellement, mais si rechargement manuel => pas de feedback) | P1 skeleton panel: pendant `loading === true`, afficher dans l'aside RoomPanel un skeleton de 3 cartes pièces (3x `div.animate-pulse h-16 rounded-md bg-bg-default`) ; P1 bouton dans empty state: dans RoomPanel:318-323 ajouter `<button onClick={onAddRoom}>+ Ajouter une pièce</button>` à l'intérieur du bloc `rooms.length === 0` (en plus du bouton bas) ; P2 toast succès: après `handleValidateLot` succès, déclencher un toast vert "Lot [nom] validé — passage au lot suivant" (durée 3s) |
| 3. A11y (focus-visible, ARIA, keyboard, touch 44px) | 6/10 | P0 RoomCanvas:389-401 — canvas `role="img"` non interactif au clavier : impossible de sélectionner une pièce sans souris/touch ; P0 RoomPanel:159-176 — les room cards ont `role="button"` + `tabIndex={0}` + `onKeyDown` corrects, mais le `div` conteneur parent `onClick` ne bloque pas l'event quand on tab dans les contrôles enfants (dropdown, input) — le clic sur le select déclenche aussi la sélection de pièce via bubbling (partiellement mitigé par `e.stopPropagation()` sur les selects OK) ; P1 RoomPanel:265-279 — bouton "Supprimer" : `py-2xs` + `px-xs` très petit, target estimée < 44px (py-2xs ≈ 4px + texte 12px ≈ 20px hauteur totale) ; P1 RoomPanel:334-345 — bouton "Ajouter une pièce" : `py-sm` ≈ 8px + texte 14px ≈ 30px — < 44px ; P1 RoomPanel:83 — tabs lots : `py-sm px-md` ≈ 8+16 = ~32px hauteur — < 44px ; P2 canvas: pas de `aria-describedby` décrivant les pièces interactives pour screen reader | P0 canvas: ajouter sous le `<canvas>` un `<ul className="sr-only">` listant les pièces avec leur type (aria-live pour les updates) + gérer focus sur les éléments de cette liste pour keyboard nav ; P1 supprimer: changer `py-2xs` → `py-sm min-h-[44px]` (RoomPanel:272) ; P1 ajouter: changer `py-sm` → `py-[10px] min-h-[44px]` sur les 3 boutons d'action (RoomPanel:337, 350, 388) ; P1 tabs lots: ajouter `min-h-[44px]` sur chaque tab button (RoomPanel:93) |
| 4. Cohérence avec Étape 2 Lots (canonique) | 7,5/10 | P1 suppression — Étape 2 utilise `ConfirmModal` (composant dédié), Étape 3 utilise `window.confirm()` natif (page:317) : incohérence critique d'expérience ; P1 RoomCanvas vs PlanCanvas — le canvas Lots utilise un resize handle visuel (poignée) pour ajuster les zones, le canvas Rooms n'a aucun resize handle pour les pièces (drag seul, pas de resize) — la spec ne le demande pas explicitement mais l'absence de handles peut surprendre après l'Étape 2 (P2 car hors spec) ; P2 badge "Lot validé" position — dans Étape 2, le badge succès est en inline dans la liste des lots, dans Étape 3 il est en header du panel sur fond vert/10 — cohérence acceptable mais différente ; P2 bouton retry — dans les erreurs Étape 2, un bouton "Réessayer" est explicite ; dans Étape 3, l'erreur globale (page:509-546) a un X de fermeture mais pas de bouton "Réessayer" | P1 confirm → ConfirmModal: importer et utiliser `ConfirmModal` (déjà existant dans le codebase canonique) dans `handleDeleteRoom` à la place de `window.confirm()` (page:317-318) ; P2 retry: dans le bloc erreur (page:509-546), ajouter un bouton "Réessayer" à côté du X : `<button onClick={fetchData}>Réessayer</button>` |
| 5. Parcours fluide (frictions, surbrillance, sync canvas/panel) | 7/10 | P1 sync canvas→panel — clic sur pièce dans canvas (`handleMouseDown` RoomCanvas:305) appelle `onSelectRoom(room.id)` ✓ — la pièce est bien mise en surbrillance dans le panel (via `isSelected` RoomPanel:153) ; mais le panel ne scrolle pas automatiquement jusqu'à la pièce sélectionnée quand la liste est longue (T5 = 7 pièces, liste scrollable) ; P1 blocage validation visuel — quand `hasUntypedRooms` la surbrillance rouge des pièces bloquantes n'est pas implémentée sur le canvas (spec l.838 : "surbrillance des pièces concernées") — le warning texte seul est insuffisant ; P1 sélection lot suivant — l'auto-sélection après validation fonctionne (page:385-390) mais il n'y a pas d'animation/transition visuelle pour indiquer le changement de lot (brusque) ; P2 overlay drag — pendant le drag d'une pièce, pas d'indicateur de position live (coordonnées, m² recalculés) — pattern recommandé dans le brief F05 (applicable mais hors spec stricte) ; P2 état lot sélectionné dans dropdown >5 — quand `lots.length > 5`, le dropdown affiche "✓ " en prefix texte (RoomPanel:141) — non accessible et visuellement pauvre vs les tabs avec icône SVG | P1 scroll-to-room: dans `renderRoom`, ajouter `ref={el => { if (isSelected && el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }}` sur le div racine de la pièce ; P1 surbrillance rouge: passer `validationAttempted` boolean au RoomCanvas, dans `draw()` ajouter après dessin normal `if (validationAttempted && room.room_type === "non_identifie") { ctx.strokeStyle = "#DC2626"; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h); }` ; P2 overlay: dans `handleMouseMove` pendant drag, afficher un petit badge coordonnées en overlay HTML absolu sur le canvas |

**Note finale** : 6,8/10
**Verdict** : GO CONDITIONNEL — 3 P0 bloquants à corriger avant mise en production (canvas clavier, confirm natif, surbrillance blocage)

---

## Détail des findings

### Critère 1 — Conformité spec §5

### Critère 2 — 5 états UI (G21)

### Critère 3 — Accessibilité

### Critère 4 — Cohérence Étape 2 Lots

### Critère 5 — Parcours fluide

---

## Synthèse et plan de correction prioritaire

---

## Hypothèses à valider
