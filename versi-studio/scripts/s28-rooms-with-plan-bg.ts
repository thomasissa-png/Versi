/**
 * s28 — Reality check screenshots Étape 3 AVEC plan PDF visible en background
 *
 * Bug originel screenshots : quadrillage gris au lieu du plan PDF.
 * Cause : pipeline OK (PDF uploadé → /api/vs/files convertit PDF→PNG via
 * pdf-to-img). Mais les tests E2E timeout sur turbopack (compilation lente
 * au premier render).
 *
 * Ce script :
 * 1. Crée un projet test propre
 * 2. Upload les 4 plans Pr2 (RDC, R+1, R+2, R+3)
 * 3. Lance /extract (mock extractor)
 * 4. PRE-WARM la page rooms (cold render turbopack ~5s, ensuite cached)
 * 5. Vérifie que /api/vs/files répond bien sur chaque PDF (PDF→PNG)
 * 6. Output PROJECT_ID pour Playwright
 *
 * Run : pnpm tsx scripts/s28-rooms-with-plan-bg.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";

const BASE_URL = process.env.VS_BASE_URL ?? "http://127.0.0.1:5000";
const DB_URL =
  process.env.DATABASE_URL ||
  "postgres://versi:versi@127.0.0.1:5432/versi_studio";

const PLANS_DIR =
  "../reference-existant/plans-test";
const PLANS = [
  { file: "P 00 - Pr2_plan RDC_ projet2.pdf", floor: 0 },
  { file: "P 01 - Pr2_plan R+1_ projet2.pdf", floor: 1 },
  { file: "P 02 - Pr2_plan R+2_ projet2.pdf", floor: 2 },
  { file: "P 03 - Pr02_plan R+3_ projet02.pdf", floor: 3 },
];

interface ApiOk<T> {
  success: true;
  data: T;
}
interface ApiKo {
  success: false;
  error: string;
}
type Api<T> = ApiOk<T> | ApiKo;

async function main() {
  const pool = new Pool({ connectionString: DB_URL });
  console.log("\n═══ s28 — Reality check Étape 3 (PLAN PDF visible) ═══\n");

  // ─── 1. Créer projet ────────────────────────────────────────────
  console.log("[1] POST /api/vs/projects...");
  const projectRes = await fetch(`${BASE_URL}/api/vs/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adresse: "12 rue des Muguets, Paris (s28-bg-plan)",
      type_bien: "immeuble",
    }),
  });
  const projectJson = (await projectRes.json()) as Api<{ id: string }>;
  if (!projectJson.success) {
    console.error("[FAIL] Création projet :", projectJson.error);
    process.exit(1);
  }
  const projectId = projectJson.data.id;
  console.log(`    ✓ projet : ${projectId}`);

  // ─── 2. Upload 4 plans ──────────────────────────────────────────
  console.log("\n[2] Upload des 4 plans Pr2 (PDF Muguets)...");
  for (const plan of PLANS) {
    const filePath = join(PLANS_DIR, plan.file);
    const fileBuffer = readFileSync(filePath);
    const fd = new FormData();
    fd.append(
      "file",
      new Blob([fileBuffer], { type: "application/pdf" }),
      plan.file
    );
    fd.append("floor_number", String(plan.floor));

    const uploadRes = await fetch(
      `${BASE_URL}/api/vs/projects/${projectId}/plans`,
      { method: "POST", body: fd }
    );
    const uploadJson = (await uploadRes.json()) as Api<{
      id: string;
      file_path: string;
    }>;
    if (!uploadJson.success) {
      console.error(`[FAIL] Upload ${plan.file} :`, uploadJson.error);
      process.exit(1);
    }
    console.log(
      `    ✓ floor=${plan.floor} (${fileBuffer.length} bytes) → ${uploadJson.data.file_path}`
    );
  }

  // ─── 3. Vérifier que /api/vs/files convertit les PDFs ──────────
  console.log("\n[3] Vérif /api/vs/files (PDF→PNG)...");
  const plansRes = await pool.query<{
    id: string;
    floor_number: number;
    file_path: string;
  }>(
    "SELECT id, floor_number, file_path FROM vs_plans WHERE project_id = $1 ORDER BY floor_number",
    [projectId]
  );
  for (const p of plansRes.rows) {
    const url = `${BASE_URL}/api/vs/files?path=${encodeURIComponent(p.file_path)}`;
    const res = await fetch(url);
    const ct = res.headers.get("content-type") ?? "";
    const buf = await res.arrayBuffer();
    if (res.status !== 200 || !ct.startsWith("image/")) {
      console.error(
        `    ✗ floor=${p.floor_number} : status=${res.status} ct=${ct}`
      );
      process.exit(1);
    }
    console.log(
      `    ✓ floor=${p.floor_number} : ${ct} (${buf.byteLength} bytes)`
    );
  }

  // ─── 4. POST /extract ──────────────────────────────────────────
  console.log("\n[4] POST /extract...");
  const t0 = Date.now();
  const extractRes = await fetch(
    `${BASE_URL}/api/vs/projects/${projectId}/extract`,
    { method: "POST", signal: AbortSignal.timeout(300_000) }
  );
  const extractText = await extractRes.text();
  let extractJson: Api<{ lots_created: number }>;
  try {
    extractJson = JSON.parse(extractText);
  } catch {
    console.error("[FAIL] /extract non JSON :", extractText.slice(0, 300));
    process.exit(1);
  }
  console.log(`    durée : ${Date.now() - t0}ms`);
  if (!extractJson.success) {
    console.error("[FAIL] /extract :", extractJson.error);
    process.exit(1);
  }
  console.log(`    ✓ ${extractJson.data.lots_created} lots créés`);

  // ─── 5. Verif rooms en DB ──────────────────────────────────────
  const roomsRes = await pool.query<{ cnt: number }>(
    `SELECT COUNT(*)::int as cnt FROM vs_rooms r
     JOIN vs_lots l ON l.id = r.lot_id WHERE l.project_id = $1`,
    [projectId]
  );
  console.log(`    ✓ ${roomsRes.rows[0].cnt} rooms en DB`);

  // ─── 6. Pre-warm la page rooms (turbopack compilation) ─────────
  console.log("\n[5] Pre-warm /vs/projects/[id]/rooms (turbopack)...");
  const t1 = Date.now();
  const pwRes = await fetch(`${BASE_URL}/vs/projects/${projectId}/rooms`);
  console.log(
    `    ✓ status=${pwRes.status} durée=${Date.now() - t1}ms (warm cache turbopack)`
  );

  console.log(`\n╔══ PROJECT_ID = ${projectId} ══╗`);
  console.log(`Use : VS_E2E_PROJECT_ID=${projectId} pnpm playwright test ...\n`);

  await pool.end();
  // Output sur stdout pour capture par script bash
  console.log(`PROJECT_ID=${projectId}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[ERROR FATAL]", err);
  process.exit(1);
});
