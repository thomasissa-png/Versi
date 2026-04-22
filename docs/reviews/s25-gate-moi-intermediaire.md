# Gate @moi intermédiaire — s25 canonicalisation code-level

**Date** : 2026-04-22
**Agent** : @moi (proxy fondateur Thomas)
**Session** : versi-s25
**Branche** : `claude/versi-s25-reality-check-ux-audit-UHDfK`

## Score 4 conditions strictes

| # | Condition gate @moi Phase 2 finale | Statut | Preuve |
|---|---|---|---|
| 1 | **Code review PASS** | ✅ PASS | @reviewer 9/10 + 1 PARTIEL (hors scope impl), 0 drift architectural, 0 P0. @qa audit statique 0 BLOQUANT, 3 MOYEN surveillables. |
| 2 | **Tests automatisés PASS** | ✅ PASS | 125/125 Vitest (dont 7 nouveaux canonicalizer + idempotence US-VS-R4), `tsc --noEmit` OK, `npm run build` OK, 0 régression pipeline s24. |
| 3 | **Reality check E2E PASS** | 🔴 SUSPENDU | Script `scripts/s25-canonicalisation-reality-check.ts` prêt, mais exécution `openai.images.edit()` impossible sans clé + staging admin. Condition strictement bloquante règle s22/s23/s24. |
| 4 | **Audit persona Yann 10/10** | 🔴 SUSPENDU | Baseline 5.5/10 sur 4 plans livrée, prédiction +3 → 8.5-9/10. Audit POST-canonicalisation impossible sans outputs réels. |

**Score code-level : 2/4 PASS, 2/4 SUSPENDUS à l'action Thomas.**

## Verdict intermédiaire : **GO CODE-LEVEL — prêt pour activation empirique Thomas**

Zéro P0, zéro P1 bloquant, zéro drift vs arbitrage Phase 1. L'impl est au standard Thomas-fondateur. Les 2 conditions restantes ne peuvent PAS être remplies en autopilot (nécessitent clé OpenAI prod + staging Replit + œil Thomas sur outputs réels). **Ne PAS prononcer GO PRODUCTION** — doctrine 3/4 = NO-GO rappelée. Merge main autorisé après validation empirique uniquement.

## Conditions restantes (Thomas — ordre exact)

1. **Activer Secret Replit** `VS_PLAN_CANONICALIZE=true` sur staging + vérifier `OPENAI_API_KEY` autorisée sur `images.edit` gpt-image-1.
2. **Exécuter** `npx tsx scripts/s25-canonicalisation-reality-check.ts https://versi-studio.replit.app` avec 5 plans (P00-P03 + Muguets) → récupérer JSON metadata + images INPUT/OUTPUT en local.
3. **Mesurer 4 métriques PM** : P95 latence pipeline ≤90s, coût moyen ≤$0.10/plan, gain score ≥+1.5 pts ON vs OFF, fallback rate <20%.
4. **Pré-fetch images** dans `audit-data/` puis lancer @interior-architect Yann sur les 5 outputs canonicalisés (protocole CLAUDE.md § "Workflow d'audit visuel").
5. **Forcer un fallback** (ex : bad API key temporaire) → screenshot bannière "Plan non reformaté — résultats moins précis", vérifier pipeline continue.

## Critères 10/10 à vérifier post-activation

- **Fidélité géométrique stricte** : aucun mur déplacé >3px, ratio canonical/original préservé, polygones rooms post-extract collent aux murs canoniques (règle s22 reality check VISUEL).
- **Mobilier intégralement supprimé** (défaut n°1 Yann baseline) — canapés, tables, lits, sanitaires absents des outputs.
- **Monochromie cassée** : noir/blanc propre, fin du piège orange = murs = cloisons = mobilier.
- **Cotations + cartouche + logo supprimés** (bruit textuel → 0).
- **Labels pièces préservés lisibles** (pas inventés, pas déplacés).
- **US-VS-R4 idempotence** : 2e clic "Lancer l'analyse" → 0 appel OpenAI observable dans billing.
- **Gate @moi dure** : si hallucination géométrique >10% sur 1/5 plans → NO-GO et retour @ia prompt v2.

## Plan itération si <9/10

**Piste 1 — Prompt v2 (@ia, 0.5j)** : durcir règles négatives (#3 anti-invention, #4 anti-fermeture), ajouter exemples few-shot dans prompt si SDK v5 supporte, revoir hyperparamètres `quality`/`size`. Bump `CANONICAL_PROMPT_VERSION="2.0"` traçable DB.

**Piste 2 — Resserrer gates G1-G4 (@fullstack, 2h)** : seuil `whiteRatio` 0.6 → 0.75, ajouter gate géométrique (compare bounding_box rooms canonique vs original, fallback si divergence >10%). Attrape les outputs dégradés qui passent actuellement.

**Piste 3 — Downsample input 2048 → 1536** (@fullstack, 15min) : aligner input/output sur 1536 pour réduire latence GPU OpenAI + éviter drift résolution (point @qa §1).

**Piste 4 — Technique adjacente (règle s23)** : si prompt-only plafonne à 7-8/10 → post-process OCR snap-to-label (précédent s23 : 6.03→9.35/10), OU tester `gpt-image-1-mini` / Claude vision si OpenAI plafonne géométriquement. Documenter plafond empirique avant d'accepter <10/10.

**Piste 5 — Fallback dataset** : si 2 pistes échouent, activer `VS_PLAN_CANONICALIZE=false` par défaut en prod, garder feature opt-in admin. Pas une régression (pipeline s24 intact, @reviewer #8 PASS).

## Handoff

**→ Thomas (reality check empirique obligatoire)**

- Verdict : GO CODE-LEVEL, NO-GO PRODUCTION tant que 4/4 non atteint.
- Action immédiate Thomas : exécuter script reality check avec les 5 conditions listées ci-dessus.
- Si 4/4 PASS post-activation → gate @moi Phase 2 finale prononcée en 1 tour (je relirai logs + screenshots Yann).
- Si 1 condition FAIL → piste itération correspondante déclenchée sans ambiguïté.
- **Dette technique non-bloquante** reportée s26 : sentinel `__CANONICAL_SKIP_SENTINEL__` (extract/route.ts:198) à refactorer en flag booléen propre, `<img>` sans `onError` dans PlanComparator, detection `apiKey` placeholder étendue (`sk-test`, vide trim).
