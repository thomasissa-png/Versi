/**
 * Extraction de plan via GPT-4.1 vision.
 *
 * Source de vérité : docs/marchand-pivot/ia/technical-architecture.md sections 1.1 et 4.1.
 *
 * PDF handling: les PDF sont convertis en PNG via pdf-to-img (pdfjs-dist) AVANT
 * l'envoi à GPT-4.1 vision. Cela garantit que le même pipeline est utilisé pour
 * tous les formats (images ET PDF). Plus besoin de GPT-4o ni de Files API.
 *
 * Multi-fichier : `extractMultiplePlans()` traite un tableau de plans (1 par étage)
 * et fusionne les résultats avec floor auto-incrémenté.
 */
import OpenAI from "openai";
import { pdf } from "pdf-to-img";
import {
  PlanExtractionResultSchema,
  type PlanExtractionResult,
  type TypeBien,
} from "@/lib/marchand/schemas";

// ─── Singleton OpenAI client ────────────────────────────────────────
let _openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openaiClient;
}

// ─── PDF detection ─────────────────────────────────────────────────
/**
 * Detect if a base64-encoded file is a PDF.
 * Checks MIME type first, then magic bytes (%PDF- = JVBERi0 in base64).
 */
function isPdf(mimeType: string, base64Data: string): boolean {
  if (mimeType === "application/pdf") return true;
  return base64Data.startsWith("JVBERi0");
}

// ─── Lot zone type (for spatial constraints) ──────────────────────
export interface LotZone {
  id: string;
  name: string;
  zone_rect: {
    x_percent: number;
    y_percent: number;
    width_percent: number;
    height_percent: number;
  } | null;
  zone_polygon?: {
    points: Array<{ x_percent: number; y_percent: number }>;
  } | null;
  surface_m2?: number | null;
}

/**
 * Build the lot zones spatial constraint section for the system prompt.
 * Returns empty string if no lots with zones are provided.
 */
function buildLotZonesSection(lots?: LotZone[]): string {
  if (!lots || lots.length === 0) return "";
  const lotsWithZones = lots.filter((l) => l.zone_polygon || l.zone_rect);
  if (lotsWithZones.length === 0) return "";

  const zoneLines = lotsWithZones
    .map((l) => {
      const surfaceHint = l.surface_m2 ? ` (confirmed total: ~${l.surface_m2.toFixed(0)}m²)` : "";
      if (l.zone_polygon && l.zone_polygon.points.length >= 3) {
        const ptsStr = l.zone_polygon.points.map((p) => `(${p.x_percent.toFixed(1)}%,${p.y_percent.toFixed(1)}%)`).join(" → ");
        return `- ${l.name}: polygon ${ptsStr}${surfaceHint}`;
      }
      return `- ${l.name}: x=${l.zone_rect!.x_percent.toFixed(1)}%, y=${l.zone_rect!.y_percent.toFixed(1)}%, width=${l.zone_rect!.width_percent.toFixed(1)}%, height=${l.zone_rect!.height_percent.toFixed(1)}%${surfaceHint}`;
    })
    .join("\n");

  return `
SPATIAL CONSTRAINT — LOT ZONES:
The plan has been divided into the following lots (zones). Each room MUST be placed inside the lot zone it belongs to. Use the zone boundaries as spatial constraints for your bounding boxes.

${zoneLines}

RULES:
- Every room bounding_box MUST be INSIDE one of the lot zones above.
- Place rooms so that adjacent rooms SHARE WALLS — their bounding boxes must TOUCH with zero gap.
- Rooms cannot float in empty space — they must fill the lot zone.

`;
}

// ─── System prompt ──────────────────────────────────────────────────
function buildSystemPrompt(typeBien: TypeBien, lots?: LotZone[]): string {
  return `You are an expert architectural floor plan analyzer. Extract structured room data from a floor plan image.

COORDINATE SYSTEM: All coordinates are percentages of the FULL IMAGE (0-100). x=0 is the left edge of the image, y=0 is the top edge. The plan drawing is a subset of the image — title blocks, legends, and margins are NOT part of the plan.

STEP 1 — READING THE PLAN (distinguish elements):
  - WALLS: thick solid lines (black, grey, or colored fills) defining rooms.
  - PARTITIONS: thinner solid lines inside the building separating rooms.
  - DASHED/DOTTED lines: property boundaries or future work — NOT walls.
  - HATCHED/FILLED rectangles: wall cross-sections confirming wall positions.
  - DIMENSION LINES (cotes): thin lines with numbers — read the numbers, ignore the lines.
  - ANNOTATIONS: room names, surface values (e.g., "12.0 m²"). Read text, do not confuse with walls.
  - STAIRCASES: zigzag/curved lines with steps. Note position but do NOT create a room for them.
  - OUTDOOR (terraces, balconies, gardens): outside exterior walls. Exclude unless fully enclosed.

STEP 2 — BUILDING OUTLINE:
Find the outermost thick lines forming the building perimeter. Return the tightest axis-aligned rectangle containing ALL exterior walls as building_outline. EXCLUDE title blocks, legends, scale bars, margin text from this rectangle. Every room must fit INSIDE it.

STEP 3 — IDENTIFY ROOMS:
For each enclosed space bounded by walls/partitions:
  a. Use the room name EXACTLY as written on the plan (e.g., "Chambre", "SdB", "Séjour/Cuisine"). Do NOT rename.
  b. If no name is written, infer from fixtures (sink=bathroom, stove=kitchen) and set confidence < 0.6.
  c. Include: living, bedrooms, kitchens, bathrooms, WC, hallways, entries, storage, cellars, utility rooms.
  d. Exclude: outdoor terraces, balconies, gardens, staircases.
  e. Open-plan rooms (e.g., "Séjour/Cuisine" with no dividing wall): ONE room, not two.

STEP 4 — SURFACES (READ from plan, do NOT calculate):
  Priority A (MANDATORY — always try this first): Look for the surface value PRINTED on the plan next to or inside the room. French plans commonly display surfaces as "21.8 m²", "3.6 m²", "S=12.0", "12,5", or just a number near the room name. Use this value AS-IS. Do NOT calculate from dimensions if a printed value exists.
  COMMON MISREAD ERRORS — check yourself:
    - "3.6 m²" misread as "36 m²" → a WC is 3.6 not 36. If you see a number ≥10 for a WC/SdB, it's likely a decimal misread.
    - "12,5 m²" (French comma = decimal separator) → 12.5 m², NOT 125 m².
    - Numbers near dimension lines (cotes) are LENGTHS in meters, not surfaces. Only use numbers near room NAMES as surfaces.
    - If the plan shows "S=" or "m²" next to the number, it IS a surface. Otherwise verify.
  Priority B: If no surface is printed but dimensions (cotes) are readable: surface_m2 = length_m × width_m. Values > 50 are likely centimeters — divide by 100.
  Priority C: If nothing is readable: estimate using door width = 83cm as scale reference. Set confidence < 0.5.
  SANITY CHECK — mandatory for EVERY room:
    WC 1-4 m² | SdB 3-12 m² | Chambre 8-25 m² | Cuisine 5-25 m² | Séjour 15-60 m² | Couloir 2-12 m² | Cellier/Rangement 1-8 m²
  If a value falls outside these ranges, RE-READ the plan. The printed value is almost always correct — your reading of it may be wrong.
  Sum of all rooms on one floor: 20-200 m² for a typical dwelling.

STEP 5 — BOUNDING BOXES (critical — anchor to wall positions):
  Each bounding_box = tightest axis-aligned rectangle enclosing one room.
  RULES (priority order):
  1. ANCHOR TO WALLS: x_percent/y_percent = top-left WHERE THE ROOM'S WALLS BEGIN on the image. width_percent/height_percent extend to WHERE WALLS END. Measure from INNER face of walls.
  2. NON-RECTANGULAR (L-shape, irregular): tightest rectangle containing the entire room. Set shape accordingly.
  3. ADJACENCY: shared-wall rooms MUST have touching boxes. A.x + A.width = B.x (within 1%).
  4. PROPORTIONALITY: box area proportional to surface_m2. A 3 m² WC is much smaller than a 22 m² séjour.
  5. COVERAGE: union of all boxes fills the building_outline. No large empty gaps.
  6. CONTAINMENT: every box inside building_outline. room.x >= outline.x, room.x+room.width <= outline.x+outline.width.
  7. BOUNDS: x_percent + width_percent <= 100, y_percent + height_percent <= 100, all >= 0.

STEP 6 — METADATA:
  - windows_count / doors_count: count per room. Windows = parallel lines on exterior walls. Doors = arcs/gaps in partitions.
  - floor: 0 = RDC, default 0 if single level.
  - confidence: 0-1. Lower if estimated or ambiguous.
  - scale_reference: "dimensions_on_plan" if surfaces/cotes printed, "scale_bar" if graphical scale, "door_standard_83cm" if estimated, "none" otherwise.
  - shape: "rectangular", "square", "L-shaped", "narrow_corridor", or "irregular".
  - IGNORE: electrical/plumbing symbols, furniture outlines, north arrows, title blocks.
${buildLotZonesSection(lots)}
STEP 7 — SELF-REVIEW (mandatory — do NOT skip):
  1. SURFACES — Does each surface_m2 match what is PRINTED on the plan? Go back and re-read each number.
     - If plan says "3.6" and you wrote 36 → you misread a decimal (×10 error). Fix to 3.6.
     - If plan says "12,5" and you wrote 125 → French comma is decimal separator. Fix to 12.5.
     - If a WC is >5 m² or a Chambre is >30 m², re-read the plan — these values are almost certainly wrong.
  2. Sum of surfaces: does it make sense for a ${typeBien}? Typical apartment = 40-120 m². If sum > 200 m² for an apartment, you have systematic errors.
  3. Every bounding box inside building_outline? If not, fix.
  4. Adjacent rooms sharing a wall → their boxes touch? If gaps > 2%, fix.
  5. Small rooms (WC, SdB) have smaller boxes than large rooms (Séjour)? If not, fix proportions.
  6. Did I use the EXACT room names from the plan? If I renamed a room, revert to the plan's text.
  7. Did I invent a room that is NOT visible on the plan? If yes, remove it.

TYPE DE BIEN: "${typeBien}". If "immeuble", there may be multiple units — identify them if possible.

OUTPUT: valid JSON matching the schema. French room names as written on the plan. No text outside JSON.`;
}

// ─── JSON Schema for structured output ──────────────────────────────
// OpenAI response_format requires a JSON Schema (not Zod).
// Hand-written to match PlanExtractionResultSchema exactly.
const PLAN_EXTRACTION_JSON_SCHEMA = {
  name: "plan_extraction",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      rooms: {
        type: "array" as const,
        description: "Every enclosed room detected on the plan",
        items: {
          type: "object" as const,
          properties: {
            temp_id: { type: "string" as const, description: "Unique ID: r1, r2, r3..." },
            name_raw: { type: "string" as const, description: "Room name in French as written on the plan (e.g. 'Chambre', 'SdB', 'Séjour/Cuisine')" },
            surface_m2: { type: ["number", "null"] as const, description: "Surface in m² read from the plan. null only if unreadable" },
            dimensions: {
              anyOf: [
                {
                  type: "object" as const,
                  properties: {
                    length_m: { type: "number" as const, description: "Length in meters (if > 50, value is in cm — divide by 100)" },
                    width_m: { type: "number" as const, description: "Width in meters (if > 50, value is in cm — divide by 100)" },
                  },
                  required: ["length_m", "width_m"],
                  additionalProperties: false,
                },
                { type: "null" as const },
              ],
            },
            ceiling_height_m: { type: ["number", "null"] as const, description: "Ceiling height in meters, null if not indicated on plan" },
            windows_count: { type: "integer" as const, description: "Number of windows (thin parallel lines on exterior walls)" },
            doors_count: { type: "integer" as const, description: "Number of doors (arcs or gaps in partition lines)" },
            floor: { type: ["integer", "null"] as const, description: "Floor number: 0=RDC, 1=1er étage, etc." },
            confidence: { type: "number" as const, description: "Confidence 0.0-1.0. Lower if surface was estimated or name inferred" },
            shape: {
              anyOf: [
                { type: "string" as const, enum: ["rectangular", "square", "L-shaped", "narrow_corridor", "irregular"] },
                { type: "null" as const },
              ],
              description: "Room shape. Use L-shaped or irregular for non-rectangular rooms",
            },
            notes: { type: ["string", "null"] as const, description: "Optional notes (e.g. 'mur porteur détecté', 'pièce humide')" },
            bounding_box: {
              anyOf: [
                {
                  type: "object" as const,
                  description: "Tightest axis-aligned rectangle around this room, anchored to wall positions on the image",
                  properties: {
                    x_percent: { type: "number" as const, description: "Left edge of room as % of image width (0=left edge of image)" },
                    y_percent: { type: "number" as const, description: "Top edge of room as % of image height (0=top edge of image)" },
                    width_percent: { type: "number" as const, description: "Room width as % of image width" },
                    height_percent: { type: "number" as const, description: "Room height as % of image height" },
                  },
                  required: ["x_percent", "y_percent", "width_percent", "height_percent"],
                  additionalProperties: false,
                },
                { type: "null" as const },
              ],
            },
          },
          required: [
            "temp_id", "name_raw", "surface_m2", "dimensions",
            "ceiling_height_m", "windows_count", "doors_count",
            "floor", "confidence", "shape", "notes", "bounding_box",
          ],
          additionalProperties: false,
        },
      },
      building_outline: {
        anyOf: [
          {
            type: "object" as const,
            description: "Tightest rectangle around ALL exterior walls, excluding title blocks/legends/margins",
            properties: {
              x_percent: { type: "number" as const, description: "Left edge of building as % of image width" },
              y_percent: { type: "number" as const, description: "Top edge of building as % of image height" },
              width_percent: { type: "number" as const, description: "Building width as % of image width" },
              height_percent: { type: "number" as const, description: "Building height as % of image height" },
            },
            required: ["x_percent", "y_percent", "width_percent", "height_percent"],
            additionalProperties: false,
          },
          { type: "null" as const },
        ],
      },
      total_surface_m2: { type: ["number", "null"] as const, description: "Sum of all room surfaces in m²" },
      floors_count: { type: "integer" as const, description: "Number of floors detected (minimum 1)" },
      extraction_warnings: {
        type: "array" as const,
        description: "Issues encountered during extraction",
        items: {
          type: "string" as const,
          enum: [
            "no_dimensions_found",
            "low_resolution",
            "partial_occlusion",
            "no_scale_reference",
            "technical_symbols_ignored",
          ],
        },
      },
      scale_reference: {
        type: "string" as const,
        description: "How surfaces/dimensions were determined",
        enum: ["dimensions_on_plan", "door_standard_83cm", "scale_bar", "none"],
      },
    },
    required: ["rooms", "building_outline", "total_surface_m2", "floors_count", "extraction_warnings", "scale_reference"],
    additionalProperties: false,
  },
};

// ─── Main extraction function ───────────────────────────────────────

/**
 * Extract structured room data from a floor plan image using GPT-4.1 vision.
 *
 * @param planBase64 - Base64-encoded plan image
 * @param mimeType - MIME type of the image (image/jpeg, image/png, application/pdf)
 * @param typeBien - Type of property for context
 * @returns Validated PlanExtractionResult
 * @throws Error with typed message on failure
 */
export async function extractPlanData(
  planBase64: string,
  mimeType: string,
  typeBien: TypeBien,
  retryContext?: string,
  lots?: LotZone[]
): Promise<PlanExtractionResult> {
  const openai = getOpenAI();
  const systemPrompt = buildSystemPrompt(typeBien, lots);

  // If PDF, convert to PNG first — same pipeline for all formats
  let imageBase64 = planBase64;
  let imageMimeType = mimeType;

  if (isPdf(mimeType, planBase64)) {
    console.log("[plan-extractor] PDF detected — converting to PNG via pdf-to-img...");
    try {
      const pdfBuffer = Buffer.from(planBase64, "base64");
      // scale: 3 = higher resolution for reading small text (surface values, room names)
      const pages = await pdf(pdfBuffer, { scale: 3 });
      for await (const page of pages) {
        // Use first page only (multi-page handled by extractMultiplePlans)
        imageBase64 = Buffer.from(page).toString("base64");
        imageMimeType = "image/png";
        console.log(`[plan-extractor] PDF→PNG conversion OK: ${page.length} bytes`);
        break;
      }
    } catch (convErr) {
      console.error("[plan-extractor] PDF→PNG conversion failed:", convErr);
      throw new PlanExtractionError(
        "API_ERROR",
        "Impossible de lire ce PDF. Vérifiez qu'il n'est pas protégé par mot de passe. Vous pouvez aussi réessayer en uploadant une image (JPG, PNG) du plan."
      );
    }
  }

  const imageDataUrl = buildImageDataUrl(imageMimeType, imageBase64);

  // First attempt
  let rawJson: string;
  try {
    rawJson = await callVisionExtraction(openai, systemPrompt, imageDataUrl, retryContext);
  } catch (err) {
    // Retry once after 5s on API error
    console.warn(
      "[plan-extractor] First attempt failed, retrying in 5s...",
      err instanceof Error ? err.message : err
    );
    await sleep(5000);
    try {
      rawJson = await callVisionExtraction(openai, systemPrompt, imageDataUrl, retryContext);
    } catch (retryErr) {
      throw new PlanExtractionError(
        "API_ERROR",
        `Extraction failed after retry: ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`
      );
    }
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new PlanExtractionError("PARSING_FAILED", "Model returned invalid JSON");
  }

  // Validate with Zod
  const validation = PlanExtractionResultSchema.safeParse(parsed);
  if (validation.success) {
    return validation.data;
  }

  // Self-correction: send Zod errors back to the model for a second try
  console.warn(
    "[plan-extractor] Zod validation failed, attempting self-correction...",
    validation.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
  );

  try {
    const correctedJson = await callSelfCorrection(
      openai,
      systemPrompt,
      imageDataUrl,
      rawJson,
      validation.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n")
    );
    const correctedParsed = JSON.parse(correctedJson);
    const correctedValidation = PlanExtractionResultSchema.safeParse(correctedParsed);
    if (correctedValidation.success) {
      return correctedValidation.data;
    }
    throw new PlanExtractionError(
      "PARSING_FAILED",
      `Self-correction failed: ${correctedValidation.error.issues.map((i) => i.message).join(", ")}`
    );
  } catch (err) {
    if (err instanceof PlanExtractionError) throw err;
    throw new PlanExtractionError(
      "PARSING_FAILED",
      `Self-correction error: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

// ─── Multi-plan extraction ─────────────────────────────────────────

interface PlanInput {
  base64: string;
  mimeType: string;
  /** Floor index override (0 = RDC, 1 = 1er étage, etc.) */
  floorIndex: number;
}

/**
 * Extract rooms from multiple plan files (1 per floor/étage).
 * Results are merged with floor numbers auto-assigned from the floorIndex of each plan.
 * Processes plans sequentially to avoid hitting OpenAI rate limits.
 */
export async function extractMultiplePlans(
  plans: PlanInput[],
  typeBien: TypeBien,
  retryContext?: string,
  lots?: LotZone[]
): Promise<PlanExtractionResult> {
  if (plans.length === 0) {
    throw new PlanExtractionError("PLAN_UNREADABLE", "Aucun plan fourni.");
  }

  // Single plan — no merge needed
  if (plans.length === 1) {
    return extractPlanData(plans[0].base64, plans[0].mimeType, typeBien, retryContext, lots);
  }

  const allRooms: PlanExtractionResult["rooms"] = [];
  const allWarnings: Set<string> = new Set();
  let totalSurface = 0;
  let hasAnySurface = false;
  let scaleRef: PlanExtractionResult["scale_reference"] = "none";
  let firstBuildingOutline: PlanExtractionResult["building_outline"] = null;

  // Process each plan sequentially (avoid rate limits)
  for (const plan of plans) {
    console.log(`[plan-extractor] Extracting floor ${plan.floorIndex} (${plan.mimeType})`);

    const result = await extractPlanData(plan.base64, plan.mimeType, typeBien, retryContext, lots);

    // Keep first floor's building outline
    if (firstBuildingOutline === null && result.building_outline) {
      firstBuildingOutline = result.building_outline;
    }

    // Override floor number for each room to match the plan's floor index
    for (const room of result.rooms) {
      allRooms.push({
        ...room,
        floor: plan.floorIndex,
        temp_id: `f${plan.floorIndex}_${room.temp_id}`,
      });
    }

    // Merge warnings
    for (const w of result.extraction_warnings) {
      allWarnings.add(w);
    }

    // Accumulate surface
    if (result.total_surface_m2 !== null) {
      totalSurface += result.total_surface_m2;
      hasAnySurface = true;
    }

    // Keep the best scale reference
    if (result.scale_reference !== "none") {
      scaleRef = result.scale_reference;
    }
  }

  return {
    rooms: allRooms,
    // Multi-floor: use outline from first floor (each floor has its own image, user can adjust)
    building_outline: firstBuildingOutline,
    total_surface_m2: hasAnySurface ? totalSurface : null,
    floors_count: plans.length,
    extraction_warnings: Array.from(allWarnings) as PlanExtractionResult["extraction_warnings"],
    scale_reference: scaleRef,
  };
}

// ─── Surface sanity checks (post-extraction) ──────────────────────

export interface SanitizationEntry {
  room: string;
  from: number | null;
  to: number | null;
  reason: string;
}

interface SanitizeResult {
  data: PlanExtractionResult;
  log: SanitizationEntry[];
}

/**
 * Fix obviously wrong surfaces. Returns corrected data + a log of all changes
 * so validateExtraction can produce user-facing warnings.
 */
export function sanitizeSurfaces(data: PlanExtractionResult, typeBien?: string): SanitizeResult {
  const rooms = [...data.rooms];
  let totalSurface = data.total_surface_m2;
  const log: SanitizationEntry[] = [];

  // ── Fix -1: Sanitize building outline itself ────────────────────
  const buildingOutline = data.building_outline ? { ...data.building_outline } : null;
  if (buildingOutline) {
    buildingOutline.x_percent = Math.max(0, Math.min(buildingOutline.x_percent, 99));
    buildingOutline.y_percent = Math.max(0, Math.min(buildingOutline.y_percent, 99));
    buildingOutline.width_percent = Math.max(5, Math.min(buildingOutline.width_percent, 100 - buildingOutline.x_percent));
    buildingOutline.height_percent = Math.max(5, Math.min(buildingOutline.height_percent, 100 - buildingOutline.y_percent));
  }
  // Replace data.building_outline with sanitized version for downstream use
  data = { ...data, building_outline: buildingOutline };

  // Global max surface per room depends on type de bien
  const globalMaxRoom = typeBien === "maison" ? 150 : typeBien === "immeuble" || typeBien === "local_commercial" ? 250 : 80;

  // ── Room-type specific max surfaces (generous but catch absurdities) ─
  const ROOM_TYPE_MAX: Record<string, number> = {
    wc: 8, sdb: 20, chambre: 35, cuisine: 40, salon: 80,
    bureau: 30, couloir: 25, cave: 40, autre: 60,
  };
  // Min surface per room type (to validate /10 corrections)
  const ROOM_TYPE_MIN: Record<string, number> = {
    wc: 0.5, sdb: 2, chambre: 5, cuisine: 3, salon: 8,
    bureau: 3, couloir: 1, cave: 1, autre: 1,
  };

  // ── Fix 0: Detect systematic 10x error (global median check) ─────
  const validSurfaces = rooms.filter((r) => r.surface_m2 !== null).map((r) => r.surface_m2!).sort((a, b) => a - b);
  if (validSurfaces.length >= 2) {
    const median = validSurfaces[Math.floor(validSurfaces.length / 2)];
    if (median > globalMaxRoom) {
      console.warn(`[plan-extractor] Median surface ${median}m² > ${globalMaxRoom}m² — systematic 10x error, dividing all by 10`);
      for (const room of rooms) {
        if (room.surface_m2 !== null) {
          const before = room.surface_m2;
          room.surface_m2 = Math.round(room.surface_m2 * 10) / 100;
          log.push({ room: room.name_raw, from: before, to: room.surface_m2, reason: "10x_correction" });
        }
        if (room.dimensions) {
          room.dimensions.length_m = Math.round(room.dimensions.length_m / Math.sqrt(10) * 100) / 100;
          room.dimensions.width_m = Math.round(room.dimensions.width_m / Math.sqrt(10) * 100) / 100;
        }
        room.confidence = Math.min(room.confidence, 0.5);
      }
      if (totalSurface !== null) {
        totalSurface = Math.round(totalSurface * 10) / 100;
      }
    }
  }

  // ── Fix 0b: Per-room-type 10x detection (catches mixed errors) ───
  // When some rooms are correct but others are 10x inflated (e.g. WC=3m² OK but Chambre=131m²)
  for (const room of rooms) {
    if (room.surface_m2 === null) continue;
    const rType = inferRoomTypeFromName(room.name_raw);
    const maxForType = ROOM_TYPE_MAX[rType] ?? ROOM_TYPE_MAX.autre;
    const minForType = ROOM_TYPE_MIN[rType] ?? ROOM_TYPE_MIN.autre;
    // Allow 20% margin above the type max before flagging
    if (room.surface_m2 > maxForType * 1.2) {
      const divided = Math.round(room.surface_m2 * 10) / 100;
      if (divided >= minForType && divided <= maxForType * 1.2) {
        // /10 gives a reasonable value → apply correction
        const before = room.surface_m2;
        room.surface_m2 = divided;
        room.confidence = Math.min(room.confidence, 0.5);
        if (room.dimensions) {
          room.dimensions.length_m = Math.round(room.dimensions.length_m / Math.sqrt(10) * 100) / 100;
          room.dimensions.width_m = Math.round(room.dimensions.width_m / Math.sqrt(10) * 100) / 100;
        }
        log.push({ room: room.name_raw, from: before, to: room.surface_m2, reason: "10x_per_type" });
      }
    }
  }

  // ── Fix 1: Individual room checks ─────────────────────────────
  for (const room of rooms) {
    if (room.surface_m2 === null) continue;

    // cm→m conversion
    if (room.dimensions) {
      let fixed = false;
      if (room.dimensions.length_m > 50) { room.dimensions.length_m /= 100; fixed = true; }
      if (room.dimensions.width_m > 50) { room.dimensions.width_m /= 100; fixed = true; }
      if (fixed) {
        const before = room.surface_m2;
        room.surface_m2 = Math.round(room.dimensions.length_m * room.dimensions.width_m * 100) / 100;
        room.confidence = Math.min(room.confidence, 0.5);
        log.push({ room: room.name_raw, from: before, to: room.surface_m2, reason: "cm_to_m" });
      }
    }

    // Per-room-type cap (after 10x correction attempts)
    const rType = inferRoomTypeFromName(room.name_raw);
    const maxForType = ROOM_TYPE_MAX[rType] ?? ROOM_TYPE_MAX.autre;
    if (room.surface_m2 > maxForType * 1.2) {
      log.push({ room: room.name_raw, from: room.surface_m2, to: null, reason: `cap_type_${rType}_${maxForType}m2` });
      room.surface_m2 = null;
      room.dimensions = null;
      room.confidence = Math.min(room.confidence, 0.3);
    }

    // Global cap per typeBien (safety net)
    if (room.surface_m2 !== null && room.surface_m2 > globalMaxRoom) {
      log.push({ room: room.name_raw, from: room.surface_m2, to: null, reason: `cap_${globalMaxRoom}m2` });
      room.surface_m2 = null;
      room.dimensions = null;
      room.confidence = Math.min(room.confidence, 0.3);
    }

    // Room > total
    if (totalSurface !== null && room.surface_m2 !== null && room.surface_m2 > totalSurface) {
      log.push({ room: room.name_raw, from: room.surface_m2, to: null, reason: "exceeds_total" });
      room.surface_m2 = null;
      room.dimensions = null;
      room.confidence = Math.min(room.confidence, 0.3);
    }
  }

  // ── Fix 2: Clamp bounding boxes to building outline (or image bounds as fallback) ─
  const outline = data.building_outline;
  // Building outline bounds (fallback to full image 0-100 if no outline)
  const oMinX = outline ? outline.x_percent : 0;
  const oMinY = outline ? outline.y_percent : 0;
  const oMaxX = outline ? outline.x_percent + outline.width_percent : 100;
  const oMaxY = outline ? outline.y_percent + outline.height_percent : 100;

  for (const room of rooms) {
    if (!room.bounding_box) continue;
    const bb = room.bounding_box;

    // Clamp to building outline (or image bounds)
    bb.x_percent = Math.max(oMinX, Math.min(bb.x_percent, oMaxX - 1));
    bb.y_percent = Math.max(oMinY, Math.min(bb.y_percent, oMaxY - 1));
    bb.width_percent = Math.max(1, Math.min(bb.width_percent, oMaxX - bb.x_percent));
    bb.height_percent = Math.max(1, Math.min(bb.height_percent, oMaxY - bb.y_percent));

    // No single room should take more than 60% of the building outline in either direction
    const maxW = outline ? outline.width_percent * 0.6 : 60;
    const maxH = outline ? outline.height_percent * 0.6 : 60;
    if (bb.width_percent > maxW) {
      bb.width_percent = maxW;
      log.push({ room: room.name_raw, from: null, to: null, reason: "bbox_width_clamped" });
    }
    if (bb.height_percent > maxH) {
      bb.height_percent = maxH;
      log.push({ room: room.name_raw, from: null, to: null, reason: "bbox_height_clamped" });
    }
  }

  // ── Fix 3: Recalculate total ──────────────────────────────────
  const sumSurfaces = rooms.reduce((s, r) => s + (r.surface_m2 ?? 0), 0);
  let correctedTotal = totalSurface;
  if (correctedTotal === null || (sumSurfaces > 0 && Math.abs(sumSurfaces - (correctedTotal ?? 0)) > sumSurfaces * 0.3)) {
    correctedTotal = Math.round(sumSurfaces * 100) / 100;
  }

  return {
    data: { ...data, rooms, total_surface_m2: correctedTotal },
    log,
  };
}

/** Infer room type from name_raw for surface caps */
function inferRoomTypeFromName(nameRaw: string): string {
  const n = nameRaw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/salon|sejour|living|salle.*manger/.test(n)) return "salon";
  if (/cuisine|kitchen|kitchenette/.test(n)) return "cuisine";
  if (/chambre|bedroom/.test(n)) return "chambre";
  if (/salle.*bain|sdb|bathroom/.test(n)) return "sdb";
  if (/\bwc\b|toilet/.test(n)) return "wc";
  if (/bureau|office/.test(n)) return "bureau";
  if (/couloir|hall|entree|degagement|palier/.test(n)) return "couloir";
  if (/cave|cellier|rangement|buanderie/.test(n)) return "cave";
  return "autre";
}

// ─── Quality gates (post-extraction, post-sanitization) ────────────

export interface ExtractionQualityGate {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface ExtractionQualityReport {
  score: number; // 0-100
  gates: ExtractionQualityGate[];
  warnings: string[]; // User-facing FR warnings
  shouldRetry: boolean; // If true, extraction quality is too low — auto-retry recommended
}

/**
 * Validate extraction quality BEFORE displaying to user.
 * Accepts optional sanitization log to produce explicit warnings per room.
 * Accepts typeBien for context-dependent thresholds.
 */
export function validateExtraction(
  data: PlanExtractionResult,
  sanitizationLog?: SanitizationEntry[],
  typeBien?: string,
  lotSurfaces?: Array<{ name: string; surface_m2: number | null }>
): ExtractionQualityReport {
  const gates: ExtractionQualityGate[] = [];
  const warnings: string[] = [];

  // C1: Convert sanitization log to explicit user warnings
  if (sanitizationLog && sanitizationLog.length > 0) {
    for (const entry of sanitizationLog) {
      if (entry.reason === "10x_correction") {
        warnings.push(`${entry.room} : surface corrigée de ${entry.from}m² → ${entry.to}m² (erreur de lecture détectée).`);
      } else if (entry.reason.startsWith("cap_")) {
        warnings.push(`${entry.room} : surface de ${entry.from}m² aberrante, supprimée. Saisissez-la manuellement.`);
      } else if (entry.reason === "exceeds_total") {
        warnings.push(`${entry.room} : surface de ${entry.from}m² dépasse le total, supprimée.`);
      } else if (entry.reason === "cm_to_m") {
        warnings.push(`${entry.room} : dimensions converties cm→m (${entry.from}m² → ${entry.to}m²).`);
      }
    }
  }

  // C2: Thresholds depend on typeBien
  const maxTotalSurface = typeBien === "maison" ? 500 : typeBien === "immeuble" || typeBien === "local_commercial" ? 800 : 300;

  // Per-room-type max (same as sanitizeSurfaces)
  const RT_MAX: Record<string, number> = {
    wc: 8, sdb: 20, chambre: 35, cuisine: 40, salon: 80,
    bureau: 30, couloir: 25, cave: 40, autre: 60,
  };

  // GATE 1 — Surfaces in realistic ranges per room type
  const oversizedRooms = data.rooms.filter((r) => {
    if (r.surface_m2 === null) return false;
    const rType = inferRoomTypeFromName(r.name_raw);
    const max = RT_MAX[rType] ?? RT_MAX.autre;
    return r.surface_m2 > max * 1.2;
  });
  gates.push({
    id: "G1_SURFACE_RANGE",
    label: "Surfaces dans les plages réalistes par type de pièce",
    passed: oversizedRooms.length === 0,
    detail: oversizedRooms.length > 0
      ? oversizedRooms.map((r) => `${r.name_raw} (${r.surface_m2}m²)`).join(", ")
      : undefined,
  });
  if (oversizedRooms.length > 0) {
    for (const r of oversizedRooms) {
      warnings.push(`${r.name_raw} : ${r.surface_m2}m² semble trop grand. Vérifiez cette surface.`);
    }
  }

  // GATE 2 — Total surface coherent
  const totalSurface = data.rooms.reduce((s, r) => s + (r.surface_m2 ?? 0), 0);
  const totalOk = totalSurface > 0 && totalSurface < maxTotalSurface;
  gates.push({
    id: "G2_TOTAL_SURFACE",
    label: `Surface totale cohérente (< ${maxTotalSurface}m²)`,
    passed: totalOk,
    detail: !totalOk ? `Surface totale : ${totalSurface.toFixed(1)}m²` : undefined,
  });
  if (!totalOk && totalSurface >= maxTotalSurface) {
    warnings.push(`Surface totale de ${totalSurface.toFixed(1)}m² — semble trop grande.`);
  }

  // GATE 2b — Total surface vs lot surface (if lot surface was confirmed at step 2)
  if (lotSurfaces && lotSurfaces.length > 0) {
    const confirmedTotal = lotSurfaces.reduce((s, l) => s + (l.surface_m2 ?? 0), 0);
    if (confirmedTotal > 0 && totalSurface > 0) {
      const ratio = totalSurface / confirmedTotal;
      const lotSurfaceOk = ratio >= 0.5 && ratio <= 1.5; // rooms should be 50-150% of lot surface
      gates.push({
        id: "G2B_LOT_SURFACE_MATCH",
        label: `Surface pièces cohérente avec surface lot (${confirmedTotal.toFixed(0)}m²)`,
        passed: lotSurfaceOk,
        detail: !lotSurfaceOk ? `Pièces: ${totalSurface.toFixed(1)}m² vs Lot: ${confirmedTotal.toFixed(0)}m² (ratio ${(ratio * 100).toFixed(0)}%)` : undefined,
      });
      if (!lotSurfaceOk) {
        warnings.push(`La surface des pièces (${totalSurface.toFixed(1)}m²) est très différente de la surface du lot confirmée à l'étape 2 (${confirmedTotal.toFixed(0)}m²). Vérifiez les surfaces.`);
      }
    }
  }

  // GATE 3 — Bounding boxes within BUILDING OUTLINE (or image bounds as fallback)
  const bOutline = data.building_outline;
  const gMinX = bOutline ? bOutline.x_percent : 0;
  const gMinY = bOutline ? bOutline.y_percent : 0;
  const gMaxX = bOutline ? bOutline.x_percent + bOutline.width_percent : 100;
  const gMaxY = bOutline ? bOutline.y_percent + bOutline.height_percent : 100;
  const outOfBounds = data.rooms.filter((r) => {
    if (!r.bounding_box) return false;
    const bb = r.bounding_box;
    return bb.x_percent < gMinX || bb.y_percent < gMinY
      || bb.x_percent + bb.width_percent > gMaxX
      || bb.y_percent + bb.height_percent > gMaxY;
  });
  gates.push({
    id: "G3_BBOX_IN_BOUNDS",
    label: bOutline ? "Pièces dans les limites du bâtiment" : "Pièces dans les limites du plan",
    passed: outOfBounds.length === 0,
    detail: outOfBounds.length > 0 ? outOfBounds.map((r) => r.name_raw).join(", ") : undefined,
  });
  if (outOfBounds.length > 0) {
    const boundaryLabel = bOutline ? "du bâtiment" : "du plan";
    warnings.push(`${outOfBounds.length} pièce(s) hors ${boundaryLabel} : ${outOfBounds.map((r) => r.name_raw).join(", ")}. Repositionnez-les.`);
  }

  // GATE 3b — Building outline exists (critical for bbox accuracy)
  gates.push({
    id: "G3B_OUTLINE_EXISTS",
    label: "Contour du bâtiment détecté",
    passed: bOutline !== null && bOutline !== undefined,
    detail: !bOutline ? "L'IA n'a pas détecté le contour du bâtiment" : undefined,
  });

  // GATE 4 — Bounding boxes not empty (C3: warning FR)
  const emptyBoxes = data.rooms.filter((r) => {
    if (!r.bounding_box) return true;
    return r.bounding_box.width_percent < 1 || r.bounding_box.height_percent < 1;
  });
  gates.push({
    id: "G4_BBOX_NOT_EMPTY",
    label: "Toutes les pièces ont une position",
    passed: emptyBoxes.length === 0,
    detail: emptyBoxes.length > 0 ? `${emptyBoxes.length} pièce(s) sans position` : undefined,
  });
  if (emptyBoxes.length > 0) {
    warnings.push(`${emptyBoxes.length} pièce(s) sans position sur le plan. Repositionnez-les manuellement.`);
  }

  // GATE 5 — Bounding box sizes proportional to surfaces (C3: warning FR)
  const roomsWithBoth = data.rooms.filter((r) => r.surface_m2 !== null && r.bounding_box);
  let proportionalOk = true;
  if (roomsWithBoth.length >= 2) {
    const surfaceMin = Math.min(...roomsWithBoth.map((r) => r.surface_m2!));
    const surfaceMax = Math.max(...roomsWithBoth.map((r) => r.surface_m2!));
    const bboxMin = Math.min(...roomsWithBoth.map((r) => r.bounding_box!.width_percent * r.bounding_box!.height_percent));
    const bboxMax = Math.max(...roomsWithBoth.map((r) => r.bounding_box!.width_percent * r.bounding_box!.height_percent));
    if (surfaceMax > surfaceMin * 3 && bboxMax > 0 && bboxMin > 0) {
      const bboxRatio = bboxMax / bboxMin;
      const surfaceRatio = surfaceMax / surfaceMin;
      proportionalOk = bboxRatio > surfaceRatio * 0.2;
    }
  }
  gates.push({
    id: "G5_BBOX_PROPORTIONAL",
    label: "Tailles visuelles proportionnelles aux surfaces",
    passed: proportionalOk,
    detail: !proportionalOk ? "Les tailles visuelles ne correspondent pas aux surfaces" : undefined,
  });
  if (!proportionalOk) {
    warnings.push("Les tailles visuelles des pièces ne semblent pas proportionnelles aux surfaces. Vérifiez le positionnement.");
  }

  // GATE 6 — At least 2 rooms detected
  gates.push({
    id: "G6_MIN_ROOMS",
    label: "Au moins 2 pièces détectées",
    passed: data.rooms.length >= 2,
    detail: data.rooms.length < 2 ? `Seulement ${data.rooms.length} pièce(s)` : undefined,
  });
  if (data.rooms.length < 2) {
    warnings.push("Très peu de pièces détectées. Le plan est peut-être illisible.");
  }

  // GATE 7 — No duplicate rooms (C5: by bbox overlap only, name not required)
  let duplicates = 0;
  for (let i = 0; i < data.rooms.length; i++) {
    for (let j = i + 1; j < data.rooms.length; j++) {
      const a = data.rooms[i];
      const b = data.rooms[j];
      if (a.bounding_box && b.bounding_box) {
        const overlap = Math.abs(a.bounding_box.x_percent - b.bounding_box.x_percent) < 5
          && Math.abs(a.bounding_box.y_percent - b.bounding_box.y_percent) < 5
          && a.bounding_box.width_percent > 0 && b.bounding_box.width_percent > 0;
        if (overlap) duplicates++;
      }
    }
  }
  gates.push({
    id: "G7_NO_DUPLICATES",
    label: "Pas de pièces en double",
    passed: duplicates === 0,
    detail: duplicates > 0 ? `${duplicates} doublon(s) détecté(s)` : undefined,
  });
  if (duplicates > 0) {
    warnings.push(`${duplicates} pièce(s) semblent en double (même position). Supprimez les doublons.`);
  }

  // GATE 8 — C6: At least 50% of rooms have a surface (not all null)
  const roomsWithSurface = data.rooms.filter((r) => r.surface_m2 !== null).length;
  const surfaceCoverage = data.rooms.length > 0 ? roomsWithSurface / data.rooms.length : 0;
  gates.push({
    id: "G8_SURFACE_COVERAGE",
    label: "Surfaces détectées sur la majorité des pièces",
    passed: surfaceCoverage >= 0.5,
    detail: surfaceCoverage < 0.5 ? `${roomsWithSurface}/${data.rooms.length} pièces avec surface` : undefined,
  });
  if (surfaceCoverage < 0.5) {
    warnings.push("La majorité des surfaces n'ont pas pu être lues. Saisissez-les manuellement.");
  }

  // GATE 9 — Excessive bbox overlap (two rooms sharing > 30% of area = misplacement)
  let excessiveOverlaps = 0;
  const overlapPairs: string[] = [];
  for (let i = 0; i < data.rooms.length; i++) {
    for (let j = i + 1; j < data.rooms.length; j++) {
      const a = data.rooms[i];
      const b = data.rooms[j];
      // Only compare rooms on the same floor — different floors have independent coordinate systems
      if ((a.floor ?? 0) !== (b.floor ?? 0)) continue;
      if (a.bounding_box && b.bounding_box) {
        const ax1 = a.bounding_box.x_percent;
        const ay1 = a.bounding_box.y_percent;
        const ax2 = ax1 + a.bounding_box.width_percent;
        const ay2 = ay1 + a.bounding_box.height_percent;
        const bx1 = b.bounding_box.x_percent;
        const by1 = b.bounding_box.y_percent;
        const bx2 = bx1 + b.bounding_box.width_percent;
        const by2 = by1 + b.bounding_box.height_percent;
        const overlapX = Math.max(0, Math.min(ax2, bx2) - Math.max(ax1, bx1));
        const overlapY = Math.max(0, Math.min(ay2, by2) - Math.max(ay1, by1));
        const overlapArea = overlapX * overlapY;
        const areaA = a.bounding_box.width_percent * a.bounding_box.height_percent;
        const areaB = b.bounding_box.width_percent * b.bounding_box.height_percent;
        const smallerArea = Math.min(areaA, areaB);
        if (smallerArea > 0 && overlapArea / smallerArea > 0.3) {
          excessiveOverlaps++;
          overlapPairs.push(`${a.name_raw} / ${b.name_raw}`);
        }
      }
    }
  }
  gates.push({
    id: "G9_NO_EXCESSIVE_OVERLAP",
    label: "Pas de chevauchement excessif entre pièces",
    passed: excessiveOverlaps === 0,
    detail: excessiveOverlaps > 0 ? overlapPairs.join(", ") : undefined,
  });
  if (excessiveOverlaps > 0) {
    warnings.push(`${excessiveOverlaps} paire(s) de pièces se chevauchent excessivement : ${overlapPairs.join(", ")}. Repositionnez-les.`);
  }

  // ── Score calculation ──────────────────────────────────────────
  const passedCount = gates.filter((g) => g.passed).length;
  const score = Math.round((passedCount / gates.length) * 100);

  // Should retry if critical gates fail (surfaces, total, bbox, or min rooms)
  const criticalGateIds = new Set(["G1_SURFACE_RANGE", "G2_TOTAL_SURFACE", "G3_BBOX_IN_BOUNDS", "G6_MIN_ROOMS"]);
  const criticalFails = gates.filter((g) => !g.passed && criticalGateIds.has(g.id));
  const shouldRetry = criticalFails.length > 0;

  return { score, gates, warnings, shouldRetry };
}

// ─── Internal helpers ───────────────────────────────────────────────

/**
 * Build a data URL for image content.
 */
function buildImageDataUrl(mimeType: string, base64Data: string): string {
  const mediaType = mimeType.startsWith("image/")
    ? mimeType
    : "image/jpeg";
  return `data:${mediaType};base64,${base64Data}`;
}

/**
 * Extract text from the OpenAI Responses API output.
 */
function extractTextFromResponse(response: { output: Array<{ type: string; content?: Array<{ type: string; text?: string }> }> }, label: string): string {
  const textOutput = response.output.find((o) => o.type === "message");
  if (!textOutput || textOutput.type !== "message") {
    throw new Error(`No message output from ${label}`);
  }
  const msg = textOutput as { type: "message"; content: Array<{ type: string; text?: string }> };
  const textContent = msg.content.find((c) => c.type === "output_text");
  if (!textContent || textContent.type !== "output_text" || !textContent.text) {
    throw new Error(`No text content in ${label} response`);
  }
  return textContent.text;
}

/**
 * Call GPT-4.1 vision for image-based plan extraction.
 */
async function callVisionExtraction(
  openai: OpenAI,
  systemPrompt: string,
  imageDataUrl: string,
  retryContext?: string
): Promise<string> {
  const userText = retryContext
    ? `Extract all rooms from this floor plan. Return the JSON only.\n\nIMPORTANT — Previous extraction had these errors:\n${retryContext}\nFix these issues in your new extraction.`
    : "Extract all rooms from this floor plan. Return the JSON only.";

  const response = await openai.responses.create({
    model: "gpt-4.1",
    input: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "input_image",
            image_url: imageDataUrl,
            detail: "high",
          },
          {
            type: "input_text",
            text: userText,
          },
        ],
      },
    ] as unknown as Parameters<typeof openai.responses.create>[0]["input"],
    text: {
      format: {
        type: "json_schema",
        ...PLAN_EXTRACTION_JSON_SCHEMA,
      },
    },
  });

  return extractTextFromResponse(response as unknown as { output: Array<{ type: string; content?: Array<{ type: string; text?: string }> }> }, "GPT-4.1 vision");
}

/**
 * Self-correction: send Zod validation errors back to the model for a fixed output.
 * Always uses GPT-4.1 vision (PDFs are already converted to PNG upstream).
 */
async function callSelfCorrection(
  openai: OpenAI,
  systemPrompt: string,
  imageDataUrl: string,
  previousJson: string,
  zodErrors: string
): Promise<string> {
  const correctionText = `Your previous output had validation errors. Fix them and return valid JSON.\n\nPrevious output:\n${previousJson}\n\nValidation errors:\n${zodErrors}`;

  const response = await openai.responses.create({
    model: "gpt-4.1",
    input: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "input_image",
            image_url: imageDataUrl,
            detail: "high",
          },
          {
            type: "input_text",
            text: correctionText,
          },
        ],
      },
    ] as unknown as Parameters<typeof openai.responses.create>[0]["input"],
    text: {
      format: {
        type: "json_schema",
        ...PLAN_EXTRACTION_JSON_SCHEMA,
      },
    },
  });

  return extractTextFromResponse(response as unknown as { output: Array<{ type: string; content?: Array<{ type: string; text?: string }> }> }, "self-correction");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Error class ────────────────────────────────────────────────────

export type PlanExtractionErrorReason =
  | "API_ERROR"
  | "PARSING_FAILED"
  | "PLAN_UNREADABLE"
  | "NO_ROOMS_DETECTED";

export class PlanExtractionError extends Error {
  reason: PlanExtractionErrorReason;

  constructor(reason: PlanExtractionErrorReason, message: string) {
    super(message);
    this.name = "PlanExtractionError";
    this.reason = reason;
  }
}
