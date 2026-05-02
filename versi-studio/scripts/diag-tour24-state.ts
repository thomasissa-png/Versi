// Tour 24 - dump complet état post-pipeline pour diagnostic
import { Pool } from "pg";

const DB_URL = process.env.DATABASE_URL || "postgres://versi:versi@127.0.0.1:5432/versi_studio";

async function main() {
  const projectId = process.argv[2] || "fb03836e-6f2e-42b7-a411-c3d24aed834c";
  const pool = new Pool({ connectionString: DB_URL });
  for (const floor of [0, 1, 2, 3]) {
    const lotsRes = await pool.query<{ id: string; zone_data: { points: Array<{ x_percent: number; y_percent: number }> } }>(
      "SELECT id, zone_data FROM vs_lots WHERE project_id = $1 AND floor_number = $2",
      [projectId, floor]
    );
    if (lotsRes.rows.length === 0) continue;
    const lot = lotsRes.rows[0];
    const lotPoly = lot.zone_data.points;
    const xMin = Math.min(...lotPoly.map(p => p.x_percent));
    const xMax = Math.max(...lotPoly.map(p => p.x_percent));
    const yMin = Math.min(...lotPoly.map(p => p.y_percent));
    const yMax = Math.max(...lotPoly.map(p => p.y_percent));
    const lotW = xMax - xMin;
    const lotH = yMax - yMin;

    const roomsRes = await pool.query<{ name: string; surface_m2: string | null; polygon: Array<{ x_percent: number; y_percent: number }> | null }>(
      "SELECT name, surface_m2, polygon FROM vs_rooms WHERE lot_id = $1 ORDER BY name",
      [lot.id]
    );
    console.log(`\n=== FLOOR ${floor} === lot bbox global : x[${xMin.toFixed(1)}..${xMax.toFixed(1)}] y[${yMin.toFixed(1)}..${yMax.toFixed(1)}]`);
    for (const r of roomsRes.rows) {
      if (!r.polygon || r.polygon.length < 3) continue;
      const xs = r.polygon.map(p => p.x_percent);
      const ys = r.polygon.map(p => p.y_percent);
      const lcXMin = Math.min(...xs); // lot-local
      const lcXMax = Math.max(...xs);
      const lcYMin = Math.min(...ys);
      const lcYMax = Math.max(...ys);
      // global
      const gxMin = xMin + (lcXMin / 100) * lotW;
      const gxMax = xMin + (lcXMax / 100) * lotW;
      const gyMin = yMin + (lcYMin / 100) * lotH;
      const gyMax = yMin + (lcYMax / 100) * lotH;
      const surf = r.surface_m2 ? parseFloat(r.surface_m2).toFixed(1) : "?";
      console.log(`  ${r.name.padEnd(20)} loc x[${lcXMin.toFixed(1)}..${lcXMax.toFixed(1)}] y[${lcYMin.toFixed(1)}..${lcYMax.toFixed(1)}] | glb x[${gxMin.toFixed(1)}..${gxMax.toFixed(1)}] y[${gyMin.toFixed(1)}..${gyMax.toFixed(1)}] (${surf}m²)`);
    }
  }
  await pool.end();
}
main();
