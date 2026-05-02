import { Pool } from "pg";
import { readFile } from "fs/promises";
import { extractTextItems, filterRoomLabels } from "../src/lib/vs/pdf-text-extractor";
import { extractLotVector } from "../src/lib/vs/lot-vector-extractor";

const DB_URL = process.env.DATABASE_URL || "postgres://versi:versi@127.0.0.1:5432/versi_studio";

async function main() {
  const projectId = "5b30e9fe-257e-41a4-968e-6b90b3a70e5e";
  const floor = 3;
  const pool = new Pool({ connectionString: DB_URL });
  const planRes = await pool.query<{ file_path: string }>(
    "SELECT file_path FROM vs_plans WHERE project_id = $1 AND floor_number = $2", [projectId, floor],
  );
  const buf = await readFile(planRes.rows[0].file_path);
  const lvr = await extractLotVector(buf, { scale: 3 });
  const lotsRes = await pool.query<{ zone_data: { points: any[] } }>(
    "SELECT l.zone_data FROM vs_lots l WHERE l.project_id = $1 AND l.floor_number = $2", [projectId, floor],
  );
  const lotPoly = lotsRes.rows[0].zone_data.points;
  const imageW = lvr.imageWidth, imageH = lvr.imageHeight;
  const lotPolyPx = lotPoly.map((p: any) => ({ x: (p.x_percent / 100) * imageW, y: (p.y_percent / 100) * imageH }));
  const items = await extractTextItems(buf, lotPolyPx, 3);
  console.log(`F3 imageW=${imageW.toFixed(0)} imageH=${imageH.toFixed(0)}`);
  const labels = filterRoomLabels(items);
  console.log(`Labels filtrés (room candidates) :`);
  for (const l of labels) {
    console.log(`  "${l.text}" — px(${l.x.toFixed(0)},${l.y.toFixed(0)}) — surface=${l.surface_m2 ?? "?"}m²`);
  }
  console.log(`\nTous text items zone SDE (px 1700-1900, y 1550-1750) :`);
  for (const it of items) {
    if (it.x < 1700 || it.x > 1900 || it.y < 1550 || it.y > 1750) continue;
    console.log(`  "${it.text}" — px(${it.x.toFixed(0)},${it.y.toFixed(0)}) w=${it.width?.toFixed(0)} h=${it.height?.toFixed(0)}`);
  }
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
