# Audit QA s33 — Étape 3 (Pièces) + Étape 4 (Visuels)

Audit READ-ONLY couverture tests Étape 3 placement pièces + Étape 4 wizard visuels. Branche `claude/versi-s33-propagation-context-u8L8y`. Périmètre : Vitest unit + Playwright E2E + gates G1-G32 + régressions s28/s30/s31/s32/s33.

## 1. Synthèse

**Verdict** : couverture **6/10**. Vitest unit solide sur logique pure (32 tests unit + colocalisés pour helpers polygones, segments, prompts IA). E2E Playwright **fragmentés** (focus sessions s22/s23/s28, peu de tests s30-s33). **Top 3 trous critiques** : (1) **`useVisualsStream` hook 506 L jamais testé** → SSE 4 patterns (replay/keep-alive/heartbeat/abort) non couverts, polling 4s s32 non couvert ; (2) **Aucun pre-commit Vitest ni CI/CD** (pas de `.husky/`, pas de `.github/workflows/`, scripts `test`/`test:e2e` absents de `package.json`) → régression de type s33 commit `1da2d78` peut se reproduire ; (3) **Régression issue #4 (lightbox Esc) et issue #5 (cleanup setError sur unmount)** non couvertes par tests automatisés. Reality check **VISUEL** quasi-absent (snapshots E2E s22/s23/s27/s28 figés sur sessions passées, pas de baseline pixel-diff bloquante en CI).

## 2. Couverture Vitest par composant

| Composant / module | Tests présents | Qualité couverture |
|---|---|---|
| `RoomCanvas.tsx` (Étape 3 placement) | Indirect via `drag-lot-polygon-*`, `polygon-resolver`, `wall-graph`, `envelope-polygon`, `zone-validation` | **Bonne** sur logique pure ; render React **non testé** (env node) |
| `RoomPreviewView.tsx` | `room-mini-preview.test.ts` | **Partielle** — preview helpers seulement |
| `VisualGallery.tsx` | Aucun test direct | **NON COUVERT** |
| `VisualCard.tsx` | Aucun test direct | **NON COUVERT** |
| `VisualLightbox.tsx` | Aucun test (Esc, navigation, fermeture) | **NON COUVERT** (issue #4) |
| `RefineVisualDialog.tsx` | `refine-timing.test.ts` (24 cas s33) | **Bonne** sur timing 240s/90s ; UX dialog non testé |
| `ArchitectChatPanel.tsx` | Aucun test direct | **NON COUVERT** |
| `useVisualsStream` (506 L) | Aucun test unit | **NON COUVERT — critique** (SSE + polling) |
| Pipeline IA prompt visuel | `visual-prompt-s33.test.ts` (14 cas) + `segment-prompt`, `coherent-visual-generator`, `normalize-architectural-details` | **Très bonne** — invariants vrais (dealer-confirmed, STRICT RULE 0) |
| `visual-job-runner` | `visual-job-runner.test.ts` | **Bonne** |
| Polygones / segments | `polygon-resolver`, `envelope-polygon`, `wall-graph`, `clustering`, `outline-shrinker`, `label-snap`, `zone-validation` | **Excellente** logique pure |
| API routes `/api/vs/...` | `tests/unit/routes/` (présent dossier) | **À auditer en détail** |

## 3. Couverture Playwright E2E par scénario

| Scénario prod attendu | Test E2E correspondant | Statut |
|---|---|---|
| Pull projet + navigate vers Étape 3 | `s23-etape3-visual-v2.spec.ts`, `rooms-visual.spec.ts` | PRÉSENT (s23) |
| Placer 3 pièces (polygones) | `visuals-step-v2-placement.spec.ts`, `s28-rooms-fix.spec.ts` | PARTIEL (s28) |
| Annoter segments (porte/fenêtre) | Aucun test E2E direct sur annotations segments | **MANQUANT** |
| Naviguer Étape 3 → Étape 4 | `visuals-redirect.spec.ts` | PRÉSENT |
| Génération visuel mock (wizard) | `visuals-step-v2-generation.spec.ts` | PRÉSENT |
| Refine visuel (re-prompt timing 240s) | Aucun E2E — uniquement unit `refine-timing.test.ts` | **MANQUANT E2E** |
| Lightbox ouverture + Esc | Aucun | **MANQUANT** (issue #4) |
| Lightbox navigation prev/next | Aucun | **MANQUANT** |
| Architect chat (conversationnel) | Aucun | **MANQUANT** |
| SSE replay initial / keep-alive | `visuals-step-v2-edge-cases.spec.ts` mention partielle | PARTIEL |
| Polling 4s fallback (s32) | Aucun | **MANQUANT** |
| Multi-étage / multi-lot rendering | `s28-invariants.spec.ts` | PRÉSENT (s28) |
| Reality check visuel pixel-diff | `s22/s23/s27/s28-*.png` snapshots figés | **NON BLOQUANT en CI** |

## 4. Gates G1-G32 statut sur Étape 3+4

| Gate | Description (extrait) | Statut Étape 3+4 |
|---|---|---|
| G1-G5 | Contexte / specs / no-invention | PASS (project-context.md OK) |
| G14 | TypeScript strict 0 erreur | À vérifier `npx tsc --noEmit` (non lancé en read-only) |
| G15 | ESLint 0 erreur | À vérifier (script `lint` présent) |
| G16 | Vitest unit PASS | PRÉSUMÉ PASS (commit `b6f3b58` 460/460) — **non bloqué en CI** |
| G17 | Playwright E2E PASS chemins critiques | **PARTIEL** — refine + lightbox + chat non couverts |
| G18 | Coverage 80% chemins critiques | **NON MESURÉ** (pas de rapport coverage Vitest) |
| G19 | Mutation testing 70% modules critiques | **NON COUVERT** (Stryker absent) |
| G20 | Tests sécurité OWASP | **NON COUVERT** Étape 3+4 (mais outil interne — risque limité) |
| G21 | Tests accessibilité axe-core | **NON COUVERT** |
| G22 | Tests performance Lighthouse | **NON COUVERT** Étape 4 |
| G23 | Tests email | N/A |
| G24 | Tests SEO | N/A (outil interne) |
| G25 | Reality check E2E avant GO PROD | À exécuter avant clôture s33 |
| G26 | Conformité visuelle pixel-diff < 0.5% | **NON BLOQUANT** — snapshots `tests/screenshots/` historiques |
| G27 | Matrice traçabilité user stories ↔ tests | **MANQUANTE** pour Étape 3+4 |
| G28 | Anti-flaky | À vérifier — peu d'historique flaky documenté |
| G29 | Pre-commit hooks | **FAIL** — pas de `.husky/`, pas de hook Vitest |
| G30 | CI/CD bloquante merge | **FAIL** — pas de `.github/workflows/` |
| G31 | Favicon checklist | N/A (outil interne) |
| G32 | Validation tracking-plan | N/A (outil interne, pas d'analytics critique) |

## 5. Tests régression patterns clés

| Pattern | Source learning | Test régression | Statut |
|---|---|---|---|
| **SSE 4 patterns Replit** (replay initial / keep-alive 25s / heartbeat 60s / cleanup abort) | s30 commits SSE | `visuals-step-v2-edge-cases.spec.ts` mention SSE partielle ; **aucun test unit `useVisualsStream`** | **NON COUVERT correctement** |
| **Polling 4s fallback** | s32 (SSE indispo Replit) | Aucun test | **NON COUVERT** |
| **JSONB defensive** (backfill + normalize au load) | s32 | `normalize-architectural-details.test.ts` | PRÉSENT (côté pipeline IA) ; backfill SQL non testé |
| **Multi-context UI `[0]` interdit** | s28 (`firstPlan = plans[0]`) | `s28-invariants.spec.ts`, `s28-rooms-fix.spec.ts`, `s28-rooms-with-plan-bg.spec.ts`, `clustering.test.ts`, `room-mini-preview.test.ts`, `visuals-step-v2-placement.spec.ts` | PRÉSENT (forte couverture s28) |
| **Wire-grep route active v2** | s31 (HOTFIX-2) | Aucun grep automatisé sur `import.*V2` route active | **NON COUVERT** |
| **Mocks Vitest hoisted** | s30 | `vi.hoisted` utilisé dans certains test files | À auditer en revue de code |
| **Audit visuel ≠ numérique** | s28 | Aucun gate auto qui exige audit visuel sur 3 premiers livrables | **NON COUVERT** |

## 6. Tests régression issues s33 fixées

| Issue s33 | Invariant à protéger | Test régression existant | Couverture |
|---|---|---|---|
| #1 Portes mal placées | Tag `(dealer-confirmed, AUTHORITATIVE)` présent dans prompt | `visual-prompt-s33.test.ts` + `segment-prompt.test.ts` | **OUI** (grep PASS) |
| #2 Saisie marchand prioritaire | `architecturalBrief` en tête + `STRICT RULE 0` priorité dealer | `visual-prompt-s33.test.ts` | **OUI** |
| #3 Multi-angles distincts | `anchorPrompt !== secondaryPrompt` ; helper `transformSideToCameraFrame` 4 angles | `visual-prompt-s33.test.ts` | **OUI** (à confirmer 4 angles testés) |
| #4 Zoom preview | Handler clic ouvre lightbox + Esc ferme | **AUCUN test** | **NON COUVERT** — risque régression élevé |
| #5 Refine timeout | 240s + warning 90s + cleanup `setError` sur unmount | `refine-timing.test.ts` (24 cas) | **PARTIEL** — timing OUI ; cleanup `setError` sur unmount à vérifier dans les 24 cas |
| (#6 reportée s34) | — | — | hors scope |

Note : `visual-prompt-s33.test.ts` (14 cas) et `refine-timing.test.ts` (24 cas) sont les **bons gardiens** des invariants pipeline IA et timing. À conserver tels quels.

## 7. Recommandations s34 prioritisées

| # | Priorité | Recommandation | Effort estimé |
|---|---|---|---|
| 1 | **P0** | **Pre-commit Vitest + scripts `test`/`test:e2e` dans `package.json`** + `.husky/pre-commit` qui lance `npx vitest run` (cf. fix `20b98da` à propager). Promote pattern `pre-commit-vitest-manquant` en règle P1 dans lessons-learned | 30 min |
| 2 | **P0** | **Tests unit `useVisualsStream`** : 4 patterns SSE (replay/keep-alive 25s/heartbeat 60s/cleanup abort) + polling 4s fallback. Mock `EventSource` + timers. Cible 12-16 cas | 3 h |
| 3 | **P0** | **Test E2E lightbox issue #4** : ouvrir Étape 4 → cliquer card → assert lightbox visible → Esc → assert fermé. Inclure navigation prev/next | 1 h |
| 4 | **P1** | **CI/CD GitHub Actions** : workflow `.github/workflows/test.yml` lint + tsc + vitest + playwright bloquant merge. Branch protection main | 1 h |
| 5 | **P1** | **Reality check VISUEL pixel-diff bloquant** : 1 baseline approuvée par parcours critique Étape 3 + Étape 4 dans `tests/screenshots/`, comparaison < 0.5% en CI (gate G26). Lecture visuelle Read() obligatoire dans handoff @qa | 2 h |
| 6 | **P2** | Matrice traçabilité user stories Étape 3+4 dans `docs/qa/TESTING.md` (gate G27) + axe-core dans E2E placement + génération | 2 h |
| 7 | **P2** | Wire-grep automatisé : script CI qui assert `grep -rn "VisualGalleryV2\|RoomCanvasV2" src/app/.../page.tsx` ≥ 1 ligne (anti régression s31) | 30 min |

## 8. Risques résiduels

- **Pipeline IA réel vs mock** : `visual-prompt-s33.test.ts` valide la STRUCTURE du prompt mais pas le rendu IA réel. Risque s28 (mock divergent du réel) toujours actif si dataset de mock pas régulièrement comparé aux sorties OpenAI prod. **Mitigation** : 1 audit visuel humain sur 3 premiers livrables s34 avant industrialisation.
- **SSE testable hors prod ?** : `useVisualsStream` dépend de `EventSource` browser + comportement Replit (proxy buffering, timeout 60s). Tests unit avec `EventSource` mocké couvrent les patterns code-level mais **pas le comportement réseau réel**. Reality check E2E sur Replit prod requis avant GO PRODUCTION (gate G25).
- **Reality check VISUEL pixel-près** : critères « 10/10 » Thomas (PRO, BEAU, BRAND-ALIGNED, etc.) non automatisables. Screenshots `tests/screenshots/` actuels = sessions s22-s28 figées, **non rafraîchies depuis refonte s30-s32**. Risque : pixel-diff PASS sur baselines obsolètes alors que UI a changé. Action s34 : régénérer baselines Étape 3+4 + lecture visuelle @qa via `Read()`.
- **Concurrent modification** Étape 4 : 2 onglets ouvrent même projet → refine simultané → quel comportement ? Non testé, non documenté.
- **Cleanup `setError` sur unmount** issue #5 : 24 cas `refine-timing.test.ts` valident les timings, mais l'invariant « pas de setState après unmount » nécessite test React Testing Library (env jsdom) — actuellement env node. À ajouter en s34 P0.
- **Dataset adversarial** absent pour annotations segments (caractères spéciaux dans labels, segments à longueur 0, polygones dégénérés) — tests existants utilisent fixtures « propres ».

---

**Handoff → @orchestrator**
- Fichier produit : `/home/user/Versi/docs/qa/s33-audit-qa-etape3-4.md`
- Verdict : 6/10 — fondations Vitest solides sur logique pure ; CI/CD + pre-commit ABSENTS (gate G29/G30 FAIL) ; `useVisualsStream` non testé (critique s30/s32) ; lightbox issue #4 sans régression
- Top 3 trous critiques : (1) pre-commit Vitest + CI GitHub Actions absents ; (2) `useVisualsStream` 506 L jamais testé (SSE 4 patterns + polling 4s) ; (3) régressions issue #4 lightbox + cleanup unmount issue #5 non automatisées
- Top 5 effort fix : ~7 h cumul (P0 = 4h30 ; P1 = 3h)
- Tests existants `visual-prompt-s33.test.ts` (14 cas) et `refine-timing.test.ts` (24 cas) à CONSERVER tels quels — bons gardiens
- Pattern à propager P1 : `pre-commit-vitest-manquant` (s33 commit `1da2d78` régression silencieuse, fix `20b98da`)
- Toutes les validations ci-dessus sont `[STATIQUE]` (Grep/Read uniquement) — aucun `vitest run` ni `playwright test` exécuté en mode read-only
