# Wireframes — versi.fr

> Produit par @ux | Date : 2026-04-08
> Référence : functional-specs.md, personas.md, user-flows.md
> Site one-page React. Breakpoints : 375px (mobile) / 768px (tablette) / 1280px (desktop).
> Format compact — chaque section = layout desktop + variante mobile + hiérarchie visuelle + 1 recommandation UX max.

---

## Navigation sticky

**Pattern desktop** : barre horizontale full-width, 3 zones (logo gauche | items centre | CTA droite)

```
[VERSI]          VISION  ACTIVITÉS  ÉQUIPE  IMPLANTATION  CONTACT          [NOUS CONTACTER]
```

- Hauteur : 72px desktop / 64px mobile
- État sur Hero : fond transparent, texte `#F7F5F2`
- État après Hero : fond `#1A1A1A`, texte `#F7F5F2`, transition 300ms
- Section active : `border-bottom: 1px solid #C8B9A6` sur l'item actif (scroll spy via IntersectionObserver)
- Hiérarchie visuelle : VERSI (logotype) > CTA "NOUS CONTACTER" (bouton outline) > items nav (liens texte)

**Mobile (375px)** : logo gauche + hamburger droite (44x44px). Items masqués. Overlay plein écran au clic hamburger, items en H2 centrés.

**Recommandation UX** : le CTA "NOUS CONTACTER" doit rester visible même après scroll — c'est le raccourci de conversion de Laurent. Ne jamais le masquer sur desktop.

---

## Section 1 — Hero

**Pattern desktop (1280px)** : full-width, 100vh, fond image architecturale + overlay gradient sombre

```
┌─────────────────────────────────────────────────────┐
│  [overlay gradient #0B0B0B 55%→70%]                 │
│                                                     │
│         HOLDING IMMOBILIÈRE INTÉGRÉE                │
│     (label 13px, uppercase, opacity 0.6)            │
│                                                     │
│    Quatre métiers.                                  │
│    Un cycle maîtrisé.                               │
│    (H1 56px, font-weight 300, uppercase)            │
│                                                     │
│    Acquisition. Transformation. Structuration.      │
│    Versi opère l'ensemble du cycle — pour des       │
│    opérations sans déperdition.                     │
│    (corps 18px, max-width 560px, centré)            │
│                                                     │
│    [DÉCOUVRIR NOS ACTIVITÉS]    NOUS CONTACTER →    │
│    (bouton outline blanc)       (lien texte)        │
│                                                     │
│                      ↓ (chevron animé)              │
└─────────────────────────────────────────────────────┘
```

- Layout : contenu centré verticalement et horizontalement, colonne unique, max-width 760px
- Ordre DOM : surtitre → H1 → sous-titre → CTAs → scroll hint
- Hiérarchie visuelle : H1 > sous-titre > CTA principal > CTA secondaire > scroll hint

**Mobile (375px)** : même ordre, H1 passe à 36px, sous-titre 16px, CTAs en stack vertical (CTA principal au-dessus), scroll hint conservé.

**Recommandation UX** : fade-in séquentiel (surtitre → H1 → sous-titre → CTAs, delay de 150ms entre chaque). Désactivé si `prefers-reduced-motion`. Crée une impression de "site vivant" sans animation agressive.

---

## Section 2 — Mission (VISION)

**Pattern desktop (1280px)** : split 60/40, fond `#F7F5F2`

```
┌──────────────────────────────┬─────────────────┐
│ VISION (label 13px muted)    │   35+           │
│                              │   Actifs gérés  │
│ Un opérateur intégré.        │   ─────────     │
│ Quatre métiers. Un cycle.    │   3             │
│ (H2 36px, font-weight 300)   │   Immeubles     │
│                              │   ─────────     │
│ [paragraphe 1 — 18px]        │   4             │
│ Versi est une holding...     │   Métiers       │
│                              │   intégrés      │
│ [paragraphe 2 — 18px]        │                 │
│ Là où les grands...          │                 │
└──────────────────────────────┴─────────────────┘
```

- Col gauche (60%) : label + H2 + 2 paragraphes
- Col droite (40%) : 3 stats empilées verticalement, séparées par `1px solid #D9D4CE`
- Chiffres : 48px, font-weight 200. Labels : 13px, muted, uppercase
- Hiérarchie visuelle : H2 > chiffres (48px) > paragraphes > labels stats

**Mobile (375px)** : stack vertical. Ordre : label → H2 → paragraphes → stats en ligne horizontale (les 3 côte à côte, taille réduite 36px).

**Recommandation UX** : les chiffres (35+, 3, 4) sont le seul "proof point" de cette section — leur taille (48px) doit les rendre immédiatement visibles, même sur un scan rapide de Laurent.

---

## Section 3 — Activités

**Pattern desktop (1280px)** : grille 4 colonnes égales, fond `#F7F5F2`

```
ACTIVITÉS (label)
Quatre métiers. Un cycle maîtrisé. (H2)

┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ MARCHAND     │ │ STRUCTURATION│ │ FONCIÈRE     │ │ INGÉNIERIE   │
│ DE BIENS     │ │ D'INVEST.    │ │              │ │ FINANCIÈRE   │
│ (label 13px) │ │ (label 13px) │ │ (label 13px) │ │ (label 13px) │
│              │ │              │ │              │ │              │
│ Versi        │ │ Versi Invest │ │ Versi        │ │ Versi        │
│ Développement│ │              │ │ Capital      │ │ Finance      │
│ (H3 20px)    │ │ (H3 20px)   │ │ (H3 20px)    │ │ (H3 20px)    │
│              │ │              │ │              │ │              │
│ [corps 15px] │ │ [corps 15px] │ │ [corps 15px] │ │ [corps 15px] │
│ Acquisition  │ │ Montage et   │ │ Détention et │ │ Structuration│
│ et transfor- │ │ structuration│ │ valorisation │ │ financière   │
│ mation...    │ │ d'opérations │ │ long terme...│ │ des opér...  │
│              │ │              │ │              │ │              │
│ Accéder au   │ │ Accéder au   │ │ Accéder au   │ │ Accéder au   │
│ site → (gris)│ │ site → (gris)│ │ site → (gris)│ │ site → (gris)│
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

- Cartes : fond blanc, bordure `1px solid #D9D4CE`, padding 32px, `border-radius: 4px`
- CTAs inactifs (V1) : texte muted, curseur `not-allowed`, tooltip "Site en cours de construction"
- Fade-in séquentiel : délai 0/100/200/300ms par carte
- Hiérarchie visuelle : H3 nom entité > label métier > corps > CTA

**Mobile (375px)** : 1 colonne, cartes empilées. Même anatomie, padding 24px.
**Tablette (768px)** : grille 2×2.

**Recommandation UX** : les CTAs "Accéder au site" doivent être visuellement distincts de l'état actif vs inactif. Ne pas les masquer — leur présence (même désactivée) confirme que des sites d'entités existent et seront accessibles.

---

## Section 4 — Approche

**Pattern desktop (1280px)** : 4 colonnes avec connecteurs, fond `#0B0B0B` (section sombre)

```
APPROCHE (label, texte clair)
Notre méthode. (H2)
Quatre étapes. Un cycle reproductible. (sous-titre)

┌──────────┐ → ┌──────────┐ → ┌──────────┐ → ┌──────────┐
│ 01       │   │ 02       │   │ 03       │   │ 04       │
│ [icône]  │   │ [icône]  │   │ [icône]  │   │ [icône]  │
│ SOURCER  │   │ ANALYSER │   │ TRANSFORM│   │ OPÉRER   │
│ (H3 20px)│   │ (H3 20px)│   │ (H3 20px)│   │ (H3 20px)│
│          │   │          │   │          │   │          │
│ [corps   │   │ [corps   │   │ [corps   │   │ [corps   │
│ 15px     │   │ 15px     │   │ 15px     │   │ 15px     │
│ texte    │   │ texte    │   │ texte    │   │ texte    │
│ inverse] │   │ inverse] │   │ inverse] │   │ inverse] │
└──────────┘   └──────────┘   └──────────┘   └──────────┘
```

- Numéros 01–04 : 64px, font-weight 200, `#F7F5F2`
- Connecteurs `→` : `1px solid rgba(255,255,255,0.2)` + flèche en `#C8B9A6`
- Texte sur fond sombre : `#F7F5F2` (contraste ≥ 4.5:1)
- Hiérarchie visuelle : numéro 01–04 (64px) > titre étape > corps

**Mobile (375px)** : stack vertical, connecteurs remplacés par ligne verticale `1px solid rgba(255,255,255,0.15)`. Numéros 48px.
**Tablette (768px)** : grille 2×2.

**Recommandation UX** : les numéros 01–04 sont plus efficaces que des icônes SVG sur ce positionnement — ils transmettent la rigueur et la méthode documentée que Laurent cherche. Privilégier les chiffres si le temps de design est limité.

---

## Section 5 — Implantation

**Pattern desktop (1280px)** : split 50/50, fond `#F7F5F2`

```
┌──────────────────────────┬──────────────────────────┐
│ IMPLANTATION (label)     │     [Carte SVG France]   │
│                          │     max-width 500px      │
│ Paris. Lille.            │                          │
│ Et les métropoles        │   • Paris (accent plein) │
│ françaises.              │   • Lille (accent plein) │
│ (H2 36px)                │   ○ Lyon (outline)       │
│                          │   ○ Bordeaux (outline)   │
│ [sous-titre 16px]        │   ○ Marseille (outline)  │
│                          │                          │
│ Légende :                │                          │
│ ● Présence active        │                          │
│ ○ Zone d'extension       │                          │
└──────────────────────────┴──────────────────────────┘
```

- Carte SVG inline : France métropolitaine, fond transparent, contour `#D9D4CE`
- Marqueurs actifs : cercle plein `#C8B9A6` rayon 6px + tooltip au hover (nom de ville)
- Marqueurs extension : cercle outline `#D9D4CE` rayon 4px
- Hiérarchie visuelle : H2 > carte (côté droit, impact visuel) > légende > sous-titre

**Mobile (375px)** : stack vertical. Ordre : label → H2 → sous-titre → carte SVG (max-width 300px, centrée) → légende.

**Recommandation UX** : fallback obligatoire si SVG ne charge pas — afficher "Paris — Lille — Métropoles françaises" en texte avec le même espacement. Laurent ne doit jamais voir une zone blanche vide.

---

## Section 6 — Équipe

**Pattern desktop (1280px)** : grille 3 colonnes égales, fond `#F7F5F2`

```
ÉQUIPE (label)
Trois associés. Des parcours vérifiables. (H2)
[sous-titre — "Chaque fondateur a constitué..."]

┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│  [Photo 160px] │ │  [Photo 160px] │ │  [Photo 160px] │
│  (carré, cover)│ │  (carré, cover)│ │  (carré, cover)│
│                │ │                │ │                │
│ THOMAS ISSA    │ │ MAXIME LEMOINE │ │ CARL S-N.      │
│ Co-fondateur   │ │ Co-fondateur   │ │ Co-fondateur   │
│ (H3 + label)   │ │ (H3 + label)   │ │ (H3 + label)   │
│                │ │                │ │                │
│ Marketing      │ │ Commercial &   │ │ Marketing      │
│ Strategy &     │ │ Sales Strategy │ │ Strategy &     │
│ Operations     │ │                │ │ Croissance     │
│ (15px)         │ │ (15px)         │ │ (15px)         │
│                │ │                │ │                │
│ Co-fondateur   │ │ Ex-European    │ │ Head of Mktg   │
│ TEOS et Sarani │ │ Sales Manager, │ │ Inbolt.        │
│ 11 biens       │ │ Sony. 3 imm.,  │ │ Co-fond. Sarani│
│ locatifs Paris │ │ 24 contrats.   │ │ Ex-Algolia.    │
│ (14px, muted)  │ │ (14px, muted)  │ │ (14px, muted)  │
│                │ │                │ │                │
│ [in] (16px)    │ │ [in] (16px)    │ │ [in] (16px)    │
└────────────────┘ └────────────────┘ └────────────────┘
```

- Parité absolue : 3 cartes identiques, même taille, même hiérarchie, même layout
- Photos : carré 160px, `object-fit: cover`, pas de border-radius (style architectural)
- Fallback photo : initiales sur fond `#1A1A1A` (ex : "TI", "ML", "CS")
- Icône LinkedIn : masquée si URL non configurée (pas de lien mort)
- Hover carte : `border-color: #C8B9A6`, transition 200ms
- Hiérarchie visuelle : photo > nom (H3) > "Co-fondateur" (label) > spécialité > track record > LinkedIn

**Mobile (375px)** : 1 colonne, cartes empilées. Photo 120px. Même anatomie.

**Recommandation UX** : la section Équipe est le point de conversion critique pour Laurent. Elle doit être atteignable en < 3 scroll depuis le Hero. Les photos et les noms doivent être visibles au premier coup d'oeil — pas de contenu caché sous un fold mobile.

---

## Section 7 — Contact

**Pattern desktop (1280px)** : split 40/60, fond `#1A1A1A` (section sombre)

```
┌──────────────────────┬───────────────────────────────┐
│ CONTACT (label)      │ ┌ Formulaire ─────────────── ┐│
│                      │ │ Nom *                       ││
│ Un projet.           │ │ [_________________________] ││
│ Un actif.            │ │                             ││
│ Contactez-nous.      │ │ Email *                     ││
│ (H2 36px)            │ │ [_________________________] ││
│                      │ │                             ││
│ [sous-titre 16px]    │ │ Téléphone (optionnel)       ││
│ Vous avez un actif   │ │ [_________________________] ││
│ à céder, un projet   │ │                             ││
│ d'investissement...  │ │ Message *                   ││
│ Nous répondons       │ │ [                           ││
│ sous 72h.            │ │  textarea 120px min         ││
│                      │ │                             ]││
│ contact@versi.fr     │ │ [ENVOYER →]                 ││
│ (lien mailto, clair) │ └─────────────────────────────┘│
└──────────────────────┴───────────────────────────────┘
```

- Fond : `#1A1A1A`, texte `#F7F5F2`
- Col gauche (40%) : label + H2 + sous-titre + email direct mailto
- Col droite (60%) : formulaire sur fond légèrement différencié (`#242424`) ou même fond
- Formulaire : 4 champs (Nom*, Email*, Téléphone optionnel, Message*) + bouton "ENVOYER →"
- Email `contact@versi.fr` : affiché en clair, lien `mailto:`, `#C8B9A6` au hover
- Hiérarchie visuelle : H2 > email direct (fallback visible) > formulaire

**Validation inline** : erreur champ par champ (pas de page rechargée). Message succès : "Votre message a bien été envoyé. Nous vous répondons sous 72h." Message erreur Formspree KO : "Votre message n'a pas pu être envoyé — écrivez-nous directement à contact@versi.fr."

**Mobile (375px)** : stack vertical. Ordre : label → H2 → sous-titre → email direct → formulaire. Formulaire full-width.

**Recommandation UX** : afficher l'email `contact@versi.fr` en clair dans la col gauche, pas seulement dans le message d'erreur. Pierre préfère l'email direct au formulaire — lui donner les deux options visibles sans qu'il ait à chercher.

---

## Footer

**Pattern desktop (1280px)** : barre horizontale, fond `#0B0B0B`

```
┌─────────────────────────────────────────────────────────────────┐
│ VERSI                  Mentions légales | Politique de          │
│ © 2026 Versi           confidentialité                          │
│ Holding immobilière    contact@versi.fr                         │
└─────────────────────────────────────────────────────────────────┘
```

- 3 zones : logo + copyright (gauche) | liens légaux (centre) | email (droite)
- Fond `#0B0B0B`, texte `#F7F5F2`, muted pour les liens légaux
- Pas de réseaux sociaux (pas de page Versi active en V1)
- Mentions légales et Politique de confidentialité : liens texte, ouvrent dans le même onglet (pages légales à créer)

**Mobile (375px)** : stack vertical centré. Ordre : logo → liens légaux → email → copyright.

---

## Audit heuristique Nielsen — versi.fr

| # | Heuristique | Vérification | Verdict |
|---|---|---|---|
| H1 | Visibilité état système | Nav scroll spy (section active surlignée), état formulaire (loading/succès/erreur) | PASS |
| H2 | Correspondance monde réel | Vocabulaire métier immobilier (marchand de biens, foncière, structuration). Icônes standards (LinkedIn, hamburger) | PASS |
| H3 | Contrôle et liberté | Overlay mobile fermable (X + Escape). Formulaire annulable. Pas d'action irréversible | PASS |
| H4 | Cohérence et standards | Même typographie, même palette, même comportement des cartes sur tout le site | PASS |
| H5 | Prévention des erreurs | Validation inline formulaire avant envoi. Tooltip liens inactifs (entités) | PASS |
| H6 | Reconnaissance plutôt que rappel | Nav sticky toujours visible — pas besoin de "se souvenir" où on est | PASS |
| H7 | Flexibilité et efficacité | CTA "NOUS CONTACTER" en nav (raccourci). Ancres directes pour Pierre qui saute les sections | PASS |
| H8 | Design minimaliste | Chaque section a 1 objectif. Pas de widgets, pas de sidebar, pas de contenu décoratif | PASS |
| H9 | Aide correction erreurs | Messages d'erreur en langage humain + email fallback si Formspree KO | PASS |
| H10 | Aide et documentation | Tooltips sur liens inactifs. Labels "optionnel" sur téléphone. Placeholder exemples dans formulaire | PASS |

---

**Handoff → @design**

Fichiers produits :
- `/home/user/Versi/docs/ux/user-flows.md`
- `/home/user/Versi/docs/ux/wireframes.md` (ce fichier)

Décisions UX prises :
- Layout Mission : split 60/40 (texte/stats) — stats en colonne sur desktop, en ligne sur mobile
- Layout Activités : grille 4 colonnes desktop, 2×2 tablette, 1 colonne mobile
- Layout Approche : section sombre (#0B0B0B), 4 colonnes avec connecteurs, numéros 01–04 préférés aux icônes
- Layout Équipe : 3 colonnes égales, parité absolue, photos carrées sans border-radius
- Layout Contact : split 40/60 (texte+email/formulaire), fond sombre (#1A1A1A)
- Email `contact@versi.fr` visible en clair dans la col gauche de #contact (pas seulement en fallback)

Points d'attention pour @design :
- Section Approche : fond sombre contraste avec les sections claires adjacentes — effet visuel fort, le vérifier sur screenshot
- Section Équipe : photos carrées (pas rondes) — style architectural cohérent avec le brief fondateur
- Mobile Équipe : les 3 cartes empilées doivent rester lisibles sans zoom — vérifier la taille des photos (120px) et des noms

Points d'attention pour @fullstack :
- Nav : scroll spy via IntersectionObserver (chaque section), offset 80px sur les ancres
- Activités : constante `ENTITY_SITES_ACTIVE` dans `src/config/entities.ts` pour activer/désactiver les liens entités
- Équipe : constante `TEAM` dans `src/config/team.ts` avec URLs LinkedIn (peut être `null` si non encore disponible)
- Contact : fallback email visible si Formspree répond avec erreur HTTP — état erreur formulaire obligatoire
- Formulaire : champ honeypot `website` masqué en CSS (`display: none; position: absolute; left: -9999px`)
