/**
 * Extraction de plan via GPT-4.1 vision — Versi Studio.
 *
 * Adapté de reference-existant/lib-marchand/plan-extractor.ts.
 * PDF→PNG via pdf-to-img, extraction structurée via GPT-4.1 vision,
 * validation Zod, self-correction, sanitization post-extraction.
 */
import OpenAI from "openai";
import {
  PlanExtractionResultSchema,
  type PlanExtractionResult,
  type TypeBien,
} from "@/lib/vs/schemas";

// NOTE : `pdf-to-img` est importé dynamiquement à l'usage (voir extractPlanData).
// Un import statique casse le build Next.js (bundling côté serveur) — cf. retour Replit s20.

// ─── Singleton OpenAI ──────────────────────────────────────────────
let _openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openaiClient;
}

// ─── Error class ───────────────────────────────────────────────────
export class PlanExtractionError extends Error {
  constructor(
    public code: "API_ERROR" | "PARSING_FAILED" | "PLAN_UNREADABLE",
    message: string
  ) {
    super(message);
    this.name = "PlanExtractionError";
  }
}

// ─── Helpers ───────────────────────────────────────────────────────
function isPdf(mimeType: string, base64Data: string): boolean {
  if (mimeType === "application/pdf") return true;
  return base64Data.startsWith("JVBERi0");
}

function buildImageDataUrl(mimeType: string, base64: string): string {
  return `data:${mimeType};base64,${base64}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract the text content from an OpenAI Responses API response.
 * The SDK types for `response.output` are generic — this helper
 * encapsulates the runtime shape check in one place.
 */
interface ResponseMessageItem {
  type: "message";
  content: Array<{ type: string; text?: string }>;
}

function isMessageItem(o: { type: string }): o is ResponseMessageItem {
  return o.type === "message" && "content" in o && Array.isArray((o as ResponseMessageItem).content);
}

function extractTextFromResponse(
  response: Awaited<ReturnType<OpenAI["responses"]["create"]>>
): string {
  const messageItem = response.output.find(
    (o: { type: string }) => isMessageItem(o)
  );

  if (!messageItem || !isMessageItem(messageItem)) {
    throw new Error("No message output in response");
  }

  const textContent = messageItem.content.find(
    (c) => c.type === "output_text"
  );
  if (!textContent?.text) {
    throw new Error("No text content in response message");
  }

  return textContent.text;
}

// ─── LotZone interface ─────────────────────────────────────────────
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

function buildLotZonesSection(lots?: LotZone[]): string {
  if (!lots || lots.length === 0) return "";
  const lotsWithZones = lots.filter((l) => l.zone_polygon || l.zone_rect);
  if (lotsWithZones.length === 0) return "";

  const zoneLines = lotsWithZones
    .map((l) => {
      const surfaceHint = l.surface_m2
        ? ` (confirmed total: ~${l.surface_m2.toFixed(0)}m²)`
        : "";
      if (l.zone_polygon && l.zone_polygon.points.length >= 3) {
        const ptsStr = l.zone_polygon.points
          .map(
            (p) =>
              `(${p.x_percent.toFixed(1)}%,${p.y_percent.toFixed(1)}%)`
          )
          .join(" → ");
        return `- ${l.name}: polygon ${ptsStr}${surfaceHint}`;
      }
      return `- ${l.name}: x=${l.zone_rect!.x_percent.toFixed(1)}%, y=${l.zone_rect!.y_percent.toFixed(1)}%, width=${l.zone_rect!.width_percent.toFixed(1)}%, height=${l.zone_rect!.height_percent.toFixed(1)}%${surfaceHint}`;
    })
    .join("\n");

  return `
SPATIAL CONSTRAINT — LOT ZONES:
The plan has been divided into the following lots (zones). Each room MUST be placed inside the lot zone it belongs to.

${zoneLines}

RULES:
- Every room bounding_box MUST be INSIDE one of the lot zones above.
- Place rooms so that adjacent rooms SHARE WALLS — their bounding boxes must TOUCH with zero gap.
- Rooms cannot float in empty space — they must fill the lot zone.

`;
}

// ─── System prompt ─────────────────────────────────────────────────
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
  Priority A (MANDATORY): Look for the surface value PRINTED on the plan next to or inside the room. Use this value AS-IS.
  COMMON MISREAD ERRORS — check yourself:
    - "3.6 m²" misread as "36 m²" → a WC is 3.6 not 36.
    - "12,5 m²" (French comma = decimal separator) → 12.5 m², NOT 125 m².
    - Numbers near dimension lines (cotes) are LENGTHS in meters, not surfaces.
  Priority B: If no surface is printed but dimensions readable: surface_m2 = length_m × width_m. Values > 50 are likely centimeters — divide by 100.
  Priority C: If nothing readable: estimate using door width = 83cm as scale reference. Set confidence < 0.5.
  SANITY CHECK — mandatory for EVERY room:
    WC 1-4 m² | SdB 3-12 m² | Chambre 8-25 m² | Cuisine 5-25 m² | Séjour 15-60 m² | Couloir 2-12 m² | Cellier/Rangement 1-8 m²
  If a value falls outside these ranges, RE-READ the plan.

STEP 5 — BOUNDING BOXES (critical — anchor to wall positions):
  Each bounding_box = tightest axis-aligned rectangle enclosing one room.
  RULES:
  1. ANCHOR TO WALLS: x_percent/y_percent = top-left WHERE THE ROOM'S WALLS BEGIN on the image.
  2. NON-RECTANGULAR (L-shape, irregular): tightest rectangle containing the entire room.
  3. ADJACENCY: shared-wall rooms MUST have touching boxes (within 1%).
  4. PROPORTIONALITY: box area proportional to surface_m2.
  5. COVERAGE: union of all boxes fills the building_outline.
  6. CONTAINMENT: every box inside building_outline.
  7. BOUNDS: x_percent + width_percent <= 100, y_percent + height_percent <= 100, all >= 0.

STEP 6 — METADATA:
  - windows_count / doors_count: count per room.
  - floor: 0 = RDC, default 0 if single level.
  - confidence: 0-1. Lower if estimated or ambiguous.
  - scale_reference: "dimensions_on_plan" if surfaces/cotes printed, "scale_bar" if graphical scale, "door_standard_83cm" if estimated, "none" otherwise.
  - shape: "rectangular", "square", "L-shaped", "narrow_corridor", or "irregular".
  - IGNORE: electrical/plumbing symbols, furniture outlines, north arrows, title blocks.
${buildLotZonesSection(lots)}
STEP 7 — SELF-REVIEW (mandatory — do NOT skip):
  1. Does each surface_m2 match what is PRINTED on the plan? Re-read each number.
  2. Sum of surfaces: does it make sense for a ${typeBien}? Typical apartment = 40-120 m².
  3. Every bounding box inside building_outline?
  4. Adjacent rooms sharing a wall → their boxes touch?
  5. Small rooms (WC, SdB) have smaller boxes than large rooms (Séjour)?
  6. Did I use the EXACT room names from the plan?
  7. Did I invent a room that is NOT visible on the plan? If yes, remove it.

TYPE DE BIEN: "${typeBien}". If "immeuble", there may be multiple units — identify them if possible.

OUTPUT: valid JSON matching the schema. French room names as written on the plan. No text outside JSON.`;
}

// ─── JSON Schema for structured output ─────────────────────────────
const PLAN_EXTRACTION_JSON_SCHEMA = {
  name: "plan_extraction",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      rooms: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            temp_id: { type: "string" as const },
            name_raw: { type: "string" as const },
            surface_m2: { type: ["number", "null"] as const, exclusiveMinimum: 0 },
            dimensions: {
              anyOf: [
                {
                  type: "object" as const,
                  properties: {
                    length_m: { type: "number" as const, exclusiveMinimum: 0 },
                    width_m: { type: "number" as const, exclusiveMinimum: 0 },
                  },
                  required: ["length_m", "width_m"],
                  additionalProperties: false,
                },
                { type: "null" as const },
              ],
            },
            ceiling_height_m: { type: ["number", "null"] as const, exclusiveMinimum: 0 },
            windows_count: { type: "integer" as const, minimum: 0 },
            doors_count: { type: "integer" as const, minimum: 0 },
            floor: { type: ["integer", "null"] as const, minimum: 0 },
            confidence: { type: "number" as const, minimum: 0, maximum: 1 },
            shape: {
              anyOf: [
                {
                  type: "string" as const,
                  enum: [
                    "rectangular",
                    "square",
                    "L-shaped",
                    "narrow_corridor",
                    "irregular",
                  ],
                },
                { type: "null" as const },
              ],
            },
            notes: { type: ["string", "null"] as const },
            bounding_box: {
              anyOf: [
                {
                  type: "object" as const,
                  properties: {
                    x_percent: { type: "number" as const },
                    y_percent: { type: "number" as const },
                    width_percent: { type: "number" as const },
                    height_percent: { type: "number" as const },
                  },
                  required: [
                    "x_percent",
                    "y_percent",
                    "width_percent",
                    "height_percent",
                  ],
                  additionalProperties: false,
                },
                { type: "null" as const },
              ],
            },
          },
          required: [
            "temp_id",
            "name_raw",
            "surface_m2",
            "dimensions",
            "ceiling_height_m",
            "windows_count",
            "doors_count",
            "floor",
            "confidence",
            "shape",
            "notes",
            "bounding_box",
          ],
          additionalProperties: false,
        },
      },
      building_outline: {
        anyOf: [
          {
            type: "object" as const,
            properties: {
              x_percent: { type: "number" as const },
              y_percent: { type: "number" as const },
              width_percent: { type: "number" as const },
              height_percent: { type: "number" as const },
            },
            required: [
              "x_percent",
              "y_percent",
              "width_percent",
              "height_percent",
            ],
            additionalProperties: false,
          },
          { type: "null" as const },
        ],
      },
      total_surface_m2: { type: ["number", "null"] as const, exclusiveMinimum: 0 },
      floors_count: { type: "integer" as const, minimum: 1 },
      extraction_warnings: {
        type: "array" as const,
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
        enum: ["dimensions_on_plan", "door_standard_83cm", "scale_bar", "none"],
      },
    },
    required: [
      "rooms",
      "building_outline",
      "total_surface_m2",
      "floors_count",
      "extraction_warnings",
      "scale_reference",
    ],
    additionalProperties: false,
  },
};

// ─── Vision extraction call ────────────────────────────────────────
async function callVisionExtraction(
  openai: OpenAI,
  systemPrompt: string,
  imageDataUrl: string,
  retryContext?: string
): Promise<string> {
  const response = await openai.responses.create({
    model: "gpt-4.1",
    input: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "input_image", image_url: imageDataUrl },
          {
            type: "input_text",
            text:
              retryContext ||
              "Extract all rooms from this floor plan.",
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        ...PLAN_EXTRACTION_JSON_SCHEMA,
      },
    },
  });

  return extractTextFromResponse(response);
}

// ─── Self-correction call ──────────────────────────────────────────
async function callSelfCorrection(
  openai: OpenAI,
  systemPrompt: string,
  imageDataUrl: string,
  previousJson: string,
  zodErrors: string
): Promise<string> {
  const response = await openai.responses.create({
    model: "gpt-4.1",
    input: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "input_image", image_url: imageDataUrl },
          { type: "input_text", text: "Extract all rooms from this floor plan." },
        ],
      },
      {
        role: "assistant",
        content: previousJson,
      },
      {
        role: "user",
        content: `Your previous response had validation errors:\n${zodErrors}\n\nPlease fix these errors and return valid JSON.`,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        ...PLAN_EXTRACTION_JSON_SCHEMA,
      },
    },
  });

  return extractTextFromResponse(response);
}

// ─── Main extraction function ──────────────────────────────────────

/**
 * Extract structured room data from a floor plan image using GPT-4.1 vision.
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

  // If PDF, convert to PNG first
  let imageBase64 = planBase64;
  let imageMimeType = mimeType;

  if (isPdf(mimeType, planBase64)) {
    console.log("[plan-extractor] PDF detected — converting to PNG via pdf-to-img...");
    try {
      // Import dynamique : pdf-to-img casse le build Next.js en import statique (cf. retour Replit s20).
      const { pdf } = await import("pdf-to-img");
      const pdfBuffer = Buffer.from(planBase64, "base64");
      const pages = await pdf(pdfBuffer, { scale: 3 });
      for await (const page of pages) {
        imageBase64 = Buffer.from(page).toString("base64");
        imageMimeType = "image/png";
        break;
      }
    } catch (convErr) {
      console.error("[plan-extractor] PDF→PNG conversion failed:", convErr);
      throw new PlanExtractionError(
        "API_ERROR",
        "Impossible de lire ce PDF. Vérifiez qu'il n'est pas protégé par mot de passe."
      );
    }
  }

  const imageDataUrl = buildImageDataUrl(imageMimeType, imageBase64);

  // First attempt
  let rawJson: string;
  try {
    rawJson = await callVisionExtraction(openai, systemPrompt, imageDataUrl, retryContext);
  } catch (err) {
    console.warn("[plan-extractor] First attempt failed, retrying in 5s...", err instanceof Error ? err.message : err);
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

  // Self-correction
  console.warn("[plan-extractor] Zod validation failed, attempting self-correction...");
  try {
    const correctedJson = await callSelfCorrection(
      openai, systemPrompt, imageDataUrl, rawJson,
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
  floorIndex: number;
}

export async function extractMultiplePlans(
  plans: PlanInput[],
  typeBien: TypeBien,
  retryContext?: string,
  lots?: LotZone[]
): Promise<PlanExtractionResult> {
  if (plans.length === 0) {
    throw new PlanExtractionError("PLAN_UNREADABLE", "Aucun plan fourni.");
  }
  if (plans.length === 1) {
    return extractPlanData(plans[0].base64, plans[0].mimeType, typeBien, retryContext, lots);
  }

  const allRooms: PlanExtractionResult["rooms"] = [];
  type ExtractionWarning = PlanExtractionResult["extraction_warnings"][number];
  const allWarnings = new Set<ExtractionWarning>();
  let totalSurface = 0;
  let hasAnySurface = false;
  let scaleRef: PlanExtractionResult["scale_reference"] = "none";
  let firstOutline: PlanExtractionResult["building_outline"] = null;

  for (const plan of plans) {
    const result = await extractPlanData(plan.base64, plan.mimeType, typeBien, retryContext, lots);
    if (firstOutline === null && result.building_outline) firstOutline = result.building_outline;
    for (const room of result.rooms) {
      allRooms.push({ ...room, floor: plan.floorIndex, temp_id: `f${plan.floorIndex}_${room.temp_id}` });
    }
    for (const w of result.extraction_warnings) allWarnings.add(w);
    if (result.total_surface_m2 !== null) { totalSurface += result.total_surface_m2; hasAnySurface = true; }
    if (result.scale_reference !== "none") scaleRef = result.scale_reference;
  }

  return {
    rooms: allRooms,
    building_outline: firstOutline,
    total_surface_m2: hasAnySurface ? totalSurface : null,
    floors_count: plans.length,
    extraction_warnings: Array.from(allWarnings),
    scale_reference: scaleRef,
  };
}

// ─── Room type inference ───────────────────────────────────────────

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

// ─── Surface sanitization ──────────────────────────────────────────

export interface SanitizationEntry {
  room: string;
  from: number | null;
  to: number | null;
  reason: string;
}

export function sanitizeSurfaces(data: PlanExtractionResult, typeBien?: string): { data: PlanExtractionResult; log: SanitizationEntry[] } {
  const rooms = data.rooms.map((r) => ({
    ...r,
    dimensions: r.dimensions ? { ...r.dimensions } : null,
    bounding_box: r.bounding_box ? { ...r.bounding_box } : r.bounding_box,
  }));
  let totalSurface = data.total_surface_m2;
  const log: SanitizationEntry[] = [];

  const buildingOutline = data.building_outline ? { ...data.building_outline } : null;
  if (buildingOutline) {
    buildingOutline.x_percent = Math.max(0, Math.min(buildingOutline.x_percent, 99));
    buildingOutline.y_percent = Math.max(0, Math.min(buildingOutline.y_percent, 99));
    buildingOutline.width_percent = Math.max(5, Math.min(buildingOutline.width_percent, 100 - buildingOutline.x_percent));
    buildingOutline.height_percent = Math.max(5, Math.min(buildingOutline.height_percent, 100 - buildingOutline.y_percent));
  }
  data = { ...data, building_outline: buildingOutline };

  const globalMaxRoom = typeBien === "maison" ? 150 : typeBien === "immeuble" ? 250 : 80;
  const ROOM_TYPE_MAX: Record<string, number> = { wc: 8, sdb: 20, chambre: 35, cuisine: 40, salon: 80, bureau: 30, couloir: 25, cave: 40, autre: 60 };
  const ROOM_TYPE_MIN: Record<string, number> = { wc: 0.5, sdb: 2, chambre: 5, cuisine: 3, salon: 8, bureau: 3, couloir: 1, cave: 1, autre: 1 };

  // Fix 0: Systematic 10x error
  const validSurfaces = rooms.filter((r) => r.surface_m2 !== null).map((r) => r.surface_m2!).sort((a, b) => a - b);
  if (validSurfaces.length >= 2) {
    const median = validSurfaces[Math.floor(validSurfaces.length / 2)];
    if (median > globalMaxRoom) {
      for (const room of rooms) {
        if (room.surface_m2 !== null) {
          const before = room.surface_m2;
          room.surface_m2 = Math.round(room.surface_m2 * 10) / 100;
          log.push({ room: room.name_raw, from: before, to: room.surface_m2, reason: "10x_correction" });
        }
        room.confidence = Math.min(room.confidence, 0.5);
      }
      if (totalSurface !== null) totalSurface = Math.round(totalSurface * 10) / 100;
    }
  }

  // Fix 0b: Per-room-type 10x
  for (const room of rooms) {
    if (room.surface_m2 === null) continue;
    const rType = inferRoomTypeFromName(room.name_raw);
    const maxForType = ROOM_TYPE_MAX[rType] ?? ROOM_TYPE_MAX.autre;
    const minForType = ROOM_TYPE_MIN[rType] ?? ROOM_TYPE_MIN.autre;
    if (room.surface_m2 > maxForType * 1.2) {
      const divided = Math.round(room.surface_m2 * 10) / 100;
      if (divided >= minForType && divided <= maxForType * 1.2) {
        const before = room.surface_m2;
        room.surface_m2 = divided;
        room.confidence = Math.min(room.confidence, 0.5);
        log.push({ room: room.name_raw, from: before, to: room.surface_m2, reason: "10x_per_type" });
      }
    }
  }

  // Fix 1: Individual room checks
  for (const room of rooms) {
    if (room.surface_m2 === null) continue;
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
    // Reject non-positive surfaces (could result from bad corrections)
    if (room.surface_m2 !== null && room.surface_m2 <= 0) {
      log.push({ room: room.name_raw, from: room.surface_m2, to: null, reason: "non_positive" });
      room.surface_m2 = null; room.dimensions = null; room.confidence = Math.min(room.confidence, 0.3);
    }
    const rType = inferRoomTypeFromName(room.name_raw);
    const maxForType = ROOM_TYPE_MAX[rType] ?? ROOM_TYPE_MAX.autre;
    if (room.surface_m2 !== null && room.surface_m2 > maxForType * 1.2) {
      log.push({ room: room.name_raw, from: room.surface_m2, to: null, reason: `cap_type_${rType}` });
      room.surface_m2 = null; room.dimensions = null; room.confidence = Math.min(room.confidence, 0.3);
    }
    if (room.surface_m2 !== null && room.surface_m2 > globalMaxRoom) {
      log.push({ room: room.name_raw, from: room.surface_m2, to: null, reason: `cap_global` });
      room.surface_m2 = null; room.dimensions = null; room.confidence = Math.min(room.confidence, 0.3);
    }
    if (totalSurface !== null && room.surface_m2 !== null && room.surface_m2 > totalSurface) {
      log.push({ room: room.name_raw, from: room.surface_m2, to: null, reason: "exceeds_total" });
      room.surface_m2 = null; room.dimensions = null; room.confidence = Math.min(room.confidence, 0.3);
    }
  }

  // Fix 2: Clamp bounding boxes
  const outline = data.building_outline;
  const oMinX = outline ? outline.x_percent : 0;
  const oMinY = outline ? outline.y_percent : 0;
  const oMaxX = outline ? outline.x_percent + outline.width_percent : 100;
  const oMaxY = outline ? outline.y_percent + outline.height_percent : 100;
  for (const room of rooms) {
    if (!room.bounding_box) continue;
    const bb = room.bounding_box;
    bb.x_percent = Math.max(oMinX, Math.min(bb.x_percent, oMaxX - 1));
    bb.y_percent = Math.max(oMinY, Math.min(bb.y_percent, oMaxY - 1));
    bb.width_percent = Math.max(1, Math.min(bb.width_percent, oMaxX - bb.x_percent));
    bb.height_percent = Math.max(1, Math.min(bb.height_percent, oMaxY - bb.y_percent));
  }

  // Fix 3: Recalculate total
  const sumSurfaces = rooms.reduce((s, r) => s + (r.surface_m2 ?? 0), 0);
  let correctedTotal = totalSurface;
  if (correctedTotal === null || (sumSurfaces > 0 && Math.abs(sumSurfaces - (correctedTotal ?? 0)) > sumSurfaces * 0.3)) {
    correctedTotal = Math.round(sumSurfaces * 100) / 100;
  }

  return { data: { ...data, rooms, total_surface_m2: correctedTotal }, log };
}

// ─── Quality gates ─────────────────────────────────────────────────

export interface ExtractionQualityGate {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface ExtractionQualityReport {
  score: number;
  gates: ExtractionQualityGate[];
  warnings: string[];
  shouldRetry: boolean;
}

export function validateExtraction(
  data: PlanExtractionResult,
  sanitizationLog?: SanitizationEntry[],
  typeBien?: string
): ExtractionQualityReport {
  const gates: ExtractionQualityGate[] = [];
  const warnings: string[] = [];

  if (sanitizationLog) {
    for (const entry of sanitizationLog) {
      if (entry.reason === "10x_correction") warnings.push(`${entry.room} : surface corrigée de ${entry.from}m² → ${entry.to}m².`);
      else if (entry.reason.startsWith("cap_")) warnings.push(`${entry.room} : surface de ${entry.from}m² aberrante, supprimée.`);
      else if (entry.reason === "exceeds_total") warnings.push(`${entry.room} : surface de ${entry.from}m² dépasse le total, supprimée.`);
      else if (entry.reason === "cm_to_m") warnings.push(`${entry.room} : dimensions converties cm→m (${entry.from}m² → ${entry.to}m²).`);
    }
  }

  const maxTotal = typeBien === "maison" ? 500 : typeBien === "immeuble" ? 800 : 300;
  const RT_MAX: Record<string, number> = { wc: 8, sdb: 20, chambre: 35, cuisine: 40, salon: 80, bureau: 30, couloir: 25, cave: 40, autre: 60 };

  const oversized = data.rooms.filter((r) => {
    if (r.surface_m2 === null) return false;
    const max = RT_MAX[inferRoomTypeFromName(r.name_raw)] ?? RT_MAX.autre;
    return r.surface_m2 > max * 1.2;
  });
  gates.push({
    id: "G1_SURFACE_RANGE", label: "Surfaces réalistes par type", passed: oversized.length === 0,
    detail: oversized.length > 0 ? `Pièces hors range : ${oversized.map((r) => `${r.name_raw} (${r.surface_m2}m²)`).join(", ")}` : undefined,
  });

  const totalSurface = data.rooms.reduce((s, r) => s + (r.surface_m2 ?? 0), 0);
  gates.push({
    id: "G2_TOTAL_SURFACE", label: `Surface totale < ${maxTotal}m²`, passed: totalSurface > 0 && totalSurface < maxTotal,
    detail: `Total calculé : ${totalSurface.toFixed(1)}m²`,
  });
  gates.push({
    id: "G3_MIN_ROOMS", label: "Au moins 1 pièce", passed: data.rooms.length >= 1,
    detail: `${data.rooms.length} pièce(s) détectée(s)`,
  });

  const withBbox = data.rooms.filter((r) => r.bounding_box).length;
  gates.push({
    id: "G4_BBOXES", label: "Bounding boxes > 50%", passed: withBbox > data.rooms.length * 0.5,
    detail: `${withBbox}/${data.rooms.length} pièces avec bounding box`,
  });

  const avgConf = data.rooms.reduce((s, r) => s + r.confidence, 0) / Math.max(data.rooms.length, 1);
  gates.push({
    id: "G5_CONFIDENCE", label: "Confiance > 0.4", passed: avgConf > 0.4,
    detail: `Confiance moyenne : ${avgConf.toFixed(2)}`,
  });

  // G6: Duplicate detection — same name on same floor is suspicious
  const roomKeys = data.rooms.map((r) => `${r.name_raw.toLowerCase().trim()}__f${r.floor ?? 0}`);
  const duplicates = roomKeys.filter((k, i) => roomKeys.indexOf(k) !== i);
  const uniqueDups = Array.from(new Set(duplicates));
  gates.push({
    id: "G6_NO_DUPLICATES", label: "Pas de pièces dupliquées", passed: uniqueDups.length === 0,
    detail: uniqueDups.length > 0 ? `Doublons : ${uniqueDups.join(", ")}` : undefined,
  });

  // G7: Rooms inside building outline
  if (data.building_outline) {
    const ol = data.building_outline;
    const olMaxX = ol.x_percent + ol.width_percent;
    const olMaxY = ol.y_percent + ol.height_percent;
    const outsideRooms = data.rooms.filter((r) => {
      if (!r.bounding_box) return false;
      const bb = r.bounding_box;
      return bb.x_percent < ol.x_percent - 2 || bb.y_percent < ol.y_percent - 2 ||
        bb.x_percent + bb.width_percent > olMaxX + 2 || bb.y_percent + bb.height_percent > olMaxY + 2;
    });
    gates.push({
      id: "G7_INSIDE_OUTLINE", label: "Pièces dans le building outline", passed: outsideRooms.length === 0,
      detail: outsideRooms.length > 0 ? `Hors outline : ${outsideRooms.map((r) => r.name_raw).join(", ")}` : undefined,
    });
  }

  const passed = gates.filter((g) => g.passed).length;
  const score = Math.round((passed / gates.length) * 100);
  const shouldRetry = !gates.find((g) => g.id === "G3_MIN_ROOMS")?.passed || avgConf < 0.3 || oversized.length > data.rooms.length * 0.5;

  if (shouldRetry) warnings.push("La qualité de l'extraction est faible — une nouvelle tentative est recommandée.");

  return { score, gates, warnings, shouldRetry };
}
