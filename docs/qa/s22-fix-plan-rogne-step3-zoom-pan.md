# s22 — RoomCanvas : zoom molette + pan drag

## Scope livré
Ajout zoom (molette, centré curseur, 1x→8x) + pan (drag sur zone vide) à `RoomCanvas.tsx`. Aspect ratio "contain" du commit `74c0da3` préservé. Drag des pièces existant préservé (priorité : mousedown sur pièce = drag pièce, sinon = pan).

## Pattern copié
Dupliqué depuis `PlanCanvas.tsx` : state `viewport {scale, offsetX, offsetY}`, `clampViewportOffsets`, `handleWheel` (facteur 1.1), `panRef` pour tracker le drag de pan. Transform canvas : `translate(offset) + scale(scale)` avant `drawImage`. Line widths et font sizes divisés par `scale` pour lisibilité constante.

## Test manuel Thomas (Étape 3)
1. Ouvrir un lot avec pièces détectées
2. Molette haut = zoom in centré sur le curseur ; molette bas = zoom out
3. Drag sur zone vide = pan (curseur `grabbing`)
4. Drag sur une pièce = déplacer la pièce (inchangé)
5. Bouton "Réinitialiser la vue" apparaît dès scale > 1.05

## Limitation connue
Pan/zoom tactile non implémenté (desktop uniquement). Pinch-zoom mobile à ajouter si besoin utilisateur. Build vert (`tsc --noEmit` + `next build` OK).
