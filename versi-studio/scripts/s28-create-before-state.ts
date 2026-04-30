/**
 * s28 — Crée un projet "BEFORE" avec rooms vides (simule l'état pré-fix)
 * pour capturer les screenshots before/after.
 *
 * Stratégie : injecte VS_DISABLE_ROOM_EXTRACTION=true via header HTTP custom,
 * en bypass: supprime directement les rooms après extraction normale.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";

const BASE_URL = "http://127.0.0.1:5000";
const DB_URL =
  process.env.DATABASE_URL ||
  "postgres://versi:versi@127.0.0.1:5432/versi_studio";

const PLANS_DIR =
  "/home/user/Versi/versi-studio/reference-existant/plans-test";
const PLANS = [
  { file: "P 00 - Pr2_plan RDC_ projet2.pdf", floor: 0 },
  { file: "P 01 - Pr2_plan R+1_ projet2.pdf", floor: 1 },
  { file: "P 02 - Pr2_plan R+2_ projet2.pdf", floor: 2 },
  { file: "P 03 - Pr02_plan R+3_ projet02.pdf", floor: 3 },
];

interface ApiOk<T> { success: true; data: T; }
interface ApiKo { success: false; error: string; }
type Api<T> = ApiOk<T> | ApiKo;

async function main() {
  const pool = new Pool({ connectionString: DB_URL });

  // Création projet
  const pres = await fetch(`${BASE_URL}/api/vs/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adresse: "12 rue des Muguets (BEFORE-fix s28)",
      type_bien: "immeuble",
    }),
  });
  const pjson = (await pres.json()) as Api<{ id: string }>;
  if (!pjson.success) throw new Error(pjson.error);
  const projectId = pjson.data.id;

  // Upload plans
  for (const plan of PLANS) {
    const fd = new FormData();
    fd.append(
      "file",
      new Blob([readFileSync(join(PLANS_DIR, plan.file))], {
        type: "application/pdf",
      }),
      plan.file
    );
    fd.append("floor_number", String(plan.floor));
    const ures = await fetch(
      `${BASE_URL}/api/vs/projects/${projectId}/plans`,
      { method: "POST", body: fd }
    );
    const ujson = (await ures.json()) as Api<unknown>;
    if (!ujson.success) throw new Error(ujson.error);
  }

  // Lancer l'extraction (qui crée lots + rooms)
  await fetch(`${BASE_URL}/api/vs/projects/${projectId}/extract`, {
    method: "POST",
    signal: AbortSignal.timeout(300_000),
  });

  // SIMULATION ÉTAT PRÉ-FIX : supprimer les rooms ET vider extraction_data
  await pool.query(
    `DELETE FROM vs_rooms WHERE lot_id IN (SELECT id FROM vs_lots WHERE project_id = $1)`,
    [projectId]
  );
  await pool.query(
    `UPDATE vs_plans SET extraction_data = NULL WHERE project_id = $1`,
    [projectId]
  );

  console.log(projectId);
  await pool.end();
}

main().catch((err) => {
  console.error("[ERROR]", err);
  process.exit(1);
});
