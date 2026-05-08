/* eslint-disable @typescript-eslint/no-unused-vars */
// FIXME(s34): script de diagnostic session — vars inutilisées tolérées (PoC/debug, hors build prod).
/**
 * Diag : scan la masque "wall" PNG dans la zone SDE F3 pour voir ce qui bloque le BFS.
 */
import { Pool } from "pg";
import { readFile, writeFile } from "fs/promises";
import { pdf as pdfToImg } from "pdf-to-img";
import sharp from "sharp";

const DB_URL = process.env.DATABASE_URL || "postgres://versi:versi@127.0.0.1:5432/versi_studio";

async function main() {
  const projectId = "5b30e9fe-257e-41a4-968e-6b90b3a70e5e";
  const floor = 3;
  const pool = new Pool({ connectionString: DB_URL });
  const planRes = await pool.query<{ file_path: string }>(
    "SELECT file_path FROM vs_plans WHERE project_id = $1 AND floor_number = $2", [projectId, floor],
  );
  const buf = await readFile(planRes.rows[0].file_path);
  const pages0 = await pdfToImg(buf, { scale: 3 });
  let pngBuf: Buffer | null = null;
  for await (const p of pages0) { pngBuf = Buffer.from(p); break; }
  if (!pngBuf) { console.error("no png"); return; }
  const meta = await sharp(pngBuf).metadata();
  const W = meta.width!;
  const H = meta.height!;
  // Box d'intérêt : SDE F3 zone (px 1700-1920, y 1500-1750)
  const x0 = 1700, x1 = 1920, y0 = 1500, y1 = 1750;
  const w = x1 - x0, h = y1 - y0;
  // Extract zone, raw RGB
  const raw = await sharp(pngBuf).extract({ left: x0, top: y0, width: w, height: h }).raw().toBuffer();
  // Channels (rgb if no alpha)
  const channels = raw.length / (w * h);
  console.log(`SDE zone scan : ${w}×${h}px (px ${x0},${y0} → ${x1},${y1}), channels=${channels}`);
  console.log(`y_abs | y_rel | wall_pct | first_x | last_x | gap_pct (continuous non-wall)`);
  // Pour chaque scanline horizontale, count des pixels "wall-like" (lum<210 OU sat>0.25)
  for (let yr = 0; yr < h; yr += 5) {
    let wallCount = 0;
    let firstX = -1, lastX = -1;
    let maxGap = 0, currentGap = 0;
    for (let xr = 0; xr < w; xr++) {
      const idx = (yr * w + xr) * channels;
      const r = raw[idx], g = raw[idx + 1], b = raw[idx + 2];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const lum = (r + g + b) / 3;
      const sat = max > 0 ? (max - min) / max : 0;
      const isWall = lum < 210 || sat > 0.25;
      if (isWall) {
        wallCount++;
        if (firstX === -1) firstX = xr;
        lastX = xr;
        maxGap = Math.max(maxGap, currentGap);
        currentGap = 0;
      } else {
        currentGap++;
      }
    }
    maxGap = Math.max(maxGap, currentGap);
    const pct = (wallCount / w * 100).toFixed(0);
    console.log(`${(y0 + yr).toString().padStart(4)} | ${yr.toString().padStart(3)} | ${pct.padStart(3)}% | ${firstX === -1 ? "-" : (x0 + firstX)} | ${lastX === -1 ? "-" : (x0 + lastX)} | maxgap=${maxGap}`);
  }

  // Save zoomed PNG of the zone for visual inspection
  await sharp(pngBuf)
    .extract({ left: x0, top: y0, width: w, height: h })
    .resize(w * 4, h * 4, { kernel: "nearest" })
    .toFile("/tmp/sde-zone-zoom.png");
  console.log("Saved: /tmp/sde-zone-zoom.png");
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
