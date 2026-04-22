/**
 * s25 Round E — validation DB post-run
 * Lit les projets Round E déjà créés (4 projects, 4 plans, 7 lots, 29 rooms)
 * et recalcule les scores C1/C2/C3/C4 avec le bon nom de colonne `polygon`.
 */
import { Client } from 'pg';
import * as fs from 'fs';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://versi:versi@127.0.0.1:5432/versi_test';
const SCREENSHOT_DIR = '/home/user/Versi/docs/screenshots/s25/round-e';

type PlanCase = { id: string; floor: number; expectedLots: number; expectedRoomsMin: number };
const EXPECTED: Record<number, PlanCase> = {
  0: { id: 'P00', floor: 0, expectedLots: 1, expectedRoomsMin: 3 },
  1: { id: 'P01', floor: 1, expectedLots: 2, expectedRoomsMin: 6 },
  2: { id: 'P02', floor: 2, expectedLots: 2, expectedRoomsMin: 6 },
  3: { id: 'P03', floor: 3, expectedLots: 2, expectedRoomsMin: 6 },
};

type Pt = { x_percent: number; y_percent: number };

function polygonArea(pts: Pt[]): number {
  if (!pts || pts.length < 3) return 0;
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    a += p1.x_percent * p2.y_percent - p2.x_percent * p1.y_percent;
  }
  return Math.abs(a / 2);
}

function bboxOverlap(a: Pt[], b: Pt[]): number {
  if (!a?.length || !b?.length) return 0;
  const aMinX = Math.min(...a.map((p) => p.x_percent));
  const aMaxX = Math.max(...a.map((p) => p.x_percent));
  const aMinY = Math.min(...a.map((p) => p.y_percent));
  const aMaxY = Math.max(...a.map((p) => p.y_percent));
  const bMinX = Math.min(...b.map((p) => p.x_percent));
  const bMaxX = Math.max(...b.map((p) => p.x_percent));
  const bMinY = Math.min(...b.map((p) => p.y_percent));
  const bMaxY = Math.max(...b.map((p) => p.y_percent));
  const dx = Math.max(0, Math.min(aMaxX, bMaxX) - Math.max(aMinX, bMinX));
  const dy = Math.max(0, Math.min(aMaxY, bMaxY) - Math.max(aMinY, bMinY));
  return dx * dy;
}

// Test overlap polygonal approximatif via sampling : compte points de A à l'intérieur de B
function pointInPoly(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x_percent, yi = poly[i].y_percent;
    const xj = poly[j].x_percent, yj = poly[j].y_percent;
    const intersect =
      yi > p.y_percent !== yj > p.y_percent &&
      p.x_percent < ((xj - xi) * (p.y_percent - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function polygonOverlapSampled(a: Pt[], b: Pt[], samples = 40): number {
  // Grille sur bbox union, compte points DANS A et DANS B
  if (!a?.length || !b?.length) return 0;
  const all = [...a, ...b];
  const minX = Math.min(...all.map((p) => p.x_percent));
  const maxX = Math.max(...all.map((p) => p.x_percent));
  const minY = Math.min(...all.map((p) => p.y_percent));
  const maxY = Math.max(...all.map((p) => p.y_percent));
  const w = maxX - minX;
  const h = maxY - minY;
  if (w <= 0 || h <= 0) return 0;
  let hits = 0;
  for (let i = 0; i < samples; i++) {
    for (let j = 0; j < samples; j++) {
      const p: Pt = {
        x_percent: minX + ((i + 0.5) / samples) * w,
        y_percent: minY + ((j + 0.5) / samples) * h,
      };
      if (pointInPoly(p, a) && pointInPoly(p, b)) hits++;
    }
  }
  return (hits / (samples * samples)) * (w * h);
}

function rectToPolygon(zd: any): Pt[] {
  if (!zd || zd.type !== 'rect') return [];
  const x = zd.x_percent ?? 0;
  const y = zd.y_percent ?? 0;
  const w = zd.width_percent ?? 0;
  const h = zd.height_percent ?? 0;
  return [
    { x_percent: x, y_percent: y },
    { x_percent: x + w, y_percent: y },
    { x_percent: x + w, y_percent: y + h },
    { x_percent: x, y_percent: y + h },
  ];
}

async function main() {
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();

  // Find the 4 Round E projects (by adresse prefix)
  const projects = await db.query(
    `SELECT id, adresse, created_at FROM vs_projects WHERE adresse LIKE 's25-roundE-%' ORDER BY created_at DESC LIMIT 4`,
  );

  const results: any[] = [];
  let totalScore = 0;

  for (const proj of projects.rows) {
    const plans = await db.query(
      `SELECT id, floor_number, canonical_prompt_version, canonical_fallback_reason,
              canonicalized_image_path, extraction_status
         FROM vs_plans WHERE project_id=$1`,
      [proj.id],
    );
    if (plans.rows.length === 0) continue;
    const plan = plans.rows[0];
    const exp = EXPECTED[plan.floor_number] ?? EXPECTED[0];

    const lotsRes = await db.query(
      `SELECT id, name, floor_number, surface_m2, zone_data, status
         FROM vs_lots WHERE project_id=$1 ORDER BY floor_number, name`,
      [proj.id],
    );
    const lots = lotsRes.rows;
    const lotIds = lots.map((l) => l.id);

    let rooms: any[] = [];
    if (lotIds.length > 0) {
      const roomsRes = await db.query(
        `SELECT id, lot_id, name, room_type, surface_m2, polygon, position
           FROM vs_rooms WHERE lot_id = ANY($1::uuid[])`,
        [lotIds],
      );
      rooms = roomsRes.rows;
    }

    // C1 — zone_data envelope présent sur chaque lot (rect OU polygon)
    const withEnvelope = lots.filter((l) => {
      if (!l.zone_data) return false;
      if (l.zone_data.type === 'rect' && l.zone_data.width_percent > 0) return true;
      if (l.zone_data.envelope_polygon?.length >= 3) return true;
      if (l.zone_data.polygon?.length >= 3) return true;
      return false;
    }).length;
    const canonicalOK = plan.canonical_prompt_version === 'mock-1.0';
    const extractionOK = plan.extraction_status === 'done' || plan.extraction_status === 'completed';
    const c1 =
      canonicalOK &&
      extractionOK &&
      lots.length >= exp.expectedLots &&
      withEnvelope === lots.length;

    // C2 — somme rooms ≈ lot area, 0 overlap
    let totalOverlap = 0;
    let coverageOK = 0;
    const coverages: number[] = [];
    for (const lot of lots) {
      const lotRooms = rooms.filter((r) => r.lot_id === lot.id);
      if (lotRooms.length === 0) continue;
      const sumRoomArea = lotRooms.reduce((s, r) => s + polygonArea(r.polygon ?? []), 0);
      let lotEnv: Pt[] = [];
      if (lot.zone_data?.type === 'rect') {
        lotEnv = rectToPolygon(lot.zone_data);
      } else if (lot.zone_data?.envelope_polygon) {
        lotEnv = lot.zone_data.envelope_polygon;
      } else if (lot.zone_data?.polygon) {
        lotEnv = lot.zone_data.polygon;
      }
      const lotArea = polygonArea(lotEnv);
      // Les rooms sont en % du LOT (coordonnées locales 0..100),
      // donc on compare % couverture locale = sum rooms / 10000
      // Mais si coord globales du plan, on compare à lotArea.
      // Inspection : rooms P00 ont x_percent=0..100 → coord locale lot. lotArea (rect) = 80*70 = 5600.
      // Dans le mock canonical, rooms cover [0..100]x[0..100] du lot lui-même → on teste couverture locale.
      const localCov = sumRoomArea / 10000; // rooms en % du lot
      const globalCov = lotArea > 0 ? sumRoomArea / lotArea : 0;
      // On retient la métrique "rooms couvrent le lot en local" (0.7-1.1)
      coverages.push(localCov);
      if (localCov > 0.7 && localCov < 1.1) coverageOK++;
      for (let i = 0; i < lotRooms.length; i++) {
        for (let j = i + 1; j < lotRooms.length; j++) {
          totalOverlap += polygonOverlapSampled(lotRooms[i].polygon ?? [], lotRooms[j].polygon ?? []);
        }
      }
    }
    // Overlap polygonal réel (sampling). Seuil 5% de la surface unitaire du lot.
    const c2 =
      rooms.length >= exp.expectedRoomsMin &&
      lots.length >= exp.expectedLots &&
      totalOverlap < 500 && // 500 = 5% de 10000
      coverageOK >= Math.max(1, Math.floor(lots.length * 0.5));

    // C3 — canvas lots + canvas rooms visibles (heuristique : screenshots existent)
    const lotsShot = fs.existsSync(`${SCREENSHOT_DIR}/${exp.id}-2-lots.png`);
    const roomsShot = fs.existsSync(`${SCREENSHOT_DIR}/${exp.id}-3-rooms.png`);
    const c3 = lotsShot && roomsShot;

    // C4 — cohérence visuelle : pas trop de rooms (garde-fou fantôme)
    const c4 =
      c1 &&
      c3 &&
      rooms.length >= exp.expectedRoomsMin &&
      rooms.length <= exp.expectedRoomsMin * 4;

    const scores = { c1, c2, c3, c4 };
    const planScore = Number(c1) + Number(c2) + Number(c3) + Number(c4);
    totalScore += planScore;

    results.push({
      plan: exp.id,
      projectId: proj.id,
      planId: plan.id,
      canonical_prompt_version: plan.canonical_prompt_version,
      extraction_status: plan.extraction_status,
      canonical_path: plan.canonicalized_image_path ? 'OK' : 'NULL',
      lots: lots.length,
      rooms: rooms.length,
      withEnvelope,
      totalOverlap: Number(totalOverlap.toFixed(2)),
      coverageRatios: coverages.map((c) => c.toFixed(2)),
      coverageOK,
      scores,
      planScore,
    });
  }

  // Sort by plan id
  results.sort((a, b) => a.plan.localeCompare(b.plan));

  const { rows: tot } = await db.query(`SELECT
      (SELECT COUNT(*)::int FROM vs_plans) plans,
      (SELECT COUNT(*)::int FROM vs_lots) lots,
      (SELECT COUNT(*)::int FROM vs_rooms) rooms`);
  await db.end();

  console.log('\n=== Round E — scoring final ===');
  console.log(JSON.stringify({ totals: tot[0], totalScore, results }, null, 2));

  await fs.promises.writeFile(
    `${SCREENSHOT_DIR}/results.json`,
    JSON.stringify(
      { totals: tot[0], totalScore, results, at: new Date().toISOString() },
      null,
      2,
    ),
  );
  console.log(`\nVerdict : ${totalScore}/16`);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
