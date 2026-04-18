# Fix cache no-store — extension s22 maintenance

Extension du fix commit `56c56d7` (DELETE plan qui ne persistait pas au reload).
Cause racine : cache Route Handler Next.js 15 sur GET + fetch client sans `cache: 'no-store'`.

## Périmètre audité

### Pages client (fetch GET)

| Fichier | État initial | Action |
|---|---|---|
| `src/app/vs/projects/[id]/lots/page.tsx` | `cache: "no-store"` déjà présent (l.94-96) | Aucune |
| `src/app/vs/projects/[id]/rooms/page.tsx` | `cache: "no-store"` déjà présent (l.79-81, 109) | Aucune |
| `src/app/vs/projects/[id]/visuals/page.tsx` | `cache: "no-store"` déjà présent (l.70-71, 94, 143) | Aucune |

### Routes API (pattern `force-dynamic` + `revalidate = 0`)

| Route | État initial | Action |
|---|---|---|
| `api/vs/projects/[id]/lots/route.ts` | Pattern déjà présent | Aucune |
| `api/vs/lots/[id]/route.ts` | Pattern déjà présent | Aucune |
| `api/vs/lots/[id]/rooms/route.ts` | Pattern déjà présent | Aucune |
| `api/vs/rooms/[id]/route.ts` | Pattern déjà présent | Aucune |
| `api/vs/rooms/[id]/visuals/route.ts` | Pattern déjà présent | Aucune |
| `api/vs/plans/[id]/route.ts` | Pattern déjà présent | Aucune |
| `api/vs/projects/[id]/plans/route.ts` | Pattern déjà présent (fix s22 initial) | Aucune |
| **`api/vs/projects/[id]/route.ts`** | **Pattern absent** | **Ajouté** (GET détail projet rafraîchi à chaque reload — status/métadonnées) |
| **`api/vs/visuals/[id]/status/route.ts`** | **Pattern absent** | **Ajouté** (polling 5s : un cache figerait le statut) |

## Pattern appliqué (cohérent avec fix s22 `plans/route.ts`)

```ts
// Désactive le cache Route Handler de Next.js 15.
export const dynamic = "force-dynamic";
export const revalidate = 0;
```

## Vérifications

- `npx tsc --noEmit` : PASS
- `npm run build` : PASS (warnings `themeColor` préexistants, hors scope)

## Test manuel suggéré

Pour chaque page, reproduire le scénario mutation → reload :

1. **Lots** : `/vs/projects/[id]/lots` → delete un lot → reload page → assert le lot est absent
2. **Rooms** : `/vs/projects/[id]/rooms` → delete une pièce → reload → assert absente de la liste du lot
3. **Visuals** : `/vs/projects/[id]/visuals` → supprimer/régénérer un visuel → reload → assert état cohérent
4. **Projet (détail)** : PATCH status projet via API → reload n'importe quelle page → assert nouveau status visible
5. **Polling status visuel** : lancer une génération → assert que le statut évolue en < 10s (sinon cache figé)

## Brief @qa — tests E2E à ajouter

Dupliquer `tests/e2e/plan-delete-persistence.spec.ts` pour couvrir les 3 nouveaux parcours :

- `lot-delete-persistence.spec.ts` : créer projet → ajouter lot → delete → reload → lot absent
- `room-delete-persistence.spec.ts` : créer lot → ajouter pièce → delete → reload → pièce absente
- `project-status-persistence.spec.ts` : PATCH status projet → reload → nouveau status affiché

Toutes les assertions doivent utiliser `page.reload()` entre mutation et check (c'est le reload qui déclenche le bug de cache, pas la navigation SPA).

## Conclusion

Le fix `56c56d7` avait déjà été propagé proactivement sur la quasi-totalité du périmètre. Cette session ajoute 2 routes manquantes (`projects/[id]` et `visuals/[id]/status`) par cohérence ceinture+bretelles. Tous les fetch GET critiques et leurs Route Handlers sont désormais protégés.
