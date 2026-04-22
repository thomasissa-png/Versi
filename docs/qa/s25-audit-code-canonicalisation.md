# Audit code — Canonicalisation plan s25

**Date** : 2026-04-22
**Commit audité** : `d3a979c`
**Scope** : 5 fichiers livrés s25 (prompt, canonicalizer, migration, hook extract, PlanComparator)
**Verdict global** : PASS conditionnel — 3 points d'attention MOYEN, 0 BLOQUANT. Prêt pour reality check Thomas sur staging.
**Tests unit** : 125/125 PASS (OpenAI mockée — prompt non validé sur plans réels, d'où reality check obligatoire).

## Matrice gravité

| # | Fichier | Sujet | Gravité | Statut |
|---|---|---|---|---|
| 1 | plan-canonicalizer.ts L181-184 | Sharp sans validation sortie `meta.format/channels` | MOYEN | À monitorer via gates |
| 2 | extract/route.ts L168-175 | Rasterisation PDF page 1 uniquement — plans multi-pages perdus | MOYEN | Documenté — comportement actuel pipeline aval |
| 3 | extract/route.ts L180-184 | Path join sans assainissement `plan.id` | FAIBLE | UUID DB-contrôlé, pas d'input user |
| 4 | canonical.ts L62-69 | Pas de `response_format` explicite (b64_json forcé ?) | MOYEN | SDK OpenAI v5 retourne b64_json par défaut pour gpt-image-1, OK |
| 5 | plan-canonicalizer.ts L115 | Détection placeholder `sk-placeholder` uniquement | FAIBLE | Ajouter `sk-test` / vide pour robustesse |
| 6 | PlanComparator.tsx | `<img>` sans `onError` → icône cassée si file introuvable | FAIBLE | UX mineur |

## 1. canonical.ts (prompt)

**Bon** :
- `CANONICAL_PROMPT_VERSION` exporté → traçabilité DB OK.
- Règles négatives explicites (#3, #4) — conformes brief @moi Phase 2 (anti-invention, anti-fermeture ouvertures).
- Hyperparamètres `size: 1536x1024` cohérents avec ratio A4 paysage demandé.

**Attention** :
- `CANONICAL_DOWNSAMPLE_MAX_WIDTH = 2048` alors que `size` output = 1536. OK côté input (sharp downsample AVANT envoi) mais écart de 512px → peut saturer la mémoire GPU côté OpenAI. **Recommandation** : baisser à 1536 pour aligner input/output et réduire latence.
- Tolerance "5°" dans le prompt (#1) — gpt-image-1 n'a pas de notion métrique de degrés. Risque : rotation non déterministe. À observer en reality check.

## 2. plan-canonicalizer.ts (lib)

**Excellent** :
- Pattern `ne throw jamais` respecté — tous les paths retournent `CanonicalizeResult`.
- Timeout racing + abort signal externe — proprement cleanup dans `finally`.
- Import dynamique sharp + OpenAI (pattern s24 anti-Turbopack).
- Hash SHA-256 input/output — idempotence + dedup DB possibles.
- Logs structurés JSON préfixés `[plan-canonicalizer]` — parsing prod OK.

**À surveiller** :
- Gates G1-G4 (L174-214) : seuils `whiteRatio >= 0.6` très permissifs (prompt exige 95%). Choix conservateur documenté L173 — acceptable en v1 mais à recalibrer après 10+ plans réels. Si reality check Thomas révèle des outputs médiocres malgré gates PASS → resserrer seuils.
- L115 `apiKey.startsWith("sk-placeholder")` — manque détection `""` (chaîne vide après trim). **Fix recommandé** : `if (!apiKey?.trim() || apiKey.startsWith("sk-placeholder"))`.
- L148 `if (!b64) throw` — si OpenAI retourne `url` au lieu de `b64_json` (changement silencieux SDK), fallback propre via catch. OK.

## 3. migration 001_s25

**PASS** :
- `IF NOT EXISTS` partout → idempotente (rejouable safe).
- Aucun index — justifié (lookup par PK).
- Pas de CHECK constraint sur `canonical_fallback_reason` — souple pour itération v1. Ajouter ENUM post-s25 si stabilité confirmée.

## 4. extract/route.ts (hook canonicalisation L155-218)

**PASS fonctionnel** :
- Feature flag `VS_PLAN_CANONICALIZE === "true"` correctement gardé (strict string).
- Try/catch autour du bloc entier → pipeline extract ne casse jamais.
- Parallélisation préservée via `Promise.all` s24.
- DB update both success AND fallback paths — traçabilité complète.

**Points d'attention** :
- **PDF multi-pages** (L168-175) : la boucle `for await (const page of pages) { ...; break; }` ne prend QUE la première page. Si Thomas uploade un PDF multi-étages (R+1, R+2 en un seul PDF), seul R+1 est canonicalisé. Comportement identique au pipeline extract actuel — pas une régression, mais à documenter dans specs US-VS-R1.
- **DNS/tmp storage** : `writeFile(canonicalPath, ...)` sans vérification du disque. En staging Replit, `/tmp` éphémère OK mais prod doit persister sur storage. Déjà convention s24, pas de régression.
- **Rollback atomique** : si `writeFile` réussit mais `query UPDATE` échoue, fichier orphelin sur disque. Acceptable v1 (fichier `-canonical.png` re-créé à chaque run).

## 5. PlanComparator.tsx

**PASS UX** :
- Lightbox accessible (role="dialog", aria-modal, aria-label).
- Escape key cleanup listener correct.
- Stop propagation sur img click (évite close accidentel).
- Bandeau fallback affiche reason traduite.

**Mineur** :
- `<img>` sans `onError` handler. Si `canonicalizedUrl` renvoie 404 (fichier effacé), affiche icône cassée. Ajouter fallback UX post-s25 si Thomas remonte.

## Mot pivot métier (Grep)

`polygone`, `calque`, `contour`, `zone` → **0 occurrence** dans les 5 fichiers. Conformité stricte vocabulaire s23.

## Conformité brief @moi Phase 2

Critères vérifiés vs `docs/reviews/s25-gate-moi-phase1-arbitrage.md` :
- [x] Feature flag OFF par défaut
- [x] Fallback silencieux systématique (5 reasons typées)
- [x] Prompt V1 versionné + tracé DB
- [x] Gates G1-G4 implémentés (seuils conservateurs documentés)
- [x] Logs JSON structurés
- [x] Idempotent par hash
- [x] Tests unit 125/125 PASS
- [ ] **Reality check E2E Thomas staging** — EN ATTENTE (script livré côté `scripts/s25-canonicalisation-reality-check.ts`)

## Verdict final

**PASS CONDITIONNEL** → débloquer merge uniquement après reality check E2E Thomas.
Aucun bug BLOQUANT. 3 items MOYEN à surveiller en observabilité post-staging (gates seuils, PDF multi-pages, placeholder detection).
