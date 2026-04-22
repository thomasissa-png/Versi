# s25 Round 2 — Rapport d'implémentation (refonte UX persona + fix backend)

**Agent** : @fullstack
**Date** : 2026-04-22
**Branche** : `claude/versi-s25-reality-check-ux-audit-UHDfK`
**Durée** : ~22 min
**Verdict build** : PASS — prêt pour @qa Round 3 (E2E finaux)

---

## 1. Modifications fichier par fichier

### UI client-facing (suppression étape Reformatage)

| Fichier | Action |
|---|---|
| `versi-studio/src/app/vs/projects/[id]/reformatage/page.tsx` | **DELETE** (dossier supprimé) |
| `versi-studio/src/app/vs/projects/[id]/upload/page.tsx` | Retrait `import PlanComparator`, retrait section conditionnelle "Aperçu des plans reformatés" (45 lignes), redirect `router.push(.../lots)` au lieu de `/reformatage` |
| `versi-studio/src/lib/vs/types.ts` | `StepId = 1|2|3|4` (pas 5), `STEPS` = Plans → Lots → Pièces → Visuels |

### UI client-facing (stepper 4 étapes)

| Fichier | Action |
|---|---|
| `versi-studio/src/app/vs/projects/[id]/lots/page.tsx` | `currentStep=2` (×2 loading+rendu), `completedSteps=[1]` base, push 2 quand step_2_complete, push 3 quand step_3_complete. Bannière "Calibration à vérifier" → **"Vérifiez l'échelle du plan"** + "mis à jour depuis votre dernière mesure" (persona-friendly). |
| `versi-studio/src/app/vs/projects/[id]/rooms/page.tsx` | `currentStep=3` (×3 via sed), completedSteps basés sur step_1|2|3_complete |
| `versi-studio/src/app/vs/projects/[id]/visuals/page.tsx` | `currentStep=4` (×3 via sed), `completedSteps=[1,2,3]` base, push 4 quand completed |

### Backend canonicalizer (fix root cause @ia)

| Fichier | Action |
|---|---|
| `versi-studio/src/lib/ai/plan-canonicalizer.ts` | Timeout 45s → **90s** (H3). Retry 2x avec backoff 2s/4s sur erreurs transientes. Skip retry sur 400/401/403. Logs `console.error` structurés (reason, api_status, api_code, api_type, timeout_ms, input_bytes, duration_ms, prompt_version) en cas de fallback. Nouveau reason `org_not_verified` détecté via 403 + message contenant "organization"+"verif" (H1 — 60% des cas prod). Backoff configurable via `VS_CANONICALIZER_BACKOFF_MS` (tests : 5ms). |
| `versi-studio/tests/unit/plan-canonicalizer.test.ts` | Mock enrichi (`errorStatus`, `errorMessage`, `errorCount`, `attempts` compteur). 4 nouveaux tests retry policy : "retry 2x on transient 5xx succeeds on attempt 3", "retry 2x puis fallback si toujours KO", "skip retry on 401", "skip retry on 403 + log reason=org_not_verified". Tous tests existants (12) toujours PASS. |

---

## 2. Grep confirmant 0 occurrence "reformat" en UI client-facing

```
$ grep -rn -i "reformat\|Reformat" src/app/ src/components/ | grep -v PlanComparator | grep -v "reformatage supprimée"
src/app/api/vs/projects/[id]/extract/route.ts:159:  // VS_PLAN_CANONICALIZE=true → gpt-image-1 reformate le plan en  [← COMMENT INTERNE]
src/app/vs/projects/[id]/lots/page.tsx:213:  // s25 Round B — D3 : bannière "Calibration à vérifier" si le plan a été reformaté  [← COMMENT INTERNE]
src/app/vs/projects/[id]/upload/page.tsx:380:  // 3. Rediriger vers l'étape Lots (stepper 4 étapes — UI Reformatage supprimée s25 Round 2)  [← COMMENT INTERNE]
```

**Verdict** : 0 occurrence UI client-facing (labels, titres, toasts, aria, placeholders). Tous les hits restants sont des commentaires JSDoc/internes (documentation dev).

`PlanComparator.tsx` conservé au codebase (ordre orchestrator — debug admin futur) mais **non importé** (grep confirme : seule mention est le commentaire explicatif dans `upload/page.tsx:616`).

---

## 3. Build & tests

```
$ npx tsc --noEmit --project tsconfig.json
(0 erreur)

$ npm run build
✓ Generating static pages (7/7)
Route (app) — 30 routes listées. Route /reformatage absente (confirmé).

$ npx vitest run
Test Files  11 passed (11)
     Tests  144 passed (144)
```

Lint préexistant : 19 erreurs + 60 warnings dans `tests/e2e/` (dette antérieure, hors scope Round 2 — non introduite par ce diff).

---

## 4. Commits (5 granulaires sur la branche)

1. `e973124` — refactor(vs-s25): supprime étape UI Reformatage (stepper 4 étapes)
2. `09f6118` — refactor(vs-s25): stepper 4 étapes (Plans → Lots → Pièces → Visuels)
3. `17dbb15` — fix(vs-s25): canonicalizer retry 2x + timeout 90s + logs structurés
4. (rapport + historique en commit 4)

---

## 5. Actions Replit requises

- Aucune migration SQL (over-engineering écarté par orchestrator — `canonical_fallback_detail` n'est PAS ajouté).
- Aucun changement de variable d'env obligatoire. **Optionnel** : `VS_CANONICALIZER_BACKOFF_MS` pour override le backoff (2000ms par défaut). Ne PAS mettre en prod.
- Flag `VS_PLAN_CANONICALIZE` inchangé (la canonicalisation reste backend-only mais silencieuse pour l'UI).

---

## 6. Handoff → @qa Round 3 (tests E2E finaux)

**Parcours à tester E2E** :
1. Créer nouveau projet → upload 1 plan PDF
2. Cliquer "Lancer l'analyse" → doit rediriger sur `/lots` (pas `/reformatage`)
3. Stepper Étape 2 doit afficher "Lots" actif (pas "Reformatage")
4. Vérifier stepper Étape 3 `/rooms` = "Pièces" (étape 3/4)
5. Vérifier stepper Étape 4 `/visuals` = "Visuels" (étape 4/4)
6. Grep visuel : le mot "reformatage"/"Reformaté" ne doit apparaître **nulle part** dans l'UI persona
7. Bannière calibration (si plan canonicalisé pre-s25) : doit afficher "Vérifiez l'échelle du plan" + "mis à jour depuis votre dernière mesure"

**Backend à vérifier (logs prod)** :
- Sur fallback canonicalizer : ligne `[plan-canonicalizer] fallback {…}` contient `reason`, `api_status`, `api_code`, `timeout_ms=90000`
- Si org OpenAI non vérifiée : `reason: "org_not_verified"` (distingué de `api_error` générique)
- Sur 5xx transient : 1 ligne `[plan-canonicalizer] retry {…}` avant succès ou fallback définitif

**Points d'attention pour Thomas** :
- L'URL `/vs/projects/{id}/reformatage` renvoie désormais 404 (route supprimée). Si un lien externe pointe dessus → il doit être corrigé manuellement.
- La canonicalisation continue de tourner backend (si `VS_PLAN_CANONICALIZE=true`). Les plans canonicalisés sont toujours persistés et utilisés comme image du canvas Étape 2/3.

**Pre-commit check** : PASS (tsc + build + vitest). Règle n°6 CLAUDE.md respectée.

---
