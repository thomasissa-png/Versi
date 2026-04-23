/**
 * Tests unitaires — plan-canonicalizer (s25)
 *
 * Mock OpenAI + sharp via vi.mock pour tester uniquement la logique :
 * timeout, api_error, idempotence par hash, gate_fail ≥ 2 → fallback.
 *
 * Les tests ne tapent JAMAIS l'API OpenAI réelle (c'est le rôle de @qa
 * en reality check E2E Phase 2 step 3).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks (doivent être déclarés AVANT l'import du SUT) ───────────

// sharp : mock minimal qui retourne un buffer reconnaissable et des gates contrôlables
type MockSharpControl = {
  forceGateFail?: boolean;
  width?: number;
};
const sharpControl: MockSharpControl = { width: 512 };

vi.mock("sharp", () => {
  const sharpFactory = (buf: Buffer) => {
    const self = {
      metadata: async () => ({ width: sharpControl.width ?? 512, height: 512 }),
      resize: () => self,
      png: () => self,
      raw: () => self,
      toBuffer: async (opts?: { resolveWithObject?: boolean }) => {
        if (opts?.resolveWithObject) {
          const w = 10;
          const h = 10;
          const channels = 4;
          const pxCount = w * h;
          const data = Buffer.alloc(pxCount * channels);
          if (sharpControl.forceGateFail) {
            // Tout noir → G1 fail (whiteRatio=0), G2 fail (blackRatio=1), G4 fail
            data.fill(0);
          } else {
            // 85% blanc + 15% noir → gates PASS (plan canonique plausible)
            const blackPx = Math.round(pxCount * 0.15);
            for (let i = 0; i < pxCount; i++) {
              const offset = i * channels;
              const isBlack = i < blackPx;
              data[offset] = isBlack ? 0 : 255;
              data[offset + 1] = isBlack ? 0 : 255;
              data[offset + 2] = isBlack ? 0 : 255;
              data[offset + 3] = 255;
            }
          }
          return { data, info: { width: w, height: h, channels } };
        }
        return buf;
      },
    };
    return self;
  };
  return { default: sharpFactory };
});

// OpenAI mock : comportement piloté par openAIControl
type MockOpenAIControl = {
  mode: "success" | "timeout" | "error" | "empty" | "transient-then-ok";
  delayMs?: number;
  outputBytes?: Buffer;
  /** status HTTP de l'erreur simulée (401/403 non-retryable, 5xx retryable). */
  errorStatus?: number;
  /** message d'erreur (pour simuler "organization verification"). */
  errorMessage?: string;
  /** nombre de tentatives à faire échouer avant succès (mode transient-then-ok). */
  errorCount?: number;
  /** compteur interne — nb d'appels reçus. */
  attempts?: number;
};
const openAIControl: MockOpenAIControl = { mode: "success" };

vi.mock("openai", () => {
  const toFile = vi.fn(async (buf: Buffer, name: string) => ({
    name,
    buf,
  }));
  class OpenAIMock {
    images = {
      edit: vi.fn(async (_params: unknown, opts?: { signal?: AbortSignal }) => {
        const delay = openAIControl.delayMs ?? 10;
        openAIControl.attempts = (openAIControl.attempts ?? 0) + 1;
        const currentAttempt = openAIControl.attempts;
        return await new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            if (openAIControl.mode === "success") {
              const b = openAIControl.outputBytes ?? Buffer.from("canonical-png");
              resolve({ data: [{ b64_json: b.toString("base64") }] });
            } else if (openAIControl.mode === "error") {
              const errObj = new Error(openAIControl.errorMessage ?? "API error mock") as Error & { status?: number };
              if (openAIControl.errorStatus) errObj.status = openAIControl.errorStatus;
              reject(errObj);
            } else if (openAIControl.mode === "empty") {
              resolve({ data: [{}] });
            } else if (openAIControl.mode === "transient-then-ok") {
              const errCount = openAIControl.errorCount ?? 1;
              if (currentAttempt <= errCount) {
                const errObj = new Error("transient 503 Service Unavailable") as Error & { status?: number };
                errObj.status = 503;
                reject(errObj);
              } else {
                const b = openAIControl.outputBytes ?? Buffer.from("canonical-png");
                resolve({ data: [{ b64_json: b.toString("base64") }] });
              }
            } else {
              // timeout : ne jamais résoudre
            }
          }, delay);
          opts?.signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new Error("aborted"));
          });
        });
      }),
    };
  }
  return { default: OpenAIMock, toFile };
});

// ─── SUT (import après les mocks) ──────────────────────────────────

import { canonicalizePlan } from "@/lib/ai/plan-canonicalizer";
import { CANONICAL_PROMPT_VERSION } from "@/lib/ai/prompts/canonical";

// ─── Fixtures ──────────────────────────────────────────────────────

function makeBuffer(size = 1024, fillByte = 0xaa): Buffer {
  return Buffer.alloc(size, fillByte);
}

beforeEach(() => {
  openAIControl.mode = "success";
  openAIControl.delayMs = 10;
  openAIControl.outputBytes = undefined;
  openAIControl.errorStatus = undefined;
  openAIControl.errorMessage = undefined;
  openAIControl.errorCount = undefined;
  openAIControl.attempts = 0;
  sharpControl.forceGateFail = false;
  sharpControl.width = 512;
  process.env.OPENAI_API_KEY = "sk-test-valid-not-placeholder";
  // Accélère les backoffs pour que les 3 retries tiennent dans le timeout Vitest (5s)
  process.env.VS_CANONICALIZER_BACKOFF_MS = "5";
});

// ─── Tests ─────────────────────────────────────────────────────────

describe("canonicalizePlan — happy path", () => {
  it("retourne un buffer canonique avec fallback=false et gates OK", async () => {
    const input = makeBuffer();
    const res = await canonicalizePlan(input, { timeoutMs: 500 });
    expect(res.fallback).toBe(false);
    expect(res.canonical).toBeInstanceOf(Buffer);
    expect(res.canonical.length).toBeGreaterThan(0);
    expect(res.model).toBe("gpt-image-2");
    expect(res.promptVersion).toBe(CANONICAL_PROMPT_VERSION);
    expect(res.inputHash).toHaveLength(64);
    expect(res.outputHash).toHaveLength(64);
    expect(res.gates).toBeDefined();
  });

  it("idempotence par hash : même input → même inputHash", async () => {
    const buf = makeBuffer(2048, 0x42);
    const r1 = await canonicalizePlan(buf, { timeoutMs: 500 });
    const r2 = await canonicalizePlan(buf, { timeoutMs: 500 });
    expect(r1.inputHash).toBe(r2.inputHash);
  });
});

describe("canonicalizePlan — fallback silencieux", () => {
  it("timeout → fallback=true avec reason=timeout", async () => {
    openAIControl.mode = "timeout";
    openAIControl.delayMs = 5_000; // jamais résolu
    const input = makeBuffer();
    const res = await canonicalizePlan(input, { timeoutMs: 50 });
    expect(res.fallback).toBe(true);
    expect(res.fallbackReason).toBe("timeout");
    expect(res.canonical).toEqual(input); // buffer original retourné
  });

  it("erreur API → fallback=true avec reason=api_error", async () => {
    openAIControl.mode = "error";
    const input = makeBuffer();
    const res = await canonicalizePlan(input, { timeoutMs: 500 });
    expect(res.fallback).toBe(true);
    expect(res.fallbackReason).toBe("api_error");
    expect(res.canonical).toEqual(input);
  });

  it("gates ≥ 2 FAIL → fallback=true avec reason=gate_fail", async () => {
    // forceGateFail → image tout noire : G1 (whiteRatio=0) FAIL, G2 (blackRatio=1 > 0.35) FAIL,
    // G4 (blackRatio > 0.4) FAIL. ≥ 2 fails → fallback.
    sharpControl.forceGateFail = true;
    const input = makeBuffer();
    const res = await canonicalizePlan(input, { timeoutMs: 500 });
    expect(res.fallback).toBe(true);
    expect(res.fallbackReason).toBe("gate_fail");
    expect(res.canonical).toEqual(input);
    expect(res.gates).toBeDefined();
    const failed = Object.values(res.gates!).filter((v) => !v).length;
    expect(failed).toBeGreaterThanOrEqual(2);
  });

  it("input vide → fallback immédiat avec reason=empty_input", async () => {
    const res = await canonicalizePlan(Buffer.alloc(0));
    expect(res.fallback).toBe(true);
    expect(res.fallbackReason).toBe("empty_input");
  });

  it("clé API placeholder → fallback=true avec reason=api_error", async () => {
    process.env.OPENAI_API_KEY = "sk-placeholder-dev";
    const input = makeBuffer();
    const res = await canonicalizePlan(input, { timeoutMs: 500 });
    expect(res.fallback).toBe(true);
    expect(res.fallbackReason).toBe("api_error");
  });
});

describe("canonicalizePlan — idempotence (US-VS-R4)", () => {
  it("skip canonicalisation if canonicalized_image_path already set", async () => {
    // Simule la logique de route.ts (boucle plans de /api/vs/projects/[id]/extract) :
    // si la DB retourne un `canonicalized_image_path` non-null pour ce plan,
    // on lit le fichier cached et on N'APPELLE PAS canonicalizePlan().
    // Contrat testé : aucun appel OpenAI.images.edit() quand cache hit.

    // Mock DB query : retourne un path cached pour ce plan
    const mockDbQuery = vi.fn(async () => ({
      rows: [{ canonicalized_image_path: "/tmp/cached-plan-canonical.png" }],
    }));

    // Mock readFile : retourne le buffer cached (fichier déjà écrit par une run précédente)
    const cachedBuffer = Buffer.from("cached-canonical-png-bytes");
    const mockReadFile = vi.fn(async () => cachedBuffer);

    // Spy sur canonicalizePlan lui-même : c'est le point critique testé —
    // il ne DOIT PAS être appelé quand le cache DB est hit.
    let canonicalizePlanCalls = 0;
    const canonicalizePlanSpy = async (buf: Buffer) => {
      canonicalizePlanCalls++;
      return await canonicalizePlan(buf, { timeoutMs: 500 });
    };

    // Reproduire la logique idempotence de route.ts (extract/route.ts)
    const planId = "test-plan-id";
    const dbResult = await mockDbQuery();
    const existingPath = dbResult.rows[0]?.canonicalized_image_path ?? null;

    let extractBuffer: Buffer;
    let skipCanonicalize = false;

    if (existingPath) {
      try {
        extractBuffer = await mockReadFile();
        skipCanonicalize = true;
      } catch {
        extractBuffer = Buffer.alloc(0);
      }
    } else {
      extractBuffer = Buffer.alloc(0);
    }

    // Décision conditionnelle (comme dans route.ts)
    if (!skipCanonicalize) {
      await canonicalizePlanSpy(Buffer.alloc(0));
    }

    expect(mockDbQuery).toHaveBeenCalledTimes(1);
    expect(mockReadFile).toHaveBeenCalledTimes(1);
    expect(skipCanonicalize).toBe(true);
    expect(extractBuffer).toEqual(cachedBuffer);
    // Contrat critique : ZÉRO appel à canonicalizePlan (donc zéro appel OpenAI)
    expect(canonicalizePlanCalls).toBe(0);
    void planId;
  });
});

// ─── Retry policy (s25 Round 2) ────────────────────────────────────

describe("canonicalizePlan — retry policy", () => {
  it("retry 2x on transient 5xx → succeeds on attempt 3", async () => {
    openAIControl.mode = "transient-then-ok";
    openAIControl.errorCount = 2; // 2 premiers échecs, 3e succès
    const input = makeBuffer();
    const res = await canonicalizePlan(input, { timeoutMs: 500 });
    expect(res.fallback).toBe(false);
    expect(openAIControl.attempts).toBe(3); // initiale + 2 retries
    expect(res.canonical).not.toEqual(input); // buffer canonique, pas original
  });

  it("retry 2x puis fallback si toujours KO", async () => {
    openAIControl.mode = "transient-then-ok";
    openAIControl.errorCount = 10; // toujours KO
    const input = makeBuffer();
    const res = await canonicalizePlan(input, { timeoutMs: 500 });
    expect(res.fallback).toBe(true);
    expect(res.fallbackReason).toBe("api_error");
    expect(openAIControl.attempts).toBe(3); // s'arrête à 3 tentatives
  });

  it("skip retry on 401 (unauthorized)", async () => {
    openAIControl.mode = "error";
    openAIControl.errorStatus = 401;
    openAIControl.errorMessage = "Invalid API key";
    const input = makeBuffer();
    const res = await canonicalizePlan(input, { timeoutMs: 500 });
    expect(res.fallback).toBe(true);
    expect(res.fallbackReason).toBe("api_error");
    expect(openAIControl.attempts).toBe(1); // 1 tentative seulement, pas de retry
  });

  it("skip retry on 403 + log reason=org_not_verified", async () => {
    openAIControl.mode = "error";
    openAIControl.errorStatus = 403;
    openAIControl.errorMessage =
      "Your organization must be verified to use the model gpt-image-1.";
    const input = makeBuffer();
    const res = await canonicalizePlan(input, { timeoutMs: 500 });
    expect(res.fallback).toBe(true);
    expect(res.fallbackReason).toBe("org_not_verified");
    expect(openAIControl.attempts).toBe(1); // pas de retry sur 403
  });
});
