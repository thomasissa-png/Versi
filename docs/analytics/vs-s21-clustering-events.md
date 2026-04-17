# Spec Analytics — Events Clustering IA (versi-s21)

> Produit par @data-analyst — session versi-s21
> Livrable : `docs/analytics/vs-s21-clustering-events.md`
> Contexte : 4 events post-clustering IA validés GO PRODUCTION (bundle PM-P1-E8)

---

## Section 1 — Schéma events

### 1.1 `lot_auto_created`

**Trigger** : côté serveur, dans `extract/route.ts`, à l'intérieur de la boucle `for (const group of unitGroups)`, immédiatement après le `INSERT INTO vs_lots ... source='ai'` réussi. Émis 1 fois par lot créé (N fois par extraction si N lots).

**Payload** :

| Propriété | Type | Valeur |
|---|---|---|
| `event` | string | `"lot_auto_created"` |
| `project_id` | string (UUID) | ID du projet |
| `plan_id` | string (UUID) — optionnel | Non disponible au moment de l'INSERT multi-plan — omettre |
| `lot_name` | string | Nom généré (`lotName`) |
| `floor_number` | number | `group.floor` |
| `confidence_avg` | number | `group.confidenceAvg` (0–1) |
| `surface_m2` | number \| null | `surfaceM2 > 0 ? surfaceM2 : null` |
| `room_count` | number | `group.rooms.length` |
| `habitable_room_count` | number | `habitableCount` (déjà calculé) |
| `source` | string | `"ai"` |

**KPI alimenté** : dénominateur de `taux_validation_1clic = lot_auto_validated / lot_auto_created`

---

### 1.2 `lot_auto_validated`

**Trigger** : côté client, dans `lots/page.tsx`.
- Chemin A — validation unitaire : dans `handleValidateSingleLot`, après PATCH success (`json.success === true`)
- Chemin B — validation globale : dans `handleValidateAllAiLots`, après résolution de `Promise.allSettled`, 1 appel par lot effectivement validé (hors `failedIds`)

**Payload** :

| Propriété | Type | Valeur |
|---|---|---|
| `event` | string | `"lot_auto_validated"` |
| `project_id` | string (UUID) | `projectId` |
| `lot_id` | string (UUID) | `lotId` |
| `trigger` | string enum | `"single_click"` (chemin A) \| `"bulk_validate"` (chemin B) |
| `source` | string | `"ai"` (toujours — ces handlers ne s'appliquent qu'aux lots IA) |

**KPI alimenté** : numérateur de `taux_validation_1clic`. Segmenter par `trigger` pour distinguer la validation 1-clic unitaire de la validation globale.

---

### 1.3 `lot_manually_adjusted`

**Trigger** : côté client, dans `lots/page.tsx`, dans `saveLotZone` (callback debounced de `handleUpdateLotZone`) après PATCH success **ET** si `lot.source === 'ai'`. Émis aussi lors d'une suppression d'un lot IA dans `confirmDeleteLot` si le lot supprimé est `source === 'ai'`.

**Payload** :

| Propriété | Type | Valeur |
|---|---|---|
| `event` | string | `"lot_manually_adjusted"` |
| `project_id` | string (UUID) | `projectId` |
| `lot_id` | string (UUID) | `lotId` |
| `adjustment_type` | string enum | `"zone_redraw"` (zone modifiée) \| `"deleted"` (suppression) |
| `source` | string | `"ai"` (guard obligatoire avant émission) |

**KPI alimenté** : `taux_ajustement_manuel = lot_manually_adjusted / lot_auto_created`. Permet de détecter si les lots IA sont fiables ou systématiquement corrigés.

---

### 1.4 `ia_fallback_triggered`

**Trigger** : côté serveur, dans `extract/route.ts`, avant le `return NextResponse.json(...)` final, si `lotsCreated.length === 0` ET `candidateCount > 0`. Correspond à `extractionReason === "low_confidence"`. Cas `no_units_detected` (candidateCount === 0) émet aussi cet event avec `reason = "no_units_detected"`.

**Payload** :

| Propriété | Type | Valeur |
|---|---|---|
| `event` | string | `"ia_fallback_triggered"` |
| `project_id` | string (UUID) | `projectId` |
| `reason` | string enum | `"low_confidence"` \| `"no_units_detected"` |
| `candidate_count` | number | `candidateCount` (groupes candidats avant filtre confiance) |
| `plan_count` | number | `plansResult.rows.length` |

**KPI alimenté** : `taux_fallback_ia = ia_fallback_triggered / total_extractions`. Si ce taux dépasse 20%, le seuil `CLUSTERING_CONFIDENCE_THRESHOLD` (0.7) est probablement trop élevé ou les plans sont atypiques.

---

## Section 2 — Implémentation technique

### Stack analytics existante

Grep sur `src/` : **aucun SDK analytics existant** (PostHog, Amplitude, Mixpanel, GA4) — confirmé par l'absence de résultat sur les patterns `analytics|track\(`. Le projet est en V1 interne.

### Approche retenue — Logging structuré JSON (MVP)

- Pas de SDK externe, pas de cookie, pas de consentement RGPD requis (logs serveur internes)
- Server-side : `console.log(JSON.stringify({ analytics: { ...payload, ts } }))` — pickup par les logs Next.js (Replit, Vercel, etc.)
- Client-side : `console.log("[analytics]", payload)` — visible dans les DevTools, pas de persistance (suffisant pour mesurer en V1 via les logs serveur)
- Point d'évolution s22 : route `/api/vs/analytics` pour centraliser les events client → serveur, puis stockage en DB ou export vers Plausible/PostHog

### Format event unifié

```typescript
{
  analytics: {
    event: string;          // nom de l'event snake_case
    project_id: string;     // UUID projet
    // ... propriétés spécifiques à l'event
    ts: string;             // ISO 8601 — ajouté automatiquement par track()
  }
}
```

---

## Section 3 — Brief typist @fullstack (code exact)

### Étape 1 — Créer le helper centralisé

**Fichier à créer** : `versi-studio/src/lib/vs/analytics.ts`

```typescript
export type AnalyticsEvent =
  | "lot_auto_created"
  | "lot_auto_validated"
  | "lot_manually_adjusted"
  | "ia_fallback_triggered";

export interface AnalyticsPayload {
  event: AnalyticsEvent;
  project_id: string;
  plan_id?: string;
  lot_id?: string;
  lot_name?: string;
  floor_number?: number;
  confidence_avg?: number;
  surface_m2?: number | null;
  room_count?: number;
  habitable_room_count?: number;
  source?: "ai" | "manual";
  trigger?: "single_click" | "bulk_validate";
  adjustment_type?: "zone_redraw" | "deleted";
  reason?: "no_units_detected" | "low_confidence";
  candidate_count?: number;
  plan_count?: number;
  [key: string]: unknown;
}

export function track(payload: AnalyticsPayload): void {
  const entry = { analytics: { ...payload, ts: new Date().toISOString() } };
  if (typeof window === "undefined") {
    // Server-side : pickup par les logs Next.js
    console.log(JSON.stringify(entry));
  } else {
    // Client-side V1 : log local — POST /api/vs/analytics en s22
    console.log("[analytics]", entry);
  }
}
```

---

### Étape 2 — `lot_auto_created` dans `extract/route.ts`

**Fichier** : `versi-studio/src/app/api/vs/projects/[id]/extract/route.ts`

**Import à ajouter** en haut du fichier, après les imports existants :

```typescript
import { track } from "@/lib/vs/analytics";
```

**Bloc à insérer** : après la ligne `lotsCreated.push({ name: lotName, confidenceAvg: group.confidenceAvg });` (ligne ~223), toujours dans la boucle `for (const group of unitGroups)` :

```typescript
        // Analytics — lot pré-créé par IA (versi-s21)
        track({
          event: "lot_auto_created",
          project_id: projectId,
          lot_name: lotName,
          floor_number: group.floor,
          confidence_avg: group.confidenceAvg,
          surface_m2: surfaceM2 > 0 ? surfaceM2 : null,
          room_count: group.rooms.length,
          habitable_room_count: habitableCount,
          source: "ai",
        });
```

---

### Étape 3 — `ia_fallback_triggered` dans `extract/route.ts`

**Bloc à insérer** : après la ligne `const extractionReason = ...` (ligne ~229), avant le `return NextResponse.json(...)` :

```typescript
    // Analytics — fallback IA (0 lot créé malgré des candidats ou 0 unit_id)
    if (lotsCreated.length === 0) {
      track({
        event: "ia_fallback_triggered",
        project_id: projectId,
        reason: candidateCount === 0 ? "no_units_detected" : "low_confidence",
        candidate_count: candidateCount,
        plan_count: plansResult.rows.length,
      });
    }
```

---

### Étape 4 — `lot_auto_validated` dans `lots/page.tsx`

**Fichier** : `versi-studio/src/app/vs/projects/[id]/lots/page.tsx`

**Import à ajouter** en haut du fichier, après les imports existants :

```typescript
import { track } from "@/lib/vs/analytics";
```

**Bloc A — validation unitaire** : dans `handleValidateSingleLot`, remplacer le bloc `try` existant (après le PATCH, ligne ~419) pour ajouter l'event après `json.success` :

```typescript
        const res = await fetch(`/api/vs/lots/${lotId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "validated" }),
        });
        const json = (await res.json()) as ApiResponse<VsLot>;
        if (!json.success) {
          // Rollback
          setLots((prev) =>
            prev.map((l) =>
              l.id === lotId ? { ...l, status: "suggested" as const } : l
            )
          );
          setError("Impossible de valider ce lot.");
        } else {
          // Analytics — lot IA validé en 1 clic (versi-s21)
          track({
            event: "lot_auto_validated",
            project_id: projectId,
            lot_id: lotId,
            trigger: "single_click",
            source: "ai",
          });
        }
```

**Bloc B — validation globale** : dans `handleValidateAllAiLots`, après la boucle `results.forEach(...)` et la construction de `failedIds`, ajouter :

```typescript
    // Analytics — lots IA validés globalement (versi-s21)
    const validatedIds = aiSuggested
      .filter((lot) => !failedIds.has(lot.id))
      .map((lot) => lot.id);
    for (const id of validatedIds) {
      track({
        event: "lot_auto_validated",
        project_id: projectId,
        lot_id: id,
        trigger: "bulk_validate",
        source: "ai",
      });
    }
```

---

### Étape 5 — `lot_manually_adjusted` dans `lots/page.tsx`

**Bloc A — redessinage de zone** : dans `saveLotZone` (callback de `handleUpdateLotZone`), après la vérification `json.success`. Ajouter un guard sur `lot.source`. La signature de `saveLotZone` n'expose pas le lot complet — passer `lotSource` en paramètre. Modifier la signature de `saveLotZone` et `handleUpdateLotZone` :

```typescript
  const saveLotZone = useCallback(
    async (lotId: string, zone: Zone, lotSource: string) => {
      try {
        setSaving(true);
        const res = await fetch(`/api/vs/lots/${lotId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ zone_data: zone }),
        });
        const json = (await res.json()) as ApiResponse<VsLot>;
        if (!json.success) {
          setError("Modifications non enregistrées. Rechargez la page pour reprendre depuis la dernière version sauvegardée.");
          fetchData();
        } else if (lotSource === "ai") {
          // Analytics — lot IA modifié manuellement (versi-s21)
          track({
            event: "lot_manually_adjusted",
            project_id: projectId,
            lot_id: lotId,
            adjustment_type: "zone_redraw",
            source: "ai",
          });
        }
      } catch {
        setError("Modifications non enregistrées. Rechargez la page pour reprendre depuis la dernière version sauvegardée.");
        fetchData();
      } finally {
        setSaving(false);
      }
    },
    [fetchData, projectId]
  );
```

Dans `handleUpdateLotZone`, passer le `source` du lot :

```typescript
  const handleUpdateLotZone = useCallback(
    (lotId: string, zone: Zone) => {
      const lot = lots.find((l) => l.id === lotId);
      const lotSource = lot?.source ?? "manual";

      // Optimistic update
      setLots((prev) =>
        prev.map((l) =>
          l.id === lotId
            ? { ...l, zone_data: zone as unknown as Record<string, unknown> }
            : l
        )
      );

      const existing = saveTimersRef.current.get(lotId);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        saveLotZone(lotId, zone, lotSource);
        saveTimersRef.current.delete(lotId);
      }, DEBOUNCE_SAVE_MS);

      saveTimersRef.current.set(lotId, timer);
    },
    [saveLotZone, lots]
  );
```

**Bloc B — suppression d'un lot IA** : dans `confirmDeleteLot`, après le DELETE success, ajouter :

```typescript
      const res = await fetch(`/api/vs/lots/${lotId}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as ApiResponse<{ deleted: boolean }>;
      if (!json.success) {
        setError("La suppression a échoué. Le lot a été restauré automatiquement.");
        fetchData();
      } else {
        // Analytics — lot IA supprimé (versi-s21)
        const deletedLot = lots.find((l) => l.id === lotId);
        if (deletedLot?.source === "ai") {
          track({
            event: "lot_manually_adjusted",
            project_id: projectId,
            lot_id: lotId,
            adjustment_type: "deleted",
            source: "ai",
          });
        }
      }
```

> Note : `confirmDeleteLot` s'exécute après l'optimistic update qui retire le lot de `lots`. La référence au lot doit être capturée AVANT l'optimistic update — voir remarque ci-dessous.

**Correction nécessaire dans `confirmDeleteLot`** : capturer le lot avant l'optimistic update :

```typescript
  const confirmDeleteLot = useCallback(async () => {
    const lotId = deleteTargetId;
    if (!lotId) return;
    setDeleteTargetId(null);

    // Capturer avant optimistic update pour analytics
    const targetLot = lots.find((l) => l.id === lotId);

    // Optimistic update
    setLots((prev) => prev.filter((lot) => lot.id !== lotId));
    if (selectedLotId === lotId) setSelectedLotId(null);

    try {
      const res = await fetch(`/api/vs/lots/${lotId}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as ApiResponse<{ deleted: boolean }>;
      if (!json.success) {
        setError("La suppression a échoué. Le lot a été restauré automatiquement.");
        fetchData();
      } else if (targetLot?.source === "ai") {
        // Analytics — lot IA supprimé (versi-s21)
        track({
          event: "lot_manually_adjusted",
          project_id: projectId,
          lot_id: lotId,
          adjustment_type: "deleted",
          source: "ai",
        });
      }
    } catch {
      setError("La suppression a échoué. Le lot a été restauré automatiquement.");
      fetchData();
    }
  }, [deleteTargetId, selectedLotId, fetchData, lots, projectId]);
```

---

## Section 4 — Helper centralisé

Voir Section 3 — Étape 1 : `versi-studio/src/lib/vs/analytics.ts` (code complet ci-dessus).

La fonction `track()` est isomorphe (server + client). Elle ne dépend d'aucune librairie externe. En s22, le body client-side sera remplacé par un `fetch("/api/vs/analytics", { method: "POST", body: JSON.stringify(payload) })` vers une route Next.js qui persiste en DB ou route vers un outil tiers.

---

## Section 5 — KPI dashboard (mémo s22)

Les 4 KPI à monitorer post-déploiement, mesurables à partir des logs structurés :

| KPI | Formule | Cible | Signal d'alerte |
|---|---|---|---|
| **Taux validation 1-clic** | `COUNT(lot_auto_validated WHERE trigger='single_click') / COUNT(lot_auto_created)` | ≥ 80% | < 60% → lots IA non fiables, revoir seuil confidence |
| **Taux validation toutes sources** | `COUNT(lot_auto_validated) / COUNT(lot_auto_created)` | ≥ 90% | < 70% → UX friction sur la validation |
| **Taux ajustement manuel** | `COUNT(lot_manually_adjusted) / COUNT(lot_auto_created)` | ≤ 20% | > 40% → lots IA nécessitent trop de corrections |
| **Taux fallback IA** | `COUNT(ia_fallback_triggered) / COUNT(total POST /extract)` | ≤ 15% | > 30% → seuil CLUSTERING_CONFIDENCE_THRESHOLD trop élevé ou plans atypiques |

**Distribution complémentaire** : histogramme de `confidence_avg` des events `lot_auto_created` — détecte les clusters de lots en limite de seuil (0.65–0.75) qui pourraient être acceptés en abaissant légèrement le threshold.

Toutes les valeurs cibles sont marquées `[À MESURER post-déploiement]` — les cibles ci-dessus sont des hypothèses de travail issues du brief fondateur (Thomas valide 8/10 en 1 clic = 80% cible North Star). Valider sur les 50 premiers lots créés.

---

## Hypothèses à valider

- `[HYPOTHÈSE : cible 80% validation 1-clic]` — fondée sur le brief fondateur versi-s21, à confirmer sur données réelles (50 lots minimum)
- `[HYPOTHÈSE : seuil alerte fallback 15%]` — basé sur principe "no AI > bad AI" (seuil confidence 0.7). À recalibrer si le taux observé dépasse 30% de manière systématique
- Le `lot_id` n'est pas disponible immédiatement après l'INSERT dans `extract/route.ts` sans un `RETURNING id` — si nécessaire en s22 pour lier les events, ajouter `RETURNING id` à la requête INSERT et passer le UUID au `track()`

---

**Handoff → @fullstack**

- Fichiers produits : `/home/user/Versi/docs/analytics/vs-s21-clustering-events.md`
- Fichier à créer : `versi-studio/src/lib/vs/analytics.ts` (code exact en Section 3 — Étape 1)
- Fichiers à modifier :
  - `versi-studio/src/app/api/vs/projects/[id]/extract/route.ts` : ajouter import `track`, event `lot_auto_created` (boucle unitGroups), event `ia_fallback_triggered` (avant return)
  - `versi-studio/src/app/vs/projects/[id]/lots/page.tsx` : ajouter import `track`, events `lot_auto_validated` (handleValidateSingleLot + handleValidateAllAiLots), event `lot_manually_adjusted` (saveLotZone + confirmDeleteLot avec capture pré-optimistic-update)
- Décisions prises : logging structuré JSON V1 (pas de SDK externe), helper isomorphe `track()`, 4 events avec typing TypeScript strict
- Points d'attention :
  - `confirmDeleteLot` : capturer `targetLot` AVANT l'optimistic update (voir code exact Section 3 — Étape 5 Bloc B)
  - `saveLotZone` : la signature doit recevoir `lotSource: string` (modifier aussi `handleUpdateLotZone` pour passer `lot.source`)
  - `handleValidateAllAiLots` : émettre 1 event par lot validé (boucle sur `validatedIds`, pas un event global)
  - `projectId` est déjà dans le scope de `lots/page.tsx` (`const { id: projectId } = use(params)`)
