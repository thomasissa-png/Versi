/**
 * Script d'audit visuel s23 : génère un overlay PNG pour un projet à partir de la DB.
 * Écrit /tmp/s23-audit-overlay-<id>.png pour reality check visuel.
 *
 * Usage : PROJECT_ID=<uuid> npx tsx scripts/audit-overlay-s23.ts
 */
import { Pool } from "pg";
import { readFile, writeFile } from "fs/promises";
import { buildOverlayImage, type RoomForVerify } from "../src/lib/vs/visual-verifier";

const PROJECT_ID = process.env.PROJECT_ID || "";
if (!PROJECT_ID) {
  console.error("Missing env PROJECT_ID");
  process.exit(1);
}

async function main() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://versi:versi_local@localhost:5432/versi_studio_dev",
  });

  const planRes = await pool.query(
    "SELECT id, file_path, mime_type FROM vs_plans WHERE project_id=$1 LIMIT 1",
    [PROJECT_ID],
  );
  if (planRes.rows.length === 0) throw new Error("No plan for project");
  const planRow = planRes.rows[0];

  let pngBuf: Buffer;
  if (planRow.mime_type === "application/pdf") {
    const pdfBuf = await readFile(planRow.file_path);
    const { pdf } = await import("pdf-to-img");
    const pages = await pdf(pdfBuf, { scale: 3 });
    let found: Buffer | null = null;
    for await (const page of pages) {
      found = Buffer.from(page);
      break;
    }
    if (!found) throw new Error("No PNG page");
    pngBuf = found;
  } else {
    pngBuf = await readFile(planRow.file_path);
  }

  const lotRes = await pool.query(
    "SELECT id, name, zone_data FROM vs_lots WHERE project_id=$1",
    [PROJECT_ID],
  );
  const rooms: RoomForVerify[] = [];
  for (const lot of lotRes.rows) {
    const zone = lot.zone_data as {
      x_percent: number;
      y_percent: number;
      width_percent: number;
      height_percent: number;
    };
    const rr = await pool.query(
      "SELECT id, name, polygon FROM vs_rooms WHERE lot_id=$1 ORDER BY name",
      [lot.id],
    );
    for (const r of rr.rows) {
      if (!r.polygon) continue;
      const polyLocal = r.polygon as Array<{
        x_percent: number;
        y_percent: number;
      }>;
      const polyGlobal = polyLocal.map((p) => ({
        x_percent: zone.x_percent + (p.x_percent / 100) * zone.width_percent,
        y_percent: zone.y_percent + (p.y_percent / 100) * zone.height_percent,
      }));
      rooms.push({
        id: String(r.id).slice(0, 6),
        name: r.name,
        polygon: polyGlobal,
        surface_m2: null,
      });
    }
  }

  const { buffer, width, height } = await buildOverlayImage(pngBuf, rooms);
  const outPath = `/tmp/s23-audit-overlay-${PROJECT_ID.slice(0, 8)}.png`;
  await writeFile(outPath, buffer);
  console.log(
    `Overlay written: ${outPath} (${rooms.length} rooms, ${width}x${height})`,
  );
  for (const r of rooms) {
    console.log(`  - ${r.id} · ${r.name}: ${r.polygon.length}pts`);
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
