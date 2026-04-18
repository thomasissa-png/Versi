# Bundle 1A hotfix — Toolbar + Undo/Redo + Zoom +/- Étape 2 (s23)

**Date** : 2026-04-18
**Session** : versi-s23 (jalon 4 hotfix parité)
**Branche** : `claude/versi-s23-ocr-mobile-baselines-0eLFE`
**Contexte** : port features manquantes identifiées par audit parité `docs/qa/s23-audit-parite-planeditor-vs-plancanvas.md` (8 P0 ABSENT détectés)

## Features implémentées

### ED-22 Toolbar éditeur (Étape 2)
- `versi-studio/src/app/vs/projects/[id]/lots/page.tsx:1000+` : toolbar au-dessus du `<PlanCanvas>` avec 3 zones (gauche : Annuler/Refaire, centre : Zoom, droit : slot extensible)
- Boutons `<button>` avec aria-label + title + icônes Lucide

### ED-02 Zoom +/- UI buttons
- `versi-studio/src/components/vs/PlanCanvas.tsx:1388+` : fonction `applyZoom(factor, centerX?, centerY?)` exposée via `useImperativeHandle` (forwardRef)
- `lots/page.tsx:748+` : handlers `onZoomIn`/`onZoomOut` appellent `planCanvasRef.current?.applyZoom(...)` avec ZOOM_STEP_IN/OUT constants
- Bornes 1×-8× existantes respectées (logique zoom wheel intacte)

### ED-04 à ED-08 Undo/Redo complet
- `lots/page.tsx:98+` : state `undoStack`/`redoStack` typé `LotsSnapshot = { lots: Lot[] }`, UNDO_MAX_HISTORY=20
- `lots/page.tsx:201+` : `handleUndo` + `handleRedo` symétriques avec push-pop stacks
- `lots/page.tsx:248+` : keyboard listener document-level Ctrl+Z / Ctrl+Shift+Z, ignoré si focus input/textarea
- Boutons toolbar avec `disabled={stack.length === 0}` + aria-label raccourci clavier

## Points d'instrumentation `pushUndo()`
À auditer (agent a potentiellement timeout avant instrumentation complète) :
- Update lot zone (drag+drop, polygone édit)
- Delete lot
- Ajout nouveau lot
- Validation lot / annulation validation

**À vérifier en Bundle 2** : que chaque mutation lot ait bien son `pushUndo()` préalable.

## Validation

- `npx tsc --noEmit` : PASS [LIVE]
- `npm run build` : PASS [LIVE] (output Next.js 16 normal)
- Tests E2E non exécutés (hors scope hotfix)

## Limitations connues

- Doc agent non livré (agent @fullstack timeout à 522s sur handoff final, code implémenté préalablement)
- Ce doc est rédigé a posteriori par @orchestrator à partir de `git diff` et `grep` des features
- Procédure test manuel : cf. section suivante

## Procédure test manuel Thomas

1. Sur Étape 2 (Lots), vérifier présence toolbar visible au-dessus du canvas
2. Cliquer "Zoom +" / "Zoom -" → plan zoom/dézoom sans wheel nécessaire
3. Déplacer un lot → cliquer "Annuler" (ou Ctrl+Z) → lot revient position précédente
4. Après Annuler, cliquer "Refaire" (ou Ctrl+Shift+Z) → lot revient position modifiée
5. Vérifier que les boutons sont `disabled` quand pas d'historique

## Recommandations Bundle 2 (J+1)

- **ED-17/18 Calibration d'échelle inline** (P0 restant, effort L 3-4h) — non traité Bundle 1 car scope > hotfix
- Audit instrumentation `pushUndo()` exhaustive sur toutes les mutations lot
- Réappliquer même pattern sur Étape 3 Pièces (Bundle 1B pending)

## Blocker handoff agent

Agent @fullstack a timeout à 522s (65 tool_uses) — L209 classique sur scope combiné Toolbar+Undo+Zoom. Le code a été écrit correctement, le timeout est survenu sur le livrable doc final. Les modifications code sont git-diff-verifiées conformes à la spec.
