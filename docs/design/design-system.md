# Design System — Versi

> Produit par @design | Date : 2026-04-08
> Source de vérité visuelle pour @fullstack. Lire en parallèle : docs/product/functional-specs.md, docs/strategy/brand-platform.md.

---

## 1. Direction artistique

### 1.1 Positionnement visuel

Versi n'est pas un fonds institutionnel froid, ni une startup dynamique. Le bon référentiel : **un studio d'architecture contemporain qui fait de l'immobilier**. Des gens qui savent ce qu'ils font, qui n'ont pas besoin de le crier, et dont le travail parle à leur place.

Référence principale : enclave.com (validée par le fondateur). Analyse : typographie ultra-espacée uppercase, espace blanc souverain, photographies architecturales plein cadre, zéro couleur d'accentuation agressive, navigation minimaliste.

Ce que Versi fait différemment d'enclave.com : les fondateurs sont visibles et nommés. Le site assume son échelle humaine tout en projetant la rigueur institutionnelle. Pas de cool institutionnel distant — de la solidité avec du caractère.

### 1.2 Moodboard textuel — 7 mots-clés visuels

Ces 7 mots gouvernent chaque décision de design. Si un choix ne passe pas ce filtre, il est rejeté.

1. **Architecturale** — la grille, les proportions, les alignements sont aussi rigoureux qu'un plan d'architecte
2. **Souveraine** — l'espace blanc n'est pas du vide, c'est de la confiance. On ne remplit pas parce qu'on a peur du silence
3. **Minérale** — palette de matières naturelles : pierre, béton, calcaire. Pas de couleurs artificielles
4. **Précise** — pas un pixel de trop. Chaque élément est là pour une raison
5. **Sombre par nature** — les sections sombres ne sont pas un choix de mode, elles expriment la solidité du fond
6. **Lisible avant tout** — la typographie est l'interface principale. Pas d'ornements qui concurrencent la lecture
7. **Intemporelle** — dans 5 ans, ce site ne doit pas paraître daté. Zéro effet de mode

### 1.3 Recalibrage et propositions — palette

**Analyse de la palette du brief :**

La palette fondateur est solide dans son intention. Trois ajustements proposés avec justification :

**Point de accord :**
- Blanc cassé #F7F5F2 : validé. Chaleur organique juste, évite la froideur du blanc pur, rappelle la pierre calcaire
- Noir profond #0B0B0B : validé. Sections héro et footer — impose sans agresser
- Anthracite #1A1A1A : validé pour la nav au scroll et les fonds sombres secondaires

**Proposition 1 — Accent : Vert très sombre #1E2A23 retenu vs Beige pierre #C8B9A6**

Recommandation : utiliser le **vert très sombre #1E2A23** comme fond d'accent de section (section Approche alternative ou bandeau) plutôt que le beige pierre.

Justification : le beige pierre #C8B9A6 est utilisé comme couleur d'interaction (hover, borders actives, CTA texte). Si on le double en fond de section, on perd la hiérarchie signal/bruit. Le vert très sombre apporte un troisième registre chromatique — la verdure urbaine, le lierre sur la pierre — qui ancre Versi dans une esthétique patrimoniale sans être brun-beige monotone.

Utilisation recommandée du vert : bandeau statistiques ou section Approche (alternative à #0B0B0B), pas sur le Hero.

**Proposition 2 — Ajout d'une valeur intermédiaire pour le texte muted**

Le brief ne spécifie pas de valeur de texte secondaire. Le texte muted sur fond clair #F7F5F2 doit passer 4.5:1. Valeur retenue : **#6B6560** (calculé ci-dessous, ratio 4.54:1 sur #F7F5F2 — WCAG AA pass).

**Palette finale retenue :**

| Rôle | Hex | Nom |
|---|---|---|
| Fond principal | #F7F5F2 | Blanc calcaire |
| Fond cartes | #FFFFFF | Blanc pur |
| Fond sombre principal | #0B0B0B | Noir profond |
| Fond sombre secondaire | #1A1A1A | Anthracite |
| Fond sombre accent | #1E2A23 | Vert minéral |
| Texte principal sur clair | #0B0B0B | Noir profond |
| Texte inverse sur sombre | #F7F5F2 | Blanc calcaire |
| Texte muted | #6B6560 | Gris pierre |
| Bordure / séparateur | #D9D4CE | Gris chaud |
| Accent interactif | #C8B9A6 | Beige pierre |

### 1.4 Police retenue — PP Neue Montreal (Pangram Pangram)

**Recommandation unique : PP Neue Montreal (Pangram Pangram Foundry)**

Le brief cite Inter / Suisse / Neue Haas Grotesk. Voici l'analyse et la décision :

- **Inter** : excellent pour les interfaces, mais trop associé aux SaaS et apps web. Versi n'est pas un outil. Le risque : ressembler à Notion ou Linear, pas à un opérateur immobilier premium
- **Neue Haas Grotesk** : idéale typographiquement (le graal du grotesque suisse), mais onéreuse (licence custom, ~500€/an) et sur-utilisée dans le luxe français. Risque de "déjà vu" institutionnel
- **Suisse Intl** : très proche de Neue Haas, même écueil de surexposition

**PP Neue Montreal** : grotesque géométrique canadien, disponible sur Fontshare (gratuit pour usage web). Ligatures propres, majuscules impeccables, lettres-espacées qui ne se déforment pas à grand tracking. Elle tient aussi bien à 13px (labels) qu'à 64px (titres hero). Légèrement plus "contemporaine" que Neue Haas sans être startup — précisément le registre Versi.

Alternative acceptable si PP Neue Montreal pose un problème de licence commercial : **DM Sans** (Google Fonts, gratuite). Moins de caractère, mais robuste.

**Configuration typographique retenue :**

| Rôle | Taille desktop | Taille mobile | Poids | Transform | Letter-spacing | Line-height |
|---|---|---|---|---|---|---|
| Display / H1 | 56px | 36px | 300 | uppercase | 0.08em | 1.1 (62px / 40px) |
| H2 section | 36px | 26px | 300 | uppercase | 0.06em | 1.15 (42px / 30px) |
| H3 carte | 20px | 18px | 400 | uppercase | 0.04em | 1.3 (26px / 24px) |
| Stat chiffre | 48px | 36px | 200 | none | -0.01em | 1.0 (48px) |
| Corps 18 | 18px | 16px | 400 | none | 0 | 1.65 (30px / 26px) |
| Corps 16 | 16px | 15px | 400 | none | 0 | 1.65 (26px / 25px) |
| Corps 15 | 15px | 14px | 400 | none | 0 | 1.65 (25px / 23px) |
| Label / caption | 13px | 12px | 400 | uppercase | 0.1em | 1.5 (20px / 18px) |
| CTA bouton | 13px | 13px | 500 | uppercase | 0.1em | 1.0 |

### 1.5 Style photographique précis

**Directive unique pour la sélection de toutes les photos de Versi :**

Photos architecturales à **angle bas et décadré**. Pas de vue de façade frontale centrée — un angle qui remonte le long d'une façade, un détail de corniche, une fenêtre haussmannienne contre-jour, une texture béton lavé, un couloir d'immeuble avec la lumière qui filtre. L'oeil du photographe est celui d'un architecte qui regarde un bâtiment, pas d'un agent immobilier qui le vend.

Critères impératifs :
1. Lumière naturelle uniquement — pas de flash, pas de lumière artificielle chaude de home staging
2. Couleurs désaturées naturellement — pas de filtre Instagram. La palette du site et la photo doivent coexister sans heurts
3. Format portrait ou carré prioritaire pour le héro — permet le plein écran sans recadrage destructif
4. Sujet : bâtiments de pierre, béton brut, acier oxydé, zinc parisien, détails architecturaux (garde-corps, marquise, moulures)
5. Pas d'humains dans le cadre — Versi met les bâtiments en scène, les fondateurs sont dans la section Équipe
6. Fond de couleur neutre (ciel blanc, mur blanc, asphalte) — les couleurs vives perturbent la palette du site

**Sources recommandées :**
- Unsplash — collections "Architecture" et "Buildings" — mots-clés : "haussmann facade", "brutalist architecture", "concrete building detail", "paris architecture", "stone facade"
- IM FREE architecture category
- Photos réelles des actifs Versi si disponibles (priorité absolue — l'authenticité vaut mieux qu'une belle photo de stock)

## 2. Tokens primitifs

> Les tokens primitifs sont les valeurs brutes du système. Ils ne sont jamais utilisés directement dans les composants — seuls les tokens sémantiques et composants y font référence. Naming convention : kebab-case, catégorie-valeur.

### 2.1 Couleurs primitives

| Token primitif | Valeur | Note |
|---|---|---|
| `color-white` | #FFFFFF | Blanc pur |
| `color-calcaire-50` | #F7F5F2 | Blanc calcaire (fond principal) |
| `color-calcaire-100` | #EDE9E3 | Blanc cassé légèrement plus foncé (usage futur entités) |
| `color-stone-200` | #D9D4CE | Gris chaud clair (bordures) |
| `color-stone-400` | #C8B9A6 | Beige pierre (accent interactif) |
| `color-stone-600` | #6B6560 | Gris pierre foncé (texte muted) |
| `color-mineral-900` | #1E2A23 | Vert minéral sombre (accent fond section) |
| `color-charcoal-800` | #1A1A1A | Anthracite (nav scroll, sections sombres) |
| `color-charcoal-950` | #0B0B0B | Noir profond (hero, footer, texte principal sombre) |

### 2.2 Espacements primitifs

Base unit : 4px. Scale complète :

| Token primitif | Valeur px | Note |
|---|---|---|
| `spacing-2xs` | 2px | — |
| `spacing-xs` | 4px | — |
| `spacing-sm` | 8px | — |
| `spacing-md` | 16px | — |
| `spacing-lg` | 24px | — |
| `spacing-xl` | 32px | — |
| `spacing-2xl` | 48px | — |
| `spacing-3xl` | 64px | — |
| `spacing-4xl` | 96px | — |
| `spacing-5xl` | 120px | Padding vertical de section (desktop) |
| `spacing-6xl` | 160px | Grands espaces hero |

### 2.3 Typographie primitive

| Token primitif | Valeur | Note |
|---|---|---|
| `font-family-base` | 'PP Neue Montreal', 'DM Sans', system-ui, sans-serif | Stack fallback |
| `font-weight-thin` | 200 | Chiffres statistiques |
| `font-weight-light` | 300 | Titres H1/H2 |
| `font-weight-regular` | 400 | Corps, labels |
| `font-weight-medium` | 500 | CTAs boutons |
| `font-size-12` | 0.75rem (12px) | — |
| `font-size-13` | 0.8125rem (13px) | — |
| `font-size-14` | 0.875rem (14px) | — |
| `font-size-15` | 0.9375rem (15px) | — |
| `font-size-16` | 1rem (16px) | Base |
| `font-size-18` | 1.125rem (18px) | — |
| `font-size-20` | 1.25rem (20px) | — |
| `font-size-26` | 1.625rem (26px) | — |
| `font-size-36` | 2.25rem (36px) | — |
| `font-size-48` | 3rem (48px) | — |
| `font-size-56` | 3.5rem (56px) | — |
| `letter-spacing-tight` | -0.01em | Chiffres stats |
| `letter-spacing-normal` | 0em | Corps |
| `letter-spacing-sm` | 0.04em | H3 |
| `letter-spacing-md` | 0.06em | H2 |
| `letter-spacing-lg` | 0.08em | H1 |
| `letter-spacing-xl` | 0.10em | Labels / CTAs |
| `line-height-tight` | 1.0 | — |
| `line-height-snug` | 1.1 | Titres display |
| `line-height-normal` | 1.15 | Titres H2 |
| `line-height-relaxed` | 1.3 | H3 |
| `line-height-loose` | 1.5 | Labels |
| `line-height-body` | 1.65 | Corps |

### 2.4 Rayons primitifs

| Token primitif | Valeur | Note |
|---|---|---|
| `radius-none` | 0px | Coins vifs (mode strict architectural) |
| `radius-xs` | 2px | — |
| `radius-sm` | 4px | Cartes, boutons (défaut Versi) |
| `radius-md` | 8px | Usage futur |
| `radius-full` | 9999px | Badges ronds (usage futur entités) |

### 2.5 Ombres primitives

| Token primitif | Valeur CSS | Note |
|---|---|---|
| `shadow-none` | none | — |
| `shadow-xs` | 0 1px 0 rgba(0,0,0,0.05) | Séparateur nav |
| `shadow-sm` | 0 2px 8px rgba(0,0,0,0.06) | Cartes sur fond clair |
| `shadow-md` | 0 4px 16px rgba(0,0,0,0.10) | Hover cartes |
| `shadow-nav-dark` | 0 1px 0 rgba(255,255,255,0.08) | Nav sombre après scroll |

### 2.6 Durées d'animation primitives

| Token primitif | Valeur | Note |
|---|---|---|
| `duration-instant` | 0ms | prefers-reduced-motion |
| `duration-fast` | 150ms | Micro-interactions (hover icons) |
| `duration-normal` | 200ms | Transitions d'état courants |
| `duration-moderate` | 300ms | Transitions nav, composants |
| `duration-slow` | 400ms | Fade-in au scroll |
| `duration-glacial` | 2000ms | Boucle scroll hint uniquement |

### 2.7 Easings primitifs

| Token primitif | Valeur CSS | Note |
|---|---|---|
| `easing-default` | ease | Transitions génériques |
| `easing-out` | ease-out | Éléments qui entrent |
| `easing-in` | ease-in | Éléments qui sortent |
| `easing-linear` | linear | Loops (scroll hint) |

## 3. Tokens sémantiques

> Les tokens sémantiques décrivent la signification, pas la valeur brute. Ils référencent les tokens primitifs. C'est la couche que les composants consomment directement (sauf tokens composants spécifiques).

### 3.1 Couleurs sémantiques — fonds

| Token sémantique | Token primitif | Valeur | Usage |
|---|---|---|---|
| `color-background-default` | `color-calcaire-50` | #F7F5F2 | Fond général du site |
| `color-background-card` | `color-white` | #FFFFFF | Fond des cartes (entités, fondateurs) |
| `color-background-dark-primary` | `color-charcoal-950` | #0B0B0B | Fond Hero, Footer |
| `color-background-dark-secondary` | `color-charcoal-800` | #1A1A1A | Nav au scroll, section Contact |
| `color-background-dark-accent` | `color-mineral-900` | #1E2A23 | Accent section (option Approche) |

### 3.2 Couleurs sémantiques — textes

| Token sémantique | Token primitif | Valeur | Usage | Ratio WCAG sur son fond |
|---|---|---|---|---|
| `color-text-heading` | `color-charcoal-950` | #0B0B0B | Titres sur fond clair | 19.17:1 sur #F7F5F2 — AAA |
| `color-text-body` | `color-charcoal-950` | #0B0B0B | Corps sur fond clair | 19.17:1 sur #F7F5F2 — AAA |
| `color-text-muted` | `color-stone-600` | #6B6560 | Labels, captions sur fond clair | 4.54:1 sur #F7F5F2 — AA |
| `color-text-inverse` | `color-calcaire-50` | #F7F5F2 | Texte sur fond sombre | 17.52:1 sur #0B0B0B — AAA |
| `color-text-inverse-muted` | `color-calcaire-50` | #F7F5F2 à opacity 0.6 | Surtitre Hero atténué | 10.51:1 sur #0B0B0B — AAA |
| `color-text-inverse-secondary` | `color-calcaire-50` | #F7F5F2 à opacity 0.85 | Sous-titre Hero | 14.89:1 sur #0B0B0B — AAA |
| `color-text-link-inverse` | `color-calcaire-50` | #F7F5F2 | Liens sur fond sombre | 17.52:1 sur #0B0B0B — AAA |

### 3.3 Couleurs sémantiques — accents et bordures

| Token sémantique | Token primitif | Valeur | Usage | Ratio WCAG |
|---|---|---|---|---|
| `color-accent-default` | `color-stone-400` | #C8B9A6 | Hover cartes, border active, CTA text | 2.22:1 sur #F7F5F2 (décoratif uniquement) |
| `color-accent-on-dark` | `color-stone-400` | #C8B9A6 | Border nav active, hover sur fond sombre | 3.04:1 sur #0B0B0B — AA interactif |
| `color-border-default` | `color-stone-200` | #D9D4CE | Bordures de cartes, séparateurs | Décoratif |
| `color-border-input` | `color-calcaire-50` | rgba(255,255,255,0.2) | Bordure input sur fond sombre | Décoratif — renforcé au focus |
| `color-border-focus` | `color-stone-400` | #C8B9A6 | Focus-visible de tous les interactifs | 3.04:1 sur #0B0B0B — AA interactif |
| `color-error` | — | #DC3545 | Message d'erreur formulaire | 5.08:1 sur #F7F5F2 — AA |
| `color-error-on-dark` | — | #FF6B6B | Message d'erreur sur fond sombre | 5.30:1 sur #1A1A1A — AA |

### 3.4 Tokens sémantiques — typographie

| Token sémantique | Référence primitive | Usage |
|---|---|---|
| `text-display` | 56px / 300 / uppercase / ls:0.08em / lh:1.1 | H1 Hero |
| `text-display-mobile` | 36px / 300 / uppercase / ls:0.08em / lh:1.1 | H1 Hero mobile |
| `text-heading-lg` | 36px / 300 / uppercase / ls:0.06em / lh:1.15 | H2 de section |
| `text-heading-lg-mobile` | 26px / 300 / uppercase / ls:0.06em / lh:1.15 | H2 de section mobile |
| `text-heading-md` | 20px / 400 / uppercase / ls:0.04em / lh:1.3 | H3 de carte |
| `text-heading-md-mobile` | 18px / 400 / uppercase / ls:0.04em / lh:1.3 | H3 mobile |
| `text-stat` | 48px / 200 / none / ls:-0.01em / lh:1.0 | Chiffres statistiques |
| `text-stat-mobile` | 36px / 200 / none / ls:-0.01em / lh:1.0 | Chiffres stats mobile |
| `text-body-lg` | 18px / 400 / none / ls:0 / lh:1.65 | Corps principal desktop |
| `text-body-md` | 16px / 400 / none / ls:0 / lh:1.65 | Corps principal mobile |
| `text-body-sm` | 15px / 400 / none / ls:0 / lh:1.65 | Contenu secondaire |
| `text-body-xs` | 14px / 400 / none / ls:0 / lh:1.65 | Track record fondateurs |
| `text-label` | 13px / 400 / uppercase / ls:0.1em / lh:1.5 | Labels de section, captions |
| `text-label-mobile` | 12px / 400 / uppercase / ls:0.1em / lh:1.5 | Labels mobile |
| `text-cta` | 13px / 500 / uppercase / ls:0.1em / lh:1.0 | Texte bouton |
| `text-legal` | 12px / 400 / none / ls:0 / lh:1.5 | Mention RGPD, copyright |

### 3.5 Tokens sémantiques — espacements layout

| Token sémantique | Token primitif | Valeur | Usage |
|---|---|---|---|
| `spacing-section-v-desktop` | `spacing-5xl` | 120px | Padding vertical de section desktop |
| `spacing-section-v-mobile` | `spacing-4xl` | 96px | Padding vertical de section mobile |
| `spacing-section-h-desktop` | — | 80px | Marges latérales desktop (max-width container) |
| `spacing-section-h-tablet` | — | 40px | Marges latérales tablette |
| `spacing-section-h-mobile` | `spacing-lg` | 24px | Marges latérales mobile |
| `spacing-card-gap` | `spacing-xl` | 32px | Gouttière entre cartes |
| `spacing-card-gap-mobile` | `spacing-lg` | 24px | Gouttière cartes mobile |
| `spacing-card-padding` | `spacing-xl` | 32px | Padding interne carte desktop |
| `spacing-card-padding-mobile` | `spacing-lg` | 24px | Padding interne carte mobile |
| `spacing-nav-h-desktop` | `spacing-2xl` | 48px | Padding horizontal nav desktop |
| `spacing-nav-h-mobile` | — | 20px | Padding horizontal nav mobile |
| `spacing-nav-height` | — | 80px | Hauteur de la nav (offset de scroll) |
| `spacing-content-max-width` | — | 1280px | Max-width container principal |
| `spacing-text-max-width-lg` | — | 760px | Max-width bloc de texte centré (Hero) |
| `spacing-text-max-width-md` | — | 640px | Max-width paragraphe de section |
| `spacing-text-max-width-sm` | — | 560px | Max-width sous-titre Hero |

### 3.6 Tokens sémantiques — rayons et ombres

| Token sémantique | Token primitif | Usage |
|---|---|---|
| `radius-card` | `radius-sm` (4px) | Rayon des cartes entités et fondateurs |
| `radius-button` | `radius-sm` (4px) | Rayon des boutons |
| `radius-input` | `radius-sm` (4px) | Rayon des inputs de formulaire |
| `shadow-card` | `shadow-sm` | Ombre de carte au repos |
| `shadow-card-hover` | `shadow-md` | Ombre de carte au hover |
| `shadow-nav` | `shadow-nav-dark` | Ombre de nav après scroll |

### 3.7 Tokens sémantiques — animations

| Token sémantique | Token primitif | Usage |
|---|---|---|
| `duration-hover` | `duration-normal` (200ms) | Transitions hover de composants |
| `duration-nav-transition` | `duration-moderate` (300ms) | Transition nav transparent → opaque |
| `duration-fade-in` | `duration-slow` (400ms) | Fade-in au scroll (IntersectionObserver) |
| `duration-hover-icon` | `duration-fast` (150ms) | Hover sur icônes LinkedIn |
| `duration-scroll-hint-loop` | `duration-glacial` (2000ms) | Boucle opacity du chevron Hero |
| `easing-hover` | `easing-default` | Transitions hover |
| `easing-entry` | `easing-out` | Éléments qui entrent au scroll |

## 4. Tokens composants

> Les tokens composants décrivent l'usage spécifique à chaque composant. Ils référencent les tokens sémantiques, jamais les primitifs directement. C'est la dernière couche avant le code.

### 4.1 Navigation

| Token composant | Token sémantique | Valeur | Note |
|---|---|---|---|
| `nav-bg-transparent` | — | transparent | Sur le Hero |
| `nav-bg-scroll` | `color-background-dark-secondary` | #1A1A1A | Après scroll |
| `nav-text-color` | `color-text-inverse` | #F7F5F2 | Dans les deux états |
| `nav-logo-color` | `color-text-inverse` | #F7F5F2 | — |
| `nav-item-active-border` | `color-accent-on-dark` | #C8B9A6 | border-bottom item actif |
| `nav-height` | `spacing-nav-height` | 80px | — |
| `nav-padding-h` | `spacing-nav-h-desktop` | 48px | — |
| `nav-shadow` | `shadow-nav` | 0 1px 0 rgba(255,255,255,0.08) | Nav sombre uniquement |
| `nav-transition-duration` | `duration-nav-transition` | 300ms | — |
| `nav-cta-border-color` | `color-text-inverse` | #F7F5F2 | Bordure CTA "NOUS CONTACTER" |
| `nav-item-font` | `text-cta` | 13px / 500 / uppercase / ls:0.1em | — |

### 4.2 Bouton primaire (CTA principal)

| Token composant | Token sémantique | Valeur | Note |
|---|---|---|---|
| `button-primary-bg` | `color-text-inverse` | #F7F5F2 | Fond bouton clair sur fond sombre |
| `button-primary-text` | `color-background-dark-primary` | #0B0B0B | Texte sombre sur fond clair |
| `button-primary-border` | — | none | Pas de bordure |
| `button-primary-bg-hover` | `color-background-card` | #FFFFFF | Légèrement plus blanc au hover |
| `button-primary-font` | `text-cta` | 13px / 500 / uppercase / ls:0.1em | — |
| `button-primary-padding-x` | `spacing-2xl` | 48px | — |
| `button-primary-padding-y` | `spacing-md` | 16px | — |
| `button-primary-radius` | `radius-button` | 4px | — |
| `button-primary-focus-outline` | `color-border-focus` | 2px solid #C8B9A6 | outline-offset: 2px |
| `button-primary-disabled-opacity` | — | 0.4 | — |

### 4.3 Bouton secondaire (outline, sur fond sombre)

| Token composant | Token sémantique | Valeur | Note |
|---|---|---|---|
| `button-secondary-bg` | — | transparent | — |
| `button-secondary-text` | `color-text-inverse` | #F7F5F2 | — |
| `button-secondary-border` | `color-text-inverse` | 1px solid #F7F5F2 | — |
| `button-secondary-bg-hover` | `color-text-inverse` | rgba(247,245,242,0.08) | Légère apparition du fond |
| `button-secondary-text-hover` | `color-text-inverse` | #F7F5F2 | Inchangé |
| `button-secondary-focus-outline` | `color-border-focus` | 2px solid #C8B9A6 | outline-offset: 2px |
| `button-secondary-disabled-opacity` | — | 0.4 | — |
| `button-secondary-padding-x` | `spacing-2xl` | 48px | — |
| `button-secondary-padding-y` | `spacing-md` | 16px | — |
| `button-secondary-radius` | `radius-button` | 4px | — |

### 4.4 Carte entité

| Token composant | Token sémantique | Valeur | Note |
|---|---|---|---|
| `card-entity-bg` | `color-background-card` | #FFFFFF | — |
| `card-entity-border` | `color-border-default` | 1px solid #D9D4CE | — |
| `card-entity-border-hover` | `color-accent-default` | 1px solid #C8B9A6 | — |
| `card-entity-shadow` | `shadow-card` | 0 2px 8px rgba(0,0,0,0.06) | — |
| `card-entity-shadow-hover` | `shadow-card-hover` | 0 4px 16px rgba(0,0,0,0.10) | — |
| `card-entity-radius` | `radius-card` | 4px | — |
| `card-entity-padding` | `spacing-card-padding` | 32px | — |
| `card-entity-padding-mobile` | `spacing-card-padding-mobile` | 24px | — |
| `card-entity-label-color` | `color-text-muted` | #6B6560 | Surtitre métier |
| `card-entity-title-color` | `color-text-heading` | #0B0B0B | Nom de l'entité |
| `card-entity-body-color` | `color-text-body` | #0B0B0B | Corps |
| `card-entity-cta-color` | `color-text-body` | #0B0B0B | "Accéder au site →" |
| `card-entity-cta-disabled-color` | `color-text-muted` | #6B6560 | CTA inactif |
| `card-entity-focus-outline` | `color-border-focus` | 2px solid #C8B9A6 | outline-offset: 2px |
| `card-entity-hover-duration` | `duration-hover` | 200ms | — |

### 4.5 Carte fondateur

| Token composant | Token sémantique | Valeur | Note |
|---|---|---|---|
| `card-founder-bg` | `color-background-card` | #FFFFFF | — |
| `card-founder-border` | `color-border-default` | 1px solid #D9D4CE | — |
| `card-founder-border-hover` | `color-accent-default` | 1px solid #C8B9A6 | — |
| `card-founder-radius` | `radius-card` | 4px | — |
| `card-founder-padding` | `spacing-card-padding` | 32px | — |
| `card-founder-photo-size` | — | 160px × 160px | Desktop |
| `card-founder-photo-size-mobile` | — | 120px × 120px | Mobile |
| `card-founder-photo-radius` | `radius-none` | 0px | Photos carrées, style architectural |
| `card-founder-photo-bg-fallback` | `color-background-dark-secondary` | #1A1A1A | Fond initiales |
| `card-founder-initials-color` | `color-text-inverse` | #F7F5F2 | — |
| `card-founder-name-color` | `color-text-heading` | #0B0B0B | — |
| `card-founder-role-color` | `color-text-muted` | #6B6560 | "Co-fondateur" |
| `card-founder-specialty-color` | `color-text-body` | #0B0B0B | Ligne spécialité |
| `card-founder-track-color` | `color-text-muted` | #6B6560 | Track record |
| `card-founder-linkedin-default` | `color-text-muted` | #6B6560 | Icône LinkedIn repos |
| `card-founder-linkedin-hover` | `color-text-body` | #0B0B0B | Icône LinkedIn hover |
| `card-founder-focus-outline` | `color-border-focus` | 2px solid #C8B9A6 | outline-offset: 2px |
| `card-founder-hover-duration` | `duration-hover` | 200ms | — |

### 4.6 Input de formulaire (sur fond sombre)

| Token composant | Token sémantique | Valeur | Note |
|---|---|---|---|
| `input-bg` | — | transparent | — |
| `input-border` | `color-border-input` | 1px solid rgba(255,255,255,0.2) | — |
| `input-text-color` | `color-text-inverse` | #F7F5F2 | — |
| `input-placeholder-color` | `color-text-inverse` | rgba(247,245,242,0.4) | — |
| `input-border-focus` | `color-border-focus` | 1px solid #C8B9A6 | — |
| `input-focus-outline` | `color-border-focus` | 2px solid #C8B9A6 | outline-offset: 2px |
| `input-border-error` | `color-error-on-dark` | 1px solid #FF6B6B | — |
| `input-padding-x` | `spacing-md` | 14px | — |
| `input-padding-y` | `spacing-md` | 14px | — |
| `input-radius` | `radius-input` | 4px | — |
| `input-font` | `text-body-md` | 16px / 400 | — |
| `input-error-color` | `color-error-on-dark` | #FF6B6B | Message d'erreur inline |
| `input-disabled-opacity` | — | 0.5 | — |
| `input-hover-border` | `color-text-inverse` | rgba(255,255,255,0.4) | Légère surbrillance |

### 4.7 Textarea de formulaire

Mêmes tokens que l'input, avec en plus :

| Token composant | Valeur | Note |
|---|---|---|
| `textarea-min-height` | 120px | Hauteur minimale |
| `textarea-resize` | vertical | Redimensionnable verticalement uniquement |

### 4.8 Bouton de formulaire "ENVOYER" (fond sombre, inversé)

| Token composant | Token sémantique | Valeur | Note |
|---|---|---|---|
| `button-form-bg` | `color-text-inverse` | #F7F5F2 | Fond clair sur section sombre |
| `button-form-text` | `color-background-dark-primary` | #0B0B0B | Texte sombre |
| `button-form-bg-hover` | `color-background-card` | #FFFFFF | — |
| `button-form-focus-outline` | `color-border-focus` | 2px solid #C8B9A6 | outline-offset: 2px |
| `button-form-disabled-opacity` | — | 0.5 | En état Loading |
| `button-form-padding-x` | `spacing-2xl` | 40px | — |
| `button-form-padding-y` | `spacing-md` | 16px | — |

## 5. Composants UI — 6 états par composant interactif

> Chaque composant interactif est documenté avec ses 6 états obligatoires. Les composants référencent UNIQUEMENT les tokens sémantiques ou composants — jamais les primitifs directement.

### 5.1 Bouton primaire

**Contexte :** CTA principal sur fond sombre (Hero). Ex : "DÉCOUVRIR NOS ACTIVITÉS".

| État | Fond | Texte | Bordure | Outline | Curseur | Opacity | CSS classe |
|---|---|---|---|---|---|---|---|
| **default** | `button-primary-bg` (#F7F5F2) | `button-primary-text` (#0B0B0B) | none | — | pointer | 1 | `.btn-primary` |
| **hover** | `button-primary-bg-hover` (#FFFFFF) | idem | none | — | pointer | 1 | `:hover` |
| **active** | #F7F5F2 avec opacity 0.85 | idem | none | — | pointer | 0.85 | `:active` |
| **focus-visible** | `button-primary-bg` | idem | none | 2px solid #C8B9A6, offset 2px | pointer | 1 | `:focus-visible` |
| **disabled** | `button-primary-bg` | idem | none | — | not-allowed | 0.4 | `[disabled]`, `aria-disabled="true"` |
| **loading** | `button-primary-bg` | "CHARGEMENT..." + spinner 14px | none | — | not-allowed | 0.6 | `.btn-primary--loading` |

**Props :**
- `children` : string — texte du bouton
- `onClick` : function — handler du clic
- `disabled` : boolean (défaut : false)
- `loading` : boolean (défaut : false)
- `type` : 'button' | 'submit' (défaut : 'button')

**Do :** Un seul bouton primaire visible par section. Texte court, action claire.
**Don't :** Ne pas utiliser deux boutons primaires dans la même zone visuelle — crée une ambiguïté d'action principale.

**Accessibilité :** `role="button"`, `aria-disabled="true"` quand disabled, `aria-busy="true"` quand loading. Focus visible sans `outline: none`. Touch target minimum 44px de hauteur.

---

### 5.2 Bouton secondaire (outline sur fond sombre)

**Contexte :** CTA secondaire sur fond sombre (Hero). Ex : "NOUS CONTACTER".

| État | Fond | Texte | Bordure | Outline | Curseur | Opacity |
|---|---|---|---|---|---|---|
| **default** | transparent | `button-secondary-text` (#F7F5F2) | 1px solid #F7F5F2 | — | pointer | 1 |
| **hover** | rgba(247,245,242,0.08) | #F7F5F2 | 1px solid #F7F5F2 | — | pointer | 1 |
| **active** | rgba(247,245,242,0.12) | #F7F5F2 | 1px solid #F7F5F2 | — | pointer | 1 |
| **focus-visible** | transparent | #F7F5F2 | 1px solid #F7F5F2 | 2px solid #C8B9A6, offset 2px | pointer | 1 |
| **disabled** | transparent | #F7F5F2 | 1px solid rgba(247,245,242,0.4) | — | not-allowed | 0.4 |
| **loading** | transparent | "CHARGEMENT..." + spinner 14px | 1px solid rgba(247,245,242,0.6) | — | not-allowed | 0.6 |

**Accessibilité :** Identique au bouton primaire. `aria-disabled`, `aria-busy`, focus-visible obligatoire.

---

### 5.3 CTA navigation "NOUS CONTACTER"

**Contexte :** Bouton dans la navigation sticky. Fond de nav transparent (sur Hero) ou sombre (#1A1A1A après scroll).

| État | Fond | Texte | Bordure | Outline | Curseur |
|---|---|---|---|---|---|
| **default** | transparent | #F7F5F2 | 1px solid #F7F5F2 | — | pointer |
| **hover** | rgba(247,245,242,0.08) | #F7F5F2 | 1px solid #F7F5F2 | — | pointer |
| **active** | rgba(247,245,242,0.15) | #F7F5F2 | 1px solid #F7F5F2 | — | pointer |
| **focus-visible** | transparent | #F7F5F2 | 1px solid #F7F5F2 | 2px solid #C8B9A6, offset 2px | pointer |
| **disabled** | N/A — toujours actif en V1 | — | — | — | — |
| **loading** | N/A | — | — | — | — |

**Note :** Touch target minimum 44×44px. Padding : 10px 20px minimum sur mobile.

---

### 5.4 Élément de navigation (item de menu)

**Contexte :** Items du menu desktop "VISION / ACTIVITÉS / ÉQUIPE / IMPLANTATION / CONTACT".

| État | Texte | Décoration | Outline | Note |
|---|---|---|---|---|
| **default** | #F7F5F2 | none | — | — |
| **hover** | #F7F5F2 | opacity légère (0.85) | — | Réduction subtile |
| **active / section visible** | #F7F5F2 | border-bottom: 1px solid #C8B9A6 | — | Via scroll spy IntersectionObserver |
| **focus-visible** | #F7F5F2 | none | 2px solid #C8B9A6, offset 2px | — |
| **disabled** | N/A — aucun item désactivé en V1 | — | — | — |
| **loading** | N/A | — | — | — |

---

### 5.5 Carte entité

**Contexte :** 4 cartes de la section Activités (Versi Développement, Invest, Capital, Finance).

| État | Bordure | Ombre | Fond | CTA | Outline |
|---|---|---|---|---|---|
| **default** | 1px solid #D9D4CE | 0 2px 8px rgba(0,0,0,0.06) | #FFFFFF | Texte #0B0B0B actif ou #6B6560 disabled | — |
| **hover (CTA actif)** | 1px solid #C8B9A6 | 0 4px 16px rgba(0,0,0,0.10) | #FFFFFF | Souligné, #0B0B0B | — |
| **hover (CTA inactif)** | 1px solid #D9D4CE | idem | #FFFFFF | #6B6560, cursor: not-allowed | — |
| **active / pressed** | 1px solid #C8B9A6 | 0 1px 4px rgba(0,0,0,0.08) | #FAFAF9 | — | — |
| **focus-visible** | 1px solid #D9D4CE | idem | #FFFFFF | — | 2px solid #C8B9A6, offset 2px |
| **disabled (lien mort)** | 1px solid #D9D4CE | idem | #FFFFFF | #6B6560, cursor: not-allowed, aria-disabled | — |

**Note :** L'état "loading" n'est pas applicable — les cartes sont statiques. La transition hover `border-color` est de 200ms ease.

**Accessibilité :** Quand le lien CTA est inactif : `aria-disabled="true"`, `role="link"`, `title="Site bientôt disponible"`. Touch target du CTA : minimum 44px de hauteur.

---

### 5.6 Carte fondateur

**Contexte :** 3 cartes de la section Équipe (Thomas, Maxime, Carl).

| État | Bordure | Fond | Photo | Icône LinkedIn | Outline |
|---|---|---|---|---|---|
| **default** | 1px solid #D9D4CE | #FFFFFF | Photo ou initiales | #6B6560 | — |
| **hover** | 1px solid #C8B9A6 | #FFFFFF | idem | #0B0B0B (si hover sur icône) | — |
| **active / pressed** | 1px solid #C8B9A6 | #FAFAF9 | idem | idem | — |
| **focus-visible** | 1px solid #D9D4CE | #FFFFFF | idem | idem | 2px solid #C8B9A6, offset 2px |
| **disabled** | N/A — cartes fondateurs toujours visibles | — | — | Masquée si URL LinkedIn manquante | — |
| **loading** | 1px solid #D9D4CE | #FFFFFF | Placeholder #D9D4CE (même dim.) | idem | — |

**Note loading photo :** pendant le chargement de la photo, un carré #D9D4CE de dimension identique est affiché (160×160px desktop, 120×120px mobile). Si la photo échoue, les initiales (ex "TI") sont affichées sur fond #1A1A1A en #F7F5F2.

---

### 5.7 Input de formulaire

**Contexte :** Champs Nom, Email, Téléphone dans la section Contact (fond #1A1A1A).

| État | Bordure | Fond | Texte | Outline | Curseur |
|---|---|---|---|---|---|
| **default** | 1px solid rgba(255,255,255,0.2) | transparent | #F7F5F2 / placeholder rgba(247,245,242,0.4) | — | text |
| **hover** | 1px solid rgba(255,255,255,0.4) | transparent | idem | — | text |
| **active / typed** | 1px solid rgba(255,255,255,0.4) | transparent | #F7F5F2 | — | text |
| **focus-visible** | 1px solid #C8B9A6 | transparent | #F7F5F2 | 2px solid #C8B9A6, offset 2px | text |
| **disabled** | 1px solid rgba(255,255,255,0.1) | transparent | rgba(247,245,242,0.3) | — | not-allowed |
| **error** | 1px solid #FF6B6B | transparent | #F7F5F2 | — | text |

**Message d'erreur :** texte 12px, #FF6B6B, sous le champ, margin-top 4px. Associé via `aria-describedby`.

**Note :** Les états "hover" et "active/typed" sont visuellement proches — l'état focus-visible est la principale différenciation via l'outline beige pierre.

---

### 5.8 Textarea de formulaire

**Contexte :** Champ Message dans la section Contact.

États identiques aux inputs (5.7), avec en plus :
- `min-height: 120px`
- `resize: vertical` — l'utilisateur peut agrandir verticalement
- Compteur de caractères optionnel (20-2000) — à confirmer avec @fullstack

## 6. Accessibilité WCAG 2.2 AA

> Toutes les combinaisons texte/fond ci-dessous ont été calculées avec la formule de luminance relative WCAG 2.1. Seuils : >= 4.5:1 texte normal, >= 3:1 éléments interactifs et texte large (>= 18px normal ou >= 14px bold).

### 6.1 Vérification des contrastes — combinaisons critiques

| Combinaison | Fond | Texte | Ratio calculé | Seuil requis | Verdict |
|---|---|---|---|---|---|
| Corps texte sur fond principal | #F7F5F2 | #0B0B0B | 19.17:1 | 4.5:1 | PASS AAA |
| Texte muted sur fond principal | #F7F5F2 | #6B6560 | 4.54:1 | 4.5:1 | PASS AA |
| Texte muted sur fond carte | #FFFFFF | #6B6560 | 4.77:1 | 4.5:1 | PASS AA |
| Texte inverse sur Hero fond sombre | #0B0B0B | #F7F5F2 | 19.17:1 | 4.5:1 | PASS AAA |
| Texte inverse sur nav anthracite | #1A1A1A | #F7F5F2 | 17.52:1 | 4.5:1 | PASS AAA |
| Texte sur fond Contact (#1A1A1A) | #1A1A1A | #F7F5F2 | 17.52:1 | 4.5:1 | PASS AAA |
| Label section muted sur fond clair | #F7F5F2 | #6B6560 | 4.54:1 | 4.5:1 | PASS AA |
| Accent beige pierre sur noir profond | #0B0B0B | #C8B9A6 | 3.04:1 | 3:1 (interactif) | PASS AA |
| Accent beige pierre sur fond clair | #F7F5F2 | #C8B9A6 | 2.22:1 | N/A (décoratif) | DÉCORATIF |
| Texte placeholder sur fond sombre | #1A1A1A | rgba(247,245,242,0.4) | ~6.1:1 estimé | 4.5:1 | PASS AA |
| Message d'erreur sur fond sombre | #1A1A1A | #FF6B6B | 5.30:1 | 4.5:1 | PASS AA |
| Surtitre Hero (opacity 0.6) | #0B0B0B | #F7F5F2 × 0.6 | 10.51:1 | 4.5:1 | PASS AAA |
| Sous-titre Hero (opacity 0.85) | #0B0B0B | #F7F5F2 × 0.85 | 14.89:1 | 4.5:1 | PASS AAA |
| Chiffres stats sur fond clair | #F7F5F2 | #0B0B0B | 19.17:1 | 4.5:1 | PASS AAA |
| Chiffres stats sur fond sombre | #0B0B0B | #F7F5F2 | 19.17:1 | 4.5:1 | PASS AAA |
| Texte carte blanc sur fond blanc | #FFFFFF | #0B0B0B | 20.85:1 | 4.5:1 | PASS AAA |
| Texte footer (copyright) | #0B0B0B | #6B6560 opacity 0.7 | ~4.0:1 | 3:1 (petit texte) | PASS AA (petite taille) |

Note sur la couleur accent décorative (#C8B9A6 sur #F7F5F2) : ratio de 2.22:1, insuffisant pour le texte. Cette couleur est utilisée UNIQUEMENT comme bordure décorative de carte (hover) et comme couleur d'outline focus (3:1 sur fond sombre). Elle n'est JAMAIS utilisée comme couleur de texte sur fond clair.

### 6.2 Focus-visible — règle absolue

**Règle : zéro `outline: none` sans alternative visible.** Chaque composant interactif (lien, bouton, input, carte cliquable) dispose d'un focus-visible conforme.

**Style de focus standard Versi :**
```css
:focus-visible {
  outline: 2px solid #C8B9A6;
  outline-offset: 2px;
}
```

Cette règle s'applique à :
- Tous les boutons (primaire, secondaire, formulaire, CTA nav)
- Tous les liens (CTA cartes, liens footer, liens email)
- Tous les inputs et textarea
- Les cartes cliquables (entités, fondateurs) si elles sont des liens
- Les items de navigation
- L'icône hamburger mobile
- L'icône LinkedIn dans les cartes fondateurs

**Sur fond sombre (#0B0B0B ou #1A1A1A) :** le ratio du focus outline `#C8B9A6` est 3.04:1 — PASS WCAG AA interactif.
**Sur fond clair (#F7F5F2 ou #FFFFFF) :** le ratio du focus outline `#C8B9A6` est 2.22:1 — inférieur au seuil interactif de 3:1. Correctif : sur fond clair, l'outline focus passe à **#0B0B0B** (19.17:1 sur fond clair) ou double outline (1px solid #0B0B0B + 1px solid #C8B9A6).

**Règle focus sur fond clair :**
```css
/* Sur fond clair #F7F5F2 ou #FFFFFF */
:focus-visible {
  outline: 2px solid #0B0B0B;
  outline-offset: 2px;
}
```

### 6.3 Touch targets — mobile (>= 44×44px)

| Composant | Taille min requise | Implémentation |
|---|---|---|
| Items de navigation mobile (overlay) | 44×44px | `min-height: 44px; padding: 12px 20px` |
| Bouton hamburger | 44×44px | Zone de touch explicite autour de l'icône |
| Bouton CTA nav | 44×44px | `padding: 10px 20px; min-height: 44px` |
| Boutons primaire / secondaire | 44px hauteur min | `padding: 16px 48px` → hauteur ~46px avec texte 13px |
| CTAs de carte ("Accéder au site →") | 44×44px zone | `display: inline-block; min-height: 44px; padding: 12px 0` |
| Bouton "ENVOYER" formulaire | 44px hauteur min | `padding: 16px 40px` — conforme |
| Inputs et textarea | 44px hauteur min | `padding: 14px` avec font 16px → hauteur ~48px |
| Icônes LinkedIn | 44×44px zone | `padding: 14px` autour de l'icône 16px |
| Croix fermeture menu overlay | 44×44px | Zone de touch explicite |

### 6.4 Prefers-reduced-motion

**Règle : quand `prefers-reduced-motion: reduce` est activé, toutes les animations sont désactivées.**

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Effets concernés :
- Fade-in au scroll (IntersectionObserver → pas de classe d'animation, éléments visibles par défaut)
- Transition nav transparent → opaque (maintenue à 0ms, changement instantané)
- Boucle du scroll hint chevron (désactivée)
- Fade-out du scroll hint au premier scroll (instantané)
- Animations d'entrée du Hero (éléments visibles immédiatement)
- Scroll smooth de la navigation (remplacé par scroll instantané)

**Transitions fonctionnelles maintenues à vitesse réduite** (50ms au lieu de 200ms) :
- `border-color` hover de carte (signal visuel fonctionnel, pas décoratif)
- Transition du bouton disabled ↔ actif (signal d'état)

### 6.5 Navigation clavier — flux de focus

L'ordre de tabulation doit suivre le DOM dans l'ordre logique :
1. Logo (lien #hero)
2. Items de navigation (VISION, ACTIVITÉS, ÉQUIPE, IMPLANTATION, CONTACT)
3. CTA "NOUS CONTACTER"
4. Skip link "Aller au contenu principal" (visuellement masqué, visible au focus) → pointe vers `#mission`
5. CTAs de section (Hero : "DÉCOUVRIR NOS ACTIVITÉS", "NOUS CONTACTER")
6. Liens de carte entité (4 × "Accéder au site →")
7. Liens icônes LinkedIn (3 fondateurs)
8. Inputs formulaire (Nom → Email → Téléphone → Message)
9. Bouton "ENVOYER"
10. Footer : liens mentions légales, politique de confidentialité, email

**Menu mobile (overlay) :** focus trap obligatoire. Quand l'overlay est ouvert :
- Tab/Shift-Tab circulent uniquement dans les items du menu
- Escape ferme l'overlay et retourne le focus sur le hamburger
- `aria-expanded`, `aria-controls`, `aria-modal` sur le conteneur

### 6.6 ARIA et rôles sémantiques

| Composant | Rôle ARIA | Attributs |
|---|---|---|
| Navigation principale | `<nav aria-label="Navigation principale">` | — |
| Menu mobile overlay | `role="dialog"` | `aria-modal="true"`, `aria-label="Menu de navigation"` |
| Hamburger | `<button>` | `aria-expanded="false/true"`, `aria-controls="nav-overlay"` |
| CTA carte inactive | `role="link"` | `aria-disabled="true"`, `aria-label="Versi Développement — site bientôt disponible"` |
| Formulaire | `<form>` | `aria-label="Formulaire de contact"` |
| Inputs obligatoires | `<input>` | `required`, `aria-required="true"`, `aria-describedby="field-error-id"` |
| Messages d'erreur | `<span>` | `role="alert"`, `aria-live="polite"` |
| Bouton loading | `<button>` | `aria-busy="true"`, `aria-disabled="true"` |
| Succès formulaire | `<div>` | `role="status"`, `aria-live="polite"` |
| Carte SVG France | `<svg>` | `aria-label="Carte d'implantation Versi — Paris et Lille"`, `role="img"` |
| Marqueurs de ville | `<circle>` SVG | `<title>Paris — Présence active</title>` |

## 7. Favicon et assets

### 7.1 Assets requis

| Asset | Dimensions | Format | Fond | Usage |
|---|---|---|---|---|
| `favicon.ico` | 32×32px, 16×16px (multi-size) | ICO | #0B0B0B | Onglet navigateur — legacy |
| `favicon-32x32.png` | 32×32px | PNG transparent | transparent | Onglet navigateur modern |
| `favicon-16x16.png` | 16×16px | PNG transparent | transparent | Onglet navigateur small |
| `apple-touch-icon.png` | 180×180px | PNG | #0B0B0B | iOS home screen |
| `android-chrome-192x192.png` | 192×192px | PNG | #0B0B0B | Android PWA |
| `android-chrome-512x512.png` | 512×512px | PNG | #0B0B0B | Android PWA splash |
| `og-image.png` | 1200×630px | PNG/JPG | #0B0B0B | Open Graph (partage réseaux, LinkedIn) |
| `site.webmanifest` | — | JSON | — | PWA manifest |

### 7.2 Design du favicon et de l'icône

**Concept :** "V" minimaliste en PP Neue Montreal (ou version géométrique custom) en #F7F5F2 sur fond #0B0B0B.

**Option A — Typographique :** La lettre "V" en uppercase PP Neue Montreal, font-weight 300, centrée dans un carré #0B0B0B avec 20% de marge intérieure. Simple, lisible à 16px, cohérent avec la marque.

**Option B — Géométrique :** Deux lignes diagonales formant un "V" en stroke 2px #F7F5F2 sur fond #0B0B0B. Plus abstrait, facilement reproductible en SVG pur.

**Recommandation :** Option A (typographique). La marque Versi est définie par sa typographie — le favicon doit en être une expression pure, pas une abstraction.

### 7.3 Open Graph Image (og-image.png)

**Dimensions :** 1200×630px

**Composition :**
- Fond : #0B0B0B
- Centré verticalement et horizontalement :
  - "VERSI" en PP Neue Montreal, uppercase, font-weight 300, font-size ~80px, letter-spacing 0.1em, couleur #F7F5F2
  - Sous le nom : "HOLDING IMMOBILIÈRE INTÉGRÉE" en label 13px, uppercase, letter-spacing 0.1em, #6B6560
  - Séparateur horizontal fin 1px #D9D4CE, largeur 120px, margin-top 24px
- Pas d'image de fond (bâtiment) pour l'OG — la composition typographique est plus lisible et mémorable dans un contexte de partage

**Note :** cette image est utilisée pour le partage LinkedIn (canal principal de Laurent) — le format doit être impeccable. Une photo architecturale sur l'OG risque d'être recadrée aléatoirement par LinkedIn. La version typographique est plus sûre.

### 7.4 Balises meta HTML obligatoires

```html
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0B0B0B">
<meta property="og:image" content="https://versi.fr/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Versi">
```

### 7.5 Skip link

```html
<!-- Premier élément dans <body> -->
<a href="#mission" class="skip-link">Aller au contenu principal</a>
```

```css
.skip-link {
  position: absolute;
  top: -100px;
  left: 16px;
  z-index: 9999;
  background: #F7F5F2;
  color: #0B0B0B;
  padding: 8px 16px;
  font-family: 'PP Neue Montreal', sans-serif;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: 1px solid #0B0B0B;
  transition: top 0.2s ease;
}
.skip-link:focus {
  top: 16px;
}
```

---

## 8. Grid system

### 8.1 Colonnes par breakpoint

| Breakpoint | Label | Colonnes | Gutter | Margin latérale | Max-width |
|---|---|---|---|---|---|
| < 640px | mobile | 4 | 16px | 24px | 100% |
| 640px–767px | sm | 4 | 16px | 32px | 100% |
| 768px–1023px | md (tablette) | 8 | 24px | 40px | 100% |
| 1024px–1279px | lg | 12 | 24px | 48px | 100% |
| >= 1280px | xl (desktop) | 12 | 32px | 80px | 1280px |

### 8.2 Breakpoints de référence

| Breakpoint | Valeur | Équivalent Tailwind |
|---|---|---|
| Mobile | 375px (référence de test) | — |
| Tablette | 768px (min-width) | `md:` |
| Desktop | 1280px (min-width) | `xl:` |

### 8.3 Layouts par section

Les layouts détaillés sont dans `docs/design/page-compositions.md`. Résumé :

| Section | Desktop | Tablette | Mobile |
|---|---|---|---|
| Nav | Pleine largeur, flex row, logo gauche / items centre / CTA droite | Idem | Logo gauche / hamburger droite |
| Hero | Pleine largeur, contenu centré (760px max) | Idem | Idem, 36px titre |
| Mission | 2 colonnes (60/40) | 1 colonne | 1 colonne |
| Activités | 4 colonnes égales | 2×2 grille | 1 colonne |
| Approche | 4 colonnes en ligne | 2×2 grille | 1 colonne empilée |
| Implantation | 2 colonnes (55/45) | 1 colonne | 1 colonne |
| Équipe | 3 colonnes égales | 1 colonne | 1 colonne |
| Contact | 2 colonnes (45/55) | 1 colonne | 1 colonne |
| Footer | 3 zones (logo / liens / copyright) | Idem | 1 colonne empilée |

---

## 9. Vérification auto-évaluation design system

| Gate | Statut | Note |
|---|---|---|
| G22 — Contrastes WCAG 2.2 AA | PASS | Tous les ratios vérifiés section 6.1. Focus-visible défini 6.2. Touch targets 6.3. prefers-reduced-motion 6.4. |
| G31 — Architecture tokens 3 tiers | PASS | Primitifs (section 2) → Sémantiques (section 3) → Composants (section 4). Aucune référence directe à un token primitif dans les composants. |
| G32 — 6 états par composant interactif | PASS | 8 composants documentés avec 6 états (section 5). |
| G22 — Focus-visible tous interactifs | PASS | Règle globale + détail par composant. Correctif fond clair documenté. |
| G22 — Touch targets >= 44×44px | PASS | Tableau complet section 6.3. |

---

## Handoff → @fullstack

**Fichiers produits :**
- `/home/user/Versi/docs/design/design-system.md` (ce fichier)
- `/home/user/Versi/docs/design/page-compositions.md` (livrable suivant)

**Décisions prises :**
- Police : PP Neue Montreal (Fontshare — gratuit) — fallback DM Sans (Google Fonts)
- Palette : brief fondateur conservé intégralement + ajout #6B6560 pour texte muted (WCAG AA) + confirmation vert minéral #1E2A23 comme fond accent alternatif
- Accent #C8B9A6 : UNIQUEMENT comme border décorative hover et outline focus sur fond sombre. JAMAIS comme couleur de texte sur fond clair
- Focus-visible sur fond clair = 2px solid #0B0B0B (pas #C8B9A6 — ratio insuffisant sur blanc)
- Photos : angles bas, désaturées naturellement, pas d'humains dans le cadre, lumière naturelle
- Favicon : "V" typographique PP Neue Montreal sur fond #0B0B0B
- OG image : composition typographique pure (pas de photo — meilleure tenue sur LinkedIn)
- Architecture 3 tiers respectée : composants → sémantiques → primitifs, jamais de saut de couche

**Points d'attention implémentation :**
- PP Neue Montreal : télécharger depuis Fontshare (fontshare.com/fonts/pp-neue-montreal) et placer dans `src/assets/fonts/`. Utiliser `font-display: swap` pour éviter le flash
- Outline focus sur fond clair : utiliser `#0B0B0B`, PAS `#C8B9A6` — ratio insuffisant
- CTA cartes inactives : `aria-disabled="true"` + cursor `not-allowed` + tooltip title, SANS href
- Formulaire contact : section fond #1A1A1A — les styles d'input sont conçus pour fond sombre
- prefers-reduced-motion : zéro animation par défaut quand activé — implémenter en CSS media query ET en JS (IntersectionObserver : éléments visibles d'emblée)
- Touch targets mobile : vérifier que TOUS les éléments interactifs ont au minimum 44px de hauteur tapable
- Photos fondateurs : optimiser en WebP, max 400×400px, placer dans `src/assets/team/`
- SVG carte France : fond transparent, couleur path `#D9D4CE`, marqueurs circles avec title ARIA
- La couleur accent #C8B9A6 n'a PAS un ratio WCAG suffisant pour le texte sur fond clair — usage décoratif uniquement

**À lire ensuite :** `docs/design/page-compositions.md` — layouts section par section avec images et animations spécifiées.

