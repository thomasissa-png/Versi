# Fixes UI Versi Studio s22 -- Zoom buttons + Ratio canvas

Session : versi-s22 | Date : 2026-04-17

---

## Section 1 -- Zoom buttons permanents (Etape 2 PlanCanvas)

### Probleme

Les controles de zoom (boutons +/-/Reset) n'etaient pas visibles tant que l'utilisateur n'avait pas deja zoome a la molette. Le bouton "Reinitialiser le zoom" etait conditionnel (`viewport.scale > ZOOM_RESET_THRESHOLD`).

### Corrections apportees

**Fichier** : `versi-studio/src/components/vs/PlanCanvas.tsx`

1. **Ajout de 2 handlers `zoomIn` / `zoomOut`** (apres `resetViewport`) :
   - `zoomIn` : multiplie le scale par 1.25, clamp a ZOOM_MAX (10), zoom centre sur le milieu du canvas, clamp des offsets via `clampViewportOffsets`.
   - `zoomOut` : multiplie le scale par 0.8, clamp a ZOOM_MIN (1), retour a INITIAL_VIEWPORT si scale <= 1.

2. **Remplacement du bouton conditionnel** par une barre d'outils permanente :
   - 3 boutons dans un `<div role="toolbar" aria-label="Controles de zoom">` :
     - `-` (dezoomer) : icone minus, `aria-label="Dezoomer"`, 44x44px
     - `100%` (ou pourcentage actuel) : `aria-label="Reinitialiser le zoom"`, affiche `Math.round(viewport.scale * 100)%`
     - `+` (zoomer) : icone plus, `aria-label="Zoomer"`, 44x44px
   - Positionnement : `absolute bottom-3 right-3`, fond `bg-white/95`, border, shadow, border-radius
   - Accessibilite : focus-visible sur chaque bouton, touch targets 44x44px (G22)

### Before/After

**Before** : bouton "Reinitialiser le zoom (X.Xx)" visible uniquement apres zoom molette.
**After** : barre `-` `100%` `+` permanente en bas-droite du canvas, visible des le chargement.

---

## Section 2 -- Ratio canvas preserve (Etape 3 RoomCanvas)

### Probleme

Le plan etait etire verticalement sur l'Etape 3. Cause : `ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height)` mappait un crop source (ratio ~2:1 horizontal) vers un canvas destination (ratio ~0.83 vertical), provoquant une deformation.

### Corrections apportees

**Fichier** : `versi-studio/src/components/vs/RoomCanvas.tsx`

1. **Ajout de `useMemo` import** et **state `imageNaturalSize`** pour stocker les dimensions naturelles de l'image (evite d'acceder a `imageRef.current` pendant le render, ce qui viole les regles React Compiler / `react-hooks/refs`).

2. **Ajout du `renderLayout` useMemo** : calcule letterbox/pillarbox a partir du ratio source (lot crop) vs ratio destination (canvas). Produit `{ renderW, renderH, offsetX, offsetY }`.

3. **Mise a jour de `draw()`** : remplace `ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height)` par `ctx.drawImage(img, sx, sy, sw, sh, offsetX, offsetY, renderW, renderH)`.

4. **Mise a jour de `toCanvasCoords`** : les positions % des pieces sont maintenant converties relativement a la zone de rendu effective (`renderW x renderH` decalee de `offsetX, offsetY`), pas au canvas entier.

5. **Mise a jour de `toPercentCoords`** : conversion inverse tenant compte des offsets letterbox.

### Verification PlanCanvas (meme bug ?)

PlanCanvas.tsx Etape 2 n'a PAS ce bug : le code existant (lignes 428-443) calculait deja un letterbox/pillarbox correct avec `imgAspect` vs `canvasAspect`. Aucune correction necessaire.

### Before/After

**Before** : plan etire verticalement, pieces deformees (carres apparaissant comme rectangles verticaux).
**After** : plan avec proportions preservees, bandes beige en haut/bas (letterbox) ou gauche/droite (pillarbox), pieces alignees correctement avec le plan.

---

## Section 3 -- Preuves Playwright

### Preuves console

```
$ npx tsc --noEmit
(aucune sortie — 0 erreur TypeScript)

$ npm run lint
8 errors (tous dans reference-existant/, pre-existants)
46 warnings (pre-existants, aucun nouveau)
0 erreur/warning introduit par les modifications s22
```

### Screenshots

- `docs/screenshots/s22/etape2-zoom-buttons.png` : page Lots scrollee pour montrer la barre de zoom `-` `100%` `+` en bas-droite du canvas. Boutons visibles en permanence.
- `docs/screenshots/s22/etape3-plan-letterbox.png` : page Pieces, vue complete avec le plan affiche en letterbox (bandes beige haut/bas) et les pieces alignees correctement.
- `docs/screenshots/s22/etape3-canvas-letterbox.png` : canvas isole montrant le plan horizontal (ratio ~2:1) affiche avec proportions preservees dans un canvas vertical, les 5 pieces (SdB, Chambre, Entree, Couloir, Sejour/cuisine) correctement positionnees.

### Commentaires visuels

1. **Zoom toolbar** : les 3 boutons sont rendus, correctement positionnes dans le canvas container. Le bouton central affiche "100%" au scale par defaut. Les icones plus/minus sont lisibles.

2. **Letterbox** : le plan du lot T2 RDC (format tres horizontal) est affiche avec des bandes beige en haut et en bas. Les overlays colores des pieces sont parfaitement alignes avec les murs du plan sous-jacent. Aucun etirement vertical visible.

---

## Section 4 -- Verdict

| Defaut | Statut | Preuve |
|---|---|---|
| Zoom buttons invisibles (Etape 2) | CORRIGE | Barre permanente visible dans screenshot, toolbar trouve par Playwright (`count: 1`) |
| Plan deforme (Etape 3) | CORRIGE | Canvas avec letterbox correct dans screenshot, pieces alignees avec le plan |
| TypeScript compilation | 0 erreur | `npx tsc --noEmit` silencieux |
| ESLint regression | 0 nouvelle erreur | Memes 8 erreurs pre-existantes dans `reference-existant/` |

---

## Section 5 -- Handoff

---
**Handoff -> @ia**
- Fichiers modifies : `versi-studio/src/components/vs/PlanCanvas.tsx` (zoom toolbar), `versi-studio/src/components/vs/RoomCanvas.tsx` (letterbox + coord conversion)
- Decisions prises : letterbox/pillarbox au lieu d'etirement pour preserver le ratio ; `imageNaturalSize` en state plutot qu'acces ref pendant render (conformite React Compiler) ; zoom factors +1.25x/-0.8x avec clamp min/max identiques au wheel zoom existant
- Points d'attention : les coordonnees % des pieces dans RoomCanvas sont desormais relatives a la zone de rendu effective (pas au canvas entier) — tout nouveau code de dessin ou hit-test dans RoomCanvas DOIT utiliser `renderLayout` pour la conversion. Si des rectangles IA sont generes pour l'Etape 3, ils doivent etre en % du lot (inchange), la conversion canvas est geree par `toCanvasCoords`.

**Handoff -> Thomas**
- Validation visuelle demandee : ouvrir le projet test sur l'Etape 2 et verifier que les boutons zoom fonctionnent (clic + et -, reset via le bouton central). Ouvrir l'Etape 3 et verifier que le plan n'est plus deforme.
---
