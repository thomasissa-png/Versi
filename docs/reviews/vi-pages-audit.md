# Audit Copy & Stratégie — Pages secondaires Versi Immobilier
Date : 2026-04-10
Agent : @creative-strategy + @copywriter
Référence homepage : Hero centré bien, fond sombre Stats, brand voice avec caractère

---

## Synthèse exécutive

> À remplir après les audits individuels

---

## 1. Navigation (Nav.jsx)

**Copy actuel**
- Labels : NOS BIENS · RÉALISATIONS · NOTRE APPROCHE · CONTACT
- CTA principal : "Proposer un bien"
- Mobile overlay : "PROPOSER UN BIEN" (majuscules)

**Verdict** : MOYEN

**Diagnostic**
Quatre items de navigation sans hiérarchie claire entre les audiences. "NOTRE APPROCHE" est un titre autocentré — il parle de Versi, pas du bénéfice visiteur. "CONTACT" en dernier dans la nav alors que c'est le KPI North Star du site. Le CTA "Proposer un bien" est le seul point de conversion actif dans la nav — il est pertinent mais le verbe "proposer" est mou : Sophie ne "propose" pas son bien, elle veut s'en débarrasser avec certitude.

**Rewrite**

Labels suggérés :
```
NOS BIENS  ·  RÉALISATIONS  ·  NOTRE APPROCHE  ·  CONTACT
```
→ Conserver NOS BIENS, RÉALISATIONS, CONTACT (clairs)
→ Remplacer "NOTRE APPROCHE" par "QUI SOMMES-NOUS" ou supprimer ce label — conserver la page mais la renommer "COMMENT NOUS TRAVAILLONS"

CTA principal — rewrite :
```
Céder un bien
```
Ou, si on veut du caractère (aligné homepage) :
```
Vendre en 7 jours
```

Justification : "Proposer" implique une demande. "Céder" ou "Vendre en 7 jours" exprime l'action de l'utilisateur ET la promesse Versi en un seul mot/groupe.

---

## 2. Page Nos Biens (PropertiesPage.jsx)

**Copy actuel**
- H1 : "Nos biens."
- Sous-titre : "Appartements et maisons rénovés par Versi Immobilier. Diagnostics complets. Garanties décennales."
- Bandeau vendeur bas : "Vous avez un bien à céder ?" + CTA "Soumettre mon bien"
- État vide : "Aucun bien disponible actuellement. Revenez bientôt — ou soumettez votre bien à la vente."

**Verdict** : BON

**Diagnostic**
H1 court et direct : cohérent avec le ton. Le sous-titre est factuel et solide — "Diagnostics complets. Garanties décennales." est une vraie preuve, pas une promesse creuse. Le bandeau vendeur en bas de page est bien placé et logique. Ce qui manque : une accroche avant les filtres qui contextualise pour l'acquéreur — pourquoi ces biens sont différents des annonces LeBonCoin. L'état vide est un peu résigné ("Revenez bientôt") — Versi ne supplie pas, elle informe.

**Rewrite ciblé**

Texte sous H1 (renforcement) :
```
Chaque bien a été acquis, rénové et livré par Versi Immobilier.
Diagnostics complets. Garantie décennale sur les travaux. Zéro mauvaise surprise.
```

État vide (reformulation) :
```
Aucun bien disponible à date.
Nos acquisitions vont vite — soyez notifié en avant-première.
```
+ CTA : "Me tenir informé" (lien vers #notification ou formulaire Contact)

Bandeau vendeur (renforcement) :
```
Vous avez un bien à céder ?
Offre ferme sous 7 jours. Aucun mandat, aucune mise en vente prolongée.
```
+ CTA : "Soumettre mon dossier"

---

## 3. Page Vendre / SellPage (SellPage.jsx)

**Copy actuel**
- Surtitre : "PROPRIÉTAIRES & CÉDANTS"
- H1 : "Vous cédez un bien. / Offre ferme en 7 jours."
- Chapo : "Cette page s'adresse aux propriétaires souhaitant céder un bien immobilier. Versi Immobilier achète en nom propre — pas de mise en vente, pas de mandat d'agence, pas d'intermédiaire. Vous recevez une offre d'achat ferme sous 7 jours calendaires, ou un refus motivé par écrit."
- Section engagements : "Trois engagements. Aucune zone grise."
- Titres engagements : "Une offre ferme, pas une estimation." / "Sans condition suspensive de financement." / "7 jours, pas 7 semaines."
- Process : "Trois étapes. Sept jours."
- CTA formulaire : "Soumettre votre bien."
- Prescripteurs : "Vous êtes agent immobilier, notaire ou courtier ?"

**Verdict** : EXCELLENT

**Diagnostic**
C'est la page la plus aboutie du site. Le H1 est au niveau du SellerBanner de référence. Les trois engagements sont précis, différenciants, factuels. Le process est clair et chronométré. La section prescripteurs est présente et non-condescendante. La FAQ est utile et gère les vraies objections. Le chapo est légèrement trop long — 3 phrases là où 1 suffirait. La section prescripteurs mériterait un titre plus affirmé.

**Seul ajustement recommandé (pas un rewrite complet)**

Chapo : raccourcir de 3 phrases à 1 :
```
Versi Immobilier achète en direct — aucun mandat, aucun intermédiaire.
Offre ferme sous 7 jours, ou refus motivé par écrit.
```

Section prescripteurs — titre actuel : "Vous êtes agent immobilier, notaire ou courtier ?"
→ Conserver. Mais ajouter une ligne sous le CTA "Nous contacter directement" :
```
Dossier traité en 48h. Pas de mise en concurrence non annoncée.
```

---

## 4. Page Notre Approche (ApprochePage.jsx)

**Copy actuel**
- H1 : "Notre approche."
- Sous-titre : "Analyser, structurer, décider. En interne. Sans délégation externe."
- Process : "Quatre étapes. Zéro délégation." — 01 Sourcer · 02 Analyser · 03 Acquérir · 04 Transformer et livrer
- Différenciateurs : "Ce qui distingue Versi Immobilier."
- Équipe : "L'équipe." / "Trois fondateurs. Pas de comité. Pas d'intermédiaire."
- Critères d'acquisition : texte descriptif
- Lien Groupe Versi : texte mou

**Verdict** : MOYEN

**Diagnostic**
Le H1 "Notre approche." est le titre le plus générique du site — tout le monde a "une approche". Le sous-titre sauve la mise ("Sans délégation externe" est différenciant) mais arrive après un H1 faible. La section équipe est excellente côté structure mais les initiales en placeholder fragilisent la crédibilité — à corriger en priorité quand les photos arrivent. La section "Critères d'acquisition" est un bloc de texte sans relief — les critères mériteraient d'être en liste visuelle. Le lien vers Groupe Versi est du pur texte institutionnel sans valeur pour le visiteur. La page fait 7 sections — c'est trop long sans fil conducteur clair.

**Rewrite**

H1 :
```
Comment Versi travaille.
```
Ou, plus affirmé :
```
Décision interne. Offre ferme. Toujours.
```

Sous-titre (conserver, c'est bon) :
```
Analyser, structurer, décider. En interne. Sans délégation externe.
```

Titre section Process :
Actuel : "Quatre étapes. Zéro délégation."
→ Conserver, c'est excellent.

Titre section Équipe (renforcer) :
Actuel : "L'équipe."
→ Rewrite :
```
Les trois fondateurs. Vérifiables.
```
Sous-titre actuel : "Trois fondateurs. Pas de comité. Pas d'intermédiaire."
→ Conserver.

Titre section Critères :
Actuel : "Nos critères d'acquisition."
→ Rewrite :
```
Ce que nous instruisons — et ce que nous n'instruisons pas.
```

Lien Groupe Versi — texte actuel :
"Versi Immobilier est l'entité marchand de biens du Groupe Versi — une holding immobilière intégrée qui couvre l'ensemble du cycle de vie d'un actif."
→ Rewrite :
```
Versi Immobilier est l'entité marchand de biens du Groupe Versi.
Acquisition, transformation, structuration financière — un seul interlocuteur, du premier contact à la livraison.
```

---

## 5. Page Contact (ContactPage.jsx)

**Copy actuel**
- H1 : "Parlons de votre projet."
- Sous-titre : "Vous achetez, vous vendez ou vous cherchez un partenaire. Écrivez-nous directement."
- Côté gauche : email + "Nous accusons réception sous 24h. Visite organisée sous 72h." + zones géographiques + lien versi.fr + lien vendre
- Pas de H2, pas de contexte sur le délai de réponse au-delà du 24h

**Verdict** : MOYEN

**Diagnostic**
H1 "Parlons de votre projet" — trop générique et autocentré. C'est la phrase de contact que tout le monde utilise. Le sous-titre "Vous achetez, vous vendez ou vous cherchez un partenaire" est bon — il identifie les trois audiences sans les exclure. Mais entre le H1 et le formulaire, il n'y a aucune friction positive, aucun élément de réassurance supplémentaire. La page Contact est souvent la dernière avant la décision — elle doit réassurer autant que convertir. Les zones géographiques sont listées sans contexte (pourquoi Lille + Paris et pas Lyon ?). Le lien "Vous souhaitez soumettre un bien à la vente ?" est utile mais mal mis en valeur.

**Rewrite**

H1 :
```
Écrivez-nous.
```
Sous-titre (renforcement) :
```
Vous achetez, vous cédez ou vous cherchez un partenaire opérationnel.
Réponse sous 24h — sans standard, sans assistant.
```

Texte réassurance côté gauche (compléter l'actuel) :
```
Nous accusons réception sous 24h.
Visite organisée sous 48 à 72h si votre dossier entre dans nos critères.

Actifs à Lille, Paris et Île-de-France.
Entre 250 000 € et 1 000 000 €.
```

Lien SellPage (reformuler) :
Actuel : "Vous souhaitez soumettre un bien à la vente ?"
→ Rewrite :
```
Vous avez un bien à céder ? Offre ferme sous 7 jours — formulaire dédié.
```

---

## 6. Page Réalisations (RealisationsPage.jsx)

**Copy actuel**
- H1 : "Réalisations."
- Sous-titre : "Chaque rénovation documentée — adresse, délais, chiffres. Aucun chiffre inventé."
- Stats block : X rénovations terminées · 3,2M€ de volume traité · X jours délai moyen
- État vide : "Nos premières réalisations seront publiées ici dans les prochaines semaines."
- Bandeau bas : "Vous avez un bien à céder ?" + CTA "Soumettre mon bien"

**Verdict** : BON

**Diagnostic**
"Aucun chiffre inventé" est une prise de position courageuse et différenciante — exactement le ton Versi. Le stats block en fond sombre est cohérent avec la homepage refaite. L'état vide est honnête mais légèrement défensif — on peut le transformer en promesse active. Le bandeau bas est identique à celui de PropertiesPage (bon recyclage de pattern). Ce qui manque : une phrase d'introduction qui contextualise pourquoi les réalisations sont une preuve, pas juste une vitrine.

**Rewrite ciblé**

Sous-titre (amélioration) :
```
Chaque opération documentée — adresse, délais, chiffres réels.
Les track records, c'est la seule chose qui compte.
```
(Le deuxième paragraphe reprend le verbatim persona de Laurent — ancrage fort.)

État vide (reformulation) :
```
Les premières réalisations seront publiées ici dès leur livraison.
En attendant, nos critères d'acquisition et notre process sont documentés.
```
+ CTA : "Notre approche" (lien interne)

Bandeau bas (renforcer l'existant) :
```
Vous avez un bien à céder ?
Offre ferme sous 7 jours. Aucun mandat, aucune mise en vente prolongée.
```
+ CTA : "Soumettre mon dossier"

---

## 7. Page Investir (InvestirPage.jsx)

**Copy actuel**
- H1 : "Investir avec un opérateur intégré."
- Paragraphe 1 : "Acquisition, transformation, structuration — une équipe qui maîtrise l'ensemble du cycle. Pas un intermédiaire : un co-opérateur."
- Paragraphe 2 : "Pour en savoir plus sur les opportunités ouvertes et le profil des partenaires, visitez versi-invest.fr."
- CTA : "Visiter versi-invest.fr"
- Lien retour : "← Revenir sur versi-immobilier.fr"

**Verdict** : FAIBLE

**Diagnostic**
Cette page est une page de redirection habillée — elle ne donne aucune raison de cliquer sur versi-invest.fr ni aucune information sur ce qu'on va y trouver. Le H1 est correct mais le corps est trop mince pour convaincre quelqu'un qui ne connaît pas Versi. "Pour en savoir plus... visitez" est la formule la plus paresseuse du web. La page occupe 60vh avec deux paragraphes — soit elle est développée, soit elle devient une redirection directe (301) vers versi-invest.fr. Il n'y a pas de demi-mesure acceptable ici.

**Recommandation structurelle** : deux options.

Option A — Page bridge développée (recommandée si versi-invest.fr n'est pas encore live) :
Transformer cette page en page de qualification avec 3 éléments :
1. Ce que Versi Invest fait (2 phrases max)
2. Le profil des co-investisseurs recherchés (liste courte)
3. CTA direct vers le formulaire contact

Option B — Redirection directe :
Si versi-invest.fr est live et complet → rediriger directement sans page intermédiaire.

**Rewrite Option A**

H1 :
```
Co-investir avec Versi.
```

Corps :
```
Versi Invest structure des opérations immobilières en co-investissement
avec des partenaires privés — family offices, investisseurs individuels,
mandataires de fonds.

Nous n'apportons pas un deal-flow. Nous co-opérons : acquisition,
transformation, structuration financière — de bout en bout.

Profil recherché : investisseurs avec un ticket minimum de 100 000 €,
horizon 18 à 36 mois, appétit pour l'immobilier de transformation.
```
[HYPOTHÈSE : ticket minimum et horizon à valider avec Thomas/Carl/Maxime]

CTA principal :
```
Prendre contact
```
(lien → /contact, pas vers versi-invest.fr externe — garder le visiteur)

CTA secondaire :
```
En savoir plus sur Versi Invest →
```
(lien externe versi-invest.fr)

---

## 8. Footer (Footer.jsx)

**Copy actuel**
- Tagline : "Opérateur immobilier intégré"
- Géo : "Lille & France"
- Colonne Acquéreurs : Nos biens disponibles · Nos réalisations · Notre approche · Être notifié en avant-première
- Colonne Vendeurs : Soumettre un bien · Notre process · Contact
- Légal : Mentions légales · Politique de confidentialité
- Holding : "Versi Immobilier est une entité du Groupe Versi — versi.fr"

**Verdict** : BON

**Diagnostic**
Architecture à deux colonnes acquéreurs/vendeurs — logique et lisible. La tagline "Opérateur immobilier intégré" est fonctionnelle mais plate — elle ne porte pas le caractère Versi. "Lille & France" est correct mais flou — Lille mérite d'être mis en avant comme territoire principal. "Être notifié en avant-première" est le seul item avec du copy qui vend — les autres sont des titres de navigation. La colonne Vendeurs manque le prescripteur (Pierre). Le lien "Notre process" dans la colonne vendeurs pointe vers /vendre#process — bien.

**Rewrite ciblé**

Tagline (renforcer) :
```
Marchand de biens. Opérateur intégré.
```
Ou :
```
Opérateur immobilier intégré — Lille & France
```
(fusionner tagline et géo)

Colonne Vendeurs — ajouter un item :
```
Agents, notaires & courtiers
```
(lien → /vendre#prescripteurs)

Colonne Acquéreurs — reformuler "Être notifié en avant-première" :
```
Avant-première sur les nouvelles acquisitions
```
(plus factuel, moins commercial)

---

## Synthèse globale

### Note globale pages secondaires : 6,5/10

Points forts : SellPage est au niveau (EXCELLENT). Le pattern "titre court + point" est cohérent sur tout le site. Les états vides sont honnêtes. La FAQ sur SellPage gère les vraies objections.

Points faibles : InvestirPage est une page à réécrire ou supprimer. ApprochePage et ContactPage ont des H1 génériques qui ne portent pas le caractère de la homepage. La navigation ne hiérarchise pas les audiences.

---

## Top 5 rewrites urgents

### Priorité 1 — InvestirPage.jsx : H1 + corps complet

Fichier : `versi-immobilier/src/pages/InvestirPage.jsx`

```jsx
// H1
Co-investir avec Versi.

// Paragraphe 1
Versi Invest structure des opérations en co-investissement avec des partenaires
privés — family offices, investisseurs individuels, mandataires de fonds.
Nous ne cédons pas un deal-flow. Nous co-opérons — acquisition, transformation,
structuration — de bout en bout.

// CTA principal
Prendre contact  →  /contact

// CTA secondaire
En savoir plus sur Versi Invest →  https://versi-invest.fr
```

---

### Priorité 2 — Nav.jsx : CTA "Proposer un bien"

Fichier : `versi-immobilier/src/components/Nav.jsx`

```jsx
// Ligne 104 — remplacer
<Link to="/vendre" className="nav__cta">
  Céder un bien
</Link>

// Ligne 153 — mobile overlay
<Link to="/vendre" className="nav__overlay-cta">
  CÉDER UN BIEN
</Link>
```

---

### Priorité 3 — ContactPage.jsx : H1 + sous-titre + texte réassurance

Fichier : `versi-immobilier/src/pages/ContactPage.jsx`

```jsx
// H1 (ligne 24)
Écrivez-nous.

// Sous-titre (ligne 26-28)
Vous achetez, vous cédez ou vous cherchez un partenaire opérationnel.
Réponse sous 24h — sans standard, sans assistant.

// Texte réassurance gauche (lignes 63-70)
Nous accusons réception sous 24h.
Visite organisée sous 48 à 72h si votre dossier entre dans nos critères.

Lille, métropole lilloise
Paris — Île-de-France
Actifs entre 250 000 € et 1 000 000 €.

// Lien SellPage (ligne 82-85)
Vous avez un bien à céder ?
Offre ferme sous 7 jours — formulaire dédié.
```

---

### Priorité 4 — ApprochePage.jsx : H1 + titre section Équipe + titre section Critères

Fichier : `versi-immobilier/src/pages/ApprochePage.jsx`

```jsx
// H1 (ligne 81)
Comment Versi travaille.

// Titre section Équipe (ligne 158)
Les trois fondateurs. Vérifiables.

// Titre section Critères (ligne 212)
Ce que nous instruisons.

// Texte critères (remplacer le paragraphe prose par une liste — voir section 4 ci-dessus)
```

---

### Priorité 5 — PropertiesPage.jsx : état vide + bandeau vendeur

Fichier : `versi-immobilier/src/pages/PropertiesPage.jsx`

```jsx
// État vide (lignes 169-171)
Aucun bien disponible à date.
Nos acquisitions vont vite — soyez notifié en avant-première.
// + CTA "Me tenir informé" → /contact

// Bandeau vendeur bas (lignes 247-249)
Vous avez un bien à céder ?
Offre ferme sous 7 jours. Aucun mandat, aucune mise en vente prolongée.
// CTA : "Soumettre mon dossier" (remplace "Soumettre mon bien")
```

---

## Architecture et structure — recommandations

**Pages à conserver telles quelles (structure) :** SellPage, RealisationsPage, Footer

**Pages à restructurer :**
- InvestirPage : développer en page bridge complète OU redirection directe — demi-page inutile en l'état
- ApprochePage : fusionner la section "Critères d'acquisition" avec la SellPage (doublon) OU la rendre visuelle (liste, pas prose)

**Renommage suggéré dans la nav :**
- "NOTRE APPROCHE" → "COMMENT NOUS TRAVAILLONS" (plus explicite pour le visiteur qui ne connaît pas Versi)

**Page manquante identifiée :**
- Aucune page "À propos / Équipe" dédiée — l'équipe est enfouie dans ApprochePage. Si des photos arrivent, envisager une section équipe accessible depuis la nav ou le footer.

---

## Hypothèses à valider

- [HYPOTHÈSE : ticket minimum co-investissement 100 000 € — à confirmer avec Thomas/Carl/Maxime avant publication InvestirPage]
- [HYPOTHÈSE : horizon 18 à 36 mois pour co-investissement — à confirmer]
- [HYPOTHÈSE : versi-invest.fr n'est pas encore live — si live, Option B (redirection) remplace Option A]

---

**Handoff → @fullstack**

Fichiers produits :
- `docs/reviews/vi-pages-audit.md` (ce document)

Décisions prises :
- SellPage : EXCELLENT, aucune modification requise
- InvestirPage : FAIBLE, réécriture complète ou redirection — choix à valider avec Thomas
- Nav CTA : "Proposer un bien" → "Céder un bien"
- ContactPage H1 : "Parlons de votre projet." → "Écrivez-nous."
- ApprochePage H1 : "Notre approche." → "Comment Versi travaille."
- Bandeau vendeur PropertiesPage et RealisationsPage : unifier le wording sur "Offre ferme sous 7 jours. Aucun mandat, aucune mise en vente prolongée."

Points d'attention pour l'implémentation :
- Les 5 rewrites urgents sont ordonnés par impact — commencer par InvestirPage (page la plus faible) et Nav (visible sur tout le site)
- InvestirPage : ne pas implémenter Option A sans validation Thomas sur les chiffres co-investissement ([HYPOTHÈSE] ci-dessus)
- Le bandeau vendeur est identique sur PropertiesPage et RealisationsPage — envisager un composant `SellerBanner` partagé pour ne pas maintenir le même copy en deux endroits
- Aucune modification de structure de page demandée — uniquement du copy et des labels
