# Implémentation UX s22 — Navigation, boutons et layout

**Date** : 2026-04-17
**Agent** : @fullstack
**Spec source** : `docs/ux/vs-s22-navigation-copy-layout.md`

---

## Résumé des changements

### Point 1 — Bouton Retour contextuel

| Fichier | Modification |
|---|---|
| `src/app/vs/projects/[id]/lots/page.tsx` | Ajout `< Plans` en haut du header, `router.push` vers `/upload` |
| `src/app/vs/projects/[id]/rooms/page.tsx` | Ajout `< Lots` en haut du header, `router.push` vers `/lots` |
| `src/app/vs/projects/[id]/visuals/page.tsx` | Ajout `< Pièces` en haut du header, `router.push` vers `/rooms` |

Style : `inline-flex items-center`, icône SVG chevron gauche, texte contextuel, `min-h-[44px]` touch target, `focus-visible` ring.

### Point 2 — Stepper latéral cliquable

| Fichier | Modification |
|---|---|
| `src/components/vs/Stepper.tsx` | Import `useRouter`, ajout `isClickable()` et `handleStepClick()`. Chaque step devient `<button>` au lieu de `<div>`. Steps complétés = `cursor-pointer`, steps futurs = `cursor-not-allowed opacity-50`. |

Logique : cliquable si `completedSteps.includes(stepId) && stepId !== currentStep`. Navigation via `STEPS[].path(projectId)`.

### Point 3 — Deux boutons distincts Étape 2

| Fichier | Modification |
|---|---|
| `src/components/vs/LotPanel.tsx` | Ajout prop `onContinue`, séparation "Valider tous les lots" (outline) et "Passer aux pièces" (primary). "Passer aux pièces" désactivé + tooltip tant que `!allLotsValidated`. |
| `src/app/vs/projects/[id]/lots/page.tsx` | Ajout `handleContinueToRooms` = navigation pure vers `/rooms`. Passé en prop `onContinue` au LotPanel. |

### Point 4 — Layout stack vertical Étape 2 et 3

| Fichier | Modification |
|---|---|
| `src/app/vs/projects/[id]/lots/page.tsx` | Layout `flex-col` au lieu de `flex-row`. Canvas `w-full h-[550px]` desktop / `h-[400px]` mobile. |
| `src/app/vs/projects/[id]/rooms/page.tsx` | Idem — Canvas pleine largeur + panel en dessous. |
| `src/components/vs/LotPanel.tsx` | `<aside w-80>` remplacé par `<section w-full>`. Liste en `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`. LotCards avec `bg-white border` pour visibilité en grille. |
| `src/components/vs/RoomPanel.tsx` | Idem — `<aside w-80>` remplacé par `<section w-full>`. Pièces en grille 3 colonnes. |

---

## Screenshots de preuve

| Capture | Fichier |
|---|---|
| Étape 2 — layout vertical + lot card + 2 boutons (projet reel) | `docs/screenshots/s22/etape2-cards-visible.png` |
| Étape 2 — layout vertical + 2 boutons (mock) | `docs/screenshots/s22/etape2-new-layout.png` |
| Étape 2 — bouton Retour Plans visible | `docs/screenshots/s22/etape2-retour-button.png` |
| Étape 3 — layout vertical + grille pieces (projet reel) | `docs/screenshots/s22/etape3-cards-visible.png` |
| Étape 3 — layout vertical (mock) | `docs/screenshots/s22/etape3-new-layout.png` |
| Étape 3 — bouton Retour Lots visible | `docs/screenshots/s22/etape3-retour-button.png` |

---

## Tests

- `npx tsc --noEmit` : 0 erreur
- `npm run lint` : 0 nouvelle erreur (4 erreurs préexistantes dans `reference-existant/` et `scripts/`)
- `tests/e2e/s22-screenshots.spec.ts` : 4/4 PASS (16s)
- `tests/e2e/rooms-visual.spec.ts` : baselines mises à jour via `--update-snapshots` (layout vertical = changement intentionnel)

---

## Éléments préservés (non-régression)

- Poignées de resize 8 directions sur canvas
- Polygones IA et overlay colorés
- Fix drag vertical versi-s22
- Bouton "+ Ajouter une pièce"
- Badges IA / confiance / bouton Confirmer (Option C UI)
- Mode dessin polygone (versi-s20)
- Calibration plan (versi-s19)
- Bouton annuler validation lot (versi-s21 it2)

---

**Handoff → Thomas** pour validation visuelle des 4 screenshots et test manuel du parcours complet (Plans → Lots → Pièces → Visuels) avec les boutons retour et le stepper cliquable.
