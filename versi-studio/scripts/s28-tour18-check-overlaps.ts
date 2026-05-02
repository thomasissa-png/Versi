/**
 * s28 tour 18 — Audit chevauchements polygones par étage.
 * Pour chaque paire de pièces, calcule l'aire du chevauchement (Sutherland-Hodgman).
 */
import { Pool } from "pg";

const PROJECT_ID = process.env.VS_E2E_PROJECT_ID || process.argv[2];
if (!PROJECT_ID) {
  console.error("Usage: VS_E2E_PROJECT_ID=xxx tsx scripts/s28-tour18-check-overlaps.ts");
  process.exit(1);
}
const DB_URL = process.env.DATABASE_URL || "postgres://versi:versi@127.0.0.1:5432/versi_studio";

type Pt = { x: number; y: number };

function polyArea(poly: Pt[]): number {
  if (poly.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    s += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
  }
  return Math.abs(s / 2);
}

// Sutherland-Hodgman convex polygon clipping
function clipPolygon(subject: Pt[], clip: Pt[]): Pt[] {
  let output = subject.slice();
  for (let i = 0; i < clip.length; i++) {
    if (output.length === 0) break;
    const A = clip[i];
    const B = clip[(i + 1) % clip.length];
    const input = output;
    output = [];
    for (let j = 0; j < input.length; j++) {
      const P = input[j];
      const Q = input[(j + 1) % input.length];
      const sideP = (B.x - A.x) * (P.y - A.y) - (B.y - A.y) * (P.x - A.x);
      const sideQ = (B.x - A.x) * (Q.y - A.y) - (B.y - A.y) * (Q.x - A.x);
      if (sideP <= 0) output.push(P);
      if ((sideP <= 0) !== (sideQ <= 0)) {
        const t = sideP / (sideP - sideQ);
        output.push({
          x: P.x + t * (Q.x - P.x),
          y: P.y + t * (Q.y - P.y),
        });
      }
    }
  }
  return output;
}

async function main() {
  const pool = new Pool({ connectionString: DB_URL });
  const lots = await pool.query<{ id: string; floor_number: number }>(
    `SELECT id, floor_number FROM vs_lots WHERE project_id = $1 ORDER BY floor_number`,
    [PROJECT_ID],
  );
  for (const lot of lots.rows) {
    const rooms = await pool.query<{ name: string; polygon: unknown }>(
      `SELECT name, polygon FROM vs_rooms WHERE lot_id = $1 ORDER BY name`,
      [lot.id],
    );
    const polys: Array<{ name: string; pts: Pt[]; area: number }> = rooms.rows.map((r) => {
      const raw = r.polygon as Array<{ x_percent: number; y_percent: number }>;
      const pts = raw.map((p) => ({ x: p.x_percent, y: p.y_percent }));
      return { name: r.name, pts, area: polyArea(pts) };
    });
    console.log(`\n═══ Floor ${lot.floor_number} : ${polys.length} pièces ═══`);
    let totalOverlap = 0;
    let overlapCount = 0;
    for (let i = 0; i < polys.length; i++) {
      for (let j = i + 1; j < polys.length; j++) {
        const intersection = clipPolygon(polys[i].pts, polys[j].pts);
        const ovArea = polyArea(intersection);
        if (ovArea > 0.5) {
          // > 0.5% lot-local² = significatif
          const ratioI = polys[i].area > 0 ? (ovArea / polys[i].area) * 100 : 0;
          const ratioJ = polys[j].area > 0 ? (ovArea / polys[j].area) * 100 : 0;
          console.log(
            `  ${polys[i].name} ⨯ ${polys[j].name} : overlap ${ovArea.toFixed(1)}u² (${ratioI.toFixed(0)}% ${polys[i].name} | ${ratioJ.toFixed(0)}% ${polys[j].name})`,
          );
          totalOverlap += ovArea;
          overlapCount++;
        }
      }
    }
    console.log(`  → ${overlapCount} paires chevauchent, total overlap ${totalOverlap.toFixed(1)}u²`);
  }
  await pool.end();
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
