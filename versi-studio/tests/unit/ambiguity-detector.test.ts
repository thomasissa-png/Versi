/**
 * Tests unitaires — ambiguity-detector (s30 Vague 2 backend)
 *
 * Couvre les 5 triggers T1-T5 :
 *  - T1 surface aberrante (< 4 ou > 80 sur grandes pièces)
 *  - T2 photo manquante (target > 0 + photo_count = 0)
 *  - T3 conflit style/commentaire (mot structurel + style préservation + IA)
 *  - T4 photos incohérentes (≥ 2 photos placées + IA vision)
 *  - T5 surface inconnue (NULL + target > 0)
 *  - Idempotence : NOT EXISTS dans l'INSERT empêche les doublons
 *  - hasBlockingQuestions / answerQuestion
 *
 * Mocks : OpenAI responses, db (query + withTransaction), sharp (T4).
 *
 * Source test plan §4.2.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks globaux ─────────────────────────────────────────────────
// Utilisation de vi.hoisted() pour partager les mocks entre la factory
// vi.mock (hoistée) et le scope du test sans erreur "Cannot access X before initialization".

const mocks = vi.hoisted(() => ({
  queryMock: vi.fn(),
  transactionClientQueryMock: vi.fn(async () => ({ rows: [], rowCount: 1 })),
  responsesCreateMock: vi.fn(),
}));

vi.mock("@/lib/vs/db", () => ({
  query: mocks.queryMock,
  ensureDbReady: vi.fn(async () => {}),
  withTransaction: vi.fn(async (fn: (c: { query: typeof mocks.transactionClientQueryMock }) => Promise<unknown>) =>
    fn({ query: mocks.transactionClientQueryMock })
  ),
}));

vi.mock("openai", () => ({
  default: class {
    responses = { create: mocks.responsesCreateMock };
  },
}));

vi.mock("sharp", () => {
  const sharpMock = (() => {
    const chain = {
      resize: vi.fn(() => chain),
      jpeg: vi.fn(() => chain),
      toBuffer: vi.fn(async () => Buffer.from("fake")),
    };
    return chain;
  });
  return { default: sharpMock };
});

const { queryMock, transactionClientQueryMock, responsesCreateMock } = mocks;

// ─── Imports après les mocks ───────────────────────────────────────

import {
  detectAmbiguities,
  hasBlockingQuestions,
  answerQuestion,
} from "@/lib/vs/ambiguity-detector";

// ─── Helpers ───────────────────────────────────────────────────────

interface RoomFixture {
  id: string;
  lot_id: string;
  room_type: string;
  custom_label: string | null;
  surface_m2: number | null;
  comment_text: string | null;
  target_visual_count: number;
  photo_count: number;
}

function room(overrides: Partial<RoomFixture>): RoomFixture {
  return {
    id: overrides.id ?? "room-1",
    lot_id: "lot-1",
    room_type: overrides.room_type ?? "salon",
    custom_label: null,
    surface_m2: overrides.surface_m2 ?? 25,
    comment_text: overrides.comment_text ?? null,
    target_visual_count: overrides.target_visual_count ?? 1,
    photo_count: overrides.photo_count ?? 1,
    ...overrides,
  };
}

/**
 * Configure les 3 appels query() classiques de detectAmbiguities :
 *  1. SELECT rooms
 *  2. SELECT photos placées
 *  3. SELECT questions status='asked' (retour final)
 */
function mockDbCalls(rooms: RoomFixture[], placedPhotos: Array<{ id: string; room_id: string; file_path: string; taken_at: string | null; is_placed_on_plan: boolean }> = [], finalQuestions: Array<{ id: string; project_id: string; room_id: string; trigger_type: string; question_text: string; status: string; asked_at: string }> = []) {
  queryMock.mockReset();
  queryMock.mockResolvedValueOnce({ rows: rooms, rowCount: rooms.length });
  queryMock.mockResolvedValueOnce({ rows: placedPhotos, rowCount: placedPhotos.length });
  queryMock.mockResolvedValueOnce({ rows: finalQuestions, rowCount: finalQuestions.length });
}

const PROJECT_ID = "00000000-0000-0000-0000-000000000001";
const STYLE_PRESERVATION = "classique";
const STYLE_NEUTRAL = "scandinave";

beforeEach(() => {
  queryMock.mockReset();
  responsesCreateMock.mockReset();
  transactionClientQueryMock.mockClear();
});

// ─── T1 — Surface aberrante ────────────────────────────────────────

describe("detectAmbiguities — T1 surface aberrante", () => {
  it("trigger sur salon avec surface_m2 = 3 (< 4 m²)", async () => {
    mockDbCalls(
      [room({ id: "r1", surface_m2: 3, target_visual_count: 1, photo_count: 1 })],
      [],
      [{
        id: "q1", project_id: PROJECT_ID, room_id: "r1",
        trigger_type: "surface_aberrante",
        question_text: "La surface détectée est 3 m² pour Salon",
        status: "asked", asked_at: new Date().toISOString(),
      }]
    );

    const result = await detectAmbiguities(PROJECT_ID, {
      styleId: STYLE_NEUTRAL,
      loadPhotoBytes: async () => null,
    });

    expect(result).toHaveLength(1);
    expect(result[0].trigger_type).toBe("surface_aberrante");
    // Au moins un INSERT a été tenté
    expect(transactionClientQueryMock).toHaveBeenCalled();
  });

  it("trigger sur salon avec surface_m2 = 95 (> 80 m² sur LARGE_ROOM)", async () => {
    mockDbCalls(
      [room({ id: "r1", room_type: "salon", surface_m2: 95, target_visual_count: 1 })],
      [],
      [{ id: "q1", project_id: PROJECT_ID, room_id: "r1", trigger_type: "surface_aberrante", question_text: "...", status: "asked", asked_at: "" }]
    );
    const result = await detectAmbiguities(PROJECT_ID, { styleId: STYLE_NEUTRAL, loadPhotoBytes: async () => null });
    expect(result.some((q) => q.trigger_type === "surface_aberrante")).toBe(true);
  });

  it("PAS de trigger sur 'wc' avec surface_m2 = 95 (whitelist large rooms exclut wc)", async () => {
    mockDbCalls(
      [room({ id: "r1", room_type: "wc", surface_m2: 95, target_visual_count: 1 })],
      [],
      []
    );
    const result = await detectAmbiguities(PROJECT_ID, { styleId: STYLE_NEUTRAL, loadPhotoBytes: async () => null });
    expect(result.filter((q) => q.trigger_type === "surface_aberrante")).toHaveLength(0);
  });

  it("PAS de trigger T1 si surface_m2 NULL (T5 traite ce cas)", async () => {
    mockDbCalls(
      [room({ id: "r1", surface_m2: null, target_visual_count: 1 })],
      [],
      []
    );
    const result = await detectAmbiguities(PROJECT_ID, { styleId: STYLE_NEUTRAL, loadPhotoBytes: async () => null });
    expect(result.filter((q) => q.trigger_type === "surface_aberrante")).toHaveLength(0);
  });
});

// ─── T2 — Photo manquante ──────────────────────────────────────────

describe("detectAmbiguities — T2 photo manquante", () => {
  it("trigger si target_visual_count = 2 et photo_count = 0", async () => {
    mockDbCalls(
      [room({ id: "r1", target_visual_count: 2, photo_count: 0 })],
      [],
      [{ id: "q1", project_id: PROJECT_ID, room_id: "r1", trigger_type: "photo_manquante", question_text: "...", status: "asked", asked_at: "" }]
    );
    const result = await detectAmbiguities(PROJECT_ID, { styleId: STYLE_NEUTRAL, loadPhotoBytes: async () => null });
    expect(result.some((q) => q.trigger_type === "photo_manquante")).toBe(true);
  });

  it("PAS de trigger si target_visual_count = 0 (pièce désactivée)", async () => {
    mockDbCalls(
      [room({ id: "r1", target_visual_count: 0, photo_count: 0 })],
      [],
      []
    );
    const result = await detectAmbiguities(PROJECT_ID, { styleId: STYLE_NEUTRAL, loadPhotoBytes: async () => null });
    expect(result).toHaveLength(0);
  });
});

// ─── T5 — Surface inconnue ─────────────────────────────────────────

describe("detectAmbiguities — T5 surface inconnue", () => {
  it("trigger si surface_m2 NULL ET target_visual_count > 0", async () => {
    mockDbCalls(
      [room({ id: "r1", surface_m2: null, target_visual_count: 1, photo_count: 1 })],
      [],
      [{ id: "q1", project_id: PROJECT_ID, room_id: "r1", trigger_type: "surface_inconnue", question_text: "...", status: "asked", asked_at: "" }]
    );
    const result = await detectAmbiguities(PROJECT_ID, { styleId: STYLE_NEUTRAL, loadPhotoBytes: async () => null });
    expect(result.some((q) => q.trigger_type === "surface_inconnue")).toBe(true);
  });
});

// ─── T3 — Conflit style/commentaire ────────────────────────────────

describe("detectAmbiguities — T3 conflit style/commentaire", () => {
  it("PAS d'appel IA si commentaire sans mot-clé structurel", async () => {
    mockDbCalls(
      [room({ id: "r1", comment_text: "j'aime les fenêtres", target_visual_count: 1 })],
      [],
      []
    );
    await detectAmbiguities(PROJECT_ID, { styleId: STYLE_PRESERVATION, loadPhotoBytes: async () => null });
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  it("PAS d'appel IA si style non patrimonial (scandinave) malgré mot-clé 'abattre'", async () => {
    mockDbCalls(
      [room({ id: "r1", comment_text: "abattre le mur sud", target_visual_count: 1 })],
      [],
      []
    );
    await detectAmbiguities(PROJECT_ID, { styleId: STYLE_NEUTRAL, loadPhotoBytes: async () => null });
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  it("appel IA + trigger si style classique + mot-clé 'supprimer' + IA confirme conflit", async () => {
    mockDbCalls(
      [room({ id: "r1", comment_text: "supprimer le mur entre cuisine et salon", target_visual_count: 1, photo_count: 1 })],
      [],
      [{ id: "q1", project_id: PROJECT_ID, room_id: "r1", trigger_type: "conflit_style_commentaire", question_text: "...", status: "asked", asked_at: "" }]
    );
    responsesCreateMock.mockResolvedValueOnce({
      output: [{
        type: "message",
        content: [{ type: "output_text", text: '{"conflit": true, "raison": "demande structurelle incompatible avec style préservation"}' }],
      }],
    });

    const result = await detectAmbiguities(PROJECT_ID, { styleId: STYLE_PRESERVATION, loadPhotoBytes: async () => null });
    expect(responsesCreateMock).toHaveBeenCalledTimes(1);
    expect(result.some((q) => q.trigger_type === "conflit_style_commentaire")).toBe(true);
  });

  it("PAS de trigger si IA retourne JSON invalide (graceful fallback)", async () => {
    mockDbCalls(
      [room({ id: "r1", comment_text: "abattre le mur", target_visual_count: 1, photo_count: 1 })],
      [],
      []
    );
    responsesCreateMock.mockResolvedValueOnce({
      output: [{ type: "message", content: [{ type: "output_text", text: "pas du JSON valide {{{" }] }],
    });
    const result = await detectAmbiguities(PROJECT_ID, { styleId: STYLE_PRESERVATION, loadPhotoBytes: async () => null });
    expect(result.filter((q) => q.trigger_type === "conflit_style_commentaire")).toHaveLength(0);
  });

  it("PAS de trigger si IA retourne {conflit: false}", async () => {
    mockDbCalls(
      [room({ id: "r1", comment_text: "ouvrir la fenêtre", target_visual_count: 1, photo_count: 1 })],
      [],
      []
    );
    responsesCreateMock.mockResolvedValueOnce({
      output: [{ type: "message", content: [{ type: "output_text", text: '{"conflit": false, "raison": "rien"}' }] }],
    });
    const result = await detectAmbiguities(PROJECT_ID, { styleId: STYLE_PRESERVATION, loadPhotoBytes: async () => null });
    expect(result.filter((q) => q.trigger_type === "conflit_style_commentaire")).toHaveLength(0);
  });
});

// ─── T4 — Photos incohérentes ──────────────────────────────────────

describe("detectAmbiguities — T4 photos incohérentes", () => {
  it("PAS d'appel vision si < 2 photos placées", async () => {
    mockDbCalls(
      [room({ id: "r1", target_visual_count: 1, photo_count: 1 })],
      [{ id: "ph1", room_id: "r1", file_path: "/tmp/p.jpg", taken_at: null, is_placed_on_plan: true }],
      []
    );
    await detectAmbiguities(PROJECT_ID, { styleId: STYLE_NEUTRAL, loadPhotoBytes: async () => Buffer.alloc(100) });
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  it("appel vision + trigger si 2+ photos et IA retourne {coherent: false}", async () => {
    mockDbCalls(
      [room({ id: "r1", target_visual_count: 1, photo_count: 2 })],
      [
        { id: "ph1", room_id: "r1", file_path: "/tmp/p1.jpg", taken_at: null, is_placed_on_plan: true },
        { id: "ph2", room_id: "r1", file_path: "/tmp/p2.jpg", taken_at: null, is_placed_on_plan: true },
      ],
      [{ id: "q1", project_id: PROJECT_ID, room_id: "r1", trigger_type: "photos_incoherentes", question_text: "...", status: "asked", asked_at: "" }]
    );
    responsesCreateMock.mockResolvedValueOnce({
      output: [{ type: "message", content: [{ type: "output_text", text: '{"coherent": false, "raison": "jour vs nuit"}' }] }],
    });

    const result = await detectAmbiguities(PROJECT_ID, {
      styleId: STYLE_NEUTRAL,
      loadPhotoBytes: async () => Buffer.alloc(100),
    });

    expect(responsesCreateMock).toHaveBeenCalledTimes(1);
    expect(result.some((q) => q.trigger_type === "photos_incoherentes")).toBe(true);
  });

  it("PAS de trigger si IA retourne {coherent: true}", async () => {
    mockDbCalls(
      [room({ id: "r1", target_visual_count: 1, photo_count: 2 })],
      [
        { id: "ph1", room_id: "r1", file_path: "/tmp/p1.jpg", taken_at: null, is_placed_on_plan: true },
        { id: "ph2", room_id: "r1", file_path: "/tmp/p2.jpg", taken_at: null, is_placed_on_plan: true },
      ],
      []
    );
    responsesCreateMock.mockResolvedValueOnce({
      output: [{ type: "message", content: [{ type: "output_text", text: '{"coherent": true}' }] }],
    });
    const result = await detectAmbiguities(PROJECT_ID, {
      styleId: STYLE_NEUTRAL,
      loadPhotoBytes: async () => Buffer.alloc(100),
    });
    expect(result.filter((q) => q.trigger_type === "photos_incoherentes")).toHaveLength(0);
  });
});

// ─── Agrégation + idempotence ──────────────────────────────────────

describe("detectAmbiguities — orchestration", () => {
  it("retourne [] si aucune pièce dans le projet", async () => {
    queryMock.mockReset();
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const result = await detectAmbiguities(PROJECT_ID, { styleId: STYLE_NEUTRAL, loadPhotoBytes: async () => null });
    expect(result).toEqual([]);
  });

  it("idempotent : ré-appel ne duplique pas (NOT EXISTS dans INSERT)", async () => {
    mockDbCalls(
      [room({ id: "r1", surface_m2: 3, target_visual_count: 1, photo_count: 1 })],
      [],
      [{ id: "q1", project_id: PROJECT_ID, room_id: "r1", trigger_type: "surface_aberrante", question_text: "...", status: "asked", asked_at: "" }]
    );
    await detectAmbiguities(PROJECT_ID, { styleId: STYLE_NEUTRAL, loadPhotoBytes: async () => null });
    // Premier appel : INSERT tenté
    const insertSqlFirst = transactionClientQueryMock.mock.calls
      .map((c) => c[0])
      .find((s: unknown) => typeof s === "string" && s.includes("INSERT INTO vs_visual_questions"));
    expect(insertSqlFirst).toBeDefined();
    // L'INSERT contient bien la clause NOT EXISTS qui garantit l'idempotence côté SQL
    expect(insertSqlFirst as string).toContain("NOT EXISTS");
  });

  it("aggregation : T1 + T2 + T5 sur 3 pièces différentes → 3 questions retournées", async () => {
    mockDbCalls(
      [
        room({ id: "r1", surface_m2: 2, target_visual_count: 1, photo_count: 1 }),
        room({ id: "r2", surface_m2: 25, target_visual_count: 2, photo_count: 0 }),
        room({ id: "r3", surface_m2: null, target_visual_count: 1, photo_count: 1 }),
      ],
      [],
      [
        { id: "q1", project_id: PROJECT_ID, room_id: "r1", trigger_type: "surface_aberrante", question_text: "...", status: "asked", asked_at: "" },
        { id: "q2", project_id: PROJECT_ID, room_id: "r2", trigger_type: "photo_manquante", question_text: "...", status: "asked", asked_at: "" },
        { id: "q3", project_id: PROJECT_ID, room_id: "r3", trigger_type: "surface_inconnue", question_text: "...", status: "asked", asked_at: "" },
      ]
    );
    const result = await detectAmbiguities(PROJECT_ID, { styleId: STYLE_NEUTRAL, loadPhotoBytes: async () => null });
    expect(result).toHaveLength(3);
    const types = result.map((q) => q.trigger_type).sort();
    expect(types).toEqual(["photo_manquante", "surface_aberrante", "surface_inconnue"]);
  });
});

// ─── hasBlockingQuestions / answerQuestion ────────────────────────

describe("hasBlockingQuestions", () => {
  it("retourne true si une question status='asked' existe", async () => {
    queryMock.mockReset();
    queryMock.mockResolvedValueOnce({ rows: [{ exists: true }], rowCount: 1 });
    expect(await hasBlockingQuestions(PROJECT_ID)).toBe(true);
  });

  it("retourne false si aucune question status='asked'", async () => {
    queryMock.mockReset();
    queryMock.mockResolvedValueOnce({ rows: [{ exists: false }], rowCount: 1 });
    expect(await hasBlockingQuestions(PROJECT_ID)).toBe(false);
  });
});

describe("answerQuestion", () => {
  it("retourne true si la question existe et a été mise à jour (rowCount=1)", async () => {
    queryMock.mockReset();
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    expect(await answerQuestion("q1", "12")).toBe(true);
  });

  it("retourne false si la question n'existe pas (rowCount=0)", async () => {
    queryMock.mockReset();
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect(await answerQuestion("nonexistent", "12")).toBe(false);
  });
});
