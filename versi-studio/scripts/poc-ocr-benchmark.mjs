/**
 * POC OCR benchmark versi-s23 — 4 plans réels Thomas (Saint-Quentin Pr02).
 *
 * Appel direct OpenAI Responses API (gpt-4.1 vision) avec JSON Schema
 * aligné sur src/lib/vs/plan-extractor.ts (version simplifiée — L209
 * scope réduit : on ne passe pas par le pipeline complet plan-extractor.ts
 * pour éviter les résolutions path @/ et la dépendance build Next.js).
 *
 * Usage :
 *   export OPENAI_API_KEY=sk-...
 *   node versi-studio/scripts/poc-ocr-benchmark.mjs
 *
 * Sortie :
 *   - /tmp/poc-ocr-results/plan-0.json .. plan-3.json (résultats bruts par plan)
 *   - /tmp/poc-ocr-results/summary.json (synthèse)
 *   - logs console : durée, tokens in/out, coût estimé par plan
 *
 * Tarif gpt-4.1 (2026-04, source openai.com/api/pricing) :
 *   - input $2.00 / 1M tokens
 *   - output $8.00 / 1M tokens
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { pdf } from "pdf-to-img";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLANS_DIR = path.resolve(
  __dirname,
  "..",
  "reference-existant",
  "plans-test"
);
const OUT_DIR = "/tmp/poc-ocr-results";

const PLAN_FILES = [
  { file: "P 00 - Pr2_plan RDC_ projet2.pdf", floor: 0, label: "RDC" },
  { file: "P 01 - Pr2_plan R+1_ projet2.pdf", floor: 1, label: "R+1" },
  { file: "P 02 - Pr2_plan R+2_ projet2.pdf", floor: 2, label: "R+2" },
  { file: "P 03 - Pr02_plan R+3_ projet02.pdf", floor: 3, label: "R+3" },
];

// Pricing per 1M tokens (gpt-4.1 vision, 2026-04)
const PRICE_INPUT_PER_M = 2.0;
const PRICE_OUTPUT_PER_M = 8.0;

const JSON_SCHEMA = {
  name: "plan_extraction",
  strict: true,
  schema: {
    type: "object",
    properties: {
      rooms: {
        type: "array",
        items: {
          type: "object",
          properties: {
            temp_id: { type: "string" },
            name_raw: { type: "string" },
            surface_m2: { type: ["number", "null"], exclusiveMinimum: 0 },
            unit_id: { type: ["string", "null"] },
            floor: { type: ["integer", "null"], minimum: 0 },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            notes: { type: ["string", "null"] },
          },
          required: [
            "temp_id",
            "name_raw",
            "surface_m2",
            "unit_id",
            "floor",
            "confidence",
            "notes",
          ],
          additionalProperties: false,
        },
      },
      total_surface_m2: { type: ["number", "null"], exclusiveMinimum: 0 },
      floors_count: { type: "integer", minimum: 1 },
      scale_reference: {
        type: "string",
        enum: ["dimensions_on_plan", "door_standard_83cm", "scale_bar", "none"],
      },
    },
    required: [
      "rooms",
      "total_surface_m2",
      "floors_count",
      "scale_reference",
    ],
    additionalProperties: false,
  },
};

function buildSystemPrompt(typeBien, floorLabel) {
  return `You are an expert architectural floor plan analyzer. Extract structured room data from a floor plan image.

TYPE DE BIEN: "${typeBien}". FLOOR CONTEXT: "${floorLabel}".

STEP 1 — READING THE PLAN:
  - WALLS: thick solid lines. PARTITIONS: thinner lines. DASHED: property boundaries.
  - ANNOTATIONS: read room names and surface values (e.g. "12.5 m²" — French comma = decimal).
  - STAIRCASES: note but do NOT create a room.
  - OUTDOOR (terrasses, balcons) : INCLUDE them as rooms if they are explicitly labeled with a surface (they count for marketing).

STEP 2 — IDENTIFY ROOMS:
  a. Use the room name EXACTLY as written (e.g., "Séjour/Cuisine", "Chambre", "SdB", "WC", "Terrasse").
  b. Open-plan rooms ("Séjour/Cuisine" without dividing wall): ONE room.
  c. Exclude: staircase steps, purely technical closets unless labeled.

STEP 3 — UNIT IDENTIFICATION (MANDATORY for "immeuble"):
  Assign a unit_id (u1, u2, u3...) to each room that belongs to a specific residential unit (apartment/logement).
  RULES:
  1. Rooms sharing the same unit_id MUST be physically connected on the same floor OR form a duplex across floors if visibly linked by an internal staircase.
  2. A unit = at least 1 living space + 1 wet room.
  3. IMPORTANT — DUPLEX: if you see the same unit continuing on another floor (e.g., bedrooms upstairs accessed via internal stairs), keep the SAME unit_id across floors. This is a SINGLE plan at a time so you can only tag from this floor's perspective — but if this looks like the upper floor of a duplex (e.g., only bedrooms + bathroom, no entrance), flag all rooms with unit_id that makes sense given floor context "${floorLabel}".
  4. Common areas (staircase, palier, local poubelles, cave): unit_id = null.
  5. If you cannot determine with confidence > 0.6, set unit_id = null.

STEP 4 — SURFACES (READ, do NOT calculate):
  Priority A: Use the surface value PRINTED on the plan. French comma is decimal.
  Check ranges: WC 1-4 m² | SdB 3-12 m² | Chambre 8-25 m² | Cuisine 5-25 m² | Séjour 15-60 m² | Terrasse 4-30 m².

STEP 5 — CONFIDENCE:
  1.0 if surface printed AND room name clear.
  0.7 if one of the two inferred.
  0.4 if both inferred.

OUTPUT: valid JSON matching the schema. French room names AS WRITTEN. No text outside JSON.`;
}

async function pdfToPngBase64(pdfPath) {
  const buf = await fs.promises.readFile(pdfPath);
  const doc = await pdf(buf, { scale: 3 });
  for await (const page of doc) {
    return Buffer.from(page).toString("base64");
  }
  throw new Error("No page rendered from PDF");
}

async function extractPlan(openai, pngBase64, floorLabel, typeBien) {
  const imageDataUrl = `data:image/png;base64,${pngBase64}`;
  const systemPrompt = buildSystemPrompt(typeBien, floorLabel);

  const t0 = Date.now();
  const response = await openai.responses.create({
    model: "gpt-4.1",
    input: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "input_image", image_url: imageDataUrl, detail: "auto" },
          {
            type: "input_text",
            text: `Extract all rooms from this floor plan (floor: ${floorLabel}).`,
          },
        ],
      },
    ],
    text: { format: { type: "json_schema", ...JSON_SCHEMA } },
  });
  const durationMs = Date.now() - t0;

  // Extract text from response output
  const messageItem = response.output.find(
    (o) => o.type === "message" && Array.isArray(o.content)
  );
  const textContent = messageItem?.content.find((c) => c.type === "output_text");
  const rawJson = textContent?.text ?? "";

  const parsed = JSON.parse(rawJson);
  const usage = response.usage ?? { input_tokens: 0, output_tokens: 0 };

  const costUsd =
    (usage.input_tokens / 1_000_000) * PRICE_INPUT_PER_M +
    (usage.output_tokens / 1_000_000) * PRICE_OUTPUT_PER_M;

  return { parsed, usage, durationMs, costUsd };
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY not set. Run: export OPENAI_API_KEY=...");
    process.exit(1);
  }
  await fs.promises.mkdir(OUT_DIR, { recursive: true });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const summary = { plans: [], totalCostUsd: 0, totalDurationMs: 0 };

  for (let i = 0; i < PLAN_FILES.length; i++) {
    const { file, floor, label } = PLAN_FILES[i];
    const pdfPath = path.join(PLANS_DIR, file);
    console.log(`\n[${i + 1}/4] ${label} — ${file}`);

    try {
      console.log("  PDF -> PNG conversion...");
      const t0 = Date.now();
      const pngBase64 = await pdfToPngBase64(pdfPath);
      console.log(`  PNG ready in ${Date.now() - t0}ms (${Math.round(pngBase64.length / 1024)} KB base64)`);

      console.log("  Calling GPT-4.1 vision...");
      const result = await extractPlan(openai, pngBase64, label, "immeuble");

      console.log(`  Duration: ${result.durationMs}ms`);
      console.log(`  Tokens: in=${result.usage.input_tokens} out=${result.usage.output_tokens}`);
      console.log(`  Cost: $${result.costUsd.toFixed(4)}`);
      console.log(`  Rooms detected: ${result.parsed.rooms.length}`);
      console.log(`  Total surface: ${result.parsed.total_surface_m2}m²`);
      console.log(`  Units: ${Array.from(new Set(result.parsed.rooms.map((r) => r.unit_id))).join(", ")}`);

      const outFile = path.join(OUT_DIR, `plan-${i}-${label}.json`);
      await fs.promises.writeFile(
        outFile,
        JSON.stringify(
          {
            file,
            floor,
            label,
            durationMs: result.durationMs,
            usage: result.usage,
            costUsd: result.costUsd,
            extraction: result.parsed,
          },
          null,
          2
        )
      );
      console.log(`  -> ${outFile}`);

      summary.plans.push({
        file,
        label,
        floor,
        ok: true,
        durationMs: result.durationMs,
        usage: result.usage,
        costUsd: result.costUsd,
        roomsCount: result.parsed.rooms.length,
        totalSurfaceM2: result.parsed.total_surface_m2,
        units: Array.from(new Set(result.parsed.rooms.map((r) => r.unit_id))),
      });
      summary.totalCostUsd += result.costUsd;
      summary.totalDurationMs += result.durationMs;
    } catch (err) {
      console.error(`  ERROR on ${label}:`, err.message);
      summary.plans.push({
        file,
        label,
        floor,
        ok: false,
        error: err.message,
      });
    }
  }

  await fs.promises.writeFile(
    path.join(OUT_DIR, "summary.json"),
    JSON.stringify(summary, null, 2)
  );

  console.log("\n=== SUMMARY ===");
  console.log(`Total duration: ${(summary.totalDurationMs / 1000).toFixed(1)}s`);
  console.log(`Total cost: $${summary.totalCostUsd.toFixed(4)}`);
  console.log(`Results in: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
