/* eslint-disable @typescript-eslint/no-explicit-any */
// FIXME(s34): script de diagnostic session — typages "any" tolérés (PoC/debug, hors build prod).
/** s28 tour 12 — Lister les positions précises des outliers floor 1 + leur 5 plus proches voisins. */
import { Pool } from "pg";
import { readFile } from "fs/promises";
import { extractLotVector, extractInternalWallSegments } from "../src/lib/vs/lot-vector-extractor";
import { chainCollinearSegments } from "../src/lib/vs/orthogonal-regularizer";
import { WALL_EXTRACTION_CONFIG } from "../src/lib/vs/wall-extraction-config";

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
  const projectId = process.argv[2];
  const floor = parseInt(process.argv[3] || "1");
  const pool = new Pool({ connectionString: DB_URL });
  const lotsRes = await pool.query<any>("SELECT l.id, l.zone_data FROM vs_lots l WHERE l.project_id = $1 AND l.floor_number = $2", [projectId, floor]);
  const lot = lotsRes.rows[0];
  const lotPoly: Pt[] = lot.zone_data.points;
  let lotMinX = 100, lotMinY = 100, lotMaxX = 0, lotMaxY = 0;
  for (const p of lotPoly) {
    if (p.x_percent < lotMinX) lotMinX = p.x_percent;
    if (p.y_percent < lotMinY) lotMinY = p.y_percent;
    if (p.x_percent > lotMaxX) lotMaxX = p.x_percent;
    if (p.y_percent > lotMaxY) lotMaxY = p.y_percent;
  }
  const lotW = lotMaxX - lotMinX, lotH = lotMaxY - lotMinY;
  const planRes = await pool.query<any>("SELECT file_path FROM vs_plans WHERE project_id = $1 AND floor_number = $2", [projectId, floor]);
  const buf = await readFile(planRes.rows[0].file_path);
  const lvr = await extractLotVector(buf, { scale: WALL_EXTRACTION_CONFIG.scale });
  const externalWalls = lvr.wallSegments;
  const imageW = lvr.imageWidth, imageH = lvr.imageHeight;
  const lotPolyPx = lotPoly.map((p) => ({ x: (p.x_percent / 100) * imageW, y: (p.y_percent / 100) * imageH }));
  const rawInternal = await extractInternalWallSegments(buf, lotPolyPx, {
    scale: WALL_EXTRACTION_CONFIG.scale, multiColor: WALL_EXTRACTION_CONFIG.multiColor,
    minSegLen: WALL_EXTRACTION_CONFIG.minSegLenExtraction,
  });
  const chained = chainCollinearSegments(rawInternal, {
    gapPx: WALL_EXTRACTION_CONFIG.chainGapPx, angleTolDeg: WALL_EXTRACTION_CONFIG.chainAngleTolDeg, lateralTolPx: WALL_EXTRACTION_CONFIG.chainLateralTolPx,
  });
  const internalWalls = chained.filter(w => Math.hypot(w.x2 - w.x1, w.y2 - w.y1) >= WALL_EXTRACTION_CONFIG.minSegLenFinal);
  const allPdfWalls: Wall[] = [
    ...externalWalls.map(s => ({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 })),
    ...internalWalls,
  ];

  const roomsRes = await pool.query<any>("SELECT name, polygon FROM vs_rooms WHERE lot_id = $1", [lot.id]);
  console.log(`\n═══ floor ${floor} — outliers per room ═══`);
  for (const r of roomsRes.rows) {
    const polyPx = r.polygon.map((v: Pt) => {
      const gx = lotMinX + (v.x_percent / 100) * lotW;
      const gy = lotMinY + (v.y_percent / 100) * lotH;
      return { x: (gx / 100) * imageW, y: (gy / 100) * imageH };
    });
    let outl = 0;
    const outlPoints: { x: number; y: number; d: number }[] = [];
    for (const v of polyPx) {
      let bd = Infinity;
      for (const w of allPdfWalls) {
        const d = distSeg(v.x, v.y, w.x1, w.y1, w.x2, w.y2);
        if (d < bd) bd = d;
      }
      if (bd > 5) {
        outl++;
        outlPoints.push({ x: v.x, y: v.y, d: bd });
      }
    }
    if (outl === 0) continue;
    console.log(`  ${r.name} : ${outl}/${polyPx.length} outliers`);
    // Top 5 outliers les plus loin
    outlPoints.sort((a, b) => b.d - a.d);
    for (let i = 0; i < Math.min(5, outlPoints.length); i++) {
      console.log(`    px=(${outlPoints[i].x.toFixed(0)},${outlPoints[i].y.toFixed(0)}) d=${outlPoints[i].d.toFixed(1)}px`);
    }
  }
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
