/**
 * Versi Studio — Plan Canonicalizer SHARP pipeline (s27)
 *
 * Pipeline local 100 % sharp (zéro réseau) qui produit un buffer canonique
 * "plan-noir-sur-blanc" épuré au format 1536 × 1024 :
 *   1. Décodage PDF → PNG (1ère page, scale 2) si signature %PDF détectée
 *   2. Greyscale + threshold 180 (binarisation)
 *   3. Resize 1536 × 1024 fit:inside, fond blanc (préserve aspect)
 *   4. Dilate léger (blur 0.5 + threshold 200) pour épaissir les traits
 *
 * Ce module est partagé entre :
 *   - `plan-canonicalizer-mock.ts` (mode test E2E sans clé OpenAI, s25 Round A)
 *   - `plan-canonicalizer.ts` (FALLBACK déterministe quand gpt-image-1 échoue,
 *      s27 fix H2 — évite de passer le PDF brut au pipeline aval)
 *
 * Pattern s24 : import dynamique sharp (évite crash worker Turbopack).
 */

const CANONICAL_W = 1536;
const CANONICAL_H = 1024;

/**
 * Décode un PDF en PNG (1ère page) si la signature %PDF est détectée.
 * Sinon retourne le buffer tel quel (déjà PNG/JPEG/etc.).
 */
async function pdfToPngIfNeeded(buf: Buffer): Promise<Buffer> {
  const isPdf =
    buf.length >= 4 &&
    buf[0] === 0x25 &&
    buf[1] === 0x50 &&
    buf[2] === 0x44 &&
    buf[3] === 0x46;
  if (!isPdf) return buf;

  const { pdf } = await import("pdf-to-img");
  const pages = await pdf(buf, { scale: 2 });
  for await (const page of pages) {
    return Buffer.from(page);
  }
  return buf;
}

/**
 * Pipeline sharp canonique. Retourne un PNG 1536 × 1024 noir sur blanc.
 * Throw si sharp ou pdf-to-img échoue — le caller gère le fallback.
 */
export async function runSharpCanonicalPipeline(
  inputBuf: Buffer,
): Promise<Buffer> {
  const { default: sharp } = await import("sharp");

  const png = await pdfToPngIfNeeded(inputBuf);

  // Étape 1-2-3 : greyscale + threshold + resize cadre canonical
  const step1 = await sharp(png)
    .greyscale()
    .threshold(180)
    .resize(CANONICAL_W, CANONICAL_H, {
      fit: "inside",
      background: { r: 255, g: 255, b: 255 },
    })
    .png()
    .toBuffer();

  // Étape 4 : dilate léger (blur + threshold) pour épaissir les traits
  const step2 = await sharp(step1)
    .blur(0.5)
    .threshold(200)
    .png()
    .toBuffer();

  return step2;
}

/** Race helper pour timeout du pipeline sharp. */
export function withSharpTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export const SHARP_CANONICAL_DIMENSIONS = {
  width: CANONICAL_W,
  height: CANONICAL_H,
} as const;
