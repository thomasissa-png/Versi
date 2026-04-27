# s27 — Refonte architecture pipeline plan-extractor Versi Studio

> **Verbatim Thomas s27** : « L'outil doit pouvoir s'adapter à tous les PDF qu'on reçoit : vectoriel, bitmap, image. Détecter en amont. On doit aussi être capable d'analyser les différences entre espaces communs et lots. »
> **Verbatim Thomas s27** (cible) : « tracé EXACTEMENT sur les lignes du lot ».

Le pipeline actuel (gpt-image-2 canonical → GPT-4.1 Vision drift ~10 % → envelope concave hull → outline-shrinker) atteint un **plafond technique génératif** documenté s23/s25/s27 : aucun fine-tuning de prompt ne descendra le drift sous 7-10 % car le modèle vision **régénère** les contours au lieu de les **lire**. La refonte sort du paradigme génératif et fait du PDF source la **vérité géométrique unique** (vectoriel quand dispo, bitmap raster + Hough sinon).

---

## Diagramme ASCII — pipeline cible 5 modules

```
┌─ Upload PDF ─────────────────────────────────────────────────────────┐
│                                                                      │
│   [M1] DÉTECTEUR AUTO TYPE PDF      ◄── ce livrable (s27)            │
│        ├── compte operators vectoriels (m/l/c/re) via pdfjs-dist     │
│        ├── compte XObject Image embedded                             │
│        └── verdict: { type, vectorPathCount, imageCount, confidence }│
│                                                                      │
│        ├──► vector  (paths > 50× images)                             │
│        │       └─► [M2] PARSER VECTORIEL (pdfjs-dist)                │
│        │             extract paths → segments → primitives murs      │
│        │                                                             │
│        ├──► bitmap  (zéro path, ≥1 image)                            │
│        │       └─► [M3] OPENCV.JS HOUGH TRANSFORM                    │
│        │             raster → edges Canny → HoughLinesP → segments   │
│        │                                                             │
│        └──► hybrid  (paths + images coexistent)                      │
│                └─► [M2] + [M3] fusion segments                       │
│                                                                      │
│   [M4] GRAPHE LIGNES MURS connectées                                 │
│        ├── snap endpoints (tolérance 2-5 px)                         │
│        ├── détection intersections → noeuds                          │
│        ├── arêtes = segments murs                                    │
│        └── détection cycles fermés → pièces candidates               │
│                                                                      │
│   [M5] IDENTIFICATION LOTS vs COMMUNS  ◄── critique Thomas s27       │
│        ├── OCR labels cartouche + intra-plan (Tesseract.js, dispo)   │
│        ├── topologie portes (segments interrompus + arc)             │
│        ├── règles métier : escalier, hall, ascenseur, palier, LT     │
│        └── lots = grappe pièces accessibles via 1 seule porte palière│
│                                                                      │
│   ──► POLYGONE EXACT lot = enveloppe murs (sans communs)             │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Specs par module

### Module 1 — Détecteur auto type PDF [LIVRÉ s27]

- **Input** : `Buffer` PDF brut (post `formData.get("file")`).
- **Output** : `{ type: "vector" | "bitmap" | "hybrid", vectorPathCount: number, imageCount: number, confidence: number }`.
- **Heuristique** : compter operators `m`/`l`/`c`/`re` dans les content streams via pdfjs-dist `getOperatorList()`, compter XObject Image. Décision : `paths > 50 × images` → vector ; `0 path && ≥1 image` → bitmap ; sinon → hybrid. Confidence = ratio normalisé.
- **Fail mode** : PDF corrompu / sans page → throw `PdfTypeDetectorError` (pas de fallback silencieux — learning P0 s27).
- **Dépendances npm** : `pdfjs-dist@5.6.205` (déjà transitive via `pdf-to-img`), `pdf-lib` (devDep tests fixtures synthétiques).
- **Effort** : 0,5 j (livré s27, ~80 LoC + 60 LoC tests).

### Module 2 — Parser PDF vectoriel

- **Input** : `Buffer` PDF + verdict M1 = `vector` ou `hybrid`.
- **Output** : `Segment[] = { x1, y1, x2, y2, layer?: string, lineWidth: number }[]` en coordonnées PDF user-space.
- **Algo** : `pdfjs-dist.getOperatorList()` → walk des opérateurs `OPS.constructPath` + `OPS.lineTo`/`moveTo`/`curveTo`/`rectangle` → conversion user-space via CTM courante → flatten courbes Bézier en polylines (tolérance 0,5 px). Filtrer segments < 5 mm (cotes / hachures).
- **Dépendances npm** : `pdfjs-dist` (déjà), pas de WASM.
- **Effort** : 4-6 j @fullstack (parsing CTM + flatten Bézier non triviaux), 1 j @ia (tuning seuils).

### Module 3 — OpenCV.js Hough Transform (bitmap)

- **Input** : raster PNG haute-déf (scale 4-6) du PDF + verdict M1 = `bitmap` ou `hybrid`.
- **Output** : `Segment[]` même format que M2 en coordonnées pixel raster.
- **Algo** : `cv.imread` → `cvtColor` gray → `Canny(50, 150)` edges → `HoughLinesP(rho=1, theta=π/180, threshold=80, minLineLength=20, maxLineGap=5)`. Post-process : merge collinear segments (angle Δ < 2°, distance Δ < 3 px).
- **Dépendances npm** : `@techstark/opencv-js` (~10 MB WASM, charger côté server-only via `next.config.ts` `serverExternalPackages`).
- **Risque build Next** : WASM en SSR → wrapper `await import()` lazy + cache module-level. Documenter dans `infrastructure.md`.
- **Effort** : 6-8 j @fullstack (intégration WASM Next), 1-2 j @ia (tuning Hough thresholds par densité plan).

### Module 4 — Graphe lignes murs + détection pièces

- **Input** : `Segment[]` issu M2 / M3 / M2+M3.
- **Output** : `{ nodes: Point[], edges: Edge[], rooms: Polygon[] }`. Rooms = cycles fermés minimaux du graphe planaire.
- **Algo** : (a) snap endpoints proches (tolérance 2-5 px ou 2-3 cm post-calibration) → noeuds uniques ; (b) ajout arêtes ; (c) extraction des **faces** d'un graphe planaire (algo "rotational sort + face traversal", classique en SIG / cartographie). La face externe (infinie) est exclue, les faces finies = pièces.
- **Dépendances npm** : implémentation maison (~300 LoC) ou `planar-graph` (npm, peu maintenu — préférer maison).
- **Effort** : 5-7 j @fullstack + 2 j @ia (gestion ouvertures portes = arête optionnelle, robustesse murs non parfaitement fermés).

### Module 5 — Identification lots vs communs

- **Input** : `rooms` issus M4 + raster original (pour OCR).
- **Output** : `{ lots: Polygon[], commons: Polygon[], labels: Map<roomId, string> }`.
- **Algorithme topologique** :
  1. **OCR labels** sur chaque pièce (Tesseract.js déjà en dépendance) : extraire texte intra-polygone + cartouche.
  2. **Classification par mot pivot métier** (cf. learning s24) :
     - `COMMUNS` : `escalier`, `cage d'escalier`, `colimaçon`, `hall`, `palier`, `ascenseur`, `local technique`, `LT`, `local poubelle`, `couloir commun`, `vide-ordures`, `gaine`, `circulation commune`.
     - `LOTS` : `T1`/`T2`/`T3`/`T4`/`T5`, `studio`, `appartement`, `lot 1`/`lot 2`, `RDC`, `R+1`, etc.
  3. **Topologie portes** : une pièce avec porte vers escalier/ascenseur ET vers une grappe d'autres pièces = **palier** (commun par construction). Une grappe accessible uniquement via 1 porte palière = 1 lot.
  4. **Règles métier de défaut** (si OCR ambigu) :
     - escalier détecté géométriquement (forme en spirale ou trapèzes empilés) → commun.
     - pièce traversée par > 2 portes connectant pièces hétéroclites → palier (commun).
     - pièce sans porte vers extérieur du bâtiment ni vers lot identifié → commun (local technique probable).
- **Polygone lot final** : union des polygones rooms d'une même grappe-lot, simplifiée (Douglas-Peucker tolérance 1-2 cm).
- **Dépendances npm** : `tesseract.js@^7.0.0` (déjà), `polygon-clipping@^0.15.7` (déjà).
- **Effort** : 5-7 j @ia (règles + OCR pipeline) + 3-4 j @fullstack (intégration M4→M5).

---

## Plan de migration progressive

1. **Phase A (s28)** : feature flag `VS_NEW_PIPELINE=false` par défaut, code branche neuve isolée (`src/lib/vs/v2/`). Pipeline actuel intact en prod.
2. **Phase B (s29-s30)** : implémenter M2 (vectoriel) en prio — couvre 70-80 % des PDF archi reçus selon audit s27. Brancher M1+M2+M4+M5 sur `VS_NEW_PIPELINE=true` (opt-in dev/QA).
3. **Phase C (s31-s32)** : implémenter M3 (OpenCV bitmap) pour scans / croquis main / PDF aplatis.
4. **Phase D (s33)** : éval Yann/Lucas/Camille panneau pixel-par-pixel sur ≥ 10 PDF hétérogènes (vectoriel pur, bitmap pur, hybride, multi-pages, calque archi, scan basse-déf). Si 10/10 sur ≥ 8 plans → bascule `VS_NEW_PIPELINE=true` par défaut.
5. **Phase E (s34)** : retirer `gpt-image-2` canonicalisation, `envelope-polygon` concave hull, `outline-shrinker`. Conserver `plan-extractor.ts` GPT-4.1 Vision **uniquement** pour OCR labels redondant à Tesseract si gain mesuré, sinon supprimer aussi.

**Anti-pattern à éviter** (learning P0 s27) : aucun fallback silencieux entre M2 et M3. Si M1 dit `vector` et M2 échoue → erreur typée `VectorParseFailedError` remontée à l'UI, pas bascule muette sur M3. L'investigation est faite à la source.

---

## Critères de validation 10/10 (gates Thomas)

- **G-PIXEL** : sur PDF vectoriel, polygone lot final superposé au PDF source — drift max 1 px à zoom 100 % sur tous les murs périphériques (vs 10 % actuel).
- **G-COMMUNS** : escalier, palier, hall, ascenseur EXCLUS du polygone lot dans 100 % des plans copropriété testés.
- **G-SURFACE** : surface lot calculée ∈ [Carrez officiel × 0,98 ; Carrez × 1,02] (vs ~10 % drift actuel).
- **G-ROBUSTESSE** : sur lot de 10 PDF hétérogènes (3 vectoriels archi, 3 bitmaps scans, 3 hybrides Pages+Photoshop, 1 PDF corrompu test), ≥ 9 réussites + erreur explicite typée sur le 10ᵉ.
- **G-LATENCE** : pipeline complet < 30 s sur PDF 10 MB (vs ~25 s actuel — pas de régression).
- **G-COÛT** : zéro appel `gpt-image-*` en pipeline cible. GPT-4.1 Vision OPT-IN seulement si OCR Tesseract insuffisant (mesure A/B en phase D).

---

## Effort total estimé

| Module | Effort @ia | Effort @fullstack | Total |
|---|---|---|---|
| M1 détecteur | 0,5 j (livré s27) | — | 0,5 j |
| M2 vectoriel | 1 j | 4-6 j | 5-7 j |
| M3 OpenCV Hough | 1-2 j | 6-8 j | 7-10 j |
| M4 graphe + cycles | 2 j | 5-7 j | 7-9 j |
| M5 lots vs communs | 5-7 j | 3-4 j | 8-11 j |
| Migration + éval | 1 j | 2 j | 3 j |
| **Total** | **10,5-13,5 j** | **20-27 j** | **30,5-40,5 j** |

Soit ~6-8 semaines calendaires en parallélisant @ia + @fullstack (cmd n°5). À mettre en regard du plafond actuel : 5 itérations de prompt déjà consommées s23-s27, gain marginal nul. La refonte est l'unique voie vers le 10/10 visuel exigé par Thomas.
