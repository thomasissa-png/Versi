/**
 * Tests unitaires — POST /api/vs/visuals/[id]/regenerate (s30 EC-5)
 *
 * Couvre :
 *  - 400 si visualId pas un UUID
 *  - 404 si visuel introuvable
 *  - 422 si secondaire mais signature ancre absente
 *  - 503 si OPENAI_API_KEY non configurée
 *  - 200 régénération ancre : nouveau prompt, kind='anchor'
 *  - 200 régénération secondaire : kind='secondary', prompt avec signature
 *  - UPDATE in-place (préserve photo_id, anchor_visual_id) → vérifié via params SQL
 *
 * Mocks : ensureDbReady, query, visual-storage, photo-preprocessor, OpenAI, fs.
 *
 * Source test plan §3 (S8 — EC-5 régénération individuelle).
 */

import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks (hoisted) ──────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  queryMock: vi.fn(),
  storeMock: vi.fn(async () => "/tmp/store/regen-x.png"),
  loadVisualMock: vi.fn(async () => Buffer.from("fake-anchor-image")),
  preprocessMock: vi.fn(async () => ({
    buffer: Buffer.alloc(1024, 0xff),
    mime_type: "image/jpeg",
    width: 1920,
    height: 1080,
    warnings: [],
    exif: { taken_at: null, raw: null },
  })),
  acquireMock: vi.fn(async () => {}),
  buildAnchorMock: vi.fn(() => "ANCHOR_PROMPT"),
  buildSecondaryMock: vi.fn(() => "SECONDARY_PROMPT_WITH_SIGNATURE"),
  editMock: vi.fn(),
  readFileMock: vi.fn(async () => Buffer.alloc(2048, 0xff)),
}));

vi.mock("@/lib/vs/db", () => ({
  query: mocks.queryMock,
  ensureDbReady: vi.fn(async () => {}),
  withTransaction: vi.fn(),
}));

vi.mock("@/lib/vs/visual-storage", () => ({
  storeVisualImage: mocks.storeMock,
  loadVisualImage: mocks.loadVisualMock,
}));

vi.mock("@/lib/vs/photo-preprocessor", () => ({
  preprocessPhoto: mocks.preprocessMock,
}));

vi.mock("@/lib/vs/openai-rate-limiter", () => ({
  imagesEditLimiter: { acquireToken: mocks.acquireMock },
}));

vi.mock("@/lib/vs/visual-generator", () => ({
  buildVisualPromptAnchor: mocks.buildAnchorMock,
  buildVisualPromptSecondary: mocks.buildSecondaryMock,
}));

vi.mock("openai", () => ({
  default: class {
    images = { edit: mocks.editMock };
  },
  toFile: vi.fn(async (buf: Buffer, name: string, opts: { type: string }) => ({
    __mockFile: true, name, type: opts.type, size: buf.length,
  })),
}));

vi.mock("node:fs/promises", () => ({
  readFile: mocks.readFileMock,
}));

import { POST } from "@/app/api/vs/visuals/[id]/regenerate/route";

const {
  queryMock, storeMock, loadVisualMock, preprocessMock,
  buildAnchorMock, buildSecondaryMock, editMock,
} = mocks;

// ─── Helpers ───────────────────────────────────────────────────────

const VALID_UUID = "11111111-2222-3333-4444-555555555555";

function buildRequest(): NextRequest {
  return new NextRequest("http://localhost/api/vs/visuals/x/regenerate", { method: "POST" });
}

function buildParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

const ENV_BACKUP = process.env.OPENAI_API_KEY;

beforeEach(() => {
  queryMock.mockReset();
  storeMock.mockClear();
  loadVisualMock.mockClear();
  preprocessMock.mockClear();
  buildAnchorMock.mockClear();
  buildSecondaryMock.mockClear();
  editMock.mockReset();
  process.env.OPENAI_API_KEY = "sk-mock-realistic-key-with-enough-length-to-pass-validation";
});

// ─── Helper : charge un contexte visuel mock ───────────────────────

const mockSignature = {
  palette: ["#aabbcc", "#112233"],
  meubles: ["canapé tissu lin"],
  sols_murs: "parquet chêne",
  lumiere: "naturelle latérale",
};

function setupVisualContext(opts: { isAnchor: boolean; hasSignature?: boolean; anchorOnDisk?: boolean }) {
  queryMock.mockResolvedValueOnce({
    rows: [{
      visual_id: VALID_UUID,
      photo_id: "photo-1",
      style_id: "scandinave",
      anchor_visual_id: opts.isAnchor ? null : "anchor-1",
      coherence_mode: opts.isAnchor ? null : "multi_image_native",
      visual_signature_json: opts.isAnchor ? mockSignature : null,
      anchor_signature_json: opts.isAnchor ? null : (opts.hasSignature !== false ? mockSignature : null),
      anchor_file_path: opts.anchorOnDisk ? "/tmp/anchor.png" : null,
      photo_file_path: "/tmp/photo.jpg",
      angle_degrees: 0,
      room_type: "salon",
      surface_m2: 25,
      comment_text: null,
      structural_instructions: null,
    }],
    rowCount: 1,
  });
}

// ─── Tests ─────────────────────────────────────────────────────────

describe("POST /regenerate — validation entrée", () => {
  it("retourne 400 si visualId pas un UUID", async () => {
    const res = await POST(buildRequest(), buildParams("not-a-uuid"));
    expect(res.status).toBe(400);
  });
});

describe("POST /regenerate — visuel introuvable", () => {
  it("retourne 404 si query retourne 0 rows", async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await POST(buildRequest(), buildParams(VALID_UUID));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/visuel introuvable/i);
  });
});

describe("POST /regenerate — ancre", () => {
  it("régénère ancre : kind='anchor', buildAnchor appelé, UPDATE coherence_mode=null", async () => {
    setupVisualContext({ isAnchor: true });
    editMock.mockResolvedValueOnce({ data: [{ b64_json: "NEW_ANCHOR_B64" }] });
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // UPDATE

    const res = await POST(buildRequest(), buildParams(VALID_UUID));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.kind).toBe("anchor");
    expect(json.data.status).toBe("generated");
    expect(buildAnchorMock).toHaveBeenCalledTimes(1);
    expect(buildSecondaryMock).not.toHaveBeenCalled();
    // UPDATE params : coherence_mode = null pour ancre
    const updateCall = queryMock.mock.calls.find((c) =>
      typeof c[0] === "string" && (c[0] as string).includes("UPDATE vs_visuals")
    );
    expect(updateCall).toBeDefined();
    const updateParams = updateCall![1] as unknown[];
    expect(updateParams[3]).toBeNull(); // coherence_mode null
  });
});

describe("POST /regenerate — secondaire", () => {
  it("régénère secondaire : reload ancre + signature → kind='secondary', multi_image_native", async () => {
    setupVisualContext({ isAnchor: false, hasSignature: true, anchorOnDisk: true });
    editMock.mockResolvedValueOnce({ data: [{ b64_json: "NEW_SECONDARY_B64" }] });
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await POST(buildRequest(), buildParams(VALID_UUID));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.kind).toBe("secondary");
    expect(buildSecondaryMock).toHaveBeenCalledTimes(1);
    expect(buildAnchorMock).not.toHaveBeenCalled();
    expect(loadVisualMock).toHaveBeenCalledWith("/tmp/anchor.png"); // ancre rechargée
  });

  it("retourne 422 si secondaire sans signature ancre persistée", async () => {
    setupVisualContext({ isAnchor: false, hasSignature: false });
    const res = await POST(buildRequest(), buildParams(VALID_UUID));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toMatch(/signature ancre/i);
  });

  it("fallback signature textuelle si OpenAI rejette le multi-image", async () => {
    setupVisualContext({ isAnchor: false, hasSignature: true, anchorOnDisk: true });
    // 1er appel multi-image rejette
    editMock.mockRejectedValueOnce(new Error("image array not supported"));
    // 2e appel single-image OK
    editMock.mockResolvedValueOnce({ data: [{ b64_json: "FALLBACK_B64" }] });
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await POST(buildRequest(), buildParams(VALID_UUID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.kind).toBe("secondary");
    // Fallback : 2 appels OpenAI
    expect(editMock).toHaveBeenCalledTimes(2);
  });
});

describe("POST /regenerate — pré-conditions env", () => {
  it("retourne 503 si OPENAI_API_KEY non configurée (placeholder '...')", async () => {
    setupVisualContext({ isAnchor: true });
    process.env.OPENAI_API_KEY = "...";
    const res = await POST(buildRequest(), buildParams(VALID_UUID));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toMatch(/OPENAI_API_KEY/);
  });

  it("retourne 503 si OPENAI_API_KEY trop courte (< 10 chars)", async () => {
    setupVisualContext({ isAnchor: true });
    process.env.OPENAI_API_KEY = "abc";
    const res = await POST(buildRequest(), buildParams(VALID_UUID));
    expect(res.status).toBe(503);
  });
});

describe("POST /regenerate — réponse OpenAI vide", () => {
  it("retourne 502 si data[0].b64_json absent", async () => {
    setupVisualContext({ isAnchor: true });
    editMock.mockResolvedValueOnce({ data: [{}] });
    const res = await POST(buildRequest(), buildParams(VALID_UUID));
    expect(res.status).toBe(502);
  });
});

describe("POST /regenerate — UPDATE in-place", () => {
  it("UPDATE préserve photo_id et anchor_visual_id (mise à jour file_path/prompt_used uniquement)", async () => {
    setupVisualContext({ isAnchor: true });
    editMock.mockResolvedValueOnce({ data: [{ b64_json: "B" }] });
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await POST(buildRequest(), buildParams(VALID_UUID));

    const updateCall = queryMock.mock.calls.find((c) =>
      typeof c[0] === "string" && (c[0] as string).includes("UPDATE vs_visuals")
    );
    const sql = updateCall![0] as string;
    // Doit incrémenter iteration_count + reset error_message
    expect(sql).toMatch(/iteration_count = iteration_count \+ 1/);
    expect(sql).toMatch(/error_message = NULL/);
    // Ne doit PAS mettre à jour photo_id ou anchor_visual_id
    expect(sql).not.toMatch(/photo_id\s*=/);
    expect(sql).not.toMatch(/anchor_visual_id\s*=/);
  });
});

// Restore env après suite
afterAll(() => {
  if (ENV_BACKUP === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = ENV_BACKUP;
});
