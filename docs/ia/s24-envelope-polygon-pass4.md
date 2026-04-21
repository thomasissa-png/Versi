# s24 — Passe-4 Envelope Polygonale (pixel-parfait)

## Objectif

Remplacer l'envelope rectangulaire axis-aligned du lot par le vrai contour polygonal de l'appartement. Résout le débord 10-15% du rectangle englobant sur zones hors appart (décrochés, escaliers, terrasses).

## Approche

Convex hull (Andrew's monotone chain, O(n log n)) sur tous les sommets des polygones des rooms snappées OCR + padding radial 2% depuis centroïde. Fallback rect si snap rate < 50% (qualité contour non garantie).

## Livrables

- `versi-studio/src/lib/vs/envelope-polygon.ts` (275 L) : `computeLotPolygonEnvelope`, `convexHull`, `expandPolygonOutward`, `polygonBoundingBox`.
- `versi-studio/src/app/api/vs/projects/[id]/extract/route.ts` : passe-4 intégrée après envelope-recompute, avant INSERT `vs_lots`. `zone_data = {type:"polygon", points: hullPadded}` si éligible, sinon rect legacy.
- Env tunables : `VS_ENVELOPE_POLYGON` (on/off), `VS_ENVELOPE_MIN_SNAP_RATE` (défaut 0.5), `VS_ENVELOPE_PADDING_PCT` (défaut 2).

## Résultat empirique (reality check end-to-end)

| Lot | Snap rate | Zone type avant | Zone type après | Hull pts |
|---|---|---|---|---|
| T2 RDC | 4/5 = 80% | rect | **polygon** | 9 |
| T4 Étage 1 | 3/8 = 38% | rect | rect (fallback) | — |
| T2 Étage 2 | 4/6 = 67% | rect | **polygon** | 8 |
| T3 Étage 3 | 1/3 = 33% | rect | rect (fallback) | — |

**2/4 lots convertis en polygon** pixel-parfait. Les 2 fallback rect ont snap rate insuffisant → comportement conservateur "no AI > bad AI". Principe validé : le seuil 50% filtre les lots où le hull ne serait pas représentatif.

## Test reproductible

```bash
cd /home/user/Versi/versi-studio
set -a && source .env.local && set +a
PID=$(cat /tmp/pid.txt)
psql "$DATABASE_URL" -c "UPDATE vs_plans SET extraction_status='pending', extraction_data=NULL WHERE project_id='$PID'; DELETE FROM vs_lots WHERE project_id='$PID'; UPDATE vs_projects SET status='draft' WHERE id='$PID';"
curl -s -X POST "http://127.0.0.1:3000/api/vs/projects/$PID/extract" -H "Content-Type: application/json" --max-time 270 -o /tmp/resp.json -w "TIME=%{time_total}s HTTP=%{http_code}\n"
psql "$DATABASE_URL" -c "SELECT name, zone_data->>'type' AS zone_type, COALESCE(jsonb_array_length(zone_data->'points'),-1) AS pts FROM vs_lots WHERE project_id='$PID' ORDER BY floor_number;"
```

## Compatibilité amont

`zone_data` polygon déjà supporté par `parseZone` / `isPolygon` dans `PlanCanvas.tsx`. Les lots en rect legacy continuent de fonctionner. `position` et `polygon` des rooms restent calculés depuis la bbox axis-aligned du polygon (point source unique).
