# Compositions de page — Versi Invest

> Produit par @design | Date : 2026-04-14
> Source : docs/product/vi2-functional-specs.md, docs/design/vi2-design-system.md
> Format identique à docs/design/page-compositions.md (Versi Immobilier)

---

## 1. Accueil (HomePage)

### Section 1 — Hero
- **Layout** : full-width, fond --color-bg-dark (#0B0B0B), min-height 85vh
- **Contenu** : titre (text-display uppercase tracking-wide), sous-titre (text-heading-md, --color-text-muted sur sombre), CTA primary center
- **Image** : background photo architecturale (opacity 0.15, blend multiply) — façade immeuble pierre
- **Animation** : fade global 300ms ease-out 100ms forwards (préférence fondateur)
- **Responsive 375px** : padding horizontal 24px, titre text-heading-xl, CTA pleine largeur

### Section 2 — Références teaser
- **Layout** : container max-width 1200px, grille 3 colonnes gap-lg
- **Composant** : 3× ReferenceCard (voir design-system section 3.2)
- **Spacing** : padding-y spacing-xxl (96px)
- **Titre section** : text-heading-lg uppercase tracking-wide, centré
- **CTA** : "Voir toutes nos références" — lien texte --color-accent
- **Responsive 375px** : 1 colonne, scroll vertical

### Section 3 — Simulateur teaser
- **Layout** : container, 2 colonnes (55% inputs / 45% preview), gap-xl
- **Fond** : --color-bg (calcaire)
- **Colonne gauche** : titre + 2 inputs (prix, apport) + bouton "Simuler en détail"
- **Colonne droite** : aperçu résultat (cashflow estimé, rendement brut) sur fond --color-bg-accent (#1B3A5C)
- **Spacing** : padding-y spacing-xxl
- **Responsive 375px** : stack vertical, inputs au-dessus, preview en dessous

### Section 4 — Process
- **Layout** : container, 6 ProcessStep en ligne, connectés par ligne horizontale --color-border
- **Fond** : --color-bg-dark (#0B0B0B)
- **Spacing** : padding-y spacing-xxl
- **Responsive 768px** : grille 3×2
- **Responsive 375px** : 1 colonne, ligne verticale de connexion

### Section 5 — Confiance / Groupe Versi
- **Layout** : full-width, fond --color-bg-accent (#1B3A5C), texte --color-text-inverse
- **Contenu** : "Groupe Versi" + chiffres en gros (text-display) + lien versi.fr
- **Chiffres** : 21 (appartements) | 3,2M€ (volume) | 3 (fondateurs)
- **Spacing** : padding-y spacing-xl
- **Responsive 375px** : chiffres en stack vertical

---

## 2. Comment ça marche (ProcessPage)

### Section 1 — Hero léger
- **Layout** : container, fond --color-bg, padding-y spacing-xl
- **Contenu** : titre page (text-heading-xl uppercase), sous-titre descriptif

### Section 2 — 6 étapes détaillées
- **Layout** : container, étapes en alternance gauche/droite (numéro + titre à gauche, description à droite, puis inversé)
- **Chaque étape** : numéro (cercle 64px --color-bg-accent), titre (text-heading-md), description (text-body-lg), liste "Inclus" (checkmarks), durée estimée (badge)
- **Séparateur** : ligne verticale --color-border entre chaque étape
- **Spacing** : spacing-xxl entre chaque étape
- **Responsive 375px** : stack vertical, numéro au-dessus du texte, pas d'alternance

### Section 3 — CTA
- **Layout** : container centré, fond --color-bg-accent, padding spacing-xl, radius-lg
- **Contenu** : "Prêt à investir ?" + CTA "S'inscrire sur la liste d'attente"
- **Responsive** : pleine largeur, CTA pleine largeur

---

## 3. Nos services (ServicesPage)

### Section 1 — Hero léger
- **Layout** : identique à ProcessPage

### Section 2 — 6 ServiceCards
- **Layout** : container, grille 2×3, gap-lg
- **Composant** : ServiceCard (voir design-system section 3.5)
- **Responsive 768px** : 2 colonnes
- **Responsive 375px** : 1 colonne

### Section 3 — Bandeau honoraires
- **Layout** : full-width, fond --color-bg-dark, texte --color-text-inverse, centré
- **Contenu** : "5% du prix d'acquisition. Facturés à l'investisseur. Zéro côté vendeur."
- **Typographie** : text-heading-md
- **Spacing** : padding-y spacing-lg

### Section 4 — CTA
- **Identique** à ProcessPage section 3

---

## 4. Simulateur (SimulateurPage)

### Section 1 — Hero léger
- **Titre** : "Simulez votre investissement"

### Section 2 — SimulateurCard
- **Layout** : container, SimulateurCard (voir design-system section 3.1)
- **2 colonnes desktop** : formulaire (fond --color-bg-card) + résultats (fond --color-bg-accent)
- **Bouton "Scénario prudent"** : style secondary, sous les résultats
- **Disclaimer** : sous la card, text-body-xs --color-text-muted

### Section 3 — CTA post-résultat
- **Layout** : container centré
- **Contenu** : "Ces chiffres vous intéressent ?" + CTA inscription
- **Fond** : --color-bg
- **Responsive 375px** : stack, CTA pleine largeur

---

## 5. Références (ReferencesPage)

### Section 1 — Hero léger + intro
- **Titre** + texte intro (2-3 lignes)

### Section 2 — Grille références
- **Layout** : container, grille 2 colonnes, gap-lg
- **Composant** : 5× ReferenceCard
- **État vide** : message centré "Nos références arrivent bientôt" + CTA inscription
- **Image par card** : placeholder (fond uni --color-bg-accent avec icône immeuble, ou photo stock si disponible)
- **Responsive 375px** : 1 colonne

---

## 6. Équipe (EquipePage)

### Section 1 — Hero léger
- **Titre** : "L'équipe"

### Section 2 — 3 fondateurs
- **Layout** : container, 3 colonnes, gap-lg
- **Composant** : TeamCard (identique versi.fr — photo, nom, titre "Co-fondateur", bio, LinkedIn)
- **Photos** : src/assets/team/ (max.png, thomas.png, carl.png)
- **Ordre** : Maxime → Thomas → Carl
- **Responsive 375px** : 1 colonne

### Section 3 — Groupe Versi
- **Layout** : full-width, fond --color-bg-accent (#1B3A5C), texte --color-text-inverse
- **Contenu** : "Versi Invest est une entité du Groupe Versi" + chiffres + CTA lien versi.fr
- **Responsive** : identique section Confiance homepage

---

## 7. Contact / Liste d'attente (ContactPage)

### Section 1 — Hero léger
- **Titre** : "Rejoignez la liste d'attente"

### Section 2 — Formulaire
- **Layout** : container, 2 colonnes (45% texte / 55% formulaire), gap-xl
- **Colonne gauche** : pourquoi s'inscrire (3 bullet points), contact@versi.fr, délai de réponse
- **Colonne droite** : WaitlistForm (voir design-system section 3.3)
- **Responsive 375px** : stack vertical, texte au-dessus, formulaire en dessous

---

## 8. Blog (BlogPage + BlogArticlePage)

### Page liste
- **Layout** : container, grille 2 colonnes, gap-lg
- **Chaque article** : card avec image (ratio 16:9), titre, extrait, date
- **État vide** : message centré "Articles à venir"
- **Responsive 375px** : 1 colonne

### Page article
- **Layout** : colonne unique centrée, max-width 720px, padding-x 24px
- **Image hero article** : pleine largeur colonne, ratio 16:9
- **Typographie** : text-body-lg pour le contenu, text-heading-lg pour le titre
- **Articles suggérés** : 2 cards en bas (grille 2 colonnes → 1 col mobile)

---

## 9. Pages légales (MentionsLegales, PolitiqueConfidentialite)

- **Layout** : colonne unique centrée, max-width 720px
- **Typographie** : text-body-md, titres text-heading-sm
- **Nav + Footer** : identiques à toutes les pages (jamais de mini-nav isolé — learning versi-s2)

---

**Handoff → @fullstack**
- Fichiers produits : `docs/design/vi2-page-compositions.md`
- Décisions prises : 9 pages composées, layouts explicites par section, images spécifiées, responsive documenté
- Points d'attention :
  - Le hero utilise une photo architecturale en background (opacity 0.15) — prévoir un fallback fond uni si pas de photo
  - La section Confiance et le bandeau Groupe Versi utilisent --color-bg-accent (#1B3A5C) — le bleu profond propre à Versi Invest
  - Les ReferenceCards en état vide doivent afficher un message + CTA, pas un écran blanc
  - Les pages légales utilisent Nav + Footer du site principal (JAMAIS de mini-nav)
