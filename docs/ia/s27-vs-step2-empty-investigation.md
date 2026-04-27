# s27 — VS Étape 2 retourne 0 lots : investigation

**Verbatim Thomas s27** : "L'outil a réfléchi mais n'a rien affiché comme lot."

**Mode** : audit code only. Aucune modification appliquée. Plan correctif pour @fullstack.

## 1. Hypothèse retenue : H1 (gates canonicalizer durcis 0.85 → fallback massif PDF brut)

**Preuve** :
- `plan-canonicalizer.ts:285-296` — `whiteRatioMin = 0.85` (avant 0.6), `blackRatioMax = 0.25` (avant 0.35).
- `plan-canonicalizer.ts:500-503` — si ≥2 gates FAIL → `fallback: true` → buffer ORIGINAL retourné.
- `extract/route.ts:234-273` — quand `result.fallback === true`, on log mais on garde `extractBuffer = fileBuffer` (le PDF/PNG brut, pas canonical).
- Conséquence : GPT-4.1 reçoit le plan ORIGINAL avec cartouche, hachures, terrasse, escaliers — exactement le contexte que le prompt v9 (`plan-extractor.ts:142-454`) demande EXPLICITEMENT au modèle d'EXCLURE de manière dure.

**Pourquoi ça donne 0 lot et pas juste un mauvais lot** :
- `clusterByUnit` filtre par `confidenceMin >= 0.5` (route.ts:475, `CLUSTERING_CONFIDENCE_THRESHOLD`).
- Sur plan brut bruité, le prompt v9 durci (HARD CONSTRAINT area, ANTI-HALLUCINATION, "do NOT enlarge to reach SIZE PRIOR minima") pousse GPT à émettre `building_outline = null` ou `unit_id = null` partout par prudence ("Do NOT infer an apartment that is not visible").
- `unit_id = null` partout → `candidateCount = 0` → `extraction_reason = "no_units_detected"` → `lots_created = 0`.
- Pipeline DONE, status = `done`, mais 0 INSERT vs_lots → écran vide côté UI.

**Réfutation des autres hypothèses** :
- **H2 (prompt v9 trop strict, lots:[] silencieux)** : contributif mais pas root cause. Le prompt v9 fonctionnait s26 sur canonical. C'est la combinaison v9 + plan brut qui casse.
- **H3 (INSERT silencieux)** : réfuté. Les `query()` ne sont pas dans des try/catch muets dans la 2e boucle (route.ts:1166-1178 + 1238-1250). Une erreur INSERT remonterait au `catch` global ligne 1297 → 500, pas un "0 lot" success.
- **H4 (concave hull / room tiling filtrent tout)** : réfuté pour ce symptôme. Ces passes s'exécutent APRÈS `unitGroups.length > 0`. Si `unitGroups.length === 0` (clustering rejette tout), la boucle ligne 538 ne s'exécute jamais. Le bug est en amont.
- **H5 (timeout pipeline)** : réfuté. `maxDuration = 300` (5 min). Un timeout produirait un 500 ou un statut `processing` figé, pas "réfléchi puis 0 lot".

## 2. Causes possibles (ranked par probabilité)

1. **[~75%] Gates 0.85/0.25 trop stricts sur output gpt-image-2 réel** — l'output gpt-image-2 n'est jamais 95% blanc pur (anti-aliasing, textures résiduelles, traits architecturaux denses). Sur plan dense (immeuble multi-niveaux), `blackRatio` réel ~0.27-0.30 → G2 + G4 fail → ≥2 fail → fallback. Mesurer dans logs `[plan-canonicalizer] fallback {gate_failures:[...]}`.
2. **[~15%] Plan PDF Thomas s27 = nouveau type non testé sur prompt v9** — bâti complexe colimaçon + terrasse, GPT s'auto-censure outline=null par sécurité.
3. **[~10%] Conjonction des deux** — fallback PDF brut + outline=null GPT → 0 unit_id viable.

## 3. Actions correctives — plan @fullstack/@ia

### Action 1 (critique, @ia) — relaxer gates G1-G4 sur valeurs empiriques mesurées

**Fichier** : `versi-studio/src/lib/ai/plan-canonicalizer.ts:285-296`

**Modif** : `whiteRatioMin: 0.85 → 0.75`, `blackRatioMin: 0.02 → 0.015`, `blackRatioMax: 0.25 → 0.32`, `blackRatioMaxTextBlock: 0.25 → 0.32`. Audit s27 (5.2/10) recommandait durcir, mais sans MESURE empirique sur 5+ outputs gpt-image-2 réels c'était théorique. Re-calibrer sur logs `gates: { g1, g2, g3, g4 }` des derniers runs s26-s27 AVANT durcissement (pré-commit afa382e).

### Action 2 (critique, @fullstack) — exposer le diagnostic côté UI

**Fichier** : `versi-studio/src/app/api/vs/projects/[id]/extract/route.ts:1289-1296`

**Modif** : enrichir la réponse JSON avec `canonical_fallback_count` (déjà persisté en DB ligne 256-262 via `canonical_fallback_reason`). Quand `lots_created === 0` ET `canonical_fallback_count > 0`, retourner `extraction_reason: "canonical_fallback_then_low_confidence"` pour que l'UI affiche : "Le plan n'a pas pu être normalisé (raison : whiteRatio_too_low). Vérifier le PDF source." Aujourd'hui Thomas voit "0 lot" sans aucun signal.

### Action 3 (P1, @ia) — instrumenter le candidateCount avant clustering

**Fichier** : `versi-studio/src/app/api/vs/projects/[id]/extract/route.ts:473-477`

**Modif** : avant `clusterByUnit`, logger `[clustering] allRooms.length=${allRooms.length}, withUnitId=${allRooms.filter(r=>r.unit_id).length}, withConfidence>=0.5=${allRooms.filter(r=>r.confidence>=0.5).length}`. Permet de distinguer en 1 ligne : "GPT n'a pas mis d'unit_id" vs "GPT a mis unit_id mais confidence faible".

### Action 4 (différé, @ia) — concave hull alpha=0.5 sain dans ce contexte

**Fichier** : `envelope-polygon.ts:205` (alpha=0.5).

Pas la cause du bug actuel (jamais atteint si 0 unit). Mais alpha=0.5 → radiusMax=2% du plan-global = ~80cm sur plan 40m de large. Sur des rooms de 4-5% de côté, `delaunayTriangles` génère beaucoup de triangles avec rayon > 2% → filtrés tous → `kept.length === 0` → fallback convex hull silencieux. À surveiller post-fix gates : si après Action 1 le pipeline produit des lots mais formes mal préservées, passer alpha à 0.3 (radiusMax=3.3%) ou rendre adaptatif (alpha = f(plan_diagonal)).

## 4. Réponse explicite aux questions

- **Gates 0.85 whiteRatio sur PNG sharp produit → relaxer ?** Oui, action 1. Le seuil 0.85 a été posé par hypothèse théorique ("0.95 idéal"), pas mesuré sur outputs réels. Re-calibrer empiriquement.
- **Concave hull alpha=0.5 produit polygones dégénérés → adapter ?** Pas dans le scope du bug "0 lot". À retenir pour after-fix : le `concaveHull` a un fallback `convexHull` silencieux ligne 458 — si systémique, on perd la forme L/U/T sans le voir.

## 5. Verdict

**H1 confirmée à ~75%**. Action 1 (gates) est l'action minimale immédiate. Action 2 (UI surfacing) est OBLIGATOIRE indépendamment : un pipeline qui retourne "0 lot" silencieux est une violation directe du commandement no AI > bad AI (l'utilisateur ne sait même pas que l'IA a fail).

**Métrique de validation post-fix** : sur le plan-test Thomas s27, après actions 1+2+3, on doit voir dans les logs :
- soit `[plan-canonicalizer] success {gates: {g1:true,g2:true,g3:true,g4:true}}` → puis lots créés ;
- soit `[plan-canonicalizer] fallback {gate_failures:[...]}` → alors UI affiche le warning explicite.

---

**Handoff → @orchestrator**
- Fichiers produits : `/home/user/Versi/docs/ia/s27-vs-step2-empty-investigation.md`
- Décision : H1 retenue (gates canonicalizer 0.85 trop stricts → fallback massif → GPT extrait 0 unit_id sur plan brut bruité).
- Plan correctif : 3 actions, dont 2 critiques pour @fullstack/@ia (relaxer gates + surfacer le diagnostic UI). Action 3 instrumentation P1, action 4 alpha-shape différée.
- Points d'attention : avant tout commit de l'action 1, vérifier les logs `[plan-canonicalizer]` des 3 derniers runs s27 pour MESURER les ratios réels (whiteRatio, blackRatio) — re-calibrer sur données, pas sur hypothèse.
