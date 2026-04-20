import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

async function main() {
  const { pdf } = await import("pdf-to-img");
  const buf = await fs.readFile(path.resolve(__dirname, "../../reference-existant/plans-test/P 00 - Pr2_plan RDC_ projet2.pdf"));
  const pages = await pdf(buf, { scale: 3 });
  for await (const page of pages) {
    const pngBuf = Buffer.from(page);
    const meta = await sharp(pngBuf).metadata();
    console.log("plan PNG size:", meta.width, "x", meta.height);
    await fs.writeFile("/tmp/s23-p00-clean.png", pngBuf);
    // also produce a downscaled 1200-wide for quick inspection
    await sharp(pngBuf).resize({ width: 1400 }).toFile("/tmp/s23-p00-small.png");
    console.log("wrote /tmp/s23-p00-clean.png and /tmp/s23-p00-small.png");
    break;
  }
}
main().catch(e => { console.error(e); process.exit(1); });
