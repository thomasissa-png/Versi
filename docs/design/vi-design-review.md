# Design Review — Versi Immobilier
**Agent** : @design | **Date** : 2026-04-09 | **Score provisoire** : 7.5/10 (affiné après lecture des CSS restants)

---

## Tokens et design system

**Verdict global : solide — architecture 2 tiers présente, 3 tiers incomplet**

Points forts :
- Tokens primitifs bien définis : palette calcaire/mineral/stone cohérente avec l'univers immobilier premium
- Tokens sémantiques corrects pour les fonds (`--color-bg-primary`, `--color-bg-dark`, etc.) et les textes
- Spacing scale 4px-base respectée : xs→5xl conforme au standard
- Duration tokens présents et utilisés dans les CSS composants
- `prefers-reduced-motion` implémenté globalement — WCAG 2.2 confiant
- `focus-visible` global propre avec `outline-offset: 3px`
- Skip navigation présent

Problèmes identifiés :
- **MAJEUR — Tokens component absents (tier 3)** : aucun token de niveau composant (`--button-padding-x`, `--card-border-radius`, `--hero-title-size`). Les composants définissent leurs propres valeurs (`padding: 16px 48px` dans `.hero__cta-primary`, `font-size: 3rem` dans `.hero__title`) au lieu de référencer des tokens. Dette de design system réelle.
- **MINEUR — Typography scale incomplète** : les tailles typographiques sont définies en `rem` hardcodés dans les utility classes (`.text-display: 3.5rem`, `.text-heading-lg: 2.25rem`) plutôt que via des tokens nommés de la scale. Le fichier `index.css` définit des tokens comme `--font-size-display-num` (4rem) mais le Hero utilise `font-size: 3rem` directement sans token.
- **MINEUR — Radius tokens incomplets** : seuls `--radius-none` (0px) et `--radius-sm` (4px) sont définis. Pas de `--radius-md`, `--radius-lg`, `--radius-full`. Les cards (8px dans `--card-radius`) utilisent une valeur orpheline non référencée dans la scale de radius.
- **MINEUR — Font-weight bold (700) absent** : la scale déclare thin/light/regular/medium mais pas bold. Si un titre gras est nécessaire plus tard, la valeur sera hardcodée.
- **INFO — Couleurs badge hardcodées** : `--badge-en-vente-bg: #28A745` duplique `--color-success`. Devrait référencer le token existant.

---

## Hiérarchie typographique

**Verdict : cohérente et premium — quelques incohérences de sizing**

Points forts :
- Axe uppercase + letter-spacing élevé + font-weight light = langage typographique premium lisible, cohérent avec le secteur immobilier haut de gamme
- Hiérarchie display → heading-lg → heading-md → label → body bien définie
- `line-height: 1.65` pour le corps = excellente lisibilité

Problèmes identifiés :
- **MAJEUR — Hero title désynchronisé de la scale** : `.hero__title` utilise `font-size: 3rem` hardcodé, mais `.text-display` (la classe utilitaire équivalente) est à 3.5rem. Incohérence : le titre principal du site est plus petit que le style "display" défini. Sur desktop, le Hero aurait dû utiliser `.text-display` (3.5rem) ou le token `--font-size-display-num` (4rem).
- **MINEUR — `.text-body-sm`** : définie à `0.9375rem` (15px) dans les utility classes mais le token `--font-size-body-sm` est à `0.875rem` (14px). Désynchronisation de 1px entre token et classe utilitaire.
- **INFO — Pas de `font-weight: bold` dans le copy** : tout le site fonctionne en light/regular/medium. Pour un site visant Laurent (investisseur qui scanne vite), l'absence de contrastes de poids forts peut nuire à la scannabilité des chiffres clés.

---

## Contrastes et accessibilité

**Verdict : globalement conforme WCAG 2.2 AA — 2 points à surveiller**

Analyse des combinaisons critiques :
- `--color-text-inverse (#F7F5F2)` sur `--color-bg-dark (#0B0B0B)` : contraste ~18:1 — PASS largement
- `--color-text-inverse (#F7F5F2)` sur gradient Hero (entre `#0B0B0B` et `#1E2A23`) : contraste ≥ 14:1 — PASS
- `--color-text-primary (#0B0B0B)` sur `--color-bg-primary (#F7F5F2)` : contraste ~18:1 — PASS
- `--color-text-muted (#6B6560)` sur `--color-bg-primary (#F7F5F2)` : contraste ~4.8:1 — PASS (juste, limite)
- `--color-accent (#C8B9A6)` sur `--color-bg-dark (#0B0B0B)` : contraste ~5.2:1 — PASS texte
- **ATTENTION — `--color-text-inverse` avec `opacity: var(--opacity-muted)` (0.5)** : le surtitre du Hero applique opacity 0.5 sur `#F7F5F2` → couleur effective ~#7D7B79 sur fond sombre. Contraste effectif ≈ 4.4:1 — FAIL texte (seuil 4.5:1). À corriger.
- **ATTENTION — `.hero__accent` opacity 0.55** : l'élément décoratif (ligne séparatrice) n'est pas du texte, donc hors scope WCAG. Acceptable.
- `--color-bg-dark (#0B0B0B)` sur `--color-accent (#C8B9A6)` pour `.hero__cta-primary` : contraste ~5.2:1 — PASS

Accessibilité générale :
- Touch targets : `.hero__cta-primary` → `min-height: 52px` — PASS. `.hero__cta-secondary` → `min-height: 44px` — PASS (limite). `.nav__hamburger` → `44x44px` — PASS. `.nav__close` → `44x44px` — PASS. `.nav__cta` → `padding: 10px 20px` sans `min-height` déclaré — à vérifier hauteur réelle calculée.
- `skip-nav` présent et fonctionnel
- `focus-visible` global correct
- `prefers-reduced-motion` global — PASS

---

## Responsive

**Verdict : architecture solide, breakpoints cohérents — 1 hardcode mobile**

Points forts :
- Breakpoints 767px / 768px-1279px / 1280px+ utilisés de manière cohérente dans index.css et Hero.css
- Hero utilise `100svh` sur mobile (correctif iOS Safari) — excellente pratique
- Stack vertical des CTAs Hero sur mobile avec `width: 100%` — pattern correct
- Nav mobile avec overlay fullscreen centré — pattern premium approprié

Problèmes identifiés :
- **MINEUR — `.nav__inner` mobile : `padding: 0 20px` hardcodé** au lieu de `var(--spacing-md)` (16px) ou `var(--spacing-lg)` (24px). Valeur hors système. 20px est non-standard dans la scale.
- **MINEUR — Tablet breakpoint 768px-1279px nav** : `padding: 0 var(--spacing-lg)` (24px) alors que le desktop utilise `var(--spacing-2xl)` (48px). Le saut 24→48px est brutal sur les résolutions intermédiaires type 1024px. Un échelon 32px (`--spacing-xl`) serait plus progressif.
- **INFO — `max-width: 860px` du `.hero__content`** : valeur hardcodée sans token. Devrait être `--text-max-width-lg` (760px) ou un nouveau token `--hero-content-max-width`.

---

## Animations

**Verdict : propres et intentionnelles — cascade 6 étapes bien exécutée**

Points forts :
- Cascade Hero 6 étapes avec stagger progressif (0→120→240→360→480→700ms) : timing bien dosé, la rupture à 700ms pour le dernier élément (scroll hint) crée un effet de "respiration" post-chargement
- `heroFadeIn` avec `translateY(10px)` : sobre, premium, pas clinquant. Adapté à Laurent.
- `scrollPulse` sur le scroll hint : subtle avec opacity 0.6→1 sur 2000ms — ne distrait pas
- `prefers-reduced-motion` global annule toutes les animations — PASS WCAG
- `ease-out` utilisé correctement sur les entrées (accélération→décélération naturelle)

Problèmes identifiés :
- **MINEUR — Durée `var(--duration-glacial, 2000ms)` dans `.hero__scroll-hint`** : la syntaxe avec fallback `2000ms` est redondante puisque `--duration-glacial` est défini à 2000ms dans le token. Indique un copier-coller défensif — nettoyer.
- **MINEUR — `.fade-in` global (index.css) et `.hero__fade` (Hero.css) : deux systèmes d'animation parallèles**. Le système `.fade-in > *:nth-child(n)` est générique, le système `.hero__fade--N` est component-specific. Risque de confusion à la maintenance — documenter lequel s'applique où.
- **INFO — Pas de motion token `ease-spring`** : le token est recommandé dans le protocole design system mais absent du `index.css`. Pour les micro-interactions futures (hover cards, accordéons), ce manque se fera sentir.

---

## Corrections par priorité

| # | Fichier | Problème | Priorité | Correction proposée |
|---|---|---|---|---|
| 1 | `Hero.css` | `.hero__surtitre` opacity 0.5 → contraste effectif ~4.4:1 FAIL WCAG AA | BLOQUANT | Remplacer `opacity: var(--opacity-muted)` par `opacity: 0.6` minimum, ou utiliser `color: rgba(247, 245, 242, 0.65)` — vérifier avec Figma contrast checker |
| 2 | `Hero.css` | `.hero__title` font-size 3rem hardcodé, désynchronisé du `.text-display` (3.5rem) | MAJEUR | Ajouter token `--font-size-hero-title: 3.5rem` dans index.css, référencer dans Hero.css — ou utiliser la classe `.text-display` directement |
| 3 | `index.css` | Tokens component (tier 3) absents — valeurs hardcodées dans les composants | MAJEUR | Ajouter dans index.css : `--button-padding-y: 16px`, `--button-padding-x: 48px`, `--hero-content-max-width: 860px`, `--radius-md: 8px`, `--radius-full: 9999px` |
| 4 | `index.css` | `--card-radius: 8px` orphelin — pas de `--radius-md` dans la scale | MAJEUR | Remplacer `--card-radius` par `--radius-md: 8px` dans la scale de radius, mettre à jour les références |
| 5 | `Nav.css` | `.nav__inner` mobile padding `20px` hardcodé hors scale | MINEUR | Remplacer `padding: 0 20px` par `padding: 0 var(--spacing-md)` (16px) ou `var(--spacing-lg)` (24px) |
| 6 | `Nav.css` | `.nav__cta` sans `min-height` déclaré | MINEUR | Ajouter `min-height: 44px` pour garantir touch target mobile |
| 7 | `Hero.css` | `var(--duration-glacial, 2000ms)` — fallback redondant | MINEUR | Remplacer par `var(--duration-glacial)` |
| 8 | `index.css` | `.text-body-sm` 0.9375rem ≠ token `--font-size-body-sm` 0.875rem | MINEUR | Aligner : choisir 0.875rem (14px) pour cohérence token/classe |
| 9 | `index.css` | Tokens radius incomplets (seulement none + sm) | MINEUR | Ajouter `--radius-md: 8px`, `--radius-lg: 12px`, `--radius-full: 9999px` |
| 10 | `index.css` | `--badge-en-vente-bg: #28A745` duplique `--color-success` | MINEUR | Remplacer par `--badge-en-vente-bg: var(--color-success)` |
| 11 | `index.css` | `--duration-slow` absent des motion tokens `ease-spring` | INFO | Ajouter `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)` pour futurs micro-interactions |
| 12 | `index.css` | Deux systèmes animation parallèles (`.fade-in` global vs `.hero__fade`) | INFO | Documenter dans un commentaire CSS : `.fade-in` = sections scroll-triggered, `.hero__fade` = page-load only |
| 13 | `FeaturedProjects.css` | `.featured__cta` color-accent (#C8B9A6) sur fond calcaire (#F7F5F2) = contraste ~1.9:1 FAIL WCAG AA | BLOQUANT | Remplacer par `color: var(--color-text-primary)` avec `opacity: 0.7` au hover, ou `color: var(--color-text-muted)` |
| 14 | `ContactForm.css` | `.contact-form__rgpd` opacity 0.5 sur fond sombre = contraste ~4.4:1 FAIL WCAG AA | BLOQUANT | Passer `opacity: var(--opacity-muted)` à `opacity: 0.65` minimum |
| 15 | `ContactForm.css` | `.contact-form__form-error` utilise `var(--color-accent)` pour les erreurs sur fond sombre | MAJEUR | Remplacer par `var(--color-error-on-dark)` (#FF6B6B — token déjà défini) |
| 16 | `ProjectCard.css` | `.project-card__tab` min-height 32px — FAIL touch target WCAG 2.2 (min 44px) | BLOQUANT | Passer `min-height: 44px`, ajuster `padding: 10px 14px` |
| 17 | `SellPage.jsx` | Tout le CSS dans `<style>` en bas du composant (40+ règles) — antipattern | MAJEUR | Extraire dans `SellPage.css`, importer en haut du fichier |
| 18 | `SellPage.jsx` | 8 inline styles dont 5 répétitions `marginBottom: 'var(--spacing-2xl)'` sur h2 | MAJEUR | Créer classe utilitaire `.section-title` dans SellPage.css avec margin-bottom standardisé |
| 19 | `SellPage.jsx` | Sections avec `style={{ background: 'var(--color-bg-secondary)' }}` en inline au lieu d'une classe CSS | MAJEUR | Créer classes `.bg-secondary`, `.bg-primary` ou extraire chaque section dans son bloc CSS |
| 20 | `ProjectCard.css` | `font-size: 12px`, `20px`, `padding: 20px` hardcodés | MINEUR | Remplacer par `var(--font-size-small)`, token typo, `var(--spacing-md)` |
| 21 | `PropertyCard.css` | `font-size: 14px`, `20px`, `1.5rem`, `padding: 20px`, `6px 12px` hardcodés | MINEUR | Tokéniser — `var(--font-size-body-sm)`, nouveau token `--font-size-card-title: 1.25rem`, `var(--spacing-md)` |
| 22 | `ContactForm.css` | `border-radius: 6px` hardcodé sur inputs/submit — hors scale radius (4px et rien au-dessus) | MINEUR | Ajouter `--radius-input: 6px` dans index.css ou utiliser `--radius-sm` (accepter 4px) |
| 23 | `ContactForm.css` | `gap: 6px` dans `.contact-form__field` hardcodé | MINEUR | Remplacer par `var(--spacing-xs)` (4px — proche) ou ajouter `--spacing-2xs: 6px` |
| 24 | `Process.css` | `font-size: 48px` dans `.process__number` hardcodé | MINEUR | Ajouter token `--font-size-process-number: 3rem` ou utiliser `var(--font-size-display-num)` (4rem, légèrement grand) |
| 25 | `Footer.css` | `gap: 6px` dans `.footer__logo-link`, `font-size: 1.125rem` sur logo non-tokénisé | MINEUR | Ajouter `--font-size-logo: 1.125rem` dans index.css, remplacer gap par `var(--spacing-xs)` |
| 26 | `SellerBanner.css` | `max-width: 800px` hardcodé — proche de `--text-max-width-lg` (760px) | MINEUR | Remplacer par `var(--text-max-width-lg)` ou ajouter `--text-max-width-xl: 800px` |
| 27 | `SellerBanner.css` | Pas de `width: 100%` sur CTA mobile | MINEUR | Ajouter `@media (max-width: 767px) { .seller-banner__cta { width: 100%; } }` |

*Tableau complet — corrections issues de tous les CSS et SellPage.jsx.*

---

## Sections enrichies après lecture des CSS composants

### Stats.css — Propre, sans remarque critique

Stats est le CSS le plus court et le plus correct du projet. Utilisation exclusive de tokens pour couleurs, spacing, grid. Pas de valeur hardcodée. La grille 3→1 colonnes sur mobile est correcte.

Seul point : l'absence de `tablet` breakpoint (768px-1279px) — la grille reste à 3 colonnes sur tablette, ce qui peut être serré selon la longueur des labels. Acceptable MVP.

### Process.css — 1 valeur hardcodée, pattern séparateurs solide

- `font-size: 48px` hardcodé pour `.process__number` — devrait utiliser `var(--font-size-display-num)` (4rem = 64px, trop grand) ou un token dédié. Le choix de 48px est esthétiquement juste (entre body et display), mais il doit être tokénisé.
- Le pattern séparateurs verticaux desktop / horizontaux mobile est bien pensé et premium.
- Pas de breakpoint tablet pour la grille — reste à 3 colonnes sur 768px-1279px. Correct ici car les steps sont courtes.

### SellerBanner.css — Correct, CTA sans min-height explicite

- `.seller-banner__inner max-width: 800px` hardcodé sans token.
- `.seller-banner__cta` : `padding: 16px 48px` + `min-height: 52px` — conforme (identique au hero CTA, cohérent).
- Pas de breakpoint mobile déclaré — le composant flexbox colonne par nature, mais le CTA devrait passer en `width: 100%` sur mobile explicitement.

### Footer.css — Solide. 1 bug de layout tablet.

- Tokens utilisés partout sauf `gap: 6px` dans `.footer__logo-link` (hardcodé, valeur non standard).
- Breakpoint tablet (768px-1279px) : grille passe de 3 colonnes à 2 colonnes avec la colonne right en full-width. Comportement acceptable.
- **MINEUR — Breakpoint tablet manquant pour le padding** : le footer desktop utilise `padding: var(--spacing-3xl) var(--spacing-2xl)` mais le tablet cible uniquement le vertical (`var(--spacing-2xl) var(--spacing-lg)`). Le padding horizontal 24px sur tablette vs 48px desktop est une régression cohérente — acceptable.
- `font-size: 1.125rem` hardcodé sur `.footer__logo` et `.footer__logo-label` (même valeur que la Nav — duplication non-tokénisée). Devrait être un token `--font-size-logo`.

### Testimonials.css — Le composant le plus token-compliant du projet

Zéro valeur hardcodée. Utilisation systématique des tokens. Le breakpoint 1279px (2 colonnes) → 767px (1 colonne) est correctement défini. Le `.testimonials__card` utilise `--radius-sm` (4px) — visuellement cohérent mais la card utilise la même valeur que les boutons. Un `--radius-md: 8px` (conforme à `--card-radius`) serait plus approprié sémantiquement.

### FeaturedProjects.css — Propre, 1 ambiguïté de contraste

- `.featured__cta` en `var(--color-accent)` sur fond `var(--color-bg-primary)` : contraste `#C8B9A6` sur `#F7F5F2` = ~1.9:1 — **FAIL WCAG AA texte**. C'est un lien texte ("Voir toutes nos réalisations"), pas un bouton. Le contraste est insuffisant. Doit être `var(--color-text-primary)` ou `var(--color-text-muted)` sur fond clair.
- `.featured__empty` : état vide présent — bien.
- Pas de responsivité tablet déclarée séparément, mais la grille `repeat(3,1fr)` → `repeat(2,1fr)` à 1279px est dans ce fichier — conforme.

### ProjectCard.css — 4 valeurs hardcodées, 1 problème touch target critique

- `font-size: 12px` dans `.project-card__tab` — hardcodé, devrait être `var(--font-size-small)`.
- `font-size: 20px` dans `.project-card__title` — hardcodé, devrait être `var(--font-size-body-lg)` ou un token.
- `padding: 20px` dans `.project-card__body` — hardcodé, devrait être `var(--spacing-md)`.
- **MAJEUR — `.project-card__tab` : `min-height: 32px`** — 32px est inférieur au minimum WCAG 2.2 de 44px pour les touch targets. Ces onglets (Avant/Après) sont interactifs sur mobile — **FAIL touch target**. Corriger en `min-height: 44px` avec padding vertical ajusté.
- `border-radius: var(--card-radius)` — utilise le token `--card-radius` (8px) qui est lui-même orphelin de la scale radius. Correction ciblée nécessaire mais non urgente.
- `.project-card__toggle background: rgba(0,0,0,0.6)` — couleur hardcodée. Acceptable pour une overlay contextuelle, mais un token `--color-overlay: rgba(0,0,0,0.6)` serait propre.

### PropertyCard.css — Qualité supérieure à ProjectCard. 3 hardcodes.

- `font-size: 12px` dans `.property-card__badge` — hardcodé.
- `font-size: 20px` dans `.property-card__title` — hardcodé.
- `font-size: 14px` dans `.property-card__location` — hardcodé (devrait être `var(--font-size-body-sm)` = 0.875rem = 14px — coïncidence numérique, mais tokénisé).
- `font-size: 1.5rem` dans `.property-card__price` — hardcodé. Pour un prix (donnée critique pour Laurent), ce sizing est justifié mais doit être tokénisé.
- `padding: 6px 12px` dans `.property-card__badge` — hardcodé.
- `padding: 20px` dans `.property-card__body` — hardcodé (`var(--spacing-md)` = 16px, ici 20px non-standard).
- `.property-card:focus-within` : pattern élégant qui capture le focus même sur les liens internes de la card. Bonne pratique.
- Touch targets badges : `padding: 6px 12px` avec `font-size: 12px` → hauteur calculée ~26px. Non interactif (juste un badge affiché), donc pas de contrainte WCAG touch target. OK.

### ContactForm.css — Le composant le plus complexe. Bien géré, 4 problèmes.

- `border-radius: 6px` hardcodé sur `.contact-form__input`, `.contact-form__textarea`, `.contact-form__select`, `.contact-form__submit` — devrait être `var(--radius-sm)` (4px) ou un nouveau `--radius-input: 6px`.
- `padding: 12px 16px` sur les inputs — hardcodé. Devrait être tokénisé.
- `gap: 6px` dans `.contact-form__field` — hardcodé.
- `font-size: 14px` dans `.contact-form__submit` et `.contact-form__label-text` — hardcodés (devrait être `var(--font-size-body-sm)`).
- **MAJEUR — `.contact-form__rgpd` opacity 0.5 sur fond sombre** : `color: var(--color-text-inverse)` avec `opacity: var(--opacity-muted)` (0.5) = même problème WCAG que le surtitre Hero. Contraste effectif ~4.4:1 — FAIL. Monter à 0.6 minimum.
- **BIEN — `font-size: 16px` anti-zoom iOS** sur les inputs : commenté et justifié. Excellente pratique.
- `.contact-form__form-error` en `var(--color-accent)` sur fond sombre : même problème de contraste que `.featured__cta` — `#C8B9A6` n'est pas adapté pour les messages d'erreur. Sur fond sombre, utiliser `var(--color-error-on-dark)` (#FF6B6B) qui est déjà défini dans les tokens.
- États form documentés : default, hover, focus, error, disabled, success — 5/6 états PASS. Loading state absent du formulaire (spinner pendant soumission — à vérifier dans SellForm.jsx).

### SellPage.jsx — Antipattern de style en ligne généralisé

C'est le problème structurel le plus important de la codebase côté design system.

**Ce qui est utilisé en inline style (style="...")** — 8 occurrences :
1. `<main style={{ paddingTop: 'var(--nav-height)' }}>` — acceptable (layout structurel)
2. `<div style={{ textAlign: 'center' }}>` — devrait être une classe utilitaire
3. `<h2 style={{ marginBottom: 'var(--spacing-2xl)' }}>` — répété 5 fois pour différents spacings
4. `<section style={{ background: 'var(--color-bg-secondary)' }}>` — répété pour chaque fond de section
5. `<p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)' }}>` — styles de corps text
6. `<p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-2xl)', maxWidth: 'var(--text-max-width-md)' }}>` — combinaison de 3 props
7. `<div style={{ marginTop: 'var(--spacing-xl)' }}>` — espacement wrapper
8. `<Link style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>` — style de lien

**Ce qui est dans `<style>` en bas du composant** (CSS-in-JSX) — 40+ règles, incluant :
- Layout complets : `.sell-engagements`, `.sell-process`, `.sell-criteria`, `.sell-faq`
- Composants entiers : `.sell-hero`, `.sell-form-wrapper`, `.sell-prescripteurs`
- Media queries mobile

**Verdict** : tout le CSS de SellPage.jsx doit être extrait dans un fichier `SellPage.css`. Les inline styles ponctuels (`paddingTop: 'var(--nav-height)'`) sont acceptables mais doivent être l'exception. Le pattern actuel mélange 3 approches (classe utilitaire, inline style, style tag) pour le même composant — c'est de la dette de maintenance.

**Cas spécifique — `.sell-hero__title font-size: 3rem`** : même désynchronisation que `.hero__title` (3rem vs scale display 3.5rem). Cohérent avec lui-même mais désynchronisé du design system.

**Cas acceptable** : `<style>` en bas avec media queries — dans un contexte React sans CSS Modules ni Tailwind, c'est fonctionnel. Mais la priorité est l'extraction dans un `.css` dédié.

---

## Score final

| Critère | Note | Commentaire |
|---|---|---|
| Tokens / design system | 6/10 | Architecture 2 tiers correcte, tier 3 absent, ~25 valeurs hardcodées dans les composants |
| Hiérarchie typographique | 7.5/10 | Langage premium cohérent, désynchronisation hero title, 2 incohérences scale |
| Contrastes / accessibilité | 6/10 | 3 FAIL WCAG AA (surtitre Hero, rgpd form, featured cta), 1 FAIL touch target (tabs card) |
| Responsive | 7.5/10 | Architecture solide, quelques hardcodes ponctuels, SellPage mobile OK via style tag |
| Animations | 8.5/10 | Cascade Hero propre, reduced-motion global, deux systèmes à documenter |
| Structure CSS | 5/10 | SellPage : mélange 3 approches (inline, style tag, classes) — dette structurelle réelle |
| **Score global** | **6.7/10** | Base saine, identité visuelle premium correcte, dette technique CSS à résorber avant launch |

**Synthèse pour Laurent** : le site ne sera pas éliminé en 10 secondes par un problème visuel grossier. L'identité calcaire/charbon est cohérente et premium. Les 3 FAIL WCAG sont invisibles à l'oeil nu mais pourraient poser problème si Laurent utilise un outil d'accessibilité ou si le site est audité. Le problème principal est structurel (CSS inline dans SellPage) — invisible côté utilisateur mais un signal d'amateurisme pour tout développeur qui inspecte le code.

---

## Handoff → @fullstack

**Fichiers produits** :
- `/home/user/Versi/docs/design/vi-design-review.md` (ce fichier)

**Corrections à implémenter par priorité** :

BLOQUANT — avant tout push production (corrections WCAG) :
1. `.hero__surtitre` opacity 0.5 → 0.65 (`rgba(247,245,242,0.65)`) — `Hero.css` ligne 38
2. `.featured__cta` : remplacer `color: var(--color-accent)` par `color: var(--color-text-muted)` — `FeaturedProjects.css` ligne 27
3. `.contact-form__rgpd` opacity 0.5 → 0.65 — `ContactForm.css` ligne 193
4. `.contact-form__form-error` sur fond sombre : remplacer `var(--color-accent)` par `var(--color-error-on-dark)` — `ContactForm.css` ligne 181
5. `.project-card__tab` min-height 32px → 44px — `ProjectCard.css` ligne 52

MAJEUR — dans la prochaine session de code :
6. Extraire tout le CSS de `SellPage.jsx` dans `SellPage.css`
7. Supprimer les 8 inline styles de SellPage.jsx, les remplacer par des classes CSS
8. Ajouter tokens tier 3 dans `index.css` : `--radius-md: 8px`, `--radius-lg: 12px`, `--radius-full: 9999px`, `--radius-input: 6px`, `--font-size-logo: 1.125rem`
9. Remplacer `--card-radius: 8px` par `var(--radius-md)` dans index.css + composants
10. Synchroniser `.hero__title` et `.sell-hero__title` avec la scale (décision Thomas : 3rem ou 3.5rem)

MINEUR — polish pre-launch :
11. Touch target `min-height: 44px` sur `.nav__cta` — `Nav.css`
12. Nettoyer `var(--duration-glacial, 2000ms)` — `Hero.css` ligne 117
13. Aligner `.text-body-sm` 0.9375rem → `var(--font-size-body-sm)` (0.875rem) — `index.css`
14. Tokéniser les `font-size: 12px`, `14px`, `20px` hardcodés dans ProjectCard et PropertyCard
15. Ajouter `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)` dans motion tokens — `index.css`
16. `.seller-banner__cta width: 100%` sur mobile manquant — `SellerBanner.css`
17. Documenter les deux systèmes animation dans commentaires CSS

**Points d'attention pour @fullstack** :
- Ne pas créer de nouveaux inline styles ni de nouveaux blocs `<style>` dans les pages
- Le `--color-accent (#C8B9A6)` est INTERDIT comme couleur de texte sur fond clair (contraste 1.9:1). Il passe sur fond sombre (5.2:1 sur #0B0B0B) et comme fond de bouton (5.2:1 avec texte #0B0B0B).
- Les photos d'équipe en initiales sont acceptables pour le MVP mais à remplacer avant launch commercial — Laurent élimine en 10 secondes un site sans photos d'équipe sur une page Approche
- `font-size: 16px` sur les inputs (anti-zoom iOS) — ne pas modifier, c'est intentionnel

**Décisions à valider avec Thomas** :
1. Hero title : rester à 3rem (sobre, actuel) ou monter à 3.5rem (plus impactant, conforme scale display) ? La réponse conditionne aussi `sell-hero__title`.
2. Initiales équipe : acceptable MVP ou bloquer le launch ?
3. `SellPage.css` extraction : à faire dans cette session ou après validation du contenu ?
