/**
 * s25 Round C — E2E canonicalisation pipeline complet (mock sharp)
 *
 * Teste le pipeline bout en bout avec les 4 plans P00-P03 :
 *   upload → extract (mock) → reformatage → lots → rooms
 *
 * Endpoints réels (audités s25) :
 *   POST /api/vs/projects                     body JSON { adresse, type_bien }
 *   POST /api/vs/projects/[id]/plans          multipart { file, floor_number }
 *   POST /api/vs/projects/[id]/extract        body vide
 *   DB : vs_plans.canonicalized_image_path / canonical_prompt_version (='mock-1.0')
 *
 * Usage :
 *   VS_BASE_URL=http://localhost:3100 \
 *   DATABASE_URL=postgres://versi:versi@127.0.0.1:5432/versi_test \
 *   npx tsx scripts/s25-e2e-canonicalisation-pipeline.ts
 */
import { chromium, type Browser, type Page } from 'playwright';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.VS_BASE_URL ?? 'http://localhost:3100';
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://versi:versi@127.0.0.1:5432/versi_test';
const SCREENSHOT_DIR = '/home/user/Versi/docs/screenshots/s25/round-c';
const PLANS_DIR = '/home/user/Versi/versi-studio/reference-existant/plans-test';

type PlanCase = { id: 'P00' | 'P01' | 'P02' | 'P03'; filename: string; floor: number };
type CriterionScore = { c1: boolean; c2: boolean; c3: boolean; c4: boolean };
type PlanResult = {
  id: string;
  projectId?: string;
  planDbId?: string;
  scores: CriterionScore;
  notes: string[];
  bugs: string[];
};

const PLANS: PlanCase[] = [
  { id: 'P00', filename: 'P 00 - Pr2_plan RDC_ projet2.pdf', floor: 0 },
  { id: 'P01', filename: 'P 01 - Pr2_plan R+1_ projet2.pdf', floor: 1 },
  { id: 'P02', filename: 'P 02 - Pr2_plan R+2_ projet2.pdf', floor: 2 },
  { id: 'P03', filename: 'P 03 - Pr02_plan R+3_ projet02.pdf', floor: 3 },
];

async function ensureDir(p: string) {
  await fs.promises.mkdir(p, { recursive: true });
}

async function waitForServer(timeoutMs = 30_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/`);
      if (res.status < 500) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function createProject(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/vs/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adresse: `s25-roundC-${Date.now()}`, type_bien: 'immeuble' }),
  });
  if (!res.ok) throw new Error(`create project failed: ${res.status} ${await res.text()}`);
  const j = (await res.json()) as { success: boolean; data: { id: string }; error?: string };
  if (!j.success) throw new Error(`create project: ${j.error}`);
  return j.data.id;
}

async function uploadPlan(projectId: string, planPath: string, floor: number): Promise<string> {
  const form = new FormData();
  const fileBuffer = await fs.promises.readFile(planPath);
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });
  form.set('file', blob, path.basename(planPath));
  form.set('floor_number', String(floor));

  const res = await fetch(`${BASE_URL}/api/vs/projects/${projectId}/plans`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(`upload failed: ${res.status} ${await res.text()}`);
  const j = (await res.json()) as { success: boolean; data: { id: string }; error?: string };
  if (!j.success) throw new Error(`upload: ${j.error}`);
  return j.data.id;
}

async function triggerExtract(projectId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/vs/projects/${projectId}/extract`, {
    method: 'POST',
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`extract failed: ${res.status} ${txt.slice(0, 300)}`);
  }
}

async function waitForCanonical(db: Client, planId: string, timeoutMs = 180_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { rows } = await db.query(
      `SELECT canonicalized_image_path, canonical_prompt_version, extraction_status
         FROM vs_plans WHERE id = $1`,
      [planId],
    );
    const row = rows[0];
    if (row?.canonicalized_image_path || row?.canonical_prompt_version === 'mock-1.0') return true;
    if (row?.extraction_status === 'failed') return false;
    await new Promise((r) => setTimeout(r, 2500));
  }
  return false;
}

async function checkTiling(db: Client, projectId: string): Promise<{
  lots: number;
  rooms: number;
  avgRoomsPerLot: number;
}> {
  const lots = await db.query(
    `SELECT COUNT(*)::int AS n FROM vs_lots WHERE project_id = $1`,
    [projectId],
  );
  const rooms = await db.query(
    `SELECT COUNT(*)::int AS n FROM vs_rooms
       WHERE lot_id IN (SELECT id FROM vs_lots WHERE project_id = $1)`,
    [projectId],
  );
  const L = lots.rows[0]?.n ?? 0;
  const R = rooms.rows[0]?.n ?? 0;
  return { lots: L, rooms: R, avgRoomsPerLot: L > 0 ? R / L : 0 };
}

async function runPlan(browser: Browser, db: Client, plan: PlanCase): Promise<PlanResult> {
  const result: PlanResult = {
    id: plan.id,
    scores: { c1: false, c2: false, c3: false, c4: false },
    notes: [],
    bugs: [],
  };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') result.notes.push(`console.error: ${msg.text().slice(0, 180)}`);
  });

  try {
    const planPath = path.join(PLANS_DIR, plan.filename);
    const projectId = await createProject();
    result.projectId = projectId;
    const planId = await uploadPlan(projectId, planPath, plan.floor);
    result.planDbId = planId;
    result.notes.push(`project=${projectId.slice(0, 8)} plan=${planId.slice(0, 8)}`);

    await triggerExtract(projectId).catch((e) => {
      result.bugs.push(`P0: extract HTTP error — ${(e as Error).message.slice(0, 200)}`);
    });

    const canonical = await waitForCanonical(db, planId);
    if (!canonical) {
      result.bugs.push('P0: canonicalized_image_path NULL + canonical_prompt_version !=mock-1.0 après 180s');
    } else {
      const { rows: verRows } = await db.query(
        `SELECT canonical_prompt_version, canonical_fallback_reason, canonicalized_image_path
           FROM vs_plans WHERE id = $1`,
        [planId],
      );
      const v = verRows[0];
      result.notes.push(
        `canonical_prompt_version=${v?.canonical_prompt_version} fb=${v?.canonical_fallback_reason ?? '-'} path=${v?.canonicalized_image_path ? 'OK' : 'NULL'}`,
      );
      if (v?.canonical_prompt_version !== 'mock-1.0') {
        result.bugs.push(`P1: canonical_prompt_version=${v?.canonical_prompt_version} (attendu mock-1.0)`);
      }
    }

    // Étape Reformatage
    await page.goto(`${BASE_URL}/vs/projects/${projectId}/reformatage`, {
      waitUntil: 'networkidle',
      timeout: 30_000,
    }).catch(() => {});
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${plan.id}-1-reformatage.png`, fullPage: true });
    const imgs = await page.locator('img, canvas').count();
    if (imgs < 2) {
      result.bugs.push(`P1: reformatage page n'affiche que ${imgs} image(s)/canvas (attendu >=2)`);
    }

    // CTA
    const cta = page.getByRole('button', { name: /utiliser ce plan|continuer avec/i });
    const ctaVisible = await cta.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (ctaVisible) {
      await cta.first().click().catch(() => {});
      await page.waitForURL(/\/lots/, { timeout: 10_000 }).catch(() => {
        result.bugs.push('P1: CTA ne redirige pas vers /lots');
      });
    } else {
      result.bugs.push('P1: CTA "Utiliser ce plan" introuvable');
      await page.goto(`${BASE_URL}/vs/projects/${projectId}/lots`, { waitUntil: 'networkidle' }).catch(() => {});
    }

    // Étape Lots
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${plan.id}-2-lots.png`, fullPage: true });
    const lotsCanvas = page.locator('canvas').first();
    result.scores.c1 = await lotsCanvas.isVisible({ timeout: 3000 }).catch(() => false);
    if (!result.scores.c1) result.bugs.push('P0: canvas lots absent');

    // Étape Rooms
    await page.goto(`${BASE_URL}/vs/projects/${projectId}/rooms`, {
      waitUntil: 'networkidle',
      timeout: 30_000,
    }).catch(() => {});
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${plan.id}-3-rooms.png`, fullPage: true });
    const roomsCanvas = page.locator('canvas').first();
    result.scores.c3 = await roomsCanvas.isVisible({ timeout: 3000 }).catch(() => false);
    if (!result.scores.c3) result.bugs.push('P0: canvas rooms absent');

    // DB tiling
    const t = await checkTiling(db, projectId);
    result.notes.push(`lots=${t.lots} rooms=${t.rooms} avg=${t.avgRoomsPerLot.toFixed(1)}`);
    result.scores.c2 = t.rooms >= 1 && t.lots >= 1;
    if (!result.scores.c2) result.bugs.push(`P0: 0 lots/rooms créés (lots=${t.lots} rooms=${t.rooms})`);

    // C4 heuristique : canvas présent sur les 2 étapes + rooms >=lots
    result.scores.c4 = result.scores.c1 && result.scores.c3 && t.rooms >= t.lots;
    if (!result.scores.c4) result.bugs.push('P1: cohérence visuelle lots/rooms échouée');
  } catch (err) {
    result.bugs.push(`EXCEPTION: ${(err as Error).message.slice(0, 300)}`);
  } finally {
    await ctx.close();
  }
  return result;
}

async function main() {
  await ensureDir(SCREENSHOT_DIR);

  const up = await waitForServer();
  if (!up) throw new Error(`Server ${BASE_URL} injoignable`);

  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();

  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const results: PlanResult[] = [];
  for (const plan of PLANS) {
    console.log(`\n=== Plan ${plan.id} ===`);
    const r = await runPlan(browser, db, plan);
    results.push(r);
    console.log(JSON.stringify(r, null, 2));
  }
  await browser.close();
  await db.end();

  const total = results.reduce(
    (acc, r) => acc + Number(r.scores.c1) + Number(r.scores.c2) + Number(r.scores.c3) + Number(r.scores.c4),
    0,
  );
  console.log(`\nVerdict global : ${total}/16 critères PASS`);
  await fs.promises.writeFile(
    `${SCREENSHOT_DIR}/results.json`,
    JSON.stringify({ results, total, at: new Date().toISOString() }, null, 2),
  );
  process.exit(total >= 14 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
