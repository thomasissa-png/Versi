# Audit QA v1 — US-VS-02 Uploader des plans (Étape 1 Upload autopilote)

**Session** : versi-s15
**Branche** : `claude/launch-upload-autopilot-Q4wiv`
**Auditeur** : @qa
**Date** : 2026-04-16
**Scope** : `versi-studio/src/app/vs/projects/[id]/upload/page.tsx` (351 lignes) + `DropZone.tsx` + `PlanThumbnail.tsx` + `Stepper.tsx`
**Spec** : `docs/product/vs-functional-specs.md` lignes 271-346 (US-VS-02 — 13 critères acceptance)
**Tests existants** : `versi-studio/tests/e2e/workflow.spec.ts` + `versi-studio/tests/e2e/pages.spec.ts` + `versi-studio/tests/e2e/fixtures.ts`

---

## 1. Résumé exécutif

- **Couverture AC : 0/13 PASS, 2/13 PARTIEL, 11/13 FAIL** — aucun test E2E ne simule un vrai dépôt de fichier via `setInputFiles()`. Les tests actuels vérifient le rendu de la page, pas le parcours d'upload.
- **Gates bloquantes FAIL** : G21 (5 états UI, loading et erreur non observés), G27 (matrice de traçabilité, 11/13 AC sans test), G26 (aucun baseline screenshot dans `versi-studio/tests/screenshots/`).
- **3 bugs/divergences spec↔code identifiés** : AC08 upload séquentiel (code) vs parallèle (spec), AC09 retry par fichier non implémenté, AC12 champs `preview_url`/`pages_count` absents des fixtures → contrat API cassé.
- **2 stubs non persistés** : PATCH `floor_number` (page.tsx:170) et redirection `/lots` après `step_1_complete` (page.tsx:186) ne sont testés nulle part.
- **Verdict global : 6/10** — premier jet solide en code (validation MIME/taille, 5 états UI partiellement implémentés, error boundaries OK) mais couverture test quasi inexistante sur le happy path. Bloque merge Étape 1 tant que les 7 tests P0 ne sont pas écrits.

## 2. Matrice de traçabilité US-VS-02 → tests existants (Gate G27)

Les 13 critères d'acceptance de US-VS-02 (spec lignes 298-317) vs tests Playwright existants. Statut : PASS (test couvre), PARTIEL (test effleure sans assertion forte), FAIL (aucun test).

| # | Critère d'acceptance | Catégorie | Test existant | Fichier:ligne | Statut |
|---|---|---|---|---|---|
| AC01 | Thomas dépose `plan_rdc.pdf` (8 Mo) → upload + conversion PNG + miniature "Étage 0 — RDC" | Happy path | Aucun test ne simule un vrai dépôt de fichier (`setInputFiles`). Seul le mock POST /plans retourne 201 sans déclencher l'upload. | — | **FAIL** |
| AC02 | 3 PDFs successifs → 3 miniatures avec floors 0, 1, 2 et noms originaux | Happy path | Aucun test ne vérifie la numérotation auto-incrémentée floor_number ni l'affichage du filename sur la miniature | — | **FAIL** |
| AC03 | PDF 3 pages → 3 images PNG (1 par page) avec floors 0, 1, 2 | Happy path | Aucun test ne couvre la conversion multi-pages PDF. Le mock POST retourne un seul plan par appel | — | **FAIL** |
| AC04 | Dépôt `.docx` → rejet + toast rouge "Format non supporté — utilisez PDF, PNG ou JPG" | Erreur | La validation MIME existe dans `DropZone.tsx:30-40` mais aucun test ne force un fichier .docx | — | **FAIL** |
| AC05 | Dépôt fichier 25 Mo → rejet + toast "plan_lourd.pdf dépasse la limite de 20 Mo" | Erreur | Validation taille existe dans `DropZone.tsx:41-46`, aucun test ne soumet un fichier > 20 Mo | — | **FAIL** |
| AC06 | Conversion PDF échoue (corrompu) → toast "Impossible de lire ce PDF — vérifiez qu'il n'est pas corrompu ou protégé par un mot de passe" | Erreur | `workflow.spec.ts:528-548` mocke une 500 mais vérifie seulement que la page ne crashe pas. Le message exact spec n'est jamais asserté (le code actuel affiche `json.error` brut, pas ce message). | workflow.spec.ts:528 | **PARTIEL** |
| AC07 | 10 fichiers déjà uploadés, tentative 11e → "Limite atteinte (10 fichiers max)", dépôt refusé | Limite | La logique existe dans `page.tsx:82-86` mais aucun test avec 10 plans pré-chargés | — | **FAIL** |
| AC08 | 5 fichiers simultanés → 5 barres de progression indépendantes, erreurs par fichier | Limite | Le code `page.tsx:102-126` upload séquentiellement (pas parallèle) — divergence avec spec. Aucun test ne vérifie la barre par fichier | — | **FAIL** (+ bug spec vs code) |
| AC09 | Timeout réseau pendant upload → fichier marqué "Échec — réessayer" + bouton retry par fichier | Limite | **Non implémenté dans le code** : `page.tsx:120-122` catch l'erreur mais n'affiche pas de bouton retry par fichier. Aucun test. | — | **FAIL** (+ gap implémentation) |
| AC10 | V1 sans auth — visiteur non identifié peut upload | Permissions | Aucun test explicite. Le comportement est implicite (pas de middleware auth) | — | **FAIL** |
| AC11 | 2 plans existants, ajout 3e → les 2 existants préservés, 3e ajouté avec floor_number = 2 | Données existantes | `pages.spec.ts:289-298` affiche 2 plans, mais aucun test n'ajoute un 3e plan et vérifie la préservation + floor_number auto | pages.spec.ts:289 | **PARTIEL** |
| AC12 | POST /api/vs/projects/[id]/plans multipart/form-data → response 201 `{plan_id, floor_number, preview_url, pages_count}` | Contrat API | Mock retourne `MOCK_PLANS[0]` qui n'a PAS de champ `preview_url` ni `pages_count` — contrat cassé. Aucun test de contrat. | fixtures.ts:57-80 | **FAIL** |
| AC13 | Rate limit 20 uploads/min par IP → 429 sur 21e requête | Sécurité | Aucun test rate limit. Le middleware rate-limit n'est pas vérifié. | — | **FAIL** |

**Synthèse Gate G27** : 0 PASS / 2 PARTIEL / 11 FAIL sur 13 critères → **Gate G27 FAIL**

Les 2 seuls tests qui effleurent US-VS-02 (`workflow.spec.ts:528` erreur serveur + `pages.spec.ts:289` affichage plans existants) ne valident que la non-régression de la page. Le vrai parcours d'upload (drop fichier → conversion → miniature) n'est testé nulle part.

## 3. Couverture des 5 états UI (Gate G21)

US-VS-02 renvoie à la section 3 en-tête des specs — les 5 états UI standard sont attendus.

| État | Implémentation code | Test existant | Statut |
|---|---|---|---|
| **Défaut** (zone vide, pas de plans) | `page.tsx:280-284` DropZone + absence de grille (ligne 302 `plans.length > 0` false) | `pages.spec.ts:275-287` vérifie stepper + heading + adresse affichés | **PASS** |
| **Loading** (chargement initial données projet/plans) | `page.tsx:194-205` spinner centré | Aucun test ne bloque le fetch pour observer le loading | **FAIL** |
| **Loading upload** (uploading en cours, barre par fichier) | `page.tsx:287-299` boucle `uploadProgress.map` avec spinner + "Upload de {name}..." | Aucun test ne vérifie l'affichage du spinner pendant l'upload | **FAIL** |
| **Vide** (idem défaut, aucun plan) | Identique à "Défaut" | Couvert par `pages.spec.ts:275-287` (plans: []) | **PASS** |
| **Erreur** (toast rouge au-dessus de DropZone) | `page.tsx:241-278` bandeau erreur avec bouton fermer | `workflow.spec.ts:528-548` force une 500 mais vérifie seulement que la page s'affiche — le bandeau d'erreur n'est pas asserté | **PARTIEL** |
| **Succès** (grille miniatures + bouton "Analyser les plans") | `page.tsx:302-346` grille + bouton | `pages.spec.ts:289-298` vérifie le compteur "2 plans uploadés" + bouton Analyser | **PASS** |

**Synthèse Gate G21** : 3 PASS / 1 PARTIEL / 2 FAIL sur 6 états → **Gate G21 FAIL**

Les états loading (initial et upload en cours) ne sont jamais observés en test. L'état erreur est effleuré sans assertion sur le texte/la structure du bandeau.



## 4. Tests E2E manquants — priorisation P0/P1/P2

Priorisation selon risque métier et criticité persona Thomas (marchand de biens qui dépose des plans d'immeubles — erreur = perte de confiance immédiate).

### P0 — Bloquant (à écrire avant merge Étape 1)

| Test | Description | AC couverts | Fichier cible |
|---|---|---|---|
| **T-P0-01** Happy path upload 1 PDF | `setInputFiles` avec un vrai File(Blob PDF 8 Mo) → mock POST 201 → assertion miniature visible avec filename + "Étage 0" | AC01 | `workflow.spec.ts` nouveau describe |
| **T-P0-02** Upload 3 fichiers successifs numérotation | 3 fichiers PNG déposés → 3 miniatures avec floors 0, 1, 2 asserts | AC02 | `workflow.spec.ts` |
| **T-P0-03** Rejet fichier .docx | `setInputFiles` avec fichier MIME `application/vnd.openxmlformats-officedocument.wordprocessingml.document` → assertion message "format non supporté" visible + POST jamais appelé | AC04 | `workflow.spec.ts` |
| **T-P0-04** Rejet fichier > 20 Mo | Blob de 21 Mo → assertion "taille supérieure à 20 Mo" visible + POST jamais appelé | AC05 | `workflow.spec.ts` |
| **T-P0-05** Limite 10 fichiers | Mock GET /plans retourne 10 plans → assertion DropZone `disabled` (attribut ou classe) + tentative drop refusée avec message "Maximum 10 plans par opération" | AC07 | `workflow.spec.ts` |
| **T-P0-06** Contrat API response | Assertion que MOCK_PLANS contient `preview_url` et `pages_count` (actuellement absents) — ajouter au fixtures puis vérifier que la miniature utilise bien ces champs | AC12 | `fixtures.ts` + `pages.spec.ts` |
| **T-P0-07** Erreur serveur affiche bandeau | Mock POST /plans → 500 → assertion bandeau rouge visible avec texte d'erreur + bouton fermer fonctionnel (vérifier aria-label "Fermer le message d'erreur") | AC06 | `workflow.spec.ts` |

### P1 — Requis (à écrire avant clôture US-VS-02)

| Test | Description | AC couverts | Fichier cible |
|---|---|---|---|
| **T-P1-01** Suppression plan sans `confirm()` natif | Le code utilise `window.confirm()` (ligne 141) qui n'est pas testable. Patcher le test avec `page.on('dialog', d => d.accept())` pour passer le confirm, puis vérifier DELETE appelé + plan retiré | AC (hors spec US-VS-02 mais dans code) | `workflow.spec.ts:302-335` (à compléter) |
| **T-P1-02** Modification floor_number optimistic | Click sur input étage, changer 0→2, blur → vérifier affichage optimistic (code ligne 165-168) ET documenter que PATCH n'est pas appelé (code ligne 170 stub) | — | `workflow.spec.ts` |
| **T-P1-03** Loading initial fetch | Retarder fetch GET /projects/[id] via `page.route` avec `route.continue()` après 500ms → assertion spinner visible dans l'intervalle | État loading | `pages.spec.ts` |
| **T-P1-04** Loading upload en cours | Retarder POST /plans de 2 secondes → assertion "Upload de {filename}..." visible pendant l'attente | État loading upload | `workflow.spec.ts` |
| **T-P1-05** Bouton Analyser redirige vers /lots | Click bouton → mock PATCH /projects/[id] + assertion `page.url()` contient `/lots` après click (test existant `workflow.spec.ts:284-300` vérifie le click mais pas la redirection) | AC navigation | `workflow.spec.ts` |
| **T-P1-06** Préservation plans existants | Mock GET /plans retourne 2 plans → upload un 3e → assertion 3 plans visibles + assertion que les 2 premiers ont leur floor_number inchangé + 3e a floor_number = 2 | AC11 | `workflow.spec.ts` |
| **T-P1-07** Accessibilité clavier DropZone | `page.keyboard.press('Tab')` → DropZone focus visible, `page.keyboard.press('Enter')` → input file ouvert (mock required) | WCAG AA | `workflow.spec.ts` |
| **T-P1-08** Événement analytics `vs_plan_uploaded` | Intercepter requête Umami sur POST /plans 201 → assertion event name + propriétés (project_id, plan_id, mime_type, file_size_mb, pages_count, floor_number) | Events spec ligne 330 | `workflow.spec.ts` |
| **T-P1-09** Événement `vs_plan_upload_error` | Intercepter Umami sur POST /plans 4xx → assertion event avec project_id + error_type + mime_type | Events spec ligne 331 | `workflow.spec.ts` |

### P2 — Nice-to-have (backlog)

| Test | Description | AC couverts | Fichier cible |
|---|---|---|---|
| **T-P2-01** PDF multi-pages conversion | Nécessite un backend réel ou un mock sophistiqué qui renvoie N plans pour 1 POST. À évaluer : découper en test d'intégration API plutôt que E2E | AC03 | test d'intégration API |
| **T-P2-02** Rate limiting 20/min | Tester localement via 21 appels POST rapides — complexe en E2E, à faire en test d'intégration sur le middleware | AC13 | test d'intégration |
| **T-P2-03** Upload parallèle réel | Actuellement le code est séquentiel (`for of` ligne 102-126). Si le code est refactorisé en `Promise.all`, tester que 5 POST partent en parallèle | AC08 (nécessite fix code) | `workflow.spec.ts` après fix |
| **T-P2-04** Retry par fichier | Actuellement non implémenté dans le code. Créer le test quand la feature sera ajoutée | AC09 (nécessite fix code) | — |
| **T-P2-05** Screenshot régression miniature | Playwright screenshot de la grille de miniatures sur 3 viewports (iPhone 13, iPad, Desktop Chrome) avec baseline dans `versi-studio/tests/screenshots/upload/` | Gate G26 | nouveau describe |
| **T-P2-06** Drag-over visuel | Simuler `dragenter` → assertion classe `border-interactive-primary` + texte "Relâchez pour déposer" visible | Polish UX | `workflow.spec.ts` |
| **T-P2-07** Validation MIME WEBP | Le DropZone accepte `image/webp` (ligne 32, ACCEPTED_MIME_TYPES) mais la spec dit PDF/PNG/JPG seulement. À clarifier avec @product-manager avant de tester | Contradiction spec/code | — |

### Données adversariales obligatoires pour T-P0-01 à T-P0-07

Fichiers de test à créer dans `versi-studio/tests/fixtures/files/` :
- `plan_nominal.pdf` (2 Mo, valide)
- `plan_limite.pdf` (19.9 Mo, valide à la limite)
- `plan_depasse.pdf` (21 Mo, rejeté)
- `plan_vide.pdf` (0 bytes, edge case)
- `plan_corrompu.pdf` (bytes aléatoires avec extension `.pdf`)
- `plan_avec_émoji_🏠.pdf` (filename avec emoji + accents)
- `document.docx` (format non supporté)
- `plan.jpg.exe` (double extension, sécurité)
- `plan_longue_description_avec_caractères_spéciaux_&<>".png` (filename edge case)

## 5. Vérification Playwright route ordering (learning P1)

**Rappel du learning versi-s13 (lessons-learned.md ligne 106)** : dans Playwright, `page.route()` applique la DERNIÈRE route enregistrée qui matche l'URL. Pour qu'une route spécifique override un wildcard, elle DOIT être enregistrée APRÈS le wildcard. L'ordre inverse → faux négatifs.

### Audit des fichiers de tests actuels

**`pages.spec.ts`** :
- L301-319 dans le test "Opération introuvable" : la route spécifique `**/api/vs/projects/**` est enregistrée AVANT le wildcard `**/api/vs/projects/*/plans`. L'ordre est correct car le wildcard `/plans` est plus spécifique que `/projects/**` pour cet endpoint. **OK** — conforme au learning.
- L173-194 `**/api/vs/lots/*` wildcard catch-all : enregistré APRÈS les routes spécifiques (L161 `/rooms` et L135 `/validate`). Conforme — les spécifiques sont bien antérieures et matchent en premier... MAIS **PROBLÈME** : dans Playwright, c'est la DERNIÈRE route qui gagne, donc ici le wildcard catch-all va capturer `/rooms` et `/validate` si ces routes étaient enregistrées AVANT. Vérifier que le catch-all `/lots/*` a bien la logique d'ignorer `/rooms` et `/validate` (L176-178) — **OK, la garde est présente** avec `route.continue()`.

**`workflow.spec.ts`** :
- L191-210 catch-all `**/api/vs/lots/*` enregistré APRÈS les spécifiques `/rooms` et `/validate` (L161-188). **Conforme au learning** : la spécifique a été enregistrée AVANT le wildcard, le wildcard est la dernière route enregistrée et sera sélectionnée pour les URL qui ne matchent pas une spécifique.
- **ATTENTION — bug potentiel L305-328** : dans le test "la suppression d'un plan met à jour la liste", `page.route(**/api/vs/projects/${PROJECT_ID}/plans)` est enregistrée AVANT l'appel `mockAllApiRoutes` à la ligne 330. Or `mockAllApiRoutes` enregistre aussi cette route (L97-113). Conformément au learning, **c'est la route de `mockAllApiRoutes` qui gagnera** (enregistrée en dernier), et le mock spécifique du test sera ignoré. Le test semble passer mais le mock personnalisé avec `plansData` mutable ne fonctionne pas. **BUG à corriger** : inverser l'ordre, appeler `mockAllApiRoutes` EN PREMIER, puis enregistrer les overrides spécifiques APRÈS.

### Recommandations pour les nouveaux tests P0/P1

1. **Ordre d'enregistrement standard** : `mockAllApiRoutes(page, {...})` EN PREMIER, puis `page.route(...)` pour chaque override spécifique APRÈS.
2. **Test T-P0-07 (erreur serveur)** : la route override `POST /plans → 500` doit être enregistrée APRÈS `mockAllApiRoutes`. Le test existant L528-548 le fait correctement.
3. **Ajouter un commentaire de rappel** en haut de chaque nouveau test : `// Note Playwright : dernière route enregistrée gagne. mockAllApiRoutes EN PREMIER, overrides APRÈS.`
4. **Refactoring bug identifié** : le test L302-335 de `workflow.spec.ts` doit être réécrit avec l'ordre inverse (mock global AVANT, overrides APRÈS) pour que `plansData` mutable fonctionne.

## 6. Limitations code identifiées à tester

## 7. Screenshots CI baseline (Gate G26)

## 8. Verdict global et priorités correctives

## Handoff
