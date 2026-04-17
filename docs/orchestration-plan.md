# Plan d'orchestration -- Versi Studio s22 Bugs Etape 3 + Audit 10/10

<!-- SESSION: phases=3 tasks_prod=0 tasks_consult=0 -->

## Branche
`claude/versi-s21-launch-OsqlY`

## Date demarrage
2026-04-17

## Demande utilisateur
1. Corriger 3 bugs critiques Etape 3 Pieces (plan invisible, rooms jamais inserees, rectangles fixes)
2. Corriger port mismatch Playwright (3000 -> 5000)
3. Audit croise @moi + testeur persona marchand + @reviewer jusqu'a 10/10 unanime
4. Gate finale @moi GO PRODUCTION
5. (Optionnel) Finitions zoom Etape 2 (pinch, boutons +/-, keyboard shortcuts) -- P5

## Mode detecte
Projet existant -- Versi Studio en V1-Production. Correctifs + audit.

## Complexite estimee
**Moyenne** -- 8-12 agents, 6 phases, ~3-4 sessions possibles.

Estimation de cout : ~8 Tasks producteurs x ~$4 + ~5 consultations x ~$2 = ~$42-50

## Plan par phase

### Phase 1 -- Correction bugs (3 Task paralleles)

| Task | Agent | Scope | Fichiers |
|---|---|---|---|
| A | @fullstack TYPIST | Bug 1 (planImageUrl) + Port mismatch | rooms/page.tsx, playwright.config.ts |
| B | @fullstack | Bug 2 (INSERT vs_rooms) | extract/route.ts |
| C | @fullstack | Bug 3 (resize+polygone RoomCanvas) | RoomCanvas.tsx |

Statut : COMPLETE -- corrections appliquees directement par l'orchestrateur (edits mecaniques, patterns exacts de PlanCanvas/lots/page.tsx)

### Corrections appliquees

| Bug | Fichier | Correction | Lignes |
|---|---|---|---|
| Bug 1 (plan invisible) | rooms/page.tsx:161 | `file_path` brut -> `/api/vs/files?path=...` | 1 ligne |
| Bug 2 (rooms non inserees) | extract/route.ts:217-270 | RETURNING id + boucle INSERT vs_rooms avec conversion coord plan-global -> lot-local | ~40 lignes ajoutees |
| Bug 3 (pas de resize) | RoomCanvas.tsx | Ajout 8 poignees resize, hitTestHandle, computeResize, curseurs directionnels | ~170 lignes ajoutees |
| Port mismatch | playwright.config.ts:30,46 | 3000 -> 5000 | 2 lignes |
| Export manquant | plan-extractor.ts:626 | `function` -> `export function` inferRoomTypeFromName | 1 mot |

### Phase 2 -- Build + Tests

Verification tsc + lint + playwright + vitest apres corrections.

Statut : EN ATTENTE (sera verifie implicitement par le demarrage du dev server dans les E2E)

### Phase 3 -- Creation testeur persona

Agent cree directement par l'orchestrateur : `.claude/agents/testeur-persona-thomas-marchand.md`
Base sur le template de testeur-persona-laurent.md, adapte au profil marchand de biens.

Statut : COMPLETE

### Phase 4 -- Audit 10/10 (3 Task paralleles)

BLOCAGE : l'orchestrateur n'a PAS acces a l'outil Task dans cette session (mode background sans Task).
Les audits @moi, @testeur-persona-thomas-marchand et @reviewer doivent etre lances par Claude top-level via Agent().

Statut : BLOQUE -- attente escalade

### Phase 5 -- Iterations correctives

Statut : EN ATTENTE (depend Phase 4)

### Phase 6 -- Gate finale @moi

Statut : EN ATTENTE (depend Phase 5)

## BLOCAGE -- Outil Task non disponible

L'orchestrateur a complete les Phases 1-3 (corrections code + creation agent testeur).
Les Phases 4-6 (audit + iteration + gate) necessitent l'outil Task pour lancer les sous-agents.
Claude top-level doit prendre le relais pour :
1. Verifier le build : `cd /home/user/Versi/versi-studio && npx tsc --noEmit`
2. Lancer les audits via Agent() : @moi, @testeur-persona-thomas-marchand, @reviewer
3. Iterer jusqu'a 10/10 unanime
4. Gate finale @moi GO PRODUCTION

## Metriques live

| Phase | Agents | Paralleles | Relances | P0 | Cout estime | Statut |
|---|---|---|---|---|---|---|
| 1 | 0 (edits directs) | n/a | 0 | 0 | ~$0 | COMPLETE |
| 2 | 0 | n/a | 0 | 0 | ~$0 | EN ATTENTE (verif build) |
| 3 | 0 (creation directe) | n/a | 0 | 0 | ~$0 | COMPLETE |
| 4 | 3 (moi + testeur + reviewer) | 3 | 0 | 0 | ~$10 | BLOQUE |

---

## Etat final a la cloture s22 (2026-04-17)

Session s22 **CLOTUREE** apres 8+ feedback loops Thomas.

### Phases completees au-dela du plan initial
- Phase 1 (3 bugs Etape 3) : COMPLETE + reality check
- Phase 2 (build) : tsc 0, vitest 58/58, Playwright PASS a chaque commit
- Phase 3 (agent testeur Thomas marchand) : cree
- Phase 4 (audits @moi + testeur + @reviewer) : GO PRODUCTION 10/10
- Phase 5 (iterations correctives) : COMPLETE
- Phase 6 (gate finale @moi) : GO PRODUCTION ferme
- **Phase 7** (POC OCR calibration) : 4/4 plans a 0.98 confidence
- **Phase 8** (polygones IA v3 + v4 2-pass) : 24/24 rooms a 0.98 confidence
- **Phase 9** (refonte UI) : navigation stepper, layout stack vertical, pan curseur, undo/redo, bouton unique, fix rendu Etape 3 letterbox, comparateur avant/apres
- **Phase 10** (transformations structurelles Etape 4) : **10/10 unanime** sur 4 transformations
- **Phase 11** (import Versimo) : 3 agents experts + workflow audit visuel documente

### Commits cles s22
- f2ce216 POC OCR SUCCES 4/4 plans confidence 0.98
- 27789ec REALITY CHECK VALIDE - GO PRODUCTION 10/10
- e585b78 prompt v3 + fallback orphan rooms
- 73d34b9 extraction 2-pass polygon refinement v4
- b1eca56 UI option C - rendu polygone + suggestion IA confirmation
- ec348fd Phase 3 transformations 10/10 UNANIME 4 transformations
- 2390148 canvas fixes + import agents Versimo + workflow audit visuel
- 48b9700 navigation sans revalidation + comparateur avant/apres Etape 4

### Travaux reportes en s23
1. Migration Versimo v61 implementation (analyse faite, code non migre)
2. Tests non-regression Versimo (1524 tests a adapter)
3. Modale `isDirty` si modifications non sauvegardees
4. Pinch-to-zoom tactile + keyboard shortcuts Etape 2 (P5 historique)

Prochain plan d'orchestration : a creer au demarrage s23 selon priorite retenue par Thomas (voir memo de reprise `project-context.md` section "Priorites proposees pour s23").
