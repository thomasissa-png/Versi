/**
 * Reality check s24 — Test du fix building_outline sur P02 (R+2).
 *
 * Objectif : vérifier que GPT-4.1 retourne un building_outline SERRÉ sur
 * l'appartement uniquement (exclure escalier/palier commun).
 *
 * Succès si : building_outline.x_percent > 30% (vs 17% avant fix) sur P02.
 *
 * Usage : set -a && source .env.local && set +a && npx tsx scripts/s24-building-outline-test.ts
 */
import fs from "fs/promises";
import path from "path";
import { extractPlanData } from "../src/lib/vs/plan-extractor";

const PLANS_DIR = path.resolve(__dirname, "../reference-existant/plans-test");

const PLANS = [
  { id: "P00", file: "P 00 - Pr2_plan RDC_ projet2.pdf" },
  { id: "P01", file: "P 01 - Pr2_plan R+1_ projet2.pdf" },
  { id: "P02", file: "P 02 - Pr2_plan R+2_ projet2.pdf" },
  { id: "P03", file: "P 03 - Pr02_plan R+3_ projet02.pdf" },
];

async function main() {
  const results: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    verdict: string;
  }> = [];

  for (const plan of PLANS) {
    const pdfPath = path.join(PLANS_DIR, plan.file);
    const pdfBuf = await fs.readFile(pdfPath);
    const base64 = pdfBuf.toString("base64");

    console.log(`\n[${plan.id}] Extracting ${plan.file}...`);
    const started = Date.now();
    try {
      const result = await extractPlanData(base64, "application/pdf", "immeuble");
      const ms = Date.now() - started;
      const b = result.building_outline;
      if (!b) {
        console.log(`  [${plan.id}] NO building_outline returned`);
        results.push({ id: plan.id, x: -1, y: -1, w: -1, h: -1, verdict: "MISSING" });
        continue;
      }
      const x = b.x_percent;
      const y = b.y_percent;
      const w = b.width_percent;
      const h = b.height_percent;
      // Verdict : pour P02 succès si x > 30%, pour les autres on vise aussi "apt-only"
      const isP2 = plan.id === "P02";
      const verdict =
        isP2
          ? x > 30
            ? "GO — escalier exclu"
            : `FAIL — x=${x.toFixed(1)}% (escalier inclus)`
          : x > 20 && w < 70
            ? "OK — serré sur apt"
            : `CHECK — x=${x.toFixed(1)}% w=${w.toFixed(1)}%`;
      console.log(
        `  [${plan.id}] building_outline: x=${x.toFixed(1)}% y=${y.toFixed(1)}% w=${w.toFixed(1)}% h=${h.toFixed(1)}% (${ms}ms) → ${verdict}`
      );
      results.push({ id: plan.id, x, y, w, h, verdict });

      // Debug : lister les rooms unit_id=null (parties communes)
      const common = result.rooms.filter((r) => r.unit_id === null);
      if (common.length > 0) {
        console.log(`  [${plan.id}] parties communes détectées :`);
        for (const r of common) {
          const bb = r.bounding_box;
          if (bb) {
            console.log(
              `    - "${r.name}" bbox=(${bb.x_percent.toFixed(1)}%, ${bb.y_percent.toFixed(1)}%, ${bb.width_percent.toFixed(1)}%, ${bb.height_percent.toFixed(1)}%)`
            );
          } else {
            console.log(`    - "${r.name}" (no bbox)`);
          }
        }
      } else {
        console.log(`  [${plan.id}] AUCUNE partie commune détectée (unit_id=null vide)`);
      }
    } catch (e) {
      console.error(`  [${plan.id}] ERROR:`, (e as Error).message);
      results.push({ id: plan.id, x: -1, y: -1, w: -1, h: -1, verdict: `ERROR: ${(e as Error).message}` });
    }
  }

  console.log("\n=== RÉCAPITULATIF ===");
  for (const r of results) {
    console.log(`${r.id}: x=${r.x.toFixed(1)}% y=${r.y.toFixed(1)}% w=${r.w.toFixed(1)}% h=${r.h.toFixed(1)}% → ${r.verdict}`);
  }

  const outPath = "/tmp/s24-building-outline-test.json";
  await fs.writeFile(outPath, JSON.stringify(results, null, 2));
  console.log(`\nRésultats → ${outPath}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
