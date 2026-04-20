# Directions copy complètes — versi-immobilier.fr

> Produit par @creative-strategy | Date : 2026-04-10
> Sources : `docs/strategy/vi-brand-voice-adaptation.md`, `docs/copy/brand-voice.md`, `versi-immobilier/src/pages/HomePage.jsx`, `versi-immobilier/src/pages/ApprochePage.jsx`, et composants associés.
> Usage : référence prête à copier-coller pour @fullstack. Chaque section indique le copy actuel, la direction, puis le rewrite exact.

---

## Principe directeur (rappel)

Le TON est identique à versi.fr : court, factuel, affirmé, vouvoiement, zéro exclamation, zéro passif, zéro adjectif auto-décerné.
Le SUJET change : le bien ou le bénéfice acquéreur — jamais Versi en H1/H2.
Versi peut apparaître en sous-titre, corps ou label — jamais en ouverture de titre de section.

---

## HOMEPAGE

### Section 1 — Hero

**Copy actuel :** "Peu de biens. Pas d'approximation." / sous-titre : "Des appartements sélectionnés, préparés, disponibles."

**Direction :** NE PAS RETOUCHER. Hero validé — cf. `docs/strategy/vi-brand-voice-adaptation.md`. Toutes les sections suivantes doivent atteindre ce niveau de densité.

---

### Section 2 — Arguments (3 blocs)

**Copy actuel :**
- Bloc 1 — "Nous portons le bien de bout en bout." / "Chaque bien que vous voyez ici, nous l'avons acheté et piloté — rénové ou avec un projet défini. Vous parlez à celui qui a choisi chaque carrelage, pas à un agent qui lit une fiche."
- Bloc 2 — "Rien n'est caché." / "Diagnostics complets. Historique des travaux. Garantie décennale sur les parties structurelles. Vous recevez le dossier avant la visite, pas le jour de la signature."
- Bloc 3 — "Le prix affiché est le prix." / "Versi vend en direct à l'acquéreur. Pas de commission d'agence sur votre achat. Vous traitez avec le propriétaire du bien — celui qui a pris toutes les décisions."

**Diagnostic :** Les titres actuels sont bons (Bloc 2 et 3 sont excellents). Bloc 1 a le problème classique : le sujet est "Nous", et "chaque carrelage" est un détail opérateur qui n'est pas le bénéfice acquéreur. Le corps du Bloc 1 parle de Versi, pas de ce que l'acheteur obtient. Les Blocs 2 et 3 sont déjà centrés acquéreur — affiner le corps pour plus de densité.

**Direction :** Bloc 1 : pivoter le titre sur le bénéfice (vous savez à qui vous achetez), pas sur "nous portons". Corps : ce que ça change pour l'acheteur, pas ce que Versi fait. Blocs 2 et 3 : garder les titres, alléger les corps — supprimer les redondances.

**REWRITE :**

```
BLOC 1
Titre : Vous achetez à la source.
Corps : Pas d'intermédiaire entre vous et le bien. Les trois fondateurs ont acheté, piloté, et connaissent chaque détail de chaque appartement. Vous posez une question — vous obtenez une réponse directe.

BLOC 2
Titre : Rien n'est caché. [CONSERVER]
Corps : Diagnostics complets. Historique des travaux. Garantie décennale sur les parties structurelles. Vous recevez le dossier complet avant la visite.

BLOC 3
Titre : Le prix affiché est le prix. [CONSERVER]
Corps : Vente directe du propriétaire à l'acquéreur. Pas de commission d'agence à votre charge.
```

**Note :** La reformulation du Bloc 1 est la seule intervention substantielle. Les titres des Blocs 2 et 3 sont intouchables — ils ont déjà le caractère requis.

---

### Section 3 — AvailableProperties (titre de section)

**Copy actuel :** "Les biens disponibles."
État vide : "Aucun bien disponible pour le moment. Revenez bientôt."
CTA liste : "Tous nos biens"

**Diagnostic :** Le titre est fonctionnel mais neutre — "Les biens disponibles" est une étiquette de catalogue, pas une phrase Versi. L'état vide est particulièrement faible : "Revenez bientôt" est du remplissage sans caractère.

**Direction :** Le titre doit avoir le même caractère affirmatif que le Hero. L'état vide est une opportunité de conversion — transformer le vide en invitation à être notifié, avec le même ton factuel.

**REWRITE :**

```
Titre de section : Ce que nous proposons aujourd'hui.

État vide :
  Ligne 1 : Nos biens partent vite.
  Ligne 2 : Inscrivez-vous pour être notifié en avant-première.
  CTA : Être notifié [→ ancre #notification ou /contact]

CTA liste complète : Voir tous les biens
```

**Note :** "Ce que nous proposons aujourd'hui" introduit une notion de sélection active et de temporalité — sous-entendu : demain, il y aura d'autres biens. L'état vide avec "Nos biens partent vite" dit la vérité business sans s'excuser de n'avoir rien à montrer.

---

### Section 4 — Stats (3 chiffres + labels)

**Copy actuel :**
- "21" / "appartements transformés à Lille depuis 2022"
- "100%" / "vendus en direct, sans agence"
- "3,2M€" / "d'opérations réalisées"

**Diagnostic :** Les chiffres sont bons. Le label du troisième stat utilise "opérations" — terme holding proscrit sur ce site (cf. brand voice adapté). Le label du premier stat mélange lieu et date dans la même phrase — à découper. Le deuxième stat est le plus fort : le garder intact.

**Direction :** Reformuler les labels pour qu'ils parlent le même registre que le reste du site. Un label de stat = une information factuelle, pas un résumé d'activité.

**REWRITE :**

```
STAT 1
Valeur : 21
Label : appartements rénovés à Lille

STAT 2
Valeur : 100%
Label : vendus en direct, sans agence [CONSERVER]

STAT 3
Valeur : 3,2M€
Label : de volume traité depuis 2022
```

**Note :** "d'opérations réalisées" → "de volume traité" : supprime le terme holding, garde le sens. La date passe sur le troisième label pour ne pas encombrer le premier.

---

### Section 5 — TeamTeaser (H2 + sous-titre + CTA)

**Copy actuel :**
H2 : "Trois associés. Chaque bien porté de l'achat à la remise des clés."
Sous-titre : "Versi ne mandate pas d'intermédiaire. Les trois fondateurs achètent, rénovent, font visiter et négocient eux-mêmes."
CTA : "Découvrir notre approche complète"

**Diagnostic :** Le H2 est bon mais le sujet est opérateur ("Trois associés. Chaque bien porté"). Le sous-titre commence par "Versi ne mandate pas" — sujet Versi, registre holding. "Découvrir notre approche complète" : "Découvrir" est dans les interdits absolus du brand voice.

**Direction :** H2 : pivoter vers le bénéfice acquéreur — ce que ça signifie pour vous que les fondateurs soient joignables. Sous-titre : court, factuel, sujet = ce que l'acheteur obtient. CTA : verbe d'action concis.

**REWRITE :**

```
H2 : Vous parlez à celui qui a acheté.
     Pas à un commercial.

Sous-titre : Thomas, Maxime et Carl ont porté chaque bien de l'acquisition à la livraison. Ils font visiter eux-mêmes. Ils répondent en direct.

CTA : Notre approche
```

**Note :** Le H2 en deux lignes crée le même rythme antithétique que le Hero. "Pas à un commercial" fait fuir les mauvais clients (ceux qui veulent un agent classique) et attire les bons (ceux qui veulent de la transparence). Le CTA passe de 4 mots à 2 — plus dense.

---

### Section 6 — SellerBanner (bandeau vendeur)

**Copy actuel :**
"**Vous avez un bien à vendre à Lille ?** Versi Immobilier achète en direct auprès des propriétaires. Offre ferme sous 7 jours. Aucun mandat, aucune mise en vente prolongée."
CTA : "Nous parler de votre bien →"

**Diagnostic :** Le contenu est excellent. La structure est bonne : problème (vous avez un bien), solution (achat direct), promesse (7 jours, pas de mandat). Deux points à affiner : le gras sur "Vous avez un bien à vendre à Lille ?" est la question d'accroche — elle peut être réécrite comme une affirmation plus directe. "Nous parler de votre bien →" est légèrement hésitant pour un CTA.

**Direction :** Mineure. Transformer la question en affirmation directe. CTA : plus court, plus affirmatif. Garder toutes les preuves (7 jours, sans mandat).

**REWRITE :**

```
Titre (strong) : Vous avez un bien à céder à Lille.
Corps : Versi Immobilier achète en direct, sur fonds propres. Offre ferme sous 7 jours. Aucun mandat, aucune mise en vente prolongée.
CTA : Soumettre votre bien
```

**Note :** "Vous avez un bien à céder à Lille." en affirmation (point, pas point d'interrogation) est plus direct — on s'adresse à quelqu'un qui sait déjà qu'il veut vendre, pas à quelqu'un qui se demande s'il veut vendre. "Sur fonds propres" est ajouté — c'est le différenciateur clé de Versi pour le vendeur (pas de condition suspensive de financement). Pierre (prescripteur/notaire) voit immédiatement la solidité de l'acheteur.

---

## PAGES SECONDAIRES

### Section 7 — Nav (labels + CTA)

**Copy actuel :**
Items : `BIENS EN VENTE` | `RÉALISATIONS` | `NOTRE APPROCHE` | `CONTACT`
CTA desktop : `Céder un bien`
CTA mobile overlay : `CÉDER UN BIEN`

**Diagnostic :** Les labels sont fonctionnels. "BIENS EN VENTE" est correct mais le mot "vente" place le visiteur du côté vendeur (c'est Versi qui vend, pas lui). Un acheteur cherche des biens à acheter. "NOTRE APPROCHE" est orienté Versi — le mot "Notre" place l'opérateur au centre. Le CTA "Céder un bien" est excellent — court, verbe d'action, correct pour le persona vendeur/prescripteur.

**Direction :** Mineure. Ajuster les deux labels dont le registre penche Versi plutôt qu'acquéreur. Conserver les CTA vendeur intacts.

**REWRITE :**

```
NAV ITEMS (desktop + mobile)
[1] BIENS DISPONIBLES       ← était "BIENS EN VENTE"
[2] RÉALISATIONS            ← CONSERVER
[3] NOTRE APPROCHE          ← CONSERVER (acceptable — l'approche est de Versi)
[4] CONTACT                 ← CONSERVER

CTA desktop : Céder un bien    ← CONSERVER
CTA mobile  : CÉDER UN BIEN   ← CONSERVER
```

**Note :** "BIENS DISPONIBLES" place l'acheteur au centre (il cherche ce qui est disponible pour lui). "BIENS EN VENTE" est le langage du vendeur. L'ajustement est minime mais cohérent avec la règle du sujet acquéreur. "NOTRE APPROCHE" est conservé car il renvoie à une page qui s'adresse autant aux vendeurs qu'aux acheteurs — le "Notre" est acceptable dans la nav comme label de destination, pas comme H1.

---

### Section 8 — PropertiesPage (H1 + sous-titre + états vides + bandeau vendeur)

**Copy actuel :**
H1 : "Nos biens."
Sous-titre : "Appartements et maisons rénovés par Versi Immobilier à Lille. Diagnostics complets. Garantie décennale."
État vide global (aucun bien dans la base) : "Aucun bien disponible à date. Nos acquisitions vont vite — soyez notifié en avant-première." + CTA "Me tenir informé"
État vide après filtre (filtres actifs, aucun résultat) : "Aucun bien ne correspond à ces critères." + CTA "Réinitialiser les filtres"
Section biens vendus : H2 "Déjà vendus"
Bandeau vendeur bas de page : "Vous avez un bien à céder ?" / "Offre ferme sous 7 jours. Aucun mandat, aucune mise en vente prolongée." / CTA "Soumettre mon dossier"

**Diagnostic :** H1 "Nos biens." est neutre — sujet Versi ("Nos"). Le sous-titre mélange deux informations distinctes : la nature des biens (rénovés) et les garanties (diagnostics, décennale) — la première est inexacte si des biens avec projet existent. L'état vide global est bon mais "Nos acquisitions vont vite" mélange les registres (acquisition = terme Versi). Le bandeau vendeur bas de page est bon mais répétitif avec le SellerBanner homepage.

**Direction :** H1 : centrer sur le catalogue, pas sur Versi. Sous-titre : séparer biens disponibles (neutre sur l'état) et garanties documentaires. États vides : améliorer l'état vide global, conserver l'état après filtre. Bandeau vendeur : harmoniser avec le SellerBanner reécrit.

**REWRITE :**

```
H1 : Les biens disponibles.

Sous-titre : Appartements et biens mixtes à Lille. Dossier complet — diagnostics, historique, garanties — disponible avant la visite.

ÉTAT VIDE GLOBAL (aucun bien en base) :
  Ligne 1 : Nos biens partent vite.
  Ligne 2 : Laissez-nous votre contact — nous vous prévenons avant la mise en ligne.
  CTA : Être notifié en avant-première [→ /contact]

ÉTAT VIDE APRÈS FILTRE (filtre actif, 0 résultat) :
  Ligne 1 : Aucun bien disponible avec ces critères.
  CTA : Réinitialiser les filtres [CONSERVER]

SECTION BIENS VENDUS :
  H2 : Vendus.   ← était "Déjà vendus"

BANDEAU VENDEUR BAS DE PAGE :
  Ligne 1 : Vous avez un bien à céder ?
  Ligne 2 : Offre ferme sous 7 jours. Fonds propres. Aucun mandat.
  CTA : Soumettre mon dossier [CONSERVER]
```

**Note :** "Les biens disponibles." en H1 fait de la page un catalogue acquéreur, pas une vitrine opérateur. Le sous-titre supprime "rénovés" — trop réducteur si les biens avec projet existent — et renforce les garanties documentaires qui sont le vrai différenciateur. "Vendus." (sans "Déjà") est plus sec, plus Versi.

---

### Section 9 — ContactPage (H1 + sous-titre)

**Copy actuel :**
H1 : "Écrivez-nous."
Sous-titre : "Vous achetez, vous cédez ou vous cherchez un partenaire. Réponse sous 24h — sans standard, sans assistant."

**Diagnostic :** H1 "Écrivez-nous." est excellent — court, impératif, direct. Le sous-titre est très bon : il liste les trois raisons de contact (acquéreur, vendeur, prescripteur/partenaire) et fait une promesse concrète. "Sans standard, sans assistant" est une formule Versi parfaite. Rien à changer structurellement.

Un seul point : "vous cherchez un partenaire" inclut implicitement Pierre (prescripteur, mandataire, notaire) sans le nommer — c'est bien. Mais on peut rendre la promesse encore plus dense.

**Direction :** Mineure. Le H1 est intouchable. Le sous-titre peut être légèrement resserré.

**REWRITE :**

```
H1 : Écrivez-nous.   ← CONSERVER

Sous-titre : Vous achetez, vous cédez ou vous nous soumettez un dossier. Réponse sous 24h — sans standard, sans assistant.
```

**Note :** "vous cherchez un partenaire" → "vous nous soumettez un dossier" : plus actionnable, plus précis pour le prescripteur (Pierre) qui a un bien à soumettre ou un client à orienter. Le reste du sous-titre est intouchable.

Corps info-contact (colonne gauche) — copy actuel déjà excellent, conserver :
- "Nous accusons réception sous 24h. Visite organisée sous 72h."
- "Lille et métropole lilloise / Paris — Île-de-France"
- Lien "Vous souhaitez soumettre un bien à la vente ?" → conserver, il capte Pierre

---

### Section 10 — ApprochePage (H1 + sous-titre + titres de sections)

**Copy actuel :**
H1 : "Comment Versi travaille."
Sous-titre : "Chaque décision prise en interne. Chaque bien porté par les fondateurs."

Section Process H2 : "Quatre étapes. Zéro délégation."
Section Différenciateurs H2 : "Ce qui distingue Versi Immobilier."
Section Équipe H2 : "Thomas, Maxime, Carl."
Sous-titre équipe : "Trois fondateurs. Joignables en direct."
Section Critères d'acquisition H2 : "Ce que nous instruisons."
Section Lien Groupe Versi — corps : "Versi Immobilier est l'entité marchand de biens du Groupe Versi — une holding immobilière intégrée qui couvre l'ensemble du cycle de vie d'un actif."
CTA bas de page : "Un bien à céder ? Un projet à discuter ?"

**Diagnostic :** La page Approche est adressée à la fois à Kévin (acquéreur qui veut comprendre à qui il achète) et à Pierre (prescripteur/notaire qui veut évaluer la solidité de l'acheteur). Le H1 "Comment Versi travaille." est orienté opérateur — acceptable sur cette page car c'est précisément l'objet. Le H2 "Ce qui distingue Versi Immobilier." est faible : formulé comme un titre de présentation corporate. "Ce que nous instruisons." est du jargon acquisition — "instruire" est un terme de financement, pas un mot qui parle à Kévin. Le lien Groupe Versi mentionne "cycle de vie d'un actif" — jargon holding proscrit.

**Direction :** H1 et sous-titre : conserver — ils sont corrects pour cette page. Retravailler les H2 des sections Différenciateurs et Critères. Nettoyer le corps du lien Groupe Versi.

**REWRITE :**

```
H1 : Comment Versi travaille.   ← CONSERVER

Sous-titre : Chaque décision prise en interne. Chaque bien porté par les fondateurs.   ← CONSERVER

H2 Process : Quatre étapes. Zéro délégation.   ← CONSERVER (excellent)

H2 Différenciateurs :
  ACTUEL : "Ce qui distingue Versi Immobilier."
  REWRITE : Trois engagements. Vérifiables.

H2 Équipe : Thomas, Maxime, Carl.   ← CONSERVER (excellent)
Sous-titre équipe : Trois fondateurs. Joignables en direct.   ← CONSERVER (excellent)

H2 Critères d'acquisition :
  ACTUEL : "Ce que nous instruisons."
  REWRITE : Ce que nous achetons.

Corps critères d'acquisition — copy actuel à affiner :
  ACTUEL : "Versi Immobilier instruit des actifs résidentiels et mixtes entre 250 000 € et 1 000 000 €, en France — Paris, Île-de-France, Lille, Lyon, Bordeaux et villes moyennes. Immeubles de rapport, maisons, actifs mixtes, biens occupés ou en l'état."
  REWRITE : "Versi Immobilier acquiert des biens résidentiels et mixtes entre 250 000 € et 1 000 000 €, en France — Paris, Île-de-France, Lille, Lyon, Bordeaux et villes moyennes. Immeubles de rapport, maisons, actifs mixtes. Biens occupés ou en l'état acceptés."

Corps lien Groupe Versi :
  ACTUEL : "Versi Immobilier est l'entité marchand de biens du Groupe Versi — une holding immobilière intégrée qui couvre l'ensemble du cycle de vie d'un actif."
  REWRITE : "Versi Immobilier est l'entité marchand de biens du Groupe Versi, holding immobilière intégrée basée à Lille."

CTA bas de page :
  ACTUEL : "Un bien à céder ? Un projet à discuter ?"
  REWRITE : Conserver — cette formule couvre les deux personas (vendeur + prescripteur) avec le bon registre.
```

**Note sur "Trois engagements. Vérifiables." :** La formulation actuelle "Ce qui distingue Versi Immobilier." est une promesse que Versi se fait à lui-même. "Trois engagements. Vérifiables." dit la même chose en positionnant les différenciateurs comme des faits contrôlables par l'acheteur — ce qui est précisément ce que Kévin et Pierre attendent.

---

### Section 11 — RealisationsPage (H1 + sous-titre + états)

**Copy actuel :**
H1 : "Réalisations."
Sous-titre : "Chaque rénovation documentée — adresse, délais, chiffres. Aucun chiffre inventé."
État vide (aucune réalisation publiée) : "Nos premières réalisations seront publiées ici dans les prochaines semaines."
Bandeau vendeur bas de page : identique à PropertiesPage.

**Diagnostic :** H1 "Réalisations." est parfait — court, Versi, sans fioritures. Le sous-titre est très bon : "Aucun chiffre inventé" est une formule qui a du caractère et qui répond directement à la méfiance de Kévin vis-à-vis des portails. L'état vide est trop vague et trop corporate ("prochaines semaines" est une formule passe-partout sans engagement).

**Direction :** H1 et sous-titre : conserver intégralement. Retravailler uniquement l'état vide.

**REWRITE :**

```
H1 : Réalisations.   ← CONSERVER

Sous-titre : Chaque rénovation documentée — adresse, délais, chiffres. Aucun chiffre inventé.   ← CONSERVER (excellent)

ÉTAT VIDE :
  ACTUEL : "Nos premières réalisations seront publiées ici dans les prochaines semaines."
  REWRITE :
    Ligne 1 : Les premières réalisations arrivent.
    Ligne 2 : En attendant, les biens disponibles sont visibles sur la page des biens.
    CTA : Voir les biens disponibles [→ /nos-biens]

BANDEAU VENDEUR BAS DE PAGE :   ← identique à PropertiesPage, appliquer le même rewrite
  Ligne 1 : Vous avez un bien à céder ?
  Ligne 2 : Offre ferme sous 7 jours. Fonds propres. Aucun mandat.
  CTA : Soumettre mon dossier [CONSERVER]
```

**Note :** L'état vide redirige vers les biens disponibles — on ne perd pas le visiteur dans une page sans contenu. La reformulation supprime "nos premières" (tic de jeune startup) et le vague "prochaines semaines".

---

### Section 12 — Footer (tagline + colonnes)

**Copy actuel :**
Tagline : "Opérateur immobilier intégré"
Géo : "Lille & France"
Email : contact@versi-immobilier.fr (variable)
Mention Groupe : "Versi Immobilier est une entité du Groupe Versi — versi.fr"

Colonne Acquéreurs : "Nos biens disponibles" / "Nos réalisations" / "Notre approche" / "Être notifié en avant-première"
Colonne Vendeurs : "Céder un bien" / "Notre process" / "Contact"

**Diagnostic :** La tagline "Opérateur immobilier intégré" est du registre holding — proscrit sur ce site. "Opérateur" et "intégré" sont les deux mots holding par excellence. La colonne Acquéreurs est bien structurée. La colonne Vendeurs est bonne. Le lien "Notre process" renvoie à /vendre#process — cohérent, conserver.

**Direction :** Seule la tagline doit changer. Les colonnes sont correctes à quelques ajustements mineurs.

**REWRITE :**

```
TAGLINE :
  ACTUEL : "Opérateur immobilier intégré"
  REWRITE : "Marchand de biens — Lille & France"

GÉO :
  ACTUEL : "Lille & France" (ligne séparée)
  REWRITE : Supprimer la ligne Géo — elle est désormais intégrée dans la tagline.

MENTION GROUPE :
  ACTUEL : "Versi Immobilier est une entité du Groupe Versi — versi.fr"
  REWRITE : CONSERVER — formulation correcte, suffisamment courte.

COLONNE ACQUÉREURS — labels :
  "Nos biens disponibles"          ← CONSERVER
  "Nos réalisations"               ← CONSERVER
  "Notre approche"                 ← CONSERVER
  "Être notifié en avant-première" ← CONSERVER

COLONNE VENDEURS — labels :
  "Céder un bien"    ← CONSERVER
  "Notre process"    ← CONSERVER
  "Contact"          ← CONSERVER
```

**Note :** "Marchand de biens — Lille & France" dit ce qu'est Versi Immobilier en 5 mots. C'est le statut légal + le territoire. Ni corporate, ni flou. La géo disparaît en ligne séparée car elle est absorbée dans la tagline — évite la redondance.

---

## RÉCAPITULATIF — INDEX DES REWRITES

| Élément | Statut | Intervention |
|---|---|---|
| Hero | CONSERVER INTÉGRALEMENT | Validé dans `vi-brand-voice-adaptation.md` |
| Arguments — Bloc 1 | RÉÉCRIRE | Titre + corps |
| Arguments — Bloc 2 | CONSERVER | Titre + corps allégé |
| Arguments — Bloc 3 | CONSERVER | Corps raccourci |
| AvailableProperties — titre | RÉÉCRIRE | "Ce que nous proposons aujourd'hui." |
| AvailableProperties — état vide | RÉÉCRIRE | "Nos biens partent vite." + CTA notification |
| Stats — Stat 1 | AJUSTER | Label : "appartements rénovés à Lille" |
| Stats — Stat 2 | CONSERVER | |
| Stats — Stat 3 | AJUSTER | Label : "de volume traité depuis 2022" |
| TeamTeaser — H2 | RÉÉCRIRE | "Vous parlez à celui qui a acheté. / Pas à un commercial." |
| TeamTeaser — sous-titre | RÉÉCRIRE | Sujet = fondateurs concrets, pas Versi abstraite |
| TeamTeaser — CTA | RACCOURCIR | "Notre approche" |
| SellerBanner — titre | AJUSTER | Affirmation, "sur fonds propres" ajouté |
| SellerBanner — CTA | AJUSTER | "Soumettre votre bien" |
| Nav — item 1 | AJUSTER | "BIENS DISPONIBLES" |
| Nav — items 2-4 + CTAs | CONSERVER | |
| PropertiesPage — H1 | RÉÉCRIRE | "Les biens disponibles." |
| PropertiesPage — sous-titre | RÉÉCRIRE | Sans "rénovés", avec garanties documentaires |
| PropertiesPage — états vides | RÉÉCRIRE | État global + allusion à notification |
| PropertiesPage — "Déjà vendus" | AJUSTER | "Vendus." |
| ContactPage — H1 | CONSERVER | |
| ContactPage — sous-titre | AJUSTER MINIME | "soumettez un dossier" |
| ApprochePage — H1 + sous-titre | CONSERVER | |
| ApprochePage — H2 Process | CONSERVER | |
| ApprochePage — H2 Différenciateurs | RÉÉCRIRE | "Trois engagements. Vérifiables." |
| ApprochePage — H2 Équipe + sous-titre | CONSERVER | |
| ApprochePage — H2 Critères | RÉÉCRIRE | "Ce que nous achetons." |
| ApprochePage — corps critères | NETTOYER | "instruire" → "acquérir", "actifs" → "biens" |
| ApprochePage — corps Groupe Versi | RACCOURCIR | Supprimer "cycle de vie d'un actif" |
| RealisationsPage — H1 + sous-titre | CONSERVER | |
| RealisationsPage — état vide | RÉÉCRIRE | Avec redirection vers biens disponibles |
| SellPage | CONSERVER INTÉGRALEMENT | Jugé excellent |
| Footer — tagline | RÉÉCRIRE | "Marchand de biens — Lille & France" |
| Footer — colonne Acquéreurs | CONSERVER | |
| Footer — colonne Vendeurs | CONSERVER | |

---

## HYPOTHÈSES À VALIDER

- **[HYPOTHÈSE 1]** La page des biens dispose ou disposera d'une ancre `#notification` ou d'une section de notification — utilisée dans l'état vide AvailableProperties et PropertiesPage. Si cette section n'existe pas, le CTA "Être notifié" doit pointer vers `/contact`. À confirmer avec @fullstack.
- **[HYPOTHÈSE 2]** Le menu "BIENS EN VENTE" renvoie à `/nos-biens` — le changement de label vers "BIENS DISPONIBLES" ne touche pas le href. À vérifier que le changement de label ne casse pas les tests de navigation existants (@qa).
- **[HYPOTHÈSE 3]** Les Stats (21 / 100% / 3,2M€) sont des chiffres réels validés par Thomas. Aucune modification des valeurs — uniquement les labels ont été reformulés. À confirmer si les valeurs ont évolué depuis la dernière mise à jour du composant Stats.jsx.

---

## HANDOFF

---
**Handoff → @fullstack**
- Fichier produit : `/home/user/Versi/docs/strategy/vi-full-copy-directions.md`
- Décisions prises :
  - Hero : intouchable (déjà validé)
  - SellPage : intouchable (déjà jugé excellent)
  - 30+ éléments copy traités : voir INDEX DES REWRITES ci-dessus
  - Règle sujet : le bien ou l'acheteur en H1/H2, jamais Versi
  - Jargon proscrit sur ce site : "opérations", "actifs", "instruire", "intégré", "opérateur" (sauf dans la mention légale Groupe Versi)
  - Pierre (prescripteur) adressé via : ContactPage sous-titre, SellerBanner "sur fonds propres", ApprochePage section critères
- Points d'attention pour l'intégration :
  - Vérifier ancre `#notification` ou `#biens` avant de connecter les CTAs état vide
  - Le changement de label Nav "BIENS EN VENTE" → "BIENS DISPONIBLES" ne modifie pas le href `/nos-biens`
  - Chaque rewrite est prêt à copier-coller — zéro placeholder résiduel
  - Les CONSERVER sont aussi importants que les RÉÉCRIRE : ne pas "améliorer" ce qui est déjà validé
---
