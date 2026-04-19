# Étape 1 — Upload plans : rework layout (s23)

**Auteur** : @ux | **Session** : s23 | **Statut** : Diagnostic + recommandation → @fullstack

---

## 1. Diagnostic du layout actuel

### Mesures verticales (desktop ~900px viewport utile)

```
┌─────────────────────────────────────────────────────────┐
│ App header global                           ~60px       │
├──────────────────┬──────────────────────────────────────┤
│                  │ En-tête section (adresse + h1 + txt) │
│  Stepper         │                              ~100px  │
│  latéral         │ DropZone                             │
│  (w-64)          │  min-h-[200px] + p-4xl (≈48px × 2)  │
│                  │                           ≈ 296px    │
│                  │ mt-2xl (gap)                ~48px    │
│                  │ Grille plans (mt-2xl)                │
│                  │  1 rangée grid-cols-2     ~200px     │  ← SOUS LE FOLD
│                  │ Bouton Analyser (mt-2xl)   ~90px     │  ← SOUS LE FOLD
└──────────────────┴──────────────────────────────────────┘
```

**Cumul avant la grille de plans** : 60 (app header) + 100 (en-tête) + 296 (dropzone) + 48 (mt-2xl) = **504px**

Sur un viewport de 900px, la grille débute à ~500px. Avec une rangée de thumbnails (~200px) + bouton (~90px), on atteint ~790px — sous le fold sur la plupart des écrans laptop (viewport utile souvent 700-800px après taskbar + browser chrome).

### Cause racine

`DropZone` est dimensionnée de façon **statique** : `min-h-[200px]` + `p-4xl` indépendamment du contexte. Une fois le premier fichier uploadé, elle occupe toujours ~296px alors que sa valeur pédagogique (expliquer le drag-and-drop) est nulle : l'utilisateur a compris.

La page `upload/page.tsx` place la grille des plans **sous** la DropZone (`mt-2xl`) sans jamais réduire cette dernière. Il n'existe pas de mode "compact" conditionnel.

### Heuristiques Nielsen violées

- **H1 — Visibilité état système** : les PDFs uploadés ne sont pas visibles sans scroll → l'utilisateur ne sait pas que son upload a réussi
- **H8 — Minimalisme** : la zone d'upload continue d'occuper l'écran après avoir rempli sa fonction

---

## 2. Options de layout

### Option A — Box shrink après premier upload (recommandée)

**Principe** : grande drop zone à l'état vide (pédagogique), réduite à un bandeau compact `"+ Ajouter un plan"` dès qu'au moins 1 fichier est uploadé ou en cours.

```
État vide                      État ≥ 1 plan uploadé
┌─────────────────────┐        ┌─────────────────────────────┐
│                     │        │ N plans déposés   [+ Ajouter]│  ← ~52px
│   ↑  Déposez ici    │   →   ├─────────────────────────────┤
│   ou parcourir      │        │ ┌────┐ ┌────┐ ┌────┐ ┌────┐ │
│                     │        │ │PDF1│ │PDF2│ │PDF3│ │PDF4│ │
│      ~296px         │        │ └────┘ └────┘ └────┘ └────┘ │
└─────────────────────┘        │                [Analyser →] │
                               └─────────────────────────────┘
```

**Pros** : aucune colonne supplémentaire, mobile-friendly immédiat, les PDFs sont visibles sans scroll dès le 1er upload, cohérent avec le pattern "fonction accomplie → interface réduite" (analogue à un champ de recherche post-saisie).

**Cons** : la zone compact doit rester identifiable comme drop zone (pas juste un bouton texte) — prévoir un micro-drag-target sur la ligne compacte.

### Option B — Side-by-side (desktop only)

**Principe** : grille 2 colonnes. Gauche : DropZone fixe. Droite : liste plans (scrollable).

```
┌──────────────────┬──────────────────────────────┐
│  DropZone        │  PDF1  PDF2                  │
│  (fixe, ≈50%)    │  PDF3  PDF4                  │
│                  │                              │
└──────────────────┴──────────────────────────────┘
```

**Pros** : drop zone toujours accessible sans interférer avec la liste.

**Cons** : complique le layout mobile (2 colonnes sur une page déjà avec stepper latéral sur desktop), ajoute de la complexité pour un gain moins intuitif. La colonne gauche reste vide et large même pour 1 plan.

### Option C — Inversion d'ordre (liste en premier)

**Principe** : afficher la grille des plans EN PREMIER, puis la zone d'ajout en bas.

```
État ≥ 1 plan :
  [liste plans]
  [Zone "+ Ajouter un plan" compacte en bas]
  [Bouton Analyser]
```

**Pros** : simple à implémenter.

**Cons** : l'ordre est contre-intuitif à l'état vide (rien à afficher avant le premier upload). Nécessite deux layouts entièrement différents selon l'état. Risque de confusion sur le premier usage.

---

## 3. Recommandation — Option A avec détail d'implémentation

**Critère de décision** : Thomas doit voir ses PDFs dès le 1er upload, sans scroll, sans redesign global.

L'Option A répond à ce critère avec le minimum de changements. Le comportement est naturel (pattern Gmail : composer réduit après envoi, pattern iOS Files : barre d'upload compacte post-sélection).

### Layout cible post-upload

```
┌──────────────────────────────────────────────────────┐
│ En-tête (adresse + h1)                      ~100px  │
├──────────────────────────────────────────────────────┤
│ Bandeau compact upload :                     ~52px  │
│  [↑ icône] N plans déposés  [+ Ajouter un plan]     │
├──────────────────────────────────────────────────────┤
│ mt-lg gap                                    ~24px  │
├──────────────────────────────────────────────────────┤
│ Grille plans 2-4 colonnes               ~180-220px  │  ← visible sans scroll
├──────────────────────────────────────────────────────┤
│ Bouton Analyser (justify-end)                ~90px  │  ← visible sans scroll
└──────────────────────────────────────────────────────┘
```

**Total estimé** : 100 + 52 + 24 + 200 + 90 = **466px** — sous le fold même sur un viewport de 650px.

### Règle de transition

- `plans.length === 0 && !uploading` → DropZone pleine (`min-h-[200px]`, `p-4xl`)
- `plans.length > 0 || uploading` → DropZone compacte (voir détail modifications)

---

## 4. Modifications code pour @fullstack

**Fichier 1 : `versi-studio/src/components/vs/DropZone.tsx`**

- Ajouter une prop `compact?: boolean`
- En mode `compact` : remplacer les classes `p-4xl min-h-[200px] flex-col gap-md` par `p-sm min-h-[44px] flex-row gap-sm` sur le div principal de la zone
- En mode `compact` : réduire l'icône de `w-12 h-12` à `w-6 h-6` (icône uniquement, sans bulle)
- En mode `compact` : remplacer le texte "Déposez vos plans ici" + "ou parcourir" par un label inline `"+ Ajouter un plan"` (style `text-sm text-interactive-primary underline`)
- La zone reste `role="button"` + accessible clavier + drop target → **ne pas supprimer les handlers drag**

**Fichier 2 : `versi-studio/src/app/vs/projects/[id]/upload/page.tsx`**

- Passer `compact={plans.length > 0 || uploading}` au composant `<DropZone />`
- Réduire la marge entre DropZone et grille plans : `mt-2xl` → `mt-lg` lorsque `compact` (ou toujours `mt-lg` si le gain est suffisant)
- Déplacer le compteur "N plans déposés / N emplacements restants" dans le bandeau compact de la DropZone plutôt que dans la section grille — en mode compact ce compteur est sur la même ligne que le bouton "+ Ajouter"

**Aucun autre fichier à modifier.** La grille, PlanThumbnail, le bouton Analyser restent inchangés.

---

## Tests UX — Étape 1 post-rework

| Test | Critère de succès | Statut attendu |
|---|---|---|
| Parcours : Thomas uploade 1 PDF et voit la grille sans scroll | Grille visible au-dessus du fold (~700px) | A vérifier post-implémentation |
| Charge cognitive : état vide | 1 action principale (déposer) | PASS |
| Charge cognitive : état ≥ 1 plan | 2 actions (ajouter, analyser), toutes visibles | PASS |
| Drop zone compacte reste une drop target | Handler onDrop actif + feedback visuel drag-over | A vérifier |
| Accessibilité : mode compact | role="button", tabIndex=0, aria-label mis à jour | A vérifier |
| Mobile (<768px) | Bandeau compact, grille 2 colonnes, bouton analyser visible | A vérifier |

---

**Handoff → @fullstack**

- Fichier produit : `docs/ux/s23-etape1-upload-layout-rework.md`
- Décisions prises : Option A (box shrink) — prop `compact` sur DropZone, conditionnée par `plans.length > 0 || uploading`
- Points d'attention :
  - Le mode compact DOIT rester un drop target fonctionnel (drag-and-drop toujours actif)
  - `aria-label` du role="button" à adapter en mode compact : `"Zone de dépôt compacte. Cliquez ou glissez-déposez pour ajouter d'autres plans."`
  - Ne pas modifier l'ordre des sections ni la logique métier existante (anti-pattern s22 modification silencieuse)
  - Coordination : @design travaille sur `docs/design/s23-etape1-upload-visual.md` pour les tokens visuels du bandeau compact (couleur, border, spacing) — @fullstack peut appliquer les tokens du design system existant en attendant
