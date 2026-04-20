# s23 — Diagnostic désync polygon/bbox Étape 3

**Date** : 2026-04-20
**Projet test** : `433b0088-144f-4248-875f-268888aac840` (P00 Pr2 RDC projet2)
**Reporter** : Thomas (screenshot + frustration accumulée s20-s23)

## Résumé exécutif

- **H1 (désync polygon vs bbox `position`)** : **CONFIRMÉ** — preuve DB ligne `Séjour/cuisine`, écart ~18% horizontalement entre le polygon et la bbox `position` stockée.
- **H2 (lotZone stale)** : **INFIRMÉ** sur projet neuf. Le fix `envelope-recompute` (commit `3b5d848`) fonctionne : `zone_data` est bien recalculé depuis les polygones finaux.
- **H3 (rendu Étape 2 vs 3 différent)** : **CONFIRMÉ PARTIELLEMENT** — les deux canvas ont un layout letterbox similaire, mais Étape 3 zoome automatiquement sur le lot (fit-to-lot + marge 15%) alors qu'Étape 2 affiche le plan entier. C'est **voulu**, mais l'utilisateur perçoit un "plan différent". De plus, les pièces rendues dépassent visiblement les limites du lot orange vu en Étape 2 (effet de bord : H1 → polygons débordent de la zone_data qui a été recalculée sur eux, donc bornes OK, mais en Étape 2 la zone_data affichée est celle post-recompute, pas celle "intuitive" d'un rectangle orange simple).
- **H4 (pan bornes)** : **NON REPRODUIT** sur projet neuf. Le fix `6d0e58e` fonctionne. Si Thomas voit un blocage, c'est probablement un effet du scale initial après fit-to-lot qui n'autorise pas de pan au-delà des bords logiques (clampViewportOffsets garde le plan partiellement visible à 10/90%).

## Preuves DB — H1 confirmé

Requête :

```sql
SELECT id, name, room_type, position,
       jsonb_array_length(COALESCE(polygon, '[]'::jsonb)) AS npoly
FROM vs_rooms
WHERE lot_id IN (SELECT id FROM vs_lots
                 WHERE project_id = '433b0088-144f-4248-875f-268888aac840')
ORDER BY room_type, name;
```

Résultats clés (extrait) :

| Room | `position` (lot-local %) | Polygon min-max X | Delta |
|---|---|---|---|
| Séjour/cuisine | x: **51.97**, w: 48.02 | x: **33.56 → 100** | **~18% décalage** |
| Chambre | x: 9.60, w: 31.07 | (4 pts — lu en détail ci-dessous) | — |
| SdB | x: 0, w: 18.36 | — | — |
| ECS | x: 1.84, w: 7.77 | — | — |

Polygon Séjour/cuisine (lot-local %) :
```json
[{"x": 33.56, "y": 0},
 {"x": 100, "y": 0},
 {"x": 100, "y": 99.66},
 {"x": 80.36, "y": 100},
 {"x": 39.72, "y": 99.09},
 {"x": 39.72, "y": 63.55},
 {"x": 33.56, "y": 63.37}]
```

**Lecture** : le polygon démarre à x=33.56 (bord gauche du L du Séjour), la bbox serrée serait `x: 33.56 → 100, w: 66.44`. Or `position` stocke `x: 51.97, w: 48.02` — **décalage de 18.4 points** horizontalement. Les handles de resize dessinés sur `position` apparaissent donc ~18% trop à droite par rapport au contour vert visible.

## Preuves code — H1 root cause

Fichier : `src/app/api/vs/projects/[id]/extract/route.ts`

Lignes **545-561** (INSERT `vs_rooms`) :

```ts
const bb = room.bounding_box; // ← bbox passe 1 (grossière, avant raffinement)
if (bb && zoneData.width_percent > 0 && zoneData.height_percent > 0) {
  position = {
    x_percent: ((bb.x_percent - zoneData.x_percent) / zoneData.width_percent) * 100,
    // ... re-normalisation bbox IA en lot-local
  };
}
```

Le polygon subit **3 passes de raffinement** :
1. **Passe 2** (`refineRoomPolygon`) — crop + GPT-4.1 dédié, trace précis
2. **Resolver** (`resolveRoomOverlaps`) — clipping non-overlap
3. **Passe 3** (`verifyAndCorrectPolygons`) — overlay visuel, corrections drift
4. **Hard-clip** (`clipPolygonToBoundary`) — EXTERIOR-EXCLUSION

**Mais `position` est figée sur `bb` = bbox passe 1 grossière**. Aucune synchronisation avec le polygon final. D'où la désync Thomas observe.

Fichier : `src/components/vs/RoomCanvas.tsx`

Ligne **906-908** (rendu handles) :

```ts
if (isSelected) {
  const { x, y, w, h } = toCanvasCoords(pos); // ← pos = position bbox, pas polygon
  const handles = getHandlePositions(x, y, w, h);
  // ...
}
```

Lignes **989-991** (hit-test handles) : idem, utilise `toCanvasCoords(pos)`.

**Résultat** : la forme verte rendue (polygon) et la bbox de resize (position) ne coïncident pas. Thomas voit des handles "flottants" décalés du contour.

## Preuves visuelles

- `/tmp/etape2-before.png` — Étape 2, plan couleur, lot orange tracé
- `/tmp/etape3-initial-before.png` — Étape 3, plan gris, pièces colorées, Séjour visiblement plus étendu que le "lot" vu en Étape 2

La différence de rendu Étape 2 vs 3 (plan couleur vs gris, zoom automatique) est voulue mais renforce la sensation d'incohérence.

## Verdict

| Hypothèse | Verdict | Gravité |
|---|---|---|
| H1 — désync polygon/bbox | **CONFIRMÉ** | **Critique** — source directe du bug Thomas |
| H2 — zone_data stale | Infirmé (projet neuf) | — |
| H3 — rendu Étape 2 vs 3 | Partiel (volontaire mais confuse) | Moyen |
| H4 — pan bloqué | Non reproduit | Faible |

## Root cause unique

**`position` (bbox) est stockée depuis la bbox IA passe 1 grossière. Le polygon subit 3+ passes de raffinement. Les deux se désynchronisent. Le canvas dessine le polygon pour le fill mais les handles et le hit-test sur la bbox `position`.**

## Fix

Plan de fix en 2 points :

### Fix 1 — extract route : synchroniser `position` sur la tight bbox du polygon final

Dans `src/app/api/vs/projects/[id]/extract/route.ts`, **après** toutes les passes de raffinement (resolver + passe-3 + hard-clip), si `polygonLocal` existe, recalculer `position` comme tight bbox du polygon lot-local.

### Fix 2 — RoomCanvas : defensive — dessiner handles sur tight bbox(polygon) si disponible

Dans `src/components/vs/RoomCanvas.tsx`, quand une room a un polygon ≥4 pts, calculer une bbox dérivée `bboxFromPolygon(polygon)` et l'utiliser pour `getHandlePositions` + `hitTestHandle` **au lieu de** `pos` (position). Garantit que même sur des données héritées désynchronisées (rooms existantes avant le fix 1), les handles collent au contour rendu.

Les deux fixes sont complémentaires : Fix 1 corrige la source (nouvelles extractions), Fix 2 immunise le rendu (handles toujours alignés au polygon visible).
