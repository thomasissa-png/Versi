/* eslint-disable @typescript-eslint/no-explicit-any */
// FIXME(s34): script de diagnostic session — typages "any" tolérés (PoC/debug, hors build prod).
import { Pool } from "pg";
import { readFile } from "fs/promises";
import { extractLotVector, extractInternalWallSegments } from "../src/lib/vs/lot-vector-extractor";
import { chainCollinearSegments } from "../src/lib/vs/orthogonal-regularizer";
import { WALL_EXTRACTION_CONFIG } from "../src/lib/vs/wall-extraction-config";

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
  const floor = parseInt(process.argv[3] || "1");
  const pool = new Pool({ connectionString: DB_URL });
  const lotsRes = await pool.query<any>("SELECT l.id, l.zone_data FROM vs_lots l WHERE l.project_id = $1 AND l.floor_number = $2", [projectId, floor]);
  const planPathsRes = await pool.query<any>("SELECT file_path FROM vs_plans WHERE project_id = $1 AND floor_number = $2", [projectId, floor]);
  const lot = lotsRes.rows[0];
  const lotPoly = lot.zone_data.points;
  let lotMinX = 100, lotMinY = 100, lotMaxX = 0, lotMaxY = 0;
  for (const p of lotPoly) { if (p.x_percent < lotMinX) lotMinX = p.x_percent; if (p.y_percent < lotMinY) lotMinY = p.y_percent; if (p.x_percent > lotMaxX) lotMaxX = p.x_percent; if (p.y_percent > lotMaxY) lotMaxY = p.y_percent; }
  const lotW = lotMaxX - lotMinX, lotH = lotMaxY - lotMinY;
  const buffer = await readFile(planPathsRes.rows[0].file_path);
  const lvr = await extractLotVector(buffer, { scale: WALL_EXTRACTION_CONFIG.scale });
  const externalWalls = lvr.wallSegments;
  const imageW = lvr.imageWidth, imageH = lvr.imageHeight;
  const lotPolyPx = lotPoly.map((p: Pt) => ({ x: (p.x_percent/100)*imageW, y: (p.y_percent/100)*imageH }));
  const rawInt = await extractInternalWallSegments(buffer, lotPolyPx, { scale: WALL_EXTRACTION_CONFIG.scale, multiColor: WALL_EXTRACTION_CONFIG.multiColor, minSegLen: WALL_EXTRACTION_CONFIG.minSegLenExtraction });
  const chained = chainCollinearSegments(rawInt, { gapPx: WALL_EXTRACTION_CONFIG.chainGapPx, angleTolDeg: WALL_EXTRACTION_CONFIG.chainAngleTolDeg, lateralTolPx: WALL_EXTRACTION_CONFIG.chainLateralTolPx });
  const internalWalls = chained.filter(w => Math.hypot(w.x2-w.x1, w.y2-w.y1) >= WALL_EXTRACTION_CONFIG.minSegLenFinal);
  const allWalls = [...externalWalls.map(s => ({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 })), ...internalWalls];

  const room = process.argv[4] || "Séjour / cuisine";
  const roomsRes = await pool.query<any>("SELECT name, polygon FROM vs_rooms WHERE lot_id = $1 AND name = $2", [lot.id, room]);
  const r = roomsRes.rows[0];
  if (!r) { console.log(`Room "${room}" not found`); await pool.end(); return; }
  console.log(`\n=== ${r.name} on floor ${floor} ===\n`);
  console.log(`Image: ${imageW}x${imageH}, lot: minX=${lotMinX.toFixed(2)}% minY=${lotMinY.toFixed(2)}% w=${lotW.toFixed(2)}% h=${lotH.toFixed(2)}%`);
  for (let i = 0; i < r.polygon.length; i++) {
    const v = r.polygon[i];
    const gx = lotMinX + (v.x_percent/100)*lotW;
    const gy = lotMinY + (v.y_percent/100)*lotH;
    const px = (gx/100)*imageW, py = (gy/100)*imageH;
    let bestD = Infinity;
    for (const w of allWalls) { const d = distPointToSegment(px, py, w.x1, w.y1, w.x2, w.y2); if (d < bestD) bestD = d; }
    const flag = bestD > 5 ? " ✗" : "  ";
    console.log(`${flag} v[${String(i).padStart(2)}] global=(${gx.toFixed(2)}%,${gy.toFixed(2)}%) px=(${px.toFixed(0)},${py.toFixed(0)}) bestDist=${bestD.toFixed(1)}px`);
  }
  await pool.end();
}
main().catch(console.error);
