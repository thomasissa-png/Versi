/**
 * Smoke test rapide : 1 config, vérifie que Moore boundary trace + snap-to-wall
 * tourne sans crash et retourne un polygone valide.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { extractLotsByColorMask } from "../../src/lib/vs/color-mask-extractor";

async function main() {
  const buf = await readFile(
    join(
      process.cwd(),
      "reference-existant",
      "plans-test",
      "P 00 - Pr2_plan RDC_ projet2.pdf",
    ),
  );
  const { pdf } = await import("pdf-to-img");
  const pages = await pdf(buf, { scale: 3 });
  let png: Buffer | null = null;
  for await (const p of pages) {
    png = Buffer.from(p);
    break;
  }
  if (!png) throw new Error("no png");
  console.log("PNG ready, calling extractor...");
  const r = await extractLotsByColorMask(png, {
    sampleStride: 4,
    useMarchingSquares: true,
    snapRadius: 32,
    simplifyTolerance: 6,
  });
  console.log({
    image: { W: r.imageWidth, H: r.imageHeight },
    mask: r.totalMaskPixels,
    clusters: r.clusterCount,
    polyVertices: r.polygons[0]?.length,
    first5: r.polygons[0]?.slice(0, 5),
  });
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
