/**
 * s28 tour 12 — Diagnostic des vertices outliers.
 * Pour chaque vertex outlier (à >5px du mur PDF le plus proche), on cherche :
 * - Distance min au mur PDF
 * - Distance min au contour du lot
 * - Distance min au contour de la pièce voisine la plus proche
 * - Distance min à un mur PDF "court" (filtré <10px)
 */
import { Pool } from "pg";
import { readFile } from "fs/promises";
import { extractLotVector, extractInternalWallSegments } from "../src/lib/vs/lot-vector-extractor";
import { chainCollinearSegments } from "../src/lib/vs/orthogonal-regularizer";
import { WALL_EXTRACTION_CONFIG } from "../src/lib/vs/wall-extraction-config";

const DB_URL = process.env.DATABASE_URL || "postgres://versi:versi@127.0.0.1:5432/versi_studio";
interface Pt { x_percent: number; y_percent: number }
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
  const floor = parseInt(process.argv[3] || "1");
  const pool = new Pool({ connectionString: DB_URL });

  const lotsRes = await pool.query<any>(
    "SELECT l.id, l.zone_data FROM vs_lots l WHERE l.project_id = $1 AND l.floor_number = $2",
    [projectId, floor],
  );
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
  const planRes = await pool.query<any>(
    "SELECT file_path FROM vs_plans WHERE project_id = $1 AND floor_number = $2",
    [projectId, floor],
  );
  const buf = await readFile(planRes.rows[0].file_path);
  const lvr = await extractLotVector(buf, { scale: WALL_EXTRACTION_CONFIG.scale });
  const externalWalls = lvr.wallSegments;
  const imageW = lvr.imageWidth, imageH = lvr.imageHeight;
  const lotPolyPx = lotPoly.map((p) => ({ x: (p.x_percent / 100) * imageW, y: (p.y_percent / 100) * imageH }));
  const rawInternal = await extractInternalWallSegments(buf, lotPolyPx, {
    scale: WALL_EXTRACTION_CONFIG.scale,
    multiColor: WALL_EXTRACTION_CONFIG.multiColor,
    minSegLen: WALL_EXTRACTION_CONFIG.minSegLenExtraction,
  });
  const chained = chainCollinearSegments(rawInternal, {
    gapPx: WALL_EXTRACTION_CONFIG.chainGapPx,
    angleTolDeg: WALL_EXTRACTION_CONFIG.chainAngleTolDeg,
    lateralTolPx: WALL_EXTRACTION_CONFIG.chainLateralTolPx,
  });
  const internalWalls = chained.filter(w => Math.hypot(w.x2 - w.x1, w.y2 - w.y1) >= WALL_EXTRACTION_CONFIG.minSegLenFinal);
  const allPdfWalls: Wall[] = [
    ...externalWalls.map(s => ({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 })),
    ...internalWalls,
  ];
  // Murs courts (rejetés du final)
  const shortPdfWalls: Wall[] = chained
    .filter(w => Math.hypot(w.x2 - w.x1, w.y2 - w.y1) < WALL_EXTRACTION_CONFIG.minSegLenFinal)
    .map(w => ({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 }));
  // Raw segments bruts (avant chaînage)
  const rawShort = rawInternal.map(w => ({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 }));

  // Murs lot (arêtes du polygone lot)
  const lotEdges: Wall[] = [];
  for (let i = 0; i < lotPolyPx.length; i++) {
    const j = (i + 1) % lotPolyPx.length;
    lotEdges.push({ x1: lotPolyPx[i].x, y1: lotPolyPx[i].y, x2: lotPolyPx[j].x, y2: lotPolyPx[j].y });
  }

  const roomsRes = await pool.query<any>("SELECT name, polygon FROM vs_rooms WHERE lot_id = $1", [lot.id]);
  const rooms = roomsRes.rows.map((r: any) => {
    const polyPx = r.polygon.map((v: Pt) => {
      const gx = lotMinX + (v.x_percent / 100) * lotW;
      const gy = lotMinY + (v.y_percent / 100) * lotH;
      return { x: (gx / 100) * imageW, y: (gy / 100) * imageH };
    });
    return { name: r.name, polygon: polyPx };
  });

  // Pour chaque room, lister les outliers
  console.log(`\n═══ floor ${floor} — diag outliers ═══`);
  console.log(`PDF walls: ${allPdfWalls.length} (ext ${externalWalls.length} + int filt ${internalWalls.length})`);
  console.log(`PDF shorts (chained <10): ${shortPdfWalls.length}`);
  console.log(`PDF raw (pre-chain): ${rawShort.length}`);
  console.log(`Lot edges: ${lotEdges.length}`);

  const buckets = { lot: 0, neighbor: 0, short: 0, raw: 0, none: 0 };
  let totalOut = 0;
  for (const r of rooms) {
    // Arêtes des autres pièces
    const otherEdges: Wall[] = [];
    for (const r2 of rooms) {
      if (r2 === r) continue;
      for (let i = 0; i < r2.polygon.length; i++) {
        const j = (i + 1) % r2.polygon.length;
        otherEdges.push({ x1: r2.polygon[i].x, y1: r2.polygon[i].y, x2: r2.polygon[j].x, y2: r2.polygon[j].y });
      }
    }
    for (const v of r.polygon) {
      const dPdf = minDist(v.x, v.y, allPdfWalls);
      if (dPdf <= 5) continue;
      totalOut++;
      const dLot = minDist(v.x, v.y, lotEdges);
      const dNeigh = minDist(v.x, v.y, otherEdges);
      const dShort = minDist(v.x, v.y, shortPdfWalls);
      const dRaw = minDist(v.x, v.y, rawShort);
      let cat = "none";
      if (dLot <= 5) cat = "lot";
      else if (dNeigh <= 5) cat = "neighbor";
      else if (dShort <= 5) cat = "short";
      else if (dRaw <= 5) cat = "raw";
      buckets[cat as keyof typeof buckets]++;
    }
  }
  console.log(`\nTotal outliers: ${totalOut}`);
  console.log(`  Près du lot edge          : ${buckets.lot}  (${(buckets.lot / totalOut * 100).toFixed(0)}%)`);
  console.log(`  Près d'une pièce voisine  : ${buckets.neighbor}  (${(buckets.neighbor / totalOut * 100).toFixed(0)}%)`);
  console.log(`  Près d'un mur PDF court   : ${buckets.short}  (${(buckets.short / totalOut * 100).toFixed(0)}%)`);
  console.log(`  Près d'un raw seg pré-chaîne : ${buckets.raw}  (${(buckets.raw / totalOut * 100).toFixed(0)}%)`);
  console.log(`  AUCUN voisin <=5px        : ${buckets.none}  (${(buckets.none / totalOut * 100).toFixed(0)}%)`);
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
