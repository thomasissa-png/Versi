/**
 * CANONICAL_PROMPT_V1 — Versi Studio s25
 *
 * Prompt de canonicalisation d'un plan architectural hétérogène en version
 * épurée noir sur blanc, préservant fidèlement la géométrie des murs et
 * ouvertures. Prépass IA image-to-image consommée par `plan-canonicalizer.ts`.
 *
 * Source validée : docs/ia/prompt-library.md § CANONICAL_PROMPT_V1.
 * Modèle cible : gpt-image-2 via openai.images.edit() (PAS responses.create()).
 *
 * Décision Thomas s27 : aucun fallback (ni autre modèle, ni pipeline sharp local).
 * Si gpt-image-2 échoue → on retourne le buffer original avec fallback=true,
 * et le pipeline aval continue sur le PDF brut. "Je veux que ça marche bien
 * c'est tout" — pas de béquille déterministe qui masque les vrais échecs.
 *
 * Toute modification du texte DOIT bumper CANONICAL_PROMPT_VERSION.
 */

export const CANONICAL_PROMPT_VERSION = "1.1" as const;

export const CANONICAL_PROMPT_V1 = `Redraw this architectural floor plan as a clean, precise vector-style technical diagram. Preserve the source geometry exactly — this is a faithful redraw, NOT a creative reinterpretation.

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

Output: A single top-down 2D floor plan, orthogonal projection, A4 landscape proportions (ratio ~1.41:1), filling the canvas with minimal white margin (max 50px border).`;

/**
 * Modèle unique : gpt-image-2 (lancé 2026-04-21, GA Azure & OpenAI direct).
 *
 * Décision fondateur Thomas s27 : aucun fallback de modèle. gpt-image-1 est
 * deprecated (retrait DALL-E 2/3 le 2026-05-12) et le projet doit utiliser
 * gpt-image-2 exclusivement. Si l'org n'est pas éligible → erreur visible,
 * on diagnostique et on corrige côté OpenAI org settings, pas en prod.
 *
 * Source : OpenAI docs avril 2026 — gpt-image-2 supporte size flexible
 * (multiples de 16, ≤ 3840px, aspect ratio ≤ 3:1, pixels 655k-8.3M),
 * quality low/medium/high/auto, output_format png/jpeg/webp,
 * background opaque/auto (PAS de transparent).
 */
export const CANONICAL_PRIMARY_MODEL = "gpt-image-2" as const;

/**
 * Hyperparamètres images.edit() pour gpt-image-2.
 *
 * - size 1536×1024 : ratio 3:2 (cohérent A4 landscape), multiples de 16,
 *   pixels 1.572M (entre 655k et 8.29M) → OK.
 * - quality high : qualité maximale (le canonical est consommé par GPT-4.1
 *   Vision aval, on ne peut pas se permettre de pertes de détail).
 * - output_format png : format lossless (WebP introduirait du bruit sur
 *   les traits 1-pixel des arcs de portes / fenêtres).
 * - background opaque : gpt-image-2 ne supporte PAS transparent (breaking).
 * - n 1 : un seul candidat (pas de variation/scoring côté client).
 */
export const CANONICAL_IMAGE_PARAMS = {
  model: CANONICAL_PRIMARY_MODEL,
  size: "1536x1024" as const,
  quality: "high" as const,
  output_format: "png" as const,
  background: "opaque" as const,
  n: 1,
};

/** Downsample max width avant envoi à l'API (le SDK accepte jusqu'à 1536 en sortie). */
export const CANONICAL_DOWNSAMPLE_MAX_WIDTH = 2048;
