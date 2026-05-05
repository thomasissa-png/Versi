/**
 * Tests unitaires — POST /api/vs/projects/[id]/visuals/generate (s30 Vague 2)
 *
 * Couvre :
 *  - 400 si projectId pas un UUID
 *  - 400 si style_id manquant ou invalide
 *  - 404 si projet introuvable
 *  - 409 si questions T1-T5 pendantes (preflight pas passé)
 *  - 409 si un job 'pending'/'running' existe déjà (anti-double-déclenchement)
 *  - 400 si aucune pièce active (target=0 partout)
 *  - 202 succès + job_id + expected_count + estimated_cost_usd
 *
 * Mocks : ensureDbReady, query, hasBlockingQuestions, createVisualJob, runVisualJob.
 *
 * Source test plan §3 (S2) — version unitaire de la route.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks (hoisted) ──────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  queryMock: vi.fn(),
  hasBlockingMock: vi.fn(),
  createJobMock: vi.fn(),
  runJobMock: vi.fn(async () => {}),
}));

vi.mock("@/lib/vs/db", () => ({
  query: mocks.queryMock,
  ensureDbReady: vi.fn(async () => {}),
  withTransaction: vi.fn(),
}));

vi.mock("@/lib/vs/ambiguity-detector", () => ({
  hasBlockingQuestions: mocks.hasBlockingMock,
}));

vi.mock("@/lib/vs/visual-job-runner", () => ({
  createVisualJob: mocks.createJobMock,
  runVisualJob: mocks.runJobMock,
  estimateJobCost: (n: number) => Number((n * 0.04 + Math.ceil(n / 5) * 0.001).toFixed(3)),
}));

import { POST } from "@/app/api/vs/projects/[id]/visuals/generate/route";

const { queryMock, hasBlockingMock, createJobMock, runJobMock } = mocks;

// ─── Helpers ───────────────────────────────────────────────────────

const VALID_UUID = "11111111-2222-3333-4444-555555555555";

function buildRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/vs/projects/x/visuals/generate", {
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
  hasBlockingMock.mockReset();
  createJobMock.mockReset();
  runJobMock.mockClear();
});

// ─── Tests ─────────────────────────────────────────────────────────

describe("POST /visuals/generate — validation entrée", () => {
  it("retourne 400 si projectId pas un UUID", async () => {
    const res = await POST(buildRequest({ style_id: "scandinave" }), buildParams("nope"));
    expect(res.status).toBe(400);
  });

  it("retourne 400 si style_id manquant", async () => {
    const res = await POST(buildRequest({}), buildParams(VALID_UUID));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/style_id invalide/i);
  });

  it("retourne 400 si style_id inconnu", async () => {
    const res = await POST(
      buildRequest({ style_id: "kitsch-tropical-fluo" }),
      buildParams(VALID_UUID)
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /visuals/generate — projet introuvable", () => {
  it("retourne 404 si vs_projects ne contient pas l'id", async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await POST(buildRequest({ style_id: "scandinave" }), buildParams(VALID_UUID));
    expect(res.status).toBe(404);
  });
});

describe("POST /visuals/generate — pré-conditions métier", () => {
  it("retourne 409 si questions T1-T5 pendantes (preflight non passé)", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: VALID_UUID }], rowCount: 1 }); // projet existe
    hasBlockingMock.mockResolvedValueOnce(true);

    const res = await POST(buildRequest({ style_id: "scandinave" }), buildParams(VALID_UUID));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toMatch(/préflight requis/i);
    // runJob NE doit PAS être appelé
    expect(runJobMock).not.toHaveBeenCalled();
  });

  it("retourne 409 si un job pending/running existe déjà", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: VALID_UUID }], rowCount: 1 }); // projet existe
    hasBlockingMock.mockResolvedValueOnce(false);
    queryMock.mockResolvedValueOnce({ rows: [{ id: "existing-job" }], rowCount: 1 }); // job en cours

    const res = await POST(buildRequest({ style_id: "scandinave" }), buildParams(VALID_UUID));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toMatch(/job de génération est déjà en cours/i);
    expect(runJobMock).not.toHaveBeenCalled();
  });

  it("retourne 400 si aucune pièce active (SUM target_visual_count = 0)", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: VALID_UUID }], rowCount: 1 }); // projet existe
    hasBlockingMock.mockResolvedValueOnce(false);
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // pas de job en cours
    queryMock.mockResolvedValueOnce({ rows: [{ total: "0" }], rowCount: 1 }); // sum = 0

    const res = await POST(buildRequest({ style_id: "scandinave" }), buildParams(VALID_UUID));
    expect(res.status).toBe(400);
    const json = await res.json();
    // s32 (autopilot) : message reformulé "Aucune pièce à générer.
    // Configurez au moins une pièce avant de lancer la génération."
    expect(json.error).toMatch(/aucune pièce/i);
  });
});

describe("POST /visuals/generate — succès 202", () => {
  it("retourne 202 + job_id + expected_count + estimated_cost_usd", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: VALID_UUID }], rowCount: 1 }); // projet existe
    hasBlockingMock.mockResolvedValueOnce(false);
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // pas de job en cours
    queryMock.mockResolvedValueOnce({ rows: [{ total: "5" }], rowCount: 1 }); // 5 visuels attendus
    createJobMock.mockResolvedValueOnce({ job_id: "job-uuid-abc", estimated_cost_usd: 0.201 });

    const res = await POST(buildRequest({ style_id: "scandinave" }), buildParams(VALID_UUID));
    expect(res.status).toBe(202);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.job_id).toBe("job-uuid-abc");
    expect(json.data.expected_count).toBe(5);
    expect(typeof json.data.estimated_cost_usd).toBe("number");
    // Fire-and-forget : runVisualJob a été déclenché avec les bons paramètres
    expect(runJobMock).toHaveBeenCalledWith({
      job_id: "job-uuid-abc",
      project_id: VALID_UUID,
      style_id: "scandinave",
    });
  });
});

describe("POST /visuals/generate — gestion erreur", () => {
  it("retourne 500 si createVisualJob throw", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: VALID_UUID }], rowCount: 1 });
    hasBlockingMock.mockResolvedValueOnce(false);
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    queryMock.mockResolvedValueOnce({ rows: [{ total: "5" }], rowCount: 1 });
    createJobMock.mockRejectedValueOnce(new Error("uniq violation race"));

    const res = await POST(buildRequest({ style_id: "scandinave" }), buildParams(VALID_UUID));
    expect(res.status).toBe(500);
  });
});
