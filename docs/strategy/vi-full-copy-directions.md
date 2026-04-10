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

### Nav — Labels + CTA
### PropertiesPage — H1 + sous-titre + états vide + bandeau vendeur
### ContactPage — H1 + sous-titre
### ApprochePage — H1 + sous-titre + titres de sections
### RealisationsPage — H1 + sous-titre
### Footer — Tagline + colonnes

---
