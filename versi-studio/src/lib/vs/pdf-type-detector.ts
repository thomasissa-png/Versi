/**
 * Module 1/5 — Détecteur auto type PDF (s27 refonte pipeline plan-extractor)
 *
 * Verbatim Thomas s27 : « L'outil doit pouvoir s'adapter à tous les PDF qu'on
 * reçoit : vectoriel, bitmap, image. Détecter en amont. »
 *
 * Pas de fallback silencieux (learning P0 s27) — si la détection échoue, on
 * throw une erreur typée que le caller route en erreur visible UI.
 *
 * Spec complète : docs/ia/s27-vs-pipeline-refonte-architecture.md
 */

export type PdfTypeVerdict = {
  type: "vector" | "bitmap" | "hybrid";
  vectorPathCount: number;
  imageCount: number;
  confidence: number; // [0, 1]
};

export class PdfTypeDetectorError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "PdfTypeDetectorError";
  }
}

// Ratio paths vs images au-dessus duquel le PDF est considéré "purement vectoriel".
// Justification : un PDF archi vectoriel typique a des centaines/milliers de segments
// et 0-2 logos bitmap (cartouche). Au-delà de 50× on est sans ambiguïté vectoriel.
const VECTOR_DOMINANCE_RATIO = 50;

/**
 * Détecte la nature d'un PDF (vectoriel, bitmap, hybride) en comptant les
 * opérateurs de tracé vs les XObject Image dans le content stream de la page 1.
 *
 * @throws PdfTypeDetectorError si le PDF est corrompu, vide, ou si pdfjs-dist
 *         échoue. Aucun fallback automatique (learning P0 s27).
 */
export async function detectPdfType(buffer: Buffer): Promise<PdfTypeVerdict> {
  if (!buffer || buffer.length === 0) {
    throw new PdfTypeDetectorError("Buffer PDF vide ou nul");
  }

  // Import dynamique du bundle legacy de pdfjs-dist : il intègre les polyfills
  // (DOMMatrix, Path2D, ...) nécessaires en environnement Node, contrairement
  // au bundle "moderne" (build/pdf.mjs) qui suppose un environnement navigateur.
  // Pattern identique à `pdf-to-img` déjà utilisé dans le projet.
  let pdfjs: typeof import("pdfjs-dist");
  try {
    pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as typeof import("pdfjs-dist");
  } catch (err) {
    throw new PdfTypeDetectorError("Échec import pdfjs-dist", err);
  }

  // s27 fix prod Replit — résolution robuste avec fallback gracieux SSR.
  let cMapUrl: string | undefined;
  let standardFontDataUrl: string | undefined;
  try {
    const { createRequire } = await import("node:module");
    const fs = await import("node:fs");
    const pdfjsPkg = createRequire(import.meta.url).resolve(
      "pdfjs-dist/package.json",
    );
    const pdfjsRoot = pdfjsPkg.replace(/[\\/]package\.json$/, "");
    const cmapDir = `${pdfjsRoot}/cmaps/`;
    const fontDir = `${pdfjsRoot}/standard_fonts/`;
    if (fs.existsSync(cmapDir)) cMapUrl = cmapDir;
    if (fs.existsSync(fontDir)) standardFontDataUrl = fontDir;
  } catch {
    // SSR Next.js peut casser ces résolutions — on continue sans.
  }

  let pdfDoc;
  try {
    const docOptions: Record<string, unknown> = {
      data: new Uint8Array(buffer),
      isEvalSupported: false,
      useSystemFonts: false,
    };
    if (cMapUrl) {
      docOptions.cMapUrl = cMapUrl;
      docOptions.cMapPacked = true;
    }
    if (standardFontDataUrl) docOptions.standardFontDataUrl = standardFontDataUrl;
    const loadingTask = pdfjs.getDocument(docOptions as Parameters<typeof pdfjs.getDocument>[0]);
    pdfDoc = await loadingTask.promise;
  } catch (err) {
    throw new PdfTypeDetectorError("Échec parsing PDF (corrompu ou non-PDF)", err);
  }

  if (pdfDoc.numPages < 1) {
    throw new PdfTypeDetectorError("PDF sans page");
  }

  let vectorPathCount = 0;
  let imageCount = 0;
  const OPS = pdfjs.OPS;

  try {
    const page = await pdfDoc.getPage(1);
    const opList = await page.getOperatorList();
    const fns = opList.fnArray;
    const args = opList.argsArray;

    for (let i = 0; i < fns.length; i++) {
      const op = fns[i];
      // Path construction (v5 fusionne moveTo/lineTo/curveTo dans constructPath).
      if (op === OPS.constructPath) {
        // args[i] = [ops[], coords[], minMax]. ops contient des DrawOPS (moveTo=0,
        // lineTo=1, curveTo=2, ...) — chaque entrée est un sous-opérateur de tracé.
        const subOps = args[i]?.[0];
        if (Array.isArray(subOps)) {
          vectorPathCount += subOps.length;
        } else {
          vectorPathCount += 1;
        }
      } else if (op === OPS.moveTo || op === OPS.lineTo || op === OPS.curveTo || op === OPS.rectangle) {
        // Compatibilité versions antérieures où ces ops étaient top-level.
        vectorPathCount += 1;
      } else if (
        op === OPS.paintImageXObject ||
        op === OPS.paintInlineImageXObject ||
        op === OPS.paintImageXObjectRepeat ||
        op === OPS.paintInlineImageXObjectGroup
      ) {
        imageCount += 1;
      }
    }
  } catch (err) {
    throw new PdfTypeDetectorError("Échec lecture operatorList page 1", err);
  }

  // Décision (cf. spec s27) :
  //  - vector  : paths > VECTOR_DOMINANCE_RATIO × images (et au moins 1 path)
  //  - bitmap  : zéro path et ≥1 image
  //  - hybrid  : tout le reste (cas mixtes, dont PDF totalement vide -> hybrid 0/0
  //              avec confidence 0 — le caller décidera s'il throw ou tolère)
  let type: PdfTypeVerdict["type"];
  let confidence: number;

  if (vectorPathCount === 0 && imageCount === 0) {
    // PDF sans tracé ni image (page blanche, pure texte sans cadre, etc.)
    // — non décidable, on signale via confidence 0.
    type = "hybrid";
    confidence = 0;
  } else if (vectorPathCount > 0 && imageCount === 0) {
    type = "vector";
    confidence = 1;
  } else if (vectorPathCount === 0 && imageCount > 0) {
    type = "bitmap";
    confidence = 1;
  } else if (vectorPathCount > VECTOR_DOMINANCE_RATIO * imageCount) {
    type = "vector";
    confidence = Math.min(1, vectorPathCount / (VECTOR_DOMINANCE_RATIO * imageCount * 2));
  } else {
    type = "hybrid";
    // Confidence proportionnelle à l'équilibre : 1 quand paths≈images, baisse aux extrêmes.
    const ratio = vectorPathCount / Math.max(imageCount, 1);
    confidence = Math.min(1, Math.max(0.3, 1 - Math.abs(Math.log10(ratio)) / 2));
  }

  return { type, vectorPathCount, imageCount, confidence };
}
