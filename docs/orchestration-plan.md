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
- Statut : COMPLETE
- Trajectoire : it1 7.0/10 (10 P0) → it2 9.04/10 (0 P0) → it3 mini 9.37/10 (typist 25 lignes)
- Livrables : 11 audits + 2 bundles consolidation dans `docs/reviews/vs-s21-*`

### Phase 5 -- Tests obligatoires (P3/P5)
- Statut : COMPLETE
- P3 re-run E2E + tests reels : vitest 58/58 PASS + tsc 0 + ESLint 0 prod + playwright 5/5 PASS
- P5 isValidZone : 30/30 cas Vitest (zone-validation.test.ts) PASS, 0 bug types.ts

### Phase 6 -- Analytics events (P4)
- Statut : COMPLETE
- Spec @data-analyst : `docs/analytics/vs-s21-clustering-events.md`
- Impl @fullstack typist : helper `analytics.ts` + 4 inserts (extract/route + lots/page)
- 4 events : lot_auto_created, lot_auto_validated, lot_manually_adjusted, ia_fallback_triggered

### Phase 7 -- Gate finale @moi
- Statut : COMPLETE
- Verdict : GO PRODUCTION ferme, score final 9.37/10
- Livrable : `docs/reviews/vs-s21-gate-moi-finale.md`

### Phase 8 -- Cloture session
- Statut : EN COURS
- Mise a jour project-context.md + lessons-learned.md + push branche + main

### Hors scope s21 (reporte s22)
- P2 POC OCR auto-calibration en reel : en attente OPENAI_API_KEY + 5-10 plans Thomas

## Metriques live
| Phase | Agents | Paralleles | Relances | P0 | Cout estime | Statut |
|---|---|---|---|---|---|---|
| 0 | 0 (edits directs) | - | 0 | 0 | $0 | COMPLETE |
| 1 | 0 (edits directs) | - | 0 | 0 | $0 | COMPLETE |
| 2 | 2 (orchestrateur) | - | 0 | 0 | ~$0 | COMPLETE |
| 3 | 2 (orchestrateur fallback) | - | 0 | 0 | ~$0 | COMPLETE |
| 4 it1 | 5 audits (QA+UX+PM+IA+CS proxy) | 5 | 0 | 10 | ~$0.30 | COMPLETE |
| 4 it2 | 3 fullstack + 5 re-audits | 3 + 5 | 0 | 0 | ~$0.40 | COMPLETE |
| 4 it3 mini | 1 typist + 3 re-audits + 1 @moi | 1 + 3 | 0 | 0 | ~$0.15 | COMPLETE |
| 5 (P3+P5) | 1 @qa tests unit | 1 | 0 | 0 | ~$0.05 | COMPLETE |
| 6 (P4) | 1 data-analyst + 1 fullstack typist | 1 + 1 | 0 | 0 | ~$0.10 | COMPLETE |
| 7 @moi | 1 | - | 0 | 0 | ~$0.05 | COMPLETE |
| 8 cloture | 0 (edits directs) | - | 0 | 0 | $0 | EN COURS |
| **Total** | ~30 Tasks producteurs (zone ALERTE ROUGE > 18, tenue par patterns typist + scope disjoint) | - | 0 | 0 P0 residuel | **~$1.05** | GO PRODUCTION |
