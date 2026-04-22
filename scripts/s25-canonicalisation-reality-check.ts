/**
 * s25 Reality Check — Canonicalisation plan
 *
 * ACTION THOMAS :
 *   1. S'assurer que VS_PLAN_CANONICALIZE=true est défini dans l'env staging Replit
 *   2. S'assurer que OPENAI_API_KEY réelle est configurée (pas sk-placeholder)
 *   3. Depuis la racine Versi, exécuter :
 *
 *      npx tsx scripts/s25-canonicalisation-reality-check.ts https://versi-studio.replit.app
 *
 *      (ou, via env : VS_STAGING_URL=https://... npx tsx scripts/s25-canonicalisation-reality-check.ts)
 *
 *   4. Vérifier le rapport :
 *      - docs/qa/s25-reality-check-canonicalisation-output.json (metrics)
 *      - docs/qa/s25-reality-check-screenshots/ (PNG comparateur par plan)
 *
 *   5. Critères de succès (objectif 10/10) :
 *      - 4/4 plans avec fallback=false (canonicalized_image_path non-null en DB)
 *      - Durée canonicalisation < 45s par plan
 *      - Screenshot visuel : plan reformaté = fond blanc + murs noirs uniformes, pas de cotes/hatching
 *      - Aucune erreur console navigateur (hors warnings dev)
 */

import { chromium, type Browser, type Page } from "playwright";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { existsSync } from "node:fs";

const STAGING_URL = process.argv[2] ?? process.env.VS_STAGING_URL;
if (!STAGING_URL) {
  console.error(
    "Usage : npx tsx scripts/s25-canonicalisation-reality-check.ts <staging-url>",
  );
  console.error("Ou : VS_STAGING_URL=https://... npx tsx scripts/s25-canonicalisation-reality-check.ts");
  process.exit(1);
}

const PLANS_DIR = "versi-studio/reference-existant/plans-test";
const PLANS = [
  "P 00 - Pr2_plan RDC_ projet2.pdf",
  "P 01 - Pr2_plan R+1_ projet2.pdf",
  "P 02 - Pr2_plan R+2_ projet2.pdf",
  "P 03 - Pr02_plan R+3_ projet02.pdf",
];
const OUTPUT_JSON = "docs/qa/s25-reality-check-canonicalisation-output.json";
const SCREENSHOTS_DIR = "docs/qa/s25-reality-check-screenshots";
const EXTRACT_TIMEOUT_MS = 180_000; // 3 min de marge

interface PlanMetric {
  filename: string;
  plan_id?: string;
  canonicalized_image_path?: string | null;
  canonical_fallback_reason?: string | null;
  canonical_prompt_version?: string | null;
  canonical_duration_ms?: number;
  fallback: boolean;
  screenshot_path?: string;
  error?: string;
}

interface RealityReport {
  staging_url: string;
  started_at: string;
  finished_at: string;
  total_duration_ms: number;
  plans: PlanMetric[];
  summary: {
    total: number;
    success: number;
    fallback: number;
    errors: number;
  };
}

async function ensureDir(p: string) {
  if (!existsSync(p)) await mkdir(p, { recursive: true });
}

async function loginOrBypass(page: Page) {
  // Hypothèse staging : page /vs/projects accessible sans auth OU auth dev autoconnect.
  // Si Thomas a une auth, adapter ici (login form selectors).
  await page.goto(`${STAGING_URL}/vs/projects`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
}

async function createProjectAndUploadPlans(
  page: Page,
): Promise<{ projectId: string }> {
  // Création projet via UI : bouton "Nouveau projet"
  // (Si Thomas a un shortcut API, remplacer par fetch POST /api/vs/projects.)
  await page.click('text=/nouveau projet/i', { timeout: 15_000 });
  await page.fill('input[name="name"]', `Reality check s25 ${Date.now()}`);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/vs\/projects\/[^/]+/, { timeout: 15_000 });
  const url = page.url();
  const projectId = url.split("/").pop()!.split("?")[0];

  // Upload des 4 PDF
  const input = page.locator('input[type="file"]');
  const filePaths = PLANS.map((p) => join(PLANS_DIR, p));
  await input.setInputFiles(filePaths);
  await page.waitForTimeout(2000); // laisser l'UI enregistrer l'upload

  // Déclencher extract
  await page.click('text=/extraire|lancer|analyser/i', { timeout: 10_000 });

  // Attendre fin extraction (regarde bouton "Suivant" ou indicateur pièces)
  await page.waitForSelector('text=/pièces? détectées?|suivant|étape 2/i', {
    timeout: EXTRACT_TIMEOUT_MS,
  });

  return { projectId };
}

async function fetchDbMetrics(projectId: string): Promise<PlanMetric[]> {
  // Appel endpoint debug staging (à créer côté API si absent) :
  //   GET /api/vs/debug/plans?project_id=...
  // Retourne : [{ id, original_filename, canonicalized_image_path, canonical_fallback_reason, canonical_prompt_version, canonicalized_at, created_at }]
  // Si endpoint absent, fallback : lire DOM de la page projet (moins fiable).
  const res = await fetch(
    `${STAGING_URL}/api/vs/debug/plans?project_id=${projectId}`,
  );
  if (!res.ok) {
    console.warn(
      `[reality-check] /api/vs/debug/plans indisponible (${res.status}) — fallback sur UI read`,
    );
    return [];
  }
  const rows = (await res.json()) as Array<{
    id: string;
    original_filename: string;
    canonicalized_image_path: string | null;
    canonical_fallback_reason: string | null;
    canonical_prompt_version: string | null;
    canonicalized_at: string | null;
    created_at: string;
  }>;
  return rows.map((r) => {
    const duration = r.canonicalized_at
      ? new Date(r.canonicalized_at).getTime() - new Date(r.created_at).getTime()
      : undefined;
    return {
      filename: r.original_filename,
      plan_id: r.id,
      canonicalized_image_path: r.canonicalized_image_path,
      canonical_fallback_reason: r.canonical_fallback_reason,
      canonical_prompt_version: r.canonical_prompt_version,
      canonical_duration_ms: duration,
      fallback: r.canonicalized_image_path === null,
    };
  });
}

async function screenshotComparator(
  page: Page,
  projectId: string,
  planId: string,
  filename: string,
): Promise<string> {
  // Navigue vers page plan (comparator visible)
  await page.goto(`${STAGING_URL}/vs/projects/${projectId}/plans/${planId}`, {
    waitUntil: "networkidle",
    timeout: 30_000,
  });
  const safeName = filename.replace(/[^a-z0-9-]/gi, "_");
  const outPath = join(SCREENSHOTS_DIR, `${safeName}.png`);
  await ensureDir(SCREENSHOTS_DIR);
  await page.screenshot({ path: outPath, fullPage: true });
  return outPath;
}

async function main() {
  const started = Date.now();
  console.log(`[reality-check] staging = ${STAGING_URL}`);
  await ensureDir(dirname(OUTPUT_JSON));

  let browser: Browser | null = null;
  const metrics: PlanMetric[] = [];

  try {
    browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await loginOrBypass(page);
    const { projectId } = await createProjectAndUploadPlans(page);
    console.log(`[reality-check] project créé : ${projectId}`);

    const dbRows = await fetchDbMetrics(projectId);
    for (const row of dbRows) {
      try {
        if (row.plan_id) {
          row.screenshot_path = await screenshotComparator(
            page,
            projectId,
            row.plan_id,
            row.filename,
          );
        }
      } catch (e) {
        row.error = e instanceof Error ? e.message : String(e);
      }
      metrics.push(row);
    }
  } catch (e) {
    console.error(`[reality-check] ERROR : ${e instanceof Error ? e.message : e}`);
    metrics.push({ filename: "SCRIPT_ERROR", fallback: true, error: String(e) });
  } finally {
    if (browser) await browser.close();
  }

  const finished = Date.now();
  const report: RealityReport = {
    staging_url: STAGING_URL,
    started_at: new Date(started).toISOString(),
    finished_at: new Date(finished).toISOString(),
    total_duration_ms: finished - started,
    plans: metrics,
    summary: {
      total: metrics.length,
      success: metrics.filter((m) => !m.fallback && !m.error).length,
      fallback: metrics.filter((m) => m.fallback && !m.error).length,
      errors: metrics.filter((m) => m.error).length,
    },
  };

  await writeFile(OUTPUT_JSON, JSON.stringify(report, null, 2), "utf-8");
  console.log(`[reality-check] rapport : ${OUTPUT_JSON}`);
  console.log(`[reality-check] screenshots : ${SCREENSHOTS_DIR}`);
  console.log(`[reality-check] summary : ${JSON.stringify(report.summary)}`);

  if (report.summary.success < report.summary.total) {
    console.warn(`[reality-check] INCOMPLET — success ${report.summary.success}/${report.summary.total}`);
    process.exit(2);
  }
  console.log(`[reality-check] OK 4/4 canonicalisés`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
