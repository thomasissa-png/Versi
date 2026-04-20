# Diagnostic Zoom Etape 2 Lots — versi-s22

> Auteur : @fullstack | Date : 2026-04-17
> Objectif : retrouver l'historique des demandes de Thomas sur le zoom, verifier l'etat du code, specifier la correction.

---

## Section 1 : Historique des demandes

**Verdict : le zoom est code et fonctionnel depuis versi-s20. Ce n'est PAS un zoom absent.**

Thomas a mentionne le zoom dans le contexte de l'Etape 2 Lots a travers les sessions suivantes :

| # | Session | Fichier trace | Date | Formulation / contexte | Statut actuel |
|---|---------|--------------|------|------------------------|---------------|
| 1 | versi-s20 | `project-context.md:506-507` | 2026-04-16 | "Phase 1+2 ZOOM + POLYGONES (le gros chantier s20) : Zoom canvas : molette centre curseur + Ctrl/middle-click drag pan + double-clic vide reset + bouton overlay Reinitialiser le zoom (X.X x)" | **IMPLEMENTE** — zoom complet code et valide 9.68/10 par 5 agents |
| 2 | versi-s20 | `project-context.md:551` | 2026-04-16 | "Snap dynamique adaptatif au zoom (Thomas marchand frustration mineure : 15px logique trop fin a scale=1)" — classe P5 finitions differees | **DIFFERE** — snap pas adapte au zoom level |
| 3 | versi-s20 | `project-context.md:553` | 2026-04-16 | "Touch mobile (pinch-to-zoom + dessin polygone tactile)" — classe P5 finitions differees | **DIFFERE** — pinch-to-zoom mobile non implemente |
| 4 | versi-s20 | `docs/product/vs-functional-specs.md:572` | Spec initiale | "GIVEN Thomas est sur mobile (touch) WHEN il pinch-to-zoom sur le canvas THEN le zoom ne declenche pas un drag de zone" | **NON IMPLEMENTE** — spec existante mais touch non code |
| 5 | versi-s20 | `docs/product/vs-functional-specs.md:596` | Spec initiale | "Thomas travaille sur mobile depuis le chantier. Il essaie de zoomer avec deux doigts sur le plan." | **NON IMPLEMENTE** — meme item que ci-dessus |

**Traces dans lessons-learned.md** :
- Session s20 (ligne 181) : titre entier = "versi-s20 Etape 2 Lots refonte (zoom + polygones N cotes + 3 iterations audit jusqu'a 9.68/10 unanime)"
- Learning P0 s20 : anti-pattern `canvas.width` guard desactive le clear — bug lie au zoom/pan (corrige fix #4)

**Traces dans le code reference** :
- `reference-existant/components-marchand/PlanEditor.tsx:414-766` : zoom Ctrl+wheel avec `setZoomLevel`, range 0.5-3, boutons +/-/reset. C'est le code de reference de l'ancien PlanEditor qui a ete le modele pour le nouveau PlanCanvas.

**Conclusion historique** : aucune trace ecrite de Thomas demandant le zoom "3 fois" sans obtenir de reponse. Le zoom wheel+pan est code et valide en s20. Ce qui n'est PAS fait = (a) pinch-to-zoom tactile mobile et (b) snap adaptatif au zoom level. Il est possible que les "3 demandes" de Thomas se referent a ces items P5 differes, ou a des demandes verbales non tracees dans les fichiers.

## Section 2 : Etat du code

### Zoom present ? **COMPLET et fonctionnel**

Le zoom est implemente dans `versi-studio/src/components/vs/PlanCanvas.tsx` (1621 lignes). Il a ete ajoute en versi-s20 et audite a 9.68/10 par 5 agents.

### Pattern visuel actuel

**Canvas HTML5 natif** (`<canvas>`) — pas `<img>` ni SVG. Le plan est dessine via `ctx.drawImage()` dans une boucle `draw()` qui utilise `requestAnimationFrame`. Les lots sont dessines par-dessus en coordonnees % (0-100).

### Fichiers concernes

| Fichier | Lignes zoom | Role |
|---------|-------------|------|
| `src/components/vs/PlanCanvas.tsx` | L97-102 (constantes ZOOM_MIN/MAX/FACTOR/RESET_THRESHOLD), L58-69 (types PanState/Viewport), L263-265 (state viewport + panRef), L404-411 (transform draw), L738-750 (getCanvasCoords conversion logique), L864-878 (clampViewportOffsets), L886-903 (pan mouseDown Ctrl/middle-click), L1292-1320 (handleWheel zoom centre curseur), L1322-1358 (handleDoubleClick reset), L1360-1362 (resetViewport), L1542-1566 (bouton UI "Reinitialiser le zoom") | Canvas + zoom + pan complet |
| `src/app/vs/projects/[id]/lots/page.tsx` | L677 | Instruction texte "Zoomez a la molette, Ctrl+glisser pour naviguer." |
| `tests/e2e/zoom-polygon-validation.spec.ts` | L109-148 | Test E2E "wheel scroll active le bouton Reinitialiser le zoom" + reset |

### Fonctionnalites zoom actuellement PRESENTES

| Feature | Status | Implementation |
|---------|--------|----------------|
| Wheel zoom (molette) | PRESENT | `handleWheel` L1292, zoom centre curseur, factor 1.1 |
| Range zoom | PRESENT | min=1x, max=10x (constantes L98-99) |
| Pan (Ctrl+clic gauche ou middle-click) | PRESENT | `handleMouseDown` L886-903, panRef, cursor "grabbing" |
| Double-clic zone vide = reset | PRESENT | `handleDoubleClick` L1350-1354 |
| Bouton UI "Reinitialiser le zoom (X.X x)" | PRESENT | L1542-1566, visible si scale > 1.05 |
| Clamp pan (pas de perte du plan) | PRESENT | `clampViewportOffsets` L864-878 |
| Conversion coordonnees zoom-aware | PRESENT | `getCanvasCoords` L741-751, `(rawPos - offset) / scale` |
| clearRect + setTransform reset | PRESENT | L394-399 (learning s20 P0 anti-accumulation) |

### Fonctionnalites zoom actuellement ABSENTES

| Feature | Status | Reference demande |
|---------|--------|-------------------|
| Pinch-to-zoom tactile (mobile/trackpad) | ABSENT | `project-context.md:553`, `vs-functional-specs.md:572` |
| Snap dynamique adaptatif au zoom level | ABSENT | `project-context.md:551` — Thomas frustration "15px logique trop fin a scale=1" |
| Keyboard shortcuts (+/-/0/espace) | ABSENT | Pas dans les specs actuelles |
| Boutons zoom+/zoom- UI (icones) | ABSENT | Reference existante les avait (`PlanEditor.tsx:2820-2863`) |

### Evenements souris actuels

- `onMouseDown` : pan (Ctrl/middle-click), drag lot (move/resize/move-vertex), clic polygone dessin, selection lot, clic droit menu contextuel
- `onMouseMove` : drag en cours, hover highlighting, curseur adaptatif (crosshair/move/resize/grab), preview polygone, surface overlay temps reel
- `onMouseUp` : fin drag, sauvegarde zone
- `onWheel` : zoom centre curseur
- `onDoubleClick` : fermeture polygone (mode dessin) ou reset viewport
- `onKeyDown` : Delete (supprimer lot), Escape (deselection/cancel polygone), Backspace (undo dernier sommet), Enter (fermer polygone)
- `onContextMenu` : menu supprimer lot

## Section 3 : Specification de la correction attendue

Etant donne que le zoom wheel+pan est deja fonctionnel, les corrections portent sur les **lacunes identifiees** :

### 3.1 — Pinch-to-zoom tactile (mobile/trackpad)

- **Trigger** : geste pinch-to-zoom (2 doigts) sur le canvas
- **Comportement** : zoom centre entre les 2 doigts, meme formule que wheel zoom
- **Range** : 0.25x - 4x (elargi par rapport au wheel pour mobile — ou garder 1x-10x pour coherence)
- **Compatibilite edition** : le pinch NE DOIT PAS declencher un drag de zone ni un clic de selection. Distinction touch zoom (2 doigts) vs touch drag (1 doigt)
- **Pan tactile** : 2 doigts + deplacement = pan (apres debut du pinch, le pan suit le barycentre des 2 doigts)
- **Implementation** : `onTouchStart`, `onTouchMove`, `onTouchEnd` sur le canvas. Stocker `initialPinchDistance` et `initialScale` au debut du geste. Sur move : `newScale = initialScale * (currentDistance / initialPinchDistance)`
- **Etat** : le viewport state (scale, offsetX, offsetY) est deja en place — seuls les event handlers tactiles manquent

### 3.2 — Keyboard shortcuts (convention Figma/Miro)

| Raccourci | Action | Implementation |
|-----------|--------|----------------|
| `+` ou `=` | Zoom in (factor 1.25) centre ecran | `setViewport(...)` centre canvas |
| `-` | Zoom out (factor 1/1.25) centre ecran | idem |
| `0` | Reset zoom 100% | `setViewport(INITIAL_VIEWPORT)` |
| Espace + drag | Pan (mode main) | `handleKeyDown` active un flag `isPanning`, `handleMouseDown` l'utilise au lieu de Ctrl |

### 3.3 — Boutons UI zoom+/zoom-/reset

- **Position** : coin bas-droite du canvas (comme la reference `PlanEditor.tsx:2820`)
- **Boutons** : +, pourcentage (100%), - empiles verticalement
- **Style** : `bg-white/90 border shadow-sm`, rond ou carre arrondi, 40x40px min (touch target)
- **Le bouton "Reinitialiser le zoom" actuel (haut-droite)** : peut etre conserve en complement ou remplace par le group de boutons bas-droite

### 3.4 — Snap dynamique adaptatif au zoom

- **Probleme** : `POLYGON_CLOSE_SNAP_DISTANCE = 15` px logiques. A scale=1, 15px ecran = correct. A scale=3 (zoom 3x), 15px logiques = 45px ecran (trop permissif). A scale=0.5, 15px logiques = 7.5px ecran (trop strict).
- **Correction** : `const snapDist = POLYGON_CLOSE_SNAP_DISTANCE / viewport.scale`. Le snap est constant en pixels ecran quel que soit le zoom.

### 3.5 — Compatibilite edition

- **Les clics d'edition DOIVENT continuer a marcher** : selection lot (clic gauche), drag lot (clic gauche sur un lot), resize (drag poignee), dessin polygone (clics successifs).
- **Le pan NE DOIT PAS interferer** avec les clics de selection. Distinction : pan = Ctrl+clic ou middle-click ou 2 doigts. Clic simple gauche = toujours edition.
- **Deja implemente** : la distinction pan/edition est deja dans `handleMouseDown` (L886-903) via `isPanTrigger`. Rien a changer ici.

### 3.6 — State

- **Local state uniquement** : `viewport` est deja un `useState<Viewport>` dans PlanCanvas. Pas de persistance DB.
- **Impact coordonnees** : les polygones/rectangles lots sont stockes en coordonnees % du plan (PDF original). Le zoom/pan affecte uniquement le `ctx.translate/ctx.scale` d'affichage. `getCanvasCoords` (L741) fait deja la conversion inverse. Aucun impact sur les coordonnees en DB.

## Section 4 : Plan d'implementation

### Approche technique recommandee

**Pas de librairie externe** — le zoom/pan est deja code nativement dans PlanCanvas.tsx avec la bonne architecture (viewport state + transform canvas). Les ajouts sont des event handlers supplementaires, pas une refonte.

`react-zoom-pan-pinch` ou `panzoom.js` sont des overkills ici : ils operent sur un conteneur DOM (`transform: scale()` CSS), pas sur un canvas HTML5 avec `ctx.scale()`. Les integrer casserait la pipeline de coordonnees deja en place.

### Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `src/components/vs/PlanCanvas.tsx` | (1) Handlers touch pinch-to-zoom (`onTouchStart/Move/End`), (2) Keyboard shortcuts (+/-/0/espace), (3) Boutons UI zoom+/zoom-/reset, (4) Snap adaptatif `/ viewport.scale` |
| `src/app/vs/projects/[id]/lots/page.tsx` | Mise a jour texte instruction si besoin |
| `tests/e2e/zoom-polygon-validation.spec.ts` | Ajout test keyboard shortcuts + test boutons UI |

### Complexite estimee

**1 Task @fullstack** (scope contenu dans un seul fichier principal PlanCanvas.tsx). Estimation 30-45 min.

Decoupage si 2 Tasks preferees :
- Task A : pinch-to-zoom + snap adaptatif (evenements tactiles)
- Task B : keyboard shortcuts + boutons UI

### Tests attendus

| Test | Type | Description |
|------|------|-------------|
| `zoom-keyboard-shortcuts.spec.ts` | E2E Playwright | Appui `+` → scale > 1.05, appui `0` → reset, appui `-` → (noop a scale=1) |
| `zoom-buttons-ui.spec.ts` | E2E Playwright | Clic bouton + → scale augmente, clic bouton - → scale diminue, clic reset → 1.0 |
| `zoom-snap-adaptive.test.ts` | Vitest unitaire | `snapDistance(scale=1) === 15`, `snapDistance(scale=3) === 5`, `snapDistance(scale=0.5) === 30` |

## Section 5 : Question a Thomas

Le zoom wheel+pan est deja fonctionnel depuis s20. Avant d'implementer les manques, j'ai besoin de preciser ce que tu entends par "le zoom n'est toujours pas implemente" :

**Option A** — Tu parles du zoom wheel/molette sur desktop ? Dans ce cas il EST la (teste et valide 9.68/10). Peut-etre un bug qui le casse dans l'etat actuel du code ? A verifier en lancant le serveur dev.

**Option B** — Tu parles du pinch-to-zoom mobile (2 doigts sur l'ecran) ? Ca c'est effectivement absent, classe P5 en s20.

**Option C** — Tu parles des boutons +/-/reset (comme dans la reference PlanEditor.tsx) ? Seul le bouton "Reinitialiser le zoom" est present. Les boutons +/- sont absents.

**Option D** — Tu parles de la combinaison (B) + (C) + keyboard shortcuts ? Scope complet.

Quelle option correspond a ta frustration ? Ca determine le scope de la correction (30 min pour B ou C seul, 45 min pour D complet).

---

**Handoff -> @orchestrator**
- Fichier produit : `docs/reviews/vs-s22-etape2-zoom-diagnostic.md`
- Decisions : diagnostic seulement, pas d'implementation
- Points d'attention : clarifier avec Thomas ce qu'il entend par "zoom pas implemente" — le zoom wheel+pan desktop est bien present depuis s20
