import { extractTextItems, filterRoomLabels } from "../src/lib/vs/pdf-text-extractor";
import { extractLotVector } from "../src/lib/vs/lot-vector-extractor";
import { readFileSync } from "fs";

(async () => {
  const planPath = process.argv[2];
  if (!planPath) { console.error("Usage: tsx scripts/diag-label-positions.ts <pdf>"); process.exit(1); }
  const buf = readFileSync(planPath);
  const lvr = await extractLotVector(buf, { scale: 3 });
  const lotPoly = lvr.polygon || [];
  console.log("Image:", lvr.imageWidth, "x", lvr.imageHeight, " Lot pts:", lotPoly.length);
  const items = await extractTextItems(buf, lotPoly, 3);
  const filtered = filterRoomLabels(items);
  const xs = lotPoly.map(p => p.x);
  const ys = lotPoly.map(p => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  console.log(`Lot bbox px: x[${xMin.toFixed(0)}-${xMax.toFixed(0)}] y[${yMin.toFixed(0)}-${yMax.toFixed(0)}]`);
  console.log("\n=== Labels ===");
  for (const it of filtered) {
    const xPct = ((it.x - xMin) / (xMax - xMin)) * 100;
    const yPct = ((it.y - yMin) / (yMax - yMin)) * 100;
    // bbox: text origin (px,py) is top of text; cx=px+w/2, cy=py-h/2.
    // Reverse: top = cy + h/2, bot = cy - h/2 (in cartesian-like). ATTENTION: in pixel space y grows downward.
    // textItem.transform[5] is baseline in PDF user space (y up). After viewport, y is in pixel CSS space (y down).
    // In code: cy = py - h/2 with py = baseline y in image px (already down). So cy is ABOVE baseline by h/2.
    const top = it.y - it.height/2;
    const bot = it.y + it.height/2;
    const left = it.x - it.width/2;
    const right = it.x + it.width/2;
    console.log(`  ${it.text.padEnd(15)} cx=${it.x.toFixed(0).padStart(4)} cy=${it.y.toFixed(0).padStart(4)} bbox[L${left.toFixed(0)},T${top.toFixed(0)},R${right.toFixed(0)},B${bot.toFixed(0)}]  rel%[${xPct.toFixed(1)},${yPct.toFixed(1)}]`);
  }
})();
