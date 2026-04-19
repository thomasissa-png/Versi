# UX Rework — Étape 3 : Placement du bouton "Ajouter une pièce"
Session s23 — Feedback Thomas reality check

---

## 1. Diagnostic du layout actuel

### Structure observée (desktop, captures Playwright)

```
┌─────────────────────────────────────────────────────────────────┐
│ STEPPER  │  [En-tête : adresse + titre]                        │
│ (col 1)  │                                                      │
│          │  ┌──────────────────────┐  ┌──────────────────────┐ │
│          │  │                      │  │ LOT [tab1] [tab2]    │ │
│          │  │   CANVAS             │  │                      │ │
│          │  │   (550px hauteur)    │  │ [carte pièce 1]      │ │
│          │  │                      │  │ [carte pièce 2]      │ │
│          │  │   [toolbar zoom]     │  │ [carte pièce 3]      │ │
│          │  │   coin bas-droit ↗   │  │                      │ │
│          │  └──────────────────────┘  │ ← scroll nécessaire  │ │
│          │                            │                      │ │
│          │  ┌────────────────────────────────────────────┐   │ │
│          │  │ ROOM PANEL (sous le canvas, pleine largeur) │   │ │
│          │  │  [selector lots]                            │   │ │
│          │  │  [grille cartes pièces 1..N]                │   │ │
│          │  │  ───────────────────────────────────────    │   │ │
│          │  │  [+ Ajouter une pièce]   ← TOUT EN BAS     │   │ │
│          │  │  [Valider ce lot]                           │   │ │
│          │  └────────────────────────────────────────────┘   │ │
└─────────────────────────────────────────────────────────────────┘
```

**Attention** : le layout desktop s23 réel n'est PAS un split 60/40 canvas + panel latéral.
C'est un **stack vertical** : canvas pleine largeur en haut, RoomPanel pleine largeur en bas.
Sur les screenshots rooms-detected : la toolbar zoom (main / - / % / + / undo / redo) est en
**coin bas-droit du canvas**. Le bouton "+ Ajouter une pièce" est dans le RoomPanel, sous la
grille de cartes, séparé du canvas par toute la hauteur de la liste des pièces.

### Localisation exacte du bouton

- **Fichier** : `versi-studio/src/components/vs/RoomPanel.tsx`
- **Ligne 406–417** : bouton "+ Ajouter une pièce" dans la section `Actions`, après la grille de cartes
- **Ligne 388–394** : second bouton "Ajouter une pièce" (état vide uniquement, centré)
- **La toolbar canvas** (zoom, hand, undo/redo) est dans `RoomCanvas.tsx` lignes 1257–1337,
  positionnée en `absolute bottom-3 right-3`

### Friction identifiée

Avec 4+ pièces dans la grille, le bouton "+ Ajouter une pièce" (ligne 406) est visuellement
coupé du canvas et de la toolbar. L'utilisateur travaille sur le plan (canvas haut), puis doit
descendre sous toute la liste pour trouver l'action d'ajout. Distance oeil → action : ~400–600px.
Heuristique H6 (reconnaissance plutôt que rappel) : FAIL. H8 (minimalisme) : FAIL sur la
duplication bouton vide / bouton liste.

---

## 2. Options de layout

### Option A — Bouton "Ajouter une pièce" dans la toolbar canvas

Le bouton rejoint la barre de contrôles du canvas (RoomCanvas.tsx, toolbar `absolute bottom-3 right-3`).
Il s'insère à gauche des contrôles de zoom, séparé par un diviseur vertical.

```
┌──────────────────────────────────────────────────────┐
│                   CANVAS                             │
│                                                      │
│  [+ Pièce] │ [main] │ [−] [100%] [+] │ [↩] [↪]   │
│                          bas-droit ↗                 │
└──────────────────────────────────────────────────────┘
```

**Avantages** :
- L'action "ajouter" est co-localisée avec l'espace de travail (le canvas = là où la pièce apparaît)
- Cohérent avec le principe "1 contexte = 1 groupe d'outils"
- Toujours visible, quelle que soit la longueur de la liste

**Inconvénients** :
- La toolbar canvas est déjà chargée (6 boutons + séparateurs). Ajouter un 7e risque de déborder sur mobile
- Le bouton déclenche une action métier (POST API), pas une action de canvas pure — mélange deux natures d'actions
- Sur mobile (375px), la toolbar est déjà comprimée

**Verdict Option A** : faisable sur desktop, risquée sur mobile. Nécessite une gestion responsive complexe.

---

### Option B — Bouton remonté en tête du RoomPanel, juste sous le sélecteur de lot

Le bouton "+ Ajouter une pièce" quitte la section `Actions` du bas et remonte juste après le
sélecteur de lot (ligne 358–378 de RoomPanel.tsx), avant la grille de cartes.

```
┌──────────────────────────┐
│  LOT [tab1] [tab2]       │
│  [+ Ajouter une pièce]   │  ← juste sous le sélecteur
│  ─────────────────────── │
│  [carte pièce 1]         │
│  [carte pièce 2]         │
│  ...                     │
│  ─────────────────────── │
│  [Valider ce lot]        │
└──────────────────────────┘
```

**Avantages** :
- Toujours visible en haut du panel, avant même la liste
- Supprime la duplication : plus besoin d'un bouton spécial "état vide" (les deux boutons fusionnent en un)
- Pas de modification de RoomCanvas.tsx
- Le bouton reste sémantiquement dans le panel de gestion des pièces (cohérence)
- Très simple à implémenter (déplacement d'un bloc)

**Inconvénients** :
- Toujours dans le panel sous le canvas — mais la distance est réduite de ~400px à ~80px
  (apparaît immédiatement sous les tabs de lot, avant tout scroll)

---

## 3. Recommandation : Option B

**Rationale** :

L'action "ajouter une pièce" est une action de **gestion de liste**, pas une action de canvas.
Elle modifie la liste et crée un overlay sur le plan, mais elle ne manipule pas directement
le viewport. La placer dans le RoomPanel est sémantiquement juste.

Le vrai problème signalé par Thomas n'est pas la proximité au canvas, c'est la **distance de
défilement** : le bouton est enterré sous N cartes. La solution minimale et sans risque est
de le remonter en tête du panel, immédiatement visible après le sélecteur de lot.

Gains concrets :
- Distance bouton → sélecteur de lot : ~0px de scroll (premier élément visible après les tabs)
- Duplication éliminée : l'état vide et l'état liste partagent le même bouton en position haute
- Zéro modification RoomCanvas.tsx (périmètre minimal, pas de régression possible)
- Comportement identique sur mobile : le bouton apparaît en tête, avant la liste

---

## 4. Modifications code pour @fullstack

Toutes les modifications sont dans un seul fichier : `versi-studio/src/components/vs/RoomPanel.tsx`

### Modification 1 — Supprimer le bouton "Ajouter une pièce" de la section Actions (bas)

**Lignes 405–417** : supprimer le bloc `{/* Ajouter une pièce */}` + son bouton entier.

```
/* Supprimer ce bloc complet (lignes 405–417) */
{/* Ajouter une pièce */}
<button
  onClick={onAddRoom}
  className="..."
>
  + Ajouter une pièce
</button>
```

### Modification 2 — Supprimer le bouton "Ajouter une pièce" de l'état vide (redondant)

**Lignes 388–394** : dans le rendu état vide (`rooms.length === 0`), supprimer le bouton
"Ajouter une pièce" (le bouton de tête prend le relais). Garder uniquement le texte explicatif.

### Modification 3 — Ajouter le bouton unique en tête du panel, juste après le sélecteur de lot

**Après la ligne 378** (fin du bloc `{currentLotValidated && ...}`), insérer un `<button>` "+ Ajouter une pièce"
avec les mêmes classes que le bouton supprimé en Modification 1 (border-dashed, `min-h-[44px]`, `w-full`,
hover `border-interactive-primary`, `mt-sm` de marge par rapport au sélecteur de lot). Appelle `onAddRoom`.

Style identique au bouton existant (border-dashed) pour cohérence visuelle — c'est un déplacement, pas une création.

### Résultat attendu

```
[LOT] [tab1] [tab2]              ← sélecteur de lot
[+ Ajouter une pièce]            ← toujours visible, 1er élément actionnable
──────────────────────────────
[carte pièce 1]
[carte pièce 2]
...
──────────────────────────────
[Valider ce lot]                 ← action primaire en bas (inchangée)
```

---

## Tests UX — Flow "Ajouter une pièce"

| Test | Critère de succès | Statut |
|---|---|---|
| Bouton visible sans scroll sur desktop | Visible à l'arrivée sur l'étape 3 | ✅ après fix |
| Bouton visible sans scroll sur mobile (375px) | Premier élément sous les tabs | ✅ après fix |
| Duplication supprimée | 1 seul bouton "+ Ajouter une pièce" dans tous les états | ✅ après fix |
| Taille cible WCAG | min-h-[44px] maintenu | ✅ |
| Cohérence style | border-dashed identique à l'existant | ✅ |

---

**Handoff → @fullstack**

- Fichier produit : `docs/ux/s23-etape3-layout-rework.md`
- Fichier à modifier : `versi-studio/src/components/vs/RoomPanel.tsx` uniquement
- Décisions prises : Option B retenue (bouton en tête de panel), Option A écartée (surcharge toolbar + pb mobile)
- Points d'attention :
  - Supprimer les 2 occurrences actuelles du bouton (ligne 406 section Actions + ligne 390 état vide)
  - Insérer 1 occurrence unique après la ligne 378 (fin du badge "Lot validé")
  - Conserver le style `border-dashed` existant pour la cohérence visuelle
  - Zéro modification à `RoomCanvas.tsx` ni à `page.tsx`
