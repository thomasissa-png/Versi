/**
 * Audit final tour 30 — pour chaque pièce en DB, vérifier que chaque bord
 * (N/S/E/W) touche soit un mur du lot soit une autre pièce (gap ≤ 5px).
 *
 * Cible : 4/4 PASS (RDC, R+1, R+2, R+3).
 */
import { Pool } from "pg";

const PROJECT_ID = process.argv[2];
if (!PROJECT_ID) { console.error("usage: tsx <script> <project_id>"); process.exit(1); }

const TOL = 5;

interface Pt { x_percent: number; y_percent: number }

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://versi:versi@127.0.0.1:5432/versi_studio",
});

function bboxOf(poly: Pt[]) {
  let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
  for (const p of poly) {
    if (p.x_percent < xMin) xMin = p.x_percent;
    if (p.y_percent < yMin) yMin = p.y_percent;
    if (p.x_percent > xMax) xMax = p.x_percent;
    if (p.y_percent > yMax) yMax = p.y_percent;
  }
  return { xMin, yMin, xMax, yMax };
}

async function main() {
  const lotsRes = await pool.query<{ id: string; floor_number: number; name: string; zone_data: { type: string; points: Pt[] } }>(
    "SELECT id, floor_number, name, zone_data FROM vs_lots WHERE project_id = $1 ORDER BY floor_number", [PROJECT_ID]);

  const results: Array<{ floor: number; lotName: string; pass: boolean; gaps: string[] }> = [];

  for (const lot of lotsRes.rows) {
    const lotPoly = lot.zone_data.points;
    const lotB = bboxOf(lotPoly);
    const lotW = lotB.xMax - lotB.xMin, lotH = lotB.yMax - lotB.yMin;

    const roomsRes = await pool.query<{ name: string; polygon: Pt[] | null }>(
      "SELECT name, polygon FROM vs_rooms WHERE lot_id = $1", [lot.id]);

    // Convert polygons to global pct coordinates
    type RB = { name: string; bbox: { xMin: number; yMin: number; xMax: number; yMax: number } };
    const rooms: RB[] = [];
    for (const r of roomsRes.rows) {
      if (!r.polygon || r.polygon.length < 3) continue;
      const polyG = r.polygon.map(v => ({
        x_percent: lotB.xMin + (v.x_percent / 100) * lotW,
        y_percent: lotB.yMin + (v.y_percent / 100) * lotH,
      }));
      rooms.push({ name: r.name, bbox: bboxOf(polyG) });
    }

    // Convert tolerance (5px) to pct: lot dims are pct × imageDim. We don't have imageDim here.
    // Assume lot covers ~1500px wide on image (typical PDF), 5px ≈ 0.33% of lot W.
    // Use TOL_PCT = 0.5% as conservative tolerance equivalent to ~5-7px on a 1000-1500px image.
    const TOL_PCT = 0.5;

    const gaps: string[] = [];
    for (const r of rooms) {
      const others = rooms.filter(o => o !== r);
      // Check N edge: distance from r.bbox.yMin to closest neighbor or lot edge above (within x range)
      // For each direction, check whether there's a touching neighbor or a lot edge.
      for (const dir of ["N", "S", "W", "E"] as const) {
        let limit: number;
        // Lot edge limit
        if (dir === "N") limit = lotB.yMin;
        else if (dir === "S") limit = lotB.yMax;
        else if (dir === "W") limit = lotB.xMin;
        else limit = lotB.xMax;

        // Neighbor limit (more constraining)
        for (const o of others) {
          const b = o.bbox;
          if (dir === "N" || dir === "S") {
            const ovx = Math.min(r.bbox.xMax, b.xMax) - Math.max(r.bbox.xMin, b.xMin);
            if (ovx <= 0.1) continue;
            if (dir === "N" && b.yMax <= r.bbox.yMin + 0.1 && b.yMax > limit) limit = b.yMax;
            if (dir === "S" && b.yMin >= r.bbox.yMax - 0.1 && b.yMin < limit) limit = b.yMin;
          } else {
            const ovy = Math.min(r.bbox.yMax, b.yMax) - Math.max(r.bbox.yMin, b.yMin);
            if (ovy <= 0.1) continue;
            if (dir === "W" && b.xMax <= r.bbox.xMin + 0.1 && b.xMax > limit) limit = b.xMax;
            if (dir === "E" && b.xMin >= r.bbox.xMax - 0.1 && b.xMin < limit) limit = b.xMin;
          }
        }

        let gap: number;
        if (dir === "N") gap = r.bbox.yMin - limit;
        else if (dir === "S") gap = limit - r.bbox.yMax;
        else if (dir === "W") gap = r.bbox.xMin - limit;
        else gap = limit - r.bbox.xMax;

        if (gap > TOL_PCT) {
          gaps.push(`${r.name}/${dir}=${gap.toFixed(2)}%`);
        }
      }
    }

    const pass = gaps.length === 0;
    results.push({ floor: lot.floor_number, lotName: lot.name, pass, gaps });
    console.log(`[${lot.name}] ${pass ? "PASS" : "FAIL"} ${pass ? "" : `— gaps : ${gaps.join(", ")}`}`);
  }

  const passed = results.filter(r => r.pass).length;
  console.log(`\n=== Total : ${passed}/${results.length} PASS invariant touche ===`);

  await pool.end();
  process.exit(passed === results.length ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
