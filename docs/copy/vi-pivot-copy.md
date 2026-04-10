# Versi Immobilier — Copy pivot acquéreur
**Produit par** : @copywriter | **Date** : 2026-04-10
**Frameworks** : AIDA (Hero), StoryBrand (Process), PAS (SellerBanner), FAB (Stats)
**Niveau de conscience** : Solution-Aware — l'acquéreur sait qu'il cherche un bien rénové sans mauvaise surprise, il ne connaît pas encore Versi
**Objections traitées** : "Comment savoir si la rénovation est sérieuse ?" → traçabilité documentée | "Est-ce que le prix est justifié ?" → chiffres opérateur | "Est-ce que j'arrive trop tard ?" → précommercialisation | "Sans condition suspensive = je prends un risque ?" → qualification juridique systématique
**Usage** : copy prêt à implémenter — chaque section indique les fichiers cibles pour @fullstack

---

## Section 1 — Hero [Framework : AIDA]

> Fichier cible : `versi-immobilier/src/components/Hero.jsx`
> Remplace intégralement le contenu textuel actuel. Structure JSX conservée.

### Copy exact

```
Surtitre :   MARCHAND DE BIENS — FRANCE

H1 :         Avant le marché.
             Sans les risques.

Sous-titre : Des biens sourcés, transformés et documentés par un opérateur
             intégré. Disponibles à la vente et en précommercialisation à Lille.

CTA principal :   Voir les biens disponibles          → /nos-biens
CTA secondaire :  Vous avez un bien à céder →          → /vendre
```

### Justification ligne à ligne

- **Surtitre** : conservé de l'existant — signal de légitimité professionnelle, contextualise la portée nationale
- **H1** : tagline validée fondateur. Deux phrases courtes, deux promesses distinctes (accès prioritaire + fiabilité). La rupture de ligne renforce le rythme binaire
- **Sous-titre** : trois verbes d'action (sourcés / transformés / documentés) = le process Versi en une phrase. "Opérateur intégré" différencie du particulier. "Lille" ancre géographiquement dès le Hero — priorité 1 validée
- **CTA principal** : verbe + objet + qualificatif. 4 mots. Oriente immédiatement vers le portefeuille
- **CTA secondaire** : signal vendeur secondaire, texte flèche conforme au style existant du site

---

## Section 2 — Stats [Framework : FAB]

> Fichier cible : `versi-immobilier/src/components/Stats.jsx` (tableau `stats` ou équivalent)
> Réordonnancement + remplacement de la stat centrale

### Copy exact — 3 stats dans l'ordre

```
Stat 1 (gauche)   :   21          |   opérations réalisées
Stat 2 (centre)   :   3           |   biens disponibles maintenant
Stat 3 (droite)   :   3,2 M€      |   de volume traité
```

### Notes d'implémentation

- **Stat 1** : track record en premier — rassure l'acquéreur sur la solidité de l'opérateur avant de lui montrer le stock
- **Stat 2** : remplace "7 jours pour une offre ferme" (100% vendeur). Le chiffre "3" correspond aux biens au lancement — à mettre à jour dynamiquement dès que le portefeuille évolue. Label : "biens disponibles maintenant" (pas "en portefeuille" — trop abstrait pour un primo-accédant)
- **Stat 3** : "volume traité" plutôt que "actifs acquis" — plus lisible pour un non-investisseur

---

## Section 3 — Process acquéreur [Framework : StoryBrand]

> Fichier cible : `versi-immobilier/src/components/Process.jsx` (tableau `STEPS` + titre `h2`)
> Remplace intégralement les 3 étapes vendeur. Le titre H2 change aussi.

### Copy exact — Titre H2

```
Trois étapes pour acquérir sans surprise.
```

### Copy exact — 3 étapes

```
STEP 01
Titre       : Vous parcourez le portefeuille.
Description : Biens disponibles à la vente et en précommercialisation à Lille
              et en région. Chaque fiche détaille l'opération — adresse,
              travaux réalisés, prix, disponibilité.

STEP 02
Titre       : Vous prenez contact directement.
Description : Un échange avec l'équipe Versi Immobilier. Pas un agent
              intermédiaire — l'opérateur qui a transformé le bien, qui
              connaît chaque détail de l'opération.

STEP 03
Titre       : Vous signez en sachant ce que vous achetez.
Description : Chaque bien est documenté — historique des travaux, état avant
              transformation, chiffres de l'opération. Pas de surprise après
              la signature.
```

### Note pour @fullstack

Le titre H2 actuel dans Process.jsx est `"Trois étapes. Sept jours. Une offre ferme."` — il est 100% vendeur. Remplacer par le titre ci-dessus.

---

## Section 4 — SellerBanner [Framework : PAS]

> Fichier cible : `versi-immobilier/src/components/SellerBanner.jsx` (copy uniquement)
> CTA "Soumettre mon bien" → `/vendre#formulaire` : conserver

### Copy exact

```
Accroche :   Vous avez un bien à céder ?

Corps :      Offre d'achat ferme en 7 jours. Sans intermédiaire.
             Sans condition suspensive de financement sous réserve
             d'acceptation du dossier de crédit.

CTA :        Soumettre mon bien
```

### Justification

- L'accroche en question directe identifie immédiatement la cible vendeur
- "Offre ferme en 7 jours" conservé — c'est le différenciateur fort côté vendeur
- "Sans condition suspensive de financement" qualifié obligatoirement ("sous réserve d'acceptation du dossier de crédit") — obligation juridique, protège Versi et informe le vendeur sans annuler la promesse
- Trois éléments en asyndète (sans connecteur) : rythme direct, style Versi
- Le CTA est conservé à l'identique — il est juste et précis

---

## Section 5 — Nav [Framework : N/A — architecture de navigation]

> Fichier cible : `versi-immobilier/src/components/Nav.jsx`
> Modifications : tableau `NAV_ITEMS` + CTA fixe desktop + overlay mobile

### Copy exact — Ordre des items NAV_ITEMS

```javascript
const NAV_ITEMS = [
  { label: 'NOS BIENS',       href: '/nos-biens' },
  { label: 'RÉALISATIONS',    href: '/realisations' },
  { label: 'NOTRE APPROCHE',  href: '/notre-approche' },
  { label: 'CONTACT',         href: '/contact' },
  { label: 'VENDRE UN BIEN',  href: '/vendre' },
];
```

### CTA fixe desktop

```
Texte :   VOIR LES BIENS
Lien :    /nos-biens
Classe :  nav__cta  (inchangée)
```

### Lien secondaire vendeur (desktop uniquement, à côté du CTA)

```
Texte :   Vendre un bien
Lien :    /vendre
Classe :  nav__cta-secondary  (nouvelle classe — style texte simple, sans fond)
```

### Overlay mobile — dernier item

```
Remplacer dans nav__overlay-cta :
AVANT : SOUMETTRE MON BIEN  → /vendre#formulaire
APRÈS : VOIR LES BIENS      → /nos-biens
```

### Justification

- "NOS BIENS" en 1re position : inchangé, déjà correct
- "RÉALISATIONS" remonte en 2e : l'acquéreur veut voir le track record avant de comprendre l'approche
- "VENDRE UN BIEN" passe en dernière position du menu : visible mais clairement secondaire
- CTA fixe bascule vers l'action acquéreur — c'est désormais la conversion principale du site

---

## Section 6 — Page Nos Biens [Framework : AIDA]

> Fichier cible : `versi-immobilier/src/pages/NosBiens.jsx` ou équivalent
> Hero court de page + copy état vide

### Hero court — copy exact

```
H1 :         Nos biens disponibles

Sous-titre : Appartements et maisons à Lille et en région — sourcés,
             transformés et documentés par Versi Immobilier. Disponibles
             à la vente et en précommercialisation.
```

### État vide — copy exact

> S'affiche quand aucun bien actif n'est chargé ou en placeholder

```
Titre état vide :   Nouveau bien en cours d'acquisition.

Corps :             Versi Immobilier opère en continu dans la métropole
                    lilloise. Les prochains actifs entreront en
                    précommercialisation avant leur mise en vente ouverte.

CTA état vide :     Être notifié en avant-première    → [formulaire email inline]

Sous-CTA :          Voir nos réalisations →            → /realisations
```

### Copy formulaire de notification (état vide)

```
Label champ :   Votre adresse email
Placeholder :   prenom.nom@email.fr
CTA formulaire: Recevoir les prochains biens
Message succès: Enregistré. Vous serez contacté avant la mise en vente.
Message erreur: L'enregistrement n'a pas abouti. Écrivez à contact@versi-immobilier.fr.
```

### Justification

- L'état vide ne dit pas "revenez plus tard" — il transforme le vide en liste d'attente qualifiée
- "Avant-première" est délibéré : c'est la promesse de précommercialisation traduite en bénéfice concret pour le primo-accédant
- Le sous-CTA vers /realisations permet à l'acquéreur de valider le track record même si le portefeuille est en placeholder

---

## Section 7 — Page Vendre un bien [Framework : StoryBrand]

> Fichier cible : page `/vendre` — chapô à ajouter en tête de page, avant le formulaire existant
> Le process vendeur (3 étapes actuelles de Process.jsx) migre ici

### Chapô — copy exact

```
Surtitre :   PROPRIÉTAIRES & CÉDANTS

H1 :         Vous cédez un bien.
             Offre ferme en 7 jours.

Chapô :      Cette page s'adresse aux propriétaires souhaitant céder un
             bien immobilier. Versi Immobilier achète en nom propre — pas
             de mise en vente, pas de mandat d'agence, pas d'intermédiaire.
             Vous recevez une offre d'achat ferme sous 7 jours calendaires,
             ou un refus motivé par écrit.
```

### Process vendeur — copy exact (repris de Process.jsx actuel, avec qualifications)

```
STEP 01
Titre       : Vous soumettez votre dossier.
Description : Adresse, type de bien, surface, situation locative. En ligne
              ou par email. Nous accusons réception sous 24h.

STEP 02
Titre       : Nous instruisons.
Description : Visite du bien, analyse du marché, modélisation financière.
              Entièrement géré en interne — aucune délégation externe.

STEP 03
Titre       : Vous recevez une offre ferme.
Description : Offre d'achat ferme et définitive sous 7 jours calendaires.
              Sans condition suspensive de financement, sous réserve
              d'acceptation du dossier de crédit. Ou refus motivé par écrit.
```

### Note de qualification juridique

"Sans condition suspensive de financement" doit toujours être suivi de "sous réserve d'acceptation du dossier de crédit" dans tous les contextes où Versi fait cette promesse à un vendeur. Cette formulation protège Versi et informe le vendeur de manière exacte.

---

## Section 8 — Page Contact [Framework : AIDA]

> Fichier cible : `versi-immobilier/src/pages/Contact.jsx` ou formulaire intégré
> Sélecteur d'intention en tête de formulaire

### Sélecteur d'intention — labels exacts

```
Option 1 (défaut) :   Je cherche un bien à acquérir
Option 2 :            J'ai un bien à céder
Option 3 :            Je suis partenaire ou prescripteur
```

### Copy adaptatif par intention

**Intention 1 — Acquéreur**
```
H2 du formulaire :   Quel type de bien recherchez-vous ?

Champs :
  - Votre nom
  - Votre email
  - Votre téléphone (optionnel)
  - Type de bien recherché  [Appartement / Maison / Les deux]
  - Surface souhaitée       [1-2 pièces / 3-4 pièces / 5 pièces et +]
  - Votre message (optionnel)

CTA formulaire :     Envoyer ma recherche

Message succès :     Votre recherche est enregistrée. Nous vous contacterons
                     dès qu'un bien correspond à votre profil.
Message erreur :     L'envoi n'a pas abouti. Écrivez à contact@versi-immobilier.fr.
```

**Intention 2 — Vendeur**
```
H2 du formulaire :   Décrivez votre bien

Champs :
  - Votre nom
  - Votre email
  - Votre téléphone
  - Adresse du bien
  - Type de bien          [Appartement / Maison / Immeuble / Autre]
  - Surface approximative
  - Situation locative    [Libre / Occupé]
  - Votre message (optionnel)

CTA formulaire :     Soumettre mon bien

Message succès :     Dossier reçu. Nous accusons réception sous 24h et
                     revenons vers vous sous 7 jours avec une offre ferme
                     ou un refus motivé.
Message erreur :     L'envoi n'a pas abouti. Écrivez à contact@versi-immobilier.fr.
```

**Intention 3 — Partenaire**
```
H2 du formulaire :   Votre projet de partenariat

Champs :
  - Votre nom
  - Votre organisation
  - Votre email
  - Votre message

CTA formulaire :     Envoyer

Message succès :     Message reçu. Nous vous répondons sous 48h.
Message erreur :     L'envoi n'a pas abouti. Écrivez à contact@versi-immobilier.fr.
```

### Note d'implémentation

Deux approches possibles pour @fullstack :
1. **Formulaire unique adaptatif** : un seul formulaire dont les champs et labels s'affichent conditionnellement selon la sélection (préféré — une seule URL, meilleur pour le SEO)
2. **Trois formulaires distincts** : trois blocs masqués par CSS/JS selon la sélection (plus simple à coder, moins élégant)

---

## Section 9 — Footer [Framework : N/A — architecture de liens]

> Fichier cible : `versi-immobilier/src/components/Footer.jsx`
> Structure équilibrée acquéreur / vendeur

### Copy exact — structure colonnes

```
COLONNE 1 — Logo + baseline
  VERSI
  IMMOBILIER
  Opérateur immobilier intégré
  Lille & France

COLONNE 2 — Acquéreurs  [titre de colonne]
  Nos biens disponibles          → /nos-biens
  Nos réalisations               → /realisations
  Notre approche                 → /notre-approche
  [CTA inline] Être notifié en avant-première  → /nos-biens#notification

COLONNE 3 — Vendeurs  [titre de colonne]
  Soumettre un bien              → /vendre
  Notre process                  → /vendre#process
  Contact                        → /contact

COLONNE 4 — Légal & Mentions
  Mentions légales               → /mentions-legales
  © 2026 Versi Immobilier
  Tous droits réservés
```

### Note sur le CTA footer acquéreur

"Être notifié en avant-première" pointe vers `/nos-biens#notification` — l'ancre correspond au formulaire de notification de l'état vide (Section 6). @fullstack doit s'assurer que l'ancre existe même quand des biens sont disponibles (le formulaire de notification peut rester accessible en bas de la page Nos Biens, pas seulement dans l'état vide).

---

## Récapitulatif des décisions copy

| Section | Décision clé | Justification |
|---|---|---|
| Hero H1 | "Avant le marché. Sans les risques." | Tagline validée fondateur — adresse les 2 douleurs acquéreur |
| Hero sous-titre | "Disponibles à Lille" | Priorité géographique 1 — primo-accédants lillois |
| Stats stat centrale | "3 biens disponibles maintenant" | Remplacement stat vendeur "7 jours offre ferme" |
| Process titre | "Trois étapes pour acquérir sans surprise." | Orientation acquéreur — "sans surprise" traite l'objection principale |
| SellerBanner | Qualification "sous réserve d'acceptation du dossier de crédit" | Obligation juridique sur "sans condition suspensive" |
| Nav CTA | "VOIR LES BIENS" → /nos-biens | CTA principal bascule vers l'action acquéreur |
| État vide | Liste d'attente précommercialisation | Transforme le vide en actif — pas une page morte |
| Page vendre chapô | "Cette page s'adresse aux propriétaires…" | Signal clair pour éviter la confusion avec les acquéreurs |
| Contact | Sélecteur d'intention 3 options | Qualification des leads dès le formulaire |
| Footer | 2 colonnes distinctes acquéreur / vendeur | Équilibre sans confusion des cibles |

---

## Hypothèses à valider

| # | Hypothèse | Impact si incorrecte |
|---|---|---|
| H1 | 3 biens à l'adresse "10 rue des Muguets" en placeholder photos | La stat "3 biens disponibles" doit être mise à jour si le nombre change |
| H2 | L'URL de la page Nos Biens est `/nos-biens` | Tous les liens de navigation à adapter si l'URL diffère |
| H3 | Le formulaire de notification email peut rester accessible même quand des biens sont disponibles (pas seulement dans l'état vide) | Si non, retirer le CTA footer "Être notifié en avant-première" |
| H4 | Aucune obligation légale supplémentaire sur la qualification "sans condition suspensive" (au-delà de la formulation adoptée) | À valider avec @legal avant mise en production |

---

**Handoff → @orchestrator**

**Fichiers produits** :
- `/home/user/Versi/docs/copy/vi-pivot-copy.md`

**Décisions prises** :
- Framework AIDA sur le Hero — acquéreur en mode Solution-Aware, pas Unaware
- Qualification juridique systématique de "sans condition suspensive" : "sous réserve d'acceptation du dossier de crédit"
- Stat centrale remplacée par "3 biens disponibles maintenant" — chiffre de lancement validé fondateur
- État vide page Nos Biens transformé en capture de leads précommercialisation
- Sélecteur d'intention en 3 options sur la page Contact — formulaire adaptatif recommandé
- "VOIR LES BIENS" comme CTA nav principal — "SOUMETTRE MON BIEN" en secondaire

**Formulations non négociables** :
- "Avant le marché. Sans les risques." — tagline, ne pas reformuler
- "sourcés, transformés et documentés" — triptyque de la proposition de valeur acquéreur
- "opérateur intégré" — différenciateur central, ne pas remplacer par "agence" ou "prestataire"
- Qualification "sous réserve d'acceptation du dossier de crédit" — obligatoire à chaque occurrence de "sans condition suspensive"
- Vouvoiement systématique — sans exception dans tous les états (succès, erreur, formulaire)

**Points d'attention pour @fullstack** :
- Process.jsx : titre H2 + 3 étapes à remplacer intégralement — voir Section 3
- Nav.jsx : tableau NAV_ITEMS réordonné + CTA fixe + nouveau lien secondaire nav__cta-secondary — voir Section 5
- Page Nos Biens : l'ancre `#notification` doit exister même quand des biens sont chargés
- Page Contact : sélecteur d'intention avec logique conditionnelle — voir Section 8 pour les deux approches possibles
- Stats.jsx : libellé "biens disponibles maintenant" (lowercase) pour le label de la stat centrale

**Points d'attention pour @legal** :
- Valider la formulation complète de la qualification "sans condition suspensive" (Section 4 et Section 7)
- Valider que le chapô de la page Vendre (Section 7) est conforme aux obligations d'information précontractuelle
