import { Pool } from "pg";
import { readFile } from "fs/promises";
import { extractLotVector, extractInternalWallSegments } from "../src/lib/vs/lot-vector-extractor";
import { chainCollinearSegments } from "../src/lib/vs/orthogonal-regularizer";
import { WALL_EXTRACTION_CONFIG } from "../src/lib/vs/wall-extraction-config";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgres://versi:versi@127.0.0.1:5432/versi_studio" });
  const planRes = await pool.query<any>("SELECT file_path FROM vs_plans WHERE project_id = $1 AND floor_number = 1", ["ea5a4c35-074a-42ec-ad86-7d2da6e836e2"]);
  const lotRes = await pool.query<any>("SELECT zone_data FROM vs_lots WHERE project_id = $1 AND floor_number = 1", ["ea5a4c35-074a-42ec-ad86-7d2da6e836e2"]);
  const buf = await readFile(planRes.rows[0].file_path);
  const lvr = await extractLotVector(buf, { scale: WALL_EXTRACTION_CONFIG.scale });
  const lp = lotRes.rows[0].zone_data.points.map((p: any) => ({ x: (p.x_percent / 100) * lvr.imageWidth, y: (p.y_percent / 100) * lvr.imageHeight }));
  const ri = await extractInternalWallSegments(buf, lp, { scale: WALL_EXTRACTION_CONFIG.scale, multiColor: WALL_EXTRACTION_CONFIG.multiColor, minSegLen: WALL_EXTRACTION_CONFIG.minSegLenExtraction });
  const ch = chainCollinearSegments(ri, { gapPx: WALL_EXTRACTION_CONFIG.chainGapPx, angleTolDeg: WALL_EXTRACTION_CONFIG.chainAngleTolDeg, lateralTolPx: WALL_EXTRACTION_CONFIG.chainLateralTolPx });
  const iw = ch.filter(w => Math.hypot(w.x2-w.x1, w.y2-w.y1) >= WALL_EXTRACTION_CONFIG.minSegLenFinal);
  // Vertex problématique : (2234, 594) bestDist=165
  console.log(`Image: ${lvr.imageWidth}x${lvr.imageHeight}`);
  console.log(`Murs ext: ${lvr.wallSegments.length}, int chained: ${ch.length}, int filt: ${iw.length}`);
  // Les 5 murs les plus proches du point (2234, 594)
  const target = { x: 2234, y: 594 };
  function distSeg(p: any, w: any) { const dx=w.x2-w.x1, dy=w.y2-w.y1, l2=dx*dx+dy*dy; if(l2<1e-6)return Math.hypot(p.x-w.x1,p.y-w.y1); const t=Math.max(0,Math.min(1,((p.x-w.x1)*dx+(p.y-w.y1)*dy)/l2)); return Math.hypot(p.x-(w.x1+t*dx),p.y-(w.y1+t*dy)); }
  const all = [...lvr.wallSegments.map(s=>({x1:s.x1,y1:s.y1,x2:s.x2,y2:s.y2})), ...iw];
  const sorted = all.map(w => ({ w, d: distSeg(target, w) })).sort((a,b)=>a.d-b.d);
  console.log(`\nTop 8 murs proches de (2234,594) :`);
  for (let i = 0; i < 8; i++) {
    const e = sorted[i];
    console.log(`  ${e.d.toFixed(1)}px : (${e.w.x1.toFixed(0)},${e.w.y1.toFixed(0)})→(${e.w.x2.toFixed(0)},${e.w.y2.toFixed(0)}) len=${Math.hypot(e.w.x2-e.w.x1, e.w.y2-e.w.y1).toFixed(0)}px`);
  }
  await pool.end();
}
main().catch(console.error);
