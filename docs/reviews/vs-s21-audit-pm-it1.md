# Audit Product Manager versi-s21 — Itération 1

**Date** : 2026-04-17
**Auditeur** : @product-manager
**Scope** : Clustering IA unit_id + Polygones IA — code vs specs (US-VS-21, US-VS-22)
**Persona** : Thomas, marchand de biens, 8-12 opérations/an

---

## Note globale : 7.4 / 10

---

## Tableau 5 critères

| # | Critère | Note /10 | Corrections EXACTES |
|---|---|---|---|
| 1 | Conformité US-VS-21 | 7/10 | Voir détail ci-dessous |
| 2 | Conformité US-VS-22 | 8/10 | Voir détail ci-dessous |
| 3 | "no AI > bad AI" | 8/10 | Voir détail ci-dessous |
| 4 | Backward compat | 9/10 | Voir détail ci-dessous |
| 5 | Valeur persona Thomas | 7/10 | Voir détail ci-dessous |

---

## Détail par critère

### 1. Conformité US-VS-21 — 7/10

**Ce qui est conforme :**
- Seuil 0.7 appliqué via `CLUSTERING_CONFIDENCE_THRESHOLD` dans `clustering.ts:32`
- Bbox englobante Option A implémentée dans `computeEnvelopeBbox` (conforme décision V1)
- Nommage T{n} / Studio / Lot implémenté dans `generateLotName` (clustering.ts:40-65)
- Suffixe gauche/droite basé sur avgX < 50% conforme spec (clustering.ts:58-63)
- RDC pour floor=0 conforme (clustering.ts:56)
- source='ai' + status='suggested' insérés en base (extract/route.ts:180)

**Écarts identifiés :**

**E1 — P1 — Critère ">=2 pièces par groupe" ignoré.**
La spec stipule `>= 2 pièces` par groupe (clustering-ia-spec.md:29). `clusterByUnit` filtre sur `groupRooms.length >= 1` (clustering.ts:133). Un appartement à 1 pièce unique serait pré-créé alors que la spec exige au minimum 2 pièces pour confirmer un appartement cohérent.
Correction : `clustering.ts:133` → remplacer `groupRooms.length >= 1` par `groupRooms.length >= 2`.

**E2 — P2 — Cas maison individuelle (type_bien="maison") absent.**
Le critère d'acceptance spécifie "1 seul lot Maison englobant toutes les pièces" pour type_bien="maison". La route `extract/route.ts` passe bien `project.type_bien` à `extractPlanData` mais le clustering ne gère pas ce cas spécifiquement — si GPT retourne toutes les pièces avec unit_id="u1" (comportement prompt attendu), 1 lot sera créé. Si GPT retourne unit_id=null pour une maison (cas possible), 0 lot sera créé. Il n'y a pas de fallback explicite.
Correction : `extract/route.ts` après le clustering (ligne ~138) — ajouter :
```typescript
if (unitGroups.length === 0 && project.type_bien === "maison" && allRooms.length > 0) {
  // Fallback maison : 1 lot englobant toutes les pièces
  const zoneData = computeEnvelopeBbox(allRooms);
  const surfaceM2 = allRooms.reduce((sum, r) => sum + (r.surface_m2 || 0), 0);
  await query(
    `INSERT INTO vs_lots (project_id, name, floor_number, surface_m2, zone_data, source, status)
     VALUES ($1, 'Maison', 0, $2, $3, 'ai', 'suggested')`,
    [projectId, surfaceM2 > 0 ? surfaceM2 : null, JSON.stringify(zoneData)]
  );
  lotsCreated = 1;
}
```

**E3 — P2 — Section "Pièces non assignées" absente du LotPanel.**
La spec requiert une section "Pièces non assignées" dans le panneau latéral pour les pièces avec unit_id=null (clustering-ia-spec.md:101, 178). `LotPanel.tsx` ne reçoit pas les pièces non assignées et ne les affiche pas. Le panneau ne liste que les lots.
Correction : `LotPanel.tsx` — ajouter une prop `unassignedRooms?: string[]` et une section conditionnelle sous la liste des lots. La route `/lots` devra agréger les pièces extraction_data avec unit_id=null et les passer via `fetchData`. Impact : `lots/page.tsx` doit parser `extraction_data` des plans pour extraire les pièces non assignées.

---

### 2. Conformité US-VS-22 — 8/10

**Ce qui est conforme :**
- Bouton "Valider ce lot" par lot IA suggéré présent (`LotPanel.tsx:181-192`)
- Bouton "Tout valider (N lots IA)" présent et conditionnel à aiSuggestedLots.length > 0 (`LotPanel.tsx:309-323`)
- `suggested` → `validated` via PATCH `/api/vs/lots/${lotId}` avec `{ status: "validated" }` (`lots/page.tsx:418-444`)
- Optimistic update + rollback sur échec implémentés (lots/page.tsx:412-444)
- Parallélisation PATCH pour "Tout valider" (`Promise.allSettled`) avec rollback partiel sur les lots échoués (lots/page.tsx:448-490)
- Différenciation visuelle : bordure pointillée si suggested, bordure pleine si validated, badge IA avec coche (LotPanel.tsx:106-108, 164-173)

**Écarts identifiés :**

**E4 — P1 — Bouton "Annuler la validation" absent.**
Le critère d'acceptance US-VS-22 stipule `GIVEN un lot IA valide WHEN Thomas veut revenir en arrière THEN bouton "Annuler la validation"`. Le code ne propose aucun bouton de retour en arrière sur les lots validés.
Correction : `LotPanel.tsx` dans `LotCard` — après le badge IA validated, ajouter :
```tsx
{lot.source === "ai" && lot.status === "validated" && onValidateSingle && (
  <button
    onClick={(e) => { e.stopPropagation(); onUnvalidateSingle?.(); }}
    className="mt-xs px-sm py-2xs rounded text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-default)] underline"
    aria-label={`Annuler la validation de ${lot.name}`}
  >
    Annuler
  </button>
)}
```
Ajouter `onUnvalidateSingle?: () => void` dans les props. Dans `lots/page.tsx`, ajouter `handleUnvalidateSingleLot` qui PATCH `{ status: "suggested" }`.

---

### 3. Règle "no AI > bad AI" — 8/10

**Ce qui est conforme :**
- 0 lot créé si confiance < 0.7 : `clusterByUnit` filtre sur `confidenceAvg >= confidenceThreshold` (clustering.ts:132)
- Suppression des anciens lots IA avant re-extraction propre (extract/route.ts:84-87) — pas de pollution
- Warning `unit_clustering_low_confidence` déclaré dans `ExtractionWarningEnum` (schemas.ts:67)
- État vide LotPanel avec message guide "Aucun lot détecté — utilisez le bouton Ajouter un lot" (LotPanel.tsx:258-261)

**Écart identifié :**

**E5 — P1 — Message état vide ne distingue pas "0 lot IA (confiance faible)" vs "0 lot du tout".**
La spec prévoit un message spécifique pour le fallback IA : "L'IA n'a pas détecté de lots fiables — dessinez manuellement" (clustering-ia-spec.md:114). Le message implémenté est générique ("Aucun lot détecté — utilisez le bouton Ajouter un lot"). Thomas ne sait pas si l'IA a essayé et échoué ou si le plan n'a pas été extrait.
Correction : passer une prop `iaFallbackTriggered?: boolean` au `LotPanel`. Dans `lots/page.tsx`, déduire ce flag depuis la réponse de la route extract (`lots_created === 0`). Dans `LotPanel.tsx:257-261`, afficher deux messages distincts selon ce flag.

---

### 4. Backward compat — 9/10

**Ce qui est conforme :**
- `unit_id` défini avec `.nullable()` (schemas.ts:193-200) — extractions existantes sans ce champ sont valides
- `bounding_polygon` défini avec `.nullable().optional()` (schemas.ts:201-216) — doublement optionnel
- `clusterByUnit` ignore les pièces avec `unit_id=null` ou `floor=null` (clustering.ts:116)
- DELETE initial ne cible que `source = 'ai'` (extract/route.ts:84-87) — lots manuels préservés
- Lots source='manual', status='validated' non touchés par le clustering

**Écart mineur :**

**E6 — P2 — `extraction_data` de projets s20 sans `unit_id` : pas de re-clustering automatique.**
Comportement attendu et documenté dans la spec (clustering-ia-spec.md:197). Confirmé PASS — 0 lot pré-créé pour les projets s20, comportement identique à avant. Pas de régression.

Note : La prop `status` du type `VsLot` n'est pas visible dans les fichiers audités — vérifier que `vs_lots` en base a bien la colonne `status` (non audité faute d'accès au schema SQL). Risque mineur.

---

### 5. Valeur persona Thomas — 7/10

**Ce qui est livré :**
- Gain de temps réel : validation 1-clic vs dessin polygone 5 min/lot → objectif 10 sec/lot atteint si l'IA détecte correctement
- Boutons "Valider" unitaire + "Tout valider" présents
- Différenciation visuelle IA vs manuel opérationnelle

**Ce qui manque pour atteindre le gain x5-x10 promis :**

**E7 — P0 — Aucun feedback du nombre de lots détectés après extraction.**
Après POST /extract, Thomas navigue vers /lots et voit les lots pré-créés — mais il n'y a pas de notification "6 lots détectés par l'IA, validez-les ci-dessous". Il doit compter lui-même. Friction inutile.
Correction : `lots/page.tsx` dans `fetchData`, après le chargement, si `lots.filter(l => l.source==='ai' && l.status==='suggested').length > 0`, afficher un bandeau d'information : "L'IA a détecté {N} lot(s) — validez-les en 1 clic ou ajustez." Utiliser l'état `[iaBannerDismissed, setIaBannerDismissed]`.

**E8 — P1 — Manque l'event analytics `lot_auto_created`.**
Les 4 events analytics définis dans la spec (clustering-ia-spec.md:120-126) ne sont pas implémentés dans la route extract ni dans les handlers de validation. Sans ces events, Thomas ne peut pas mesurer le taux de validation 1-clic vs ajustement — KPI clé pour valider le gain x5-10x.
Correction : dans `extract/route.ts` après chaque INSERT lot, et dans `handleValidateSingleLot` / `handleValidateAllAiLots` dans `lots/page.tsx`, émettre les events via le système analytics du projet.

---

## P0 bloquants

**P0-1 (E7)** : Absence de feedback post-extraction sur le nombre de lots IA détectés. Thomas ne sait pas que l'IA a travaillé pour lui — la valeur principale de la feature est invisible sans ce signal.

---

## P1 recommandés

- **P1-1 (E1)** : `clustering.ts:133` — seuil `>= 2 pièces` manquant, risque de lots mono-pièce incohérents
- **P1-2 (E4)** : Bouton "Annuler validation" absent (critère d'acceptance US-VS-22 non couvert)
- **P1-3 (E5)** : Message état vide non différencié entre fallback IA et état initial vide
- **P1-4 (E8)** : Events analytics absents — impossible de mesurer le gain x5-10x

---

## P2 (nice to have)

- **P2-1 (E2)** : Fallback maison individuelle non géré explicitement (dépend du comportement GPT)
- **P2-2 (E3)** : Section "Pièces non assignées" absente du LotPanel (feature spec, pas critique pour V1)

---

## Verdict : ITÉRATION 2

**Ratio couverture critères d'acceptance** :
- US-VS-21 : 7/10 critères PASS (E1, E2, E3 ouverts)
- US-VS-22 : 3/4 critères PASS (E4 ouvert)

L'implémentation est solide et le gain de temps est réel. Les P0/P1 sont corrigeables rapidement. La feature ne doit pas passer en production sans le feedback post-extraction (E7 — P0) qui rend la valeur IA visible à Thomas.

---

**Handoff → @orchestrator**
- Fichiers produits : `docs/reviews/vs-s21-audit-pm-it1.md`
- Décisions prises : verdict ITÉRATION 2 — 1 P0, 4 P1 à corriger avant GO
- Points d'attention :
  - E1 (clustering.ts:133) : 1 ligne à corriger
  - E4 (LotPanel.tsx + lots/page.tsx) : bouton "Annuler validation" manquant
  - E7 (lots/page.tsx) : bandeau feedback post-extraction à ajouter — P0 bloquant
  - E8 : events analytics non implémentés — bloque la mesure du KPI North Star
- Fichiers à modifier : `versi-studio/src/lib/vs/clustering.ts`, `versi-studio/src/components/vs/LotPanel.tsx`, `versi-studio/src/app/vs/projects/[id]/lots/page.tsx`, `versi-studio/src/app/api/vs/projects/[id]/extract/route.ts`
