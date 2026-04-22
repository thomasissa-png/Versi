# Diagnostic root cause fallback reformatage — s25 Thomas prod

## Contexte

Thomas a activé en prod Replit les fixes s25 (commit `6eec5a4` sur `claude/versi-s25-reality-check-ux-audit-UHDfK`), flag `VS_PLAN_CANONICALIZE=true`. Il a uploadé 1 plan réel. Résultat :

- UI Étape "Reformatage" affiche la tuile "Plan reformaté indisponible"
- Bannière jaune : "Reformatage indisponible pour ce plan. Le reformatage automatique du plan n'a pas pu aboutir."

Le fallback silencieux s'est déclenché → `plan.canonicalized_image_path = NULL` en DB. Pas de feedback diagnostic pour Thomas.

## Hypothèses H1-H7 : probabilité + preuve code

| # | Hypothèse | Verdict | Preuve code |
|---|---|---|---|
| **H1** | Droits `images.edit` gpt-image-1 manquants | **TRÈS PROBABLE** | `plan-canonicalizer.ts:114-117` vérifie seulement `OPENAI_API_KEY` présent, pas l'org-verified flag. gpt-image-1 EXIGE une organisation OpenAI "verified" (KYC ID + photo). Si la clé prod Thomas est non-verified → erreur 403 `organization_must_be_verified`. → branche catch ligne 306-329 → `api_error`. |
| **H2** | Gates G1-G4 trop stricts | **PEU PROBABLE** | `plan-canonicalizer.ts:174-214` — seuils déjà TRÈS permissifs (G1 whiteRatio ≥ 0.6, G2 black 0.5-35%, G3 ≥ 0.2%, G4 ≤ 40%). Tous gates PASS par défaut si sharp échoue (l.212). Verrait `fallbackReason=gate_fail` — à confirmer via DB `canonical_fallback_reason`. |
| **H3** | Timeout 45s dépassé | **À VÉRIFIER EN LOGS** | `DEFAULT_TIMEOUT_MS=45_000` (l.66). gpt-image-1 quality=high sur 1536×1024 peut prendre 30-60s en charge réelle. Plausible sur premier plan à froid. Donne `fallbackReason=timeout`. |
| **H4** | PDF multi-pages mal rasterisé | **PEU PROBABLE** | `extract/route.ts:213-220` : `pdf-to-img` scale=3, prend la 1ère page. Si le plan est image directe (PNG/JPG) → skip. Mais si PDF vectoriel lourd → `sharp().metadata()` peut throw → catché l.266 → `api_error` générique. |
| **H5** | Size 1536×1024 incompatible avec ratio source | **PEU PROBABLE** | gpt-image-1 `images.edit` accepte l'input quelle que soit sa taille ; l'output est forcé à `size` demandé. Pas de warp rejection documenté. |
| **H6** | SDK openai v5 incompatible | **IMPROBABLE** | `package.json` : `openai ^5.23.0`. `images.edit` + `toFile` + `b64_json` supportés depuis v4.50. L'API key + verified org est le vrai gate. |
| **H7** | Feature flag mal câblé | **EXCLU** | `extract/route.ts:169` : `if (process.env.VS_PLAN_CANONICALIZE === "true")` est OK. Si flag off → `canonicalized_image_path` reste NULL mais `canonical_fallback_reason` aussi (jamais set) → la bannière UI s'affiche quand même car basée sur `!hasCanonical`. Thomas verrait la tuile "indisponible" SANS avoir activé le flag. À confirmer : DB `canonical_fallback_reason` = NULL ? → flag non vu par Next.js (requiert redémarrage Replit après ajout env var). |

## Root cause le + probable : **H1 (org non verified) OU H7 (flag pas propagé après restart)**

Les deux ont la même signature silencieuse côté UI (tuile "indisponible"), mais **différenciables via DB** :

- `SELECT id, canonical_fallback_reason, canonical_prompt_version FROM vs_plans ORDER BY uploaded_at DESC LIMIT 1;`
  - `canonical_fallback_reason = 'api_error'` + `canonical_prompt_version = '1.0'` → **H1** (appel a eu lieu, rejeté par OpenAI)
  - `canonical_fallback_reason IS NULL` → **H7** (bloc canonicalisation jamais entré, flag off ou Next pas restart)
  - `canonical_fallback_reason = 'timeout'` → **H3**

**Pari** : H1 à 60%, H7 à 25%, H3 à 15%. gpt-image-1 est notoire pour exiger org verification — Thomas vient de créer/activer une clé, probablement pas encore KYC.

## Fixes prioritaires (3 max)

### FIX 1 — Surfacer l'erreur API côté UI (prio P0)

Actuellement, `fallbackReason='api_error'` est écrit en DB mais jamais affiché avec le **message** d'erreur OpenAI. Thomas voit "indisponible" sans savoir pourquoi.

- Ajouter colonne `canonical_fallback_detail TEXT` (message d'erreur ou code HTTP) dans `vs_plans`
- Logger `err.status`, `err.code`, `err.message` de `OpenAI.APIError` séparément
- PlanComparator : afficher le détail en petit quand `fallbackReason='api_error'` (ex: "erreur API : 403 organization_must_be_verified")

### FIX 2 — Retry 2× avec backoff avant fallback (prio P1)

Actuellement : 1 appel → fallback immédiat. gpt-image-1 a un taux d'erreur 5xx/timeout non négligeable sur la 1ère requête (cold start queue). Pattern @ux D5 : "retry 2× au lieu de fallback immédiat".

- Dans `canonicalizePlan`, wrapper `callOpenAIImagesEdit` dans une boucle `for (attempt of [1, 2])` avec backoff 2s entre retries
- Ne retry QUE sur `api_error` non-auth (status 5xx, network, timeout). Pas sur 401/403 (inutile).
- Logger `attempts: N` dans le log success/fallback

### FIX 3 — Augmenter timeout à 90s + préflight check org (prio P1)

- `DEFAULT_TIMEOUT_MS = 90_000` (la qualité high de gpt-image-1 tourne régulièrement entre 40-70s)
- Au démarrage du canonicalizer : appel préflight léger `client.models.retrieve("gpt-image-1")`. Si 403 → throw explicite `ORG_NOT_VERIFIED` avec message actionnable pour Thomas ("Allez sur https://platform.openai.com/settings/organization/general et complétez la vérification KYC")

## Logs structurés à ajouter

Remplacer `callOpenAIImagesEdit` catch générique par capture granulaire OpenAI :

```ts
// plan-canonicalizer.ts l.306-329
} catch (err) {
  const apiErr = err as { status?: number; code?: string; type?: string };
  const msg = err instanceof Error ? err.message : String(err);
  const reason: CanonicalizeFallbackReason =
    /timeout|aborted/i.test(msg) ? "timeout" : "api_error";
  const outputHash = sha256(buf);
  logEvent("fallback", {
    reason,
    inputHash,
    outputHash,
    error_message: msg,
    api_status: apiErr.status ?? null,       // ← NOUVEAU
    api_code: apiErr.code ?? null,           // ← NOUVEAU (ex: organization_must_be_verified)
    api_type: apiErr.type ?? null,           // ← NOUVEAU
    duration_ms: Date.now() - started,
    prompt_version: CANONICAL_PROMPT_VERSION,
    timeout_ms: timeoutMs,                   // ← NOUVEAU
    input_bytes: buf.length,                 // ← NOUVEAU
  });
  return { ...fallback, fallbackDetail: `${apiErr.status ?? "?"} ${apiErr.code ?? msg}` };
}
```

Ajouter aussi à `runQualityGates` un log quand ≥2 fail avec les ratios calculés :

```ts
logEvent("gate_metrics", { whiteRatio, blackRatio, gates, failed });
```

## Handoff à @fullstack

**Fichiers à modifier** :

1. **`/home/user/Versi/versi-studio/src/lib/ai/plan-canonicalizer.ts`**
   - l.31-36 : ajouter `fallbackDetail?: string` au type `CanonicalizeResult`
   - l.66 : `DEFAULT_TIMEOUT_MS = 90_000` (45→90s)
   - l.107-154 : wrapper `callOpenAIImagesEdit` dans boucle retry 2× (backoff 2s, skip retry sur status 401/403)
   - l.306-329 : logs granulaires (status/code/type OpenAI) + peupler `fallbackDetail`
   - En tête de fichier : ajouter préflight org check optionnel (guard env `VS_CANONICAL_PREFLIGHT=true`)

2. **`/home/user/Versi/versi-studio/src/lib/vs/migrations/`** — créer `002_s25_canonical_fallback_detail.sql` :
   ```sql
   ALTER TABLE vs_plans ADD COLUMN IF NOT EXISTS canonical_fallback_detail TEXT;
   ```

3. **`/home/user/Versi/versi-studio/src/app/api/vs/projects/[id]/extract/route.ts`** l.255-261 :
   ```ts
   await query(
     `UPDATE vs_plans SET
        canonical_fallback_reason = $1,
        canonical_fallback_detail = $2,
        canonical_prompt_version = $3
      WHERE id = $4`,
     [result.fallbackReason ?? "unknown", result.fallbackDetail ?? null, result.promptVersion, plan.id],
   );
   ```

4. **`/home/user/Versi/versi-studio/src/lib/vs/types.ts`** l.52 : ajouter `canonical_fallback_detail: string | null`

5. **`/home/user/Versi/versi-studio/src/components/vs/PlanComparator.tsx`** l.44-58 : afficher `plan.canonical_fallback_detail` sous la bannière quand `fallbackReason='api_error'`

**Action Thomas immédiate (AVANT code fix)** — à écrire dans `REPLIT_ACTIONS.md` :

1. Requête DB pour différencier H1/H7 : `SELECT id, canonicalized_image_path, canonical_fallback_reason, canonical_prompt_version FROM vs_plans ORDER BY uploaded_at DESC LIMIT 3;`
2. Vérifier logs Replit : `grep "plan-canonicalizer" logs/*`
3. Si aucun log `[plan-canonicalizer]` → H7 (flag pas vu). Redémarrer le workflow Replit après activation env.
4. Si log `fallback reason=api_error` → ouvrir https://platform.openai.com/settings/organization/general, compléter KYC "Verify Organization", attendre 15min.

**Budget tokens** : +0 (le fix ne change pas les appels LLM, juste le logging + retry). Coût retry 2× = x2 sur échecs non-auth uniquement (~$0.04 par plan en échec temporaire, acceptable).
