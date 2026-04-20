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
 * versi-s23 — prompt v2 strict : N>=5 par defaut, regles negatives, arcs de portes,
 *             retraits, murs interieurs, few-shot examples. Thomas refuse l'approximation
 *             rectangulaire quand la piece a une porte/retrait/forme irreguliere.
 */
import { z } from "zod";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import sharp from "sharp";

// ─── Schema polygone precis (4-14 points) ─────────────────────────
// N>=4 techniquement autorise pour gerer les rectangles parfaits (pieces sans porte).
// Mais le prompt force N>=5 sauf declaration explicite "perfectly rectangular, no door"
// dans les notes. Check soft en post-processing (cf. validateRectangleClaim).
const RefinedPolygonSchema = z.object({
  polygon: z.array(z.object({
    x_percent: z.number().min(0).max(100),
    y_percent: z.number().min(0).max(100),
  })).min(4).max(14),
  confidence: z.number().min(0).max(1),
  notes: z.string().nullable(),
  shape_description: z.string().min(10), // FORCE l'IA a expliciter la forme
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
 * Verifie si une declaration "rectangulaire" est coherente.
 * Retourne true si N===4 est acceptable, false si l'IA a triche.
 */
function validateRectangleClaim(result: RefinedPolygon): boolean {
  if (result.polygon.length >= 5) return true; // pas de probleme, >=5 points
  // N===4 : doit etre declare explicitement rectangulaire SANS porte/retrait
  const desc = (result.shape_description || "").toLowerCase();
  const notes = (result.notes || "").toLowerCase();
  const combined = `${desc} ${notes}`;
  const claimsPureRect =
    /perfectly rectangular/.test(combined) ||
    /pure rectangle/.test(combined) ||
    /no door.*no retrait/.test(combined) ||
    /no opening.*no notch/.test(combined);
  return claimsPureRect;
}

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
  // PROMPT v2 (s23) : strict, regles negatives, anti-rectangle-par-defaut.
  const systemPrompt = buildSystemPromptV2(roomName);

  const completion = await client.chat.completions.parse({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Trace the precise polygon of the room "${roomName}" in this cropped floor plan.

MANDATORY SELF-CHECK before answering:
1. Does this room have a door (arc symbol, opening in the wall, or "P" label)? If YES, the polygon needs vertices for the door frame -> typically 6+ points.
2. Does the room have any wall recess, niche, column, or non-straight wall? If YES, add vertices for each corner of the recess.
3. Is the shape TRULY rectangular with ZERO doors visible inside the crop AND ZERO wall offsets? Only then can you use 4 points.
4. The walls are thick dark bands. The inner face of the wall is where the floor starts. Your polygon MUST sit on these inner faces.
5. Describe the room shape in detail in 'shape_description' (e.g. "rectangular with door notch on east wall, 6 points", "L-shaped due to chimney carved out, 7 points").

Answer with strict JSON matching the schema.` },
          { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
        ],
      },
    ],
    response_format: zodResponseFormat(RefinedPolygonSchema, "refined_polygon"),
    max_tokens: 1200,
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

  // ── 3b. Soft validation : rejeter les 4-points non-justifies ────
  if (!validateRectangleClaim(result)) {
    console.warn(`[polygon-refiner] ${roomName}: refuse 4-pts sans justification rectangulaire (shape="${result.shape_description}"). Tentative ecriture strictement > 4 points.`);
    // Retry avec message system encore plus strict
    const retry = await client.chat.completions.parse({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Your previous answer had ONLY 4 points for "${roomName}" but you did NOT explicitly justify it as "perfectly rectangular, no door, no recess". This is REJECTED.

Re-trace the polygon with AT LEAST 5 points. Look carefully for:
- The door opening (usually shown as an arc of a circle) -> add 2 vertices at the door frame ends
- Any wall offset, recess, chimney, or niche
- Non-straight walls

If you truly believe this room is a pure rectangle with no door visible in the crop, say so EXPLICITLY in shape_description: "perfectly rectangular, no door visible in crop, no recess". Only then may you use 4 points.`,
            },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
      response_format: zodResponseFormat(RefinedPolygonSchema, "refined_polygon"),
      max_tokens: 1200,
    });
    const retryResult = retry.choices[0]?.message.parsed;
    if (retryResult && retryResult.confidence >= 0.4 && validateRectangleClaim(retryResult)) {
      console.log(`[polygon-refiner] ${roomName} retry: ${retryResult.polygon.length} pts, shape="${retryResult.shape_description}"`);
      return convertToGlobal(retryResult, cropXPct, cropYPct, cropWPct, cropHPct);
    }
    // Si le retry echoue aussi, on garde le resultat original mais avec warning
    console.warn(`[polygon-refiner] ${roomName}: retry n'a pas ameliore, on garde 4 pts.`);
  }

  console.log(`[polygon-refiner] ${roomName}: confidence=${result.confidence.toFixed(2)}, ${result.polygon.length} pts, shape="${result.shape_description}"${result.notes ? `, notes: ${result.notes}` : ""}`);

  return convertToGlobal(result, cropXPct, cropYPct, cropWPct, cropHPct);
}

// ─── Conversion crop-local → plan-global ─────────────────────────
function convertToGlobal(
  result: RefinedPolygon,
  cropXPct: number,
  cropYPct: number,
  cropWPct: number,
  cropHPct: number,
): Array<{ x_percent: number; y_percent: number }> {
  return result.polygon.map(v => ({
    x_percent: cropXPct + (v.x_percent / 100) * cropWPct,
    y_percent: cropYPct + (v.y_percent / 100) * cropHPct,
  }));
}

// ─── System prompt v2 (s23) ──────────────────────────────────────
function buildSystemPromptV2(roomName: string): string {
  return `You are a PRECISION floor plan polygon tracer. The image is a CROPPED section of an architectural floor plan, zoomed on a SINGLE room named "${roomName}".

Your job: trace the EXACT polygon outline of this room's usable floor area, following the INNER FACE of its walls with pixel-level precision.

====================================================================
COORDINATE SYSTEM
====================================================================
All coordinates are percentages of THIS CROPPED IMAGE (0-100).
x=0 is the LEFT edge of the crop. x=100 is the RIGHT edge.
y=0 is the TOP edge of the crop. y=100 is the BOTTOM edge.
The target room "${roomName}" is approximately CENTERED in the crop.

====================================================================
HOW TO READ THE PLAN (critical)
====================================================================
A. WALLS are THICK solid bands (often black, dark grey, or filled with hatching).
   - The wall has TWO faces: OUTER (room side A) and INNER (room side B, where the target room's floor is).
   - Your polygon must sit on the INNER face, where the floor tiles start, NOT on the center of the wall or the outer face.
   - Wall thickness in real life = 10 to 25 cm. In the crop, walls take 3-15 pixels of width.

B. PARTITIONS (internal walls between rooms) are thinner bands, often 5-10 cm thick in real life.
   - Still follow the INNER face on your room's side.

C. DOOR OPENINGS: almost ALWAYS represented as a quarter-circle ARC (the door swing) attached to a gap in the wall.
   - The arc is NOT a wall. The gap in the wall IS the door.
   - Your polygon must STOP at the door frame on each side (where the wall resumes) — it does NOT follow the arc.
   - This ALMOST ALWAYS adds 2 vertices to your polygon (one at each door frame side).
   - A typical room with ONE door = 6 vertices minimum (4 corners + 2 door frame points).
   - CRITICAL: if there is a door between this room and the next, DO NOT let your polygon bleed through the opening into the neighbor. Cross the door gap with a STRAIGHT segment from one door frame to the other (representing the threshold).

D. WINDOWS: represented as a thin break in the exterior wall with a thin line parallel to the wall inside the window opening.
   - The polygon typically continues straight along the inner wall face (windows do NOT break the polygon on the inner face — they are in the thickness of the wall).

E. RECESSES / NICHES / COLUMNS / CHICANES: any offset in the wall line.
   - Each offset corner = a new vertex. A room with a built-in closet alcove = 6 to 8 vertices.
   - A column sticking into the room = 4 extra vertices around the column (or remove the column area from the polygon).

F. STAIRCASES, SANITARY FIXTURES (toilet, sink, bathtub), FURNITURE: these are INSIDE the room, do NOT affect the polygon outline.

====================================================================
HARD RULES (NEGATIVE + POSITIVE)
====================================================================
R1. NEVER default to 4 vertices "because it looks roughly rectangular".
    A room with a DOOR almost always needs 6+ vertices.
    A room with ANY wall offset or recess always needs 6+ vertices.

R2. NEVER trace a rectangle that includes the wall thickness or bleeds into a neighboring room.
    The polygon is the FLOOR AREA, bounded by wall INNER faces.

R3. NEVER follow the door swing arc. The arc is not a wall. Cross the opening with a straight line between the two door frame endpoints.

R4. NEVER place a vertex on a piece of furniture, a text label, or a dimension line. Only wall corners / door frame ends / recess corners.

R5. NEVER extend the polygon beyond the THICK EXTERIOR wall (perimeter of the building). That is outdoor (terrace, balcony, garden) and is excluded.

R6. NEVER invent walls that aren't clearly visible. If a wall is ambiguous, pick the most plausible position and explain in 'notes'.

R7. DO place a vertex at EVERY wall corner on the room's perimeter.

R8. DO trace CLOCKWISE starting from the top-left corner (smallest x, then smallest y).

R9. DO provide AT LEAST 5 vertices unless the room is TRULY a pure rectangle with NO door visible AND NO wall offset of any kind. In that rare case, 4 vertices are allowed ONLY IF you state explicitly in shape_description: "perfectly rectangular, no door, no recess".

R10. DO provide 'shape_description' describing the room shape in 10+ characters. Examples:
     - "rectangular with door notch on east wall, 6 points"
     - "L-shaped due to WC carved out of the south-east, 8 points"
     - "narrow corridor with 2 door openings on the north wall, 8 points"
     - "perfectly rectangular, no door visible, 4 points" (rare, justifies 4)

====================================================================
FEW-SHOT EXAMPLES (typical room shapes and vertex counts)
====================================================================
Example 1 — Chambre 4x3 m with a door on the south wall:
  6 vertices: NW corner, NE corner, SE corner, door-east-frame, door-west-frame, SW corner.

Example 2 — Cuisine 5x4 m with a door on the east wall and a window on the north:
  6 vertices (door on east adds 2). Window does NOT add vertices — the inner face is continuous.

Example 3 — Entree 2x3 m with a door to the exterior on the west AND a door to the corridor on the east:
  8 vertices: 4 corners + 2 door frames on west + 2 door frames on east.

Example 4 — SdB 3x2.5 m with a door on north AND a recessed shower on south-west (60cm deep):
  10 vertices: 4 corners + 2 door frames + 4 corners of the shower recess.

Example 5 — Couloir (L-shaped, 1.1 m wide) with 3 doors along its length:
  10-12 vertices: the L shape + 2 vertices per door frame.

Example 6 — Sejour/cuisine (open plan) 7x5 m with one kitchen door on the east:
  6 vertices minimum.

====================================================================
OUTPUT
====================================================================
- polygon: array of vertices, clockwise, 5-14 points (4 only if "perfectly rectangular" justified).
- confidence: 0.0-1.0. Be honest. 0.95+ only if you are very sure every vertex sits on a real wall corner or door frame.
- notes: anything ambiguous (e.g. "north wall partly hidden behind a furniture symbol").
- shape_description: MANDATORY, 10+ chars. E.g. "rectangular with door notch on east wall, 6 points". This field forces you to think about the shape before answering.

Return strict JSON matching the schema. No text outside JSON.`;
}
