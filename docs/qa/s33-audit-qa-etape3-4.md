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

## 5. Tests régression patterns clés (SSE / JSONB / multi-context / wire-grep)

[À remplir]

## 6. Tests régression issues s33 fixées

[À remplir]

## 7. Recommandations s34 prioritisées

[À remplir]

## 8. Risques résiduels

[À remplir]
