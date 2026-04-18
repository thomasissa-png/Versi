# Plan d'orchestration — Versi Studio s22 Propagation + Retours live Thomas

<!-- SESSION: phases=6 tasks_prod=7 tasks_consult=1 -->

## Session s22 — Propagation learnings s21 + 3 retours live production + tests E2E + zoom/pan + migration baselines

**Branche** : `claude/update-gradient-agents-Ta4Pn`
**Date démarrage** : 2026-04-18
**Date clôture** : 2026-04-18
**Statut** : CLÔTURÉE

### Demande utilisateur s22
1. Reprise s21→s22 : propagation 10 learnings L197-L208 non-propagés
2. En cours de session : 3 retours live Thomas sur production (R1 P1 DELETE plan persistence, R2 P2 bannière IA Étape 2, R3 P0 RÉGRESSION 2e signalement plan rogné Étape 3)
3. Cascade : tests E2E non-régression + extension défense anti-cache + zoom/pan RoomCanvas + migration baselines Playwright

### Mode détecté
Projet existant (Versi Studio V1 en production). Interventions ciblées sur régression + defense en profondeur, pas de nouvelle feature scope.

### Complexité observée
**Moyenne** — 5 agents distincts, 7 interventions Task producteurs (+1 consultation), 5 commits. Pattern "scope réduit" activé après 2 timeouts @fullstack.

### Plan par phase

#### Phase 0 — Propagation 10 learnings s21 (L197-L208)
- Statut : COMPLETE
- Exécution : édits directs orchestrator (règle n°4 exception propagation learnings)
- Commit : `05fc0b4` Propagation 10 learnings s21 (L197-L208) dans agents
- Cible propagation : `CLAUDE.md`, `.claude/agents/orchestrator.md`, `.claude/agents/qa.md`, `.claude/agents/ia.md`, `.claude/agents/moi.md`, `.claude/agents/fullstack.md`, `docs/founder-preferences.md`

#### Phase 1 — Retour 1 Thomas (P1) DELETE plan persistence
- Agents : @fullstack (1 Task producteur)
- Statut : COMPLETE
- Livrables : `versi-studio/src/app/api/vs/projects/[id]/plans/route.ts`, `versi-studio/src/app/api/vs/plans/[id]/route.ts`, `versi-studio/src/app/vs/projects/[id]/upload/page.tsx`, `docs/qa/s22-fix-plan-delete-persistence.md`
- Décision : `cache: "no-store"` (client) + `force-dynamic` + `revalidate = 0` (serveur) — pattern ceinture+bretelles
- Commit : `56c56d7` Fix Retour 1 : DELETE plan persistence

#### Phase 2 — Retours 2+3 Thomas (P2 bannière + P0 régression aspect ratio)
- Agents : @creative-strategy (consultation) → @fullstack (1 Task producteur, 3e tentative scope réduit)
- Statut : COMPLETE
- Livrables : `docs/copy/s22-review-banniere-ia-step2.md` (verdict "SUPPRIMER"), `versi-studio/src/app/vs/projects/[id]/rooms/page.tsx`, `versi-studio/src/app/vs/projects/[id]/lots/page.tsx`, `docs/qa/s22-fix-plan-rogne-step3-and-banniere.md`
- Décisions : (R2) suppression bloc JSX conditionnel bannière IA — verdict @creative-strategy "no AI > bad AI" ; (R3 scope réduit) aspect ratio container respecte ratio image natif + min-width pour éviter compression
- Anti-pattern évité : 2 timeouts consécutifs @fullstack sur scope combiné (aspect+zoom+pan+build) → 3e tentative en scope strictement réduit (L209)
- Commit : `74c0da3` Fix Retour 3 aspect ratio + Retour 2 suppression bannière

#### Phase 3 — Extension défense anti-cache (3 pages + 2 routes) + Tests E2E non-régression
- Agents : @fullstack (1 Task producteur) + @qa (1 Task producteur)
- Statut : COMPLETE
- Livrables @fullstack : `versi-studio/src/app/vs/projects/[id]/lots/page.tsx`, `rooms/page.tsx`, `visuals/page.tsx`, `api/vs/projects/[id]/lots/route.ts`, `api/vs/projects/[id]/rooms/route.ts`, `docs/qa/s22-fix-cache-nostore-extension.md`
- Livrables @qa : `versi-studio/tests/e2e/s22-fixes.spec.ts` (NEW) + `docs/qa/s22-tests-e2e-non-regression.md`
- Décision : étendre le pattern du fix R1 à tout le parcours (ceinture+bretelles proactif) + 5 tests E2E LIVE 5/5 PASS (pas mockés — headers HTTP cache réels)
- Commit : `b8ba008` Extension cache no-store + 5 tests E2E PASS LIVE

#### Phase 4 — Zoom/pan RoomCanvas Étape 3 (desktop) + Migration baselines
- Agents : @fullstack (1 Task producteur) + @qa (1 Task producteur)
- Statut : COMPLETE
- Livrables : `versi-studio/src/components/vs/RoomCanvas.tsx` (+170L/-39L), `docs/qa/s22-fix-plan-rogne-step3-zoom-pan.md`, migration 54 baselines Playwright slash→hyphen, `docs/qa/s22-migration-baselines-playwright.md`
- Décisions : wheel zoom (Ctrl+scroll) + drag pan + reset (0.5x–4x) desktop uniquement ; 2 baselines déjà migrées par session antérieure non-documentée (L213 migrations silencieuses) ; 33+ baselines obsolètes (upload/lots/rooms) REPORTÉES s23 pour arbitrage Thomas
- Commit : `755e942` Zoom/pan RoomCanvas + migration 54 baselines

#### Phase 5 — Dette identifiée pour s23 (REPORTÉE)
- Touch/pinch mobile RoomCanvas (desktop only V1 — Thomas desktop-first)
- Arbitrage 33+ baselines obsolètes (gate G26) — décision Thomas requise avant `--update-snapshots` global
- Migration layout `versi-studio/docs/` qu'un agent a créé par erreur (L211 — déjà corrigé manuellement mv vers `docs/qa/`)
- Priorités scope s22 non traitées du brief initial versi-s21 → s22 : POC OCR réel / backlog produit (D/E/F/G/H) / analytics V2 / hypothèses complexes

### Agents invoqués s22 (7 interventions)
1. @orchestrator (reprise + planif + clôture)
2. @fullstack (Retour 1 DELETE cache)
3. @creative-strategy (Retour 2 review bannière — verdict SUPPRIMER)
4. @fullstack (Retour 2+3 scope réduit aspect ratio + bannière JSX removal)
5. @fullstack (Extension cache no-store 3 pages + 2 routes)
6. @qa (5 tests E2E LIVE 5/5 PASS)
7. @fullstack (Zoom/pan RoomCanvas)
8. @qa (Migration 54 baselines + découverte L213)

### Patterns validés s22
- **Pattern "scope réduit quand timeout"** (L209) : 2 timeouts consécutifs @fullstack sur scope combiné (aspect+zoom+pan+build) → 3e tentative en scope strictement réduit (aspect+min-w UNIQUEMENT) passe en 95s
- **Pattern "ceinture+bretelles anti-cache"** : `cache: "no-store"` client + `force-dynamic`/`revalidate=0` serveur — coût zéro, neutralise tout cache intermédiaire (proxy Replit, CDN futur, ISR)
- **Pattern "verdict tranché copy"** (L212) : @creative-strategy répond SUPPRIMER/CONSERVER/REFORMULER net, pas de "ça dépend"
- **Pattern "no AI > bad AI"** appliqué concrètement sur la bannière IA (supprimée plutôt que reformulée)

### Commits s22 (5)
- `05fc0b4` Propagation 10 learnings s21 (L197-L208) dans agents
- `56c56d7` Fix Retour 1 : DELETE plan persistence (cache 'no-store' + force-dynamic)
- `74c0da3` Fix Retour 3 aspect ratio (plan rogné) + Retour 2 (suppression bannière IA)
- `b8ba008` Extension cache no-store 3 pages + 2 routes proactives + 5 tests E2E PASS LIVE
- `755e942` Zoom/pan RoomCanvas + migration 54 baselines Playwright slash→hyphen

---

# Plan d'orchestration — Versi Studio s21 Clustering IA + Polygones IA (archive)

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
