# Audit Design Versi Studio — Étape 1 (Upload) + Étape 2 (Lots)
Session s27 — 2026-04-27 — Audit code-level (aucun screenshot disponible)

---

## 1. Note globale et verdict

**Note globale : 7,4 / 10**
**Verdict : NO-GO — 2 défauts P0 bloquants avant passage en production**

---

## 2. Cinq critères notés

### C1 — Cohérence palette charcoal/stone, zéro accent par entité : 8 / 10

La palette est correctement définie dans `globals.css` : anthracite `#0B0B0B`, calcaire `#F7F5F2`, stone `#D9D4CE`, gris-pierre `#6B6560`. Pas de bleu, pas de couleur d'accent par entité — conforme à la décision fondateur "bleu #1B3A5C rejeté".

Points de friction :
- Étape 2 mélange deux styles de référence tokens : `var(--color-*)` inline (lots/page.tsx) et classes Tailwind sémantiques `text-text-muted`, `bg-interactive-primary` (upload/page.tsx). Ce n'est pas une incohérence de couleur mais une dette de nommage qui complique la maintenance.
- Badge confiance IA (`confidence_avg`) utilise `bg-red-100 text-red-700 / bg-orange-100 / bg-green-100` — couleurs Tailwind brutes, hors design system. Ces oranges/verts ne sont pas dans la palette Versi. Mineur mais visible dans LotPanel.
- Token `--color-success` absent de `globals.css` (défini via fallback CSS `,#16A34A` dans LotPanel) — risque de dérive si la valeur change.

### C2 — Hiérarchie visuelle Étape 1, CTA upload primaire, états drag/drop : 7 / 10

Structure logique : label adresse → H1 "Déposez vos plans" → DropZone → grille miniatures → bouton "Lancer l'analyse". La hiérarchie est lisible.

Points de friction :
- Le bouton "Lancer l'analyse" (`disabled:opacity-50`) est toujours rendu même avec 0 plan, en bas à droite. Position correcte pour un CTA de validation mais pas de signal visuel fort qui attire l'oeil VERS la DropZone quand l'état est vide. L'utilisateur doit déduire que la DropZone est le point d'entrée.
- L'état `disabled` du CTA est à `opacity-50` — conforme WCAG AA pour un état non-interactif, mais la couleur fond `#0B0B0B` à 50% opacité donne `rgba(11,11,11,0.5)` sur fond `#F7F5F2` : contraste ~3,2:1, sous le seuil 4,5:1 pour le texte. **Potentiellement non-conforme WCAG 2.2 AA** pour le label texte du bouton disabled — à vérifier si le bouton disabled est interactif ou décoratif (WCAG exclut les composants disabled des exigences de contraste).
- États drag/drop non auditables code-level ici (dans `DropZone.tsx` non lu) — limitation documentée.

### C3 — Canvas Étape 2, visibilité polygones, contraste, états hover/selected/error : 7 / 10

Architecture canvas HTML5 correcte : 8 couleurs lot distinctes (argile/sable/ardoise/lin/lichen/calcite/silex/ocre), opacité `LOT_OPACITY = 0.4`, bordure 1.5px default / 3px hover+selected.

Points de friction :
- `LOT_OPACITY = 0.4` sur couleurs claires (sable `#D4B896`, lin `#C8B89A`, calcite `#E8DDD0`) produit des overlays quasi-transparents sur un plan clair — les lots "clairs" se confondent visuellement avec le fond plan. Problème de lisibilité en conditions réelles.
- L'état error (chevauchement) utilise `tokensRef.current.errorStrong = "#B91C1C"` — correct. Mais la détection de chevauchement s'affiche via un badge dans LotPanel, pas via une surbrillance immédiate sur le canvas lui-même. L'utilisateur doit regarder le panneau pour comprendre pourquoi la validation est bloquée.
- Toolbar undo/redo visible dans le canvas (boutons UI présents via props `canUndo`, `canRedo`) — conforme règle découvrabilité s22. Non auditable visuellement sans screenshot.
- Boutons zoom +/- présents (conformes s22 découvrabilité) — non auditables sans screenshot.

### C4 — États empty, loading, error, success : 8 / 10

Étape 1 :
- Loading : spinner `border-t-interactive-primary animate-spin` + layout stepper préservé. Correct.
- Empty (0 plan) : DropZone visible + bouton "Lancer l'analyse" disabled avec `title` explicatif. Correct mais pas d'illustration ou message d'invitation proéminent.
- Error : `role="alert"`, icône SVG, bouton fermer 44x44px, texte actionnable. Solide.
- Success (plans chargés) : grille miniatures + compteur. Correct.

Étape 2 :
- Loading : spinner centré + message "Organisation des lots en cours..." — correct.
- Empty avec IA extraite vs sans : différencié via `hasAiExtracted` — bon UX.
- Error global : "Réessayer" inline + fermer — correct.
- Saving indicator : feedback `role="status" aria-live="polite"` discret en top content — correct.
- Success validation : `validationSuccess` déclenche feedback puis redirection 600ms — correct.
- Bannière calibration s25 (amber-300/amber-50) : hors design system (amber Tailwind brut, pas de token warning défini proprement dans globals.css — `--color-warning: #D97706` existe mais `bg-amber-50` ne le référence pas).

### C5 — Cohérence cross-étapes, transition E1 → E2 : 7 / 10

Points positifs :
- Stepper commun avec `currentStep`, `completedSteps` — continuité visuelle garantie.
- Classes utilitaires (`p-md`, `gap-lg`, `mb-xl`) communes aux deux étapes.
- Typography identique : `vs-h3` pour H1 E1, `text-xl font-semibold` pour H1 E2 — **incohérence** : E1 utilise la classe sémantique `vs-h3`, E2 utilise les classes Tailwind brutes. Le H1 de l'étape 2 ne passe pas par le design system typographique.
- Stepper E2 desktop : `w-64 flex-shrink-0` fixe, pas de variante mobile `hidden md:block` comme en E1 — **manque de responsive** : sur mobile, le stepper E2 s'affiche en colonne entière et bloque le canvas.
- Référencement tokens : E1 utilise classes Tailwind sémantiques (`text-text-muted`, `bg-interactive-primary`), E2 utilise `var(--color-*)` inline. Même résultat visuel mais dette de cohérence code.

---

## 3. Top 3 défauts BLOQUANTS (P0)

**P0.1 — Stepper mobile absent à l'Étape 2 (NO-GO UX)**
`lots/page.tsx` : l'aside stepper `w-64` est rendu sans `hidden md:block`. Sur mobile, le stepper occupe toute la largeur et repousse le canvas en dessous sans espace. Étape 1 gère correctement le cas mobile avec deux steppeurs conditionnels. Étape 2 ne le fait pas. Impact : inutilisable sur téléphone.
Correction : même pattern que E1 — `aside` avec `hidden md:block` + `div` stepper horizontal `md:hidden`.

**P0.2 — Token `--color-success` non défini dans globals.css (dette système)**
LotPanel référence `var(--color-success,#16A34A)` avec fallback hardcodé. Si globals.css ajoute `--color-success` avec une valeur différente dans une future itération, le fallback sera ignoré mais le résultat visuel pourrait diverger. Plus grave : le token `--color-success` déclaré dans globals.css est `#15803D` mais LotPanel force `#16A34A` via fallback — **deux verts success différents dans le même écran**. Contraste visuel perceptible entre le badge "IA validé" et d'autres éléments success.
Correction : unifier `--color-success: #15803D` dans globals.css, supprimer tous les fallbacks LotPanel.

**P0.3 — Couleurs badge confiance IA hors système (red/orange/green Tailwind bruts)**
`confidence_avg` dans LotCard utilise `bg-red-100 text-red-700`, `bg-orange-100 text-orange-700`, `bg-green-100 text-green-700`. Ces couleurs Tailwind brutes ne sont pas dans la palette charcoal/stone Versi — le vert `#15803D` est correct mais les rouges/oranges ne correspondent pas aux tokens `--color-error` / `--color-warning`. Visible en UI dès qu'un lot IA a un score de confiance : trois couleurs "tech" standard qui contrastent avec la palette artisanale Versi.
Correction : mapper sur les tokens existants (`--color-error-bg/strong` pour faible confiance, `--color-warning` pour moyen, `--color-success` pour élevé).

---

## 4. Top 3 améliorations REQUIS (P1)

**P1.1 — Harmoniser le style de référencement tokens E1 vs E2**
E1 utilise `text-text-muted`, `bg-interactive-primary` (classes Tailwind sémantiques via @utility). E2 utilise `text-[var(--color-text-muted)]`, `bg-[var(--color-interactive-primary)]` (inline). Fonctionnellement équivalent mais techniquement deux patterns différents dans le même design system. Choisir l'un (préférence : classes sémantiques @utility) et l'appliquer partout.

**P1.2 — H1 Étape 2 : passer par classe sémantique `vs-h3`**
`<h1 className="text-xl font-semibold text-[var(--color-text-default)]">` en E2 vs `<h1 className="vs-h3">` en E1. Le H1 doit être stylé via la classe sémantique du design system, pas via classes Tailwind brutes, pour garantir que toute évolution typographique se propage uniformément.

**P1.3 — Bannière calibration amber : passer sur tokens warning**
La bannière "Vérifiez l'échelle du plan" utilise `border-amber-300 bg-amber-50 text-amber-900` (Tailwind brut). Remplacer par `border-[var(--color-warning)] bg-[var(--color-warning)]/10 text-[var(--color-text-default)]` — cohérent avec la bannière calibration non-calibrée (ligne 1020) qui utilise déjà `var(--color-warning)`.

---

## 5. Reality check visuel

**Limitation : aucun screenshot disponible dans `tests/screenshots/`.**
Cet audit est 100% code-level. Les observations suivantes ne peuvent pas être confirmées visuellement :
- Opacité réelle des overlays lots clairs (sable, lin, calcite) sur plan PDF clair — risque de sous-visibilité non confirmé.
- Rendu stepper mobile E2 (P0.1) — identifié structurellement dans le code, non vu à l'écran.
- Comportement drag/drop DropZone — composant non lu (`DropZone.tsx`), états visuels non auditables.
- Toolbar canvas : boutons zoom +/-, undo/redo, mode main — présence confirmée dans les props mais rendu non auditable.

**Recommandation** : demander à @fullstack d'exécuter `npx playwright test --headed` avec capture d'écran sur les 3 breakpoints (375px / 768px / 1280px) pour les deux étapes. Déposer dans `tests/screenshots/`. Relancer @design pour audit visuel complet.

---

*Audit produit par @design — source code uniquement. Screenshots requis pour validation 10/10.*
