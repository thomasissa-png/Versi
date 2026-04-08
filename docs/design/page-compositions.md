# Page Compositions — Versi

> Produit par @design | Date : 2026-04-08
> Source de vérité pour @fullstack sur le layout et les images de chaque section.
> Référence : docs/design/design-system.md, docs/product/functional-specs.md, project-context.md
> Site one-page : versi.fr — vitrine institutionnelle holding immobilière.

---

## Navigation (sticky)

**Fond / état** : transparent sur Hero → `color-bg-dark-alt` (#1A1A1A) après scroll (transition 300ms)
**Height** : 80px fixe (tous breakpoints)

| Élément | Position | Token typo | Couleur |
|---|---|---|---|
| VERSI (logo texte) | Gauche — padding-left `spacing-2xl` desktop | label 13px, tracking 0.1em | `color-text-inverse` |
| Items menu (VISION…CONTACT) | Centre — flex gap `spacing-2xl` | label 13px, tracking 0.1em | `color-text-inverse` |
| CTA NOUS CONTACTER | Droite — padding-right `spacing-2xl` | label 13px, tracking 0.1em | outline blanc fin 1px |

**Responsive :**
- 375px : logo gauche + hamburger droite (44×44px touch). Items masqués. Menu overlay plein écran `color-bg-dark`.
- 768px : identique mobile.
- 1280px : layout complet 3 zones (logo / items / CTA).

---

## Section Hero (`#hero`)

**Fond** : `color-bg-dark` (#0B0B0B)
**Min-height** : 100vh
**Layout** : colonne unique centrée (flex, items-center, justify-center), max-width 760px, margin auto

| Élément | Token typo | Couleur | Spacing bas |
|---|---|---|---|
| Surtitre label `HOLDING IMMOBILIÈRE INTÉGRÉE` | 13px, tracking 0.1em, uppercase | `color-text-inverse` opacity 0.6 | `spacing-md` (16px) |
| H1 `Le cycle immobilier complet. / Maîtrisé en interne.` | 56px light 300, uppercase, tracking 0.08em | `color-text-inverse` | `spacing-xl` (32px) |
| Sous-titre corps | 18px, max-width 560px | `color-text-inverse` opacity 0.85 | `spacing-2xl` (48px) |
| CTA principal `DÉCOUVRIR NOS ACTIVITÉS` | 13px medium 500, uppercase, tracking 0.1em | outline `color-text-inverse` 1px, fond transparent | `spacing-md` (16px) |
| CTA secondaire `NOUS CONTACTER →` | 13px, uppercase | `color-text-inverse` opacity 0.7 | `spacing-4xl` (96px) |
| Scroll hint (chevron bas) | — | `color-text-inverse` opacity 0.6 | — |

**Image Hero :**
- Type : photo architecturale plein cadre
- Sujet : façade haussmannienne angle bas, contre-jour, zinc parisien ou détail béton brut — PAS de vue frontale centrée
- Style : désaturée, lumière naturelle froide, ciel blanc ou gris, pas d'humains
- Overlay : `linear-gradient(to bottom, rgba(11,11,11,0.55) 0%, rgba(11,11,11,0.70) 100%)`
- Source : Unsplash — recherche "haussmann facade angle", "paris building brutalist detail", "stone facade contre-jour"
- Dimensions : ratio portrait ou carré, min 1200px largeur, `object-fit: cover`
- Format : WebP, < 200ko après compression

**Animations entrée (fade-in, prefers-reduced-motion respecté) :**
Surtitre 0ms → H1 150ms → sous-titre 300ms → CTAs 450ms → scroll hint 800ms (+ loop opacity)

**Responsive :**
- 375px : H1 → 36px. Sous-titre → 16px. CTAs pleine largeur (flex-col). Scroll hint visible.
- 768px : H1 → 44px. Même layout colonne.
- 1280px : H1 → 56px. Max-width 760px centré.

---

## Section Mission (`#mission`)

**Fond** : `color-bg-primary` (#F7F5F2)
**Padding vertical** : `spacing-5xl` (120px) desktop / `spacing-4xl` (96px) mobile

**Layout desktop (>= 1280px)** : 2 colonnes — col gauche 60% / col droite 40%, gap `spacing-3xl` (64px), padding-x `spacing-2xl` (48px)
**Layout mobile** : 1 colonne empilée, padding-x `spacing-lg` (24px)

| Zone | Contenu | Token typo |
|---|---|---|
| Col gauche — label | `VISION` | 13px, tracking 0.1em, `color-text-muted` |
| Col gauche — H2 | `Un opérateur intégré. / Quatre métiers. Un cycle.` | 36px light 300, uppercase, tracking 0.06em, `color-text-primary` |
| Col gauche — corps ×2 | Paragraphes Versi | 18px / 16px mobile, `color-text-primary`, max-width 560px |
| Col droite — stats | 3 blocs `35+` / `3` / `4` empilés | Chiffre : 48px thin 200. Label : 13px `color-text-muted`. Séparateur `1px solid color-border` entre blocs |

**Image** : aucune image photographique — la section est intentionnellement textuelle. Le poids visuel vient des chiffres statistiques (48px thin).

**Responsive :**
- 375px : col unique. Stats en ligne horizontale (3 chiffres côte à côte, taille réduite 36px).
- 768px : col unique, stats en ligne.
- 1280px : 2 colonnes 60/40 avec stats en colonne dans la droite.

---

## Section Activités (`#activites`)

**Fond** : `color-bg-primary` (#F7F5F2)
**Padding vertical** : `spacing-5xl` (120px) desktop / `spacing-4xl` (96px) mobile
**Padding horizontal** : `spacing-2xl` (48px) desktop / `spacing-lg` (24px) mobile

**Layout grille cartes :**
- Desktop >= 1280px : 4 colonnes égales, gap `spacing-xl` (32px)
- Tablette 768–1279px : 2 × 2, gap `spacing-xl`
- Mobile < 768px : 1 colonne, gap `spacing-lg` (24px)

**En-tête de section (avant la grille) :**

| Élément | Token typo | Couleur |
|---|---|---|
| Label `ACTIVITÉS` | 13px, tracking 0.1em, uppercase | `color-text-muted` |
| H2 `Quatre métiers. Un cycle maîtrisé.` | 36px light 300, uppercase, tracking 0.06em | `color-text-primary` |

**Anatomie d'une carte entité :**

| Élément | Token typo | Couleur |
|---|---|---|
| Label métier (ex: `MARCHAND DE BIENS`) | 13px, tracking 0.1em, uppercase | `color-text-muted` |
| Titre entité (ex: `Versi Développement`) | 20px regular, uppercase, tracking 0.04em | `color-text-primary` |
| Corps | 15px, line-height 1.65 | `color-text-primary` |
| CTA `Accéder au site →` | 13px medium, uppercase | actif: `color-text-primary` / inactif: `color-text-muted`, cursor not-allowed |

**Carte** : fond `color-bg-secondary` (#FFFFFF), border `1px solid color-border`, padding `spacing-xl` (32px) desktop / `spacing-lg` (24px) mobile, radius `radius-sm` (4px), shadow `0 2px 8px rgba(0,0,0,0.06)`.

**Image** : pas d'image photographique dans les cartes — le style épuré est le signal de qualité. Optionnel : icône vectorielle minimaliste 32×32px en `color-text-muted` en haut de chaque carte (un V stylisé différent par entité, non prioritaire en V1).

**Responsive :**
- 375px : 1 colonne. Padding carte 24px. Corps 14px.
- 768px : 2×2. Padding carte 28px.
- 1280px : 4 colonnes égales.

---

## Section Approche (`#approche`)

**Fond** : `color-bg-dark` (#0B0B0B)
**Padding vertical** : `spacing-5xl` (120px) desktop / `spacing-4xl` (96px) mobile
**Padding horizontal** : `spacing-2xl` (48px) desktop / `spacing-lg` (24px) mobile

**En-tête de section :**

| Élément | Token typo | Couleur |
|---|---|---|
| Label `APPROCHE` | 13px, tracking 0.1em, uppercase | `color-text-inverse` opacity 0.5 |
| H2 `Notre méthode.` | 36px light 300, uppercase, tracking 0.06em | `color-text-inverse` |
| Sous-titre `Quatre étapes. Un cycle reproductible.` | 18px | `color-text-inverse` opacity 0.7 |

**Layout 4 étapes :**
- Desktop >= 1280px : 4 colonnes égales en ligne horizontale, gap `spacing-xl` (32px). Connecteur entre étapes : `1px solid rgba(255,255,255,0.12)` avec flèche `→` en `color-accent` (#C8B9A6).
- Tablette 768–1279px : grille 2×2, connecteurs intra-ligne uniquement.
- Mobile < 768px : 1 colonne empilée. Connecteur vertical `1px solid rgba(255,255,255,0.12)` entre étapes.

**Anatomie d'une étape :**

| Élément | Token typo | Couleur |
|---|---|---|
| Numéro (01 / 02 / 03 / 04) | 64px thin 200, `letter-spacing-tight` | `color-text-inverse` opacity 0.15 (décoration) |
| Titre étape (ex: `SOURCER`) | 20px regular, uppercase, tracking 0.04em | `color-text-inverse` |
| Corps | 15px, line-height 1.65 | `color-text-inverse` opacity 0.8 |

**Image** : pas de photo — la section sombre + typographie suffit. Les numéros géants en opacité 0.15 servent d'éléments graphiques (rôle illustratif sans image).

**Responsive :**
- 375px : 1 colonne. Numéros 48px. Corps 14px.
- 768px : 2×2.
- 1280px : 4 colonnes en ligne.

---

## Section Implantation (`#implantation`)

**Fond** : `color-bg-primary` (#F7F5F2)
**Padding vertical** : `spacing-5xl` (120px) desktop / `spacing-4xl` (96px) mobile
**Padding horizontal** : `spacing-2xl` (48px) desktop / `spacing-lg` (24px) mobile

**Layout desktop** : 2 colonnes — col gauche 50% (label + H2 + sous-titre + légende), col droite 50% (carte SVG), gap `spacing-3xl` (64px)
**Layout mobile** : 1 colonne — titre + carte + légende empilés

| Élément | Token typo | Couleur |
|---|---|---|
| Label `IMPLANTATION` | 13px, tracking 0.1em, uppercase | `color-text-muted` |
| H2 `Paris. Lille. / Et les métropoles françaises.` | 36px light 300, uppercase, tracking 0.06em | `color-text-primary` |
| Sous-titre | 18px / 16px mobile | `color-text-primary` |
| Légende point plein | 13px | `color-text-muted` — "Présence active" |
| Légende point outline | 13px | `color-text-muted` — "Zone d'extension" |

**Élément graphique — Carte SVG France :**
- Type : illustration vectorielle SVG inline (pas de photo)
- Sujet : contour simplifié de la France métropolitaine, marqueurs ponctuels 5 villes
- Style : fond transparent, path France en `color-border` (#D9D4CE), marqueurs actifs en `color-accent` (#C8B9A6) — point plein r=6px, marqueurs extension — point outline r=4px
- Source : SVG France simplifié libre de droits — naturalearth.com ou wikimedia commons, simplification manuelle des paths
- Dimensions : max-width 480px, centré dans sa colonne, ratio libre

**Responsive :**
- 375px : 1 colonne. Carte max-width 300px centrée. Légende sous la carte.
- 768px : 1 colonne. Carte max-width 400px.
- 1280px : 2 colonnes 50/50.

---

## Section Équipe (`#equipe`)

**Fond** : `color-bg-primary` (#F7F5F2)
**Padding vertical** : `spacing-5xl` (120px) desktop / `spacing-4xl` (96px) mobile
**Padding horizontal** : `spacing-2xl` (48px) desktop / `spacing-lg` (24px) mobile

**En-tête de section :**

| Élément | Token typo | Couleur |
|---|---|---|
| Label `ÉQUIPE` | 13px, tracking 0.1em, uppercase | `color-text-muted` |
| H2 `Trois associés. / Des parcours vérifiables.` | 36px light 300, uppercase, tracking 0.06em | `color-text-primary` |
| Sous-titre | 18px, max-width 640px | `color-text-primary` |

**Layout cartes :**
- Desktop >= 1280px : 3 colonnes égales, gap `spacing-xl` (32px)
- Tablette 768–1279px : 1 colonne empilée (cartes larges) ou 3 colonnes compactes si espace
- Mobile < 768px : 1 colonne, gap `spacing-lg` (24px)

**Anatomie d'une carte fondateur :**

| Élément | Spec | Token / Couleur |
|---|---|---|
| Photo | Carré 160×160px desktop / 120×120px mobile. `object-fit: cover`. Coins vifs (radius-none). Alignée centre-haut de carte. | — |
| Nom | H3 uppercase, tracking 0.04em | `color-text-primary` |
| Titre | `Co-fondateur` — 13px, uppercase, tracking 0.1em | `color-text-muted` |
| Spécialité | 15px | `color-text-primary` |
| Track record | 14px | `color-text-muted` |
| Icône LinkedIn | SVG 16×16px | `color-text-muted` → `color-text-primary` hover, scale 1.1 |

**Carte** : fond `color-bg-secondary`, border `1px solid color-border`, padding `spacing-xl` (32px), radius `radius-sm` (4px). Hover : border → `color-accent`, transition 200ms.

**Images fondateurs — 3 photos réelles :**

| Fondateur | Source | Format cible | Dimensions |
|---|---|---|---|
| Thomas Issa | `/Photos/thomas.png` | WebP, carré recadré | 400×400px, < 80ko |
| Maxime Lemoine | `/Photos/max.png` | WebP, carré recadré | 400×400px, < 80ko |
| Carl Standertskjold-Nordenstam | `/Photos/Carl-picture.jfif` | Convertir JFIF → WebP, carré recadré | 400×400px, < 80ko |

Fallback si photo inaccessible : initiales sur fond `color-bg-dark` (#1A1A1A), texte `color-text-inverse`, même dimensions.

**Responsive :**
- 375px : 1 colonne. Photo 120×120px. Padding carte 24px.
- 768px : 1 colonne (ou 3 colonnes compactes si espace > 600px).
- 1280px : 3 colonnes égales.

---

## Section Contact (`#contact`)

**Fond** : `color-bg-dark-alt` (#1A1A1A)
**Padding vertical** : `spacing-5xl` (120px) desktop / `spacing-4xl` (96px) mobile
**Padding horizontal** : `spacing-2xl` (48px) desktop / `spacing-lg` (24px) mobile

**Layout desktop** : 2 colonnes — col gauche 45% (label + H2 + sous-titre + email affiché), col droite 55% (formulaire), gap `spacing-3xl` (64px)
**Layout mobile** : 1 colonne — titre + email + formulaire empilés

**Col gauche :**

| Élément | Token typo | Couleur |
|---|---|---|
| Label `CONTACT` | 13px, tracking 0.1em, uppercase | `color-text-inverse` opacity 0.5 |
| H2 `Un projet. Un actif. / Contactez-nous.` | 36px light 300, uppercase, tracking 0.06em | `color-text-inverse` |
| Sous-titre | 18px / 16px mobile | `color-text-inverse` opacity 0.8 |
| Email `contact@versi.fr` | 16px, lien mailto | `color-accent` (#C8B9A6) |

**Col droite — Formulaire Versi :**
- Fond : `rgba(255,255,255,0.04)`, padding `spacing-2xl` (48px), radius `radius-sm` (4px)
- Inputs : fond transparent, border `1px solid rgba(255,255,255,0.2)`, padding 14px, texte `color-text-inverse`
- Input focus : border → `color-accent` (#C8B9A6)
- Bouton `ENVOYER` : fond `color-text-inverse` (#F7F5F2), texte `color-bg-dark` (#0B0B0B), uppercase, padding 16px 40px

**Image** : pas de photo dans cette section — la sobriété du formulaire sur fond sombre est le signal intentionnel. L'espace blanc (négatif) est l'élément graphique.

**Responsive :**
- 375px : 1 colonne. Formulaire padding `spacing-lg` (24px). Bouton pleine largeur.
- 768px : 1 colonne. Formulaire padding `spacing-xl` (32px).
- 1280px : 2 colonnes 45/55.

---

## Footer

**Fond** : `color-bg-dark` (#0B0B0B)
**Padding vertical** : 64px desktop / 48px mobile
**Séparateur haut** : `1px solid rgba(255,255,255,0.08)`

**Layout desktop** : 2 colonnes — gauche (logo + baseline), droite (email + liens légaux + copyright), alignés verticalement centre
**Layout mobile** : 1 colonne centrée, gap `spacing-lg` (24px)

| Élément | Token typo | Couleur |
|---|---|---|
| VERSI (logo) | 13px, tracking 0.1em, uppercase | `color-text-inverse` |
| `Holding immobilière intégrée` | 13px | `color-text-muted` |
| `contact@versi.fr` | 14px, mailto | `color-text-muted` → `color-text-inverse` hover |
| `Mentions légales` / `Politique de confidentialité` | 12px | `color-text-muted` |
| `© 2026 Versi. Tous droits réservés.` | 12px | `color-text-muted` |
| Entités (séparées par ·) | 12px | `color-text-muted` opacity 0.5 |

**Image** : aucune.

**Responsive :**
- 375px : 1 colonne centrée. Gap entre éléments `spacing-md` (16px).
- 768px : 1 colonne centrée.
- 1280px : 2 colonnes alignées.

---

## Récapitulatif — Images par section (Gate G30)

| Section | Type | Source | Priorité |
|---|---|---|---|
| Hero | Photo architecturale plein cadre (façade, béton, zinc) | Unsplash "haussmann facade angle" / photo réelle Versi | Priorité 1 — bloquante visuellement |
| Mission | Aucune (typographie suffit) | — | — |
| Activités | Aucune par défaut (icônes V1 optionnelles) | Icônes SVG minimalistes custom si temps disponible | Optionnel |
| Approche | Aucune (numéros géants en opacité) | — | — |
| Implantation | SVG inline — carte France | SVG libre naturalearth.com / wikimedia | Priorité 2 — fonctionnelle |
| Équipe | 3 photos réelles fondateurs | `/Photos/` — thomas.png, max.png, Carl-picture.jfif | Priorité 1 — crédibilité Laurent |
| Contact | Aucune | — | — |
| Footer | Aucune | — | — |

---

## Validation 7 critères visuels Thomas

1. PRO : typographie PP Neue Montreal uppercase, grille stricte, espace blanc généreux
2. BEAU : alternance sections claires / sections sombres, chiffres stats en thin 200
3. BRAND-ALIGNED : minéral, architectural, précis — 3 mots Versi respectés dans chaque choix de layout
4. MÊME IDENTITÉ : même padding vertical `spacing-5xl` partout, même radius `radius-sm`, même traitement des labels 13px
5. PROPRE : cartes sans décoration superflue, pas d'ombres agressives, pas d'icônes décoratives non justifiées
6. ALIGNÉ : grille 12 colonnes desktop, alignements stricts, marges `spacing-2xl` cohérentes
7. AÉRÉ : padding `spacing-5xl` entre sections garantit la respiration — sur mobile `spacing-4xl`
8. CONVERSION : `#contact` accessible depuis la nav (sticky), depuis le Hero (CTA secondaire), et depuis le scroll naturel — 3 chemins vers l'action principale
9. HIÉRARCHIE : surtitre label (13px muted) → H2 (36px light) → sous-titre (18px) → corps (15-16px) — identique dans chaque section
10. ACCESSIBLE : contrastes WCAG 2.2 AA vérifiés (texte blanc sur #0B0B0B : 21:1 / texte #0B0B0B sur #F7F5F2 : 19.5:1 / texte muted #6B6560 sur #F7F5F2 : 4.54:1). Focus-visible outline 2px `color-accent`. Touch targets nav hamburger 44×44px.

---

**Handoff → @fullstack**

- Fichiers produits : `/home/user/Versi/docs/design/page-compositions.md`
- Référence obligatoire en parallèle : `docs/design/design-system.md` (tokens) + `docs/product/functional-specs.md` (contenu exact, états UI, user stories)
- Décisions de layout prises :
  - Hero : colonne unique centrée (pas 2 colonnes) — cohérence enclave.com, focus sur le texte + image plein fond
  - Mission : 2 colonnes 60/40 desktop, stats en colonne droite (pas en ligne) — permet une lecture séquentielle naturelle
  - Approche : fond sombre (#0B0B0B) pour rupture visuelle entre Mission (clair) et Implantation (clair)
  - Contact : fond `color-bg-dark-alt` (#1A1A1A) — différencié du Hero et du Footer pour ne pas avoir 3 sections noires consécutives
- Points d'attention :
  - Photo Hero : Thomas ou Carl doivent fournir une photo réelle d'actif Versi (priorité sur le stock)
  - Photos fondateurs : convertir Carl-picture.jfif en WebP avant intégration
  - SVG carte France : choisir un path simplifié (< 50 points) pour ne pas alourdir le DOM
  - Carte Versi en mobile : inverser l'ordre (carte SVG au-dessus du texte) pour le contexte visuel
  - Prefers-reduced-motion : toutes les animations fade-in sont désactivées — le site reste lisible et structuré sans elles
  - Breakpoint intermédiaire équipe à 768px : si la largeur disponible permet 3 colonnes compactes, privilégier ce layout pour éviter des cartes trop larges
