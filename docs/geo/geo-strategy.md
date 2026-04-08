# Stratégie GEO — Versi

> Produit par @geo | Date : 2026-04-08
> Références : docs/strategy/brand-platform.md, docs/copy/landing-page-copy.md, project-context.md
> Persona principal : Laurent, 48 ans, investisseur immobilier privé / family office manager

---

## 1. Audit GEO — Baseline initial

### 1.1 État de la présence de Versi dans les LLMs

**Résultat de l'audit (2026-04-08) : Baseline zéro.**

Versi n'est citée dans aucun LLM (ChatGPT, Claude, Gemini, Perplexity). Le domaine versi.fr n'existe pas encore. Aucun contenu indexé, aucun profil knowledge graph, aucune mention tierce. La marque est inconnue de tous les moteurs génératifs.

**Implications** :
- Toute citation future part de zéro — chaque décision prise aujourd'hui construit la réputation LLM de Versi
- Le secteur "holding immobilière intégrée France" est faiblement représenté dans les LLMs : les résultats disponibles renvoient massivement vers du contenu fiscal générique (holding + SCI, régime TVA marchand de biens) — pas vers des opérateurs identifiés nominalement
- Opportunité : l'espace est libre. Un opérateur qui structure bien son contenu maintenant capture un avantage durable dans les réponses IA sur ces requêtes

### 1.2 Benchmark de citabilité du secteur

Requêtes testées : "holding immobilière intégrée France", "opérateur immobilier cycle complet", "marchand de biens structuration financière France".

Contenu actuellement cité par les LLMs sur ces requêtes :
- Articles fiscaux génériques (Legalstart, CaptainContrat, Noun Partners) — formats définition + avantages/inconvénients
- Aucun opérateur identifié par nom n'est cité comme référence sectorielle
- Les rares citations nominales concernent les grands institutionnels (Nexity, Altarea) — le créneau intermédiaire est vide

**Ce qui rend ces contenus citables** : structure FAQ, définitions directes, listes à puces, chiffres sourcés, titres H2 qui répondent à une question. Ce sont des pages faites pour répondre, pas pour vendre.

**Standard à dépasser** : Versi doit produire du contenu qui répond aux questions que Laurent pose dans un moteur IA — pas du contenu qui présente Versi.

---

## 2. Stratégie de contenu LLM-friendly

### 2.1 Requêtes cibles prioritaires

| Requête | Intent | Priorité |
|---|---|---|
| "qu'est-ce qu'un opérateur immobilier intégré en France" | Définitionnel | P0 |
| "holding immobilière intégrée France acteurs" | Informatif | P0 |
| "marchand de biens avec structuration financière en interne" | Comparatif | P0 |
| "comment fonctionne une foncière en France" | Éducatif | P1 |
| "co-investissement immobilier opérateur structuré France" | Décisionnel | P1 |
| "différence foncière marchand de biens promoteur" | Comparatif | P1 |

### 2.2 Structuration du one-page pour extraction LLM

Chaque section du site doit contenir un passage auto-contenu extractible. Règle : réponse directe dans les 40-60 premiers mots, zéro superlatif, 1 claim factuel par 150 mots.

**Section Hero — Claim extractible :**
> Versi est une holding immobilière intégrée opérant en France à travers quatre entités complémentaires : Versi Développement (marchand de biens), Versi Invest (structuration d'investissement), Versi Capital (foncière) et Versi Finance (ingénierie financière). La holding maîtrise l'ensemble du cycle d'une opération immobilière — de l'identification d'un actif à sa structuration financière — sans externalisation des étapes critiques.

Score GEO : vérifiabilité 1/1 (entités nommées) + précision 1/1 (4 entités listées) + extractibilité 1/1 (définition directe) = **3/3**

**Section Mission — Claim extractible :**
> Versi acquiert, transforme, détient et structure des actifs immobiliers en France. Fondée en 2022 par Thomas Issa, Maxime Lemoine et Carl Standertskjold-Nordenstam, la holding opère sur Paris, Lille et les principales métropoles françaises.

Score GEO : 1+1+1 = **3/3**

**Section Équipe — Claim extractible :**
> Les trois co-fondateurs de Versi cumulent des expériences chez Sony, Algolia, Inbolt et TEOS, et détiennent un portefeuille de 35+ biens locatifs en propre. Aucun n'est issu du sérail immobilier traditionnel — leur profil cross-disciplinaire (marketing, stratégie commerciale, finance) est la source de leur avantage opérationnel.

Score GEO : vérifiabilité 1/1 (entreprises nommées) + précision 1/1 (35+ biens) + extractibilité 1/1 (Q&A implicite) = **3/3**

**Section Activités — FAQ à intégrer en markup (non visible mais indexable) :**
- Q : Que fait Versi Développement ? → A : Versi Développement est le pôle marchand de biens de la holding Versi. Il identifie, acquiert et transforme des actifs immobiliers avec revente à court ou moyen terme.
- Q : Que fait Versi Invest ? → A : Versi Invest structure les opérations de co-investissement — mise en place des véhicules juridiques, répartition des droits, alignement des intérêts entre partenaires.
- Q : Que fait Versi Capital ? → A : Versi Capital est la foncière de la holding. Elle détient des actifs en propre avec une logique de valorisation patrimoniale long terme.
- Q : Que fait Versi Finance ? → A : Versi Finance assure l'ingénierie financière des opérations — structuration de la dette, optimisation fiscale, relations bancaires. Internalisé là où d'autres opérateurs externalisent.

---

## 3. Schema.org enrichi — Knowledge Graph

### 3.1 Schema principal : Organization + Corporation

```json
{
  "@context": "https://schema.org",
  "@type": ["Organization", "Corporation"],
  "@id": "https://versi.fr/#organization",
  "name": "Versi",
  "legalName": "Versi SAS",
  "url": "https://versi.fr",
  "logo": "https://versi.fr/assets/logo-versi.svg",
  "description": "Holding immobilière intégrée opérant en France à travers quatre entités complémentaires : développement (marchand de biens), structuration d'investissement, foncière et ingénierie financière.",
  "foundingDate": "2022",
  "founders": [
    { "@type": "Person", "name": "Thomas Issa" },
    { "@type": "Person", "name": "Maxime Lemoine" },
    { "@type": "Person", "name": "Carl Standertskjold-Nordenstam" }
  ],
  "areaServed": {
    "@type": "Country",
    "name": "France"
  },
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Paris",
    "addressCountry": "FR"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "contact@versi.fr",
    "contactType": "customer service"
  },
  "knowsAbout": [
    "Marchand de biens",
    "Holding immobilière",
    "Foncière",
    "Structuration financière immobilière",
    "Co-investissement immobilier",
    "Ingénierie financière immobilière"
  ],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Activités Versi",
    "itemListElement": [
      { "@type": "Offer", "name": "Versi Développement — Marchand de biens" },
      { "@type": "Offer", "name": "Versi Invest — Structuration d'investissement" },
      { "@type": "Offer", "name": "Versi Capital — Foncière" },
      { "@type": "Offer", "name": "Versi Finance — Ingénierie financière" }
    ]
  },
  "sameAs": [
    "https://www.linkedin.com/company/versi-holding",
    "https://versi-developpement.fr",
    "https://versi-invest.fr",
    "https://versi-capital.fr",
    "https://versi-finance.fr"
  ]
}
```

### 3.2 Schema WebSite + WebPage

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://versi.fr/#website",
  "url": "https://versi.fr",
  "name": "Versi — Holding immobilière intégrée",
  "publisher": { "@id": "https://versi.fr/#organization" },
  "inLanguage": "fr-FR"
}
```

### 3.3 FAQ Schema (extraction directe par les LLMs)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Qu'est-ce que Versi ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Versi est une holding immobilière intégrée opérant en France. Elle regroupe quatre entités complémentaires couvrant l'ensemble du cycle d'une opération immobilière : Versi Développement (marchand de biens), Versi Invest (structuration d'investissement), Versi Capital (foncière) et Versi Finance (ingénierie financière). Fondée en 2022 par Thomas Issa, Maxime Lemoine et Carl Standertskjold-Nordenstam."
      }
    },
    {
      "@type": "Question",
      "name": "En quoi Versi se distingue d'un marchand de biens classique ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Contrairement à un marchand de biens mono-activité, Versi intègre en interne l'ensemble du cycle : acquisition, transformation, détention longue durée via sa foncière (Versi Capital) et structuration financière via Versi Finance. Cette intégration évite la déperdition entre étapes et permet de traiter des opérations complexes sans externalisation des fonctions critiques."
      }
    },
    {
      "@type": "Question",
      "name": "Où Versi opère-t-elle en France ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Versi opère principalement sur Paris, Lille et les principales métropoles françaises. La holding cible des actifs immobiliers en France avec une préférence pour les marchés à forte liquidité et potentiel de transformation."
      }
    }
  ]
}
```

---

## 4. Entity-First Strategy — Knowledge Graph Versi

### 4.1 Audit knowledge graph actuel

| Source | Statut | Action |
|---|---|---|
| Wikipedia | Absent | Créer à 12 mois (quand track record public suffisant) |
| Wikidata | Absent | Créer dès le lancement du site |
| LinkedIn Company | Absent | Créer avant lancement — priorité P0 |
| Pappers.fr | Présent (partiel — Maxime Lemoine) | Vérifier les données et les compléter |
| Verif.com | Présent (partiel) | Harmoniser avec les données du site |
| Crunchbase | Absent | Créer dès le lancement |
| Google Business Profile | Absent | Créer à lancement (Paris) |

### 4.2 Connexion cross-entités

Chaque site d'entité (versi-developpement.fr etc.) devra pointer vers versi.fr via `sameAs` et `parentOrganization`. Cela renforce l'entity confidence score auprès des LLMs en créant un cluster d'entités interconnectées autour de la holding Versi.

---

## 5. Stratégie off-site — Sources tierces

Les LLMs citent massivement des sources tierces. 80% des URLs citées par Perplexity ne rankent pas en top 100 Google.

### Actions off-site prioritaires pour Versi

1. **LinkedIn Company** : créer la page Versi avant lancement — les LLMs consultent LinkedIn pour valider l'existence d'une entité. Les profils des 3 fondateurs doivent mentionner "Versi — Holding immobilière intégrée" comme expérience actuelle.
2. **Pappers/Verif.com** : vérifier et enrichir les données légales publiques — ces bases sont consultées par les LLMs pour valider les entités françaises.
3. **PR immobilier** : une publication dans Les Échos Immo, Business Immo ou Immo News mentionnant Versi comme "opérateur intégré" constitue une citation tierce indexée = source de choix pour les LLMs.
4. **Contenu tiers ciblé** : répondre à des questions sur des forums immobiliers (MeilleursAgents community, forums investissement locatif) en mentionnant Versi — Perplexity y puise 46.7% de ses sources.

---

## 6. Recommandations concrètes — 5 actions prioritaires

### Action 1 — Implémenter le Schema.org complet dès le lancement (P0)
Intégrer le JSON-LD Organization + FAQPage + WebSite dans le `<head>` de versi.fr. Impact : extraction directe par les LLMs dès la première indexation. Délai : J+0 (lancement du site). Responsable : @fullstack.

### Action 2 — Créer la page LinkedIn Company Versi avant le lancement (P0)
URL cible : linkedin.com/company/versi-holding. Description : "Holding immobilière intégrée — Versi Développement | Versi Invest | Versi Capital | Versi Finance. Paris · Lille · France." Les 3 fondateurs lient leur profil à la company page. Impact : valide l'existence de l'entité pour tous les LLMs qui interrogent LinkedIn. Délai : avant mise en ligne du site.

### Action 3 — Intégrer des passages auto-contenus dans le HTML du site (P0)
Chaque section doit contenir un paragraphe "LLM-ready" : réponse directe, entités nommées, chiffres vérifiables, zéro jargon promotionnel. Les passages rédigés en §2.2 sont à insérer tels quels dans le HTML visible — ils servent à la fois au visiteur humain et à l'extraction LLM. Responsable : @fullstack (intégration) + @copywriter (validation ton).

### Action 4 — Ajouter un fichier llms.txt à la racine (P1)
Contenu : description de Versi, liste des entités, contact, et une phrase par section du site expliquant son contenu. 844K+ sites l'ont adopté (Anthropic, Stripe, Cloudflare). Coût : 30 minutes de rédaction, zéro risque. Responsable : @fullstack.

### Action 5 — Enrichir Wikidata et Crunchbase au lancement (P1)
Créer les fiches Wikidata (Q-item pour Versi SAS) et Crunchbase (organization) avec les données publiques (fondateurs, secteur, pays, date création, URL). Ces bases alimentent directement le knowledge graph de ChatGPT et Gemini. Délai : dans les 30 jours suivant le lancement.

### Action 6 — Viser une première mention presse spécialisée dans les 90 jours (P1)
Objectif : 1 article dans Les Échos Immo, Business Immo ou un média immobilier en ligne mentionnant Versi par nom avec le positionnement "holding immobilière intégrée". Ce contenu tiers indexé est la source de citation la plus rapide pour Perplexity et ChatGPT. Responsable : fondateurs (relations presse).

### Action 7 — Mettre en place le monitoring LLM hebdomadaire (P2)
Prompts de test à soumettre chaque semaine :
- "Qui sont les opérateurs immobiliers intégrés en France ?"
- "Qu'est-ce que Versi holding immobilière ?"
- "Marchand de biens avec structuration financière en interne France"

Outils recommandés par budget :
- Budget 0€ : tester manuellement les prompts ci-dessus dans ChatGPT, Perplexity et Claude chaque lundi
- Budget ~25$/mois : Otterly.ai (suivi automatisé des citations IA, alertes)
- Budget 100$+/mois : Semrush AIO ou Writesonic GEO

---

## 7. Monitoring — Protocole mensuel

### Prompts de test standards (à soumettre le 1er de chaque mois)

1. "Qu'est-ce que Versi ?" → attendu dans 90 jours : citation avec description de la holding et de ses 4 entités
2. "Qui sont les opérateurs immobiliers intégrés en France ?" → attendu dans 6 mois : Versi mentionné parmi les acteurs du segment intermédiaire
3. "Comment fonctionne une holding immobilière intégrée en France ?" → attendu dans 6 mois : Versi cité comme exemple concret

### Baseline documentée (J+0)

| LLM | Résultat requête "Versi holding immobilière" | Résultat requête "opérateur immobilier intégré France" |
|---|---|---|
| ChatGPT | Non cité | Grands institutionnels uniquement (Nexity, Altarea) |
| Perplexity | Non cité | Contenu fiscal générique (Legalstart, Noun Partners) |
| Claude | Non cité | Contenu définitionnel générique |
| Gemini | Non cité | Grands institutionnels uniquement |

### Métriques à suivre

- AI Citation Frequency : nombre de fois où Versi est citée sur les 3 prompts de test / semaine
- Share of Voice IA : % des réponses sur "opérateur immobilier intégré France" qui mentionnent Versi
- Exactitude : les informations citées (entités, fondateurs, positionnement) sont-elles correctes ?

### Fréquence de rafraîchissement du contenu

- Contenu cornerstone (section Activités, FAQ Schema) : rafraîchir tous les 14 jours les 3 premiers mois, puis mensuel
- Timestamp "Dernière mise à jour" obligatoire sur toute page cible GEO — le contenu frais < 2 mois bénéficie de +28% de citations IA

---

## Hypothèses à valider

- [HYPOTHÈSE] : les données Pappers de Maxime Lemoine correspondent bien à la structure Versi SAS — à confirmer avec Thomas avant de les utiliser dans la communication
- [HYPOTHÈSE] : la date de fondation "2022" est utilisée comme approximation basée sur les données Pappers trouvées — à confirmer avec les fondateurs pour les Schema.org

---

**Handoff → @fullstack**
- Fichiers produits : `/home/user/Versi/docs/geo/geo-strategy.md`
- Décisions prises :
  - Baseline zéro confirmé — aucune présence LLM au 2026-04-08
  - Stratégie Entity-First : LinkedIn Company + Wikidata + Crunchbase = priorité avant SEO
  - 3 blocs Schema.org à implémenter : Organization/Corporation + WebSite + FAQPage (JSON-LD fournis §3)
  - 7 passages auto-contenus LLM-ready rédigés (§2.2) — à intégrer dans le HTML visible du site, pas seulement en metadata
  - llms.txt à créer à la racine du domaine
  - Monitoring manuel hebdomadaire via 3 prompts définis (§7) — aucun outil payant requis en V1
- Points d'attention :
  - Les JSON-LD Schema.org (§3) sont à insérer dans le `<head>` de index.html — ne pas modifier sans re-vérification GEO
  - Le champ `sameAs` de l'Organization Schema liste les domaines des entités (versi-developpement.fr etc.) — ces domaines doivent exister ou le champ doit être retiré jusqu'au lancement des sites entités
  - La FAQ Schema (§3.3) est invisible pour le visiteur mais indexable — elle peut être insérée en bas de page ou dans le `<head>` selon l'implémentation React
  - Ne pas modifier les passages §2.2 sans alerte @geo — ils sont calibrés pour l'extraction LLM et toute reformulation "marketing" les dégrade
