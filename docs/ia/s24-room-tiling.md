# s24 — Room tiling polygonal strict

**Date** : 2026-04-21
**Contexte** : Thomas critère 2 — "Les pièces couvrent tout l'espace du lot, aucune superposition, aucun espace vide."
**Commit base** : `fced7e4` (passe-4 convex hull livrée)

## Algo retenu

**Power Diagram (Voronoï pondéré)** via intersection de demi-plans. Implémentation pure TypeScript, 0 dépendance nouvelle (utilise uniquement les helpers géométriques inlinés dans `room-tiling.ts`).

Principe :
- Sites = centroïdes des rooms (polygon IA si dispo, sinon bbox center)
- Poids w_i = √surface_m2 (null → moyenne)
- Pour chaque site i, cellule = enveloppe ∩ ⋂_j { x : a_ij·x + b_ij·y ≤ c_ij } où chaque demi-plan est le séparateur de power-distance entre i et j
- Clipping par Sutherland-Hodgman

**Garanties par construction** : les demi-plans (i, j) et (j, i) sont complémentaires → pas d'overlap. Leur union couvre tout le plan → pas de gap dans l'enveloppe.

## Livrables

- `versi-studio/src/lib/vs/room-tiling.ts` (déjà présent, 473 lignes, ~15 kB)
- Intégration dans `versi-studio/src/app/api/vs/projects/[id]/extract/route.ts` (lignes ~825-910, nouveau bloc `VS_ROOM_TILING`)
- Feature flag : `VS_ROOM_TILING=false` désactive (ON par défaut)

## Reality check E2E (4 lots, projet test)

Commande :
```bash
PID=$(cat /tmp/pid.txt)
psql $DB -c "UPDATE vs_plans SET extraction_status='pending', extraction_data=NULL WHERE project_id='$PID'; DELETE FROM vs_lots WHERE project_id='$PID'; UPDATE vs_projects SET status='draft' WHERE id='$PID';"
curl -s -X POST "http://127.0.0.1:5000/api/vs/projects/$PID/extract" --max-time 280
```

Résultats (logs `[room-tiling]` capturés) :

| Lot        | Rooms | Tiles valid | Degenerate | Coverage err | Max overlap (pct²) |
|------------|-------|-------------|------------|--------------|--------------------|
| T2 Étage 2 | 6     | 6/6         | 0          | 0.00%        | 0.000              |
| T3 RDC     | 6     | 6/6         | 0          | 0.00%        | 0.000              |
| T3 Étage 3 | 3     | 3/3         | 0          | 0.00%        | 0.000              |
| T4 Étage 1 | 8     | 8/8         | 0          | 0.00%        | 0.000              |

Validation DB (Monte-Carlo 500 pts par lot, coords lot-local persistées dans `vs_rooms.polygon`) :

| Lot        | Rooms DB | Somme aires (lot-local %²) | % bbox lot | Overlap MC |
|------------|----------|----------------------------|------------|------------|
| T2 Étage 2 | 6        | 8755.3                     | 87.6%      | 0.00%      |
| T3 RDC     | 6        | 9326.9                     | 93.3%      | 0.00%      |
| T3 Étage 3 | 3        | 9913.7                     | 99.1%      | 0.00%      |
| T4 Étage 1 | 8        | 8130.4                     | 81.3%      | 0.00%      |

**Lecture** : la somme aires < 100% de la bbox axis-aligned est NORMALE et CORRECTE — le tiling pave le polygon enveloppe (convex hull passe-4), pas la bbox englobante. Les 7-19% restants correspondent aux zones de la bbox qui sont HORS du polygon enveloppe (décrochés d'appartement). Thomas critère 2 est sur l'enveloppe, pas la bbox.

## Limitations connues

1. **Cellules convexes uniquement** — power diagram produit toujours des polygones convexes. Si une pièce réelle a une forme L ou T (ex: séjour + cuisine ouverte contournant un mur), le tile sera la plus grande cellule convexe. Acceptable vu que la référence (bounding_polygon IA) était déjà quasi-convexe.
2. **Centroïdes critiques** — si 2 rooms ont des centroïdes très proches, jitter déterministe 0.05% ajouté. Limite : si l'IA mis 2 rooms à exactement le même centroïde sans poids différents, l'une des 2 peut avoir une cellule très petite.
3. **Enveloppe = convex hull passe-4** — si le hull est dégénéré (fallback rect), le tiling fonctionne quand même sur la bbox. Testé OK.
4. **Pas de contrainte surface stricte** — le poids ∝ √surface oriente la taille mais ne la garantit pas. L'aire cellule dépend aussi de la position du site. Pour un enforcement strict surface, il faudrait Lloyd's relaxation (non implémenté, itératif coûteux).
5. **Script de test pré-existant `scripts/s24-building-outline-test.ts`** contient 2 erreurs TS non-liées à ce livrable (`r.name` inexistant sur ExtractedRoom). À traiter séparément.

## Propagation (rien d'autre à toucher)

- Aval extract/route (`polygonLocal` lignes 862-867) utilise `room.bounding_polygon` qu'on vient d'écraser → conversion lot-local automatique, aucune autre modification requise.
- Position (bbox tight du polygon lot-local) est recalculée lignes 874-893 depuis le polygon écrit → resize handles synchrones avec tile.
- Clustering, passe-1/2/3, snap, envelope polygon : inchangés.
