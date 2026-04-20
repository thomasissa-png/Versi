# Fix ESLint s20 — Rapport @fullstack

## Résumé

Les 11 erreurs ESLint listées dans le brief @qa (10 `react/no-unescaped-entities` + 1 `@typescript-eslint/no-explicit-any`) ont été **déjà corrigées par un agent antérieur de la Wave 1 dans le commit `5b2fac5`** avant cette session. Le fix `workflow.spec.ts:357` est également déjà commité dans `ea9e795`. Mes Edits ont été idempotents (no-op car contenu identique). Ces 11 erreurs sont donc bien résolues — la condition G28 lint pour le merge s19 → main est levée.

**IMPORTANT — Point d'attention pour @qa/@orchestrator** : `npm run lint` remonte encore **10 erreurs résiduelles** de règles différentes (`react-hooks/set-state-in-effect`, `react-hooks/refs`, `react-hooks/immutability` — React Compiler). Ces erreurs n'étaient PAS dans les 11 listées par le brief mais sont bien bloquantes en CI.

## Fichiers vérifiés (fix déjà appliqué commit 5b2fac5)

| Fichier | Erreur corrigée | Pattern de fix |
|---|---|---|
| `src/app/vs/not-found.tsx:15` | react/no-unescaped-entities | `n'` → `n&apos;` |
| `src/app/vs/projects/[id]/rooms/page.tsx:553` | react/no-unescaped-entities | `l'étape` → `l&apos;étape` |
| `src/app/vs/projects/[id]/upload/page.tsx:450` | react/no-unescaped-entities | `d'ensemble` → `d&apos;ensemble` |
| `src/app/vs/projects/[id]/visuals/page.tsx:305` | react/no-unescaped-entities | `l'étape` → `l&apos;étape` |
| `src/components/vs/DropZone.tsx:172` | react/no-unescaped-entities | `jusqu'à` → `jusqu&apos;à` |
| `src/components/vs/PlanCalibration.tsx:176` | react/no-unescaped-entities | `l'échelle` → `l&apos;échelle` |
| `src/components/vs/RoomPanel.tsx:342` | react/no-unescaped-entities (x2) | `L'IA n'a` → `L&apos;IA n&apos;a` |
| `src/components/vs/VisualResult.tsx:220` | react/no-unescaped-entities | `n'est pas` → `n&apos;est pas` |
| `src/components/vs/VisualRoom.tsx:580` | react/no-unescaped-entities | `jusqu'à` → `jusqu&apos;à` |
| `tests/e2e/pages.spec.ts:180` | no-explicit-any | `(l: any)` → type guard `l is { id: string }` |

Conformité règle n°13 CLAUDE.md : `&apos;` utilisé dans le JSX rendu uniquement (pas dans des strings JS).

## Investigation workflow.spec.ts:357

**Diagnostic** : le timeout 15.8s n'est PAS dû à un mock chain incomplet (hypothèse @qa). Le mock chain utilise déjà `route.fallback()` correctement (ligne 195). La vraie cause est un **mismatch de regex** : le test cherchait `button, { name: /valider les lots|étape suivante/i }` mais le composant `LotPanel.tsx` ligne 292 affiche `"Continuer vers les pièces"`. Le `toBeVisible` ne trouvait jamais le bouton → timeout à 15_000ms.

**Fix appliqué dans commit `ea9e795`** : regex étendue à `/continuer vers les pièces|valider les lots|étape suivante/i`. Fix idempotent confirmé par vérification Edit (no-op).

Cette fix est trivale (< 10 lignes, changement de regex) et appliquée dans la branche. Le test devrait passer au prochain run E2E.

## Validation lint

```bash
npm run lint 2>&1 | grep -E "no-unescaped-entities|no-explicit-any" | wc -l
# → 0
```

- **11 erreurs ciblées** : 0 restantes (PASS)
- **Erreurs résiduelles** : 10 erreurs `react-hooks/*` (React Compiler strict) dans `ConfirmModal`, `LotPanel`, `PlanCanvas`, `PlanThumbnail`, `RoomCanvas`, `VisualResult` — hors scope de ce brief, non traitées. Ces erreurs nécessitent une refactorisation des `useEffect` (setState sync) et des accès refs/variables avant déclaration. À escalader en tâche séparée si elles bloquent le build Vercel.
- **`reference-existant/`** : 2 erreurs (code legacy, hors scope)

## Handoff

- → @orchestrator : gate Phase 2 fix ESLint (11 erreurs cibles) **complète — déjà fixée commits `5b2fac5` + `ea9e795`**. G28 lint levée POUR CES 11 ERREURS. **ALERTE** : 10 erreurs `react-hooks/*` résiduelles non traitées — à escalader en Phase 3 si build Vercel échoue.
- → @qa : re-run E2E Replit peut procéder après merge. Le fix `workflow.spec.ts:357` est appliqué (commit `ea9e795`). Vérifier si les 10 erreurs React Compiler sont bien bloquantes en CI Vercel (selon config Next.js — `next.config.js` `ignoreDuringBuilds` ?) avant merge.
