# Copy final — versi-immobilier.fr

> Produit par @copywriter | Date : 2026-04-10
> Sources : `docs/strategy/vi-full-copy-directions.md`, `docs/strategy/vi-brand-voice-adaptation.md`, `docs/copy/brand-voice.md`
> Usage : référence prête à copier-coller pour @fullstack. Chaque section indique le fichier source à modifier et la chaîne exacte à remplacer.
> Framework : [FAB — Feature → Advantage → Benefit] sur les arguments. [StoryBrand] sur la structure globale (acheteur = héros, Versi = guide).
> Niveau de conscience : [Solution-Aware] — Kévin sait qu'il cherche un bien immobilier, il ne connaît pas encore Versi.
> Objections traitées : prix caché (Bloc 3 arguments), intermédiaire peu fiable (Bloc 1 + TeamTeaser), manque de transparence (Bloc 2 + PropertiesPage sous-titre), indisponibilité du vendeur (TeamTeaser + ContactPage).

---

## RÈGLES FONDAMENTALES (rappel condensé)

- Sujet H1/H2 = le bien ou l'acheteur. Jamais "Versi" en ouverture de titre.
- Vouvoiement systématique.
- Zéro exclamation. Zéro passif. Zéro adjectif auto-décerné.
- Mots proscrits sur ce site : actif, opération, cycle, holding, co-investisseur, structuration, opérateur (sauf mention légale), intégré, instruire, Bienvenue, Découvrez, N'hésitez pas, Expertise, Confiance, Clé en main, Solutions.
- CTA : moins de 6 mots, verbe d'action.

---

## HOMEPAGE

### Hero [NE PAS MODIFIER — VALIDÉ]

```
Surtitre : VERSI IMMOBILIER — MARCHAND DE BIENS
H1 ligne 1 : Peu de biens.
H1 ligne 2 : Pas d'approximation.
Sous-titre : Des appartements sélectionnés, préparés, disponibles.
CTA : VOIR LES BIENS [ancre #biens]
```

Fichier source : `versi-immobilier/src/components/Hero.jsx` — NE PAS TOUCHER.

---

### Arguments (3 blocs)

[Framework : FAB]

```
BLOC 1
Titre : Vous achetez à la source.
Corps : Pas d'intermédiaire entre vous et le bien. Les trois fondateurs ont acheté et piloté chaque appartement — ils en connaissent l'historique complet. Vous posez une question — vous obtenez une réponse directe.

BLOC 2
Titre : Rien n'est caché.
Corps : Diagnostics complets. Historique des travaux. Garantie décennale sur les parties structurelles. Vous recevez le dossier complet avant la visite.

BLOC 3
Titre : Le prix affiché est le prix.
Corps : Vente directe du propriétaire à l'acquéreur. Pas de commission d'agence à votre charge.
```

Note @copywriter : "connaissent l'historique complet" est plus factuel que "connaissent chaque détail" (trop vague, légèrement commercial). La reformulation renforce la promesse de transparence sans superlatif.

Fichier source : `versi-immobilier/src/components/Arguments.jsx`
Constante à modifier : `ARGUMENTS` (lignes 4-20)

---

### AvailableProperties

```
Titre de section (H2) : Ce que nous proposons aujourd'hui.
[Variante B pour test — si le titre semble encore centré "Versi" : "Les biens du moment." — 4 mots, sujet = les biens, temporalité préservée. Soumettre à Thomas pour arbitrage.]

CTA liste complète : Voir tous les biens
[était : "Tous nos biens"]

ÉTAT VIDE (aucun bien disponible) :
  Ligne 1 : Nos biens partent vite.
  Ligne 2 : Inscrivez-vous pour être notifié en avant-première.
  CTA : Être notifié [→ /contact]
```

Fichier source : `versi-immobilier/src/components/AvailableProperties.jsx`

---

### Stats (3 chiffres)

```
STAT 1
Valeur : 21
Label : appartements rénovés à Lille
[était : "appartements transformés à Lille depuis 2022"]

STAT 2
Valeur : 100%
Label : vendus en direct, sans agence
[CONSERVER — ne pas modifier]

STAT 3
Valeur : 3,2M€
Label : de volume traité depuis 2022
[était : "d'opérations réalisées"]
```

Fichier source : `versi-immobilier/src/components/Stats.jsx`
Constante à modifier : `stats` (lignes 9-12)

---

### TeamTeaser

```
H2 ligne 1 : Vous parlez à celui qui a acheté.
H2 ligne 2 : Pas à un commercial.

Sous-titre : Thomas, Maxime et Carl ont porté chaque bien de l'acquisition à la livraison. Ils font visiter eux-mêmes. Ils répondent en direct.

CTA : Notre approche
[était : "Découvrir notre approche complète"]
```

Fichier source : `versi-immobilier/src/components/TeamTeaser.jsx`

---

### SellerBanner

```
Titre (strong) : Vous avez un bien à céder à Lille.
[Affirmation — point, pas point d'interrogation]

Corps : Versi Immobilier achète en direct, sur fonds propres. Offre ferme sous 7 jours. Aucun mandat, aucune mise en vente prolongée.

CTA : Soumettre votre bien
[était : "Nous parler de votre bien →"]
```

Fichier source : `versi-immobilier/src/components/SellerBanner.jsx`

---

## NAVIGATION

```
Item 1 : BIENS DISPONIBLES    href="/nos-biens"
[était : "BIENS EN VENTE" — href inchangé]

Item 2 : RÉALISATIONS         href="/realisations"    [CONSERVER]
Item 3 : NOTRE APPROCHE       href="/notre-approche"  [CONSERVER]
Item 4 : CONTACT              href="/contact"         [CONSERVER]

CTA desktop : Céder un bien    href="/vendre"          [CONSERVER]
CTA mobile overlay : CÉDER UN BIEN  href="/vendre"     [CONSERVER]
```

Fichier source : `versi-immobilier/src/components/Nav.jsx`
Constante à modifier : `NAV_ITEMS` (ligne 5), item 0 uniquement.

---

## PAGE BIENS — PropertiesPage

```
H1 : Les biens disponibles.
[était : "Nos biens."]

Sous-titre : Appartements et biens mixtes à Lille. Dossier complet — diagnostics, historique, garanties — disponible avant la visite.
[était : "Appartements et maisons rénovés par Versi Immobilier à Lille. Diagnostics complets. Garantie décennale."]

ÉTAT VIDE GLOBAL (PROPERTIES.length === 0) :
  Ligne 1 : Nos biens partent vite.
  Ligne 2 : Laissez-nous votre contact — nous vous prévenons avant la mise en ligne.
  CTA : Être notifié en avant-première  [→ /contact]
[était : "Aucun bien disponible à date. Nos acquisitions vont vite — soyez notifié en avant-première." + CTA "Me tenir informé"]

ÉTAT VIDE APRÈS FILTRE (filtered.length === 0, filtres actifs) :
  Ligne 1 : Aucun bien disponible avec ces critères.
  CTA bouton : Réinitialiser les filtres
[était : "Aucun bien ne correspond à ces critères." — la ligne est correcte, légère reformulation]

SECTION BIENS VENDUS (H2) : Vendus.
[était : "Déjà vendus"]

BANDEAU VENDEUR BAS DE PAGE :
  Ligne 1 : Vous avez un bien à céder ?
  [CONSERVER — déjà correct]
  Ligne 2 : Offre ferme sous 7 jours. Fonds propres. Aucun mandat.
  [était : "Offre ferme sous 7 jours. Aucun mandat, aucune mise en vente prolongée."]
  CTA : Soumettre mon dossier
  [CONSERVER]
```

Fichier source : `versi-immobilier/src/pages/PropertiesPage.jsx`

---

## PAGE CONTACT — ContactPage

```
H1 : Écrivez-nous.
[CONSERVER — intouchable]

Sous-titre : Vous achetez, vous cédez ou vous nous soumettez un dossier. Réponse sous 24h — sans standard, sans assistant.
[était : "vous cherchez un partenaire" → "vous nous soumettez un dossier"]

CORPS INFO-CONTACT (colonne gauche — CONSERVER) :
  "Nous accusons réception sous 24h. Visite organisée sous 72h."
  "Lille et métropole lilloise / Paris — Île-de-France"
  Lien : "Vous souhaitez soumettre un bien à la vente ?" → /vendre
```

Fichier source : `versi-immobilier/src/pages/ContactPage.jsx`

---

## PAGE APPROCHE — ApprochePage

```
H1 : Comment Versi travaille.
[CONSERVER]

Sous-titre : Chaque décision prise en interne. Chaque bien porté par les fondateurs.
[CONSERVER]

H2 Process : Quatre étapes. Zéro délégation.
[CONSERVER — excellent]

H2 Différenciateurs :
  REWRITE : Trois engagements. Vérifiables.
  [était : "Ce qui distingue Versi Immobilier."]

H2 Équipe : Thomas, Maxime, Carl.
[CONSERVER — excellent]

Sous-titre équipe : Trois fondateurs. Joignables en direct.
[CONSERVER — excellent]

H2 Critères d'acquisition :
  REWRITE : Ce que nous achetons.
  [était : "Ce que nous instruisons."]

Corps critères d'acquisition :
  Versi Immobilier acquiert des biens résidentiels et mixtes entre 250 000 € et 1 000 000 €, en France — Paris, Île-de-France, Lille, Lyon, Bordeaux et villes moyennes. Immeubles de rapport, maisons, biens mixtes. Biens occupés ou en l'état acceptés.
  [était : "Versi Immobilier instruit des actifs résidentiels et mixtes entre 250 000 € et 1 000 000 €, en France — Paris, Île-de-France, Lille, Lyon, Bordeaux et villes moyennes. Immeubles de rapport, maisons, actifs mixtes, biens occupés ou en l'état."]
  Corrections : "instruit" → "acquiert", "actifs" × 2 → "biens", reformulation finale.

Corps lien Groupe Versi :
  Versi Immobilier est l'entité marchand de biens du Groupe Versi, holding immobilière intégrée basée à Lille.
  [était : "Versi Immobilier est l'entité marchand de biens du Groupe Versi — une holding immobilière intégrée qui couvre l'ensemble du cycle de vie d'un actif."]
  Suppression : "cycle de vie d'un actif" (jargon holding proscrit sur ce site).

CTA bas de page :
  "Un bien à céder ? Un projet à discuter ?"
  [CONSERVER — couvre les deux personas]

Boutons CTA bas de page :
  Bouton primaire : Soumettre un dossier  [CONSERVER]
  Bouton secondaire : Nous contacter      [CONSERVER]
```

Fichier source : `versi-immobilier/src/pages/ApprochePage.jsx`

---

## PAGE RÉALISATIONS — RealisationsPage

```
H1 : Réalisations.
[CONSERVER — parfait]

Sous-titre : Chaque rénovation documentée — adresse, délais, chiffres. Aucun chiffre inventé.
[CONSERVER — excellent, ne pas toucher]

ÉTAT VIDE (completed.length === 0) :
  Ligne 1 : Les premières réalisations arrivent.
  Ligne 2 : En attendant, les biens disponibles sont visibles sur la page des biens.
  CTA : Voir les biens disponibles  [→ /nos-biens]
  [était : "Nos premières réalisations seront publiées ici dans les prochaines semaines."]

BANDEAU VENDEUR BAS DE PAGE :
  Ligne 1 : Vous avez un bien à céder ?
  [CONSERVER]
  Ligne 2 : Offre ferme sous 7 jours. Fonds propres. Aucun mandat.
  [était : "Offre ferme sous 7 jours. Aucun mandat, aucune mise en vente prolongée."]
  CTA : Soumettre mon dossier
  [CONSERVER]
```

Fichier source : `versi-immobilier/src/pages/RealisationsPage.jsx`

---

## FOOTER

```
TAGLINE :
  Marchand de biens — Lille & France
  [était : "Opérateur immobilier intégré"]

LIGNE GÉO :
  SUPPRIMER la ligne "Lille & France" séparée
  [la géo est désormais intégrée dans la tagline]

MENTION GROUPE :
  "Versi Immobilier est une entité du Groupe Versi — versi.fr"
  [CONSERVER — formulation correcte]

COLONNE ACQUÉREURS :
  "Nos biens disponibles"           [CONSERVER]
  "Nos réalisations"                [CONSERVER]
  "Notre approche"                  [CONSERVER]
  "Être notifié en avant-première"  [CONSERVER]

COLONNE VENDEURS :
  "Céder un bien"    [CONSERVER]
  "Notre process"    [CONSERVER]
  "Contact"          [CONSERVER]
```

Fichier source : `versi-immobilier/src/components/Footer.jsx`

---

## NE PAS TOUCHER

```
Hero          → versi-immobilier/src/components/Hero.jsx       [validé]
SellPage      → versi-immobilier/src/pages/SellPage.jsx        [jugé excellent]
```

---

## MESSAGES SYSTÈME (formulaires)

Ces copy ne sont pas dans les fichiers lus mais doivent respecter le brand voice :

```
FORMULAIRE — SUCCÈS :
  Message reçu. Nous vous répondons sous 24h.

FORMULAIRE — ERREUR D'ENVOI :
  Le message n'a pas pu être transmis. Réessayez ou écrivez directement à contact@versi-immobilier.fr.

FORMULAIRE — CHAMP OBLIGATOIRE VIDE :
  Ce champ est requis.

FORMULAIRE — EMAIL INVALIDE :
  Adresse email incorrecte.
```

Ces messages s'appliquent à `versi-immobilier/src/components/ContactForm.jsx` et `versi-immobilier/src/components/SellForm.jsx`.

---

## HYPOTHÈSES À VALIDER

- **[HYPOTHÈSE 1]** Le CTA "Être notifié en avant-première" dans AvailableProperties et PropertiesPage pointe vers `/contact`. Si une ancre `#notification` existe ou est créée, mettre à jour le href. À confirmer avec @fullstack.
- **[HYPOTHÈSE 2]** "BIENS DISPONIBLES" remplace "BIENS EN VENTE" dans Nav — le href `/nos-biens` est inchangé. Vérifier que les tests de navigation existants passent (@qa).
- **[HYPOTHÈSE 3]** Les chiffres Stats (21 / 100% / 3,2M€) sont des valeurs réelles validées par Thomas. Seuls les labels ont été reformulés.
- **[HYPOTHÈSE 4]** La tagline Footer "Marchand de biens — Lille & France" absorbe la ligne Géo séparée. La ligne CSS `footer__geo` devient inutile — @fullstack peut la supprimer ou la laisser vide (elle n'affichera rien).

---

## RÉCAPITULATIF DES INTERVENTIONS

| Fichier | Modifications | Priorité |
|---|---|---|
| `Arguments.jsx` | ARGUMENTS[0] titre + corps, ARGUMENTS[1] corps allégé, ARGUMENTS[2] corps raccourci | P1 |
| `AvailableProperties.jsx` | H2 titre, CTA liste, état vide complet | P1 |
| `Stats.jsx` | Labels stat 1 et stat 3 | P1 |
| `TeamTeaser.jsx` | H2 (2 lignes), sous-titre, CTA | P1 |
| `SellerBanner.jsx` | Titre (affirmation + fonds propres), CTA | P1 |
| `Nav.jsx` | NAV_ITEMS[0].label uniquement | P2 |
| `PropertiesPage.jsx` | H1, sous-titre, état vide global, état vide filtre, H2 vendus, bandeau vendeur ligne 2 | P1 |
| `ContactPage.jsx` | Sous-titre uniquement ("cherchez un partenaire" → "soumettez un dossier") | P2 |
| `ApprochePage.jsx` | H2 Différenciateurs, H2 Critères, corps critères, corps Groupe Versi | P1 |
| `RealisationsPage.jsx` | État vide, bandeau vendeur ligne 2 | P2 |
| `Footer.jsx` | Tagline, suppression ligne geo | P2 |
| `ContactForm.jsx` + `SellForm.jsx` | Messages système (succès/erreur) | P2 |

---

**Handoff → @fullstack**
- Fichier produit : `/home/user/Versi/docs/copy/vi-final-copy.md`
- Décisions prises :
  - Hero : intouchable (validé `vi-brand-voice-adaptation.md`)
  - SellPage : intouchable (jugé excellent)
  - Règle sujet : bien ou acheteur en H1/H2 — jamais Versi
  - Jargon proscrit sur ce site : opérations, actifs, instruire, intégré, opérateur, cycle de vie (sauf mention légale Groupe)
  - "Sur fonds propres" ajouté dans SellerBanner — différenciateur clé pour le persona vendeur/prescripteur
  - Footer tagline → "Marchand de biens — Lille & France" absorbe la ligne geo séparée
  - Vouvoiement systématique — vérifier messages système formulaire
- Points d'attention :
  - CTA "Être notifié" : pointer vers `/contact` tant que l'ancre `#notification` n'est pas créée
  - Le changement de label Nav "BIENS EN VENTE" → "BIENS DISPONIBLES" ne modifie pas le href
  - Chaque chaîne est prête à copier-coller — zéro placeholder résiduel
  - Les CONSERVER sont aussi importants que les RÉÉCRIRE : ne pas "améliorer" ce qui est déjà validé
  - Messages système formulaire (succès/erreur) : vérifier qu'ils respectent le brand voice (section dédiée en bas de ce fichier)
