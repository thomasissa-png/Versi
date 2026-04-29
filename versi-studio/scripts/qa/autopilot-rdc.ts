/**
 * Autopilot s27 — itère paramètres extractLotsByColorMask sur Muguets RDC
 * jusqu'à IoU max entre polygone tracé et zone habitable détectée.
 *
 * Métrique : Intersection over Union entre {polygone rasterisé en mask}
 * et {zone habitable binaire calculée par l'extracteur lui-même}.
 * Plus IoU → 1, plus le polygone suit fidèlement les contours du lot.
 *
 * USAGE :
 *   cd versi-studio
 *   npx tsx scripts/qa/autopilot-rdc.ts
 *
 * Sortie : meilleur jeu de paramètres + overlay PNG dans docs/qa/.
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import {
  extractLotsByColorMask,
  type ColorMaskOptions,
  type Pt,
} from "../../src/lib/vs/color-mask-extractor";

const FIXTURE_PATH = join(
  process.cwd(),
  "reference-existant",
  "plans-test",
  "P 00 - Pr2_plan RDC_ projet2.pdf",
);
const OUT_DIR = join(process.cwd(), "..", "docs", "qa");
// (process.cwd() = versi-studio; OUT_DIR = ../docs/qa)

type Trial = {
  opts: ColorMaskOptions;
  iou: number;
  vertices: number;
  durationMs: number;
};

async function rasterize(): Promise<Buffer> {
  const buffer = await readFile(FIXTURE_PATH);
  const { pdf } = await import("pdf-to-img");
  const pages = await pdf(buffer, { scale: 3 });
  for await (const page of pages) return Buffer.from(page);
  throw new Error("aucune page rasterisée");
}

/**
 * Polygone → bitmap binaire via remplissage scan-line (fill rule even-odd).
 */
function rasterizePolygon(poly: Pt[], W: number, H: number): Uint8Array {
  const mask = new Uint8Array(W * H);
  if (poly.length < 3) return mask;
  for (let y = 0; y < H; y++) {
    const xs: number[] = [];
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const yi = poly[i].y, yj = poly[j].y;
      if ((yi > y) !== (yj > y)) {
        const xi = poly[i].x, xj = poly[j].x;
        const x = ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        xs.push(x);
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const x0 = Math.max(0, Math.ceil(xs[k]));
      const x1 = Math.min(W - 1, Math.floor(xs[k + 1]));
      for (let x = x0; x <= x1; x++) mask[y * W + x] = 1;
    }
  }
  return mask;
}

/**
 * Construit le masque "habitable ground truth" identique à celui calculé
 * dans l'extracteur, avec les mêmes paramètres ratio/topF/botF/R, mais on
 * remplit les composantes connectées entières (pas que la grille échantillonnée).
 *
 * Ce masque sert de référence pour calculer l'IoU.
 */
async function computeHabitableMask(
  pngBuffer: Buffer,
  opts: ColorMaskOptions,
): Promise<{ mask: Uint8Array; W: number; H: number }> {
  const { data: raw, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const targetR = 255, targetG = 128, targetB = 0, tol = 70;
  const orangeMask = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = raw[i * 4], g = raw[i * 4 + 1], b = raw[i * 4 + 2];
    if (
      Math.abs(r - targetR) <= tol &&
      Math.abs(g - targetG) <= tol &&
      Math.abs(b - targetB) <= tol
    ) {
      orangeMask[i] = 1;
    }
  }
  const integral = new Int32Array((W + 1) * (H + 1));
  for (let y = 1; y <= H; y++) {
    for (let x = 1; x <= W; x++) {
      integral[y * (W + 1) + x] =
        orangeMask[(y - 1) * W + (x - 1)] +
        integral[(y - 1) * (W + 1) + x] +
        integral[y * (W + 1) + (x - 1)] -
        integral[(y - 1) * (W + 1) + (x - 1)];
    }
  }
  const sumInRect = (x0: number, y0: number, x1: number, y1: number) => {
    x0 = Math.max(0, x0); y0 = Math.max(0, y0);
    x1 = Math.min(W, x1); y1 = Math.min(H, y1);
    return (
      integral[y1 * (W + 1) + x1] -
      integral[y0 * (W + 1) + x1] -
      integral[y1 * (W + 1) + x0] +
      integral[y0 * (W + 1) + x0]
    );
  };
  const stride = opts.sampleStride ?? 4;
  const R = opts.habitableRadius ?? stride * 30;
  const ratioMin = opts.habitableRatioRange?.[0] ?? 0.005;
  const ratioMax = opts.habitableRatioRange?.[1] ?? 0.3;
  const topF = opts.excludeTopFraction ?? 0.18;
  const botF = opts.excludeBottomFraction ?? 0.18;
  const yMin = Math.floor(H * topF);
  const yMax = Math.floor(H * (1 - botF));

  const habitable = new Uint8Array(W * H);
  // Densité : on remplit chaque pixel (pas seulement la grille) avec rendement
  // O(W*H) en utilisant ratio O(1) via integral image.
  for (let y = 0; y < H; y++) {
    if (y < yMin || y > yMax) continue;
    for (let x = 0; x < W; x++) {
      if (orangeMask[y * W + x] === 1) continue;
      const orangeCount = sumInRect(x - R, y - R, x + R, y + R);
      const totalCount =
        (Math.min(W, x + R) - Math.max(0, x - R)) *
        (Math.min(H, y + R) - Math.max(0, y - R));
      const ratio = orangeCount / totalCount;
      if (ratio >= ratioMin && ratio <= ratioMax) {
        habitable[y * W + x] = 1;
      }
    }
  }
  // Garder uniquement la plus grosse composante connectée
  const labels = new Int32Array(W * H);
  let nL = 0;
  const sizes: number[] = [0];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (habitable[idx] === 0 || labels[idx] !== 0) continue;
      nL++;
      sizes.push(0);
      const stack = [idx];
      while (stack.length) {
        const p = stack.pop()!;
        if (labels[p] !== 0) continue;
        labels[p] = nL;
        sizes[nL]++;
        const px = p % W, py = (p - px) / W;
        if (px > 0 && habitable[p - 1] && !labels[p - 1]) stack.push(p - 1);
        if (px < W - 1 && habitable[p + 1] && !labels[p + 1]) stack.push(p + 1);
        if (py > 0 && habitable[p - W] && !labels[p - W]) stack.push(p - W);
        if (py < H - 1 && habitable[p + W] && !labels[p + W]) stack.push(p + W);
      }
    }
  }
  let best = 1;
  for (let i = 2; i <= nL; i++) if (sizes[i] > sizes[best]) best = i;
  // Fusionner toutes les composantes ≥ minClusterSize (cohérent extracteur)
  const minSize = (opts.minClusterSize ?? 100);
  const out = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (labels[i] !== 0 && sizes[labels[i]] >= minSize) out[i] = 1;
  }
  return { mask: out, W, H };
}

function iou(a: Uint8Array, b: Uint8Array): number {
  let inter = 0, uni = 0;
  for (let i = 0; i < a.length; i++) {
    const aa = a[i], bb = b[i];
    if (aa | bb) uni++;
    if (aa & bb) inter++;
  }
  return uni === 0 ? 0 : inter / uni;
}

async function evaluate(
  pngBuffer: Buffer,
  opts: ColorMaskOptions,
  groundTruth: { mask: Uint8Array; W: number; H: number },
): Promise<Trial> {
  const t0 = Date.now();
  const result = await extractLotsByColorMask(pngBuffer, opts);
  const poly = result.polygons[0] ?? [];
  const polyMask = rasterizePolygon(poly, groundTruth.W, groundTruth.H);
  const score = iou(polyMask, groundTruth.mask);
  return {
    opts,
    iou: score,
    vertices: poly.length,
    durationMs: Date.now() - t0,
  };
}

async function renderOverlay(
  pngBuffer: Buffer,
  poly: Pt[],
  outName: string,
  iouScore: number,
) {
  const meta = await sharp(pngBuffer).metadata();
  const W = meta.width!;
  const H = meta.height!;
  // Un SVG superposé qui dessine le polygone vert semi-transparent
  const points = poly.map((p) => `${p.x},${p.y}`).join(" ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <polygon points="${points}" fill="rgba(0,200,80,0.35)" stroke="rgba(0,150,40,0.95)" stroke-width="6" />
    <text x="20" y="40" fill="darkgreen" font-size="32" font-weight="bold">IoU=${iouScore.toFixed(3)} v=${poly.length}</text>
  </svg>`;
  // Rasterise le SVG au même W×H que le PNG (density adaptée), puis composite.
  const svgPng = await sharp(Buffer.from(svg), { density: 72 })
    .resize(W, H)
    .png()
    .toBuffer();
  await sharp(pngBuffer)
    .composite([{ input: svgPng, top: 0, left: 0 }])
    .resize({ width: 800 })
    .toFile(join(OUT_DIR, outName));
}

async function main() {
  console.log("→ Rasterizing PDF Muguets RDC...");
  const png = await rasterize();
  console.log(`  PNG ${png.length} bytes`);

  // Grille de paramètres (54 configs ~6 min)
  const grid: ColorMaskOptions[] = [];
  for (const stride of [4, 6]) {
    for (const radiusMul of [25, 30, 35]) {
      for (const ratioLo of [0.003, 0.005, 0.008]) {
        for (const tol of [3, 6]) {
          for (const snap of [stride * 4, stride * 10]) {
            grid.push({
              sampleStride: stride,
              habitableRadius: stride * radiusMul,
              habitableRatioRange: [ratioLo, 0.3],
              simplifyTolerance: tol,
              snapRadius: snap,
              useMarchingSquares: true,
              excludeTopFraction: 0.18,
              excludeBottomFraction: 0.18,
              singleCluster: true,
            });
          }
        }
      }
    }
  }
  console.log(`  ${grid.length} configurations à tester`);

  // Ground truth = masque habitable au stride le plus fin
  console.log("→ Computing ground truth habitable mask (stride=4)...");
  const gt = await computeHabitableMask(png, {
    sampleStride: 4,
    habitableRadius: 4 * 30,
    habitableRatioRange: [0.005, 0.3],
    excludeTopFraction: 0.18,
    excludeBottomFraction: 0.18,
    minClusterSize: 100,
  });
  let gtPx = 0;
  for (let i = 0; i < gt.mask.length; i++) gtPx += gt.mask[i];
  console.log(`  Ground truth ${gtPx} px habitable`);

  let best: Trial | null = null;
  let i = 0;
  for (const opts of grid) {
    i++;
    try {
      const trial = await evaluate(png, opts, gt);
      if (!best || trial.iou > best.iou) {
        best = trial;
        console.log(
          `  [${i}/${grid.length}] iou=${trial.iou.toFixed(4)} v=${trial.vertices} ` +
            `s=${opts.sampleStride} R=${opts.habitableRadius} ratio=[${opts.habitableRatioRange?.[0]}, ${opts.habitableRatioRange?.[1]}] ` +
            `tol=${opts.simplifyTolerance} snap=${opts.snapRadius} (${trial.durationMs}ms) BEST`,
        );
      } else if (i % 20 === 0) {
        console.log(`  [${i}/${grid.length}] iou=${trial.iou.toFixed(4)} (best ${best.iou.toFixed(4)})`);
      }
    } catch (err) {
      // Cluster vide ou erreur, on continue
    }
  }

  if (!best) {
    console.error("✗ Aucun essai valide");
    process.exit(1);
  }
  console.log(`\n✓ Meilleur IoU = ${best.iou.toFixed(4)} avec ${best.vertices} sommets`);
  console.log("  Options :", JSON.stringify(best.opts, null, 2));

  // Rendu overlay final
  const result = await extractLotsByColorMask(png, best.opts);
  await renderOverlay(png, result.polygons[0], "s27-vs-autopilot-rdc.png", best.iou);
  console.log("  → docs/qa/s27-vs-autopilot-rdc.png");

  // Rapport JSON
  await writeFile(
    join(OUT_DIR, "s27-vs-autopilot-rdc.json"),
    JSON.stringify({ best, gridSize: grid.length }, null, 2),
  );
  console.log("  → docs/qa/s27-vs-autopilot-rdc.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
