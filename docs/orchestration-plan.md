# Plan d'orchestration — versi-s19 Versi Studio Étape 4 Visuels

<!-- SESSION: phases=0 tasks_prod=0 tasks_consult=0 -->

## Branche
`claude/versi-s19-visuels-autopilot-K7mQr`

## Date démarrage
2026-04-16

## Mode détecté
**Projet existant V1-Production en autopilote Express 4 batches**
- Étape 4 Visuels (US-VS-19/20/21/22) **déjà codée** — finalisation/polish (composants existants : `RoomGrid.tsx`, `VisualRoom.tsx`, `VisualResult.tsx`, `StyleGrid.tsx`, `ChatAgent.tsx`, page `/visuals/page.tsx`)
- Pattern Express applicable : scope Alpha (page + tokens) / Beta (composants feuilles RoomGrid + VisualRoom + VisualResult) découpable, persona gate finale = @moi
- **Note** : le mémo s19 indique "US-VS-16/17/18" mais les vraies US Visuels dans `vs-functional-specs.md` sont **US-VS-19/20/21/22** (Upload photo / Génération style / Itération chat / Validation visuel). Typo du mémo signalée au fondateur. Audit aligné sur les 4 US réelles.

## Profil utilisateur
- Niveau technique : Expert (Thomas marchand de biens, fondateur, code lui-même)
- Persona finale Versi Studio : **@moi** (outil INTERNE, PAS Laurent/Sophie/Nicolas — mapping persona→gate s16)
- Mode d'interaction : Autopilote Express (compteur Task producteurs ≤ 18 cible, ALERTE ROUGE > 18)

## Profil de rigueur
**V1-Production** — toutes gates G1-G34 actives, gate G33 anglicismes BLOQUANT, gate G34 collisions @theme BLOQUANT, exceptions canvas R02/R03/R04 documentées dans `docs/design/vs-design-system.md` §2.4 (à respecter par @design/@reviewer)

## Budget Task producteurs estimé
~10-13 sur 18 max — marge pour P2 BUG-1 + P3 audit `route.continue()` + P4-P6 résiduels

## Décision boucle visuelle G26
**DIFFÉRÉE** par défaut (outil interne — baselines par bundle, pas par étape). Migration `toHaveScreenshot()` strict envisagée fin de session si budget (P6).

## Estimation de coût
~6-8 Tasks Opus producteurs × ~$4 + ~4-5 Tasks Sonnet × ~$1 = ~$28-37 estimés

## Priorités session ordonnées (mémo s19)

| # | Travail | Statut | Task producteurs estimés |
|---|---|---|---|
| P1 | Étape 4 Visuels autopilote Express (US-VS-19/20/21/22) | EN COURS | ~6-8 |
| P2 | Fix BUG-1 PlanThumbnail floorInput resync | EN ATTENTE | 1 |
| P3 | Audit `route.continue()` 4 specs E2E | EN ATTENTE | 1 |
| P4 | F05 surface m² temps réel pendant drag | EN ATTENTE | 1-2 |
| P5 | Upload % feedback fichiers > 5 Mo | EN ATTENTE | 1 |
| P6 | Migration G26 stricte `toHaveScreenshot()` | EN ATTENTE | 1 |

## Pattern Express attendu pour P1 Étape 4 Visuels

| Batch | Contenu | Tasks producteurs |
|---|---|---|
| Batch 1 | 3 audits v1 parallèles (UX + Design + Copy) sur 4 composants + page | 3 |
| Batch 2 | 2 @fullstack scope disjoint Alpha (page + tokens globaux) + Beta (composants feuilles) | 2 |
| Batch 3 | 3 re-audits v2 parallèles | 3 |
| Batch 2.5 (conditionnel) | Typist micro-corrections si unanimité 8,5-8,9/10 GO CONDITIONNEL avec ≤3 résiduels triviaux | 0-1 |
| Batch 4 | Gate finale @moi (proxy Thomas) | 1 |

**Total P1 estimé** : 9-10 Task producteurs.

## Étape 0 — Propagation P0/P1 versi-s18 + résiduels s16

**Statut** : COMPLÈTE — 9 learnings propagés (7 s18 + 2 s16) sur 5 fichiers (orchestrator.md, moi.md, qa.md, design.md, reviewer.md). Gate bloquante de reprise levée.

| # | Learning | Cible | Action | Statut |
|---|---|---|---|---|
| L1 (s18 P1) | Pattern Batch 2.5 micro-corrections | orchestrator.md | Ajout section dédiée | propagé |
| L2 (s18 P1) | @moi gate finale post-Batch 2.5 re-vérifie en code | moi.md | Ajout sous-section "Gate finale post-Batch 2.5" | propagé |
| L3 (s18 P1) | @qa boucle visuelle bundle tier 1/2/3 | qa.md ligne 190 | Déjà présent | propagé |
| L4 (s18 P1) | Playwright `route.fallback()` vs `route.continue()` | qa.md ligne 76 | Déjà présent | propagé |
| L5 (s18 P2) | @qa frontière investigation vs implémentation | qa.md ligne 95 | Déjà présent | propagé |
| L6 (s18 P2) | Exceptions G23 documentées au design-system | design.md + reviewer.md | Ajout sous-sections dédiées | propagé |
| L7 (s18 P2) | Bundle backlog typist | orchestrator.md | Ajout section dédiée | propagé |
| L8 (s16 P2) | G33 messages d'erreur API | CLAUDE.md ligne 267 | Déjà présent | propagé |
| L9 (s16 P1) | Race condition matrice G27 | qa.md + orchestrator.md | Ajout sections dédiées | propagé |

## Métriques live

| Phase | Agents | Parallèles | Relances | P0 | Coût estimé | Statut |
|---|---|---|---|---|---|---|
| Étape 0 propagation | 0 (édits framework directs) | — | 0 | 0 | $0 | COMPLETE |
| Batch 1 P1 (audits v1) | 3 (@ux + @design + @copywriter) | OUI (3 parallèles) | — | — | ~$3 | EN COURS |

## Compteur Tasks producteurs
**0/18** — ALERTE ROUGE > 18. Budget cible : 10-13 sur la session.
