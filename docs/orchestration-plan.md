# Plan d'orchestration — Versi Studio s21 Clustering IA + Polygones IA

<!-- SESSION: phases=2 tasks_prod=0 tasks_consult=0 -->

## Branche
`claude/versi-s21-clustering-polygones-ia`

## Date demarrage
2026-04-17

## Demande utilisateur
Option A+B combinee : Clustering IA `unit_id` (regroupement pieces par appartement) + Polygones IA dans extraction (bounding_polygon par piece). Exigence explicite Thomas : "Fais bien tester ensuite pour valider" -> tests E2E + unitaires + audit cross-agents OBLIGATOIRES avant merge.

## Mode detecte
Projet existant -- Versi Studio en V1, Etape 2 Lots validee s20 (9.68/10 unanime). Extension du pipeline extraction IA.

## Complexite estimee
**Moyenne-Lourde** -- 5 agents principaux (@product-manager, @ia, @fullstack, @qa, @moi), 6 phases, ~10-13 Tasks producteurs.

Budget cible : 10-13 Tasks producteurs. ALERTE ROUGE > 18.

## Plan par phase

### Phase 0 -- Propagation learnings s20
- Statut : COMPLETE
- 7/7 learnings propages (orchestrator.md, creative-strategy.md, fullstack.md, ux.md, infrastructure.md, qa.md, CLAUDE.md, ia.md, product-manager.md)

### Phase 1 -- Branche + references
- Statut : COMPLETE
- Branche : `claude/versi-s21-clustering-polygones-ia`
- References mises a jour : project-context.md, replit-first-build-guide.md

### Phase 2 -- Specs produit A+B (@product-manager + @ia en parallele)
- Agents : @product-manager (Sonnet), @ia (Opus)
- Parallelisation : OUI (scopes disjoints)
- Statut : EN COURS
- Livrables attendus :
  - `docs/product/clustering-ia-spec.md` (@product-manager)
  - `docs/ia/extraction-enrichie-spec.md` (@ia)

### Phase 3 -- Implementation (@fullstack + @ia)
- Agents : @ia (route extract enrichie), @fullstack (backend clustering + frontend)
- Statut : A FAIRE

### Phase 4 -- Audit cross-agents 3 iterations (persona-sensitive)
- Pattern : audit cross-agents 3 iterations (learning s20)
- Agents : @qa, @ux, @product-manager, @ia, @creative-strategy proxy Thomas marchand
- Statut : A FAIRE

### Phase 5 -- Tests obligatoires (@qa)
- E2E + unit + isValidZone + suite complete
- Statut : A FAIRE

### Phase 6 -- Analytics + gate finale
- @data-analyst events + @moi gate
- Statut : A FAIRE

### Phase 7 -- Cloture
- Learnings + memo + commit
- Statut : A FAIRE

## Metriques live
| Phase | Agents | Paralleles | Relances | P0 | Cout estime | Statut |
|---|---|---|---|---|---|---|
| 0 | 0 (edits directs) | - | 0 | 0 | $0 | COMPLETE |
| 1 | 0 (edits directs) | - | 0 | 0 | $0 | COMPLETE |
| 2 | 2 | 2 (PM+IA) | - | - | ~$5 | EN COURS |
