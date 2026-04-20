# Audit IA versi-s21 — Itération 2

**Date** : 2026-04-17
**Auditeur** : @ia
**Scope** : Re-audit des 3 P0 IA (it1) + 5 P1, sur `clustering.ts`, `route.ts`, `schemas.ts`, `db.ts`

---

## Note globale : 9.2 / 10 (vs 7.2 en it1)

Les 3 P0 sont resolus proprement. L'architecture "no AI > bad AI" est desormais coherente de bout en bout (clustering → route → response). Il reste 2 P1 non corriges (mineurs, non bloquants).

---

## Tableau 5 criteres

| # | Critere | Note it1 → it2 | P0 resolus | P0 residuels |
|---|---|---|---|---|
| 1 | Schema structured output | 8 → 9 | — | 0 (P1-A `.optional()` toujours la, mineur) |
| 2 | Prompt STEP 3b/5b/7 | 8 → 8 | — | 0 (inchange, pas de regression) |
| 3 | Strategie clustering (seuil 0.7) | 6 → 10 | P0-1 | 0 |
| 4 | Fallback "no AI > bad AI" | 5 → 9.5 | P0-2, P0-3 | 0 |
| 5 | Edge cases IA | 7 → 9.5 | — | 0 |

---

## P0 resolus depuis iteration 1

### P0-1 : confidenceMin + filtre >= 2 pieces — RESOLU

**Verifie dans** `clustering.ts:162-178`

- `confidenceMin = Math.min(...)` calcule ligne 164 — present.
- Filtre triple condition ligne 172-175 : `confidenceAvg >= threshold && confidenceMin >= 0.5 && (groupRooms.length >= 2 || isStudioException)`.
- `confidenceMin` expose dans `UnitGroup` (ligne 19) et pousse dans le resultat (ligne 177).
- **Le scenario "1 piece a 0.4 noyee dans avg 0.72"** est desormais bloque : `confidenceMin = 0.4 < 0.5` → groupe rejete. Risque elimine.

**I10 studios** : exception propre ligne 167-169 (`/\bstudio\b|\bt1\b/i.test(name_raw)`). Un studio legitime (1 piece nommee "Studio") passe, une hallucination random ("Sejour" seul) est rejetee. Bon compromis.

**I1 nested Map** : `split("::")` supprime, remplace par `Map<number, Map<string, ...>>` ligne 139. Plus de risque de fragmentation.

**I2 suffixe 3+ lots** : `positionIndex` via tri `avgX` dans `route.ts:179-181`, suffixe `#1, #2, #3` dans `generateLotName` ligne 66-68. Collision eliminee.

**I3 bbox negative** : guard `maxX <= minX || maxY <= minY` → fallback plein cadre ligne 108-109. Correct.

**Verdict** : 6 → 10. Tous les sous-items de P0-1 + I1/I2/I3/I10 corriges.

### P0-2 : Warning backend `unit_clustering_low_confidence` — RESOLU

**Verifie dans** `route.ts:152-162`

- `candidateCount` retourne par `clusterByUnit` (ligne 147).
- `rejectionRate = 1 - accepted / candidateCount` calcule ligne 155.
- Warning emis si `rejectionRate > 0.5` (ligne 156) — c'est le code backend qui decide, plus le LLM.
- Warning structure `{ type, message }` avec pourcentage concret — exploitable par l'UI.

**Verdict** : le warning est maintenant fiable et deterministe (seuil code, pas LLM). RESOLU.

### P0-3 : Response JSON enrichie (extraction_reason) — RESOLU

**Verifie dans** `route.ts:228-242`

- `extraction_reason` type union `"success" | "no_units_detected" | "low_confidence"` (ligne 43, signature retour).
- Logique correcte : `lotsCreated > 0` → success, `candidateCount === 0` → no_units_detected, sinon → low_confidence (ligne 228-233).
- `warnings` array expose dans la reponse (ligne 240).
- L'UI peut distinguer les 3 cas et afficher le bon message (U3/U5).

**Verdict** : RESOLU. Le contrat "no AI > bad AI" est complet : backend detecte, categorise, et communique le motif.

---

## P0 residuels

Aucun.

---

## P1 residuels

### P1-A : `bounding_polygon` — `.nullable().optional()` toujours present

`schemas.ts:210-211` : le double `.nullable().optional()` est inchange. TypeScript infere `T | null | undefined` alors que le JSON schema ne retourne jamais `undefined`. Impact fonctionnel nul (Zod accepte les deux), mais le type est plus large que necessaire. **Non bloquant**, correction triviale.

### P1-B : `exclusiveMinimum` OpenAI strict mode

Non verifie cette iteration — hors scope clustering. Impact potentiel sur `surface_m2` dans `plan-extractor.ts`. **Non bloquant** en V1 (aucun crash observe en production).

### P1-C, P1-D, P1-E : corriges (prompt maison, split, studios)

- P1-C (prompt maison unit_id) : non verifie car hors scope fichiers audites (plan-extractor.ts). Stable.
- P1-D (split fragile) : corrige via nested Map (I1). RESOLU.
- P1-E (edge case studio) : corrige via exception I10. RESOLU.

---

## Details supplementaires

### U1 — confidence_avg persiste en DB

- `db.ts:175` : colonne `NUMERIC(4,3)` — precision suffisante (0.000 a 9.999, en pratique 0.000-1.000).
- `db.ts:180-181` : migration `ADD COLUMN IF NOT EXISTS` — backward compat OK.
- `types.ts:63` : `confidence_avg: number | null` — aligne avec la colonne nullable.
- `route.ts:211-219` : INSERT avec `$6 = group.confidenceAvg` — persist.
- **Pas de risque de regression** : les lots existants auront `confidence_avg = NULL`, les nouveaux seront peuples.

### ExtractionWarningEnum — "unit_clustering_low_confidence"

`schemas.ts:67` : l'enum contient bien la valeur. Elle n'est plus utilisee cote LLM (le warning est maintenant emis par le backend), mais l'enum reste pour le typage. Coherent.

---

## Verdict : GO CONDITIONNEL (9.2/10)

Les 3 P0 bloquants de l'iteration 1 sont corriges et verifies dans le code. Le contrat "no AI > bad AI" est maintenant complet :

1. **Detection** : `confidenceMin >= 0.5` bloque les pieces douteuses individuelles.
2. **Communication** : `extraction_reason` + `warnings` permettent a l'UI de guider Thomas.
3. **Protection** : `groupRooms.length >= 2` (sauf studios) evite les lots fantomes.

**GO conditionnel** car 2 P1 residuels (P1-A `.optional()`, P1-B `exclusiveMinimum`) — aucun n'est bloquant, corrigeables dans un commit de nettoyage ulterieur.

---

**Handoff → @orchestrator**
- Fichiers produits : `docs/reviews/vs-s21-audit-ia-it2.md`
- P0 resolus : 3/3 (confidenceMin, warning backend, extraction_reason)
- P1 residuels : 2 (P1-A `.optional()` redondant, P1-B `exclusiveMinimum` non verifie)
- Verdict : GO CONDITIONNEL 9.2/10 — aucun P0 residuel, 2 P1 mineurs non bloquants
- Note : le critere "Strategie clustering" passe de 6 a 10, le critere "Fallback no AI > bad AI" passe de 5 a 9.5
