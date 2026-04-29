/**
 * Render uniquement : applique les meilleurs params trouvés par autopilot
 * et produit l'overlay PNG.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import {
  extractLotsByColorMask,
  type ColorMaskOptions,
  type Pt,
} from "../../src/lib/vs/color-mask-extractor";

const FIXTURE = join(
  process.cwd(),
  "reference-existant",
  "plans-test",
  "P 00 - Pr2_plan RDC_ projet2.pdf",
);
const OUT = join(process.cwd(), "..", "docs", "qa");

async function main() {
  const buf = await readFile(FIXTURE);
  const { pdf } = await import("pdf-to-img");
  const pages = await pdf(buf, { scale: 3 });
  let png: Buffer | null = null;
  for await (const p of pages) {
    png = Buffer.from(p);
    break;
  }
  if (!png) throw new Error("no png");

  const opts: ColorMaskOptions = {
    sampleStride: 4,
    habitableRadius: 120,
    habitableRatioRange: [0.005, 0.3],
    simplifyTolerance: 3,
    snapRadius: 16,
    useMarchingSquares: true,
    excludeTopFraction: 0.18,
    excludeBottomFraction: 0.18,
    singleCluster: false,
    outputMode: "bbox",
  };

  const result = await extractLotsByColorMask(png, opts);
  const poly = result.polygons[0];
  console.log(`Polygon: ${poly.length} vertices`);

  const { data: rgba, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const out = Buffer.from(rgba);

  // 1) Remplissage scan-line (vert semi-transparent)
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
        // Alpha-blend vert (0,200,80) avec alpha=0.32
        const a = 0.32;
        out[idx] = Math.round(out[idx] * (1 - a) + 0 * a);
        out[idx + 1] = Math.round(out[idx + 1] * (1 - a) + 200 * a);
        out[idx + 2] = Math.round(out[idx + 2] * (1 - a) + 80 * a);
      }
    }
  }

  // 2) Trait du contour épais
  const drawLine = (ax: number, ay: number, bx: number, by: number) => {
    const dx = bx - ax, dy = by - ay;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    if (steps === 0) return;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = Math.round(ax + dx * t);
      const y = Math.round(ay + dy * t);
      // Trait épais 6 px
      for (let oy = -3; oy <= 3; oy++) {
        for (let ox = -3; ox <= 3; ox++) {
          const px = x + ox, py = y + oy;
          if (px < 0 || px >= W || py < 0 || py >= H) continue;
          const idx = (py * W + px) * 4;
          out[idx] = 0;
          out[idx + 1] = 150;
          out[idx + 2] = 40;
        }
      }
    }
  };
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    drawLine(a.x, a.y, b.x, b.y);
  }

  const outPath = join(OUT, "s27-vs-autopilot-rdc.png");
  await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .resize({ width: 800 })
    .png()
    .toFile(outPath);
  console.log("→", outPath);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
