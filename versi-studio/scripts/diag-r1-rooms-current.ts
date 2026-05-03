import { Pool } from "pg";
async function main() {
  const projectId = process.env.PROJECT_ID;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgres://versi:versi@127.0.0.1:5432/versi_studio" });
  const { rows } = await pool.query(`
    SELECT v.name, v.surface_m2, v.position
    FROM vs_rooms v JOIN vs_lots l ON v.lot_id = l.id
    WHERE l.project_id = $1 AND l.floor_number = 1
    ORDER BY v.surface_m2 DESC NULLS LAST
  `, [projectId]);
  for (const r of rows) {
    const p = typeof r.position === 'string' ? JSON.parse(r.position) : r.position;
    const aspect = p.width_percent && p.height_percent
      ? Math.max(p.width_percent, p.height_percent) / Math.max(0.1, Math.min(p.width_percent, p.height_percent))
      : 0;
    console.log(`${r.name.padEnd(20)} ${r.surface_m2}m²  bbox=(${p.x_percent.toFixed(1)},${p.y_percent.toFixed(1)})→(${(p.x_percent+p.width_percent).toFixed(1)},${(p.y_percent+p.height_percent).toFixed(1)}) ${p.width_percent.toFixed(1)}×${p.height_percent.toFixed(1)} aspect=${aspect.toFixed(2)}`);
  }
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
