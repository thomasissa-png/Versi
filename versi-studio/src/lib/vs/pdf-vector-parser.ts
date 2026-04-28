/**
 * Module 2/5 — Parser PDF vectoriel (s27 refonte pipeline plan-extractor)
 *
 * Verbatim Thomas s27 : « tracé EXACTEMENT sur les lignes du lot ». Ce module
 * extrait les segments de tracé du PDF source via pdfjs-dist getOperatorList(),
 * sans régénération générative — c'est la vérité géométrique unique du PDF.
 *
 * Spec : docs/ia/s27-vs-pipeline-refonte-architecture.md (Module 2).
 *
 * Anti-pattern (learning P0 s27) : aucun fallback silencieux. Si le PDF n'est
 * pas vectoriel ou si le parsing échoue → throw PdfVectorParserError typée que
 * le caller route en erreur visible UI. L'investigation est faite à la source.
 *
 * Pattern import : `pdfjs-dist/legacy/build/pdf.mjs` (cf. pdf-type-detector.ts)
 * pour les polyfills Node (DOMMatrix, Path2D, ...).
 */

export type WallSegment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Épaisseur du trait en points PDF au moment du tracé (s27 fix #2 plan réel). */
  lineWidth?: number;
};

export type PdfVectorParseResult = {
  segments: WallSegment[];
  pageWidth: number;
  pageHeight: number;
  /** Facteur user-space → mm. 1 si non déterminable (user-space brut, ~1pt = 0.353mm). */
  unitMm: number;
};

export type PdfVectorParserErrorCode =
  | "buffer_empty"
  | "pdfjs_import_failed"
  | "parse_failed"
  | "no_pages"
  | "operator_list_failed"
  | "non_vectorial"
  | "zero_segments";

export class PdfVectorParserError extends Error {
  constructor(
    public readonly code: PdfVectorParserErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[${code}] ${message}`);
    this.name = "PdfVectorParserError";
  }
}

// Seuil de filtrage du bruit : segments < 5 unités user-space sont considérés
// comme cotes / hachures / texte vectorisé et exclus. À aligner sur la spec
// M2 (5 mm) post-calibration unitMm dans M4.
const MIN_SEGMENT_LENGTH_USER_SPACE = 5;

// 1pt PDF = 1/72 pouce = 25.4/72 mm ≈ 0.3528 mm. user-space par défaut = points.
const PT_TO_MM = 25.4 / 72;

/**
 * Extrait les segments de mur d'un PDF vectoriel via pdfjs-dist.
 *
 * Walk les opérateurs `OPS.constructPath` (pdfjs v5+) qui contient les
 * sous-opérateurs DrawOPS (moveTo=0, lineTo=1, curveTo=2, closePath=4)
 * + les coordonnées flat. Rectangle (re) → 4 segments. Bézier curveTo
 * approximé en chord (segment endpoint→endpoint) — suffisant pour murs
 * orthogonaux et arcs de portes (M5 traitera les arcs séparément).
 *
 * @throws PdfVectorParserError avec code typé en cas d'échec.
 */
export async function extractWallSegments(
  buffer: Buffer,
): Promise<PdfVectorParseResult> {
  if (!buffer || buffer.length === 0) {
    throw new PdfVectorParserError("buffer_empty", "Buffer PDF vide ou nul");
  }

  let pdfjs: typeof import("pdfjs-dist");
  try {
    pdfjs = (await import(
      "pdfjs-dist/legacy/build/pdf.mjs"
    )) as unknown as typeof import("pdfjs-dist");
  } catch (err) {
    throw new PdfVectorParserError(
      "pdfjs_import_failed",
      "Échec import pdfjs-dist",
      err,
    );
  }

  // s27 fix prod Replit — résolution robuste des assets pdfjs (cmaps + fonts).
  // Pattern aligné sur pdf-to-img mais avec fallback gracieux : si la résolution
  // échoue (cas SSR Next.js bundlé), on omet les options et pdfjs tente quand
  // même (peut throw sur certains PDF asiatiques mais marche sur PDF latins).
  let cMapUrl: string | undefined;
  let standardFontDataUrl: string | undefined;
  try {
    const { createRequire } = await import("node:module");
    const fs = await import("node:fs");
    const pdfjsPkg = createRequire(import.meta.url).resolve(
      "pdfjs-dist/package.json",
    );
    // Remonte au dossier pdfjs-dist
    const pdfjsRoot = pdfjsPkg.replace(/[\\/]package\.json$/, "");
    const cmapDir = `${pdfjsRoot}/cmaps/`;
    const fontDir = `${pdfjsRoot}/standard_fonts/`;
    if (fs.existsSync(cmapDir)) cMapUrl = cmapDir;
    if (fs.existsSync(fontDir)) standardFontDataUrl = fontDir;
  } catch {
    // SSR Next.js peut casser createRequire ou import.meta.url — on continue
    // sans cmaps/fonts, pdfjs gère gracieusement en interne sur PDF simples.
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
    throw new PdfVectorParserError(
      "parse_failed",
      "Échec parsing PDF (corrompu ou non-PDF)",
      err,
    );
  }

  if (pdfDoc.numPages < 1) {
    throw new PdfVectorParserError("no_pages", "PDF sans page");
  }

  const page = await pdfDoc.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const pageWidth = viewport.width;
  const pageHeight = viewport.height;

  let opList;
  try {
    opList = await page.getOperatorList();
  } catch (err) {
    throw new PdfVectorParserError(
      "operator_list_failed",
      "Échec lecture operatorList page 1",
      err,
    );
  }

  const OPS = pdfjs.OPS;
  const segments: WallSegment[] = [];

  // DrawOPS sub-codes inline dans args[1] de OPS.constructPath en pdfjs v5+.
  // Format observé : args = [drawType: number, paths: Object[], minMax: Object].
  // Chaque "path" est un objet à clés numériques (0, 1, 2, ...) contenant une
  // séquence : [opCode, ...payload, opCode, ...payload, ...]
  //   moveTo  = 0  (2 args : x, y)
  //   lineTo  = 1  (2 args : x, y)
  //   curveTo = 2  (6 args : cp1x, cp1y, cp2x, cp2y, x, y)  — Bézier cubique
  //   closePath = 4 (0 args)
  const DRAW_MOVE_TO = 0;
  const DRAW_LINE_TO = 1;
  const DRAW_CURVE_TO = 2;
  const DRAW_CLOSE_PATH = 4;

  const fns = opList.fnArray;
  const args = opList.argsArray;

  // CTM courante (matrice 2D affine [a, b, c, d, e, f]). Démarre identité.
  // À chaque OPS.transform, on concatène. Sauvegardée/restaurée via save/restore.
  let ctm: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 0];
  const ctmStack: typeof ctm[] = [];
  // s27 fix #2 — tracking lineWidth pour filtrer murs vs mobilier/cotes
  // (distribution typique plans archi : murs ≥ 1.0pt, mobilier 0.24-0.85pt).
  let currentLineWidth = 1; // default PDF
  const lineWidthStack: number[] = [];

  for (let i = 0; i < fns.length; i++) {
    const op = fns[i];
    const a = args[i];

    if (op === OPS.save) {
      ctmStack.push([...ctm] as typeof ctm);
      lineWidthStack.push(currentLineWidth);
    } else if (op === OPS.restore) {
      const popped = ctmStack.pop();
      if (popped) ctm = popped;
      const lw = lineWidthStack.pop();
      if (lw !== undefined) currentLineWidth = lw;
    } else if (op === OPS.transform && Array.isArray(a) && a.length >= 6) {
      ctm = multiplyCtm(ctm, [a[0], a[1], a[2], a[3], a[4], a[5]]);
    } else if (op === OPS.setLineWidth && Array.isArray(a) && a.length >= 1) {
      currentLineWidth = Number(a[0]) || currentLineWidth;
    } else if (op === OPS.constructPath && Array.isArray(a)) {
      // a[1] = tableau de "path objects" (objets à clés numériques).
      const paths = a[1];
      if (!Array.isArray(paths)) continue;

      for (const pathObj of paths) {
        if (!pathObj || typeof pathObj !== "object") continue;
        const seq = toFlatArray(pathObj);
        let cx = 0;
        let cy = 0;
        let startX = 0;
        let startY = 0;
        let k = 0;
        while (k < seq.length) {
          const sub = seq[k++];
          if (sub === DRAW_MOVE_TO) {
            cx = seq[k++];
            cy = seq[k++];
            startX = cx;
            startY = cy;
          } else if (sub === DRAW_LINE_TO) {
            const nx = seq[k++];
            const ny = seq[k++];
            pushSegmentCtm(segments, ctm, cx, cy, nx, ny, currentLineWidth);
            cx = nx;
            cy = ny;
          } else if (sub === DRAW_CURVE_TO) {
            // Bézier cubique : skip cp1, cp2, garder endpoint (chord).
            k += 4;
            const nx = seq[k++];
            const ny = seq[k++];
            pushSegmentCtm(segments, ctm, cx, cy, nx, ny, currentLineWidth);
            cx = nx;
            cy = ny;
          } else if (sub === DRAW_CLOSE_PATH) {
            if (cx !== startX || cy !== startY) {
              pushSegmentCtm(segments, ctm, cx, cy, startX, startY, currentLineWidth);
              cx = startX;
              cy = startY;
            }
          } else {
            // Sous-op inconnu — on stoppe le parsing de ce path pour éviter
            // une mauvaise lecture des coords.
            break;
          }
        }
      }
    } else if (op === OPS.rectangle && Array.isArray(a) && a.length >= 4) {
      // Compatibilité versions antérieures où re est top-level.
      const [x, y, w, h] = a;
      pushSegmentCtm(segments, ctm, x, y, x + w, y, currentLineWidth);
      pushSegmentCtm(segments, ctm, x + w, y, x + w, y + h, currentLineWidth);
      pushSegmentCtm(segments, ctm, x + w, y + h, x, y + h, currentLineWidth);
      pushSegmentCtm(segments, ctm, x, y + h, x, y, currentLineWidth);
    }
  }

  if (segments.length === 0) {
    // Soit PDF non vectoriel (bitmap pur), soit zéro tracé exploitable.
    // On distingue : si zéro op constructPath/rectangle observé → non_vectorial.
    const hasAnyPathOp = fns.some(
      (op) => op === OPS.constructPath || op === OPS.rectangle,
    );
    if (!hasAnyPathOp) {
      throw new PdfVectorParserError(
        "non_vectorial",
        "Aucun opérateur de tracé dans le PDF (bitmap pur ou page vide)",
      );
    }
    throw new PdfVectorParserError(
      "zero_segments",
      "Opérateurs de tracé présents mais zéro segment exploitable après filtrage",
    );
  }

  // user-space pdfjs = points PDF par défaut (sauf CTM custom).
  // unitMm = facteur conversion. Si pas de calibration → 1pt → mm via PT_TO_MM.
  const unitMm = PT_TO_MM;

  return { segments, pageWidth, pageHeight, unitMm };
}

function pushSegmentCtm(
  out: WallSegment[],
  ctm: [number, number, number, number, number, number],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  lineWidth?: number,
) {
  const [a, b, c, d, e, f] = ctm;
  const tx1 = a * x1 + c * y1 + e;
  const ty1 = b * x1 + d * y1 + f;
  const tx2 = a * x2 + c * y2 + e;
  const ty2 = b * x2 + d * y2 + f;
  const dx = tx2 - tx1;
  const dy = ty2 - ty1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < MIN_SEGMENT_LENGTH_USER_SPACE) return;
  out.push({ x1: tx1, y1: ty1, x2: tx2, y2: ty2, lineWidth });
}

/**
 * Filtre les segments murs par épaisseur de trait minimale.
 *
 * Distribution typique d'un plan archi (mesurée empiriquement sur Muguets RDC
 * P-03 le 2026-04-27) :
 * - 0.24-0.85 pt : mobilier, cotes, hachures, pictos (~70-80% des segments)
 * - 1.0+ pt      : murs intérieurs et extérieurs (~10-30%)
 *
 * Le seuil par défaut 1.0 pt est conservateur pour ne pas perdre des murs fins.
 * Tunable via `VS_WALL_MIN_LINEWIDTH` côté caller.
 */
export function filterWallsByLineWidth(
  segments: WallSegment[],
  minLineWidth = 1.0,
): WallSegment[] {
  return segments.filter((s) => (s.lineWidth ?? 0) >= minLineWidth);
}

/**
 * Multiplie deux matrices affines 2D (format pdfjs [a,b,c,d,e,f]).
 * Convention : new_ctm = current_ctm × incoming (incoming s'applique en premier).
 */
function multiplyCtm(
  m1: [number, number, number, number, number, number],
  m2: [number, number, number, number, number, number],
): [number, number, number, number, number, number] {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

/**
 * Convertit un objet pdfjs à clés numériques ({0: ..., 1: ..., ...}) en array plat.
 * Les paths constructPath stockent leurs séquences inline ainsi.
 */
function toFlatArray(obj: Record<string, unknown> | object): number[] {
  if (Array.isArray(obj)) return obj as number[];
  const result: number[] = [];
  let i = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = obj as any;
  while (i in o) {
    result.push(o[i] as number);
    i++;
  }
  return result;
}
