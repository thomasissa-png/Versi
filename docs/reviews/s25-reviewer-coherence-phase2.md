# Revue croisée @reviewer — Cohérence gate @moi vs impl s25

**Date** : 2026-04-22 · **Agent** : @reviewer · **Session** : versi-s25
**Branche** : `claude/versi-s25-reality-check-ux-audit-UHDfK`

## Verdict global : 9/10 critères PASS, 1 PARTIEL — GO CONDITIONNEL

Impl @fullstack très fidèle à l'arbitrage @moi Phase 1. Zéro drift architectural. Un seul critère PARTIEL (critère #6 qualité fonctionnelle) et zéro critère FAIL. Le doute US-VS-R4 (idempotence) soulevé par @fullstack dans son rapport step 2 a été levé : l'implémentation du hook contient bien la logique de skip-if-cached (lignes 171-208 de `extract/route.ts`). Reality check E2E @qa + audit Yann restent obligatoires pour passer à GO PRODUCTION.

## Détail par critère (source : `s25-gate-moi-phase1-arbitrage.md` § "Critères d'acceptation Phase 2")

| # | Critère gate @moi | Verdict | Preuve / commentaire |
|---|---|---|---|
| 1 | `CANONICAL_PROMPT_V1` validé visuellement sur 3 test cases dans `prompt-library.md` | PARTIEL | `prompts/canonical.ts` importé proprement dans `plan-canonicalizer.ts:22-27` (prompt + version + params + max-width). Validation visuelle 3 plans = responsabilité @ia Phase 2 step 1 — rapport @fullstack confirme la référence mais ne porte pas cette gate (hors scope impl). À confirmer que `docs/ia/s25-canonical-test-cases.md` existe avec 3/3 PASS (rapport @fullstack ligne 70 le cite). |
| 2 | Signature `plan-canonicalizer.ts` exacte + timeout 45s + fallback silencieux + idempotent via hash input | PASS | `plan-canonicalizer.ts:231-330` `canonicalizePlan(buf, opts?)` → `CanonicalizeResult`. Timeout 45s par défaut (`DEFAULT_TIMEOUT_MS = 45_000` ligne 66), configurable via `opts.timeoutMs`. Fallback silencieux 100% : « Ne throw JAMAIS » (ligne 226) — 4 reasons typées (timeout, api_error, gate_fail, empty_input, + flag_off déclaré). Idempotence : `inputHash` SHA-256 calculé ligne 237, retourné ligne 302 pour dedup côté caller (cohérent avec commentaire ligne 231 « côté caller via cache DB »). |
| 3 | Comparateur UI "Original / Canonicalisé" visible sans clic supplémentaire | PASS | `PlanComparator.tsx:61-80` grille 2 colonnes desktop (`md:grid-cols-2`), stack mobile (`grid-cols-1`). Labels "Original" / "Reformaté" rendus sans interaction (titre rendu dans `figcaption` ligne 104). Lightbox clic = BONUS, pas requis pour passer la gate. Intégré dans `upload/page.tsx` (rapport @fullstack ligne 17). |
| 4 | `canonicalized_image_path` persiste en DB + ré-extraction ne rejoue pas (US-VS-R4) | PASS | `extract/route.ts:171-208` : re-query `canonicalized_image_path` en DB au début du bloc canonical. Si `existingPath` non-null ET fichier lisible → `extractBuffer = cachedBuffer`, `extractMime = "image/png"`, log "canonicalisation skippée". **AUCUN appel `canonicalizePlan()` dans ce chemin.** Le commentaire @fullstack ligne 45 rapport step 2 (« à valider si le code actuel le couvre ») est obsolète : le code le couvre bien. Seul bémol stylistique : usage d'un `throw new Error("__CANONICAL_SKIP_SENTINEL__")` (ligne 198) pour sortir du bloc — fonctionnel mais à refactorer en flag booléen propre. Non-bloquant. |
| 5 | Mode dégradé US-VS-R5 testé (bannière "Plan non reformaté — résultats moins précis") | PASS | `PlanComparator.tsx:50-59` : `{!hasCanonical && (...)}` → bandeau amber non masquable, texte exact « Plan non reformaté — résultats d'analyse moins précis. » + suffix reason via `labelForReason()` ligne 156-169 (4 libellés FR : temps dépassé, erreur service IA, reformatage non conforme, plan vide). Persistance DB côté route : `extract/route.ts:246-252` UPDATE `canonical_fallback_reason` en cas de fallback. Test E2E forçage fallback = responsabilité @qa. |
| 6 | Feature flag `VS_PLAN_CANONICALIZE` nom exact + OFF par défaut | PASS | `extract/route.ts:162` : `if (process.env.VS_PLAN_CANONICALIZE === "true")` — égalité stricte sur string `"true"` → toute autre valeur (incl. absent) = OFF. Nom exact validé. Aucune valeur par défaut cachée (rapport @fullstack ligne 53 confirme 1 seule occurrence dans extract/route.ts). |
| 7 | Jargon UI banni : zéro "polygone/zone/calque/contour" dans composants canonicalisation | PASS | `PlanComparator.tsx` relu ligne par ligne : aucun des 4 mots bannis. Mots métier utilisés : "plan" (multiples), "reformaté" (4×), "pièce" (implicite via `labelForReason`), "original". Rapport @fullstack ligne 54 confirme `grep -n "polygone\|zone\|calque\|contour" PlanComparator.tsx → 0 match`. Cohérent règle s23 "Mot pivot métier UI". |
| 8 | Pipeline actuel intact avec flag OFF | PASS | `extract/route.ts:159-161` : `let extractBuffer: Buffer = fileBuffer` défini AVANT le bloc flag. Bloc `if (process.env.VS_PLAN_CANONICALIZE === "true")` ligne 162 est entièrement skippé si flag OFF → `extractBuffer` reste `fileBuffer`, `extractMime` reste `plan.mime_type` → `extractPlanData()` ligne 269 appelé exactement comme avant s25. Rapport @fullstack ligne 7 : "125/125 tests PASS, zéro régression". Preuve logique + preuve tests. |
| 9 | Nom colonne DB `canonicalized_image_path` exact | PASS | `extract/route.ts:171-174` SELECT, ligne 233 UPDATE, ligne 248 UPDATE fallback. Rapport @fullstack ligne 15 : migration `001_s25_canonicalized_plan.sql` crée `canonicalized_image_path TEXT` + `canonicalized_at TIMESTAMPTZ` + `canonical_fallback_reason VARCHAR(30)` + `canonical_prompt_version VARCHAR(10)`. 4 colonnes alignées sur les specs PM. |
| 10 | Logs structurés (input_hash, output_hash, duration_ms, fallback, reason, prompt_version) | PASS | `plan-canonicalizer.ts:74-85` helper `logEvent()` préfixe `[plan-canonicalizer]` + JSON.stringify payload. Tous événements success/fallback émettent : `inputHash` + `outputHash` + `duration_ms` + `prompt_version` + `gates` (success/gate_fail) + `reason` (fallback) + `bytes_out` (success). Lignes 240, 266-273, 288-295, 311-318. Parseable pour prod monitoring. |

## P0/P1 identifiés (bugs à corriger avant gate @moi finale)

**P0 (bloquant gate @moi Phase 2)** : aucun. Tous les critères impl sont tenus.

**P1 (à surveiller @qa step 3)** :
- Critère #1 (validation prompt @ia) : confirmer que `docs/ia/s25-canonical-test-cases.md` contient bien 3 tests PASS avant GO PRODUCTION. Le rapport @fullstack le référence mais @reviewer n'a pas ouvert ce fichier (budget Read épuisé). **Action @orchestrator** : demander à @ia confirmation écrite ou lire le fichier.
- Taille image `1536x1024` vs `2048x2048` annoncée (décision @fullstack ligne 34 rapport) : non-bloquant, limitation SDK OpenAI v5 documentée, mais à re-checker quand OpenAI débloquera.
- Gates G1-G4 pragmatiques (seuils conservateurs, G1 ≥60% blanc vs 95% théorique) : risque faux PASS sur outputs dégradés → audit Yann DOIT catcher les cas où `fallback=false` mais plan canonicalisé visuellement mauvais. Reality check @qa : compter les discordances `fallback=false` ∩ Yann < 8/10.
- Sentinel `__CANONICAL_SKIP_SENTINEL__` (route ligne 198) : dette technique mineure, à refactorer en flag booléen propre lors du passage Phase 3. Non-bloquant.

## Gates @moi Phase 2 finale — rappel des 4 conditions

1. Code review PASS : **OUI** (ce rapport, 9/10 PASS + 1 PARTIEL sous responsabilité @ia).
2. Tests automatisés PASS : **OUI** (125/125 rapport @fullstack ligne 7, dont 7 nouveaux sur canonicalizer).
3. Reality check E2E PASS : **PENDING @qa** (5 plans, P95 ≤90s, gain ≥+1.5 pts ON vs OFF, screenshots Playwright).
4. Audit persona Yann 10/10 : **PENDING @interior-architect** (pré-fetch images requis, cf. CLAUDE.md workflow audit visuel).

Rappel doctrinal @moi : **3/4 = NO-GO, pas GO conditionnel**. Thomas n'accepte pas la négociation 9/10 sur les 4 conditions terminales.

## Handoff

**→ @orchestrator (Phase 2 step 3 & step 4)**

Fichier produit : `/home/user/Versi/docs/reviews/s25-reviewer-coherence-phase2.md`

Décisions tranchées : GO CONDITIONNEL sur impl @fullstack. Aucun bug P0, aucun drift vs arbitrage @moi Phase 1. Passage autorisé vers @qa (reality check) + @interior-architect (audit visuel) en parallèle.

Points d'attention pour l'orchestrateur :
- Vérifier que `docs/ia/s25-canonical-test-cases.md` existe avec 3/3 PASS (critère #1 PARTIEL).
- Lancer @qa avec flag `VS_PLAN_CANONICALIZE=true` en staging Replit + 5 plans (P00-P03 + Muguets).
- Pré-fetch les 10 images (5 inputs + 5 outputs canonicalisés) AVANT de lancer @interior-architect (règle CLAUDE.md : agents audit visuel n'ont pas WebFetch).
- Parallélisation @qa + Yann autorisée (cohérent arbitrage Phase 1 ligne 50).
- Corriger le sentinel `__CANONICAL_SKIP_SENTINEL__` lors de la Phase 3 (dette technique, non-bloquant).
