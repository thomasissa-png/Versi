/**
 * Génère des fixtures photo synthétiques pour les tests Vitest Vague 2.
 *
 * Usage : `npx tsx tests/fixtures/photos/generate-fixtures.ts`
 *
 * Idempotent : régénère les fichiers à chaque exécution.
 * Les vrais fichiers HEIC ne sont pas générables par sharp ; on simule via
 * un buffer avec en-tête HEIC (magic bytes) suivi de payload aléatoire pour
 * tester `detectImageFormat`. La conversion réelle HEIC→JPEG est testée
 * séparément (mock heic-convert) dans `photo-preprocessor.test.ts`.
 */
import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.resolve(__dirname);

async function makeJpeg(name: string, width: number, height: number, color: { r: number; g: number; b: number }) {
  const buf = await sharp({
    create: { width, height, channels: 3, background: color },
  })
    .jpeg({ quality: 90 })
    .toBuffer();
  await writeFile(path.join(DIR, name), buf);
}

async function makePng(name: string, width: number, height: number) {
  const buf = await sharp({
    create: { width, height, channels: 4, background: { r: 200, g: 200, b: 200, alpha: 1 } },
  })
    .png()
    .toBuffer();
  await writeFile(path.join(DIR, name), buf);
}

async function makeWebp(name: string, width: number, height: number) {
  const buf = await sharp({
    create: { width, height, channels: 3, background: { r: 100, g: 150, b: 200 } },
  })
    .webp({ quality: 85 })
    .toBuffer();
  await writeFile(path.join(DIR, name), buf);
}

/** Construit un buffer avec entête HEIC valide (magic bytes 'ftypheic'). */
async function makeFakeHeic(name: string) {
  // Layout minimal : 4 bytes box size + 'ftyp' + 'heic' + 4 bytes minor + 4 bytes compatible_brands
  const buf = Buffer.alloc(64);
  buf.writeUInt32BE(64, 0);
  buf.write("ftyp", 4, 4, "ascii");
  buf.write("heic", 8, 4, "ascii");
  buf.writeUInt32BE(0, 12);
  buf.write("heicmif1", 16, 8, "ascii");
  await writeFile(path.join(DIR, name), buf);
}

/** Image trop petite pour déclencher warning too_small. */
async function makeTooSmallJpeg(name: string) {
  const buf = await sharp({
    create: { width: 400, height: 300, channels: 3, background: { r: 128, g: 128, b: 128 } },
  })
    .jpeg({ quality: 90 })
    .toBuffer();
  await writeFile(path.join(DIR, name), buf);
}

/** JPEG très sombre pour déclencher low_light (luminance < 40). */
async function makeLowLightJpeg(name: string) {
  const buf = await sharp({
    create: { width: 1024, height: 768, channels: 3, background: { r: 15, g: 15, b: 15 } },
  })
    .jpeg({ quality: 90 })
    .toBuffer();
  await writeFile(path.join(DIR, name), buf);
}

/** Image uniforme = variance Laplacien faible → warning blurry. */
async function makeBlurryJpeg(name: string) {
  const buf = await sharp({
    create: { width: 800, height: 600, channels: 3, background: { r: 180, g: 180, b: 180 } },
  })
    .jpeg({ quality: 90 })
    .toBuffer();
  await writeFile(path.join(DIR, name), buf);
}

/** Format non supporté (TIFF). */
async function makeTiff(name: string) {
  const buf = await sharp({
    create: { width: 256, height: 256, channels: 3, background: { r: 50, g: 100, b: 150 } },
  })
    .tiff()
    .toBuffer();
  await writeFile(path.join(DIR, name), buf);
}

async function main() {
  await makeJpeg("F-jpg-large.jpg", 3000, 2000, { r: 100, g: 150, b: 200 });
  await makePng("F-png.png", 1920, 1080);
  await makeWebp("F-webp.webp", 1024, 768);
  await makeFakeHeic("F-heic-fake.heic");
  await makeTooSmallJpeg("F-too-small.jpg");
  await makeLowLightJpeg("F-low-light.jpg");
  await makeBlurryJpeg("F-blurry.jpg");
  await makeTiff("F-unsupported.tiff");
  console.log("Fixtures générées dans", DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
