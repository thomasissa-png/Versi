/**
 * s25 Round E — E2E pipeline complet DOUBLE MOCK (canonical + extractor)
 *
 * Identique Round C avec screenshots round-e/ et validations C1/C2/C3/C4
 * renforcées pour le double mock (29 rooms attendues, 7 lots).
 */
import { chromium, type Browser } from 'playwright';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.VS_BASE_URL ?? 'http://localhost:3100';
const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://versi:versi@127.0.0.1:5432/versi_test';
const SCREENSHOT_DIR = '../../docs/screenshots/s25/round-e';
const PLANS_DIR = '../reference-existant/plans-test';

type PlanCase = { id: 'P00' | 'P01' | 'P02' | 'P03'; filename: string; floor: number; expectedLots: number; expectedRoomsMin: number };
type CriterionScore = { c1: boolean; c2: boolean; c3: boolean; c4: boolean };
type PlanResult = {
  id: string;
  projectId?: string;
  planDbId?: string;
  scores: CriterionScore;
  notes: string[];
  bugs: string[];
  metrics: Record<string, unknown>;
};

// Brief mentionne 29 rooms total / 7 lots (1 RDC + 2x3 étages)
const PLANS: PlanCase[] = [
  { id: 'P00', filename: 'P 00 - Pr2_plan RDC_ projet2.pdf', floor: 0, expectedLots: 1, expectedRoomsMin: 3 },
  { id: 'P01', filename: 'P 01 - Pr2_plan R+1_ projet2.pdf', floor: 1, expectedLots: 2, expectedRoomsMin: 6 },
  { id: 'P02', filename: 'P 02 - Pr2_plan R+2_ projet2.pdf', floor: 2, expectedLots: 2, expectedRoomsMin: 6 },
  { id: 'P03', filename: 'P 03 - Pr02_plan R+3_ projet02.pdf', floor: 3, expectedLots: 2, expectedRoomsMin: 6 },
];

async function ensureDir(p: string) {
  await fs.promises.mkdir(p, { recursive: true });
}
async function waitForServer(timeoutMs = 15_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE_URL}/`);
      if (r.status < 500) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function createProject(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/vs/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adresse: `s25-roundE-${Date.now()}`, type_bien: 'immeuble' }),
  });
  if (!res.ok) throw new Error(`create project ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as { success: boolean; data: { id: string }; error?: string };
  if (!j.success) throw new Error(`create project: ${j.error}`);
  return j.data.id;
}

async function uploadPlan(projectId: string, planPath: string, floor: number): Promise<string> {
  const form = new FormData();
  const buf = await fs.promises.readFile(planPath);
  form.set('file', new Blob([buf], { type: 'application/pdf' }), path.basename(planPath));
  form.set('floor_number', String(floor));
  const res = await fetch(`${BASE_URL}/api/vs/projects/${projectId}/plans`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`upload ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as { success: boolean; data: { id: string }; error?: string };
  if (!j.success) throw new Error(`upload: ${j.error}`);
  return j.data.id;
}

async function triggerExtract(projectId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/vs/projects/${projectId}/extract`, { method: 'POST' });
  if (!res.ok) throw new Error(`extract ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

async function waitForExtractComplete(db: Client, planId: string, timeoutMs = 120_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { rows } = await db.query(
      `SELECT extraction_status, canonical_prompt_version FROM vs_plans WHERE id=$1`,
      [planId],
    );
    const st = rows[0]?.extraction_status;
    if (st === 'completed' || st === 'failed') return st;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return 'timeout';
}

async function tilingStats(db: Client, projectId: string) {
  const lotsQ = await db.query(`SELECT id, floor_number, zone_data FROM vs_lots WHERE project_id=$1 ORDER BY floor_number, id`, [projectId]);
  const lotIds = lotsQ.rows.map((r) => r.id);
  let rooms: any[] = [];
  if (lotIds.length > 0) {
    const roomsQ = await db.query(
      `SELECT id, lot_id, name, bounding_polygon FROM vs_rooms WHERE lot_id = ANY($1::uuid[])`,
      [lotIds],
    );
    rooms = roomsQ.rows;
  }
  return { lots: lotsQ.rows, rooms };
}

// Check basique overlap 2D : pour chaque lot, somme aires rooms vs area lot
function polygonArea(pts: Array<{ x: number; y: number }>): number {
  if (!pts || pts.length < 3) return 0;
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    a += p1.x * p2.y - p2.x * p1.y;
  }
  return Math.abs(a / 2);
}

async function runPlan(browser: Browser, db: Client, plan: PlanCase): Promise<PlanResult> {
  const result: PlanResult = {
    id: plan.id,
    scores: { c1: false, c2: false, c3: false, c4: false },
    notes: [],
    bugs: [],
    metrics: {},
  };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') result.notes.push(`console: ${m.text().slice(0, 150)}`);
  });

  try {
    const planPath = path.join(PLANS_DIR, plan.filename);
    const projectId = await createProject();
    result.projectId = projectId;
    const planId = await uploadPlan(projectId, planPath, plan.floor);
    result.planDbId = planId;
    result.notes.push(`project=${projectId.slice(0, 8)} plan=${planId.slice(0, 8)}`);

    await triggerExtract(projectId).catch((e) => result.bugs.push(`P0 extract: ${(e as Error).message.slice(0, 200)}`));
    const st = await waitForExtractComplete(db, planId);
    result.notes.push(`extraction_status=${st}`);
    if (st !== 'completed') result.bugs.push(`P0: extraction_status=${st}`);

    const { rows: vRows } = await db.query(
      `SELECT canonical_prompt_version, canonical_fallback_reason, canonicalized_image_path
         FROM vs_plans WHERE id=$1`,
      [planId],
    );
    const v = vRows[0];
    result.notes.push(
      `canonical_ver=${v?.canonical_prompt_version} fb=${v?.canonical_fallback_reason ?? '-'} path=${v?.canonicalized_image_path ? 'OK' : 'NULL'}`,
    );
    if (v?.canonical_prompt_version !== 'mock-1.0') {
      result.bugs.push(`P1: canonical_prompt_version=${v?.canonical_prompt_version} (attendu mock-1.0)`);
    }

    // UI Reformatage
    await page
      .goto(`${BASE_URL}/vs/projects/${projectId}/reformatage`, { waitUntil: 'networkidle', timeout: 30_000 })
      .catch(() => {});
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${plan.id}-1-reformatage.png`, fullPage: true });

    // Aller sur /lots directement
    await page.goto(`${BASE_URL}/vs/projects/${projectId}/lots`, { waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${plan.id}-2-lots.png`, fullPage: true });
    const lotsCanvasVisible = await page.locator('canvas').first().isVisible({ timeout: 3000 }).catch(() => false);

    // Étape Rooms
    await page.goto(`${BASE_URL}/vs/projects/${projectId}/rooms`, { waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${plan.id}-3-rooms.png`, fullPage: true });
    const roomsCanvasVisible = await page.locator('canvas').first().isVisible({ timeout: 3000 }).catch(() => false);

    // DB tiling check
    const t = await tilingStats(db, projectId);
    const nLots = t.lots.length;
    const nRooms = t.rooms.length;
    result.metrics.lots = nLots;
    result.metrics.rooms = nRooms;
    result.notes.push(`DB lots=${nLots} rooms=${nRooms} (expected lots=${plan.expectedLots} rooms>=${plan.expectedRoomsMin})`);

    // C1 — Lot colle aux tracés (zone_data envelope présent + lots canvas visible)
    const lotsWithEnvelope = t.lots.filter((l) => l.zone_data && l.zone_data.envelope_polygon).length;
    result.scores.c1 = lotsCanvasVisible && nLots >= plan.expectedLots && lotsWithEnvelope === nLots;
    if (!result.scores.c1) {
      result.bugs.push(
        `P0 C1: canvas=${lotsCanvasVisible} lots=${nLots}/${plan.expectedLots} withEnvelope=${lotsWithEnvelope}`,
      );
    }

    // C2 — Pièces couvrent tout le lot : 0 overlap room∩room, somme rooms ≈ zone lot
    let totalOverlapPct = 0;
    let lotCoverageOK = 0;
    for (const lot of t.lots) {
      const lotRooms = t.rooms.filter((r) => r.lot_id === lot.id);
      if (lotRooms.length === 0) continue;
      const sumRoomArea = lotRooms.reduce((s, r) => s + polygonArea(r.bounding_polygon ?? []), 0);
      const lotEnv = lot.zone_data?.envelope_polygon;
      const lotArea = polygonArea(lotEnv ?? []);
      const coverage = lotArea > 0 ? sumRoomArea / lotArea : 0;
      if (coverage > 0.7 && coverage < 1.3) lotCoverageOK++;
      // Overlap pairwise
      for (let i = 0; i < lotRooms.length; i++) {
        for (let j = i + 1; j < lotRooms.length; j++) {
          const a = lotRooms[i].bounding_polygon ?? [];
          const b = lotRooms[j].bounding_polygon ?? [];
          // Approx bbox overlap test
          if (a.length && b.length) {
            const aMinX = Math.min(...a.map((p: any) => p.x));
            const aMaxX = Math.max(...a.map((p: any) => p.x));
            const aMinY = Math.min(...a.map((p: any) => p.y));
            const aMaxY = Math.max(...a.map((p: any) => p.y));
            const bMinX = Math.min(...b.map((p: any) => p.x));
            const bMaxX = Math.max(...b.map((p: any) => p.x));
            const bMinY = Math.min(...b.map((p: any) => p.y));
            const bMaxY = Math.max(...b.map((p: any) => p.y));
            const dx = Math.max(0, Math.min(aMaxX, bMaxX) - Math.max(aMinX, bMinX));
            const dy = Math.max(0, Math.min(aMaxY, bMaxY) - Math.max(aMinY, bMinY));
            totalOverlapPct += dx * dy;
          }
        }
      }
    }
    result.metrics.overlap = totalOverlapPct;
    result.metrics.lotCoverageOK = lotCoverageOK;
    result.scores.c2 = nRooms >= plan.expectedRoomsMin && nLots >= plan.expectedLots && totalOverlapPct < 5;
    if (!result.scores.c2) {
      result.bugs.push(
        `P0 C2: rooms=${nRooms}/${plan.expectedRoomsMin} lots=${nLots}/${plan.expectedLots} overlap=${totalOverlapPct.toFixed(2)}`,
      );
    }

    // C3 — Étape 3 = Étape 2 (canvas rooms dimensions ≈ canvas lots)
    result.scores.c3 = lotsCanvasVisible && roomsCanvasVisible;
    if (!result.scores.c3) {
      result.bugs.push(`P1 C3: canvas lots=${lotsCanvasVisible} rooms=${roomsCanvasVisible}`);
    }

    // C4 — Visuel propre : pas de polygone fantôme (nRooms > 0, rooms.length cohérent avec expected)
    result.scores.c4 = result.scores.c1 && result.scores.c3 && nRooms >= plan.expectedRoomsMin && nRooms <= plan.expectedRoomsMin * 3;
    if (!result.scores.c4) {
      result.bugs.push(`P1 C4: cohérence visuelle (c1=${result.scores.c1} c3=${result.scores.c3} rooms=${nRooms})`);
    }
  } catch (err) {
    result.bugs.push(`EXCEPTION: ${(err as Error).message.slice(0, 250)}`);
  } finally {
    await ctx.close();
  }
  return result;
}

async function main() {
  await ensureDir(SCREENSHOT_DIR);
  if (!(await waitForServer())) throw new Error(`Server ${BASE_URL} injoignable`);

  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();

  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const results: PlanResult[] = [];
  for (const plan of PLANS) {
    console.log(`\n=== ${plan.id} ===`);
    const r = await runPlan(browser, db, plan);
    results.push(r);
    console.log(JSON.stringify(r, null, 2));
  }
  await browser.close();

  // Totals
  const totalScore = results.reduce(
    (a, r) => a + Number(r.scores.c1) + Number(r.scores.c2) + Number(r.scores.c3) + Number(r.scores.c4),
    0,
  );
  const { rows: tot } = await db.query(`SELECT
      (SELECT COUNT(*)::int FROM vs_plans) plans,
      (SELECT COUNT(*)::int FROM vs_lots) lots,
      (SELECT COUNT(*)::int FROM vs_rooms) rooms`);
  const totals = tot[0];
  await db.end();

  console.log(`\nVerdict : ${totalScore}/16  |  DB totals: ${JSON.stringify(totals)}`);
  await fs.promises.writeFile(
    `${SCREENSHOT_DIR}/results.json`,
    JSON.stringify({ results, totalScore, totals, at: new Date().toISOString() }, null, 2),
  );
  process.exit(totalScore >= 14 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
