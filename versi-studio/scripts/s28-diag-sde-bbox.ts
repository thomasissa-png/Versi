/* eslint-disable @typescript-eslint/no-explicit-any */
// FIXME(s34): script de diagnostic session — typages "any" tolérés (PoC/debug, hors build prod).
/**
 * Diag bbox-rebuild SDE F3 : simule la recherche pour comprendre les murs trouvés.
 */
import { Pool } from "pg";
import { readFile } from "fs/promises";
import { extractLotVector, extractInternalWallSegments } from "../src/lib/vs/lot-vector-extractor";
import { chainCollinearSegments } from "../src/lib/vs/orthogonal-regularizer";
import { vectorizeRasterWallsFromPng } from "../src/lib/vs/raster-walls-vectorize";
import { pdf as pdfToImg } from "pdf-to-img";

const DB_URL = process.env.DATABASE_URL || "postgres://versi:versi@127.0.0.1:5432/versi_studio";
type Wall = { x1: number; y1: number; x2: number; y2: number; src: string };

async function main() {
  const projectId = process.argv[2];
  const floor = 3;
  if (!projectId) { console.error("usage: ... <project_id>"); return; }
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
  // Note : le pipeline utilise allWalls_snap = chained (vec) + raster. Reproduction.
  const allChained = chainCollinearSegments(
    [...externalWalls.map(s => ({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 })), ...internalWalls],
    { gapPx: 8, angleTolDeg: 3, lateralTolPx: 2 },
  );
  const allChainedFilt = allChained.filter(w => Math.hypot(w.x2-w.x1, w.y2-w.y1) >= 15);
  const allWalls: Wall[] = [
    ...allChainedFilt.map(s => ({ ...s, src: "chain" })),
    ...rasterFiltered,
  ];
  console.log(`F3 : ${allWalls.length} walls (chain ${allChainedFilt.length} + raster ${rasterFiltered.length})`);

  // SDE bbox : récupérer les vertices SDE (en lot-coords) → convertir en px
  const roomsRes = await pool.query<{ name: string; polygon: any[] }>(
    "SELECT name, polygon FROM vs_rooms WHERE lot_id = $1 AND name='SDE'", [lotsRes.rows[0].id],
  );
  const sde = roomsRes.rows[0];
  let lotMinX = 100, lotMinY = 100, lotMaxX = 0, lotMaxY = 0;
  for (const p of lotPoly as any[]) {
    if (p.x_percent < lotMinX) lotMinX = p.x_percent;
    if (p.y_percent < lotMinY) lotMinY = p.y_percent;
    if (p.x_percent > lotMaxX) lotMaxX = p.x_percent;
    if (p.y_percent > lotMaxY) lotMaxY = p.y_percent;
  }
  const lotW = lotMaxX - lotMinX, lotH = lotMaxY - lotMinY;
  const verticesPx = sde.polygon.map((v: any) => {
    const gx = lotMinX + (v.x_percent / 100) * lotW;
    const gy = lotMinY + (v.y_percent / 100) * lotH;
    return { x: (gx / 100) * imageW, y: (gy / 100) * imageH };
  });
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const v of verticesPx) {
    if (v.x < bx0) bx0 = v.x;
    if (v.y < by0) by0 = v.y;
    if (v.x > bx1) bx1 = v.x;
    if (v.y > by1) by1 = v.y;
  }
  const cx = (bx0+bx1)/2, cy = (by0+by1)/2;
  console.log(`SDE bbox : x=[${bx0.toFixed(0)}-${bx1.toFixed(0)}] y=[${by0.toFixed(0)}-${by1.toFixed(0)}] center=(${cx.toFixed(0)},${cy.toFixed(0)})`);

  // Filtre ortho >=30px
  function isHor(w: Wall) { const dx = Math.abs(w.x2-w.x1), dy = Math.abs(w.y2-w.y1); if (dx<1) return false; return Math.atan2(dy,dx)*180/Math.PI < 8; }
  function isVer(w: Wall) { const dx = Math.abs(w.x2-w.x1), dy = Math.abs(w.y2-w.y1); if (dy<1) return false; return Math.atan2(dx,dy)*180/Math.PI < 8; }
  const horizontals = allWalls.filter(w => isHor(w) && Math.hypot(w.x2-w.x1,w.y2-w.y1) >= 30);
  const verticals = allWalls.filter(w => isVer(w) && Math.hypot(w.x2-w.x1,w.y2-w.y1) >= 30);
  console.log(`Horizontals >=30px : ${horizontals.length}, Verticals >=30px : ${verticals.length}`);

  // Find N : H autour y=by0 (1471), within ±80, cx ∈ [wx0-30, wx1+30]
  const W = 80;
  function findHN(targetY: number) {
    const cands: Array<{w: Wall, delta: number}> = [];
    for (const w of horizontals) {
      const wy = (w.y1+w.y2)/2;
      const wx0 = Math.min(w.x1,w.x2), wx1 = Math.max(w.x1,w.x2);
      if (cx < wx0-30 || cx > wx1+30) continue;
      const delta = Math.abs(targetY-wy);
      if (delta > W) continue;
      cands.push({w, delta});
    }
    cands.sort((a,b)=>a.delta-b.delta);
    return cands;
  }
  function findVN(targetX: number) {
    const cands: Array<{w: Wall, delta: number}> = [];
    for (const w of verticals) {
      const wx = (w.x1+w.x2)/2;
      const wy0 = Math.min(w.y1,w.y2), wy1 = Math.max(w.y1,w.y2);
      if (cy < wy0-30 || cy > wy1+30) continue;
      const delta = Math.abs(targetX-wx);
      if (delta > W) continue;
      cands.push({w, delta});
    }
    cands.sort((a,b)=>a.delta-b.delta);
    return cands;
  }
  console.log(`\nN candidates (H near y=${by0.toFixed(0)}, ±${W}) :`);
  for (const c of findHN(by0).slice(0,5)) console.log(`  Δ=${c.delta.toFixed(0)} mur (${c.w.x1.toFixed(0)},${c.w.y1.toFixed(0)})→(${c.w.x2.toFixed(0)},${c.w.y2.toFixed(0)}) [${c.w.src}]`);
  console.log(`S candidates (H near y=${by1.toFixed(0)}, ±${W}) :`);
  for (const c of findHN(by1).slice(0,5)) console.log(`  Δ=${c.delta.toFixed(0)} mur (${c.w.x1.toFixed(0)},${c.w.y1.toFixed(0)})→(${c.w.x2.toFixed(0)},${c.w.y2.toFixed(0)}) [${c.w.src}]`);
  console.log(`W candidates (V near x=${bx0.toFixed(0)}, ±${W}) :`);
  for (const c of findVN(bx0).slice(0,5)) console.log(`  Δ=${c.delta.toFixed(0)} mur (${c.w.x1.toFixed(0)},${c.w.y1.toFixed(0)})→(${c.w.x2.toFixed(0)},${c.w.y2.toFixed(0)}) [${c.w.src}]`);
  console.log(`E candidates (V near x=${bx1.toFixed(0)}, ±${W}) :`);
  for (const c of findVN(bx1).slice(0,5)) console.log(`  Δ=${c.delta.toFixed(0)} mur (${c.w.x1.toFixed(0)},${c.w.y1.toFixed(0)})→(${c.w.x2.toFixed(0)},${c.w.y2.toFixed(0)}) [${c.w.src}]`);
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
