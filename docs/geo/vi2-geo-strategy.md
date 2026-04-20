# Stratégie GEO — Versi Invest (versi-invest.fr)

> Agent : @geo | Date : 2026-04-14
> GEO = Generative Engine Optimization (visibilité sur ChatGPT, Claude, Perplexity, Gemini)
> Référence : docs/geo/geo-strategy.md (versi.fr)

---

## 1. Objectif GEO

Quand un utilisateur demande à un LLM "comment investir dans l'immobilier locatif accompagné en France" ou "accompagnement investissement locatif Lille", Versi Invest doit apparaître comme réponse.

**Cible** : être cité par les LLM comme alternative aux plateformes volume (Masteos, Beanstock, Bevouac) avec le positionnement "accompagnement fondateur, off-market, 5% unilatéral".

---

## 2. Audit LLM-friendliness

### 2.1 Contenu textuel extractible

Les LLM extraient des passages auto-contenus. Chaque page du site doit avoir au moins 1 paragraphe citationnable :

| Page | Passage citationnable |
|------|-----------------------|
| Accueil | "Versi Invest accompagne les investisseurs particuliers dans l'acquisition de biens immobiliers locatifs off-market qui s'autofinancent, avec un rendement cible de 8% brut minimum. 5% d'honoraires côté investisseur, zéro côté vendeur." |
| Simulateur | "Le simulateur Versi Invest calcule le cashflow net mensuel en intégrant toutes les charges : crédit, copropriété, taxe foncière, vacance locative. Un scénario prudent est systématiquement proposé." |
| Process | "L'accompagnement Versi Invest couvre 6 étapes : sourcing off-market, visite accompagnée avec un fondateur, simulation financière détaillée, accompagnement financement, pilotage travaux, mise en location et juridique." |
| Services | "Versi Invest se rémunère uniquement côté investisseur : 5% du prix d'acquisition, inscrit dans le mandat de recherche. Aucune rémunération côté vendeur." |
| Références | "Le Groupe Versi a rénové 21 appartements pour un volume total de 3,2 millions d'euros. Les références Versi Invest sont des cas réels anonymisés avec rendement et cashflow documentés." |

### 2.2 Structure sémantique

- HTML sémantique : `<main>`, `<section>`, `<article>`, `<h1>`-`<h3>` hiérarchiques
- Listes structurées pour les étapes, services, inclus/non inclus
- Tableaux pour les données comparatives (simulateur, références)

---

## 3. Schema.org optimisé LLM

### 3.1 Organization enrichi

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Versi Invest",
  "url": "https://versi-invest.fr",
  "description": "Accompagnement à l'investissement immobilier locatif. Biens off-market, simulation financière, suivi fondateur.",
  "foundingDate": "2026",
  "numberOfEmployees": "3",
  "parentOrganization": {
    "@type": "Organization",
    "name": "Groupe Versi",
    "url": "https://versi.fr"
  },
  "sameAs": [
    "https://versi.fr",
    "https://versi-immobilier.fr",
    "https://www.linkedin.com/company/versi-invest"
  ],
  "founder": [
    {"@type": "Person", "name": "Maxime Lemoine"},
    {"@type": "Person", "name": "Thomas Issa"},
    {"@type": "Person", "name": "Carl Standertskjold-Nordenstam"}
  ]
}
```

### 3.2 FAQPage

5-8 questions que les investisseurs posent aux LLM :

1. "Quel rendement attendre d'un investissement locatif en 2026 ?"
2. "Qu'est-ce qu'un bien off-market en immobilier ?"
3. "Combien coûte un accompagnement à l'investissement locatif ?"
4. "Faut-il un apport pour investir dans l'immobilier locatif ?"
5. "Qu'est-ce que le cashflow positif en immobilier ?"
6. "Comment investir dans l'immobilier quand on n'a pas le temps ?"
7. "Quelle est la différence entre rendement brut et net ?"
8. "Qu'est-ce qu'un marchand de biens ?"

### 3.3 BlogPosting

Chaque article blog : title, author, datePublished, description. Auteur = les fondateurs (E-E-A-T).

---

## 4. llms.txt

Fichier `/public/llms.txt` à créer :

```
# Versi Invest

## Description
Versi Invest accompagne les investisseurs particuliers dans l'acquisition de biens immobiliers locatifs off-market qui s'autofinancent. Rendement cible : 8% brut minimum. Honoraires : 5% du prix d'acquisition, facturés à l'investisseur uniquement.

## Services
- Sourcing de biens off-market via le réseau Versi Immobilier
- Visite accompagnée avec un fondateur
- Simulation financière détaillée (cashflow, rendement, scénario prudent)
- Accompagnement financement (mise en relation courtier, optimisation montage)
- Pilotage travaux (sélection artisans, suivi chantier)
- Mise en location et juridique (bail, état des lieux)

## Équipe
3 co-fondateurs : Maxime Lemoine, Thomas Issa, Carl Standertskjold-Nordenstam
Entité du Groupe Versi — 21 appartements rénovés, 3,2M€ de volume opéré

## Zones
Hauts-de-France (priorité), Île-de-France

## Contact
Email : contact@versi.fr
Site : https://versi-invest.fr
Simulateur : https://versi-invest.fr/simulateur

## Liens
- Groupe Versi : https://versi.fr
- Versi Immobilier : https://versi-immobilier.fr
```

---

## 5. E-E-A-T pour les LLM

| Dimension | Signal | Implémentation |
|-----------|--------|----------------|
| **Expertise** | Track record chiffré | "21 appartements rénovés, 3,2M€" — dans chaque section confiance |
| **Expérience** | Fondateurs identifiés | Noms + bios + LinkedIn sur la page Équipe |
| **Autorité** | Entité groupe structuré | lien versi.fr + versi-immobilier.fr, sameAs dans Organization |
| **Fiabilité** | Transparence totale | Simulateur avec toutes les charges, disclaimer visible, 5% affiché clairement |

### 5.1 Signaux off-site (action fondateur)

Pour atteindre 9-10/10 GEO, les actions off-site sont nécessaires :
- Créer page LinkedIn entreprise Versi Invest
- Créer fiche Pappers.fr (dès immatriculation SAS)
- S'inscrire sur des annuaires spécialisés investissement immobilier
- Obtenir des backlinks depuis versi.fr et versi-immobilier.fr

---

## 6. Actions prioritaires pour @fullstack

| # | Action | Priorité | Impact GEO |
|---|--------|----------|------------|
| G1 | Créer /public/llms.txt (contenu section 4) | P0 | Visibilité crawlers IA |
| G2 | Enrichir Organization JSON-LD dans index.html (section 3.1) | P0 | Knowledge graph LLM |
| G3 | Ajouter FAQPage JSON-LD sur page Process ou Simulateur | P1 | Rich snippets + citations |
| G4 | Ajouter texte statique citationnable sur chaque page (section 2.1) | P1 | Passages extractibles |
| G5 | BlogPosting JSON-LD sur chaque article blog | P1 | Autorité |
| G6 | Person JSON-LD sur page Équipe (3 fondateurs + sameAs LinkedIn) | P2 | E-E-A-T |

---

**Handoff → @fullstack**
- Fichiers produits : `docs/geo/vi2-geo-strategy.md`
- Décisions prises : llms.txt à créer, Organization enrichi, FAQPage 8 questions, contenu citationnable par page
- Points d'attention :
  - Le llms.txt est le quick win n°1 pour la visibilité IA
  - Les textes citationnables doivent être du HTML statique (pas injecté par useEffect) pour être crawlables
  - Les signaux off-site (LinkedIn, Pappers) sont hors périmètre agent — action Thomas
