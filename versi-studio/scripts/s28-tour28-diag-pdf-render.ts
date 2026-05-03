import * as fs from 'fs';
import { pdf } from 'pdf-to-img';

async function main() {
  const doc = await pdf('../reference-existant/plans-test/P 01 - Pr2_plan R+1_ projet2.pdf', { scale: 2.5 });
  let i = 0;
  for await (const page of doc) {
    fs.writeFileSync(`/tmp/r1-render-${i}.png`, page);
    console.log(`saved page ${i}`);
    i++;
    if (i >= 1) break;
  }
}
main().catch(e => { console.error(e); process.exit(1); });
