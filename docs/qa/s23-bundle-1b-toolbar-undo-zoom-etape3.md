# s23 Bundle 1B — Toolbar + Undo/Redo + Zoom sur Étape 3 (Pièces)

**Session** : versi-s23 · **Agent** : @fullstack · **Date** : 2026-04-18
**Statut** : livré · tsc PASS · build PASS · [LIVE]

## Scope livré

Les 3 fonctionnalités de l'éditeur (déjà livrées en Bundle 1A sur Étape 2 / Lots)
sont maintenant propagées à l'Étape 3 (identification des pièces).

| Code | Feature | Fichier | Statut |
|------|---------|---------|--------|
| ED-22 | Toolbar éditeur (3 zones) | `rooms/page.tsx` | livré |
| ED-02 | Boutons Zoom +/- | `RoomCanvas.tsx` + `rooms/page.tsx` | livré |
| ED-04 | Snapshot avant mutation | `rooms/page.tsx` | livré |
| ED-05 | pushUndo() instrumenté 4 points | `rooms/page.tsx` | livré |
| ED-06 | handleUndo() | `rooms/page.tsx` | livré |
| ED-07 | handleRedo() | `rooms/page.tsx` | livré |
| ED-08 | Keyboard Ctrl+Z / Ctrl+Shift+Z | `rooms/page.tsx` | livré |

## Fichiers modifiés

```
versi-studio/src/app/vs/projects/[id]/rooms/page.tsx   +321 lignes
versi-studio/src/components/vs/RoomCanvas.tsx          + 65 lignes (déjà pré-préparé par agent précédent)
2 files changed, 367 insertions(+), 19 deletions(-)
```

Scope strictement respecté : `PlanCanvas.tsx` et `lots/page.tsx` non touchés (L217).

## Pattern porté depuis Bundle 1A

Aucune refactorisation : copier-coller adapté (L209 scope mini).

1. **RoomCanvas.tsx** expose `RoomCanvasHandle` via `forwardRef` +
   `useImperativeHandle` — `applyZoom(factor, cx?, cy?)`, `resetView()`,
   `getScale()`. Même math que `handleWheel` (déjà existante). Bornes
   `ZOOM_MIN=1`, `ZOOM_MAX=8`. Notification `onScaleChange(scale)` vers le
   parent pour piloter les `disabled` des boutons zoom.

2. **rooms/page.tsx** :
   - State : `undoStack`, `redoStack` (`RoomsSnapshot[]`, max 20).
   - Refs sync : `roomsByLotRef`, `selectedLotIdRef`, `selectedRoomIdRef`
     (évite de mettre toutes les données dans les deps de chaque handler).
   - `pushUndo()` : snapshot ref courante + `setRedoStack([])`.
   - `handleUndo()` : pop undo → push current sur redo → restore.
   - `handleRedo()` : symétrique.
   - Keyboard global Ctrl+Z / Ctrl+Shift+Z (ignoré si focus
     `INPUT`/`TEXTAREA`/`SELECT`/`contentEditable`).
   - Handlers zoom : `handleZoomIn = applyZoom(1.25)`,
     `handleZoomOut = applyZoom(1/1.25)`.

3. **Points d'instrumentation pushUndo()** (AVANT mutation) :
   - `handleUpdateRoom` — drag/rename/resize/changement type
   - `handleAddRoom` — ajout manuel
   - `handleConfirmDelete` — suppression
   - `handleValidateLot` — validation (UX-P1-3 peut invalider le lot)

## Toolbar JSX (ED-22)

Structure alignée avec Bundle 1A :
- **Zone gauche** : `Undo` / `Redo` (disabled si stack vide)
- **Zone centre** : `Zoom out` / `Zoom in` (disabled selon `canvasScale`)
- **Zone droite** : slot vide (réservé Bundle 2+ : Calibrer, Fusionner, etc.)

Icônes SVG inline (même path que `lots/page.tsx`) — pas d'ajout de dépendance
`lucide-react` volontaire (le repo ne l'utilise pas et l'installer pour
4 icônes violerait la règle "ne jamais installer un package quand 10 lignes
font le travail").

## Limitations connues (V1, documentées)

- **Undo/Redo = restore local uniquement**. Un DELETE de pièce déjà envoyé
  au backend ne sera pas rollbacké côté serveur : le `undo` ré-affiche la
  pièce localement, mais au prochain `patchRoom` / refresh elle disparaîtra.
  La prochaine action utilisateur (update/add/delete) re-synchronise.
- **Reload vide les stacks** — les snapshots sont en mémoire uniquement.
- **Scope pièces uniquement** : l'undo ne restaure pas `lots[]` même si
  UX-P1-3 bascule un lot `validated → suggested` sur changement de type.
  Cf. `RoomsSnapshot` : `{ roomsByLot, selectedLotId, selectedRoomId }`.

## Validation

```
cd versi-studio && npx tsc --noEmit  → exit 0 (PASS)
cd versi-studio && npm run build     → exit 0 (PASS)
```

Tous les handlers consumers (`handleUpdateRoom`, `handleAddRoom`,
`handleConfirmDelete`, `handleValidateLot`) ont eu leurs deps `useCallback`
mises à jour pour inclure `pushUndo`.

## Handoff → @qa (session suivante)

Tests à prioriser :
1. Drag d'une pièce → Ctrl+Z → la pièce revient à sa position d'origine
2. Ajout manuel → Ctrl+Z → la pièce disparaît (mais existe encore côté DB — limite V1)
3. Delete via modal → Ctrl+Z → la pièce ré-apparaît localement
4. Rename dans RoomPanel → Ctrl+Z → ancien nom restauré (vérifier debounce PATCH)
5. Focus dans input `<textarea>` RoomPanel → Ctrl+Z doit faire `undo` du TEXTE,
   pas déclencher notre handler global (isEditableTarget)
6. Zoom in 4×, zoom out retour progressif jusqu'à `scale=1` → bouton `zoom out` disabled
7. Zoom in jusqu'à `scale=8` → bouton `zoom in` disabled

[LIVE] — exécuté sur machine locale, build PASS, pas de screenshot Playwright
(scope temps limité ; le visuel de la toolbar aligne le pattern déjà validé
en Bundle 1A).
