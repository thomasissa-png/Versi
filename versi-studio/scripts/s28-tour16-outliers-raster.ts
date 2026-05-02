/**
 * s28 TOUR 16 — Diag outliers AVEC raster vectorize (mêmes paramètres audit).
 *
 * Pour chaque vertex outlier d'une room, dump :
 *   (px,py), bestDist au mur le plus proche, type du mur (ext/int.vec/raster)
 *
 * Permet de comprendre POURQUOI certains vertices flottent à 30-90px.
 */
import { Pool } from "pg";
import { readFile } from "fs/promises";
import { extractLotVector, extractInternalWallSegments } from "../src/lib/vs/lot-vector-extractor";
import { chainCollinearSegments } from "../src/lib/vs/orthogonal-regularizer";
import { vectorizeRasterWallsFromPng } from "../src/lib/vs/raster-walls-vectorize";
import { WALL_EXTRACTION_CONFIG } from "../src/lib/vs/wall-extraction-config";
import { pdf as pdfToImg } from "pdf-to-img";

const DB_URL = process.env.DATABASE_URL || "postgres://versi:versi@127.0.0.1:5432/versi_studio";
interface Pt { x_percent: number; y_percent: number }

function distPointToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1; const len2 = dx*dx + dy*dy;
  if (len2 === 0) return Math.hypot(px-x1, py-y1);
  const t = Math.max(0, Math.min(1, ((px-x1)*dx + (py-y1)*dy) / len2));
  return Math.hypot(px-(x1+t*dx), py-(y1+t*dy));
}

async function main() {
  const projectId = process.argv[2];
  const floor = parseInt(process.argv[3] || "3");
  const roomName = process.argv[4] || "SDE";
  const pool = new Pool({ connectionString: DB_URL });

  const lotsRes = await pool.query<{ id: string; zone_data: { points: Pt[] } }>(
    "SELECT id, zone_data FROM vs_lots WHERE project_id=$1 AND floor_number=$2",
    [projectId, floor],
  );
  const planRes = await pool.query<{ file_path: string }>(
    "SELECT file_path FROM vs_plans WHERE project_id=$1 AND floor_number=$2",
    [projectId, floor],
  );
  if (lotsRes.rows.length === 0 || planRes.rows.length === 0) {
    console.error("Lot/plan not found");
    process.exit(1);
  }
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

  const buffer = await readFile(planRes.rows[0].file_path);
  const lvr = await extractLotVector(buffer, { scale: WALL_EXTRACTION_CONFIG.scale });
  const externalWalls = lvr.wallSegments.map(s => ({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, type: "ext" }));
  const imageW = lvr.imageWidth, imageH = lvr.imageHeight;
  const lotPolyPx = lotPoly.map(p => ({ x: (p.x_percent/100)*imageW, y: (p.y_percent/100)*imageH }));

  const rawInt = await extractInternalWallSegments(buffer, lotPolyPx, {
    scale: WALL_EXTRACTION_CONFIG.scale, multiColor: WALL_EXTRACTION_CONFIG.multiColor,
    minSegLen: WALL_EXTRACTION_CONFIG.minSegLenExtraction,
  });
  const chained = chainCollinearSegments(rawInt, {
    gapPx: WALL_EXTRACTION_CONFIG.chainGapPx, angleTolDeg: WALL_EXTRACTION_CONFIG.chainAngleTolDeg,
    lateralTolPx: WALL_EXTRACTION_CONFIG.chainLateralTolPx,
  });
  const internalVec = chained.filter(w => Math.hypot(w.x2-w.x1, w.y2-w.y1) >= WALL_EXTRACTION_CONFIG.minSegLenFinal)
    .map(w => ({ ...w, type: "int.vec" }));

  const pages = await pdfToImg(buffer, { scale: WALL_EXTRACTION_CONFIG.scale });
  let pngBuf: Buffer | null = null;
  for await (const p of pages) { pngBuf = Buffer.from(p); break; }
  let rasterFiltered: Array<{ x1: number; y1: number; x2: number; y2: number; type: string }> = [];
  if (pngBuf) {
    const { walls: rasterWalls } = await vectorizeRasterWallsFromPng(pngBuf, {
      minRunPx: 6, thicknessPx: 4, minDensity: 0.78,
    });
    const minLen = 6;
    const lotBx0 = Math.min(...lotPolyPx.map(p => p.x));
    const lotBx1 = Math.max(...lotPolyPx.map(p => p.x));
    const lotBy0 = Math.min(...lotPolyPx.map(p => p.y));
    const lotBy1 = Math.max(...lotPolyPx.map(p => p.y));
    rasterFiltered = rasterWalls.filter(w => {
      const len = Math.hypot(w.x2-w.x1, w.y2-w.y1);
      if (len < minLen) return false;
      const cx = (w.x1+w.x2)/2, cy = (w.y1+w.y2)/2;
      return cx >= lotBx0 && cx <= lotBx1 && cy >= lotBy0 && cy <= lotBy1;
    }).map(w => ({ ...w, type: "raster" }));
  }

  const allWalls = [...externalWalls, ...internalVec, ...rasterFiltered];
  console.log(`\n=== ${roomName} F${floor} (${externalWalls.length} ext + ${internalVec.length} int.vec + ${rasterFiltered.length} raster) ===\n`);

  const roomRes = await pool.query<{ name: string; polygon: Pt[] }>(
    "SELECT name, polygon FROM vs_rooms WHERE lot_id=$1 AND name=$2",
    [lot.id, roomName],
  );
  if (roomRes.rows.length === 0) {
    console.error(`Room ${roomName} not found`);
    process.exit(1);
  }
  const r = roomRes.rows[0];

  for (let i = 0; i < r.polygon.length; i++) {
    const v = r.polygon[i];
    const gx = lotMinX + (v.x_percent/100)*lotW;
    const gy = lotMinY + (v.y_percent/100)*lotH;
    const px = (gx/100)*imageW, py = (gy/100)*imageH;
    let bestD = Infinity;
    let bestType = "?";
    let bestW: typeof allWalls[0] | null = null;
    for (const w of allWalls) {
      const d = distPointToSegment(px, py, w.x1, w.y1, w.x2, w.y2);
      if (d < bestD) { bestD = d; bestType = w.type; bestW = w; }
    }
    const outlier = bestD > 5 ? "✗" : "✓";
    const wallInfo = bestW ? `[${bestType}] (${bestW.x1.toFixed(0)},${bestW.y1.toFixed(0)})→(${bestW.x2.toFixed(0)},${bestW.y2.toFixed(0)})` : "";
    console.log(`${outlier} v[${i.toString().padStart(2)}] px=(${px.toFixed(0)},${py.toFixed(0)}) dist=${bestD.toFixed(1)}px ${wallInfo}`);
  }

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
