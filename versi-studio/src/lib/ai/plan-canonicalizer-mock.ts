/**
 * Versi Studio — Plan Canonicalizer MOCK (s25 Round A)
 *
 * Simulation sharp-only de `canonicalizePlan()` pour tests E2E locaux
 * SANS OpenAI key. Reproduit la signature et la shape du retour de
 * `plan-canonicalizer.ts` mais génère le canonical via un pipeline
 * local : greyscale → threshold → resize 1536×1024 → dilate léger.
 *
 * ⚠ CE N'EST PAS un canonical qualité prod.
 * Objectif : permettre à @qa de valider le pipeline downstream
 * (étape 2/3/calibration/OCR/extraction) avec un buffer ≠ original,
 * quand aucune clé OpenAI n'est disponible en environnement de test.
 *
 * Activation via `VS_USE_MOCK_CANONICAL=true` dans `extract/route.ts`.
 *
 * Pattern s24 : import dynamique sharp (évite crash Turbopack worker).
 */

import { createHash } from "node:crypto";

// ─── Types publics (alignés sur plan-canonicalizer.ts) ─────────────

export type CanonicalizeMockFallbackReason =
  | "timeout"
  | "sharp_error"
  | "empty_input";

export interface CanonicalizeMockResult {
  canonical: Buffer;
  duration: number;
  fallback: boolean;
  fallbackReason?: CanonicalizeMockFallbackReason;
  /** Modèle "virtuel" pour distinction en DB / logs. */
  model: "sharp-mock";
  /** Version fixe (le mock n'itère pas comme les vrais prompts). */
  promptVersion: "mock-1.0";
  inputHash: string;
  outputHash: string;
}

export interface CanonicalizeMockOptions {
  /** Timeout sharp pipeline (défaut 10s — aucun appel réseau). */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const CANONICAL_W = 1536;
const CANONICAL_H = 1024;

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function logEvent(event: string, payload: Record<string, unknown>): void {
  try {
    console.log(
      `[plan-canonicalizer-mock] ${event} ${JSON.stringify(payload)}`,
    );
  } catch {
    // noop
  }
}

/**
 * Décode un PDF en PNG (1ère page) si nécessaire.
 * Import dynamique comme dans le canonicalizer réel.
 */
async function pdfToPngIfNeeded(buf: Buffer): Promise<Buffer> {
  // Signature PDF : "%PDF" (0x25 0x50 0x44 0x46)
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
 * Pipeline sharp mock :
 * 1. Décoder PDF si besoin → PNG
 * 2. Greyscale + threshold 180 (binarise les traits)
 * 3. Resize 1536×1024 fit:inside background blanc (préserve aspect)
 * 4. Dilate léger (blur 0.5 + threshold 200) pour épaissir les traits
 *
 * Toutes les étapes via import dynamique sharp (pattern s24).
 */
async function runSharpPipeline(inputBuf: Buffer): Promise<Buffer> {
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

  // Étape 4 : dilate léger (blur + threshold) pour épaissir les traits binarisés
  const step2 = await sharp(step1)
    .blur(0.5)
    .threshold(200)
    .png()
    .toBuffer();

  return step2;
}

/** Race helper pour timeout. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
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

/**
 * Mock de `canonicalizePlan()` — ne throw JAMAIS, fallback silencieux.
 */
export async function canonicalizePlanMock(
  buf: Buffer,
  opts: CanonicalizeMockOptions = {},
): Promise<CanonicalizeMockResult> {
  const started = Date.now();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const inputHash = buf && buf.length > 0 ? sha256(buf) : "";

  if (!buf || buf.length === 0) {
    logEvent("fallback", { reason: "empty_input" });
    return {
      canonical: buf,
      duration: Date.now() - started,
      fallback: true,
      fallbackReason: "empty_input",
      model: "sharp-mock",
      promptVersion: "mock-1.0",
      inputHash,
      outputHash: inputHash,
    };
  }

  try {
    const canonical = await withTimeout(runSharpPipeline(buf), timeoutMs);
    const outputHash = sha256(canonical);
    logEvent("success", {
      inputHash,
      outputHash,
      duration_ms: Date.now() - started,
      bytes_out: canonical.length,
    });
    return {
      canonical,
      duration: Date.now() - started,
      fallback: false,
      model: "sharp-mock",
      promptVersion: "mock-1.0",
      inputHash,
      outputHash,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const reason: CanonicalizeMockFallbackReason = /timeout/i.test(msg)
      ? "timeout"
      : "sharp_error";
    logEvent("fallback", {
      reason,
      inputHash,
      error: msg,
      duration_ms: Date.now() - started,
    });
    return {
      canonical: buf,
      duration: Date.now() - started,
      fallback: true,
      fallbackReason: reason,
      model: "sharp-mock",
      promptVersion: "mock-1.0",
      inputHash,
      outputHash: inputHash,
    };
  }
}
