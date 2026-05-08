/* eslint-disable @typescript-eslint/no-explicit-any */
// FIXME(s34): script de diagnostic session — typages "any" tolérés (PoC/debug, hors build prod).
// Diag tour 24 - positions exactes labels PDF R+1
import { readFile } from "fs/promises";
import { extractTextItems, filterRoomLabels } from "../src/lib/vs/pdf-text-extractor";
import { extractLotVector } from "../src/lib/vs/lot-vector-extractor";
import { Pool } from "pg";

const DB_URL = process.env.DATABASE_URL || "postgres://versi:versi@127.0.0.1:5432/versi_studio";

async function main() {
  const projectId = "fb03836e-6f2e-42b7-a411-c3d24aed834c";
  const pool = new Pool({ connectionString: DB_URL });

  for (const floor of [0, 1, 2, 3]) {
    const planRes = await pool.query<{ id: string; file_path: string }>(
      "SELECT id, file_path FROM vs_plans WHERE project_id = $1 AND floor_number = $2",
      [projectId, floor]
    );
    if (planRes.rows.length === 0) continue;
    const buf = await readFile(planRes.rows[0].file_path);
    const lvr = await extractLotVector(buf, { scale: 3 });
    const lotsRes = await pool.query<{ zone_data: { points: Array<{ x_percent: number; y_percent: number }> } }>(
      "SELECT zone_data FROM vs_lots WHERE project_id = $1 AND floor_number = $2",
      [projectId, floor]
    );
    const lotPoly = lotsRes.rows[0].zone_data.points;
    const imageW = lvr.imageWidth;
    const imageH = lvr.imageHeight;
    const lotPolyPx = lotPoly.map((p) => ({
      x: (p.x_percent / 100) * imageW,
      y: (p.y_percent / 100) * imageH,
    }));
    const xMin = Math.min(...lotPolyPx.map((p) => p.x));
    const xMax = Math.max(...lotPolyPx.map((p) => p.x));
    const yMin = Math.min(...lotPolyPx.map((p) => p.y));
    const yMax = Math.max(...lotPolyPx.map((p) => p.y));

    console.log(`\n=== FLOOR ${floor} ===`);
    console.log(`Image ${imageW}x${imageH} | Lot bbox px x[${xMin.toFixed(0)}..${xMax.toFixed(0)}] y[${yMin.toFixed(0)}..${yMax.toFixed(0)}]`);

    const items = await extractTextItems(buf, lotPolyPx, 3);
    const labels = filterRoomLabels(items);
    for (const l of labels) {
      const xPct = ((l.x - xMin) / (xMax - xMin)) * 100;
      const yPct = ((l.y - yMin) / (yMax - yMin)) * 100;
      const surf = (l as any).surface_m2 != null ? `${(l as any).surface_m2}m²` : "?m²";
      const bb = (l as any).bbox ? `bbox=[${(l as any).bbox.x.toFixed(0)},${(l as any).bbox.y.toFixed(0)},${(l as any).bbox.width.toFixed(0)}x${(l as any).bbox.height.toFixed(0)}]` : "";
      console.log(`  "${l.text}" lot=(${xPct.toFixed(1)}%, ${yPct.toFixed(1)}%) ${surf} ${bb}`);
    }
  }

  await pool.end();
  process.exit(0);
}
main();
