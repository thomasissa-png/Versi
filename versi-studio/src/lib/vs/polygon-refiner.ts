/**
 * Passe 2 du pipeline extraction — Raffinement polygone par crop.
 *
 * Strategie : pour chaque piece identifiee en passe 1, crop l'image
 * autour de sa bbox avec marge, puis appel GPT-4.1 vision dedie
 * sur le crop pour tracer le polygone precis.
 *
 * Coordonnees : crop-local (0-100% du crop) -> plan-global (0-100% de l'image source).
 *
 * versi-s22 — 2-pass polygon refinement.
 */
import { z } from "zod";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import sharp from "sharp";

// ─── Schema polygone precis (4-12 points) ─────────────────────────
const RefinedPolygonSchema = z.object({
  polygon: z.array(z.object({
    x_percent: z.number().min(0).max(100),
    y_percent: z.number().min(0).max(100),
  })).min(4).max(12),
  confidence: z.number().min(0).max(1),
  notes: z.string().nullable(),
});

type RefinedPolygon = z.infer<typeof RefinedPolygonSchema>;

export type BoundingBox = {
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
};

// ─── Marge de crop (%) ────────────────────────────────────────────
const CROP_MARGIN_PCT = 15;

/**
 * Passe 2 : affine le polygone d'UNE piece en zoomant sur son crop.
 *
 * @param imageBuffer  PNG du plan complet (Buffer)
 * @param imageWidth   largeur image source (px)
 * @param imageHeight  hauteur image source (px)
 * @param roomName     nom de la piece (ex: "Chambre 03")
 * @param bbox         bbox approximative passe 1 (plan-global %)
 * @param client       instance OpenAI
 * @returns polygone precis en coordonnees plan-global (%), ou null si echec/low confidence
 */
export async function refineRoomPolygon(
  imageBuffer: Buffer,
  imageWidth: number,
  imageHeight: number,
  roomName: string,
  bbox: BoundingBox,
  client: OpenAI,
): Promise<Array<{ x_percent: number; y_percent: number }> | null> {
  // ── 1. Calculer le crop avec marge ──────────────────────────────
  const cropXPct = Math.max(0, bbox.x_percent - CROP_MARGIN_PCT);
  const cropYPct = Math.max(0, bbox.y_percent - CROP_MARGIN_PCT);
  const cropEndXPct = Math.min(100, bbox.x_percent + bbox.width_percent + CROP_MARGIN_PCT);
  const cropEndYPct = Math.min(100, bbox.y_percent + bbox.height_percent + CROP_MARGIN_PCT);
  const cropWPct = cropEndXPct - cropXPct;
  const cropHPct = cropEndYPct - cropYPct;

  // Conversion % -> px
  const cropX = Math.floor((cropXPct / 100) * imageWidth);
  const cropY = Math.floor((cropYPct / 100) * imageHeight);
  let cropW = Math.floor((cropWPct / 100) * imageWidth);
  let cropH = Math.floor((cropHPct / 100) * imageHeight);

  // Garantir dimensions > 0 et dans les limites de l'image
  cropW = Math.max(1, Math.min(cropW, imageWidth - cropX));
  cropH = Math.max(1, Math.min(cropH, imageHeight - cropY));

  // ── 2. Crop via sharp ───────────────────────────────────────────
  const croppedBuffer = await sharp(imageBuffer)
    .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
    .png()
    .toBuffer();

  const base64 = croppedBuffer.toString("base64");
  const dataUrl = `data:image/png;base64,${base64}`;

  // ── 3. Appel GPT-4.1 vision sur le crop ─────────────────────────
  const systemPrompt = `You are a precise floor plan polygon tracer. The image shows a CROPPED section of a floor plan, zoomed on a SINGLE room named "${roomName}".

Your task: trace the EXACT polygon outline of this room's floor area, following the INNER face of its walls.

COORDINATE SYSTEM: coordinates are percentages of THIS CROPPED IMAGE (0-100).
x=0 is the LEFT edge of the crop. x=100 is the RIGHT edge.
y=0 is the TOP edge of the crop. y=100 is the BOTTOM edge.

RULES:
1. The target room "${roomName}" is approximately CENTERED in the crop.
2. Trace the polygon CLOCKWISE starting from the top-left corner of the room.
3. Place vertices AT WALL CORNERS (where two walls meet, inner face).
4. For rectangular rooms: exactly 4 vertices. For L-shaped or irregular: 5-8 vertices. Up to 12 for complex shapes.
5. Walls are THICK SOLID lines (black/grey fills). Partitions are thin lines separating rooms.
6. DO NOT extend the polygon into neighboring rooms visible in the crop margins.
7. DO NOT extend into outdoor hatched zones (terrace, balcony, garden).
8. The polygon edges must align precisely with wall INNER FACES — where the floor begins.
9. Maximum precision: aim for < 1% error relative to the true wall position.
10. If the room shape is clearly rectangular, use exactly 4 vertices placed precisely at the 4 corners.

confidence: 0.0-1.0, your certainty that the polygon accurately follows the walls.
notes: brief explanation if ambiguous (e.g., "south wall unclear, estimated").

OUTPUT: valid JSON matching the schema. No text outside JSON.`;

  const completion = await client.chat.completions.parse({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: `Trace the precise polygon of the room "${roomName}" in this cropped floor plan.` },
          { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
        ],
      },
    ],
    response_format: zodResponseFormat(RefinedPolygonSchema, "refined_polygon"),
    max_tokens: 800,
  });

  const result = completion.choices[0]?.message.parsed;
  if (!result) {
    console.warn(`[polygon-refiner] No parsed result for ${roomName}`);
    return null;
  }
  if (result.confidence < 0.4) {
    console.warn(`[polygon-refiner] Low confidence for ${roomName}: ${result.confidence}, notes: ${result.notes}`);
    return null;
  }

  // ── 4. Convertir coordonnees crop-local → plan-global ───────────
  const globalPolygon = result.polygon.map(v => ({
    x_percent: cropXPct + (v.x_percent / 100) * cropWPct,
    y_percent: cropYPct + (v.y_percent / 100) * cropHPct,
  }));

  console.log(`[polygon-refiner] ${roomName}: confidence=${result.confidence.toFixed(2)}, ${globalPolygon.length} pts${result.notes ? `, notes: ${result.notes}` : ""}`);

  return globalPolygon;
}
