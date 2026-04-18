# Audit parité PlanEditor vs PlanCanvas+RoomCanvas (s23)

**Date** : 2026-04-18
**Scope** : PlanEditor.tsx (reference-existant, 3017 lignes) vs PlanCanvas.tsx (1621 lignes) + RoomCanvas.tsx (713 lignes) dans versi-studio/
**Mode validation** : [STATIQUE] — Grep + Read uniquement, pas d'exécution browser
**Urgence** : friction Étape 2/3 constatée par Thomas (zoom/undo/toolbar manquants)

## Légende

- **Ported** : feature présente côté versi-studio (même si implémentation différente)
- **ABSENT** : feature totalement absente de PlanCanvas ET RoomCanvas
- **Partial** : partiellement porté (ex: zoom wheel OK, mais UI buttons manquants)
- **Priorité** : P0 (hotfix ce soir) / P1 (semaine) / P2 (backlog)
- **Effort** : S ≤ 30 min, M = 1-2h, L = 3-5h, XL ≥ 1 jour

## Features éditeur de plan

| # | Feature | PlanEditor (ref) | PlanCanvas | RoomCanvas | Statut | Priorité | Effort port |
|---|---|---|---|---|---|---|---|
| ED-01 | Zoom scroll-wheel (Ctrl+wheel) | L756-L770 | L1292-L1311 | L608-L640 | Ported | - | - |
| ED-02 | Zoom +/- UI buttons (accessibilité tactile/souris sans wheel) | L1467-L1494 (imply) | ABSENT | ABSENT | **ABSENT** | **P0** | S (30 min) |
| ED-03 | Bouton "Réinitialiser le zoom" | L414-L415 (state only) | L1542-L1566 | L665-L673 | Ported | - | - |
| ED-04 | Undo stack (UNDO_MAX_HISTORY=20) | L207, L436-L467 | ABSENT | ABSENT | **ABSENT** | **P0** | M (1-2h) |
| ED-05 | Redo stack | L438, L469-L479 | ABSENT | ABSENT | **ABSENT** | **P0** | M (inclus ED-04) |
| ED-06 | Bouton UI "Annuler" (Ctrl+Z) | L1359-L1377 | ABSENT | ABSENT | **ABSENT** | **P0** | S (inclus ED-04) |
| ED-07 | Bouton UI "Refaire" (Ctrl+Shift+Z) | L1378-L1396 | ABSENT | ABSENT | **ABSENT** | **P0** | S (inclus ED-04) |
| ED-08 | Keyboard Ctrl+Z / Ctrl+Shift+Z global | L531-L545 | ABSENT (keyboard canvas-local L1366-L1466 uniquement) | ABSENT | **ABSENT** | **P0** | S (inclus ED-04) |
| ED-09 | Keyboard Delete/Backspace sur sélection | (implicite via selectedRoomId) | L1418-L1425 | ABSENT | Partial (PlanCanvas OK, RoomCanvas KO) | P1 | S (30 min) |
| ED-10 | Keyboard Escape (deselect / cancel drawing) | (implicite) | L1366-L1416 | ABSENT | Partial | P1 | S |
| ED-11 | Keyboard flèches (move lot/room 1px/5px) | ABSENT (drag uniquement) | L1427+ | ABSENT | Enhanced côté PlanCanvas | - | - |
| ED-12 | Snap to grid (SNAP_GRID=10 px) | L205, L246-L248, L646-L703 | ABSENT (snap polygon close uniquement L594-L602) | ABSENT | **ABSENT** (grille absente, seul snap fermeture polygone présent) | P1 | M (2h) |
| ED-13 | Alignment guides visuels (bords rooms) | L325-L370, L493, L707-L713 | ABSENT | ABSENT | **ABSENT** | P1 | L (3-4h) |
| ED-14 | Multi-sélection Shift+click (pour fusion) | L406, L1403-L1431 | ABSENT | ABSENT | **ABSENT** | P1 | M (2h) |
| ED-15 | Fusion pièces (bounding box englobante) | L813-L847 | ABSENT (scope lot, pas room) | ABSENT | **ABSENT** | P1 | M (2h, dépend ED-14) |
| ED-16 | Mode "Fusionner avec…" mobile (tap flow) | L413, L1434-L1464, L2417-L2421 | ABSENT | ABSENT | **ABSENT** | P2 | M (2h) |
| ED-17 | Calibration d'échelle inline (2 clics + modal) | L481-L490, L912-L951, L1497-L1526 | ABSENT (prop m2PerPixel consommée L1064, mais pas de UI de calibration) | ABSENT | **ABSENT** | **P0** | L (3-4h) |
| ED-18 | Bouton "Calibrer les distances" | L1497-L1526 | ABSENT | ABSENT | **ABSENT** | **P0** | S (UI, mais dépend ED-17) |
| ED-19 | Delete confirmation inline (UX C1) | L408-L409, L849-L871, L2664-L2693 | ABSENT (delete direct L1418-L1425) | ABSENT | **ABSENT** | P1 | M (1-2h) |
| ED-20 | Toolbar collapse (advanced options hidden, UX C3) | L410-L412 | ABSENT (pas de toolbar) | ABSENT | **ABSENT** | P1 | S (dépend ED-22) |
| ED-21 | Rename pièce inline (blur/Enter + undo) | L881-L894, L2598-L2631 | ABSENT (onUpdateLotZone, pas de rename inline) | ABSENT | **ABSENT** | P1 | M (1-2h) |
| ED-22 | Toolbar visible top/bottom (conteneur actions) | L1316-L1589 | ABSENT (boutons éparpillés dans parent) | ABSENT | **ABSENT** | **P0** | M (2h) |
| ED-23 | Building outline (contour bâtiment) | L221, L436, L461, L473 (undo scope) | ABSENT | ABSENT | **ABSENT** | P2 | L |
| ED-24 | Computed surface m² par pièce (live) | L234-L243, L269-L285 | Partial (computed ponctuel L1064-L1088, pas live par room) | ABSENT (scope room unique) | Partial | P2 | M |
| ED-25 | Photo markers (z-index dédié) | L222 | ABSENT | ABSENT | **ABSENT** | P2 | L |
| ED-26 | Pinch zoom 2-pointers (tactile) | ABSENT | ABSENT | L416-L510 | Enhanced RoomCanvas uniquement | P1 (porter vers PlanCanvas) | M |
| ED-27 | Pan Ctrl+drag / Middle-click | Implicite (pas explicite) | L888-L890 | L487-L510 (pan via pointer) | Ported versi-studio | - | - |
| ED-28 | aria-label canvas (accessibilité lecteur) | (à vérifier ref) | L1505 | L653+ | Ported versi-studio | - | - |

## Récap

### P0 ABSENT (hotfix ce soir recommandé)

- **ED-02** : Boutons UI +/- pour zoom (accessibilité sans wheel) — S
- **ED-04 / ED-05 / ED-06 / ED-07 / ED-08** : Undo/Redo stack + boutons UI + raccourcis clavier globaux (lot cohérent) — M total
- **ED-17 / ED-18** : Calibration d'échelle inline (2 clics) + bouton "Calibrer" — L
- **ED-22** : Toolbar visible dédiée (conteneur d'actions unifié) — M

### P1 ABSENT (semaine)

- **ED-09 / ED-10** : Delete/Escape keyboard dans RoomCanvas (manquant côté pièce)
- **ED-12** : Snap to grid global (pas juste fermeture polygone)
- **ED-13** : Alignment guides visuels inter-rooms
- **ED-14 / ED-15** : Multi-sélection Shift+click + fusion rooms
- **ED-19** : Delete confirmation inline (pattern "appuyer 2x pour confirmer")
- **ED-20** : Toolbar collapse (advanced options hidden par défaut)
- **ED-21** : Rename pièce inline (blur/Enter)
- **ED-26** : Pinch zoom tactile pour PlanCanvas (déjà OK RoomCanvas)

### P2 ABSENT (backlog)

- **ED-16** : Mode "Fusionner avec…" mobile (tap flow)
- **ED-23** : Building outline (contour bâtiment interactif)
- **ED-24** : Surface m² live par pièce (actuellement ponctuelle)
- **ED-25** : Photo markers sur plan

### Ported (OK)

- ED-01 (zoom wheel), ED-03 (reset zoom), ED-11 (flèches move enhanced), ED-27 (pan), ED-28 (aria-label)

### Effort total port (rattrapage parité complet)

- **P0** : ~1 agent × 6-8h (undo/redo + toolbar + zoom buttons + calibration)
- **P1** : ~1-2 agents × 12-16h (snap grid + alignment guides + multi-select + fusion + rename + confirmations)
- **P2** : ~1 agent × 8-12h (building outline + photo markers + surface live + fusion mobile)
- **Total agents-heures** : ~26-36h (1 agent sur 3-5 jours, ou 2 agents en parallèle sur 2 jours)

### Top 3 features hotfix CE SOIR

Critères : P0 + effort ≤ M + gain UX friction maximal.

1. **ED-22 (Toolbar visible)** — M (2h) : conteneur d'actions dédié au-dessus/en-dessous du canvas. Prérequis structurel pour ED-02/04-07/18. Sans ça, les boutons n'ont nulle part où vivre.
2. **ED-04 à ED-08 (Undo/Redo complet : stack + 2 boutons UI + shortcuts globaux)** — M (1-2h) : le manque le plus visible pour Thomas sur Étape 2/3. Pattern exact existe dans PlanEditor.tsx L436-L545, copier-coller avec adaptation aux types PlanCanvas.
3. **ED-02 (Zoom +/- UI buttons)** — S (30 min) : 2 boutons à côté du bouton "Réinitialiser le zoom" existant L1542-L1566. Appellent la logique de `handleWheel` avec deltaY simulé, ou factorisent une fonction `setZoom(newScale, centerX, centerY)`.

**Total hotfix ce soir** : 3-4h pour 1 agent = faisable.

**ED-17/18 (calibration) exclus du hotfix** : effort L (3-4h) + logique métier non-triviale (conversion m²/pixel, modal input, validation). À traiter en P0 mais J+1.

## Notes d'implémentation (pour hotfix)

### ED-04 à ED-08 — Undo/Redo

Pattern ref (PlanEditor L436-L479) :
```
type UndoSnapshot = { rooms: PlanRoom[]; outline: BuildingOutlineRect | null };
const [undoStack, setUndoStack] = useState<UndoSnapshot[]>([]);
const [redoStack, setRedoStack] = useState<UndoSnapshot[]>([]);
const UNDO_MAX_HISTORY = 20;
```

Adapter pour PlanCanvas : snapshot = `{ lots: Lot[] }` (ou `{ zones: Zone[] }` selon modèle).
Points de `pushUndo()` à instrumenter : avant chaque `onUpdateLotZone`, `onDeleteLot`, `onPolygonComplete`, drag start.

### ED-22 — Toolbar

PlanCanvas actuel = composant canvas bare. Le parent (pages/plan/page.tsx ou équivalent) gère les actions. Créer un `<PlanToolbar>` sibling du `<canvas>` avec :
- Bouton Annuler / Refaire (props `onUndo`, `onRedo`, `canUndo`, `canRedo`)
- Boutons Zoom +/- / Reset (déjà présent L1542)
- Bouton Calibrer (futur ED-18)
- Slot "actions contextuelles" (ex: Fusionner si multi-select futur)

### ED-02 — Zoom +/- buttons

Factoriser dans PlanCanvas :
```ts
const applyZoom = (factor: number, centerX?: number, centerY?: number) => { ... }
```
Boutons appellent `applyZoom(ZOOM_FACTOR)` et `applyZoom(1/ZOOM_FACTOR)`, centrés sur le milieu du viewport si pas de curseur.

## Métadonnées audit

- Fichiers lus intégralement : 0 (Grep ciblé uniquement — anti-timeout strict)
- Grep exécutés : 4
- Lignes de références croisées vérifiées : ~50
- Temps audit : ~8 min (vs 641s timeout précédent)
- Confiance : HAUTE sur ABSENT/Ported côté versi-studio (Grep exhaustif sur keywords) ; MOYENNE sur lignes exactes PlanEditor (repère approximatif, à ±10 lignes près)
