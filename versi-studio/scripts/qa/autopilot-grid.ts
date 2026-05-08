/* eslint-disable @typescript-eslint/no-explicit-any */
// FIXME(s34): script de diagnostic session — typages "any" tolérés (PoC/debug, hors build prod).
/**
 * Autopilote vrai — recherche grid params multi-fitness sur les 4 plans Muguets.
 *
 * Métrique composite par plan :
 *   recall    = pixels inside-polygon ∩ habitable-truth / habitable-truth
 *   precision = pixels inside-polygon ∩ habitable-truth / inside-polygon
 *   hatchPen  = 1 - hatch_inside_poly / hatch_total
 *   score     = recall * precision * hatchPen
 *
 * Fitness multi-plan = moyenne géométrique des 4 scores.
 * Itère le grid, garde le best, rend overlay du best.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import {
  extractLotsByColorMask,
  type ColorMaskOptions,
  type Pt,
} from "../../src/lib/vs/color-mask-extractor";

const PLANS = [
  { name: "rdc", file: "P 00 - Pr2_plan RDC_ projet2.pdf" },
  { name: "r1", file: "P 01 - Pr2_plan R+1_ projet2.pdf" },
  { name: "r2", file: "P 02 - Pr2_plan R+2_ projet2.pdf" },
  { name: "r3", file: "P 03 - Pr02_plan R+3_ projet02.pdf" },
];
const OUT = join(process.cwd(), "..", "docs", "qa");

async function rasterize(file: string): Promise<Buffer> {
  const buf = await readFile(
    join(process.cwd(), "reference-existant", "plans-test", file),
  );
  const { pdf } = await import("pdf-to-img");
  const pages = await pdf(buf, { scale: 3 });
  for await (const p of pages) return Buffer.from(p);
  throw new Error("no png");
}

function rasterPolygon(poly: Pt[], W: number, H: number): Uint8Array {
  const m = new Uint8Array(W * H);
  if (poly.length < 3) return m;
  for (let y = 0; y < H; y++) {
    const xs: number[] = [];
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const yi = poly[i].y, yj = poly[j].y;
      if ((yi > y) !== (yj > y)) {
        const x = ((poly[j].x - poly[i].x) * (y - yi)) / (yj - yi) + poly[i].x;
        xs.push(x);
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const x0 = Math.max(0, Math.ceil(xs[k]));
      const x1 = Math.min(W - 1, Math.floor(xs[k + 1]));
      for (let x = x0; x <= x1; x++) m[y * W + x] = 1;
    }
  }
  return m;
}

/** Calcule masque hachure (pixels orange dans zone densité > 0.5 dans 25px). */
async function computeMasks(png: Buffer): Promise<{
  W: number; H: number;
  orange: Uint8Array;
  hachure: Uint8Array;
}> {
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const orange = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    if (Math.abs(r - 255) <= 70 && Math.abs(g - 128) <= 70 && Math.abs(b - 0) <= 70) {
      orange[i] = 1;
    }
  }
  // Hachure mask
  const tmp = new Int32Array((W + 1) * (H + 1));
  for (let y = 1; y <= H; y++) {
    for (let x = 1; x <= W; x++) {
      tmp[y * (W + 1) + x] =
        orange[(y - 1) * W + (x - 1)] +
        tmp[(y - 1) * (W + 1) + x] +
        tmp[y * (W + 1) + (x - 1)] -
        tmp[(y - 1) * (W + 1) + (x - 1)];
    }
  }
  const hachure = new Uint8Array(W * H);
  const dr = 25;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (orange[y * W + x] === 0) continue;
      const x0 = Math.max(0, x - dr), y0 = Math.max(0, y - dr);
      const x1 = Math.min(W, x + dr), y1 = Math.min(H, y + dr);
      const sum =
        tmp[y1 * (W + 1) + x1] -
        tmp[y0 * (W + 1) + x1] -
        tmp[y1 * (W + 1) + x0] +
        tmp[y0 * (W + 1) + x0];
      const area = (x1 - x0) * (y1 - y0);
      if (sum / area >= 0.5) hachure[y * W + x] = 1;
    }
  }
  return { W, H, orange, hachure };
}

type PlanCtx = {
  name: string;
  png: Buffer;
  W: number; H: number;
  hachure: Uint8Array;
  hachureCount: number;
  /** Vérité approchée habitable : zone non-orange entourée de murs. */
  habitableTruth: Uint8Array;
  habitableTruthCount: number;
};

async function makeCtx(name: string, file: string): Promise<PlanCtx> {
  const png = await rasterize(file);
  const m = await computeMasks(png);
  let hCount = 0;
  for (let i = 0; i < m.hachure.length; i++) hCount += m.hachure[i];

  // Vérité approchée habitable : on calcule une seule fois avec params best-known
  // au stride 4, ratio 0.005-0.3, R 120 sur orangeMask sans hachure.
  const orangeNoHachure = new Uint8Array(m.W * m.H);
  for (let i = 0; i < m.W * m.H; i++) orangeNoHachure[i] = m.orange[i] && !m.hachure[i] ? 1 : 0;
  const intg = new Int32Array((m.W + 1) * (m.H + 1));
  for (let y = 1; y <= m.H; y++) {
    for (let x = 1; x <= m.W; x++) {
      intg[y * (m.W + 1) + x] =
        orangeNoHachure[(y - 1) * m.W + (x - 1)] +
        intg[(y - 1) * (m.W + 1) + x] +
        intg[y * (m.W + 1) + (x - 1)] -
        intg[(y - 1) * (m.W + 1) + (x - 1)];
    }
  }
  const truth = new Uint8Array(m.W * m.H);
  const R = 120;
  const yMin = Math.floor(m.H * 0.18);
  const yMax = Math.floor(m.H * 0.82);
  for (let y = yMin; y <= yMax; y++) {
    for (let x = 0; x < m.W; x++) {
      if (orangeNoHachure[y * m.W + x] === 1) continue;
      const x0 = Math.max(0, x - R), y0 = Math.max(0, y - R);
      const x1 = Math.min(m.W, x + R), y1 = Math.min(m.H, y + R);
      const sum =
        intg[y1 * (m.W + 1) + x1] -
        intg[y0 * (m.W + 1) + x1] -
        intg[y1 * (m.W + 1) + x0] +
        intg[y0 * (m.W + 1) + x0];
      const area = (x1 - x0) * (y1 - y0);
      const ratio = sum / area;
      if (ratio >= 0.005 && ratio <= 0.3) truth[y * m.W + x] = 1;
    }
  }
  // Garder seulement les composantes ≥ 100 px
  const labels = new Int32Array(m.W * m.H);
  let nL = 0;
  const sizes: number[] = [0];
  for (let y = 0; y < m.H; y++) {
    for (let x = 0; x < m.W; x++) {
      const idx = y * m.W + x;
      if (truth[idx] === 0 || labels[idx] !== 0) continue;
      nL++;
      sizes.push(0);
      const stack = [idx];
      while (stack.length) {
        const p = stack.pop()!;
        if (labels[p] !== 0) continue;
        labels[p] = nL;
        sizes[nL]++;
        const px = p % m.W, py = (p - px) / m.W;
        if (px > 0 && truth[p - 1] && !labels[p - 1]) stack.push(p - 1);
        if (px < m.W - 1 && truth[p + 1] && !labels[p + 1]) stack.push(p + 1);
        if (py > 0 && truth[p - m.W] && !labels[p - m.W]) stack.push(p - m.W);
        if (py < m.H - 1 && truth[p + m.W] && !labels[p + m.W]) stack.push(p + m.W);
      }
    }
  }
  const cleaned = new Uint8Array(m.W * m.H);
  for (let i = 0; i < m.W * m.H; i++) {
    if (labels[i] !== 0 && sizes[labels[i]] >= 100) cleaned[i] = 1;
  }
  let truthCount = 0;
  for (let i = 0; i < cleaned.length; i++) truthCount += cleaned[i];

  return {
    name, png, W: m.W, H: m.H,
    hachure: m.hachure, hachureCount: hCount,
    habitableTruth: cleaned, habitableTruthCount: truthCount,
  };
}

function score(ctx: PlanCtx, polyMask: Uint8Array): {
  iou: number; recall: number; precision: number; hatchPen: number; score: number;
} {
  let polyInter = 0, polyArea = 0, hatchIn = 0;
  const { W, H, habitableTruth, hachure, habitableTruthCount, hachureCount } = ctx;
  for (let i = 0; i < W * H; i++) {
    const p = polyMask[i];
    if (p) polyArea++;
    if (p && habitableTruth[i]) polyInter++;
    if (p && hachure[i]) hatchIn++;
  }
  const recall = habitableTruthCount > 0 ? polyInter / habitableTruthCount : 0;
  const precision = polyArea > 0 ? polyInter / polyArea : 0;
  const hatchPen = hachureCount > 0 ? 1 - hatchIn / hachureCount : 1;
  const iou = polyInter > 0 ? polyInter / (polyArea + habitableTruthCount - polyInter) : 0;
  const sc = recall * precision * hatchPen;
  return { iou, recall, precision, hatchPen, score: sc };
}

async function evaluate(ctxs: PlanCtx[], opts: ColorMaskOptions): Promise<{
  perPlan: Array<{ name: string; iou: number; score: number; vertices: number }>;
  geomeanScore: number;
  meanIoU: number;
}> {
  const perPlan: Array<{ name: string; iou: number; score: number; vertices: number }> = [];
  let prodScore = 1;
  let sumIoU = 0;
  for (const ctx of ctxs) {
    try {
      const r = await extractLotsByColorMask(ctx.png, opts);
      const poly = r.polygons[0] ?? [];
      const m = rasterPolygon(poly, ctx.W, ctx.H);
      const s = score(ctx, m);
      perPlan.push({ name: ctx.name, iou: s.iou, score: s.score, vertices: poly.length });
      prodScore *= Math.max(s.score, 0.001);
      sumIoU += s.iou;
    } catch {
      perPlan.push({ name: ctx.name, iou: 0, score: 0, vertices: 0 });
      prodScore *= 0.001;
    }
  }
  return {
    perPlan,
    geomeanScore: Math.pow(prodScore, 1 / ctxs.length),
    meanIoU: sumIoU / ctxs.length,
  };
}

async function main() {
  console.log("→ Pré-calcul contextes (4 plans)...");
  const ctxs: PlanCtx[] = [];
  for (const p of PLANS) {
    process.stdout.write(`  ${p.name}...`);
    const c = await makeCtx(p.name, p.file);
    console.log(` truth=${c.habitableTruthCount} hachure=${c.hachureCount}`);
    ctxs.push(c);
  }

  // Grille parametre réduite : 18 configs ciblées (~10 min)
  const grid: ColorMaskOptions[] = [];
  for (const morphOpen of [2, 3]) {
    for (const morphClose of [4, 6, 8]) {
      for (const simplifyTol of [10, 16]) {
        for (const orthoDeg of [15, 25]) {
          grid.push({
            sampleStride: 4,
            habitableRadius: 120,
            habitableRatioRange: [0.005, 0.3],
            simplifyTolerance: simplifyTol,
            snapRadius: 16,
            useMarchingSquares: true,
            excludeTopFraction: 0.18,
            excludeBottomFraction: 0.18,
            singleCluster: true,
            outputMode: "trace",
            morphOpenRadius: morphOpen,
            morphCloseRadius: morphClose,
            orthogonalToleranceDeg: orthoDeg,
          });
        }
      }
    }
  }
  console.log(`  ${grid.length} configurations`);

  let best: { opts: ColorMaskOptions; geomean: number; meanIoU: number; perPlan: any } | null = null;
  let i = 0;
  for (const opts of grid) {
    i++;
    const r = await evaluate(ctxs, opts);
    if (!best || r.geomeanScore > best.geomean) {
      best = { opts, geomean: r.geomeanScore, meanIoU: r.meanIoU, perPlan: r.perPlan };
      console.log(
        `  [${i}/${grid.length}] gm=${r.geomeanScore.toFixed(4)} iou=${r.meanIoU.toFixed(3)} ` +
          `mO=${opts.morphOpenRadius} mC=${opts.morphCloseRadius} tol=${opts.simplifyTolerance} ` +
          `ortho=${opts.orthogonalToleranceDeg} snap=${opts.snapRadius} BEST` +
          ` ${r.perPlan.map((p: any) => `${p.name}=${p.iou.toFixed(2)}`).join(" ")}`
      );
    } else if (i % 30 === 0) {
      console.log(`  [${i}/${grid.length}] gm=${r.geomeanScore.toFixed(4)} (best ${best.geomean.toFixed(4)})`);
    }
  }
  if (!best) throw new Error("aucun essai valide");
  console.log("\n=== BEST ===");
  console.log(JSON.stringify(best.opts, null, 2));
  console.log("perPlan:", best.perPlan);

  await writeFile(join(OUT, "s27-vs-autopilot-best.json"), JSON.stringify(best, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
