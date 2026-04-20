# Spec technique — Extraction enrichie unit_id + bounding_polygon

**Date** : 2026-04-17
**Agent** : @ia (livrable produit par orchestrateur faute d'outil Task — audit @ia requis)
**Projet** : Versi Studio s21
**Persona** : Thomas, marchand de biens, 8-12 operations/an
**Dependance amont** : `versi-studio/src/lib/vs/plan-extractor.ts`, `schemas.ts`

---

## 1. Objectif

Enrichir le pipeline d'extraction GPT-4.1 Vision pour retourner 2 nouveaux champs par piece extraite :

1. **`unit_id`** (string, nullable) : identifiant de l'unite logique (appartement) a laquelle la piece appartient. Permet le clustering backend "1 lot = 1 appartement".
2. **`bounding_polygon`** (array de points, nullable, optionnel) : contour polygonal de la piece (4-8 points en % de l'image). Utilise quand la forme de la piece est non-rectangulaire (L, T, irregular) et que le `bounding_box` rectangle ne suffit pas.

## 2. Schema JSON enrichi — ExtractedRoom

### Nouveaux champs (ajouts au schema existant)

```typescript
// Dans ExtractedRoomSchema (schemas.ts)
unit_id: z
  .string()
  .nullable()
  .describe("Identifiant de l'unite logique (appartement/logement). "
    + "Pieces partageant le meme unit_id forment un meme lot. "
    + "Format: 'u1', 'u2', ... null si indetermine."),

bounding_polygon: z
  .array(
    z.object({
      x_percent: z.number().min(0).max(100),
      y_percent: z.number().min(0).max(100),
    })
  )
  .min(3)
  .max(8)
  .nullable()
  .optional()
  .describe("Contour polygonal de la piece en % de l'image (3-8 points). "
    + "Fourni uniquement si la piece est non-rectangulaire (L, T, irregular) "
    + "et que bounding_box ne suffit pas. null si rectangulaire."),
```

### Schema JSON OpenAI (PLAN_EXTRACTION_JSON_SCHEMA)

Ajout dans `rooms.items.properties` :

```json
"unit_id": {
  "anyOf": [
    { "type": "string" },
    { "type": "null" }
  ]
},
"bounding_polygon": {
  "anyOf": [
    {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "x_percent": { "type": "number", "minimum": 0, "maximum": 100 },
          "y_percent": { "type": "number", "minimum": 0, "maximum": 100 }
        },
        "required": ["x_percent", "y_percent"],
        "additionalProperties": false
      },
      "minItems": 3,
      "maxItems": 8
    },
    { "type": "null" }
  ]
}
```

Ajout dans `rooms.items.required` : `"unit_id"`, `"bounding_polygon"`.

## 3. Modifications du prompt systeme

### STEP 3 bis — UNIT IDENTIFICATION (nouveau step, entre STEP 3 et STEP 4)

Ajout au system prompt (`buildSystemPrompt`) :

```
STEP 3b — UNIT IDENTIFICATION (mandatory for "immeuble" type):
  For multi-unit buildings (immeubles de rapport), identify which rooms belong to the same residential unit (apartment/logement).
  
  RULES:
  1. Assign a unit_id (u1, u2, u3...) to each room that clearly belongs to a specific unit.
  2. Rooms sharing the same unit_id MUST be:
     - On the same floor
     - Physically connected (sharing walls or accessible through a door/hallway)
     - Forming a coherent residential unit (at minimum: 1 living space + 1 wet room)
  3. If the plan clearly labels units (e.g., "Appartement 1", "Lot A", "T3 gauche"), use that information.
  4. If units are NOT clearly labeled but rooms cluster spatially:
     - Look for entrance doors (thick door symbols on exterior walls or landing)
     - Rooms accessible only from each other form 1 unit
     - Separate entrances from a common landing = separate units
  5. Set unit_id = null if:
     - Common areas (escalier, hall, cave, local poubelles)
     - Cannot determine with confidence > 0.6
     - Single-unit building (maison, appartement seul)
  6. CONFIDENCE: if uncertain about a unit assignment, lower the room's confidence to < 0.7 and add a note.
  
  For "maison" or single "appartement": all rooms get unit_id = "u1" (or null if common area).
```

### STEP 5 enrichi — BOUNDING POLYGON (modification du step existant)

Ajout apres les regles de bounding_box existantes :

```
STEP 5b — BOUNDING POLYGON (for non-rectangular rooms only):
  If a room's shape is "L-shaped", "irregular", or the bounding_box area is > 1.4x the actual room area:
  - Provide bounding_polygon: an array of 4-8 vertices (in clockwise order, % of image) tracing the room outline.
  - The polygon MUST follow the room's walls as closely as possible.
  - Vertices at wall corners, not floating in space.
  - For rectangular/square rooms: bounding_polygon = null (bounding_box suffices).
  
  POLYGON RULES:
  1. Minimum 3 points, maximum 8 points.
  2. Points in clockwise order.
  3. All coordinates in % of image (0-100).
  4. No self-intersecting edges.
  5. The polygon area must be <= bounding_box area (it's a tighter fit).
```

### STEP 7 enrichi — SELF-REVIEW

Ajout aux verifications existantes :

```
  8. If type_bien = "immeuble": do rooms with the same unit_id form coherent apartments? (connected, same floor, livable)
  9. If bounding_polygon provided: is it tighter than bounding_box? Does it follow the walls?
  10. Are there orphan rooms (no unit_id) that should belong to a unit? Re-check.
```

## 4. Seuil de confiance et principe "no AI > bad AI"

### Regles de confiance pour unit_id

| Situation | Confiance | unit_id |
|---|---|---|
| Plan labelle "Appt 1", "Lot A" etc. | >= 0.9 | Assigne |
| Clustering spatial clair (entree distincte) | >= 0.7 | Assigne |
| Clustering incertain (pieces ambigues) | < 0.7 | **null** (pas d'assignation) |
| Maison / appartement unique | N/A | "u1" pour toutes les pieces |
| Parties communes | N/A | null |

### Regles de confiance pour bounding_polygon

| Situation | bounding_polygon |
|---|---|
| Piece rectangulaire/carree | null (bounding_box suffit) |
| Piece L/T/irreguliere (shape != "rectangular" && shape != "square") | Fourni si confiance > 0.6 |
| Forme complexe > 8 sommets | null + note "forme trop complexe pour polygon" |

### Gate "no AI > bad AI"

**Si le modele ne peut pas determiner les unit_id avec confiance >= 0.7 pour au moins 50% des pieces** :
- Retourner toutes les pieces avec `unit_id = null`
- Ajouter `"unit_clustering_low_confidence"` dans `extraction_warnings`
- Le backend NE creera PAS de lots IA (etat vide guide)

Nouveau warning a ajouter dans `ExtractionWarningEnum` :
```typescript
"unit_clustering_low_confidence"
```

## 5. Cout estime

| Metrique | Valeur |
|---|---|
| Tokens supplementaires prompt (STEP 3b + 5b) | ~300 tokens input |
| Tokens supplementaires output (unit_id + polygon par piece) | ~50-100 tokens / piece |
| Cout marginal par extraction | ~$0.005-0.01 (negligeable) |
| Latence supplementaire estimee | < 2s (meme appel API, output legerement plus grand) |

Le cout et la latence sont negligeables car les champs sont ajoutes dans le MEME appel API GPT-4.1 Vision (pas d'appel supplementaire).

## 6. Validation Zod post-extraction

Les regles de validation existantes dans `PlanExtractionResultSchema` s'appliquent. Ajouts :
- `unit_id` : string ou null — validation minimale (le clustering est valide par le backend)
- `bounding_polygon` : si fourni, 3-8 points, chaque point x/y dans [0, 100]

La validation de coherence clustering (pieces du meme unit_id sur le meme floor, adjacentes) est faite cote backend, pas dans la validation Zod (trop complexe pour un schema).

## 7. Backward compatibility

- Les 2 nouveaux champs sont **nullable/optional** → les extractions existantes en base (`extraction_data`) restent valides
- Pas de migration DB necessaire — `extraction_data` est un JSONB
- Le code Etape 3 (Pieces) lit `extraction_data.rooms` — les nouveaux champs sont ignores s'ils ne sont pas utilises

## 8. Fichiers a modifier

| Fichier | Modification |
|---|---|
| `versi-studio/src/lib/vs/schemas.ts` | Ajouter `unit_id` et `bounding_polygon` dans `ExtractedRoomSchema` + nouveau warning |
| `versi-studio/src/lib/vs/plan-extractor.ts` | Modifier `buildSystemPrompt` (STEP 3b, 5b, 7) + `PLAN_EXTRACTION_JSON_SCHEMA` (2 champs) |

---

**Handoff -> @fullstack**
- Fichiers produits : `docs/ia/extraction-enrichie-spec.md`
- Decisions cles : unit_id nullable + bounding_polygon 3-8 pts + warning low_confidence + seuil 0.7
- Points d'attention : schema JSON OpenAI strict mode (pas de champs optionnels — utiliser anyOf null)
- Prochaines etapes : implementation dans schemas.ts + plan-extractor.ts (Phase 3)
