/**
 * s28 tour 13 — Diag par room : pour chaque pièce, count outliers et raison.
 */
import { Pool } from "pg";
import { readFile } from "fs/promises";
import { extractLotVector, extractInternalWallSegments } from "../src/lib/vs/lot-vector-extractor";
import { chainCollinearSegments } from "../src/lib/vs/orthogonal-regularizer";
import { WALL_EXTRACTION_CONFIG } from "../src/lib/vs/wall-extraction-config";
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
function minDist(px: number, py: number, walls: Wall[]) {
  let bd = Infinity;
  for (const w of walls) {
    const d = distSeg(px, py, w.x1, w.y1, w.x2, w.y2);
    if (d < bd) bd = d;
  }
  return bd;
}

async function main() {
  const projectId = process.argv[2];
  const floor = parseInt(process.argv[3] || "0");
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
    "SELECT name, polygon FROM vs_rooms WHERE lot_id = $1", [lot.id],
  );
  console.log(`F${floor} : ${allPdfWalls.length} walls (${WALL_EXTRACTION_CONFIG.scale ? "" : ""}vec ${externalWalls.length + internalWalls.length} + raster ${rasterFiltered.length})`);
  console.log(`Room          | nv | out | %ok | first 3 outliers (dPdf)`);
  for (const r of roomsRes.rows) {
    let outCount = 0;
    const outliersDist: number[] = [];
    for (const v of r.polygon) {
      const gx = lotMinX + (v.x_percent / 100) * lotW;
      const gy = lotMinY + (v.y_percent / 100) * lotH;
      const px = (gx / 100) * imageW;
      const py = (gy / 100) * imageH;
      const d = minDist(px, py, allPdfWalls);
      if (d > 5) { outCount++; outliersDist.push(d); }
    }
    const nv = r.polygon.length;
    const pctOk = ((nv - outCount) / nv * 100).toFixed(0);
    const top3 = outliersDist.sort((a, b) => b - a).slice(0, 3).map(d => d.toFixed(1)).join(", ");
    console.log(`${r.name.padEnd(13)} | ${String(nv).padStart(2)} | ${String(outCount).padStart(3)} | ${pctOk.padStart(3)}% | ${top3}`);
  }
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
