# Plan d'orchestration -- Versi Studio s22 Bugs Etape 3 + Audit 10/10

<!-- SESSION: phases=3 tasks_prod=0 tasks_consult=0 -->

---

## HOTFIX P0 s30+1 -- Étape 4 v2 prod cassée (2026-05-05)

**Mode** : HOTFIX investigation, pas de fix immédiat.

**Symptômes** :
- A : UI Étape 4 inchangée après pull s30 sur Replit prod
- B : job "Création en cours ~90s" bloqué 10+ min sans progression

**Findings pré-investigation** (orchestrateur) :
- `useVisualsStream` utilisé dans `VisualGallery`, `VisualPlacementView`, `GenerationProgressView` -- pas dans `visuals/page.tsx` direct (normal, c'est un sous-composant)
- `visual-job-runner` référencé dans `src/app/api/vs/projects/[id]/visuals/generate/route.ts`
- Page Étape 4 = `versi-studio/src/app/vs/projects/[id]/visuals/page.tsx`
- REPLIT_ACTIONS.md référence s29 -- pas de section s30 ajoutée (signal fort : actions manuelles s30 oubliées ?)

**Phase HOTFIX-1** : @fullstack -- diagnostic root cause, rapport sans fix
**Phase HOTFIX-2** (après validation user) : @fullstack -- fix ciblé sur hypothèse retenue

### HOTFIX-1 -- Verdict diagnostic (2026-05-05)

**Statut** : COMPLETE -- rapport produit dans `docs/hotfix/2026-05-05-etape-4-v2-diagnostic.md` (orchestrateur, sous-agent Task indispo en mode subagent).

**Root cause identifié (HAUTE)** : H1 -- Route Étape 4 active (`src/app/vs/projects/[id]/visuals/page.tsx`) jamais migrée vers UI v2. Elle rend toujours `VisualRoom` (UI v1). La nouvelle UI v2 (`VisualPlacementView`) est cantonnée à la sous-route `/visuals/placement` non liée depuis le Stepper.

**Preuve** : Grep `VisualPlacementView|useVisualsStream` dans `visuals/page.tsx` → 0 résultat. Imports actuels = `Stepper, RoomGrid, VisualRoom`.

**Conséquence Symptôme A** : Thomas voit l'ancienne UI parce que c'est ce qui est rendu.
**Conséquence Symptôme B** : Le texte "Création en cours — environ 90 secondes" vient de `VisualResult.tsx` (composant v1). Donc Thomas est sur la chaîne v1 qui POST `/api/vs/rooms/[id]/generate`. Cette route legacy a été refactorée s30 pour `await generateCoherentVisuals` synchrone côté API → timeout proxy Replit 60s sur `gpt-image-2` qui prend 90s+ → row `vs_visuals` status='pending' figée → UI v1 polle indéfiniment.

**Hypothèse secondaire (HAUTE)** : H2 -- timeout proxy Replit sur route legacy `/rooms/[id]/generate` qui await la génération.
**Hypothèse tertiaire (MOYENNE)** : H3 -- env var `VS_COHERENT_PIPELINE` ou scope clé OpenAI.

**Plan fix recommandé (HOTFIX-2 après confirmation user)** :
- Option A (LOW RISK) : redirect `/visuals` → `/visuals/placement` via `redirect()` Next.js. ~10 lignes, 1 fichier. Bascule complète sur v2 testée Vitest 107/107 + Playwright 18/0/2.
- Si H2 confirmé en plus : convertir `POST /rooms/[id]/generate` en fire-and-forget (~30 lignes).

**Action de confirmation Thomas (30s)** :
```bash
grep -n "VisualPlacementView\|useVisualsStream" versi-studio/src/app/vs/projects/[id]/visuals/page.tsx
```
Si 0 résultat → H1 confirmé, lancer Option A.

**Prochaine action** : attendre validation user du root cause AVANT de lancer @fullstack en HOTFIX-2.


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

---

## Session s24 (2026-04-21) - CLOTUREE

Branche : `claude/versi-s24-propagation-learnings-Au1vk`
12 commits : fec8a96 → c5ea140

### Phases completees
- Phase 0 : propagation 14 learnings s23 (gate bloquante) - fec8a96
- Phase 1 : fix P0 Etape 1->2 "Impossible de lancer l'analyse" (timeout + tesseract) - 1947496, 361243f, 0639fcf, a70e841
- Phase 2 : fix envelope debord + canvas letterbox + floor override - d83d42d, 18db694
- Phase 3 : @ia prompt v7.1 building_outline private unit + seuil envelope 30% - 1c0d72a, d92ae20, fced7e4
- Phase 4 : @ia passe-5 room tiling power diagram (0 overlap / 0 gap garanti) - 03c627f
- Phase 5 : fix TS build prod - c5ea140

### Metrics empiriques finales (4 lots, 23 rooms)
- Lot enveloppe : 4/4 polygonale (passe-4 convex hull)
- Rooms tiling : 23/23 tiles valides, 0 overlap, 0 gap (passe-5 power diagram)
- Temps extract : 41-55s (sous 60s timeout Replit)
- Build prod : PASS sur c5ea140

### Travaux reportes en s25
1. Reality check UI prod Replit (bloque par bug Turbopack dev en local)
2. Audit @ux tiles power diagram (cellules convexes vs rooms L-shaped)
3. Migration Versimo v61 (toujours en attente)
4. Bug dev Turbopack loading infini (optionnel)

Prochain plan d'orchestration : a creer au demarrage s23 selon priorite retenue par Thomas (voir memo de reprise `project-context.md` section "Priorites proposees pour s23").

## Sessions s25-s29 (2026-04-23 → 2026-05-04) - CLOTUREES (resumes condensés)

s25-s27.2 : refonte pipeline extraction Versi Studio (canonicalisation + pivot bitmap → vectoriel pixel-perfect). s27.2 = 9 commits feat/fix sur claude/session-recovery-setup-iDOWX (HEAD 05d0998). Pivot vector pdfjs `viewport.transform` = clé du fix.

s28 : 33 tours d'itération sur placement architectural pieces Étape 3 Versi Studio. Verdict Thomas final « ça paraît beaucoup mieux ouo » → 8/10 stable validé sur 4 plans Muguets. Bug critique fixé tour 27 : `firstPlan = plans[0]` piège multi-étage. Pivot architectural tour 18 BFS quota → bbox-from-walls.

s29 : Étape 4 v2 Visuels Vague 1 backend (commit ad30b35) — modules + 4 migrations SQL + 1 doc Replit. Audit persona Thomas marchand de biens GO avec 8 ajustements P0/P1/P2. Préf fondateur s29 : pas de blocage budget IA + validation persona pre-implémentation systématique.

## Session s30 (2026-05-04) - CLOTUREE

Branche : `claude/versi-s30-session-resumption-Jc4hi`
**19 commits** : 84f186c → 8c045cc (~8800 L code+tests+docs)

### Phases completees
- Phase 0 : propagation 6 learnings P0/P1 s29 (gate bloquante) — 84f186c
- Phase 0b : hotfix 4 erreurs TS build cassé + sync package-lock + fix mime root cause "Invalid image" — 798e94a, 73c9cb5, b643629
- Étape A : Vague 2 backend 7 routes API + SSE + job persistant + migration 006 — a7726d2
- Étape B parallèle : Vague 3a UI placement (canvas + tap-to-confirm mobile fix GP5) + Vitest 107/107 PASS — 227b419, ea472d8
- Étape C : Vague 3b UI génération + galerie + SSE consumer — cff35e1
- Étape D parallèle : Playwright E2E 18/0/2 Chromium + verdict persona GO 8.5/10 — 7a4b26a, 0ea909b
- Étape E : audit @reviewer cohérence GO conditionnel (7/7 BLOQUANT, 5/6 REQUIS) — 11152d6
- Étape F (clôture) : mémo + 6 LEARNINGS promus en règles agents — 3b78ff9
- Round 1 perfection : audit @design 7.8/10 + fix 2 frictions persona P2 — fcd87de, 2b79e41
- Round 3 perfection : fix 6 défauts @design (3 P0 + 3 P1) — bc4accf
- Round 4 perfection : re-audit @design **9.2/10** GO (+1.4) — 80a3ac5, 8c045cc

### Métriques s30
- Tests : Vitest 107/107 PASS (Vague 2) + 22/22 PASS (round 3 fixes) + 18/18 PASS (helpers round 2)
- E2E : Playwright 18 PASS / 2 skipped (mobile WebKit en CI uniquement) / 0 failed Chromium
- Build : tsc PASS, lint baseline inchangé (90 errors préexistantes hors scope), npm run build PASS
- Verdicts : Persona 8.5/10 GO + Reviewer GO conditionnel + Design 9.2/10 GO

### Travaux reportés en s31 (Étape F prod = action Thomas)
1. **R3 prioritaire** : test clé OpenAI prod gpt-image-2 accessible
2. **R1** : multi-image natif vs fallback textual_signature (badge UI déjà présent)
3. **R2** : calibration seuil T4 sur 20-30 photos chantier réelles
4. **Mobile iPhone réel** : test placement bottom sheet plan dense 8 pièces (avec safe-area iOS notch)
5. **5 P2 polish post-Étape F** (non bloquants, à programmer si remontée terrain Thomas) : focus ring QuestionsModal footer + GenerateButton mobile mt-auto + FAB safe-area + AngleController aria-disabled + CostEstimator suffixe (indicatif)
6. **Héritage** : suppression/resync plan-extractor-mock.ts (test fail pré-existant s28), migration property_photos R2 (s27), versi-studio.fr DNS (s26), audit volumineux project-context.md (1187 L), dédoublonnage founder-preferences.md (273 L)

Prochain plan d'orchestration : à créer au démarrage s31 selon priorité retenue par Thomas (mémo de reprise `project-context.md` section "Mémo de reprise versi-s30 → s31").
