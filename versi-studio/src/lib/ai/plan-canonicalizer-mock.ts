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
import {
  runSharpCanonicalPipeline,
  withSharpTimeout,
} from "./plan-canonicalizer-sharp";

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
 * Mock de `canonicalizePlan()` — ne throw JAMAIS, fallback silencieux.
 *
 * Le pipeline sharp est mutualisé via `plan-canonicalizer-sharp.ts`
 * (également utilisé par `plan-canonicalizer.ts` en fallback déterministe s27).
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
    const canonical = await withSharpTimeout(
      runSharpCanonicalPipeline(buf),
      timeoutMs,
    );
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
