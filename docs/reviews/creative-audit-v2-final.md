# Audit créatif V2 — versi.fr
**Agent** : @creative-strategy
**Date** : 2026-04-08
**Statut** : Complet
**Contexte** : Post-corrections V2 (P0-P2 de l'audit V1)

---

## 1. Verdict global

**Score V2 : 8,5/10**

Le site a fait un bond réel depuis V1. Les corrections P0-P1 ont été appliquées avec rigueur et elles produisent leur effet. Le Hero est maintenant propre — la suppression de l'image Unsplash est la correction qui a le plus d'impact, elle transforme le premier regard de Laurent. Les headings ont été réécrits et c'est une réussite : "Nous ne déléguons pas. Nous décidons." et "Trois associés. Zéro posture." sont exactement dans le ton Versi.

Ce qui manque au 10/10 n'est pas une question de refonte — c'est un dernier étage de précision sur 3 points précis :

1. **Le copy Mission a une redondance résiduelle** entre le H2 et le corps secondaire
2. **Les tracks records équipe** laissent deux fondateurs dans le vague (Thomas, Carl) et le troisième (Maxime) très précis — l'asymétrie est visible
3. **L'Approche H2 "Notre méthode."** est le heading le plus faible du site — un point là où tout le reste a du caractère

Le site est fier-able. Il n'est pas encore parfait. La distance entre 8,5 et 10 se joue en 45 minutes de corrections copy — pas une seconde de code.


## 2. Tableau section par section

| Section | Score V1 | Score V2 | Ce qui manque pour 10/10 |
|---|---|---|---|
| Navigation | MOYEN | 9,5/10 | RAS — différenciation logo/liens réussie |
| Hero | FAIL | 9/10 | Le CTA "DÉCOUVRIR NOS ACTIVITÉS" est trop long et trop descriptif |
| Mission | BON | 8/10 | Redondance entre corps principal et corps secondaire |
| Activités | BON | 9/10 | RAS — les 4 cartes sont solides |
| Approche | NON ÉVALUÉ | 8/10 | H2 "Notre méthode." trop neutre vs le reste du site |
| Implantation | NON ÉVALUÉ | 8,5/10 | Minor : SVG carte France approximative |
| Équipe | FAIL | 8,5/10 | Asymétrie des tracks records (Thomas et Carl trop vagues) |
| Contact | BON | 9/10 | Formspree non branché (bloquant déploiement, non bloquant audit) |
| Footer | NON ÉVALUÉ | 9/10 | Footer logo sans différenciation de poids vs nav |


## 3. Analyse détaillée section par section

### 3.1 Hero — 9/10

**Ce qui fonctionne maintenant**

La Direction A a été appliquée correctement. Le fond `#0B0B0B` pur avec texture grain SVG à 3% d'opacité est exactement ce qui était recommandé. L'overlay a disparu. Le Hero tient sur sa typographie seule — et ça tient. La hiérarchie surtitre → H1 → sous-titre → CTAs est propre et lisible.

Le surtitre "OPÉRATEUR IMMOBILIER INTÉGRÉ — FRANCE" est une correction réussie : plus précis, moins générique que "HOLDING IMMOBILIÈRE INTÉGRÉE", l'ancrage géographique "FRANCE" est direct.

Le sous-titre restructuré — "De l'identification de l'actif à sa structuration financière — sans passer la main. Versi opère l'ensemble du cycle en interne." — fonctionne. La promesse différenciante ("sans passer la main") arrive bien en tête de phrase.

**Ce qui reste imparfait**

Le CTA primaire "DÉCOUVRIR NOS ACTIVITÉS" est le seul élément qui dévie du ton. Tous les copy du Hero sont courts, tranchants. Ce CTA est descriptif et long pour un bouton. Il sonne comme un CTA de site corporate générique.

Le CTA secondaire "NOUS CONTACTER →" est parfait — court, direct, avec le chevron qui appelle l'action. Le primaire devrait avoir le même niveau de concision.

**Correction recommandée**

```jsx
// Hero.jsx — ligne 53
// Avant :
DÉCOUVRIR NOS ACTIVITÉS

// Après (option A — concision maximale) :
NOS ACTIVITÉS

// Après (option B — action plus affirmée) :
VOIR NOS MÉTIERS
```

Le bouton encadré doit inviter à descendre, pas décrire ce qu'on va trouver. "NOS ACTIVITÉS" suffit — le contexte (Hero du site Versi) fait le reste du travail.

### 3.2 Navigation — 9,5/10

**Ce qui fonctionne maintenant**

La différenciation logo/liens est réussie. Dans `Nav.css` :

- Logo `.nav__logo` : `font-weight: var(--font-weight-thin)` (200), `letter-spacing: 0.18em`, `font-size: 0.9375rem` — le "VERSI" se lit comme une signature, pas comme un lien
- Liens `.nav__link` : `font-weight: var(--font-weight-regular)` (400), `letter-spacing: 0.08em` — sobres, fonctionnels

L'indicateur de section active (`.nav__link--active` avec `border-bottom-color: var(--color-accent)`) est propre. Le menu mobile avec overlay plein écran et focus trap est irréprochable techniquement.

**Ce qui reste imparfait — 0,5 point**

Le footer logo `.footer__logo` n'a pas reçu la même différenciation : il est en `font-weight: var(--font-weight-regular)` (400) et `letter-spacing: 0.1em`. C'est cohérent pour le footer (pas un logo de navigation), mais il y a une micro-incohérence : sur la nav, VERSI en 200/0.18em a une signature. Dans le footer, VERSI en 400/0.1em ressemble à un lien ordinaire. Ce n'est pas un problème critique — le footer n'est pas le point de validation de Laurent.

**Correction optionnelle footer (effort : 2 min)**

```css
/* Footer.css */
.footer__logo {
  font-weight: var(--font-weight-thin); /* 200 — cohérence avec nav__logo */
  letter-spacing: 0.18em; /* cohérence avec nav__logo */
}
```

### 3.3 Mission (Vision) — 8/10

**Ce qui fonctionne maintenant**

Le H2 "Nous ne déléguons pas. Nous décidons." est la meilleure correction du lot. C'est court, tranchant, dans le ton exact de Versi. Le problème de répétition identifié en V1 (trois fois "Quatre métiers. Un cycle maîtrisé.") est résolu — la Mission a maintenant sa propre affirmation.

Le corps principal — "Chaque opération Versi est pilotée par les mêmes fondateurs de la sourcing à la clé. Pas de sous-traitance de la stratégie. Pas de dilution de la décision." — est excellent. Les trois phrases courtes en cascade créent un rythme percutant.

**Ce qui reste imparfait — 2 points**

Il y a une **redondance entre le corps principal et le corps secondaire**. En lisant les deux paragraphes enchaînés :

> "Chaque opération Versi est pilotée par les mêmes fondateurs de la sourcing à la clé. Pas de sous-traitance de la stratégie. Pas de dilution de la décision."

> "Nous n'arbitrons pas. Nous opérons. Chaque décision critique reste en interne, portée par les mêmes fondateurs du début à la fin."

Le message du corps secondaire répète celui du corps principal avec d'autres mots. "Les mêmes fondateurs de la sourcing à la clé" = "portée par les mêmes fondateurs du début à la fin". "Pas de dilution de la décision" = "chaque décision critique reste en interne". Ce n'est pas du renforcement — c'est du remplissage. Laurent lit le premier paragraphe et peut s'arrêter là. Le second n'ajoute rien.

De plus, la ligne "Nous n'arbitrons pas. Nous opérons." dans le corps secondaire est potentiellement la meilleure ligne de la section — mais elle est enterrée en deuxième paragraphe où elle sera moins lue.

**Correction recommandée**

Supprimer le corps secondaire ou le remplacer par quelque chose qui ajoute une couche d'information réelle (ex : pourquoi cette intégration est rare dans le marché, ou une preuve concrète). L'alternative la plus simple : monter "Nous n'arbitrons pas. Nous opérons." en position de conclusion tranchante, et supprimer le reste.

```jsx
// Mission.jsx — structure proposée
<h2 className="text-heading-lg mission__title">
  Nous ne déléguons pas.<br />
  Nous décidons.
</h2>
<p className="text-body-lg mission__body">
  Chaque opération Versi est pilotée par les mêmes fondateurs de la sourcing à la clé.
  Pas de sous-traitance de la stratégie. Pas de dilution de la décision.
</p>
<p className="text-body-md mission__body-secondary">
  Nous n'arbitrons pas. Nous opérons.
</p>
```

Le corps secondaire devient une conclusion en 4 mots. Percutant. Rien de plus.

**Note sur les stats**

Les 3 stats (35+ actifs, 3 immeubles, 4 métiers) sont correctes et bien présentées dans la colonne droite. Le chiffre "3 IMMEUBLES EN PORTEFEUILLE" est précis et vérifiable — exactement ce que Laurent veut voir.

### 3.4 Activités — 9/10

**Ce qui fonctionne maintenant**

Les corrections sont appliquées correctement :

- Versi Immobilier (ex-Versi Développement) — le nom est juste, la description est précise ("de la négociation à la revente"), le label "MARCHAND DE BIENS" est conservé
- Versi Invest — label "INVESTISSEMENT & CONSEIL" correct, description enrichie du conseil et du co-investissement avec les éléments de précision attendus par Laurent (ticket adapté, fiscalité optimisée, horizon de sortie)
- Versi Capital — "FONCIÈRE" + description détention longue — propre
- Versi Finance — "INGÉNIERIE FINANCIÈRE" + description structuration financière — propre

Le H2 "Une holding. Quatre entités." est une amélioration par rapport à "Quatre métiers. Un cycle maîtrisé." répété. Court, factuel, différent du Hero.

Les CTAs désactivés "BIENTÔT DISPONIBLE" avec `aria-disabled` et `aria-label` sont gérés proprement. La communication de l'état "site en construction" est honnête sans créer une frustration visuelle.

**Ce qui reste imparfait — 1 point**

Un seul point d'attention : l'URL de Versi Immobilier dans `entities.js` pointe vers `https://versi-immobilier.fr` (corrigée), mais si le domaine n'a pas été redirigé depuis `versi-developpement.fr`, le lien "BIENTÔT DISPONIBLE" va éventuellement pointer vers une cible morte. C'est un point de cohérence à vérifier avec les fondateurs avant déploiement — pas un problème de copy ou de design.

**Pas de correction copy nécessaire sur les 4 entités.**

### 3.5 Approche — 8/10

**Ce qui fonctionne**

La section Approche est la plus sobre du site — et c'est bien. Le fond sombre `var(--color-bg-dark)` crée un contraste visuel fort entre Mission (fond clair) et Activités (fond clair) qui encadrent l'Approche. Les numéros 01-04 en `font-size: 4rem` à `opacity: 0.15` sont exactement l'effet graphique recommandé dans le design-system.

Les 4 corps des étapes sont précis et dans le ton :
- "off-market", "en semaines, pas en trimestres", "sans intermédiaire", "Pas d'improvisation en fin de cycle" — toutes ces formulations sont spécifiques à Versi et évitent le générique.

**Ce qui reste imparfait — 2 points**

Le H2 "Notre méthode." est le heading le plus faible du site. Tout le reste du site a du caractère dans ses headings :
- "Nous ne déléguons pas. Nous décidons."
- "Trois associés. Zéro posture."
- "Une holding. Quatre entités."
- "Un projet. Un actif. Nous répondons."

Et l'Approche fait : "Notre méthode." Point. C'est fonctionnel mais ça ne tient pas la comparaison avec les headings autour. "Notre méthode" c'est ce que dit n'importe quelle agence de conseil ou cabinet de management.

Le sous-titre "Quatre étapes. Un cycle reproductible." est meilleur que le H2. Il est plus précis et dans le ton. Le problème est l'ordre : le H2 devrait être le plus fort, le sous-titre la précision.

**Correction recommandée**

```jsx
// Approach.jsx — ligne 34-35
// Avant :
<h2 className="text-heading-lg approach__title">Notre méthode.</h2>
<p className="approach__subtitle">Quatre étapes. Un cycle reproductible.</p>

// Après (option A — inversion et reformulation H2) :
<h2 className="text-heading-lg approach__title">Quatre étapes.<br />Aucune délégation.</h2>
<p className="approach__subtitle">Du sourcing à l'exploitation — en interne.</p>

// Après (option B — plus factuel, même rythme que les autres headings) :
<h2 className="text-heading-lg approach__title">Un cycle.<br />Quatre étapes maîtrisées.</h2>
<p className="approach__subtitle">Du sourcing à l'exploitation — sans passer la main.</p>
```

Option A est préférée : elle reprend le thème de la non-délégation (cohérence avec Mission) et elle a le punch des autres headings. Option B est plus conservatrice mais évite la répétition du mot "délégation" déjà présent dans Mission.

### 3.6 Implantation — 8,5/10

**Ce qui fonctionne**

La section est structurellement correcte. Le H2 "Paris. Lille. Et les métropoles françaises." est précis — il nomme les villes actives et laisse la porte ouverte à l'expansion sans sur-promettre. Le corps "Versi opère sur des marchés où la densité et la demande locative justifient une transformation." est dans le ton : factuel, pas marketing.

La légende "Présence active / Zone d'extension" avec les pastilles est lisible et honnête sur l'état actuel.

**Ce qui reste imparfait — 1,5 point**

Le SVG de la carte France est approximatif. Ce n'est pas une carte France reconnaissable — c'est un polygone vaguement hexagonal. Sur desktop, Laurent va regarder la carte et voir que Paris et Lille ne sont pas à leur position géographique exacte. Paris est placé à `x=295, y=195` et Lille à `x=280, y=115` — l'écart latitudinal entre Paris et Lille (environ 200 km) est proportionnellement trop large par rapport au contour du polygone.

Ce n'est pas bloquant — une carte abstraite/stylisée est acceptable pour un site institutionnel. Mais si les fondateurs veulent la précision géographique, le SVG devrait être remplacé par une vraie carte France en SVG (disponible en open source, format GeoJSON ou SVG direct).

**Aucune correction copy nécessaire.** Le problème est purement géographique et n'affecte pas la perception de crédibilité de Versi par Laurent.

### 3.7 Équipe — 8,5/10

**Ce qui fonctionne maintenant**

La refonte des cartes portrait (aspect-ratio 3/4, photo pleine largeur, object-position center top, text-align left) est une réussite. C'est le changement visuel le plus impactant des corrections P2 — les cartes ont maintenant un registre institutionnel, pas un registre "profil réseau social". Le padding 0 sur la carte + padding sur la partie texte est la bonne structure.

Le H2 "Trois associés. Zéro posture." est excellent. C'est la correction la plus audacieuse et elle tient. Le sous-titre "Ils ont construit avant de vendre l'idée. Le discours suit la pratique — pas l'inverse." est dans le ton et crédible.

**Ce qui reste imparfait — 1,5 point**

**Problème 1 — Asymétrie des tracks records**

C'est le point le plus visible pour Laurent. Il compare les 3 cartes :

- Maxime : "3 immeubles en portefeuille, 24 contrats locatifs." — Précis, vérifiable, quantifié. Exactement ce que Laurent veut.
- Thomas : "11 actifs locatifs à Paris. Pilote l'ensemble des opérations Versi de la sourcing à la livraison." — Premier chiffre bien, mais "Pilote l'ensemble des opérations Versi" = auto-proclamé, pas un fait passé. Sur un site où le H2 dit "Le discours suit la pratique", cette formulation à propos de Versi (qui n'a pas encore d'historique) fragilise l'ensemble.
- Carl : "Construit la présence de Versi sur les marchés et dans les réseaux de prescripteurs." — Entièrement auto-proclamé, aucun chiffre, aucun fait passé. C'est la ligne la plus faible du site.

L'asymétrie entre la précision de Maxime (chiffres réels) et le vague de Carl (formule creuse) est visible en 5 secondes. Laurent va se demander pourquoi Carl n'a pas de track record immobilier.

**Problème 2 — Les specialties Thomas et Carl restent proches**

Thomas : "Marketing strategy & opérations. Co-fondateur TEOS et Sarani."
Carl : "Marketing strategy & croissance. Head of Marketing Inbolt. Co-fondateur Sarani."

Les deux ont "Marketing strategy" en premier terme. Ce n'est pas un problème stratégique (les deux ont un background marketing, c'est réel), mais sur la carte, ça crée une impression de doublon. La différence est dans "opérations" vs "croissance" — mais ces mots sont peu lisibles au scan rapide.

**Corrections recommandées**

**Track record Thomas** (à valider avec Thomas) :

```js
// team.js — Thomas
track: '11 actifs locatifs à Paris. Pilote la due diligence et le pilotage d\'opérations — sourcing à livraison.',
```

Reformulation : remplacer "Pilote l'ensemble des opérations Versi" (auto-promotion future) par quelque chose ancré dans son expertise personnelle, pas dans le rôle Versi.

**Track record Carl** (à valider avec Carl — donnée manquante) :

```js
// team.js — Carl (si Carl a des biens personnels) :
track: 'X actifs. Head of Marketing Inbolt. Développe les réseaux prescripteurs et la présence institutionnelle de Versi.',

// team.js — Carl (si Carl n'a pas de biens — option honnête) :
track: 'Head of Marketing Inbolt (scale-up B2B). Co-fondateur Sarani. Construit la présence de Versi et les partenariats prescripteurs.',
```

La seconde option pour Carl (sans chiffres immobiliers) est honnête mais met en valeur l'expertise marketing réelle. Laurent comprend que Versi est un trio complémentaire — il n'attend pas que les 3 aient exactement le même profil.

**Specialty Thomas et Carl — différenciation** (optionnel mais recommandé) :

```js
// Thomas :
specialty: 'Opérations & pilotage. Co-fondateur TEOS et Sarani.',

// Carl :
specialty: 'Marketing & développement institutionnel. Head of Marketing Inbolt.',
```

**Problème 3 — URLs LinkedIn vides**

Signalé en V1 par @testeur-persona-laurent (GP3 en PASS conditionnel). Les 3 URLs LinkedIn sont encore vides dans `team.js`. Les icônes s'affichent uniquement si `member.linkedin` est truthy — donc en production, les icônes sont absentes. Laurent ne peut pas cliquer sur les profils. C'est un signal de crédibilité manqué.

```js
// team.js — demander aux 3 fondateurs leurs URLs LinkedIn
linkedin: 'https://linkedin.com/in/thomas-issa', // à renseigner par Thomas
linkedin: 'https://linkedin.com/in/maxime-lemoine', // à renseigner par Maxime
linkedin: 'https://linkedin.com/in/carl-standertskjold', // à renseigner par Carl
```

Cette donnée est à fournir par les fondateurs — pas inventable.

### 3.8 Contact — 9/10

**Ce qui fonctionne**

Le H2 "Un projet. Un actif. Nous répondons." est le heading le plus précis du site pour Laurent. Il nomme exactement ce que Laurent peut apporter (projet, actif) et ce que Versi fait (répondre). C'est de la communication directe, pas du marketing.

Le corps — "Vous avez un actif à céder, un projet de co-investissement ou une opportunité à qualifier. Décrivez-le — nous revenons sous 72h." — est précis et prend en compte les 3 cas d'usage de Laurent. "Sous 72h" est un engagement clair qui crédibilise.

L'email `contact@versi.fr` en accent color visible en clair dans la colonne gauche est la bonne décision — Pierre (prescripteur) préfère l'email direct au formulaire.

Le formulaire est bien conçu : validation client-side, gestion des états loading/success/error, honeypot anti-spam, notice RGPD en bas.

**Ce qui reste imparfait — 1 point**

Formspree non branché. `FORMSPREE_ENDPOINT` dans `contact.js` est vraisemblablement encore à sa valeur par défaut ou vide. Ce n'est pas un problème d'audit créatif — mais c'est **le seul point bloquant avant déploiement**. Un formulaire qui ne s'envoie pas, c'est une crédibilité détruite en 30 secondes si un investisseur teste.

À vérifier dans `src/src/config/contact.js`. Si la valeur est `''` ou un placeholder, c'est un P0 déploiement.

**Aucune correction copy nécessaire.**

### 3.9 Footer — 9/10

**Ce qui fonctionne**

"Versi Immobilier" est bien à jour (correction de "Versi Développement" appliquée). Les 4 entités sont listées dans l'ordre : Versi Immobilier · Versi Invest · Versi Capital · Versi Finance — cohérent avec l'ordre des cartes Activités.

La baseline "Holding immobilière intégrée" est juste et utile — elle ancre Versi pour un visiteur qui arrive directement au footer (crawlers, retour depuis page légale).

Les liens mentions légales et politique de confidentialité sont présents, cohérence avec les pages `/mentions-legales` et `/politique-de-confidentialite`.

**Ce qui reste imparfait — 1 point**

Micro-incohérence typographique du logo footer (décrite en section 3.2 Navigation). Corrigeable en 2 lignes CSS si les fondateurs veulent la cohérence parfaite avec la nav.

**Aucune correction copy nécessaire.**

## 4. Corrections pour atteindre 10/10

Classées par impact. Toutes les corrections P0 sont sans code — uniquement du texte dans des fichiers de config ou des JSX.

| Priorité | Section | Action | Effort | Impact | Owner | Critère de done |
|---|---|---|---|---|---|---|
| **P0-déploiement** | Contact | Brancher Formspree : renseigner l'URL dans `src/src/config/contact.js` | 20 min | Bloquant launch | @fullstack + Thomas (créer compte Formspree) | Formulaire envoie un email réel à contact@versi.fr — testé en prod |
| **P0-crédibilité** | Équipe | Renseigner les 3 URLs LinkedIn dans `team.js` | 5 min | 9/10 | Thomas, Maxime, Carl | Icônes LinkedIn cliquables sur les 3 cartes en production |
| **P1** | Mission | Supprimer/raccourcir le corps secondaire — ne garder que "Nous n'arbitrons pas. Nous opérons." | 5 min | 8/10 | @fullstack (Mission.jsx) | Corps secondaire = 1 phrase maximum. Zéro répétition du corps principal |
| **P1** | Approche | Réécrire H2 "Notre méthode." → "Quatre étapes. Aucune délégation." | 2 min | 7/10 | @fullstack (Approach.jsx) | H2 Approche dans le même registre que les autres headings du site |
| **P1** | Hero | Raccourcir CTA "DÉCOUVRIR NOS ACTIVITÉS" → "NOS ACTIVITÉS" | 1 min | 5/10 | @fullstack (Hero.jsx) | CTA primaire aussi court que le CTA secondaire "NOUS CONTACTER" |
| **P2** | Équipe | Réécrire track record Thomas — ancrer dans expertise personnelle, pas dans rôle Versi futur | 10 min | 8/10 | Thomas à valider | "Pilote l'ensemble des opérations Versi" remplacé par formulation ancrée dans le passé |
| **P2** | Équipe | Réécrire track record Carl — au minimum citer Inbolt et Sarani en track, éviter la formule creuse | 10 min | 9/10 | Carl à valider | "Construit la présence de Versi" remplacé par réalisations réelles ou expertise vérifiable |
| **P3** | Navigation / Footer | Uniformiser `.footer__logo` en font-weight 200 / letter-spacing 0.18em | 2 min | 3/10 | @fullstack (Footer.css) | Logo footer identique au logo nav en termes de poids typographique |

### Ce qui n'est PAS à corriger

- La tagline "Quatre métiers. Un cycle maîtrisé." — parfaite, ne pas y toucher
- Le layout des cartes équipe — la refonte portrait est réussie
- La section Contact copy — "Un projet. Un actif. Nous répondons." est la meilleure ligne après le H2 Équipe
- Le design system CSS — tokens cohérents, hiérarchie typographique solide
- La section Activités — les 4 entités sont correctement décrites
- Le surtitre Hero — "OPÉRATEUR IMMOBILIER INTÉGRÉ — FRANCE" est juste

## 5. Verdict final

**Score V2 : 8,5/10. Score atteignable : 10/10 en une session de 45 minutes.**

Ce n'est pas un site honteux. Ce n'est pas non plus un site parfait. C'est un site qui a traité les problèmes P0 et P1 avec rigueur, et qui bute sur les derniers 1,5 point pour des raisons précises et corrigeables.

### Ce qui a vraiment changé entre V1 et V2

La suppression de la photo Unsplash est la correction la plus impactante — elle transforme le Hero d'un "encore un site WordPress avec image de stock" à quelque chose qui ressemble à une référence du secteur. C'était la correction la plus urgente et elle a été faite.

"Nous ne déléguons pas. Nous décidons." + "Trois associés. Zéro posture." — ces deux headings ont sorti le site du registre corporate pour entrer dans le registre Versi. Directement dans le ton, directement dans la valeur.

### Ce qui manque encore pour que Laurent soit convaincu à 10/10

1. **Le track record Carl** est la lacune la plus visible. Un investisseur qui lit les 3 cartes voit immédiatement l'asymétrie entre la précision de Maxime (chiffres, actifs concrets) et le vague de Carl (formule). Ce n'est pas une question de design — c'est une question de données réelles à fournir.

2. **La redondance Mission** ne coûte pas de crédibilité, mais elle coûte de l'attention. Un investisseur qui relit "les mêmes fondateurs" deux fois dans deux phrases consécutives ne va pas partir — mais il va sentir que le copy n'est pas fini.

3. **Le H2 Approche "Notre méthode."** est le seul heading qui n'a pas de caractère. Dans un site qui a appris à trancher ("Zéro posture", "Nous décidons"), ce titre générique sonne comme un oubli.

### Pour les fondateurs

Les corrections P1 (Mission, Approche, Hero CTA) peuvent être faites par @fullstack en 10 minutes sans consultation. Les corrections P2 (tracks records Thomas et Carl) nécessitent une validation humaine — ce sont des données réelles qu'un agent ne peut pas inventer. Les fondateurs fournissent les chiffres, @fullstack les insère.

Le site est ready pour une présentation interne et une validation par les 3 fondateurs. Pour une mise en ligne avec le niveau "fier" : 45 minutes de corrections P1 + données Carl et Thomas.

---

**Handoff → @fullstack**

- Fichier produit : `docs/reviews/creative-audit-v2-final.md`
- Décisions prises :
  - Score V2 = 8,5/10 (vs 6,5/10 en V1)
  - 3 corrections P1 sans consultation fondateurs : Mission corps secondaire → 1 phrase, Approche H2 réécriture, Hero CTA raccourcissement
  - 2 corrections P2 avec validation fondateurs : tracks records Thomas et Carl (données réelles obligatoires)
  - 1 correction P0-déploiement bloquante : Formspree endpoint + URLs LinkedIn
- Points d'attention pour l'implémentation :
  - Ne jamais inventer de données pour les tracks records — attendre les chiffres de Thomas et Carl
  - La correction Mission est dans Mission.jsx ligne 25-27 : supprimer ou raccourcir le `<p className="text-body-md mission__body-secondary">`
  - La correction Approche est dans Approach.jsx ligne 34 : remplacer "Notre méthode." par "Quatre étapes. Aucune délégation." ou variante validée par les fondateurs
  - La correction Hero CTA est dans Hero.jsx ligne 53 : remplacer "DÉCOUVRIR NOS ACTIVITÉS" par "NOS ACTIVITÉS"
  - Formspree à configurer dans `src/src/config/contact.js` — c'est le seul bloquant avant déploiement

*Audit produit par @creative-strategy — 2026-04-08. Document de référence pour les corrections V2 finales de versi.fr.*

---
