/**
 * Teste la passe-2 (refineRoomPolygon) sur P00 pour voir si elle améliore
 * les polygones au-delà des 4 points de la passe-1.
 * Run: set -a && source .env.local && set +a && npx tsx scripts/s23-passe2-check.ts
 */
import fs from "fs/promises";
import path from "path";
import OpenAI from "openai";
import { extractPlanData } from "../src/lib/vs/plan-extractor";
import { refineRoomPolygon } from "../src/lib/vs/polygon-refiner";

const PLAN = "P 00 - Pr2_plan RDC_ projet2.pdf";

async function main() {
  const buf = await fs.readFile(path.resolve(__dirname, `../reference-existant/plans-test/${PLAN}`));
  const base64 = buf.toString("base64");

  // Passe-1
  const data = await extractPlanData(base64, "application/pdf", "immeuble");
  console.log(`[passe-1] ${data.rooms.length} pièces extraites`);
  for (const r of data.rooms) {
    console.log(`  ${r.name_raw}: ${r.bounding_polygon?.length ?? 0} pts (passe-1)`);
  }

  // Convertir PDF → PNG pour passe-2 (comme route.ts)
  const { pdf } = await import("pdf-to-img");
  const pages = await pdf(buf, { scale: 3 });
  let pngBuffer: Buffer | null = null;
  for await (const page of pages) {
    pngBuffer = Buffer.from(page);
    break;
  }
  if (!pngBuffer) {
    console.error("Impossible de convertir PDF en PNG");
    return;
  }
  const sharp = (await import("sharp")).default;
  const metadata = await sharp(pngBuffer).metadata();
  const imgW = metadata.width || 1;
  const imgH = metadata.height || 1;
  console.log(`[passe-2] Image: ${imgW}x${imgH}`);

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  for (const room of data.rooms) {
    if (!room.bounding_box) {
      console.log(`  ${room.name_raw}: pas de bbox, skip`);
      continue;
    }
    try {
      const refined = await refineRoomPolygon(pngBuffer, imgW, imgH, room.name_raw, room.bounding_box, client);
      const nPts = refined?.length ?? 0;
      const isRect = nPts === 4 ? " (FORME RECTANGULAIRE, pas de raffinement utile)" : "";
      console.log(`  ${room.name_raw}: passe-2 → ${nPts} pts${isRect}`);
      if (refined) {
        console.log(`    ${JSON.stringify(refined.slice(0, 6).map((p) => [Math.round(p.x_percent * 10) / 10, Math.round(p.y_percent * 10) / 10]))}`);
      }
    } catch (e) {
      console.error(`  ${room.name_raw}: ERREUR passe-2 → ${e instanceof Error ? e.message : e}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
