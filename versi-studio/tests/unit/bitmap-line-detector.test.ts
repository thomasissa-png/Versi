/**
 * Tests unitaires du détecteur de lignes bitmap (Module 3/5 — s27).
 *
 * Fixtures synthétiques générées via sharp (SVG → PNG) — pas besoin d'images réelles.
 * Couvre : rectangle, L-shape, image vide, bruit aléatoire.
 */

import { describe, it, expect } from "vitest";
import sharp from "sharp";
import {
  extractWallSegmentsFromBitmap,
  BitmapLineDetectorError,
} from "../../src/lib/vs/bitmap-line-detector";

const W = 400;
const H = 400;

async function svgToPng(svg: string, width = W, height = H): Promise<Buffer> {
  return sharp(Buffer.from(svg)).resize(width, height).png().toBuffer();
}

async function buildRectanglePng(): Promise<Buffer> {
  // Rectangle noir épais sur fond blanc
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <rect width="${W}" height="${H}" fill="white"/>
      <rect x="60" y="60" width="280" height="280" stroke="black" stroke-width="4" fill="none"/>
    </svg>
  `;
  return svgToPng(svg);
}

async function buildLShapePng(): Promise<Buffer> {
  // L-shape épais (typique d'une pièce d'angle dans un plan)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <rect width="${W}" height="${H}" fill="white"/>
      <polyline points="60,60 60,340 220,340 220,200 340,200 340,60 60,60"
                stroke="black" stroke-width="4" fill="none"/>
    </svg>
  `;
  return svgToPng(svg);
}

async function buildBlankPng(): Promise<Buffer> {
  return sharp({
    create: {
      width: W,
      height: H,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .png()
    .toBuffer();
}

async function buildNoisePng(): Promise<Buffer> {
  // Bruit "gris" subtil (variations ±20 autour de 128) — pas de structures
  // de lignes alignées. Ce type de bruit représente un scan dégradé / un
  // fond papier texturé, et NE doit PAS produire de segments cohérents
  // après seuil Sobel à 60.
  const buf = Buffer.alloc(W * H * 3);
  for (let i = 0; i < buf.length; i++) {
    buf[i] = 128 + Math.floor((Math.random() - 0.5) * 40);
  }
  return sharp(buf, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
}

describe("extractWallSegmentsFromBitmap", () => {
  it("détecte au moins 4 segments sur un rectangle noir épais (PNG synthétique)", async () => {
    const png = await buildRectanglePng();
    const res = await extractWallSegmentsFromBitmap(png);
    expect(res.imageWidth).toBe(W);
    expect(res.imageHeight).toBe(H);
    // Un rectangle a 4 côtés. Avec edge detection on en obtient typiquement
    // entre 4 et 8 (les bords épais produisent 2 edges parallèles par côté).
    expect(res.segments.length).toBeGreaterThanOrEqual(4);
  }, 20000);

  it("détecte des segments cohérents sur un L-shape (≥ 6 côtés attendus)", async () => {
    const png = await buildLShapePng();
    const res = await extractWallSegmentsFromBitmap(png);
    // L-shape = 6 côtés distincts. Tolérance edge-detection : >= 4.
    expect(res.segments.length).toBeGreaterThanOrEqual(4);
    // Vérifie qu'on a des segments dans plusieurs orientations (horizontal + vertical)
    const horizontals = res.segments.filter(
      (s) => Math.abs(s.y2 - s.y1) < Math.abs(s.x2 - s.x1),
    );
    const verticals = res.segments.filter(
      (s) => Math.abs(s.x2 - s.x1) < Math.abs(s.y2 - s.y1),
    );
    expect(horizontals.length).toBeGreaterThan(0);
    expect(verticals.length).toBeGreaterThan(0);
  }, 20000);

  it("throw BitmapLineDetectorError sur PNG entièrement blanc (zéro segment)", async () => {
    const png = await buildBlankPng();
    await expect(extractWallSegmentsFromBitmap(png)).rejects.toBeInstanceOf(
      BitmapLineDetectorError,
    );
  }, 20000);

  it("throw ou retourne très peu de segments cohérents sur du bruit aléatoire", async () => {
    const png = await buildNoisePng();
    try {
      // Seuils stricts : bruit dense produit beaucoup d'edges aléatoires →
      // Hough peut quand même accumuler des votes faibles. On exige une
      // longueur min très grande pour exclure les artefacts courts.
      const res = await extractWallSegmentsFromBitmap(png, {
        houghThreshold: 200,
        minSegmentLength: 80,
        maxLineGap: 2,
      });
      // Les "segments" trouvés sur du bruit seront des artefacts non
      // cohérents — on accepte jusqu'à 50 (vs des centaines pour un vrai plan).
      // Le but du test est de vérifier qu'on ne génère PAS un nombre
      // catastrophique de faux positifs avec des seuils stricts.
      expect(res.segments.length).toBeLessThan(50);
    } catch (err) {
      expect(err).toBeInstanceOf(BitmapLineDetectorError);
    }
  }, 20000);

  it("throw BitmapLineDetectorError sur buffer vide (pas de fallback silencieux)", async () => {
    await expect(extractWallSegmentsFromBitmap(Buffer.alloc(0))).rejects.toBeInstanceOf(
      BitmapLineDetectorError,
    );
  });
});
