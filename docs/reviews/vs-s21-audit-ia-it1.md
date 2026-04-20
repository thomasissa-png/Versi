# Audit IA versi-s21 -- Iteration 1

**Date** : 2026-04-17
**Auditeur** : @ia
**Scope** : Clustering IA unit_id + Polygones IA (code Phase 3 -- fallback orchestrateur)
**Fichiers audites** : `schemas.ts`, `plan-extractor.ts`, `clustering.ts`, `route.ts` (extract)

---

## Note globale : 7.2 / 10

Premier jet correct, architecture saine, mais 3 lacunes P0 qui cassent le contrat "no AI > bad AI" en edge case.

---

## Tableau 5 criteres

| # | Critere | Note /10 | Corrections EXACTES |
|---|---|---|---|
| 1 | Schema structured output | 8/10 | Voir P1-A, P1-B |
| 2 | Prompt STEP 3b/5b/7 | 8/10 | Voir P1-C |
| 3 | Strategie clustering | 6/10 | Voir P0-1, P1-D |
| 4 | Fallback "no AI > bad AI" | 5/10 | Voir P0-2, P0-3 |
| 5 | Edge cases IA | 7/10 | Voir P1-E |

---

## P0 bloquants

### P0-1 : Confiance moyenne masque les pieces a risque

`clustering.ts:131` -- la confiance est calculee en MOYENNE. Edge case : 1 piece a 0.95 + 2 pieces a 0.45 = moyenne 0.617 -- groupe rejete. Inversement, 1 piece a 0.4 (probablement fausse) + 4 pieces a 0.8 = moyenne 0.72 -- groupe ACCEPTE avec une piece douteuse.

**Correction** : ajouter un seuil MINIMUM par piece en plus de la moyenne.

```typescript
// clustering.ts:131 -- remplacer le bloc de filtre
const confidenceAvg =
  groupRooms.reduce((sum, r) => sum + r.confidence, 0) / groupRooms.length;
const confidenceMin = Math.min(...groupRooms.map((r) => r.confidence));

if (
  confidenceAvg >= confidenceThreshold &&
  confidenceMin >= 0.5 &&
  groupRooms.length >= 2
) {
  result.push({ floor, unitId, rooms: groupRooms, confidenceAvg });
}
```

Note : `groupRooms.length >= 2` car un appartement avec 1 seule piece est suspect (manque au minimum 1 piece humide). Le seuil min 0.5 evite qu'une piece a 0.3 pollue un lot.

### P0-2 : Le warning `unit_clustering_low_confidence` n'est JAMAIS emis cote backend

La spec prevoit que si < 50% des pieces ont un unit_id confiant, le backend ajoute `unit_clustering_low_confidence` aux warnings. Or `route.ts` ne fait AUCUN check sur ce ratio. Le warning n'est emis que si le LLM le retourne lui-meme dans `extraction_warnings` -- ce n'est pas fiable (le LLM n'a pas la logique de seuil 50%).

**Correction** : ajouter dans `route.ts` apres ligne 138 :

```typescript
// Verifier le ratio de pieces avec unit_id confiant
const roomsWithConfidentUnit = allRooms.filter(
  (r) => r.unit_id !== null && r.confidence >= CLUSTERING_CONFIDENCE_THRESHOLD
);
const unitConfidenceRatio = allRooms.length > 0
  ? roomsWithConfidentUnit.length / allRooms.length
  : 0;

if (unitConfidenceRatio < 0.5) {
  // Propager le warning dans les extraction_data de chaque plan
  // pour que l'UI puisse l'afficher
  console.warn(
    `[API] unit_clustering_low_confidence: ratio ${(unitConfidenceRatio * 100).toFixed(0)}% < 50%`
  );
  // Ne PAS creer de lots IA -- unitGroups sera vide car confiance < seuil
}
```

### P0-3 : Aucun message UI quand 0 lot cree

Quand `unitGroups.length === 0`, la route retourne `{ lots_created: 0 }` sans explication. L'UI recevant 0 lots sans message ne peut pas distinguer "plan maison sans lots" de "IA pas assez confiante pour clusterer". Thomas n'a aucune info pour comprendre pourquoi l'ecran de lots est vide.

**Correction** : enrichir la reponse dans `route.ts` :

```typescript
// Apres le bloc de creation de lots (ligne ~194)
const noClusteringReason = unitGroups.length === 0
  ? allRooms.some((r) => r.unit_id)
    ? "confidence_too_low"
    : project.type_bien === "maison" || project.type_bien === "appartement"
      ? "single_unit_no_clustering"
      : "no_unit_id_detected"
  : null;

return NextResponse.json({
  success: true,
  data: {
    lots_created: lotsCreated,
    clustering_skipped_reason: noClusteringReason,
  },
});
```

---

## P1 recommandes

### P1-A : Schema Zod -- `bounding_polygon` nullable + optional = double null

`schemas.ts:201-215` -- le champ est `.nullable().optional()`. En pratique, le JSON schema dans `plan-extractor.ts:309-322` exige `bounding_polygon` dans `required` et utilise `anyOf [array, null]`. Donc le champ est TOUJOURS present (soit array, soit null) -- jamais `undefined`. Le `.optional()` cote Zod est redondant et cree une ambiguite (TypeScript infere `T | null | undefined`).

**Correction** : `schemas.ts:209` -- supprimer `.optional()` pour aligner Zod avec le JSON schema :

```typescript
// Avant
.nullable()
.optional()
// Apres
.nullable()
```

### P1-B : JSON schema -- pas de contrainte min/max sur polygon coordinates

`plan-extractor.ts:316-317` -- le JSON schema pour `bounding_polygon.items` a `minimum: 0, maximum: 100` sur x/y. C'est correct. Mais le schema racine `surface_m2` utilise `exclusiveMinimum: 0` qui n'est pas supporte par OpenAI strict mode (selon la doc OpenAI JSON schema, seuls `minimum`/`maximum` sont garantis). Risque de rejet silencieux.

**Correction** : verifier si `exclusiveMinimum` est accepte par OpenAI structured outputs. Si non, remplacer par `minimum: 0.01` aux lignes 246 et 369.

### P1-C : STEP 3b -- instructions maison/appartement unique pourraient polluer

Le prompt dit "For maison or single appartement: all rooms get unit_id = u1". Or pour une maison, assigner `unit_id = "u1"` partout va creer 1 lot IA inutile (la maison entiere = 1 lot generique). La spec dit `unit_id = null` en single-unit pour eviter la creation de lot.

**Correction** : `plan-extractor.ts:175` -- modifier :

```
  6. For "maison" or single "appartement": set unit_id = null for all rooms (no clustering needed — single unit).
```

### P1-D : `split("::")` fragile si unit_id contient `::`

`clustering.ts:128` -- `key.split("::")` suppose que `unit_id` ne contient jamais `::`. Le format est "u1", "u2" donc OK en pratique, mais un LLM pourrait generer "appt::gauche" par hallucination.

**Correction** : utiliser `key.split("::", 2)` ou `key.indexOf("::")` + substring pour etre safe.

### P1-E : Edge case studio (1 piece unique)

Un studio = 1 piece habitable + 1 SdB + 1 WC. `countHabitableRooms` retournerait 1, donc `generateLotName` genere "Studio RDC" -- correct. Mais le filtre `groupRooms.length >= 1` (actuel) accepte un groupe d'1 seule piece (ex: un "Sejour" sans SdB detectee). Avec la correction P0-1 (`>= 2`), un vrai studio avec SdB sera accepte (2+ pieces), mais un studio ou la SdB n'est pas detectee sera rejete -- comportement acceptable ("no AI > bad AI").

Pas de correction requise si P0-1 est applique.

---

## Verdict : ITERATION 2

3 P0 a corriger avant GO. Le code est structurellement sain (bonne separation clustering/route, schema Zod aligne avec JSON schema, prompt bien structure), mais le contrat "no AI > bad AI" est incomplet cote backend : la detection de confiance faible repose entierement sur le LLM au lieu d'etre verifiee par le code.

---

**Handoff -> @orchestrator**
- Fichiers produits : `docs/reviews/vs-s21-audit-ia-it1.md`
- P0 a corriger : (1) seuil min par piece dans clustering.ts, (2) emission warning backend dans route.ts, (3) message UI quand 0 lot cree
- P1 recommandes : (A) supprimer `.optional()` sur bounding_polygon, (B) verifier `exclusiveMinimum` OpenAI, (C) corriger prompt maison unit_id=null, (D) `split("::", 2)` defensif, (E) seuil min 2 pieces/groupe
- Fichiers impactes : `clustering.ts` (P0-1, P1-D), `route.ts` (P0-2, P0-3), `schemas.ts` (P1-A), `plan-extractor.ts` (P1-B, P1-C)
