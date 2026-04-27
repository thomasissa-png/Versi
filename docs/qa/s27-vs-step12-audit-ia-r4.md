# s27 R4 — Re-audit pipeline Versi Studio Étapes 1+2 (post Round 3 fixes)

**Base R1** : 5.2/10 NO-GO (`s27-vs-step12-audit-ia.md`)
**Commits R3** : `271c66a` (@ia : concave hull + outline polygon + gates durcis), `ec22df0` (@fullstack : branchement `shrinkOutlinePolygonsByUnit` extract route)
**Périmètre** : code-level only, sandbox DNS bloque OpenAI E2E.

## 1. Note globale : **7.4 / 10** (Δ vs R1 : **+2.2**) — Verdict : **GO conditionnel**

Les 2 P0 géométriques fixés correctement (concave hull alpha-shape opérationnel, polygone réel persisté en zone_data, gates durcis 0.85/[2-25%]). Le 3e P0 (validation empirique migration gpt-image-2) reste OUVERT : sandbox DNS, aucune trace prod observable. 10/10 unanime impossible tant que (a) reality check visuel Yann sur plan en L n'est pas fait, (b) télémétrie prod absente, (c) prompt v9 monstre 450L non-splitté.

## 2. Notation /10 par critère (R1 → R4)

### C1 — Pipeline canonicalisation gpt-image-2 : **6.5 → 7.5** (+1.0)
**+** Gates G1-G4 durcis (whiteRatio 0.6→0.85, blackRatio [0.5%-35%]→[2%-25%]) — alignés sur le 0.95 théorique d'un canonical correct. `GateFailureDetail` typé avec ratio mesuré + threshold = diagnostic précis (audit R1 demandait "raison précise type whiteRatio_too_low: 0.72", livré).
**−** Toujours 0 test E2E gpt-image-2 (sandbox DNS). PROMPT_VERSION 1.1 inchangée. Fallback `org_not_verified` toujours silencieux côté UI (Thomas n'a aucun signal). Le seuil G3=G2-min et G4=G2-max = 2 gates redondants sur la même mesure (blackRatio) — si G2 fail, G3 ou G4 fail aussi → comptage `failed >= 2` artificiellement gonflé.

### C2 — Prompt extraction GPT-4.1 v9 : **6.0 → 6.0** (0)
Inchangé R3 (pas dans le périmètre fix). Toujours 450L monstre, 30+ vérifications redondantes, plafond auto-déclaré 8.5/10 jamais validé. P1 split prompt encore à faire.

### C3 — Passes refinement (2-3-4) cohérence : **5.5 → 6.0** (+0.5)
Inchangé sauf que l'envelope passe-4 utilise désormais le concave hull → moins d'effet ping-pong sur les formes non-convexes. Toujours 3 passes empilées, threshold 0.6 non-testé, self-correction non-cappée.

### C4 — Passes géométrie (envelope + outline-shrinker) — **3.5 → 8.5** (+5.0)
**+ FIX P0 #1 LIVRÉ** : `concaveHull()` alpha-shape (Delaunay O(n³) + filtrage rayon < 1/alpha + reconstitution cycle CCW). Fallback convex hull si dégénéré (sécurité), fallback bbox-rect si convex échoue (last resort, signal `usedFallbackBBox=true`). Topologie complexe (vertex avec ≠2 voisins) correctement rejetée → fallback. Préserve formes L/U/T/décrochés.
**+ FIX P0 #2 LIVRÉ** : `shrinkOutlinePolygonsByUnit` (nouvelle API) retourne `{polygon, bbox, usedFallbackBBox}` ET extract route persiste désormais le **polygone** dans `zone_data` (`{type:"polygon", points:shrunkPolygon}`, ligne 1159). L'ancienne `shrinkOutlinesByUnit` marquée `@deprecated`. Invalidation `envelopePolygon` si > shrunk × 1.05 (ligne 1146) = priorité au plus serré.
**−** Le `delaunayTriangles` O(n³) tient à n≤200 (commenté), mais 5-15 rooms × 4-12 vertices peut atteindre 180 pts → ~5.8M ops. Acceptable mais fragile si extension futur. Padding par expansion radiale depuis centroïde (ligne 226) = approximation Minkowski — sur un L très allongé, le centroïde est à l'extérieur du polygone, l'expansion peut déformer. Pas testé empiriquement sur plan L réel (cf. P0 #3 ouvert).

### C5 — Robustesse erreurs : **5.0 → 5.5** (+0.5)
**+** Fallback chain claire concave→convex→bbox + signal `usedFallbackBBox` pour observabilité. `gateFailures` typés persistables.
**−** Toujours 0 télémétrie prod (Langfuse/Helicone), `console.log` invisible >24h Replit. Coût gpt-image-2 ($0.19/img) toujours non-tracké. PROMPT_VERSION pas bumpée malgré le durcissement gates (anti-pattern règle migration @ia).

## 3. P0 résiduels (bloquent 10/10 unanime)

1. **P0 OUVERT — Validation empirique migration gpt-image-2 + concave hull** : sandbox DNS bloque test E2E. Le couple (gpt-image-2, prompt v1.1, gates durcis 0.85/[2-25%], concave hull alpha=0.5) n'a JAMAIS produit un output observable sur plan réel. Reality check Thomas + audit visuel Yann sur ≥3 plans hétérogènes (incl. 1 plan en L et 1 en U) AVANT déploiement. Sans ça, on a déplacé le risque sans le mesurer.
2. **P1 promu P0 — Bump PROMPT_VERSION** : durcissement gates G1-G4 = changement de comportement observable, doit incrémenter `CANONICAL_PROMPT_VERSION` (1.1 → 1.2) pour traçabilité DB sur `vs_plans.canonical_prompt_version`. Sinon impossible de distinguer en prod un canonical pré-fix d'un post-fix.
3. **P1 — G3/G4 redondants avec G2** : G3 = blackRatio ≥ 0.02 (= G2 borne basse), G4 = blackRatio ≤ 0.25 (= G2 borne haute). Compter G2+G3+G4 comme 3 gates indépendants pour `failed >= 2` est mathématiquement faux. Soit fusionner G2/G3/G4, soit définir G3/G4 sur des mesures différentes (densité gradient, run-length analysis, etc.).

## 4. Verdict : **GO conditionnel**

**Conditions de levée vers GO 10/10** : (1) Thomas + Yann reality check 3 plans hétérogènes incl. 1 L et 1 U avec capture avant/après visible, (2) bump PROMPT_VERSION 1.2 + commit, (3) refactor G3/G4 ou documenter explicitement la redondance assumée. Sans ces 3 items, NO-GO prod.

Les fixes Round 3 résolvent correctement la root cause géométrique R1 ("forme qui n'a rien à voir") au niveau code. Reste à prouver empiriquement que ça résout aussi la plainte Thomas terrain.

---

**Handoff → @orchestrator**
- Fichier produit : `docs/qa/s27-vs-step12-audit-ia-r4.md`
- Décision : 7.4/10 GO conditionnel (Δ +2.2 vs R1). 2 P0 fixés correctement, 1 P0 ouvert (validation empirique).
- Points d'attention : sandbox bloque E2E → Thomas+Yann reality check obligatoire ; bumper PROMPT_VERSION 1.2 ; redondance G3/G4 avec G2 à clarifier ; padding radial sur L allongé non testé.
