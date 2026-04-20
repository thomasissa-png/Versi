# Revue croisee -- Versi Studio

**Date** : 2026-04-15
**Reviewer** : @reviewer
**Scope** : Gates BLOQUANT (G1, G3, G5, G7, G13, G15) sur 3 livrables critiques
**Persona Versi Studio** : Thomas, 35 ans, marchand de biens (defini dans docs/strategy/vs-brand-platform.md section 5)

> Note methodologique : cette revue remplace la version precedente qui etait trop permissive sur G5 (persona "implicite" accepte) et inconsistante sur G7 (contradiction comptabilisee sur un seul des deux livrables concernes). La regle G5 est explicite : le persona doit etre cite par nom ET le livrable doit adresser ses frustrations/objections.

---

## 1. vs-functional-specs.md -- @product-manager

| Gate | Verdict | Justification |
|------|---------|---------------|
| G1 | PASS | 12 sections completes (Evaluation code, Workflow, Etapes 1-4, Stack, Modele de donnees, API, Checklist, Questions ouvertes, Handoff). 0 TODO/placeholder detecte via Grep. |
| G3 | PASS | Bloc Handoff present (section 12) avec handoffs vers @ux, @fullstack, @design. Decisions et fichiers documentes. |
| G5 | PASS | Persona "Thomas, 35 ans, marchand de biens, 8-12 operations/an" cite des la ligne 5. 181+ occurrences de "Thomas". Scenarios persona concrets avec frustrations metier a chaque etape (verbatims, parcours apres visite terrain, double-clic frenetique reseau lent). Coherent avec vs-brand-platform.md section 5. |
| G7 | FAIL | **Contradiction stack** : ce livrable specifie "Next.js 14 App Router" (lignes 1078, 1082, 1356, 1371) alors que vs-qa-strategy.md specifie "Next.js 16 App Router, React 19" (ligne 12). Version incoherente entre specs et tests. |
| G13 | PASS | Les durees citees (~90s generation visuel, ~30-60s analyse) sont des estimations techniques basees sur le code existant. Le rate limit "10 generations/heure" est une contrainte de design. Aucun benchmark sectoriel non source. |
| G15 | PASS | 0 placeholder residuel. Grep [TODO], [PLACEHOLDER], [A REMPLIR], [XX], [NOM], [EXEMPLE], [VOTRE], [INSERER], [REMPLACER] : 0 correspondance. |

**Score : 5/6 PASS -- 1 FAIL (G7)**

---

## 2. vs-design-system.md -- @design

| Gate | Verdict | Justification |
|------|---------|---------------|
| G1 | PASS | 8 sections completes + Handoff (Tokens herites, Tokens SaaS, Logo, Layout, Composants UI, Compositions de pages, Responsive, Accessibilite). 0 TODO/TBD/placeholder via Grep. |
| G3 | PASS | Bloc "Handoff -> @fullstack" present (lignes 954+958). Decisions, dependances et fichiers documentes. |
| G5 | FAIL | **0 mention du persona Thomas. 0 mention "marchand de biens". 0 mention "persona".** Grep confirme : aucune correspondance sur Thomas, marchand, persona, Sophie, Laurent. Un design system pour un outil SaaS destine a un marchand de biens ne cite jamais son utilisateur cible. Les choix de design (desktop-first, palette minerale, layout 4 zones) sont justifies techniquement mais jamais ancres au persona. La regle G5 exige que le persona soit cite par nom ET que le livrable adresse ses frustrations/objections -- pas seulement une reference "implicite via les specs amont". |
| G7 | PASS | Aucune contradiction avec les livrables amont. Workflow 4 etapes coherent avec vs-functional-specs.md. Architecture tokens 3 tiers coherente avec design-system.md parent. Palette minerale endorsed brand coherente avec vs-brand-platform.md. |
| G13 | PASS | Toutes les valeurs citees sont des specs de design (dimensions px, couleurs hex, opacites, ratios de contraste). Aucun benchmark ou statistique externe inventee. Les ratios WCAG sont verifiables via les tokens couleurs explicites. |
| G15 | PASS | 0 placeholder residuel. Grep complet : 0 correspondance. |

**Score : 5/6 PASS -- 1 FAIL (G5)**

---

## 3. vs-qa-strategy.md -- @qa

| Gate | Verdict | Justification |
|------|---------|---------------|
| G1 | PASS | 5 sections + Handoff (Perimetre de test, Matrice de tracabilite, Couverture par etape, Fichiers de test, Gates QA applicables). Toutes renseignees, aucune vide ou TODO. |
| G3 | PASS | Bloc "Handoff -> @orchestrator" present (lignes 93+95). |
| G5 | FAIL | **Thomas n'est jamais cite par nom.** Seule mention indirecte : "workflow 4 etapes marchand de biens" dans la description du projet (ligne 5). 0 reference aux scenarios persona de vs-functional-specs.md. 0 reference aux frustrations de Thomas. 0 reference aux verbatims. La regle G5 exige le persona cite par nom et ses frustrations adressees. Un livrable QA doit ancrer ses tests dans les scenarios d'usage du persona -- les noms des tests sont techniques ("affiche le formulaire de creation") au lieu d'etre centres persona ("Thomas cree un projet apres visite terrain"). |
| G7 | FAIL | **Contradiction stack avec vs-functional-specs.md** : ce livrable declare "Next.js 16 App Router, React 19" (ligne 12) alors que vs-functional-specs.md specifie "Next.js 14 App Router" (lignes 1078, 1082, 1356, 1371). La contradiction G7 s'applique aux DEUX livrables symetriquement -- pas seulement a l'un des deux. |
| G13 | PASS | Aucune donnee inventee. Les references sont des noms de fichiers tests, des user stories et des descriptions techniques. Pas de benchmark ni statistique non sourcee. |
| G15 | PASS | 0 placeholder residuel. Grep complet : 0 correspondance. |

**Score : 4/6 PASS -- 2 FAIL (G5, G7)**

---

## Verdict global

| Metrique | Resultat |
|----------|----------|
| BLOQUANT PASS | 14/18 |
| BLOQUANT FAIL | 4/18 |
| Score derive | (14/18) x 10 = 7.8/10 |
| **Verdict** | **NO-GO** |

### Top 3 corrections prioritaires

| # | Gate | Livrable(s) | Correction requise | Agent responsable |
|---|------|-------------|--------------------|--------------------|
| 1 | G7 | vs-functional-specs.md + vs-qa-strategy.md | **Aligner la version Next.js.** Verifier package.json pour la version reellement utilisee. Corriger le livrable incoherent (probablement vs-functional-specs.md si le code est en Next.js 16). Les deux livrables sont en FAIL tant que la contradiction persiste. | @product-manager + @qa |
| 2 | G5 | vs-design-system.md | **Ajouter le persona Thomas explicitement.** Minimum : (a) reference en introduction "Concu pour Thomas, marchand de biens, 8-12 operations/an", (b) ancrer les 3 choix de design majeurs aux besoins du persona (desktop-first car Thomas travaille sur laptop apres visite terrain, palette minerale discrete car contexte professionnel credible, layout 4 zones car workflow sequentiel), (c) citer au moins 1 frustration ("payer 500 euros pour 3 visuels" → justification de l'outil). | @design |
| 3 | G5 | vs-qa-strategy.md | **Ancrer les tests dans le persona.** (a) Citer Thomas par nom dans la description et dans les noms de scenarios, (b) referencer les scenarios persona de vs-functional-specs.md ("Thomas rentre d'une visite, cree un projet..."), (c) documenter la couverture des frustrations cles (rapidite, simplicite, credibilite des visuels). | @qa |

### Contradictions detectees

| Livrable A | Livrable B | Contradiction | Criticite | Resolution proposee |
|---|---|---|---|---|
| vs-functional-specs.md ("Next.js 14 App Router") | vs-qa-strategy.md ("Next.js 16 App Router, React 19") | Version du framework incoherente entre specs et strategie de test | BLOQUANT | Verifier package.json, aligner les deux livrables sur la version reelle |

---

## Handoff

---
**Handoff -> @orchestrator**
- Fichiers produits : `docs/reviews/vs-cross-review.md`
- Decisions prises : **NO-GO** -- 4 gates BLOQUANT FAIL sur 18 (G7 x2 symetriques, G5 x2)
- Points d'attention :
  - **G7 BLOQUANT** : contradiction Next.js 14 vs 16 entre specs et QA -- verifier le code reel et corriger le livrable errone
  - **G5 BLOQUANT** : persona Thomas absent du design system (0 mention) et absent de la QA strategy (0 mention par nom)
  - Agents a reinvoquer : @product-manager OU @qa (G7 -- un seul doit corriger selon la version reelle), @design (G5), @qa (G5)
  - Aucune correction ne necessite de reecriture lourde -- ce sont des ajouts cibles (quelques paragraphes persona + 4 occurrences de version a corriger)
---
