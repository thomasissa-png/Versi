# S23 — Touch / Pinch mobile sur RoomCanvas

**Session** : versi-s23
**Fichier modifié** : `versi-studio/src/components/vs/RoomCanvas.tsx`
**Build** : PASS (tsc --noEmit + next build)
**Contexte** : extension mobile de l'implémentation zoom/pan desktop livrée en s22 (commit `755e942`).

---

## Approche technique — Pointer Events unifiés

Plutôt que de dédoubler les handlers (`onMouseDown` + `onTouchStart`), l'implémentation utilise l'API **Pointer Events** standardisée (`onPointerDown` / `onPointerMove` / `onPointerUp`). Elle couvre nativement :

- Souris (desktop)
- Stylet
- Tactile (1 ou N doigts simultanés)

Chaque pointer actif est tracké dans une `Map<pointerId, {x, y}>` (`pointersRef`). Le nombre de pointers détermine le mode :

| Pointers actifs | Comportement |
|---|---|
| 1 sur une pièce | Drag de la pièce |
| 1 sur zone vide | Pan du plan |
| 2 | Pinch zoom (annule pan/drag en cours) |

### Pinch zoom — calcul

À l'apparition du 2e pointer, `pinchRef` mémorise :
- La distance initiale entre les 2 pointers
- Le scale courant
- Les offsets courants
- Le centre géométrique (midpoint) — point d'ancrage du zoom

Sur `pointerMove`, le nouveau scale = `initialScale × (currentDistance / initialDistance)`, clampé entre 1 (ZOOM_MIN) et 8 (ZOOM_MAX). Les offsets sont recalculés pour que le midpoint reste visuellement stable (même formule que le wheel zoom desktop).

### `touchAction: "none"` — bloquer les gestures natives

Le CSS `touch-action: none` sur le canvas empêche le navigateur d'interpréter les gestes tactiles comme scroll vertical, pull-to-refresh ou zoom page. Sans ça, un pinch déclencherait le zoom navigateur en même temps que notre pinch canvas → comportement chaotique.

### `setPointerCapture` — robustesse au drag out-of-bounds

Chaque pointer capturé reste lié au canvas même si le doigt/souris sort des limites du canvas. Évite les drags "bloqués" quand le curseur sort pendant un mouvement.

---

## Différences desktop / mobile

| Aspect | Desktop | Mobile |
|---|---|---|
| Zoom | Wheel (molette) centrée curseur | Pinch 2 doigts centré midpoint |
| Pan | Mouse drag zone vide | 1 doigt zone vide |
| Drag pièce | Mouse drag sur pièce | 1 doigt sur pièce |
| Hover cursor | `grab` / `grabbing` | N/A (`pointerType === "mouse"` gate) |
| Reset zoom | Bouton "Réinitialiser la vue" (inchangé) | Idem (tap sur bouton) |

Le wheel handler reste en place pour desktop. Les bornes de zoom (0.5×–4× réajustées en s22 à 1×–8×) sont inchangées et s'appliquent aux deux chemins (wheel ET pinch).

---

## Comment tester

### Via Chrome DevTools (device emulation)

1. Lancer `cd versi-studio && npm run dev`
2. Ouvrir `http://localhost:3000/vs/[projectId]` sur un projet avec plan + lot sélectionné
3. DevTools → `Ctrl+Shift+M` (Toggle device toolbar) → choisir "iPhone 14 Pro" ou "iPad Air"
4. Dans la toolbar, activer **"Throttling: No throttling"** et passer en mode **touch**
5. Tests manuels :
   - **Pan 1 doigt** : cliquer-glisser dans une zone vide → le plan se déplace
   - **Drag pièce** : cliquer-glisser sur un overlay coloré → la pièce suit le pointer
   - **Pinch zoom** : maintenir `Shift` + cliquer-glisser → DevTools simule 2 doigts depuis le centre. Ecarter = zoom in, rapprocher = zoom out.
   - **Reset** : après zoom > 1.05×, le bouton "Réinitialiser la vue" apparaît en haut à droite
   - **Mix pan → pinch** : démarrer pan 1 doigt puis ajouter 2e doigt → bascule sur pinch sans glitch

### Sur vrai appareil (recommandé)

`ngrok http 3000` → ouvrir l'URL ngrok sur iPhone/Android Safari/Chrome. Les gestures tactiles réels révèlent des subtilités (vitesse, inertie, rejet de pointer fantôme) invisibles en émulation DevTools.

---

## Limitations connues

- **Pas d'inertie** : à la fin d'un pan rapide, le plan s'arrête net. Ajout possible en s24 (decay exponentiel sur les offsets pendant ~300 ms).
- **Pas de double-tap to zoom** : pattern iOS/Android classique non implémenté. À évaluer selon feedback utilisateur.
- **Rotation 2 doigts non capturée** : si l'utilisateur fait un pinch en tournant les doigts, la rotation est ignorée (seule la distance compte). C'est le comportement voulu.
- **Test manuel mobile non effectué en session** : validation DevTools uniquement. Test sur device réel à prévoir avant merge production.
- **Hover cursor désactivé sur tactile** : le cursor `grab`/`grabbing` n'a pas de sens en touch, gate `e.pointerType === "mouse"` appliqué.

---

## Checklist qualité s23

- [x] Pointer Events unifiés (souris + tactile)
- [x] Pinch 2 doigts avec midpoint stable
- [x] `touch-action: none` pour bloquer gestures natives
- [x] `setPointerCapture` pour robustesse out-of-bounds
- [x] Desktop wheel / mouse drag / reset inchangés
- [x] Bornes de zoom respectées (ZOOM_MIN / ZOOM_MAX)
- [x] TypeScript strict PASS
- [x] `next build` PASS
- [ ] Test sur device mobile réel (à faire avant merge)
