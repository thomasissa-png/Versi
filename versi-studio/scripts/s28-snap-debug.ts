/**
 * Debug : pour chaque pièce, lister les vertices avec leur distance min au mur.
 * Permet d'identifier les vertices "outliers" (>5px) et leur localisation.
 */
import { Pool } from "pg";
import { readFile } from "fs/promises";
import { extractLotVector } from "../src/lib/vs/lot-vector-extractor";
import { extractInternalWallSegments } from "../src/lib/vs/lot-vector-extractor";
import { chainCollinearSegments } from "../src/lib/vs/orthogonal-regularizer";

const DB_URL = process.env.DATABASE_URL || "postgres://versi:versi@127.0.0.1:5432/versi_studio";

interface Pt { x_percent: number; y_percent: number }

function distPointToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

async function main() {
  const projectId = process.argv[2];
  const floorFilter = process.argv[3] ? parseInt(process.argv[3]) : null;
  const pool = new Pool({ connectionString: DB_URL });

  const lotsRes = await pool.query<{
    id: string; floor_number: number; name: string;
    zone_data: { type: string; points: Pt[] };
  }>(
    "SELECT l.id, l.floor_number, l.name, l.zone_data FROM vs_lots l WHERE l.project_id = $1 ORDER BY l.floor_number",
    [projectId],
  );

  const planPathsRes = await pool.query<{ floor_number: number; file_path: string }>(
    "SELECT floor_number, file_path FROM vs_plans WHERE project_id = $1",
    [projectId],
  );
  const planPaths = new Map(planPathsRes.rows.map(r => [r.floor_number, r.file_path]));

  for (const lot of lotsRes.rows) {
    if (floorFilter !== null && lot.floor_number !== floorFilter) continue;
    const lotPoly = lot.zone_data?.points ?? [];
    if (lotPoly.length < 3) continue;
    let lotMinX = 100, lotMinY = 100, lotMaxX = 0, lotMaxY = 0;
    for (const p of lotPoly) {
      if (p.x_percent < lotMinX) lotMinX = p.x_percent;
      if (p.y_percent < lotMinY) lotMinY = p.y_percent;
      if (p.x_percent > lotMaxX) lotMaxX = p.x_percent;
      if (p.y_percent > lotMaxY) lotMaxY = p.y_percent;
    }
    const lotW = lotMaxX - lotMinX;
    const lotH = lotMaxY - lotMinY;

    const planPath = planPaths.get(lot.floor_number);
    if (!planPath) continue;
    const buffer = await readFile(planPath);
    const lvr = await extractLotVector(buffer, { scale: 3 });
    const externalWalls = lvr.wallSegments;
    const imageW = lvr.imageWidth;
    const imageH = lvr.imageHeight;
    const lotPolyPx = lotPoly.map(p => ({ x: (p.x_percent / 100) * imageW, y: (p.y_percent / 100) * imageH }));
    const rawIntWalls = await extractInternalWallSegments(buffer, lotPolyPx, { scale: 3, multiColor: true, minSegLen: 5 });
    const chainedIntWalls = chainCollinearSegments(rawIntWalls, { gapPx: 15, angleTolDeg: 3, lateralTolPx: 3 });
    const internalWalls = chainedIntWalls.filter((w) => Math.hypot(w.x2-w.x1, w.y2-w.y1) >= 10);
    const allWalls = [
      ...externalWalls.map(s => ({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 })),
      ...internalWalls,
    ];

    const roomsRes = await pool.query<{ name: string; polygon: Pt[] | null }>(
      "SELECT name, polygon FROM vs_rooms WHERE lot_id = $1 ORDER BY name",
      [lot.id],
    );

    console.log(`\n═══ ${lot.name} (floor ${lot.floor_number}) — ${allWalls.length} murs ═══`);
    let lotPassed = 0, lotTotal = 0;
    for (const r of roomsRes.rows) {
      if (!r.polygon) continue;
      let passed = 0, total = 0;
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
        total++;
        lotTotal++;
        if (bestD <= 5) { passed++; lotPassed++; }
      }
      const sorted = [...distances].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const max = sorted[sorted.length - 1];
      const p90 = sorted[Math.floor(sorted.length * 0.9)];
      console.log(
        `  ${r.name.padEnd(20)} ${passed}/${total} (${(passed/total*100).toFixed(0)}%) — médiane ${median.toFixed(1)}px, p90 ${p90.toFixed(1)}px, max ${max.toFixed(1)}px`,
      );
    }
    console.log(`  TOTAL : ${lotPassed}/${lotTotal} (${(lotPassed/lotTotal*100).toFixed(1)}%)`);
  }
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
