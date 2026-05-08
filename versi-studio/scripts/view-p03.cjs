/* eslint-disable @typescript-eslint/no-require-imports */
// Script utilitaire .cjs (CommonJS) — require() obligatoire ici, pas d'ESM.
const { pdf } = require('pdf-to-img');
const fs = require('fs');
(async () => {
  const doc = await pdf('../reference-existant/plans-test/P 03 - Pr02_plan R+3_ projet02.pdf', { scale: 2 });
  for await (const page of doc) {
    fs.writeFileSync('../../docs/screenshots/s22/plan-p03-source.png', page);
    console.log('OK');
    break;
  }
})();
