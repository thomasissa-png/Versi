# Prompt library Versi Studio

Versionnage sémantique. Chaque prompt = objectif + hyperparamètres + contrat I/O + test cases associés. Toute modification bump la version.

---

## CANONICAL_PROMPT_V1 (s25)

**Version** : 1.0 · **Date** : 2026-04-22 · **Agent** : @ia · **Statut** : draft validé, reality check E2E en attente (Phase 2 step 3)

### Objectif

Canonicaliser un plan architectural hétérogène (scan médiocre, PDF vectoriel propre, croquis manuscrit) en une version épurée noir sur blanc, conservant fidèlement la géométrie des murs et ouvertures, afin que le pipeline d'extraction aval (GPT-4.1 vision → passes + snap OCR) opère sur un input homogène. Prépass IA image-to-image.

### Modèle cible

- **Modèle** : `gpt-image-1`
- **API** : `openai.images.edit()` — **JAMAIS** `openai.responses.create()` (pattern s22 critique, erreur silencieuse en prod)
- **Input buffer** : via `toFile(buf, 'plan.png', { type: 'image/png' })` du SDK OpenAI

### Hyperparamètres

| Paramètre | Valeur | Justification |
|---|---|---|
| `size` | `"2048x2048"` | Max gpt-image-1. Downsample avant si input > 2048 largeur. A4 paysage cible = 2048×1450 après crop fond blanc. |
| `quality` | `"high"` | Nécessaire pour préservation géométrique fine (angles murs, ouvertures). Coût ~$0.04/plan acceptable. |
| `output_format` | `"png"` | Lossless, indispensable pour pipeline extract aval. |
| `background` | `"opaque"` | Fond blanc pur obligatoire. |
| `n` | `1` | Un seul output (pas de sélection best-of, non supportée en `images.edit`). |

### Prompt complet (texte définitif)

```
Redraw this architectural floor plan as a clean, precise vector-style technical diagram. Preserve the source geometry exactly — this is a faithful redraw, NOT a creative reinterpretation.

#1 PRIORITY — GEOMETRIC FIDELITY (MUST PRESERVE):
- Exact wall positions (no wall may move more than 3 pixels from source)
- Exact wall angles (preserve oblique walls, do not force 90°)
- Exact room shapes, proportions and relative sizes
- Exact door openings (gaps in walls, same position and width)
- Exact window positions (same wall segment, same length)
- If the source plan is tilted up to 5°, straighten it to horizontal. Do NOT rotate if tilt > 5°.

#2 STYLE (APPLY UNIFORMLY):
- Pure white background (#FFFFFF), fill the entire canvas
- Pure black walls (#000000), uniform 6-pixel thickness
- Doors rendered as thin black arc lines (1-pixel)
- Windows rendered as two thin parallel black lines (1-pixel each)
- Keep main room labels if clearly readable in source (e.g. "Salon", "Cuisine", "Chambre 1") in simple sans-serif black text, 14pt, centered in each room. Skip labels if source text is illegible.

#3 STRIP (MUST REMOVE — negative rules):
- no dimensions, no measurements, no numbers along walls
- no hatching, no cross-hatching, no texture fills
- no furniture (no beds, no sofas, no tables, no appliances, no plumbing fixtures)
- no title block, no scale bar, no north arrow, no compass
- no legend, no annotations, no arrows, no callouts
- no grid, no construction lines
- ZERO color, ZERO grayscale, ZERO shading — pure black and white only
- no drop shadows, no 3D effects, no gradients

#4 ABSOLUTE PROHIBITIONS:
- DO NOT invent rooms that are not in the source plan
- DO NOT invent walls that are not in the source plan
- DO NOT close openings that exist in the source
- DO NOT merge rooms that are separate in the source
- DO NOT split rooms that are unified in the source
- If a zone is ambiguous in the source, keep it ambiguous. Do not guess.

Output: A single top-down 2D floor plan, orthogonal projection, A4 landscape proportions (ratio ~1.41:1), filling the canvas with minimal white margin (max 50px border).
```

### Variables de substitution

Aucune en v1. Le prompt est statique. L'input dynamique est uniquement le buffer image.

Si v2 nécessaire (ex : plan multi-étages, plan avec cotations à préserver), introduire système de templating avec placeholders `{{FLOOR_LABEL}}`, `{{PRESERVE_DIMENSIONS}}`.

### Output attendu

- Format : PNG 2048×2048, fond blanc pur, murs noirs uniformes
- Ratio contenu utile : A4 paysage (~1.41:1), plan recadré dans les bords avec marge ≤ 50px
- Taille fichier typique : 200-500 KB
- Pas de texte parasite (ni cartouche, ni cotations)
- Labels de pièces présents SI lisibles en source

### Gates qualité (sur output)

Binary checks appliqués par pipeline aval avant acceptation :
- G1 : fond >= 95% blanc pur
- G2 : murs détectables (≥ 4 segments rectilignes > 100px)
- G3 : au moins 1 ouverture détectée (porte ou fenêtre)
- G4 : pas de bloc texte > 100×100px hors d'une pièce (cartouche résiduelle)

Si ≥ 2 gates FAIL → fallback vers plan original, flag `canonical_fallback=true` dans logs.

### Évolution versions futures

- **v2** (si v1 < 80% success) : ajouter few-shot avec 2 images référence (bon vs mauvais output). Nécessite passage à `responses.create()` multi-modal ou mock via URLs publiques.
- **v3** (si géométrie drift > 3px récurrent) : passer à pipeline 2 appels — (1) binarisation stricte, (2) nettoyage annotations. Coût ~$0.08/plan.
- **v4** (si labels perdus) : ajouter pré-extraction OCR des labels, injection dans prompt comme liste à réintégrer.

---

## Prompts antérieurs (extract pipeline)

Documentés dans `docs/ia/patterns-post-process.md` (s23). Non modifiés en s25 — CANONICAL_PROMPT_V1 s'insère EN AMONT, pas en remplacement.
