import * as fs from 'fs';
import { extractTextItems, filterRoomLabels } from '../src/lib/vs/pdf-text-extractor';

const PLANS = [
  { file: 'P 00 - Pr2_plan RDC_ projet2.pdf', floor: 0 },
  { file: 'P 01 - Pr2_plan R+1_ projet2.pdf', floor: 1 },
  { file: 'P 02 - Pr2_plan R+2_ projet2.pdf', floor: 2 },
  { file: 'P 03 - Pr02_plan R+3_ projet02.pdf', floor: 3 },
];

async function main() {
  for (const plan of PLANS) {
    const buf = fs.readFileSync(`../reference-existant/plans-test/${plan.file}`);
    const lotPolygon = [
      {x:0,y:0},{x:10000,y:0},{x:10000,y:10000},{x:0,y:10000}
    ];
    const items = await extractTextItems(buf, lotPolygon, 3);
    const rooms = filterRoomLabels(items);
    console.log(`\n=== FLOOR ${plan.floor} (${plan.file}) — ${rooms.length} rooms ===`);
    for (const r of rooms) {
      console.log(`  ${r.text.padEnd(20)} surf=${r.surface_m2 ?? 'N/A'}  pos=(${Math.round(r.x)},${Math.round(r.y)})`);
    }
  }
}
main().catch(e => { console.error(e); process.exit(1); });
