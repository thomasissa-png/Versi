# Pipeline IA — Étape 4 v2 : Visuels sur Plan

Session : versi-s29 | Date : 2026-05-04 | Agent : @ia
Inputs : `docs/product/visuals-step-v2-specs.md` | `versi-studio/src/lib/vs/visual-generator.ts` | `versi-studio/src/lib/vs/architect-agent.ts` | `versi-studio/src/lib/vs/styles.ts`

---

## 1. Résumé exécutif

La V2 transforme le pipeline V1 (1 photo → 1 prompt → 1 visuel par pièce, indépendants) en un pipeline **multi-photo / multi-vue cohérent** avec **détection d'ambiguïté bloquante synchrone** au moment du clic "Générer". Pour chaque pièce avec `target_visual_count = N`, on génère 1 visuel ancre (img2img depuis la photo la plus représentative) puis N-1 visuels secondaires conditionnés sur l'ancre (mêmes meubles, palette, finitions). Cinq triggers (T1-T5) évalués pré-génération posent des questions bloquantes à Thomas pour éviter de gaspiller des appels `gpt-image-2` sur une configuration ambigüe.

**Diff vs V1** : V1 = boucle `for room → 1 appel images.edit` indépendant ; V2 = phase 0 pré-traitement (HEIC, EXIF, resize) + phase 1 détection ambiguïté agrégée + phase 2 génération ancre+secondaires séquencée par pièce + phase 3 cohérence vérifiée. V1 utilise `angle_description: TEXT`, V2 utilise `angle_degrees: FLOAT` converti en cardinal verbal dans le prompt.

**Risques techniques majeurs** : (R1) `gpt-image-2` peut ne pas accepter de tableau d'images en input pour `images.edit` — la cohérence ancre→secondaires devra retomber sur description verbale enrichie ; (R2) latence cumulée par projet (10 pièces × 2-3 visuels séquencés pour cohérence) peut dépasser 4 min — parallélisation inter-pièces obligatoire ; (R3) coût `gpt-image-2 high` par projet (~1$/projet de 10 pièces) à valider business.

---

## 2. Architecture pipeline — vue d'ensemble

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Étape 4 v2 — Pipeline IA                                                 │
└──────────────────────────────────────────────────────────────────────────┘

  [INPUT]                    [PHASE 0]                    [PHASE 1]
  ┌─────────────┐         ┌──────────────────┐         ┌──────────────────┐
  │ Photos      │         │ Pré-traitement   │         │ Détection        │
  │ + plan      │ ──────▶ │ photo            │ ──────▶ │ ambiguïté        │
  │ + settings  │         │ (HEIC, EXIF,     │         │ (T1..T5)         │
  │ + comments  │         │ resize, validat.)│         │ SYNC bloquant    │
  │ + angles    │         └──────────────────┘         └────────┬─────────┘
  └─────────────┘                                                │
                                                                 │
                                  ┌──────────────────────────────┴─────┐
                                  │                                    │
                          [questions ≠ ∅]                       [questions = ∅]
                                  │                                    │
                                  ▼                                    │
                       ┌──────────────────┐                            │
                       │ Modale chat      │                            │
                       │ Thomas répond    │                            │
                       │ → INSERT answers │                            │
                       └────────┬─────────┘                            │
                                │ injection prompts                    │
                                └──────────────────────────────────────┤
                                                                       ▼
  [PHASE 2 — par pièce, parallélisé inter-pièces]
  ┌──────────────────────────────────────────────────────────────────────────┐
  │  Étape 2.a   Sélection photo ancre (centroïde le plus proche centre)     │
  │  Étape 2.b   Génération visuel ancre (gpt-image-2 images.edit, 1 photo) │
  │  Étape 2.c   Extraction signature visuelle ancre (gpt-4o-mini vision)   │
  │              → palette + meubles décrits + finitions                     │
  │  Étape 2.d   Génération N-1 secondaires (gpt-image-2 images.edit)       │
  │              prompt = signature ancre + angle cardinal de cette photo    │
  └────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                                       ▼
  [PHASE 3]                           [OUTPUT]
  ┌──────────────────┐         ┌──────────────────┐
  │ Post-traitement  │         │ N visuels        │
  │ - validation     │ ──────▶ │ cohérents par    │
  │   format/size    │         │ pièce stockés    │
  │ - retry single   │         │ + prompts utilisés│
  │   visuel échoué  │         │ + signature ancre│
  └──────────────────┘         └──────────────────┘
```

**Rôles synthétiques** :
- **Phase 0** — normalise les inputs photo pour réduire le bruit IA (HEIC iOS, orientation EXIF, taille).
- **Phase 1** — fait gagner du temps et de l'argent en bloquant la génération sur les configurations ambigües (5 triggers).
- **Phase 2.a** — choisit la photo "ancre" : règle déterministe (photo dont la position normalisée sur le polygone est la plus proche du centroïde du polygone pièce).
- **Phase 2.b** — génère le visuel "source de vérité" sur lequel les autres se calent.
- **Phase 2.c** — extrait la "signature visuelle" textuelle de l'ancre (palette hex, meubles avec matériaux, finitions sols/murs) — sert de contexte verbal pour les secondaires.
- **Phase 2.d** — génère les N-1 angles restants en injectant la signature ancre dans le prompt. Si `gpt-image-2` accepte multi-image en `images.edit`, on passe aussi l'ancre comme image de référence (cf. R1).
- **Phase 3** — vérifie le format/taille de chaque visuel, relance individuellement les visuels échoués (cf. EC-5 spec PM).

---

## 3. Pré-traitement photos

Phase exécutée **côté serveur à l'upload** (asynchrone, n'attend pas le clic Générer). Stocke le résultat normalisé dans `vs_photos.file_path` (remplace l'original).

### 3.1 Conversion format

| Format input | Action | Outil | Note |
|---|---|---|---|
| JPG / JPEG | passthrough | — | conserver tel quel |
| PNG | passthrough | — | conserver tel quel |
| WEBP | passthrough | — | conserver tel quel |
| HEIC / HEIF (iOS mobile) | conversion → JPG quality 90 | `heic-convert` (Node) ou `sharp` avec libvips ≥ 8.13 | obligatoire — `gpt-image-2` ne lit pas HEIC |
| Autre (TIFF, BMP, GIF…) | rejet | — | toast utilisateur "Format non supporté. JPG, PNG, WEBP ou HEIC uniquement." |

**Validation amont** : vérifier le magic byte (pas l'extension) — un fichier `.jpg` renommé peut être en réalité un HEIC sur iOS.

### 3.2 Lecture EXIF et normalisation orientation

Utiliser `exifr` (lib Node, ~80 KB, lit JPEG/HEIC/TIFF) pour extraire :
- `Orientation` (1-8) → appliquer la rotation correspondante via `sharp.rotate()` puis **strip EXIF** dans l'image normalisée (sinon double rotation côté client).
- `DateTimeOriginal` → stocké dans une nouvelle colonne `vs_photos.taken_at TIMESTAMPTZ NULL` (ajout dans cette V2 — flag à @fullstack pour ALTER TABLE complémentaire) — utilisé par T4 (jour/nuit).
- `GPSLatitude` / `GPSLongitude` → **ignoré V2 mais NON supprimé** : conserver le champ EXIF original avant strip dans une colonne `vs_photos.exif_raw JSONB NULL` pour usage futur (géolocalisation projet).

### 3.3 Resize

Si la photo dépasse **2048 px** sur le côté le plus long → resize via `sharp.resize({ fit: "inside", width: 2048, height: 2048 })`.
Justification : `gpt-image-2 high` traite à résolution interne fixe ; un input > 2048 px gaspille bande passante upload + temps de hash interne du modèle sans gain de qualité. Préserver le ratio.

### 3.4 Validations bloquantes (warning utilisateur)

| Check | Seuil | Action |
|---|---|---|
| Surface fichier minimum | < 200 KB après normalisation | warning UI "Photo très basse définition — risque d'hallucinations sur les meubles." Ne bloque pas. |
| Dimensions minimum | côté < 512 px | warning UI "Photo trop petite — qualité de génération dégradée." Ne bloque pas. |
| Détection low-light | luminance moyenne (Y de YCbCr) < 40/255 | warning UI "Photo sombre — l'IA peut mal interpréter les volumes. Ajoutez une seconde photo plus lumineuse si possible." Ne bloque pas. |
| Détection flou (variance de Laplacien) | variance < 100 sur thumbnail 256px | warning UI "Photo floue détectée — qualité dégradée." Ne bloque pas. [À VÉRIFIER : seuil 100 indicatif, à calibrer en prod sur 20-30 photos test Thomas] |

Aucun de ces checks n'est bloquant — l'utilisateur reste maître. Les warnings sont remontés dans la sidebar à côté de la miniature de la photo.

---

## 4. Détection d'ambiguïté — 5 triggers (T1-T5)

Tous les triggers sont évalués **synchrone au clic "Générer"** (arbitrage Thomas s29 — point A). L'évaluation parcourt toutes les pièces actives (`target_visual_count > 0`) et agrège les questions générées dans une seule modale chat. Tant qu'au moins 1 ligne `vs_visual_questions.answered_at IS NULL` existe pour le projet → bouton "Générer" désactivé.

### T1 — Surface aberrante (déterministe, 0 appel IA)

**Détection :**
```ts
function isSurfaceAberrante(room: VsRoom): boolean {
  if (room.surface_m2 == null) return false; // T5 traite ce cas
  if (room.surface_m2 < 4) return true;
  const largeRooms = ["salon", "sejour", "salle_a_manger", "chambre",
                      "chambre_parentale", "sdb", "cuisine"];
  if (largeRooms.includes(room.room_type) && room.surface_m2 > 80) return true;
  return false;
}
```

**Question template :** `"La surface détectée est ${surface} m² pour ${roomLabel}. Est-ce correct, ou faut-il la corriger avant génération ? Réponse acceptée : un nombre en m², ou 'oui'."`

**Coût IA :** 0 appel (purement règle métier).

### T2 — Photo manquante (déterministe, 0 appel IA)

**Détection :**
```ts
function hasMissingPhoto(room, settings, photos): boolean {
  return settings.target_visual_count > 0
    && photos.filter(p => p.room_id === room.id && p.is_placed_on_plan).length === 0;
}
```

**Question template :** `"Vous demandez ${N} visuel(s) pour ${roomLabel} mais aucune photo n'y est placée. Placez une photo sur le plan, ou répondez 'passer à 0' pour désactiver la génération de cette pièce."`

**Coût IA :** 0 appel.

### T3 — Conflit style/commentaire (sémantique légère, 1 appel `gpt-4o-mini`)

**Détection — pré-filtre déterministe puis confirmation IA** :

Pré-filtre : si `comment_text` ne contient **aucun** des mots-clés `["démolir", "abattre", "supprimer", "détruire", "casser", "ouvrir", "percer", "modifier"]` → skip (0 appel IA).

Si pré-filtre matche ET `style_id` ∈ `["classique", "art-deco"]` (styles à forte préservation patrimoniale) → 1 appel `gpt-4o-mini` :

```ts
const prompt = `Le style choisi pour cette pièce est "${styleName}" (description: ${styleHint}).
Le commentaire utilisateur est: "${commentText}".
Question: ce commentaire décrit-il une transformation structurelle (suppression de mur, etc.) qui pourrait entrer en conflit avec le style préservation/patrimonial ?
Réponds STRICTEMENT en JSON: {"conflit": true|false, "raison": "courte phrase"}`;
```

**Question template (si conflit confirmé) :** `"Votre commentaire mentionne « ${motDétecté} » pour ${roomLabel} (style ${styleName}). Voulez-vous : (A) montrer la pièce après transformation structurelle complète, (B) garder l'aspect ${styleName} préservé sans modification structurelle ? Répondez A ou B."`

**Coût IA :** ≤ 1 appel `gpt-4o-mini` par pièce concernée. Input ≈ 200 tokens, output ≈ 50 tokens. ~$0.0001 par appel.

### T4 — Photos incohérentes (vision, 1 appel `gpt-4o-mini` vision SYNC)

**Trigger** : pièce avec ≥ 2 photos placées. Évalué **SYNC au clic Générer** (arbitrage Thomas s29 point A).

**Détection — pipeline 2 étapes** :

1. **Étape déterministe (gratuit)** : si `taken_at` disponible sur les photos → calculer écart heure max. Si `> 4h` ET au moins une photo en plage `[20h-7h]` → flag potentiel jour/nuit.
2. **Étape IA (1 appel vision)** : passer toutes les photos de la pièce en input à `gpt-4o-mini` (vision) avec prompt :

```ts
const prompt = `Voici ${N} photos d'une même pièce (${roomLabel}). Évalue si elles montrent des états COHÉRENTS pour générer des visuels post-travaux unifiés.
Critères d'incohérence: éclairage très différent (jour vs nuit), état très différent (brut vs partiellement meublé), saison/décor visiblement différents.
Réponds STRICTEMENT en JSON: {"coherent": true|false, "raison": "courte phrase si non cohérent", "etat_dominant": "brut|meuble|mixte"}`;
```

Photos passées en `image_url` (base64 inline pour gpt-4o-mini, max ~512 px chacune via thumbnail pour limiter tokens).

**Question template (si non cohérent) :** `"Les photos de ${roomLabel} semblent montrer des états différents (${raison}). Quel état cible pour les visuels ? (A) état actuel + meubles cibles, (B) après gros œuvre seulement, (C) entièrement remeublé. Répondez A, B ou C."`

**Coût IA :** 1 appel `gpt-4o-mini` vision par pièce ≥ 2 photos. ~500-1500 tokens input (dépend du nb photos), ~80 tokens output. ~$0.001-$0.003 par appel.

**Note implémentation** : threadable — lancer les évaluations T4 en parallèle pour toutes les pièces concernées via `Promise.all`. Latence cible totale T4 : ≤ 4s pour 10 pièces.

### T5 — Surface inconnue (déterministe, 0 appel IA)

**Détection :** `room.surface_m2 IS NULL AND settings.target_visual_count > 0`.

**Question template :** `"La surface de ${roomLabel} est inconnue. Estimez-la en m² (un nombre entre 4 et 100) pour que l'IA proportionne les meubles correctement."`

**Coût IA :** 0 appel.

### Surcoût IA détection ambiguïté — synthèse

Pour 1 projet de 10 pièces × 2 photos moyenne :
- T1, T2, T5 : 0 appel
- T3 : ~1-2 appels `gpt-4o-mini` (~$0.0002)
- T4 : ~10 appels `gpt-4o-mini` vision (~$0.02-$0.03 si toutes les pièces sont concernées)

**Total surcoût détection : ~$0.02-$0.03 par projet** — négligeable face au coût génération (cf. §8).

---

## 5. Pipeline génération cohérente — Option A (img2img ancre + N angles)

L'objectif : pour une pièce avec `target_visual_count = N`, produire N visuels qui partagent **mêmes meubles, même palette, mêmes finitions**, vus sous des angles différents.

### 5.1 Étape 1 — Sélection de la photo ancre (règle déterministe)

La photo "ancre" est celle dont la position normalisée sur le plan est la plus proche du centroïde géométrique du polygone pièce :

```ts
function selectAnchorPhoto(room: VsRoom, photos: VsPhoto[]): VsPhoto {
  const placed = photos.filter(p => p.room_id === room.id && p.is_placed_on_plan);
  if (placed.length === 1) return placed[0];

  const centroid = computePolygonCentroid(room.polygon); // {x, y} en %
  return placed.reduce((best, p) => {
    const dCurrent = Math.hypot(p.position_x - centroid.x, p.position_y - centroid.y);
    const dBest    = Math.hypot(best.position_x - centroid.x, best.position_y - centroid.y);
    return dCurrent < dBest ? p : best;
  });
}
```

**Justification** : la photo la plus proche du centroïde capture en moyenne le plus de surface visible de la pièce → meilleur input pour générer le visuel "fondateur" qui dictera meubles et palette.

**Tie-break** si distances égales (rare) : prendre la photo avec la plus grande résolution post-resize.

### 5.2 Étape 2 — Génération du visuel ancre (`gpt-image-2`)

Appel **identique au pattern V1** (`visual-generator.ts` actuel) avec photo ancre comme input :

```ts
const anchorResult = await openai.images.edit({
  model: "gpt-image-2",
  image: anchorImageFile,
  prompt: buildVisualPromptAnchor({
    roomType, styleId, surfaceM2, angleDegrees: anchorAngle,
    commentText, userAnswers, structuralInstructions,
  }),
  quality: "high",
  size: "auto",
});
```

Conserve le retry V1 (1 retry après 5s) et la propagation d'erreur explicite (`VisualGenerationOutcome`).

### 5.3 Étape 3 — Extraction de la signature visuelle (`gpt-4o-mini` vision, 1 appel)

Une fois l'ancre générée, on extrait sa "signature textuelle" pour la réinjecter dans les prompts secondaires :

```ts
const sigPrompt = `Décris cette image d'intérieur en 4 sections JSON courtes:
1. "palette": 3-5 couleurs hex dominantes
2. "meubles": liste des meubles principaux avec leur matériau/couleur (ex: "canapé tissu lin beige")
3. "sols_murs": revêtement sol + finition murs (ex: "parquet chêne clair, murs blanc cassé")
4. "lumiere": ambiance lumineuse (ex: "lumière naturelle latérale gauche, chaude")
Réponds STRICTEMENT en JSON valide.`;

const signature = await openai.responses.create({
  model: "gpt-4o-mini",
  input: [
    { role: "system", content: sigPrompt },
    { role: "user", content: [{ type: "input_image", image_url: anchorBase64DataUrl }] },
  ],
});
```

Coût : ~$0.001 par ancre. La signature est mise en cache `vs_visuals.signature_json` pour réutilisation lors de re-génération d'un visuel secondaire (EC-5).

### 5.4 Étape 4 — Génération des N-1 visuels secondaires

Pour chaque photo non-ancre de la pièce (séquentiel ou parallèle selon ressources, voir §8) :

```ts
const secondaryResult = await openai.images.edit({
  model: "gpt-image-2",
  image: secondaryPhotoFile, // photo source de cet angle
  prompt: buildVisualPromptSecondary({
    roomType, styleId, surfaceM2, angleDegrees: secondaryAngle,
    commentText, userAnswers, structuralInstructions,
    anchorSignature: signature, // <— injection cohérence
  }),
  quality: "high",
  size: "auto",
});
```

**Sur le multi-image en input (R1)** : à la date de rédaction (2026-05-04), la doc OpenAI `images.edit` gpt-image-2 documente le paramètre `image` comme acceptant soit un fichier unique, soit un tableau de fichiers. **[À VÉRIFIER docs OpenAI au moment de l'implémentation]** — si tableau accepté, passer `[secondaryPhotoFile, anchorVisualFile]` pour conditionnement visuel direct (cohérence renforcée). Si non accepté → la signature textuelle (étape 3) reste la mécanique de cohérence (dégradation acceptable, fonctionnel).

**Risque P1 documenté** : si `gpt-image-2` ne supporte que image unique → cohérence dépend uniquement de la qualité de la signature textuelle. Mitigation : signature très détaillée (palette hex précise, matériaux nommés, dimensions de meubles).

### 5.5 Garde-fous cohérence

- **Validation post-génération facultative** : un appel `gpt-4o-mini` vision peut comparer chaque visuel secondaire à l'ancre pour scorer la cohérence (palette match, meubles présents). Si score < seuil → flag UI `coherence_warning` mais ne bloque pas. **[À CONFIRMER PAR THOMAS si on active ce check coût supplémentaire ~$0.005/visuel]**
- **Re-génération individuelle (EC-5)** : si Thomas relance un visuel secondaire raté, on récupère `vs_visuals.signature_json` de l'ancre et on relance uniquement l'étape 4 — pas besoin de régénérer l'ancre.

---

## 6. Prompt template gpt-image-2 — exemples concrets

### 6.1 Helpers communs

```ts
type SurfaceQualifier = "compact" | "standard" | "généreux";
function qualifySurface(m2: number): SurfaceQualifier {
  if (m2 < 12) return "compact";
  if (m2 < 25) return "standard";
  return "généreux";
}

function angleDegreesToCardinal(deg: number): string {
  // Convention: 0° = haut du plan = nord, sens horaire
  const sectors = ["du nord", "du nord-est", "de l'est", "du sud-est",
                   "du sud", "du sud-ouest", "de l'ouest", "du nord-ouest"];
  const idx = Math.round(deg / 45) % 8;
  return `vue depuis ${sectors[idx]} de la pièce`;
}

function furnitureGuidance(qualifier: SurfaceQualifier): string {
  return {
    compact:  "compact furniture — 2-seat sofa, side table, optimized layout",
    standard: "standard furniture — 3-seat sofa, coffee table, accent chair",
    généreux: "generous furniture — corner sofa, lounge chair, 120cm coffee table",
  }[qualifier];
}
```

### 6.2 Template "ancre" (1er visuel d'une pièce)

```ts
function buildVisualPromptAnchor(p: AnchorPromptParams): string {
  const style = getStyle(p.styleId);
  const roomLabel = getRoomLabel(p.roomType); // "salon", "salle de bains", etc.
  const surfaceQual = p.surfaceM2 ? qualifySurface(p.surfaceM2) : "standard";
  const surfaceLine = p.surfaceM2
    ? `Surface ${p.surfaceM2}m² (${surfaceQual}) — ${furnitureGuidance(surfaceQual)}.`
    : "";
  const angleLine = p.angleDegrees != null
    ? `Camera angle: ${angleDegreesToCardinal(p.angleDegrees)}.`
    : "";
  const commentLine = p.commentText
    ? `User-specified constraints (MUST respect): ${p.commentText}.`
    : "";
  const answersLine = p.userAnswers?.length
    ? `Clarifications from operator: ${p.userAnswers.join(" | ")}.`
    : "";
  const structuralBlock = p.structuralInstructions
    ? `STRUCTURAL TRANSFORMATIONS — TOP PRIORITY:\n${p.structuralInstructions}`
    : "";

  return `Transform this empty/raw ${roomLabel} into a beautifully designed and fully furnished ${roomLabel} in ${style.name} style.

${structuralBlock}

STYLE DETAILS: ${style.prompt_hint}.

CONTEXT:
${surfaceLine}
${angleLine}
${commentLine}
${answersLine}

STRICT RULES:
1. ${p.structuralInstructions ? "APPLY the structural transformations above as the primary objective." : "KEEP all structural elements EXACTLY (walls, windows, doors, ceiling, floor shape)."}
2. ADD furniture, decorations, lighting consistent with ${style.name} style.
3. Furniture MUST be PROPORTIONAL to surface (${surfaceQual}).
4. Result must be a professional interior design photograph — photorealistic, natural lighting.
5. NO text, watermark, logo, or overlay.
6. Do NOT change camera perspective.
7. Walls freshly finished, floor with appropriate material.
8. Subtle decorative elements appropriate to style.`;
}
```

**Exemple instancié** — Salon, style scandinave, 28 m², angle 135°, commentaire "parquet chêne clair à conserver" :

> Transform this empty/raw salon into a beautifully designed and fully furnished salon in Scandinave style. […] CONTEXT: Surface 28m² (généreux) — generous furniture — corner sofa, lounge chair, 120cm coffee table. Camera angle: vue depuis le sud-est de la pièce. User-specified constraints (MUST respect): parquet chêne clair à conserver. […]

### 6.3 Template "secondaire" (visuels suivants avec contexte ancre)

```ts
function buildVisualPromptSecondary(p: SecondaryPromptParams): string {
  const base = buildVisualPromptAnchor(p); // réutilise tout le base
  const sig = p.anchorSignature;
  const coherenceBlock = `

COHERENCE WITH ANCHOR VISUAL — CRITICAL:
This image is a DIFFERENT ANGLE of the SAME ROOM as a previously generated anchor visual. Furniture, palette and finishes MUST match the anchor exactly.
- Color palette (use these hex tones): ${sig.palette.join(", ")}
- Furniture present in the room (must appear or be visible in this angle if geometrically plausible): ${sig.meubles.join("; ")}
- Floor and walls: ${sig.sols_murs}
- Lighting mood: ${sig.lumiere}

Do NOT introduce new furniture types, new colors, or different finishes. This is a second photo of the same finished room from another viewpoint.`;

  return base + coherenceBlock;
}
```

**Exemple secondaire** (même salon, angle 270°, ancre signature `palette: ["#F5EDE2", "#7B5A3C", "#9CAA8E"]`, meubles `["canapé d'angle tissu lin écru", "table basse chêne 120cm", "fauteuil scandinave bouleau"]`) → bloc cohérence appendé au prompt de base.

### 6.4 Variables typées (TypeScript)

```ts
interface AnchorPromptParams {
  roomType: RoomTypeKey;       // de styles.ts
  styleId: StyleId;            // de styles.ts
  surfaceM2: number | null;    // null déclenche T5
  angleDegrees: number | null; // 0-359, NULL si non placé
  commentText: string | null;  // vs_room_settings.comment_text
  userAnswers: string[];       // réponses T1-T5 concatenées
  structuralInstructions: string | null;
}

interface VisualSignature {
  palette: string[];           // ["#F5EDE2", ...]
  meubles: string[];           // ["canapé...", ...]
  sols_murs: string;
  lumiere: string;
}

interface SecondaryPromptParams extends AnchorPromptParams {
  anchorSignature: VisualSignature;
}
```

**PROMPT_VERSION** : bumper à `v2.0.0` (changement majeur de structure vs V1). Stocker dans `vs_visuals.prompt_version` pour traçabilité.

---

## 7. Gestion des questions bloquantes — flux technique

### 7.1 Séquence chronologique

```
Thomas clique "Générer tous les visuels"
        │
        ▼
┌─ POST /api/vs/visuals/preflight ─────────────────────────────┐
│  1. Charger projet + rooms + settings + photos               │
│  2. Évaluer T1, T2, T5 (sync, déterministe, ~50 ms)          │
│  3. Évaluer T3 si pré-filtre matche (parallèle, ~1-2s)       │
│  4. Évaluer T4 sur pièces ≥ 2 photos (parallèle, ~3-4s)      │
│  5. Pour chaque trigger positif → INSERT vs_visual_questions │
│     (status: asked, answered_at: NULL)                        │
│  6. Renvoyer { questions: [...], blocked: questions.length>0 } │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
[blocked = false] ─────────────────────────▶ Génération directe (§5)
        │
[blocked = true]
        ▼
Frontend ouvre modale chat avec questions reçues
Thomas répond question par question
        │
        ▼
┌─ PATCH /api/vs/visuals/questions/:id ────────────────────────┐
│  UPDATE vs_visual_questions                                   │
│    SET user_answer = ?, answered_at = now()                   │
│    WHERE id = ?                                               │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
Frontend détecte que toutes questions du projet ont answered_at IS NOT NULL
        │
        ▼
Frontend déclenche POST /api/vs/visuals/generate (sans repasser preflight)
        │
        ▼
Backend charge réponses (vs_visual_questions WHERE project_id) → injection prompts
        │
        ▼
Génération §5 lancée
```

### 7.2 Stratégie polling vs renvoi immédiat

**Décision** : renvoi immédiat dans la réponse `preflight`. Pas de polling. Le frontend reçoit la liste complète des questions dans la réponse HTTP du clic Générer (≤ 5s typique).

Justification : la latence preflight (5s max) est compatible avec un loader UI. Polling = complexité backend (table de jobs) sans bénéfice utilisateur ici. Polling sera utile pendant la génération §5 (qui dure 90s+) — pas pour preflight.

### 7.3 Injection des réponses dans les prompts

```ts
function buildUserAnswersForRoom(roomId: string, answers: VsVisualQuestion[]): string[] {
  return answers
    .filter(a => a.room_id === roomId && a.user_answer)
    .map(a => {
      switch (a.trigger_type) {
        case "surface_aberrante":
          // Si Thomas a corrigé la surface, parser le nombre et UPDATE vs_rooms.surface_m2
          // (handled side-effect dans le service, pas dans le prompt)
          return `Confirmed surface: ${a.user_answer}`;
        case "photo_manquante":
          return `Note: ${a.user_answer}`;
        case "conflit_style_commentaire":
          return a.user_answer === "A"
            ? "Show post-structural-transformation state"
            : "Preserve original style without structural changes";
        case "photos_incoherentes":
          return ({A: "Use current state + target furniture",
                   B: "After heavy work only",
                   C: "Fully refurnished"})[a.user_answer] ?? a.user_answer;
        case "surface_inconnue":
          return `Estimated surface: ${a.user_answer}m²`;
        default:
          return a.user_answer;
      }
    });
}
```

Les réponses sont injectées dans le champ `userAnswers` du `AnchorPromptParams` (cf. §6.2).

### 7.4 TTL et soft-cancel

**Règle** : si `answered_at IS NULL` ET `asked_at < now() - INTERVAL '24 hours'` → la job de génération en attente passe en status `awaiting_answer_expired`. Visuels affichent un état "En attente de votre réponse depuis plus de 24h — relancez la génération si toujours pertinent".

Implémentation : cron léger toutes les heures (Vercel cron ou pg_cron) :

```sql
UPDATE vs_visual_jobs
   SET status = 'awaiting_answer_expired'
 WHERE status = 'preflight_blocked'
   AND created_at < now() - INTERVAL '24 hours';
```

**Pas de suppression des questions** — elles restent en BDD pour audit. Thomas peut répondre après 24h, ça relance simplement le flux.

---

## 8. Coûts + latence — estimation par projet type

**Tarifs vérifiés via WebSearch 2026-05-04** (sources : openai.com/api/pricing, tokenmix.ai, wavespeed.ai) :
- `gpt-image-2` quality `high`, 1024×1024 : **~$0.21 / image** (token-based : $8/M input image tokens + $30/M output image tokens + $5/M text)
- `gpt-image-2` Batch API : **~$0.105 / image** (50% off, latence ≤ 24h — non utilisable temps réel)
- `gpt-4o-mini` : ~$0.15/M input, $0.60/M output
- `gpt-4o-mini` vision : facturation image ~85 tokens base + tiles 170 tokens

### 8.1 Projet type — 10 pièces × 2 photos × 2 visuels (= 20 visuels output)

| Phase | Détail | Coût USD | Latence |
|---|---|---|---|
| 0 — Pré-traitement | Sharp local CPU, 20 photos | ~$0.00 | ~5s parallèle |
| 1 — Détection T1/T2/T5 | Déterministe SQL | ~$0.00 | ~50 ms |
| 1 — Détection T3 | ~2 appels gpt-4o-mini (estimé 50% pièces matchent pré-filtre) | ~$0.0005 | ~2s parallèle |
| 1 — Détection T4 | ~10 appels gpt-4o-mini vision (1 par pièce ≥ 2 photos) | ~$0.025 | ~3-4s parallèle |
| 2.b — Visuels ancres | 10 × $0.21 = $2.10 | **$2.10** | 10 × 60s séquentiel par pièce, parallèle inter-pièces 4 max → ~3 min |
| 2.c — Signatures ancres | 10 × $0.001 (gpt-4o-mini vision) | $0.01 | ~3s parallèle |
| 2.d — Visuels secondaires | 10 × $0.21 = $2.10 | **$2.10** | ~3 min (parallèle 4 inter-pièces) |
| 3 — Post-traitement | Validation + storage | ~$0.00 | ~5s |
| **TOTAL** | | **~$4.25 / projet** | **~7 min total** |

**Latence détaillée projet type** : preflight ~5s + génération phase 2 ~6 min (ancres puis secondaires séquentiel par pièce, parallèle 4 pièces simultanées) + post-traitement ~5s = **~7 minutes user-perçu**.

### 8.2 Comparaison vs estimation brief (qui sous-estimait)

Le brief mentionnait `~$1.00 / projet` basé sur `$0.04 / image`. **Réalité 2026 : ~$4.25 / projet** (4× plus cher) car gpt-image-2 high coûte $0.21 et non $0.04.

**✅ DÉCISION THOMAS s29 (2026-05-04)** : **coût accepté à $5/projet maximum** (marge de $0.75 sur le coût estimé $4.25). `quality: high` conservé, `target_visual_count` jusqu'à 5/pièce conservé (cf. spec PM). Pas de levier de réduction activé par défaut. Si coût moyen réel observé dépasse $5/projet sur les 10 premiers projets V2 → arbitrage Thomas pour activer un levier (medium quality OU cap visuels). Dashboard observabilité requis (cf. §9).

Trois leviers de réduction restent disponibles si Thomas change d'avis ultérieurement :

| Levier | Économie | Trade-off |
|---|---|---|
| Passer en `quality: medium` au lieu de `high` | ~50% (-$2.1) | Qualité visuelle inférieure — risque crédibilité Laurent |
| Limiter `target_visual_count` max à 3 (au lieu de 5) | jusqu'à 40% selon pratique | Moins d'angles présentés |
| Batch API pour générations non-urgentes | 50% (-$2.1) | Latence ≤ 24h — incompatible workflow Thomas (live) |

### 8.3 Latence — leviers d'optimisation

| Optimisation | Gain | Risque |
|---|---|---|
| Parallélisation inter-pièces (pool 4) | latence /4 si CPU/quota suffisants | dépasse rate limit OpenAI (cf. §9 risk R4) |
| Streaming UI : afficher les visuels au fur et à mesure (pas attendre les 20) | UX perçue × 2 | implémentation + complexe (Server-Sent Events ou polling jobs) |
| Preflight cache : si Thomas relance sans rien changer, skip preflight | -5s | invalidation cache nécessaire à chaque modif |

### 8.4 Rate limits OpenAI à surveiller

`gpt-image-2` Tier 4 : ~10 images/min selon tier compte. **[À VÉRIFIER docs OpenAI]** — pour 1 projet de 20 visuels avec parallélisme 4, on peut hit le rate limit. Mitigation : token bucket interne côté serveur Versi Studio limitant à 8 requêtes/min vers `images.edit`.

---

## 9. Handoff

### Auto-évaluation gates

| Gate | Critère | Statut |
|---|---|---|
| G1 | 0 [TODO], aucune section vide | PASS |
| G3 | Handoff structuré présent | PASS |
| G10 | 0 langage vague, métriques chiffrées | PASS |
| G12 | Implémentable sans question (signatures TS, SQL, prompts complets) | PASS |
| G13 | 0 donnée inventée — tarifs vérifiés WebSearch, points incertains marqués `[À VÉRIFIER]` ou `[À CONFIRMER PAR THOMAS]` | PASS |
| G15 | 0 placeholder résiduel | PASS |

---

### Handoff → @fullstack

**Mission :** implémenter le pipeline V2 dans `versi-studio/src/lib/vs/` en étendant `visual-generator.ts` et en créant les nouveaux modules.

**Inputs requis :**
- Ce document : `/home/user/Versi/docs/ia/visuals-step-v2-pipeline.md`
- Spec PM : `/home/user/Versi/docs/product/visuals-step-v2-specs.md`
- Wireframes UX (livrés en parallèle par @ux) : `/home/user/Versi/docs/ux/visuals-step-v2-wireframes.md`

**Livrables attendus :**
1. `versi-studio/src/lib/vs/photo-preprocessor.ts` — phase 0 (HEIC→JPG, EXIF, resize, validations)
2. `versi-studio/src/lib/vs/ambiguity-detector.ts` — évaluation T1-T5 + génération `vs_visual_questions`
3. `versi-studio/src/lib/vs/coherent-visual-generator.ts` — phase 2 (ancre + signature + secondaires)
4. Refactor `versi-studio/src/lib/vs/visual-generator.ts` — extraire `buildVisualPromptAnchor` et `buildVisualPromptSecondary` (cf. §6)
5. Migrations SQL — ALTER TABLE `vs_photos` (ajout `taken_at`, `exif_raw`), CREATE TABLE `vs_room_settings`, CREATE TABLE `vs_visual_questions`, CREATE TABLE `vs_visual_jobs` (status preflight)
6. API routes : `POST /api/vs/visuals/preflight`, `PATCH /api/vs/visuals/questions/:id`, `POST /api/vs/visuals/generate`
7. Token bucket rate limit gpt-image-2 (8 req/min) côté serveur

**Modifications hors `src/lib/ai/` que @fullstack doit appliquer :**
- `versi-studio/src/db/schema.ts` (Drizzle) — refléter les nouvelles tables
- `versi-studio/src/types.ts` — ajouter `VisualSignature`, `AmbiguityQuestion`, `VsRoomSettings`
- Composant frontend modale chat questions (à voir avec wireframes UX)

**Points d'attention :**
- **gpt-image-2 exclusivement** — aucun fallback de modèle (P0 fondateur s27). Si gpt-image-2 indisponible → propager l'erreur OpenAI explicite (cf. pattern V1 `VisualGenerationOutcome.error`).
- **PROMPT_VERSION = `v2.0.0`** — bump majeur. Stocker dans `vs_visuals.prompt_version`.
- **Regression testing** — avant déploiement, run les 3 test cases de `prompt-library.md` (à créer / mettre à jour par @ia en complément si nécessaire) sur la V1 ET la V2 pour comparer outputs.
- Phase 0 (pré-traitement) doit être **idempotente** — relancer sur une photo déjà normalisée doit être no-op.

---

### Handoff → @qa

**Mission :** scénarios de tests E2E couvrant chaque trigger T1-T5 + cohérence inter-visuels + edge cases EC-1..EC-5.

**Inputs requis :**
- Ce document
- Spec PM `docs/product/visuals-step-v2-specs.md` (section 7 Edge Cases)

**Livrables attendus :**
- `docs/qa/visuals-step-v2-test-plan.md` — scénarios test par trigger, par edge case, par état UI

**Scénarios prioritaires :**
1. T1 surface aberrante : créer projet avec pièce salon 2 m² → vérifier modale apparaît avec bonne question
2. T2 photo manquante : `target_visual_count = 3` mais 0 photo → vérifier blocage + question
3. T3 conflit : commentaire "abattre le mur" + style classique → vérifier appel gpt-4o-mini + question
4. T4 incohérence : 2 photos même pièce une jour une nuit → vérifier détection + question
5. T5 surface inconnue : pièce avec `surface_m2 = NULL` + `target_visual_count = 1` → vérifier question
6. Cohérence visuelle : générer 3 visuels pour 1 salon → vérifier palette + meubles cohérents (LLM-as-judge gpt-4o-mini score ≥ 0.8)
7. EC-5 : un visuel échoue parmi 3 → vérifier les 2 réussis sont conservés et bouton "Régénérer ce visuel" relance UNIQUEMENT le visuel raté

---

### Risques à escalader à Thomas

| # | Risque | Sévérité | Action requise |
|---|---|---|---|
| R1 | `gpt-image-2 images.edit` peut ne pas accepter tableau d'images en input — cohérence ancre→secondaires retombe sur description verbale (qualité moindre) | P1 | Vérifier doc OpenAI à l'implémentation. Si pas multi-image → accepter dégradation ou attendre version compatible |
| R2 | Coût réel **~$4.25/projet** (vs $1 estimé brief) car tarifs gpt-image-2 vérifiés à $0.21/image high | **P0 business** | **Confirmer le coût acceptable** ou arbitrer (medium quality, cap visuels à 3, ou autre) |
| R3 | Si gpt-image-2 inaccessible (rate limit, panne) → bloquer (no fallback) propager erreur. Cf. fix s29 propagation erreur | P0 | OK avec préférence fondateur — confirmer par Thomas que workflow utilisateur expose bien l'erreur |
| R4 | Rate limit OpenAI gpt-image-2 (~10 img/min selon tier) — projet 20 visuels parallèle 4 peut hit le cap | P1 | Vérifier tier compte OpenAI Versi Studio. Token bucket 8 req/min recommandé |
| R5 | Threshold flou (variance Laplacien = 100) à calibrer | P2 | Calibrer sur 20-30 photos test Thomas avant freeze |

---

**Fichiers produits par cette session :**
- `/home/user/Versi/docs/ia/visuals-step-v2-pipeline.md` (ce fichier)

Sources WebSearch tarifs gpt-image-2 :
- [OpenAI API Pricing](https://openai.com/api/pricing/)
- [GPT Image 2 Pricing Guide — TokenMix](https://tokenmix.ai/blog/gpt-image-2-pricing-cost-signals-2026)
- [GPT Image 2 Pricing 2026 — WaveSpeedAI](https://wavespeed.ai/blog/posts/gpt-image-2-pricing-2026/)
