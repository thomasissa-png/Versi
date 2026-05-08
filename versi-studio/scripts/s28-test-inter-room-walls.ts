/* eslint-disable @typescript-eslint/no-explicit-any */
// FIXME(s34): script de diagnostic session — typages "any" tolérés (PoC/debug, hors build prod).
/**
 * s28 tour 12 — TEST inter-room-walls
 *
 * Pour chaque étage du projet courant :
 * 1. Lit les rooms depuis la DB + le polygone lot
 * 2. Lit les murs PDF (extractInternalWallSegments + chainCollinearSegments + filter)
 * 3. Compte les vertices outliers vs murs PDF (>5px de tout mur PDF)
 * 4. Synthétise des murs depuis frontières inter-pièces ET frontières room↔lot
 * 5. Compte les outliers vs murs PDF + synthétiques
 * 6. Affiche le gain (outliers absorbés par murs synthétiques)
 *
 * Ce test diagnostic montre si la synthèse capture les murs manquants
 * de extractInternalWallSegments. Si oui : vraie piste pour Inv C.
 */
import { Pool } from "pg";
import { readFile } from "fs/promises";
import { extractLotVector, extractInternalWallSegments } from "../src/lib/vs/lot-vector-extractor";
import { chainCollinearSegments } from "../src/lib/vs/orthogonal-regularizer";
import { WALL_EXTRACTION_CONFIG } from "../src/lib/vs/wall-extraction-config";
import { synthesizeInterRoomWalls, synthesizeRoomToLotWalls, countOutliers, type Wall, type RoomLike } from "../src/lib/vs/inter-room-walls";

const DB_URL = process.env.DATABASE_URL || "postgres://versi:versi@127.0.0.1:5432/versi_studio";

interface Pt { x_percent: number; y_percent: number }

async function main() {
  const projectId = process.argv[2];
  if (!projectId) {
    console.error("Usage: tsx scripts/s28-test-inter-room-walls.ts <project_id>");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: DB_URL });
  console.log(`\n═══ s28 TOUR 12 — Test synthèse murs inter-pièces ═══\n`);

  const lotsRes = await pool.query<any>(
    "SELECT l.id, l.floor_number, l.name, l.zone_data FROM vs_lots l WHERE l.project_id = $1 ORDER BY l.floor_number",
    [projectId],
  );

  const planPathsRes = await pool.query<any>(
    "SELECT floor_number, file_path FROM vs_plans WHERE project_id = $1",
    [projectId],
  );
  const planPaths = new Map(planPathsRes.rows.map((r: any) => [r.floor_number, r.file_path]));

  for (const lot of lotsRes.rows) {
    const lotPoly: Pt[] = lot.zone_data?.points ?? [];
    if (lotPoly.length < 3) continue;
    let lotMinX = 100, lotMinY = 100, lotMaxX = 0, lotMaxY = 0;
    for (const p of lotPoly) {
      if (p.x_percent < lotMinX) lotMinX = p.x_percent;
      if (p.y_percent < lotMinY) lotMinY = p.y_percent;
      if (p.x_percent > lotMaxX) lotMaxX = p.x_percent;
      if (p.y_percent > lotMaxY) lotMaxY = p.y_percent;
    }
    const lotW = lotMaxX - lotMinX, lotH = lotMaxY - lotMinY;

    const planPath = planPaths.get(lot.floor_number);
    if (!planPath) continue;
    const buffer = await readFile(planPath);
    const lvr = await extractLotVector(buffer, { scale: WALL_EXTRACTION_CONFIG.scale });
    const externalWalls = lvr.wallSegments;
    const imageW = lvr.imageWidth, imageH = lvr.imageHeight;
    const lotPolyPx = lotPoly.map((p) => ({
      x: (p.x_percent / 100) * imageW,
      y: (p.y_percent / 100) * imageH,
    }));
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
    const internalWalls = chained.filter(
      (w) => Math.hypot(w.x2 - w.x1, w.y2 - w.y1) >= WALL_EXTRACTION_CONFIG.minSegLenFinal,
    );
    const allPdfWalls: Wall[] = [
      ...externalWalls.map((s) => ({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 })),
      ...internalWalls,
    ];

    // Charger rooms (polygone en % du lot — convertir en px image)
    const roomsRes = await pool.query<any>(
      "SELECT name, polygon FROM vs_rooms WHERE lot_id = $1",
      [lot.id],
    );
    const rooms: RoomLike[] = [];
    for (const r of roomsRes.rows) {
      if (!r.polygon || r.polygon.length < 3) continue;
      const polyPx = r.polygon.map((v: Pt) => {
        const gx = lotMinX + (v.x_percent / 100) * lotW;
        const gy = lotMinY + (v.y_percent / 100) * lotH;
        return {
          x: (gx / 100) * imageW,
          y: (gy / 100) * imageH,
        };
      });
      rooms.push({ name: r.name, polygon: polyPx });
    }
    const lotPolyPxFull = lotPoly.map((p) => ({
      x: (p.x_percent / 100) * imageW,
      y: (p.y_percent / 100) * imageH,
    }));

    console.log(`──── floor ${lot.floor_number} (${lot.name}) — ${rooms.length} pièces ────`);
    console.log(`  Murs PDF       : ${allPdfWalls.length} (ext ${externalWalls.length} + int ${internalWalls.length})`);

    const beforeStats = countOutliers(rooms, allPdfWalls, 5);
    const beforeRatio = beforeStats.total > 0
      ? ((beforeStats.total - beforeStats.outliers) / beforeStats.total) * 100
      : 0;
    console.log(`  Snap ratio AVANT (PDF only)  : ${beforeRatio.toFixed(1)}% (${beforeStats.outliers}/${beforeStats.total} outliers)`);

    // Tester plusieurs tolérances latérales pour trouver l'optimum
    for (const lat of [5, 10, 15, 20, 30]) {
      const interRoomWalls = synthesizeInterRoomWalls(rooms, { lateralTolPx: lat, parallelTolDeg: 8, overlapMinPx: 8, minWallLenPx: 8 });
      const lotEdgeWalls = synthesizeRoomToLotWalls(rooms, lotPolyPxFull, { lateralTolPx: lat, parallelTolDeg: 8, overlapMinPx: 8, minWallLenPx: 8 });
      const enriched = [...allPdfWalls, ...interRoomWalls, ...lotEdgeWalls];
      const afterStats = countOutliers(rooms, enriched, 5);
      const afterRatio = afterStats.total > 0
        ? ((afterStats.total - afterStats.outliers) / afterStats.total) * 100
        : 0;
      console.log(`  lat=${String(lat).padStart(2)}px → synth ${String(interRoomWalls.length + lotEdgeWalls.length).padStart(3)} (${interRoomWalls.length}+${lotEdgeWalls.length}), snap=${afterRatio.toFixed(1)}% (gain ${(afterRatio - beforeRatio).toFixed(1)} pts)`);
    }
    console.log("");
  }
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
