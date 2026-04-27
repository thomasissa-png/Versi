/**
 * Tests unitaires du détecteur auto type PDF (Module 1/5 — s27).
 *
 * Fixtures synthétiques générées via pdf-lib (devDep) — pas besoin de PDF réels.
 * Couvre : vectoriel pur, bitmap pur, hybride, edge cases (PDF vide / corrompu).
 */

import { describe, it, expect } from "vitest";
import { PDFDocument, rgb } from "pdf-lib";
import {
  detectPdfType,
  PdfTypeDetectorError,
} from "../../src/lib/vs/pdf-type-detector";

// 1×1 PNG opaque rouge — image minimale valide pour pdf-lib.embedPng. L'important
// pour le détecteur est que l'opérateur paintImageXObject soit présent dans le
// content stream, peu importe le contenu visuel de l'image.
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
const TINY_PNG = Buffer.from(TINY_PNG_BASE64, "base64");

async function buildVectorOnlyPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 400]);
  // ~80 segments / lignes — au-delà du seuil VECTOR_DOMINANCE_RATIO=50 pour 0 image.
  for (let i = 0; i < 20; i++) {
    page.drawLine({
      start: { x: 10 + i * 5, y: 10 },
      end: { x: 10 + i * 5, y: 390 },
      color: rgb(0, 0, 0),
      thickness: 0.5,
    });
  }
  page.drawRectangle({ x: 50, y: 50, width: 300, height: 300, borderColor: rgb(0, 0, 0), borderWidth: 1 });
  page.drawRectangle({ x: 80, y: 80, width: 100, height: 100, borderColor: rgb(0, 0, 0), borderWidth: 1 });
  return Buffer.from(await doc.save());
}

async function buildBitmapOnlyPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 400]);
  const png = await doc.embedPng(TINY_PNG);
  page.drawImage(png, { x: 0, y: 0, width: 400, height: 400 });
  return Buffer.from(await doc.save());
}

async function buildHybridPdf(): Promise<Buffer> {
  // ~5 lignes + 1 image → ratio 5/1 = 5, en-dessous du seuil 50× → hybride.
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 400]);
  const png = await doc.embedPng(TINY_PNG);
  page.drawImage(png, { x: 0, y: 0, width: 400, height: 400 });
  for (let i = 0; i < 3; i++) {
    page.drawLine({
      start: { x: 10, y: 10 + i * 20 },
      end: { x: 100, y: 10 + i * 20 },
      color: rgb(0, 0, 0),
      thickness: 1,
    });
  }
  return Buffer.from(await doc.save());
}

async function buildEmptyPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage([400, 400]); // Page sans contenu.
  return Buffer.from(await doc.save());
}

describe("detectPdfType", () => {
  it("classe un PDF vectoriel pur comme 'vector'", async () => {
    const buf = await buildVectorOnlyPdf();
    const verdict = await detectPdfType(buf);
    expect(verdict.type).toBe("vector");
    expect(verdict.vectorPathCount).toBeGreaterThan(0);
    expect(verdict.imageCount).toBe(0);
    expect(verdict.confidence).toBe(1);
  });

  it("classe un PDF bitmap pur (image embedded) comme 'bitmap'", async () => {
    const buf = await buildBitmapOnlyPdf();
    const verdict = await detectPdfType(buf);
    expect(verdict.type).toBe("bitmap");
    expect(verdict.imageCount).toBeGreaterThan(0);
    expect(verdict.vectorPathCount).toBe(0);
    expect(verdict.confidence).toBe(1);
  });

  it("classe un PDF mixte (image + quelques lignes) comme 'hybrid'", async () => {
    const buf = await buildHybridPdf();
    const verdict = await detectPdfType(buf);
    expect(verdict.type).toBe("hybrid");
    expect(verdict.vectorPathCount).toBeGreaterThan(0);
    expect(verdict.imageCount).toBeGreaterThan(0);
    expect(verdict.confidence).toBeGreaterThanOrEqual(0.3);
    expect(verdict.confidence).toBeLessThanOrEqual(1);
  });

  it("classe un PDF totalement vide (page blanche) avec confidence 0", async () => {
    const buf = await buildEmptyPdf();
    const verdict = await detectPdfType(buf);
    expect(verdict.type).toBe("hybrid");
    expect(verdict.vectorPathCount).toBe(0);
    expect(verdict.imageCount).toBe(0);
    expect(verdict.confidence).toBe(0);
  });

  it("throw PdfTypeDetectorError sur buffer vide (pas de fallback silencieux)", async () => {
    await expect(detectPdfType(Buffer.alloc(0))).rejects.toBeInstanceOf(PdfTypeDetectorError);
  });

  it("throw PdfTypeDetectorError sur buffer non-PDF", async () => {
    await expect(detectPdfType(Buffer.from("ceci n'est pas un PDF"))).rejects.toBeInstanceOf(
      PdfTypeDetectorError,
    );
  });
});
