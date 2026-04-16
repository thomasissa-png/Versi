# Plan d'orchestration — versi-s18 Versi Studio Étape 3 Pièces

<!-- SESSION: phases=0 tasks_prod=0 tasks_consult=0 -->

## Branche
`claude/versi-s18-pieces-autopilot-Vlowg`

## Date démarrage
2026-04-16

## Mode détecté
**Projet existant V1-Production en autopilote Express 4 batches**
- Étape 3 Pièces (US-VS-13/14/15) déjà codée — finalisation/polish
- Pattern Express applicable : scope Alpha/Beta découpable, persona gate finale = @moi

## Profil utilisateur
- Niveau technique : Expert (Thomas marchand de biens, fondateur, code lui-même)
- Persona finale Versi Studio : **@moi** (outil interne, PAS Laurent/Sophie/Nicolas)
- Mode d'interaction : Autopilote (compteur Task producteurs ≤ 18 cible)

## Profil de rigueur
**V1-Production** — toutes gates G1-G34 actives, gate G33 anglicismes BLOQUANT, gate G34 collisions @theme BLOQUANT

## Budget Task producteurs estimé
~10-13 sur 18 max (marge confortable)

## Décision boucle visuelle G26
**DIFFÉRÉE** sur bundle Upload + Lots + Pièces (conforme learning versi-s17 P1 #3 — outil interne = baselines par bundle, pas par étape).

## Priorités session ordonnées

| # | Travail | Statut | Task producteurs estimés |
|---|---|---|---|
| P1 | Étape 3 Pièces autopilote Express (US-VS-13/14/15) | EN COURS | ~6 |
| P2 | F05 surface m² overlay drag PlanCanvas (résidu Lots s17) | EN ATTENTE | 0 (intégré P3 backlog) |
| P3 | Bundle P2 backlog Upload (7 items) | EN ATTENTE | ~1 |
| P4 | Boucle visuelle G26 bundle Upload+Lots+Pièces | EN ATTENTE | ~1 |
| P5 | Documenter exceptions canvas vs-design-system.md | EN ATTENTE | ~1 |
| P6 | Investigation upload-p0.spec.ts (si budget) | EN ATTENTE | ~1-2 |

## Phases d'exécution

### Phase P1 — Étape 3 Pièces (Express 4 batches)

**Composants scope** :
- `versi-studio/src/app/vs/projects/[id]/rooms/page.tsx` (page principale Étape 3)
- `versi-studio/src/components/vs/RoomPanel.tsx` (panneau latéral, sélecteur lot, dropdown type)
- `versi-studio/src/components/vs/RoomCanvas.tsx` (canvas overlays pièces, drag)
- `versi-studio/src/app/globals.css` (tokens si ajustement)

**Composants HORS scope** :
- `RoomGrid.tsx` (Étape 4 visuels)
- `VisualRoom.tsx`, `VisualResult.tsx` (Étape 4)

#### Batch 1 — 3 audits v1 parallèles
- @ux : audit parcours US-VS-13/14/15
- @design : audit visuel + gates G21/G22/G23/G31/G32
- @copywriter : audit copy + G33 anglicismes + registre "vous impératif neutre"
- Statut : EN COURS

#### Batch 2 — 2 @fullstack parallèles scope disjoint (typist)
- Alpha : `page.tsx` + `globals.css`
- Beta : `RoomPanel.tsx` + `RoomCanvas.tsx`
- Bonus Beta : F05 surface m² overlay drag (résidu Lots s17 — fichier `PlanCanvas.tsx` mais composant Lots, à intégrer si scope permet OU décaler P3)
- Statut : EN ATTENTE Batch 1

#### Batch 3 — 3 re-audits v2 parallèles
- @ux + @design + @copywriter sur livrables Batch 2
- Statut : EN ATTENTE Batch 2

#### Batch 4 — Gate finale @moi
- Statut : EN ATTENTE Batch 3

## Métriques live

| Phase | Agents | Parallèles | Relances | P0 | Statut |
|---|---|---|---|---|---|
| P1 Batch 1 | 3 | 3 | 0 | 0 | EN COURS |

## Feedbacks remontants

(à compléter au fil des batches)

## Décisions d'arbitrage

(à compléter au fil des batches)

---

## Archive — versi-s17 et antérieurs

(Ancien contenu archivé. Voir git history pour le détail des sessions précédentes.)
