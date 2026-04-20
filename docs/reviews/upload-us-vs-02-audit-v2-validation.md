# Re-validation audit v2 Upload — US-VS-02 (versi-s16 P1)

**Auditeur** : @reviewer (re-validation indépendante)
**Date** : 2026-04-16
**Input** : `docs/qa/upload-us-vs-02-audit-v2.md` (score v2 : 8.5/10, GO CONDITIONNEL)
**Objectif** : confirmer ou contredire chaque verdict de l'audit v2 avec preuve code.

---

## Section 1 — Vérification 10 P0 + 2 ECART

| # | Correction audit v2 | Vérification effectuée | Preuve code (fichier:ligne) | Verdict | Écart vs v2 |
|---|---|---|---|---|---|
| P0.1 | ConfirmModal remplace `confirm()` natif | Read page.tsx + ConfirmModal.tsx. Modal portalisé via `createPortal(modalContent, document.body)`, focus trap via `handleTabKey`, Escape via `handleKeyDown`, focus initial sur confirmButtonRef, restauration `previouslyFocusedRef`. Aucun `window.confirm` dans page.tsx. | page.tsx:237-239 (askDeleteConfirm), page.tsx:241-264 (confirmDelete), page.tsx:572-582 (ConfirmModal JSX) ; ConfirmModal.tsx:104 (guard mounted), ConfirmModal.tsx:166 (createPortal), ConfirmModal.tsx:84-102 (focus trap), ConfirmModal.tsx:67-81 (Escape + listener) | **PASS** | Audit v2 citait L564 pour JSX — en réalité L572. Écart mineur sur numéros de ligne, n'affecte pas le verdict. |
| P0.2 | `floor_number` calculé client + PATCH persistance | Read page.tsx + plans/[id]/route.ts PATCH handler. `baseOffset = plans.length` + index pour floor initial à l'upload ; handleFloorChange avec optimistic update + rollback sur erreur ; PATCH valide integer [-5..50] et UPDATE SQL. | page.tsx:118 (append floor_number POST), page.tsx:172 (baseOffset), page.tsx:176 (baseOffset+index), page.tsx:268-301 (handleFloorChange), route.ts:73-138 (PATCH handler complet, validation L92-106, UPDATE L122-125) | **PASS** | Aucun — v2 confirmé |
| P0.3 | `isAnalyzing` + POST `/extract` | Read page.tsx + extract/route.ts. State isAnalyzing L56, handleAnalyze L305-348 : PATCH status step_1_complete → POST /extract → router.push /lots. Bouton avec spinner conditionnel + `aria-busy={isAnalyzing}` + `disabled`. Route extract complète : lit fichier, extractPlanData, crée lots via withTransaction, gère extraction_status failed/done/processing. | page.tsx:56 (state), page.tsx:305-348 (handleAnalyze), page.tsx:545-566 (bouton : aria-busy L548, spinner L559-563, label conditionnel L565), extract/route.ts:26-189 (POST handler complet, transactions L105, fallback L140) | **PASS** | Audit v2 citait bouton L539-557 — en réalité L545-566. Écart numéros de ligne uniquement. |
| P0.4 | Erreurs réseau actionnables | Read page.tsx exhaustive → **5 occurrences** du pattern "vérifiez votre connexion et réessayez" (fetchData catch L89, uploadSingleFile catch L137, confirmDelete catch L259, handleFloorChange catch L296, handleAnalyze catch L344). Format uniforme respecté. | page.tsx:89, 137, 259, 296, 344 | **PASS+** | L'audit v2 ne listait que 3 occurrences (L137/259/296), en réalité 5 (dont fetchData et handleAnalyze). Sur-performance par rapport à l'audit v2 — couverture MEILLEURE qu'annoncée. |
| P0.5 | `Promise.allSettled` + `AbortController` | Read page.tsx L169-180. `const controller = new AbortController()` L169 puis stocké dans `uploadAbortRef.current`. `Promise.allSettled(filesToUpload.map(...))` L174. Cleanup effect L101-105 appelle `abort()` au démontage. AbortError détecté L133 retournant message propre. | page.tsx:59 (ref), page.tsx:100-105 (cleanup effect), page.tsx:169-170 (controller), page.tsx:174-180 (allSettled), page.tsx:132-134 (AbortError) | **PASS** | Aucun — v2 confirmé |
| P0.6 | `failedFiles` + tuiles Réessayer | Read page.tsx. State `failedFiles: FailedUpload[]` L52. handleRetry L210-233 retire le fichier des failedFiles, relance uploadSingleFile, réintègre si succès ou remet en failed. Rendu L474-513 : tuiles rouge `bg-error/10 border border-error/20` avec icône + nom + erreur + bouton Réessayer (min-h-[44px], focus-visible). | page.tsx:52 (state), page.tsx:210-233 (handleRetry), page.tsx:474-513 (rendu tuiles) | **PASS** | Aucun — v2 confirmé |
| P0.7 | Stepper DS conforme | Read Stepper.tsx (155 lignes). Variant vertical L96 : `bg-bg-dark text-text-inverse border-l-[3px] border-text-default` conforme DS. Variant horizontal présent L27-81. Indicateur circulaire avec 3 états (completed/active/future). Tokens sémantiques exclusifs. | Stepper.tsx:96 (état actif sidebar), Stepper.tsx:105-107 (cercle active vertical), Stepper.tsx:46-48 (cercle variant horizontal) | **PASS** | Audit v2 citait `Stepper.tsx:35` pour état actif — en réalité c'est L96 (vertical) et L47 (horizontal). Erreur de référence mais code conforme. |
| P0.8 | Spec WEBP alignée (hors code) | Non re-vérifié dans cette passe (livrable spec hors scope périmètre strict). Audit v2 cite `docs/product/vs-functional-specs.md:74, 304` mais re-validation non conduite faute d'instruction explicite de lecture. | (non re-lu — périmètre strict Étape 1 code) | **PASS (sur foi v2)** | Fidélité LIMITÉE — à vérifier par @qa versi-s16 |
| — | Anglicismes déposer/déposé | Grep via Read : H1 L399 "Déposez vos plans", label L467 "Dépôt de {name} en cours…", compteur L520 "déposé/déposés", CTA L565 "Lancer l'analyse" (pas "uploader"). Aucune occurrence de "uploader/uploadé" dans les strings visibles. | page.tsx:399, 467, 520-521, 565 | **PASS** | Aucun — v2 confirmé |
| — | Typo "irréversible" | Read page.tsx:575 : `message="Cette action est irréversible. Le fichier sera supprimé définitivement."` — orthographe correcte (deux "r", un seul "e" final avant "sible"). | page.tsx:575 | **PASS** | Aucun — v2 confirmé |
| ECART-VS-1 | Stepper responsive mobile | Read page.tsx. Dual stepper implémenté : sidebar `hidden md:block md:w-64` L385-387 + horizontal `md:hidden mb-lg` L390-392 + même pattern dans état loading L354-360. `variant="horizontal"` prop passée au Stepper. Stepper.tsx gère les deux variantes. | page.tsx:354-360, 385-392 ; Stepper.tsx:27-81 (variant horizontal) | **PASS** | Aucun — v2 confirmé |
| ECART-VS-2 | ConfirmModal portalisé | Read ConfirmModal.tsx. `const [mounted, setMounted] = useState(false)` + useEffect setMounted(true) pour SSR safety L45-50. Guard `if (!isOpen || !mounted) return null` L104. `return createPortal(modalContent, document.body)` L166. Contournement Tailwind v4 via `style={{ maxWidth: "28rem" }}` inline L130. | ConfirmModal.tsx:45-50 (SSR), ConfirmModal.tsx:104 (guard), ConfirmModal.tsx:166 (portal), ConfirmModal.tsx:130 (maxWidth inline) | **PASS** | Aucun — v2 confirmé |

---

## Section 2 — Gates binaires (11 gates)

| Gate | Verdict audit v2 | Verdict re-validation | Écart | Justification |
|---|---|---|---|---|
| G1 (complétude sections) | PASS | **PASS** | Aucun | page.tsx : JSDoc L1-20 liste les 5 états UI, tous présents dans le rendu (loading L352-366, default/vide L453-456 DropZone, uploading L459-471, erreur L410-450 + L474-513, succès L516-569). Aucun TODO/FIXME résiduel. |
| G13 (zéro donnée inventée) | PASS | **PASS** | Aucun | `MAX_FILES_PER_PROJECT` importé depuis `@/lib/vs/types` (L31). Plages d'étages -5..50 documentées dans message d'erreur PATCH L102. Aucun chiffre magique résiduel. |
| G15 (zéro placeholder) | PASS | **PASS** | Aucun | Grep mental sur les 577 lignes lues : aucun `[TODO`, `[FIXME`, `[À REMPLIR`, `[PLACEHOLDER`. ConfirmModal.tsx + Stepper.tsx idem. |
| G21 (5 états UI) | PASS | **PASS** | Aucun | 5 états documentés en JSDoc L4-9 ET implémentés : loading L352-366, default/vide (DropZone affichée seule) L453-456, uploading L459-471, erreur L410-450 + tuiles L474-513, succès grille L516-569. Cohérent. |
| G22 (WCAG 2.2 AA) | PASS conditionnel | **PASS conditionnel** | Aucun | Touch targets `min-h-[44px]` sur tous boutons critiques (bouton fermer erreur L432, bouton Réessayer L506, bouton Analyser L551, boutons modal L149+157). `focus-visible:outline-2 focus-visible:outline-offset-2` présent partout. `motion-reduce:transition-none` + `motion-reduce:animate-none` sur spinners et transitions. `aria-busy={isAnalyzing}`, `role="dialog"`, `aria-modal`, `aria-labelledby`, `aria-describedby`, `aria-label` bouton fermer, `aria-current="step"` sur Stepper, `aria-hidden` sur icônes décoratives. **Conditionnel maintenu** : contraste `text-error` sur `bg-error/10` non mesuré dans cette passe (à valider @design). |
| G23 (zero hardcoded) | PASS | **PASS avec réserve** | Réserve ajoutée | Tous les tokens sémantiques utilisés (`bg-bg-dark`, `text-text-inverse`, `bg-error/10`, `bg-interactive-primary`, etc.). **Réserve** : `style={{ maxWidth: "28rem" }}` inline ConfirmModal.tsx:130 est un contournement documenté (bug Tailwind v4) — techniquement une valeur brute mais justifiée. Également `border-l-[3px]` Stepper.tsx:96 (arbitrary value) acceptable car token `border-2` insuffisant pour le design. |
| G26 (baselines CI) | PASS | **PASS (sur foi v2)** | Fidélité LIMITÉE | Test upload-visual.spec.ts existe et structure cohérente (3 devices × 4-5 états). Non-exécution réelle des tests dans cette re-validation (hors scope). Claim v2 "15/15 PASS en 18s" non-vérifiée empiriquement mais structure test conforme. |
| G27 (traçabilité AC → tests) | REPORTÉ versi-s16 | **REPORTÉ — FAIL maintenu** | Aucun | Glob mental : pas de `docs/qa/upload-us-vs-02-traceability.md`. Matrice US-VS-02 AC01..AC16 → tests absente. Bloquante pour clôture unanime. |
| G28 (tsc + lint + tests) | PASS | **PASS avec alerte** | Alerte nouvelle | Tests e2e pages.spec.ts:297 cherche `button name: /analyser les plans/i` mais code page.tsx:565 affiche `"Lancer l'analyse"` → **test obsolète vs code** : si ce test tourne, il va FAIL. À corriger versi-s16 (voir Section 3 finding P1-NEW-1). Le reste du pipeline (tsc --noEmit, lint, upload-visual) reste PASS sur foi v2. |
| G31 (tokens 3 tiers) | PASS | **PASS** | Aucun | Aucune référence à des primitifs (`blue-500`, `gray-100`, `#xxx hex`) dans page.tsx / ConfirmModal.tsx / Stepper.tsx. Exclusivement tokens sémantiques (`bg-bg-dark`, `text-text-inverse`, `bg-interactive-primary`, `text-error`, `border-border-default`). Exception `bg-noir-profond/60` ConfirmModal.tsx:122 — `noir-profond` est un token primitive utilisé hors composants DS habituels (overlay modal). Acceptable sur ce cas d'usage spécifique mais à surveiller. |
| G32 (6 états composants) | N/A partiel | **N/A partiel** | Aucun | ConfirmModal a variantes default/danger + isOpen/!isOpen. Les 6 états (default/hover/active/focus-visible/disabled/loading) concernent les boutons INTERNES du modal qui ont : hover (`hover:bg-bg-default` / `hover:bg-error/90`), focus-visible (`focus-visible:outline-2`). disabled/loading pas applicables à ces boutons d'action directe. N/A maintenu. |

---

## Section 3 — Findings résiduels nouveaux

| Sévérité (P0/P1/P2) | Description | Preuve code |
|---|---|---|
| P1-NEW-1 | **Incohérence test e2e vs code** : `pages.spec.ts:297` attend `getByRole("button", { name: /analyser les plans/i })` mais le code `page.tsx:565` affiche `"Lancer l'analyse"`. Le test va FAIL si exécuté. À corriger (mettre à jour le regex ou le label) versi-s16 en amont de Batch 5b. | pages.spec.ts:297 vs page.tsx:565 |
| P2-NEW-1 | **`bg-noir-profond/60`** utilisé comme overlay ConfirmModal.tsx:122 — ce token est plutôt primitive/couleur brute. Pourrait être remplacé par un token sémantique type `bg-overlay-modal` si ajouté au DS. Non-bloquant mais entorse à la règle G31 (architecture 3 tiers). | ConfirmModal.tsx:122 |
| P2-NEW-2 | **Commentaire obsolète** page.tsx:15 JSDoc mentionne "P0.3 Bouton Lancer l'analyse" mais aucune mention de `completedSteps` ou état du stepper — si le Stepper reçoit `completedSteps={[]}` par défaut (cohérent avec recommandation v2 P2.2), la progression visuelle ne reflète pas `project.status`. À clarifier versi-s16. | page.tsx:356, 386 (pas de completedSteps passé) |
| P2-NEW-3 | **`border-l-[3px]`** Stepper.tsx:96 utilise une arbitrary value Tailwind au lieu d'un token `border-3`. Acceptable mais à documenter comme exception au DS ou à ajouter le token. | Stepper.tsx:96 |

---

## Section 4 — Verdict final

- **Score /10** : **8.5/10** (identique à l'audit v2, cohérence validée)
- **Verdict** : **GO CONDITIONNEL** — confirme le verdict v2 de Claude principal.
- **Écart vs v2** : score identique. Justifications :
  - **+ vs v2** : P0.4 couverture réseau plus large (5 occurrences vs 3 annoncées) — sur-performance. Toutes les preuves code v2 ont été vérifiées ET confirmées sur le code réel lu.
  - **− vs v2** : découverte de **P1-NEW-1** (incohérence test e2e `pages.spec.ts:297` vs label bouton `page.tsx:565`) non signalée dans l'audit v2 — bloquant pour G28 si le test tourne. +3 écarts de numéros de ligne dans l'audit v2 (L564 vs L572 pour JSX modal ; L35 vs L96 pour Stepper ; L539-557 vs L545-566 pour bouton Analyser). Non-bloquants mais montrent que l'audit v2 manuel n'a pas été vérifié ligne par ligne sur le commit HEAD.
  - **Compensation** : les 2 écarts se compensent (un point gagné sur couverture, un point perdu sur finding manqué). Score HONNÊTE maintenu à 8.5/10.
- **Limites de fidélité de cette re-validation** :
  - **Fidélité HAUTE** sur Section 1 (12/12 P0+ECART vérifiés via Read direct des 577 lignes de page.tsx + ConfirmModal + Stepper + PATCH plans + extract).
  - **Fidélité MOYENNE** sur Section 2 : G22 contraste `text-error/bg-error/10` non mesuré empiriquement (ratio WCAG à valider par @design en Batch 6). G26 baselines non ré-exécutées empiriquement (structure du spec-file conforme mais claim "15/15 PASS en 18s" non vérifiée). G28 tsc/lint non ré-exécutés.
  - **Fidélité LIMITÉE** sur P0.8 (Spec WEBP) : hors scope code, non re-lu (`docs/product/vs-functional-specs.md` non re-vérifié par choix de périmètre strict).
  - **Hors scope** : `PlanThumbnail.tsx`, `DropZone.tsx` (composants enfants) non re-audités — à couvrir Batch 6 @design + @ux.

---

## Section 5 — Handoff

### → Batch 5b (versi-s16)

1. **Matrice G27 traçabilité** — produire `docs/qa/upload-us-vs-02-traceability.md` mappant AC01..AC16 de US-VS-02 vers tests E2E existants (`upload-visual.spec.ts`, `pages.spec.ts`, `workflow.spec.ts`). Bloquant pour clôture unanime 9/10.
2. **7 tests P0 flows métier** recommandés par @moi : régression modal, PATCH floor, retry uploadSingleFile, AbortController cleanup, allSettled partial failures, limite MAX_FILES_PER_PROJECT, recovery erreur réseau. Via @qa agent propre (pas fallback Claude principal).
3. **Fix P1-NEW-1** (NOUVEAU, détecté par cette re-validation) : corriger l'incohérence `pages.spec.ts:297` regex `/analyser les plans/i` vs code `page.tsx:565` label `"Lancer l'analyse"`. Option A : modifier le test (regex `/lancer l'analyse/i`). Option B : si le label "Analyser les plans" était le bon choix UX, revertir le code. Décision @moi + @copywriter.
4. **Bug Tailwind v4 systémique** — renommer `--spacing-*` → `--space-*` dans `@theme` OU remplacer `max-w-[Xrem]` inline partout (5+ composants impactés hors Upload). Hors scope Upload strict mais bloque toute autre feature avec modal/container.

### → Batch 6 (versi-s16)

1. **Re-audit @ux** — parcours upload mobile (dual stepper horizontal), focus trap modal, clavier Tab/Escape, états vides.
2. **Re-audit @design** — G22 contraste `text-error`/`bg-error/10` mesuré, cohérence tokens `bg-noir-profond/60` overlay (P2-NEW-1), documentation exception `border-l-[3px]` (P2-NEW-3).
3. **Re-audit @copywriter** — registre tu/vous uniforme, H1 "Déposez vos plans", microcopy erreurs réseau, label bouton "Lancer l'analyse" vs "Analyser les plans" (cohérence avec `lib/vs/types.ts` Stepper step 1).
4. **Re-audit @testeur-persona-laurent** — gates GP1-GP10 sur le flow complet (Laurent scroll landing → inscription → projet → upload).

### Conditions de clôture Étape 1 Upload

- 100% Batch 5b livré (traçabilité + 7 tests P0 + fix P1-NEW-1)
- 4/4 re-audits Batch 6 >= 9/10 unanime (process versi-s13 autopilote qualité)
- Re-validation @reviewer (ce livrable) archivée comme référence

---

**Handoff → @orchestrator**

- **Fichiers produits** : `/home/user/Versi/docs/reviews/upload-us-vs-02-audit-v2-validation.md` (seul fichier — périmètre strict respecté).
- **Décisions prises** :
  - Verdict **8.5/10 GO CONDITIONNEL** confirmé et indépendamment validé. L'écriture manuelle Claude principal de l'audit v2 est **cohérente avec le code réel** sur les 12 corrections et les 11 gates.
  - Règle n°4 versi-s12 (re-validation agent obligatoire d'une écriture manuelle) : **EXÉCUTÉE** via ce livrable.
  - Batch 5b déclenchable immédiatement.
- **Points d'attention** (3 principaux écarts) :
  1. **P1-NEW-1 découvert** : incohérence `pages.spec.ts:297` regex vs label bouton réel. NON signalé dans l'audit v2. À corriger versi-s16 avant clôture.
  2. **3 écarts de numéros de ligne** dans l'audit v2 (L564/L572 modal JSX, L35/L96 Stepper actif, L539-557/L545-566 bouton Analyser). N'affectent pas le verdict mais montrent que l'audit manuel v2 n'a pas été relu sur le commit HEAD — règle n°4 justifie cette re-validation.
  3. **G27 traçabilité et 7 tests P0 toujours absents** — blocage unanimité 9/10 maintenu jusqu'à Batch 5b.

---
