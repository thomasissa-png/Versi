import { readFile } from "fs/promises";
import { extractTextItems, filterRoomLabels } from "../src/lib/vs/pdf-text-extractor";
import { extractLotVector } from "../src/lib/vs/lot-vector-extractor";
const file = process.argv[2];
async function main() {
  const buf = await readFile(file);
  const lvr = await extractLotVector(buf, { scale: 3 });
  console.log(`Image: ${lvr.imageWidth.toFixed(0)}x${lvr.imageHeight.toFixed(0)}`);
  console.log(`Lot polygon (4 vertices, %): ${JSON.stringify(lvr.polygon)}`);
  const lotBox = lvr.polygon;
  console.log(`Lot polygon (px): ${JSON.stringify(lotBox)}`);
  const items = await extractTextItems(buf, lotBox, 3);
  console.log(`${items.length} items total in lot`);
  const labels = filterRoomLabels(items);
  console.log(`${labels.length} room labels:`);
  for (const i of labels) {
    console.log(`  "${i.text}" pos=(${i.x.toFixed(0)}, ${i.y.toFixed(0)}) surf=${(i as any).surface_m2 ?? "?"}m²`);
  }
}
main();
