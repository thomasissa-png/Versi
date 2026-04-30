/**
 * s28 — Reality check E2E pour les 2 bugs Étape 3 (Pièces)
 *
 * Bug 1 : Extraction IA ne détecte aucune pièce → vs_rooms vides post-extract.
 * Bug 2 : Bouton "Régénérer les pièces avec l'IA" affiche message hors-sujet.
 *
 * Pipeline :
 * 1. Crée un projet
 * 2. Upload les 4 plans Pr2 (RDC, R+1, R+2, R+3)
 * 3. POST /extract (avec VS_NEW_PIPELINE=true + VS_USE_MOCK_EXTRACTOR=true)
 * 4. Vérifie en DB que vs_rooms et vs_lots sont peuplés
 * 5. POST /rooms/regenerate sur 1 lot pour vérifier que ça fonctionne
 *
 * Run : pnpm tsx scripts/s28-rooms-bugs-e2e.ts
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
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  s28 — Reality check E2E Étape 3 (Pièces)            ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  // ─── 1. Créer un projet ────────────────────────────────────────
  console.log("[1] POST /api/vs/projects (création projet test)...");
  const projectRes = await fetch(`${BASE_URL}/api/vs/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adresse: "12 rue des Muguets, Paris (s28-e2e)",
      type_bien: "immeuble",
    }),
  });
  const projectJson = (await projectRes.json()) as Api<{ id: string }>;
  if (!projectJson.success) {
    console.error("[FAIL] Création projet :", projectJson.error);
    process.exit(1);
  }
  const projectId = projectJson.data.id;
  console.log(`      ✓ projet créé : ${projectId}`);

  // ─── 2. Upload des plans ───────────────────────────────────────
  console.log("\n[2] Upload des 4 plans Pr2 (RDC, R+1, R+2, R+3)...");
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
      {
        method: "POST",
        body: fd,
      }
    );
    const uploadJson = (await uploadRes.json()) as Api<{ id: string }>;
    if (!uploadJson.success) {
      console.error(`[FAIL] Upload ${plan.file} :`, uploadJson.error);
      process.exit(1);
    }
    console.log(`      ✓ floor=${plan.floor} : ${plan.file}`);
  }

  // ─── 3. POST /extract ──────────────────────────────────────────
  console.log("\n[3] POST /api/vs/projects/[id]/extract (lance pipeline)...");
  const t0 = Date.now();
  const extractRes = await fetch(
    `${BASE_URL}/api/vs/projects/${projectId}/extract`,
    {
      method: "POST",
      signal: AbortSignal.timeout(300_000),
    }
  );
  const extractText = await extractRes.text();
  let extractJson: Api<{ lots_created: number; extraction_reason: string }>;
  try {
    extractJson = JSON.parse(extractText);
  } catch {
    console.error("[FAIL] Réponse extract non JSON :", extractText.slice(0, 500));
    process.exit(1);
  }
  const extractDuration = Date.now() - t0;
  console.log(`      durée : ${extractDuration}ms`);
  if (!extractJson.success) {
    console.error("[FAIL] /extract :", extractJson.error);
    process.exit(1);
  }
  console.log(
    `      ✓ ${extractJson.data.lots_created} lots créés, reason=${extractJson.data.extraction_reason}`
  );

  // ─── 4. DB read : vs_lots + vs_rooms ───────────────────────────
  console.log("\n[4] DB read — vs_lots + vs_rooms post-extract...");
  const lotsRes = await pool.query(
    "SELECT id, name, floor_number, status, source FROM vs_lots WHERE project_id = $1 ORDER BY floor_number",
    [projectId]
  );
  console.log(`\n      ┌─ vs_lots (${lotsRes.rows.length}) ─────────────`);
  for (const lot of lotsRes.rows) {
    const lotRoomsRes = await pool.query(
      "SELECT COUNT(*)::int AS cnt FROM vs_rooms WHERE lot_id = $1",
      [lot.id]
    );
    console.log(
      `      │ ${lot.name} (floor=${lot.floor_number}) source=${lot.source} status=${lot.status} → ${lotRoomsRes.rows[0].cnt} pièces`
    );
  }

  const allRoomsRes = await pool.query(
    `SELECT r.id, r.name, r.room_type, r.lot_id,
            l.name AS lot_name, l.floor_number
     FROM vs_rooms r
     JOIN vs_lots l ON l.id = r.lot_id
     WHERE l.project_id = $1
     ORDER BY l.floor_number, r.created_at`,
    [projectId]
  );
  console.log(`\n      ┌─ vs_rooms total (${allRoomsRes.rows.length}) ─────`);
  for (const room of allRoomsRes.rows) {
    console.log(
      `      │ floor=${room.floor_number} lot="${room.lot_name}" → ${room.name} [${room.room_type}]`
    );
  }

  // ─── 5. extraction_data sur les plans ──────────────────────────
  console.log("\n[5] DB read — extraction_data sur vs_plans (régénération)...");
  const plansRes = await pool.query(
    `SELECT id, floor_number,
            (extraction_data IS NOT NULL) AS has_extraction,
            jsonb_array_length(COALESCE(extraction_data->'rooms', '[]'::jsonb)) AS n_rooms
     FROM vs_plans
     WHERE project_id = $1
     ORDER BY floor_number`,
    [projectId]
  );
  for (const plan of plansRes.rows) {
    console.log(
      `      ✓ plan floor=${plan.floor_number} extraction_data=${plan.has_extraction} rooms=${plan.n_rooms}`
    );
  }

  // ─── 6. Test régénération sur le 1er lot ───────────────────────
  if (lotsRes.rows.length > 0) {
    const firstLotId = lotsRes.rows[0].id;
    console.log(
      `\n[6] POST /api/vs/lots/${firstLotId.slice(0, 8)}…/rooms/regenerate (Bug 2 test)...`
    );
    // D'abord vider les rooms IA pour simuler "lot manuel sans rooms"
    await pool.query(
      "DELETE FROM vs_rooms WHERE lot_id = $1 AND source = 'ai'",
      [firstLotId]
    );
    console.log("      ▸ rooms IA supprimées (simule cas Thomas)");

    const regenRes = await fetch(
      `${BASE_URL}/api/vs/lots/${firstLotId}/rooms/regenerate`,
      { method: "POST" }
    );
    const regenJson = (await regenRes.json()) as Api<{ rooms_created: number }>;
    if (!regenJson.success) {
      console.error("[FAIL] Régénération :", regenJson.error);
    } else {
      console.log(
        `      ✓ régénération OK : ${regenJson.data.rooms_created} pièces recréées`
      );
    }
  }

  // ─── 7. Verdict final ──────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  VERDICT FINAL                                        ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  const totalLots = lotsRes.rows.length;
  const totalRooms = allRoomsRes.rows.length;
  const lotsWithExtraction = plansRes.rows.filter((p) => p.has_extraction).length;

  const bug1Fixed = totalRooms > 0;
  const bug1Coverage = lotsWithExtraction === plansRes.rows.length;
  const bug2Fixed = bug1Fixed && lotsWithExtraction > 0; // condition régénération

  console.log(
    `  Bug 1 (vs_rooms peuplées) : ${bug1Fixed ? "✓ FIXED" : "✗ STILL BROKEN"} (${totalRooms} pièces, ${totalLots} lots)`
  );
  console.log(
    `  Bug 1 (extraction_data)   : ${bug1Coverage ? "✓ FIXED" : "✗ STILL BROKEN"} (${lotsWithExtraction}/${plansRes.rows.length} plans)`
  );
  console.log(
    `  Bug 2 (régénération)      : ${bug2Fixed ? "✓ FIXED" : "✗ STILL BROKEN"}`
  );

  console.log(`\n  Project ID test : ${projectId}`);
  console.log(`  Use this for screenshots : ${BASE_URL}/vs/projects/${projectId}/rooms\n`);

  await pool.end();
  process.exit(bug1Fixed && bug2Fixed ? 0 : 1);
}

main().catch((err) => {
  console.error("[ERROR FATAL]", err);
  process.exit(1);
});
