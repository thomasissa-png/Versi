/**
 * s28 TOUR 16 — Cleanup outliers post-hoc.
 *
 * Constat tour 16 diag : SDE F3 a 10/11 vertices à 27-91px du mur le plus proche.
 * Le polygone flood-fill est intrinsèquement mal formé (boucle "interne" qui
 * contourne des grisés/hachures à l'intérieur de la pièce).
 *
 * Plutôt qu'inventer des murs, on fait un pruning :
 *   1. Pour chaque polygon, calcule pour chaque vertex la distance au mur le plus proche
 *   2. Marque les vertices "outliers" (>5px)
 *   3. Tente de les supprimer un par un :
 *      - Si la suppression maintient l'aire à ±10% et le polygon reste valide
 *        (≥4 vertices), on supprime
 *   4. Après pruning : snap final progressif (5/10/15px)
 *   5. UPDATE DB.
 *
 * Cible : passer 86-94% Inv C → 95%+.
 */
import { Pool } from "pg";
import { readFile } from "fs/promises";
import { extractLotVector, extractInternalWallSegments } from "../src/lib/vs/lot-vector-extractor";
import { chainCollinearSegments } from "../src/lib/vs/orthogonal-regularizer";
import { vectorizeRasterWallsFromPng } from "../src/lib/vs/raster-walls-vectorize";
import { WALL_EXTRACTION_CONFIG } from "../src/lib/vs/wall-extraction-config";
import { snapPolygonToWalls, type WallSegment } from "../src/lib/vs/wall-snap";
import { pdf as pdfToImg } from "pdf-to-img";

const DB_URL = process.env.DATABASE_URL || "postgres://versi:versi@127.0.0.1:5432/versi_studio";
interface Pt { x_percent: number; y_percent: number }
interface PtPx { x: number; y: number }

function distPointToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1; const len2 = dx*dx + dy*dy;
  if (len2 === 0) return Math.hypot(px-x1, py-y1);
  const t = Math.max(0, Math.min(1, ((px-x1)*dx + (py-y1)*dy) / len2));
  return Math.hypot(px-(x1+t*dx), py-(y1+t*dy));
}

function polygonAreaPx(poly: PtPx[]): number {
  if (poly.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    s += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
  }
  return Math.abs(s / 2);
}

function bestWallDist(p: PtPx, walls: Array<{ x1:number;y1:number;x2:number;y2:number }>): number {
  let best = Infinity;
  for (const w of walls) {
    const d = distPointToSegment(p.x, p.y, w.x1, w.y1, w.x2, w.y2);
    if (d < best) best = d;
    if (best <= 0.5) break;
  }
  return best;
}

/**
 * Simplifie le polygon par pruning des outliers : pour chaque vertex à >5px d'un mur,
 * on tente de le supprimer si l'aire reste à ±10% de l'aire d'origine.
 * Itère jusqu'à convergence (plus rien à supprimer).
 */
function pruneOutliers(
  polygon: PtPx[],
  walls: Array<{ x1:number;y1:number;x2:number;y2:number }>,
  thresholdPx: number = 5,
  areaDriftMax: number = 0.10,
): PtPx[] {
  let poly = polygon.map(p => ({ ...p }));
  const origArea = polygonAreaPx(poly);
  if (origArea < 1) return poly;
  let changed = true;
  let iter = 0;
  while (changed && iter < 50 && poly.length >= 5) {
    changed = false;
    iter++;
    // Compute distances
    const dists = poly.map(p => bestWallDist(p, walls));
    // Trouver le worst outlier
    let worstIdx = -1;
    let worstD = thresholdPx;
    for (let i = 0; i < dists.length; i++) {
      if (dists[i] > worstD) {
        worstD = dists[i];
        worstIdx = i;
      }
    }
    if (worstIdx < 0) break;
    // Tester suppression
    const trial = [...poly.slice(0, worstIdx), ...poly.slice(worstIdx + 1)];
    const trialArea = polygonAreaPx(trial);
    if (trial.length >= 4 && origArea > 0 && Math.abs(trialArea - origArea) / origArea <= areaDriftMax) {
      poly = trial;
      changed = true;
    } else {
      // Si pas supprimable, le tagger pour ne plus le retenter (en arrêtant)
      break;
    }
  }
  return poly;
}

async function main() {
  const projectId = process.argv[2];
  if (!projectId) {
    console.error("Usage: tsx scripts/s28-tour16-cleanup-outliers.ts <project_id> [--dry-run]");
    process.exit(1);
  }
  const dryRun = process.argv.includes("--dry-run");
  const pool = new Pool({ connectionString: DB_URL });
  console.log(`\n=== TOUR 16 CLEANUP — outliers pruning (project ${projectId}) ===\n`);

  const lots = await pool.query<{
    id: string;
    floor_number: number;
    name: string;
    zone_data: { points: Pt[] };
  }>(
    "SELECT id, floor_number, name, zone_data FROM vs_lots WHERE project_id=$1 ORDER BY floor_number",
    [projectId],
  );
  const plans = await pool.query<{ id: string; floor_number: number; file_path: string }>(
    "SELECT id, floor_number, file_path FROM vs_plans WHERE project_id=$1",
    [projectId],
  );
  const planByFloor = new Map(plans.rows.map(p => [p.floor_number, p]));

  for (const lot of lots.rows) {
    const lotPolyPct = lot.zone_data?.points ?? [];
    if (lotPolyPct.length < 3) continue;
    const plan = planByFloor.get(lot.floor_number);
    if (!plan) continue;

    let lotMinX = 100, lotMinY = 100, lotMaxX = 0, lotMaxY = 0;
    for (const p of lotPolyPct) {
      if (p.x_percent < lotMinX) lotMinX = p.x_percent;
      if (p.y_percent < lotMinY) lotMinY = p.y_percent;
      if (p.x_percent > lotMaxX) lotMaxX = p.x_percent;
      if (p.y_percent > lotMaxY) lotMaxY = p.y_percent;
    }
    const lotW = lotMaxX - lotMinX, lotH = lotMaxY - lotMinY;

    console.log(`\n--- Floor ${lot.floor_number} — ${lot.name} ---`);
    const buffer = await readFile(plan.file_path);
    const lvr = await extractLotVector(buffer, { scale: WALL_EXTRACTION_CONFIG.scale });
    const externalWalls = lvr.wallSegments.map(s => ({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 }));
    const imageW = lvr.imageWidth, imageH = lvr.imageHeight;
    const lotPolyPx = lotPolyPct.map(p => ({ x: (p.x_percent/100)*imageW, y: (p.y_percent/100)*imageH }));

    const rawInt = await extractInternalWallSegments(buffer, lotPolyPx, {
      scale: WALL_EXTRACTION_CONFIG.scale, multiColor: WALL_EXTRACTION_CONFIG.multiColor,
      minSegLen: WALL_EXTRACTION_CONFIG.minSegLenExtraction,
    });
    const chained = chainCollinearSegments(rawInt, {
      gapPx: WALL_EXTRACTION_CONFIG.chainGapPx, angleTolDeg: WALL_EXTRACTION_CONFIG.chainAngleTolDeg,
      lateralTolPx: WALL_EXTRACTION_CONFIG.chainLateralTolPx,
    });
    const internalVec = chained.filter(w => Math.hypot(w.x2-w.x1, w.y2-w.y1) >= WALL_EXTRACTION_CONFIG.minSegLenFinal);

    const pages = await pdfToImg(buffer, { scale: WALL_EXTRACTION_CONFIG.scale });
    let pngBuf: Buffer | null = null;
    for await (const p of pages) { pngBuf = Buffer.from(p); break; }
    let rasterFiltered: Array<{ x1:number;y1:number;x2:number;y2:number }> = [];
    if (pngBuf) {
      const { walls: rasterWalls } = await vectorizeRasterWallsFromPng(pngBuf, {
        minRunPx: 6, thicknessPx: 4, minDensity: 0.78,
      });
      const lotBx0 = Math.min(...lotPolyPx.map(p => p.x)), lotBx1 = Math.max(...lotPolyPx.map(p => p.x));
      const lotBy0 = Math.min(...lotPolyPx.map(p => p.y)), lotBy1 = Math.max(...lotPolyPx.map(p => p.y));
      rasterFiltered = rasterWalls.filter(w => {
        const len = Math.hypot(w.x2-w.x1, w.y2-w.y1);
        if (len < 6) return false;
        const cx = (w.x1+w.x2)/2, cy = (w.y1+w.y2)/2;
        return cx >= lotBx0 && cx <= lotBx1 && cy >= lotBy0 && cy <= lotBy1;
      });
    }
    const allWalls = [...externalWalls, ...internalVec, ...rasterFiltered];

    const rooms = await pool.query<{ id: string; name: string; polygon: Pt[]; surface_m2: string }>(
      "SELECT id, name, polygon, surface_m2 FROM vs_rooms WHERE lot_id=$1",
      [lot.id],
    );

    for (const r of rooms.rows) {
      if (!r.polygon || r.polygon.length < 3) continue;
      // Convertir polygon lot pct → px
      const polyPx: PtPx[] = r.polygon.map(v => {
        const gx = lotMinX + (v.x_percent/100)*lotW;
        const gy = lotMinY + (v.y_percent/100)*lotH;
        return { x: (gx/100)*imageW, y: (gy/100)*imageH };
      });
      const origArea = polygonAreaPx(polyPx);
      const origCount = polyPx.length;
      let outliersOrig = 0;
      for (const v of polyPx) {
        if (bestWallDist(v, allWalls) > 5) outliersOrig++;
      }

      // Étape 1 : Pruning agressif outliers (drift max 10%)
      let cleaned = pruneOutliers(polyPx, allWalls, 5, 0.10);

      // Étape 2 : Snap progressif (5 / 10 / 15px) avec garde-fou aire
      const wallsForSnap: WallSegment[] = allWalls;
      const snap1 = snapPolygonToWalls(cleaned, wallsForSnap, 5);
      const snap2 = snapPolygonToWalls(snap1.polygon, wallsForSnap, 10);
      const snap3 = snapPolygonToWalls(snap2.polygon, wallsForSnap, 15);
      const snap1Area = polygonAreaPx(snap1.polygon);
      const snap2Area = polygonAreaPx(snap2.polygon);
      const snap3Area = polygonAreaPx(snap3.polygon);
      const driftSnap1 = origArea > 0 ? Math.abs(snap1Area - origArea) / origArea : 0;
      const driftSnap2 = origArea > 0 ? Math.abs(snap2Area - origArea) / origArea : 0;
      const driftSnap3 = origArea > 0 ? Math.abs(snap3Area - origArea) / origArea : 0;
      // Choisir le snap le plus agressif tant que drift < 12%
      let finalPoly = cleaned;
      if (driftSnap3 < 0.12) finalPoly = snap3.polygon;
      else if (driftSnap2 < 0.12) finalPoly = snap2.polygon;
      else if (driftSnap1 < 0.12) finalPoly = snap1.polygon;

      // Étape 3 : Re-pruning (post-snap il peut rester des outliers résiduels)
      finalPoly = pruneOutliers(finalPoly, allWalls, 5, 0.10);

      let outliersFinal = 0;
      for (const v of finalPoly) {
        if (bestWallDist(v, allWalls) > 5) outliersFinal++;
      }
      const finalArea = polygonAreaPx(finalPoly);
      const drift = origArea > 0 ? ((finalArea - origArea) / origArea * 100) : 0;
      console.log(`  ${r.name.padEnd(20)} verts ${origCount}→${finalPoly.length} outliers ${outliersOrig}→${outliersFinal} drift_aire=${drift.toFixed(1)}%`);

      if (!dryRun) {
        // Convertir polyPx → lot pct
        const polyLotPct = finalPoly.map(p => {
          const gx = (p.x / imageW) * 100;
          const gy = (p.y / imageH) * 100;
          return {
            x_percent: ((gx - lotMinX) / lotW) * 100,
            y_percent: ((gy - lotMinY) / lotH) * 100,
          };
        });
        await pool.query(
          "UPDATE vs_rooms SET polygon=$1 WHERE id=$2",
          [JSON.stringify(polyLotPct), r.id],
        );
      }
    }
  }

  await pool.end();
  console.log(`\n=== TOUR 16 CLEANUP terminé ${dryRun ? "(dry-run)" : "(committed)"} ===\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
