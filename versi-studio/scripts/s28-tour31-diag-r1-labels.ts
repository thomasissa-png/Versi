// s28 tour31 — diagnostic positions labels PDF R+1 (no-DB version).
// Lit le PDF directement, extrait le polygone du lot et les labels.
import { readFile } from "fs/promises";
import { extractTextItems, filterRoomLabels } from "../src/lib/vs/pdf-text-extractor";
import { extractLotVector } from "../src/lib/vs/lot-vector-extractor";

async function main() {
  const pdfPath = "reference-existant/plans-test/P 01 - Pr2_plan R+1_ projet2.pdf";
  const buf = await readFile(pdfPath);
  const lvr = await extractLotVector(buf, { scale: 3 });
  const lotPolyPx = lvr.polygon;
  const imageW = lvr.imageWidth;
  const imageH = lvr.imageHeight;
  const xMin = Math.min(...lotPolyPx.map((p) => p.x));
  const xMax = Math.max(...lotPolyPx.map((p) => p.x));
  const yMin = Math.min(...lotPolyPx.map((p) => p.y));
  const yMax = Math.max(...lotPolyPx.map((p) => p.y));

  console.log(`=== R+1 ===`);
  console.log(`Image ${imageW}x${imageH}`);
  console.log(`Lot bbox px x[${xMin.toFixed(0)}..${xMax.toFixed(0)}] y[${yMin.toFixed(0)}..${yMax.toFixed(0)}]`);

  const items = await extractTextItems(buf, lotPolyPx, 3);
  const labels = filterRoomLabels(items);
  console.log(`\n${labels.length} labels filtrés :`);
  for (const l of labels) {
    const xPctLot = ((l.x - xMin) / (xMax - xMin)) * 100;
    const yPctLot = ((l.y - yMin) / (yMax - yMin)) * 100;
    const surf = l.surface_m2 != null ? `${l.surface_m2}m²` : "?m²";
    console.log(
      `  "${l.text.padEnd(20)}" surf=${surf.padStart(8)}  px=(${l.x.toFixed(0)},${l.y.toFixed(0)})  lotPct=(${xPctLot.toFixed(1)}%, ${yPctLot.toFixed(1)}%)`,
    );
  }

  console.log(`\n--- TOUS items extraits (avant filterRoomLabels) :`);
  for (const it of items) {
    if (it.text.length < 2) continue;
    const xPctLot = ((it.x - xMin) / (xMax - xMin)) * 100;
    const yPctLot = ((it.y - yMin) / (yMax - yMin)) * 100;
    console.log(`  "${it.text}" px=(${it.x.toFixed(0)},${it.y.toFixed(0)}) lotPct=(${xPctLot.toFixed(1)}%, ${yPctLot.toFixed(1)}%)`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
