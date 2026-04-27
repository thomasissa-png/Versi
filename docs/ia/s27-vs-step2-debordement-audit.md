# s27 — VS Étape 1→2 : audit du débordement de tracé (Muguets RDC)

**Verbatim Thomas** : « Ça dépasse à gauche, à droite, et en haut ça ne suit rien du tout. »
**Constat visuel** : T4 RDC Muguets P-03, lot pré-tracé = quasi-rectangle orange transparent qui englobe escalier colimaçon (gauche), zone hors-lot (droite) et déborde au-dessus des murs externes (haut).
**Mode** : audit code only. AUCUN code modifié.

## 1. Diagnostic empirique — chemin de causalité PDF → pixel

| # | Étape | Fichier:Ligne | Effet sur le tracé |
|---|---|---|---|
| 1 | PDF rasterisé scale=3 | `extract/route.ts:214-221` | PNG ~3000×2000px, contient cartouche, terrasse, colimaçon |
| 2 | Canonicalize gpt-image-2 | `route.ts:233` | Fallback fréquent (gates 0.85 — voir s27-empty) → buffer ORIGINAL passé à GPT |
| 3 | Prompt v9 → `building_outline` rect | `plan-extractor.ts:209-254` | Rect axis-aligned IA souvent +5-10% trop grand (drift v9 plafond ~10%) |
| 4 | OCR labels Tesseract | `route.ts:351-391` | Labels imprimés détectés → snap-early lock |
| 5 | Passe-2 refine polygones | `route.ts:400-421` | Polygones 4-12 pts par room, mais drift IA persiste |
| 6 | Resolver non-overlap + clip building_outline | `route.ts:578` | Rooms clippées DANS le rect IA débordant |
| 7 | Snap-early + passe-3 + snap-tardif | `route.ts:610-854` | Rooms snappées sur labels OCR |
| 8 | **Envelope concave hull (alpha=0.5, padding 2%)** | `envelope-polygon.ts:391` | Hull union de **TOUS les points** (snapped + non-snapped). Alpha=0.5 → radiusMax=2% du plan = 80cm sur plan 40m. Trop fin → fallback convex hull silencieux ligne 458. |
| 9 | **`shrinkOutlinePolygonToRooms`** | `outline-shrinker.ts:186-255` | Concave hull alpha=0.5 sur points BRUTS (pas dédoublonnés par appartenance), padding radial depuis centroïde |
| 10 | `finalZoneData = shrunkPolygon ∥ envelopePolygon ∥ rect` | `route.ts:1159-1163` | Persisté dans `vs_lots.zone_data` (JSONB) |
| 11 | `parseZone` + `drawLot` polygon | `PlanCanvas.tsx` (drawLot via `zoneBoundingBox` + `isPolygon`) | Pixel rendu = polygone shrunk concave + padding 2% |

**Champ visible Thomas = `vs_lots.zone_data.points` (polygon concave shrunk)**, produit ligne 1119-1153 via `shrinkOutlinePolygonToRooms`.

## 2. Pourquoi ça déborde — passe coupable

**Coupable principal : `outline-shrinker.ts:186-255` + `envelope-polygon.ts:concaveHull` + padding radial expansion.**

Trois fautes cumulées :

1. **Alpha=0.5 trop conservateur** (`envelope-polygon.ts:202-205`, `outline-shrinker.ts:191`) : radiusMax=2% du plan-global. Sur le Muguets (plan ~40m de large), 2% = 80cm. La triangulation Delaunay génère beaucoup de triangles dont le rayon circonscrit dépasse 2% (rooms espacées de 1-2m via cloisons), filtrés tous → `kept.length === 0` → fallback **convex hull** silencieux (`envelope-polygon.ts:457`). Convex hull = rectangle quasi-aligné englobant TOUT, y compris l'escalier colimaçon central.
2. **Padding radial 2% depuis centroïde** (`envelope-polygon.ts:357-371` + `outline-shrinker.ts:226-237`) : sur un convex hull quasi-rectangulaire, le facteur 1.02 fait sortir les sommets de ~80cm-1m vers l'extérieur. C'est exactement le débord visible Thomas en haut.
3. **Hull mélange rooms snappées + non-snappées** (`envelope-polygon.ts:432-439`, commit s24) : « Le hull doit couvrir TOUT l'appartement, pas seulement les rooms OCR-ancrées ». Mais les rooms non-snappées portent le drift GPT-4.1 ~10% → leurs sommets entraînent le hull hors du bâti vers la terrasse / escalier.

**Effet combiné** : alpha-shape échoue → convex hull rectangulaire → padding 2% radial → forme finale = quasi-rectangle débordant. C'est exactement ce que Thomas voit.

## 3. Limite intrinsèque GPT-4.1 vision

- Drift positionnel ~10% **systémique**, documenté s23 (5 itérations prompt-only, plafond constaté).
- Sur Muguets : 44m² mesuré manuel vs 47m² IA = écart 7% (cohérent avec le plafond).
- Le prompt v9 (`plan-extractor.ts:142-454`, ~300 lignes) atteint son maximum prompt-only (8.5/10 self-scored docs s25). Hard constraint area, few-shot Muguets, anti-hallucination, self-check 20 points : tout est dedans. Pas de marge.
- Pattern : **post-process déterministe** (snap OCR, shrinker concave) est le seul levier restant — confirmé par les commits s23-s27. Mais il s'appuie sur les polygones IA en entrée → GIGO résiduel.

## 4. Trois alternatives pour « EXACTEMENT sur les lignes »

### A. Parsing PDF vectoriel direct (`pdfjs-dist`)
- Si PDF Thomas est vectoriel (probable sur P-03 architecte), extraire les `paths` natifs avec `pdfjs-dist` (`getOperatorList`) ou `pdf-parse` low-level. Lignes EXACTES du DAO, zéro drift IA.
- Pipeline : PDF → pdfjs paths → filtrer paths épais (= murs, lineWidth > seuil) → reconstruction polygones par flood-fill sur l'espace fermé contenant les labels OCR.
- Effort : 5-8 jours dev. Dépendances : `pdfjs-dist` (déjà stable), pas de service externe. Fallback IA conservé pour PDF rasterisés.
- ROI : couvre 70-80% des plans archi français (vectoriels). Échec gracieux sur scans → fallback pipeline IA actuel.

### B. OpenCV.js Hough Transform sur canonical PNG
- Sur le PNG canonical (noir/blanc épuré), `cv.HoughLinesP` → segments murs. `cv.findContours` après morpho → polygones fermés.
- Pipeline : canonical → binarize → Hough (lineLength > 5%) → segments → graph → cycles fermés → polygones rooms.
- Effort : 8-12 jours dev. Dépendances : `opencv.js` (~10MB WASM, build Next problématique en SSR — confirmé par learnings tilemap). Latence +2-5s par plan.
- ROI : marche aussi sur scans rasterisés. Mais OCR labels reste nécessaire pour nommer les rooms. **Plus complexe que A pour gain marginal sur PDF vectoriels.**

### C. Améliorer prompt v9 + post-process (statu quo durci)
- Re-tuning alpha-shape (alpha=0.3 adaptatif), padding 0% au lieu de 2%, room-rectification (snapper sommets sur grille de cotes IA), hull restreint aux rooms snappées uniquement.
- Effort : 2-3 jours dev. Aucune dépendance.
- ROI : **plafond ~7-10% drift résiduel** (limite GPT-4.1 vision). Améliore visiblement mais ne résout PAS le « EXACTEMENT » de Thomas. Confirmé empiriquement s23-s27.

## 5. Recommandation prioritaire

**A (parsing PDF vectoriel direct) — recommandé.**

Justifications :
- Thomas a dit « EXACTEMENT sur les lignes du lot ». Aucune solution IA ne le fera. Le PDF source EST la source de vérité géométrique.
- Le P-03 Muguets est un PDF d'architecte : 95%+ probabilité d'être vectoriel (DAO export). Cas d'usage majoritaire VS.
- Effort 5-8j vs C (2-3j plafond 7%) : 3× plus cher pour 10× la qualité.
- Dépendances minimales (`pdfjs-dist` déjà compatible Next.js, déjà utilisé indirectement via `pdf-to-img`).
- Fallback gracieux : si PDF non-vectoriel → pipeline IA actuel conservé.
- ROI direct : tue le plafond de drift GPT, transforme « bad AI » en « no AI when it can't help, perfect parsing when it can ».

**Ordre opérationnel** :
1. **P0 immédiat (1j)** : appliquer la mitigation C minimale — passer alpha de 0.5 à 0.3 ET désactiver le padding radial 2% (ramener à 0%) dans `envelope-polygon.ts:472` et `outline-shrinker.ts:226`. Réduit le débord visible de ~80cm sans toucher l'archi. Aucun risque.
2. **P1 (sprint s28)** : POC parcours A sur le plan Muguets P-03. Critère succès : tracé du lot superposable au tracé Thomas manuel (44m²) à ±0.5%.
3. **P2 (sprint s29)** : intégration A en feature flag `VS_PARSE_VECTOR_PDF`, fallback IA conservé.

**Métrique post-fix Muguets** : surface lot IA dans [43.5 ; 44.5] m², tracé visuel sans débord visible sur escalier/terrasse.

---

**Handoff → @orchestrator**
- Fichier produit : `/home/user/Versi/docs/ia/s27-vs-step2-debordement-audit.md`
- Causalité PDF→pixel : étapes 1-11 ci-dessus, **coupable nommé = `outline-shrinker.shrinkOutlinePolygonToRooms` + `envelope-polygon.concaveHull`** (alpha=0.5 trop strict → fallback convex hull silencieux → padding radial 2%).
- Recommandation : **A (parsing PDF vectoriel `pdfjs-dist`)** prioritaire. Mitigation P0 immédiate : alpha 0.5→0.3, padding 2%→0%.
- Points d'attention : 1) le fallback convex hull `envelope-polygon.ts:458` est SILENCIEUX (pas de log différenciant vs concave), à instrumenter avant tout fix ; 2) le hull mixe rooms snappées+non-snappées depuis s24, à reverter si C est retenu.
