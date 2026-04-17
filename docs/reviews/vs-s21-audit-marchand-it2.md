# Audit valeur persona Thomas marchand versi-s21 — Itération 2

**Date** : 2026-04-17
**Persona** : Thomas, 35 ans, marchand de biens, 8-12 opérations/an
**Scope** : Corrections it2 — U1 (badge confiance), U3 (état vide différencié), U4 (undo validation), U5 (bannière post-extraction), I7 (pièces non assignées)
**Fichiers audités** : `lots/page.tsx`, `LotPanel.tsx`, `types.ts`

---

## Note globale : 8.8 / 10 (vs 7.2 en it1)

Les 2 P0 bloquants sont corrigés. La feature devient utilisable en production. Pas encore 9.5 : 2 irritants résiduels sur le H1 et la note bbox absente me font encore perdre du temps sur les plans complexes.

---

## Tableau 5 critères (incarnation persona)

| # | Critère | Note it1 → it2 | Ce qui a changé | Ce qui manque |
|---|---|---|---|---|
| 1 | Gain de temps ressenti | 7 → 8.5 | La bannière "L'IA a pré-créé N lots" me dit immédiatement ce qui s'est passé. Plus de silence. Le badge confiance me dit où concentrer mon attention — je vais directement aux 71% sans perdre du temps sur les 92%. | H1 dit encore "Découpez vos lots" alors que les lots sont déjà là — friction cognitive mineure |
| 2 | Confiance dans l'IA | 6 → 9 | Badge coloré (rouge/orange/vert) + pourcentage exact dans `LotCard`. Sur mon R+3, je vois "T3 RDC — 71%" en rouge, "T2 R+1 — 89%" en vert. Je sais en 2 secondes où vérifier. Tooltip `title` disponible au survol. | Rien de bloquant — la section pièces incluses (P1-3) serait utile mais pas indispensable si le % est là |
| 3 | Page blanche adressée | 8 → 9 | État vide différencié : "L'IA n'a pas détecté de lots fiables — dessinez manuellement" si extraction tentée, message neutre sinon. La bannière bleue U5 couvre le cas positif. Les 5 états UI sont couverts. | La note "Zones approximatives — ajustez si besoin" (P1-1) n'est toujours pas dans le panneau |
| 4 | Cas dégradés gérés | 8 → 9.5 | Section "Pièces non assignées" présente avec nom brut, surface et étage. Sur mon immeuble R+3 avec 2 couloirs et un local vélos, je les vois listés — je sais qu'ils ne sont dans aucun lot. Bonus : le bouton "Annuler la validation" (U4) existe, je peux dévalider si je me rends compte que j'ai trop vite validé un lot mal zoné. | Manque action directe sur les pièces non assignées (je ne peux pas les glisser dans un lot — je dois créer un lot manuellement et deviner les coordonnées). Point futur, pas bloquant V1. |
| 5 | Valeur vs prix 150€/mois | 7 → 8.5 | Avec le badge confiance, je passe de "vérifier 12 lots" à "vérifier 2-3 lots rouges/oranges". Gain réel : 80 min → 5-8 min sur un R+3 bien extrait. Plus la section pièces non assignées qui m'évite un oubli coûteux (surface habitable comptée en trop). La combinaison bannière + badge + undo + pièces orphelines forme un workflow cohérent. | H1 non conditionnel + absence note bbox — irritants mineurs qui subsistent |

---

## P0 résolus (Thomas satisfait)

**P0-1 : Badge confiance — RÉSOLU.**
`LotCard` affiche le pourcentage avec code couleur (rouge < 75%, orange 75-85%, vert > 85%). `confidence_avg: number | null` est dans `VsLot` (types.ts ligne 63). Je priorise ma vérification visuellement en 2 secondes. Workflow validé.

**P0-2 : Section "Pièces non assignées" — RÉSOLU.**
Implémentée dans `LotPanel.tsx` lignes 339-355. Les couloirs, locaux techniques et parties communes avec `unit_id = null` apparaissent sous les lots avec nom brut + surface + étage. Je ne rate plus de surface sur mes immeubles. La propagation depuis `currentPlan.extraction_data` dans `page.tsx` (lignes 551-556) est propre.

---

## P1 résiduels (Thomas râle mais renouvelle)

**P1-1 : Note "Zones approximatives" toujours absente.**
La bbox englobante V1 déborde encore sur les couloirs sur mes plans R+3 avec couloir central. Aucun message préventif ne me dit que c'est normal. Quand je vois le rectangle du T3 englober 20cm du couloir, je pense que l'IA se trompe — alors que c'est une approximation intentionnelle. Un message "Zones pré-calculées à affiner si besoin" sous le compteur de lots suffirait. Irritant P1 non corrigé.

**P1-2 : H1 "Découpez vos lots" non conditionnel.**
La correction était dans le brief it2 (conditionner sur `lots.some(l => l.source === "ai" && l.status === "suggested")`). Non implémentée. Quand j'arrive et que 12 lots sont déjà là, "Découpez vos lots" me dit d'aller découper quelque chose qui est déjà découpé. Friction cognitive faible mais réelle.

**P1-3 : Tooltip "pièces incluses" par lot toujours absent.**
Pas bloquant tant que P0-1 est en place. Futur ticket confirmé.

---

## Verdict persona : GO-CONDITIONNEL

Je renouvelle mon abonnement. La mécanique est solide : je vois les lots pré-créés, je sais lesquels vérifier grâce au badge couleur, je ne perds plus les couloirs dans le silence, et je peux revenir en arrière si j'ai trop vite validé. Sur mon R+3, je passe de 80 min à 5-8 min de travail réel. À 150€/mois, le calcul tient.

Les 2 P1 résiduels (note bbox + H1 conditionnel) sont des irritants, pas des bloquants. Ils me font perdre peut-être 2 min par opération sur les plans complexes. Je les corrige mentalement. Ce n'est pas ce qui me ferait résilier.

Ce qui me ferait passer à GO pur sans condition : les P1-1 et P1-2 corrigés en it3 (15 min de travail @fullstack selon le brief it1).

---

## Handoff → @orchestrator

**Fichiers produits** : `docs/reviews/vs-s21-audit-marchand-it2.md`

**Décisions** :
- P0-1 (badge confiance) : PASS — implémenté conforme au brief it1
- P0-2 (pièces non assignées) : PASS — implémenté conforme au brief it1
- P1-1 (note bbox approximative) : FAIL résiduel — non implémenté
- P1-2 (H1 conditionnel) : FAIL résiduel — non implémenté
- Verdict persona Thomas : GO-CONDITIONNEL (renouvelle, mais 2 irritants P1 à corriger en it3)
- Note globale : 8.8/10 (vs 7.2 it1, delta +1.6)

**Points d'attention** :
- it3 scope minimal : P1-1 (`LotPanel.tsx` sous compteur de lots) + P1-2 (`lots/page.tsx` H1 conditionnel) — corrections < 10 lignes chacune, pas de re-audit lourd requis
- Cible it3 : 9.5/10 GO complet
- Ne pas toucher U4 (undo), U5 (bannière), I7 (pièces) — validés
