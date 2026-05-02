/**
 * s28 tour 18 — Rendu overlay polygones sur PDF (backend, pas UI).
 *
 * Pour chaque étage :
 *   1. Charge le PDF original
 *   2. Le rasterise (pdf-to-img, scale=3)
 *   3. Lit les rooms en DB (polygon en lot-local %, on doit dénormaliser via lot bbox)
 *   4. Dessine les polygones par-dessus le PDF avec Sharp/Canvas
 *   5. Sauvegarde en PNG nommé s28-tour18-overlay-floor-N.png
 *
 * Plus fiable qu'un screenshot UI car indépendant du rendering canvas.
 */
import { readFile, writeFile } from "fs/promises";
import { Pool } from "pg";
import { pdf as pdfToImg } from "pdf-to-img";
import sharp from "sharp";

const PROJECT_ID = process.env.VS_E2E_PROJECT_ID || process.argv[2];
if (!PROJECT_ID) {
  console.error("Usage: VS_E2E_PROJECT_ID=xxx tsx scripts/s28-tour18-render-overlay.ts");
  process.exit(1);
}

const DB_URL = process.env.DATABASE_URL || "postgres://versi:versi@127.0.0.1:5432/versi_studio";
const SCREENSHOT_DIR = "/home/user/Versi/versi-studio/tests/screenshots";

// Couleurs cycliques pour les pièces (roomType → color)
const COLORS = [
  "rgba(255, 100, 100, 0.35)", // rouge
  "rgba(100, 200, 100, 0.35)", // vert
  "rgba(100, 130, 255, 0.35)", // bleu
  "rgba(255, 200, 50, 0.35)",  // jaune
  "rgba(200, 100, 255, 0.35)", // violet
  "rgba(100, 220, 220, 0.35)", // cyan
  "rgba(255, 150, 100, 0.35)", // orange
  "rgba(180, 220, 100, 0.35)", // vert lime
];
const STROKES = [
  "#cc3030", "#208830", "#3050cc", "#cc8810",
  "#9930cc", "#108890", "#cc6010", "#8090a0",
];

interface Room {
  name: string;
  surface_m2: number | null;
  polygon: Array<{ x_percent: number; y_percent: number }>;
  position: { x_percent: number; y_percent: number; width_percent: number; height_percent: number };
  lot_bbox: { x_percent: number; y_percent: number; width_percent: number; height_percent: number };
}

async function processFloor(
  pool: Pool,
  planRow: { id: string; floor_number: number; file_path: string },
): Promise<void> {
  const floor = planRow.floor_number;
  const pdfBuffer = await readFile(planRow.file_path);

  // 1. Rasteriser PDF (1ère page seulement)
  let pngBuf: Buffer | null = null;
  for await (const page of await pdfToImg(pdfBuffer, { scale: 3 })) {
    pngBuf = Buffer.from(page);
    break;
  }
  if (!pngBuf) {
    console.warn(`[Floor ${floor}] no page extracted`);
    return;
  }
  const meta = await sharp(pngBuf).metadata();
  const W = meta.width!;
  const H = meta.height!;

  // 2. Récupérer rooms + lot bbox depuis DB.
  // Le lot a zone_data.points (polygone du lot) en % image.
  // On en calcule la bbox.
  const lotRow = await pool.query<{ id: string; zone_data: unknown }>(
    `SELECT id, zone_data FROM vs_lots WHERE project_id = $1 AND floor_number = $2 LIMIT 1`,
    [PROJECT_ID, floor],
  );
  if (lotRow.rows.length === 0) {
    console.warn(`[Floor ${floor}] no lot for floor`);
    return;
  }
  const lotId = lotRow.rows[0].id;
  const zoneData = lotRow.rows[0].zone_data as {
    type: string;
    points: Array<{ x_percent: number; y_percent: number }>;
  };
  let lotMinX = 100, lotMinY = 100, lotMaxX = 0, lotMaxY = 0;
  for (const p of zoneData.points) {
    if (p.x_percent < lotMinX) lotMinX = p.x_percent;
    if (p.x_percent > lotMaxX) lotMaxX = p.x_percent;
    if (p.y_percent < lotMinY) lotMinY = p.y_percent;
    if (p.y_percent > lotMaxY) lotMaxY = p.y_percent;
  }
  const lotPos = {
    x_percent: lotMinX,
    y_percent: lotMinY,
    width_percent: lotMaxX - lotMinX,
    height_percent: lotMaxY - lotMinY,
  };

  const roomsRes = await pool.query<{ name: string; surface_m2: string | null; polygon: unknown; position: unknown }>(
    `SELECT name, surface_m2, polygon, position FROM vs_rooms
     WHERE lot_id = $1 ORDER BY name`,
    [lotId],
  );
  const rooms: Room[] = roomsRes.rows.map((r) => ({
    name: r.name,
    surface_m2: r.surface_m2 != null ? parseFloat(r.surface_m2) : null,
    polygon: r.polygon as Array<{ x_percent: number; y_percent: number }>,
    position: r.position as Room["position"],
    lot_bbox: lotPos,
  }));

  // 3. Convertir polygones lot-local % → pixels image
  // lot-local % → lot-bbox % → pixels image
  const lot_x0 = (lotPos.x_percent / 100) * W;
  const lot_y0 = (lotPos.y_percent / 100) * H;
  const lot_w = (lotPos.width_percent / 100) * W;
  const lot_h = (lotPos.height_percent / 100) * H;

  // 4. Construire un SVG overlay
  const svgParts: string[] = [];
  svgParts.push(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`);
  // Lot polygon en référence (vert pointillé)
  const lotPts = zoneData.points
    .map((p) => `${((p.x_percent / 100) * W).toFixed(1)},${((p.y_percent / 100) * H).toFixed(1)}`)
    .join(" ");
  svgParts.push(
    `<polygon points="${lotPts}" fill="none" stroke="#00aa00" stroke-width="3" stroke-dasharray="8,4"/>`,
  );
  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    const color = COLORS[i % COLORS.length];
    const stroke = STROKES[i % STROKES.length];
    const pts = room.polygon.map((p) => {
      const x = lot_x0 + (p.x_percent / 100) * lot_w;
      const y = lot_y0 + (p.y_percent / 100) * lot_h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    svgParts.push(`<polygon points="${pts}" fill="${color}" stroke="${stroke}" stroke-width="3"/>`);
    // Centroid for label
    let cx = 0, cy = 0;
    for (const p of room.polygon) {
      cx += lot_x0 + (p.x_percent / 100) * lot_w;
      cy += lot_y0 + (p.y_percent / 100) * lot_h;
    }
    cx /= room.polygon.length;
    cy /= room.polygon.length;
    const label = `${room.name}${room.surface_m2 ? ` (${room.surface_m2}m²)` : ""}`;
    svgParts.push(
      `<rect x="${cx - 70}" y="${cy - 12}" width="140" height="20" fill="white" fill-opacity="0.85" stroke="${stroke}" stroke-width="1"/>`,
      `<text x="${cx}" y="${cy + 4}" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${stroke}" text-anchor="middle">${label}</text>`,
    );
  }
  svgParts.push("</svg>");
  const svg = Buffer.from(svgParts.join("\n"), "utf-8");

  // 5. Composer overlay sur PNG
  const outPath = `${SCREENSHOT_DIR}/s28-tour18-floor-${floor}.png`;
  await sharp(pngBuf)
    .composite([{ input: svg, top: 0, left: 0 }])
    .png()
    .toFile(outPath);
  console.log(`[Floor ${floor}] ${rooms.length} pièces overlay : ${outPath}`);
}

async function main() {
  const pool = new Pool({ connectionString: DB_URL });
  const plansRes = await pool.query<{ id: string; floor_number: number; file_path: string }>(
    `SELECT id, floor_number, file_path FROM vs_plans WHERE project_id = $1 ORDER BY floor_number`,
    [PROJECT_ID],
  );
  for (const plan of plansRes.rows) {
    try {
      await processFloor(pool, plan);
    } catch (e) {
      console.error(`[Floor ${plan.floor_number}] error :`, e instanceof Error ? e.message : e);
    }
  }
  await pool.end();
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
