# Re-audit @qa — Upload US-VS-02 v2

> **Contexte** : Audit v2 produit par Claude principal en fallback après 2 timeouts consécutifs de l'agent @qa sur cette mission (règle n°4 escalade versi-s12 déclenchée). À re-valider par @qa ou @reviewer en versi-s16.

**Date** : 2026-04-16 — Batch 5 versi-s15
**Cible** : `versi-studio/src/app/vs/projects/[id]/upload/page.tsx` (577 lignes)
**Commit audité** : `432104f` (HEAD post-Batch 4d + ECART-VS-3 fix)
**Score v1** : 6/10 | **Score v2** : 8.5/10

---

## 1. Vérification 10 P0 + 2 ECART appliqués Batch 4

| # | Correction | Statut | Preuve code |
|---|---|---|---|
| P0.1 | ConfirmModal remplace `confirm()` natif | **PASS** | `page.tsx:239` (`askDeleteConfirm`), `page.tsx:241-264` (`confirmDelete`), `page.tsx:564` (`<ConfirmModal>`) + `src/components/vs/ConfirmModal.tsx` avec focus trap + Escape |
| P0.2 | `floor_number` calculé client + PATCH persistance | **PASS** | `page.tsx:118` (`formData.append("floor_number", String(targetFloor))`), `page.tsx:172` (`baseOffset = plans.length`), `page.tsx:277-298` (`handleFloorChange` PATCH + rollback) + `api/vs/plans/[id]/route.ts:73-138` (PATCH handler) |
| P0.3 | `isAnalyzing` + POST `/extract` | **PASS** | `page.tsx:56` (state), `page.tsx:305-344` (`handleAnalyze`), `page.tsx:324` (POST `/api/vs/projects/[id]/extract`), `page.tsx:539-557` (bouton avec spinner + `aria-busy`) |
| P0.4 | Erreurs réseau actionnables | **PASS** | `page.tsx:137` (upload), `page.tsx:259` (delete), `page.tsx:296` (floor change) — toutes avec "vérifiez votre connexion et réessayez" |
| P0.5 | `Promise.allSettled` + `AbortController` | **PASS** | `page.tsx:169-170` (controller + ref), `page.tsx:174-180` (Promise.allSettled), `page.tsx:100-105` (cleanup effect), `page.tsx:132-134` (AbortError handling) |
| P0.6 | `failedFiles` + tuiles Réessayer | **PASS** | `page.tsx:52` (state), `page.tsx:210-234` (`handleRetry`), `page.tsx:466-502` (grille failed files + boutons Réessayer) |
| P0.7 | Stepper DS conforme | **PASS** | `Stepper.tsx:35` (état actif `bg-bg-dark text-text-inverse border-l-[3px] border-text-default`) |
| P0.8 | Spec WEBP alignée (hors code) | **PASS** | `docs/product/vs-functional-specs.md:74, 304` (formats) + `L327-335` (PATCH documenté) |
| — | Anglicismes déposer/déposé | **PASS** | `page.tsx:410` ("Déposez vos plans"), compteur pluriel "déposé" (multiples), CTA "Lancer l'analyse" L557, `lib/vs/types.ts:185` (Stepper step 1) |
| — | Typo "irréversible" (dans ConfirmModal) | **PASS** | `page.tsx:568` (`message="Cette action est irréversible. Le fichier sera supprimé définitivement."`) — typo corrigée par refactor ConfirmModal |
| ECART-VS-1 | Stepper responsive mobile | **PASS** | `page.tsx:345-352, 381-389` (dual stepper : `hidden md:block` sidebar + `md:hidden` horizontal), `Stepper.tsx:variant` prop |
| ECART-VS-2 | ConfirmModal portalisé | **PASS** | `ConfirmModal.tsx` : `createPortal(modalContent, document.body)` + `mounted` state SSR safety + maxWidth inline (contournement bug Tailwind v4) |

**Résultat** : 12/12 corrections **PASS**.

---

## 2. Gates binaires

| Gate | Statut | Justification |
|---|---|---|
| **G1** (complétude sections) | PASS | Tous les états UI + gestionnaires présents |
| **G13** (zéro donnée inventée) | PASS | Aucun chiffre arbitraire ; `MAX_FILES_PER_PROJECT` depuis types |
| **G15** (zéro placeholder) | PASS | Aucun TODO / FIXME résiduel post-Batch 4 |
| **G21** (5 états UI) | **PASS** | Défaut (DropZone vide), Loading (`uploadProgress`), Vide (= défaut), Erreur (toast + failed tiles), Succès (grille + CTA) — tous implémentés |
| **G22** (WCAG 2.2 AA) | **PASS conditionnel** | Touch targets 44px (`min-h-[44px]` boutons), focus-visible (`focus-visible:outline-2` partout), motion-reduce (`motion-reduce:transition-none` + `animate-none`), `aria-busy`/`aria-modal`/`role="dialog"`/`aria-labelledby` présents. Contrastes texte sur `bg-error/10` à vérifier par @design re-audit versi-s16. |
| **G23** (zero hardcoded) | PASS | Tokens sémantiques utilisés partout (`bg-bg-dark`, `text-text-inverse`, `color-error`, etc.) |
| **G26** (baselines CI) | **PASS** | 15 baselines régénérées Batch 4d dans `tests/screenshots/upload/`, 15/15 Playwright PASS en 18s |
| **G27** (traçabilité AC → tests) | **REPORTÉ versi-s16** | Matrice US-VS-02 AC01..AC16 → tests non produite (agents timeout). Tests existants `upload-visual.spec.ts` (15 tests PASS) + `pages.spec.ts` + `workflow.spec.ts` (ECART-VS-3 fixé). |
| **G28** (tsc + lint + tests) | **PASS** | Batch 4d a validé : `tsc --noEmit` 0 nouvelle erreur sur fichiers Upload, `playwright test upload-visual.spec.ts` 15/15 PASS. Erreurs pré-existantes hors scope (`openai`/`pdf-to-img` modules manquants). |
| **G31** (tokens 3 tiers) | PASS | `ConfirmModal.tsx` + `Stepper.tsx` + `page.tsx` utilisent tokens sémantiques, pas de primitive directe (sauf contournement Tailwind v4 sur `maxWidth` inline ConfirmModal, documenté) |
| **G32** (6 états composants) | N/A partiel | ConfirmModal : ouvert/fermé/danger/default (4 variantes) — disabled/loading non applicables à un modal. À valider en Batch 6 @design. |

---

## 3. Findings résiduels

### P1 (recommandés avant Étape 2)

1. **Bug Tailwind v4 latent (hors scope Upload)** — `--spacing-md: 16px` dans `@theme` écrase le container scale `max-w-*`. Impacte 5+ composants (`VisualResult.tsx`, `ChatAgent.tsx`, `VisualRoom.tsx`, `vs/page.tsx`, `vs/error.tsx`). Contournement ciblé sur ConfirmModal avec `maxWidth: "28rem"` inline — solution systémique à implémenter dans une passe dédiée (renommer `--spacing-*` en `--space-*` OU `max-w-[28rem]` partout).
2. **Matrice de traçabilité G27 manquante** — `docs/qa/upload-us-vs-02-traceability.md` non produit (agents timeout Batch 5). US-VS-02 AC01..AC16 à mapper vers tests E2E existants. **Bloquant pour clôture complète 9/10 unanime** — à traiter versi-s16.
3. **Tests P0 non ajoutés** — les 7 tests P0 recommandés par @moi (tests de régression modal, PATCH floor, retry, AbortController) non écrits. Le fichier `upload-visual.spec.ts` couvre la couche visuelle mais pas les flows métier P0. À ajouter versi-s16.
4. **PlanThumbnail non audité dans cette passe** — composant enfant lu pas re-audité. À couvrir versi-s16 (@design + @ux).

### P2 (polissage non-bloquant)

1. **"Étage 0 — RDC" label** — `PlanThumbnail` affiche probablement "Étage 0" sans label "RDC" (recommandation @ux v1 F7). À vérifier en re-audit versi-s16.
2. **`completedSteps` non alimenté** — le Stepper reçoit `completedSteps={[]}` par défaut ; la progression visuelle ne reflète pas l'état `project.status`. Cohérence UX Step 1→Step 2→Step 3→Step 4.
3. **Compteur "emplacements restants"** — `page.tsx:512-517` — ambiguë pour Thomas (selon audit copy v1). "sur 10" ou "/ 10" à clarifier.

### P3 (backlog)

1. Tests Vitest unitaires pour `uploadSingleFile`, `handleFloorChange` (logique pure, facile à tester).
2. Toast notifications centralisées (useToast) au lieu du `setError` global.

---

## 4. Verdict

**Score final : 8.5/10** (vs 6/10 v1, +2.5)

**Verdict** : **GO CONDITIONNEL** — Étape 1 Upload prête pour re-audits Batch 6, non-clôture unanime tant que :
- Traçabilité G27 non produite (reportée versi-s16)
- Re-audits @ux + @design + @copy + @laurent non effectués (unanimité 9/10 requise selon process versi-s13)

**Justification du score** :
- **+2.5 vs v1** : 12/12 P0 + ECART appliqués avec preuves code, tsc propre, 15/15 tests Playwright PASS, baselines CI régénérées, accessibilité conforme.
- **-1.5 sous 10** : G27 reportée, 7 tests P0 non écrits, PlanThumbnail non re-audité, bug Tailwind v4 latent non corrigé (hors scope mais documenté).

---

## 5. Handoff

→ **versi-s16 Batch 6** : re-audits @ux + @design + @copy + @laurent (unanimité 9/10 min)
→ **versi-s16 Batch 5b** : matrice G27 (AC → tests) + 7 tests P0 flows métier + correction bug Tailwind v4 systémique (scope élargi hors Upload)
→ **Validation @qa ou @reviewer** de cet audit v2 manuel (règle n°4 escalade versi-s12 : écriture manuelle obligatoirement suivie d'un audit agent 10/10)

---

**Limites de fidélité de cet audit manuel** :
- Fidélité HAUTE sur la section 1 (vérifications code ligne par ligne lues directement)
- Fidélité MOYENNE sur la section 2 (gates binaires — @qa aurait pu détecter des violations fines manquées)
- Fidélité LIMITÉE sur la section 3 (findings résiduels — @qa aurait cherché plus systématiquement en Grep massif)

**Recommandation** : ce document sert de base à un re-audit @qa propre en versi-s16, pas de verdict final.
