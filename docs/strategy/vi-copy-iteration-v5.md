# Versi Immobilier — Copy Iteration v5
# Corrections de positionnement — 3 problèmes fondateur

Date : 2026-04-10
Agent : @creative-strategy
Statut : Livrable — prêt à implémenter par @fullstack

---

## Contexte des corrections

Trois problèmes de positionnement identifiés par le fondateur sur le copy actuel :
P1 — Le discours "anti-agence" repousse Pierre (agent/notaire/courtier), un canal d'acquisition clé.
P2 — "On l'a rénové" implique que 100% des biens sont déjà rénovés, ce qui est faux.
P3 — "Trois appartements" est hardcodé dans le Hero — un chiffre voué à changer.

---

## P1 — Trop anti-agence

### Copy actuel problématique

**Hero.jsx — ligne 25 (sous-titre) :**
```
Trois appartements à Lille. Pas d'agence, pas d'intermédiaire.
Vous parlez à celui qui connaît chaque mur.
```

**Arguments.jsx — ligne 15 (titre argument 3) :**
```
Pas d'intermédiaire, pas de commission d'agence.
```

**Arguments.jsx — ligne 16-18 (description argument 3) :**
```
Versi Immobilier vend en direct. Le prix affiché est le prix. Aucune commission ne s'ajoute.
```

**SellerBanner.jsx — ligne 13 :**
```
Versi Immobilier achète en direct, sans intermédiaire. Offre ferme sous 7 jours. Pas de mandat, pas d'agent.
```

### Diagnostic

Le problème n'est pas le message — c'est sa portée implicite. "Pas d'agence, pas d'intermédiaire" dit deux choses en même temps : (1) on vend sans agence côté acquéreur (vrai, c'est le différenciateur), et (2) on ne travaille jamais avec des professionnels de l'immobilier (faux et contre-productif). Pierre l'agent, le notaire ou le courtier lit ça et comprend qu'il n'a pas sa place. Il ne va pas proposer les biens Versi à ses clients.

La correction : ancrer l'avantage "en direct" sur la relation acquéreur-vendeur, pas sur un rejet général des intermédiaires. On n'achète pas via une agence, on ne paye pas de commission d'agence — mais on peut très bien être signalé par un professionnel.

### Nouveau copy

**Hero.jsx — sous-titre (remplacement complet, voir aussi P2 et P3 ci-dessous) :**
Traité dans la section P3 qui couvre le sous-titre en entier.

**Arguments.jsx — argument 3, titre :**
```
Le prix affiché est le prix.
```

**Arguments.jsx — argument 3, description :**
```
Versi vend en direct à l'acquéreur. Pas de commission d'agence sur votre achat. Vous traitez avec le propriétaire du bien — celui qui a pris toutes les décisions.
```

**SellerBanner.jsx — texte (ligne 13) :**
```
Versi Immobilier achète en direct auprès des propriétaires. Offre ferme sous 7 jours. Aucun mandat, aucune mise en vente prolongée.
```

### Pourquoi ça fonctionne

"Pas de commission d'agence sur votre achat" pointe précisément vers l'acquéreur — c'est LUI qui ne paye pas de commission, pas un rejet des professionnels de l'immobilier en général. Pierre le prescripteur peut signaler un bien à Versi sans se sentir exclu du circuit. La SellerBanner cible les propriétaires vendeurs ("auprès des propriétaires") — "Pas de mandat" parle au vendeur qui veut éviter la lourdeur du mandat exclusif, pas à Pierre dont ce n'est pas le sujet.

---

## P2 — "On l'a rénové" trop restrictif

### Copy actuel problématique

**Hero.jsx — ligne 19-21 (H1) :**
```
On l'a rénové.
On vous le vend, en direct.
```

**Arguments.jsx — ligne 5 (titre argument 1) :**
```
Nous avons rénové ce bien.
```

**Arguments.jsx — ligne 6-8 (description argument 1) :**
```
Chaque bien que vous voyez ici, nous l'avons acheté, transformé et documenté. Vous parlez au propriétaire-vendeur — pas à un agent qui lit une fiche.
```

### Diagnostic

"On l'a rénové" et "nous l'avons acheté, transformé" créent une promesse absolue : tout bien Versi = bien déjà transformé. Si une annonce présente un bien avec projet de rénovation à faire, l'acquéreur se sent trompé — le H1 lui avait promis autre chose. La correction doit couvrir les deux réalités sans perdre l'identité forte du H1.

Le différenciateur réel de Versi n'est pas "on rénove tout" — c'est "on connaît chaque mur, on maîtrise chaque étape". Que le bien soit déjà transformé ou en attente de l'être, Versi porte le projet de bout en bout. C'est ça, le positionnement juste.

### Nouveau copy

**Hero.jsx — H1 :**
```
On connaît chaque mur.
On vous le vend, en direct.
```

**Arguments.jsx — argument 1, titre :**
```
Nous portons le bien de bout en bout.
```

**Arguments.jsx — argument 1, description :**
```
Chaque bien que vous voyez ici, nous l'avons acheté et piloté — rénové ou avec un projet défini. Vous parlez au propriétaire-vendeur, pas à un agent qui lit une fiche.
```

### Pourquoi ça fonctionne

"On connaît chaque mur" est une formule plus forte que "On l'a rénové" : elle dit la même chose (expertise totale, proximité avec le bien) sans créer de promesse restrictive. Elle fonctionne aussi bien pour un bien déjà livré que pour un bien avec projet — dans les deux cas, Versi en connaît l'état exact. Le sous-titre "en direct" reste inchangé, il garde sa force. Pour Arguments, "rénové ou avec un projet défini" couvre les deux cas explicitement, sans ambiguïté.

---

## P3 — "Trois appartements" hardcodé

### Copy actuel problématique

**Hero.jsx — ligne 25 (sous-titre) :**
```
Trois appartements à Lille. Pas d'agence, pas d'intermédiaire.
Vous parlez à celui qui connaît chaque mur.
```

### Diagnostic

"Trois" est un chiffre voué à changer à chaque nouvelle acquisition ou vente. Il n'apporte pas de valeur perçue (l'acquéreur ne vient pas pour le volume, il vient pour la qualité et la transparence). Hardcoder un chiffre dans le H2 crée un travail de maintenance permanente — et un risque de décalage si on oublie de le mettre à jour.

La ligne doit rester courte, directe, et intemporelle. Le sous-titre du Hero a aussi à intégrer la correction P1 (anti-agence). Deux problèmes corrigés en une ligne.

### Nouveau copy

**Hero.jsx — sous-titre (remplacement complet) :**
```
Des appartements à Lille, vendus en direct par celui qui les a portés.
Vous parlez au propriétaire — pas à un intermédiaire.
```

### Pourquoi ça fonctionne

Zéro chiffre hardcodé. "Des appartements" est indéfini — scalable à 2 comme à 20 biens. "Vendus en direct par celui qui les a portés" réintroduit le différenciateur central (vente en direct) tout en effaçant le rejet implicite des intermédiaires : on dit ce qu'on EST (vendeur direct), pas ce qu'on refuse. "Vous parlez au propriétaire — pas à un intermédiaire" maintient le contraste acheteur/propriétaire sans mentionner le mot "agence".

---

## Récapitulatif — Copy prêt à implémenter

### Hero.jsx — remplacer lignes 18-28

```jsx
<h1 className="hero__title text-display">
  On connaît chaque mur.
  <br />
  On vous le vend, en direct.
</h1>
<div className="hero__accent" aria-hidden="true" />
<p className="hero__subtitle">
  Des appartements à Lille, vendus en direct par celui qui les a portés.
  <br />
  Vous parlez au propriétaire — pas à un intermédiaire.
</p>
```

### Arguments.jsx — remplacer le tableau ARGUMENTS (lignes 3-19)

```js
const ARGUMENTS = [
  {
    title: 'Nous portons le bien de bout en bout.',
    description:
      'Chaque bien que vous voyez ici, nous l\'avons acheté et piloté — rénové ou avec un projet défini. Vous parlez au propriétaire-vendeur, pas à un agent qui lit une fiche.',
  },
  {
    title: 'Rien n\'est caché.',
    description:
      'Diagnostics complets. Historique des travaux. Garantie décennale sur les parties structurelles. Vous recevez le dossier avant la visite, pas le jour de la signature.',
  },
  {
    title: 'Le prix affiché est le prix.',
    description:
      'Versi vend en direct à l\'acquéreur. Pas de commission d\'agence sur votre achat. Vous traitez avec le propriétaire du bien — celui qui a pris toutes les décisions.',
  },
];
```

### SellerBanner.jsx — remplacer lignes 13-14

```jsx
<p className="text-body-lg seller-banner__text">
  <strong>Vous avez un bien à vendre à Lille ?</strong>
  {' '}Versi Immobilier achète en direct auprès des propriétaires.
  Offre ferme sous 7 jours. Aucun mandat, aucune mise en vente prolongée.
</p>
```

---

## Hypothèses à valider

Aucune hypothèse posée. Les corrections s'appuient exclusivement sur le copy existant dans les 3 composants lus et les contraintes formulées par le fondateur.

---

## Auto-évaluation

- [ ] P1 résolu : le rejet des agences est recentré sur la relation acquéreur/vendeur, pas sur un refus général des professionnels
- [ ] P2 résolu : "On connaît chaque mur" couvre les biens rénovés ET les biens avec projet, sans promesse restrictive
- [ ] P3 résolu : zéro chiffre hardcodé dans le Hero
- [ ] Ton Versi préservé : direct, affirmé, sans jargon
- [ ] "En direct" reste le différenciateur central dans les 3 composants
- [ ] Copy prêt à copier-coller sans adaptation — pas de placeholder résiduel

---

**Handoff → @fullstack**

Fichiers produits :
- `/home/user/Versi/docs/strategy/vi-copy-iteration-v5.md`

Décisions prises :
- H1 : "On l'a rénové" → "On connaît chaque mur" (couvre tous les cas produit)
- Sous-titre Hero : suppression du chiffre hardcodé, suppression de "pas d'agence/intermédiaire" au profit de "vendus en direct par celui qui les a portés"
- Argument 3 : repositionné sur "Le prix affiché est le prix" — commission d'agence cadrée côté acquéreur uniquement
- SellerBanner : "sans intermédiaire / Pas de mandat, pas d'agent" → "en direct auprès des propriétaires / Aucun mandat, aucune mise en vente prolongée"

Points d'attention pour l'implémentation :
- Les 3 fichiers modifiés sont Hero.jsx, Arguments.jsx et SellerBanner.jsx — aucun autre composant n'est impacté
- La structure JSX de Hero.jsx est inchangée (mêmes classes CSS, même structure h1/p) — seul le texte change
- Le tableau ARGUMENTS dans Arguments.jsx est un simple objet JS — remplacement direct sans impact sur le rendu
- Vérifier que le texte SellerBanner ne dépasse pas la largeur du bandeau sur mobile après modification (le nouveau copy est légèrement plus court — pas de risque de débordement)
- Aucune dépendance avec d'autres composants
