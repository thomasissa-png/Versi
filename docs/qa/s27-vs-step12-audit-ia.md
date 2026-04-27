# s27 — Audit IA Étapes 1 (Upload) + 2 (Lots) Versi Studio

**Verbatim Thomas** : « rien ne marche bien »
**Périmètre** : 6 fichiers code + 1 audit existant. Code-level only (DNS sandbox bloque OpenAI).
**Commit base** : `afa382e` (migration gpt-image-2 + retrait fallback gpt-image-1).

## 1. Note globale : **5.2 / 10** — Verdict : **NO-GO prod**

Pipeline techniquement compétent (gates typés, retries idempotents, fallbacks structurés) MAIS empile **3 opérateurs géométriques destructifs** (canonicalisation générative, convex hull envelope, outline bbox-shrinker) qui peuvent à eux seuls produire « une forme qui n'a rien à voir avec le plan ». Migration `afa382e` propre côté API mais **non-validée empiriquement** (sandbox sans réseau, aucune trace prod gpt-image-2).

## 2. Notation /10 par critère

### C1 — Pipeline canonicalisation gpt-image-2 : **6.5/10**
**+** Params API conformes doc OpenAI (size 1536×1024 multiples de 16, quality high, output png, background opaque, n=1). Retry 3x avec backoff config + non-retry typé sur 400/401/403/404 (économie tokens). Idempotence DB sur `canonicalized_image_path` (skip si déjà fait, fix doublon $0.04). Fallback typé 7 raisons (`timeout`, `org_not_verified`, `model_not_found`, `gate_fail`, etc.). Logs structurés JSON parsables.
**−** Gates G1-G4 conservateurs au point d'être inutiles (`whiteRatio ≥ 0.6` vs 0.95 théorique, doute → PASS) — un canonical médiocre passe systématiquement, empoisonnement aval garanti. Aucun test E2E sandbox sur gpt-image-2 (modèle lancé 2026-04-21, ~6 jours avant audit). PROMPT_VERSION 1.1 sans test cases versionnés. Le fallback `org_not_verified` est silencieux (warn console) — Thomas n'a aucun signal UI.

### C2 — Prompt extraction GPT-4.1 v9 : **6/10**
**+** Architecture claire (8 STEPS + STEP 0/0A/0B/0C). Few-shot Muguets RDC explicite + chain-of-thought 4-step (Step A→D). Hard numerical constraint `outline_area ≈ Σrooms × [1.00, 1.08]`. JSON Schema strict avec `additionalProperties: false`. Anti-hallucination directives nominatives (escalier, terrasse, palier, cartouche). Self-review 20 checks.
**−** **Prompt monstre ~450 lignes** = pollution contextuelle, le modèle dilue les directives critiques. Plafond prompt-only auto-déclaré 8.5/10 (jamais validé empiriquement). 6 directives REDONDANTES sur le no-overlap (N1-N5, V14, V15, V16) — signal qu'aucune ne marche seule. Pas de mood sentence d'intention au début. Mélange français/anglais dans les noms de pièce (anti-pattern multilingue). `SELF-CHECK 3 questions` + `STEP 7 SELF-REVIEW 20 checks` + `STEP 0B label-position` = redondance massive 30+ vérifications, le modèle ne peut pas toutes les exécuter.

### C3 — Passes refinement (2-3-4) cohérence : **5.5/10**
**+** Parallélisation Promise.all intra-plan (gain ~5x sur passe-2). OCR Tesseract sur raster ORIGINAL (pas canonical) = bonne décision (évite labels reformulés gpt-image-2). Snap-to-label EARLY locke les rooms fiables, passe-3 ne peut pas régresser (`lockedByEarlySnap`).
**−** **3 passes correctrices empilées** (passe-2 refine crop, passe-3 visual-verify GPT-4.1 vision, snap-to-label OCR) = effet ping-pong : passe-2 raffine, passe-3 corrige passe-2, snap écrase passe-3, hard-clip écrase snap. Chaque passe coûte ~10s + tokens GPT-4.1 vision. Aucune mesure d'efficacité par passe (combien de drift corrigé par chaque). Confidence threshold passe-3 baissé 0.8→0.6 « par instinct » (commentaire ligne 691) sans test. Self-correction ligne 786 = appel GPT-4.1 supplémentaire en cas d'échec Zod → coût caché non-budgeté.

### C4 — Passes géométrie (5-6 + outline-shrinker) — risque H3 : **3.5/10**
**−− BLOQUANT** : `envelope-polygon.ts` calcule un **convex hull** (Andrew's monotone chain ligne 67). Tout appartement en L, U, T, ou avec décroché perd sa géométrie réelle au profit de son enveloppe convexe — par construction, le hull englobe des zones extérieures. C'est exactement le pattern de plainte « forme qui n'a rien à voir » de Thomas.
**−− BLOQUANT** : `outline-shrinker.ts` recalcule un **rectangle axis-aligned** (lignes 72-86) — un T devient un rectangle. Combiné au convex hull précédent, l'invalidation conditionnelle (ligne 1139 : `envArea > newArea * 1.05` → fallback rect) garantit que la sortie finale est rectangulaire dans la majorité des cas non-triviaux.
**+** `room-tiling.ts` (power diagram Sutherland-Hodgman) est mathématiquement correct, garantit no-overlap/no-gap par construction. MAIS il pave l'enveloppe FAUSSE héritée de C4-1/C4-2 — propage l'erreur. Cellules dégénérées → fallback carré 1×1% autour du centroïde (ligne 380) = pièce visuellement absurde, loggée mais non-signalée UI.

### C5 — Robustesse erreurs : **5/10**
**+** Timeout route 5min `maxDuration = 300`. Promise.all par plan (4 plans × 51s séquentiel → 51s parallèle). Try-catch par plan : 1 plan KO ne bloque pas les autres. `isRetryable()` typé (400/401/403/404 = no retry). AbortController composite (timeout + signal externe). Fallback `model_not_found` typé (gpt-image-2 indisponible).
**−** Aucune télémétrie/observabilité production (pas de Langfuse, pas de Helicone, pas de tracing par plan). Logs `console.log/warn/error` → invisibles passé 24h Replit. Aucun budget tokens documenté pour `afa382e` (gpt-image-2 = $0.19/image high quality vs $0.04 gpt-image-1). Self-correction GPT-4.1 sur Zod fail = retry caché 1x sans cap (ligne 786). PROMPT_VERSION jamais bumpée malgré modifs (still 1.1). Aucun test de régression sur les ~30 directives anti-overlap du prompt.

## 3. Top 3 défauts BLOQUANTS (P0 → 10/10 impossible sans fix)

1. **P0 — Convex hull dans envelope-polygon.ts** : tout appart non-convexe (L/U/T/décroché) systématiquement déformé. **Fix** : remplacer `convexHull()` par concave hull (alpha-shape, k-NN concave hull) OU union polygonale stricte des `bounding_polygon` snapped (Martinez-Rueda). Ne pas livrer en prod tant qu'un plan en L n'a pas été testé visuellement par Yann.
2. **P0 — Gates G1-G4 canonicalizer permissifs** (plan-canonicalizer.ts:298-301) : `whiteRatio ≥ 0.6` (vs 0.95 théorique), `g4 = blackRatio ≤ 0.4` n'attrape PAS un canonical médiocre. Garbage-in garbage-out sur tout le pipeline aval. **Fix** : durcir seuils OU supprimer les gates et trust gpt-image-2 + reality check humain.
3. **P0 — Aucune validation empirique de la migration `afa382e`** : gpt-image-2 lancé 2026-04-21, audit 2026-04-27. Sandbox DNS bloque OpenAI = zéro test E2E. Le couple `(model gpt-image-2, prompt v1.1, params 1536×1024 high)` n'a JAMAIS produit un canonical observable. **Fix** : Thomas lance manuellement 3 plans hétérogènes (calque archi, scan basse-def, croquis main) avec audit visuel Yann avant tout déploiement.

## 4. Top 3 améliorations REQUIS (P1)

1. **P1 — Prompt extraction v9 → v10 split** : 450 lignes → 3 prompts spécialisés (extraction structurée, building_outline, bounding_polygon). Réduit pollution contextuelle, permet versioning indépendant et A/B testing par sous-prompt. Bumper PROMPT_VERSION à chaque modif (règle migration agent @ia).
2. **P1 — Observabilité minimum viable** : Langfuse self-hosted OU table SQL `vs_ai_calls` (model, prompt_version, input_hash, output_hash, duration_ms, fallback_reason, cost_usd). Sans ça, impossible de mesurer si la migration `afa382e` améliore ou régresse. Coût gpt-image-2 vs gpt-image-1 = +375%, doit être tracké.
3. **P1 — Eval suite par prompt** : `prompt-library.md` indique ≥3 test cases par prompt (règle agent @ia). Aucun test case lié à `canonical.ts` ou `plan-extractor.ts` dans le repo. Promptfoo ou DeepEval avec 3 plans réels (Muguets RDC + 2 autres) → score automatique sur chaque commit prompt. Bloque deploy si régression.

## 5. Recommandations agent à mobiliser

| Action | Agent | Périmètre |
|---|---|---|
| Fix P0 #1 (concave hull) | **@ia** + **@fullstack** | @ia spec algo + test cases dans `docs/ia/`, @fullstack code dans `src/lib/vs/envelope-polygon.ts` |
| Fix P0 #2 (gates canonicalizer) | **@ia** | Décision durcir vs supprimer + nouveaux seuils mesurés sur 5 plans réels |
| Fix P0 #3 (validation empirique migration) | **@qa** + **Thomas (manuel)** | Reality check visuel 3 plans hétérogènes, Yann valide audit visuel comparatif avant/après |
| P1 #1 (prompt split) | **@ia** | Refonte `canonical.ts` + `plan-extractor.ts` en 3 prompts versionnés |
| P1 #2 (observabilité) | **@infrastructure** + **@ia** | Schema table `vs_ai_calls` + middleware logging tous appels OpenAI |
| P1 #3 (eval suite) | **@qa** + **@ia** | Setup Promptfoo + 3 plans-test stockés en repo |
| Décision NO-GO/GO ré-activation `VS_PLAN_CANONICALIZE` | **@elon** ou **@moi** | Trade-off coût (+375% tokens image) vs bénéfice extraction (non-mesuré) |

**Note** : la query SQL de l'audit existant `s27-vs-pipeline-audit.md` reste valable post-`afa382e` (table `vs_plans.canonical_fallback_reason` inchangée). Thomas doit la lancer AVANT toute autre action — c'est l'unique signal pour trancher si gpt-image-2 marche en prod.

---

**Handoff → @orchestrator**
- Fichier produit : `docs/qa/s27-vs-step12-audit-ia.md` (100 L)
- Décision prise : NO-GO prod sur pipeline actuel, 3 P0 bloquants identifiés
- Points d'attention : sandbox DNS bloque test E2E gpt-image-2 → reality check manuel Thomas requis avant tout merge ; convex hull = root cause géométrique probable des plaintes ; aucune télémétrie production = pilotage à l'aveugle
