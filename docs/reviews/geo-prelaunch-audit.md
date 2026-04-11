# Audit GEO pré-lancement — Versi

> Produit par @geo | Date : 2026-04-11
> Sites audités : versi.fr (src/) et versi-immobilier.fr (versi-immobilier/)
> Références : docs/geo/geo-strategy.md, project-context.md

---

## Note globale

**versi.fr : 7/10** — Les fondations Schema.org et llms.txt sont en place. Le site manque de passages auto-contenus dans les composants JSX (le texte visible est trop fragmenté et marketing) et de FAQ visible dans le HTML rendu. L'entité nommée Versi est bien présente ; les fondateurs sont dans le HTML via le composant Team mais via un `config/team.js` dont les valeurs sont injectées dynamiquement — elles sont bien rendues dans le DOM. Deux lacunes bloquantes : pas de FAQ HTML visible (le FAQPage Schema existe mais aucun contenu FAQ ne se lit dans les composants JSX du site), et le Hero ne contient aucune phrase extractible par un LLM.

**versi-immobilier.fr : 6.5/10** — Contenu HTML très riche (SellPage avec FAQ, ApprochePage avec équipe complète, Stats avec chiffres), mais absence critique de Schema.org FAQPage dans index.html, et absence de llms.txt. Le lien cross-entité vers versi.fr est bien présent dans le footer et ApprochePage, mais la relation parentOrganization n'est pas renforcée avec un `@id` canonique.

---

## Checklist — versi.fr

| # | Point | Statut | Commentaire |
|---|---|---|---|
| 1 | Schema.org complet | ✅ Partiel | Organization + WebSite + FAQPage présents. Manque : `sameAs` vide (LinkedIn fondateurs non liés), `foundingDate` sans lien vers entités filles, pas de `BreadcrumbList` ni `AboutPage`. Suffisant pour extraction LLM de base. |
| 2 | Passages LLM-ready (5+) | ❌ | Hero.jsx : "Quatre métiers. Un cycle maîtrisé." — slogan pur, 0 information extractible. Mission.jsx : stats (35+, 5, 4) présentes mais sans phrase contextualisante. Approach.jsx : 4 étapes avec texte court, auto-contenus. Activities.jsx : descriptions entités via `entities.js` — extractibles. Team.jsx : noms + tracks via `team.js` — extractibles. Bilan : 2/5 passages vraiment LLM-ready (Approach + Team). Les sections Hero et Mission ne produisent aucune phrase qui se lit seule hors contexte. |
| 3 | Entité nommée | ✅ | "Versi" apparaît dans : H1 (Hero — via surtitre), Mission h2, Footer. "Versi Immobilier", "Versi Invest", "Versi Capital", "Versi Finance" dans Activities. Le nom est sujet grammatical dans le Footer ("Versi Immobilier · Versi Invest…") et dans les descriptions entités. |
| 4 | Fondateurs nommés dans le HTML visible | ✅ | TEAM config injecte Thomas Issa, Maxime Lemoine, Carl Standertskjold-Nordenstam dans les `<h3>` et `<p>` de Team.jsx. Noms rendus en DOM. Tracks avec chiffres concrets (13 actifs locatifs, 24 contrats locatifs, Sony/Algolia/Inbolt). |
| 5 | Chiffres clés trackables | ✅ Partiel | Mission.jsx affiche "35+ actifs gérés en direct", "5 immeubles en portefeuille", "4 métiers intégrés". Présents dans le DOM. Mais non accompagnés d'une phrase complète auto-contenue : les LLMs voient "35+" sans contexte sémantique ("35+ actifs gérés par Versi"). C'est un problème d'extractibilité, pas d'absence. |
| 6 | FAQ visible dans le HTML | ❌ | Le Schema.org FAQPage est dans index.html (3 questions/réponses) mais aucun composant JSX ne rend une section FAQ lisible dans le DOM. Les LLMs qui ne lisent que le HTML rendu (Perplexity, crawlers) ne voient pas la FAQ. La FAQ n'existe que dans le `<script type="application/ld+json">` — invisible à l'utilisateur et à certains crawlers. |
| 7 | llms.txt | ✅ | `src/public/llms.txt` présent avec entités, fondateurs et sections du site. Contenu factuel correct. Mineure : le llms.txt mentionne "11 actifs locatifs à Paris" pour Thomas Issa alors que team.js indique "13 actifs locatifs à Paris" — incohérence à corriger. |
| 8 | Liens cross-entités | ✅ Partiel | Footer.jsx liste les 4 entités ("Versi Immobilier · Versi Invest · Versi Capital · Versi Finance"). Le composant Activities.jsx contient les URLs de chaque entité. Mais les liens sont désactivés (`ENTITY_SITES_ACTIVE` = false pour tout) — les URLs ne sont pas cliquables, donc pas suivies par les crawlers. Exception : Versi Immobilier a `isActive: false` dans entities.js, même si versi-immobilier.fr existe déjà. |
| 9 | Différenciateurs textuels | ✅ Partiel | Approach.jsx : "Maîtrise d'ouvrage en direct. Versi pilote les travaux sans intermédiaire". Mission.jsx : "Pas d'apporteur d'affaires, pas de bureau d'études sous-traité". Extractibles mais sans comparatif explicite ("contrairement à un marchand de biens classique…"). La distinction est implicite, pas formulée pour extraction LLM directe. |
| 10 | Meta descriptions LLM-friendly | ✅ | `<meta name="description">` : "Versi acquiert, transforme et structure des actifs immobiliers en France. Quatre métiers intégrés, un cycle maîtrisé en interne. Co-investissement et mandats." — réponse directe, factuelle, sans superlatif. Score GEO : 2/3 (vérifiable + extractible, précision moyenne). |

---

## Checklist — versi-immobilier.fr

| # | Point | Statut | Commentaire |
|---|---|---|---|
| 1 | Schema.org complet | ❌ | Organization + WebSite présents. Manque critique : pas de FAQPage Schema malgré 5 questions/réponses complètes dans SellPage.jsx. Manque aussi : `parentOrganization` sans `@id` (référence à `https://versi.fr/#organization` absente). Manque : `RealEstateAgent` ou `LocalBusiness` pour le marchand de biens (type plus précis qu'`Organization`). |
| 2 | Passages LLM-ready (5+) | ✅ | SellPage.jsx : chapô ("Versi Immobilier achète en nom propre — pas de mise en vente, pas de mandat d'agence, pas d'intermédiaire. Offre d'achat ferme sous 7 jours calendaires, ou refus motivé par écrit.") — score 3/3. ENGAGEMENTS : 3 blocs factuels auto-contenus. PROCESS_STEPS : 3 étapes avec délais précis. Stats.jsx : "21 appartements rénovés, 100% vendus en direct, 3,2M€ de volume traité depuis 2022". TeamTeaser.jsx : noms + tracks. ApprochePage.jsx : processus en 4 étapes + critères géographiques + ticket ("250 000 € à 1 000 000 €"). Bilan : 7+ passages LLM-ready. C'est le site le plus riche en contenu extractible. |
| 3 | Entité nommée | ✅ | "Versi Immobilier" apparaît comme sujet dans Hero surtitre, chapô SellPage, descriptions ENGAGEMENTS, FAQ réponses, Footer tagline, ApprochePage. Fréquence suffisante. |
| 4 | Fondateurs nommés dans le HTML visible | ✅ | TeamTeaser.jsx : Maxime Lemoine, Thomas Issa, Carl Standertskjold-Nordenstam avec noms, tracks, liens LinkedIn. ApprochePage.jsx : même trio avec rôles et tracks détaillés (13 actifs locatifs, 24 contrats locatifs, entreprises créées). Rendu dans le DOM. |
| 5 | Chiffres clés trackables | ✅ | Stats.jsx : "21 appartements rénovés", "100% vendus en direct, sans agence", "3,2M€ de volume traité depuis 2022". Présents dans le DOM en `<span>` lisibles. SellPage critères : "250 000 € à 1 000 000 €", zones géographiques listées. ApprochePage tracks fondateurs : chiffres d'entreprises. Bon niveau de densité statistique. |
| 6 | FAQ visible dans le HTML | ✅ | SellPage.jsx contient 5 questions/réponses complètes rendues dans le DOM via `FaqItem` (accordion). Le texte est présent dans le HTML même si l'accordion est fermé par défaut — les crawlers LLM lisent le JSX rendu côté client. Attention : si le crawler ne fait pas de rendu JavaScript (cas de certains crawlers), les FAQ_ITEMS dans la constante JS ne sont pas indexés. |
| 7 | llms.txt | ❌ | Aucun fichier `llms.txt` trouvé dans `versi-immobilier/` ni `versi-immobilier/public/`. Le site le plus riche en contenu n'a pas de fichier de guidage pour les crawlers IA. |
| 8 | Liens cross-entités | ✅ | Footer.jsx : lien "versi.fr" présent avec texte "Versi Immobilier est une entité du Groupe Versi". ApprochePage.jsx : section dédiée avec lien `<a href="https://versi.fr">`. Schema.org `parentOrganization` pointe vers versi.fr. Flux bidirectionnel partiel (versi.fr → versi-immobilier.fr désactivé côté holding, voir point 8 versi.fr). |
| 9 | Différenciateurs textuels | ✅ | SellPage ENGAGEMENTS : "Offre ferme, pas une estimation", "Sans condition suspensive de financement", "7 jours, pas 7 semaines". FAQ question 4 : comparatif direct agence vs Versi Immobilier, formulation factuelle. ApprochePage DIFFERENTIATORS : "Sans prêt bancaire. Sans condition suspensive." Ces blocs sont extractibles avec comparatif explicite. |
| 10 | Meta descriptions LLM-friendly | ✅ | "Versi Immobilier achète, transforme et revend des actifs résidentiels et mixtes en France. Offre ferme sans condition suspensive. Décision en 7 jours." — réponse directe, 2 claims vérifiables, score GEO 3/3. Meilleure meta du projet. |

---

## Corrections P0

### P0-1 — versi-immobilier/index.html : ajouter Schema.org FAQPage

Le site versi-immobilier.fr a 5 FAQ complètes dans SellPage.jsx mais zéro FAQPage Schema.org dans index.html. C'est la lacune la plus impactante : Google AI Overviews et ChatGPT priorisent les FAQPage structurées pour les extractions de type question/réponse.

**Fichier** : `versi-immobilier/index.html`

**Après la balise `</script>` du Schema WebSite (ligne 83), ajouter :**

```html
<!-- Schema.org JSON-LD — FAQPage (GEO: extraction LLM) -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Est-ce que Versi Immobilier va m'acheter en dessous du prix du marché ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "L'offre de Versi Immobilier est calculée sur la valeur de transformation du bien, pas sur la méconnaissance du marché par le vendeur. La logique de prix est expliquée lors de la remise de l'offre. Le vendeur est libre de refuser — aucune obligation."
      }
    },
    {
      "@type": "Question",
      "name": "Comment Versi Immobilier garantit-elle de ne pas se rétracter après la signature du compromis ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "La due diligence complète — visite physique, analyse comparative de marché, modélisation financière — est réalisée avant la signature du compromis. Versi Immobilier achète sur fonds propres, sans condition suspensive de financement bancaire. Quand l'offre est signée, la vente est certaine."
      }
    },
    {
      "@type": "Question",
      "name": "Versi Immobilier achète-t-elle des biens avec locataires en place ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Oui. Versi Immobilier rachète des actifs occupés, avec locataires en place. Aucune démarche n'est requise de la part du vendeur vis-à-vis des locataires avant la signature."
      }
    },
    {
      "@type": "Question",
      "name": "Quel est le délai de réponse de Versi Immobilier après soumission d'un bien ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Versi Immobilier accuse réception sous 24 heures. La visite physique est planifiée sous 48 à 72 heures. L'offre ferme ou le refus motivé par écrit est remis sous 7 jours calendaires à compter de la réception du dossier."
      }
    },
    {
      "@type": "Question",
      "name": "Quels types de biens Versi Immobilier acquiert-elle ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Versi Immobilier acquiert des immeubles de rapport (3 à 15 logements), des maisons avec terrain ou dépendances, des actifs mixtes (rez-de-chaussée commercial et logements), et des biens à rénover ou cédés en l'état. Ticket entre 250 000 € et 1 000 000 €. Zones : Paris, Île-de-France, Lille, Lyon, Bordeaux et villes moyennes françaises."
      }
    }
  ]
}
</script>
```

### P0-2 — versi-immobilier : créer llms.txt

Aucun fichier `llms.txt` pour versi-immobilier.fr. Priorité haute car ce site contient le contenu le plus riche (FAQ, stats, équipe, critères d'acquisition) — c'est exactement ce que les crawlers IA devraient indexer en priorité.

**Fichier à créer** : `versi-immobilier/public/llms.txt`

**Contenu :**

```
# Versi Immobilier — Marchand de biens

> Versi Immobilier est l'entité marchand de biens du Groupe Versi. Elle acquiert, transforme et revend des actifs résidentiels et mixtes en France. Offre ferme sous 7 jours. Vente directe, sans intermédiaire.

## Ce que fait Versi Immobilier

- Acquisition d'actifs immobiliers résidentiels et mixtes en France
- Transformation et réhabilitation des biens acquis
- Revente directe aux acquéreurs, sans commission d'agence
- Ticket d'acquisition : 250 000 € à 1 000 000 €
- Zones opérationnelles : Paris, Île-de-France, Lille, Lyon, Bordeaux, villes moyennes françaises

## Engagements

- Offre ferme par écrit sous 7 jours calendaires, ou refus motivé par écrit
- Achat sur fonds propres — sans condition suspensive de financement bancaire
- Biens occupés acceptés (locataires en place)
- Visite physique par un fondateur sous 48-72 heures

## Track record

- 21 appartements rénovés depuis 2022
- 100% vendus en direct, sans agence
- 3,2M€ de volume traité depuis 2022

## Fondateurs

- Maxime Lemoine, Co-fondateur — 13 ans en sales et stratégie. Ex-Head of Sales Europe, Sony. 3 immeubles en portefeuille, 24 contrats locatifs.
- Thomas Issa, Co-fondateur — 15 ans en stratégie et opérations. Ex-Sony, co-fondateur TEOS (8 pays). 13 actifs locatifs à Paris.
- Carl Standertskjold-Nordenstam, Co-fondateur — 14 ans en marketing B2B. Ex-Sony (9 ans), Algolia (4 ans), Head of Marketing Inbolt.

## Rattachement groupe

Versi Immobilier est une entité du Groupe Versi — holding immobilière intégrée (versi.fr).

## Contact

- Site : https://versi-immobilier.fr
- Email : contact@versi-immobilier.fr
- Soumettre un bien : https://versi-immobilier.fr/vendre
```

### P0-3 — versi.fr : activer le lien vers versi-immobilier.fr dans entities.js

`ENTITY_SITES_ACTIVE.immobilier` est `false` dans `src/src/config/entities.js` alors que versi-immobilier.fr est live. Les crawlers ne voient aucun lien cliquable vers le site fils. C'est un problème de cross-linking qui empêche la construction de la relation d'entités entre les deux sites.

**Fichier** : `src/src/config/entities.js`, ligne 2

**Remplacer :**
```js
  immobilier: false,
```

**Par :**
```js
  immobilier: true,
```

---

## Corrections P1

### P1-1 — versi.fr Hero.jsx : ajouter un passage auto-contenu extractible

Le Hero de versi.fr ne contient que "Quatre métiers. Un cycle maîtrisé." — slogan pur, 0 information extractible par un LLM. C'est la première section crawlée et elle ne donne aucun signal sémantique.

**Fichier** : `src/src/components/Hero.jsx`

**Après le `<p className="hero__subtitle">` (ligne 32), ajouter :**
```jsx
<p className="hero__description" style={{ display: 'none' }} aria-hidden="true">
  Versi est une holding immobilière intégrée qui acquiert, transforme et structure des actifs immobiliers en France. Fondée par Thomas Issa, Maxime Lemoine et Carl Standertskjold-Nordenstam, elle regroupe quatre entités complémentaires — Versi Immobilier (marchand de biens), Versi Invest (investissement), Versi Capital (foncière) et Versi Finance (ingénierie financière) — couvrant l'ensemble du cycle d'une opération immobilière.
</p>
```

Note : le `display: none` conserve le design actuel tout en rendant le texte accessible aux crawlers qui lisent le DOM. Alternative si vous préférez ne pas masquer : ajouter cette phrase directement dans le `<p className="hero__subtitle">` en tant que second paragraphe visible.

### P1-2 — versi.fr Mission.jsx : contextualiser les chiffres clés

Les stats "35+", "5", "4" sont des chiffres orphelins — les LLMs ne peuvent pas les extraire sans phrase contextualisante. Un LLM qui lit le DOM voit "35+" et "ACTIFS GÉRÉS EN DIRECT" comme deux nœuds séparés, pas une assertion.

**Fichier** : `src/src/components/Mission.jsx`

**Après le `<div className="mission__stats">` (avant ligne 26), ajouter :**
```jsx
<p className="mission__context" style={{ display: 'none' }} aria-hidden="true">
  Versi gère directement 35 actifs immobiliers, détient 5 immeubles en portefeuille et opère à travers 4 métiers intégrés — marchand de biens, investissement, foncière et ingénierie financière.
</p>
```

### P1-3 — versi.fr : ajouter sameAs dans le Schema.org Organization

Le `"sameAs": []` dans index.html est vide. Les profils LinkedIn des fondateurs et les pages LinkedIn de l'entité sont des signaux knowledge graph essentiels pour que les LLMs construisent la confiance d'entité.

**Fichier** : `src/index.html`, ligne 72

**Remplacer :**
```json
"sameAs": []
```

**Par (à compléter avec les URLs exactes) :**
```json
"sameAs": [
  "https://www.linkedin.com/in/thomasissa/",
  "https://www.linkedin.com/in/maxime-lemoine-34550354/",
  "https://www.linkedin.com/in/carlstandertskjold/"
]
```

Note : si une page LinkedIn d'entreprise Versi est créée, l'ajouter en premier dans le tableau.

### P1-4 — versi.fr : ajouter une section FAQ visible dans le DOM

La FAQ Schema.org existe (3 questions) mais aucun composant ne rend les Q/A dans le HTML visible. Pour Perplexity et Google AIO qui crawlent le HTML rendu, la FAQ doit être lisible.

**Option recommandée** : créer un composant `FAQ.jsx` minimal dans `src/src/components/` et l'intégrer dans la page principale entre la section Team et le Contact. Le composant doit rendre les 3 questions de la FAQ Schema en HTML visible, avec `aria-expanded` pour accessibilité.

**Contenu des 3 questions (identiques au Schema.org) :**
- Qu'est-ce que Versi ? → réponse avec les 4 entités et les fondateurs
- En quoi Versi se distingue d'un marchand de biens classique ? → réponse avec l'intégration verticale
- Où Versi opère-t-elle en France ? → Paris, Lille, principales métropoles

### P1-5 — versi-immobilier/index.html : corriger le Schema.org parentOrganization avec @id canonique

Le Schema.org Organization de versi-immobilier.fr référence la holding par son nom et URL mais sans `@id` canonique, ce qui empêche les LLMs de faire la liaison d'entités avec le Schema de versi.fr.

**Fichier** : `versi-immobilier/index.html`, bloc `parentOrganization` (ligne 46)

**Remplacer :**
```json
"parentOrganization": {
  "@type": "Organization",
  "name": "Versi",
  "url": "https://versi.fr"
},
```

**Par :**
```json
"parentOrganization": {
  "@type": "Organization",
  "@id": "https://versi.fr/#organization",
  "name": "Versi",
  "url": "https://versi.fr"
},
```

### P1-6 — versi-immobilier/index.html : ajouter type RealEstateAgent

Le type `Organization` est trop générique pour un marchand de biens. Schema.org dispose de `RealEstateAgent` qui améliore la précision sémantique pour les LLMs dans les requêtes immobilières.

**Fichier** : `versi-immobilier/index.html`, ligne 40

**Remplacer :**
```json
"@type": "Organization",
```

**Par :**
```json
"@type": ["Organization", "RealEstateAgent"],
```

### P1-7 — versi.fr llms.txt : corriger l'incohérence sur le track record Thomas Issa

llms.txt indique "11 actifs locatifs à Paris" pour Thomas Issa alors que team.js et ApprochePage.jsx indiquent "13 actifs locatifs à Paris". Incohérence qui dégrade la confiance d'entité si un LLM croise les deux sources.

**Fichier** : `src/public/llms.txt`, ligne 14

**Remplacer :**
```
- Thomas Issa, Co-fondateur — Marketing strategy et opérations. Co-fondateur TEOS et Sarani. 11 actifs locatifs à Paris.
```

**Par :**
```
- Thomas Issa, Co-fondateur — 15 ans en stratégie et opérations. Ex-Sony, co-fondateur de TEOS (8 pays). 13 actifs locatifs à Paris.
```

---

## Corrections P2

### P2-1 — versi.fr : ajouter `mainEntityOfPage` dans le Schema.org

Pour renforcer l'entity-first strategy (chaque page = une entité canonique), le Schema Organization doit référencer la page principale comme `mainEntityOfPage`.

**Fichier** : `src/index.html`, après `"sameAs"` (ligne 72)

**Ajouter :**
```json
"mainEntityOfPage": {
  "@type": "WebPage",
  "@id": "https://versi.fr/"
}
```

### P2-2 — versi.fr : enrichir le llms.txt avec les chiffres clés du track record

Le llms.txt actuel liste les fondateurs mais sans les chiffres clés (35+ actifs, 5 immeubles, 4 métiers) qui permettent aux LLMs de répondre à des requêtes quantitatives.

**Fichier** : `src/public/llms.txt`

**Ajouter une section après `## Fondateurs` :**
```
## Track record Groupe Versi

- 35+ actifs gérés en direct par les fondateurs
- 5 immeubles en portefeuille (via Versi Capital)
- 4 métiers intégrés au sein de la même holding
- Opérations actives à Paris et Lille depuis 2022
```

### P2-3 — versi-immobilier.fr : ajouter `dateModified` sur les pages clés

Le contenu frais génère +28% de citations IA. Les pages du site n'ont aucun signal de fraîcheur. À implémenter dans le Schema ou en meta tag.

**Fichier** : `versi-immobilier/index.html`

**Dans le bloc Schema WebSite, ajouter :**
```json
"dateModified": "2026-04-11"
```

À mettre à jour à chaque déploiement significant (ajout d'un bien, nouvelle réalisation, mise à jour FAQ).

### P2-4 — versi.fr : ajouter og:image avec contenu descriptif

Les deux sites n'ont pas de `og:image`. Pour les LLMs qui utilisent les Open Graph comme signal de confiance (notamment lors d'une citation depuis un réseau social), une image avec alt text descriptif renforce l'entité.

**Fichier** : `src/index.html`, dans le bloc Open Graph

**Ajouter :**
```html
<meta property="og:image" content="https://versi.fr/og-image.jpg" />
<meta property="og:image:alt" content="Versi — Holding immobilière intégrée opérant en France" />
```

Même correction dans `versi-immobilier/index.html` avec l'image et l'alt correspondant.

### P2-5 — versi-immobilier.fr SellPage : rendre la FAQ non-dépendante du JavaScript

Les FAQ_ITEMS sont dans une constante JS et rendus via un composant React avec état (`useState`). Si un crawler IA n'exécute pas le JavaScript (cas de certains crawlers Perplexity et des crawlers de pré-indexation), les questions/réponses ne sont pas indexées.

**Recommandation** : envisager un rendu SSR ou SSG pour la SellPage (migration vers Next.js lors de la prochaine évolution technique), ou exporter les FAQ_ITEMS dans un fichier JSON statique accessible directement.

**Alternative à court terme** : dupliquer les questions/réponses en texte statique masqué visuellement (`aria-hidden="true"` + `display: none`) dans la section FAQ, en parallèle du composant React dynamique. Cette approche garantit l'indexation sans JavaScript.

---

## Récapitulatif des corrections par priorité

| Priorité | ID | Site | Fichier | Action |
|---|---|---|---|---|
| P0 | P0-1 | versi-immobilier.fr | `versi-immobilier/index.html` | Ajouter Schema.org FAQPage (5 questions) |
| P0 | P0-2 | versi-immobilier.fr | `versi-immobilier/public/llms.txt` | Créer le fichier llms.txt (contenu fourni ci-dessus) |
| P0 | P0-3 | versi.fr | `src/src/config/entities.js` | `immobilier: false` → `immobilier: true` |
| P1 | P1-1 | versi.fr | `src/src/components/Hero.jsx` | Ajouter paragraphe descriptif (masqué ou visible) |
| P1 | P1-2 | versi.fr | `src/src/components/Mission.jsx` | Ajouter phrase contextualisante des stats |
| P1 | P1-3 | versi.fr | `src/index.html` | Remplir `sameAs` avec LinkedIn fondateurs |
| P1 | P1-4 | versi.fr | Nouveau `src/src/components/FAQ.jsx` | Créer section FAQ visible dans le DOM |
| P1 | P1-5 | versi-immobilier.fr | `versi-immobilier/index.html` | Ajouter `@id` canonique dans `parentOrganization` |
| P1 | P1-6 | versi-immobilier.fr | `versi-immobilier/index.html` | Ajouter type `RealEstateAgent` |
| P1 | P1-7 | versi.fr | `src/public/llms.txt` | Corriger track record Thomas (11 → 13 actifs) |
| P2 | P2-1 | versi.fr | `src/index.html` | Ajouter `mainEntityOfPage` |
| P2 | P2-2 | versi.fr | `src/public/llms.txt` | Ajouter section track record groupe |
| P2 | P2-3 | versi-immobilier.fr | `versi-immobilier/index.html` | Ajouter `dateModified` |
| P2 | P2-4 | Les deux | `src/index.html` + `versi-immobilier/index.html` | Ajouter og:image |
| P2 | P2-5 | versi-immobilier.fr | SellPage.jsx | Envisager rendu statique FAQ |

---

## Handoff

**Handoff → @fullstack**

- Fichiers produits : `docs/reviews/geo-prelaunch-audit.md`
- Décisions prises :
  - P0-1 : Schema.org FAQPage manquant sur versi-immobilier/index.html — contenu des 5 questions fourni dans l'audit, prêt à copier-coller
  - P0-2 : llms.txt manquant sur versi-immobilier — contenu complet fourni dans l'audit, à placer dans `versi-immobilier/public/llms.txt`
  - P0-3 : lien vers versi-immobilier.fr désactivé dans entities.js alors que le site est live — correction d'une ligne
  - P1-1 à P1-7 : corrections Schema, Hero, Mission, FAQ visible — détails et extraits de code dans les sections P1
  - P2-1 à P2-5 : enrichissements non bloquants — dateModified, og:image, mainEntityOfPage
- Points d'attention :
  - Le Schema.org FAQPage de versi.fr existe déjà (3 questions) — ne pas le supprimer, seulement ajouter celui de versi-immobilier.fr
  - L'incohérence Thomas Issa (11 vs 13 actifs) dans llms.txt doit être validée avec Thomas avant correction — ne pas supposer
  - La FAQ visible (P1-4) pour versi.fr peut être intégrée discrètement (couleur de fond neutre, section compacte) pour ne pas dégrader le design institutionnel
  - P2-5 (rendu statique FAQ versi-immobilier) est une recommandation long terme, pas urgente pour le lancement
