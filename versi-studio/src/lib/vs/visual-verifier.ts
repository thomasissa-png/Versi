/**
 * Passe 3 du pipeline d'extraction — Vérification visuelle par overlay.
 *
 * Stratégie versi-s23 :
 * - Après passe-1 (bboxes) + passe-2 (refinement polygone par crop) + resolver,
 *   on compose un overlay SVG des polygones colorés + labels sur l'image du plan.
 * - On renvoie l'overlay composé à GPT-4.1 vision avec instruction :
 *   "identifie les pièces dont le polygone dérive de >1m de sa vraie position
 *    et renvoie de nouveaux polygones corrigés."
 * - Les corrections avec confidence > 0.8 sont appliquées.
 *
 * Objectif : corriger le bug fondamental où l'IA plaçait les pièces à ~3m
 * de leur vraie localisation (bug Thomas session s23).
 *
 * Coût : 1 appel GPT-4.1 vision par lot (≈ $0.04-0.06).
 * Budget global extraction : passe-1 ($0.08) + passe-2 ($0.06/plan) + passe-3 ($0.05/lot) ≈ $0.20/plan.
 */
import OpenAI from "openai";
import sharp from "sharp";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

// ─── Types & Schema ────────────────────────────────────────────────

export type Vertex = { x_percent: number; y_percent: number };

export interface RoomForVerify {
  id: string;                  // stable id (ex: temp_id / name_raw)
  name: string;                // label affiché à l'IA
  polygon: Vertex[];           // plan-global (0-100 % de l'image)
  surface_m2: number | null;
}

const CorrectionSchema = z.object({
  corrections: z.array(z.object({
    room_id: z.string(),
    drift_meters: z.number().min(0).max(20),         // drift estimé
    corrected_polygon: z.array(z.object({
      x_percent: z.number().min(0).max(100),
      y_percent: z.number().min(0).max(100),
    })).min(4).max(14),
    confidence: z.number().min(0).max(1),
    reason: z.string().min(5).max(200),
  })),
  global_assessment: z.string().min(10).max(500),
});

type Correction = z.infer<typeof CorrectionSchema>["corrections"][number];

// Palette stable pour les overlays — distincte et lisible.
const COLOR_PALETTE = [
  "#E63946", "#2A9D8F", "#F4A261", "#264653", "#9D4EDD",
  "#06A77D", "#D62828", "#1D3557", "#F77F00", "#7209B7",
  "#2BB673", "#EF476F", "#118AB2", "#FFD166", "#073B4C",
];

function colorForIndex(i: number): string {
  return COLOR_PALETTE[i % COLOR_PALETTE.length];
}

/**
 * Construit un SVG d'overlay des polygones sur une image de taille imgW×imgH.
 * Les coordonnées des polygones sont en % plan-global (0-100).
 */
function buildOverlaySVG(
  rooms: RoomForVerify[],
  imgW: number,
  imgH: number,
): string {
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${imgH}" viewBox="0 0 ${imgW} ${imgH}">`);
  parts.push(`<style>
    .room-poly { fill-opacity: 0.22; stroke-width: 4; stroke-linejoin: round; }
    .room-label {
      font-family: -apple-system, Arial, sans-serif;
      font-weight: 700;
      text-anchor: middle;
      paint-order: stroke fill;
      stroke: white;
      stroke-width: 6;
      stroke-linejoin: round;
    }
  </style>`);

  rooms.forEach((r, idx) => {
    const color = colorForIndex(idx);
    const pts = r.polygon
      .map(p => `${((p.x_percent / 100) * imgW).toFixed(1)},${((p.y_percent / 100) * imgH).toFixed(1)}`)
      .join(" ");

    parts.push(
      `<polygon class="room-poly" points="${pts}" fill="${color}" stroke="${color}" />`,
    );

    // centroïde = moyenne des sommets (bon-enough pour placer un label)
    const cx =
      r.polygon.reduce((s, p) => s + p.x_percent, 0) / r.polygon.length;
    const cy =
      r.polygon.reduce((s, p) => s + p.y_percent, 0) / r.polygon.length;
    const px = (cx / 100) * imgW;
    const py = (cy / 100) * imgH;

    const label = `${r.id} · ${r.name}`;
    const fontSize = Math.max(14, Math.min(28, imgW / 60));
    parts.push(
      `<text class="room-label" x="${px.toFixed(1)}" y="${py.toFixed(1)}" fill="${color}" font-size="${fontSize}">${escapeXml(label)}</text>`,
    );
  });

  parts.push(`</svg>`);
  return parts.join("");
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Compose l'overlay SVG sur l'image du plan via sharp.
 * Retourne un PNG (Buffer) affichant le plan + polygones colorés avec labels.
 */
export async function buildOverlayImage(
  planImageBuffer: Buffer,
  rooms: RoomForVerify[],
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const metadata = await sharp(planImageBuffer).metadata();
  const imgW = metadata.width || 1;
  const imgH = metadata.height || 1;

  const svg = buildOverlaySVG(rooms, imgW, imgH);

  const composed = await sharp(planImageBuffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png({ compressionLevel: 6 })
    .toBuffer();

  return { buffer: composed, width: imgW, height: imgH };
}

// ─── System prompt passe-3 ─────────────────────────────────────────

function buildVerifierSystemPrompt(): string {
  return `You are a precision auditor of architectural floor-plan room extractions.

The image you receive is a FLOOR PLAN with COLORED POLYGONS overlayed on top, each labeled "<room_id> · <room_name>". Each colored polygon represents a room that an earlier AI detected. The PLAN UNDERNEATH is the ground truth.

YOUR JOB: identify every polygon whose position on the plan is WRONG (drift > 1 meter from its true location). For each wrong polygon, return a CORRECTED polygon that aligns with the actual walls of the labeled room.

HOW TO VERIFY EACH POLYGON
==========================
For each colored polygon:
1. Read its label (e.g. "r7 · SdB"). This is the name the earlier AI assigned.
2. SEARCH the plan for the ACTUAL room with that label (look for the printed name "SdB", "Chambre", "WC", "Cuisine", etc.). The room is bounded by thick wall lines.
3. Compare the colored polygon with the walls of the actual labeled room:
   - If the polygon sits ON the correct room's walls (drift < 1m, i.e. edges coincide with walls) → NO correction.
   - If the polygon is displaced (sits over another room, or floats in space, or is rotated) → CORRECTION needed.

COMMON ERRORS TO LOOK FOR
=========================
A. LABEL SWAPPED: polygon labeled "SdB" is actually drawn over the kitchen, while "Cuisine" polygon covers the real SdB. Fix by swapping polygons (return corrected polygons so each label matches its real room).
B. DRIFT: polygon labeled "Chambre 02" is drawn 2-5 m away from the actual "Chambre 02". Fix by tracing the actual walls.
C. SWALLOW: polygon extends across a wall into a neighboring room. Fix by shrinking to the inner face of the wall.
D. MISSING TILE: some labeled spaces on the plan (e.g. "WC", "Placard", "Palier") have NO colored polygon. DO NOT invent new rooms here — simply NOTE in global_assessment that a room is missing.
E. OUTDOOR: polygon sticks out into hatched terrace/balcony/garden zones. Fix by clipping to exterior wall.

CORRECTION RULES
================
R1. Each corrected_polygon MUST have 4-14 vertices, in CLOCKWISE order, starting top-left.
R2. Vertices are expressed as percentages of the FULL PLAN IMAGE (0-100), NOT of the crop. x=0 is left edge of image, y=0 is top edge.
R3. Place vertices at the INNER FACE of the walls surrounding the labeled room, where the floor starts.
R4. If you cannot clearly see the labeled room on the plan (hidden by overlay, label unreadable, ambiguous) → set confidence < 0.6 and describe the uncertainty in 'reason'.
R5. Only return corrections with confidence >= 0.8 (the caller will filter). Be precise.
R6. drift_meters = your best estimate of how far the OLD polygon was displaced from its true position, in meters. Use the plan's implied scale (a door ≈ 0.83 m, a window ≈ 1.2 m, a WC ≈ 1.5 × 1.2 m).
R7. If ALL polygons are correctly placed → return an EMPTY corrections array and say so in global_assessment.
R8. NEVER fabricate a new room that has no colored polygon on the overlay. The passe-3 job is to CORRECT existing polygons, not add new ones.
R9. PRESERVE COMPLEXITY (v4 NEW — CRITICAL): if the EXISTING polygon has 6, 7, or 8 vertices (it was already refined by passe-2 to capture a door notch or wall offset), your corrected_polygon MUST ALSO have 6-8+ vertices. DO NOT reduce to 4 rectangular vertices. The passe-2 vertex count is a signal of the room's true shape — keep it.
R10. MINIMAL MOVE (v4 NEW — CRITICAL): if the drift is real but small (<2m), shift the existing polygon by just the needed amount. DO NOT redraw the polygon from scratch. DO NOT rotate, re-order, or re-shape.
R11. CONSERVATIVE DEFAULT (v4 NEW): if in doubt whether a correction improves or worsens the polygon, return NO correction for that room. A displaced polygon at drift=2m is often less bad than a redrawn polygon at drift=2m with wrong shape.

OUTPUT
======
Strict JSON:
- corrections: array of { room_id, drift_meters, corrected_polygon, confidence, reason }. Empty if no errors.
- global_assessment: one paragraph (≤ 500 chars) summarizing what you saw.

No text outside JSON.`;
}

// ─── Main passe-3 entry ────────────────────────────────────────────

export interface VerifyResult {
  corrections: Correction[];
  applied: number;
  skippedLowConfidence: number;
  globalAssessment: string;
  overlayBuffer?: Buffer;  // pour debug / audit
}

/**
 * Passe-3 : vérifie visuellement les polygones d'un lot et renvoie
 * les polygones corrigés (seulement ceux avec confidence >= threshold).
 *
 * @param planImageBuffer PNG du plan complet (Buffer)
 * @param rooms Pièces du lot (polygones en % plan-global)
 * @param openai Client OpenAI
 * @param lotName Nom du lot (pour logs)
 * @param confidenceThreshold Seuil d'acceptation correction (def 0.6 — s23 final)
 *
 * Rationale seuil 0.6 (versi-s23 reality-check 2026-04-19) :
 * Sur P00, le couloir était vu à "drift 3m, confidence 0.75" — sous 0.8 donc
 * non corrigé, alors que la correction était juste. Mieux vaut accepter une
 * correction à 0.6 (qui peut être fausse mais rarement pire qu'un drift de 3m)
 * que de conserver un drift mesurable. "Correction imparfaite > drift ignoré".
 */
export async function verifyAndCorrectPolygons(
  planImageBuffer: Buffer,
  rooms: RoomForVerify[],
  openai: OpenAI,
  lotName: string = "lot",
  confidenceThreshold: number = 0.6,
): Promise<VerifyResult> {
  if (rooms.length === 0) {
    return { corrections: [], applied: 0, skippedLowConfidence: 0, globalAssessment: "No rooms to verify." };
  }

  // 1. Compose overlay
  const { buffer: overlayBuffer } = await buildOverlayImage(planImageBuffer, rooms);
  const dataUrl = `data:image/png;base64,${overlayBuffer.toString("base64")}`;

  // 2. Ask GPT-4.1 vision to audit
  const systemPrompt = buildVerifierSystemPrompt();

  // Liste textuelle des rooms pour cadrer le modèle
  const roomListing = rooms
    .map(r => `- ${r.id} · "${r.name}" (${r.surface_m2 != null ? `${r.surface_m2}m²` : "surface unknown"})`)
    .join("\n");

  let parsed: z.infer<typeof CorrectionSchema> | null = null;

  try {
    const completion = await openai.chat.completions.parse({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Audit the polygons on this plan (lot: "${lotName}").

Rooms detected by previous passes (each has a colored polygon on the overlay):
${roomListing}

For each polygon, verify it sits on the correct room's walls. Return corrections ONLY for polygons with drift > 1 meter from their true location. For correct polygons, omit them from corrections.`,
            },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
      response_format: zodResponseFormat(CorrectionSchema, "correction_set"),
      max_tokens: 3500,
    });

    parsed = completion.choices[0]?.message.parsed || null;
  } catch (err) {
    console.error(`[visual-verifier] ${lotName}: call failed`, err instanceof Error ? err.message : err);
    return {
      corrections: [],
      applied: 0,
      skippedLowConfidence: 0,
      globalAssessment: `Passe-3 call failed: ${err instanceof Error ? err.message : String(err)}`,
      overlayBuffer,
    };
  }

  if (!parsed) {
    console.warn(`[visual-verifier] ${lotName}: no parsed response`);
    return { corrections: [], applied: 0, skippedLowConfidence: 0, globalAssessment: "No parsed response", overlayBuffer };
  }

  // 3. Filter corrections by confidence threshold + by room_id match
  const validIds = new Set(rooms.map(r => r.id));
  const accepted: Correction[] = [];
  let skipped = 0;
  for (const c of parsed.corrections) {
    if (!validIds.has(c.room_id)) {
      console.warn(`[visual-verifier] ${lotName}: correction for unknown room_id="${c.room_id}" ignored`);
      continue;
    }
    if (c.confidence < confidenceThreshold) {
      skipped++;
      console.log(`[visual-verifier] ${lotName}: ${c.room_id} correction skipped (conf=${c.confidence.toFixed(2)}<${confidenceThreshold})`);
      continue;
    }
    accepted.push(c);
  }

  console.log(`[visual-verifier] ${lotName}: ${accepted.length} corrections applied, ${skipped} skipped, assessment="${parsed.global_assessment.slice(0, 120)}"`);

  return {
    corrections: accepted,
    applied: accepted.length,
    skippedLowConfidence: skipped,
    globalAssessment: parsed.global_assessment,
    overlayBuffer,
  };
}

/**
 * Applique les corrections retournées par verifyAndCorrectPolygons sur
 * une liste de RoomForVerify (in-place via nouveau array). Les polygones
 * non corrigés sont conservés tels quels.
 */
export function applyCorrections(
  rooms: RoomForVerify[],
  corrections: Correction[],
): RoomForVerify[] {
  const cMap = new Map<string, Correction>();
  for (const c of corrections) cMap.set(c.room_id, c);
  return rooms.map(r => {
    const c = cMap.get(r.id);
    if (!c) return r;
    return {
      ...r,
      polygon: c.corrected_polygon.map(v => ({ x_percent: v.x_percent, y_percent: v.y_percent })),
    };
  });
}
