# Arbitrage D2 — Bornes surface_totale Versi Studio (Persona Laurent)

**Date** : 2026-04-16
**Arbitre** : Laurent, 48 ans, investisseur / family office

---

## Mes opérations type

Je co-investis principalement sur des opérations de taille intermédiaire : appartements de 40–200 m² à transformer, immeubles de rapport de 200–800 m² à découper, quelques actifs tertiaires entre 300 et 1 500 m². Mes tickets vont de 1 à 5 M€. Je n'opère jamais sur des places de parking seules ni des locaux de moins de 15–20 m² — ça ne vaut pas le montage. Sur le haut de gamme, j'ai co-investi sur un immeuble haussmannien de 1 200 m² à Paris et un programme mixte dans le Nord autour de 2 500 m². Au-delà, on sort du co-investissement privé pour entrer dans le territoire des foncières institutionnelles — ce n'est plus mon métier.

---

## Recommandation bornes

| Champ | Valeur | Justification |
|---|---|---|
| min | **9 m²** | La chambre de service ou la petite cellule commerciale descend à 9 m². En dessous, plus de surface habitable légale (surface Carrez < 8 m² = exclue de la vente comme logement). Je pose 9 m² pour couvrir les cas réels de découpe sans exclure les petits lots. |
| max | **5 000 m²** | Un immeuble de rapport standard sur mon marché fait 200–1 500 m². Un programme mixte ambitieux atteint 3 000–4 000 m². Je n'ai jamais vu un opérateur de ma strate travailler sur plus de 5 000 m² en une seule opération — au-delà c'est un chantier promoteur, pas un marchand de biens. La borne spec à 9 999 m² est de la théorie. La borne code à 100 000 m² est de l'absurde. |
| step | **1 m²** | On travaille en m² entiers dans tous les documents officiels (Carrez, permis, bail). Le demi-mètre n'a aucune valeur légale ou commerciale. Step 1 m² = entier, propre, pas de faux problèmes de précision. |

---

## Cas limites

Un ensemble immobilier multi-bâtiments (ex : campus industriel reconverti, ensemble de 3 immeubles contigus) peut dépasser 5 000 m². C'est rare mais réel. Si Versi Studio doit couvrir ce cas, je monterais la borne max à **7 500 m²** au maximum. Au-delà de 7 500 m², on n'est plus dans le segment des opérateurs que Versi Studio cible — on est dans le territoire des promoteurs grand compte. Inutile de prévoir des bornes pour des cas qui ne se produiront jamais dans l'usage réel de l'outil.

---

## Décision

**Bornes retenues : min = 9 / max = 5 000 / step = 1**

Avec extension possible à max = 7 500 si le fondateur confirme que Versi opère sur des ensembles multi-bâtiments.

---

## Handoff

**Destinataires :**
- **@fullstack** : mettre à jour la validation HTML5 (`min={9}` / `max={5000}` / `step={1}`) sur le champ `surface_totale` dans `versi-studio/src/app/vs/page.tsx`
- **@product-manager** : mettre à jour `docs/product/vs-functional-specs.md` US-VS-01 — remplacer les bornes spec actuelles (10–9999) par les bornes arbitrées (9–5000)
- **@qa** : mettre à jour les tests E2E correspondants (surface min/max boundary values) dans `tests/e2e/`
