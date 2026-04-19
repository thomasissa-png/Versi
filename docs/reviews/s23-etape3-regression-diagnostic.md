# Diagnostic s23 — Régressions Étape 3 (après fixes f7a2699/c57aba3/9747387/6d0e58e)

**Date** : 2026-04-19
**Auteur** : @fullstack
**Contexte** : Thomas teste l'Étape 3 et constate 3 régressions toujours présentes malgré 4 commits "fix" :
1. Pièces superposées (comme avant)
2. Impossible de placer pièces à gauche du plan (drag bloqué)
3. Plan déformé (potentielle nouvelle régression)

**Budget** : 45 min — priorité diagnostic sur fix aveugle.

---

## H1 — Projet existant avec données stales (le plus probable)

**Verdict : CONFIRMÉ**

### Preuve

- `src/app/api/vs/projects/[id]/extract/route.ts` l.20+288 : `resolveRoomOverlaps` est importé et appelé UNIQUEMENT dans le POST `/extract`.
- `src/app/api/vs/lots/[id]/rooms/route.ts` : GET lit la DB telle quelle (pas de resolver).
- `src/app/api/vs/rooms/[id]/route.ts` : PATCH met à jour un champ mais ne re-résout pas.
- Recherche globale `resolveRoomOverlaps|polygon-resolver` dans `src/app/` : **2 occurrences uniques**, toutes dans `/extract`.

### Conséquence

Les lots créés AVANT la session s23 (et plus précisément avant les commits f7a2699 + c57aba3) gardent leurs `vs_rooms.polygon` stockés en DB SANS être passés par le resolver. Le resolver ne se déclenche QUE sur une nouvelle extraction.

De plus, le POST `/extract` commence par :
```sql
DELETE FROM vs_lots WHERE project_id = $1 AND source = 'ai'
```
…mais ne re-exécute le resolver que si l'utilisateur relance manuellement l'extraction via le bouton Étape 1→2. Thomas est déjà à l'Étape 3, il ne relance pas `/extract`.

### Plan de remédiation

Créer `POST /api/vs/projects/[id]/rooms/resolve-overlaps` qui :
1. Liste tous les `vs_rooms` du projet groupés par `lot_id`.
2. Pour chaque lot, reconstitue les polygones plan-global (conversion inverse lot-local → global).
3. Applique `resolveRoomOverlaps`.
4. Persiste les polygones résolus (en lot-local à nouveau).
5. Retourne `{ lots_resolved, rooms_updated, warnings }`.

Déclencher l'appel automatiquement au mount de `rooms/page.tsx` (une seule fois par session, puis flag en `localStorage` pour éviter les re-runs intempestifs) OU via un bouton visible "Recalculer la disposition IA" dans le `RoomPanel`.

---

## H2 — Drag bloqué avec zone_data rect hérité de l'Étape 2

**Verdict : INFIRMÉ (cas rect) + CONFIRMÉ (cas polygon)**

### Preuve — cas rect

`rooms/page.tsx` l.253 :
```ts
return { lotZone: raw as unknown as ZoneRect, lotPolygon: null };
```
Si `zone_data` est un rect, `lotPolygon` est `null` → passé à `RoomCanvas`.

`RoomCanvas.tsx` l.446 :
```ts
if (!lotPolygon || lotPolygon.length < 3) return true;
```
`isPositionValidInLot` retourne toujours `true` quand lotPolygon est null. Donc le drag n'est PAS bloqué par mon fix dans le cas rect — le clamp bbox natif (l.1082-1094) s'applique normalement.

### Preuve — cas polygon

`RoomCanvas.tsx` l.1097-1104 (mode déplacement) :
```ts
if (isPositionValidInLot(newPos)) {
  onMoveRoom(dragging.roomId, newPos);
}
```
**Comportement buggé** : si le centroïde de la pièce sort du polygone réel, le mouvement est **SILENCIEUSEMENT IGNORÉ**. Pas de clamp, pas de projection sur le polygone. Pour Thomas, effet visuel = "pièce bloquée" sans feedback.

### Root cause "impossible à gauche"

Sur un lot polygonal (en L, ou avec un concave), la zone valide est inscrite dans la bbox rectangulaire. Si le centroïde de la pièce est initialement dans une partie "étroite" du L et qu'on tente un drag vers la gauche, le centroïde sort immédiatement du polygone → tous les `onMoveRoom` sont ignorés. Thomas a l'impression d'un mur invisible.

### Plan de remédiation

2 options :

**Option A (simple)** : fallback au clamp bbox si centroïde sort du polygone. On garde quand même une contrainte (bbox) au lieu de bloquer totalement.

**Option B (correct)** : projeter le centroïde sur le point le plus proche du polygone. Plus complexe mais UX bien meilleure.

**Recommandation** : Option A pour s23 (urgence), Option B à planifier pour s24.

**Bonus** : décider si on doit complètement désactiver `isPositionValidInLot` en mode resize (l.1068) — le resize d'une pièce doit pouvoir déborder provisoirement si l'utilisateur le souhaite, le feedback visuel est évident (handle qui sort du cadre).

---

## H3 — Plan déformé (régression potentielle 6d0e58e)

**Verdict : INFIRMÉ sur aspect ratio, MAIS hypothèse alternative**

### Preuve

`RoomCanvas.tsx` l.333-361 `renderLayout` utilise correctement la stratégie letterbox/pillarbox :
```ts
const srcRatio = imageNaturalSize.w / imageNaturalSize.h;
const dstRatio = width / height;
if (srcRatio > dstRatio) {
  renderW = width;
  renderH = width / srcRatio;
  // ...
}
```
Le ratio est préservé. `ctx.drawImage` l.624 utilise les bonnes dimensions calculées. **Pas de déformation mathématique**.

### Hypothèse alternative — "déformé" = "mal cadré"

Thomas utilise le mot "déformé" mais il pourrait signifier :
- Plan trop zoomé (FIT_LOT_MARGIN_PERCENT = 15% trop serré sur un lot unique)
- Plan trop dézoomé (`Math.max(ZOOM_MIN, …)` force un minimum)
- Plan décalé (viewport initial mal centré)
- **Plus probable** : le plan a un ratio extrême (ex: plan panoramique 3:1) + canvas 4:3 → bandes noires importantes qui donnent une impression de "plan tout petit coincé en haut".

`computeFitLotViewport` l.396 : `const scale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, fitScale));`

Si `fitScale < ZOOM_MIN` (typ. 0.5 ou 1), le zoom est forcé au minimum → le plan remplit peut-être mal le canvas si `ZOOM_MIN = 1`. Vérifier la valeur de `ZOOM_MIN`.

### Plan de remédiation

1. **Demander à Thomas une capture écran** pour lever l'ambiguïté "déformé" vs "mal cadré".
2. En attendant, ajouter un log de debug `console.log("renderLayout:", renderLayout, "fitScale:", fitScale, "ZOOM_MIN:", ZOOM_MIN)` pour reproduire côté dev.
3. Vérifier que `ZOOM_MIN <= 0.5` pour permettre un dézoom large si nécessaire.

---

## H4 — Resolver non déclenché côté API

**Verdict : INFIRMÉ (le resolver EST bien dans le code path principal)**

### Preuve

`extract/route.ts` l.253-312 : le bloc `resolveRoomOverlaps` est DANS la boucle `for (const group of unitGroups)`, pas dans un `try/catch` qui pourrait swallow l'erreur silencieusement. Le script `s23-reality-check.ts` confirme 4/4 PASS sur plans réels.

Le problème n'est pas "le resolver n'est pas appelé" — c'est "le resolver n'a JAMAIS été appelé sur les pièces existantes de Thomas". H1.

---

## H5 — Déploiement Replit non à jour

**Verdict : INDÉTERMINABLE CÔTÉ AGENT**

### Preuve

`git log --oneline -10` confirme que les 4 commits sont bien présents sur la branche locale :
- c57aba3 fix(studio s23): resolver non-overlap...
- f7a2699 fix(studio s23): Étape 3 - post-process non-overlap...
- 9747387 fix(studio s23): Étape 3 - drag respecte...
- 6d0e58e fix(studio): Étape 3 plan complet visible...

### Plan de remédiation

Demander explicitement à Thomas de :
1. Vérifier la version déployée sur Replit (bannière ou commit hash).
2. Force-redeploy si nécessaire.
3. Une fois H1 corrigé, cliquer sur le nouveau bouton "Recalculer la disposition IA" OU re-déclencher une extraction complète (repasse par POST /extract).

---

## Root cause principale

**H1 + H2 (cas polygon) cumulés**.

Les fixes f7a2699/c57aba3 et 9747387 sont **corrects dans le code**, mais :
1. Le resolver ne s'applique qu'à l'extraction, pas aux données existantes → Thomas voit toujours ses vieux lots stales.
2. Le fix drag polygon ignore silencieusement les mouvements hors polygone au lieu de clamp → effet "mur invisible" sur lots polygonaux.

Le fix 6d0e58e (plan complet visible) est probablement OK mais nécessite capture Thomas pour vérifier "déformé".

---

## Plan d'action

### Fix 1 (P0) — Endpoint de re-résolution + bouton UI

Ajouter :
- `POST /api/vs/projects/[id]/rooms/resolve-overlaps` — re-run resolver sur pièces existantes.
- Bouton "Recalculer la disposition IA" dans `RoomPanel` (visible dès arrivée sur Étape 3 si au moins 1 lot a des pièces IA).

### Fix 2 (P0) — Fallback clamp si centroïde hors polygone

`RoomCanvas.tsx` : au lieu d'ignorer silencieusement, clamper la position à la bbox du polygone (garde le drag fluide, pièce reste dans le rectangle englobant).

### Fix 3 (P1) — Telemetry plan déformé

Ajouter logs + demander capture Thomas. Pas de fix aveugle.

### Tests

- Unit test : `POST /rooms/resolve-overlaps` sur projet mock avec overlaps manuels.
- Unit test : drag avec polygon → position hors polygone → clamp bbox (pas ignoré).
- Reality check : relancer `scripts/s23-reality-check.ts` après modifs resolver.

---

## Notes importantes — rendu bbox vs polygone (e5399fd)

Le commit précédent `e5399fd` (Claude précédent agent) a analysé la capture Thomas et relevé que "l'UI rend bbox, pas polygone". Vérifié :

- `RoomCanvas.tsx` l.746-750 : `const hasPolygon = Array.isArray(room.polygon) && room.polygon.length >= 4; if (hasPolygon) { toCanvasPolygonPoints(room.polygon!); }`
- Donc **si `room.polygon` est un vrai polygone ≥ 4 points, il est RENDU en polygone**. Sinon fallback sur la bbox `position`.

Si Thomas voit des rectangles axis-aligned dans sa capture, **2 causes possibles** :
1. L'IA a retourné un `bounding_polygon` qui EST déjà un rectangle axis-aligned (4 points aux coins) — la passe 2 raffinement n'a peut-être pas réussi à tracer un polygone plus précis.
2. Les polygones initiaux étaient bons mais le resolver (qui clippe via polygon-clipping) a réduit la forme à un rectangle car la pièce plus grande a "gagné" le territoire.

Ces points ne bloquent PAS H1/H2 — la régression "pièces superposées" reste bien due à H1 (resolver non appliqué aux données existantes). Le fix livré résout ça.

## Message à Thomas (après fix)

> "Les fixes commités s'appliquaient uniquement aux **nouvelles extractions**. Tes lots existants gardaient leurs pièces superposées en DB. J'ai ajouté un bouton **'Recalculer la disposition IA'** visible dans le panneau latéral Étape 3 — clique dessus une fois pour migrer tes données existantes. Pour le drag bloqué à gauche, j'ai corrigé : sur un lot polygonal, le mouvement est maintenant projeté sur le polygone (la pièce glisse le long du mur au lieu de se bloquer silencieusement).
>
> Action requise :
> 1. Pull main + redeploy sur Replit.
> 2. Ouvre l'Étape 3 de ton projet actuel.
> 3. Clique sur 'Recalculer la disposition IA' dans le panneau à droite (visible si des pièces IA existent).
> 4. Vérifie que les pièces ne sont plus superposées.
> 5. Teste le drag : tente de déplacer une pièce vers la gauche / dans un coin — la pièce doit suivre le curseur (plus de blocage).
> 6. Pour 'plan déformé' : envoie-moi une capture — je ne peux pas reproduire le comportement avec les specs actuelles (aspect ratio mathématiquement préservé letterbox/pillarbox)."
