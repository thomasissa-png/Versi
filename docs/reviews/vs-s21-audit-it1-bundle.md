# Bundle audit cross-agents versi-s21 — Itération 1

**Date** : 2026-04-17
**Scope** : Phase 3 Clustering IA unit_id + Polygones IA (commit `1ebf6c7`)
**5 agents** : @qa, @ux, @product-manager, @ia, @creative-strategy (proxy Thomas marchand)

## Synthèse notes

| Agent | Note /10 | P0 | P1 |
|---|---|---|---|
| QA | 5.8 | 6 | 1 |
| UX | 7.4 | 2 | 5 |
| Product Manager | 7.4 | 1 | 4 |
| IA | 7.2 | 3 | 5 |
| Persona Thomas marchand | 7.2 | 2 | 3 |
| **Moyenne** | **7.0** | **14 (déduplication : 10 distincts)** | **18** |

**Verdict : ITÉRATION 2 obligatoire** (moyenne < 9.5, 14 P0 cumulés). Aucun agent ne vote GO direct.

## P0 UNANIMES (≥ 2 agents — corrections prioritaires)

### U1 — Confiance par lot visible dans UI (PM + IA + persona)
**Agents** : PM-E1, IA-P0-1, Persona-P0-1
**Problème** : confidence_avg calculée backend mais jamais exposée en UI. Thomas ne peut pas prioriser la vérification des lots à faible confiance (71% vs 94% = identiques visuellement).
**Correction** :
- `schemas.ts` / `types.ts` : ajouter `confidence_avg: number | null` dans `VsLot`
- `extract/route.ts` : persister `confidence_avg` à l'INSERT (déjà calculé par `clusterByUnit`)
- `LotPanel.tsx` : afficher badge `XX%` après le badge "IA" dans `LotCard`
- Style visuel : rouge si < 0.75, orange si 0.75-0.85, vert si > 0.85

### U2 — Filtre ≥ 2 pièces par groupe + seuil MIN (QA + PM + IA)
**Agents** : QA-P1-3, PM-E1, IA-P0-1
**Problème** : `clustering.ts:133` accepte groupes de 1 pièce (studio isolé, hallucination). La spec exige ≥ 2 pièces. De plus, la confiance MOYENNE masque les pièces à risque (0.4 noyée dans 4 × 0.8 = 0.72 > seuil).
**Correction** dans `clustering.ts:clusterByUnit` :
```typescript
// Ligne 133 actuelle : if (confidenceAvg >= confidenceThreshold && groupRooms.length >= 1)
// Remplacer par :
const confidenceMin = Math.min(...groupRooms.map(r => r.confidence));
if (
  confidenceAvg >= confidenceThreshold &&
  confidenceMin >= 0.5 &&
  groupRooms.length >= 2
) { ... }
```

### U3 — État vide différencié "IA a échoué" vs "pas encore créé" (UX + PM)
**Agents** : UX-P0-1, PM-P1-E5
**Problème** : `LotPanel.tsx:258-261` affiche "Aucun lot détecté" identique que l'extraction IA ait échoué (confidence < 0.7) ou que Thomas n'ait pas encore dessiné. La spec exige "L'IA n'a pas détecté de lots fiables — dessinez manuellement".
**Correction** :
- `LotPanelProps` : ajouter `hasAiExtracted: boolean`
- `lots/page.tsx` : passer `hasAiExtracted` depuis l'état post-extraction
- `LotPanel.tsx` : message conditionnel 2 branches (extraction tentée sans résultat / pas encore tentée)

### U4 — Undo lot validé IA (UX + PM)
**Agents** : UX-P0-2, PM-P1-E4
**Problème** : aucun bouton "Annuler la validation" pour lots IA en status `validated`. US-VS-22 critère d'acceptance n°3 non couvert. Seule la corbeille disponible (suppression, pas retour en `suggested`).
**Correction** :
- `LotPanel.tsx` : prop `onUnvalidateSingleLot?: (lotId: string) => void`
- Bouton inline dans `LotCard` pour `lot.source === "ai" && lot.status === "validated"`
- `lots/page.tsx` : handler PATCH `status: 'suggested'` + rollback optimistic

### U5 — Bannière feedback post-extraction (UX + PM)
**Agents** : UX-P1-1, PM-P0-E7
**Problème** : Thomas voit des rectangles colorés sans comprendre que l'IA a pré-créé des lots. Valeur centrale de la feature invisible.
**Correction** :
- `lots/page.tsx` : composant `AiExtractionBanner` conditionné sur `aiSuggestedLots.length > 0`
- Texte : "L'IA a pré-créé N lots depuis votre plan. Vérifiez et validez en 1 clic."
- Action CTA : bouton "Tout valider (N lots)" déjà présent en bas du panneau

## P0 ISOLÉS MAIS CRITIQUES (1 seul agent, mais impact bloquant)

### I1 — Bug `key.split("::")` fragile (QA-P0-4)
`clustering.ts:128` : `const [floorStr, unitId] = key.split("::")` casse si `unit_id` contient `::`. Correction : utiliser split avec limite `key.split("::", 2)` + reconstruction du reste, OU stocker dans Map via clé objet `{floor, unitId}`.

### I2 — Suffixe gauche/droite binaire pour 3+ lots (QA-P0-5)
`clustering.ts:60-62` : 3+ lots sur même étage produisent collisions ("T3 RDC gauche" × 2). Correction : si `totalOnFloor >= 3`, utiliser position relative tri avgX → numéroter 1, 2, 3... OU coordonnées cardinales (nord/sud/est/ouest) selon position.

### I3 — Bbox négative si aucun `bounding_box` (QA-P0-6)
`clustering.ts:71-103` : init `minX=100, maxX=0`, si toutes les rooms ont `bb=undefined` → retourne `{x:100, y:100, width:-100, height:-100}`. Correction : guard explicite avant return, fallback à zone par défaut (ex : plein cadre `{0,0,100,100}`) ou lever exception.

### I4 — Tests unitaires Vitest absents pour `clustering.ts` (QA-P0-1)
Les 5 helpers (`clusterByUnit`, `generateLotName`, `computeEnvelopeBbox`, `countHabitableRooms`, `computeAvgX`) ne sont testés par rien. `vitest.config.ts` créé mais `tests/unit/` vide. Correction : créer `versi-studio/tests/unit/clustering.test.ts` avec ≥ 15 cas couvrant edge cases U2/I1/I2/I3 + cas nominal.

### I5 — Warning `unit_clustering_low_confidence` backend jamais émis (IA-P0-2)
`route.ts` : le warning prévu dans l'enum `schemas.ts` est délégué au LLM dans `extraction_warnings` — non fiable (LLM n'a pas la logique seuil 50%). Correction : backend vérifie ratio groupes rejetés / groupes candidats, si > 50% émet le warning côté response.

### I6 — Réponse `{ lots_created: 0 }` ambiguë (IA-P0-3)
Ne distingue pas "maison sans lots" de "IA pas assez confiante". Correction : enrichir réponse `{ lots_created: 0, reason: 'no_units_detected' | 'low_confidence' | 'single_dwelling' }` + exploiter côté `lots/page.tsx` pour le feedback U5.

### I7 — Section "Pièces non assignées" absente `LotPanel.tsx` (Persona-P0-2)
`clustering-ia-spec.md` lignes 101 et 180 la prévoit explicitement. Parties communes, couloirs, locaux techniques avec `unit_id = null` disparaissent. Thomas ne sait pas qu'il manque des pièces.
**Correction** :
- `lots/page.tsx` : extraire rooms avec `unit_id = null` depuis `extraction_data`
- `LotPanel.tsx` : prop `unassignedRooms?: ExtractedRoom[]` + section dédiée sous les lots

### I8 — `waitForTimeout(500)` flaky (QA-P0-2)
`tests/e2e/clustering-ia.spec.ts:332` : anti-pattern flaky garanti en CI. Correction : `await expect(locator).toBeVisible({ timeout: 5000 })` ou `await page.waitForFunction(...)`.

### I9 — Matrice traçabilité G27 absente (QA-P0-3)
Aucun lien documenté US-VS-21 / US-VS-22 → tests. Correction : tableau dans `docs/qa/TESTING.md` ou en-tête `clustering-ia.spec.ts`.

### I10 — Studios légitimes rejetés par U2 ≥ 2 pièces (cas particulier)
Si U2 est appliquée strictement, un studio (1 pièce = séjour avec kitchenette) sera rejeté. **Arbitrage spec** : un studio est-il un "lot" valide ? Si oui → exception `if (groupRooms.length === 1 && rooms[0].type === 'studio') accept`. Si non → documenter dans spec.

## P1 RECOMMANDÉS (18 items cumulés — traiter après P0)

**UX** : touch target 44px bouton validation, bordure IA écrasée à la sélection, loading clustering non distinct, messages erreur extraction génériques
**PM** : events analytics (4 events : lot_auto_created, lot_auto_validated, lot_manually_adjusted, ia_fallback_triggered) — délégué Phase 6
**IA** : `.optional()` redondant sur `bounding_polygon`, `exclusiveMinimum` non supporté OpenAI strict mode, prompt maison assigne `unit_id="u1"` au lieu de `null`
**Persona** : note bbox approximative (vs polygones réels), H1 conditionnel selon qualité extraction

## Verdict itération 1

**ITÉRATION 2 OBLIGATOIRE**

**Plan itération 2** (scope disjoint pour éviter timeout) :
- **Bundle A — backend/algo** : U2, I1, I2, I3, I5, I6, I10 → @fullstack #1
- **Bundle B — UI/UX** : U1, U3, U4, U5, I7 → @fullstack #2
- **Bundle C — tests** : I4, I8, I9 → @qa

Après implémentation : re-audit 5 agents parallèles itération 2 → cible 10/10 unanime.

## Handoff

→ @fullstack #1 (Bundle A backend), @fullstack #2 (Bundle B UI), @qa (Bundle C tests)
→ puis re-audit 5 agents itération 2
