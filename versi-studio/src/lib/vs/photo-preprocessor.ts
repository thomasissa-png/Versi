/**
 * Versi Studio — Pré-traitement photos pour Étape 4 v2
 *
 * Pipeline appliqué à l'upload (asynchrone, n'attend pas le clic Générer) :
 *  1. Détection du format réel (magic bytes, pas extension)
 *  2. Conversion HEIC/HEIF → JPG via heic-convert (gpt-image-2 ne lit pas HEIC iOS)
 *  3. Lecture EXIF (orientation, DateTimeOriginal, GPS) via exifr
 *  4. Strip EXIF orientation + GPS (sharp.rotate() applique la rotation puis
 *     l'image normalisée n'a plus de tag → évite la double rotation côté client)
 *  5. Resize si max(width, height) > 2048px (resolution interne gpt-image-2)
 *  6. Validations non bloquantes : low-light, flou, taille (warnings UI)
 *  7. Output JPG quality 90
 *
 * Idempotent : relancer sur une photo déjà normalisée est un no-op (pas de
 * conversion HEIC, pas de rotation EXIF, pas de resize si déjà ≤ 2048).
 *
 * Source : docs/ia/visuals-step-v2-pipeline.md §3.
 */

import sharp from "sharp";
// heic-convert et exifr sont optionnels au build — le module exporte une
// fonction qui charge les deps dynamiquement. Si manquantes, fallback dégradé
// (pas de HEIC support, pas d'EXIF). Voir REPLIT_ACTIONS.md pour install.

// ─── Types ─────────────────────────────────────────────────────────

export type PhotoWarningCode =
  | "low_light"
  | "blurry"
  | "too_small"
  | "low_resolution"
  | "unsupported_format";

export interface PhotoWarning {
  code: PhotoWarningCode;
  severity: "info" | "warning";
  message: string;
}

export interface PhotoExifMetadata {
  /** Heure de prise de vue (DateTimeOriginal EXIF), ISO string. */
  taken_at: string | null;
  /** EXIF brut conservé pour usage futur (géolocalisation, etc.). */
  raw: Record<string, unknown> | null;
}

export interface PreprocessedPhoto {
  /** Buffer JPG normalisé (EXIF strip + rotation appliquée + resize). */
  buffer: Buffer;
  /** Toujours 'image/jpeg' après preprocessing (HEIC/PNG/WEBP convertis). */
  mime_type: string;
  width: number;
  height: number;
  /** Avertissements non bloquants à afficher dans la sidebar. */
  warnings: PhotoWarning[];
  /** Métadonnées EXIF extraites avant strip. */
  exif: PhotoExifMetadata;
}

// ─── Détection format réel via magic bytes ────────────────────────

/**
 * Détecte le format réel d'un buffer image (pas la fausse extension).
 * Retourne le mime type ou null si format inconnu / non supporté.
 */
export function detectImageFormat(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  // JPEG : FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG : 89 50 4E 47
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
  ) {
    return "image/png";
  }
  // WEBP : 'RIFF' (52 49 46 46) ... 'WEBP' (57 45 42 50)
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46
    && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return "image/webp";
  }
  // HEIC / HEIF : 'ftyp' à offset 4 + brand heic/heix/hevc/hevx/mif1/msf1
  if (
    buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70
  ) {
    const brand = buffer.slice(8, 12).toString("ascii");
    if (
      brand === "heic" || brand === "heix" || brand === "hevc"
      || brand === "hevx" || brand === "mif1" || brand === "msf1" || brand === "heif"
    ) {
      return "image/heic";
    }
  }
  return null;
}

// ─── Conversion HEIC → JPG ──────────────────────────────────────────

type HeicConvertFn = (opts: { buffer: Buffer; format: "JPEG"; quality: number }) => Promise<Buffer>;

async function convertHeicToJpeg(heicBuffer: Buffer): Promise<Buffer> {
  // Charge heic-convert dynamiquement pour rester optionnel au build
  let heicConvert: HeicConvertFn;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import("heic-convert");
    heicConvert = (mod.default ?? mod) as HeicConvertFn;
  } catch {
    throw new Error(
      "Conversion HEIC impossible : package 'heic-convert' non installé. " +
      "Voir REPLIT_ACTIONS.md pour l'installation."
    );
  }
  if (typeof heicConvert !== "function") {
    throw new Error("heic-convert non chargeable (export inattendu).");
  }
  const jpegBuffer = await heicConvert({
    buffer: heicBuffer,
    format: "JPEG",
    quality: 0.9,
  });
  return Buffer.from(jpegBuffer);
}

// ─── Extraction EXIF ───────────────────────────────────────────────

type ExifrParseFn = (input: Buffer) => Promise<Record<string, unknown> | undefined>;

async function extractExif(buffer: Buffer): Promise<PhotoExifMetadata> {
  let exifrParse: ExifrParseFn | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import("exifr");
    const candidate = mod.parse ?? mod.default?.parse;
    if (typeof candidate === "function") exifrParse = candidate as ExifrParseFn;
  } catch {
    return { taken_at: null, raw: null };
  }
  if (!exifrParse) return { taken_at: null, raw: null };
  try {
    const data = await exifrParse(buffer);
    if (!data) return { taken_at: null, raw: null };
    const dto = data["DateTimeOriginal"];
    let takenAt: string | null = null;
    if (dto instanceof Date) {
      takenAt = dto.toISOString();
    } else if (typeof dto === "string") {
      const parsed = new Date(dto);
      if (!Number.isNaN(parsed.getTime())) takenAt = parsed.toISOString();
    }
    return { taken_at: takenAt, raw: data };
  } catch {
    return { taken_at: null, raw: null };
  }
}

// ─── Validations qualité (non bloquantes) ─────────────────────────

/**
 * Variance du Laplacien sur un thumbnail 256px en niveau de gris.
 * Approximation utilisée comme proxy de netteté : variance < 100 → flou probable.
 *
 * Implémentation : sharp.greyscale() + raw extract + convolution 3x3 Laplacien
 * approximé par différence entre pixel et moyenne des 4 voisins (suffit pour le proxy).
 *
 * Note seuil : 100 est une valeur indicative tirée de la littérature OpenCV ;
 * à recalibrer sur 20-30 photos test Thomas avant freeze production.
 */
async function laplacianVariance(buffer: Buffer): Promise<number> {
  try {
    const { data, info } = await sharp(buffer)
      .resize(256, 256, { fit: "inside" })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const w = info.width;
    const h = info.height;
    const lap: number[] = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const center = data[i];
        const top = data[i - w];
        const bottom = data[i + w];
        const left = data[i - 1];
        const right = data[i + 1];
        // Laplacien 4-voisins : 4*center - (top+bottom+left+right)
        lap.push(4 * center - top - bottom - left - right);
      }
    }
    if (lap.length === 0) return 0;
    const mean = lap.reduce((a, b) => a + b, 0) / lap.length;
    const variance = lap.reduce((a, b) => a + (b - mean) ** 2, 0) / lap.length;
    return variance;
  } catch {
    return Number.POSITIVE_INFINITY; // pas de blocage si le calcul échoue
  }
}

/**
 * Luminance moyenne (Y de YCbCr) sur thumbnail. < 40/255 → photo sombre.
 */
async function meanLuminance(buffer: Buffer): Promise<number> {
  try {
    const { data } = await sharp(buffer)
      .resize(128, 128, { fit: "inside" })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (data.length === 0) return 255;
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    return sum / data.length;
  } catch {
    return 128; // valeur neutre si calcul échoue
  }
}

// ─── Pipeline principal ────────────────────────────────────────────

/**
 * Pré-traite une photo : conversion HEIC, EXIF, resize, validations.
 *
 * Idempotent : peut être rappelé sur le buffer output sans effet de bord
 * (pas de re-conversion, pas de re-rotation, pas de re-resize).
 *
 * @param buffer Bytes de la photo source
 * @param declaredMimeType MIME type déclaré par le client (peut être faux)
 * @returns Photo normalisée + warnings
 * @throws Error si format non supporté (TIFF, BMP, GIF...) — bloquant amont
 */
export async function preprocessPhoto(
  buffer: Buffer,
  declaredMimeType: string
): Promise<PreprocessedPhoto> {
  const warnings: PhotoWarning[] = [];

  // 1. Détection format réel (magic bytes prioritaire sur déclaration client)
  const detected = detectImageFormat(buffer);
  if (!detected) {
    throw new Error(
      `Format non supporté (declaredMimeType=${declaredMimeType}). ` +
      `Formats acceptés : JPG, PNG, WEBP, HEIC.`
    );
  }

  // 2. Conversion HEIC si nécessaire
  let workingBuffer = buffer;
  if (detected === "image/heic") {
    workingBuffer = await convertHeicToJpeg(buffer);
  }

  // 3. Lecture EXIF avant strip (sur le buffer original — HEIC EXIF préservé
  // par exifr aussi, mais sur des photos déjà converties on lit le JPG résultat).
  const exif = await extractExif(detected === "image/heic" ? buffer : workingBuffer);

  // 4. Pipeline sharp : auto-orient (applique rotation EXIF) + strip metadata
  // + resize si > 2048px + output JPG quality 90
  const sharpInstance = sharp(workingBuffer)
    .rotate() // applique l'orientation EXIF puis strip ce tag
    .withMetadata({ orientation: undefined }); // explicite : pas d'orientation tag

  const metadata = await sharpInstance.metadata();
  const sourceWidth = metadata.width ?? 0;
  const sourceHeight = metadata.height ?? 0;

  if (sourceWidth === 0 || sourceHeight === 0) {
    throw new Error("Image illisible : dimensions invalides (0×0).");
  }

  // 5. Resize si nécessaire (préserve ratio via fit: inside)
  const maxDim = Math.max(sourceWidth, sourceHeight);
  const needsResize = maxDim > 2048;
  let pipeline = sharpInstance;
  if (needsResize) {
    pipeline = pipeline.resize(2048, 2048, { fit: "inside" });
  }

  // 6. Output JPG quality 90 (forcé : tous les outputs sont JPG normalisés)
  const normalizedBuffer = await pipeline.jpeg({ quality: 90 }).toBuffer();
  const finalMeta = await sharp(normalizedBuffer).metadata();
  const finalWidth = finalMeta.width ?? 0;
  const finalHeight = finalMeta.height ?? 0;

  // 7. Validations qualité (non bloquantes)
  const sizeBytes = normalizedBuffer.length;
  if (sizeBytes < 200 * 1024) {
    warnings.push({
      code: "low_resolution",
      severity: "warning",
      message: "Photo très basse définition — risque d'hallucinations sur les meubles.",
    });
  }
  const minSide = Math.min(finalWidth, finalHeight);
  if (minSide < 512) {
    warnings.push({
      code: "too_small",
      severity: "warning",
      message: "Photo trop petite — qualité de génération dégradée.",
    });
  }

  // Luminance + flou en parallèle
  const [luminance, lapVariance] = await Promise.all([
    meanLuminance(normalizedBuffer),
    laplacianVariance(normalizedBuffer),
  ]);

  if (luminance < 40) {
    warnings.push({
      code: "low_light",
      severity: "warning",
      message: "Photo sombre — l'IA peut mal interpréter les volumes. Ajoutez une seconde photo plus lumineuse si possible.",
    });
  }
  if (lapVariance < 100) {
    warnings.push({
      code: "blurry",
      severity: "warning",
      message: "Photo floue détectée — qualité dégradée.",
    });
  }

  return {
    buffer: normalizedBuffer,
    mime_type: "image/jpeg",
    width: finalWidth,
    height: finalHeight,
    warnings,
    exif,
  };
}
