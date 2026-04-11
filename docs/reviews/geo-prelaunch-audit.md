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
| 1 | Schema.org complet | [À REMPLIR] | — |
| 2 | Passages LLM-ready (5+) | [À REMPLIR] | — |
| 3 | Entité nommée | [À REMPLIR] | — |
| 4 | Fondateurs nommés dans le HTML visible | [À REMPLIR] | — |
| 5 | Chiffres clés trackables | [À REMPLIR] | — |
| 6 | FAQ visible dans le HTML | [À REMPLIR] | — |
| 7 | llms.txt | [À REMPLIR] | — |
| 8 | Liens cross-entités | [À REMPLIR] | — |
| 9 | Différenciateurs textuels | [À REMPLIR] | — |
| 10 | Meta descriptions LLM-friendly | [À REMPLIR] | — |

---

## Checklist — versi-immobilier.fr

| # | Point | Statut | Commentaire |
|---|---|---|---|
| 1 | Schema.org complet | [À REMPLIR] | — |
| 2 | Passages LLM-ready (5+) | [À REMPLIR] | — |
| 3 | Entité nommée | [À REMPLIR] | — |
| 4 | Fondateurs nommés dans le HTML visible | [À REMPLIR] | — |
| 5 | Chiffres clés trackables | [À REMPLIR] | — |
| 6 | FAQ visible dans le HTML | [À REMPLIR] | — |
| 7 | llms.txt | [À REMPLIR] | — |
| 8 | Liens cross-entités | [À REMPLIR] | — |
| 9 | Différenciateurs textuels | [À REMPLIR] | — |
| 10 | Meta descriptions LLM-friendly | [À REMPLIR] | — |

---

## Corrections P0

[À REMPLIR]

---

## Corrections P1

[À REMPLIR]

---

## Corrections P2

[À REMPLIR]

---

## Handoff

[À REMPLIR]
