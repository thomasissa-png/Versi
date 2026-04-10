# Audit créatif — Homepage versi-immobilier.fr
**Agent** : @creative-strategy
**Date** : 2026-04-10
**Périmètre** : copy et architecture homepage

---

## Diagnostic de fond (avant section par section)

Le feedback fondateur est exact et précis. Le problème n'est pas un détail de wording — c'est une confusion de sujet. Le copy actuel parle de Versi Immobilier. Il devrait parler des appartements et de l'acquéreur.

"On connaît chaque mur" → qui est le sujet ? Versi. Qui devrait être le sujet ? L'acheteur et le bien.

Deuxième problème systémique : le registre. "On" apparaît dans le H1. C'est familier, informel, et incohérent avec le positionnement premium de versi.fr ("Nous ne déléguons pas"). Versi Immobilier doit parler comme Versi — pas comme une startup qui cherche à paraître sympa.

Troisième problème : la hiérarchie de la page ne sert pas l'objectif. L'objectif est de vendre les biens en cours. Les biens arrivent en deuxième position — c'est correct. Mais tout ce qui suit (Arguments, Stats, TeamTeaser) décrit Versi au lieu de continuer à vendre les biens. La page se retourne contre elle-même à mi-parcours.

---

## Section par section

### 1. Hero

**Copy actuel :**
> H1 : "On connaît chaque mur. On vous le vend, en direct."
> Sous-titre : "Des appartements à Lille, vendus en direct par celui qui les a portés. Vous parlez au propriétaire — pas à un intermédiaire."
> CTA primaire : "Voir les appartements disponibles"
> CTA secondaire : "Vous avez un bien à céder →"

**Verdict : FAIBLE**

**Diagnostic :**
"On connaît chaque mur" est une promesse sur Versi, pas une promesse pour l'acheteur. Le visiteur qui arrive sur cette page cherche un appartement à Lille — il a besoin d'une raison d'acheter ICI plutôt qu'ailleurs, pas d'une description du vendeur. "On" est familier et en contradiction directe avec le positionnement de versi.fr. Le sous-titre améliore les choses ("Vous parlez au propriétaire") mais arrive trop tard — il corrige un H1 qui était déjà mal parti.

**Rewrite :**

```
Surtitre : VERSI IMMOBILIER — LILLE

H1 : Des appartements à Lille.
     Achetés, rénovés, vendus par leurs propriétaires.

Sous-titre : Versi ne mandate pas d'agent. Versi ne délègue pas les visites.
             Vous traitez directement avec ceux qui ont pris chaque décision sur le bien.

CTA primaire : Voir les biens disponibles
CTA secondaire : Vous avez un bien à vendre ? →
```

**Pourquoi ce rewrite :**
Le H1 place l'appartement au centre, pas Versi. "Achetés, rénovés, vendus par leurs propriétaires" dit en une ligne ce qui différencie Versi — sans se vanter, en fait. Le sous-titre reprend la structure de versi.fr ("Versi ne délègue pas") et introduit le "vous" en deuxième phrase. Le CTA secondaire passe au vouvoiement et supprime "céder" (terme de cédant, pas d'acheteur) pour ne pas créer de confusion sur la page d'accueil.

---

### 2. AvailableProperties

**Copy actuel (contexte inline) :**
> Titre : "Ce qu'on vend en ce moment."
> Affiche les PropertyCards des biens disponibles.

**Verdict : MOYEN**

**Diagnostic :**
"Ce qu'on vend en ce moment" — "on" encore, et "en ce moment" introduit une notion d'urgence artificielle qui n'est pas le registre de Versi. Le titre devrait faire entrer dans les biens, pas décrire l'acte de vente. La section elle-même est bien placée (deuxième position, juste après le Hero) — c'est le point fort de l'architecture actuelle.

**Rewrite :**

```
Titre : Les biens disponibles.

Sous-titre optionnel (si la liste est courte) : Versi vend peu de biens à la fois. Chaque opération est menée jusqu'au bout avant la suivante.
```

**Pourquoi :** "Les biens disponibles." est factuel, court, en accord avec le ton de versi.fr. Le sous-titre optionnel transforme le faible volume de biens en signal de qualité — ce qui est une réalité du modèle Versi.

---

### 3. Arguments

**Copy actuel :**
> Titre 1 : "Nous portons le bien de bout en bout."
> Corps 1 : "Chaque bien que vous voyez ici, nous l'avons acheté et piloté — rénové ou avec un projet défini. Vous parlez au propriétaire-vendeur, pas à un agent qui lit une fiche."

> Titre 2 : "Rien n'est caché."
> Corps 2 : "Diagnostics complets. Historique des travaux. Garantie décennale sur les parties structurelles. Vous recevez le dossier avant la visite, pas le jour de la signature."

> Titre 3 : "Le prix affiché est le prix."
> Corps 3 : "Versi vend en direct à l'acquéreur. Pas de commission d'agence sur votre achat. Vous traitez avec le propriétaire du bien — celui qui a pris toutes les décisions."

**Verdict : BON (mais mal placé)**

**Diagnostic :**
C'est la meilleure section de la page sur le plan du copy. "Nous portons le bien de bout en bout", "Rien n'est caché", "Le prix affiché est le prix" — trois titres courts, affirmés, factuels. Le problème n'est pas le copy, c'est la position. Ces arguments arrivent APRÈS les PropertyCards, ce qui oblige l'acheteur à défiler au-delà des biens pour trouver les raisons d'acheter. Or, ces raisons devraient être disponibles AVANT la décision de cliquer sur une PropertyCard.

**Recommandation d'architecture :** voir section dédiée ci-dessous.

**Micro-corrections sur le copy :**
- "Nous portons le bien de bout en bout" → conserver
- Corps 1 : "pas à un agent qui lit une fiche" est bon mais "propriétaire-vendeur" est un terme juridique froid. Remplacer par "Vous parlez à celui qui a choisi chaque carrelage, pas à un agent qui lit une fiche."
- Corps 2 : conserver tel quel — c'est précis, factuel, différenciant
- Corps 3 : conserver tel quel — "Le prix affiché est le prix" est la meilleure phrase de la page

---

### 4. Stats

**Copy actuel (contexte inline) :**
> "21 appartements transformés"
> "100% vendus sans agence"
> "3,2M€ d'opérations depuis 2022"

**Verdict : BON**

**Diagnostic :**
Les stats sont factuelles, vérifiables, et ne sur-promettent pas. "21 appartements transformés" dit le volume. "100% vendus sans agence" dit la méthode. "3,2M€ d'opérations depuis 2022" dit la taille réelle — sans inflation. Le seul ajout envisageable serait un label de contexte temporel sur la première stat pour en renforcer la crédibilité.

**Micro-ajustement optionnel :**

```
"21 appartements transformés à Lille depuis 2022"
"100% vendus en direct, sans agence"
"3,2M€ d'opérations réalisées"
```

L'ajout de "à Lille depuis 2022" sur la première stat ancre géographiquement et temporellement — deux signaux de crédibilité sur une stat qui reste modeste mais honnête.

---

### 5. TeamTeaser

**Copy actuel (contexte inline) :**
> H2 : "Versi Immobilier, c'est trois associés."
> Sous-titre : "Trois personnes qui portent chaque bien de A à Z, qui vous font visiter et qui vous reçoivent elles-mêmes."

**Verdict : MOYEN**

**Diagnostic :**
"Versi Immobilier, c'est trois associés" — le "c'est" est du registre oral, familier, qui tranche avec le ton de versi.fr. Le sous-titre est informatif mais répétitif par rapport à ce qui a déjà été dit dans les Arguments ("Vous parlez au propriétaire-vendeur"). La section existe pour crédibiliser les personnes derrière Versi — elle devrait montrer les visages et les prénoms, pas décrire le nombre d'associés. Sans photo ni prénom, cette section n'accomplit pas son objectif.

**Rewrite :**

```
H2 : Trois associés. Chaque bien porté de l'achat à la remise des clés.

Sous-titre : Versi ne mandate pas d'intermédiaire. Les trois fondateurs achètent, rénovent, font visiter et négocient eux-mêmes. Vous parlez toujours à quelqu'un qui connaît le bien.
```

**Note :** si les prénoms et photos des trois associés ne sont pas affichés dans cette section, le rewrite n'est qu'un demi-correctif. La crédibilité vient des visages, pas du texte seul.

---

### 6. SellerBanner

**Copy actuel (contexte inline) :**
> "Vous avez un bien à vendre à Lille ? Versi Immobilier achète en direct auprès des propriétaires. Offre ferme sous 7 jours. Aucun mandat, aucune mise en vente prolongée."
> CTA : "Nous parler de votre bien →"

**Verdict : EXCELLENT**

**Diagnostic :**
C'est la section la plus forte de la page. Trois faits, zéro vantardise, un CTA clair. "Offre ferme sous 7 jours" est une promesse différenciante et mesurable. "Aucun mandat, aucune mise en vente prolongée" adresse directement l'objection principale du vendeur (attente, incertitude). Le CTA "Nous parler de votre bien" est doux mais direct — il ouvre une conversation sans promettre une offre immédiate.

Aucun rewrite nécessaire. C'est le modèle à suivre pour les autres sections.

**Note sur Pierre (prescripteur) :** Pierre ne se sent pas rejeté par cette section — elle lui parle directement en l'adressant comme vendeur, pas comme acheteur. C'est un point fort à conserver.

---

### 7. Nav

**Copy actuel (contexte inline) :**
> NOS BIENS | RÉALISATIONS | NOTRE APPROCHE | CONTACT
> CTA secondaire : "Proposer un bien"
> CTA primaire : "NOS BIENS"

**Verdict : BON**

**Diagnostic :**
La navigation est claire et hiérarchise correctement l'objectif (NOS BIENS en premier et en CTA). "RÉALISATIONS" est un bon signal de preuve sociale. "NOTRE APPROCHE" est plus faible — c'est un terme générique que tout le monde utilise. "Proposer un bien" dans la nav secondaire adresse Pierre (le prescripteur/vendeur) sans encombrer la nav principale.

**Micro-ajustement :**

```
"NOTRE APPROCHE" → "COMMENT VERSI TRAVAILLE"
```

Plus court : conserver "NOTRE APPROCHE" si la contrainte de longueur de nav l'exige. Plus différenciant : "COMMENT VERSI TRAVAILLE" indique un point de vue, pas une rubrique. Alternative concise : "LA MÉTHODE".

---

## Architecture homepage — L'ordre est-il bon ?

**Ordre actuel :**
1. Hero
2. AvailableProperties
3. Arguments
4. Stats
5. TeamTeaser
6. SellerBanner

**Verdict : Ordre partiellement correct — deux corrections à apporter**

### Problème 1 : Les Arguments sont trop loin du Hero

L'acheteur arrive sur la page. Il voit le Hero (qui décrit Versi, pas les biens). Il voit les biens (PropertyCards). Puis il doit défiler jusqu'aux Arguments pour comprendre POURQUOI acheter ici. C'est un parcours de conviction en deux étapes alors qu'il devrait être en une : Hero → Arguments (conviction rapide) → Biens (passage à l'acte).

**Ordre recommandé :**
1. Hero (reformulé — parle des biens et de l'acquéreur)
2. Arguments (3 raisons d'acheter ici — juste sous le Hero, avant les biens)
3. AvailableProperties (une fois convaincu, l'acheteur parcourt les biens)
4. Stats (crédibilise le volume et la méthode)
5. TeamTeaser (met des visages derrière les stats)
6. SellerBanner (adresse Pierre en fin de parcours — il a défilé jusqu'ici)

### Problème 2 : Il manque une section "Pourquoi Lille / pourquoi maintenant"

Aucune section ne contextualise la géographie ou l'opportunité. Versi opère à Lille — marché spécifique avec ses propres dynamiques. Un acquéreur hors de Lille (investisseur, acheteur de résidence secondaire) n'a aucun élément pour évaluer si c'est une bonne décision de marché. Cette section est absente.

**Section manquante recommandée :**
Un bloc factuel entre les Stats et le TeamTeaser — 2-3 phrases sur Lille (marché, quartiers, tendances) sans posture de "conseil" générique. Exemple de registre : "Lille. Deuxième métropole étudiante de France. Marché locatif dense, rendements stables, foncier encore accessible." — puis un lien vers la page RÉALISATIONS.

---

## Note globale : 5/10

**Justification :**
- SellerBanner : excellent (référence pour le reste de la page)
- Arguments : bon copy, mal placé
- Stats : bon
- AvailableProperties : correct dans la position, faible sur le titre
- Hero : faible — problème de sujet (Versi vs l'acheteur) et de registre ("on")
- TeamTeaser : moyen — sans visages, la section ne sert à rien

Le principal levier d'amélioration n'est pas stylistique — c'est structurel. Le H1 doit parler à l'acheteur, et les Arguments doivent remonter avant les biens.

---

## 5 actions prioritaires

**1. Réécrire le H1 du Hero — P0**
Passer de "On connaît chaque mur" à une promesse centrée sur l'appartement et l'acquéreur. Supprimer "on", passer à "Versi" ou "Nous". Modèle fourni dans le rewrite ci-dessus. Impact : première impression, bounce rate.

**2. Remonter les Arguments avant AvailableProperties — P0**
Modifier l'ordre dans `HomePage.jsx` : `<Arguments />` passe avant `<AvailableProperties />`. Zéro réécriture de copy nécessaire pour cette action — c'est un changement de deux lignes dans le JSX. Impact immédiat sur le parcours de conviction.

**3. Renommer le titre AvailableProperties — P1**
"Ce qu'on vend en ce moment" → "Les biens disponibles." Suppression du "on" et de la familiarité. Une ligne de code dans le composant.

**4. Ajouter les photos et prénoms dans TeamTeaser — P1**
Sans visages, la section TeamTeaser est du texte mort. C'est la section la moins convaincante de la page malgré un bon copy rewrité. L'acheteur a besoin de voir à qui il parle — pas de lire qu'ils sont "trois".

**5. Retravailler le sous-titre du Hero — P2**
"Des appartements à Lille, vendus en direct par celui qui les a portés" — "celui qui les a portés" est singulier alors que Versi, c'est trois personnes. Incohérence factuelle. Corriger dans le même sprint que le H1.

---

## Hypothèses à valider

[HYPOTHÈSE : la section "Pourquoi Lille" n'existe pas actuellement — à confirmer avant de recommander sa création. Si une page RÉALISATIONS couvre déjà ce contenu, un simple lien depuis la homepage peut suffire.]

[HYPOTHÈSE : Pierre (prescripteur) est un propriétaire qui visite la homepage avant de proposer son bien — le parcours SellerBanner en fin de page lui est adressé. Si Pierre arrive directement sur /vendre, cette hypothèse de parcours est à invalider.]

---

## Handoff

---
**Handoff → @copywriter**

- Fichier produit : `docs/reviews/vi-homepage-audit-creative.md`
- Décisions prises :
  - Hero : rewrite complet fourni (H1, sous-titre, CTAs) — passage au "Nous/Versi", suppression du "on", sujet = l'appartement et l'acquéreur
  - Arguments : copy BON, position à corriger (remonter avant AvailableProperties)
  - SellerBanner : EXCELLENT, modèle de référence pour le reste de la page
  - Ordre recommandé : Hero → Arguments → AvailableProperties → Stats → TeamTeaser → SellerBanner
- Points d'attention :
  - Vouvoiement strict partout — jamais "tu"
  - "Versi" ou "Nous" — jamais "on"
  - Phrases courtes, affirmatives, factuelles — le modèle est SellerBanner
  - Pierre (prescripteur/vendeur) adressé uniquement en SellerBanner et CTA secondaire nav — ne pas l'interpeller dans les sections acheteur
  - La section TeamTeaser est bloquée sans photos/prénoms — signaler au fondateur avant d'investir du copy dans cette section

**Handoff → @fullstack**
- Action code prioritaire : dans `HomePage.jsx`, inverser l'ordre `<Arguments />` et `<AvailableProperties />` — Arguments avant les biens. C'est la modification à plus fort impact, deux lignes de JSX.
- Action code secondaire : dans `AvailableProperties`, remplacer le titre "Ce qu'on vend en ce moment" par "Les biens disponibles."

---
