/**
 * Test extraction vectorielle sur Muguets RDC + render overlay.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { extractLotVector, type Pt } from "../../src/lib/vs/lot-vector-extractor";

async function main() {
  const buf = await readFile(
    join(
      process.cwd(),
      "reference-existant",
      "plans-test",
      "P 00 - Pr2_plan RDC_ projet2.pdf",
    ),
  );

  const result = await extractLotVector(buf, {
    targetFillColor: "#ff8000",
    colorTolerance: 30,
    minPathArea: 100,
    scale: 3,
  });
  console.log(`page ${result.pageWidth}x${result.pageHeight} → image ${result.imageWidth}x${result.imageHeight}`);
  console.log(`paths orange fill: ${result.rawPaths.length}`);
  console.log(`wall stroke segments (lw≥0.8pt): ${result.wallSegments.length}`);
  console.log(`polygon (bbox of walls): ${result.polygon.length} sommets`);
  if (result.polygon.length === 4) {
    const p = result.polygon;
    console.log(`  bbox = [${p[0].x.toFixed(0)},${p[0].y.toFixed(0)}] - [${p[2].x.toFixed(0)},${p[2].y.toFixed(0)}]`);
  }
  // Stats par path
  for (let i = 0; i < Math.min(8, result.rawPaths.length); i++) {
    const p = result.rawPaths[i];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const pt of p) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }
    console.log(
      `  #${i}: ${p.length} sommets, bbox [${minX.toFixed(0)},${minY.toFixed(0)}]-[${maxX.toFixed(0)},${maxY.toFixed(0)}]`,
    );
  }

  // Render overlay : on a besoin d'un PNG du PDF d'abord
  const { pdf } = await import("pdf-to-img");
  const pages = await pdf(buf, { scale: 3 });
  let png: Buffer | null = null;
  for await (const p of pages) { png = Buffer.from(p); break; }
  if (!png) throw new Error("no png");

  await renderOverlay(
    png,
    result.polygon,
    join(process.cwd(), "..", "docs", "qa", "s27-vs-vector-rdc.png"),
  );

  // Aussi : render TOUS les paths superposés en couleurs distinctes pour debug
  await renderAllPaths(
    png,
    result.rawPaths,
    join(process.cwd(), "..", "docs", "qa", "s27-vs-vector-rdc-all.png"),
  );

  // Render des wall segments en jaune pour debug visuel
  await renderWallSegs(
    png,
    result.wallSegments,
    join(process.cwd(), "..", "docs", "qa", "s27-vs-vector-rdc-walls.png"),
  );
}

async function renderWallSegs(png: Buffer, segs: any[], outPath: string) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const out = Buffer.from(data);
  for (const s of segs) {
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
    const steps = Math.max(Math.abs(dx), Math.abs(dy)) | 0;
    if (steps === 0) continue;
    for (let t = 0; t <= steps; t++) {
      const fr = t / steps;
      const x = Math.round(s.x1 + dx * fr), y = Math.round(s.y1 + dy * fr);
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const px = x + ox, py = y + oy;
          if (px < 0 || px >= W || py < 0 || py >= H) continue;
          const idx = (py * W + px) * 4;
          out[idx] = 255; out[idx + 1] = 255; out[idx + 2] = 0; // jaune
        }
      }
    }
  }
  await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .resize({ width: 800 })
    .png()
    .toFile(outPath);
  console.log(`→ ${outPath}`);
}

async function renderOverlay(png: Buffer, poly: Pt[], outPath: string) {
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const out = Buffer.from(data);

  // Fill polygone (vert)
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
  // Trait
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
  await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .resize({ width: 800 })
    .png()
    .toFile(outPath);
  console.log(`→ ${outPath}`);
}

async function renderAllPaths(png: Buffer, paths: Pt[][], outPath: string) {
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const out = Buffer.from(data);
  // Couleurs HSL distinctes pour chaque path
  for (let pi = 0; pi < paths.length; pi++) {
    const poly = paths[pi];
    const hue = (pi * 137) % 360;
    const [r, g, b] = hslToRgb(hue / 360, 0.7, 0.5);
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], pb = poly[(i + 1) % poly.length];
      const dx = pb.x - a.x, dy = pb.y - a.y;
      const steps = Math.max(Math.abs(dx), Math.abs(dy));
      if (steps === 0) continue;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const cx = Math.round(a.x + dx * t), cy = Math.round(a.y + dy * t);
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const px = cx + ox, py = cy + oy;
            if (px < 0 || px >= W || py < 0 || py >= H) continue;
            const idx = (py * W + px) * 4;
            out[idx] = r; out[idx + 1] = g; out[idx + 2] = b;
          }
        }
      }
    }
  }
  await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .resize({ width: 800 })
    .png()
    .toFile(outPath);
  console.log(`→ ${outPath}`);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

main().catch((e) => { console.error(e); process.exit(1); });
