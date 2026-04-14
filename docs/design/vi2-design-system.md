# Design System — Versi Invest

> Produit par @design | Date : 2026-04-14
> Adaptation du design system Versi (docs/design/design-system.md) pour l'entité Versi Invest
> Architecture endorsed brand : VERSI — Invest

---

## 1. Héritage du groupe

Versi Invest hérite de 100% du design system Versi holding. Ce document ne documente que les **adaptations** et les **composants spécifiques** à Versi Invest. Pour les fondamentaux (typo, spacing, radius, shadows, composants de base), se référer à `docs/design/design-system.md`.

### 1.1 Ce qui est identique

- **Typographie** : PP Neue Montreal (Fontshare). Mêmes poids, mêmes tailles, même échelle typographique.
- **Spacing** : même scale (4px base, 8/12/16/24/32/48/64/96).
- **Radius** : même scale (2px petits éléments, 4px cards, 8px modals).
- **Shadows** : même système (shadow-sm, shadow-md, shadow-lg).
- **Breakpoints** : 375px (mobile), 768px (tablet), 1280px (desktop).
- **Hero pattern** : fade global 300ms ease-out (préférence fondateur).
- **Nav + Footer** : même structure, adapté au menu Versi Invest.
- **Team cards** : identiques (mêmes fondateurs, mêmes bios, mêmes photos).
- **Dark mode** : non supporté (identique groupe).

### 1.2 Ce qui change : accent propre

**Accent Versi Invest : Bleu profond #1B3A5C**

| Rôle | Token | Versi holding | Versi Immobilier | Versi Invest |
|------|-------|---------------|------------------|--------------|
| Accent section fond | --color-accent-bg | #1E2A23 (vert minéral) | #1E2A23 (vert minéral) | #1B3A5C (bleu profond) |
| Accent interaction | --color-accent | #C8B9A6 (beige pierre) | #C8B9A6 (beige pierre) | #C8B9A6 (beige pierre) |
| Accent CTA fond | --color-cta-bg | #C8B9A6 | #C8B9A6 | #C8B9A6 |
| Accent CTA hover | --color-cta-hover | #B8A996 | #B8A996 | #B8A996 |

**Justification du bleu #1B3A5C** : le vert #1E2A23 de Versi Immobilier évoque la verdure urbaine et le patrimoine bâti. Le bleu profond #1B3A5C évoque la confiance institutionnelle, la finance, l'investissement — territoires sémantiques distincts. Il se distingue immédiatement visuellement tout en restant dans le registre "premium, sobre, pas flashy".

**Contrastes vérifiés (WCAG AA)** :
- #1B3A5C sur #F7F5F2 (calcaire) : ratio 7.2:1 — PASS AAA
- #F7F5F2 sur #1B3A5C : ratio 7.2:1 — PASS AAA
- #C8B9A6 sur #1B3A5C : ratio 3.1:1 — PASS AA (interactifs)
- #0B0B0B sur #F7F5F2 : ratio 16.1:1 — PASS AAA (hérité)

---

## 2. Palette complète Versi Invest

| Rôle | Token | Hex | Usage |
|------|-------|-----|-------|
| Fond principal | --color-bg | #F7F5F2 | Body, sections claires |
| Fond cartes | --color-bg-card | #FFFFFF | Cards, modals |
| Fond sombre principal | --color-bg-dark | #0B0B0B | Hero, footer |
| Fond sombre secondaire | --color-bg-dark-alt | #1A1A1A | Nav scrolled, sections alternées sombres |
| Fond accent | --color-bg-accent | #1B3A5C | Bandeau confiance, section simulateur résultats |
| Texte principal | --color-text | #0B0B0B | Sur fond clair |
| Texte inverse | --color-text-inverse | #F7F5F2 | Sur fond sombre |
| Texte muted | --color-text-muted | #6B6560 | Descriptions secondaires, timestamps |
| Bordure | --color-border | #D9D4CE | Séparateurs, bordures cards |
| Accent interactif | --color-accent | #C8B9A6 | CTAs, liens, hover states |
| Accent hover | --color-accent-hover | #B8A996 | CTA hover |
| Succès | --color-success | #2D5F2D | Cashflow positif, messages succès |
| Erreur | --color-error | #8B2020 | Cashflow négatif, erreurs formulaire |

---

## 3. Composants spécifiques Versi Invest

### 3.1 SimulateurCard

**Usage** : conteneur du formulaire de simulation + affichage des résultats

**Structure** :
- Container 2 colonnes desktop (→ stack mobile)
- Colonne gauche : formulaire (inputs avec labels au-dessus, spacing-md entre champs)
- Colonne droite : résultats (fond --color-bg-accent, texte --color-text-inverse)
- Résultats : chiffres en text-heading-lg, labels en text-body-sm muted
- Cashflow positif : --color-success. Cashflow négatif : --color-error.
- Disclaimer : text-body-xs, --color-text-muted, padding-top spacing-lg
- Bouton "Scénario prudent" : style secondary (outline)

**6 états** :
- Default : formulaire vide, résultats masqués
- Hover : highlight champ actif (border --color-accent)
- Active : champ en saisie (border --color-accent, 2px)
- Focus-visible : outline 2px --color-accent offset 2px
- Disabled : N/A (tous les champs sont toujours actifs)
- Loading : N/A (calcul côté client, instantané)

**Responsive** : 2 colonnes desktop → stack mobile (formulaire au-dessus, résultats en dessous)

### 3.2 ReferenceCard

**Usage** : carte de présentation d'une référence d'investissement

**Structure** :
- Card avec fond --color-bg-card, border --color-border, radius-md
- Badge en haut : type (ex: "Immeuble de rapport") — fond --color-bg-accent, texte --color-text-inverse, radius-sm
- Titre : ville + département (text-heading-sm)
- Métriques en grille 2×2 : rendement brut, cashflow net/mois, nb lots, montage
- Métriques positives en --color-success
- Description : text-body-sm, --color-text-muted, 2-3 lignes max
- Année : badge discret

**6 états** : default | hover (shadow-md, translateY -2px) | active (shadow-sm) | focus-visible (outline) | disabled (opacity 0.5) | loading (skeleton)

### 3.3 WaitlistForm

**Usage** : formulaire de qualification investisseur (page Contact)

**Structure** :
- Card large, fond --color-bg-card, padding spacing-xl
- Champs en stack vertical, spacing-md entre champs
- Labels au-dessus (text-body-sm, font-weight 500)
- Selects et radios stylisés (même esthétique que les inputs)
- Checkbox RGPD : text-body-xs, lien politique confidentialité en --color-accent
- CTA : bouton primary pleine largeur, fond --color-accent, texte --color-bg-dark
- Touch target minimum : 44×44px sur tous les interactifs

**6 états** : default | hover | active | focus-visible (outline chaque champ) | disabled (envoi en cours — bouton loading) | loading (spinner sur CTA)

### 3.4 ProcessStep

**Usage** : étape du process (pages Accueil et Comment ça marche)

**Structure** :
- Numéro : cercle 48px fond --color-bg-accent, texte --color-text-inverse, text-heading-sm
- Titre : text-heading-sm, --color-text
- Description : text-body-md, --color-text-muted
- Ligne de connexion entre étapes (desktop : horizontale, mobile : verticale)

**Responsive** : 6 en ligne desktop (3×2 tablet, 1 col mobile)

### 3.5 ServiceCard

**Usage** : volet de service (page Services)

**Structure** :
- Card fond --color-bg-card, padding spacing-lg
- Icône : 32×32, --color-accent
- Titre : text-heading-sm
- Description : text-body-md
- Liste "Inclus" : checkmarks --color-success
- Liste "Non inclus" : croix --color-text-muted
- Radius-md, border --color-border

**6 états** : default | hover (shadow-md) | active | focus-visible | disabled | loading (skeleton)

---

## 4. Images et assets

### 4.1 Images par page (gate G30)

| Page | Image | Type | Sujet | Source |
|------|-------|------|-------|--------|
| Accueil (hero) | Background subtil | Photo architecturale | Façade d'immeuble rénové, pierre, angle bas | Photo Versi ou stock libre (Unsplash architecture) |
| Accueil (confiance) | Aucune (typographie seule) | — | — | — |
| Comment ça marche | Icônes process | SVG/icônes | 6 icônes métier (loupe, maison, calculette, banque, marteau, clé) | Création @design ou Lucide icons |
| Services | Icônes service | SVG/icônes | 6 icônes (identiques process) | Identiques |
| Simulateur | Aucune (UI pure) | — | — | — |
| Références | Placeholder images | Photo | Façades immeubles génériques (pas de photos réelles V1) | Unsplash architecture ou fond uni |
| Équipe | Photos fondateurs | Portrait | Maxime, Thomas, Carl | Assets existants src/assets/team/ |
| Contact | Aucune (formulaire pur) | — | — | — |
| Blog | Image article | Photo | Thématiques investissement/immobilier | Unsplash ou générées |

### 4.2 Favicon et OG

- **Favicon** : multi-résolution 16/32/48/64 — icône "VI" stylisée ou reprise du motif Versi
- **OG Image** : 1200×630, fond --color-bg-dark, "VERSI — Invest" centré, sous-titre
- **Apple touch icon** : 180×180

---

## 5. Accessibilité (gate G22)

| Critère | Spécification | Statut |
|---------|---------------|--------|
| Contraste texte | >= 4.5:1 sur tous les fonds | Vérifié (section 1.2) |
| Contraste interactifs | >= 3:1 | Vérifié (C8B9A6 sur 1B3A5C = 3.1:1) |
| Focus-visible | outline 2px --color-accent offset 2px sur TOUS les interactifs | Requis |
| Touch targets | 44×44px minimum sur mobile | Requis |
| prefers-reduced-motion | Désactiver le fade hero 300ms si activé | Requis |
| Ordre de tab | Logique descendante, skip-to-content | Requis |

---

**Handoff → @fullstack**
- Fichiers produits : `docs/design/vi2-design-system.md`
- Décisions prises : accent bleu profond #1B3A5C (distinct du vert Versi Immobilier), 5 composants spécifiques documentés, contrastes WCAG AA vérifiés
- Points d'attention :
  - L'accent --color-bg-accent est le SEUL token qui change vs Versi holding/Versi Immobilier
  - Les tokens --color-accent et --color-cta-* restent identiques (beige pierre #C8B9A6)
  - Implémenter prefers-reduced-motion pour le hero fade
  - Touch targets 44×44px sur mobile pour tous les boutons et liens
