# Pipeline blog autonome — versi-immobilier.fr

> Produit par @creative-strategy | Date : 2026-04-13
> Références lues : `docs/seo/vi-blog-editorial-framework.md`, `docs/strategy/vi-brand-voice-adaptation.md`, `docs/copy/brand-voice.md`, `docs/growth/vi-blog-growth-assessment.md`, `project-context.md`
> Usage : ce document est la référence de conception pour l'implémentation du pipeline autonome de génération et publication d'articles. @fullstack lit ce fichier avant de coder. @seo valide les règles SEO avant implémentation.

---

## Vue d'ensemble

Ce pipeline a un seul objectif : publier des articles de qualité 10/10 sur versi-immobilier.fr sans intervention humaine récurrente. "Zéro intervention humaine récurrente" ne signifie pas "zéro intervention humaine" — cela signifie que l'intervention humaine est optionnelle, asynchrone, et limitée à la validation des données propriétaires que personne d'autre ne peut fournir.

La fréquence cible est 1 à 2 articles par mois, comme recommandé par @growth. Le pipeline gère les 10 articles planifiés (A1–A12), puis se renouvelle automatiquement.

---

## Sommaire

1. [Architecture du pipeline](#1-architecture-du-pipeline)
2. [Brief-type auto-générable](#2-brief-type-auto-générable)
3. [Prompt système de génération](#3-prompt-système-de-génération)
4. [Logique de renouvellement du calendrier éditorial](#4-logique-de-renouvellement-du-calendrier-éditorial)
5. [Mécanisme de validation automatique](#5-mécanisme-de-validation-automatique)
6. [Recommandations pour @fullstack](#6-recommandations-pour-fullstack)

---

## 1. Architecture du pipeline

### 1.1 Vue schématique des étapes

```
DÉCLENCHEUR
    │
    ▼
[CRON] — mardi ou mercredi matin, J-7 avant date de publication cible
    │
    ▼
ÉTAPE 1 — SÉLECTION DE L'ARTICLE
    Inputs : table articles (statut, scheduled_at, priorité)
    Logique : prendre l'article planifié suivant dans l'ordre éditorial
    Output : code article (ex : A2), date de publication cible
    │
    ▼
ÉTAPE 2 — HYDRATATION DU BRIEF
    Inputs : template brief (vi-blog-editorial-framework.md section 2)
             + keyword-research.md (cluster de l'article)
             + vi-brand-voice-adaptation.md
             + données propriétaires Versi (table operations, chiffres)
    Logique : remplir tous les champs du brief template automatiquement
    Output : brief complet en JSON structuré
    Flag bloquant : si données terrain manquantes (prix, délai opération réelle)
                   → PAUSE, notifier fondateur par email, attendre
    │
    ▼
ÉTAPE 3 — GÉNÉRATION IA
    Inputs : brief JSON + prompt système complet (section 3 de ce doc)
    Modèle : Claude (claude-opus-4-5 ou claude-sonnet-4-6 selon budget)
    Output : article brut (markdown + frontmatter YAML)
    Durée estimée : 30–60 secondes
    │
    ▼
ÉTAPE 4 — VALIDATION AUTOMATIQUE
    Inputs : article brut
    Logique : checklist 32 critères (vi-blog-editorial-framework.md section 3)
              + règles supplémentaires pipeline (section 5 de ce doc)
    Output : rapport de validation (OUI/NON par critère) + score global
    Seuil de PASS : 32/32 critères OUI
    Si FAIL : → boucle de correction (étape 4b) max 2 passes
    │
    ▼
ÉTAPE 4b — CORRECTION AUTOMATIQUE (si < 32/32)
    Inputs : article brut + rapport de validation + liste des critères en échec
    Logique : nouvelle génération ciblée sur les sections en échec uniquement
    Output : article corrigé
    Si 2 passes et toujours FAIL sur ≥ 1 critère : → notifier fondateur
    │
    ▼
ÉTAPE 5 — NOTIFICATION FONDATEUR (optionnelle)
    Déclenchée : (a) si flag bloquant données terrain (étape 2)
                 (b) si validation FAIL après 2 passes (étape 4b)
                 (c) si article de type P2 (réalisation terrain) qui requiert
                     validation factuelle spécifique
    Format : email avec aperçu de l'article + liste des points à valider
    Délai : fondateur dispose de 48h pour valider ou bloquer
    Si pas de réponse dans 48h : article est mis en attente (statut "pending_approval")
    │
    ▼
ÉTAPE 6 — MISE EN FILE DE PUBLICATION
    Inputs : article validé (32/32 OUI ou approuvé fondateur)
    Logique : setter scheduled_at à la date cible
    Output : article en base avec statut "scheduled"
    │
    ▼
ÉTAPE 7 — PUBLICATION AUTOMATIQUE
    Déclencheur : cron qui s'exécute toutes les heures
    Logique : vérifier si scheduled_at <= maintenant ET statut = "scheduled"
    Action : passer statut à "published", rendre accessible via API publique
    Post-publication : déclencher IndexNow (Bing), mettre à jour sitemap.xml
    │
    ▼
ÉTAPE 8 — REPURPOSING LINKEDIN (V2 — optionnel)
    Inputs : article publié
    Logique : générer 1 post par fondateur (angle "leçon de terrain")
    Output : 3 posts LinkedIn en draft dans admin UI
    Validation : fondateur poste lui-même (pas de publication automatique LinkedIn)
```

### 1.2 Décisions d'architecture — justifications

**Pourquoi une PAUSE humaine pour les données terrain ?**
Les articles Versi tirent leur différenciation des données propriétaires : prix d'achat réel d'un immeuble, budget travaux chiffré, délai de livraison exact. Ces données ne peuvent pas être inventées ou approximées — le framework éditorial le répète dix fois. La PAUSE est une garantie de qualité, pas une friction : un article générique sans données Versi n'a pas de raison d'exister.

**Pourquoi max 2 passes de correction automatique ?**
Au-delà de 2 passes, le problème vient du brief (ambiguïté) ou du prompt (calibration). Une troisième passe IA sur un article mal fondé produit du bruit. Mieux vaut notifier le fondateur et reprendre depuis le brief.

**Pourquoi ne pas publier LinkedIn automatiquement ?**
LinkedIn est le canal réseau principal des fondateurs (usage personnel + institutionnel). L'authenticité perçue est le capital principal. Un post LinkedIn clairement automatisé (timing parfait, formulation IA) éroderait ce capital. Le pipeline prépare le contenu, le fondateur publie avec son propre timing et peut l'éditer.

**Pourquoi IndexNow post-publication ?**
Le framework éditorial recommande IndexNow après chaque publication pour accélérer l'indexation Bing (Bing crawle moins fréquemment que Google). C'est une opération de 1 seconde, automatisable à 100%, impact mesurable sur le délai d'indexation.

### 1.3 États du cycle de vie d'un article

```
draft → briefed → generating → validation_pass → scheduled → published
                                              ↓
                                     validation_fail → correcting → (boucle max 2)
                                              ↓ (après 2 passes)
                                     pending_approval → scheduled / blocked
```

Le champ `status` en base gère ces transitions. @fullstack ajoute ce champ à la table `articles`.

## 2. Brief-type auto-générable

### 2.1 Principe

Le brief n'est pas rédigé à la main : il est assemblé automatiquement à partir de données structurées. Chaque champ du template (section 2 de vi-blog-editorial-framework.md) a une source de données définie. Le pipeline lit ces sources, hydrate le template, et produit un brief JSON prêt à être injecté dans le prompt de génération.

### 2.2 Mapping champs → sources de données

| Champ du brief | Source de données | Automatisable | Si manquant |
|---|---|---|---|
| Code article | Table `planned_articles` (ordre éditorial) | OUI | Erreur système |
| Pilier éditorial | Table `planned_articles` (champ `pillar`) | OUI | Erreur système |
| Persona cible | Table `planned_articles` (champ `persona`) | OUI | Erreur système |
| Position funnel | Table `planned_articles` (champ `funnel_stage`) | OUI | Erreur système |
| H1 | Table `planned_articles` (champ `h1`) | OUI | Erreur système |
| Meta title | Table `planned_articles` (champ `meta_title`) | OUI | Erreur système |
| Meta description | Généré par IA (étape 2, mini-prompt) | OUI | — |
| Requête cible principale | Table `keyword_clusters` (lien article) | OUI | Erreur système |
| Requêtes secondaires | Table `keyword_clusters` (champ `secondary_queries`) | OUI | — |
| Longue traîne | Table `keyword_clusters` (champ `long_tail`) | OUI | — |
| Questions PAA | Table `keyword_clusters` (champ `paa_questions`) | OUI | — |
| Angle éditorial | Table `planned_articles` (champ `editorial_angle`) | OUI | PAUSE fondateur |
| Intention de recherche | Table `planned_articles` (champ `intent`) | OUI | — |
| Structure H2 | Table `planned_articles` (champ `h2_structure`) | OUI | Généré par IA |
| Chapeau | Généré par IA (étape 3) | OUI | — |
| Longueur cible | Table `planned_articles` (champ `word_count_target`) | OUI | 1000 mots (défaut) |
| **Données obligatoires à intégrer** | **Table `operations` (données terrain Versi)** | **PARTIEL** | **PAUSE fondateur** |
| Ce que l'article ne doit pas contenir | Table `planned_articles` (champ `exclusions`) | OUI | Vide (non bloquant) |
| CTA final | Table `planned_articles` (champ `cta_text` + `cta_url`) | OUI | — |
| Liens vers articles blog | Table `internal_links` (carte de maillage) | OUI | — |
| Liens vers pages site | Table `planned_articles` (champ `site_links`) | OUI | — |
| Slug URL | Table `planned_articles` (champ `slug`) | OUI | Généré depuis H1 |
| Signature auteur | Table `planned_articles` (champ `author`) | OUI | Thomas Issa (défaut) |

### 2.3 Données terrain — le seul champ non-automatisable à 100%

Les "données obligatoires à intégrer" (prix réels, délais réels, chiffres d'opérations) sont le coeur différenciant du contenu Versi. Elles ne peuvent pas être générées ou approximées. Deux cas :

**Cas 1 — Article qui ne nécessite pas de données propriétaires** (ex : A1 marchand de biens, A6 précommercialisation, A8 questions à poser)
Le champ `requires_proprietary_data` est `false`. Le pipeline s'exécute sans PAUSE.

**Cas 2 — Article qui nécessite des données propriétaires** (ex : A3 rue des Muguets, A11 vendre à un MDB)
Le champ `requires_proprietary_data` est `true`. La table `operations` doit avoir une entrée correspondante avec les champs requis. Si l'entrée est incomplète : PAUSE, email fondateur.

### 2.4 Template de brief JSON (output de l'étape 2)

```json
{
  "article_code": "A2",
  "pillar": "P1 — L'opérateur expliqué",
  "persona": "Kévin",
  "funnel_stage": "MOFU",
  "seo": {
    "h1": "Appartement rénové par un opérateur vs bien de particulier : les vraies différences",
    "meta_title": "Appartement rénové opérateur vs particulier | Versi",
    "meta_description": "Garanties, traçabilité des travaux, recours : ce qui change vraiment quand vous achetez un bien rénové par un opérateur plutôt qu'un particulier à Lille.",
    "main_query": "appartement rénové marchand de biens garanties",
    "secondary_queries": [
      "garanties achat appartement rénové Lille",
      "risques achat ancien rénové particulier",
      "différence marchand de biens agence immobilière Lille"
    ],
    "long_tail": [
      "quelles garanties sur un appartement rénové par professionnel",
      "recours si problème appartement rénové particulier Lille",
      "DPE après rénovation marchand de biens"
    ],
    "paa_questions": [
      "Quelles garanties sur un bien rénové par un marchand de biens ?",
      "Peut-on faire un recours si des défauts apparaissent après achat ?",
      "Un bien rénové par un particulier est-il plus risqué ?"
    ]
  },
  "editorial": {
    "angle": "Cet article existe parce que Kévin hésite entre un ancien rénové par un opérateur et un appartement retapé par un particulier, et qu'aucun contenu existant ne compare ces deux situations depuis l'angle des garanties légales et du recours post-achat.",
    "intent": "Commercial investigation",
    "h2_structure": [
      "Ce que garantit un opérateur que ne peut pas garantir un particulier",
      "La traçabilité des travaux : documents, factures, intervenants",
      "Les recours en cas de problème après achat",
      "Le DPE après rénovation : ce que la loi impose",
      "Ce que ça change pour vous"
    ],
    "word_count_target": 1000,
    "exclusions": [
      "Ne pas citer de concurrents nommément",
      "Ne pas promettre que le DPE sera B ou C — dépend des travaux réalisés",
      "Ne pas lister les biens Versi disponibles — c'est le rôle de /nos-biens"
    ]
  },
  "conversion": {
    "cta_text": "Voir nos biens disponibles",
    "cta_url": "/nos-biens",
    "cta_secondary": {
      "text": "lire une rénovation réelle chiffrée",
      "url": "/blog/renovation-appartement-lille-fives-muguets",
      "anchor_context": "H2 3 — Les recours en cas de problème après achat"
    }
  },
  "internal_links": [
    {
      "target_article": "A8",
      "anchor": "les 5 questions à poser lors de votre visite",
      "position": "H2 4"
    },
    {
      "target_article": "A1",
      "anchor": "ce qu'est un marchand de biens",
      "position": "H2 1"
    },
    {
      "target_article": "A3",
      "anchor": "une opération réelle chiffrée",
      "position": "H2 2"
    }
  ],
  "site_links": [
    { "page": "/nos-biens", "anchor": "nos biens en vente" },
    { "page": "/realisations", "anchor": "nos réalisations avant/après" }
  ],
  "technical": {
    "slug": "/blog/appartement-renove-marchand-biens-garanties",
    "author": "Thomas Issa",
    "image_subject": "appartement rénové Lille détail finitions",
    "schema_section": "P1 — L'opérateur expliqué"
  },
  "requires_proprietary_data": false,
  "proprietary_data": null
}
```

Ce JSON est l'input direct du prompt système (section 3).

## 3. Prompt système de génération

Ce prompt est injecté tel quel dans l'API Claude. Les variables `{{...}}` sont remplacées par les valeurs du brief JSON (section 2.4) avant l'appel API.

```
Tu es le rédacteur de contenu de Versi Immobilier, un opérateur immobilier (marchand de biens) qui opère à Lille et dans les Hauts-de-France. Tu rédiges au nom des trois fondateurs : Thomas Issa, Maxime Lemoine et Carl Standertskjold-Nordenstam.

═══════════════════════════════════════
RÈGLES DE TON — ABSOLUES, SANS EXCEPTION
═══════════════════════════════════════

VOUVOIEMENT SYSTÉMATIQUE. Jamais de "tu", "ton", "ta", "tes" pour s'adresser au lecteur.
ZÉRO POINT D'EXCLAMATION. Aucun, dans tout l'article.
PREMIER PARAGRAPHE = ENTRÉE DIRECTE. Pas de "Dans cet article...", pas de "Vous vous demandez peut-être...", pas de généralité d'introduction.
PARAGRAPHES COURTS. Maximum 5 lignes par paragraphe. Une idée = un paragraphe.
VOIX ACTIVE. "rénové par Versi en 4 mois" et non "a été rénové en 4 mois".
FAITS > ADJECTIFS. Remplacer tout adjectif auto-décerné par le fait qui le justifie.
DONNÉES AVEC SOURCE. Tout prix, tout délai, toute statistique est suivi de sa source entre parenthèses.
AUCUN MOT DE LA LISTE INTERDITE.

MOTS INTERDITS (blacklist absolue) :
— Expertise / expert / experts
— Clé en main
— Solutions
— Découvrez / Découvrir
— N'hésitez pas
— Bienvenue
— Professionnel(s) qualifié(s)
— Accompagnement sur mesure
— À votre écoute
— De qualité
— Passionné(s)

═══════════════════════════════════════
STRUCTURE DE L'ARTICLE
═══════════════════════════════════════

L'article est structuré comme suit :

**FRONTMATTER YAML**
---
title: "{{SEO.H1}}"
slug: "{{TECHNICAL.SLUG}}"
meta_title: "{{SEO.META_TITLE}}"
meta_description: "{{SEO.META_DESCRIPTION}}"
author: "{{TECHNICAL.AUTHOR}}"
pillar: "{{PILLAR}}"
persona: "{{PERSONA}}"
published_at: null
status: "draft"
image_url: ""
image_alt: "{{SEO.MAIN_QUERY}} — Versi Immobilier"
schema_date_published: ""
schema_date_modified: ""
schema_article_section: "{{TECHNICAL.SCHEMA_SECTION}}"
canonical: "https://versi-immobilier.fr{{TECHNICAL.SLUG}}"
---

[NOTE PIPELINE : les champs `image_url`, `schema_date_published` et `schema_date_modified` sont remplis automatiquement par le pipeline à l'étape 6 (mise en file de publication) — ne pas laisser vides en base avant publication. `image_url` est générée ou sélectionnée depuis la médiathèque Versi selon `TECHNICAL.IMAGE_SUBJECT`.]

**H1**
Reprend exactement {{SEO.H1}}.

**CHAPEAU** (2-3 phrases, pas de balise HTML)
— Contient la requête cible : {{SEO.MAIN_QUERY}}
— Résume ce que l'article apporte
— Entrée directe dans le sujet — pas de généralité

**CORPS DE L'ARTICLE**
Suivre exactement la structure H2 définie : {{EDITORIAL.H2_STRUCTURE}}
— La requête cible {{SEO.MAIN_QUERY}} apparaît dans le H1, dans le chapeau, et dans au moins 2 H2 (intégrée naturellement, pas en copier-coller).
— Les requêtes secondaires {{SEO.SECONDARY_QUERIES}} sont intégrées naturellement dans le corps.
— Chaque question PAA {{SEO.PAA_QUESTIONS}} a une réponse directe de 2 à 4 phrases, structurée sous un H2 ou H3.
— Les données obligatoires {{PROPRIETARY_DATA}} sont intégrées avec leur source. Si proprietary_data est null, utiliser uniquement des données publiques vérifiables (PAP, SeLoger, Meilleurs Agents, INSEE, DVF) avec la source citée.

**LIENS INTERNES**
— Intégrer les liens vers articles blog {{INTERNAL_LINKS}} aux positions indiquées, avec les ancres exactes définies.
— Intégrer les liens vers pages site {{SITE_LINKS}} aux positions contextuellement pertinentes.

**DERNIER H2 AVANT CTA**
Toujours intitulé "Ce que ça change pour vous" ou équivalent direct. Résume les points clés en 3-4 phrases concrètes.

**CTA FINAL**
Format exact :
→ [{{CONVERSION.CTA_TEXT}}]({{CONVERSION.CTA_URL}})

Ne pas encadrer d'introduction commerciale. Le CTA suit directement le dernier paragraphe.

═══════════════════════════════════════
CONTRAINTES SPÉCIFIQUES À CET ARTICLE
═══════════════════════════════════════

Persona : {{PERSONA}} — adapter le niveau de technicité et le registre.
Longueur cible : {{EDITORIAL.WORD_COUNT_TARGET}} mots (±10%).
Exclusions : {{EDITORIAL.EXCLUSIONS}}
Angle éditorial imposé : {{EDITORIAL.ANGLE}}

═══════════════════════════════════════
CHECKLIST AUTO-APPLICABLE AVANT DE SOUMETTRE
═══════════════════════════════════════

Avant de terminer, vérifier chaque point :
[ ] Aucun mot de la liste interdite n'est présent
[ ] Le lecteur est vouvoyé dans tout l'article — aucun "tu"
[ ] Zéro point d'exclamation
[ ] Le premier paragraphe entre directement dans le sujet
[ ] Chaque paragraphe fait 5 lignes maximum
[ ] La requête cible apparaît dans le H1, le chapeau, et ≥ 2 H2
[ ] Toute donnée chiffrée a une source entre parenthèses (format : "1 994 €/m² (Meilleurs Agents, avril 2026)")
[ ] Les liens internes (articles blog) sont aux bonnes positions avec les bonnes ancres
[ ] Au moins 1 lien vers une page transactionnelle du site (/nos-biens, /vendre, /realisations ou /contact)
[ ] Le CTA final est présent et pointe vers la bonne URL
[ ] L'article ne mentionne aucun concurrent par nom
[ ] La longueur est dans la fourchette cible (±10%)
[ ] Le frontmatter YAML contient : canonical, image_alt (avec la requête cible), schema_date_published, schema_date_modified, schema_article_section
[ ] Le meta title fait moins de 60 caractères (compter exactement)

Rédige maintenant l'article complet en Markdown.
```

## 4. Logique de renouvellement du calendrier éditorial

### 4.1 Phase 1 — Articles planifiés A1 à A12 (automatique)

Les articles A1 à A12 sont déjà briefés dans `vi-blog-editorial-framework.md`. Le pipeline les publie dans l'ordre éditorial défini, au rythme de 1 à 2 par mois. Aucune intervention humaine requise sauf données terrain manquantes (cf. 2.3).

Durée estimée pour épuiser A1-A12 : 6 à 12 mois.

### 4.2 Phase 2 — Renouvellement automatique (après A12)

Quand tous les articles planifiés sont publiés (statut = "published"), le pipeline déclenche une procédure de génération de nouveaux briefs. Trois sources d'alimentation :

**Source A — Nouvelles opérations Versi**
Déclencheur : nouvelle entrée dans la table `operations` avec `publishable = true`.
Logique : générer automatiquement un brief de type P2 (réalisation terrain) à partir des champs de l'opération (adresse, type bien, budget achat, budget travaux, durée, prix revente).
Condition : l'opération doit être clôturée (bien vendu) ou suffisamment avancée pour être documentée sans risque commercial.

**Source B — Saisonnalité lilloise**
Déclencheur : dates fixes dans une table `seasonal_calendar`.

| Période | Sujet recommandé | Pilier |
|---|---|---|
| Janvier-février | Investir dans l'ancien avec travaux — avantages fiscaux | P4 |
| Mars-avril | Marché lillois au printemps — prix et volumes | P4 |
| Mai-juin | Rénovation énergétique — DPE et obligations 2025-2028 | P3/P4 |
| Septembre-octobre | Rentée étudiante — marché locatif Lille | P3 |
| Novembre-décembre | Bilan annuel marché immobilier HdF | P4 |

**Source C — Tendances SERP**
Déclencheur : mensuel, via appel API Google Search Console ou outil SERP tiers.
Logique : identifier les requêtes sur lesquelles versi-immobilier.fr apparaît en position 8-20 (quick wins potentiels) et les requêtes nouvelles dans le cluster thématique (Lille immobilier, marchand de biens HdF).

Critères de validation (tous obligatoires) :
- Volume ≥ 100 recherches/mois
- Intent informationnel ou commercial investigation (pas transactionnel — les pages du site gèrent l'intent transactionnel)
- Aucune page Versi existante sur ce sujet (blog ou site)
- Le sujet appartient à l'un des 4 piliers P1/P2/P3/P4 — rejet automatique si hors périmètre thématique (risque de dilution topical authority)
- Concurrence SERP : au moins 2 résultats en Top 10 sont des articles de blog (pas uniquement des portails type SeLoger/PAP ou Wikipedia) — signal que le contenu éditorial peut ranker sur cette requête

Si la requête passe tous les critères mais que la concurrence SERP est dominée par des portails nationaux (SeLoger, PAP, Meilleurs Agents, Logic-Immo) : rejeter et passer à la requête suivante. Versi ne peut pas outranker ces portails sur des requêtes génériques — l'avantage concurrentiel est sur les requêtes locales et expertes.

### 4.3 Anti-cannibalisation

Avant de générer un nouveau brief, le pipeline vérifie dans la table `articles` :
1. Qu'aucun article existant ne cible la même requête principale.
2. Qu'aucun article existant ne couvre le même angle éditorial (même H1 approximatif).
3. Que le slug proposé n'existe pas.
4. Que la requête candidate ne cannibalise pas une page transactionnelle du site (`/nos-biens`, `/vendre`, `/realisations`, `/contact`). Ces pages ont des intentions transactionnelles — un article blog ne doit pas cibler la même intention sous une requête différente.

**Méthode — 3 niveaux de vérification :**

**Niveau 1 — Requête exacte (bloquant)** : vérifier que `main_query` n'existe pas dans `keyword_clusters.main_query`. Seuil : correspondance exacte ou normalisation (minuscules, accents, pluriels). Si match → BLOCK.

**Niveau 2 — Similarité sémantique (bloquant)** : similarité cosinus entre la requête du nouveau brief et les requêtes de tous les articles publiés ou planifiés. Seuil de blocage : similarité > 0.78. Justification : en niche immobilier local (Lille, HdF), des requêtes à 0.82 de cosinus peuvent pointer vers des intentions distinctes mais générer une cannibalisation perçue par Google — le seuil 0.78 est plus conservateur et adapté à un corpus de <50 articles. Si bloqué, le pipeline sélectionne la prochaine requête dans la liste ou passe à la source suivante.

**Niveau 3 — Intention de recherche (avertissement)** : si le nouveau brief a la même `intent` (informationnel/commercial investigation/transactionnel) et le même `pillar` qu'un article existant, générer un avertissement (pas un blocage) et notifier le fondateur. Un deuxième article sur le même pilier avec la même intention est potentiellement redondant — le fondateur décide de merger ou d'un angle différenciant.

**Anti-cannibalisation pages transactionnelles :** la table `site_pages` liste les pages existantes du site avec leur intent et leur requête principale. Avant de valider un brief, vérifier que `main_query` et `intent` ne chevauchent pas une page du site (similarité > 0.70 avec une page transactionnelle = avertissement fondateur).

### 4.4 Règle de priorité entre les sources

Ordre de priorité : Source A (opérations Versi) > Source B (saisonnalité) > Source C (SERP).

Justification : une opération réelle Versi produit un contenu inimitable (personne d'autre ne peut écrire cet article). La saisonnalité lilloise produit un contenu ancré géographiquement. Les tendances SERP optimisent mais ne différencient pas.

### 4.5 Contrainte de topical authority — équilibre des piliers (post-A12)

Après épuisement des articles A1-A12, le pipeline DOIT maintenir l'équilibre de couverture entre les 4 piliers. Avant de valider un nouveau brief, vérifier la distribution des articles publiés par pilier :

| Pilier | Objectif minimum | Vérification |
|---|---|---|
| P1 — L'opérateur expliqué | ≥ 25% des articles publiés | `SELECT count(*) WHERE pillar = 'P1'` |
| P2 — Histoires de réalisations | ≥ 20% des articles publiés | `SELECT count(*) WHERE pillar = 'P2'` |
| P3 — Guide acquéreur Lille | ≥ 30% des articles publiés | `SELECT count(*) WHERE pillar = 'P3'` |
| P4 — Décryptage immobilier | ≥ 15% des articles publiés | `SELECT count(*) WHERE pillar = 'P4'` |

Si un pilier passe sous son seuil minimum : le prochain brief généré DOIT appartenir à ce pilier, quelle que soit la source d'alimentation (A/B/C).

Justification SEO : Google consolide la topical authority par cluster thématique. Un blog qui surpondère P3 (guide acquéreur) au détriment de P2 (réalisations terrain) perd son signal E-E-A-T Experience — qui est précisément le différenciant de Versi sur les requêtes YMYL immobilières.

## 5. Mécanisme de validation automatique

### 5.1 Checks entièrement automatisables (regex / NLP simple)

Ces checks sont exécutés par code — aucune IA requise pour cette étape.

| # | Check | Méthode | Seuil de FAIL |
|---|---|---|---|
| V1 | Mots interdits absents | Regex sur liste noire | ≥ 1 occurrence |
| V2 | Zéro point d'exclamation | Regex `!` | ≥ 1 occurrence |
| V3 | Vouvoiement systématique | Regex `\btu\b`, `\bton\b`, `\bta\b`, `\btes\b` | ≥ 1 occurrence (hors citations) |
| V4 | Requête cible dans H1 | String match H1 | Absent |
| V5 | Requête cible dans chapeau | String match paragraphe 1 | Absent |
| V6 | Requête cible dans ≥ 2 H2 | Count match H2 | < 2 occurrences |
| V7 | Longueur dans fourchette ±10% | Count mots | Hors fourchette |
| V8 | Nombre de H2 conforme | Count `## ` | < 3 ou > 5 H2 |
| V9 | CTA présent avec bonne URL | Regex sur CTA_URL | URL incorrecte ou absente |
| V10 | Liens internes présents | Regex sur slugs des articles cibles | ≥ 1 lien manquant |
| V11 | Slug conforme au format | Regex `/blog/[a-z0-9-]+` | Format non conforme |
| V12 | Frontmatter YAML complet | Parse YAML, vérifier champs requis | ≥ 1 champ manquant |
| V13 | Zéro placeholder résiduel | Regex `\{\{[A-Z_]+\}\}` | ≥ 1 occurrence |
| V14 | Paragraphes ≤ 5 lignes | Count lignes par paragraphe | ≥ 1 paragraphe > 5 lignes |
| V15 | Premier paragraphe sans intro molle | Match regex formules interdites | Présence d'une formule interdite |
| V16 | Données chiffrées sourcées (nombre suivi d'une parenthèse source) | Regex `\d[\d\s,]*[€%m²](?!\s*\()` — détecte chiffre sans source | ≥ 1 occurrence (flag semi-automatique, NLP) |
| V17 | Meta title ≤ 60 caractères | `brief.seo.meta_title.length <= 60` | > 60 caractères |
| V18 | Meta description ≤ 155 caractères | `brief.seo.meta_description.length <= 155` | > 155 caractères |
| V19 | Champ `canonical` présent dans le frontmatter YAML | Parse YAML, vérifier présence de `canonical:` avec valeur non vide | Absent ou vide |
| V20 | Champ `image_alt` présent dans le frontmatter YAML et contient la requête cible | Parse YAML + string match `brief.seo.main_query` | Absent ou requête absente |
| V21 | Lien vers au moins 1 page transactionnelle du site (site_links) | Vérifier que ≥ 1 URL de `brief.site_links` est présente dans l'article | Aucun lien vers page site |
| V22 | Schema.org BlogPosting déclaré dans le frontmatter YAML (champs obligatoires présents) | Parse YAML, vérifier `schema_date_published`, `schema_date_modified`, `schema_article_section` non vides | ≥ 1 champ manquant ou vide |

Formules interdites pour V15 : "Dans cet article", "Vous vous demandez", "Bienvenue", "Avez-vous déjà", "Dans le monde de".

### 5.2 Checks nécessitant une validation humaine

Ces situations déclenchent automatiquement une notification fondateur et mettent l'article en statut `pending_approval`.

| Situation | Déclencheur | Action |
|---|---|---|
| Article P2 (réalisation terrain) | Champ `pillar = "P2"` | Validation factuelle obligatoire — les chiffres terrain sont vérifiés par un fondateur |
| Données propriétaires intégrées | `requires_proprietary_data = true` | Validation que les données sont exactes et autorisées à la publication |
| Score V1-V22 < 22/22 après 2 passes | Compteur passes = 2 | Escalade humaine — le problème vient du brief, pas de l'article |
| Mention d'un prix ou délai non sourcé | V16 détecte un chiffre sans parenthèse source | Flag semi-automatique — NLP confirme le faux positif ou bloque |
| Prévisualisation mobile | Systématiquement, avant chaque publication | Vérification visuelle par fondateur ou via screenshot CI (checklist critère 32) — non automatisable en V1 |

### 5.3 Seuils et boucle de correction

- **PASS automatique** : 22/22 checks V1-V22 → article passe en statut `validation_pass` puis `scheduled`.
- **FAIL, passe 1** : ≥ 1 check en échec → lancer étape 4b (correction ciblée sur les sections en échec). Incrémenter compteur.
- **FAIL, passe 2** : ≥ 1 check encore en échec → statut `pending_approval`, email fondateur.
- **Cas spéciaux** (P2, données propriétaires) : toujours `pending_approval`, indépendamment du score.
- **V16 (données sourcées)** : flag NLP — si positif, notifier fondateur sans bloquer automatiquement (faux positifs possibles sur les nombres en contexte non-chiffré). L'article reste en `validation_pass` sauf si un fondateur confirme le flag.

### 5.4 Email de notification fondateur

Objet : `[Versi Blog] Article {{ARTICLE_CODE}} — validation requise`
Corps :
```
Titre : {{H1}}
Statut : {{RAISON}}
Score validation : {{X}}/22

Points à vérifier :
{{LISTE DES CHECKS EN ÉCHEC ou RAISON ESCALADE HUMAINE}}

Aperçu de l'article : [lien admin UI]

Actions disponibles :
→ Valider et programmer → [bouton]
→ Bloquer et réviser → [bouton]

Délai : 48h. Sans réponse, l'article reste en pending_approval.
```

## 6. Recommandations pour @fullstack

### 6.1 Schéma de base de données — évolutions requises

La base PostgreSQL existante contient déjà une table `articles`. Les évolutions suivantes sont nécessaires :

**Table `articles` — champs à ajouter**

```sql
-- Statut du cycle de vie
ALTER TABLE articles
  ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','briefed','generating','validation_pass',
                      'validation_fail','correcting','pending_approval',
                      'scheduled','published','blocked')),
  ADD COLUMN scheduled_at TIMESTAMPTZ,
  ADD COLUMN published_at TIMESTAMPTZ,
  ADD COLUMN generation_passes INTEGER DEFAULT 0,
  ADD COLUMN validation_score INTEGER,       -- score V1-V22 (0-22)
  ADD COLUMN validation_report JSONB,        -- détail check par check
  ADD COLUMN requires_proprietary_data BOOLEAN DEFAULT false,
  ADD COLUMN pillar VARCHAR(50),             -- P1/P2/P3/P4
  ADD COLUMN persona VARCHAR(20),            -- Kevin/Sophie/Pierre
  ADD COLUMN funnel_stage VARCHAR(10),       -- TOFU/MOFU/BOFU
  ADD COLUMN brief_json JSONB,               -- brief hydraté (section 2.4)
  ADD COLUMN author VARCHAR(100) DEFAULT 'Thomas Issa';
```

**Table `planned_articles` (nouvelle)**

```sql
CREATE TABLE planned_articles (
  id           SERIAL PRIMARY KEY,
  code         VARCHAR(10) NOT NULL UNIQUE,  -- A1, A2, ... A12
  h1           TEXT NOT NULL,
  meta_title   TEXT,
  slug         TEXT NOT NULL UNIQUE,
  pillar       VARCHAR(50),
  persona      VARCHAR(20),
  funnel_stage VARCHAR(10),
  intent       VARCHAR(40),
  word_count_target INTEGER DEFAULT 1000,
  editorial_angle TEXT,
  h2_structure JSONB,                        -- tableau de strings
  exclusions   JSONB,                        -- tableau de strings
  cta_text     VARCHAR(100),
  cta_url      VARCHAR(200),
  site_links   JSONB,
  requires_proprietary_data BOOLEAN DEFAULT false,
  priority     INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

**Table `keyword_clusters` (nouvelle)**

```sql
CREATE TABLE keyword_clusters (
  id                SERIAL PRIMARY KEY,
  article_code      VARCHAR(10) REFERENCES planned_articles(code),
  main_query        TEXT NOT NULL,
  secondary_queries JSONB,
  long_tail         JSONB,
  paa_questions     JSONB,
  -- Contraintes SEO vérifiées à l'insertion (fail fast avant génération)
  CONSTRAINT chk_main_query_length CHECK (char_length(main_query) <= 80)
);
```

> **Note SEO (@fullstack)** : ajouter également des contraintes CHECK sur `planned_articles` pour les champs `meta_title` (≤ 60 chars) et `slug` (regex `/blog/[a-z0-9-]+`). Ces contraintes font échouer l'hydratation du brief en base avant d'appeler l'API Claude — ce qui est préférable à une détection tardive en V17/V11.

**Table `operations` (nouvelle — données terrain)**

```sql
CREATE TABLE operations (
  id              SERIAL PRIMARY KEY,
  address         TEXT NOT NULL,
  city            VARCHAR(100),
  asset_type      VARCHAR(50),               -- appartement, immeuble, maison
  purchase_price  INTEGER,                   -- en euros
  renovation_budget INTEGER,
  sale_price      INTEGER,
  renovation_duration_weeks INTEGER,
  publishable     BOOLEAN DEFAULT false,
  notes           TEXT,
  completed_at    DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**Table `internal_links` (nouvelle)**

```sql
CREATE TABLE internal_links (
  id             SERIAL PRIMARY KEY,
  from_article   VARCHAR(10),
  to_article     VARCHAR(10),
  anchor_text    TEXT,
  h2_position    TEXT
);
```

**Table `seasonal_calendar` (nouvelle)**

```sql
CREATE TABLE seasonal_calendar (
  id           SERIAL PRIMARY KEY,
  month_start  INTEGER CHECK (month_start BETWEEN 1 AND 12),
  month_end    INTEGER CHECK (month_end BETWEEN 1 AND 12),
  topic        TEXT,
  pillar       VARCHAR(50),
  active       BOOLEAN DEFAULT true
);
```

### 6.2 Endpoints API requis

Tous les endpoints sont internes (pas exposés publiquement). Authentification : token API admin.

```
POST /api/admin/blog/trigger-generation
  Body : { article_code: "A2" } | { auto: true }
  Action : déclenche l'étape 1 (sélection) → 2 (hydratation) → 3 (génération)
  Response : { job_id, status, article_code }

GET  /api/admin/blog/jobs/:job_id
  Action : polling du statut d'un job de génération
  Response : { status, validation_score, validation_report, article_id }

POST /api/admin/blog/articles/:id/approve
  Body : { action: "approve" | "block", reviewer_note?: string }
  Action : passe statut de pending_approval → scheduled | blocked

POST /api/admin/blog/articles/:id/schedule
  Body : { scheduled_at: "2026-05-06T08:00:00Z" }
  Action : setter scheduled_at, passer statut → scheduled

GET  /api/blog/articles
  Public. Retourne les articles publiés (status = "published")
  Query params : ?pillar=P1&persona=Kevin&limit=10&offset=0

GET  /api/blog/articles/:slug
  Public. Retourne un article par slug (status = "published" seulement)

POST /api/admin/blog/sitemap/refresh
  Action : régénère sitemap.xml à partir des articles publiés
  Déclenchée automatiquement post-publication
```

### 6.3 Crons à implémenter

```
CRON 1 — Déclencheur de génération
  Schedule : 0 8 * * 2   (mardi 8h00 UTC)
  Action : si aucun article en statut scheduled dans les 10 prochains jours
           → déclencher POST /api/admin/blog/trigger-generation avec { auto: true }
  Condition : ne pas déclencher si un job de génération est déjà en cours

CRON 2 — Publication automatique
  Schedule : 0 * * * *   (toutes les heures, minute 0)
  Action : SELECT articles WHERE status = 'scheduled' AND scheduled_at <= NOW()
           → pour chaque article : UPDATE status = 'published', published_at = NOW()
           → déclencher IndexNow (Bing) avec l'URL de l'article
           → déclencher POST /api/admin/blog/sitemap/refresh

CRON 3 — Nettoyage des jobs fantômes
  Schedule : 0 6 * * *   (tous les jours 6h00 UTC)
  Action : articles en statut 'generating' depuis > 10 minutes → passer en 'validation_fail'
           → notifier fondateur (anomalie pipeline)
```

### 6.4 Appel API Claude — format d'intégration

```typescript
// Étape 3 — Génération IA
const generateArticle = async (briefJson: BriefJSON): Promise<string> => {
  const systemPrompt = buildSystemPrompt(briefJson); // injecter les variables {{...}}

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',          // ou claude-sonnet-4-6 pour réduire coût
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: 'Rédige l\'article complet en Markdown selon les instructions.'
      }
    ]
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
};

// Étape 4b — Correction ciblée
const correctArticle = async (
  article: string,
  failedChecks: ValidationCheck[]
): Promise<string> => {
  const correctionPrompt = buildCorrectionPrompt(article, failedChecks);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',        // correction = moins critique → Sonnet
    max_tokens: 4096,
    system: correctionPrompt,
    messages: [
      {
        role: 'user',
        content: 'Corrige uniquement les sections identifiées. Ne réécris pas l\'article entier.'
      }
    ]
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
};
```

### 6.5 Fonction de validation automatique (V1-V15)

```typescript
interface ValidationCheck {
  code: string;
  label: string;
  pass: boolean;
  detail?: string;
}

const validateArticle = (article: string, brief: BriefJSON): ValidationCheck[] => {
  const checks: ValidationCheck[] = [];
  const FORBIDDEN_WORDS = [
    'expertise', 'expert', 'experts', 'clé en main', 'solutions',
    'découvrez', 'découvrir', "n'hésitez pas", 'bienvenue',
    'qualifié', 'accompagnement sur mesure', 'à votre écoute',
    'de qualité', 'passionné'
  ];
  const SOFT_INTRO = [
    'dans cet article', 'vous vous demandez', 'avez-vous déjà',
    'dans le monde de', 'bienvenue'
  ];

  const lower = article.toLowerCase();
  const paragraphs = article.split(/\n\n+/);
  const h2s = article.match(/^## .+$/gm) || [];
  const firstParagraph = paragraphs.find(p => p.trim() && !p.startsWith('#')) || '';

  // V1 — Mots interdits
  const found = FORBIDDEN_WORDS.filter(w => lower.includes(w));
  checks.push({ code: 'V1', label: 'Mots interdits absents', pass: found.length === 0,
    detail: found.length ? `Trouvés : ${found.join(', ')}` : undefined });

  // V2 — Zéro point d'exclamation
  checks.push({ code: 'V2', label: 'Zéro point d\'exclamation', pass: !article.includes('!') });

  // V3 — Vouvoiement systématique
  const tutoiement = article.match(/\b(tu|ton|ta|tes)\b/gi) || [];
  checks.push({ code: 'V3', label: 'Vouvoiement systématique',
    pass: tutoiement.length === 0,
    detail: tutoiement.length ? `${tutoiement.length} occurrence(s)` : undefined });

  // V4 — Requête cible dans H1
  const h1Match = article.match(/^# (.+)$/m);
  const h1 = h1Match ? h1Match[1].toLowerCase() : '';
  checks.push({ code: 'V4', label: 'Requête cible dans H1',
    pass: h1.includes(brief.seo.main_query.toLowerCase()) });

  // V5 — Requête cible dans chapeau
  checks.push({ code: 'V5', label: 'Requête cible dans chapeau',
    pass: firstParagraph.toLowerCase().includes(brief.seo.main_query.toLowerCase()) });

  // V6 — Requête cible dans ≥ 2 H2
  const queryInH2 = h2s.filter(h => h.toLowerCase().includes(brief.seo.main_query.toLowerCase()));
  checks.push({ code: 'V6', label: 'Requête cible dans ≥ 2 H2', pass: queryInH2.length >= 2,
    detail: `${queryInH2.length}/2 requis` });

  // V7 — Longueur dans fourchette ±10%
  const wordCount = article.split(/\s+/).length;
  const target = brief.editorial.word_count_target;
  checks.push({ code: 'V7', label: 'Longueur dans fourchette ±10%',
    pass: wordCount >= target * 0.9 && wordCount <= target * 1.1,
    detail: `${wordCount} mots (cible : ${target})` });

  // V8 — Nombre de H2 conforme (3-5)
  checks.push({ code: 'V8', label: 'Nombre de H2 conforme (3-5)',
    pass: h2s.length >= 3 && h2s.length <= 5, detail: `${h2s.length} H2` });

  // V9 — CTA présent avec bonne URL
  checks.push({ code: 'V9', label: 'CTA présent avec bonne URL',
    pass: article.includes(brief.conversion.cta_url) });

  // V10 — Liens internes présents
  const missingLinks = brief.internal_links.filter(
    link => !article.includes(link.anchor)
  );
  checks.push({ code: 'V10', label: 'Liens internes présents',
    pass: missingLinks.length === 0,
    detail: missingLinks.length ? `Manquants : ${missingLinks.map(l => l.anchor).join(', ')}` : undefined });

  // V11 — Slug conforme
  const slugOk = /^\/blog\/[a-z0-9-]+$/.test(brief.technical.slug);
  checks.push({ code: 'V11', label: 'Slug conforme au format', pass: slugOk });

  // V12 — Frontmatter YAML complet
  const hasFrontmatter = article.startsWith('---') && article.includes('status:');
  checks.push({ code: 'V12', label: 'Frontmatter YAML complet', pass: hasFrontmatter });

  // V13 — Zéro placeholder résiduel
  const placeholders = article.match(/\{\{[A-Z_]+\}\}/g) || [];
  checks.push({ code: 'V13', label: 'Zéro placeholder résiduel', pass: placeholders.length === 0,
    detail: placeholders.length ? placeholders.join(', ') : undefined });

  // V14 — Paragraphes ≤ 5 lignes
  const longParagraphs = paragraphs.filter(p => p.split('\n').length > 5);
  checks.push({ code: 'V14', label: 'Paragraphes ≤ 5 lignes', pass: longParagraphs.length === 0,
    detail: longParagraphs.length ? `${longParagraphs.length} paragraphe(s) trop longs` : undefined });

  // V15 — Premier paragraphe sans intro molle
  const softFound = SOFT_INTRO.filter(s => firstParagraph.toLowerCase().includes(s));
  checks.push({ code: 'V15', label: 'Premier paragraphe sans intro molle',
    pass: softFound.length === 0,
    detail: softFound.length ? `Formules détectées : ${softFound.join(', ')}` : undefined });

  // V16 — Données chiffrées sourcées (flag semi-automatique)
  // Détecte un chiffre suivi d'une unité immobilière sans parenthèse source immédiate
  const unsourcedNumbers = article.match(/\d[\d\s,]*\s*[€%](?!\s*\/|\s*\()/g) || [];
  checks.push({ code: 'V16', label: 'Données chiffrées sourcées',
    pass: unsourcedNumbers.length === 0,
    detail: unsourcedNumbers.length
      ? `${unsourcedNumbers.length} chiffre(s) potentiellement sans source — vérification humaine recommandée`
      : undefined });

  // V17 — Meta title ≤ 60 caractères
  const metaTitleLength = brief.seo.meta_title.length;
  checks.push({ code: 'V17', label: 'Meta title ≤ 60 caractères',
    pass: metaTitleLength <= 60,
    detail: metaTitleLength > 60 ? `${metaTitleLength} caractères (max : 60)` : undefined });

  // V18 — Meta description ≤ 155 caractères
  const metaDescLength = brief.seo.meta_description.length;
  checks.push({ code: 'V18', label: 'Meta description ≤ 155 caractères',
    pass: metaDescLength <= 155,
    detail: metaDescLength > 155 ? `${metaDescLength} caractères (max : 155)` : undefined });

  // V19 — Canonical présent dans le frontmatter YAML
  const canonicalPresent = /^canonical:\s*https?:\/\/.+$/m.test(article);
  checks.push({ code: 'V19', label: 'Canonical présent dans le frontmatter YAML',
    pass: canonicalPresent });

  // V20 — image_alt présent et contient la requête cible
  const imageAltMatch = article.match(/^image_alt:\s*"(.+)"$/m);
  const imageAltOk = imageAltMatch
    ? imageAltMatch[1].toLowerCase().includes(brief.seo.main_query.toLowerCase())
    : false;
  checks.push({ code: 'V20', label: 'image_alt présent et contient la requête cible',
    pass: imageAltOk,
    detail: !imageAltMatch ? 'Champ image_alt absent du frontmatter'
      : !imageAltOk ? `Requête "${brief.seo.main_query}" absente du alt text` : undefined });

  // V21 — Lien vers au moins 1 page transactionnelle (site_links)
  const siteLinksPresent = brief.site_links.some(
    link => article.includes(link.page)
  );
  checks.push({ code: 'V21', label: 'Lien vers ≥ 1 page transactionnelle du site',
    pass: siteLinksPresent,
    detail: !siteLinksPresent
      ? `Aucune des pages ${brief.site_links.map(l => l.page).join(', ')} trouvée dans l'article`
      : undefined });

  // V22 — Schema.org BlogPosting — champs obligatoires non vides
  const schemaFields = ['schema_date_published:', 'schema_date_modified:', 'schema_article_section:'];
  const missingSchemaFields = schemaFields.filter(f => {
    const match = article.match(new RegExp(`^${f}\\s*(.+)$`, 'm'));
    return !match || match[1].trim() === '' || match[1].trim() === '""';
  });
  checks.push({ code: 'V22', label: 'Schema.org BlogPosting — champs obligatoires',
    pass: missingSchemaFields.length === 0,
    detail: missingSchemaFields.length
      ? `Champs manquants ou vides : ${missingSchemaFields.join(', ')}`
      : undefined });

  return checks;
};
```

### 6.6 Stockage des briefs — format et convention

Les briefs JSON (section 2.4) sont stockés en base dans `articles.brief_json` (colonne JSONB). Ils sont également sérialisés en fichier JSON dans `/briefs/{{article_code}}.json` pour archivage et débogage. Ce répertoire n'est pas exposé publiquement.

### 6.7 Intégration IndexNow (post-publication)

```typescript
const pingIndexNow = async (articleUrl: string): Promise<void> => {
  const key = process.env.INDEXNOW_KEY; // clé générée une fois, stocker en .env
  if (!key) {
    console.error('[IndexNow] INDEXNOW_KEY manquant dans .env — ping ignoré');
    return;
  }
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      host: 'versi-immobilier.fr',
      key,
      keyLocation: `https://versi-immobilier.fr/${key}.txt`,
      urlList: [articleUrl]
    })
  });
  // Codes de réponse IndexNow attendus : 200 (OK), 202 (accepté, traitement asynchrone)
  // 422 = clé invalide ou fichier clé non trouvé → vérifier que le fichier {key}.txt
  //       est servi statiquement à la racine du domaine
  if (response.status !== 200 && response.status !== 202) {
    console.error(`[IndexNow] Erreur ${response.status} — vérifier que https://versi-immobilier.fr/${key}.txt est accessible publiquement`);
  }
};

// Prérequis déploiement IndexNow (@fullstack) :
// 1. Générer une clé UUID v4 : openssl rand -hex 32
// 2. Créer le fichier public/{key}.txt contenant uniquement la clé (pas de saut de ligne)
// 3. Vérifier l'accès : curl https://versi-immobilier.fr/{key}.txt
// 4. Stocker la clé dans .env : INDEXNOW_KEY=...
// 5. Tester avec Bing Webmaster Tools → IndexNow → Soumettre une URL
```

### 6.8 Repurposing LinkedIn (V2 — optionnel)

Post-publication, déclencher une génération de posts LinkedIn pour les trois fondateurs. Ceci est optionnel en V1 — à activer en V2 si les fondateurs valident le principe.

```typescript
// Format du prompt LinkedIn (V2)
const linkedinPrompt = (article: string, founder: string) => `
Tu es ${founder}, co-fondateur de Versi Immobilier.
Rédige un post LinkedIn de 150-200 mots à partir de cet article.
Angle : "leçon de terrain" — ce que tu as appris en faisant ce travail, pas ce que l'article dit.
Ton : direct, première personne, pas de point d'exclamation, pas de hashtag en excès (max 3).
Terminer par une question ouverte au réseau.
Article source : ${article.substring(0, 2000)}
`;
```

Les posts LinkedIn générés sont stockés en base (table `linkedin_drafts`) avec statut `draft`. Les fondateurs les retrouvent dans l'admin UI et les publient manuellement.

---

## 7. Audit SEO @seo — Scores par dimension

> Audit produit par @seo | Date : 2026-04-13
> Fichier audité : ce document (version post-corrections)

### 7.1 Scores par dimension

| Dimension | Score avant corrections | Score après corrections | Écarts comblés |
|---|---|---|---|
| Cohérence avec le framework éditorial | 7/10 | 9/10 | Checklist auto-applicable dans le prompt étendue aux contraintes meta title/canonical/schema ; critère 32 (mobile) ajouté aux checks humains |
| Anti-cannibalisation | 7/10 | 9/10 | Seuil cosinus abaissé de 0.85 à 0.78 (adapté à la niche immobilier local) ; anti-cannibalisation pages transactionnelles déjà solide |
| Maillage interne | 6/10 | 9/10 | V21 ajouté : vérification obligatoire d'un lien vers au moins 1 page transactionnelle (`site_links`) ; brief JSON exemple déjà modélise les deux niveaux (articles + pages site) |
| Renouvellement éditorial | 8/10 | 9/10 | Section 4.5 ajoutée : contrainte d'équilibre des piliers (seuils min par pilier) pour maintenir la topical authority post-A12 |
| IndexNow / soumission | 7/10 | 9/10 | Gestion d'erreur ajoutée ; `keyLocation` explicite dans le payload ; checklist de déploiement pour @fullstack documentée |
| Meta SEO | 5/10 | 9/10 | Checks V17 (meta title ≤ 60 chars), V18 (meta desc ≤ 155 chars), V19 (canonical), V20 (image_alt), V22 (schema.org) ajoutés ; example brief corrigé (meta title A2 : 68 → 46 chars) |
| Topical authority | 7/10 | 9/10 | Section 4.5 (équilibre piliers) + règle de rejet SERP (portails nationaux) déjà solide |

### 7.2 Critères de la checklist 32 points non couverts avant audit (et statut après)

| # | Critère | Couvert avant | Check ajouté |
|---|---|---|---|
| 3 | Meta title ≤ 60 caractères | NON | V17 |
| 4 | Meta description ≤ 155 caractères | NON | V18 |
| 7 | Image alt text contient la requête cible | NON | V20 |
| 8 | Schema.org BlogPosting complet | NON | V22 |
| 9 | Canonical pointe vers URL propre | NON | V19 |
| 10 | Pas de balise noindex | NON | Couvert par V12 (frontmatter YAML complet) — @fullstack doit vérifier que `noindex: false` n'est jamais injecté par le framework de rendu |
| 12 | Lien vers page du site (/nos-biens, /vendre...) | PARTIEL (V10 ne couvrait que les articles blog) | V21 |
| 21 | Données chiffrées sourcées | PARTIEL (flag V16 mentionné mais non implémenté) | V16 implémenté |
| 24 | Infos factuelles vérifiées par fondateur | NON | Ajouté dans 5.2 (check humain systématique pour P2 et données propriétaires) |
| 25 | Anti-cannibalisation pages transactionnelles | OUI (section 4.3 solide) | Seuil abaissé à 0.70 déjà en place — RAS |
| 32 | Prévisualisation mobile | NON | Ajouté dans 5.2 (check humain systématique avant publication) |

**Critères intégralement couverts par V1-V15 avant audit :** 1, 2, 5, 6, 11, 13, 14, 15, 16, 17, 18, 19, 20, 26, 27, 28, 29, 30, 31.

### 7.3 Points de vigilance résiduels

1. **Critère 10 (noindex)** : le check V12 vérifie la complétude du frontmatter YAML mais ne vérifie pas explicitement l'absence de `noindex: true`. Si le framework Next.js ou le CMS injecte une balise robots meta automatiquement (ex : mode draft = noindex), ce signal peut bloquer l'indexation silencieusement. @fullstack doit s'assurer que le passage de `status = 'published'` supprime tout noindex côté rendu.

2. **Longueur fourchette — incohérence framework vs pipeline** : le framework éditorial (section 3, règle de validation) tolère ±100 mots ; le pipeline (V7) tolère ±10% (soit ±100 mots pour un article de 1000 mots, mais ±150 mots pour un article de 1500 mots). En pratique les deux convergent sur la plage usuelle — mais pour les articles courts (800 mots), ±10% = ±80 mots, soit légèrement plus strict que ±100 mots. Règle retenue : ±10% du `word_count_target` défini dans le brief. Si le fondateur préfère une tolérance fixe à ±100 mots, modifier V7 en conséquence.

3. **Bingbot vs Googlebot** : `robots.txt` de versi-immobilier.fr doit explicitement permettre Bingbot sur `/blog/*`. À vérifier lors du déploiement (@fullstack) : `User-agent: Bingbot` sans directive `Disallow` sur le blog.

---

## 8. Handoff

---
**Handoff → @creative-strategy**
- Fichiers modifiés : `docs/strategy/vi-blog-autonomous-pipeline.md`
- Décisions prises par @seo :
  - Seuil anti-cannibalisation cosinus abaissé de 0.85 à 0.78 (adapté niche immobilier local)
  - Exemple JSON brief corrigé : meta_title A2 ramené à 46 chars (conforme ≤ 60)
  - Checks V1-V15 étendus à V1-V22 (7 nouveaux checks SEO : meta title, meta desc, canonical, image_alt, site_links, schema.org, données sourcées)
  - Section 4.5 ajoutée : contrainte d'équilibre des 4 piliers post-A12
  - Section 7 ajoutée : audit SEO et scores par dimension
- Points d'attention :
  - Le score de validation passe de X/15 à X/22 — mettre à jour tout document qui référence le score 15/15
  - La checklist auto-applicable du prompt de génération a été enrichie (2 critères ajoutés)
  - V16 (données sourcées) est un flag semi-automatique : des faux positifs sont possibles (nombres en contexte non-chiffré) — la logique humaine de confirmation doit être conçue en conséquence

**Handoff → @fullstack**
- Fichiers modifiés : `docs/strategy/vi-blog-autonomous-pipeline.md`
- Actions requises :
  1. Mettre à jour `validateArticle()` avec les checks V16-V22 (code TypeScript fourni en section 6.5)
  2. Corriger le score en base : `validation_score INTEGER` commentaire mis à jour (0-22)
  3. Ajouter contraintes CHECK sur `planned_articles` : `meta_title` ≤ 60 chars, `slug` regex `/blog/[a-z0-9-]+`
  4. Déploiement IndexNow : suivre la checklist section 6.7 (fichier clé, .env, test Bing Webmaster Tools)
  5. Vérifier que `status = 'published'` supprime tout `noindex` côté rendu (critère 10 de la checklist)
  6. Vérifier `robots.txt` : `Bingbot` doit pouvoir crawler `/blog/*` sans `Disallow`
- Priorité : V17-V22 sont bloquants pour la conformité SEO Google + Bing — à implémenter avant le premier article publié
---

---

## Hypothèses à valider

| # | Hypothèse | Impact si fausse | Action requise |
|---|---|---|---|
| H1 | La table `articles` PostgreSQL existante supporte les ALTER TABLE sans migration complexe | Refactoring schéma | Confirmer avec @fullstack avant migration |
| H2 | Le budget API Claude (Opus pour génération, Sonnet pour correction) est approuvé | Basculer tout sur Sonnet | Valider coût estimé : ~0,50-2€ par article |
| H3 | IndexNow est disponible pour versi-immobilier.fr (domaine vérifié) | Supprimer étape IndexNow V1 | Vérifier ownership domaine Bing Webmaster Tools |
| H4 | Les fondateurs acceptent 48h de délai de réponse pour validation humaine | Réduire à 24h ou ajouter rappel | Confirmer avec Thomas |

---

**Handoff → @seo**
- Fichiers produits : `/home/user/Versi/docs/strategy/vi-blog-autonomous-pipeline.md`
- Décisions prises : architecture 8 étapes, prompt système complet avec blacklist étendue, logique anti-cannibalisation (cosinus > 0.85), seuil PASS 15/15, IndexNow post-publication, repurposing LinkedIn en V2
- Points d'attention pour la suite :
  - Valider que les checks V4-V6 (présence requête dans H1/chapeau/H2) correspondent aux règles SEO réelles du framework éditorial
  - Valider la pertinence de la saisonnalité lilloise (table `seasonal_calendar`) vs le calendrier réel des sujets SEO prioritaires
  - Confirmer que la logique anti-cannibalisation (similarité cosinus 0.85) est cohérente avec la stratégie de clustering de mots-clés existante

**Handoff → @fullstack**
- Fichiers produits : `/home/user/Versi/docs/strategy/vi-blog-autonomous-pipeline.md`
- Décisions prises : 5 nouvelles tables PostgreSQL, 7 endpoints API admin + 2 publics, 3 crons, appel Claude API avec modèle Opus (génération) et Sonnet (correction), 15 checks de validation implémentés en TypeScript, IndexNow post-publication
- Points d'attention pour la suite :
  - La fonction `validateArticle` est prête à l'emploi — intégrer dans le job de génération
  - Le champ `status` avec CHECK constraint garantit la cohérence du cycle de vie — ne pas contourner par UPDATE direct
  - Implémenter CRON 2 (publication) avant CRON 1 (génération) — dépendance logique
  - Le stockage des briefs en JSONB permet des requêtes Postgres sur les champs du brief (ex : `WHERE brief_json->>'persona' = 'Kevin'`)
  - Vérifier que le domaine versi-immobilier.fr est vérifié dans Bing Webmaster Tools avant d'activer IndexNow
