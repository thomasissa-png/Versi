/* eslint-disable @typescript-eslint/no-explicit-any */
// FIXME(s34): script de diagnostic session — typages "any" tolérés (PoC/debug, hors build prod).
import { Pool } from "pg";
import { readFile } from "fs/promises";
import { extractLotVector, extractInternalWallSegments } from "../src/lib/vs/lot-vector-extractor";
import { chainCollinearSegments } from "../src/lib/vs/orthogonal-regularizer";
import { vectorizeRasterWallsFromPng } from "../src/lib/vs/raster-walls-vectorize";
import { pdf as pdfToImg } from "pdf-to-img";

const DB_URL = process.env.DATABASE_URL || "postgres://versi:versi@127.0.0.1:5432/versi_studio";
type Wall = { x1: number; y1: number; x2: number; y2: number; src: string };

async function main() {
  const projectId = "5b30e9fe-257e-41a4-968e-6b90b3a70e5e";
  const floor = 3;
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
    }).map(w => ({ ...w, src: "ras" }));
  }
  const allWalls_face: Wall[] = [
    ...externalWalls.map(s => ({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, src: "ext" })),
    ...internalWalls.map(s => ({ ...s, src: "int" })),
    ...rasterFiltered,
  ];
  // Box LARGE : tout autour du SDE label (px 1700-1920, y 1500-1750)
  const x0 = 1700, x1 = 1920, y0 = 1500, y1 = 1750;
  console.log(`SDE label position px(1771, 1590), outliers entre y=1617-1655`);
  console.log(`Walls box [${x0}-${x1}, ${y0}-${y1}] (vec uniquement, comme passé au flood-fill) :`);
  let count = 0;
  const filtered: Wall[] = [];
  for (const w of allWalls_face) {
    const wx0 = Math.min(w.x1, w.x2), wx1 = Math.max(w.x1, w.x2);
    const wy0 = Math.min(w.y1, w.y2), wy1 = Math.max(w.y1, w.y2);
    if (wx1 < x0 || wx0 > x1 || wy1 < y0 || wy0 > y1) continue;
    count++;
    filtered.push(w);
  }
  // Tri par y0
  filtered.sort((a, b) => Math.min(a.y1, a.y2) - Math.min(b.y1, b.y2));
  for (const w of filtered) {
    const len = Math.hypot(w.x2-w.x1, w.y2-w.y1);
    const isHor = Math.abs(w.y2 - w.y1) < 5;
    const isVer = Math.abs(w.x2 - w.x1) < 5;
    const orient = isHor ? "H" : isVer ? "V" : "/";
    console.log(`  [${w.src}/${orient}] (${w.x1.toFixed(0)},${w.y1.toFixed(0)})→(${w.x2.toFixed(0)},${w.y2.toFixed(0)}) len=${len.toFixed(0)}`);
  }
  console.log(`Total : ${count} walls vec dans la zone`);
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
