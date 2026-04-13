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
    "meta_title": "Appartement rénové marchand de biens vs particulier | Versi Immobilier",
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
---

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
[ ] Toute donnée chiffrée a une source entre parenthèses
[ ] Les liens internes sont aux bonnes positions avec les bonnes ancres
[ ] Le CTA final est présent et pointe vers la bonne URL
[ ] L'article ne mentionne aucun concurrent par nom
[ ] La longueur est dans la fourchette cible (±10%)

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
Critère de validation : volume ≥ 100 recherches/mois, intent informationnel ou commercial investigation, pas de page Versi existante sur ce sujet.

### 4.3 Anti-cannibalisation

Avant de générer un nouveau brief, le pipeline vérifie dans la table `articles` :
1. Qu'aucun article existant ne cible la même requête principale.
2. Qu'aucun article existant ne couvre le même angle éditorial (même H1 approximatif).
3. Que le slug proposé n'existe pas.

Méthode : similarité cosinus entre la requête du nouveau brief et les requêtes de tous les articles publiés ou planifiés. Seuil de blocage : similarité > 0.85. Si bloqué, le pipeline sélectionne la prochaine requête dans la liste ou passe à la source suivante.

### 4.4 Règle de priorité entre les sources

Ordre de priorité : Source A (opérations Versi) > Source B (saisonnalité) > Source C (SERP).

Justification : une opération réelle Versi produit un contenu inimitable (personne d'autre ne peut écrire cet article). La saisonnalité lilloise produit un contenu ancré géographiquement. Les tendances SERP optimisent mais ne différencient pas.

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

Formules interdites pour V15 : "Dans cet article", "Vous vous demandez", "Bienvenue", "Avez-vous déjà", "Dans le monde de".

### 5.2 Checks nécessitant une validation humaine

Ces situations déclenchent automatiquement une notification fondateur et mettent l'article en statut `pending_approval`.

| Situation | Déclencheur | Action |
|---|---|---|
| Article P2 (réalisation terrain) | Champ `pillar = "P2"` | Validation factuelle obligatoire — les chiffres terrain sont vérifiés par un fondateur |
| Données propriétaires intégrées | `requires_proprietary_data = true` | Validation que les données sont exactes et autorisées à la publication |
| Score V1-V15 < 15/15 après 2 passes | Compteur passes = 2 | Escalade humaine — le problème vient du brief, pas de l'article |
| Mention d'un prix ou délai non sourcé | Détection d'un nombre sans parenthèse source | Flag V16 (semi-automatique, NLP) |

### 5.3 Seuils et boucle de correction

- **PASS automatique** : 15/15 checks V1-V15 → article passe en statut `validation_pass` puis `scheduled`.
- **FAIL, passe 1** : ≥ 1 check en échec → lancer étape 4b (correction ciblée sur les sections en échec). Incrémenter compteur.
- **FAIL, passe 2** : ≥ 1 check encore en échec → statut `pending_approval`, email fondateur.
- **Cas spéciaux** (P2, données propriétaires) : toujours `pending_approval`, indépendamment du score.

### 5.4 Email de notification fondateur

Objet : `[Versi Blog] Article {{ARTICLE_CODE}} — validation requise`
Corps :
```
Titre : {{H1}}
Statut : {{RAISON}}
Score validation : {{X}}/15

Points à vérifier :
{{LISTE DES CHECKS EN ÉCHEC ou RAISON ESCALADE HUMAINE}}

Aperçu de l'article : [lien admin UI]

Actions disponibles :
→ Valider et programmer → [bouton]
→ Bloquer et réviser → [bouton]

Délai : 48h. Sans réponse, l'article reste en pending_approval.
```

## 6. Recommandations pour @fullstack

[Section complète ci-dessous]
