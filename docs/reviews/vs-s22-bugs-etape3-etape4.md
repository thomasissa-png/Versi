# Diagnostic et corrections — Etape 3 (RoomCanvas) + Etape 4 (Visuels)

Session : versi-s22 | Date : 2026-04-17 | Agent : @fullstack

---

## Mission 1 — Drag/resize vertical RoomCanvas (Etape 3)

### Diagnostic

**Bug** : impossible de deplacer verticalement les pieces ni de les redimensionner en hauteur.

**Cause racine** : la fonction `toPercentCoords(px, py)` soustrait le letterbox offset (`offsetX`, `offsetY`) avant de diviser par les dimensions de rendu. Cette logique est correcte pour convertir une position absolue canvas vers des coordonnees lot-local %. Mais elle etait egalement utilisee pour convertir des **deltas de deplacement souris** (dx, dy), ou la soustraction de l'offset n'a aucun sens.

Concretement, quand le lot a du letterbox vertical (`offsetY = 50px` par exemple) :
- Delta souris vertical de +10px → `toPercentCoords(10, 10)` → `dyPct = ((10 - 50) / renderH) * 100` = **valeur negative** au lieu de positive
- Le drag vertical est inverse et amplifie de facon aberrante
- Le resize via les poignees N/S souffre du meme defaut

**Fichier impacte** : `versi-studio/src/components/vs/RoomCanvas.tsx`

### Correction

Ajout d'une fonction `toDeltaPercent(dxPx, dyPx)` qui convertit un delta pixel en delta % sans soustraire l'offset letterbox :

```typescript
const toDeltaPercent = useCallback(
  (dxPx: number, dyPx: number): { dxPct: number; dyPct: number } => {
    const { renderW, renderH } = renderLayout;
    return {
      dxPct: (dxPx / renderW) * 100,
      dyPct: (dyPx / renderH) * 100,
    };
  },
  [renderLayout]
);
```

Remplacement des 2 appels `toPercentCoords(dx, dy)` dans `handleMouseMove` (mode resize et mode move) par `toDeltaPercent(dx, dy)`.

### Preuve

- Screenshot avant drag : `docs/screenshots/s22/etape3-before-drag.png`
- Screenshot apres drag vertical : `docs/screenshots/s22/etape3-drag-vertical-fix.png`
- La piece "Chambre" a bien ete deplacee vers le bas sur le plan
- TypeScript : 0 erreur (`npx tsc --noEmit`)

---

## Mission 2 — "La creation a echoue" (Etape 4)

### Diagnostic

**Bug** : toute tentative de generation de visuel echoue avec "La creation a echoue — reessayez".

**Cause racine** : le code utilisait `openai.responses.create()` avec le modele `gpt-image-1.5`. Ce modele n'est pas supporte via l'API Responses. L'erreur serveur exacte etait :

```
400 The requested model, 'gpt-image-1.5' was not found.
```

Apres correction vers `gpt-image-1`, l'erreur devenait :

```
400 The requested model 'gpt-image-1' is not supported with the Responses API.
```

**Solution** : migration de `openai.responses.create()` vers `openai.images.edit()` avec `model: "gpt-image-1"`. Cette API est l'endpoint correct pour l'edition d'images (transformation d'une photo existante).

### Fichiers corriges

1. **`versi-studio/src/lib/vs/visual-generator.ts`** — fonction `callImageGeneration` :
   - Remplacement de `openai.responses.create({ model: "gpt-image-1.5", ... })` par `openai.images.edit({ model: "gpt-image-1", ... })`
   - Utilisation de `toFile()` du SDK OpenAI pour convertir le buffer base64 en fichier uploadable
   - Extraction du resultat via `response.data[0].b64_json` au lieu de `image_generation_call.result`

2. **`versi-studio/src/lib/vs/architect-agent.ts`** — fonction `callIterationGeneration` :
   - Meme migration que ci-dessus pour l'iteration de visuels

3. **`versi-studio/src/components/vs/VisualResult.tsx`** — `translateOpenAIError` :
   - Ajout de cas d'erreur : modele indisponible, quota epuise, image invalide

### Preuve

- Screenshot generation reussie : `docs/screenshots/s22/etape4-generation-ok.png`
- Log serveur : `[visual-gen] Visuel 957f975c... : generation terminee.`
- Generation complete en ~45s (gpt-image-1, quality: high)
- TypeScript : 0 erreur

---

## Mission 3 — UX "comment specifier un mur a casser/ajouter ?"

### Analyse du workflow Etape 4

Le workflow actuel de l'Etape 4 est :

1. **Deposer une photo** de la piece (photo brute, etat actuel)
2. **Choisir un style** de decoration (Scandinave, Industriel, Moderne, etc.)
3. **Generer le visuel** — l'IA transforme la photo en version meublee/decoree
4. **Iterer** via le chat "Agent architecte" — instructions textuelles libres

### Reponse a la question de Thomas

"Comment fait l'outil pour comprendre quoi faire si y a un mur a casser par exemple, ou a rajouter ?"

**Etat actuel** : le prompt de generation (dans `buildVisualPrompt`) demande explicitement a l'IA de **conserver tous les elements structurels** (murs, fenetres, portes). C'est une regle STRICT RULE n.1 du prompt. Cela signifie que par defaut, l'IA ne casse ni n'ajoute aucun mur.

**Pour modifier la structure** (casser un mur, ouvrir une cuisine, etc.), Thomas doit :
1. Generer un premier visuel (qui conserve la structure)
2. Cliquer "Modifier" → ouvre le chat Agent Architecte
3. Taper une instruction comme : "Casser le mur entre la cuisine et le salon pour creer un espace ouvert"
4. L'agent enrichit l'instruction et genere une nouvelle version

**Probleme UX identifie** : ce workflow n'est pas du tout explique dans l'interface. Thomas ne sait pas qu'il peut donner des instructions de modification structurelle via le chat. Le bouton "Modifier" n'evoque pas cette capacite.

### Recommandations (pas d'implementation)

1. **Ajouter un champ "Description du projet"** avant la generation — un textarea optionnel ou Thomas peut decrire les travaux prevus ("casser le mur entre cuisine et salon", "ajouter une verriere", "supprimer la cloison"). Ce texte serait injecte dans le prompt initial pour que le premier visuel reflete deja les modifications structurelles.

2. **Renommer "Modifier"** en "Affiner le visuel" ou "Donner des instructions" pour que le bouton soit plus explicite.

3. **Ajouter des suggestions d'instructions** dans le chat Agent Architecte : puces cliquables type "Casser un mur", "Ajouter une verriere", "Changer le sol", "Plus de lumiere naturelle" pour guider Thomas.

4. **Ajouter un tooltip ou micro-copy** sous le titre Etape 4 : "Deposez une photo, choisissez un style, puis affinez le resultat avec l'agent architecte (modification de murs, ajouts, etc.)".

---

## Handoff → Thomas

- **Fichiers modifies** :
  - `versi-studio/src/components/vs/RoomCanvas.tsx` — fix drag/resize vertical
  - `versi-studio/src/lib/vs/visual-generator.ts` — migration API gpt-image-1
  - `versi-studio/src/lib/vs/architect-agent.ts` — migration API gpt-image-1
  - `versi-studio/src/components/vs/VisualResult.tsx` — messages d'erreur enrichis
- **Screenshots** : `docs/screenshots/s22/etape3-drag-vertical-fix.png`, `docs/screenshots/s22/etape4-generation-ok.png`
- **Points d'attention** :
  - La generation coute ~0.04$ par image (gpt-image-1, quality high)
  - Les images de test tres petites (< 50px) sont rejetees par l'API OpenAI
  - L'API Responses ne supporte pas les modeles gpt-image — utiliser exclusivement openai.images.edit
  - La migration vers gpt-image-1.5 sera possible quand OpenAI le supportera dans l'API Images
