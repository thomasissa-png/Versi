/**
 * Tests unitaires — plan-canonicalizer-mock.ts (s25 Round A)
 *
 * Vérifie que le mock sharp :
 * - produit une sortie aux dimensions canonical (≤ 1536×1024, fit inside)
 * - produit une image monochrome (majoritairement pixels noirs ou blancs)
 * - fallback silencieux sur timeout / empty input sans throw
 */
import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { canonicalizePlanMock } from "../../src/lib/ai/plan-canonicalizer-mock";

async function makeTestPng(
  width: number,
  height: number,
  fill: { r: number; g: number; b: number } = { r: 200, g: 200, b: 200 },
): Promise<Buffer> {
  // Image unie + un "trait" horizontal noir au milieu pour que la
  // binarisation threshold(180) produise au moins quelques pixels noirs.
  const base = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: fill,
    },
  })
    .png()
    .toBuffer();

  // Dessine une bande noire de 10px d'épaisseur à y = height/2
  const bandHeight = Math.max(2, Math.floor(height * 0.05));
  const band = await sharp({
    create: {
      width,
      height: bandHeight,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer();

  return sharp(base)
    .composite([
      {
        input: band,
        top: Math.floor((height - bandHeight) / 2),
        left: 0,
      },
    ])
    .png()
    .toBuffer();
}

describe("canonicalizePlanMock — sortie dimensions canonical", () => {
  it("produit une sortie ≤ 1536×1024 avec aspect préservé (fit inside)", async () => {
    const input = await makeTestPng(2400, 1600);
    const result = await canonicalizePlanMock(input);

    expect(result.fallback).toBe(false);
    expect(result.model).toBe("sharp-mock");
    expect(result.promptVersion).toBe("mock-1.0");
    expect(result.canonical.length).toBeGreaterThan(0);

    const meta = await sharp(result.canonical).metadata();
    expect(meta.width).toBeDefined();
    expect(meta.height).toBeDefined();
    expect(meta.width!).toBeLessThanOrEqual(1536);
    expect(meta.height!).toBeLessThanOrEqual(1024);
    // aspect ratio 3:2 préservé (tolérance de +/- 1px)
    const expectedRatio = 2400 / 1600;
    const actualRatio = meta.width! / meta.height!;
    expect(Math.abs(actualRatio - expectedRatio)).toBeLessThan(0.05);
  }, 20_000);
});

describe("canonicalizePlanMock — sortie monochrome", () => {
  it("la majorité (>95%) des pixels sont noirs ou blancs purs", async () => {
    const input = await makeTestPng(1200, 800, { r: 128, g: 128, b: 128 });
    const result = await canonicalizePlanMock(input);
    expect(result.fallback).toBe(false);

    const { data, info } = await sharp(result.canonical)
      .raw()
      .toBuffer({ resolveWithObject: true });

    let monoPx = 0;
    const pxCount = info.width * info.height;
    const channels = info.channels;
    for (let i = 0; i < data.length; i += channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const isWhite = r >= 245 && g >= 245 && b >= 245;
      const isBlack = r <= 30 && g <= 30 && b <= 30;
      if (isWhite || isBlack) monoPx++;
    }
    const monoRatio = monoPx / pxCount;
    expect(monoRatio).toBeGreaterThan(0.95);
  }, 20_000);
});

describe("canonicalizePlanMock — fallback empty input", () => {
  it("buffer vide → fallback silencieux (pas de throw)", async () => {
    const result = await canonicalizePlanMock(Buffer.alloc(0));
    expect(result.fallback).toBe(true);
    expect(result.fallbackReason).toBe("empty_input");
    expect(result.model).toBe("sharp-mock");
    // canonical retourne le buffer d'input (vide) sans throw
    expect(result.canonical.length).toBe(0);
  });

  it("timeout très court → fallback timeout (ne throw pas)", async () => {
    const input = await makeTestPng(2400, 1600);
    // 1ms : le pipeline sharp ne peut pas finir à temps
    const result = await canonicalizePlanMock(input, { timeoutMs: 1 });
    // Soit timeout (attendu), soit succès si la machine est très rapide.
    // On accepte les deux, on vérifie juste absence de throw.
    expect(result).toBeDefined();
    expect(result.model).toBe("sharp-mock");
    if (result.fallback) {
      expect(result.fallbackReason).toBe("timeout");
      // En fallback, le canonical retourné = buffer original inchangé
      expect(result.canonical.length).toBe(input.length);
    }
  }, 20_000);
});
