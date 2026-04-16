# Bugfix P0 — Étape 2 Lots boucle infinie (versi-s20)

**Date** : 2026-04-16
**Session** : versi-s20
**Symptôme** : "La surface calculée se met à grossir indéfiniment, on ne voit pas le plan, rien ne marche" (Thomas, test Replit)
**Fichier impacté** : `versi-studio/src/components/vs/PlanCanvas.tsx`

## Cause racine identifiée — H1 (principal) + H3 (aggravant)

**Chaîne de la boucle infinie** :

1. **`overlappingIds` recalculé à chaque render** (ligne 262 avant fix) — `getOverlappingLotIds(lots)` retournait un nouveau `Set` à chaque render, nouvelle référence.
2. **`draw` useCallback invalidé** — le Set instable faisait changer la référence de `draw` à chaque render (deps incluait `overlappingIds`).
3. **ResizeObserver reconnecté** — le `useEffect` ligne 412 avait `[draw]` en deps → disconnect/reconnect de l'observer à chaque render.
4. **`draw()` modifie `canvas.style.width/height`** — dans un layout flex, ces modifications peuvent provoquer un micro-reflow du container → le ResizeObserver fraîchement reconnecté détecte un changement → appelle `draw` via rAF → re-render → nouveau `Set` → ... **boucle**.
5. **Effet "grossissant"** — chaque cycle accumulait des sub-pixels sur les dimensions canvas (side-effect du reflow flex + DPR scaling), d'où la surface `widthPx * heightPx * m2PerPixel` qui explose visuellement dans l'overlay.

La spec F05 est correcte : `m2_per_pixel` est bien en m²/px² (surfacique). La formule de calcul est mathématiquement juste. Le bug était purement une boucle de rendu, pas une erreur de formule.

## Fix appliqué — 2 modifications ciblées

### Fix 1 — `overlappingIds` mémorisé (ligne 267)

```tsx
// Avant
const overlappingIds = getOverlappingLotIds(lots);

// Après
const overlappingIds = useMemo(() => getOverlappingLotIds(lots), [lots]);
```

Import `useMemo` ajouté depuis `react` (ligne 17). Stabilise la référence → `draw` stable → ResizeObserver stable.

### Fix 2 — Guard anti-boucle sur ResizeObserver (ligne 418-436)

```tsx
let lastWidth = 0;
let lastHeight = 0;

const observer = new ResizeObserver((entries) => {
  const entry = entries[0];
  if (!entry) return;
  const { width, height } = entry.contentRect;
  if (Math.abs(width - lastWidth) < 1 && Math.abs(height - lastHeight) < 1) {
    return;
  }
  lastWidth = width;
  lastHeight = height;
  cancelAnimationFrame(animFrameRef.current);
  animFrameRef.current = requestAnimationFrame(draw);
});
```

Seuil 1px pour absorber les sub-pixel fluctuations du layout flex. Même si une régression future réintroduit un Set instable, la boucle ne peut plus s'amplifier.

## Validation

| Check | Résultat |
|---|---|
| `tsc --noEmit` | PASS (0 erreur) |
| `eslint PlanCanvas.tsx` | PASS (0 error, 2 warnings pré-existants non liés) |
| `npm run build` | PASS (build complet OK, 28 routes générées) |
| Test dev local | Non testé (pas de DATABASE_URL disponible) — validation visuelle sur Replit requise |

## Commentaires inline ajoutés

Les deux fix incluent un commentaire `BUGFIX versi-s20` explicatif pour éviter qu'une refacto future ne retire le useMemo ou le guard sans comprendre leur rôle.

## Handoff

---
**Handoff → @orchestrator**
- P0 Lots loop fixé — 2 modifications minimalistes dans `PlanCanvas.tsx` (useMemo + guard ResizeObserver)
- Build PASS, TypeScript PASS, ESLint PASS
- Action requise : Thomas doit valider sur Replit que (a) le plan s'affiche, (b) les surfaces ne grossissent plus, (c) le drag/resize fonctionne normalement
- Fichiers modifiés : `versi-studio/src/components/vs/PlanCanvas.tsx` (lignes 17, 267, 418-436)

**Handoff → @qa**
- Re-run E2E `workflow.spec.ts` pour non-régression Étape 2 (création lot, drag, resize, validation)
- Ajouter test spécifique anti-régression : mount PlanCanvas 500ms + vérifier que `canvas.width` reste stable (< 2 modifications en 500ms)
---
