# Prompts IA -- Transformations structurelles Etape 4

Session : versi-s22 | Date : 2026-04-17 | Agent : @ia

---

## 1. Changement principal -- `buildVisualPrompt()` conditionnelle

**Fichier** : `versi-studio/src/lib/vs/visual-generator.ts`

### Avant (STRICT RULE 1 absolue)

```
1. KEEP all structural elements EXACTLY as they are: walls, windows, doors,
   ceiling, floor shape, room proportions. Do NOT move, add, or remove any
   window or door.
```

### Apres (conditionnelle selon `structuralInstructions`)

**Si `structuralInstructions` est null/vide** (non-regression) :
```
1. KEEP all structural elements EXACTLY as they are [...]
```
Identique a avant. Zero changement de comportement.

**Si `structuralInstructions` est renseigne** :
```
1. KEEP the base room characteristics (camera framing, proportions, natural
   light direction) while APPLYING the structural transformations described
   below. Adapt walls, partitions, and openings as instructed.
```

Plus un bloc dedie :
```
STRUCTURAL TRANSFORMATIONS (apply these modifications):
{structuralInstructions}

Rules for transformations:
- Respect physics: walls meet floors and ceilings, doors human-sized, etc.
- If a wall is removed: show new open space with continuous flooring/ceiling.
- If a partition is added: show thin new wall (15cm) with matching finishes.
- If an opening is created: show clean door frame or window opening.
- Keep camera angle and lighting from source photo.
```

### Nouveau parametre

```typescript
export function buildVisualPrompt(
  roomType: string,
  styleId: string,
  surfaceM2: number | null,
  angleDescription: string | null,
  structuralInstructions: string | null = null  // NOUVEAU
): string
```

`generateVisual()` propage le parametre de la meme facon (default `null`).

---

## 2. Changement `enrichPromptForIteration()` et `architect-agent.ts`

**Fichier** : `versi-studio/src/lib/vs/visual-generator.ts` (enrichPromptForIteration)
**Fichier** : `versi-studio/src/lib/vs/architect-agent.ts` (iterateVisual)

Detection automatique par regex de mots-cles structurels dans l'instruction :
```
/\b(mur|cloison|abattre|supprimer|ouvrir|percer|ouverture|porte|baie|fenetre|
agrandir|cuisine ouverte|open.?space|separer|diviser|fusionner)\b/i
```

Si detecte : la regle "Conserve TOUS les elements structurels" est remplacee par une regle autorisant les modifications structurelles avec contraintes physiques realistes.

Le system prompt du chat inclut des exemples few-shot (supprimer mur, ajouter cloison, percer ouverture, agrandir fenetre) pour guider gpt-4.1-mini dans l'enrichissement.

---

## 3. Route API

**Fichier** : `versi-studio/src/app/api/vs/rooms/[id]/generate/route.ts`

Nouveau champ optionnel dans le body POST :
```json
{
  "photo_id": "uuid",
  "style_id": "scandinave",
  "structural_instructions": "Casser le mur entre la chambre et le salon"
}
```

Validation : max 500 caracteres. Message d'erreur en francais : "La description des travaux ne peut pas depasser 500 caracteres."

---

## 4. Schema Zod

**Fichier** : `versi-studio/src/lib/vs/schemas.ts`

Ajout dans `VisualGenerationInputSchema` :
```typescript
structural_instructions: z.string().max(500).nullable().optional()
```

---

## 5. Preuve de test

### Test 1 -- Non-regression (sans transformations)
```
POST /api/vs/rooms/{id}/generate
Body: { photo_id, style_id: "scandinave" }
Resultat: 201 OK, visual genere, prompt contient "KEEP all structural elements EXACTLY"
```

### Test 2 -- Avec transformations structurelles
```
POST /api/vs/rooms/{id}/generate
Body: { photo_id, style_id: "scandinave",
        structural_instructions: "Casser le mur entre la chambre et le salon
        pour creer un open-space" }
Resultat: 201 OK, visual genere, prompt contient "STRUCTURAL TRANSFORMATIONS"
```

### Test 3 -- Validation limite 500 caracteres
```
POST avec structural_instructions de 501 caracteres
Resultat: 400, "La description des travaux ne peut pas depasser 500 caracteres."
```

### Screenshot du visuel genere avec transformation
`docs/screenshots/s22/etape4-ia-transformation-test.png`
Instruction : "Casser le mur entre la chambre et le salon pour creer un open-space"
Resultat : mur supprime, espace ouvert visible avec salon a droite, sol et plafond continus, style scandinave respecte, photoréaliste.

### Compilation et lint
- `npx tsc --noEmit` : 0 erreur
- `npm run lint` : 0 nouvelle erreur (4 erreurs pre-existantes dans `reference-existant/` et `scripts/`)

---

## 6. Cout OpenAI

1 appel gpt-image-1 `images.edit` quality=high size=auto : ~$0.04-0.08 selon resolution.
Pas de surcout par rapport a une generation sans transformations (meme API, meme modele).

---

**Handoff -> @fullstack**
- Fichiers modifies : `versi-studio/src/lib/vs/visual-generator.ts`, `versi-studio/src/lib/vs/architect-agent.ts`, `versi-studio/src/lib/vs/schemas.ts`, `versi-studio/src/app/api/vs/rooms/[id]/generate/route.ts`
- Fichier produit : `docs/ia/vs-s22-prompt-transformations.md`, `docs/screenshots/s22/etape4-ia-transformation-test.png`
- Decisions prises : STRICT RULE 1 conditionnelle (pas supprimee -- active par defaut sans transformations) ; detection structurelle par regex dans architect-agent ; suggestions few-shot dans enrichPromptForIteration
- Points d'attention pour @fullstack : ajouter textarea + badges dans VisualRoom.tsx (spec PM section 3.1), passer `structural_instructions` depuis le state du composant vers le POST /generate, ajouter suggestions cliquables dans ChatAgent.tsx (spec PM section 3.2)
