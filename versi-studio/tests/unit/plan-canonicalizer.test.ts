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
  mode: "success" | "timeout" | "error" | "empty";
  delayMs?: number;
  outputBytes?: Buffer;
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
        return await new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            if (openAIControl.mode === "success") {
              const b = openAIControl.outputBytes ?? Buffer.from("canonical-png");
              resolve({ data: [{ b64_json: b.toString("base64") }] });
            } else if (openAIControl.mode === "error") {
              reject(new Error("API error mock"));
            } else if (openAIControl.mode === "empty") {
              resolve({ data: [{}] });
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
  sharpControl.forceGateFail = false;
  sharpControl.width = 512;
  process.env.OPENAI_API_KEY = "sk-test-valid-not-placeholder";
});

// ─── Tests ─────────────────────────────────────────────────────────

describe("canonicalizePlan — happy path", () => {
  it("retourne un buffer canonique avec fallback=false et gates OK", async () => {
    const input = makeBuffer();
    const res = await canonicalizePlan(input, { timeoutMs: 500 });
    expect(res.fallback).toBe(false);
    expect(res.canonical).toBeInstanceOf(Buffer);
    expect(res.canonical.length).toBeGreaterThan(0);
    expect(res.model).toBe("gpt-image-1");
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
