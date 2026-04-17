# s22 — Navigation sans revalidation + Comparateur avant/apres

## Section 1 : Fix navigation (completedSteps dynamique)

### Fichier modifie : `versi-studio/src/app/vs/projects/[id]/lots/page.tsx`

**Avant** : `completedSteps={[1]}` en dur (2 occurrences, lignes 742 et 780).
Le stepper ne marquait jamais les etapes 2 et 3 comme completees meme si `project.status` le confirmait.

**Apres** : calcul dynamique avant le `return` principal (meme pattern que `rooms/page.tsx:250-268`) :

```tsx
const completedSteps: (1 | 2 | 3 | 4)[] = [1];
if (project.status === "step_2_complete" || project.status === "step_3_complete" || project.status === "completed") {
  completedSteps.push(2);
}
if (project.status === "step_3_complete" || project.status === "completed") {
  completedSteps.push(3);
}
```

- Ligne 742 (loading state) : inchange (`[1]`) car `project` est null.
- Ligne 780 (rendu principal) : remplace par `completedSteps={completedSteps}`.

### Autres pages verifiees

- `visuals/page.tsx` : `[1, 2, 3]` + push(4) si completed — correct (logiquement on est en step 4).
- `rooms/page.tsx` : calcul dynamique deja en place (lignes 250-268) — aucun changement.
- `upload/page.tsx` : conditionnel sur `project?.status === "step_1_complete"` — correct.
- `Stepper.tsx` : logique `isClickable` correcte, aucune modification.

## Section 2 : Comparateur avant/apres (Etape 4)

### Fichiers modifies

1. **`versi-studio/src/components/vs/VisualResult.tsx`** :
   - Ajout prop `sourceImageUrl?: string | null`
   - Ajout state `lightboxSrc` + effect Escape
   - Remplacement du bloc image unique par grid 2 colonnes (avant/apres)
   - Ajout modale plein ecran (lightbox native CSS/React, zero dependance)
   - Renommage "Historique" → "Autres versions"
   - Boutons telecharger par colonne (`<a download>`)
   - Responsive : `grid-cols-1 sm:grid-cols-2`

2. **`versi-studio/src/components/vs/VisualRoom.tsx`** :
   - Passe `sourceImageUrl` depuis `photos[0].file_path` via `/api/vs/files?path=...`
   - Si aucune photo : `null` → placeholder "Photo source non disponible"

### Note sur VsRoom.photo_path

Le type `VsRoom` n'a pas de champ `photo_path`. Les photos sont chargees separement via l'API `/api/vs/rooms/{id}/visuals` et stockees dans le state `photos` de `VisualRoom`. La sourceImageUrl est donc derivee de `photos[0].file_path`.

## Preuves console

```
$ npx tsc --noEmit
(aucune sortie — 0 erreur)

$ npm run lint
4 errors (pre-existants : reference-existant/ et scripts/), 55 warnings
0 nouvelle erreur dans les fichiers modifies

$ npx playwright test tests/e2e/s22-screenshots.spec.ts
3 passed (22.6s)
```

## Screenshots

- `docs/screenshots/s22/navigation-stepper-clickable.png` — stepper lots avec etapes 1+3 completees (checkmarks), etape 2 active
- `docs/screenshots/s22/etape4-comparateur-avant-apres.png` — layout 2 colonnes desktop
- `docs/screenshots/s22/etape4-comparateur-mobile.png` — stack vertical mobile 375px

---

**Handoff → Thomas**
- Fichiers modifies : `src/app/vs/projects/[id]/lots/page.tsx`, `src/components/vs/VisualResult.tsx`, `src/components/vs/VisualRoom.tsx`, `tests/e2e/s22-screenshots.spec.ts`
- Decisions prises : sourceImageUrl derivee de photos[0] (pas de nouveau champ DB) ; lightbox native sans lib externe ; "Historique" renomme "Autres versions"
- Points d'attention : valider visuellement le comparateur avec un projet ayant photo source + visuel genere ; tester la modale lightbox (clic, Escape, clic exterieur)
