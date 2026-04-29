/**
 * Render best-params overlay sur les 4 étages Muguets (RDC, R+1, R+2, R+3).
 */
import { readFile } from "node:fs/promises";
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

const OPTS: ColorMaskOptions = {
  sampleStride: 4,
  habitableRadius: 120,
  habitableRatioRange: [0.005, 0.3],
  simplifyTolerance: 3,
  snapRadius: 16,
  useMarchingSquares: true,
  excludeTopFraction: 0.18,
  excludeBottomFraction: 0.18,
  singleCluster: true,
};

async function renderRaw(png: Buffer, poly: Pt[]): Promise<Buffer> {
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const out = Buffer.from(data);
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
      for (let x = x0; x <= x1; x++) {
        const idx = (y * W + x) * 4;
        const a = 0.32;
        out[idx] = Math.round(out[idx] * (1 - a) + 0 * a);
        out[idx + 1] = Math.round(out[idx + 1] * (1 - a) + 200 * a);
        out[idx + 2] = Math.round(out[idx + 2] * (1 - a) + 80 * a);
      }
    }
  }
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const dx = b.x - a.x, dy = b.y - a.y;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    if (steps === 0) continue;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const cx = Math.round(a.x + dx * t), cy = Math.round(a.y + dy * t);
      for (let oy = -3; oy <= 3; oy++) {
        for (let ox = -3; ox <= 3; ox++) {
          const px = cx + ox, py = cy + oy;
          if (px < 0 || px >= W || py < 0 || py >= H) continue;
          const idx = (py * W + px) * 4;
          out[idx] = 0; out[idx + 1] = 150; out[idx + 2] = 40;
        }
      }
    }
  }
  return await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .resize({ width: 800 })
    .png()
    .toBuffer();
}

async function processOne(file: string, name: string) {
  const buf = await readFile(
    join(process.cwd(), "reference-existant", "plans-test", file),
  );
  const { pdf } = await import("pdf-to-img");
  const pages = await pdf(buf, { scale: 3 });
  let png: Buffer | null = null;
  for await (const p of pages) {
    png = Buffer.from(p);
    break;
  }
  if (!png) throw new Error(`no png ${file}`);
  const r = await extractLotsByColorMask(png, OPTS);
  const poly = r.polygons[0] ?? [];
  console.log(`  ${name}: ${poly.length} sommets, ${r.totalMaskPixels} px orange`);
  const overlay = await renderRaw(png, poly);
  const outPath = join(OUT, `s27-vs-autopilot-${name}.png`);
  await readFile("/dev/null").catch(() => null);
  await sharp(overlay).toFile(outPath);
  console.log(`  → ${outPath}`);
}

async function main() {
  for (const p of PLANS) {
    await processOne(p.file, p.name);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
