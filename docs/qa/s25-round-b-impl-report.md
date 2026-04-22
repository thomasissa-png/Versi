# s25 Round B — Rapport implémentation UI canonicalisation

**Date** : 2026-04-22 · **Agent** : @fullstack · **Session** : versi-s25
**Branche** : `claude/versi-s25-reality-check-ux-audit-UHDfK`

## Livrables produits

| # | Fichier | Nature | Changement clé |
|---|---|---|---|
| 1 | `versi-studio/src/app/vs/projects/[id]/reformatage/page.tsx` | Créé | Nouvelle étape "Reformatage" — comparateur avant/après + CTA unique |
| 2 | `versi-studio/src/app/vs/projects/[id]/lots/page.tsx` | Modifié | `planImageUrl` canonical-first + bannière "Calibration à vérifier" + stepper → étape 3 |
| 3 | `versi-studio/src/app/vs/projects/[id]/rooms/page.tsx` | Modifié | `planImageUrl` canonical-first + stepper → étape 4 |
| 4 | `versi-studio/src/components/vs/Stepper.tsx` | Non modifié | Déjà générique — accepte StepId étendu |
| 5 | `versi-studio/src/app/vs/projects/[id]/upload/page.tsx` | Modifié | Redirection après extraction → `/reformatage` (au lieu de `/lots`) |
| 6 | `versi-studio/src/lib/vs/types.ts` | Modifié | `StepId = 1\|2\|3\|4\|5` + STEPS étendu avec Reformatage |
| 7 | `versi-studio/src/app/vs/projects/[id]/visuals/page.tsx` | Modifié | Décalage stepper currentStep 4 → 5 + completedSteps |

## Décisions appliquées (D1-D5)

- **D1** Étape "Reformatage" dédiée entre Upload et Lots (path : `/vs/projects/[id]/reformatage`)
- **D2** `planImageUrl` priorise `canonicalized_image_path ?? file_path` dans lots + rooms
- **D3** Bannière jaune conditionnelle "Calibration à vérifier" — critère : `canonicalized_image_path` non null + plan créé avant `2026-04-22` (pattern simple, pas de migration DB nécessaire)
- **D5** Fallback non-bloquant sur page reformatage — bannière orange si `canonicalized_image_path` null + CTA "Continuer avec le plan original"

Note sur le nom du champ : les décisions UX mentionnaient `canonical_image_url` mais le type réel est `canonicalized_image_path` (voir `types.ts` L44-58, ajouté par @fullstack step 2 s25). J'ai utilisé le nom réel.

## Build check

```
npx tsc --noEmit --project tsconfig.json  → PASS (0 erreurs)
npm run lint                               → PASS (warnings préexistants uniquement, aucun sur mes modifs hors react-hooks/exhaustive-deps historiques)
npm run build                              → PASS (route /vs/projects/[id]/reformatage bien détectée)
```

## Mot pivot respecté

Textes UI : "plan", "reformaté", "pièce", "lot".
Jargon banni : aucune occurrence de "canonical", "polygone", "calque", "upload", "fallback" dans les chaînes visibles.

## Découvrabilité

- CTA "Utiliser ce plan" visible dès l'arrivée (pas conditionnel, pas de scroll requis)
- Bannière fallback orange au-dessus du comparateur
- Bannière calibration jaune en tête de page lots (ne bloque pas)
- Stepper horizontal mobile + vertical desktop

## Points d'attention pour @qa Round C

1. **Intégration @ia** : `label-snap.ts` + `plan-canonicalizer-mock.ts` sont en parallèle. Les modifications UI fonctionnent avec le schéma DB actuel (`canonicalized_image_path` déjà en place).
2. **Reality check E2E requis** (règle s22/s23/s24) : tester les 5 plans P00-P03+Muguets sur 3 breakpoints (375/768/1280) avec Playwright
3. **Test fallback** : simuler `canonicalized_image_path = null` → vérifier bannière orange + CTA "Continuer avec le plan original"
4. **Test calibration** : créer un plan avec `created_at < "2026-04-22"` + `m2_per_pixel != null` + `canonicalized_image_path != null` → vérifier bannière jaune sur /lots
5. **Navigation aller-retour** : Reformatage → Lots → retour → doit fonctionner (stepper complétés)
6. **Undo/redo** : non modifié — reste fonctionnel sur canvas lots/rooms

## Handoff → @qa Round C

Build PASS. Prêt pour tests E2E pipeline complet (Upload → Reformatage → Lots → Pièces → Visuels).
Screenshots Playwright des 3 breakpoints recommandés comme preuve avant GO PRODUCTION.
