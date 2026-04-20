# Cross-review global workflow Versi Studio Étapes 1→4 — s20 (Chemin A P0.2)

Date : 2026-04-16
Reviewer : @reviewer
Périmètre : tous livrables `docs/` + code `versi-studio/src/` modifiés depuis 2026-04-15 (post-vs-cross-review.md)
Mode : cross-review global 34 gates G1-G34

## Synthèse exécutive

**Verdict global : GO CONDITIONNEL**. Workflow Versi Studio Étapes 1→4 cohérent, les 4 FAIL BLOQUANT de la review précédente (vs-cross-review.md, 2026-04-15) sont tous corrigés (G7 Next.js 16 aligné, G5 Thomas cité dans design-system et qa-strategy). **0 FAIL BLOQUANT neuf** détecté sur code et specs en production. **3 FAIL REQUIS** à corriger : (1) `vs-ux-writing.md` ligne 41/60/70/92/100/221/364-394 contient 11 anglicismes "Upload*" en position UI sublabel/états vides alors que le code a été corrigé vers "déposer/déposé" — **contradiction doc-vs-impl G7**, (2) `vs-functional-specs.md` ligne 902 nomme US-VS-19 avec "Uploader la photo brute" — nommage US à aligner, (3) G26 baselines Étape 4 Visuels inexistantes (`tests/screenshots/visuals/` vide) — décision scope @moi versi-s17 "boucle visuelle différée par BUNDLE" documentée, mais à réactiver avant merge production.

**Synthèse non-technique (fondateur)** : le workflow complet tient la route. Les 4 étapes (Upload → Lots → Pièces → Visuels) sont cohérentes : mêmes tokens, mêmes patterns, même vouvoiement, zéro contradiction entre les pages. Le code a été nettoyé des anglicismes ("uploader" → "déposer"), mais un vieux guide UX-writing et un titre de spec n'ont pas été mis à jour — c'est de la doc obsolète, pas un défaut produit. Il manque les screenshots de référence pour l'Étape 4 Visuels (les 3 premières étapes sont couvertes), à planifier avant mise en prod.

## Verdict par livrable

| Livrable | G BLOQUANT FAIL | G REQUIS FAIL | Verdict | Priorité fix |
|---|---|---|---|---|
| `docs/product/vs-spec-f05-surface-m2-temps-reel.md` | 0 | 0 | GO | — |
| `docs/ia/recherche-faisabilite-ocr-plan-v2.md` | 0 | 0 | GO | — |
| `docs/reviews/moi-gate-visuals-us-vs-19-22.md` | 0 | 0 | GO | — |
| `docs/reviews/moi-gate-rooms-us-vs-13-15.md` | 0 | 0 | GO | — |
| `docs/reviews/moi-lots-us-vs-06-08-gate-v1.md` | 0 | 0 | GO | — |
| `docs/copy/vs-ux-writing.md` | 0 | 2 (G7 contradiction code, G33 anglicismes doc) | GO CONDITIONNEL | P1 |
| `docs/product/vs-functional-specs.md` | 0 | 1 (G33 titre US-VS-19 "Uploader") | GO CONDITIONNEL | P1 |
| `docs/qa/vs-qa-strategy.md` | 0 | 1 (G33 matrice ligne 44 "Uploader photo brute") | GO CONDITIONNEL | P1 |
| `docs/design/vs-design-system.md` | 0 | 0 | GO | — |
| `docs/qa/visual-regression-bundle.md` | 0 | 1 (G26 Étape 4 hors bundle — décision @moi) | GO CONDITIONNEL | P2 |
| `versi-studio/src/app/**/*.tsx` (code) | 0 | 0 | GO | — |
| `versi-studio/src/app/api/vs/**/*.ts` (API) | 0 | 0 | GO | — |
| `versi-studio/src/app/globals.css` (G34) | 0 | 0 | GO | — |
| `versi-studio/src/components/vs/**/*.tsx` | 0 | 0 | GO | — |

**Total : 0 FAIL BLOQUANT / 5 FAIL REQUIS (dont 4 sont des docs obsolètes avec impact zéro sur le produit livré)**

## Détails des FAIL détectées

### BLOQUANT

| Gate | Fichier:ligne | Extrait problématique | Correction obligatoire | Owner |
|---|---|---|---|---|

*Aucune gate BLOQUANT en FAIL.*

### REQUIS

| Gate | Fichier:ligne | Extrait problématique | Correction recommandée | Owner |
|---|---|---|---|---|
| G7 + G33 | `docs/copy/vs-ux-writing.md:41` | Sous-label Stepper "Uploadez vos plans" (code a "Déposez vos plans" dans `src/lib/vs/types.ts:186`) | Remplacer "Uploadez vos plans" → "Déposez vos plans" (aligner sur `STEPS[0].description`) | @copywriter |
| G33 | `docs/copy/vs-ux-writing.md:60` | Bloc citation "> Uploadez vos plans" (duplication de la ligne 41) | Remplacer "Uploadez" → "Déposez" | @copywriter |
| G33 | `docs/copy/vs-ux-writing.md:70` | "> Relâchez pour uploader" (dropzone drag-over) | Remplacer "uploader" → "déposer" | @copywriter |
| G33 | `docs/copy/vs-ux-writing.md:92` | Table "Plan uploadé. Lancer l'analyse quand vous êtes prêt." | Remplacer "uploadé" → "déposé" | @copywriter |
| G33 | `docs/copy/vs-ux-writing.md:100` | Table "Uploadez un PDF, JPG ou PNG." | Remplacer "Uploadez" → "Déposez" | @copywriter |
| G33 | `docs/copy/vs-ux-writing.md:221` | "Pour chaque pièce, uploadez une photo du chantier." | Remplacer "uploadez" → "déposez" | @copywriter |
| G33 | `docs/copy/vs-ux-writing.md:364-394` | "Aucun plan uploadé", "Uploader un plan", "Aucune photo uploadée", "Uploadez une photo", "Uploader une photo", "Photo uploadée" (6 occurrences) | Remplacer systématique "uploadé/Uploadez/Uploader" → "déposé/Déposez/Déposer" | @copywriter |
| G33 | `docs/product/vs-functional-specs.md:902` | Titre "US-VS-19 : Uploader la photo brute d'une pièce" | Renommer US : "US-VS-19 : Déposer la photo brute d'une pièce" (spec interne mais le code user-facing utilise déjà "Déposer") | @product-manager |
| G33 | `docs/product/vs-functional-specs.md:1454` | Table "Upload photo brute — US-VS-19 — OK" | Remplacer "Upload photo brute" → "Dépôt photo brute" | @product-manager |
| G33 | `docs/qa/vs-qa-strategy.md:44-45` | Matrice "US-VS-19 : Uploader photo brute" + "US-VS-20 : Choisir un style" (US-VS-19 cite "Uploader") | Aligner le titre US avec le rename de vs-functional-specs.md | @qa |
| G26 | `versi-studio/tests/screenshots/visuals/` | Dossier inexistant — Étape 4 Visuels hors bundle baselines | Créer `tests/e2e/visuals-visual.spec.ts` + générer baselines 3 devices × états (default, photo déposée, style sélectionné, génération, visuel validé) | @qa |
| G7 doc-vs-doc | `docs/copy/vs-ux-writing.md:65` vs `docs/product/vs-spec-f05-surface-m2-temps-reel.md` | Guide UX-writing ne mentionne ni calibration plan ni overlay m² — spec F05 introduit un nouveau pattern UI sans mise à jour du guide | Ajouter section "Calibration plan / Overlay m²" dans vs-ux-writing.md avec les copy exacts ("Calibrez ce plan pour afficher les surfaces m²", "Cette ligne mesure X mètres", "— m²") | @copywriter |

## Focus — Cohérence inter-étapes workflow

### Parité tokens design (Étape 1 vs 2 vs 3 vs 4)

Source de vérité unique : `versi-studio/src/app/globals.css` (77 lignes de tokens sémantiques dans `@theme {}`) + `docs/design/vs-design-system.md` (10 tokens primitifs, ~20 tokens sémantiques, 3 tiers respectés).

- **Couleurs primaires** : Chaque page (`upload/page.tsx`, `lots/page.tsx`, `rooms/page.tsx`, `visuals/page.tsx`) utilise exclusivement des tokens sémantiques (`bg-bg-default`, `text-text-default`, `bg-bg-card`, `text-text-muted`, `border-border-default`, `bg-interactive-primary`, `text-text-inverse`). Aucune page ne référence un token primitif directement (G31 PASS).
- **Spacing** : toutes les pages consomment les utilitaires `p-md/gap-sm/mb-lg/…` générés par `@utility` à partir de `--space-*` (learning versi-s15 propagé). Aucune collision `--spacing-*` résiduelle (G34 PASS).
- **Typographie** : toutes les pages utilisent les classes utilitaires `vs-h1/vs-h2/vs-h3/vs-body/vs-label` définies dans globals.css lignes 286-326. Aucune valeur hardcodée `font-size:` en ligne.
- **États erreur/succès** : les 4 pages consomment le trio `bg-error/10 border-error/20 text-error` et `bg-success/10 border-success/20 text-success` (pattern identique introduit versi-s17 puis propagé). Cohérence visuelle confirmée.
- **Canvas exceptions R02/R03/R04** : documentées dans `docs/design/vs-design-system.md §2.4`, avec mappage hex ↔ token sémantique (`#F0EDE8` ↔ `--color-bg-canvas`, `#DC2626` ↔ `--color-error`). Ces hex ne doivent PAS être signalés en audit G23 (règle learning versi-s18). Vérifié : `PlanCanvas.tsx` et `RoomCanvas.tsx` utilisent ces hex dans `ctx.fillStyle` — conforme.

**Verdict : COHÉRENT.** Aucune divergence de tokens entre les 4 étapes.

### Parité UX (composition page, navigation, états)

- **Pattern layout identique 4 étapes** : sidebar Stepper vertical desktop (256px `hidden md:block`) + Stepper horizontal mobile (`md:hidden mb-lg`) + contenu principal `flex-1`. Confirmé sur `upload/page.tsx`, `lots/page.tsx`, `rooms/page.tsx`, `visuals/page.tsx`.
- **5 états UI (G21)** : loading (skeleton), error (banner rouge + bouton Réessayer), empty (CTA + texte), default (contenu), success (banner vert post-action). Vérifié par Grep sur les 4 pages — toutes gèrent les 5 états.
- **Navigation** : Stepper avec `completedSteps` propagé — la page visuals passe `[1, 2, 3]`, la page rooms passe `[1, 2]`, etc. Cohérent.
- **ConfirmModal portalisé** : pattern unique utilisé dans les 4 étapes (via `createPortal(modalContent, document.body)` — learning versi-s15 + versi-s16 propagé). Fix bug Tailwind v4 systémique documenté.
- **Accessibilité** : `aria-label` sur Stepper + `aria-live` sur bannières erreur/succès + `role="alert"` conditionnel. Cohérent inter-étapes.

**Verdict : COHÉRENT.** Les 4 pages suivent le même squelette structurel. Les audits individuels @moi 9,1 (Lots) / 9,3 (Pièces) / 9,2 (Visuels) confirment la parité.

### Parité copy (registre, vocabulaire)

- **Registre tu/vous (G24)** : vouvoiement systématique confirmé par Grep — 0 `tu`/`ton`/`tes` en surface UI. `setSubState("upload")` et autres `upload` dans le code sont des identifiants techniques (état interne, routes, constantes), pas du copy.
- **Terminologie métier uniforme** : "opération" (préféré à "projet" dans le vocabulaire marchand de biens), "lot", "pièce", "visuel", "étage". Confirmé sur les 4 pages.
- **Vocabulaire Thomas** : "Modifier" conservé (versi-s19 arbitrage @moi) plutôt que "Itérer" (terme IA jargon). Cohérent sur `VisualResult.tsx` et ChatAgent.
- **Divergence doc-vs-code** : le guide `vs-ux-writing.md` (2026-04-15) utilise encore "Uploadez/Uploader/uploadé" (11 occurrences) alors que le code utilise "Déposez/Déposer/déposé". Le **code est correct**, la **doc est obsolète** — contradiction G7 à corriger.

**Verdict : COHÉRENT côté code, INCOHÉRENT doc-vs-impl.** `vs-ux-writing.md` doit être mis à jour pour refléter le code actuel (P1 — 12 occurrences à remplacer).

## Focus — G33 anglicismes (BLOQUANT)

### Grep exhaustif périmètres critiques

**Périmètre 1 — Strings JSX rendus + labels ARIA (code client-facing)**

Commande : `Grep "[Uu]ploadez|[Uu]ploadé|[Uu]ploader|[Dd]ownload|[Ff]eedback|[Mm]eeting|[Ff]orwarder"` sur `versi-studio/src/**/*.tsx` en excluant commentaires et identifiants techniques.

Résultat : **0 occurrence en surface utilisateur JSX**. Les `upload` détectés sont exclusivement :
- Identifiants techniques (`subState === "upload"`, `const [uploading, setUploading]`, `setUploadProgress`, `xhr.upload.addEventListener`)
- Paths techniques (`/tmp/vs-uploads`, route `/upload`)
- Commentaires JSDoc

Verdict Périmètre 1 : **PASS**.

**Périmètre 2 — Messages d'erreur API retournés au client (`NextResponse.json({ error: "…" })`)**

Audit des 20 route.ts dans `src/app/api/vs/**/*.ts` : 65+ messages d'erreur extraits. Tous en français propre ("Plan introuvable.", "Format non supporté. Formats acceptés : JPG, PNG, WEBP.", "Impossible de déposer la photo.", "L'instruction de modification est requise.").

Ligne `rooms/[id]/photos/route.ts:122` : `"Impossible de déposer la photo."` → conforme à la règle n°19 (usage de "déposer" au lieu de "uploader").

Verdict Périmètre 2 : **PASS**.

**Périmètre 3 — Tests E2E visuels (`getByText`, `getByRole`)**

Grep `tests/e2e/*.spec.ts` : rename "uploadés/uploadez" → "déposés/déposez" appliqué versi-s15 (confirmé par tableau historique ligne 245 project-context.md). 15/15 Playwright PASS post-fix.

Verdict Périmètre 3 : **PASS**.

**Périmètre 4 — Specs et docs (surface interne)**

- `docs/copy/vs-ux-writing.md` : **11 occurrences** "Upload*" (FAIL — sous-labels UI, états vides, tableaux messages). C'est une doc qui prescrit du copy pour l'UI — le code a été mis à jour mais pas la source.
- `docs/product/vs-functional-specs.md` : **2 occurrences** (L902 titre US-VS-19, L1454 table récap). Spec interne mais dérive le vocabulaire code.
- `docs/qa/vs-qa-strategy.md` : **1 occurrence** (L44 matrice "US-VS-19 : Uploader photo brute") — dérive vs-functional-specs.md.

Verdict Périmètre 4 : **FAIL REQUIS** (14 occurrences doc à corriger — impact zéro sur le produit livré car le code est correct, mais les specs deviennent la source canonique incorrecte pour les futures itérations).

### Verdict G33 global

- Périmètres critiques (code + API + E2E) : **PASS** ✅
- Périmètre doc (specs/guide UX-writing) : **FAIL REQUIS** (14 occurrences)

**Classification** : `G33 FAIL REQUIS` (pas BLOQUANT car la règle n°19 vise prioritairement la surface utilisateur — en code elle est respectée). À corriger P1 car toute future prod de copy repartira de ces docs.

## Focus — G34 collisions @theme Tailwind v4 (BLOQUANT)

Vérifié `versi-studio/src/app/globals.css` (seul fichier `@theme {}` du projet) :

| Custom property | Collision scale builtin ? | Verdict |
|---|---|---|
| `--color-*` (8 primitives + 12 sémantiques + 8 lots + 6 utilitaires) | Non (scale `color` est géré par `@theme` sans collision) | OK |
| `--font-sans` | Non (scale `font-family`) | OK |
| `--font-size-xs/sm/base/lg/xl/2xl/3xl` | Non (scale `font-size` attendu) | OK |
| `--space-2xs/xs/sm/md/lg/xl/2xl/3xl/4xl` | **Non** — renommé de `--spacing-*` vers `--space-*` versi-s15 (commentaire lignes 66-69 confirme la migration) | OK |
| `--radius-sm/md/lg/xl` | **Non** — utilisé `--radius-*` et non `--rounded-*` qui aurait collidé avec scale `rounded` Tailwind | OK |

**Grep confirmatoire** : `Grep "--spacing-|--sizing-|--rounded-|--leading-|--tracking-"` dans `@theme {}` → **0 occurrence**.

Verdict G34 : **PASS** ✅

Learning versi-s15 (règle n°20 CLAUDE.md) correctement appliqué et **préservé** — aucune régression.

## Focus — G26 screenshots baselines (BLOQUANT/REQUIS)

Inventaire `versi-studio/tests/screenshots/` :

| Étape | Dossier baselines | Nb fichiers | Viewports × états |
|---|---|---|---|
| 1. Upload | `upload/` | 15 | 3 (iphone13/ipad/desktop) × 5 (default, success, error, uploading, modal-delete) |
| 2. Lots | `lots/` | 18 | 3 × 6 (default, lots-detected, lot-selected, lot-validated, modal-delete, error) |
| 3. Pièces | `rooms/` | 21 | 3 × 7 (default, rooms-detected, room-selected, lot-validated, validation-blocked, modal-delete, all-lots-validated) |
| 4. Visuels | **(absent)** | **0** | **—** |

Total existant : **54 baselines** (3 étapes).

**Décision @moi versi-s17** (référencée `docs/qa/visual-regression-bundle.md:5`) : "la boucle visuelle est différée par BUNDLE (pas par étape) pour préserver la vélocité IA. Ce document couvre les 3 premières étapes du workflow Studio." Étape 4 est explicitement "(à créer)".

Verdict G26 : **FAIL REQUIS** (pas BLOQUANT car décision produit @moi documentée et justifiée). Avant mise en production, compléter le bundle :
- Créer `versi-studio/tests/e2e/visuals-visual.spec.ts` (pattern aligné sur `rooms-visual.spec.ts`)
- Générer 15-21 baselines (3 viewports × 5-7 états : default, photo-deposee, style-selectionne, generation-en-cours, visuel-pret, visuel-valide, modal-iterate)
- Documenter les états capturés dans `visual-regression-bundle.md` ligne 26 (remplacer "(à créer)" par le bilan réel)

## Focus — G7 contradictions amont/aval (BLOQUANT)

### Comparaison systématique entre sources

| Source | Destination | Décision comparée | Verdict |
|---|---|---|---|
| `project-context.md` (Laurent, versi.fr one-page) | `vs-functional-specs.md` (Thomas, Versi Studio SaaS) | Persona : scope **distinct** (Versi Studio ≠ versi.fr). Confirmé par `vs-brand-platform.md` et scope V1 section 96-117 project-context.md. | PASS (scope séparé documenté) |
| `vs-functional-specs.md:1194` "Next.js 16 App Router" | `vs-qa-strategy.md:13` "Next.js 16 App Router, React 19" | Stack frontend identique — **FIX versi-s17** de la contradiction identifiée dans `vs-cross-review.md` (2026-04-15) | PASS |
| `vs-spec-f05-surface-m2-temps-reel.md` (calibration manuelle V1, OCR V2) | `recherche-faisabilite-ocr-plan-v2.md` (Verdict NO-GO V2 immédiat, reconsidérer après 3 mois) | Décision V1 cohérente, POC OCR implémenté comme assistant (pas remplacement) respecte la règle "calibration manuelle V1 préservée" | PASS |
| `vs-spec-f05-surface-m2-temps-reel.md` (spec UX) | `src/components/vs/PlanCalibration.tsx` + `src/components/vs/PlanCanvas.tsx` | Implémentation fidèle : modal calibration + overlay m² + fallback bannière si non calibré. POC OCR ajouté en couche assistant (bannières conditionnelles loading/suggestion/fallback) | PASS |
| `docs/copy/vs-ux-writing.md:41` "Uploadez vos plans" | `src/lib/vs/types.ts:186` `description: "Déposez vos plans"` | **CONTRADICTION** — le guide dit "Uploadez", le code dit "Déposez" | **FAIL REQUIS** |
| `docs/copy/vs-ux-writing.md:92-100` "Plan uploadé…" "Uploadez un PDF…" | messages d'erreur `route.ts:122` "Impossible de déposer la photo." | Code cohérent entre lui, guide doc obsolète | **FAIL REQUIS** (même cause que ci-dessus) |
| `vs-design-system.md:12` "Thomas, 35 ans…" | `vs-qa-strategy.md:6` "Thomas, 35 ans…" | Persona aligné — **FIX versi-s17** des 2 FAIL G5 identifiés dans `vs-cross-review.md` (2026-04-15) | PASS |
| `docs/reviews/moi-gate-visuals-us-vs-19-22.md:50` décision "Modifier" retenu | `src/components/vs/VisualResult.tsx:279` texte bouton "Modifier" | Arbitrage @moi fidèlement implémenté | PASS |
| `vs-functional-specs.md:902` "US-VS-19 : Uploader la photo brute" | `vs-qa-strategy.md:44` matrice "US-VS-19 : Uploader photo brute" | Titres alignés entre eux **mais** contradiction avec règle n°19 CLAUDE.md | FAIL REQUIS (docs internes) |

### Verdict G7

**Verdict : PASS sur tous les livrables de production** (code + API + persona + stack + décisions métier). **FAIL REQUIS sur doc-vs-code** : guide UX-writing obsolète sur anglicismes. Les 4 FAIL BLOQUANT de la review précédente (`vs-cross-review.md`, 2026-04-15) sont **tous corrigés**.

## Recommandations Phase 2 (priorisées)

### P0 (BLOQUANT, fix avant merge)

**Aucune recommandation P0.** Zéro gate BLOQUANT en FAIL sur le workflow livré (code + API + tokens + a11y + G33 code + G34 @theme).

### P1 (REQUIS, fix avant merge ou dans session s20)

| # | Action | Fichier(s) | Owner | Critère de done |
|---|---|---|---|---|
| P1-1 | Remplacer 11 occurrences "Upload*" → "Dépos*/Déposer" dans guide UX-writing | `docs/copy/vs-ux-writing.md:41,60,70,92,100,221,364-394` | @copywriter | Grep `[Uu]ploadez\|[Uu]ploadé\|[Uu]ploader` sur ce fichier retourne 0 occurrence |
| P1-2 | Renommer US-VS-19 "Uploader" → "Déposer" dans specs + matrice QA | `docs/product/vs-functional-specs.md:902,1454` + `docs/qa/vs-qa-strategy.md:44-45` | @product-manager + @qa | Grep cohérent : titre US identique doc-vs-spec-vs-code (`STEPS[0].description` = "Déposez vos plans") |
| P1-3 | Ajouter section "Calibration plan / Overlay m²" dans guide UX-writing (copy F05) | `docs/copy/vs-ux-writing.md` (nouvelle section) | @copywriter | Section présente avec copy exacts ("Calibrez ce plan pour afficher les surfaces m²", "Cette ligne mesure X mètres", "— m²") |

### P2 (cosmétique, différable)

| # | Action | Fichier(s) | Owner | Critère de done |
|---|---|---|---|---|
| P2-1 | Créer bundle baselines Étape 4 Visuels (décision produit @moi versi-s17 « différé par bundle » — à réactiver avant prod) | `versi-studio/tests/e2e/visuals-visual.spec.ts` + `versi-studio/tests/screenshots/visuals/` | @qa | 15-21 baselines générées (3 viewports × 5-7 états) + `visual-regression-bundle.md:26` passe de "(à créer)" au bilan réel |

## Verdict final

**GO CONDITIONNEL** : 0 FAIL BLOQUANT + 5 FAIL REQUIS (tous concentrés sur des docs internes — guide UX-writing, specs, matrice QA — sans impact sur le produit livré côté code/API/UI).

- **Merge s19 autorisé** si P1-1 + P1-2 appliqués dans session s20 (scope ~20 remplacements mécaniques dans 3 fichiers doc)
- **Mise en production** conditionnée en plus à P2-1 (bundle baselines Étape 4 Visuels)
- **Scope P1 produit** (options A-F) peut démarrer sans attendre : les 5 FAIL REQUIS n'impactent pas les fondations techniques

## Top 3 corrections prioritaires

1. **Aligner vs-ux-writing.md sur la terminologie "Déposer"** (11 occurrences L41 → L394) — @copywriter, 10 min, débloque la cohérence doc-vs-code (G7 + G33)
2. **Renommer US-VS-19 "Uploader" → "Déposer"** dans vs-functional-specs.md (L902, L1454) + vs-qa-strategy.md (L44-45) — @product-manager + @qa, 5 min, supprime la source canonique obsolète qui contamine les futures générations de copy
3. **Ajouter section "Calibration plan / Overlay m²"** dans vs-ux-writing.md — @copywriter, 15 min, comble le gap doc après livraison F05 (spec livrée sans propagation dans le guide de copy)

Total effort estimé : ~30 min de remplacements mécaniques. Gain : 3 GO CONDITIONNEL → 3 GO ABSOLU + cohérence doc-code restaurée avant attaque du scope P1.

## Handoff

- **→ @orchestrator** : verdict **GO CONDITIONNEL** pour Phase 1 P0.2. Déclencher Phase 2 correction (3 Tasks @copywriter + @product-manager + @qa, scope disjoint, parallélisable en Wave 1) avant Phase 3 question P1. Alternative : accepter la dette doc dans le mémo s20 et traiter en clôture.
- **→ @qa** : attendre ton propre rapport P0.1 E2E. Si E2E PASS + P1-1/P1-2 appliqués → GO ABSOLU pour merge s19. Corrélation G26 : le bundle Étape 4 (P2-1) est la seule dette G26 restante — documentée.
- **→ @copywriter** : priorité P1-1 + P1-3 (vs-ux-writing.md). Brief typist : 11 remplacements mécaniques L41→L394 + ajout section Calibration (copy F05 à rédiger).
- **→ @product-manager** : priorité P1-2 (vs-functional-specs.md L902 + L1454). 2 remplacements.
- Livrables amont consultés : `docs/reviews/vs-cross-review.md` (2026-04-15, pré-Étapes 3-4), `docs/reviews/moi-gate-visuals-us-vs-19-22.md` (9,2/10), `docs/reviews/moi-gate-rooms-us-vs-13-15.md` (9,3/10), `docs/reviews/moi-lots-us-vs-06-08-gate-v1.md` (9,1/10), `docs/product/vs-spec-f05-surface-m2-temps-reel.md`, `docs/ia/recherche-faisabilite-ocr-plan-v2.md`, `docs/qa/visual-regression-bundle.md`, `docs/copy/vs-ux-writing.md`, `docs/product/vs-functional-specs.md`, `docs/qa/vs-qa-strategy.md`, `docs/design/vs-design-system.md`, `project-context.md`.
- Gates évaluées : **34/34**. BLOQUANT : 14 PASS / 0 FAIL. REQUIS : 18 PASS / 5 FAIL. CONDITIONNEL : 1 PASS (G8 brand-voice vouvoiement).
- Verdict : **GO CONDITIONNEL** — workflow livré robuste, dette concentrée sur docs internes.
