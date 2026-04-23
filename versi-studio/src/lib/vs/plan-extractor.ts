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
  response: OpenAI.Responses.Response
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

STEP 0 — REFERENCE LANDMARKS (v4 MANDATORY — anchor coordinate system BEFORE placing any room):
Before you extract ANY room, identify 3-4 reference landmarks on the plan and write down their approximate (x%, y%) positions in your mental model. These landmarks anchor the whole coordinate system so every subsequent bbox is grounded in the actual image, not approximated.

STEP 0A — CARTOUCHE/TITLE BLOCK EXCLUSION (v4 NEW — CRITICAL):
Architect floor plans almost ALWAYS have non-plan zones on the image:
  - A TITLE BLOCK / CARTOUCHE at the BOTTOM of the page (usually y > 75%) containing: company logo, project name, sheet index, date, scale, "DOSSIER / EMETTIER / PHASE / LOT / INDICE / DATE / N°", "A885", "MUGUETS", "plan RDC", etc.
  - A LEGEND or NORTH ARROW in a corner
  - EXTERIOR ZONES (cour, terrasse, jardin) marked with hatching, dots, or parquet pattern OUTSIDE the thick perimeter wall
  - MARGINS (white space around the drawing).
The BUILDING (where rooms live) typically occupies 40-70% of the image, usually in the CENTER or UPPER-MIDDLE. The BOTTOM 15-25% of the image is almost ALWAYS the cartouche — NO ROOMS LIVE THERE.
BEFORE placing any bbox, explicitly identify the y-coordinate BELOW which there is only cartouche (typically y > 75-80%). Your rooms CANNOT have centroids in that zone.
If you see text like "MUGUETS", "DOSSIER", "EMETTIER", "A885", "plan", "PHASE", "INDICE", "ESQ", "ARC", "AVP" at position (x, y) → that (x,y) is the CARTOUCHE, not a room.

Landmarks to locate (pick at least 3):
  L1. MAIN ENTRANCE: the door leading to the exterior (usually on a building edge, often labeled "Entrée" or shown with a door arc on an exterior wall).
  L2. STAIRCASE: the zigzag / stepped block. In multi-unit buildings this is usually in a central palier.
  L3. NORTH-WEST BUILDING CORNER: the outermost thick wall corner at top-left of the building footprint.
  L4. SOUTH-EAST BUILDING CORNER: the outermost thick wall corner at bottom-right of the building footprint.

For EACH room you later extract, you MUST be able to answer: "This room is X% to the east of landmark L_N, and Y% to the south". If you cannot answer, the room is MISPLACED — re-examine the plan.

STEP 0B — LABEL ENUMERATION (v5 MANDATORY — label position = room CENTROID ANCHOR):
Before placing bboxes, FIRST enumerate EVERY ROOM LABEL you can see on the plan (text with m² unit nearby or single-word names like "WC", "SdB", "Couloir", "Palier", "Entrée", "ECS", "Cellier", "Placard", "SAS", "TGBT"). For each label, record:
  - the LITERAL text (e.g. "SdB", "Chambre", "Couloir")
  - its approximate (x%, y%) position — this is the CENTER of the room, where the label sits
  - any surface value printed nearby (e.g. "5.9 m²")

This list is your room ROSTER. Every label MUST become exactly ONE room in your output (no more, no less). Do NOT invent rooms without a label, and do NOT skip labeled rooms. If you see "ECS" written on the plan, you MUST emit a room called "ECS" with its bbox around that label's position.

LABEL-POSITION → BBOX ANCHORING RULE (v5 NEW — CRITICAL, STRICT):
For each room, the label (x%, y%) you identified above IS THE CENTROID of the room. Compute (x_c, y_c) = label position.
After tracing the walls, your bounding_box MUST satisfy:
  - bounding_box center = ((bbox.x + bbox.width/2), (bbox.y + bbox.height/2))
  - |bbox_center_x - x_c| ≤ 3% AND |bbox_center_y - y_c| ≤ 3% (i.e. max 3% drift from label centroid).
If your final bbox's center is more than 3% away from the label's (x,y), you have MISPLACED the room. RE-TRACE.
This rule kills the common failure mode where bboxes drift into the cartouche or into neighboring rooms: the label tells you where the room IS; walls only tell you where it ENDS.
Apply the same rule to the bounding_polygon: centroid(polygon) must be within 3% of label(x,y).

// PROMPT BUILDING_OUTLINE — v8 (6.8/10) → v9 (8.5/10 self-scored plafond prompt-only)
// Techniques v9 : few-shot example (Muguets RDC) + chain-of-thought explicite
// (4-step reasoning) + contrainte numérique dure (area ≈ Σ rooms×1.05) + JSON output
// exemple + anti-hallucination directive. Taille ~55L (vs v8 ~35L, v6/v7 ~170L).
// Plafond atteignable prompt-only documenté dans docs/ia/s25-prompt-iteration-final.md.
// Post-process TS (outline-shrinker.ts, OCR snap) reste le chemin vers 10/10.

STEP 0C — COMMON AREAS (short list, unit_id = null):
Briefly note any shared zones visible on the plan: escalier commun (stair block, zigzag
or spiral/colimaçon), palier (landing outside the apartment door), local vélos/poubelles/
technique, cave, TGBT. Emit them as rooms with unit_id = null if clearly enclosed.
They are NEVER inside building_outline.
If unsure whether a block is shared stair → assume YES (French immeubles almost always
have a shared staircase, straight or spiral).

STEP 1 — READING THE PLAN (distinguish elements):
  - WALLS: thick solid lines (black, grey, or colored fills) defining rooms.
  - PARTITIONS: thinner solid lines inside the building separating rooms.
  - DASHED/DOTTED lines: property boundaries or future work — NOT walls.
  - HATCHED/FILLED rectangles: wall cross-sections confirming wall positions.
  - DIMENSION LINES (cotes): thin lines with numbers — read the numbers, ignore the lines.
  - ANNOTATIONS: room names, surface values (e.g., "12.0 m²"). Read text, do not confuse with walls.
  - STAIRCASES: zigzag/curved lines with steps. Note position but do NOT create a room for them.
  - OUTDOOR (terraces, balconies, gardens): outside exterior walls. Exclude unless fully enclosed.

STEP 2 — BUILDING_OUTLINE (v9 — CoT + few-shot + hard numerical constraint):

The building_outline is the TIGHTEST axis-aligned rectangle around the PRIVATE APARTMENT only (the "lot" — the habitable unit sold/rented as a whole).

THINK STEP BY STEP (do NOT skip any step):
  Step A. IDENTIFY the apartment entry door (the one a resident unlocks from the landing).
  Step B. LIST every room that belongs to that apartment (unit_id="u1"), with its approximate surface from the plan labels. Sum them → S_rooms.
  Step C. COMPUTE the tightest axis-aligned rectangle that encloses ONLY those rooms' walls. Nothing outside that door belongs to the outline.
  Step D. VERIFY numerical coherence (see HARD CONSTRAINT below). If it fails, SHRINK.

EXCLUDE — NO EXCEPTION, ZERO overlap (negative-first, priority #1):
- NO escalier (zigzag, curved, spiral/colimaçon, ANY stair steps). Visible stair = OUT.
- NO palier: the shared landing outside the apartment door.
- NO terrasse, NO balcon, NO patio, NO loggia, NO jardin, NO cour. Outdoor = OUT, even if tiled.
- NO local vélos / poubelles / technique, NO cave, NO TGBT, NO ECS commun, NO placard palier.
- NO cartouche (title block at bottom with "DOSSIER", "MUGUETS", "INDICE", "A885", dates, scales).

HARD NUMERICAL CONSTRAINT (mandatory, verify before emitting):
  outline_area_m2 ≈ S_rooms × scale_factor, where scale_factor ∈ [1.00, 1.08] (5-8% for wall thickness).
  If your outline implies an area > S_rooms × 1.10 → you SWALLOWED a non-apartment zone (escalier/terrasse/palier). SHRINK until constraint holds.
  If S_rooms unknown because surfaces not printed, use the SIZE PRIOR below.

SIZE PRIOR (fallback only — French apartment on immeuble plan):
- width_percent: 40-60%. height_percent: 40-65%.
- width_percent > 65% → almost certainly included escalier OR terrasse → SHRINK.
- height_percent > 70% → included terrasse or cartouche → SHRINK.

FEW-SHOT EXAMPLE (Muguets RDC — T2 with shared spiral staircase + tiled terrace):
  Plan shows: 1 entrance door top-center, rooms [Entrée 3m², Séjour 18m², Cuisine 8m², Chambre 11m², SdB 4m²] = 44m².
  A SPIRAL staircase (colimaçon) sits CENTER-LEFT, shared with other floors → OUT.
  A tiled TERRACE sits BOTTOM-RIGHT, outside the thick exterior wall → OUT.
  CORRECT outline: x=18%, y=20%, width=54%, height=48% (tight around 5 rooms only).
  WRONG outline (v7 bug): x=12%, y=18%, width=62%, height=56% — swallowed terrasse + escalier corner, implied 47m². Reject.
  Expected JSON: {"building_outline": {"x_percent": 18, "y_percent": 20, "width_percent": 54, "height_percent": 48}}

ANTI-HALLUCINATION:
- Do NOT infer an apartment that is not visible. If the plan shows no "lot privé" zone (only common areas), emit building_outline = null.
- Do NOT enlarge the outline to reach the SIZE PRIOR minima. Trust the plan, not priors.
- Do NOT merge two apartments into one outline even if adjacent. One outline = one lot.

SELF-CHECK (3 questions, answer each INTERNALLY before emitting):
1. Entry door: can I reach every u1 room from it without crossing a shared door? If NO → outline wrong.
2. Stair pattern (zigzag/stepped/spiral) INSIDE outline? If YES → shrink to stair's outer wall.
3. Outdoor texture (hatching, tiles outside perimeter, decking) INSIDE outline? If YES → shrink to apartment exterior wall.

Return building_outline as { x_percent, y_percent, width_percent, height_percent } or null.
Every room with unit_id = "u1" MUST fit INSIDE this rectangle (tolerance 1%). Rooms with unit_id = null MUST be OUTSIDE.

STEP 3 — IDENTIFY ROOMS:
For each enclosed space bounded by walls/partitions:
  a. Use the room name EXACTLY as written on the plan (e.g., "Chambre", "SdB", "Séjour/Cuisine"). Do NOT rename.
  b. If no name is written, infer from fixtures (sink=bathroom, stove=kitchen) and set confidence < 0.6.
  c. Include: living, bedrooms, kitchens, bathrooms, WC, hallways, entries, storage, cellars, utility rooms.
  d. Exclude: outdoor terraces, balconies, gardens, staircases.
  e. Open-plan rooms (e.g., "Séjour/Cuisine" with no dividing wall): ONE room, not two.

STEP 3b — UNIT IDENTIFICATION (mandatory for "immeuble" type):
  For multi-unit buildings (immeubles de rapport), identify which rooms belong to the same residential unit (apartment/logement).
  RULES:
  1. Assign a unit_id (u1, u2, u3...) to each room that clearly belongs to a specific unit.
  2. Rooms sharing the same unit_id MUST be on the same floor, physically connected, and form a coherent residential unit (at minimum: 1 living space + 1 wet room).
  3. If the plan labels units (e.g., "Appartement 1", "Lot A", "T3 gauche"), use that information.
  4. If units are NOT labeled but rooms cluster spatially: look for entrance doors on exterior walls or landing. Rooms accessible only from each other = 1 unit. Separate entrances = separate units.
  5. Set unit_id = null ONLY if: common area (staircase, hall, cellar, trash room) or truly ambiguous.
  6. For "maison" or single "appartement": all rooms get unit_id = "u1" (or null if common area).
  7. DEFAULT-U1 RULE (v3 — new, MANDATORY): if you identified 2+ habitable rooms on the plan and
     you do NOT see evidence of MULTIPLE separate entrance doors from a common hallway or landing,
     then ALL those rooms belong to the SAME unit. Assign unit_id = "u1" to all of them.
     Do NOT leave unit_id = null just because you are unsure. A plan showing 2 bedrooms + 1 bathroom
     + 1 landing is ONE apartment (unit "u1"), NOT separate units.

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

STEP 5 — BOUNDING BOXES (critical — v3 WALL-ANCHORED, NO approximation):
  Each bounding_box = tightest axis-aligned rectangle enclosing one room's FLOOR AREA.

  ABSOLUTE RULE (v3 — NEW, MANDATORY):
  The bounding_box MUST be computed from the VISIBLE walls of the actual room on the plan.
  It is FORBIDDEN to approximate the position "near the label" or "around the general area".
  If you see a room labeled "SdB" at a specific spot, the bbox corners MUST coincide (within
  a 1% tolerance) with the visible wall lines that delimit THAT specific "SdB" on the plan.

  NEGATIVE CONSTRAINTS (v3 — violate any of these and your output is REJECTED):
  N1. NEVER place a bbox >1 m away from the labeled location you see on the plan.
      Estimate 1 m using the plan scale (a standard door = 0.83 m, a WC ≈ 1.5 × 1.2 m).
  N2. NEVER approximate bbox coordinates by "reasonable guess" — trace the actual walls.
  N3. NEVER place the bbox around the text label's extent — the label is at the center of
      the room, the bbox must extend from wall to wall (usually 5-15× larger than the text).
  N4. NEVER omit a labeled space even if small: WC, placard, cellier, palier, SAS, dressing,
      buanderie, local technique, ECS — all of these are rooms and MUST be included as distinct
      entries if they have a visible enclosed perimeter on the plan.
  N5. NEVER leave >15% of a unit's envelope empty. If after extracting all your rooms the
      remaining uncovered space inside a unit is >15% of the unit envelope, you MISSED a room.

  TILING CONSTRAINT INSIDE EACH UNIT (v3 — MANDATORY for type "immeuble" + multi-room units):
  Within a single unit (rooms sharing the same unit_id), the rooms MUST TILE the unit's
  envelope — no empty space except structural walls between rooms.
  Procedure:
    a. Group your extracted rooms by unit_id.
    b. Compute the axis-aligned envelope of each unit = tightest rectangle containing all
       bboxes of rooms with that unit_id.
    c. Compute the sum of bbox areas of rooms in that unit.
    d. If sum_areas / envelope_area < 0.85, the unit has missing rooms. RE-EXAMINE the plan:
       there is very likely a labeled space (WC, placard, palier, cellier) you did not extract.
    e. Common missed spaces: WC sometimes labeled just "WC" 1m², placards along walls,
       corridors/paliers in the middle of a unit, cellier/buanderie near the kitchen.
    f. Inside a unit there are NO "common areas" — every m² belongs to a named room. Outside
       the units there can be common areas (escalier, hall d'immeuble, local vélos).

  WALL IDENTIFICATION METHOD (follow this procedure for EACH room):
  a. Find the room name text on the plan (e.g., "Chambre", "SdB").
  b. Starting from that text, look OUTWARD in all 4 directions until you hit a WALL LINE.
     A wall is a thick solid line (typically 2-10px thick on the image), often filled black or grey.
     Do NOT confuse dimension lines (thin, with arrows/numbers) or furniture outlines with walls.
  c. The bounding_box edges MUST align with the INNER FACE of the walls surrounding the room.
     - x_percent = left wall inner edge (where the floor begins, not the wall center or outer face)
     - y_percent = top wall inner edge
     - x_percent + width_percent = right wall inner edge
     - y_percent + height_percent = bottom wall inner edge
  d. CRITICAL: do NOT place the bbox around the text label itself. The text is typically at the CENTER
     of the room. The bbox must extend from wall to wall, which is MUCH LARGER than the text area.

  ANTI-LABEL RULE: If your bbox width or height is less than 10% of the building outline dimension,
  you are likely boxing the text label, not the room. A real room is bounded by walls, not by its name.
  Re-examine the plan and extend to the actual wall lines.

  VALIDATION RULES:
  1. ADJACENCY: rooms sharing a wall MUST have bounding boxes that TOUCH or overlap by 0-2%
     (the wall thickness). If two adjacent rooms have a gap > 2% between their boxes, something is wrong.
  2. PROPORTIONALITY: bbox area should be roughly proportional to surface_m2.
     Cross-check: (room_bbox_area / building_outline_area) should approximate (room_surface / total_surface).
     If the ratio differs by more than 2x, re-examine the bbox placement.
  3. COVERAGE: the union of all room bboxes should fill approximately 85-100% of the building_outline.
     Large uncovered gaps inside the outline indicate missing rooms or too-small bboxes.
  4. CONTAINMENT: every bbox must be inside building_outline (with 1% tolerance).
  5. BOUNDS: x_percent + width_percent <= 100, y_percent + height_percent <= 100, all >= 0.
  6. MINIMUM SIZE: no bbox should have width_percent < 3 or height_percent < 3 (even a WC is visible).
  7. NO-OVERLAP (CRITICAL — new v3): bboxes of two DIFFERENT rooms MUST NOT overlap by more than 2%.
     If room A and room B are separated by a wall (even a short 1m wall between a bathroom and a hallway),
     their bboxes MUST have clearly different edges on the shared wall side. Overlap > 2% means
     one room's bbox is SWALLOWING a neighbor — WRONG.
  8. NO-SWALLOW (CRITICAL — new v3): do NOT extend a room's bbox over an adjacent room, corridor,
     landing, staircase, or technical zone (ECS, meter cabinet, electrical closet).
     Example of WRONG behavior: if there is "Chambre 03" on the left and "Palier" in the middle,
     the Chambre 03 bbox MUST stop at the wall between them. It must NOT extend into the Palier area.
  9. EXTERIOR-EXCLUSION (CRITICAL — new v3): never extend a room's bbox into zones marked as
     HATCHED PATTERNS (diagonal/grid lines outside the building), which indicate terraces, balconies,
     gardens, or property boundaries. These are OUTDOOR and must NEVER be part of a room bbox.
     The building's exterior wall (the thick line at the perimeter) is the HARD STOP.


STEP 5b — BOUNDING POLYGON (for ALL rooms, recommended):
  For EVERY room, provide bounding_polygon: an array of 4-8 vertices (clockwise order, % of image)
  tracing the room's wall outline. Place each vertex at a wall CORNER (where two walls meet).

  HOW TO TRACE:
  a. Start at the top-left corner of the room (where the top wall meets the left wall, INNER face).
  b. Follow the walls clockwise, placing a vertex at each corner.
  c. For rectangular rooms: exactly 4 vertices (the 4 corners).
  d. For L-shaped rooms: 6 vertices (the 6 corners of the L).
  e. For irregular rooms: up to 8 vertices to approximate the shape.

  RULES:
  - Vertices at wall INNER FACE corners, not wall centers or outer faces.
  - All coordinates 0-100% of image. No self-intersecting edges.
  - Minimum 4 points for any room. Maximum 8 points.
  - bounding_polygon = null ONLY if you truly cannot determine the room outline.
  - The polygon should be TIGHTER than bounding_box for non-rectangular rooms.

  POLYGON NO-SWALLOW RULE (CRITICAL — new v3):
  - Every vertex of the polygon MUST sit on a wall corner of THAT specific room.
  - If a neighbor room (even a small one like "Palier 12m²", "SDE 4m²", "ECS", "Local technique")
    is between this room and the exterior wall, the polygon MUST STOP at the shared partition wall.
  - Do NOT create a polygon that wraps around or includes a neighbor room.
  - Before finalizing the polygon, mentally trace the line from the room's text label outward
    in each direction: the FIRST thick wall you encounter is where the polygon must stop.
    If there is an intermediate thin partition wall (even 10-20cm thick) separating this room
    from a neighbor, THAT is the polygon edge, not the far exterior wall beyond the neighbor.

  FEW-SHOT EXAMPLE (how to handle a plan with ECS + Palier between 2 chambers):
  - Plan layout: | Chambre 03 | Palier (center) + ECS (top) + SDE (bottom) | hatched terrace |
  - WRONG: Chambre 03 polygon extends to cover Palier and ECS. Palier is missing as a room.
  - RIGHT: 4 polygons — Chambre 03 (left), Palier (center, as "Palier" or "Couloir"),
    ECS (top center, only if it's an enclosed room not just a symbol), SDE (bottom center).
    No overlap. The hatched terrace is NOT a room at all.

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
  4. Adjacent rooms sharing a wall → their boxes touch? If there is a gap > 2% between adjacent rooms, FIX IT.
  5. Small rooms (WC, SdB) have smaller boxes than large rooms (Séjour)?
  6. Did I use the EXACT room names from the plan?
  7. Did I invent a room that is NOT visible on the plan? If yes, remove it.
  8. If type_bien = "immeuble": do rooms with the same unit_id form coherent apartments? (connected, same floor, livable with at least 1 living + 1 wet room)
  9. BBOX vs WALLS CHECK: for each room, verify that x_percent aligns with the LEFT wall, not the left edge of the room name text. The bbox should span the entire floor area, wall-to-wall.
  10. COVERAGE CHECK: compute the total bbox area as a fraction of building_outline area. If < 70%, your bboxes are too small (likely anchored to text labels). Enlarge them to wall positions.
  11. If bounding_polygon provided: does each vertex sit on a wall corner? Is it tighter than bounding_box for non-rectangular rooms?
  12. Are there orphan rooms (no unit_id) that should belong to a unit? Re-check.
  13. PROPORTIONALITY CHECK: the largest room by surface_m2 should have the largest (or near-largest) bbox. If a 25m² room has a smaller bbox than a 5m² room, the bbox is wrong.
  14. NO-OVERLAP CHECK (v3 — mandatory): for EACH pair of rooms, compute the overlap of their bboxes.
      If any pair overlaps by > 2% of the smaller bbox area, STOP and reassign the shared edge to the
      actual partition wall between them. Two rooms cannot occupy the same space.
  15. NO-SWALLOW CHECK (v3 — mandatory): for EACH room, ask "is there any named room or technical
      zone (Palier, WC, ECS, SDE, Cellier, Couloir) that lies INSIDE my bbox?" If yes, shrink the
      bbox so it stops at the wall before that neighbor. A room's bbox must NEVER contain another room.
  16. EXTERIOR-EXCLUSION CHECK (v3 — mandatory): for EACH room, check if the bbox extends into any
      HATCHED zone (terrace, balcony, garden) OUTSIDE the main thick exterior wall. If yes, shrink
      the bbox to the exterior wall line. Outdoor hatching is NEVER part of a room.
  17. MISSED-ROOM CHECK (v3 — mandatory): identify every enclosed floor area within building_outline.
      A "Palier" or "Couloir" in the center of the plan, bounded by walls, IS A ROOM. Include it.
      Only exclude: staircases (zigzag steps), ECS closets (if clearly <1m² utility only), and outdoor
      hatched zones. If total covered area < 85% of building_outline, you missed a room.
  18. WALL-ANCHOR CHECK (v3 — NEW, mandatory): for EACH room, trace a line from the bbox corners
      to the nearest thick wall on the plan. The distance MUST be < 1% of the image width.
      If a corner floats more than 1%, the bbox is MISALIGNED — move it to the wall.
  19. UNIT TILING CHECK (v3 — NEW, mandatory for "immeuble"): for each unit_id, compute the
      envelope bbox (min/max across all bboxes in the unit) and sum the bbox areas of the unit's
      rooms. If sum < 85% of envelope, STOP and find the missing room(s). Typical suspects:
      WC (2m²), placard (1-2m²), palier (3-6m²), cellier (2-4m²), SAS (2-3m²).
  20. LANDMARK COHERENCE CHECK (v3 — NEW, mandatory): verify your step-0 landmarks are still
      consistent with the rooms you extracted. The entrance L1 must be adjacent to a habitable
      room (entree, sejour, or palier). The staircase L2 should not overlap any habitable room.
      If not, you have a position drift — re-examine the bbox positions.

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
            unit_id: {
              anyOf: [
                { type: "string" as const },
                { type: "null" as const },
              ],
            },
            bounding_polygon: {
              anyOf: [
                {
                  type: "array" as const,
                  items: {
                    type: "object" as const,
                    properties: {
                      x_percent: { type: "number" as const, minimum: 0, maximum: 100 },
                      y_percent: { type: "number" as const, minimum: 0, maximum: 100 },
                    },
                    required: ["x_percent", "y_percent"] as const,
                    additionalProperties: false,
                  },
                  minItems: 4,
                  maxItems: 12,
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
            "unit_id",
            "bounding_polygon",
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
            "unit_clustering_low_confidence",
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
          { type: "input_image", image_url: imageDataUrl, detail: "auto" as const },
          {
            type: "input_text",
            text:
              retryContext ||
              `Extract all rooms from this floor plan.

STEP-BY-STEP (v4):
1. FIRST locate the CARTOUCHE (title block) in the image, typically at the bottom. Note its y-range. NO ROOMS LIVE THERE.
2. SECOND enumerate ALL labeled rooms visible on the plan (names + approximate x%, y% centers). Write this roster before any bbox.
3. THIRD identify the BUILDING OUTLINE — the tightest rectangle containing all indoor rooms, EXCLUDING cartouche, terrace hatching, stairs well outside, margins.
4. FOURTH for each labeled room, place bounding_box edges at the INNER FACE of the surrounding walls — NOT around the room name text.
5. FIFTH provide bounding_polygon (4-12 vertices) at wall corners for every room.

Every label in step 2 MUST become ONE room in your output. Do not miss ECS, WC, placard, cellier, palier, SAS if labeled.`,
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
          { type: "input_image", image_url: imageDataUrl, detail: "auto" as const },
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

export function inferRoomTypeFromName(nameRaw: string): string {
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
