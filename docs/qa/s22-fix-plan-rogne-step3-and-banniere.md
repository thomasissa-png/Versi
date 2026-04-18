# Fix S22 — Plan rogné Étape 3 + Suppression bannière IA Étape 2

**Date** : 2026-04-18
**Branche** : claude/update-gradient-agents-Ta4Pn
**Build** : vert (tsc OK, next build OK)

## Symptômes

1. **Étape 3 (rooms)** : le plan affiché dans `RoomCanvas` apparaissait étiré/déformé (image stretched sur tout le canvas sans préserver l'aspect ratio). Sur container étroit, le canvas pouvait shrink à 0 (mauvaise UX responsive).
2. **Étape 2 (lots)** : bannière bleue "★ L'IA a pré-créé X lot..." faisait doublon avec le compteur déjà présent dans le header.

## Fixes appliqués

### Axe A — RoomCanvas pattern "contain" (preserve ratio)
`versi-studio/src/components/vs/RoomCanvas.tsx` (lignes ~201-228)
- Calcul `sourceAspect = sw / sh` vs `canvasAspect = width / height`
- Si source plus large → fit largeur, marges haut/bas ; sinon → fit hauteur, marges gauche/droite
- `ctx.drawImage` reçoit désormais `drawX, drawY, drawW, drawH` calculés (vs `0, 0, width, height` avant)
- Pattern aligné sur `PlanCanvas.tsx` (ligne 426-443)

### Axe C — min-width canvas container
`versi-studio/src/app/vs/projects/[id]/rooms/page.tsx` (ligne 693)
- `min-w-0` → `min-w-[300px]` sur le wrapper du `RoomCanvas`
- Empêche le shrink à zéro quand le panel latéral pousse en flex-row

### FIX 2 — Suppression bannière IA
`versi-studio/src/app/vs/projects/[id]/lots/page.tsx` (lignes 806-819)
- Bloc JSX supprimé, remplacé par un commentaire de traçabilité
- **Variable `aiSuggestedLots` CONSERVÉE** (utilisée lignes 593, 672-673 pour le compteur header)

## Scope reporté (ticket séparé requis)

- **Axe B — zoom/pan** sur `RoomCanvas` : non implémenté ici (hors budget). Pattern de référence : `PlanCanvas.tsx` (viewport state, gestures wheel/pinch, translate+scale du context). Ticket à créer pour S23.

## Test manuel pour Thomas

1. Ouvrir un projet existant avec plan + lots validés
2. Aller sur Étape 3 (rooms) — vérifier que le plan affiché est **non déformé** (ratio préservé, marges visibles si nécessaire)
3. Tester en redimensionnant la fenêtre vers étroit — le canvas garde au minimum 300px de largeur sur desktop
4. Revenir Étape 2 (lots) — vérifier que la bannière bleue "L'IA a pré-créé..." n'apparaît PLUS
5. Vérifier que le compteur "X lots à valider" du header est toujours présent

## Brief @qa pour test visual

- **Tester** : Étape 3 avec 3 plans aux ratios différents (carré, paysage, portrait) → screenshot comparaison desktop + mobile
- **Régression** : drag d'une pièce sur le canvas Étape 3 doit toujours fonctionner (coords % calculées sur canvasSize, pas sur drawW/drawH — comportement inchangé)
- **Visuel** : confirmer suppression bannière Étape 2 ne casse pas l'alignement vertical du layout
