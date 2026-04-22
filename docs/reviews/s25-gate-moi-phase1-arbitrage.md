# Gate @moi Phase 1 — Arbitrage approche canonicalisation s25

**Date** : 2026-04-22
**Agent** : @moi (proxy fondateur Thomas)
**Session** : versi-s25

## Cohérence inter-livrables

**VERDICT : les 3 livrables convergent, zéro contradiction détectée.**

- @creative-strategy → canonicalisation = prérequis stratégique, différenciateur structurel (aucun concurrent ne le fait).
- @product-manager → V1 bloquante, 5 US cohérentes, critères GO PRODUCTION alignés (≤90s, ≤$0.10/plan, 0 pièce fantôme, audit Yann 10/10, reality check E2E 5 plans).
- @ia → Approche B (pré-rendu IA `openai.images.edit()`), architecture + feature flag + fallback + colonne DB alignés sur les specs PM.

Points de friction mineurs tranchés :
- **Feature flag** : retenir `VS_PLAN_CANONICALIZE` (pivot PM, cohérent avec les US).
- **Colonne DB** : retenir `canonicalized_image_path` (cohérent avec les colonnes existantes `*_path` dans vs_plans).

## Approche retenue

**Approche B — Pré-rendu IA `openai.images.edit()` gpt-image-1 + fallback silencieux plan original. VALIDÉE.**

Justification Thomas-fondateur :
1. Faisabilité Node 5/5 — zéro dépendance native sur Replit serverless (pattern tesseract s24 = interdit de répéter cette erreur).
2. Pattern s22 déjà validé en prod Versi (`openai.images.edit()` + `toFile()` + règles négatives explicites).
3. Coût $0.04/plan vs client payant 50€+ : ROI non-débattable.
4. Approches A (CV pur) et C (hybride) disqualifiées sur le même critère : stack native instable Replit. L'argument est technique et factuel, pas d'opinion.
5. Règle s23 "technique adjacente si plafond" : canonicalisation IN = technique adjacente au pipeline OUT actuel. Cohérence doctrinale.

## Risques majeurs avant impl (3)

1. **Hallucination géométrique gpt-image-1** — le modèle peut déplacer un mur de quelques pixels. Mitigation obligatoire : comparaison bounding_box rooms canonique vs original ; si divergence >10% → fallback automatique sur plan original. **Gate dure.**
2. **Latence cumulée ≤90s Replit** — 15-25s canonicalisation + 30-55s extract actuel = 45-80s. Marge faible sur plans haussmanniens. Mitigation : timeout 45s canonicalisation (fallback silencieux), mesure P95 dès le premier reality check E2E.
3. **Perte de détails cotations fines sur A2 → 2048px downsample** — non bloquant car on strip les cotations, MAIS validation empirique requise que le pipeline extract tourne mieux sur canonique que sur original. Mesure à faire : score 10/10 moyen ON vs OFF sur 5 plans. Gate Phase 2 : gain ≥ +1.5 pts sinon NO-GO.

## Verdict

**GO implémentation Phase 2, sans condition suspensive.** Les 3 livrables Phase 0 sont au standard 9/10, l'approche est tranchée sur critères factuels, les risques sont identifiés et mitigables en Phase 2.

## Équipe Phase 2 (ordre + parallélisation)

**Séquence obligatoire — pas de parallélisation risquée sur le chemin critique :**

1. **@ia** — finalise `CANONICAL_PROMPT_V1` + 3 test cases dans `prompt-library.md`, valide visuellement sur 3 plans variés (scan A3 médiocre, PDF vectoriel, plan manuscrit). **Livrable bloquant amont.** 0.5j.
2. **@fullstack** — (démarre uniquement après validation prompt @ia) implémente `plan-canonicalizer.ts` + `canonicalized_image_path` DB column + feature flag `VS_PLAN_CANONICALIZE` + hook dans `extract/route.ts` + comparateur UI côte-à-côte (US-VS-R1). 1j.
3. **@qa** — (séquentiel après @fullstack) reality check E2E sur 5 plans réels (P00-P03 + plan Thomas Muguets), mesure ON vs OFF, screenshots Playwright, P95 latence, coût. **Gate bloquante.** 0.5j.
4. **@interior-architect (Yann)** — audit visuel fidélité géométrique sur les 5 outputs canonicalisés. Parallèle à @qa. 0.5j.
5. **@moi Phase 2** — gate GO PRODUCTION finale : 4 conditions (code review PASS, tests PASS, reality check E2E PASS, audit persona Yann 10/10 unanime). 3/4 = NO-GO, pas GO conditionnel.

Parallélisation autorisée : @qa + Yann après livraison @fullstack. Jamais avant.

## Critères d'acceptation Phase 2

- `CANONICAL_PROMPT_V1` validé visuellement par @ia sur 3 test cases (0 hallucination géométrique >10% sur 3/3).
- `plan-canonicalizer.ts` avec signature exacte spécifiée par @ia, timeout 45s, fallback silencieux, idempotent via hash input.
- Comparateur UI "Original / Canonicalisé" visible sans clic supplémentaire (US-VS-R1 critère PASS/FAIL non négociable).
- `canonicalized_image_path` persiste en DB, ré-extraction ne rejoue pas la canonicalisation (US-VS-R4).
- Mode dégradé US-VS-R5 testé (canonicalisation échoue → bannière "Plan non reformaté — résultats moins précis" non masquable).
- Reality check E2E sur 5 plans (dont P04 Muguets si dispo) : gain score 10/10 moyen ≥ +1.5 pts ON vs OFF.
- Latence P95 pipeline complet ≤90s sur Replit prod (pas CLI).
- Coût moyen ≤$0.10/plan sur 10 exécutions prod (logs billing OpenAI).
- Audit Yann Duval 10/10 unanime sur fidélité géométrique des 5 plans du panel.
- Screenshot Playwright preuve pour chaque critère PASS/FAIL des 5 US.
- Jargon UI banni vérifié via Grep : zéro occurrence de "polygone", "zone", "calque", "contour" dans les composants canonicalisation ; mots autorisés : "plan", "pièce", "lot", "reformaté".
- Feature flag `VS_PLAN_CANONICALIZE=false` → pipeline actuel intact (zéro régression Étape 2/3).

Tout critère en dessous = retour Phase 2 itération, pas GO PRODUCTION.

## Handoff

**→ @orchestrator (démarrage Phase 2)**

Prochain agent à invoquer : **@ia** (première action : finaliser `CANONICAL_PROMPT_V1` + 3 test cases + validation visuelle). Pas de parallélisation avant livraison @ia validée.

Points d'attention pour l'orchestrateur :
- Ne PAS paralléliser @ia et @fullstack (prompt est bloquant amont).
- Reality check E2E @qa doit être UI Playwright + DB read (règle s23 renforcée), pas CLI isolé (règle s24).
- Audit Yann Duval requiert pré-fetch des images (pattern WebFetch absent des agents audit visuel, cf. CLAUDE.md workflow).
- Gate @moi Phase 2 : 3/4 conditions = NO-GO. Pas de négociation 9/10 acceptable.
