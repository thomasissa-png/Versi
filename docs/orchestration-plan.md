# Plan d'orchestration — Versi Studio s21 Clustering IA + Polygones IA

<!-- SESSION: phases=4 tasks_prod=4 tasks_consult=0 -->

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
- Statut : COMPLETE
- Note : livrables produits par orchestrateur (pas d'outil Task disponible) — audit agents requis
- Livrables produits :
  - `docs/product/clustering-ia-spec.md` — US-VS-21 (pre-creation lots IA) + US-VS-22 (validation 1-clic)
  - `docs/ia/extraction-enrichie-spec.md` — schema unit_id + bounding_polygon + prompt STEP 3b/5b/7
- Decisions cles :
  - Clustering par (floor, unit_id) — confiance >= 0.7 pour pre-creer
  - "no AI > bad AI" : 0 lot si confiance < 0.7
  - Bbox englobante V1 (pas union convexe)
  - Nommage auto T{n} + position gauche/droite si doublon
  - bounding_polygon 3-8 pts pour pieces non-rectangulaires
  - Backward compatible (champs nullable)

### Phase 3 -- Implementation (@fullstack + @ia)
- Agents : orchestrateur direct (pas d'outil Task disponible)
- Statut : COMPLETE
- Fichiers modifies :
  - `versi-studio/src/lib/vs/schemas.ts` — +unit_id, +bounding_polygon, +warning enum
  - `versi-studio/src/lib/vs/plan-extractor.ts` — +STEP 3b/5b/7 prompt + schema JSON enrichi
  - `versi-studio/src/app/api/vs/projects/[id]/extract/route.ts` — clustering complet + creation lots IA
  - `versi-studio/src/components/vs/LotPanel.tsx` — badge IA + bordure suggeree + bouton Valider/Tout valider
  - `versi-studio/src/app/vs/projects/[id]/lots/page.tsx` — handlers validateSingleLot + validateAllAiLots

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
| 2 | 2 (orchestrateur) | - | 0 | 0 | ~$0 | COMPLETE |
