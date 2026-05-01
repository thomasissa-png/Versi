/**
 * s28 tour 13 — Diag : pour les outliers à >5px de tout segment vectoriel,
 * vérifier la distance au PIXEL NOIR PNG le plus proche.
 *
 * Si tous les outliers sont à <5px d'un pixel noir PNG → cause racine =
 * murs de cloisons rendus en raster/peinture pas en vectoriel.
 * Si tous sont à >5px → autre cause (drift downstream pipeline).
 */
import { Pool } from "pg";
import { readFile } from "fs/promises";
import sharp from "sharp";
import { extractLotVector, extractInternalWallSegments } from "../src/lib/vs/lot-vector-extractor";
import { chainCollinearSegments } from "../src/lib/vs/orthogonal-regularizer";
import { WALL_EXTRACTION_CONFIG } from "../src/lib/vs/wall-extraction-config";
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
  const lvr = await extractLotVector(buf, { scale: WALL_EXTRACTION_CONFIG.scale });
  const externalWalls = lvr.wallSegments;
  const imageW = lvr.imageWidth, imageH = lvr.imageHeight;
  const lotPolyPx = lotPoly.map(p => ({ x: (p.x_percent / 100) * imageW, y: (p.y_percent / 100) * imageH }));

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

  // Build wallMask (pixels noirs PNG)
  const pages = await pdfToImg(buf, { scale: 3 });
  let pngBuf: Buffer | null = null;
  for await (const p of pages) { pngBuf = Buffer.from(p); break; }
  if (!pngBuf) { console.error("PNG fail"); process.exit(1); }
  const img = sharp(pngBuf).raw().ensureAlpha();
  const meta = await img.metadata();
  const W = meta.width!, H = meta.height!;
  const px = await img.toBuffer();
  const wallMask = new Uint8Array(W * H);
  for (let i = 0, p = 0; i < W * H; i++, p += 4) {
    const r = px[p], g = px[p + 1], b = px[p + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    let isWall = lum < 210;
    if (!isWall) {
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const sat = max > 0 ? (max - min) / max : 0;
      if (sat > 0.25 && lum < 230) isWall = true;
    }
    wallMask[i] = isWall ? 1 : 0;
  }

  // Distance pixel noir PNG : pour chaque vertex, scanner anneau radius=1..15
  const distPngPix = (vx: number, vy: number): number => {
    const cx = Math.round(vx), cy = Math.round(vy);
    if (cx < 0 || cx >= W || cy < 0 || cy >= H) return Infinity;
    if (wallMask[cy * W + cx] === 1) return 0;
    for (let r = 1; r <= 30; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const x = cx + dx, y = cy + dy;
          if (x < 0 || x >= W || y < 0 || y >= H) continue;
          if (wallMask[y * W + x] === 1) return Math.hypot(dx, dy);
        }
      }
    }
    return Infinity;
  };

  const roomsRes = await pool.query<{ name: string; polygon: Pt[] }>(
    "SELECT name, polygon FROM vs_rooms WHERE lot_id = $1", [lot.id],
  );
  const rooms = roomsRes.rows.map(r => ({
    name: r.name,
    polygon: r.polygon.map(v => {
      const gx = lotMinX + (v.x_percent / 100) * lotW;
      const gy = lotMinY + (v.y_percent / 100) * lotH;
      return { x: (gx / 100) * imageW, y: (gy / 100) * imageH };
    }),
  }));

  console.log(`\n═══ floor ${floor} — diag PNG pixels ═══`);
  console.log(`PDF walls vectoriels: ${allPdfWalls.length}, PNG: ${W}x${H}`);

  const buckets = { lt2: 0, lt5: 0, lt10: 0, lt15: 0, ge15: 0 };
  let totalOut = 0;
  const samples: Array<{ room: string; v: { x: number; y: number }; dPdf: number; dPng: number }> = [];
  for (const r of rooms) {
    for (const v of r.polygon) {
      const dPdf = minDist(v.x, v.y, allPdfWalls);
      if (dPdf <= 5) continue;
      totalOut++;
      const dPng = distPngPix(v.x, v.y);
      if (dPng < 2) buckets.lt2++;
      else if (dPng < 5) buckets.lt5++;
      else if (dPng < 10) buckets.lt10++;
      else if (dPng < 15) buckets.lt15++;
      else buckets.ge15++;
      if (samples.length < 5) samples.push({ room: r.name, v, dPdf, dPng });
    }
  }
  console.log(`\nOutliers (>5px du mur PDF): ${totalOut}`);
  console.log(`  PNG pixel <2px  : ${buckets.lt2}  (${(buckets.lt2 / totalOut * 100).toFixed(0)}%)`);
  console.log(`  PNG pixel <5px  : ${buckets.lt5}  (${(buckets.lt5 / totalOut * 100).toFixed(0)}%)`);
  console.log(`  PNG pixel <10px : ${buckets.lt10}  (${(buckets.lt10 / totalOut * 100).toFixed(0)}%)`);
  console.log(`  PNG pixel <15px : ${buckets.lt15}  (${(buckets.lt15 / totalOut * 100).toFixed(0)}%)`);
  console.log(`  PNG pixel ≥15px : ${buckets.ge15}  (${(buckets.ge15 / totalOut * 100).toFixed(0)}%)`);
  console.log(`\nÉchantillons:`);
  for (const s of samples) {
    console.log(`  ${s.room.padEnd(20)} v=(${s.v.x.toFixed(1)},${s.v.y.toFixed(1)}) dPdf=${s.dPdf.toFixed(1)} dPng=${s.dPng === Infinity ? ">30" : s.dPng.toFixed(1)}`);
  }
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
