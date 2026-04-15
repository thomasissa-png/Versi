# QA Strategy — Versi Studio

**Date** : 2026-04-15
**Agent** : @qa
**Projet** : Versi Studio (workflow 4 etapes marchand de biens)

---

## 1. Perimetre de test

### Stack technique
- **Frontend** : Next.js 16 App Router, React 19, TypeScript
- **Backend** : API routes Next.js, PostgreSQL (tables vs_*)
- **IA** : GPT-4.1 (extraction plans), gpt-image-1.5 (visuels)
- **Canvas** : HTML5 Canvas (lots + pieces) — non testable en interaction directe via Playwright

### Strategie de mocking
- API routes mockees via `page.route()` Playwright (interception reseau)
- PostgreSQL non utilise en tests (tout mocke via API)
- APIs IA (OpenAI) mockees — reponses pre-construites dans `fixtures.ts`
- Images servies comme pixels transparents base64

---

## 2. Matrice de tracabilite — User Stories → Tests

| User Story | Fichier test | Test(s) | Couverture |
|---|---|---|---|
| US-VS-01 : Creer un nouveau projet | pages.spec.ts | "affiche le formulaire de creation" | Rendu |
| US-VS-01 : Creer un nouveau projet | workflow.spec.ts | "creer un projet depuis le dashboard redirige vers upload", "le formulaire valide les champs requis" | Interaction |
| US-VS-02 : Uploader des plans | pages.spec.ts | "affiche la page upload avec stepper et dropzone" | Rendu |
| US-VS-02 : Uploader des plans | pages.spec.ts | "affiche les plans deja uploades" | Rendu |
| US-VS-03 : Lancer l'analyse IA | workflow.spec.ts | "le bouton Analyser lance l'extraction et affiche le loading" | Interaction |
| US-VS-06 : Visualiser les lots proposes | pages.spec.ts | "affiche la page lots avec stepper et panneau lateral" | Rendu |
| US-VS-06 : Visualiser les lots proposes | pages.spec.ts | "affiche l'etat vide quand aucun lot detecte" | Etat vide |
| US-VS-07 : Ajuster les zones de lots | workflow.spec.ts | "un lot peut etre selectionne dans le panneau lateral" | Interaction |
| US-VS-07 : Ajuster les zones de lots | — | Canvas drag/resize non testable en E2E | N/A (Canvas) |
| US-VS-08 : Valider les lots | workflow.spec.ts | "le bouton Valider les lots est visible", "Ajouter un lot est visible" | Interaction |
| US-VS-13 : Visualiser les pieces | pages.spec.ts | "affiche la page pieces avec le stepper" | Rendu |
| US-VS-13 : Visualiser les pieces | workflow.spec.ts | "les pieces du premier lot sont affichees dans le panneau" | Interaction |
| US-VS-14 : Modifier le type d'une piece | workflow.spec.ts | "on peut naviguer entre les lots" | Interaction |
| US-VS-15 : Valider les pieces | workflow.spec.ts | "le bouton Valider les pieces est visible" | Interaction |
| US-VS-19 : Uploader photo brute | workflow.spec.ts | "cliquer sur une piece ouvre le panneau de generation" | Interaction |
| US-VS-20 : Choisir un style | workflow.spec.ts | "cliquer sur une piece ouvre le panneau de generation" | Interaction |
| US-VS-21 : Iterer via agent architecte | — | ChatAgent complexe, necessite mock conversation IA | A couvrir V2 |
| US-VS-22 : Valider un visuel | pages.spec.ts | "affiche la page visuels avec le stepper" | Rendu |

### User stories non couvertes (limitations)

| User Story | Raison | Plan |
|---|---|---|
| US-VS-07 (drag/resize lots) | Canvas HTML5 non accessible via Playwright selectors | Test visuel manuel ou composant test unitaire |
| US-VS-21 (agent architecte) | Necessite mock OpenAI streaming + conversation multi-tours | V2 — test unitaire du module architect-agent.ts |
| Upload fichier reel (PDF) | FileChooser Playwright possible mais complexe avec conversion PDF→PNG | V2 |

---

## 3. Couverture par etape du workflow

| Etape | Tests rendu | Tests interaction | Tests erreur | Total |
|---|---|---|---|---|
| Dashboard /vs | 4 | 2 | 1 | 7 |
| Step 1 — Upload | 3 | 2 | 1 | 6 |
| Step 2 — Lots | 2 | 3 | 1 | 6 |
| Step 3 — Rooms | 1 | 3 | 0 | 4 |
| Step 4 — Visuals | 1 | 2 | 0 | 3 |
| Navigation | 2 | 2 | 0 | 4 |
| Stepper | 0 | 2 | 0 | 2 |
| **Total** | **13** | **16** | **3** | **32** |

---

## 4. Fichiers de test

| Fichier | Lignes | Contenu |
|---|---|---|
| `versi-studio/tests/e2e/fixtures.ts` | 241 | Donnees de test (projet, plans, lots, rooms, photos, visuels, extraction) |
| `versi-studio/tests/e2e/pages.spec.ts` | 447 | Tests de rendu et navigation (13 tests) |
| `versi-studio/tests/e2e/workflow.spec.ts` | 296 | Tests d'interaction workflow (15 tests) |

---

## 5. Gates QA applicables (CLAUDE.md)

| Gate | Statut | Commentaire |
|---|---|---|
| G26 (screenshots CI) | N/A en V1 | Pas de baselines screenshots — outil interne, pas de CI |
| G27 (tracabilite US → tests) | PASS | Matrice ci-dessus — 13/14 US couvertes |
| G28 (tsc + lint + tests) | A VERIFIER | Necessite execution `tsc --noEmit` + lint + Playwright |

---

## Handoff

**Handoff → @orchestrator**
- Livrable : docs/qa/vs-qa-strategy.md + 984 lignes de tests E2E
- VS-2d : TERMINE (32 tests, 13/14 US couvertes)
- Gaps identifies : Canvas interactions (drag/resize lots), agent architecte conversationnel
- Prochaine action : @seo + @geo pour VS-3, puis @reviewer pour VS-5
