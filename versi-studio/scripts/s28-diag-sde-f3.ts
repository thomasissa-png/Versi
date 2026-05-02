/**
 * Diag ultra-ciblé : positions exactes des 11 vertices SDE F3 + nearest wall
 */
import { Pool } from "pg";
import { readFile } from "fs/promises";
import { extractLotVector, extractInternalWallSegments } from "../src/lib/vs/lot-vector-extractor";
import { chainCollinearSegments } from "../src/lib/vs/orthogonal-regularizer";
import { vectorizeRasterWallsFromPng } from "../src/lib/vs/raster-walls-vectorize";
import { pdf as pdfToImg } from "pdf-to-img";

const DB_URL = process.env.DATABASE_URL || "postgres://versi:versi@127.0.0.1:5432/versi_studio";
type Pt = { x_percent: number; y_percent: number };
type Wall = { x1: number; y1: number; x2: number; y2: number };

function distSeg(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  if (l2 < 1e-9) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

async function main() {
  const projectId = "5b30e9fe-257e-41a4-968e-6b90b3a70e5e";
  const floor = 3;
  const pool = new Pool({ connectionString: DB_URL });
  const lotsRes = await pool.query<{ id: string; zone_data: { points: Pt[] } }>(
    "SELECT l.id, l.zone_data FROM vs_lots l WHERE l.project_id = $1 AND l.floor_number = $2",
    [projectId, floor],
  );
  const lot = lotsRes.rows[0];
  const lotPoly = lot.zone_data.points;
  let lotMinX = 100, lotMinY = 100, lotMaxX = 0, lotMaxY = 0;
  for (const p of lotPoly) {
    if (p.x_percent < lotMinX) lotMinX = p.x_percent;
    if (p.y_percent < lotMinY) lotMinY = p.y_percent;
    if (p.x_percent > lotMaxX) lotMaxX = p.x_percent;
    if (p.y_percent > lotMaxY) lotMaxY = p.y_percent;
  }
  const lotW = lotMaxX - lotMinX, lotH = lotMaxY - lotMinY;
  const planRes = await pool.query<{ file_path: string }>(
    "SELECT file_path FROM vs_plans WHERE project_id = $1 AND floor_number = $2",
    [projectId, floor],
  );
  const buf = await readFile(planRes.rows[0].file_path);
  const lvr = await extractLotVector(buf, { scale: 3 });
  const externalWalls = lvr.wallSegments;
  const imageW = lvr.imageWidth, imageH = lvr.imageHeight;
  const lotPolyPx = lotPoly.map(p => ({ x: (p.x_percent / 100) * imageW, y: (p.y_percent / 100) * imageH }));
  const rawInternal = await extractInternalWallSegments(buf, lotPolyPx, {
    scale: 3, multiColor: true, minSegLen: 10,
  });
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
  const allPdfWalls: Wall[] = [
    ...externalWalls.map(s => ({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 })),
    ...internalWalls,
    ...rasterFiltered,
  ];
  const roomsRes = await pool.query<{ name: string; polygon: Pt[] }>(
    "SELECT name, polygon FROM vs_rooms WHERE lot_id = $1 AND name='SDE'", [lot.id],
  );
  const sde = roomsRes.rows[0];
  console.log(`F${floor} : imageW=${imageW} imageH=${imageH}`);
  console.log(`Lot bbox px: x=[${(lotMinX/100*imageW).toFixed(0)}-${(lotMaxX/100*imageW).toFixed(0)}] y=[${(lotMinY/100*imageH).toFixed(0)}-${(lotMaxY/100*imageH).toFixed(0)}]`);
  console.log(`SDE F3 : ${sde.polygon.length} vertices, ${allPdfWalls.length} walls`);
  console.log(`vertex# | pct(x,y) | px(x,y) | nearest wall (d)`);
  for (let i = 0; i < sde.polygon.length; i++) {
    const v = sde.polygon[i];
    const gx = lotMinX + (v.x_percent / 100) * lotW;
    const gy = lotMinY + (v.y_percent / 100) * lotH;
    const px = (gx / 100) * imageW;
    const py = (gy / 100) * imageH;
    let bd = Infinity, bw: Wall | null = null;
    for (const w of allPdfWalls) {
      const d = distSeg(px, py, w.x1, w.y1, w.x2, w.y2);
      if (d < bd) { bd = d; bw = w; }
    }
    const wstr = bw ? `[${bw.x1.toFixed(0)},${bw.y1.toFixed(0)}→${bw.x2.toFixed(0)},${bw.y2.toFixed(0)}]` : "?";
    console.log(`v${i.toString().padStart(2)} | (${v.x_percent.toFixed(2)}%,${v.y_percent.toFixed(2)}%) | (${px.toFixed(0)},${py.toFixed(0)}) | d=${bd.toFixed(1)}px ${wstr}`);
  }
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
