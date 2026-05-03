/**
 * s28.5 — Visualisation FINALE : screenshot du PDF avec les polygones de pièces
 * de la DB superposés (couleur par pièce + label).
 */
import { readFileSync } from "fs";
import sharp from "sharp";
import { Pool } from "pg";
import { extractLotVector } from "../src/lib/vs/lot-vector-extractor";

const PROJECT_ID = process.argv[2];
if (!PROJECT_ID) { console.error("usage: tsx scripts/s28-viz-final.ts <project_id>"); process.exit(1); }

const PLANS = [
  { file: "P 00 - Pr2_plan RDC_ projet2.pdf", floor: 0 },
  { file: "P 01 - Pr2_plan R+1_ projet2.pdf", floor: 1 },
  { file: "P 02 - Pr2_plan R+2_ projet2.pdf", floor: 2 },
  { file: "P 03 - Pr02_plan R+3_ projet02.pdf", floor: 3 },
];
const COLORS = ["#ff0000", "#00cc00", "#0066ff", "#ff8800", "#cc00ff", "#00cccc", "#cc6600", "#88cc00"];

interface Pt { x_percent: number; y_percent: number }

async function main() {
  const pool = new Pool({ connectionString: "postgres://versi:versi@127.0.0.1:5432/versi_studio" });
  const planDir = "../reference-existant/plans-test/";

  for (const plan of PLANS) {
    const pdfBuffer = readFileSync(planDir + plan.file);
    const lotResult = await extractLotVector(pdfBuffer, { scale: 3 });
    const W = lotResult.imageWidth;
    const H = lotResult.imageHeight;

    // Récupère le lot + pièces depuis la DB
    const lotRes = await pool.query<{ id: string; zone_data: { type: string; points: Pt[] } }>(
      "SELECT id, zone_data FROM vs_lots WHERE project_id = $1 AND floor_number = $2",
      [PROJECT_ID, plan.floor],
    );
    if (lotRes.rows.length === 0) {
      console.log(`Floor ${plan.floor} : lot introuvable`);
      continue;
    }
    const lot = lotRes.rows[0];
    const lotPoly = lot.zone_data?.points ?? [];
    let lotMinX = 100, lotMinY = 100, lotMaxX = 0, lotMaxY = 0;
    for (const p of lotPoly) {
      if (p.x_percent < lotMinX) lotMinX = p.x_percent;
      if (p.y_percent < lotMinY) lotMinY = p.y_percent;
      if (p.x_percent > lotMaxX) lotMaxX = p.x_percent;
      if (p.y_percent > lotMaxY) lotMaxY = p.y_percent;
    }
    const lotW = lotMaxX - lotMinX, lotH = lotMaxY - lotMinY;

    const roomsRes = await pool.query<{ name: string; surface_m2: string | null; polygon: Pt[] }>(
      "SELECT name, surface_m2, polygon FROM vs_rooms WHERE lot_id = $1 ORDER BY surface_m2 DESC NULLS LAST",
      [lot.id],
    );

    // Génère SVG overlay
    let svgInner = "";
    // Lot polygon
    const lotPoints = lotPoly.map((p) => `${(p.x_percent / 100 * W).toFixed(0)},${(p.y_percent / 100 * H).toFixed(0)}`).join(" ");
    svgInner += `<polygon points="${lotPoints}" fill="none" stroke="#000000" stroke-width="6" stroke-dasharray="20,10"/>`;
    // Rooms
    roomsRes.rows.forEach((r, i) => {
      const color = COLORS[i % COLORS.length];
      // Convert lot-local % → plan-global px
      const ptsPx = r.polygon.map((v) => {
        const gx = lotMinX + (v.x_percent / 100) * lotW;
        const gy = lotMinY + (v.y_percent / 100) * lotH;
        return `${(gx / 100 * W).toFixed(0)},${(gy / 100 * H).toFixed(0)}`;
      });
      svgInner += `<polygon points="${ptsPx.join(" ")}" fill="${color}" fill-opacity="0.20" stroke="${color}" stroke-width="4"/>`;
      // Centroïde pour label
      let cx = 0, cy = 0;
      for (const v of r.polygon) {
        const gx = lotMinX + (v.x_percent / 100) * lotW;
        const gy = lotMinY + (v.y_percent / 100) * lotH;
        cx += gx / 100 * W;
        cy += gy / 100 * H;
      }
      cx /= r.polygon.length;
      cy /= r.polygon.length;
      const surf = r.surface_m2 ? ` ${parseFloat(r.surface_m2).toFixed(1)}m²` : "";
      svgInner += `<rect x="${cx - 200}" y="${cy - 28}" width="400" height="56" fill="white" fill-opacity="0.85" stroke="${color}" stroke-width="2"/>`;
      svgInner += `<text x="${cx}" y="${cy + 12}" text-anchor="middle" fill="${color}" font-size="36" font-weight="bold">${r.name}${surf}</text>`;
    });

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${svgInner}</svg>`;

    // Génère PNG du PDF + composite
    const { pdf } = await import("pdf-to-img");
    const pages = await pdf(pdfBuffer, { scale: 3 });
    let pngBuffer: Buffer | null = null;
    for await (const page of pages) { pngBuffer = Buffer.from(page); break; }
    if (!pngBuffer) continue;

    const out = `../tests/screenshots/s28-final-floor-${plan.floor}.png`;
    await sharp(pngBuffer)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .toFile(out);
    console.log(`Floor ${plan.floor} (${roomsRes.rows.length} rooms): ${out}`);
  }
  await pool.end();
  process.exit(0);
}
main().catch((err) => { console.error(err); process.exit(1); });
