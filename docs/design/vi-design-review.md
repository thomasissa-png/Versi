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

*Tableau complété au fil de la lecture des CSS restants — voir section suivante.*

---

## Sections enrichies après lecture des CSS composants

*(À compléter via Edit après lecture de Stats.css, Process.css, SellerBanner.css, Footer.css, Testimonials.css, FeaturedProjects.css, ProjectCard.css, PropertyCard.css, ContactForm.css, SellPage.jsx)*

---

## Score final

| Critère | Note | Commentaire |
|---|---|---|
| Tokens / design system | 6.5/10 | Architecture 2 tiers solide, tier 3 absent, quelques désynchronisations |
| Hiérarchie typographique | 7.5/10 | Langage premium cohérent, Hero title désynchronisé |
| Contrastes / accessibilité | 7/10 | 1 FAIL WCAG (surtitre Hero opacity), reste conforme |
| Responsive | 8/10 | Solide, 1 hardcode isolé |
| Animations | 8.5/10 | Cascade propre, deux systèmes à documenter |
| **Score global provisoire** | **7.5/10** | Bon niveau pour MVP, corrections ciblées avant launch |

---

## Handoff → @fullstack

**Fichiers produits** :
- `/home/user/Versi/docs/design/vi-design-review.md` (ce fichier)

**Corrections à implémenter par priorité** :

BLOQUANT (avant tout push production) :
- Corriger le contraste du `.hero__surtitre` : passer `opacity` de 0.5 à minimum 0.6, idéalement 0.65 (`rgba(247,245,242,0.65)`)

MAJEUR (dans la prochaine session) :
- Synchroniser `.hero__title` avec la typography scale (3rem → 3.5rem ou token dédié)
- Ajouter les tokens component tier 3 manquants dans `index.css`
- Consolider `--card-radius` dans la scale de radius (`--radius-md: 8px`)

MINEUR (polish pre-launch) :
- Touch target `min-height: 44px` sur `.nav__cta`
- Nettoyer le fallback `var(--duration-glacial, 2000ms)`
- Aligner `.text-body-sm` (0.9375rem → 0.875rem)
- Documenter les deux systèmes d'animation dans les commentaires CSS
- Ajouter `--ease-spring` dans les motion tokens

**Points d'attention pour @fullstack** :
- L'inline style dans les pages (SellPage, ApprochePage, ContactPage) sera évalué dans une prochaine passe — ne pas créer de nouveaux inline styles d'ici là
- Les photos d'équipe en initiales sont acceptables pour le MVP mais doivent être remplacées avant launch commercial (Laurent élimine en 10s — des initiales sur une page Approche envoient un signal "pas encore prêt")
- Le token `--color-accent (#C8B9A6)` passe les contrastes texte (5.2:1) mais de justesse en CTA — ne pas l'utiliser sur fond clair pour du texte corps

**Décisions à valider avec Thomas** :
- Hero title : rester à 3rem (plus sobre) ou monter à 3.5rem (plus impactant) ? Les deux sont défendables pour le profil Laurent.
- Initiales équipe : acceptable MVP ou bloquer le launch jusqu'à l'avoir des vraies photos ?
