/** Lister TOUS les murs PDF dans une zone précise. */
import { Pool } from "pg";
import { readFile } from "fs/promises";
import { extractLotVector, extractInternalWallSegments } from "../src/lib/vs/lot-vector-extractor";
import { chainCollinearSegments } from "../src/lib/vs/orthogonal-regularizer";
import { WALL_EXTRACTION_CONFIG } from "../src/lib/vs/wall-extraction-config";

async function main() {
  const projectId = process.argv[2];
  const floor = parseInt(process.argv[3] || "1");
  const cx = parseFloat(process.argv[4] || "1209");
  const cy = parseFloat(process.argv[5] || "1425");
  const range = parseFloat(process.argv[6] || "100");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgres://versi:versi@127.0.0.1:5432/versi_studio" });
  const lotsRes = await pool.query<any>("SELECT zone_data FROM vs_lots WHERE project_id = $1 AND floor_number = $2", [projectId, floor]);
  const lotPoly = lotsRes.rows[0].zone_data.points;
  const planRes = await pool.query<any>("SELECT file_path FROM vs_plans WHERE project_id = $1 AND floor_number = $2", [projectId, floor]);
  const buf = await readFile(planRes.rows[0].file_path);
  const lvr = await extractLotVector(buf, { scale: WALL_EXTRACTION_CONFIG.scale });
  const lpx = lotPoly.map((p: any) => ({ x: (p.x_percent / 100) * lvr.imageWidth, y: (p.y_percent / 100) * lvr.imageHeight }));
  const ri = await extractInternalWallSegments(buf, lpx, {
    scale: WALL_EXTRACTION_CONFIG.scale, multiColor: WALL_EXTRACTION_CONFIG.multiColor,
    minSegLen: WALL_EXTRACTION_CONFIG.minSegLenExtraction,
  });
  const ch = chainCollinearSegments(ri, {
    gapPx: WALL_EXTRACTION_CONFIG.chainGapPx, angleTolDeg: WALL_EXTRACTION_CONFIG.chainAngleTolDeg, lateralTolPx: WALL_EXTRACTION_CONFIG.chainLateralTolPx,
  });
  const iw = ch.filter(w => Math.hypot(w.x2 - w.x1, w.y2 - w.y1) >= WALL_EXTRACTION_CONFIG.minSegLenFinal);
  const all = [...lvr.wallSegments.map((s: any) => ({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 })), ...iw];
  const inZone = all.filter(w => {
    const mx = (w.x1 + w.x2) / 2, my = (w.y1 + w.y2) / 2;
    return Math.abs(mx - cx) < range && Math.abs(my - cy) < range;
  });
  console.log(`Murs PDF dans zone ±${range}px autour de (${cx},${cy}) :`);
  console.log(`  Total : ${inZone.length}/${all.length} murs`);
  inZone.sort((a, b) => Math.hypot((a.x1 + a.x2) / 2 - cx, (a.y1 + a.y2) / 2 - cy) - Math.hypot((b.x1 + b.x2) / 2 - cx, (b.y1 + b.y2) / 2 - cy));
  for (let i = 0; i < Math.min(20, inZone.length); i++) {
    const w = inZone[i];
    const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
    const cmx = (w.x1 + w.x2) / 2, cmy = (w.y1 + w.y2) / 2;
    console.log(`  (${w.x1.toFixed(0)},${w.y1.toFixed(0)})→(${w.x2.toFixed(0)},${w.y2.toFixed(0)}) len=${len.toFixed(0)} mid=(${cmx.toFixed(0)},${cmy.toFixed(0)})`);
  }
  await pool.end();
}
main().catch(console.error);
