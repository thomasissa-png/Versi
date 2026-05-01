import { Pool } from "pg";
import { readFile } from "fs/promises";
import { extractLotVector, extractInternalWallSegments } from "../src/lib/vs/lot-vector-extractor";
import { chainCollinearSegments } from "../src/lib/vs/orthogonal-regularizer";
import { WALL_EXTRACTION_CONFIG } from "../src/lib/vs/wall-extraction-config";

const DB_URL = process.env.DATABASE_URL || "postgres://versi:versi@127.0.0.1:5432/versi_studio";

interface Pt { x_percent: number; y_percent: number }

function distPointToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

async function main() {
  const projectId = process.argv[2];
  const floor = parseInt(process.argv[3] || "1");
  const pool = new Pool({ connectionString: DB_URL });
  const lotsRes = await pool.query<any>(
    "SELECT l.id, l.floor_number, l.name, l.zone_data FROM vs_lots l WHERE l.project_id = $1 AND l.floor_number = $2",
    [projectId, floor],
  );
  const planPathsRes = await pool.query<any>(
    "SELECT floor_number, file_path FROM vs_plans WHERE project_id = $1 AND floor_number = $2",
    [projectId, floor],
  );
  const lot = lotsRes.rows[0];
  const planPath = planPathsRes.rows[0].file_path;
  const lotPoly = lot.zone_data.points;
  let lotMinX = 100, lotMinY = 100, lotMaxX = 0, lotMaxY = 0;
  for (const p of lotPoly) {
    if (p.x_percent < lotMinX) lotMinX = p.x_percent;
    if (p.y_percent < lotMinY) lotMinY = p.y_percent;
    if (p.x_percent > lotMaxX) lotMaxX = p.x_percent;
    if (p.y_percent > lotMaxY) lotMaxY = p.y_percent;
  }
  const lotW = lotMaxX - lotMinX;
  const lotH = lotMaxY - lotMinY;

  const buffer = await readFile(planPath);
  const lvr = await extractLotVector(buffer, { scale: WALL_EXTRACTION_CONFIG.scale });
  const externalWalls = lvr.wallSegments;
  const imageW = lvr.imageWidth, imageH = lvr.imageHeight;
  const lotPolyPx = lotPoly.map((p: Pt) => ({ x: (p.x_percent / 100) * imageW, y: (p.y_percent / 100) * imageH }));
  const rawInternal = await extractInternalWallSegments(buffer, lotPolyPx, {
    scale: WALL_EXTRACTION_CONFIG.scale,
    multiColor: WALL_EXTRACTION_CONFIG.multiColor,
    minSegLen: WALL_EXTRACTION_CONFIG.minSegLenExtraction,
  });
  const chained = chainCollinearSegments(rawInternal, {
    gapPx: WALL_EXTRACTION_CONFIG.chainGapPx,
    angleTolDeg: WALL_EXTRACTION_CONFIG.chainAngleTolDeg,
    lateralTolPx: WALL_EXTRACTION_CONFIG.chainLateralTolPx,
  });
  const internalWalls = chained.filter(w => Math.hypot(w.x2-w.x1, w.y2-w.y1) >= WALL_EXTRACTION_CONFIG.minSegLenFinal);
  const allWalls = [...externalWalls.map(s => ({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 })), ...internalWalls];
  console.log(`Floor ${floor} : ${externalWalls.length} ext + ${internalWalls.length} int walls\n`);

  const roomsRes = await pool.query<any>("SELECT name, polygon FROM vs_rooms WHERE lot_id = $1", [lot.id]);
  for (const r of roomsRes.rows) {
    if (!r.polygon) continue;
    const distances: number[] = [];
    for (const v of r.polygon) {
      const gx = lotMinX + (v.x_percent / 100) * lotW;
      const gy = lotMinY + (v.y_percent / 100) * lotH;
      const px = (gx / 100) * imageW;
      const py = (gy / 100) * imageH;
      let bestD = Infinity;
      for (const w of allWalls) {
        const d = distPointToSegment(px, py, w.x1, w.y1, w.x2, w.y2);
        if (d < bestD) bestD = d;
      }
      distances.push(bestD);
    }
    const sorted = [...distances].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length/2)];
    const max = sorted[sorted.length-1];
    const p90 = sorted[Math.floor(sorted.length*0.9)];
    const fails = distances.filter(d => d > 5).length;
    const total = distances.length;
    console.log(`[${r.name.padEnd(20)}] vertices=${total} median=${median.toFixed(1)}px p90=${p90.toFixed(1)}px max=${max.toFixed(1)}px fails(>5px)=${fails}/${total} (${((fails/total)*100).toFixed(1)}%)`);
  }
  await pool.end();
}
main().catch(console.error);
