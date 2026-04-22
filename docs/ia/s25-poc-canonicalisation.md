# POC Canonicalisation Plan — s25 Phase 0

**Date** : 2026-04-22 · **Agent** : @ia

**Contexte** : Pipeline actuel (PDF → GPT-4.1 vision → 5 passes + OCR snap) plafonne sur plans réels scannés. s23 : plafond prompt-only 6.03/10 → 9.35/10 via snap-to-label. Thomas rapporte résiduel insuffisant. Hypothèse : goulot en AMONT (qualité input) pas AVAL (refinement). Idée : canonicaliser le plan (redessin vectoriel épuré) AVANT extraction. Cohérent `patterns-post-process.md` appliqué à l'amont + règle s23 "10/10 objectif strict — technique adjacente si plafond".

---

## TL;DR — Recommandation

**Approche B retenue — Pré-rendu IA image-to-image (`openai.images.edit()` gpt-image-1)** avec fallback CV classique.

Justification courte : faisabilité Node maximale (pas de binding natif OpenCV à installer sur Replit), latence acceptable (+20s sur un pipeline déjà multi-minutes), coût négligeable vs valeur (+$0.04/plan vs client qui paye 50€+). Les approches A (CV pur) et C (hybride) nécessitent une stack CV lourde (opencv4nodejs ou binding WASM) instable sur Replit serverless.

---

## Approche A — CV classique (OpenCV / sharp / canvas)

### Principe
Binarisation adaptive (Otsu) → détection contours + Hough lines → regroupement lignes parallèles → reconstruction polygones rectilinéaires → rasterisation d'un plan "propre" noir/blanc.

### Pseudo-code
```typescript
import cv from '@u4/opencv4nodejs'; // OU sharp + custom
const img = cv.imread(planPath);
const gray = img.cvtColor(cv.COLOR_BGR2GRAY);
const bin = gray.adaptiveThreshold(255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 15, 10);
const edges = bin.canny(50, 150);
const lines = edges.houghLinesP(1, Math.PI/180, 80, 50, 10);
// Regrouper lignes ~horizontales / ~verticales (tolérance 5°)
const { horizontals, verticals } = clusterByOrientation(lines);
// Intersections + polygones fermés
const polygons = reconstructRectilinear(horizontals, verticals);
// Rendre canvas 2048×2048 noir/blanc
renderCleanPlan(polygons, './canonical.png');
```

**Métriques** : Faisabilité Node 2/5 · Coût $0 · Latence 2-5s · Échec estimé 40-60% sur scans médiocres.

### Risques
- `opencv4nodejs` / `@u4/opencv4nodejs` requiert binding natif = casse sur Replit serverless (pattern s24 tesseract crash Turbopack en pire)
- Hough lines sur scan bruité = lignes parasites (textes cartouche, cotations, hachures)
- Reconstruction rectilinéaire rigide = perd murs obliques (habitat réel en a souvent)
- Aucune "intelligence sémantique" : confond cotations et murs
- **Disqualifiant** : stack CV pure JS (ex : `sharp` seul) ne fait PAS Hough. OpenCV WASM (`opencv.js`) = 8.7 MB bundle, incompatible edge.

---

## Approche B — Pré-rendu IA image-to-image (RECOMMANDÉE)

### Principe
Appel `openai.images.edit()` avec `gpt-image-1`, prompt canonicalisation dédié, règles négatives explicites. Le modèle redessine le plan en version vectorielle épurée (murs noirs épais, fond blanc, zéro annotation, zéro cotation, zéro hachure). Plan canonique → passé au pipeline GPT-4.1 vision existant.

### Pseudo-code
```typescript
import OpenAI from 'openai';
import { toFile } from 'openai';
import fs from 'fs/promises';

const openai = new OpenAI();
const buf = await fs.readFile(rawPlanPath);

// RAPPEL s22 : openai.responses.create() ne supporte PAS gpt-image-1
// Utiliser openai.images.edit() avec toFile()
const res = await openai.images.edit({
  model: 'gpt-image-1',
  image: await toFile(buf, 'plan.png', { type: 'image/png' }),
  prompt: CANONICAL_PROMPT_V1, // cf. prompt-library.md
  size: '2048x2048',
  quality: 'high',
});
const canonical = Buffer.from(res.data[0].b64_json, 'base64');
await fs.writeFile('./canonical.png', canonical);
// → passer canonical.png au pipeline extract existant
```

### Prompt canonicalisation (draft v1)
```
Redraw this architectural floor plan as a clean vector-style diagram.

STRUCTURE (MUST PRESERVE):
- Exact wall positions, thicknesses, angles
- Exact room shapes and proportions
- Door openings (gaps in walls)
- Window positions

STYLE (APPLY):
- Pure white background (#FFFFFF)
- Pure black walls (#000000), uniform 6px thickness
- Doors as thin arc lines
- Windows as double parallel lines

STRIP (MUST REMOVE):
- no dimensions, no measurements, no numbers
- no text labels, no room names
- no hatching, no textures, no furniture
- no title block, no scale bar, no north arrow
- no legend, no annotations
- ZERO color, ZERO grayscale, pure B&W only
```

**Métriques** : Faisabilité Node 5/5 · Coût ~$0.04/plan (gpt-image-1 high quality 2048) · Latence 15-25s · Échec estimé 10-20% (hallucination géométrique sur plans complexes).

### Risques
- Hallucination géométrique : gpt-image-1 peut déplacer un mur de quelques pixels → pipeline extract reste ancré sur plan original pour le polygon-resolver
- Plans > 2048px perdent détails (downsample obligatoire). Scan haute-déf A2 → 2048 = perte cotations fines (non-bloquant car on les strip)
- Variance output entre appels (seed non contrôlable)
- **Mitigation** : feature flag `VS_CANONICAL_PREPASS`, fallback silencieux vers plan original si image sortie fait échouer les gates du pipeline (ex : 0 rooms extraites)

**Pourquoi ça gagne** : 0 dépendance native (HTTP API OpenAI déjà intégré) · Pattern s22 validé en prod versi (`openai.images.edit()` + `toFile()`) · Règles négatives = pattern s22 validé 10/10 sur transformations structurelles · ROI évident si taux 10/10 passe de 6/10 à 8/10 plans.

---

## Approche C — Hybride (CV + IA correction)

### Principe
CV classique pour structure grossière → IA vision (GPT-4.1) pour valider/corriger zones ambiguës détectées (murs manquants, intersections floues).

### Pseudo-code
```typescript
const cvResult = await classicCvExtract(plan); // cf. Approche A
const ambiguousZones = detectAmbiguous(cvResult); // low confidence regions
if (ambiguousZones.length > 0) {
  const crops = ambiguousZones.map(z => cropImage(plan, z.bbox));
  const corrections = await Promise.all(
    crops.map(crop => gpt41VisionCorrect(crop)) // 2-pass pattern s22
  );
  const merged = mergeCorrections(cvResult, corrections);
  return renderClean(merged);
}
```

**Métriques** : Faisabilité Node 2/5 (hérite limitations A) · Coût ~$0.02/plan (vision crops) · Latence 10-20s · Échec estimé 25-40%.

### Risques
- Complexité cumulée : hérite TOUS les risques de A (CV fragile) + ajoute couche d'intégration
- Debug quasi-impossible : où a échoué le pipeline ? CV ou IA ?
- Dev time 3× B, pour gain marginal en coût
- **Disqualifiant** : antipattern s23 "10/10 objectif strict — technique adjacente si plafond". C ne remplace pas A, il l'empile. Si A est fragile sur Replit, C l'est aussi.

---

## Synthèse comparative

| Approche | Faisabilité Node | Coût/plan | Latence | Échec | Verdict |
|---|---|---|---|---|---|
| A — CV pur | 2/5 | $0 | 2-5s | 40-60% | Écartée — stack native instable Replit |
| **B — IA canonicalisation** | **5/5** | **$0.04** | **15-25s** | **10-20%** | **RETENUE** |
| C — Hybride | 2/5 | $0.02 | 10-20s | 25-40% | Écartée — complexité cumulée |

---

## Plan d'implémentation (Approche B)

### Architecture cible
- Module `versi-studio/src/lib/vs/plan-canonicalizer.ts` (~150L). Signature : `canonicalizePlan(buf: Buffer): Promise<{ canonical: Buffer; duration: number; fallback: boolean }>`. Timeout 45s, fallback silencieux.
- Prompt `CANONICAL_PROMPT_V1` versionné dans `prompt-library.md` + 3 test cases (scan A3 médiocre, PDF vectoriel, plan manuscrit).
- Feature flag env `VS_CANONICAL_PREPASS` (off par défaut).
- DB column `vs_plans.canonical_image_url` (TEXT nullable) pour debug/audit.
- Hook dans `extract/route.ts` AVANT `extractPlan()` existant. Pas de nouvelle route. Idempotent via hash input.

### Étapes
1. **@ia** — finaliser prompt + 3 test cases, valider visuellement. 0.5j.
2. **@fullstack** — implémenter `plan-canonicalizer.ts` + flag + colonne DB + logs (input/output/duration/fallback). 0.5j.
3. **@qa + Thomas** — reality check E2E sur 5 plans réels (scannés + vectoriels), comparer ON vs OFF sur score 10/10 existant + screenshots. 0.5j.
4. **Gate GO/NO-GO** — si gain ≥ +1.5 pts score moyen → activer par défaut. Sinon → prompt v2 ou fallback stratégique.
5. **Observabilité** — tracker `canonical_success_rate`, `canonical_duration_p95`, `canonical_fallback_rate`.

### Fallback
- **Runtime** : si `openai.images.edit()` timeout/erreur OU si extract sur plan canonique retourne 0 rooms → réutiliser plan original. User jamais bloqué.
- **Stratégique** (si POC fail gate 4) : tester approche A avec `@napi-rs/canvas` + custom Hough JS. Si A fail aussi → accepter plafond pipeline actuel, investir sur UX correction manuelle (drag/resize déjà livré s22).

---

**Points d'attention** : `openai.responses.create()` NE SUPPORTE PAS gpt-image-1 (s22 critique) · Cap tokens N/A (image API facturée à l'image) · Reality check E2E obligatoire sur 5 plans réels avant GO PRODUCTION · `gpt-image-1` stable sans version dated, monitorer changelog OpenAI.

---

**Handoff → @orchestrator**
- Fichier produit : `/home/user/Versi/docs/ia/s25-poc-canonicalisation.md`
- Décision : **Approche B retenue** (IA image-to-image via `openai.images.edit()`)
- Prochaine action : @ia produit `CANONICAL_PROMPT_V1` + 3 test cases dans `prompt-library.md` avant tout code
- Puis @fullstack implémente `plan-canonicalizer.ts` derrière feature flag `VS_CANONICAL_PREPASS`
- Gate GO/NO-GO après reality check E2E sur 5 plans réels Thomas
