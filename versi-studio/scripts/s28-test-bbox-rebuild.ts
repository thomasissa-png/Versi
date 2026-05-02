/**
 * Test direct bbox-rebuild sur SDE F3.
 */
import { Pool } from "pg";
import { readFile } from "fs/promises";
import { extractLotVector, extractInternalWallSegments } from "../src/lib/vs/lot-vector-extractor";
import { chainCollinearSegments } from "../src/lib/vs/orthogonal-regularizer";
import { vectorizeRasterWallsFromPng } from "../src/lib/vs/raster-walls-vectorize";
import { rebuildBboxFromWalls } from "../src/lib/vs/bbox-rebuild";
import { pdf as pdfToImg } from "pdf-to-img";

const DB_URL = process.env.DATABASE_URL || "postgres://versi:versi@127.0.0.1:5432/versi_studio";
type Wall = { x1: number; y1: number; x2: number; y2: number };

async function main() {
  const projectId = process.argv[2];
  const floor = 3;
  if (!projectId) { console.error("usage: ... <project_id>"); return; }
  const pool = new Pool({ connectionString: DB_URL });
  const planRes = await pool.query<{ file_path: string }>(
    "SELECT file_path FROM vs_plans WHERE project_id = $1 AND floor_number = $2", [projectId, floor],
  );
  const buf = await readFile(planRes.rows[0].file_path);
  const lvr = await extractLotVector(buf, { scale: 3 });
  const externalWalls = lvr.wallSegments;
  const lotsRes = await pool.query<{ id: string; zone_data: { points: any[] } }>(
    "SELECT l.id, l.zone_data FROM vs_lots l WHERE l.project_id = $1 AND l.floor_number = $2", [projectId, floor],
  );
  const lotPoly = lotsRes.rows[0].zone_data.points;
  const imageW = lvr.imageWidth, imageH = lvr.imageHeight;
  const lotPolyPx = lotPoly.map((p: any) => ({ x: (p.x_percent / 100) * imageW, y: (p.y_percent / 100) * imageH }));
  const rawInternal = await extractInternalWallSegments(buf, lotPolyPx, { scale: 3, multiColor: true, minSegLen: 10 });
  const chained = chainCollinearSegments(rawInternal, { gapPx: 15, angleTolDeg: 3, lateralTolPx: 3 });
  const internalWalls = chained.filter(w => Math.hypot(w.x2 - w.x1, w.y2 - w.y1) >= 10);
  const pages0 = await pdfToImg(buf, { scale: 3 });
  let pngBuf: Buffer | null = null;
  for await (const p of pages0) { pngBuf = Buffer.from(p); break; }
  let rasterFiltered: Wall[] = [];
  if (pngBuf) {
    const { walls: rw } = await vectorizeRasterWallsFromPng(pngBuf, { minRunPx: 6, thicknessPx: 4, minDensity: 0.78 });
    const lotBx0 = Math.min(...lotPolyPx.map(p => p.x));
    const lotBx1 = Math.max(...lotPolyPx.map(p => p.x));
    const lotBy0 = Math.min(...lotPolyPx.map(p => p.y));
    const lotBy1 = Math.max(...lotPolyPx.map(p => p.y));
    rasterFiltered = rw.filter(w => {
      const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
      if (len < 6) return false;
      const cx = (w.x1 + w.x2) / 2, cy = (w.y1 + w.y2) / 2;
      return cx >= lotBx0 && cx <= lotBx1 && cy >= lotBy0 && cy <= lotBy1;
    });
  }
  // CHAÎNAGE comme allWalls_snap
  const allWalls_face = [
    ...externalWalls.map(s => ({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 })),
    ...internalWalls,
  ];
  const allChained = chainCollinearSegments(allWalls_face, { gapPx: 8, angleTolDeg: 3, lateralTolPx: 2 });
  const allChainedFilt = allChained.filter(w => Math.hypot(w.x2-w.x1, w.y2-w.y1) >= 15);
  const allWalls_snap: Wall[] = [
    ...allChainedFilt,
    ...rasterFiltered,
  ];
  console.log(`F3 : ${allWalls_snap.length} walls (chained ${allChainedFilt.length} + raster ${rasterFiltered.length})`);

  // SDE polygon : récupérer en DB
  const roomsRes = await pool.query<{ name: string; polygon: any[] }>(
    "SELECT name, polygon FROM vs_rooms WHERE lot_id = $1 AND name='SDE'", [lotsRes.rows[0].id],
  );
  const sde = roomsRes.rows[0];
  let lotMinX = 100, lotMinY = 100, lotMaxX = 0, lotMaxY = 0;
  for (const p of lotPoly as any[]) {
    if (p.x_percent < lotMinX) lotMinX = p.x_percent;
    if (p.y_percent < lotMinY) lotMinY = p.y_percent;
    if (p.x_percent > lotMaxX) lotMaxX = p.x_percent;
    if (p.y_percent > lotMaxY) lotMaxY = p.y_percent;
  }
  const lotW = lotMaxX - lotMinX, lotH = lotMaxY - lotMinY;
  const verticesPx = sde.polygon.map((v: any) => {
    const gx = lotMinX + (v.x_percent / 100) * lotW;
    const gy = lotMinY + (v.y_percent / 100) * lotH;
    return { x: (gx / 100) * imageW, y: (gy / 100) * imageH };
  });
  // Aire polygon
  let polyA = 0;
  for (let i = 0; i < verticesPx.length; i++) {
    const j = (i+1) % verticesPx.length;
    polyA += verticesPx[i].x * verticesPx[j].y - verticesPx[j].x * verticesPx[i].y;
  }
  polyA = Math.abs(polyA / 2);
  console.log(`SDE polygon aire = ${polyA.toFixed(0)} px²`);
  console.log(`SDE polygon bbox : x=[${Math.min(...verticesPx.map((p:any)=>p.x)).toFixed(0)}-${Math.max(...verticesPx.map((p:any)=>p.x)).toFixed(0)}] y=[${Math.min(...verticesPx.map((p:any)=>p.y)).toFixed(0)}-${Math.max(...verticesPx.map((p:any)=>p.y)).toFixed(0)}]`);

  // Tester rebuild avec target = polyA
  console.log(`\n=== TEST 1 : target=polyA, tol [0.85, 1.15] ===`);
  const r1 = rebuildBboxFromWalls(verticesPx, allWalls_snap, {
    outlierThresholdPx: 10, outlierRatioTrigger: 0.5, maxAreaDriftRatio: 0.18,
    searchWindowPx: 150, orthoTolDeg: 8, minWallLenPx: 15,
    targetAreaPx2: polyA, targetAreaToleranceMin: 0.85, targetAreaToleranceMax: 1.15,
  });
  console.log(`rebuilt=${r1.rebuilt} outliers=${r1.outlierCount} driftPct=${(r1.areaDriftPct*100).toFixed(1)}%`);
  if (r1.rebuilt) console.log(`new poly: ${JSON.stringify(r1.polygon.map(p=>({x:p.x.toFixed(0), y:p.y.toFixed(0)})))}`);

  console.log(`\n=== TEST 2 : target=polyA, tol [0.50, 2.00] (large) ===`);
  const r2 = rebuildBboxFromWalls(verticesPx, allWalls_snap, {
    outlierThresholdPx: 10, outlierRatioTrigger: 0.5, maxAreaDriftRatio: 0.18,
    searchWindowPx: 150, orthoTolDeg: 8, minWallLenPx: 15,
    targetAreaPx2: polyA, targetAreaToleranceMin: 0.50, targetAreaToleranceMax: 2.0,
  });
  console.log(`rebuilt=${r2.rebuilt} outliers=${r2.outlierCount} driftPct=${(r2.areaDriftPct*100).toFixed(1)}%`);
  if (r2.rebuilt) console.log(`new poly: ${JSON.stringify(r2.polygon.map(p=>({x:p.x.toFixed(0), y:p.y.toFixed(0)})))}`);

  console.log(`\n=== TEST 3 : pas de target, drift max 50% ===`);
  const r3 = rebuildBboxFromWalls(verticesPx, allWalls_snap, {
    outlierThresholdPx: 10, outlierRatioTrigger: 0.5, maxAreaDriftRatio: 0.50,
    searchWindowPx: 150, orthoTolDeg: 8, minWallLenPx: 15,
    targetAreaToleranceMin: 0.85, targetAreaToleranceMax: 1.15,
  });
  console.log(`rebuilt=${r3.rebuilt} outliers=${r3.outlierCount} driftPct=${(r3.areaDriftPct*100).toFixed(1)}%`);
  if (r3.rebuilt) console.log(`new poly: ${JSON.stringify(r3.polygon.map(p=>({x:p.x.toFixed(0), y:p.y.toFixed(0)})))}`);
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
