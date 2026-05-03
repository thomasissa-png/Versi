import { readFile, writeFile } from "fs/promises";
import { pdf } from "pdf-to-img";

const PROJ = "90e66e8c-2c07-4812-acd3-91bebd469f32";
const PLANS: Array<[number, string]> = [
  [0, "35b20ddb-d7ba-4ae9-84ab-d6ebf766a08e.pdf"],
  [1, "d37364d1-aeda-482f-a0f1-ac01bbefd93e.pdf"],
  [2, "8326ba69-6a55-417d-aa5c-8d408d35cf71.pdf"],
  [3, "78ad14b4-21d6-4288-85b1-c36845a13c90.pdf"],
];

async function main() {
  for (const [floor, file] of PLANS) {
    const buf = await readFile(`/tmp/vs-uploads/${PROJ}/${file}`);
    const pages = await pdf(buf, { scale: 2 });
    for await (const page of pages) {
      await writeFile(
        `../tests/screenshots/s28-pdf-floor-${floor}.png`,
        page,
      );
      console.log(`floor ${floor} OK`);
      break;
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
