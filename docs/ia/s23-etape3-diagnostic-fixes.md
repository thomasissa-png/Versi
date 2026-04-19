# s23 — Étape 3 Rooms : diagnostic & fixes 3 bugs IA critiques

Auteur : @ia — Session s23 reality check Thomas.
Contexte : après fix s23 plan non-cropped Étape 3 (commit `6d0e58e`), Thomas identifie 3 bugs IA critiques sur la génération/manipulation des pièces. Spec de fix à appliquer par @fullstack.

## Synthèse du diagnostic

| Bug | Cause racine (résumé) | Sévérité | Effort fix |
|---|---|---|---|
| 1. Pièces superposées | Pas de post-process non-overlap. Prompt contient déjà NO-OVERLAP CHECK (v3) mais l'IA ne le respecte pas, et aucune garantie code côté serveur. | Haute (physique impossible) | Moyen |
| 2. Drag bloqué sur les côtés + déphasage | Le drag est clamp en lot-local `[0,100]%` dans `RoomCanvas.tsx` ligne 200 via `Math.min(100 - MIN_ROOM_SIZE_PERCENT, ...)`. Or quand `zone_data` est un POLYGON (pas un rect), le lot est dégradé à sa bbox (page.tsx:228-247), donc le drag est contraint à la bbox du polygone, PAS au polygone. Résultat : zones "mortes" entre bbox rect et polygone réel → sensation de mur invisible. | Haute (UX cassée) | Faible |
| 3. Aucune interprétation du plan | L'IA (GPT-4.1 vision) a déjà accès à l'image et est instruite de lire les labels (plan-extractor.ts STEP 3a). Le problème est plutôt que le prompt NE REPOSITIONNE PAS les bboxes en fonction des labels détectés — il extrait bboxes + noms en un seul pass aveugle. Pas d'OCR séparé. | Moyenne (qualité) | Élevé |

---

## Bug 1 — Superposition des pièces

### Cause racine
- Le prompt v3 `plan-extractor.ts` contient `NO-OVERLAP` rule (ligne 225) + CHECK final (ligne 296) MAIS **aucun post-process code ne vérifie ni corrige l'overlap**. Le modèle peut l'ignorer, et effectivement l'ignore sur des plans denses.
- `sanitizeSurfaces()` clamp dans l'outline mais **ne déchevauche rien**.
- `polygon-refiner.ts` (pass 2) trace chaque polygone indépendamment → rien n'empêche 2 polygones voisins de se recouvrir.
- Pas de contrainte de **contenance** (union pièces ⊆ lot) : une pièce peut déborder hors du lot.

### Options de fix
- **Option A — Post-process greedy pairwise clipping** (recommandé)
  - Après `extractPlanData()` + `refineRoomPolygon()`, appliquer pour chaque paire (A,B) de pièces du même lot : si `overlap(A,B) > 2%` de min(aire A, aire B), clip le polygone du plus-jeune-index par le polygone de l'autre (polygon difference via `polygon-clipping` npm lib, ~40kB).
  - Puis clip l'union finale au polygone du lot (contenance stricte).
  - Complexité O(n²) acceptable (n ≤ 15 pièces par lot typique).
- **Option B — Voronoi-based re-partitioning**
  - Calculer Voronoi sur les centroïdes des pièces, intersecté avec le polygone du lot. Déterministe et 0-overlap par construction, mais perd le fit aux murs réels.
- **Option C — Retry IA avec feedback**
  - Si overlap détecté → self-correction prompt (pattern déjà en place dans plan-extractor.ts:520). +1 appel API, coût ~2x pour les cas problématiques.

**Recommandation : A + C en fallback.** A est déterministe et pas cher (pure fonction JS, 0 tokens). C en fallback si après A il reste >15% de surface réassignée (signal que l'IA a vraiment mal placé).

### Spec code (pseudo)
```ts
// Nouveau fichier : src/lib/vs/polygon-resolver.ts
import polygonClipping from "polygon-clipping"; // ~40kB

export function resolveRoomOverlaps(
  rooms: ExtractedRoom[],       // avec bounding_polygon
  lotPolygon: Point[],          // polygone du lot (pour contenance)
): ExtractedRoom[] {
  // 1. Clip chaque pièce au polygone du lot (contenance)
  // 2. Pour chaque paire (i < j), trier par confidence DESC
  //    Si overlap(room[i], room[j]) > seuil :
  //      room[j].polygon = difference(room[j].polygon, room[i].polygon)
  //    => la pièce la plus confiante gagne le territoire disputé
  // 3. Drop les pièces dont l'aire résiduelle < 50% de l'initiale (signal erreur)
  // 4. Log warnings dans extraction_warnings : "room_clipped_for_overlap"
  return resolved;
}
```

Appel : dans la route `/api/vs/projects/[id]/extract` après `refineRoomPolygon()`, avant save DB.

### Prompt hardening (complémentaire, règles négatives)
Ajouter au prompt plan-extractor (règles négatives > positives, pattern s22) :
```
NO-OVERLAP — ABSOLUTE RULE:
- NO room polygon can overlap another room polygon. ZERO overlap.
- NO pixel of floor area belongs to 2 rooms. ZERO shared territory.
- NO room extends outside the lot polygon. ZERO bleed-out.
```

---

## Bug 2 — Drag bloqué / déphasage

### Cause racine
Deux bugs combinés :

**Bug 2a — Polygone lot dégradé en bbox dans RoomCanvas**
`app/vs/projects/[id]/rooms/page.tsx:228-247` :
```ts
const lotZone: ZoneRect = (() => {
  if (raw.type === "polygon") {
    // ... retombe sur bbox axis-aligned du polygone
    return { x_percent: minX, y_percent: minY, width_percent: maxX-minX, ... };
  }
  return raw as ZoneRect;
})();
```
Conséquence : si le lot est un polygone en L ou irrégulier, le drag est autorisé dans toute la bbox rectangulaire — mais visuellement la pièce semble bloquée quand elle "touche" les murs du L qui ne sont pas les bords de la bbox.

Inversement, si la bbox est plus SERRÉE que le polygone d'origine (cas improbable mais possible), on observe l'effet "bloqué sur les côtés" décrit par Thomas.

**Bug 2b — Clamp drag sur `[0, 100]%` lot-local**
`RoomCanvas.tsx:199-202` :
```ts
x_percent = Math.max(0, Math.min(100 - MIN_ROOM_SIZE_PERCENT, x_percent));
width_percent = Math.min(100 - x_percent, width_percent);
```
Le clamp utilise `[0,100]` qui correspond à la bbox du lot ET suppose un lot rectangulaire. Si la bbox lotZone n'a pas été synchronisée après le fix `6d0e58e` (plan non-cropped), on peut voir un décalage : le fond affiché montre le plan entier, mais le clamp drag reste calé sur la bbox sauvegardée avant fix → sensation de "mur invisible".

**Vérifier aussi** : `currentLot.zone_data` est-il bien rafraîchi en mémoire après le fix plan non-cropped ? Si les zones ont été recalculées en DB mais pas la cache front → déphasage.

### Fix chirurgical

1. **Remplacer la dégradation bbox par un vrai support polygone** dans `RoomCanvas` :
   - Stocker `lotPolygon: Point[] | null` en plus de `lotZone: ZoneRect`.
   - Dans `computeResize()` / drag-end, ajouter un test `pointInPolygon(centroid(room), lotPolygon)` après le clamp rect. Si hors polygone, restaurer la position précédente OU snapper au point le plus proche sur le polygone (préférable).
2. **Assouplir le clamp bbox**, clamp uniquement sur la bbox globale [0,100] et déléguer la contrainte de forme au polygone.
3. **Revérifier zone_data sync** : ajouter un re-fetch du lot après toute maj IA (post-fix `6d0e58e` pourrait avoir cassé ça). Confirmer visuellement que la `lotZone` affichée = polygone dessiné dans Étape 2.

### Spec code
```ts
// RoomCanvas.tsx, computeResize() + handleDragEnd()
function isInsideLot(pos: RoomPosition, lotPoly: Point[]): boolean {
  const c = { x: pos.x_percent + pos.width_percent / 2,
              y: pos.y_percent + pos.height_percent / 2 };
  return pointInPolygon(c.x, c.y, lotPoly); // déjà importé de types.ts
}
// Après clamp rect, si !isInsideLot(newPos, lotPolygon) → revert ou snap
```

---

## Bug 3 — Aucune interprétation du plan (OCR)

### Cause racine
`plan-extractor.ts` buildSystemPrompt (ligne 141+) demande déjà au modèle de lire les labels (STEP 3a "Use the room name EXACTLY as written") et de placer les bboxes au niveau des murs (STEP 5 WALL IDENTIFICATION METHOD). **En théorie tout est là, en pratique GPT-4.1 vision a du mal sur plans denses/petits** :
- Le passage vision est single-shot sur le plan complet (résolution limitée par `detail: auto`)
- Les symboles (WC, arcs de porte) ne sont pas scorés explicitement
- Pas d'OCR structuré en amont qui "fournirait" les labels sur un plateau

### Options de fix
- **Option A — OCR amont (Tesseract ou Textract) + injection dans prompt**
  - Coût : Tesseract.js (gratuit, local, ~50ms/plan) OU AWS Textract (~$0.0015/page).
  - Gain : labels extraits avec coords précises, injectés dans le prompt comme "LABELS PRE-DETECTED: [WC @ (42%, 30%), Chambre 3 @ (60%, 45%), ...]" → l'IA ancre ses bboxes sur ces positions.
  - Complexité : moyenne. Tesseract français n'est pas parfait sur plans scannés anciens.
- **Option B — Second pass vision ciblé "label → room"**
  - Au lieu d'extraire tout en un pass, faire pass 1 (bbox grossier comme aujourd'hui) puis pour chaque bbox faire un crop + appel vision "vérifie que le label central de ce crop correspond au nom attribué, sinon corrige".
  - Coût : ~N appels supplémentaires (N = nb pièces). Pattern 2-pass déjà maîtrisé (polygon-refiner).
  - Gain : validation croisée label ↔ position.
- **Option C — Upgrade modèle vision**
  - Passer à `gpt-4.1` (déjà le cas) ou tester Gemini 2.5 Pro (context long + meilleur OCR intégré sur documents denses). Nécessite benchmark comparatif, pas un fix court-terme.

**Recommandation : B d'abord** (réutilise le pattern 2-pass déjà en prod dans `polygon-refiner.ts`, 0 nouvelle dépendance). A en phase 2 si B ne suffit pas.

### Spec code (Option B)
```ts
// Nouveau : src/lib/vs/label-verifier.ts
export async function verifyRoomLabel(
  imageBuffer: Buffer, imageWidth: number, imageHeight: number,
  roomName: string, bbox: BoundingBox, client: OpenAI
): Promise<{ confirmedName: string; confidence: number; note: string | null }>
// Crop image à bbox + marge, prompt :
// "What is the room name visible in this floor plan crop?
//  Expected: '${roomName}'. If the label visible in the crop says
//  something else (WC, SdB, Chambre, etc.), return the correct name."
// Output structured : { confirmedName, confidence, note }
```

Puis dans extract route : pour chaque pièce, si `confirmedName !== roomName` et `confidence > 0.7` → écraser `name_raw` + ajouter warning `label_corrected`.

Coût estimé : ~15 pièces × $0.003 (gpt-4.1 mini si besoin) = $0.045/plan. Négligeable vs gain qualité.

---

## Priorisation

**Ordre d'attaque recommandé** (ROI décroissant) :

1. **Bug 2 — drag polygone** (effort faible, impact élevé, pas d'appel IA). 1-2h dev.
2. **Bug 1 — non-overlap + contenance** (effort moyen, impact élevé, algo pur JS + 0 tokens). 4-6h dev.
3. **Bug 3 — label verifier** (effort élevé, impact qualité, appels IA additionnels). 1 jour dev + benchmarks.

**Rationale** : Bugs 1 et 2 sont des erreurs de correction code et fonction pure (aucun appel IA supplémentaire donc 0 coût tokens mensuel). Bug 3 ajoute un coût récurrent. Bugs 1+2 résolvent les plaintes Thomas `no AI > bad AI`. Bug 3 est un upgrade qualité.

---

## Handoff @fullstack

### Fichiers à créer
- `versi-studio/src/lib/vs/polygon-resolver.ts` (Bug 1 — non-overlap + contenance)
- `versi-studio/src/lib/vs/label-verifier.ts` (Bug 3 — pass 2 label verification)

### Fichiers à modifier
- `versi-studio/src/components/vs/RoomCanvas.tsx` :
  - Accepter prop `lotPolygon: Point[] | null` en plus de `lotZone: ZoneRect`
  - Dans `computeResize()` + drag-end, ajouter `isInsideLot(pos, lotPolygon)` check
  - Remplacer clamp `100 - MIN_ROOM_SIZE_PERCENT` par clamp bbox + validation polygone
- `versi-studio/src/app/vs/projects/[id]/rooms/page.tsx` :
  - Au lieu de dégrader polygone → bbox (lignes 228-247), passer les 2 (polygone + bbox dérivée) à RoomCanvas
  - Re-fetch `currentLot` si suspicion de cache désynchronisé post-fix `6d0e58e`
- `versi-studio/src/app/api/vs/projects/[id]/extract/route.ts` (ou le fichier route concerné) :
  - Après `refineRoomPolygon()` et avant save DB : appeler `resolveRoomOverlaps(rooms, lotPolygon)`
- `versi-studio/src/lib/vs/plan-extractor.ts` :
  - Ajouter bloc NO-OVERLAP règles négatives (voir section Bug 1 "Prompt hardening")
  - Bump `PROMPT_VERSION` (tracer la migration)

### Dépendances à installer
- `polygon-clipping` (~40kB, 0 dépendance transitive, mature) — `npm install polygon-clipping`

### Tests attendus (reality check E2E obligatoire avant @moi GO)
- **Bug 2** : ouvrir Étape 3 sur lot polygone en L → drag pièce vers une zone concave → la pièce doit être bloquée par le mur du L (pas seulement par la bbox rect)
- **Bug 1** : upload plan P03 versi-s22 (duplex avec overlap connus) → après extract, vérifier visuellement 0 overlap entre pièces du même lot
- **Bug 3** (phase 2) : plan avec noms WC/Cuisine/SdB explicites → vérifier que les `name_raw` remontés collent 100% aux labels visibles
- Ajouter test unit `polygon-resolver.test.ts` : 3 cas (overlap 2 pièces, 3 pièces triangulaires, pièce sortant du lot)
- Re-run Playwright E2E sur le flux extract → rooms → visuals

### Notes d'attention
- **Règle alias `-latest`** (pattern @ia) : vérifier que les modèles gpt-4.1 utilisés ne dérivent pas — tag exact recommandé en prod.
- Prompt hardening : bumper `PROMPT_VERSION` dans plan-extractor (tracer la migration NO-OVERLAP v3 → v4).
- Propagation : si un pattern bbox/polygone existe dans d'autres composants (PlanCanvas Étape 2), vérifier cohérence. Grep sur `lotZone` et `pointInPolygon` après fix.
- Anti-inflation coûts : Bug 3 label-verifier ajoute ~$0.05/plan. Documenter dans `ai-cost-analysis.md` au prochain passage.

---

**Handoff → @orchestrator**

- Fichiers produits : `docs/ia/s23-etape3-diagnostic-fixes.md`
- Décisions prises : priorisation Bug 2 > Bug 1 > Bug 3 (ROI décroissant). Fix Bug 1 + 2 sans appel IA additionnel (0 coût tokens). Bug 3 différé + benchmark.
- Points d'attention : @fullstack doit installer `polygon-clipping`, créer 2 nouveaux fichiers dans `src/lib/vs/`, modifier RoomCanvas + rooms page + extract route. Bump PROMPT_VERSION obligatoire. Reality check E2E requis avant GO (reproduction bug 1/2/3 sur plan réel).
