# s27 — Audit pipeline Versi Studio (plan-extractor)

**Verbatim Thomas** : « Rien ne marche correctement. L'outil définit une forme qui n'a rien à voir avec le plan. »
**Périmètre** : 6 fichiers lus (`extract/route.ts` 155-300, `plan-canonicalizer.ts`, `plan-canonicalizer-mock.ts`, `room-tiling.ts`, `envelope-polygon.ts`, `outline-shrinker.ts`).

---

## A. Diagnostic en 1 phrase par passe

- **Passe 0 — Rasterisation PDF** (`pdf-to-img` scale 3) : OK, déterministe, première page only (multi-page PDF = silent loss mais hors scope plainte).
- **Passe 1 — Canonicalisation gpt-image-1** : feature flag `VS_PLAN_CANONICALIZE` actif côté route, `images.edit` avec timeout 90 s, retry x3, bascule auto vers `CANONICAL_FALLBACK_MODEL` si 404 — **suspect majeur** : si org non vérifiée → `org_not_verified` fallback silencieux, mais SI ça réussit, gpt-image-1 PEUT réinventer la géométrie (modèle génératif, pas vectorisateur).
- **Passe 2 — GPT-4.1 Vision JSON** (`plan-extractor.ts`) : non lu (hors quota), reçoit `extractBuffer` = canonical OU original selon succès passe 1 — la qualité aval dépend ENTIÈREMENT de la fiabilité passe 1.
- **Passe 3 — Refine polygones par crop** (`VS_REFINE_POLYGONS`) : non lu (hors quota).
- **Passe 4 — OCR Tesseract snap-to-label** (`label-snap.ts`) : non lu, mais commentaires confirment qu'il OCR le `originalRasterBuffer` (pas le canonical) → bon (évite labels reformulés par gpt-image-1).
- **Passe 5 — envelope-polygon convex hull** : agrège `bounding_polygon` de TOUTES les rooms (snapped + non-snapped), prend le convex hull, padding +2 %. **Force la convexité** → un L, un U ou un T d'appartement deviendra son enveloppe convexe (= bbox-like, ajoute des zones extérieures). Cohérent avec « forme qui n'a rien à voir ».
- **Passe 6 — room-tiling power diagram** : Sutherland-Hodgman par demi-plans, garantit no-overlap/no-gap MAIS uniquement à l'intérieur de l'envelope reçue. Si envelope passe-5 est convexifiée, le tiling pave une enveloppe fausse — propage l'erreur géométrique aux tiles. Cellules dégénérées → fallback carré 2 % autour du centroïde (loggé `degenerate: true`).
- **Outline-shrinker** : recalcule le `building_outline` du lot depuis le tight-bbox (axis-aligned !) des rooms — corrige le bug Muguets (escalier/terrasse) mais REPRODUIT une bbox rectangle, pas un polygone fidèle au plan.

**Synthèse** : la chaîne contient deux opérateurs qui « lissent » la géométrie réelle vers du convexe ou du rectangulaire (envelope-polygon convex hull, outline-shrinker bbox). Combinés à une canonicalisation générative en passe 1, le résultat peut effectivement « n'avoir rien à voir » avec un plan en L/U/T.

---

## B. 3 hypothèses ranked

1. **H2 — Canonicalisation fallback systématique (org non-verified, timeout)** [**probabilité la plus haute**] : Replit dispo + key OpenAI fournie, mais `gpt-image-1` exige org vérifiée OpenAI. Sans vérification, retour 403 « organization must be verified » → reason `org_not_verified` → buffer original passé tel quel à GPT-4.1 Vision. Si l'original est un PDF complexe (calque architecte, légendes, échelles, hachures), GPT-4.1 Vision hallucine plus → forme finale aberrante. **À trancher en premier, c'est l'hypothèse la moins coûteuse à infirmer**.
2. **H1 — Canonicalisation gpt-image-1 médiocre (invente murs)** : gpt-image-1 est un modèle génératif image, pas un convertisseur vectoriel. Même avec un excellent prompt, il peut « halluciner » des murs supplémentaires, fermer une pièce ouverte, ou décaler le contour. Les gates G1-G4 sont volontairement permissifs (« en cas de doute → PASS », seuils conservateurs `whiteRatio ≥ 0.6`, `blackRatio 0.5–35 %`) → un canonical médiocre passe les gates et empoisonne tout l'aval.
3. **H3 — Passes 4-5-6 écrasent le polygone réel** : l'envelope-polygon force le convex hull (perte L/U/T), l'outline-shrinker recalcule en bbox axis-aligned (perte décrochés), le room-tiling pave dans cette enveloppe fausse. Probable contributeur secondaire mais explique mal « rien à voir » seul (passes déterministes, output stable).

---

## C. Query SQL — trancher H1 vs H2

Thomas peut lancer ceci depuis le shell Replit (`psql $DATABASE_URL`) :

```sql
SELECT
  COALESCE(canonical_fallback_reason, 'success') AS reason,
  canonical_prompt_version,
  COUNT(*)                                       AS n_plans,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM vs_plans
WHERE canonicalized_at IS NOT NULL
   OR canonical_fallback_reason IS NOT NULL
GROUP BY canonical_fallback_reason, canonical_prompt_version
ORDER BY n_plans DESC;
```

**Lecture** :
- Si `org_not_verified` ou `api_error` ≥ 60 % → **H2 confirmée** (la canonicalisation tombe systématiquement, le pipeline tourne sur l'original brut).
- Si `success` ≥ 80 % et plaintes persistent → **H1 confirmée** (gpt-image-1 réussit l'appel mais réinvente la géométrie).
- Si `gate_fail` dominant → variante H1 (les gates attrapent les mauvais canonicals, fallback original, pipeline bruité).

---

## D. Recommandation prioritaire

**Action immédiate** : avant tout autre fix, confirmer H2 via la query ci-dessus. Si confirmée, **désactiver `VS_PLAN_CANONICALIZE` en prod** (`VS_PLAN_CANONICALIZE=false` côté Replit Secrets) et router 100 % du flux directement vers GPT-4.1 Vision sur le PNG rasterisé original (`scale: 3`, déjà OK). Cela élimine la passe 1 comme variable et permet de mesurer la qualité réelle de l'extraction GPT-4.1 sans bruit additionnel. **En parallèle**, suspendre l'envelope-polygon convex hull (`VS_*_ENVELOPE_POLYGON=false` ou équivalent) pour les lots non-rectangulaires : tant que la passe 5 force le convex hull, un appartement en L sera systématiquement déformé. Reprendre ensuite la canonicalisation comme feature OPT-IN (pas par défaut) une fois l'org OpenAI vérifiée ET un protocole d'éval visuel Yann/Lucas validant ≥3 plans hétérogènes (calque archi, croquis main, scan basse-déf) avec un panneau « avant canonicalisation / après / extraction finale » côté QA.

**Commit hash souhaité** : `fix(vs): disable VS_PLAN_CANONICALIZE + envelope convex hull en prod (s27 reality check Thomas) — pipeline direct PNG→GPT-4.1, mesure qualité baseline avant ré-activation OPT-IN`. À pousser sur `claude/session-recovery-setup-iDOWX` puis merge fast-track.

---

**Audit only — aucune implémentation. 6 Reads, 1 Write.**
