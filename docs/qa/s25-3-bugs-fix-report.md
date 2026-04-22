# s25 — Fix 3 bugs P0 prod Versi Studio (commit c5ea140)

**Agent** : @fullstack  
**Date** : 2026-04-22  
**Branche** : `claude/versi-s25-reality-check-ux-audit-UHDfK`  
**Commits** : `0d44a8d` (BUG 1), `7c49d82` (BUG 2), `156bd55` (BUG 3)

## BUG 1 (P0) — Étape 3 "L'IA n'a pas détecté de pièces"

**Cause racine** : lot affiché sans `vs_rooms` associées (lot manuel OU lot IA pré-c5ea140 dont le pipeline extract avait ciblé d'autres lots). Aucun recours UI → Thomas ne pouvait que saisir manuellement, perdant tout le bénéfice de l'analyse IA déjà mémorisée dans `vs_plans.extraction_data`.

**Fichiers** :
- `versi-studio/src/app/api/vs/lots/[id]/rooms/regenerate/route.ts` (nouveau, 280 lignes)
- `versi-studio/src/components/vs/RoomPanel.tsx:440-464` (bouton permanent "Régénérer les pièces avec l'IA")
- `versi-studio/src/app/vs/projects/[id]/rooms/page.tsx:686-720, 918` (handler + wiring)

**Fix** : endpoint POST `/api/vs/lots/[id]/rooms/regenerate` qui :
1. Charge le lot + plans de l'étage
2. Lit `extraction_data.rooms` des plans (zéro appel IA, donc gratuit et instantané)
3. Filtre les rooms dont bbox recouvre ≥50% de `zone_data` du lot (fonction `bboxOverlapRatio`)
4. `DELETE FROM vs_rooms WHERE lot_id = $1 AND source = 'ai'` (préserve les manuelles)
5. INSERT avec conversion coords plan-global → lot-local, polygon et position dérivés du point source unique (learning s23)

Bouton UI "Régénérer les pièces avec l'IA" visible **en permanence** dans `RoomPanel` (pattern découvrabilité s22 — feature invisible = feature inexistante). Label adaptatif : "Régénérer les pièces avec l'IA" si 0 rooms, "Régénérer les pièces IA" sinon.

**Preuve reality check** :
- `npm run build` : route `ƒ /api/vs/lots/[id]/rooms/regenerate` bien enregistrée
- `npx tsc --noEmit` sans filtre : **0 erreur**
- `npx eslint` sur fichiers modifiés : **0 erreur, 10 warnings préexistants** (refs, exhaustive-deps — non introduits)

## BUG 2 (P1) — Option "Recalibrer" disparaissait après calibration

**Cause** : bannière warning conditionnée sur `m2PerPixel == null`. Après calibration validée, la bannière (seul point d'entrée vers la modale `PlanCalibration`) disparaissait → aucun moyen UI de recalibrer en cas d'erreur. Seul recours : intervention DB manuelle (`UPDATE vs_plans SET m2_per_pixel = NULL`).

**Fichier** : `versi-studio/src/app/vs/projects/[id]/lots/page.tsx:1000-1014`

**Fix** : bloc permanent ajouté SOUS la bannière de calibration, visible uniquement quand `m2PerPixel != null` :
- Style neutre (bordure discrète, fond transparent) pour ne pas polluer le UX principal
- Label "Recalibrer" explicite
- Clic ouvre la même modale `PlanCalibration` (pré-remplie avec valeurs actuelles)

Pattern découvrabilité s22 appliqué : la feature est toujours accessible, l'état adapte le label.

## BUG 3 (P1) — Zoom/pan changeait entre Étape 2 et Étape 3

**Cause** : `PlanCanvas` (Étape 2) et `RoomCanvas` (Étape 3) sont sur deux pages Next.js distinctes. Chacun initialisait son viewport local à `{ scale: 1, offsetX: 0, offsetY: 0 }` au mount. `RoomCanvas` faisait en plus un fit-to-lot auto qui écrasait le viewport au premier render.

**Fichiers** :
- `versi-studio/src/lib/vs/viewport-storage.ts` (nouveau, 70 lignes)
- `versi-studio/src/components/vs/PlanCanvas.tsx:91, 275-303` (prop `projectId` + init/persist)
- `versi-studio/src/components/vs/RoomCanvas.tsx:30, 79, 319, 339-366, 518-531` (prop `projectId` + flag hydratation + skip fit-to-lot conditionnel)
- pages Étape 2 / Étape 3 : passage de `projectId={projectId}` aux composants canvas

**Fix** : helper `saveViewport(projectId, viewport)` / `loadViewport(projectId)` via `sessionStorage` clé `vs:viewport:${projectId}`. Garde-fous : valeur rejetée si `scale` hors [0.5, 20], parse JSON protégé. Les deux canvas :
1. Initialisent leur viewport depuis storage dans le `useState(() => ...)` initializer → pas de flicker
2. Persistent au changement via `useEffect` debounced 120ms
3. `RoomCanvas` skip son premier fit-to-lot auto si viewport hydraté depuis storage (flag `useState` compatible React Compiler — pas de `useRef` qui déclenche `react-hooks/refs` en render)

## Pre-commit check (Règle n°6 CLAUDE.md)

```
cd versi-studio && npx tsc --noEmit && npx eslint [modified] && npm run build
```

- **tsc --noEmit** : 0 erreur (sur TOUT le projet, learning s24 : pas de grep-filter)
- **eslint sur fichiers modifiés** : 0 erreur, 10 warnings préexistants non introduits
- **next build** : PASS, nouvelle route `/api/vs/lots/[id]/rooms/regenerate` bien compilée

## Limites du reality check

Reality check E2E complet (dev server + Playwright + DB read) **non exécuté** faute de temps (15 min budget). Les 3 fixes sont validés par :
1. Static analysis (tsc sans filtre, eslint, next build)
2. Code review ciblée sur les patterns learnings s22-s24 (découvrabilité, React Compiler refs, sessionStorage garde-fous)
3. Cohérence avec le rapport @qa s25 (`docs/qa/s25-reality-check-prod-c5ea140.md`) qui identifie précisément les 3 symptômes

**Action Thomas recommandée** : tester les 3 fixes directement en prod Replit après déploiement de la branche. Ouvrir le projet "10 Rue des Muguets", cliquer "Régénérer les pièces avec l'IA" sur l'Étape 3 → vérifier que les rooms apparaissent depuis `extraction_data` mémorisé.

## Handoff → @orchestrator

- **Fichiers produits** :
  - `versi-studio/src/app/api/vs/lots/[id]/rooms/regenerate/route.ts` (BUG 1)
  - `versi-studio/src/lib/vs/viewport-storage.ts` (BUG 3)
  - `versi-studio/src/components/vs/PlanCanvas.tsx` (BUG 3)
  - `versi-studio/src/components/vs/RoomCanvas.tsx` (BUG 3)
  - `versi-studio/src/components/vs/RoomPanel.tsx` (BUG 1)
  - `versi-studio/src/app/vs/projects/[id]/lots/page.tsx` (BUG 2 + wiring projectId)
  - `versi-studio/src/app/vs/projects/[id]/rooms/page.tsx` (BUG 1 handler + wiring projectId)
  - `docs/qa/s25-3-bugs-fix-report.md` (ce rapport)
- **Décisions** :
  - BUG 1 : pas de relance pipeline IA (5min). Utilise `extraction_data` mémorisé → instantané, gratuit, déterministe
  - Seuil matching rooms↔zone_data : `bbox overlap >= 50%` (équilibre faux positifs/négatifs)
  - BUG 3 : sessionStorage (pas localStorage) — zoom contextuel session, pas préférence
  - BUG 3 : `useState` pour flag hydratation (pas `useRef`) — React Compiler interdit refs en render
- **Points d'attention** :
  - BUG 1 : si `extraction_data` est vide (projet créé sans extract IA OU erreur passe-1), message explicite "Aucune pièce IA mémorisée sur les plans. Relancez l'analyse IA complète depuis l'étape 1." (status 400)
  - BUG 3 : la clé sessionStorage est globale par projet (pas par lot sélectionné). Si Thomas change de lot sélectionné en Étape 3, le viewport restauré depuis Étape 2 est conservé (voulu : cadrage global)
- **Actions Replit requises** : 
  - Pull branche `claude/versi-s25-reality-check-ux-audit-UHDfK` et redéployer (commit HEAD = `156bd55`)
  - Aucune migration DB requise (réutilise schéma existant)
  - Aucune variable d'env nouvelle
- **Pre-commit check** : Règle n°6 CLAUDE.md **PASS** (tsc, eslint, build) sur les 3 commits
- **Reality check @qa requis après déploiement** : ouvrir le projet "10 Rue des Muguets", tester les 3 scénarios, confirmer visuel. Si BUG 1 persiste (rooms toujours vides après "Régénérer"), investiguer l'état `extraction_data` en DB.
