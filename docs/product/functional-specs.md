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

### Contenu

| Élément | Texte affiché | Ancre cible | Position |
|---|---|---|---|
| Logo | VERSI (logotype texte uppercase) | `#hero` | Gauche |
| Item 1 | VISION | `#mission` | Centre |
| Item 2 | ACTIVITÉS | `#activites` | Centre |
| Item 3 | ÉQUIPE | `#equipe` | Centre |
| Item 4 | IMPLANTATION | `#implantation` | Centre |
| Item 5 | CONTACT | `#contact` | Centre |
| CTA | NOUS CONTACTER | `#contact` | Droite |

Note : l'item "CONTACT" dans le menu ET le CTA "NOUS CONTACTER" pointent tous deux vers `#contact`. Le CTA est stylistiquement distinct (bouton avec bordure fine, pas un lien texte).

### Comportement

**État 1 — Sur le Hero (transparent) :**
- `background: transparent`
- Texte et logo : `color-text-inverse` (`#F7F5F2`)
- `position: fixed; top: 0; z-index: 100`
- Transition vers état 2 : quand `window.scrollY >= hauteur_hero - 80px`

**État 2 — Après scroll (opaque) :**
- `background: color-bg-dark-alt` (`#1A1A1A`)
- Texte et logo : `color-text-inverse` (`#F7F5F2`)
- Ombre basse : `box-shadow: 0 1px 0 rgba(255,255,255,0.08)`
- Transition : `background-color 300ms ease`

**État 3 — Section active (scroll spy) :**
- L'item de navigation correspondant à la section visible à l'écran reçoit un indicateur visuel
- Indicateur : `border-bottom: 1px solid color-accent` (`#C8B9A6`) sur le texte de l'item actif
- Mise à jour via `IntersectionObserver` sur chaque section

**Comportement mobile (< 768px) :**
- Logo visible à gauche
- Les 5 items du menu sont masqués
- Icône hamburger (3 lignes horizontales, 20px, `color-text-inverse`) visible à droite
- CTA "NOUS CONTACTER" masqué (remplacé par l'icône hamburger)
- Au clic hamburger : menu mobile en overlay plein écran (`background: color-bg-dark`, `z-index: 200`)
- Menu mobile : items centrés verticalement, typographie H2, clic sur item → ferme overlay + scroll smooth vers section
- Accessibilité : `aria-expanded`, `aria-controls`, focus trap dans l'overlay

**Scroll smooth :**
- `scroll-behavior: smooth` (CSS natif) + fallback JS pour les navigateurs anciens
- Offset scroll : 80px (hauteur de la nav) soustrait à la position de la section cible

### 5 états UI — Navigation (Gate G21)

| État | Comportement | Affichage |
|---|---|---|
| Défaut (sur Hero) | Position fixe, fond transparent | Logo + items en blanc cassé, fond transparent |
| Scroll (après Hero) | Fond sombre opaque activé | `background: #1A1A1A`, transition 300ms |
| Section active | Item correspondant à la section visible | `border-bottom: 1px solid #C8B9A6` sur l'item actif |
| Menu mobile fermé | Hamburger visible, items masqués | Icône 3 barres, 44x44px touch target |
| Menu mobile ouvert | Overlay plein écran, focus piégé | Fond noir, items centrés, croix de fermeture visible |

### User stories — Navigation

**US-NAV-01 : Scroller vers une section via la navigation**

GIVEN un utilisateur est sur versi.fr (n'importe quel scroll)
WHEN il clique sur un item de navigation (ex : "ACTIVITÉS")
THEN la page scrolle en douceur vers la section `#activites` avec un offset de 80px

GIVEN un utilisateur est sur mobile avec le menu overlay ouvert
WHEN il clique sur un item (ex : "ÉQUIPE")
THEN l'overlay se ferme ET la page scrolle vers `#equipe`

GIVEN prefers-reduced-motion est activé sur le système
WHEN l'utilisateur clique sur un item de navigation
THEN le scroll est instantané (pas de scroll animé)

**US-NAV-02 : Transition transparente → opaque**

GIVEN la page est au niveau du Hero (scrollY = 0)
WHEN l'utilisateur scrolle vers le bas de plus de hauteur_hero - 80px
THEN la navigation passe à fond `#1A1A1A` avec transition de 300ms

GIVEN la navigation est opaque
WHEN l'utilisateur scrolle vers le haut jusqu'au Hero
THEN la navigation revient à fond transparent avec transition de 300ms

**US-NAV-03 : CTA "NOUS CONTACTER"**

GIVEN un utilisateur voit le CTA "NOUS CONTACTER" dans la nav
WHEN il clique
THEN scroll smooth vers `#contact`, focus placé sur le premier champ du formulaire (`input[name="nom"]`)

## 3. Section Hero

### Contenu exact

| Élément | Contenu | Notes |
|---|---|---|
| Surtitre (label) | `HOLDING IMMOBILIÈRE INTÉGRÉE` | uppercase, `color-text-inverse` atténué (opacity 0.6), label 13px |
| Titre H1 | `Le cycle immobilier complet.` / `Maîtrisé en interne.` | Deux lignes. Uppercase. 56px desktop / 36px mobile. Font-weight 300. |
| Sous-titre | `Acquisition. Transformation. Structuration.` / `Versi opère l'ensemble du cycle — pour des opérations sans déperdition.` | Corps 18px desktop / 16px mobile. Color-text-inverse opacity 0.85. Max-width 560px. |
| CTA principal | `DÉCOUVRIR NOS ACTIVITÉS` | Bouton outline (bordure `#F7F5F2`, fond transparent, texte `#F7F5F2`). Scroll vers `#activites`. |
| CTA secondaire | `NOUS CONTACTER` | Lien texte avec flèche `→`. Scroll vers `#contact`. |
| Scroll hint | Icône chevron bas animé (fade-in puis loop opacity 0.6→1, durée 2s) | Masqué si `prefers-reduced-motion`. Masqué après premier scroll (scrollY > 50px). |

**Image de fond :**
- Type : photo architecturale (façade immeuble haussmannien, détail béton, espace intérieur épuré)
- Source : à fournir par Thomas/Carl (hors scope PM — placeholder `src/assets/hero-bg.jpg`)
- Overlay : `linear-gradient(to bottom, rgba(11,11,11,0.55) 0%, rgba(11,11,11,0.70) 100%)`
- `object-fit: cover; object-position: center`
- `min-height: 100vh`

### Layout

- Centrage vertical et horizontal du contenu texte dans le viewport (100vh)
- Contenu dans une colonne, max-width 760px, centré
- Alignement du texte : centré (desktop et mobile)
- Ordre DOM : surtitre → H1 → sous-titre → CTAs → scroll hint

### Animations (fade-in au chargement)

Déclenchées une seule fois au `DOMContentLoaded`, désactivées si `prefers-reduced-motion` :
1. Surtitre : fade-in 400ms, delay 0ms
2. H1 : fade-in 400ms, delay 150ms
3. Sous-titre : fade-in 400ms, delay 300ms
4. CTAs : fade-in 400ms, delay 450ms
5. Scroll hint : fade-in 400ms, delay 800ms, puis loop opacity

### 5 états UI — Hero (Gate G21)

| État | Comportement | Affichage |
|---|---|---|
| Défaut (chargement initial) | Image de fond chargée, textes visibles | Overlay sombre, H1, sous-titre, 2 CTAs, scroll hint |
| Loading (image non chargée) | `background-color: #0B0B0B` pendant le chargement de l'image | Fond noir uni, textes visibles dès le DOM |
| Vide | N/A — le contenu est statique, pas de données dynamiques | N/A |
| Erreur (image non chargée) | L'image échoue à charger | `background-color: #1A1A1A` en fallback. Contenu texte inchangé. |
| Scroll hint masqué | Après premier scroll (scrollY > 50px) | Le chevron bas disparaît avec fade-out 200ms |

### User stories — Hero

**US-HERO-01 : Compréhension instantanée (Laurent)**

GIVEN Laurent arrive sur versi.fr (lien partagé ou recherche)
WHEN la page se charge (< 3s sur connexion 4G)
THEN le H1 "Le cycle immobilier complet. Maîtrisé en interne." est visible dans le viewport sans aucun scroll

GIVEN l'image de fond échoue à charger
WHEN la page s'affiche
THEN le fond est `#1A1A1A` et le contenu texte reste lisible avec un contraste >= 4.5:1

**US-HERO-02 : CTA principal**

GIVEN un visiteur est sur le Hero
WHEN il clique sur "DÉCOUVRIR NOS ACTIVITÉS"
THEN scroll smooth vers `#activites` avec offset 80px

**US-HERO-03 : Scroll hint**

GIVEN la page vient de se charger
WHEN scrollY = 0
THEN le chevron bas est visible (opacity loop)

GIVEN l'utilisateur a scrollé au-delà de 50px
WHEN il regarde le Hero (retour scroll)
THEN le scroll hint a disparu (fade-out 200ms, non-réaffiché)

## 4. Section Mission

### Contenu exact

| Élément | Contenu | Notes |
|---|---|---|
| Label section | `VISION` | uppercase 13px, `color-text-muted`, letter-spacing 0.1em |
| Titre H2 | `Un opérateur intégré.` / `Quatre métiers. Un cycle.` | Deux lignes. Uppercase. Font-weight 300. |
| Corps (paragraphe 1) | `Versi est une holding immobilière qui maîtrise l'ensemble du cycle de vie d'un actif — de l'identification à la structuration financière. Quatre entités complémentaires, une seule organisation décisionnelle.` | Corps 18px desktop / 16px mobile. Max-width 640px. |
| Corps (paragraphe 2) | `Là où les grands institutionnels imposent des tickets d'entrée et une bureaucratie, et où les opérateurs indépendants ne couvrent qu'un maillon, Versi opère l'ensemble. En direct. Sans intermédiaire sur les décisions critiques.` | Même style. |
| Indicateurs chiffrés (bloc statistiques) | Voir tableau ci-dessous | Ligne horizontale de 3 chiffres |

**Bloc statistiques :**

| Chiffre | Label |
|---|---|
| `35+` | Actifs gérés |
| `3` | Immeubles |
| `4` | Métiers intégrés |

Style des chiffres : 48px desktop / 36px mobile, font-weight 200, uppercase, `color-text-primary`. Label : 13px, `color-text-muted`, uppercase, letter-spacing.

### Layout

- Fond : `color-bg-primary` (`#F7F5F2`)
- Structure desktop : 2 colonnes — gauche (label + titre + corps), droite (bloc statistiques)
- Structure mobile : 1 colonne — label + titre + corps + bloc statistiques empilés
- Ratio desktop : col-gauche 60% / col-droite 40%
- Bloc statistiques desktop : 3 chiffres en colonne (empilés), avec séparateur `1px solid color-border`
- Bloc statistiques mobile : 3 chiffres en ligne horizontale, chiffres plus petits
- Padding vertical : `space-section-v`

### 5 états UI — Mission (Gate G21)

Section statique (pas de données dynamiques, pas d'interaction). États à documenter pour @fullstack :

| État | Comportement | Affichage |
|---|---|---|
| Défaut | Section visible au scroll | Texte et chiffres affichés |
| Loading | N/A — contenu statique | N/A |
| Vide | N/A — contenu statique | N/A |
| Erreur | N/A — contenu statique | N/A |
| Scroll entry (fade-in) | Section entre dans le viewport | Fade-in 400ms via IntersectionObserver (désactivé si prefers-reduced-motion) |

### User stories — Mission

**US-MISSION-01 : Lecture rapide (Laurent)**

GIVEN Laurent scrolle au-delà du Hero
WHEN il atteint la section Mission
THEN il voit le H2 "Un opérateur intégré. Quatre métiers. Un cycle." en premier, avant de lire le corps
THEN le bloc statistiques ("35+ Actifs gérés", "3 Immeubles", "4 Métiers intégrés") est visible sans scroll supplémentaire sur desktop

## 5. Section Activités

### Contenu exact — 4 cartes entités

| Entité | Surtitre (label) | Titre | Corps | URL cible | CTA |
|---|---|---|---|---|---|
| Versi Développement | `MARCHAND DE BIENS` | `Versi Développement` | `Acquisition et transformation d'actifs immobiliers. Versi Développement identifie, acquiert et revalorise des immeubles à fort potentiel — résidentiel et tertiaire.` | `https://versi-developpement.fr` | `Accéder au site →` |
| Versi Invest | `STRUCTURATION D'INVESTISSEMENT` | `Versi Invest` | `Montage et structuration d'opérations d'investissement immobilier. Versi Invest structure les co-investissements et les véhicules d'acquisition adaptés à chaque opération.` | `https://versi-invest.fr` | `Accéder au site →` |
| Versi Capital | `FONCIÈRE` | `Versi Capital` | `Détention et valorisation long terme d'actifs immobiliers. Versi Capital constitue et gère un portefeuille de biens locatifs avec une stratégie de rendement et de valorisation patrimoniale.` | `https://versi-capital.fr` | `Accéder au site →` |
| Versi Finance | `INGÉNIERIE FINANCIÈRE` | `Versi Finance` | `Structuration financière des opérations immobilières. Versi Finance conçoit les montages financiers et fiscaux adaptés à chaque actif — acquisition, transformation, détention.` | `https://versi-finance.fr` | `Accéder au site →` |

### Comportement des CTAs "Accéder au site"

**Si le site de l'entité est disponible (domaine actif) :**
- Lien `<a href="https://versi-[entite].fr" target="_blank" rel="noopener noreferrer">`
- Ouvre dans un nouvel onglet
- Icône externe visible (14px, `↗` ou SVG external-link)

**Si le site de l'entité n'est pas encore disponible (V1 — tous les sites entités sont hors scope) :**
- Le lien est rendu inactif visuellement : `color-text-muted`, curseur `not-allowed`, pas de `href`
- Un tooltip au hover affiche : `"Site en cours de construction"` (`title` attribut HTML)
- Accessibilité : `aria-disabled="true"`, `role="link"`, description ARIA : "Versi Développement — site bientôt disponible"
- Aucune redirection vers une page "bientôt disponible" (évite la friction pour Laurent)

**Règle de gestion :** une constante `ENTITY_SITES_ACTIVE` dans `src/config/entities.ts` contrôle l'état de chaque lien (boolean par entité). @fullstack peut activer chaque lien indépendamment quand le site correspondant est live.

```typescript
// src/config/entities.ts
export const ENTITY_SITES_ACTIVE = {
  developpement: false,
  invest: false,
  capital: false,
  finance: false,
};
```

### Layout

- Fond : `color-bg-primary`
- Label section (au-dessus du titre) : `ACTIVITÉS`
- Titre de section H2 : `Quatre métiers. Un cycle maîtrisé.`
- Grille desktop (>= 1280px) : 4 colonnes égales, gap `space-card-gap`
- Grille tablette (768px–1279px) : 2 colonnes × 2 lignes
- Grille mobile (< 768px) : 1 colonne (cartes empilées)
- Carte : fond `color-bg-secondary` (`#FFFFFF`), bordure `1px solid color-border`, padding 32px desktop / 24px mobile, coin légèrement arrondi `border-radius: 4px`, ombre très légère `box-shadow: 0 2px 8px rgba(0,0,0,0.06)`

### 5 états UI — Cartes entités (Gate G21)

| État | Comportement | Affichage |
|---|---|---|
| Défaut | Carte visible, CTA disponible | Fond blanc, bordure grise, CTA actif ou inactif selon config |
| Hover (CTA actif) | Survol de la carte ou du CTA | `border-color: color-accent` (`#C8B9A6`), transition 200ms. CTA : `color-text-primary` → soulignement |
| Hover (CTA inactif) | Survol de la carte | Curseur `not-allowed` sur le CTA. Tooltip "Site en cours de construction" |
| Focus-visible | Navigation clavier sur la carte ou le CTA | `outline: 2px solid color-accent; outline-offset: 2px` |
| Fade-in entry | Section entre dans le viewport | Chaque carte fade-in avec delay incrémental (0ms, 100ms, 200ms, 300ms) |

### User stories — Activités

**US-ACT-01 : Compréhension de l'intégration verticale (Laurent)**

GIVEN Laurent est sur la section Activités
WHEN il voit les 4 cartes
THEN chaque carte affiche clairement le nom de l'entité (Versi Développement, Versi Invest, Versi Capital, Versi Finance) et son métier en label
THEN Laurent comprend que Versi couvre 4 métiers distincts et complémentaires

**US-ACT-02 : CTA "Accéder au site" — site inactif**

GIVEN le site versi-developpement.fr n'est pas encore disponible (`ENTITY_SITES_ACTIVE.developpement = false`)
WHEN un visiteur survole le CTA "Accéder au site →" sur la carte Versi Développement
THEN le curseur est `not-allowed` ET le tooltip "Site en cours de construction" est visible
WHEN il clique
THEN aucune navigation ne se produit

**US-ACT-03 : CTA "Accéder au site" — site actif**

GIVEN `ENTITY_SITES_ACTIVE.invest = true`
WHEN un visiteur clique sur "Accéder au site →" sur la carte Versi Invest
THEN le site versi-invest.fr s'ouvre dans un nouvel onglet
THEN l'onglet versi.fr reste ouvert

**US-ACT-04 : Sophie identifie Versi Développement**

GIVEN Sophie arrive sur versi.fr et scrolle jusqu'à la section Activités
WHEN elle lit la carte Versi Développement
THEN elle comprend que Versi Développement est un marchand de biens qui acquiert et transforme des actifs
THEN elle peut cliquer sur "NOUS CONTACTER" pour prendre contact (via nav ou scroll)

## 6. Section Approche

### Contenu exact — 4 étapes

| N° | Titre étape | Corps | Icône suggérée |
|---|---|---|---|
| 01 | `SOURCER` | `Accès direct aux opportunités via un réseau terrain constitué sur 15 ans. Versi identifie les actifs hors marché avant leur mise en vente — sans dépendance aux portails publics.` | Loupe / cible (SVG minimal) |
| 02 | `ANALYSER` | `Chaque actif passe par une grille d'analyse interne : rentabilité potentielle, faisabilité technique, risque de sortie. La décision est documentée, pas intuitive.` | Graphique / analyse (SVG minimal) |
| 03 | `TRANSFORMER` | `Maîtrise d'ouvrage en direct sur les travaux de transformation. Pas d'intermédiation sur les décisions de chantier — le pilotage reste en interne.` | Outils / construction (SVG minimal) |
| 04 | `OPÉRER` | `Gestion locative ou revente selon la stratégie de sortie définie dès l'acquisition. Chaque actif entre dans la méthode avec un plan de sortie, pas une espérance.` | Clé / gestion (SVG minimal) |

**Note pour @fullstack :** les icônes sont des SVG simples inline (20px × 20px). Pas de librairie d'icônes externe — dessiner 4 SVG minimalistes cohérents avec le style architectural du site. Ou utiliser des chiffres 01–04 comme seul identificateur visuel si le style épuré est préféré.

### Layout recommandé

**Option A (recommandée) — Ligne horizontale de 4 étapes avec connecteurs :**
- Desktop : 4 colonnes égales en ligne horizontale
- Connecteur entre étapes : ligne fine `1px solid color-border` avec flèche `→` en `color-accent`
- Chaque étape : numéro (01/02/03/04) en grand format (64px, font-weight 200), icône SVG, titre, corps
- Fond de section : `color-bg-dark` (`#0B0B0B`) — section sombre pour contraste avec les sections claires adjacentes
- Texte sur fond sombre : `color-text-inverse`

**Mobile (< 768px) :**
- Empilage vertical des 4 étapes
- Connecteur vertical : ligne `1px solid rgba(255,255,255,0.15)` entre chaque étape
- Pas de flèche horizontale

**Tablette (768px–1279px) :**
- Grille 2×2 (2 étapes par ligne)
- Connecteurs uniquement horizontaux dans chaque ligne

**Titre de section H2 :** `Notre méthode.`
**Label section :** `APPROCHE`
**Sous-titre de section :** `Quatre étapes. Un cycle reproductible.`

### 5 états UI — Approche (Gate G21)

Section statique sans interaction.

| État | Comportement | Affichage |
|---|---|---|
| Défaut | Section visible | 4 étapes en ligne sur fond sombre |
| Loading | N/A — contenu statique | N/A |
| Vide | N/A — contenu statique | N/A |
| Erreur | N/A — contenu statique | N/A |
| Fade-in entry | Chaque étape entre dans le viewport | Fade-in séquentiel : delay 0ms / 100ms / 200ms / 300ms |

### User stories — Approche

**US-APPR-01 : Validation de la méthode structurée (Laurent)**

GIVEN Laurent scrolle jusqu'à la section Approche
WHEN il voit les 4 étapes numérotées
THEN les 4 titres (SOURCER, ANALYSER, TRANSFORMER, OPÉRER) sont tous visibles sur desktop sans scroll supplémentaire
THEN Laurent comprend que Versi suit une méthode documentée, pas une approche ad hoc

**US-APPR-02 : Lisibilité sur fond sombre**

GIVEN la section Approche a un fond `#0B0B0B`
WHEN le texte est rendu
THEN le contraste texte/fond est >= 4.5:1 (WCAG 2.2 AA)
THEN les chiffres 01–04 sont visibles en `color-text-inverse`

## 7. Section Implantation

### Contenu

**Label section :** `IMPLANTATION`
**Titre H2 :** `Paris. Lille.` / `Et les métropoles françaises.`
**Sous-titre :** `Versi opère sur des actifs de taille intermédiaire dans les marchés urbains à fort potentiel de transformation.`

**Villes à afficher (marqueurs sur la carte) :**

| Ville | Statut | Marker |
|---|---|---|
| Paris | Opérations actives | Point plein `color-accent` (`#C8B9A6`), rayon 6px |
| Lille | Opérations actives | Point plein `color-accent`, rayon 6px |
| Lyon | Extension prévue | Point outline `color-border`, rayon 4px |
| Bordeaux | Extension prévue | Point outline `color-border`, rayon 4px |
| Marseille | Extension prévue | Point outline `color-border`, rayon 4px |

**Note @fullstack :** "extension prévue" = marqueur visuel différencié mais sans label textuel sur la carte (sert à montrer la couverture nationale sans s'engager sur un calendrier).

### Implémentation de la carte

**Recommandation : SVG inline (option retenue)**

Raisons :
- Pas de dépendance externe (Google Maps, Mapbox = cookies + RGPD complexe)
- Chargement immédiat, pas de latence API
- Stylisable en CSS, cohérent avec la palette du site
- Adapté à un site vitrine sans besoin d'interactivité cartographique

**Alternative écartée :** iframe Google Maps — cookies tiers, bandeau RGPD requis, incompatible avec Plausible cookieless.

**Alternative écartée :** Mapbox — coût, complexité, overkill pour un site vitrine.

**Implémentation SVG :**
- Fond de carte : contour simplifié de la France métropolitaine en SVG (path SVG libre de droits, simplifié)
- Couleur de la France : `#D9D4CE` (gris chaud, `color-border`)
- Fond SVG : transparent (fond de section = `color-bg-primary`)
- Marqueurs : `<circle>` SVG aux coordonnées approximatives
- Labels de ville (Paris, Lille) : `<text>` SVG ou `<title>` pour accessibilité
- Dimensions : max-width 500px, centré dans la section

**Source SVG recommandée :** SVG France métropolitaine simplifié (libre de droits) — path du contour disponible sur naturalearth.com ou wikimedia commons. @fullstack sélectionne le fichier et simplifie les paths.

### Layout

- Fond : `color-bg-primary`
- Structure desktop : 2 colonnes — gauche (label + titre + sous-titre + légende), droite (carte SVG)
- Structure mobile : 1 colonne — titre + carte + légende empilés
- Légende : 2 items — point plein "Présence active" / point outline "Zone d'extension"

### 5 états UI — Implantation (Gate G21)

| État | Comportement | Affichage |
|---|---|---|
| Défaut | SVG affiché | Carte France avec marqueurs |
| Loading SVG | Pendant le rendu du SVG | Fond `color-border` de même dimension (skeleton) |
| Vide | N/A — contenu statique | N/A |
| Erreur (SVG manquant) | Fichier SVG inaccessible | Bloc de remplacement : texte "Paris — Lille — Métropoles françaises" centré |
| Hover marqueur | Survol d'un marqueur actif (Paris, Lille) | Tooltip : nom de la ville. `transform: scale(1.3)` sur le circle, transition 150ms |

### User stories — Implantation

**US-IMP-01 : Identification de la géographie (Pierre)**

GIVEN Pierre arrive sur la section Implantation
WHEN il voit la carte
THEN Paris et Lille sont clairement identifiés comme présences actives
THEN Pierre comprend que Versi opère en France (pas uniquement parisien)

**US-IMP-02 : Fallback SVG manquant**

GIVEN le fichier SVG de la carte ne se charge pas
WHEN la section est rendue
THEN le texte de fallback "Paris — Lille — Métropoles françaises" est affiché
THEN la section n'affiche pas de zone vide ni d'erreur visuelle

## 8. Section Équipe

### Contenu exact — 3 cartes fondateurs

**Règle absolue :** chaque fondateur est présenté avec le titre "Co-fondateur" uniquement. Aucun titre fonctionnel (CEO, COO, CMO, Directeur, etc.) n'est affiché sur le site. Les compétences sont décrites via le parcours et les faits, pas via un titre.

| Fondateur | Photo source | Titre (affiché) | Ligne 1 — Parcours | Ligne 2 — Track record personnel | Lien |
|---|---|---|---|---|---|
| Thomas Issa | `/Photos/thomas.png` | `Co-fondateur` | `Marketing Strategy & Operations` | `Co-fondateur TEOS et Sarani. 11 biens locatifs à Paris.` | LinkedIn (URL à fournir par Thomas) |
| Maxime Lemoine | `/Photos/max.png` | `Co-fondateur` | `Commercial & Sales Strategy` | `Ex-European Sales Manager, Sony. 3 immeubles, 24 contrats locatifs.` | LinkedIn (URL à fournir par Maxime) |
| Carl Standertskjold-Nordenstam | `/Photos/Carl-picture.jfif` | `Co-fondateur` | `Marketing Strategy & Croissance` | `Head of Marketing, Inbolt. Co-fondateur Sarani. Ex-Algolia.` | LinkedIn (URL à fournir par Carl) |

**Note @fullstack :** les URLs LinkedIn sont des `[DONNÉES À FOURNIR]` — créer un fichier `src/config/team.ts` avec les URLs en constantes, facile à mettre à jour. Les photos source sont dans `/Photos/` — les optimiser en WebP (max 400×400px, 80% qualité) et les placer dans `src/assets/team/`.

**Note photo Carl :** le fichier source est `.jfif` (JPEG variant). À convertir en `.jpg` ou `.webp` lors de l'optimisation.

### Layout des cartes

- Fond de section : `color-bg-primary`
- Label section : `ÉQUIPE`
- Titre H2 : `Trois associés.` / `Des parcours vérifiables.`
- Sous-titre section : `Chaque fondateur a constitué et géré des actifs immobiliers avant de construire Versi. La pratique précède le discours.`
- Grille desktop : 3 colonnes égales, gap `space-card-gap`
- Grille mobile : 1 colonne (cartes empilées)
- Grille tablette : 1 colonne (cartes empilées) OU 3 colonnes compactes si l'espace le permet

**Anatomie d'une carte fondateur :**
1. Photo : carré 160px × 160px desktop / 120px × 120px mobile. `object-fit: cover`. Pas de border-radius (photos carrées, style architectural). Photo centrée dans la carte en haut.
2. Nom : H3, uppercase, `color-text-primary`
3. Titre : `Co-fondateur` — label 13px, `color-text-muted`, uppercase
4. Ligne spécialité : corps 15px, `color-text-primary`
5. Track record : corps 14px, `color-text-muted`
6. Icône LinkedIn : SVG LinkedIn 16px, `color-text-muted` → `color-text-primary` au hover. `target="_blank" rel="noopener noreferrer"`. Si URL non encore disponible : icône masquée (pas de lien mort).

**Carte :** fond `color-bg-secondary`, bordure `1px solid color-border`, padding 32px, `border-radius: 4px`.

### 5 états UI — Cartes fondateurs (Gate G21)

| État | Comportement | Affichage |
|---|---|---|
| Défaut | Carte visible | Photo + nom + titre + parcours + icône LinkedIn |
| Loading photo | Pendant le chargement de la photo | Placeholder carré `color-border` de même dimension (fond gris clair) |
| Photo manquante (erreur) | Fichier photo inaccessible | Initiales du fondateur (ex : "TI") sur fond `color-bg-dark`, texte `color-text-inverse`, même dimension |
| Hover carte | Survol de la carte | `border-color: color-accent` (`#C8B9A6`), transition 200ms |
| Hover icône LinkedIn | Survol de l'icône | `color-text-primary`, scale légère `1.1`, transition 150ms |

### User stories — Équipe

**US-EQ-01 : Identification des fondateurs (Laurent)**

GIVEN Laurent scrolle jusqu'à la section Équipe
WHEN les 3 cartes sont affichées
THEN chaque carte affiche un nom, "Co-fondateur", une ligne de spécialité et un track record chiffré
THEN aucune carte n'affiche de titre fonctionnel (CEO, CMO, COO) — uniquement "Co-fondateur"
THEN les 3 cartes sont présentées à parité visuelle (même taille, même layout, même hiérarchie)

**US-EQ-02 : Vérification LinkedIn**

GIVEN une URL LinkedIn est configurée pour Thomas Issa
WHEN un visiteur clique sur l'icône LinkedIn de Thomas
THEN le profil LinkedIn de Thomas s'ouvre dans un nouvel onglet
THEN l'onglet versi.fr reste ouvert

GIVEN une URL LinkedIn n'est pas encore configurée pour un fondateur
WHEN la carte est affichée
THEN l'icône LinkedIn est masquée (pas de lien mort, pas d'icône inactive)

**US-EQ-03 : Fallback photo manquante**

GIVEN le fichier `/Photos/Carl-picture.jfif` est inaccessible ou non converti
WHEN la carte Carl est rendue
THEN les initiales "CS" sont affichées sur un carré `#1A1A1A` en fallback
THEN le reste de la carte (nom, titre, parcours) est inchangé

**US-EQ-04 : Parité des 3 co-fondateurs (vérification)**

GIVEN un agent @qa vérifie le code
WHEN il inspecte les 3 cartes
THEN aucune carte n'a une mise en évidence visuelle supérieure aux autres (pas de card plus grande, pas de badge spécial, pas de typographie plus grande pour un seul fondateur)

### Scénarios persona concrets

1. Laurent arrive sur la section Équipe après avoir lu les Activités. Il cherche "qui est derrière". Il voit 3 cartes identiques, avec des noms et des parcours. Il clique sur LinkedIn de Maxime — le profil confirme "European Sales Manager Sony". Laurent valide la crédibilité.
2. Pierre reçoit le lien versi.fr d'un confrère. Il scrolle directement à l'Équipe. Il voit "Carl — Co-fondateur, Head of Marketing Inbolt, ex-Algolia". Il reconnaît des références vérifiables. Versi entre dans son carnet.
3. Sophie arrive sur le site. Elle voit 3 co-fondateurs présentés à égalité. Pas de "PDG" apparent. Elle apprécie la structure collégiale — perception de solidité.
4. Un visiteur sur mobile voit les cartes empilées. La photo de Thomas ne se charge pas (connexion lente). Les initiales "TI" s'affichent. Il continue la lecture du nom et du parcours.
5. Laurent survole la carte de Thomas avec sa souris. La bordure passe en beige pierre `#C8B9A6`. Cet effet discret confirme que le site est soigné — signal de qualité cohérent avec le positionnement.

## 9. Section Contact

### Contenu

**Label section :** `CONTACT`
**Titre H2 :** `Un projet. Un actif.` / `Contactez-nous.`
**Sous-titre :** `Vous avez un actif à céder, un projet d'investissement ou une proposition de partenariat. Nous répondons sous 72h.`
**Email affiché :** `contact@versi.fr` (lien `mailto:contact@versi.fr`, cliquable)

### Champs du formulaire

| Champ | Label affiché | Type | Obligatoire | Validation | Limites | Placeholder | Exemple |
|---|---|---|---|---|---|---|---|
| `nom` | `Nom` | text | Oui | Min 2 caractères, max 100 caractères, pas de chiffres seuls | 2–100 chars | `Votre nom` | `Laurent Dupont` |
| `email` | `Email` | email | Oui | Format email valide (RFC 5322 simplifié : `^[^\s@]+@[^\s@]+\.[^\s@]+$`) | max 254 chars | `Votre adresse email` | `l.dupont@family-office.fr` |
| `telephone` | `Téléphone` | tel | Non | Format FR optionnel : accepte formats `06XXXXXXXX`, `+336XXXXXXXX`, `06 XX XX XX XX` — pas de validation stricte, champ libre | max 20 chars | `Votre numéro (optionnel)` | `06 12 34 56 78` |
| `message` | `Message` | textarea | Oui | Min 20 caractères | 20–2000 chars | `Décrivez votre projet ou votre démarche` | `Je gère un family office et cherche un opérateur co-investisseur sur des actifs de 2-5M€ en Île-de-France.` |
| `website` (honeypot) | — | text | — | Doit rester vide — si rempli → soumission rejetée silencieusement | — | — | — |

**Note honeypot :** le champ `website` est masqué via CSS (`display: none; position: absolute; left: -9999px`). Si un bot le remplit, la soumission est ignorée côté client. Formspree gère aussi un filtre anti-spam côté serveur.

### Service d'envoi — Formspree

**Choix retenu : Formspree**
- Justification : pas de backend, simple à intégrer, plan gratuit (50 soumissions/mois, suffisant pour V1), RGPD-friendly si hébergement EU sélectionné
- Alternative écartée : EmailJS — plus complexe, expose la clé API côté client
- Alternative écartée : Netlify Forms — dépend de l'hébergeur, pas universellement disponible (site hébergé sur Replit / Vercel)

**Configuration Formspree :**
- Endpoint : `https://formspree.io/f/[FORM_ID]` — l'ID Formspree est à créer par Thomas et à placer dans `src/config/contact.ts`
- Méthode : POST
- Headers : `Accept: application/json`
- Pas de redirect Formspree (on gère le succès en JS)

```typescript
// src/config/contact.ts
export const FORMSPREE_ENDPOINT = 'https://formspree.io/f/[FORM_ID_A_RENSEIGNER]';
```

### Comportement du formulaire

**Soumission :**
1. Clic sur "ENVOYER" → validation front-end immédiate (tous les champs obligatoires, formats)
2. Si validation OK → état Loading (bouton disabled, spinner)
3. Requête POST vers Formspree avec payload JSON
4. Si réponse OK (200) → état Succès
5. Si réponse KO (429 / 5xx / réseau) → état Erreur

**Payload envoyé à Formspree :**
```json
{
  "nom": "Laurent Dupont",
  "email": "l.dupont@family-office.fr",
  "telephone": "06 12 34 56 78",
  "message": "Je gère un family office...",
  "_gotcha": ""
}
```

**Réponse succès Formspree :**
```json
{ "ok": true }
```

**Réponse erreur Formspree (rate limit) :**
```json
{ "error": "Too Many Requests" }
```

### Layout

- Fond de section : `color-bg-dark-alt` (`#1A1A1A`) — section sombre
- Texte : `color-text-inverse`
- Structure desktop : 2 colonnes — gauche (label + titre + sous-titre + email affiché), droite (formulaire)
- Structure mobile : 1 colonne (titre + email + formulaire empilés)
- Formulaire : fond légèrement distinct `rgba(255,255,255,0.04)`, padding 40px, `border-radius: 4px`
- Inputs : fond transparent, bordure `1px solid rgba(255,255,255,0.2)`, texte `color-text-inverse`, padding 14px
- Input focus : bordure `color-accent` (`#C8B9A6`)
- Bouton "ENVOYER" : bouton plein, fond `color-text-inverse` (`#F7F5F2`), texte `color-bg-dark` (`#0B0B0B`), uppercase, padding 16px 40px

### 5 états UI — Formulaire de contact (Gate G21)

| État | Comportement | Affichage |
|---|---|---|
| Défaut | Formulaire vide, bouton actif | Champs vides avec placeholders. Bouton "ENVOYER" actif. |
| Loading | Soumission en cours (POST vers Formspree) | Bouton "ENVOYER" → texte "ENVOI EN COURS...", disabled. Spinner (14px) à gauche du texte. Inputs disabled. Durée max attendue : 3s. |
| Vide (validation) | Clic sur "ENVOYER" avec champ obligatoire vide | Message d'erreur inline sous le champ : "Ce champ est requis." en `color-accent` |
| Erreur (technique ou rate limit) | Réponse Formspree non-OK ou timeout réseau | Message sous le formulaire : "Une erreur est survenue. Veuillez réessayer ou écrire directement à contact@versi.fr." Bouton réactivé. Inputs réactivés. |
| Succès | Réponse Formspree OK | Formulaire masqué. Message : "Votre message a bien été envoyé. Nous vous répondons sous 72h." en `color-text-inverse`. Pas de redirect. Pas de rechargement de page. |

### Validation front-end — Messages d'erreur exacts

| Champ | Condition | Message affiché |
|---|---|---|
| `nom` | Vide | `"Ce champ est requis."` |
| `nom` | < 2 caractères | `"Veuillez saisir au moins 2 caractères."` |
| `email` | Vide | `"Ce champ est requis."` |
| `email` | Format invalide | `"Veuillez saisir une adresse email valide."` |
| `message` | Vide | `"Ce champ est requis."` |
| `message` | < 20 caractères | `"Veuillez saisir au moins 20 caractères."` |
| Formulaire | Honeypot rempli | Aucun message — rejet silencieux, afficher état Succès (leurre le bot) |

### Mention RGPD sous le formulaire

Texte obligatoire (conforme à `docs/legal/rgpd-checklist.md` produit par @legal) :

```
En soumettant ce formulaire, vous acceptez que Versi traite vos données personnelles dans le cadre de votre demande.
Base légale : intérêt légitime (art. 6.1.f RGPD). Données conservées 3 ans. Droit d'accès et de suppression : contact@versi.fr.
```

Style : 12px, `color-text-inverse` opacity 0.5, sous le bouton "ENVOYER".

### User stories — Contact

**US-CONT-01 : Soumission réussie (happy path)**

GIVEN un visiteur remplit le formulaire avec nom (>= 2 chars), email valide, message (>= 20 chars)
WHEN il clique sur "ENVOYER"
THEN le bouton passe en état Loading (disabled + "ENVOI EN COURS...")
THEN Formspree reçoit la soumission
THEN le formulaire est remplacé par le message de succès "Votre message a bien été envoyé. Nous vous répondons sous 72h."
THEN la page ne se recharge pas

**US-CONT-02 : Champ obligatoire manquant**

GIVEN un visiteur clique sur "ENVOYER" avec le champ `message` vide
WHEN la validation front-end s'exécute
THEN le message "Ce champ est requis." apparaît sous le champ `message`
THEN le formulaire ne soumet pas
THEN le focus est placé sur le premier champ en erreur

**US-CONT-03 : Email invalide**

GIVEN un visiteur saisit "laurent.dupont" dans le champ email (sans @)
WHEN il clique sur "ENVOYER"
THEN le message "Veuillez saisir une adresse email valide." apparaît sous le champ email
THEN la soumission n'est pas envoyée à Formspree

**US-CONT-04 : Erreur réseau ou Formspree KO**

GIVEN le réseau est indisponible ou Formspree renvoie une erreur 5xx
WHEN la soumission est envoyée
THEN le message "Une erreur est survenue. Veuillez réessayer ou écrire directement à contact@versi.fr." est affiché sous le formulaire
THEN le bouton "ENVOYER" est réactivé
THEN les champs reprennent leur état (données de l'utilisateur préservées)

**US-CONT-05 : Anti-spam honeypot**

GIVEN un bot remplit le champ `website` caché avec une valeur
WHEN le formulaire est soumis
THEN la soumission est rejetée silencieusement (état Succès affiché pour leurrer le bot)
THEN aucun email n'est envoyé à contact@versi.fr

**US-CONT-06 : Double soumission**

GIVEN le formulaire est en état Loading (soumission en cours)
WHEN l'utilisateur clique à nouveau sur "ENVOYER"
THEN le clic est ignoré (bouton disabled)
THEN une seule soumission est envoyée à Formspree

**US-CONT-07 : CTA nav → focus sur formulaire**

GIVEN un visiteur clique sur "NOUS CONTACTER" dans la navigation
WHEN le scroll atteint la section Contact
THEN le focus clavier est placé sur le champ `nom`

**US-CONT-08 : Message = 19 caractères (cas limite)**

GIVEN un visiteur saisit exactement 19 caractères dans le champ message
WHEN il clique sur "ENVOYER"
THEN le message "Veuillez saisir au moins 20 caractères." est affiché
THEN la soumission n'est pas envoyée

### Scénarios persona concrets

1. Laurent arrive sur la section Contact après avoir validé le site. Il saisit son nom, son email professionnel (@family-office.fr), laisse le téléphone vide, et écrit "Je cherche un co-investisseur sur des actifs 2-5M€ IDF — prenons contact." Il clique "ENVOYER". Le formulaire se remplace par "Votre message a bien été envoyé. Nous vous répondons sous 72h." Laurent est satisfait — la réponse est concise, sobre, pas de pop-up de félicitation.
2. Pierre envoie un premier dossier de test. Il complète le formulaire avec "Pierre Durand — courtier immobilier" dans le nom, son email, et décrit un actif de 800k€ à Roubaix. Soumission OK. Pierre attend la réponse de Versi dans les 72h.
3. Sophie hésite, commence à remplir le formulaire, part répondre à un appel, revient 5 minutes plus tard. Les données saisies sont toujours présentes (pas de reset automatique).
4. Un utilisateur sur mobile saisit une adresse email incomplète ("maxime@gmail" sans TLD). Le message "Veuillez saisir une adresse email valide." apparaît inline sous le champ, sans déplacer la page.
5. Un bot tente une soumission automatique et remplit le champ honeypot `website`. Le formulaire affiche l'état Succès (leurre). Aucun email n'arrive dans la boîte Versi.

### Events analytics (Plausible)

| Event | Déclencheur | Propriétés |
|---|---|---|
| `contact_form_view` | IntersectionObserver — section Contact visible >= 50% | — |
| `contact_form_start` | Premier focus sur un champ du formulaire | — |
| `contact_form_submit_success` | Réponse Formspree OK | — |
| `contact_form_submit_error` | Réponse Formspree KO | `error_type: 'network' \| 'server' \| 'rate_limit'` |
| `contact_email_click` | Clic sur le lien mailto contact@versi.fr | — |

## 10. Footer

### Contenu

| Élément | Contenu | Notes |
|---|---|---|
| Logo | VERSI (logotype texte uppercase) | Non cliquable (déjà sur la page) OU clique → scroll vers `#hero` |
| Baseline | `Holding immobilière intégrée` | Label 13px, `color-text-muted` |
| Email | `contact@versi.fr` | Lien `mailto:contact@versi.fr` |
| Lien Mentions légales | `Mentions légales` | Lien vers `/mentions-legales` (page séparée ou modale) |
| Lien Politique de confidentialité | `Politique de confidentialité` | Lien vers `/confidentialite` (page séparée ou modale) |
| Copyright | `© 2026 Versi. Tous droits réservés.` | Texte 12px, `color-text-muted` |
| Entités (optionnel) | `Versi Développement · Versi Invest · Versi Capital · Versi Finance` | Texte 12px, `color-text-muted`, séparateurs mid-dot. Non cliquables en V1 (sites pas encore live) |

**Note @fullstack :** les pages `/mentions-legales` et `/confidentialite` sont des routes React séparées (pas des modales) pour une URL propre et un crawl SEO. Le contenu est fourni dans `docs/legal/mentions-legales-draft.md` et `docs/legal/privacy-policy.md` (produits par @legal).

### Layout

- Fond : `color-bg-dark` (`#0B0B0B`)
- Texte : `color-text-inverse` pour le logo / `color-text-muted` pour les liens et copyright
- Structure desktop : 2 colonnes — gauche (logo + baseline), droite (email + liens légaux + copyright)
- Structure mobile : 1 colonne centrée
- Padding vertical : 64px desktop / 48px mobile
- Séparateur en haut du footer : `1px solid rgba(255,255,255,0.08)`

### User stories — Footer

**US-FOOTER-01 : Accès mentions légales**

GIVEN un visiteur est en bas de page sur n'importe quel device
WHEN il clique sur "Mentions légales"
THEN il accède à la page `/mentions-legales` avec le contenu du fichier `docs/legal/mentions-legales-draft.md`

**US-FOOTER-02 : Email footer**

GIVEN un visiteur clique sur `contact@versi.fr` dans le footer
WHEN le clic est traité
THEN son client de messagerie s'ouvre avec `To: contact@versi.fr` pré-rempli

## 11. User stories transversales

### US-TRANS-01 : Scroll smooth entre sections (toutes ancres)

GIVEN un visiteur est sur n'importe quelle position de la page
WHEN il clique sur un lien ancre (navigation, CTA Hero, CTA footer)
THEN le scroll est animé (smooth) vers la section cible avec offset 80px (hauteur nav)

GIVEN `prefers-reduced-motion: reduce` est actif sur le système
WHEN un clic ancre est déclenché
THEN le scroll est instantané (pas d'animation)

### US-TRANS-02 : Page 404

GIVEN un visiteur arrive sur une URL inexistante (ex : `versi.fr/contact-form`, `versi.fr/team`)
WHEN la page est rendue
THEN une page 404 est affichée avec :
  - Message : "Page introuvable."
  - Lien : "Retour à l'accueil" → `versi.fr`
  - Design cohérent avec le site (même nav, même footer, fond `color-bg-primary`)

### US-TRANS-03 : Accès non autorisé (N/A pour ce site)

N/A — site entièrement public, pas d'authentification.

### US-TRANS-04 : Double soumission de formulaire

Couvert dans US-CONT-06.

### US-TRANS-05 : Retour arrière navigateur

GIVEN un visiteur a navigué vers `/mentions-legales`
WHEN il clique sur le bouton "Retour" du navigateur
THEN il revient sur `versi.fr` (one-page) à la position précédente du scroll (comportement natif du navigateur)

### US-TRANS-06 : Session expirée

N/A — pas de session ni d'authentification sur ce site.

### US-TRANS-07 : Perte de connexion réseau

GIVEN un visiteur perd la connexion réseau pendant le remplissage du formulaire
WHEN il clique sur "ENVOYER"
THEN l'état Erreur est affiché avec le message "Une erreur est survenue. Veuillez réessayer ou écrire directement à contact@versi.fr."
THEN les données du formulaire sont préservées dans les champs

### US-TRANS-08 : Plausible analytics

GIVEN le script Plausible est chargé dans le `<head>` du site
WHEN un visiteur charge la page
THEN un pageview est enregistré sans cookie, sans bandeau de consentement
THEN le script respecte `Do Not Track` (Plausible honore DNT par défaut)

### US-TRANS-09 : Vitesse de chargement

GIVEN un visiteur arrive sur versi.fr via une connexion 4G (simulée Chrome DevTools)
WHEN la page se charge
THEN le LCP (Largest Contentful Paint) est < 2.5s
THEN le H1 Hero est visible avant que l'image de fond soit entièrement chargée (texte ne dépend pas de l'image)

## 12. Responsive — 3 breakpoints

### Définition des breakpoints

| Breakpoint | Largeur | Device cible |
|---|---|---|
| Mobile | < 768px (375px référence) | iPhone 13, Android standard |
| Tablette | 768px–1279px (768px référence) | iPad, tablettes Android |
| Desktop | >= 1280px (1280px référence) | Laptop, desktop |

### Tableau de comportement par section et breakpoint

| Section | Mobile (375px) | Tablette (768px) | Desktop (1280px) |
|---|---|---|---|
| **Navigation** | Logo gauche + hamburger droite. Menu en overlay plein écran. CTA masqué. | Logo gauche + 5 items centrés + CTA droite (compact). Pas de hamburger. | Logo gauche + 5 items centrés + CTA droite. |
| **Hero** | Min-height 100svh (small viewport). H1 : 36px. Sous-titre : 16px. CTAs en colonne (pleine largeur). Scroll hint visible. | Min-height 100vh. H1 : 44px. CTAs côte à côte. | Min-height 100vh. H1 : 56px. CTAs côte à côte. |
| **Mission** | 1 colonne. Bloc stats en ligne (3 chiffres). | 1 colonne. Bloc stats en ligne. | 2 colonnes (60/40). Bloc stats en colonne droite. |
| **Activités** | 1 colonne (cartes empilées). | 2 colonnes × 2 lignes. | 4 colonnes en ligne. |
| **Approche** | 1 colonne (étapes empilées). Connecteur vertical. | 2 colonnes × 2 lignes. | 4 colonnes en ligne. Connecteur horizontal. |
| **Implantation** | 1 colonne. Carte SVG full-width (max 320px). Légende dessous. | 1 colonne. Carte SVG max 400px. | 2 colonnes (texte gauche, carte droite). Carte max 500px. |
| **Équipe** | 1 colonne (cartes empilées). Photo 120px. | 1 colonne OU 3 colonnes compactes (3 cartes côte à côte en réduit). | 3 colonnes égales. Photo 160px. |
| **Contact** | 1 colonne (titre + email + formulaire empilés). | 1 colonne. Formulaire centré max 560px. | 2 colonnes (texte gauche, formulaire droite). |
| **Footer** | 1 colonne centrée. | 1 colonne OU 2 colonnes selon le contenu. | 2 colonnes (logo gauche, liens droite). |

### Règles responsive globales

1. **Images :** `max-width: 100%; height: auto` sur toutes les images
2. **Texte :** pas de font-size en px fixes sur mobile — utiliser des valeurs relatives ou `clamp()`
3. **Touch targets :** tous les éléments interactifs (liens, boutons, icônes) ont un minimum de 44×44px de zone cliquable sur mobile
4. **Overflow horizontal :** `overflow-x: hidden` sur le `<body>` — aucun scroll horizontal
5. **Input mobile :** `font-size: 16px` minimum sur les inputs pour éviter le zoom automatique iOS

### User stories — Responsive

**US-RESP-01 : Formulaire mobile**

GIVEN un utilisateur est sur mobile (375px)
WHEN il touche le champ email du formulaire
THEN le clavier email s'affiche (input type="email")
THEN la page ne zoome pas (font-size input >= 16px)

**US-RESP-02 : Navigation mobile**

GIVEN un utilisateur est sur mobile (375px) avec le menu overlay ouvert
WHEN il appuie sur la croix ou en dehors du menu
THEN l'overlay se ferme avec une transition fade-out 200ms

**US-RESP-03 : Touch targets 44px**

GIVEN un utilisateur sur mobile survole (tape) l'icône LinkedIn d'un fondateur
WHEN le touch event se déclenche
THEN la zone active est >= 44×44px (peut être plus grande que l'icône visible de 16px)

## 13. Accessibilité

### Standard cible : WCAG 2.2 AA

### Contrastes (Gate G22)

| Combinaison | Ratio cible | Usage |
|---|---|---|
| `#F7F5F2` (texte) sur `#0B0B0B` (fond sombre) | >= 4.5:1 | Nav, Hero, Footer, Approche, Contact |
| `#F7F5F2` (texte) sur `#1A1A1A` (fond nav/contact) | >= 4.5:1 | Nav au scroll, Contact |
| `#0B0B0B` (texte) sur `#F7F5F2` (fond clair) | >= 4.5:1 | Mission, Activités, Implantation, Équipe |
| `#6B6560` (muted) sur `#F7F5F2` (fond clair) | >= 4.5:1 | Labels, captions — à vérifier avec outil (ratio estimé ~5.2:1) |
| `#C8B9A6` (accent) sur `#0B0B0B` | >= 3:1 | Éléments interactifs (borures hover) |

### Focus-visible

- Tous les éléments interactifs (`<a>`, `<button>`, `<input>`, `<textarea>`, hamburger, icônes LinkedIn) doivent avoir un `outline` visible au focus clavier
- Style : `outline: 2px solid #C8B9A6; outline-offset: 3px`
- Interdiction : `outline: none` sans alternative visible
- Navigation clavier complète : Tab/Shift+Tab sur tous les interactifs dans l'ordre logique du DOM

### Attributs ARIA requis

| Composant | Attribut ARIA |
|---|---|
| Bouton hamburger | `aria-expanded="true/false"`, `aria-controls="mobile-menu"`, `aria-label="Menu de navigation"` |
| Menu mobile overlay | `id="mobile-menu"`, `role="dialog"`, `aria-modal="true"`, `aria-label="Navigation"` |
| Formulaire de contact | `<form aria-label="Formulaire de contact Versi">` |
| Champ en erreur | `aria-invalid="true"`, `aria-describedby="[id-du-message-erreur]"` |
| Message de succès | `role="status"`, `aria-live="polite"` |
| Message d'erreur formulaire | `role="alert"`, `aria-live="assertive"` |
| Carte entité CTA inactif | `aria-disabled="true"`, `aria-label="[Nom entité] — site bientôt disponible"` |
| Icône LinkedIn | `aria-label="Profil LinkedIn de [Nom fondateur]"` |
| Image hero (fond) | `role="img"` sur le conteneur, `aria-label="Architecture Versi"` (ou `aria-hidden="true"` si décoratif) |
| Carte fondateur photo | `<img alt="[Prénom Nom], Co-fondateur Versi">` |
| SVG carte France | `<title>Carte d'implantation Versi en France</title>` dans le SVG |
| Scroll hint (chevron) | `aria-hidden="true"` (décoratif) |

### Focus trap — Menu mobile

GIVEN le menu mobile overlay est ouvert
WHEN l'utilisateur presse Tab
THEN le focus reste dans l'overlay (jamais vers le contenu derrière)
WHEN l'utilisateur presse Escape
THEN l'overlay se ferme et le focus revient sur le bouton hamburger

### Skip navigation

Lien "Aller au contenu principal" en haut du DOM, visible uniquement au focus clavier :
```html
<a href="#main-content" class="skip-nav">Aller au contenu principal</a>
```
Style : positionné `absolute`, `left: -9999px` par défaut, `left: 20px; top: 20px` au `:focus`.

## 14. Analytics

### Outil recommandé : Plausible Analytics

Justification : pas de bandeau cookies nécessaire (exempté CNIL), respecte le RGPD, léger (~1 KB), suffisant pour un site vitrine. Voir `docs/legal/legal-audit.md`.

### Événements à tracker

| Événement | Déclencheur | Objectif |
|---|---|---|
| `scroll_section` | Scroll > 50% d'une section (IntersectionObserver) | Comprendre quelles sections retiennent l'attention |
| `cta_click_activites` | Clic sur "Découvrir nos activités" (Hero) | Mesurer l'engagement Hero |
| `cta_click_contact` | Clic sur "Nous contacter" (nav ou Hero) | Mesurer l'intent de contact |
| `cta_click_entite` | Clic sur "Accéder au site" d'une entité | Mesurer l'intérêt par entité |
| `contact_form_submit` | Soumission réussie du formulaire | KPI North Star |
| `contact_form_error` | Erreur de validation formulaire | Identifier les frictions |
| `linkedin_click` | Clic sur une icône LinkedIn fondateur | Mesurer l'intérêt pour l'équipe |

### Implémentation

- Script Plausible en `<head>` avec attribut `defer`
- Événements custom via `plausible('event_name', {props: {section: 'hero'}})` 
- Pas de cookies = pas de bandeau = pas de perte de données

## 15. Checklist de couverture — Scope V1

### IN (obligatoire V1)

- [x] Navigation sticky avec smooth scroll
- [x] Hero avec titre, sous-titre, 2 CTAs
- [x] Section Mission
- [x] Section Activités (4 cartes entités)
- [x] Section Approche (4 étapes)
- [x] Section Implantation (carte SVG France)
- [x] Section Équipe (3 co-fondateurs)
- [x] Section Contact (formulaire + email)
- [x] Footer (mentions légales, politique confidentialité)
- [x] Page /mentions-legales
- [x] Page /politique-de-confidentialite
- [x] Responsive 3 breakpoints (375px, 768px, 1280px)
- [x] Accessibilité WCAG 2.2 AA
- [x] Analytics Plausible
- [x] HTTPS
- [x] Favicon + meta OG

### OUT (hors scope V1)

- Blog
- Authentification / espace membre
- E-commerce / paiement
- Pages individuelles pour les entités (ce seront des sites séparés)
- Dark mode (le design est sombre par nature, pas besoin d'un toggle)
- Multilingue (français uniquement)
- Chat / chatbot
- Newsletter
- Intégration CRM

### Décision H2 — Sophie (propriétaire)

**Décision : Sophie est HORS versi.fr V1.** Le site holding cible des investisseurs/partenaires professionnels (Laurent, Pierre). Sophie cherche un marchand de biens concret — son besoin sera servi par versi-developpement.fr (biens disponibles, réalisations). Sur versi.fr, la section Activités renvoie vers les sites d'entités : c'est le pont naturel pour Sophie si elle arrive sur la holding par erreur.

---

**Handoff → @fullstack**

- Fichiers produits : `docs/product/product-vision.md`, `docs/product/functional-specs.md`
- Décisions clés :
  - One-page React avec 7 sections + nav sticky + footer
  - Formulaire via Formspree (gratuit, RGPD-friendly)
  - Carte France en SVG inline (pas d'iframe Google Maps)
  - Plausible Analytics (pas de bandeau cookies)
  - CTAs entités : `aria-disabled` + tooltip "Bientôt disponible" pour les sites non existants
  - Sophie HORS scope V1 (pas de contenu "propriétaire vendeur" sur versi.fr)
- Points d'attention :
  - 3 photos fondateurs dans `/Photos/` (Carl-picture.jfif, max.png, thomas.png) — optimiser pour le web
  - Les 5 états UI sont documentés pour chaque composant interactif (gate G21)
  - Accessibilité : focus-visible, ARIA, skip-nav, focus trap menu mobile
  - Consulter `docs/legal/rgpd-checklist.md` pour les 6 items bloquants avant mise en ligne
- Livrables amont à lire : `docs/strategy/brand-platform.md` (tone of voice, vocabulaire proscrit), `docs/design/design-system.md` (quand produit par @design)
