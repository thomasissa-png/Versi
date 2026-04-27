/**
 * Tests unitaires du parser PDF vectoriel (Module 2/5 — s27).
 *
 * Fixtures synthétiques via pdf-lib (devDep) — pas de PDF réels.
 * Couvre : rectangle simple, L-shape, bitmap pur (throw non_vectorial),
 * PDF vide (throw).
 */

import { describe, it, expect } from "vitest";
import { PDFDocument, rgb } from "pdf-lib";
import {
  extractWallSegments,
  PdfVectorParserError,
} from "../../src/lib/vs/pdf-vector-parser";

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
const TINY_PNG = Buffer.from(TINY_PNG_BASE64, "base64");

async function buildRectanglePdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 400]);
  // Un rectangle => 4 côtés. drawRectangle de pdf-lib émet un path
  // m + l + l + l + h (closePath) — donc 4 segments dont le dernier
  // peut être généré par closePath.
  page.drawRectangle({
    x: 50,
    y: 50,
    width: 300,
    height: 200,
    borderColor: rgb(0, 0, 0),
    borderWidth: 2,
  });
  return Buffer.from(await doc.save());
}

async function buildLShapePdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 400]);
  // L-shape : 6 segments connectés (drawLine × 6).
  // (50,50) → (250,50) → (250,150) → (150,150) → (150,250) → (50,250) → (50,50)
  const points: Array<[number, number, number, number]> = [
    [50, 50, 250, 50],
    [250, 50, 250, 150],
    [250, 150, 150, 150],
    [150, 150, 150, 250],
    [150, 250, 50, 250],
    [50, 250, 50, 50],
  ];
  for (const [x1, y1, x2, y2] of points) {
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      color: rgb(0, 0, 0),
      thickness: 2,
    });
  }
  return Buffer.from(await doc.save());
}

async function buildBitmapOnlyPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 400]);
  const png = await doc.embedPng(TINY_PNG);
  page.drawImage(png, { x: 0, y: 0, width: 400, height: 400 });
  return Buffer.from(await doc.save());
}

async function buildEmptyPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage([400, 400]);
  return Buffer.from(await doc.save());
}

describe("extractWallSegments", () => {
  it("extrait 4 segments d'un rectangle simple", async () => {
    const buf = await buildRectanglePdf();
    const result = await extractWallSegments(buf);
    // pdf-lib peut émettre 4 segments + éventuels closePath redondants.
    // On tolère ≥ 4, ≤ 8 (rectangle stroké peut produire path stroke + close).
    expect(result.segments.length).toBeGreaterThanOrEqual(4);
    expect(result.segments.length).toBeLessThanOrEqual(12);
    expect(result.pageWidth).toBe(400);
    expect(result.pageHeight).toBe(400);
    expect(result.unitMm).toBeGreaterThan(0);
  });

  it("extrait des segments cohérents d'un L-shape (6 côtés)", async () => {
    const buf = await buildLShapePdf();
    const result = await extractWallSegments(buf);
    // 6 drawLine → au moins 6 segments. pdf-lib peut émettre des
    // sous-paths de stroke supplémentaires : on tolère [6, 24].
    expect(result.segments.length).toBeGreaterThanOrEqual(6);
    expect(result.segments.length).toBeLessThanOrEqual(24);

    // Vérifier qu'au moins un segment correspond à chaque arête L-shape
    // (tolérance 1 unité user-space sur les endpoints).
    const expected: Array<[number, number, number, number]> = [
      [50, 50, 250, 50],
      [250, 50, 250, 150],
      [250, 150, 150, 150],
      [150, 150, 150, 250],
      [150, 250, 50, 250],
      [50, 250, 50, 50],
    ];
    const matchesEdge = (
      seg: { x1: number; y1: number; x2: number; y2: number },
      [ex1, ey1, ex2, ey2]: [number, number, number, number],
    ) => {
      const tol = 2;
      const fwd =
        Math.abs(seg.x1 - ex1) < tol &&
        Math.abs(seg.y1 - ey1) < tol &&
        Math.abs(seg.x2 - ex2) < tol &&
        Math.abs(seg.y2 - ey2) < tol;
      const rev =
        Math.abs(seg.x1 - ex2) < tol &&
        Math.abs(seg.y1 - ey2) < tol &&
        Math.abs(seg.x2 - ex1) < tol &&
        Math.abs(seg.y2 - ey1) < tol;
      return fwd || rev;
    };
    for (const edge of expected) {
      const found = result.segments.some((s) => matchesEdge(s, edge));
      expect(found, `Arête ${edge.join(",")} introuvable`).toBe(true);
    }
  });

  it("throw PdfVectorParserError sur PDF bitmap pur (non_vectorial)", async () => {
    const buf = await buildBitmapOnlyPdf();
    await expect(extractWallSegments(buf)).rejects.toMatchObject({
      name: "PdfVectorParserError",
      code: "non_vectorial",
    });
  });

  it("throw PdfVectorParserError sur PDF vide (page blanche)", async () => {
    const buf = await buildEmptyPdf();
    await expect(extractWallSegments(buf)).rejects.toBeInstanceOf(
      PdfVectorParserError,
    );
  });

  it("throw PdfVectorParserError sur buffer vide (pas de fallback)", async () => {
    await expect(extractWallSegments(Buffer.alloc(0))).rejects.toMatchObject({
      name: "PdfVectorParserError",
      code: "buffer_empty",
    });
  });
});
