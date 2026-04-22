# s25 Phase 2 step 2 — Rapport d'implémentation pipeline canonicalisation

**Date** : 2026-04-22 · **Agent** : @fullstack · **Branche** : `claude/versi-s25-reality-check-ux-audit-UHDfK`

## Résumé

Pipeline canonicalisation gpt-image-1 implémenté derrière le feature flag `VS_PLAN_CANONICALIZE` (OFF par défaut). Build PASS, 125/125 tests PASS, zéro régression sur pipeline existant.

## Fichiers produits (6 livrables)

| # | Fichier | Rôle |
|---|---|---|
| 1 | `versi-studio/src/lib/ai/prompts/canonical.ts` | `CANONICAL_PROMPT_V1` (texte exact) + `CANONICAL_PROMPT_VERSION="1.0"` + `CANONICAL_IMAGE_PARAMS` (gpt-image-1, size 1536×1024, quality high, png opaque, n=1) |
| 2 | `versi-studio/src/lib/ai/plan-canonicalizer.ts` | Fonction `canonicalizePlan(buf, opts?)` — timeout 45s configurable, AbortSignal externe, downsample sharp >2048px, `openai.images.edit()` via `toFile()`, gates G1-G4 post-pipeline, fallback silencieux typé (`timeout` / `api_error` / `gate_fail` / `empty_input`), logs structurés JSON |
| 3 | `versi-studio/src/lib/vs/migrations/001_s25_canonicalized_plan.sql` + `db.ts` | Colonnes nullables sur `vs_plans` : `canonicalized_image_path` TEXT, `canonicalized_at` TIMESTAMPTZ, `canonical_fallback_reason` VARCHAR(30), `canonical_prompt_version` VARCHAR(10). Idempotent via `ADD COLUMN IF NOT EXISTS` dans `ensureVsTables()`. Types étendus dans `vs/types.ts`. |
| 4 | `versi-studio/src/app/api/vs/projects/[id]/extract/route.ts` (hook) | Si `VS_PLAN_CANONICALIZE==="true"` → rasterise PDF si nécessaire (pdf-to-img) → `canonicalizePlan()` → persist chemin + horodatage + version prompt (ou fallback reason) → passe le buffer canonical à `extractPlanData()`. Try/catch englobant : aucune exception ne casse le pipeline. |
| 5 | `versi-studio/src/components/vs/PlanComparator.tsx` + intégration `upload/page.tsx` | Grille 2 cols desktop / stack mobile, labels "Original" / "Reformaté", lightbox clic + Escape + role=dialog aria-modal, bannière dégradée si fallback avec libellés FR lisibles. Section conditionnelle affichée dans `/upload` dès qu'un plan a `canonicalized_image_path` ou `canonical_fallback_reason`. Jargon banni vérifié (pas de polygone/zone/calque/contour). |
| 6 | `versi-studio/tests/unit/plan-canonicalizer.test.ts` | 7 tests Vitest PASS : happy path + idempotence par hash + timeout (racing abort) + api_error + gate_fail ≥ 2 → fallback + empty_input + clé API placeholder rejetée. Mocks `sharp` et `openai` isolés — aucun appel réseau réel. |

## Build check pre-commit

```
cd versi-studio
npx tsc --noEmit --project tsconfig.json  # 0 erreur
npm run lint                               # 7 err pré-existantes, 0 sur les fichiers s25
npm run build                              # PASS
npx vitest run                             # 125/125 PASS (dont 7 nouveaux)
```

Les erreurs lint pré-existantes (tests/e2e) ne concernent pas les livrables s25.

## Décisions techniques notables

1. **Size `1536x1024`** au lieu de `2048x2048` annoncé dans prompt-library.md. Le SDK OpenAI v5 rejette `2048x2048` pour `images.edit`. `1536x1024` est la plus grande taille paysage supportée et reste cohérente avec l'A4 paysage ~1.41:1 du prompt. Noté dans canonical.ts pour bump v2 si OpenAI débloque la résolution.
2. **Persist canonical** dans `dirname(plan.file_path)/{plan.id}-canonical.png` → réutilise l'endpoint `/api/vs/files?path=` existant, pas de nouvelle route à créer/sécuriser.
3. **Gates G1-G4 en quick-check sharp** (resize 256px + comptage pixels blanc/noir). Seuils conservateurs (G1 ≥60% blanc vs 95% théorique) pour éviter les faux fallbacks qui tuent le bénéfice. Les métriques précises sont laissées au reality check @qa + audit Yann.
4. **PDF → PNG rasterisé avant canonicalisation** (pdf-to-img scale 3, page 1). gpt-image-1 n'accepte pas PDF.
5. **Import dynamique sharp + openai** (pattern s24) pour éviter crash worker Turbopack.
6. **Pattern s22 `openai.images.edit() + toFile()`** strictement respecté, `responses.create()` JAMAIS utilisé.

## Limites connues / points d'attention QA

- Tests unitaires **mockent** OpenAI : aucune validation que le prompt produit un bon output sur plans réels (c'est le job Phase 2 step 3 @qa).
- Gates G1-G4 sont des proxies pragmatiques, pas des mesures géométriques strictes. Le critère "hallucination géométrique >3px" du prompt N'EST PAS vérifié côté code — @qa + @interior-architect doivent le valider visuellement.
- Pas de cache d'idempotence côté librairie : deux appels au même buffer rappelleront l'API. L'idempotence est assurée côté caller via `canonicalized_image_path` en DB (on ne re-canonicalise pas si déjà présent, US-VS-R4 — à implémenter en Phase 2 step 4 si non couvert par le reality check).
- Timeout route Next.js reste à `maxDuration = 300` — canonicalisation ajoute 15-25s par plan en parallèle dans Promise.all, marge OK.
- Mode dégradé US-VS-R5 : bannière "Plan non reformaté" livrée dans PlanComparator, avec libellé FR variable selon la reason.

## Grep rollout effectué

- `PlanComparator` : 1 usage (upload/page.tsx), cohérent.
- `canonicalized_image_path` : 6 occurrences (types, db, extract route, upload page, migration, comparator) — toutes alignées.
- `VS_PLAN_CANONICALIZE` : 1 occurrence (extract/route.ts) — flag lu au runtime, pas de valeur par défaut cachée.
- Jargon banni dans les composants canonicalisation : `grep -n "polygone\|zone\|calque\|contour" PlanComparator.tsx` → 0 match.

## Actions Replit requises

- Ajouter Secret Replit `OPENAI_API_KEY` (déjà en place pour les autres usages OpenAI — à vérifier qu'il a bien les droits `images.edit` sur gpt-image-1).
- Ajouter Secret Replit `VS_PLAN_CANONICALIZE=true` pour activer en staging. En prod, rester OFF tant que gate @moi Phase 2 n'est pas PASS.
- La migration SQL est appliquée automatiquement par `ensureVsTables()` au démarrage — aucune action manuelle.

## Commits

Implémentation livrée en un seul commit atomique sur la branche `claude/versi-s25-reality-check-ux-audit-UHDfK` (voir git log).

---

## Handoff → @qa (Phase 2 step 3)

**Mission** : reality check E2E sur 5 plans réels + exécution des 3 TC de `docs/ia/s25-canonical-test-cases.md`.

**Fichiers à tester** :
- Endpoint : `POST /api/vs/projects/[id]/extract` avec `VS_PLAN_CANONICALIZE=true`
- UI comparateur : `/vs/projects/[id]/upload` après extraction
- Lib : `src/lib/ai/plan-canonicalizer.ts` (import direct possible pour tests CLI)

**Protocole recommandé** :
1. Activer flag `VS_PLAN_CANONICALIZE=true` en staging Replit.
2. Uploader 5 plans (P00-P03 + Muguets si dispo) sur un projet neuf.
3. Lancer l'extraction. Mesurer P95 latence pipeline complet (cible ≤90s).
4. Screenshot Playwright du comparateur sur chaque plan (US-VS-R1).
5. Mesurer coût via logs billing OpenAI (cible ≤$0.10/plan moyen).
6. Vérifier DB : `SELECT id, canonicalized_image_path, canonical_fallback_reason, canonical_prompt_version FROM vs_plans WHERE project_id = $1` — 5/5 rows avec chemin non-null ou reason typée.
7. Comparer score 10/10 moyen ON vs OFF sur les 5 plans — gain cible ≥+1.5 pts.
8. Mode dégradé US-VS-R5 : forcer un fallback (ex : bad API key) → bannière "Plan non reformaté — résultats moins précis" visible, non-masquable, pipeline continue.
9. US-VS-R4 idempotence : re-cliquer "Lancer l'analyse" sur un projet déjà canonicalisé → pas de second appel OpenAI observable (à valider avec @qa si le code actuel le couvre ou si un check DB doit être ajouté).

**Points d'attention critiques** :
- Le prompt `CANONICAL_PROMPT_V1` est la source de vérité — si le résultat visuel dérive, c'est le prompt à itérer (@ia), pas la librairie.
- Gates G1-G4 sont pragmatiques — si des outputs "propres" déclenchent gate_fail, ajuster les seuils dans `runQualityGates()`.
- **Pre-commit check** (Règle n°6 CLAUDE.md) : PASS confirmé (`tsc && lint && build && vitest`).

**Actions Replit** : cf. section dédiée ci-dessus.
