# versi-s22 — Corrections feedback Thomas (Étapes 2 et 3)

## Résumé

4 problèmes remontés par Thomas corrigés en une passe. Zéro régression TypeScript (0 erreur `tsc --noEmit`), 0 nouvelle erreur lint.

---

## Problème 1 — Pan au curseur (Étape 2)

**Demande** : pouvoir se déplacer sur le plan une fois zoomé, avec un simple glisser sur le fond vide.

**Solution implémentée** dans `PlanCanvas.tsx` :

- **Drag gauche sur fond vide quand zoomé (scale > 1)** : active le pan automatiquement, curseur `grab` → `grabbing`
- **Bouton Main (icône main) dans la toolbar** : toggle le mode pan explicite. Quand actif : tout drag gauche = pan, même sur un lot. Visuellement : bouton en surbrillance (fond primaire inversé)
- **Ctrl+drag et middle-click** : continuent de fonctionner (pour les experts)
- **Quand scale = 1** : drag gauche classique (sélection/ajout lot) — comportement inchangé

**Fichiers** : `src/components/vs/PlanCanvas.tsx`

---

## Problème 2 — Bouton unique (Étape 2)

**Demande** : un seul bouton au lieu de "Valider tous les lots" + "Passer aux pièces".

**Solution implémentée** dans `LotPanel.tsx` + `lots/page.tsx` :

- **UN SEUL bouton** : `→ Valider et passer aux pièces` (si lots non validés) ou `→ Passer aux pièces` (si tous validés)
- Si lots IA non validés : le bouton fait les 2 actions d'un coup (PATCH status=validated sur chaque lot + POST validate + navigation)
- Si tous déjà validés : navigation directe
- Le bouton "Tout valider (X lots IA)" est **supprimé**
- Boutons de validation individuelle par lot dans les cards : **conservés** (utiles pour vérifier lot par lot)

**Fichiers** : `src/components/vs/LotPanel.tsx`, `src/app/vs/projects/[id]/lots/page.tsx`

---

## Problème 3 — Undo/Redo (Étapes 2 et 3)

**Demande** : Ctrl+Z pour annuler, boutons undo/redo dans la toolbar.

**Solution implémentée** :

- **Nouveau hook `useHistory<T>`** (`src/hooks/useHistory.ts`) : stack en mémoire, max 50 opérations, getters `canUndo`/`canRedo`
- **Raccourcis clavier** : `Ctrl+Z` (ou `Cmd+Z` Mac) = undo, `Ctrl+Shift+Z` ou `Ctrl+Y` = redo — écouteur global `window.keydown`
- **Boutons UI** : `↶` (undo) et `↷` (redo) dans la toolbar zoom, après un séparateur vertical. Grisés (opacity 30%) quand indisponibles
- **Étape 2** : snapshots sur create/delete/move/resize lot
- **Étape 3** : snapshots sur create/delete/move/resize/update pièce
- **Reset au reload** : stack en mémoire uniquement, pas persisté

**Fichiers** : `src/hooks/useHistory.ts`, `src/components/vs/PlanCanvas.tsx`, `src/components/vs/RoomCanvas.tsx`, `src/app/vs/projects/[id]/lots/page.tsx`, `src/app/vs/projects/[id]/rooms/page.tsx`

---

## Problème 4 — Plan mal calibré Étape 3

**Demande** : le plan est trop zoomé, coupé sur les côtés. Doit fonctionner comme l'Étape 2.

**Cause racine** : le crop source dans `RoomCanvas` utilisait les coordonnées exactes du lot (`lotZone`) sans marge. Un lot qui occupe 30% du plan était affiché à ras des murs extérieurs.

**Solution implémentée** dans `RoomCanvas.tsx` :

1. **Marge de 5% autour du lot** : `marginedLotZone` ajoute 5% de la taille du lot en marge de chaque côté (clampé à [0, 100]). Le crop source est élargi, le plan n'est plus coupé.

2. **Re-mapping coordonnées** : les positions des pièces (en % relatif au lot original) sont re-mappées vers la zone avec marge via `lotToMarginedPercent`. Cela garantit que les overlays de pièces restent positionnés correctement malgré la marge.

3. **Zoom + pan complet** (calqué sur PlanCanvas) :
   - Zoom molette centré curseur (min 1x, max 10x)
   - Boutons +/-/Reset dans une toolbar permanente (coin bas-droit)
   - Bouton Main (toggle pan explicite)
   - Pan par drag gauche sur fond vide quand zoomé
   - Pan par Ctrl+drag / middle-click
   - Double-clic sur fond vide = reset zoom

4. **Clic droit → menu contextuel** : "Supprimer cette pièce"

5. **Clavier** : Delete/Backspace supprime la pièce sélectionnée, Escape désélectionne

6. **Fix clearRect/setTransform** : pattern obligatoire (learning versi-s20) appliqué — reset transform avant scale DPR, clear explicite si dimensions inchangées

**Fichiers** : `src/components/vs/RoomCanvas.tsx`, `src/app/vs/projects/[id]/rooms/page.tsx`

---

## Tests exécutés

```
$ npx tsc --noEmit
(0 erreur)

$ npm run lint
4 errors (tous pré-existants dans reference-existant/ et tailwind.config.ts)
53 warnings (tous pré-existants)
0 nouvelle erreur/warning
```

## Non-régressions préservées

- Polygones IA (tracé, snap, auto-intersection check)
- Badges IA sur les lots et pièces
- Option C (flag touched, bordure pointillée IA)
- Drag/resize vertical fix (toDeltaPercent)
- Fix letterbox Étape 3
- Bouton "+ Ajouter une pièce"
- Calibration plan
- Dessin polygone libre
- Validation individuelle / annulation de lot IA
- Pièces non assignées (I7)
- Menu contextuel clic droit (PlanCanvas)
- Keyboard navigation (flèches, Delete, Escape)

---

**Handoff → Thomas**
- Fichiers produits :
  - `src/hooks/useHistory.ts` (nouveau)
  - `src/components/vs/PlanCanvas.tsx` (modifié — pan curseur, hand mode, undo/redo buttons)
  - `src/components/vs/RoomCanvas.tsx` (modifié — zoom/pan complet, marge crop, toolbar, clic droit, undo/redo)
  - `src/components/vs/LotPanel.tsx` (modifié — bouton unique)
  - `src/app/vs/projects/[id]/lots/page.tsx` (modifié — validate+navigate, undo/redo integration)
  - `src/app/vs/projects/[id]/rooms/page.tsx` (modifié — undo/redo integration, onDeleteRoom passé au canvas)
- Points d'attention pour le test :
  1. Zoomer sur l'Étape 2, vérifier que le drag sur le fond déplace le plan
  2. Cliquer sur le bouton Main, vérifier que tout drag déplace le plan (même sur un lot)
  3. Vérifier qu'il n'y a plus qu'UN bouton "Valider et passer aux pièces"
  4. Ctrl+Z après un déplacement de lot — le lot revient à sa position précédente
  5. Étape 3 : le plan ne doit plus être coupé à ras des murs du lot
  6. Étape 3 : zoom molette + toolbar + clic droit doivent fonctionner comme Étape 2
