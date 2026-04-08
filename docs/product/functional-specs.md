# Specs fonctionnelles — versi.fr

> Produit par @product-manager | Date : 2026-04-08
> Site one-page institutionnel. Référence : product-vision.md, brand-platform.md, personas.md, legal-audit.md.
> Ce document est la source de vérité pour @fullstack, @ux, @qa.

---

## Table des matières

1. [Architecture globale du one-page](#1-architecture-globale)
2. [Navigation sticky](#2-navigation-sticky)
3. [Section Hero](#3-section-hero)
4. [Section Mission](#4-section-mission)
5. [Section Activités](#5-section-activités)
6. [Section Approche](#6-section-approche)
7. [Section Implantation](#7-section-implantation)
8. [Section Équipe](#8-section-équipe)
9. [Section Contact](#9-section-contact)
10. [Footer](#10-footer)
11. [User stories transversales](#11-user-stories-transversales)
12. [Responsive — 3 breakpoints](#12-responsive)
13. [Accessibilité](#13-accessibilité)
14. [Analytics](#14-analytics)
15. [Scope V1 — checklist de couverture](#15-checklist-couverture)

---

## 1. Architecture globale

### Structure du document HTML

Page unique (`index.html`) avec sections identifiées par des ancres :

```
#hero
#mission
#activites
#approche
#implantation
#equipe
#contact
```

### Ordre de rendu des sections (DOM)

```
<nav> sticky (fixée au viewport top)
<main>
  <section id="hero">
  <section id="mission">
  <section id="activites">
  <section id="approche">
  <section id="implantation">
  <section id="equipe">
  <section id="contact">
</main>
<footer>
```

### Palette de couleurs (tokens)

| Token | Valeur hex | Usage |
|---|---|---|
| `color-bg-primary` | `#F7F5F2` | Fond général du site (blanc cassé) |
| `color-bg-secondary` | `#FFFFFF` | Fond des cartes |
| `color-bg-dark` | `#0B0B0B` | Fond sections sombres (Hero, Footer) |
| `color-bg-dark-alt` | `#1A1A1A` | Fond nav au scroll, fond section Contact |
| `color-text-primary` | `#0B0B0B` | Corps de texte sur fond clair |
| `color-text-inverse` | `#F7F5F2` | Texte sur fond sombre |
| `color-text-muted` | `#6B6560` | Labels, sous-textes, légendes |
| `color-border` | `#D9D4CE` | Bordures de cartes, séparateurs |
| `color-accent` | `#C8B9A6` | Accent minimal (hover, détails) |
| `color-nav-transparent` | `transparent` | Nav sur Hero |

### Typographie

| Usage | Police | Taille desktop | Taille mobile | Graisse | Transform |
|---|---|---|---|---|---|
| Titre H1 (Hero) | Inter | 56px | 36px | 300 | uppercase, letter-spacing: 0.08em |
| Titre H2 (sections) | Inter | 36px | 26px | 300 | uppercase, letter-spacing: 0.06em |
| Titre H3 (cartes) | Inter | 20px | 18px | 400 | uppercase, letter-spacing: 0.04em |
| Corps | Inter | 16px | 15px | 400 | none |
| Label/caption | Inter | 13px | 12px | 400 | uppercase, letter-spacing: 0.08em |
| CTA boutons | Inter | 13px | 13px | 500 | uppercase, letter-spacing: 0.1em |

### Espacements (tokens)

| Token | Valeur | Usage |
|---|---|---|
| `space-section-v` | 120px desktop / 80px mobile | Padding vertical de chaque section |
| `space-section-h` | 80px desktop / 24px mobile | Padding horizontal (marges latérales) |
| `space-card-gap` | 32px | Gouttière entre cartes |
| `space-nav-h` | 48px desktop / 20px mobile | Padding horizontal de la nav |

### Animations

Règle générale : **uniquement des fade-in** (opacity 0 → 1, durée 400ms, easing ease-out). Aucune animation de translation, rotation ou scale. La règle `prefers-reduced-motion` doit désactiver toutes les animations.

```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

### Stack technique

- React (Vite ou CRA, pas de Next.js — site 100% statique)
- Zéro backend — formulaire via Formspree
- Analytics : Plausible (script cookieless, inclus dans le `<head>`)
- Pas de librairie CSS (Tailwind ou CSS modules au choix de @fullstack — les tokens ci-dessus s'appliquent dans les deux cas)
- Pas de librairie d'animation (CSS natif uniquement)

## 2. Navigation sticky

<!-- À compléter -->

## 3. Section Hero

<!-- À compléter -->

## 4. Section Mission

<!-- À compléter -->

## 5. Section Activités

<!-- À compléter -->

## 6. Section Approche

<!-- À compléter -->

## 7. Section Implantation

<!-- À compléter -->

## 8. Section Équipe

<!-- À compléter -->

## 9. Section Contact

<!-- À compléter -->

## 10. Footer

<!-- À compléter -->

## 11. User stories transversales

<!-- À compléter -->

## 12. Responsive

<!-- À compléter -->

## 13. Accessibilité

<!-- À compléter -->

## 14. Analytics

<!-- À compléter -->

## 15. Checklist couverture

<!-- À compléter -->

---

**Handoff → @fullstack**
- Fichier produit : `/home/user/Versi/docs/product/functional-specs.md`
- En cours de rédaction — sections complétées séquentiellement.
