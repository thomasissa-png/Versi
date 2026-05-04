/**
 * Tests unitaires — POST /api/vs/projects/[id]/preflight (s30 Vague 2 backend)
 *
 * Couvre :
 *  - 400 si projectId pas un UUID valide
 *  - 400 si style_id manquant ou invalide
 *  - 404 si projet introuvable
 *  - 200 + ready_for_generation=true si aucune question pendante
 *  - 200 + questions[] si triggers T1-T5 détectés
 *  - 500 si detectAmbiguities throw
 *
 * Mocks : ensureDbReady, query, detectAmbiguities, fs/readFile.
 *
 * Source test plan §3 (S3, S4, S5, S6, S7) — version unitaire de la route.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks (hoisted) ──────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  queryMock: vi.fn(),
  detectMock: vi.fn(),
  readFileMock: vi.fn(),
}));

vi.mock("@/lib/vs/db", () => ({
  query: mocks.queryMock,
  ensureDbReady: vi.fn(async () => {}),
  withTransaction: vi.fn(),
}));

vi.mock("@/lib/vs/ambiguity-detector", () => ({
  detectAmbiguities: mocks.detectMock,
}));

vi.mock("node:fs/promises", () => ({
  readFile: mocks.readFileMock,
}));

import { POST } from "@/app/api/vs/projects/[id]/preflight/route";

const { queryMock, detectMock } = mocks;

// ─── Helpers ───────────────────────────────────────────────────────

const VALID_UUID = "11111111-2222-3333-4444-555555555555";

function buildRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/vs/projects/x/preflight", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function buildParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  queryMock.mockReset();
  detectMock.mockReset();
});

// ─── Tests ─────────────────────────────────────────────────────────

describe("POST /preflight — validation entrée", () => {
  it("retourne 400 si projectId n'est pas un UUID", async () => {
    const res = await POST(buildRequest({ style_id: "scandinave" }), buildParams("not-a-uuid"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/identifiant projet invalide/i);
  });

  it("retourne 400 si style_id manquant", async () => {
    const res = await POST(buildRequest({}), buildParams(VALID_UUID));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/style_id invalide/i);
  });

  it("retourne 400 si style_id inconnu (non listé dans STYLES)", async () => {
    const res = await POST(
      buildRequest({ style_id: "style-inexistant-xyz" }),
      buildParams(VALID_UUID)
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/style_id invalide/i);
  });
});

describe("POST /preflight — projet introuvable", () => {
  it("retourne 404 si vs_projects ne contient pas l'id", async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await POST(buildRequest({ style_id: "scandinave" }), buildParams(VALID_UUID));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/projet introuvable/i);
  });
});

describe("POST /preflight — happy path", () => {
  it("retourne 200 + ready_for_generation=true si aucune question pendante", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: VALID_UUID }], rowCount: 1 }); // projet existe
    detectMock.mockResolvedValueOnce([]);

    const res = await POST(buildRequest({ style_id: "scandinave" }), buildParams(VALID_UUID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.ready_for_generation).toBe(true);
    expect(json.data.questions).toEqual([]);
    expect(detectMock).toHaveBeenCalledWith(
      VALID_UUID,
      expect.objectContaining({ styleId: "scandinave" })
    );
  });

  it("retourne 200 + questions[] + ready=false si T1-T5 détectés", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: VALID_UUID }], rowCount: 1 });
    detectMock.mockResolvedValueOnce([
      {
        id: "q1",
        project_id: VALID_UUID,
        room_id: "r1",
        trigger_type: "surface_aberrante",
        question_text: "La surface détectée est 3 m² pour Salon",
        status: "asked",
        asked_at: new Date().toISOString(),
      },
    ]);

    const res = await POST(buildRequest({ style_id: "scandinave" }), buildParams(VALID_UUID));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.ready_for_generation).toBe(false);
    expect(json.data.questions).toHaveLength(1);
    expect(json.data.questions[0].trigger_type).toBe("surface_aberrante");
  });

  it("idempotent : 2 appels successifs identiques retournent les mêmes questions (NOT EXISTS côté SQL)", async () => {
    // 1er call
    queryMock.mockResolvedValueOnce({ rows: [{ id: VALID_UUID }], rowCount: 1 });
    detectMock.mockResolvedValueOnce([
      { id: "q1", project_id: VALID_UUID, room_id: "r1", trigger_type: "surface_aberrante", question_text: "...", status: "asked", asked_at: "" },
    ]);
    const r1 = await POST(buildRequest({ style_id: "scandinave" }), buildParams(VALID_UUID));
    const j1 = await r1.json();

    // 2e call : detectAmbiguities est idempotent côté SQL — il retourne la MÊME question
    queryMock.mockResolvedValueOnce({ rows: [{ id: VALID_UUID }], rowCount: 1 });
    detectMock.mockResolvedValueOnce([
      { id: "q1", project_id: VALID_UUID, room_id: "r1", trigger_type: "surface_aberrante", question_text: "...", status: "asked", asked_at: "" },
    ]);
    const r2 = await POST(buildRequest({ style_id: "scandinave" }), buildParams(VALID_UUID));
    const j2 = await r2.json();

    expect(j1.data.questions[0].id).toBe(j2.data.questions[0].id);
    expect(j2.data.questions).toHaveLength(1);
  });
});

describe("POST /preflight — gestion erreur", () => {
  it("retourne 500 si detectAmbiguities throw", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: VALID_UUID }], rowCount: 1 });
    detectMock.mockRejectedValueOnce(new Error("OpenAI down"));

    const res = await POST(buildRequest({ style_id: "scandinave" }), buildParams(VALID_UUID));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/préflight/i);
  });
});
