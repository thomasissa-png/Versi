# Audit créatif — versi.fr V1
**Agent** : @creative-strategy
**Date** : 2026-04-08
**Statut** : Complet

---

## 1. Verdict global

Le site est structurellement solide. L'architecture de l'information est bonne, le design system est cohérent, le copy de base tient la route. Ce n'est pas un site honteux — c'est un site qui s'est arrêté à 80%.

Les 20% manquants sont exactement ceux que Laurent voit en premier : le Hero (première impression) et l'Équipe (moment de validation). Ce sont les deux sections où la crédibilité se joue, et ce sont les deux sections qui ont les problèmes les plus visibles.

**Ce qui marche** : design system propre, tokens cohérents, hiérarchie typographique globalement respectée, copy Mission et Activités au-dessus de la moyenne.

**Ce qui ne marche pas** : photo Unsplash générique en fond du Hero (fatal pour un site institutionnel), cartes fondateurs avec photos non cadrées qui "volent", heading équipe avec le mot "vérifiables" qui sonne creux, polices menu trop chargées visuellement, description Carl trop vague côté track record.

**Niveau actuel vs niveau attendu** : 6,5/10 vs 9/10 exigé pour un investisseur comme Laurent. L'écart se comble avec des corrections précises — pas une refonte.

---

## 2. Audit section par section

| Section | Verdict | Problème principal | Recommandation |
|---|---|---|---|
| **Navigation** | MOYEN | Logo "VERSI" et liens nav ont la même taille (0.8125rem) et le même tracking — manque de hiérarchie visuelle. Tablette : police nav réduite à 0.75rem, écart visuel avec le CTA "NOUS CONTACTER". | Différencier logo vs liens : logo en font-weight 300 (light), liens en 400. Réduire légèrement le letter-spacing des liens (0.08em vs 0.1em actuel). Voir section 5. |
| **Hero** | FAIL | Image Unsplash générique (photo-1549923746-c502d488b3ea = bâtiment américain quelconque) sous overlay sombre. Pour Laurent, un fond de stock = signal d'amateurisme immédiat. | Remplacer par l'une des 3 directions proposées en section 3. |
| **Mission (Vision)** | BON | "Un opérateur intégré. Quatre métiers. Un cycle." — le heading répète la tagline du Hero et de la section Activités. Trois fois le même message sur la page. | Pivoter la Mission sur l'angle de la différence opérationnelle (ce qu'on fait que les autres ne font pas), pas la description de la structure. Proposition en section 4. |
| **Activités** | BON | Versi Développement décrit correctement mais le nom ne correspond plus au brief fondateur (→ Versi Immobilier). Versi Invest manque la mention "conseil en investissement". | Corrections en section 7. |
| **Approche** | NON ÉVALUÉ | Fichier Approach.jsx non fourni dans le brief d'audit. | @fullstack à vérifier indépendamment. |
| **Implantation** | NON ÉVALUÉ | Fichier Implantation.jsx non fourni dans le brief d'audit. | @fullstack à vérifier indépendamment. |
| **Équipe** | FAIL | (1) Photos non cadrées de manière uniforme — chaque photo a un ratio d'affichage, un cadrage, un fond différent → effet "patchwork". (2) Heading "Des parcours vérifiables" = mot juridique froid qui n'inspire rien. (3) Track record Carl = vague ("Construit la présence de Versi"). (4) Specialty Carl = "Marketing strategy & croissance" — doublonne Thomas. | Refonte du layout cartes (section 6) + réécriture heading (section 4) + réécriture Carl (section 7). |
| **Contact** | BON | Non audité en détail — formulaire fonctionnel d'après les livrables précédents. | Vérifier que Formspree est branché (priorité haute selon testeur-persona-laurent). |
| **Footer** | NON ÉVALUÉ | Fichier Footer.jsx non fourni dans le brief d'audit. | @fullstack à vérifier indépendamment. |

---

## 3. Hero — 3 propositions

Le problème central du Hero n'est pas l'overlay, ni le texte — c'est l'image. Une photo Unsplash d'un bâtiment américain générique, sous un overlay de 60-70% d'opacité, est inacceptable pour un site institutionnel immobilier. C'est le premier signal que Laurent lit. Les 3 directions ci-dessous sont classées de la plus facile à implémenter à la plus ambitieuse.

---

### Direction A — Fond sombre architecturé (recommandée, impact maximal, effort minimal)

**Principe** : Abandonner la logique "photo en fond". Remplacer par un fond #0B0B0B (noir profond) avec une texture subtile ou un motif géométrique architectural en SVG. Le texte "Quatre métiers. Un cycle maîtrisé." n'a pas besoin d'un fond — il EST le visuel.

**Specs techniques** :
- Supprimer `background-image` dans `.hero`
- Fond : `var(--color-bg-dark)` = `#0B0B0B` pur
- Optionnel : ajouter une texture grain CSS (`background-image: url("data:image/svg+xml...")`) à opacité 3-5% pour casser le flat total
- Optionnel : une fine ligne horizontale de séparation en `var(--color-stone-200)` à opacité 0.08, positionnée à 40% de la hauteur en arrière-plan
- Supprimer `hero__overlay` (devenu inutile)
- Conserver exactement le même layout texte

**Pourquoi ça marche** : référence directe à enclave.com — les meilleurs sites institutionnels immobiliers n'ont pas de photo en hero, ils ont de la typographie. Le texte Versi est suffisamment fort pour tenir seul. La sobriété EST le message de qualité.

**Risque** : aucun. C'est la direction la plus sûre et la plus alignée avec la DA.

---

### Direction B — Photo réelle Versi ou photo architecturale de qualité premium (si photo disponible)

**Principe** : Remplacer la photo Unsplash par une vraie photo d'un bien Versi (opération réalisée) ou une photo architecturale d'un immeuble parisien/lillois réel. Pas de stock. Pas d'américain. Du français, du haussmannien, du concret.

**Specs techniques** :
- Photo : portrait (2:3 ou 4:5 recommandé) ou paysage (16:9 ou 3:2), résolution min. 2000px de large
- Cadrage : façade nette, perspective légèrement en contre-plongée, lumière naturelle, pas de voiture ou passant en premier plan
- Overlay : réduire à `rgba(11, 11, 11, 0.65)` minimum — le fond doit être lisible mais clairement identifiable comme "immeuble français"
- Position : `background-position: center 30%` pour mettre en valeur la partie haute du bâtiment

**Sources possibles** :
- Photos prises par Thomas/Carl/Maxime sur leurs biens actuels (35+ actifs → il y a forcément une photo utilisable)
- Photographe architectural pour une session de 2h sur 1-2 biens : 300-600€, résultat > toute photo de stock
- En dernier recours : Unsplash avec recherche `"immeuble haussmannien Paris"` ou `"façade pierre de taille"` — mais choisir une photo reconnaissable comme française

**Pourquoi ça marche** : Laurent voit un vrai bien Versi. Crédibilité +++ vs stock.

**Risque** : dépend de la disponibilité de photos qualité. Si la photo n'est pas à la hauteur, aller en Direction A plutôt que de mettre une mauvaise photo.

---

### Direction C — Split Hero (visuel gauche / texte droite)

**Principe** : Casser la logique plein écran. Hero en 2 colonnes : colonne gauche = image architecturale en pleine hauteur (50-55% de la largeur), colonne droite = fond #0B0B0B avec texte centré verticalement. Pas d'overlay. Deux univers qui se touchent.

**Specs techniques** :
- Layout : `display: grid; grid-template-columns: 55fr 45fr; min-height: 100vh`
- Colonne gauche : image `object-fit: cover`, `height: 100%`, sans overlay
- Colonne droite : fond `var(--color-bg-dark)`, padding `var(--spacing-3xl)`, flex column centré
- Sur mobile : colonne gauche = 40vh en haut, colonne droite = reste de l'écran
- Supprimer le scroll-hint (moins pertinent en split)

**Pourquoi ça marche** : approche editorial, références fonds immobiliers haut de gamme (type Patrizia, Nuveen RE). Différencie immédiatement Versi des sites "photo + overlay" standard. L'image devient un choix éditorial, pas un fond.

**Risque** : plus complexe à implémenter, nécessite une photo verticale de qualité. À réserver si une photo premium est disponible.

---

**Recommandation finale** : Direction A à déployer immédiatement (effort = 30 min, impact = 10/10). Direction B en parallèle si une photo Versi est disponible — elle peut remplacer A ultérieurement sans refonte.

---

## 4. Copy — Réécriture des headings

### Le problème structurel : trois fois le même message

Le one-page Versi répète "Quatre métiers. Un cycle maîtrisé." en trois endroits différents : Hero (tagline), Mission (heading h2), Activités (heading h2). C'est la même phrase. Laurent lit le Hero, descend sur Mission — même message. Descend sur Activités — même message. Ce n'est pas du renforcement, c'est de la redondance. Chaque section doit apporter une couche nouvelle d'information ou de conviction.

| Heading actuel | Problème | Proposition | Pourquoi |
|---|---|---|---|
| **Hero — Surtitre** : "HOLDING IMMOBILIÈRE INTÉGRÉE" | Factuel, correct, mais sans caractère. Toutes les holdings se décrivent ainsi. | "OPÉRATEUR IMMOBILIER INTÉGRÉ — FRANCE" | Insiste sur le fait qu'on OPÈRE (pas qu'on gère), ancre géographiquement. Plus précis, moins générique. |
| **Hero — H1** : "Quatre métiers. Un cycle maîtrisé." | C'est la tagline retenue — elle est bonne. La conserver. | Conserver tel quel. | Rien à changer ici. C'est la ligne la plus forte du site. |
| **Hero — Sous-titre** : "Versi acquiert, transforme, détient et structure des actifs immobiliers en France. De l'identification d'une opportunité à sa structuration financière — en interne." | Trop descriptif, liste les verbes sans accroche. La deuxième phrase (en interne) est la plus forte — elle est enterrée. | "De l'identification de l'actif à sa structuration financière — sans passer la main. Versi opère l'ensemble du cycle en interne." | Inverser la structure : commencer par la promesse différenciante ("sans passer la main"), puis la preuve ("en interne"). La rareté est dans le "sans passer la main", pas dans la liste de verbes. |
| **Mission — H2** : "Un opérateur intégré. Quatre métiers. Un cycle." | Paraphrase le Hero sans rien ajouter. Pire : "Un cycle" sans "maîtrisé" est moins fort que la tagline. | "Nous ne déléguons pas. Nous décidons." | Pivot radical vers ce qui différencie vraiment Versi : la prise de décision reste interne à chaque étape. C'est ce que Laurent veut entendre — pas une description de structure, une promesse d'engagement. |
| **Mission — Intro** : "Versi est une holding immobilière qui maîtrise l'ensemble du cycle d'une opération — de l'identification de l'actif à sa structuration financière finale, sans passer la main à chaque étape." | Définition de structure, pas promesse. "Sans passer la main à chaque étape" = formulation hésitante. | "Chaque opération Versi est pilotée par les mêmes fondateurs de la sourcing à la clé. Pas de sous-traitance de la stratégie. Pas de dilution de la décision." | Trois affirmations courtes, directes, sans subordination. Laurent comprend immédiatement ce qui est différent. |
| **Mission — Corps secondaire** : "Nous n'arbitrons pas. Nous opérons." | C'est la meilleure ligne du site. Conserver. | Conserver tel quel, peut-être en variant le contexte. | Cette ligne est exactement dans le ton Versi. |
| **Équipe — H2** : "Trois associés. Des parcours vérifiables." | "Vérifiables" : adjectif juridique, froid, inutilement défensif. Ce mot sous-entend qu'on doute de la véracité — Laurent ne vient pas vérifier, il vient évaluer. | "Trois associés. Zéro posture." | Ton direct, anti-bullshit, confiant sans fanfaronnade. Ou alternative : "Trois associés. Des parcours, pas des titres." — plus explicite sur le refus des credentials vides. |
| **Équipe — Sous-titre** : "Chaque fondateur a construit et géré des actifs avant de construire Versi. Le discours suit la pratique — pas l'inverse." | Bonne ligne. Un peu longue. Mais elle dit l'essentiel. | Conserver, ou raccourcir : "Ils ont construit avant de vendre l'idée. Le discours suit la pratique." | La logique est bonne — c'est l'ordre d'exposition (pratique avant discours) qui différencie. Garder si le ton global est recalibré. |

### Verdict copy global

Le copy du site a du caractère dans ses meilleures lignes ("Nous n'arbitrons pas. Nous opérons." / "Le discours suit la pratique — pas l'inverse."). Le problème n'est pas l'absence de talent copywriting — c'est la répétition du même message et quelques mots qui dévient du ton (vérifiable, arbitrons, maîtrisé = encore bon mais troisième occurrence). La correction est chirurgicale : deux headings à réécrire (Mission H2, Équipe H2), une restructuration du sous-titre Hero, et on est au niveau attendu.

---

## 5. Typographie — Corrections

### Problèmes identifiés dans le CSS

**Problème 1 — Uniformité nav : logo = liens (même taille, même poids)**

Dans `Nav.css`, le logo `.nav__logo` et les liens `.nav__link` ont exactement les mêmes specs : `font-size: 0.8125rem`, `font-weight: 400/500`, `text-transform: uppercase`, `letter-spacing: 0.1em`. Résultat : la nav est une ligne de texte uniforme. L'oeil ne distingue pas le logo des liens — manque de hiérarchie.

Correction :
```css
/* Logo — plus léger, plus affirmé dans le blanc */
.nav__logo {
  font-weight: var(--font-weight-thin); /* 200 — light et affirmé */
  letter-spacing: 0.18em; /* tracking plus ouvert pour le nom de marque */
  font-size: 0.9375rem; /* légèrement plus grand que les liens */
}

/* Liens — rester sobre */
.nav__link {
  font-weight: var(--font-weight-regular); /* 400, pas 500 */
  letter-spacing: 0.08em; /* légèrement moins ouvert */
}
```

**Problème 2 — Tablette : nav__link réduit à 0.75rem**

Sur tablette (`768px-1279px`), la règle `font-size: 0.75rem` sur `.nav__link` crée un écart de taille entre les liens (0.75rem) et le CTA "NOUS CONTACTER" (0.75rem aussi, mais avec padding qui le rend visuellement plus grand). Ce n'est pas critique mais c'est la cause du "tailles de police qui changent" mentionné par le fondateur. La solution n'est pas d'augmenter la taille des liens mais d'harmoniser visuellement le CTA.

Correction :
```css
@media (min-width: 768px) and (max-width: 1279px) {
  .nav__link {
    font-size: 0.75rem; /* maintenir */
  }
  .nav__cta {
    font-size: 0.75rem; /* déjà là — vérifier que le padding est cohérent */
    padding: 8px 16px; /* déjà là */
  }
  /* Ajouter : homogénéiser l'espacement entre items */
  .nav__items {
    gap: var(--spacing-lg); /* déjà là — OK */
  }
}
```

**Problème 3 — Menu mobile overlay : 2.25rem vs tout le reste**

Le menu mobile `nav__overlay-link` est en `2.25rem` avec `font-weight: light`. C'est cohérent avec une navigation overlay plein écran — pas un problème en soi. Mais si les fondateurs voient cette taille comme disproportionnée, on peut descendre à `2rem`.

**Problème 4 — Cohérence des tailles de corps dans le contenu**

D'après le code Mission.jsx, il y a deux tailles de corps : `text-body-lg` (intro) et `text-body-md` (corps secondaire). Ce sont deux tailles différentes dans la même section. Si le design system le gère via des tokens, c'est intentionnel. Si ce n'est pas défini dans index.css, c'est du hardcode qui crée l'impression de "tailles qui changent".

Action : vérifier que `text-body-lg` et `text-body-md` sont des classes utilitaires définies dans index.css avec des tailles cohérentes (ex : 1.125rem et 1rem).

### Recommandation typographique globale

La typographie du site n'est pas mauvaise — c'est le rapport logo/liens nav qui crée l'impression désordonnée. Deux corrections CSS de 5 lignes chacune règlent 80% du problème. La polices elle-même (PP Neue Montreal / DM Sans en fallback) est le bon choix — ne pas en changer.

---

## 6. Cartes fondateurs — Refonte

### Diagnostic des problèmes actuels

**Problème A — Photos "qui volent"**

Le CSS actuel affiche les photos en `160px × 160px`, `object-fit: cover`. Le problème n'est pas l'implémentation CSS — c'est que les 3 photos sources sont de natures radicalement différentes :
- `thomas.png` : format et cadrage inconnus
- `max.png` : format et cadrage inconnus
- `carl.jfif` : format JFIF (compressé), qualité variable

Avec des photos de profil LinkedIn ou prises au téléphone, les cadrages sont différents : l'un est en buste, l'autre en plan rapproché, le troisième en plein pied recadré. L'`object-fit: cover` sur un carré 160px ne peut pas corriger ça — il cadre au centre de l'image, mais si le visage n'est pas centré, le résultat "vole".

**Problème B — Layout carte centré avec photo ronde/carrée**

La carte actuelle est centrée (`align-items: center; text-align: center`). Les photos sont carrées (`border-radius: 0`). Ce n'est pas mauvais — mais ce format centrée-photo-carrée ressemble à une carte de réseau social, pas à une présentation institutionnelle.

### Solution recommandée — Layout horizontal avec photo format portrait

**Option 1 : Carte portrait (recommandée)**

Transformer les cartes de format centré-carré à format portrait-éditorial :
- Photo : `width: 100%`, `aspect-ratio: 3/4` (format portrait), `object-fit: cover`, `object-position: center top` (force le cadrage sur le haut = visage)
- La carte affiche la photo sur toute la largeur en haut, puis le contenu texte en dessous
- Grid 3 colonnes maintenu — chaque carte fait ~380px de large → photo ~380px × ~507px (bien lisible)

```css
/* Nouvelle structure carte */
.team__card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0; /* supprimer le padding global */
  display: flex;
  flex-direction: column;
  align-items: stretch; /* photo pleine largeur */
  text-align: left; /* aligner à gauche, plus institutionnel */
  transition: border-color var(--duration-normal) ease;
  overflow: hidden; /* pour que la photo ne déborde pas */
}

.team__photo-wrapper {
  width: 100%;
  aspect-ratio: 3/4;
  overflow: hidden;
}

.team__photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top; /* visage toujours en haut */
}

.team__card-content {
  padding: var(--spacing-xl); /* padding uniquement sur la partie texte */
}
```

**Option 2 : Photo pleine largeur format 16/9 (alternative)**

Si les photos sont toutes en format paysage ou buste large :
- `aspect-ratio: 16/9` ou `4/3`
- Même principe d'`object-position: center top`

**Option 3 : Conserver le carré 160px mais avec un fix de cadrage**

Si refonte trop risquée, solution minimale :
- Ajouter `object-position: center top` à `.team__photo` pour forcer le cadrage sur le haut de l'image (visage)
- Passer la taille à `200px × 200px` (légèrement plus grand = moins "timbre-poste")
- Conserver le layout centré

Cette option règle le "volent" sans toucher au layout. Impact visuel moindre mais effort = 5 min.

### Recommandations complémentaires pour les cartes

**Track record Carl — le problème le plus urgent**

Texte actuel (`.team__track` de Carl) : "Construit la présence de Versi sur les marchés et dans les réseaux de prescripteurs."

C'est du futur transformé en présent. Carl n'a pas encore de track record immobilier personnel documenté dans `team.js`. C'est un problème de fond, pas un problème CSS.

Proposition de reformulation à valider avec Carl :
- Option A (si Carl a des biens) : "X actifs locatifs. Pilote la stratégie de présence Versi et le développement des réseaux partenaires."
- Option B (si Carl apporte expertise marketing) : "Head of Marketing, Inbolt. Co-fondateur Sarani. Construit les réseaux prescripteurs et la présence institutionnelle de Versi."

La spécialité Thomas et Carl sont similaires ("Marketing strategy & opérations" vs "Marketing strategy & croissance"). Le fondateur devrait différencier : Thomas = opérations terrain, Carl = développement réseaux et image. Propositions :
- Thomas : "Opérations & pilotage. De la sourcing à la livraison, chaque étape pilotée en direct."
- Carl : "Développement & réseaux. Partenaires, prescripteurs, présence institutionnelle."

**Alignment texte** : basculer de `text-align: center` à `text-align: left` dans les cartes. Le centrage convient aux profils sociaux. Une présentation institutionnelle d'investisseurs — référence enclave.com — est alignée à gauche. Ça fait sortir les cartes du registre "profil LinkedIn" pour entrer dans le registre "biographie de fond d'investissement".

---

## 7. Entités — Corrections

### Corrections demandées par le fondateur

**Correction 1 — Versi Développement → Versi Immobilier**

Changement de nom + réécriture de la description pour refléter le métier de marchand de biens de manière plus directe.

Fichier à modifier : `src/src/config/entities.js`

```js
// Avant
{
  id: 'developpement',
  label: 'MARCHAND DE BIENS',
  name: 'Versi Développement',
  description: 'Acquisition et transformation d\'actifs résidentiels et mixtes en France. Versi Développement identifie, négocie et pilote la transformation en direct — de la due diligence au dépôt de permis.',
  url: 'https://versi-developpement.fr',
  // ...
}

// Après
{
  id: 'developpement',
  label: 'MARCHAND DE BIENS',
  name: 'Versi Immobilier',
  description: 'Acquisition, transformation et revente d\'actifs résidentiels et mixtes en France. Versi Immobilier identifie les biens à potentiel, conduit la due diligence et pilote la transformation — de la négociation à la revente.',
  url: 'https://versi-developpement.fr',
  // (l'URL du sous-domaine reste versi-developpement.fr jusqu'à décision contraire)
  // ...
}
```

Note : si le domaine `versi-developpement.fr` est remplacé par `versi-immobilier.fr`, mettre à jour l'URL dans entities.js et dans `project-context.md`.

**Correction 2 — Versi Invest : ajouter conseil en investissement**

La description actuelle couvre la structuration et le co-investissement, mais ne mentionne pas le conseil. Le fondateur veut que le conseil apparaisse explicitement.

```js
// Avant
{
  id: 'invest',
  label: 'STRUCTURATION D\'INVESTISSEMENT',
  name: 'Versi Invest',
  description: 'Montage et structuration d\'opérations en co-investissement. Versi Invest structure les véhicules d\'investissement adaptés à chaque opération — ticket, fiscalité, horizon de sortie.',
}

// Après
{
  id: 'invest',
  label: 'INVESTISSEMENT & CONSEIL',
  name: 'Versi Invest',
  description: 'Conseil en investissement immobilier et co-investissement sur sélection. Versi Invest accompagne les investisseurs privés dans l\'analyse, la structuration et le suivi d\'opérations — ticket adapté, fiscalité optimisée, horizon de sortie défini dès l\'entrée.',
}
```

Note sur le label : passer de "STRUCTURATION D'INVESTISSEMENT" à "INVESTISSEMENT & CONSEIL" pour que le label visible sur la carte reflète immédiatement le double métier. Si le label doit rester court (typographie), variante : "CONSEIL & CO-INVEST".

### Bilan des 4 entités après correction

| Entité | Nom corrigé | Label | Changement |
|---|---|---|---|
| versi-developpement | Versi Immobilier | MARCHAND DE BIENS | Nom changé + description élargie à la revente |
| versi-invest | Versi Invest | INVESTISSEMENT & CONSEIL | Label + description enrichis du conseil |
| versi-capital | Versi Capital | FONCIÈRE | Aucun changement — description correcte |
| versi-finance | Versi Finance | INGÉNIERIE FINANCIÈRE | Aucun changement — description correcte |

### Point d'attention sur la cohérence du projet-context.md

Le scope dans `project-context.md` mentionne encore "Versi Développement (marchand de biens) → versi-developpement.fr". Ce champ doit être mis à jour si le nom change officiellement. Impacte aussi les livrables @legal (mentions légales mentionnent peut-être le nom de l'entité) et @seo (keyword-map peut référencer Versi Développement).

---

## 8. Priorités classées par impact

Classement par impact sur la crédibilité perçue par Laurent, pas par effort technique.

| Priorité | Action | Effort | Impact | Owner | Critère de done |
|---|---|---|---|---|---|
| **P0** | Hero : remplacer la photo Unsplash par fond #0B0B0B pur (Direction A) | 30 min | 10/10 | @fullstack | Plus de `background-image` dans Hero.css. Le Hero se charge sans image externe. |
| **P0** | Équipe : ajouter `object-position: center top` sur `.team__photo` | 5 min | 7/10 | @fullstack | Les visages sont cadrés en haut de chaque photo — plus de "photos qui volent". |
| **P0** | Entités : renommer Versi Développement → Versi Immobilier + corriger label Versi Invest | 15 min | 6/10 | @fullstack | entities.js modifié, noms affichés corrects sur le site. |
| **P1** | Équipe heading : "Des parcours vérifiables." → "Zéro posture." ou "Des parcours, pas des titres." | 2 min | 8/10 | @fullstack | Team.jsx H2 modifié. |
| **P1** | Mission heading : "Un opérateur intégré. Quatre métiers. Un cycle." → "Nous ne déléguons pas. Nous décidons." | 2 min | 7/10 | @fullstack | Mission.jsx H2 modifié. |
| **P1** | Hero sous-titre : restructurer pour mettre "sans passer la main" en premier | 5 min | 6/10 | @fullstack | Hero.jsx sous-titre modifié. |
| **P1** | Nav : différencier logo (font-weight: 200, letter-spacing: 0.18em) vs liens (font-weight: 400, letter-spacing: 0.08em) | 10 min | 5/10 | @fullstack | Nav.css modifié. Le logo se distingue visuellement des liens de navigation. |
| **P2** | Équipe : basculer `text-align: center` → `text-align: left` dans les cartes | 5 min | 4/10 | @fullstack | Team.css modifié. Les cartes ont un registre plus institutionnel. |
| **P2** | Équipe : refonte layout carte avec photo portrait `aspect-ratio: 3/4` (Option 1) | 45 min | 7/10 | @fullstack | Nouveau layout carte validé sur desktop et mobile. |
| **P2** | Track record Carl : réécrire avec vraies données (à fournir par Carl) | Fondateurs | 8/10 | Thomas/Carl | team.js ligne Carl mise à jour avec données réelles. |
| **P2** | Versi Invest description : enrichir avec le conseil en investissement | 5 min | 4/10 | @fullstack | entities.js mis à jour. |
| **P3** | Photo Hero Direction B : photos réelles biens Versi (si disponible) | Variable | 9/10 | Thomas | Photo intégrée en production si qualité validée. |
| **P3** | Branchement Formspree (formulaire contact) | 20 min | 10/10 (bloquant launch) | @fullstack | Formulaire envoie un email réel à contact@versi.fr — testé en production. |

### Ce qui n'est PAS une priorité

- Changer de police (PP Neue Montreal est le bon choix — ne pas en changer)
- Revoir la structure de la nav (les 5 items sont corrects)
- Modifier la section Approche ou Implantation (non auditées, non signalées comme problèmes)
- Changer la tagline "Quatre métiers. Un cycle maîtrisé." (elle est bonne — ne pas y toucher)

### Estimation de temps cumulé pour les P0 + P1

Toutes les corrections P0 et P1 ensemble : environ 1h15 pour @fullstack. C'est le minimum pour passer de 6,5/10 à 8,5/10. Les P2 (notamment refonte cartes et track record Carl) portent à 9/10.

---

---

**Handoff → @fullstack**

- Fichiers produits : `docs/reviews/creative-audit-site-v1.md`
- Décisions prises :
  - Hero : Direction A (fond #0B0B0B pur, supprimer background-image) recommandée en P0
  - Entités : Versi Développement → Versi Immobilier, Versi Invest label → "INVESTISSEMENT & CONSEIL"
  - Cartes équipe : object-position center top en P0, refonte portrait aspect-ratio 3/4 en P2
  - Copy : 3 headings à réécrire (Hero surtitre, Mission H2, Équipe H2)
  - Nav : différenciation logo vs liens via font-weight et letter-spacing
- Points d'attention pour l'implémentation :
  - P0 en premier : Hero CSS (30 min), photo cadrage (5 min), entités (15 min) — tout fait avant toute autre correction
  - La photo Hero Direction A supprime la dépendance à Unsplash — fiabilité +++ en production
  - team.js : demander à Carl ses vraies données avant de modifier son track record (ne pas inventer)
  - entities.js : si le domaine versi-developpement.fr devient versi-immobilier.fr, mettre à jour l'URL aussi
  - Formspree (P3 technique mais P0 launch) : à brancher avant toute mise en ligne

---

*Audit produit par @creative-strategy — 2026-04-08. Document de référence pour les corrections V1 de versi.fr.*
