# Copy landing page — versi.fr

> Produit par @copywriter | Date : 2026-04-08
> [Framework : AIDA — Attention (Hero) → Interest (Mission/Activités) → Desire (Approche/Équipe) → Action (Contact)]
> [Conscience : Solution-Aware — Laurent sait ce qu'est un opérateur intégré, il évalue si Versi vaut son temps]
> Objections traitées : "Vous êtes trop petits" (§Approche — track record 35+), "Je ne vous connais pas" (§Équipe — profils vérifiables), "Pourquoi pas une SCPI ?" (§Mission — opération en direct)
> Méthode : objections traitées implicitement via social proof (chiffres §Mission) et profils fondateurs (§Équipe)
> Calibration sectorielle : registre opérateur institutionnel — dense, factuel, zéro fioritures. Pas de fonds de pension, pas d'agence. Le milieu.
> Références : docs/strategy/brand-platform.md, docs/strategy/personas.md, docs/product/functional-specs.md, docs/design/page-compositions.md

---

## Navigation

| Élément | Texte | Token typo |
|---|---|---|
| Logo | VERSI | label 13px, uppercase, tracking 0.1em |
| Item 1 | VISION | label 13px, uppercase |
| Item 2 | ACTIVITÉS | label 13px, uppercase |
| Item 3 | ÉQUIPE | label 13px, uppercase |
| Item 4 | IMPLANTATION | label 13px, uppercase |
| Item 5 | CONTACT | label 13px, uppercase |
| CTA nav | NOUS CONTACTER | label 13px, uppercase, outline blanc 1px |

---

## Section Hero (`#hero`)

> [Framework : AIDA — Attention] [Niveau conscience : Solution-Aware]

**Surtitre** (label 13px, uppercase, color-text-inverse opacity 0.6)
```
HOLDING IMMOBILIÈRE INTÉGRÉE
```

**H1** (56px light 300, uppercase, tracking 0.08em, color-text-inverse)
```
Quatre métiers.
Un cycle maîtrisé.
```

Note tagline : la tagline @creative-strategy "Le cycle immobilier complet. Maîtrisé en interne." a été rejetée par le fondateur (trop corporate, trop froide). La nouvelle version "Quatre métiers. Un cycle maîtrisé." conserve le territoire sémantique (cycle, maîtrise) en adoptant la structure nominale courte qui donne du caractère sans vider de substance. Elle dit ce que Versi fait — pas ce que Versi "est". Test : peut-elle figurer sur un site concurrent ? Non — elle suppose une structure à quatre entités complémentaires.

**Sous-titre** (18px, max-width 560px, color-text-inverse opacity 0.85)
```
Versi acquiert, transforme, détient et structure des actifs immobiliers en France.
De l'identification d'une opportunité à sa structuration financière — en interne.
```

**CTA principal** (label 13px, uppercase, tracking 0.1em, outline color-text-inverse)
```
DÉCOUVRIR NOS ACTIVITÉS
```
→ Ancre : `#activites`

**CTA secondaire** (13px, uppercase, color-text-inverse opacity 0.7)
```
NOUS CONTACTER →
```
→ Ancre : `#contact`

---

## Section Mission (`#mission`)

> [Framework : AIDA — Interest] [Niveau conscience : Solution-Aware]

**Label** (13px, uppercase, color-text-muted)
```
VISION
```

**H2** (36px light 300, uppercase, tracking 0.06em, color-text-primary)
```
Un opérateur intégré.
Quatre métiers. Un cycle.
```

**Corps — paragraphe 1** (18px, color-text-primary)
```
Versi est une holding immobilière qui maîtrise l'ensemble du cycle d'une opération — de l'identification de l'actif à sa structuration financière finale, sans passer la main à chaque étape.
```

**Corps — paragraphe 2** (16px, color-text-primary)
```
Nous n'arbitrons pas. Nous opérons. Chaque décision critique reste en interne, portée par les mêmes fondateurs du début à la fin.
```

**Stats col droite** (chiffre 48px thin 200 / label 13px uppercase color-text-muted)

| Chiffre | Label |
|---|---|
| 35+ | ACTIFS GÉRÉS EN DIRECT |
| 3 | IMMEUBLES EN PORTEFEUILLE |
| 4 | MÉTIERS INTÉGRÉS |

---

## Section Activités (`#activites`)

> [Framework : FAB — Feature → Advantage → Benefit] [Niveau conscience : Solution-Aware]

**Label** (13px, uppercase, color-text-muted)
```
ACTIVITÉS
```

**H2** (36px light 300, uppercase, tracking 0.06em, color-text-primary)
```
Quatre métiers. Un cycle maîtrisé.
```

---

**Carte 1 — Versi Développement**

Label métier (13px, uppercase, color-text-muted)
```
MARCHAND DE BIENS
```

Titre entité (20px, uppercase, tracking 0.04em, color-text-primary)
```
Versi Développement
```

Corps (15px, color-text-primary)
```
Acquisition et transformation d'actifs résidentiels et mixtes en France. Versi Développement identifie, négocie et pilote la transformation en direct — de la due diligence au dépôt de permis.
```

CTA (13px, uppercase, color-text-muted — inactif V1)
```
ACCÉDER AU SITE →
```
Note intégration : lien vers versi-developpement.fr (hors scope V1 — état désactivé)

---

**Carte 2 — Versi Invest**

Label métier (13px, uppercase, color-text-muted)
```
STRUCTURATION D'INVESTISSEMENT
```

Titre entité (20px, uppercase, tracking 0.04em, color-text-primary)
```
Versi Invest
```

Corps (15px, color-text-primary)
```
Montage et structuration d'opérations en co-investissement. Versi Invest structure les véhicules d'investissement adaptés à chaque opération — ticket, fiscalité, horizon de sortie.
```

CTA (13px, uppercase, color-text-muted — inactif V1)
```
ACCÉDER AU SITE →
```

---

**Carte 3 — Versi Capital**

Label métier (13px, uppercase, color-text-muted)
```
FONCIÈRE
```

Titre entité (20px, uppercase, tracking 0.04em, color-text-primary)
```
Versi Capital
```

Corps (15px, color-text-primary)
```
Détention longue d'actifs à potentiel de valorisation. Versi Capital constitue et gère un portefeuille foncier — pour son compte propre et en partenariat avec des co-investisseurs sélectifs.
```

CTA (13px, uppercase, color-text-muted — inactif V1)
```
ACCÉDER AU SITE →
```

---

**Carte 4 — Versi Finance**

Label métier (13px, uppercase, color-text-muted)
```
INGÉNIERIE FINANCIÈRE
```

Titre entité (20px, uppercase, tracking 0.04em, color-text-primary)
```
Versi Finance
```

Corps (15px, color-text-primary)
```
Structuration financière et optimisation patrimoniale des opérations Versi. Du montage du financement bancaire à l'optimisation fiscale — chaque opération est structurée avant d'être lancée.
```

CTA (13px, uppercase, color-text-muted — inactif V1)
```
ACCÉDER AU SITE →
```

---

## Section Approche (`#approche`)

> [Framework : FAB — Feature → Advantage → Benefit] [Fond sombre — color-bg-dark #0B0B0B]

**Label** (13px, uppercase, color-text-inverse opacity 0.5)
```
APPROCHE
```

**H2** (36px light 300, uppercase, tracking 0.06em, color-text-inverse)
```
Notre méthode.
```

**Sous-titre** (18px, color-text-inverse opacity 0.7)
```
Quatre étapes. Un cycle reproductible.
```

---

**Étape 01 — Sourcer** (numéro 64px thin 200, opacity 0.15 / titre 20px uppercase / corps 15px opacity 0.8)

Titre :
```
SOURCER
```
Corps :
```
Accès direct aux opportunités — réseau terrain, signaux off-market, sourcing en amont des portails publics.
```

---

**Étape 02 — Analyser**

Titre :
```
ANALYSER
```
Corps :
```
Due diligence interne : rentabilité, potentiel de transformation, risque de sortie. Décision en semaines, pas en trimestres.
```

---

**Étape 03 — Transformer**

Titre :
```
TRANSFORMER
```
Corps :
```
Maîtrise d'ouvrage en direct. Versi pilote les travaux sans intermédiaire — chaque arbitrage technique reste en interne.
```

---

**Étape 04 — Opérer**

Titre :
```
OPÉRER
```
Corps :
```
Gestion locative ou revente selon la stratégie de sortie définie dès l'acquisition. Pas d'improvisation en fin de cycle.
```

---

## Section Implantation (`#implantation`)

**Label** (13px, uppercase, color-text-muted)
```
IMPLANTATION
```

**H2** (36px light 300, uppercase, tracking 0.06em, color-text-primary)
```
Paris. Lille.
Et les métropoles françaises.
```

**Sous-titre** (18px, color-text-primary)
```
Versi opère sur des marchés où la densité et la demande locative justifient une transformation.
```

**Légende carte** (13px, color-text-muted)
```
● Présence active
○ Zone d'extension
```

---

## Section Équipe (`#equipe`)

> [Framework : StoryBrand — équipe = le Guide] [Aha moment de Laurent : les profils sont vérifiables]

**Label** (13px, uppercase, color-text-muted)
```
ÉQUIPE
```

**H2** (36px light 300, uppercase, tracking 0.06em, color-text-primary)
```
Trois associés.
Des parcours vérifiables.
```

**Sous-titre** (18px, max-width 640px, color-text-primary)
```
Chaque fondateur a construit et géré des actifs avant de construire Versi. Le discours suit la pratique — pas l'inverse.
```

---

**Carte Thomas Issa**

Nom (H3, uppercase, tracking 0.04em, color-text-primary)
```
THOMAS ISSA
```

Titre (13px, uppercase, tracking 0.1em, color-text-muted)
```
Co-fondateur
```

Spécialité (15px, color-text-primary)
```
Marketing strategy & opérations. Co-fondateur TEOS et Sarani.
```

Track record (14px, color-text-muted)
```
11 actifs locatifs à Paris. Pilote l'ensemble des opérations Versi de la sourcing à la livraison.
```

---

**Carte Maxime Lemoine**

Nom (H3, uppercase, tracking 0.04em, color-text-primary)
```
MAXIME LEMOINE
```

Titre (13px, uppercase, tracking 0.1em, color-text-muted)
```
Co-fondateur
```

Spécialité (15px, color-text-primary)
```
Sales strategy & développement commercial. Ex-European Sales Manager Sony.
```

Track record (14px, color-text-muted)
```
3 immeubles en portefeuille, 24 contrats locatifs. Identifie et qualifie les opportunités d'acquisition.
```

---

**Carte Carl Standertskjold-Nordenstam**

Nom (H3, uppercase, tracking 0.04em, color-text-primary)
```
CARL STANDERTSKJOLD-NORDENSTAM
```

Titre (13px, uppercase, tracking 0.1em, color-text-muted)
```
Co-fondateur
```

Spécialité (15px, color-text-primary)
```
Marketing strategy & croissance. Head of Marketing Inbolt. Co-fondateur Sarani.
```

Track record (14px, color-text-muted)
```
Construit la présence de Versi sur les marchés et dans les réseaux de prescripteurs.
```

---

## Section Contact (`#contact`)

> [Framework : AIDA — Action] [Fond sombre — color-bg-dark-alt #1A1A1A]

**Label** (13px, uppercase, color-text-inverse opacity 0.5)
```
CONTACT
```

**H2** (36px light 300, uppercase, tracking 0.06em, color-text-inverse)
```
Un projet. Un actif.
Nous répondons.
```

**Sous-titre** (18px, color-text-inverse opacity 0.8)
```
Vous avez un actif à céder, un projet de co-investissement ou une opportunité à qualifier. Décrivez-le — nous revenons sous 72h.
```

**Email affiché en clair** (16px, mailto, color-accent #C8B9A6)
```
contact@versi.fr
```

---

**Formulaire — labels et placeholder**

| Champ | Label | Placeholder |
|---|---|---|
| Nom | NOM | Votre nom |
| Email | EMAIL | Votre adresse email |
| Téléphone | TÉLÉPHONE (optionnel) | Votre numéro |
| Message | VOTRE MESSAGE | Décrivez votre actif ou votre projet |

Note : labels en uppercase 13px color-text-inverse opacity 0.7 / placeholder en color-text-inverse opacity 0.35

**Bouton envoi** (13px medium, uppercase, tracking 0.1em, fond color-text-inverse, texte color-bg-dark)
```
ENVOYER
```

**Message de succès** (16px, color-text-inverse)
```
Message reçu. Nous vous répondons sous 72h.
```

**Message d'erreur** (14px, color-accent)
```
L'envoi a échoué. Écrivez directement à contact@versi.fr.
```

---

## Footer

**Logo** (13px, uppercase, tracking 0.1em, color-text-inverse)
```
VERSI
```

**Baseline** (13px, color-text-muted)
```
Holding immobilière intégrée
```

**Email** (14px, mailto, color-text-muted → color-text-inverse hover)
```
contact@versi.fr
```

**Entités** (12px, color-text-muted opacity 0.5)
```
Versi Développement · Versi Invest · Versi Capital · Versi Finance
```

**Liens légaux** (12px, color-text-muted)
```
Mentions légales · Politique de confidentialité
```

**Copyright** (12px, color-text-muted)
```
© 2026 Versi. Tous droits réservés.
```

---

## Meta SEO

**Title tag** (< 60 caractères)
```
Versi — Holding immobilière intégrée | Paris & Lille
```

**Meta description** (< 155 caractères)
```
Versi acquiert, transforme et structure des actifs immobiliers en France. Quatre métiers intégrés, un cycle maîtrisé en interne. Co-investissement et mandats.
```

Note SEO : keyword-map.md absent — intégration SEO partielle. Mots-clés naturellement présents : "holding immobilière", "opérateur intégré", "marchand de biens", "co-investissement", "actifs immobiliers France". Signaler à @seo pour optimisation.
[MOT-CLÉ SEO À INTÉGRER] : enrichir le meta avec les termes long-tail identifiés par @seo (ex : "opérateur immobilier intégré Paris", "co-investissement immobilier France").

---

## Notes d'intégration pour @fullstack

- Section Hero H1 : le texte est sur 2 lignes (`<br>` entre "Quatre métiers." et "Un cycle maîtrisé.") — voir page-compositions.md
- Section Activités : CTA des 4 cartes en état `disabled` (cursor not-allowed, color-text-muted) en V1 car les sites entités n'existent pas encore
- Section Équipe : 3 photos réelles dans `/Photos/` (thomas.png, max.png, Carl-picture.jfif) — convertir en WebP 400×400px
- Section Contact : formulaire via Formspree (voir functional-specs.md §9) — message succès/erreur gérés côté JS
- Footer entités : texte séparé par `·` (U+00B7, point médian UTF-8 — pas de `&middot;` dans le JSX)
- Tous les caractères accentués en UTF-8 natif (é, è, à, ç, î) — zéro `\uXXXX` dans les strings JS

---

**Handoff → @fullstack**
- Fichiers produits : `/home/user/Versi/docs/copy/landing-page-copy.md` (ce fichier), `/home/user/Versi/docs/copy/brand-voice.md` (existant, conservé)
- Décisions prises : tagline "Quatre métiers. Un cycle maîtrisé." retenue (remplace "Le cycle immobilier complet. Maîtrisé en interne." rejeté par le fondateur) ; vouvoiement systématique ; délai "72h" dans Contact et succès formulaire (à confirmer avec fondateurs) ; CTA nav "NOUS CONTACTER" confirmé ; CTAs entités en état disabled V1
- Formulations non négociables : H2 Équipe "Trois associés. Des parcours vérifiables." (aha moment Laurent) ; H2 Contact "Un projet. Un actif. Nous répondons." (direct, sans "échangeons" ni "n'hésitez pas") ; message succès "Message reçu." (sobre, pas enthousiaste)
- Points d'attention : (1) le délai "72h" est un engagement — confirmer avec Thomas/Maxime/Carl avant mise en ligne. (2) keyword-map.md absent — @seo doit enrichir les meta tags. (3) L'email contact@versi.fr apparaît à deux endroits : section Contact (color-accent, affiché en clair) et Footer (color-text-muted, link mailto) — comportement identique, style différent.
