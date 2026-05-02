import { pdf } from "pdf-to-img";
import { readFileSync, writeFileSync } from "fs";
(async () => {
  const buf = readFileSync(process.argv[2]);
  const pages = await pdf(buf, { scale: 1.5 });
  for await (const page of pages) {
    writeFileSync("/tmp/rdc-render.png", Buffer.from(page));
    break;
  }
  console.log("rendered to /tmp/rdc-render.png");
})();
