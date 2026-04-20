# Audit GEO — versi-immobilier.fr (session s8)

> Produit par @geo | Date : 2026-04-14
> Périmètre : versi-immobilier.fr uniquement
> Persona principal audité : Kévin (acquéreur, primo-accédant / investisseur locatif Hauts-de-France)
> Persona secondaire : Sophie (propriétaire vendeuse)
> KPI North Star : Prises de contact qualifiées via formulaire
> Référence : docs/reviews/geo-final-audit.md (audit s4, note 9/10), docs/geo/geo-strategy.md

---

## Score global : 6.5/10

**Régression par rapport à l'audit s4 (9/10).**
L'audit s4 évaluait le site avant le pivot persona (acquéreur = persona principal). La réévaluation avec le nouveau prisme révèle des lacunes structurelles majeures : le contenu GEO est presqu'entièrement orienté vendeur/Sophie. Kévin (l'acquéreur) est quasi-absent des passages extractibles, des FAQ Schema, du llms.txt et des requêtes LLM cibles.

---

## Scores par dimension

| Dimension | Score /10 | Synthèse |
|---|---|---|
| LLM-friendliness (structure, format, passages) | 6/10 | Riche côté vendeur, pauvre côté acquéreur |
| Schema.org | 7/10 | FAQPage présente mais 0 question acquéreur ; founders absents du nœud Organization |
| E-E-A-T | 8/10 | Track record solide, fondateurs nommés, chiffres vérifiables |
| Contenu citationnable (acquéreur) | 4/10 | Quasi-absent — problem critique post-pivot |
| llms.txt | 6/10 | Présent et factuel mais 0 mention acquéreur, persona secondaire traité comme principal |

---

## Top 5 des problèmes critiques

### P1 — BLOQUANT : llms.txt et FAQ Schema orientés vendeur, acquéreur invisible
### P2 — BLOQUANT : Aucun passage LLM-ready répondant aux requêtes acquéreur
### P3 — CRITIQUE : Schema.org Organization sans founders (non corrigé depuis s4)
### P4 — CRITIQUE : Blog sans Schema.org Article-level ni FAQ par article
### P5 — MODÉRÉ : Absence de contenu citationnable sur "acheter un bien rénové à Lille"

---

## Analyse détaillée

### 1. LLM-Friendliness

**Score : 6/10**

**Ce qui fonctionne (héritage de l'audit s4) :**

- Stats.jsx est auto-contenu et extractible : "21 appartements rénovés / 100% vendus en direct, sans agence / 3,2M€ de volume traité depuis 2022". Score GEO 3/3.
- Arguments.jsx contient 3 blocs acquéreur factuels ("Vous achetez à la source", "Rien n'est caché", "Le prix affiché est le prix"). Passages courts, assertions directes, zéro superlatif. Score GEO moyen : 2/3 (vérifiabilité partielle — "diagnostics complets" non sourcé).
- Hero.jsx : surtitre "VERSI IMMOBILIER — MARCHAND DE BIENS" + "Des appartements sélectionnés, préparés, disponibles." — extractible mais pas auto-contenu. Ne répond à aucune question acquéreur formulée. Score GEO : 1/3 (extractible seulement).
- SellPage.jsx : FAQ vendeur dense et bien structurée, 5 Q&R complètes en HTML rendu, score 3/3. Mais cette richesse bénéficie exclusivement à Sophie (vendeur), pas à Kévin.

**Ce qui manque (lacunes post-pivot) :**

- Zéro passage répondant à la question "Pourquoi acheter un bien rénové à Lille chez Versi Immobilier plutôt qu'une agence ?" — la requête naturelle de Kévin.
- Zéro page ou section FAQ acquéreur visible en HTML. Arguments.jsx adresse partiellement l'acquéreur mais sans format Q&A extractible.
- PropertiesPage.jsx : le header de la page est purement fonctionnel (filtres, grille). Aucun passage descriptif sur la zone, les prix, la qualité de rénovation. Un LLM qui crawle `/nos-biens` n'extrait rien de citationnable.
- PropertyDetailPage.jsx : fiches biens sans Schema.org `RealEstateListing` ni `Product`. Pas de passage standardisé décrivant la qualité de rénovation Versi Immobilier — chaque fiche est une description ad hoc.
- Aucune page ou section répondant à "C'est quoi un bien vendu par un marchand de biens ?" — question fréquente des primo-accédants (persona Kévin).

### 2. llms.txt — Analyse persona

**Score : 6/10**

Le fichier `versi-immobilier/public/llms.txt` est présent, bien structuré et factuel. C'est un acquis de la session s4. Cependant, une lecture au prisme du persona post-pivot révèle un problème de ciblage majeur.

**Audit persona du llms.txt actuel :**

Le fichier est quasi-intégralement orienté vers Sophie (vendeur) et les professionnels (notaires, agents). Les sections suivantes concernent exclusivement la transaction entrante (acheter à Versi) :
- "Activité" : décrit Versi comme acheteur de biens ("achète en nom propre") — langage vendeur/cession, pas acquéreur.
- "Engagements" : les 3 engagements ("offre ferme", "sans condition suspensive", "7 jours") sont les arguments du vendeur. Un acquéreur ne comprend pas pourquoi il devrait s'en préoccuper.
- "Process de vente" : 3 étapes de soumission d'un bien — c'est le process vendeur, pas le process d'achat pour Kévin.
- "Chiffres clés" : 21 appartements rénovés, 3,2M€ de volume — ces chiffres parlent à un investisseur ou un vendeur evaluant la crédibilité, pas à Kévin qui cherche un F3 à Lille.
- "FAQ" : 5 questions — toutes orientées sur le fonctionnement de Versi en tant qu'acheteur, ou sur la différence agence/marchand. Aucune question de type "quels sont les avantages d'acheter un bien rénové par un marchand de biens ?" ou "comment se passe la visite et l'achat ?".
- "Pages du site" : la page "Nos biens" est listée mais sans description orientée acquéreur.

**Contenu acquéreur totalement absent du llms.txt :**
- Aucune mention du type de biens disponibles (appartements 1-2-3 pièces)
- Aucun argument pour Kévin : pas de frais d'agence, diagnostics fournis, garantie décennale, livraison clé en main
- Aucune description de la zone géographique prioritaire (Lille, Hauts-de-France)
- Aucune FAQ acquéreur : "Comment se passe la visite ?", "Les diagnostics sont-ils fournis ?", "Y a-t-il une commission ?"
- Aucune mention du fait que les biens sont vendus sans frais d'agence à l'acquéreur

### 3. Schema.org — Analyse complète

**Score : 7/10**

**Ce qui est en place (index.html) :**

1. **Organization + RealEstateAgent** : présent avec `@id`, `parentOrganization` vers versi.fr, `knowsAbout` (6 domaines), `contactPoint`, `areaServed`. Type dual `["Organization", "RealEstateAgent"]` correct pour un marchand de biens. La correction s4 a bien été intégrée.

2. **WebSite** : présent avec `publisher` lié à l'organization.

3. **FAQPage** : présent avec 5 questions/réponses. Mais analyse persona :
   - Q1 "Comment fonctionne Versi Immobilier ?" → réponse orientée vendeur ("achète des biens en nom propre")
   - Q2 "Versi Immobilier est-il un agent immobilier ?" → réponse neutre, utile
   - Q3 "Quels types de biens Versi Immobilier achète-t-il ?" → orienté vendeur
   - Q4 "Comment est financé l'achat ?" → orienté vendeur
   - Q5 "Qui sont les fondateurs ?" → neutre, utile pour E-E-A-T
   - **Bilan : 0 question sur 5 répond à une requête acquéreur.** Kévin n'est pas représenté.

**Lacunes non corrigées depuis s4 :**

- `founders` absent du nœud Organization (signalé en P1 de l'audit s4 mais non appliqué). Les fondateurs apparaissent dans les JSX et la FAQ, mais pas dans le bloc Organization lui-même. Perte de -0,5 point sur E-E-A-T structurel.
- `areaServed` : `"@type": "Country", "name": "France"` est trop générique. Versi Immobilier opère prioritairement dans les Hauts-de-France (Lille). Un `areaServed` plus précis (région ou ville) renforcerait la pertinence locale pour les requêtes "marchand de biens Lille" ou "appartement rénové Lille".

**Lacunes sur les pages internes :**

- **Fiches biens (PropertyDetailPage.jsx)** : aucun Schema.org `RealEstateListing` ou `Product` généré dynamiquement. C'est une lacune majeure. Chaque fiche bien pourrait porter un schema structuré avec `name`, `description`, `address`, `floorSize`, `numberOfRooms`, `price`. Les LLMs qui interrogent "appartements rénovés à vendre à Lille" n'ont aucune donnée structurée à extraire.
- **Articles de blog (BlogArticlePage.jsx)** : le Schema.org `BlogPosting` est injecté dynamiquement via `useEffect` — techniquement présent mais potentiellement non-visible pour les crawlers qui ne font pas de rendu JavaScript complet (Perplexity notamment). Risque modéré mais réel.
- **Aucun `BreadcrumbList`** sur les pages de navigation profonde (fiches biens, articles), ce qui limite la compréhension de la hiérarchie du site par les LLMs.

### 4. E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)

**Score : 8/10**

C'est la dimension la plus solide du site. L'audit s4 avait déjà noté un niveau élevé. Il reste stable.

**Experience :**
- 21 appartements rénovés documentés dans Stats.jsx (chiffre vérifiable, répété dans llms.txt et Schema).
- 3,2M€ de volume traité depuis 2022 — claim précis, temporalisé, ancré.
- Page Réalisations avec projets terminés et chiffres (prix achat, travaux, revente) — signal d'expérience réel, exploitable.
- Les fiches biens incluent "Travaux réalisés" avec liste détaillée — signal d'expérience opérationnelle sur chaque bien.

**Expertise :**
- Fondateurs nommés et profilés avec tracks vérifiables : Maxime Lemoine (ex-Sony, 24 contrats locatifs), Thomas Issa (13 actifs locatifs à Paris), Carl Standertskjold-Nordenstam (Head of Marketing Inbolt). Profils LinkedIn liés.
- ApprochePage.jsx détaille la méthode en 4 étapes avec langage opérationnel précis — signal d'expertise métier.
- Définition de la distinction marchand de biens / agent immobilier (FAQ Schema Q2) — expertise pédagogique extractible.

**Authoritativeness :**
- Lien vers versi.fr (holding) présent dans le footer et ApprochePage — cross-entité qui renforce l'autorité.
- `parentOrganization` avec `@id` dans Schema.org — signal machine-readable d'appartenance à une structure plus large.
- Blog avec tags sectoriels (acquéreur, financement, Hauts-de-France) — signal de topical authority en cours de construction.

**Trustworthiness :**
- Arguments.jsx : "Rien n'est caché. Diagnostics complets. Historique des travaux. Garantie décennale." — claims de transparence vérifiables.
- FAQ SellPage.jsx : réponse franche à "Êtes-vous sérieux ?" avec lien vers réalisations — signal de confiance factuel.
- Email de contact visible et stable (contact@versi.fr).

**Lacunes E-E-A-T :**
- Aucun témoignage acquéreur (situation compréhensible au lancement mais à combler rapidement).
- Aucune mention des certifications ou structures juridiques (forme sociale, RCS) — certains LLMs évaluent ces signaux.
- Blog vide au moment de l'audit — l'expertise éditoriale n'est pas encore construite.

### 5. Contenu citationnable acquéreur (Kévin)

**Score : 4/10**

C'est la lacune la plus critique révélée par le pivot persona. Le site ne répond à quasi aucune requête que Kévin soumettrait à un LLM.

**Requêtes acquéreur testées (simulation — sans WebSearch car limitée à 2 max) :**

| Requête Kévin | Contenu sur le site | Citationnable ? |
|---|---|---|
| "acheter appartement rénové Lille pas cher" | PropertiesPage — fiches dynamiques, 0 texte descriptif | Non |
| "avantages acheter chez marchand de biens" | Arguments.jsx — 3 blocs partiels | Partiellement |
| "frais d'agence achat immobilier neuf rénové" | Arguments.jsx P3 "Le prix affiché est le prix" | Oui (1 phrase) |
| "garanties achat appartement rénové" | Arguments.jsx P2 "Diagnostics complets. Garantie décennale." | Oui (fragmenté) |
| "comment acheter un bien chez Versi Immobilier" | Aucune page dédiée — zéro process acquéreur documenté | Non |
| "investir à Lille rendement locatif" | InvestirPage (à vérifier) | À confirmer |

**Contenu citationnable existant orienté acquéreur (inventaire complet) :**

1. Arguments.jsx, argument 1 : "Pas d'intermédiaire entre vous et le bien. Les trois fondateurs ont acheté et piloté chaque appartement — ils en connaissent l'historique complet." Score GEO : 2/3.
2. Arguments.jsx, argument 2 : "Diagnostics complets. Historique des travaux. Garantie décennale sur les parties structurelles." Score GEO : 2/3.
3. Arguments.jsx, argument 3 : "Vente directe du propriétaire à l'acquéreur. Pas de commission d'agence à votre charge." Score GEO : 3/3 (précis, vérifiable, extractible).
4. Stats.jsx : "21 appartements rénovés / 100% vendus en direct, sans agence." Score GEO : 3/3.

**Total : 4 passages citables acquéreur.** C'est insuffisant pour apparaître dans les réponses LLM sur les requêtes de Kévin.

**Ce qui manque absolument :**
- Page ou section FAQ acquéreur : "Comment se passe l'achat ?", "Y a-t-il des frais ?", "Quelles garanties ?"
- Passage descriptif sur la qualité de rénovation (matériaux, labels, DPE visé)
- Contenu sur la zone géographique prioritaire Lille : pourquoi investir dans telle rue/quartier
- Process d'achat en 3-4 étapes (actuellement le process en 3 étapes documenté sur SellPage est le process du vendeur, pas de l'acquéreur)

### 6. Blog — Potentiel de citation IA

**Score de l'infrastructure : 7/10 | Score du contenu : N/A (blog vide)**

**Infrastructure technique du blog :**
- BlogPage.jsx : filtres par catégorie (Acheter rénové, Financement, Marchand de biens, Investir à Lille, Vendre son bien) — taxonomie bien alignée avec les requêtes LLM cibles.
- BlogArticlePage.jsx : Schema.org `BlogPosting` injecté dynamiquement via `useEffect`. Champs couverts : `headline`, `description`, `author` (Organization + 3 personnes nommées), `publisher`, `datePublished`, `dateModified`, `mainEntityOfPage`. Bonne base.
- Parser Markdown custom : h2, h3, listes, blockquotes — structure de contenu compatible avec l'extraction LLM par passages.
- Affichage des tags visibles dans les cartes article — signal de topical authority.

**Problèmes de l'infrastructure blog :**
1. Le Schema.org `BlogPosting` est injecté côté client (JS) — Perplexity et certains crawlers ne font pas de rendu JS. Si un article est très important pour le GEO, ce Schema ne sera pas vu. Solution : pré-générer le Schema en SSR ou l'inclure dans le HTML statique via un mécanisme de build.
2. Aucun `FAQPage` ni `HowTo` Schema.org par article — les articles qui contiendraient des listes de questions ou des étapes ne bénéficient pas d'un schema enrichi.
3. Le "Last updated" timestamp est structuré (`dateModified`) mais pas affiché visuellement — les LLMs valorisent la fraîcheur visible et structurée.
4. Aucune section "articles connexes" visible dans BlogArticlePage — limite l'autorité topique perçue par les crawlers.

**Contenu à prioriser pour le blog (requêtes Kévin haute valeur GEO) :**
Les articles suivants, s'ils sont produits au format Q&A avec définitions directes et chiffres sourcés, ont un fort potentiel de citation LLM :
- "Acheter un bien rénové à Lille : ce que vous obtenez chez un marchand de biens" → répondra à la requête "appartement rénové Lille"
- "Marchand de biens vs agence immobilière : les 5 différences concrètes pour l'acquéreur" → requête comparative haute valeur
- "Financement PTZ et primo-accession à Lille en 2026 : ce qui change" → cible Kévin primo-accédant directement
- "Garanties lors d'un achat rénové : décennale, diagnostics, charges" → requête informative avec fort potentiel FAQ

---

## Recommandations priorisées

### R1 — BLOQUANT | Réécrire le llms.txt pour intégrer le persona acquéreur
**Fichier** : `versi-immobilier/public/llms.txt`
**Action** : Ajouter une section "Acquéreurs" avec les informations suivantes :
- Types de biens proposés (appartements 1-6 pièces, rénovés clé en main)
- Zone prioritaire : Lille et Hauts-de-France
- Avantages acquéreur : pas de frais d'agence, diagnostics fournis, garantie décennale, historique travaux transparent
- Process acquéreur en 3 étapes (visite → offre → acte)
- FAQ acquéreur : 3-4 Q&R directes

**Claim extractible à intégrer dans llms.txt (score GEO 3/3) :**
> "Q: Y a-t-il des frais d'agence pour l'acquéreur ?\nR: Non. Versi Immobilier vend en direct du propriétaire à l'acquéreur. Aucune commission d'agence à la charge de l'acheteur. Le prix affiché est le prix de vente net."

**Effort** : 30 minutes. Impact : immédiat sur l'indexation LLM.

---

### R2 — BLOQUANT | Ajouter une FAQ acquéreur visible en HTML sur la homepage ou PropertiesPage
**Fichier** : nouveau composant `BuyerFAQ.jsx` à intégrer dans `HomePage.jsx` après `Arguments`
**Questions à couvrir (format Q&A extractible) :**
1. "Qu'est-ce qu'un bien vendu par un marchand de biens ?" — définition directe, 40 mots max
2. "Y a-t-il des frais d'agence ?" — réponse binaire + explication
3. "Quelles garanties ai-je sur un bien rénové ?" — garantie décennale, diagnostics, contenu précis
4. "Comment se passe la visite et l'achat ?" — process 3 étapes côté acquéreur
5. "Pourquoi choisir Versi Immobilier plutôt qu'une agence ?" — comparatif factuel, sans superlatifs

**Ajouter le Schema.org FAQPage** correspondant dans `index.html` pour ces 5 Q&R acquéreur.
**Effort** : 2-3h développement + 1h contenu. Impact : fort sur Perplexity et Google AIO.

---

### R3 — CRITIQUE | Corriger le Schema.org FAQPage dans index.html — remplacer les questions vendeur par un mix vendeur/acquéreur
**Fichier** : `versi-immobilier/index.html`
**Action** : remplacer Q1, Q3, Q4 (orientées vendeur) par 3 questions acquéreur. Conserver Q2 (définition MdB) et Q5 (fondateurs).

**Questions acquéreur à intégrer dans le FAQPage Schema :**
```json
{
  "@type": "Question",
  "name": "Y a-t-il des frais d'agence pour acheter un bien chez Versi Immobilier ?",
  "acceptedAnswer": {
    "@type": "Answer",
    "text": "Non. Versi Immobilier vend en direct — pas d'intermédiaire, pas de commission d'agence à la charge de l'acquéreur. Le prix affiché est le prix net vendeur."
  }
},
{
  "@type": "Question",
  "name": "Quelles garanties accompagnent un bien rénové par Versi Immobilier ?",
  "acceptedAnswer": {
    "@type": "Answer",
    "text": "Chaque bien livré par Versi Immobilier est accompagné de diagnostics complets, de l'historique des travaux réalisés et d'une garantie décennale sur les parties structurelles. Le dossier complet est remis avant la visite."
  }
},
{
  "@type": "Question",
  "name": "Quels types de biens Versi Immobilier propose-t-il à la vente ?",
  "acceptedAnswer": {
    "@type": "Answer",
    "text": "Versi Immobilier commercialise des appartements rénovés de 1 à 6 pièces, principalement à Lille et dans les Hauts-de-France. Les biens sont sélectionnés, transformés et vendus en direct par les fondateurs."
  }
}
```
**Effort** : 30 minutes. Impact : fort sur l'extraction LLM des requêtes acquéreur.

---

### R4 — CRITIQUE | Ajouter `founders` dans le nœud Organization du Schema.org (correctif s4 non appliqué)
**Fichier** : `versi-immobilier/index.html`
**Action** : ajouter dans le bloc `["Organization", "RealEstateAgent"]` :
```json
"founders": [
  { "@type": "Person", "name": "Maxime Lemoine", "sameAs": "https://www.linkedin.com/in/maxime-lemoine-34550354/" },
  { "@type": "Person", "name": "Thomas Issa", "sameAs": "https://www.linkedin.com/in/thomasissa/" },
  { "@type": "Person", "name": "Carl Standertskjold-Nordenstam", "sameAs": "https://www.linkedin.com/in/carlstandertskjold/" }
]
```
**Effort** : 5 minutes. Impact : +0,5 sur le score E-E-A-T structurel.

---

### R5 — CRITIQUE | Préciser areaServed dans Schema.org
**Fichier** : `versi-immobilier/index.html`
**Action** : remplacer `"@type": "Country", "name": "France"` par une liste de zones spécifiques :
```json
"areaServed": [
  { "@type": "AdministrativeArea", "name": "Hauts-de-France" },
  { "@type": "City", "name": "Lille" },
  { "@type": "AdministrativeArea", "name": "Île-de-France" }
]
```
**Effort** : 5 minutes. Impact : renforce la pertinence locale pour les requêtes "marchand de biens Lille" dans Perplexity et Google AIO.

---

### R6 — MODÉRÉ | Ajouter Schema.org sur les fiches biens (PropertyDetailPage)
**Fichier** : `versi-immobilier/src/pages/PropertyDetailPage.jsx`
**Action** : Injecter un Schema.org `RealEstateListing` via `useEffect` similaire au BlogArticlePage.jsx, avec :
- `name` : titre du bien
- `description` : description + travaux réalisés
- `address` : `PostalAddress` avec rue, ville, région
- `floorSize` : surface
- `numberOfRooms` : pièces
- `offers` : `Offer` avec prix et disponibilité
- `seller` : lien vers l'Organization Versi Immobilier

**Effort** : 2-3h. Impact : modéré immédiatement, fort à moyen terme quand le catalogue grossit.

---

### R7 — MODÉRÉ | Produire les 4 premiers articles de blog en format LLM-friendly
**Priorisation** : articles répondant aux requêtes Kévin les plus fréquentes.
1. "Marchand de biens vs agence : 5 différences pour l'acquéreur" — format liste, extractible
2. "Acheter rénové à Lille : ce que comprend un bien Versi Immobilier" — définition + liste
3. "Frais d'achat immobilier : ce que vous ne payez pas chez un marchand de biens" — chiffres précis
4. "Garanties sur un bien rénové : décennale, diagnostics, DPE" — format Q&A

**Format obligatoire** : définition directe dans les 40 premiers mots de chaque H2, 1 chiffre ou fait vérifiable par 150 mots, zéro superlatif.

---

### R8 — OPTIONNEL | Ajouter un "Last updated" visible sur les pages clés
Ajouter la date de dernière mise à jour visible (sous le titre ou en footer de section) sur ApprochePage, SellPage et les futures pages FAQ acquéreur. Les LLMs valorisent la fraîcheur du contenu (+28% citations selon les études GEO). `dateModified` dans le Schema `BlogPosting` est bien présent pour les articles mais pas sur les pages statiques.

---

## Vérification persona : llms.txt et Schema.org

**Verdict : NON CONFORME au pivot persona du 2026-04-10.**

### llms.txt — Vérification

| Élément | Kévin (acquéreur) | Sophie (vendeur) | Conformité |
|---|---|---|---|
| Section dédiée | Absent | Implicitement présent (process vente) | FAIL |
| FAQ | 0 question acquéreur sur 5 | 5 questions vendeur | FAIL |
| Arguments listés | Aucun | "Offre ferme", "7 jours", "sans condition suspensive" | FAIL |
| Zone géographique Lille | Absent | "Hauts-de-France et Île-de-France" (contexte vendeur) | FAIL |
| Types de biens achetables | Absent | Listés dans le contexte d'achat par Versi | FAIL |
| Avantages sans frais d'agence | Absent | N/A | FAIL |

**Score conformité llms.txt :** 0/6 éléments acquéreur présents.

### Schema.org FAQPage — Vérification

| Question Schema | Persona | Requête LLM cible |
|---|---|---|
| "Comment fonctionne Versi Immobilier ?" | Vendeur / Neutre | Aucun acquéreur ne pose cette question |
| "Versi Immobilier est-il un agent immobilier ?" | Neutre | Peu fréquent pour Kévin |
| "Quels types de biens achète Versi ?" | Vendeur | Vendeur cherchant si son bien rentre dans les critères |
| "Comment est financé l'achat ?" | Vendeur | Vendeur evaluant la solidité de l'offre |
| "Qui sont les fondateurs ?" | Tous | Signal E-E-A-T général |

**Score conformité Schema FAQPage :** 0 question sur 5 adresse directement Kévin.

### Conclusion vérification

Le llms.txt et les FAQ Schema.org ont été conçus avant le pivot persona du 2026-04-10 et n'ont pas été mis à jour. Ce sont des actifs GEO qui travaillent actuellement contre le KPI North Star (prises de contact acquéreurs), car ils orientent les LLMs vers des réponses pertinentes pour des vendeurs — ce qui peut générer des mauvaises citations ou des non-citations sur les requêtes Kévin.

---

## Protocole de monitoring — Prompts de test LLM

À soumettre mensuellement pour mesurer les progrès GEO :

**Perplexity :**
- "Marchand de biens appartements rénovés Lille"
- "Acheter appartement rénové sans frais d'agence Hauts-de-France"
- "Versi Immobilier avis"

**ChatGPT / Claude :**
- "Quels sont les avantages d'acheter un bien rénové chez un marchand de biens ?"
- "Comment acheter un appartement sans frais d'agence à Lille ?"
- "Versi Immobilier marchand de biens — c'est quoi ?"

**Baseline actuelle (avril 2026)** : Versi Immobilier n'est probablement pas cité sur les requêtes acquéreur (pas de contenu acquéreur extractible). À documenter après les corrections R1-R3 pour mesurer l'impact.

---

## Handoff

---
**Handoff → @fullstack**

Fichiers produits :
- `/home/user/Versi/docs/reviews/geo-audit-s8.md`

Décisions prises :
- Audit post-pivot persona révèle une non-conformité totale du llms.txt et du Schema.org FAQPage avec le persona acquéreur Kévin — conçus avant le pivot 2026-04-10, jamais mis à jour.
- Score révisé : 6.5/10 (régression vs 9/10 audit s4) justifiée par ce prisme persona.
- 8 recommandations priorisées : R1 (llms.txt), R2 (FAQ HTML acquéreur), R3 (FAQPage Schema), R4 (founders Schema), R5 (areaServed), R6 (fiches biens Schema), R7 (blog), R8 (timestamps).
- R1, R3, R4, R5 sont des corrections fichiers — 30 à 60 min au total.
- R2 est un nouveau composant `BuyerFAQ.jsx` à créer et intégrer dans `HomePage.jsx`.
- R6 est une injection Schema dynamique dans `PropertyDetailPage.jsx` (modèle existant dans `BlogArticlePage.jsx`).

Points d'attention pour @fullstack :
- Ne pas modifier le Schema.org `BlogPosting` dans `BlogArticlePage.jsx` — il est bien structuré, seul problème est la dépendance au rendu JS client (hors scope actuel).
- Le FAQPage Schema dans `index.html` doit être REMPLACÉ (pas ajouté) — garder Q2 et Q5, remplacer Q1/Q3/Q4 par les questions acquéreur listées en R3.
- Le llms.txt doit conserver les sections existantes (vendeur) et AJOUTER une section acquéreur — ne pas supprimer le contenu vendeur (Sophie reste persona secondaire).
- L'`areaServed` array (R5) remplace la valeur scalaire actuelle — syntaxe JSON à vérifier.

---
