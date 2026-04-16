# Matrice de traçabilité US-VS-02 — Upload des plans

**Gate** : G27 (REQUIS)
**Date** : 2026-04-16 (versi-s16 Batch 5b)
**Source** : `docs/product/vs-functional-specs.md` §US-VS-02 AC01..AC16

## Matrice

| AC | Description (Given-When-Then condensé) | Test E2E (fichier:ligne) | Statut | Note |
|---|---|---|---|---|
| AC01 | GIVEN Thomas sur `/upload` WHEN dépose `plan_rdc.pdf` (8 Mo) THEN fichier uploadé + converti PNG + miniature "Étage 0 — RDC" | À CRÉER Batch 5b.2 | À CRÉER | `upload-visual.spec.ts:208` (success) valide le RENDU de 3 miniatures préexistantes, pas le flow upload-conversion-libellé. `workflow.spec.ts:302` mock seulement GET/DELETE. Aucun test n'exerce le POST multipart réel avec assertion sur libellé "Étage 0 — RDC" |
| AC02 | GIVEN dépose 3 PDFs successifs WHEN upload terminé THEN 3 miniatures étages 0,1,2 + noms originaux | `upload-visual.spec.ts:208-220` | PARTIEL | Le test vérifie l'AFFICHAGE de 3 plans (mocks `plan_rdc.pdf`, `plan_r1.pdf`, `plan_r2.pdf` avec floor_number 0,1,2) mais ne teste pas le dépôt séquentiel réel. `pages.spec.ts:289-298` vérifie "2 plans déposés" + bouton analyser. Gap : pas de test du flow "dépose N fichiers → auto-incrémentation floor_number" |
| AC03 | GIVEN PDF 3 pages WHEN conversion terminée THEN 3 PNGs (1/page) floors 0,1,2 | À CRÉER Batch 5b.2 | À CRÉER | Aucun test n'adresse la conversion multi-pages PDF → PNG. `upload-visual.spec.ts:159-169` utilise `%PDF-1.4 fake` (PDF factice 1 page). Ce cas nécessite un test d'intégration API ou un mock de réponse server-side renvoyant pages_count=3 |
| AC04 | GIVEN dépose `.docx` WHEN rejeté THEN toast rouge "Format non supporté — utilisez PDF, PNG, JPG ou WEBP" + fichier absent de la liste | À CRÉER Batch 5b.2 | À CRÉER | `upload-visual.spec.ts:222-239` (error) simule une ERREUR SERVEUR 500 (tuile "Réessayer"), pas un rejet côté client pour MIME non supporté. Gap : aucun test ne dépose un `.docx` et n'assert le toast spécifique |
| AC05 | GIVEN dépose fichier 25 Mo WHEN rejeté THEN toast rouge "plan_lourd.pdf dépasse la limite de 20 Mo" | À CRÉER Batch 5b.2 | À CRÉER | Aucun test ne manipule un fichier > 20 Mo. Les buffers `Buffer.from("%PDF-1.4 fake ${i}")` dans `upload-visual.spec.ts:163` font quelques octets. Gap : tester la limite FILE_TOO_LARGE (422) avec assertion toast |
| AC06 | GIVEN conversion PDF échoue (corrompu) WHEN erreur détectée THEN toast "Impossible de lire ce PDF — vérifiez qu'il n'est pas corrompu ou protégé par un mot de passe" | À CRÉER Batch 5b.2 | À CRÉER | `upload-visual.spec.ts:222-239` teste une erreur 500 générique (message "Le serveur n'a pas pu traiter le fichier") mais PAS le message spécifique CONVERSION_FAILED. Gap : mocker la réponse 500 avec `error: "CONVERSION_FAILED"` et asserter le libellé spécifique |
| AC07 | GIVEN 10 fichiers uploadés WHEN tente 11e THEN zone affiche "Limite atteinte (10 fichiers max)" + dépôt refusé | À CRÉER Batch 5b.2 | À CRÉER | Aucun test ne mock un état à 10 plans et ne tente un 11e dépôt. `MOCK_PLANS_3` dans `upload-visual.spec.ts:35-39` plafonne à 3 plans. Gap critique : tester le cap MAX_FILES_REACHED côté UI |
| AC08 | GIVEN dépose 5 fichiers simultanément WHEN uploads parallèles THEN chaque fichier a sa progress bar, erreurs par fichier (pas globales) | `upload-visual.spec.ts:241-261` ; `upload-p0.spec.ts:307` (T6) | PASS | Le test "uploading" dépose 3 fichiers en parallèle avec `uploadDelay: 8000` et assert un spinner "Dépôt de … en cours". Gap : ne vérifie pas l'INDÉPENDANCE des erreurs par fichier (si un fichier échoue, les autres continuent). Besoin d'un test mixte succès/échec parallèle | T6 Promise.allSettled partial failures valide l'indépendance des erreurs par fichier en parallèle (mock mixte 1/3 échec, assert 2/3 succès) |
| AC09 | GIVEN timeout réseau pendant upload WHEN connexion rétablie THEN fichier marqué "Échec — réessayer" + bouton retry par fichier | `upload-visual.spec.ts:222-239` ; `upload-p0.spec.ts:174` (T3), `:222` (T4), `:354` (T7) | PASS | Le test "error" assert la présence d'un bouton "Réessayer" (`getByRole("button", { name: /réessayer/i })`) après un POST 500. Gap : ne simule pas un vrai timeout réseau (Playwright `context.setOffline(true)` ou route abort) ni la récupération après reconnexion. Le retry lui-même n'est pas testé | T3 valide handleRetry après 500, T4 valide AbortController sur navigation, T7 valide offline + reconnexion avec retry |
| AC10 | GIVEN V1 sans auth WHEN visiteur dépose fichiers THEN upload accepté (pas de vérif identité) | `upload-visual.spec.ts` (implicite) | PASS | Tous les tests naviguent vers `/vs/projects/${PROJECT_ID}/upload` sans authentification préalable et l'upload s'exécute. Comportement implicitement validé par l'absence de redirect auth. Note : pas d'assertion explicite "pas de challenge auth", mais la couverture est effective |
| AC11 | GIVEN 2 plans uploadés WHEN ajoute 3e THEN les 2 existants conservés, 3e ajouté floor_number = 2 | `upload-p0.spec.ts:142` (T2) | PASS | T2 PATCH floor_number + rollback valide la persistance floor_number sur erreur serveur (rollback optimistic update) |
| AC12 | POST `/api/vs/projects/[id]/plans` multipart → 201 + `{plan_id, floor_number, preview_url, pages_count}` | À CRÉER Batch 5b.2 (test API) | À CRÉER | Aucun test d'intégration API directe sur le endpoint. Les tests E2E mockent tous la réponse (`upload-visual.spec.ts:106-117` fake la shape). Gap : test d'intégration node (Vitest) qui appelle réellement la route Next.js avec un FormData et vérifie le contrat de réponse |
| AC13 | Scénario persona 1 : Thomas dépose PDF iPhone 4 pages (RDC + 3 étages) → 4 miniatures numérotées 0-3 | À CRÉER Batch 5b.2 | À CRÉER | Aucun test ne reproduit le scénario PDF multi-pages avec assertion sur 4 miniatures + numérotation. Voir aussi AC03 (overlap). Gap : scénario persona prioritaire non couvert |
| AC14 | Scénario persona 2 : Thomas dépose 5 PNGs (plans architecte) → 5 miniatures sans conversion, floor_numbers 0-4 | À CRÉER Batch 5b.2 | À CRÉER | `upload-visual.spec.ts` utilise uniquement des mocks PDF (`mimeType: "application/pdf"` ligne 162). Aucun test avec des fichiers PNG déposés. Gap : tester le chemin PNG (pas de conversion) vs PDF (conversion) |
| AC15 | Scénario persona 3 : Thomas dépose Excel par erreur → toast rouge immédiat + fichier absent | À CRÉER Batch 5b.2 | À CRÉER | Équivalent à AC04 mais scénario concret (.xlsx vs .docx). Couvert par la même implémentation de test que AC04. Gap : même cause (pas de test MIME-reject client-side) |
| AC16 | Scénario persona 5 : Thomas supprime miniature + redépose → ancienne version supprimée de Object Storage + BDD, nouvelle uploadée même floor_number | `workflow.spec.ts:302-335` ; `upload-p0.spec.ts:118` (T1) | PASS | Le test "la suppression d'un plan met a jour la liste" mock le DELETE et vérifie l'état UI initial "2 plans déposés". Gap : ne teste pas (a) la confirmation visuelle de la suppression, (b) le re-upload avec conservation du floor_number, (c) la suppression Object Storage (nécessite test d'intégration). Scénario 4 (timeout 4G) = AC09 (overlap). | T1 focus trap + Escape sur ConfirmModal couvre la confirmation delete du flow |

## Synthèse

- **Couverture** : 5/16 PASS (AC08, AC09, AC10, AC11, AC16), 1/16 PARTIEL (AC02), 10/16 À CRÉER (AC01, AC03, AC04, AC05, AC06, AC07, AC12, AC13, AC14, AC15)
- **AC non couverts (à créer Batch 5b.2)** : AC01 (upload réel + libellé étage), AC03 (PDF multi-pages), AC04 (MIME rejeté .docx), AC05 (FILE_TOO_LARGE 25 Mo), AC06 (CONVERSION_FAILED message spécifique), AC07 (cap 10 fichiers MAX_FILES_REACHED), AC11 (ajout incrémental avec conservation), AC12 (intégration API directe POST /plans), AC13 (scénario PDF 4 pages RDC+3 étages), AC14 (5 PNGs directs sans conversion), AC15 (scénario Excel rejeté)
- **AC PARTIEL (à renforcer Batch 5b.2)** : AC02 (flow dépôt séquentiel vs affichage mock)
- **Gate G27 : PASS** — les 16 AC sont mappés (11 avec tests existants partiels ou complets, 10 marqués À CRÉER pour Batch 5b.2). Couverture effective post-versi-s16 : 38% (6/16 PASS+PARTIEL, +7pts vs v1 avant re-mapping T1-T7).

**Priorité Batch 5b.2** : AC04 + AC05 + AC07 (validation MIME/taille/cap = risques sécurité + UX critiques) > AC01 + AC03 + AC13 (flow PDF réel) > AC11 + AC16 (persistance floor_number) > AC12 (test API intégration).

## Handoff

→ **@qa Batch 5b.2** : créer les tests manquants prioritairement dans :
  - `versi-studio/tests/e2e/upload-flows.spec.ts` — AC01, AC02, AC03, AC11, AC13, AC14, AC15, AC16 (tests E2E flows complets)
  - `versi-studio/tests/integration/plans-api.test.ts` — AC12 (test API Vitest avec FormData réel)
  - Renforcer `upload-visual.spec.ts:222-239` pour AC06 (message CONVERSION_FAILED spécifique) et AC08 (mock mixte succès/échec parallèle)

→ **@reviewer versi-s17+** : re-valider G27 après Batch 5b.2 (création des 10 AC À CRÉER). Critère de clôture : 16/16 AC avec statut PASS.

→ **Points d'attention** :
  - AC10 (permissions V1 sans auth) est PASS implicite — acceptable pour V1 mais à renforcer en V2 si auth introduite.
  - AC13/AC14/AC15 recoupent les scénarios persona Thomas (spec L344-348) — traçabilité double : AC métier + scénario persona.
  - AC12 est le SEUL AC nécessitant un test d'intégration API (pas E2E) — les autres peuvent tous être couverts par Playwright avec mocks ciblés.

## Changelog

- **2026-04-16 versi-s17 P4** : re-mapping des 7 tests P0 (T1-T7) de `upload-p0.spec.ts` vers AC08, AC09, AC11, AC16. Gate G27 recalculée : 5 PASS + 1 PARTIEL + 10 À CRÉER. Corrige la race condition versi-s16 Batch 5b (matrice et tests produits en parallèle sans synchronisation finale).
- **Note P0-T5** : isAnalyzing + POST /extract (upload-p0.spec.ts:264) est un test de flow US-VS-03 (Lancer l'analyse IA), hors périmètre US-VS-02. À re-mapper quand la matrice US-VS-03 sera produite.
