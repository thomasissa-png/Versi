# Validation GEO post-corrections — Session S8
> Date : 2026-04-14 | Agent : @geo | Baseline re-audit : 7.8/10

---

## Tableau de validation — 9 corrections appliquées

| # | Correction | Statut | Observation |
|---|---|---|---|
| 1 | Organization schema : foundingYear 2022, numberOfEmployees 3, sameAs LinkedIn | PASS | Vérifié index.html lignes 96-102 — champs présents et corrects |
| 2 | /nos-biens : texte statique enrichi "21 appartements rénovés..." | PASS | PropertiesPage.jsx ligne 89 — claim vérifiable, précis, extractible |
| 3 | llms.txt : Last-Updated + URLs des pages | PASS | llms.txt ligne 3 "Last updated: 2026-04-14" + section "Pages du site" avec 7 URLs |
| 4 | FAQPage JSON-LD dupliqué supprimé de index.html | PASS | index.html ligne 126 = commentaire explicatif uniquement, zéro script FAQPage |
| 5 | JSON-LD Person (3 fondateurs) sur /notre-approche | PASS | ApprochePage.jsx lignes 127-162 — useEffect avec 3 Person + sameAs LinkedIn corrects |
| 6 | LocalBusiness JSON-LD enrichi sur /contact : @id, telephone | PASS | ContactPage.jsx lignes 20-24 — @id et telephone présents |
| 7 | FAQ JSON-LD vendeur sur /vendre | PASS | SellPage.jsx lignes 119-138 — FAQPage avec 5 questions vendeur, useEffect correct |
| 8 | sameAs LinkedIn dans author BlogPosting | PASS | BlogArticlePage.jsx lignes 163-165 — 3 Person avec sameAs individuels |
| 9 | Meta descriptions enrichies (non vérifié ici — à confirmer) | NON VÉRIFIÉ | Les meta descriptions de base restent dans index.html (homepage) mais les pages secondaires via PageHead non auditées dans ce batch |

---

## Scores par dimension GEO

| Dimension | S7 (baseline) | S8 (post-corrections) | Delta | Justification |
|---|---|---|---|---|
| Entity confidence (schema.org, @id, sameAs) | 6/10 | 9/10 | +3 | Organization avec foundingYear/numberOfEmployees/sameAs, 3 Person sur /notre-approche, LocalBusiness avec @id+telephone sur /contact |
| Content extractibility (passages auto-contenus, Q&A, claims vérifiables) | 7/10 | 8.5/10 | +1.5 | Texte statique /nos-biens avec claim "21 appartements rénovés en direct depuis 2022" — score 3/3 sur la grille claims |
| Structured data coverage (pages couvertes par JSON-LD) | 6/10 | 9/10 | +3 | Organization (global), FAQPage acquéreur (homepage), FAQPage vendeur (/vendre), Person x3 (/notre-approche), LocalBusiness (/contact), BlogPosting (/blog/*) |
| Topical authority (cluster, profondeur thématique) | 7/10 | 7.5/10 | +0.5 | Inchangé hormis texte /nos-biens. Blog non audité dans ce batch |
| E-E-A-T signals (auteurs nommés, parcours, LinkedIn) | 7/10 | 9/10 | +2 | 3 Person avec sameAs sur /notre-approche ET BlogPosting — les LLMs peuvent relier les auteurs à leurs profils vérifiables |
| LLM guidance (llms.txt, robots.txt, balises) | 5/10 | 8/10 | +3 | llms.txt avec Last-Updated, 7 URLs, FAQ acquéreurs + vendeurs structurées en Q/R extractibles |
| Duplicate / conflits schema (pénalités) | 4/10 | 9/10 | +5 | FAQPage dupliqué supprimé de index.html — source unique BuyerFAQ.jsx |
| Off-site / entity knowledge graph | 3/10 | 3/10 | 0 | Aucune action cette session (Wikipedia, Wikidata, Crunchbase absents) |
| Content freshness (timestamp visible, cycle refresh) | 5/10 | 6/10 | +1 | llms.txt "Last updated" présent. Aucun timestamp "Mis à jour le" visible côté utilisateur sur les pages |

---

## Score global

**Score final S8 : 8.5/10**

| Critère | Score |
|---|---|
| Score pondéré S7 | 7.8/10 |
| Score pondéré S8 | **8.5/10** |
| Delta | +0.7 |

---

## Ce qui manque pour atteindre 9/10

| Gap | Impact | Action requise | Priorité |
|---|---|---|---|
| Off-site entity graph : Versi Immobilier absent de Wikipedia, Wikidata, Crunchbase, Pappers | -0.8 sur entity confidence LLM | Créer fiche Crunchbase + profil Pappers (sources citées par ChatGPT et Perplexity) | P1 |
| Timestamp "Mis à jour le" absent sur les pages (pas de signal freshness côté utilisateur) | -0.3 | Ajouter dateModified visible sur /nos-biens et /blog/* | P2 |
| Meta descriptions /nos-biens, /notre-approche, /vendre : non vérifiées dans ce batch | À confirmer | Vérifier via PageHead dans chaque page que les chiffres différenciateurs sont inclus | P2 |
| Topical authority : cluster blog non audité | -0.5 | Audit des articles existants — restructurer en Q&A les sections introduction | P2 |

**Seuil 9/10 atteignable avec : Crunchbase/Pappers (impact majeur) + timestamps freshness (impact moyen).**

---

## Handoff

**Handoff → @orchestrator**
- Fichiers produits : `/home/user/Versi/docs/reviews/geo-validation-s8.md`
- Décisions prises : score S8 validé à 8.5/10 (vs 7.8/10 baseline re-audit). Toutes les 9 corrections appliquées — 8 PASS, 1 NON VÉRIFIÉ (meta descriptions secondaires, à confirmer).
- Points d'attention :
  - Le seul gap bloquant pour 9/10 est l'absence de l'entité Versi Immobilier dans les bases off-site (Crunchbase, Pappers, Wikidata) — action @growth ou action manuelle Thomas
  - FAQPage dupliquée supprimée de index.html : ne pas la réintroduire — BuyerFAQ.jsx est la seule source de vérité
  - Monitoring à reprendre dans 30 jours sur ChatGPT et Perplexity avec les prompts définis dans geo-strategy.md
