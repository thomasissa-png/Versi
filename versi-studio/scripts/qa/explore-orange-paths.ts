/**
 * Explore les paths "orange" du PDF Muguets RDC via pdfjs-dist.
 * Identifie le pattern de coloration (setStrokeRGBColor / setFillRGBColor)
 * et compte les paths qui correspondent au lot.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

async function main() {
  const buf = await readFile(
    join(
      process.cwd(),
      "reference-existant",
      "plans-test",
      "P 00 - Pr2_plan RDC_ projet2.pdf",
    ),
  );

  // Workaround : on copie buffer pour bypass node-buffer-zero-copy issue de pdfjs
  const copy = new Uint8Array(buf.length);
  copy.set(buf);

  const pdfjsModule = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdfjs = pdfjsModule;
  const pdf = await pdfjs.getDocument({ data: copy }).promise;
  console.log(`pages: ${pdf.numPages}`);
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  console.log(`page size: ${viewport.width} x ${viewport.height}`);
  const opList = await page.getOperatorList();
  console.log(`ops: ${opList.fnArray.length}`);

  const OPS = pdfjs.OPS;
  console.log(
    `OPS.setStrokeRGBColor=${OPS.setStrokeRGBColor} setFillRGBColor=${OPS.setFillRGBColor} setStrokeColor=${OPS.setStrokeColor} setFillColor=${OPS.setFillColor} constructPath=${OPS.constructPath}`,
  );

  // Stats : combien de fois chaque OP apparaît
  const opCounts = new Map<number, number>();
  for (const op of opList.fnArray) {
    opCounts.set(op, (opCounts.get(op) ?? 0) + 1);
  }
  // Inverse pdfjs OPS dict pour readable names
  const opNames = new Map<number, string>();
  for (const [k, v] of Object.entries(OPS)) {
    if (typeof v === "number") opNames.set(v, k);
  }
  const sorted = [...opCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  console.log("Top 20 OPS:");
  for (const [op, count] of sorted) {
    console.log(`  ${opNames.get(op) ?? `op${op}`} (${op}) = ${count}`);
  }

  // Walk : log toutes les couleurs RGB rencontrées (set*Color) avec count
  const colorCounts = new Map<string, number>();
  // Walk : pour chaque constructPath, combien de paths utilisent quelle couleur
  let currentStrokeColor = "default";
  let currentFillColor = "default";
  const pathsByFillColor = new Map<string, number>();
  const pathsByStrokeColor = new Map<string, number>();

  // Pre-walk : log les premières occurrences setStrokeRGBColor + setFillRGBColor
  let dbg = 0;
  for (let i = 0; i < opList.fnArray.length && dbg < 10; i++) {
    const op = opList.fnArray[i];
    const a = opList.argsArray[i];
    if (op === OPS.setStrokeRGBColor || op === OPS.setFillRGBColor) {
      console.log(
        `op=${op === OPS.setStrokeRGBColor ? "stroke" : "fill"} args=`,
        JSON.stringify(a),
        `type=${typeof a}, ctor=${a?.constructor?.name}`,
      );
      dbg++;
    }
  }
  for (let i = 0; i < opList.fnArray.length; i++) {
    const op = opList.fnArray[i];
    const a = opList.argsArray[i];
    if (op === OPS.setStrokeRGBColor && Array.isArray(a) && a.length >= 1 && typeof a[0] === "string") {
      currentStrokeColor = a[0];
      colorCounts.set(currentStrokeColor, (colorCounts.get(currentStrokeColor) ?? 0) + 1);
    } else if (op === OPS.setFillRGBColor && Array.isArray(a) && a.length >= 1 && typeof a[0] === "string") {
      currentFillColor = a[0];
      colorCounts.set(currentFillColor, (colorCounts.get(currentFillColor) ?? 0) + 1);
    } else if (op === OPS.constructPath && Array.isArray(a)) {
      const drawType = typeof a[0] === "number" ? a[0] : -1;
      const tag = `${currentFillColor}|${currentStrokeColor}|drawType=${drawType}`;
      pathsByFillColor.set(tag, (pathsByFillColor.get(tag) ?? 0) + 1);
    }
  }
  console.log("Top 30 colors set:");
  const cTop = [...colorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
  for (const [k, v] of cTop) console.log(`  ${k}: ${v}x`);

  console.log("Top 30 path color tags:");
  const pTop = [...pathsByFillColor.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
  for (const [k, v] of pTop) console.log(`  ${k}: ${v}x`);
}
main().catch((e) => { console.error(e); process.exit(1); });
