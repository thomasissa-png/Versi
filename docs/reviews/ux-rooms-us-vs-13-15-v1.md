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

### Critère 1 — Conformité spec §5 — 6,5/10

**Ce qui passe :**
- Code couleur par type implémenté via `getRoomColor()` dans les deux composants (canvas et panel)
- Dropdown 13 types via `ROOM_TYPE_DROPDOWN` + champ `custom_label` si type = "autre" (RoomPanel:237-262) avec `maxLength={50}` conforme
- Bouton "Valider ce lot" conditionnel (`!currentLotValidated`) et désactivé si `hasUntypedRooms || rooms.length === 0` (RoomPanel:347-375)
- Auto-sélection lot suivant non validé après validation (page:385-390)
- Bouton "Continuer vers les visuels" conditionnel sur `allLotsValidated` (RoomPanel:384-398)
- Invalidation automatique non implémentée explicitement : quand Thomas change un type sur un lot déjà "validated", le statut du lot n'est pas repassé à "à valider" côté frontend (spec l.778 — cas limite US-VS-14). L'optimistic update (page:229-261) ne touche pas `lot.status`.

**Écarts spec :**
- **P0** `confirm()` natif (page:317) : la spec demande un flow UX confirmé, pas une API navigateur bloquante non stylée
- **P0** Surbrillance rouge des pièces `non_identifie` sur canvas lors du blocage validation non implémentée (spec l.838-839 : "surbrillance des pièces concernées")
- **P1** Debounce 1s sur PATCH room_type (page:37 `DEBOUNCE_MS = 1000`) alors que spec l.805 dit explicitement "pas de debounce ici car changement discret" — peut provoquer une désynchronisation couleur canvas / état base si l'utilisateur valide rapidement
- **P1** Invalidation statut lot sur changement type absent côté frontend (spec l.778)
- **P2** Option `non_identifie` désactivée dans le dropdown (RoomPanel:225-227) mais sans style visuel distinctif rouge dans la liste des pièces

### Critère 2 — 5 états UI (G21) — 7/10

**Mapping spec → code :**

| État spec | Implémenté | Localisation | Qualité |
|---|---|---|---|
| Défaut | Oui | page:489+ | Correct |
| Loading | Oui (partiel) | page:417-433 | Spinner + message OK, skeleton panel absent |
| Vide (aucune pièce détectée) | Oui (partiel) | RoomPanel:318-323 | Message OK, bouton Ajouter absent dans le bloc vide |
| Erreur | Oui | page:509-546 | Inline banner avec fermeture, sans retry |
| Succès | Oui (partiel) | RoomPanel:297-314 | Badge "Lot validé" OK, pas de toast de transition |

**Lacune P1 principale** : l'état vide spec (l.688) prescrit "bouton Ajouter une pièce manuellement" dans l'empty state lui-même. Le bouton existe mais en pied de panel (RoomPanel:332-345), pas dans le bloc `rooms.length === 0` — Thomas doit scroller pour le trouver.

**État loading individuel par lot** : non requis par la spec (les pièces sont toutes chargées en parallèle au démarrage — choix technique valide). Pas un écart.

### Critère 3 — Accessibilité — 6/10

**Ce qui passe :**
- `focus-visible` appliqué systématiquement sur tous les boutons et selects (pattern `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary`)
- `aria-label` sur les room cards (RoomPanel:170), les boutons supprimer (RoomPanel:276), le canvas (RoomCanvas:399)
- `role="tablist"` + `aria-selected` sur les tabs de lots (RoomPanel:83-84)
- `label htmlFor` sur tous les dropdowns et inputs (RoomPanel:197-200, 239-241)
- `onKeyDown` Enter/Space sur les room cards (RoomPanel:171-176)

**Écarts :**
- **P0** Canvas non navigable au clavier : `role="img"` sans keyboard interaction. Une fois sur le canvas via Tab, impossible de sélectionner une pièce au clavier. Pour un outil interne Thomas, c'est un risque d'accessibilité WCAG 2.1 AA (SC 2.1.1 Keyboard)
- **P1** Bouton "Supprimer" touch target : `px-xs py-2xs` ≈ hauteur 20px — loin des 44px minimum mobile
- **P1** Boutons d'action (Ajouter, Valider, Continuer) : `py-sm` ≈ 32px — inférieur à 44px mobile
- **P1** Tabs lots : `py-sm px-md` ≈ 32px hauteur — < 44px
- **P2** Canvas : pas d'`aria-live` region pour annoncer la sélection/désélection de pièce aux screen readers

**Note** : pour un outil interne Thomas (pas grand public), les P1 touch targets sont moins critiques sur desktop. Ils restent des P1 pour la cohérence WCAG et l'usage tablette.

### Critère 4 — Cohérence avec Étape 2 Lots — 7,5/10

**Cohérence structurelle validée :**
- Stepper `currentStep={3}` identique à l'Étape 2 avec `currentStep={2}`
- Pattern dual canvas/panel respecté
- Tokens sémantiques cohérents (même `focus-visible`, même `border-border-default`, même `bg-interactive-primary`)
- Badge "Lot validé" avec icône SVG checkmark cohérent avec le pattern success de l'Étape 2
- `role="tablist"` pour les lots ≤ 5 + dropdown pour > 5 : pattern identique

**Écarts :**
- **P1 BLOQUANT** `window.confirm()` (page:317) vs `ConfirmModal` dans Étape 2 : rupture d'expérience notable — le dialog natif sort du contexte visuel de l'application
- **P2** Toast feedback — l'Étape 2 a des toasts explicites avec retry. L'Étape 3 a un inline banner sans retry button
- **P2** Bouton "Réessayer" absent dans le banner d'erreur global (Étape 2 a ce pattern)

### Critère 5 — Parcours fluide — 7/10

**Synchro canvas ↔ panel :**
- Panel → canvas : `selectedRoomId` passé au `RoomCanvas`, surbrillance couleur + halo (RoomCanvas:237-241) — PASS
- Canvas → panel : `onSelectRoom` callback depuis `handleMouseDown` (RoomCanvas:308-310) → `setSelectedRoomId` → `isSelected` dans `renderRoom` — PASS
- **Manque** : le panel ne scrolle pas jusqu'à la pièce sélectionnée via le canvas (friction pour T5+ avec liste scrollable)

**Blocage validation :**
- Le message d'avertissement texte fonctionne (RoomPanel:377-380)
- La pièce non typée N'EST PAS mise en surbrillance rouge sur le canvas ni dans la liste — friction importante : Thomas doit scanner la liste visuellement pour trouver la pièce bloquante

**Sélection lot suivant :**
- Fonctionnel (page:385-390) mais brusque — pas de transition, pas de toast "Passage au lot suivant"

---

## Synthèse et plan de correction prioritaire

### P0 — Bloquants (3) — à corriger avant démo

| # | Fichier:ligne | Problème | Correction |
|---|---|---|---|
| P0-1 | `page.tsx:317` | `window.confirm()` natif pour suppression pièce | Importer `ConfirmModal` (déjà dans le codebase Étape 2), remplacer `confirm()` par `setDeleteTarget(roomId)` + `<ConfirmModal isOpen onConfirm onCancel>` |
| P0-2 | `RoomCanvas.tsx:389` | Canvas `role="img"` non navigable clavier | Ajouter sous le canvas un `<ul className="sr-only" aria-label="Pièces du lot">` + `tabIndex={0}` + `onKeyDown` sur chaque `<li>` ; le canvas garde `role="presentation"` |
| P0-3 | `RoomCanvas.tsx:219-268` + `RoomPanel.tsx:377-380` | Pièces `non_identifie` non surlignées en rouge lors du blocage validation | Passer prop `validationBlocked: boolean` au RoomCanvas ; dans `draw()`, après le rendu normal de chaque pièce : `if (validationBlocked && room.room_type === 'non_identifie') { ctx.strokeStyle = '#DC2626'; ctx.lineWidth = 3; ctx.strokeRect(x-1, y-1, w+2, h+2); }` ; dans RoomPanel, ajouter `className="border-error"` sur les room cards non typées quand `validationBlocked` |

### P1 — Importants (5) — à corriger dans la session

| # | Fichier:ligne | Problème | Correction |
|---|---|---|---|
| P1-1 | `page.tsx:37` | `DEBOUNCE_MS = 1000` sur PATCH room_type — spec dit pas de debounce sur changement discret | Supprimer le debounce pour les changements `room_type` uniquement : dans `handleUpdateRoom`, si `updates.room_type !== undefined`, appeler `fetch()` directement (hors debounce) ; garder le debounce pour `position` et `name` |
| P1-2 | `RoomPanel.tsx:318-323` | Bouton "Ajouter une pièce" absent dans l'empty state | Ajouter dans le bloc `rooms.length === 0` : `<button onClick={onAddRoom} className="mt-md px-md py-sm ...">+ Ajouter une pièce</button>` |
| P1-3 | `page.tsx:229-261` | Changement type ne repassé pas le lot à "à valider" côté frontend | Dans `handleUpdateRoom`, si `updates.room_type !== undefined && currentLot?.status === 'validated'`, appeler `setLots(prev => prev.map(l => l.id === selectedLotId ? {...l, status: 'pending'} : l))` |
| P1-4 | `RoomPanel.tsx:265-279` | Bouton "Supprimer" touch target < 44px (`py-2xs`) | Remplacer `px-xs py-2xs` par `px-sm py-sm min-h-[44px]` |
| P1-5 | `RoomPanel.tsx:152-284` | Panel ne scrolle pas vers la pièce sélectionnée via canvas | Dans `renderRoom`, sur le `div` racine : `ref={el => { if (isSelected && el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }}` |

### P2 — Mineurs (4) — backlog

| # | Fichier | Problème | Suggestion |
|---|---|---|---|
| P2-1 | `page.tsx:509-546` | Banner erreur sans bouton "Réessayer" | Ajouter `<button onClick={fetchData}>Réessayer</button>` dans le banner |
| P2-2 | `RoomPanel.tsx:125-146` | Dropdown > 5 lots : prefix "✓ " texte brut non accessible | Ajouter `aria-label={lot.name + (isLotValidated(lot) ? ' (validé)' : '')}` sur chaque option |
| P2-3 | `page.tsx:357-400` | Pas de toast de transition après validation de lot | Après `setSelectedLotId(nextUnvalidated.id)`, déclencher un toast "Lot validé — passage au lot suivant" (3s) |
| P2-4 | `RoomCanvas.tsx:326-368` | Pas de feedback m² pendant drag (F05 pattern Lots) | Pendant `dragging`, afficher un badge HTML absolu `top-2 right-2` avec les coordonnées live — hors spec stricte, amélioration UX |

### Vérifications règles obligatoires

**Règle n°13 UTF-8** : aucun `\uXXXX` ni entité HTML dans les strings UI des 3 fichiers — PASS.

**Registre** : `"Supprimer cette piece ? Cette action est irreversible."` (page:317) — manque les accents sur "pièce" et "irréversible" mais c'est dans un `window.confirm()` natif qui sera de toute façon supprimé (P0-1). Pas d'autre violation de registre. PASS conditionnel.

**Règle n°19 zéro anglicisme client-facing** : aucun `upload/download/feedback/meeting` détecté — PASS.

**Règle n°20 collisions Tailwind v4** : aucune custom property `--spacing-*` dans ces fichiers (pas de `@theme`) — PASS.

---

## Hypothèses à valider

1. `ConfirmModal` existe bien dans le codebase Étape 2 (canonique) — à vérifier avant P0-1. Si absent, créer un composant minimal.
2. La prop `validationBlocked` doit être gérée dans la page : créer un `useState<boolean>(false)` initialisé à `false`, passé à `true` uniquement au clic "Valider ce lot" si `hasUntypedRooms`, remis à `false` après correction.
3. Le PATCH `room_type` sans debounce doit être testé pour le rate limit (spec : 60 PATCH/min). Pour Thomas qui change 5 types rapidement c'est 5 requêtes en < 1s — dans les limites.

---

**Handoff → @fullstack**
- Fichiers produits : `docs/reviews/ux-rooms-us-vs-13-15-v1.md`
- Décisions prises : GO CONDITIONNEL (note 6,8/10) — 3 P0 bloquants identifiés, 5 P1 importants
- Points d'attention :
  - P0-1 : remplacer `window.confirm()` par `ConfirmModal` — vérifier si le composant existe en Étape 2 (`LotPanel.tsx` ou `lots/page.tsx`) avant de créer
  - P0-3 : la prop `validationBlocked` doit être ajoutée dans la signature `RoomCanvasProps` ET passée depuis `page.tsx`
  - P1-3 : l'invalidation frontend du statut lot doit se faire en local state uniquement (pas de PATCH supplémentaire) — le prochain appel `handleValidateLot` enverra le statut réel
  - Ne pas modifier l'architecture dual canvas/panel ni la logique de chargement en parallèle — ces choix sont corrects
