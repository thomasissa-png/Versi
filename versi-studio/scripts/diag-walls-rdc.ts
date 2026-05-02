import { extractLotVector, extractInternalWallSegments } from "../src/lib/vs/lot-vector-extractor";
import { chainCollinearSegments } from "../src/lib/vs/orthogonal-regularizer";
import { extractTextItems, filterRoomLabels } from "../src/lib/vs/pdf-text-extractor";
import { readFileSync } from "fs";

(async () => {
  const buf = readFileSync(process.argv[2]);
  const lvr = await extractLotVector(buf, { scale: 3 });
  const lotPoly = lvr.polygon;
  console.log(`Lot polygon (${lotPoly.length} points):`);
  for (const p of lotPoly) console.log(`  (${p.x.toFixed(0)}, ${p.y.toFixed(0)})`);
  
  const xs = lotPoly.map(p => p.x), ys = lotPoly.map(p => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  console.log(`Bbox: x[${xMin.toFixed(0)}-${xMax.toFixed(0)}] y[${yMin.toFixed(0)}-${yMax.toFixed(0)}]`);
  
  // Internal walls
  const lotPolyPx = lotPoly.map(p => ({ x: p.x, y: p.y }));
  const raw = await extractInternalWallSegments(buf, lotPolyPx, { scale: 3, multiColor: true, minSegLen: 30 });
  const chained = chainCollinearSegments(raw, { gapPx: 8, angleTolDeg: 5, lateralTolPx: 4 });
  const filtered = chained.filter(w => Math.hypot(w.x2 - w.x1, w.y2 - w.y1) >= 60);
  console.log(`\nInternal walls: ${raw.length} raw → ${chained.length} chained → ${filtered.length} ≥60px`);
  
  // Look for HORIZONTAL walls in y range [yMin to yMin+30%]  
  const top30 = yMin + (yMax - yMin) * 0.30;
  const horizontalInTop = filtered.filter(w => {
    const dy = Math.abs(w.y2 - w.y1);
    const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
    if (dy / len > 0.2) return false; // not horizontal
    const wy = (w.y1 + w.y2) / 2;
    return wy >= yMin && wy <= top30;
  });
  console.log(`\nHorizontal walls in top 30% of lot:`);
  for (const w of horizontalInTop) {
    const wy = (w.y1 + w.y2) / 2;
    const yPct = ((wy - yMin) / (yMax - yMin)) * 100;
    const xLo = Math.min(w.x1, w.x2), xHi = Math.max(w.x1, w.x2);
    const xLoPct = ((xLo - xMin) / (xMax - xMin)) * 100;
    const xHiPct = ((xHi - xMin) / (xMax - xMin)) * 100;
    console.log(`  y=${wy.toFixed(0)} (${yPct.toFixed(1)}%)  x[${xLo.toFixed(0)}-${xHi.toFixed(0)}] (${xLoPct.toFixed(1)}-${xHiPct.toFixed(1)}%)  len=${(xHi-xLo).toFixed(0)}px`);
  }
})();
