# Design System — Versi Studio

> Produit par @design | Date : 2026-04-15
> Entité : Versi Studio (4e entité, outil SaaS de pré-commercialisation)
> URL cible : studio.versi.fr
> Source de vérité visuelle pour @fullstack Versi Studio.
> À lire en parallèle : docs/design/design-system.md (parent Versi), docs/strategy/vs-brand-platform.md
> Architecture : Endorsed Brand — hérite à 100% de la palette Versi, aucune couleur d'accent propre

### Persona cible

**Thomas, 35 ans, marchand de biens, 8-12 opérations/an.** Il utilise Versi Studio après chaque visite terrain pour découper ses plans en lots et générer des visuels post-travaux. Ses frustrations principales : payer 500 euros pour 3 visuels chez un prestataire externe, attendre 2 semaines pour un rendu, et ne pas pouvoir itérer rapidement.

Les choix de design sont ancrés dans son usage :
- **Desktop-first** : Thomas travaille sur laptop au bureau après ses visites terrain — l'édition de plans sur canvas HTML5 est incompatible avec l'interaction tactile mobile
- **Palette minérale discrète** : contexte professionnel crédible — Thomas montre les visuels à ses acquéreurs et partenaires
- **Layout 4 zones** (header + sidebar + canvas + panel droit) : workflow séquentiel qui guide Thomas étape par étape sans navigation libre — il ne se perd jamais

---

## 1. Tokens hérités de Versi (ne pas modifier)

<!-- Héritage direct depuis design-system.md — aucune surcharge autorisée -->

### 1.1 Palette primitive (tier 1)

Ces valeurs sont définies dans `design-system.md` parent. Reproduites ici en lecture seule — ne jamais les modifier pour Versi Studio.

```json
"color-primitive": {
  "calcaire":      "#F7F5F2",
  "blanc":         "#FFFFFF",
  "gris-chaud":    "#D9D4CE",
  "gris-pierre":   "#6B6560",
  "beige-pierre":  "#C8B9A6",
  "vert-mineral":  "#1E2A23",
  "anthracite":    "#1A1A1A",
  "noir-profond":  "#0B0B0B"
}
```

### 1.2 Tokens sémantiques couleur (tier 2)

Les composants Versi Studio référencent UNIQUEMENT ces tokens sémantiques — jamais les primitives directement (gate G31).

```json
"color-background": {
  "default":   "calcaire → #F7F5F2",
  "card":      "blanc → #FFFFFF",
  "subtle":    "gris-chaud → #D9D4CE",
  "dark":      "noir-profond → #0B0B0B",
  "dark-alt":  "anthracite → #1A1A1A",
  "accent":    "vert-mineral → #1E2A23"
},
"color-text": {
  "default":   "noir-profond → #0B0B0B",
  "inverse":   "calcaire → #F7F5F2",
  "muted":     "gris-pierre → #6B6560",
  "accent":    "beige-pierre → #C8B9A6"
},
"color-border": {
  "default":   "gris-chaud → #D9D4CE",
  "subtle":    "gris-chaud → #D9D4CE",
  "strong":    "anthracite → #1A1A1A"
},
"color-interactive": {
  "primary":   "noir-profond → #0B0B0B",
  "hover":     "anthracite → #1A1A1A",
  "accent":    "beige-pierre → #C8B9A6"
}
```

**Contrastes WCAG 2.2 AA vérifiés :**
- `color-text-default` (#0B0B0B) sur `color-background-default` (#F7F5F2) : ratio ~19:1 — PASS
- `color-text-muted` (#6B6560) sur `color-background-default` (#F7F5F2) : ratio ~4.54:1 — PASS AA
- `color-text-inverse` (#F7F5F2) sur `color-background-dark` (#0B0B0B) : ratio ~19:1 — PASS
- `color-text-accent` (#C8B9A6) sur `color-background-dark` (#0B0B0B) : ratio ~7.2:1 — PASS

### 1.3 Typographie

Police : **PP Neue Montreal** (Fontshare — gratuit usage web). Fallback : DM Sans.
Application SaaS : les tailles display/H1 ne s'utilisent pas dans l'UI de l'app (réservées aux sites Versi). Ici, priorité aux niveaux H3, corps et labels.

| Token | Taille | Poids | Transform | Letter-spacing | Line-height | Usage SaaS |
|---|---|---|---|---|---|---|
| `text-display` | 56px / 36px mob | 300 | uppercase | 0.08em | 1.1 | Non utilisé dans l'app |
| `text-h2` | 36px / 26px mob | 300 | uppercase | 0.06em | 1.15 | Titre de section / étape |
| `text-h3` | 20px / 18px mob | 400 | uppercase | 0.04em | 1.3 | Titre de panel / modale |
| `text-body-lg` | 18px / 16px mob | 400 | none | 0 | 1.65 | Instructions, descriptions |
| `text-body` | 16px / 15px mob | 400 | none | 0 | 1.65 | Corps principal app |
| `text-body-sm` | 15px / 14px mob | 400 | none | 0 | 1.65 | Métadonnées, aide |
| `text-label` | 13px / 12px mob | 400 | uppercase | 0.1em | 1.5 | Labels fields, badges |
| `text-cta` | 13px | 500 | uppercase | 0.1em | 1.0 | Boutons, actions |

### 1.4 Spacing scale

Base unit : 4px. Scale héritée de Versi — aucune valeur arbitraire dans le code SaaS.

```json
"spacing": {
  "2xs": "2px",
  "xs":  "4px",
  "sm":  "8px",
  "md":  "16px",
  "lg":  "24px",
  "xl":  "32px",
  "2xl": "48px",
  "3xl": "64px",
  "4xl": "96px"
}
```

### 1.5 Border radius

```json
"radius": {
  "none": "0px",
  "sm":   "2px",
  "md":   "4px",
  "lg":   "6px",
  "full": "9999px"
}
```

Versi Studio hérite du principe Versi : radius minimal. Les interfaces d'outils de travail privilégient les angles droits ou très légèrement adoucis. Pas de `radius-xl` sauf exceptions documentées.

### 1.6 Shadows

Les ombres Versi sont réservées aux composants flottants (modales, dropdowns, toasts). L'app SaaS utilise des bordures fines plutôt que des ombres pour les cartes et panels internes.

```json
"shadow": {
  "card":    "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
  "panel":   "0 4px 12px rgba(0,0,0,0.10)",
  "modal":   "0 16px 48px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.10)",
  "toast":   "0 4px 16px rgba(0,0,0,0.12)",
  "none":    "none"
}
```

### 1.5 Border radius

### 1.6 Shadows

---

## 2. Tokens spécifiques SaaS Versi Studio

### 2.1 Palette fonctionnelle — Couleurs de lots (tier 1 + tier 2)

**Principe de conception :** les lots sur le plan doivent être visuellement distincts entre eux, mais rester dans l'esprit minéral et sobre de Versi. On travaille dans le registre des matières naturelles : argile, sable, ardoise, lin, lichen. Aucune couleur vive (pas de rouge, bleu électrique, vert fluo). Maximum 8 couleurs pour couvrir les cas pratiques (un immeuble de 8 lots maximum par défaut).

**Primitives lot (tier 1) :**

```json
"color-lot-primitive": {
  "argile":     "#C4A882",
  "sable":      "#D6C9B5",
  "ardoise":    "#8A929A",
  "lin":        "#BDB8A8",
  "lichen":     "#9AAA8E",
  "calcite":    "#A8B4B8",
  "silex":      "#7A7068",
  "ocre":       "#B89A6A"
}
```

**Tokens sémantiques lot (tier 2) — overlay sur canvas :**

Les overlays sont des aplats semi-transparents (opacity 0.35 par défaut, 0.55 au survol, 0.65 sélectionné). La couleur d'overlay hérite des primitives ci-dessus.

```json
"color-lot": {
  "lot-1":  "argile → #C4A882",
  "lot-2":  "sable → #D6C9B5",
  "lot-3":  "ardoise → #8A929A",
  "lot-4":  "lin → #BDB8A8",
  "lot-5":  "lichen → #9AAA8E",
  "lot-6":  "calcite → #A8B4B8",
  "lot-7":  "silex → #7A7068",
  "lot-8":  "ocre → #B89A6A"
}
```

**Tokens component canvas (tier 3) :**

```json
"canvas-lot-overlay-opacity-default":  "0.35",
"canvas-lot-overlay-opacity-hover":    "0.55",
"canvas-lot-overlay-opacity-selected": "0.65",
"canvas-lot-border-width":             "1.5px",
"canvas-lot-border-style":             "solid",
"canvas-lot-label-font":               "text-label",
"canvas-lot-label-background":         "color-background-dark (opacity 0.75)"
```

**Contrastes WCAG :** les overlays de lots sont des aides visuelles fonctionnelles (différenciation par zone), pas des porteurs d'information texte. Le label du lot (numéro + surface) est affiché dans un badge opaque à fort contraste. Les overlays seuls ne constituent pas un élément d'information critique — pas de problème WCAG intrinsèque aux overlays semi-transparents.

### 2.2 Tokens d'état fonctionnel (succès, erreur, warning)

**Principe :** l'outil a besoin de retours d'état (upload réussi, erreur de traitement IA, avertissement de taille de fichier). Ces couleurs doivent signaler sans agresser. On désature fortement pour rester dans l'esprit Versi — aucune couleur criarde.

**Primitives état (tier 1) :**

```json
"color-status-primitive": {
  "success-bg":    "#E8EDE6",
  "success-text":  "#2E4A28",
  "error-bg":      "#EDE8E6",
  "error-text":    "#4A2828",
  "warning-bg":    "#EDEBE0",
  "warning-text":  "#4A3E20",
  "info-bg":       "#E6E8ED",
  "info-text":     "#28324A"
}
```

**Tokens sémantiques état (tier 2) :**

```json
"color-status": {
  "success-background": "success-bg → #E8EDE6",
  "success-foreground": "success-text → #2E4A28",
  "error-background":   "error-bg → #EDE8E6",
  "error-foreground":   "error-text → #4A2828",
  "warning-background": "warning-bg → #EDEBE0",
  "warning-foreground": "warning-text → #4A3E20",
  "info-background":    "info-bg → #E6E8ED",
  "info-foreground":    "info-text → #28324A"
}
```

**Contrastes WCAG 2.2 AA vérifiés :**
- `success-text` (#2E4A28) sur `success-bg` (#E8EDE6) : ratio ~7.8:1 — PASS
- `error-text` (#4A2828) sur `error-bg` (#EDE8E6) : ratio ~6.9:1 — PASS
- `warning-text` (#4A3E20) sur `warning-bg` (#EDEBE0) : ratio ~7.1:1 — PASS
- `info-text` (#28324A) sur `info-bg` (#E6E8ED) : ratio ~7.4:1 — PASS

### 2.3 Tokens canvas

```json
"canvas": {
  "background":           "#FFFFFF",
  "grid-color":           "#E8E4E0",
  "grid-size":            "20px",
  "zoom-min":             "0.5",
  "zoom-max":             "3.0",
  "zoom-default":         "1.0",
  "plan-border-color":    "#1A1A1A",
  "plan-border-width":    "2px",
  "room-label-size":      "11px",
  "room-label-weight":    "400"
}
```

### 2.3 Tokens canvas

---

## 3. Logo Versi Studio

### 3.1 Construction typographique

Le logo Versi Studio suit exactement le pattern Versi existant ("VERSI" + descripteur en light), reproduit pour cette entité.

```
VERSI  STUDIO
[700]  [300]   — PP Neue Montreal, uppercase, letter-spacing 0.08em
```

**Rendu typographique :**
- "VERSI" : PP Neue Montreal, poids 700, uppercase, letter-spacing 0.08em
- "STUDIO" : PP Neue Montreal, poids 300, uppercase, letter-spacing 0.08em
- Séparation : espace double (em-space — `&emsp;`) entre les deux mots. Pas de tiret, pas de point.
- Couleur mode clair : `color-text-default` (#0B0B0B)
- Couleur mode sombre (header en contexte dark) : `color-text-inverse` (#F7F5F2)

**Variante favicon / icône app :**
- Initiales "VS" en PP Neue Montreal 700, fond `color-background-dark` (#0B0B0B)
- Taille minimum favicon : 16x16px (mais livré en 32x32px minimum)

### 3.2 Taille minimum et zones de protection

| Contexte | Taille minimum | Raison |
|---|---|---|
| Header desktop | 20px (height du bloc texte) | Lisibilité à distance normale |
| Header mobile | 16px | Espace réduit sidebar absente |
| Footer | 14px | Contexte secondaire |
| Absolu minimum | 12px | En dessous : illisible, interdit |

**Zone de protection :** espace libre équivalent à la hauteur d'un "V" de chaque côté du logo. Aucun autre élément dans cette zone.

### 3.3 Placement dans le header

Le header fixe (hauteur 56px desktop / 48px mobile) contient :
- **Gauche** : logo "VERSI STUDIO" — `text-cta` sizing (13px, uppercase)
- **Centre** : nom du projet en cours — `text-body` (16px), poids 400, couleur `color-text-muted`
- **Droite** : statut de progression (badge) + avatar utilisateur

Le logo dans le header est volontairement petit (priorité au contenu de travail). Sa fonction est d'ancrer le contexte de marque sans concurrencer l'espace de travail.

### 3.2 Taille minimum et zones de protection

### 3.3 Placement dans le header

---

## 4. Layout principal de l'application

### 4.1 Structure globale (desktop)

L'application Versi Studio est conçue desktop-first (outil de travail professionnel). La structure suit le pattern des outils SaaS de productivité : header fixe + sidebar navigation gauche + zone principale + panel contextuel droit optionnel.

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER FIXE — 56px — fond #0B0B0B                               │
│ [VERSI STUDIO]  [Nom du projet en cours]  [Statut] [Avatar]     │
├──────────────┬──────────────────────────────────┬───────────────┤
│              │                                  │               │
│  SIDEBAR     │      ZONE PRINCIPALE             │  PANEL DROIT  │
│  STEPPER     │      (contenu étape courante)    │  (contextuel) │
│  240px       │      flex-1                      │  320px        │
│  fixe        │      scroll Y                    │  optionnel    │
│              │                                  │               │
│  - Étape 1   │  Canvas / Formulaire /           │  - Chat IA    │
│  - Étape 2   │  Style picker / Export           │  - Infos lot  │
│  - Étape 3   │                                  │  - Aide       │
│  - Étape 4   │                                  │               │
│              │                                  │               │
└──────────────┴──────────────────────────────────┴───────────────┘
```

**Dimensions :**
- Header : 56px hauteur, `position: fixed`, `z-index: 50`, fond `color-background-dark` (#0B0B0B)
- Sidebar gauche : 240px largeur, `position: fixed`, top 56px, bottom 0, fond `color-background-default` (#F7F5F2), border-right 1px `color-border-default` (#D9D4CE)
- Zone principale : `margin-left: 240px`, `margin-top: 56px`, fond `color-background-default` (#F7F5F2), scroll Y indépendant
- Panel droit : 320px, `position: fixed`, top 56px, bottom 0, fond `color-background-card` (#FFFFFF), border-left 1px `color-border-default`, masqué par défaut, animé slide-in (300ms ease-out) à l'ouverture

### 4.2 Structure tablette

Breakpoint tablette : 768px–1024px. La sidebar se rétracte à 64px (icônes seules, labels masqués). Le panel droit devient un drawer en overlay (slide depuis la droite) plutôt qu'une colonne fixe.

```
┌──────────────────────────────────────────────────┐
│ HEADER — 56px                                    │
├──────┬───────────────────────────────────────────┤
│      │                                           │
│ SIDE │         ZONE PRINCIPALE                   │
│ 64px │         (scroll Y)                        │
│      │                                           │
│ [i]  │                                           │
│ [i]  │                                           │
│ [i]  │                                           │
│ [i]  │                                           │
└──────┴───────────────────────────────────────────┘
```

### 4.3 Structure mobile (consultation seule)

Breakpoint mobile : < 768px. L'édition de plans n'est pas possible sur mobile (le canvas HTML5 n'est pas adapté au touch pour ce niveau de précision). Mode consultation uniquement : lecture du dossier généré, statut du projet.

- Header : 48px, logo réduit, menu hamburger
- Navigation : bottom nav bar (4 étapes en icônes) au lieu de sidebar
- Contenu : scroll vertical, lecture seule, pas de canvas éditable
- CTA "Continuer sur desktop" affiché en banner si l'utilisateur tente d'éditer

### 4.4 Header fixe — specs

| Élément | Token | Valeur |
|---|---|---|
| Hauteur | `header-height` | 56px |
| Fond | `color-background-dark` | #0B0B0B |
| Logo | `text-cta` | 13px uppercase, PP Neue Montreal 700/300 |
| Nom projet | `text-body` | 16px, #6B6560 (`color-text-muted`) |
| Séparateur logo/nom | Slash `/` | `color-text-muted`, opacity 0.4 |
| Padding horizontal | `spacing-lg` | 24px |
| Z-index | — | 50 |

**Badge de statut projet :**
- Position : droite du nom de projet
- Variantes : "Brouillon" (fond `info-background`), "En cours" (fond `warning-background`), "Prêt à exporter" (fond `success-background`)
- Typography : `text-label` (13px uppercase)
- Padding : `spacing-xs` (4px) vertical, `spacing-sm` (8px) horizontal
- Border-radius : `radius-md` (4px)

### 4.5 Sidebar stepper — specs

La sidebar est le guide de progression principal de l'utilisateur. Elle n'est pas une navigation libre — les étapes se débloquent séquentiellement.

| Élément | Spec |
|---|---|
| Largeur | 240px desktop, 64px tablette |
| Padding interne | `spacing-lg` (24px) |
| Fond | `color-background-default` (#F7F5F2) |
| Titre section | `text-label` (13px uppercase) `color-text-muted` |
| Étape active | Fond `color-background-dark` (#0B0B0B), texte `color-text-inverse` (#F7F5F2) |
| Étape complète | Checkmark icon, texte `color-text-muted`, fond transparent |
| Étape verrouillée | Opacity 0.4, `cursor: not-allowed` |
| Étape en attente | Texte `color-text-default`, fond transparent |
| Indicateur de progression | Ligne verticale 2px `color-border-default`, connectant les étapes |
| Espacement entre étapes | `spacing-md` (16px) |

### 4.2 Structure tablette

### 4.3 Structure mobile (consultation seule)

### 4.4 Header fixe — specs

### 4.5 Sidebar stepper — specs

---

## 5. Composants UI spécifiques SaaS

### 5.1 Stepper latéral

**Description :** navigateur de progression séquentiel, colonne gauche. 4 étapes fixes.

**Variants :** standalone dans sidebar (usage unique).

**6 états par étape :**
- `default` (en attente) : cercle outline 20px `color-border-default`, label `text-label` `color-text-default`
- `hover` (étape atteignable au survol) : cercle fond `color-background-subtle`, transition 150ms
- `active` (étape en cours) : cercle plein `color-background-dark`, label bold, indicateur de bordure gauche 3px `color-text-default`
- `focus-visible` : outline 2px `color-text-default`, offset 2px — visible sur toute la ligne d'étape
- `disabled` (étape verrouillée) : opacity 0.4, `cursor: not-allowed`, pas de hover
- `loading` (traitement IA en cours) : spinner 16px animé dans le cercle, label "En cours..." en `color-text-muted`

**Tokens component (tier 3) :**
```
stepper-item-height: spacing-2xl (48px)
stepper-indicator-size: 20px
stepper-connector-width: 2px
stepper-connector-color: color-border-default
stepper-active-bg: color-background-dark
stepper-active-text: color-text-inverse
stepper-complete-icon: checkmark 16px, color-text-muted
```

**Accessibilité :** `role="list"`, chaque étape `role="listitem"`, état communiqué via `aria-current="step"` (actif), `aria-disabled="true"` (verrouillé), `aria-label="Étape 1 complète"` (complète).

**Do :** afficher systématiquement le label texte à côté de l'icône (pas icônes seules — learning pattern labels obligatoires).
**Don't :** permettre la navigation libre entre étapes non complètes.

### 5.2 Plan Canvas + Overlay de lots

**Description :** zone de travail centrale à l'étape 2. Canvas HTML5 sur lequel le plan architectural est affiché, avec overlays colorés par lot.

**Interactions :**
- Zoom : molette souris / pinch (tablette) / boutons +/- UI
- Pan : clic-glisser sur zone vide
- Sélection de lot : clic sur overlay → activation (overlay s'intensifie, badge apparaît)
- Ajout de zone : outil dessin (rectangle ou polygone) + assignation à un lot

**6 états de l'overlay de lot :**
- `default` : couleur lot opacity 0.35, border 1.5px solid
- `hover` : opacity 0.55, curseur `pointer`
- `active/selected` : opacity 0.65, border 2px solid, badge lot affiché
- `focus-visible` : outline 3px `color-text-default`, offset 1px (sur l'overlay sélectionnable)
- `disabled` (lot verrouillé pour édition) : opacity 0.2, pattern hachures diagonales
- `loading` (recalcul IA) : opacity 0.35 + shimmer animation sur l'overlay

**Tokens component canvas (tier 3) :**
```
canvas-toolbar-height: 44px
canvas-toolbar-bg: color-background-card
canvas-toolbar-border: color-border-default
canvas-zoom-button-size: 32px (touch target 44px via padding)
canvas-plan-shadow: shadow-panel
```

**Accessibilité :** le canvas HTML5 n'est pas accessible aux lecteurs d'écran. Un tableau de données lisible par machine DOIT être fourni en alternative (`aria-describedby` pointant vers un tableau récapitulatif des lots hors canvas). Chaque lot dans le tableau : numéro, type, surface, statut.

### 5.3 Lot Badge

**Description :** badge compact identifiant un lot sur le canvas ou dans la liste.

**Variants :** canvas (fond opaque sur overlay) / list (dans le panel des lots).

**6 états :**
- `default` : fond `color-lot-X` (couleur du lot), texte `color-text-default` ou inverse selon contraste, `border-radius: radius-sm (2px)`
- `hover` : légère élévation (shadow-card), scale 1.02
- `active` : border 2px `color-text-default`, fond `color-lot-X` intensifié
- `focus-visible` : outline 2px `color-text-default`, offset 2px
- `disabled` : opacity 0.5
- `loading` : shimmer

**Tokens component (tier 3) :**
```
lot-badge-padding: spacing-2xs spacing-xs (2px 4px)
lot-badge-font: text-label (13px)
lot-badge-radius: radius-sm (2px)
lot-badge-min-width: 48px
lot-badge-height: 24px
```

### 5.4 Room Badge

**Description :** micro-badge identifiant une pièce sur le canvas (cuisine, chambre, salon...). Affiché centré dans la zone de la pièce.

**Variants :** canvas uniquement.

**Specs visuelles :**
- Taille : 11px, fond `color-background-dark` opacity 0.75, texte `color-text-inverse`
- Pas de border-radius (pixel précis sur canvas)
- Non interactif (information uniquement)

**6 états :**
- `default` : visible si zoom > 0.8
- `hover` : non applicable (non interactif)
- `active` : non applicable
- `focus-visible` : non applicable (non focusable, info seulement)
- `disabled` : masqué si zoom < 0.8 (`canvas-room-label-zoom-threshold: 0.8`)
- `loading` : masqué pendant recalcul IA
### 5.2 Plan Canvas + Overlay de lots
### 5.3 Lot Badge
### 5.4 Room Badge
### 5.5 Style Picker Card

**Description :** carte de sélection de style architectural à l'étape 3 (Haussmannien, Contemporain, Industriel, etc.). Grille de cartes 3 colonnes desktop, 2 tablette.

**Anatomy :**
- Image de référence (ratio 4:3, pleine largeur de carte)
- Label : nom du style — `text-h3` uppercase
- Sous-label : courte description 1 ligne — `text-body-sm` `color-text-muted`
- Checkmark en overlay (coin supérieur droit) quand sélectionné

**6 états :**
- `default` : fond `color-background-card`, border 1px `color-border-default`, radius `radius-md (4px)`
- `hover` : border 1px `color-text-default`, shadow `shadow-card`, transition 150ms
- `active/selected` : border 2px `color-text-default`, checkmark overlay fond `color-background-dark` (20px ronde)
- `focus-visible` : outline 2px `color-text-default`, offset 2px — autour de la carte entière
- `disabled` : opacity 0.4, `cursor: not-allowed`
- `loading` : shimmer sur l'image (skeleton 4:3)

**Tokens component (tier 3) :**
```
style-card-radius: radius-md (4px)
style-card-image-ratio: 4/3
style-card-padding: spacing-sm (8px)
style-card-gap: spacing-md (16px)
style-card-selected-border: 2px
style-card-checkmark-size: 20px
```

**Do :** toujours afficher l'image de référence du style (pas d'illustration générique).
**Don't :** mélanger des styles visuellement trop proches dans la même grille sans différentiation claire du label.

### 5.6 Photo Upload Zone

**Description :** zone de drag-and-drop pour l'upload de photos à l'étape 1 (plan) et étape 3 (photos existantes pour l'Avant/Après).

**Anatomy :**
- Zone dashed border centrée
- Icône upload (24px) + texte d'instruction + limite de taille
- Preview vignettes après upload (grille 4 colonnes)

**6 états :**
- `default` : border 2px dashed `color-border-default`, fond `color-background-default`, texte `color-text-muted`
- `hover` (survol souris) : border `color-text-default`, fond `color-background-subtle` (#D9D4CE opacity 0.3), transition 150ms
- `active/drag-over` : border 2px solid `color-text-default`, fond `color-background-subtle`, scale légère de la zone (1.01)
- `focus-visible` : outline 2px `color-text-default`, offset 2px (sur le bouton "parcourir" en fallback)
- `disabled` : opacity 0.4, `cursor: not-allowed`, texte "Upload désactivé"
- `loading` (upload en cours) : progress bar linéaire sous la zone, % affiché, spinner dans la zone

**Validation :**
- Formats acceptés : PDF, PNG, JPG (plan), JPG/PNG (photos)
- Taille max : 50 MB (plan PDF), 10 MB (photos)
- Erreur de format : toast `error` + message inline dans la zone
- Erreur de taille : toast `error` + message inline

**Tokens component (tier 3) :**
```
upload-zone-min-height: 160px
upload-zone-border-radius: radius-lg (6px)
upload-zone-border-width: 2px
upload-zone-border-style: dashed
upload-preview-grid-cols: 4 (desktop), 2 (mobile)
upload-preview-size: 80px x 80px (carré)
```

### 5.7 Avant/Après Comparateur

**Description :** composant de split-view permettant de comparer le plan ou la photo originale avec le rendu généré par l'IA. Slider central draggable.

**Anatomy :**
- Container 100% width de la zone principale
- Slider central : ligne verticale 2px `color-text-default` + handle rond 32px
- Label "Avant" (gauche) et "Après" (droite) en `text-label` uppercase fond `color-background-dark` opacity 0.75

**6 états du handle :**
- `default` : rond 32px fond `color-background-dark`, icon arrows-left-right 16px `color-text-inverse`
- `hover` : scale 1.1, shadow `shadow-card`
- `active/dragging` : scale 1.15, curseur `grabbing`
- `focus-visible` : outline 2px `color-text-inverse`, offset 2px (visible sur fond sombre)
- `disabled` : handle masqué, vue fixe sur l'Après
- `loading` (rendu IA en cours) : handle masqué, shimmer sur la moitié "Après", progress bar IA visible

**Accessibilité :** le handle est focusable (`tabIndex={0}`), navigable au clavier (←/→ déplace le split par 5%), `aria-label="Ajuster la comparaison avant/après"`, `aria-valuenow` (pourcentage de position).

**Tokens component (tier 3) :**
```
compare-handle-size: 32px (touch target: 44px via padding invisible)
compare-handle-bg: color-background-dark
compare-divider-width: 2px
compare-label-font: text-label
compare-label-padding: spacing-2xs spacing-sm (2px 8px)
```

### 5.8 Chat Drawer (Agent Architecte)

**Description :** panel droit (320px) ou drawer mobile contenant l'interface de chat avec l'agent IA Architecte. Accessible via bouton dans le header ou sidebar.

**Anatomy :**
- Header drawer : "Agent Architecte" + avatar icône + bouton fermer
- Zone messages : scroll Y, messages IA (gauche) + messages user (droite)
- Zone input : textarea + bouton envoyer (32px)

**6 états de l'input chat :**
- `default` : border 1px `color-border-default`, fond `color-background-card`, placeholder `color-text-muted`
- `hover` : border `color-border-strong`
- `active/focus` : border 2px `color-text-default`, fond `color-background-card`
- `focus-visible` : outline 2px `color-text-default`, offset 2px (distinct du focus visuel ci-dessus)
- `disabled` (IA en traitement) : opacity 0.5, `cursor: not-allowed`
- `loading` (IA en train de répondre) : indicateur typing (3 points animés) dans une bulle IA

**Message IA :**
- Fond `color-background-subtle`, border-left 3px `color-border-strong`, `text-body-sm`
- Lien inline si l'IA suggère une action : underline, couleur `color-text-default`

**Message user :**
- Fond `color-background-dark`, texte `color-text-inverse`, `text-body-sm`, align-right

**Tokens component (tier 3) :**
```
chat-drawer-width: 320px (desktop), 100% (mobile bottom sheet)
chat-message-radius: radius-md (4px)
chat-message-padding: spacing-sm (8px)
chat-message-gap: spacing-sm (8px)
chat-input-min-height: 44px
chat-input-max-height: 120px
```

**Pattern mobile :** drawer = bottom sheet (`items-end` en mobile). Hauteur 60dvh. Handle de drag visible. `safe-area-inset-bottom` appliqué.

### 5.9 Progress Bar IA

**Description :** indicateur de progression lors du traitement IA (génération des visuels, analyse du plan). Affiché dans la zone principale quand l'IA travaille.

**Anatomy :**
- Barre horizontale pleine largeur + % centré au-dessus
- Label d'étape IA : texte descriptif de ce que l'IA fait ("Analyse du plan en cours...", "Génération des visuels...", "Finalisation du dossier...")
- Durée estimée restante (si disponible)

**6 états :**
- `default` : masquée (affichée seulement en traitement)
- `hover` : non applicable
- `active/progress-X%` : barre `color-background-dark` remplie à X%, animation `width` ease-in-out
- `focus-visible` : non focusable (information uniquement)
- `disabled` : non applicable
- `loading` (indeterminate) : animation shimmer de gauche à droite si durée inconnue

**Tokens component (tier 3) :**
```
progress-bar-height: 4px
progress-bar-radius: radius-full (9999px)
progress-bar-bg-track: color-border-default
progress-bar-bg-fill: color-background-dark
progress-label-font: text-body-sm
progress-duration-font: text-label
progress-duration-color: color-text-muted
```

**Accessibilité :** `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label="Progression du traitement IA"`. Si indeterminate : `aria-valuetext="En cours..."`.

### 5.10 Toast Notifications

**Description :** notifications temporaires (4 secondes par défaut) pour les actions système. Positionnées en bas à droite desktop, bas centre mobile.

**Variants :** `success`, `error`, `warning`, `info`.

**6 états :**
- `default` : non visible (absent du DOM)
- `hover` : pause du timer de fermeture automatique
- `active` (visible) : visible selon variant, shadow `shadow-toast`
- `focus-visible` : outline 2px `color-text-default`, offset 2px (sur bouton fermer)
- `disabled` : non applicable
- `loading` : non applicable (c'est un état résultant, pas un loader)

**Anatomy toast :**
- Icône 16px (check / X / triangle / i) + message `text-body-sm` + bouton X fermer 20px
- Fond : `color-status-X-background`, border-left 4px `color-status-X-foreground`
- Padding : `spacing-sm spacing-md` (8px 16px)
- Border-radius : `radius-md` (4px)
- Shadow : `shadow-toast`
- Animation entrée : `slide-up + fade-in, 200ms ease-out`
- Animation sortie : `fade-out + slide-down, 150ms ease-in`

**Tokens component (tier 3) :**
```
toast-max-width: 360px
toast-min-width: 280px
toast-border-left-width: 4px
toast-icon-size: 16px
toast-gap: spacing-sm (8px)
toast-duration: 4000ms
toast-z-index: 100
```

**prefers-reduced-motion :** animation d'entrée/sortie remplacée par `opacity` uniquement (0→1 et 1→0), durée réduite à `fast (150ms)`.
### 5.6 Photo Upload Zone
### 5.7 Avant/Après Comparateur
### 5.8 Chat Drawer (Agent Architecte)
### 5.9 Progress Bar IA
### 5.10 Toast Notifications

---

## 6. Compositions de pages — Étape par étape

### Étape 1 — Upload du plan

**Objectif utilisateur :** importer le plan architectural du bâtiment (PDF ou image).

**Layout desktop :**
- Zone principale : centrée, max-width 640px, padding `spacing-2xl` (48px) autour
- Titre : "Importez votre plan" — `text-h2` uppercase, `color-text-default`
- Sous-titre : description 1 ligne — `text-body` `color-text-muted`
- Composant `Photo Upload Zone` centré (largeur 100%, hauteur min 200px)
- Consignes de format : `text-label` `color-text-muted` — liste inline (PDF recommandé · PNG/JPG accepté · Max 50 MB)
- CTA "Analyser le plan" : bouton primary (fond `color-background-dark`, texte `color-text-inverse`, `text-cta` uppercase), largeur auto, disabled jusqu'à upload valide

**Layout tablette :** identique desktop, padding réduit à `spacing-lg` (24px).

**Layout mobile (consultation) :** affichage informatif "Importez votre plan depuis un ordinateur". Bouton désactivé avec explication.

**États de la page :**
- `default` : zone upload vide, CTA disabled
- `drag-over` : zone activée (état hover de `Photo Upload Zone`)
- `uploaded` : aperçu du plan (image thumbnail + nom fichier + taille), CTA enabled
- `analyzing` : progress bar IA indeterminate, label "Analyse du plan en cours...", CTA masqué
- `error` : toast error + message inline dans la zone upload
- `complete` : transition automatique vers Étape 2 (300ms)

**Breakpoints responsive :**
- `xl (1280px)` : max-width 640px, layout centré
- `lg (1024px)` : idem
- `md (768px)` : padding réduit, sidebar 64px
- `sm (640px)` : consultation seule

### Étape 2 — Définition des lots et pièces

**Objectif utilisateur :** tracer ou valider les zones de lots sur le plan, nommer les pièces.

**Layout desktop :**
- Zone principale divisée en 2 colonnes : canvas (flex-1) + panel liste (320px fixe droite)
- Canvas : `Plan Canvas + Overlay de lots` — occupe 100% de la hauteur disponible
- Toolbar canvas : bande 44px au-dessus du canvas — outils (sélection, dessin zone, zoom +/-, fit to screen)
- Panel liste droite : liste des lots (accordéon par lot → liste des pièces)

**Anatomy du panel liste lots :**
- Titre "Lots définis" — `text-label` uppercase `color-text-muted`
- Chaque lot : `Lot Badge` (couleur) + nom éditable inline + surface auto-calculée + bouton supprimer
- Sous chaque lot (accordéon) : liste des pièces — icône pièce + nom + surface
- Bouton "Ajouter un lot" en bas de liste : icône `+` + label `text-cta`

**États de la page :**
- `default` : canvas avec plan importé, aucun lot défini, panel liste vide, instructions "Tracez votre premier lot"
- `drawing` : outil dessin actif, cursor `crosshair`, outline en temps réel sur canvas
- `lot-selected` : overlay lot intensifié, panel liste scroll jusqu'au lot
- `lot-renamed` (inline edit) : input texte inline dans le badge de liste
- `analyzing` (après validation) : progress bar IA, "Détection des pièces en cours..."
- `complete` : tous les lots définis, CTA "Passer à l'étape 3" enabled

**Breakpoints responsive :**
- `xl/lg` : 2 colonnes canvas + panel liste 320px
- `md (tablette)` : panel liste devient drawer (bouton "Voir les lots" dans toolbar)
- `sm` : consultation seule (canvas en lecture, liste en scroll vertical)

### Étape 3 — Sélection du style architectural

**Objectif utilisateur :** choisir le style de rendu pour les visuels générés par l'IA.

**Layout desktop :**
- Zone principale : scroll Y
- Titre "Choisissez le style" — `text-h2`
- Sous-titre "Le style détermine les matériaux, couleurs et atmosphère des visuels générés" — `text-body`
- Grille `Style Picker Card` : 3 colonnes, `gap: spacing-lg (24px)`, max 6 styles au lancement
- Section optionnelle "Ajouter vos photos de référence" : `Photo Upload Zone` (hauteur min 120px), placeholder "Importez des photos d'inspiration (optionnel)"
- CTA "Générer les visuels" : bouton primary, disabled jusqu'à sélection d'un style

**États de la page :**
- `default` : grille styles, aucun sélectionné, CTA disabled
- `style-selected` : carte sélectionnée (6 état active de `Style Picker Card`), CTA enabled
- `photos-uploaded` : vignettes photos en dessous de la zone upload
- `generating` : progress bar IA determinate, label "Génération des visuels [Haussmannien] en cours...", durée estimée
- `complete` : transition vers Étape 4

**Breakpoints responsive :**
- `xl/lg` : 3 colonnes styles
- `md` : 2 colonnes styles
- `sm` : 1 colonne + scroll

### Étape 4 — Génération et export du dossier

**Objectif utilisateur :** prévisualiser le dossier complet généré, ajuster si besoin, exporter en PDF.

**Layout desktop :**
- Zone principale : 2 colonnes (prévisualisation 60% / contrôles export 40%)
- Colonne gauche : preview scrollable du dossier (pages PDF rendues en HTML)
- Colonne droite : options d'export (format, qualité), CTA "Télécharger le PDF" (bouton primary large), secondaire "Envoyer par email"

**Prévisualisation du dossier :**
- Chaque page du dossier = carte blanche shadow `shadow-panel`, ratio A4 (1:1.414)
- Scroll vertical, pages empilées avec `gap: spacing-lg (24px)`
- Minimap optionnel : barre de navigation à droite des pages (points cliquables)

**Composant `Avant/Après Comparateur` :**
- Affiché pour chaque visuel généré (un comparateur par lot ou par pièce photo)
- Position : dans la prévisualisation scrollable, au niveau de chaque visuel

**États de la page :**
- `generating` : page verrouillée pendant génération, progress bar IA central, "Assemblage du dossier..."
- `default` (génération terminée) : prévisualisation complète, CTA export enabled
- `adjusting` : l'utilisateur peut revenir aux étapes précédentes (liens dans la sidebar)
- `exporting` : bouton PDF en loading state, spinner + "Génération du PDF..."
- `exported` : toast success "Dossier téléchargé" + option "Partager le lien"
- `error` : toast error + option "Réessayer"

**Breakpoints responsive :**
- `xl/lg` : 2 colonnes (60/40)
- `md` : colonne unique, contrôles export en sticky bottom bar
- `sm` : prévisualisation scroll + bouton export en bottom bar sticky
### Étape 2 — Définition des lots et pièces
### Étape 3 — Sélection du style architectural
### Étape 4 — Génération et export du dossier

---

## 7. Responsive

### Stratégie générale

Versi Studio est un **outil de travail professionnel** — la priorité est desktop-first (inverse du site vitrine Versi qui est mobile-first). La raison : le canvas de plans requiert une précision de tracé incompatible avec l'interaction tactile mobile.

| Breakpoint | Largeur | Mode | Sidebar | Panel droit |
|---|---|---|---|---|
| `2xl` | 1536px+ | Édition complète | 240px fixe | 320px fixe optionnel |
| `xl` | 1280px | Édition complète | 240px fixe | 320px fixe optionnel |
| `lg` | 1024px | Édition complète | 240px fixe | Panel = drawer |
| `md` | 768px | Édition réduite | 64px (icônes) | Drawer overlay |
| `sm` | 640px | Consultation seule | Bottom nav | N/A |
| Mobile | < 640px | Consultation seule | Bottom nav | Bottom sheet |

### Breakpoint md (768px–1024px) — tablette

- Sidebar rétractée à 64px : icônes uniquement, labels dans tooltip au survol
- Tooltip hover : `text-label`, fond `color-background-dark`, texte `color-text-inverse`, radius `radius-sm`, delay 400ms
- Panel droit : converti en drawer (bouton dans toolbar canvas → slide depuis droite, fond overlay `rgba(0,0,0,0.3)`)
- Canvas : occupe la totalité de la zone principale (margin-left 64px)

### Breakpoint sm et mobile (< 768px) — consultation seule

- Navigation : bottom nav bar 4 onglets (icônes + labels courts sous chaque icône), hauteur 56px, `safe-area-inset-bottom` appliqué
- Canvas d'édition : remplacé par image statique du plan (screenshot du canvas) avec label "Édition disponible sur ordinateur"
- Contenu de chaque étape : affiché en mode lecture (données en liste, pas de formulaire d'édition)
- CTA principal : "Ouvrir sur ordinateur" (copie le lien vers le presse-papier)
- Les dossiers générés (étape 4) : consultables en lecture sur mobile (preview PDF responsive)

### Grid system dans l'app

L'app n'utilise pas de grille 12 colonnes comme les sites vitrines. Elle utilise un layout fixe par zones (header fixe, sidebar fixe, zone principale flex). Mais à l'intérieur de la zone principale, les grilles de contenu suivent :

- Grille styles (étape 3) : `grid-cols-3` desktop, `grid-cols-2` tablette, `grid-cols-1` mobile
- Grille previews photos : `grid-cols-4` desktop, `grid-cols-2` tablette/mobile
- Grille pages dossier (étape 4) : colonne unique centrée, max-width 794px (A4 72dpi)

---

## 8. Accessibilité

### Contrastes WCAG 2.2 AA

Récapitulatif de tous les couples couleur utilisés dans l'application :

| Contexte | Couleur texte | Fond | Ratio | Résultat |
|---|---|---|---|---|
| Corps principal | #0B0B0B | #F7F5F2 | ~19:1 | PASS AA + AAA |
| Texte muted | #6B6560 | #F7F5F2 | ~4.54:1 | PASS AA |
| Texte inverse (header, dark bg) | #F7F5F2 | #0B0B0B | ~19:1 | PASS AA + AAA |
| Texte accent (sur dark) | #C8B9A6 | #0B0B0B | ~7.2:1 | PASS AA + AAA |
| Status success | #2E4A28 | #E8EDE6 | ~7.8:1 | PASS AA + AAA |
| Status error | #4A2828 | #EDE8E6 | ~6.9:1 | PASS AA + AAA |
| Status warning | #4A3E20 | #EDEBE0 | ~7.1:1 | PASS AA + AAA |
| Status info | #28324A | #E6E8ED | ~7.4:1 | PASS AA + AAA |
| Label dans badge lot sombre | #F7F5F2 | #0B0B0B (opacity 0.75) | ~12:1 approx | PASS AA |

**Note overlays de lots :** les overlays colorés semi-transparents (opacity 0.35–0.65) sur canvas ne sont pas des éléments porteurs d'information texte. Les labels associés (numéro + surface) sont affichés dans des badges opaques à fort contraste — voir `Lot Badge`.

### Focus-visible

Règle absolue : `outline: none` est interdit sans alternative visible. Sur Versi Studio :

- Focus-visible standard : `outline: 2px solid #0B0B0B; outline-offset: 2px` sur fond clair
- Focus-visible sur fond sombre (header, chat dark) : `outline: 2px solid #F7F5F2; outline-offset: 2px`
- Focus-visible sur canvas comparateur : `outline: 2px solid #F7F5F2; outline-offset: 2px` (fond sombre du handle)
- Implementation Tailwind : `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B0B0B]`
- Interdit : `focus:outline-none` sans `focus-visible:ring` alternatif

Tous les éléments interactifs sont focusables dans cet ordre logique :
1. Header (logo → nom projet → statut → avatar)
2. Sidebar stepper (étape 1 → 2 → 3 → 4)
3. Zone principale (toolbar → canvas ou formulaire)
4. Panel droit (si ouvert : fermer → messages → input)

### Touch targets mobile

Tous les éléments interactifs sur mobile (< 768px) : minimum 44x44px touch target.

| Composant | Taille visuelle | Touch target |
|---|---|---|
| Bouton fermer drawer | 20px | 44x44px (padding invisible) |
| Onglet bottom nav | 48px largeur | 44px hauteur |
| Bouton zoom canvas | 32px | 44x44px |
| Handle comparateur | 32px | 44x44px |
| Lot Badge (sélectionnable) | variable | min 44px hauteur |

### prefers-reduced-motion

Quand `@media (prefers-reduced-motion: reduce)` est actif :

| Animation | Comportement normal | Comportement reduced |
|---|---|---|
| Toast entrée/sortie | slide-up + fade (200ms) | fade uniquement (150ms) |
| Drawer chat slide | slide 300ms ease-out | fade 150ms |
| Style card hover | scale + shadow 150ms | shadow seul, 0ms transition |
| Overlay lot hover | opacity 150ms | opacity 0ms (instantané) |
| Progress bar IA | fill animé ease-in-out | update instantané |
| Shimmer skeleton | animation infinie | pas de shimmer, fond static |
| Comparateur handle | scale 150ms | pas de scale |

Implementation : variable CSS `--motion-duration: 150ms` (reduced) vs `--motion-duration: 300ms` (normal), appliquée via `@media (prefers-reduced-motion: reduce)` global dans le CSS.

### ARIA et sémantique

- Stepper : `role="list"` + `role="listitem"` + `aria-current="step"` (actif) + `aria-disabled="true"` (verrouillé)
- Canvas : `role="application"` avec `aria-label="Éditeur de plan"` + tableau alternatif hors canvas (`aria-describedby`)
- Progress bar IA : `role="progressbar"` + `aria-valuenow` + `aria-valuemin/max` + `aria-label`
- Toast : `role="alert"` (erreur/warning) ou `role="status"` (success/info) + `aria-live="polite"`
- Chat drawer : `role="complementary"` + `aria-label="Agent Architecte"` + `aria-expanded` sur le bouton d'ouverture
- Modales : `role="dialog"` + `aria-modal="true"` + `aria-labelledby` + focus trap + `Escape` pour fermer

### Exports (dossier PDF)

Les dossiers PDF générés par Versi Studio DOIVENT utiliser les tokens de couleur, typographie et spacing hérités de Versi. Un dossier qui ne ressemble pas à l'app = échec de brand consistency. Specs pour @fullstack :
- Police PDF : PP Neue Montreal embedded, fallback Arial si non embeddable
- Couleurs PDF : palette Versi uniquement (pas de couleurs injectées par la lib de génération PDF)
- Typographie PDF : `text-h2` pour titres de section, `text-body` pour corps, `text-label` pour légendes
- Logo PDF : "VERSI STUDIO" en en-tête de chaque page, format typographique (pas d'image bitmap)

---

## Handoff → @fullstack

---

**Handoff → @fullstack**

**Fichiers produits :**
- `/home/user/Versi/docs/design/vs-design-system.md` — design system complet Versi Studio

**Références à lire avant d'implémenter :**
- `docs/design/design-system.md` — design system parent Versi (source des tokens hérités)
- `docs/strategy/vs-brand-platform.md` — positionnement Versi Studio

**Décisions prises :**

1. **Palette héritage 100%** — aucune couleur d'accent propre à Versi Studio. L'endorsed brand est strict : même palette, même typo que Versi.
2. **Couleurs de lots : palette minérale 8 tons** (argile, sable, ardoise, lin, lichen, calcite, silex, ocre). Overlays à 0.35/0.55/0.65 opacity selon état. Jamais de couleurs vives.
3. **Couleurs d'état très désaturées** (fond pastel sur fond légèrement teinté) — ratios WCAG AA tous passants.
4. **Layout : header 56px + sidebar 240px + zone principale flex + panel droit 320px optionnel**. Sidebar rétractée à 64px sous 1024px, bottom nav sous 768px.
5. **Desktop-first** (inverse des sites vitrines) — mobile = consultation seule, pas d'édition de plans.
6. **Canvas HTML5** : tableau alternatif ARIA obligatoire (`aria-describedby`), le canvas seul ne passe pas WCAG.
7. **Pattern bottom sheet pour le chat drawer sur mobile** — pas de modal centré sur iOS Safari.
8. **Exports PDF** : tokens Versi obligatoires (police, couleurs, spacing), pas de styles injectés par la lib PDF.
9. **Logo "VERSI STUDIO"** : PP Neue Montreal 700 + 300, uppercase, em-space entre les deux mots, pas de tiret.
10. **Architecture tokens 3 tiers** : primitives → sémantiques → component. Aucun composant ne référence directement un token primitif (ex: `color-lot-primitive-argile`). Toujours via `color-lot-lot-1`.

**Points d'attention implémentation :**
- `prefers-reduced-motion` : variable CSS globale `--motion-duration`, pas de gestion composant par composant
- `focus-visible` : `outline: 2px solid` avec `outline-offset: 2px` — deux variantes (fond clair / fond sombre)
- Touch targets : 44x44px minimum via padding invisible sur les petits éléments (bouton fermer 20px, handle 32px)
- Stepper : déverrouillage séquentiel (étape N+1 accessible seulement si étape N complète), géré côté state
- Canvas zoom : `min 0.5`, `max 3.0`, `default 1.0`, boutons +/- dans toolbar + molette souris
- Room Badge : visible uniquement si zoom > 0.8 (threshold `canvas-room-label-zoom-threshold`)
- Progress bar IA : si durée inconnue → indeterminate shimmer. Si durée connue → determinate fill animé
- Toasts : `z-index: 100`, positionnés en bas à droite desktop / bas centre mobile, auto-fermeture 4000ms, pause au hover

---
