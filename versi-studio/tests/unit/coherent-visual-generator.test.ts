/**
 * Tests unitaires — coherent-visual-generator (s30 Vague 2 backend)
 *
 * Couvre :
 *  - selectAnchorPhoto : centroïde, tie-break par taille buffer
 *  - generateCoherentVisuals : happy path ancre + secondaires
 *  - Fallback signature textuelle si multi-image refusé
 *  - EC-5 : échec d'un secondaire n'arrête pas le batch (failures propagées)
 *  - Échec ancre = throw (bloquant pour la pièce)
 *  - regenerateSecondaryVisual : throw documenté (point d'extension Vague 2 route)
 *
 * Mocks : OpenAI, db (query), visual-generator (extractVisualSignature).
 *
 * Source test plan §4.3.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ZonePolygonPoint } from "@/lib/vs/types";
import type { VisualSignature } from "@/lib/vs/visual-generator";

// ─── Mocks globaux ─────────────────────────────────────────────────

// Mock DB : tout INSERT retourne un id fictif
vi.mock("@/lib/vs/db", () => ({
  query: vi.fn(async () => ({ rows: [{ id: "visual-id-mock-" + Math.random().toString(36).slice(2, 8) }], rowCount: 1 })),
  ensureDbReady: vi.fn(async () => {}),
  withTransaction: vi.fn(async (fn: (c: unknown) => Promise<unknown>) =>
    fn({ query: async () => ({ rows: [], rowCount: 0 }) })
  ),
}));

// Mock rate limiter : acquireToken instantané
vi.mock("@/lib/vs/openai-rate-limiter", () => ({
  imagesEditLimiter: { acquireToken: vi.fn(async () => {}) },
  OpenAIRateLimiter: class {
    async acquireToken(): Promise<void> {}
  },
}));

// Mock visual-generator : prompts triviaux + signature fixe
const mockSignature: VisualSignature = {
  palette: ["#aabbcc", "#112233", "#998877"],
  meubles: ["canapé tissu lin beige"],
  sols_murs: "parquet chêne, murs blanc",
  lumiere: "lumière naturelle latérale",
};
vi.mock("@/lib/vs/visual-generator", () => ({
  buildVisualPromptAnchor: vi.fn(() => "ANCHOR_PROMPT_v2"),
  buildVisualPromptSecondary: vi.fn(() => "SECONDARY_PROMPT_v2"),
  extractVisualSignature: vi.fn(async () => mockSignature),
}));

// Mock OpenAI : images.edit retourne un b64 fixe
const editMock = vi.fn();
vi.mock("openai", () => {
  return {
    default: class {
      images = { edit: editMock };
    },
    toFile: vi.fn(async (buf: Buffer, name: string, opts: { type: string }) => ({
      __mockFile: true, name, type: opts.type, size: buf.length,
    })),
  };
});

// ─── Imports après les mocks ───────────────────────────────────────

import {
  selectAnchorPhoto,
  generateCoherentVisuals,
  regenerateSecondaryVisual,
  type PlacedPhoto,
  type CoherentGenerationInput,
} from "@/lib/vs/coherent-visual-generator";

// ─── Helpers ───────────────────────────────────────────────────────

function makePhoto(id: string, x: number, y: number, bufferSize = 1024): PlacedPhoto {
  return {
    id,
    room_id: "room-1",
    file_path: `/tmp/${id}.jpg`,
    position_x: x,
    position_y: y,
    angle_degrees: 0,
    buffer: Buffer.alloc(bufferSize, 0xff),
    mime_type: "image/jpeg",
  };
}

function squarePolygon(): ZonePolygonPoint[] {
  // carré 0-100 → centroïde (50, 50)
  return [
    { x_percent: 0, y_percent: 0 },
    { x_percent: 100, y_percent: 0 },
    { x_percent: 100, y_percent: 100 },
    { x_percent: 0, y_percent: 100 },
  ];
}

function baseInput(photos: PlacedPhoto[], target = 3): CoherentGenerationInput {
  return {
    room_id: "room-1",
    room_polygon: squarePolygon(),
    photos,
    style_id: "scandinave",
    room_type: "salon",
    surface_m2: 25,
    comment_text: null,
    target_visual_count: target,
    user_answers: [],
    structural_instructions: null,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────

describe("selectAnchorPhoto — règle du centroïde", () => {
  it("retourne la photo unique si une seule fournie", () => {
    const ph = makePhoto("p1", 0.1, 0.1);
    expect(selectAnchorPhoto(squarePolygon(), [ph])).toBe(ph);
  });

  it("throw sur tableau vide", () => {
    expect(() => selectAnchorPhoto(squarePolygon(), [])).toThrow();
  });

  it("sélectionne la photo la plus proche du centroïde (50,50 → 0.5)", () => {
    const p1 = makePhoto("p1", 0.1, 0.1);
    const p2 = makePhoto("p2", 0.5, 0.5); // pile au centroïde
    const p3 = makePhoto("p3", 0.9, 0.9);
    expect(selectAnchorPhoto(squarePolygon(), [p1, p2, p3]).id).toBe("p2");
  });

  it("tie-break : photo équidistante avec plus gros buffer (proxy résolution)", () => {
    // p1 et p2 équidistants du centroïde mais p2 a un plus gros buffer
    const p1 = makePhoto("p1", 0.3, 0.3, 500);
    const p2 = makePhoto("p2", 0.7, 0.7, 5000);
    const result = selectAnchorPhoto(squarePolygon(), [p1, p2]);
    // les deux à distance ~0.283 du centroïde (0.5,0.5) — tie-break = buffer
    expect(result.id).toBe("p2");
  });
});

describe("generateCoherentVisuals — happy path", () => {
  beforeEach(() => {
    editMock.mockReset();
  });

  it("génère ancre + secondaires : 1 appel ancre + N-1 appels secondaires (multi-image)", async () => {
    editMock.mockResolvedValue({ data: [{ b64_json: "FAKE_B64_IMAGE" }] });
    const photos = [
      makePhoto("p1", 0.5, 0.5, 5000), // ancre (centroïde)
      makePhoto("p2", 0.2, 0.2),
      makePhoto("p3", 0.8, 0.8),
    ];
    const storeImage = vi.fn(async (b64: string, name: string) => `/tmp/store/${name}`);
    const result = await generateCoherentVisuals(baseInput(photos, 3), { storeImage });

    // 1 ancre + 2 secondaires = 3 appels images.edit
    expect(editMock).toHaveBeenCalledTimes(3);
    expect(result.anchor.image_base64).toBe("FAKE_B64_IMAGE");
    expect(result.anchor.signature_json).toEqual(mockSignature);
    expect(result.secondaries).toHaveLength(2);
    expect(result.failures).toHaveLength(0);
    // 1 storeImage ancre + 2 storeImage secondaires = 3
    expect(storeImage).toHaveBeenCalledTimes(3);
  });

  it("propage la signature ancre dans les secondaires (mode multi_image_native)", async () => {
    editMock.mockResolvedValue({ data: [{ b64_json: "B64" }] });
    const photos = [makePhoto("p1", 0.5, 0.5), makePhoto("p2", 0.3, 0.3)];
    const storeImage = vi.fn(async (b64: string, name: string) => `/tmp/${name}`);
    const result = await generateCoherentVisuals(baseInput(photos, 2), { storeImage });

    expect(result.secondaries).toHaveLength(1);
    expect(result.secondaries[0].coherence_mode).toBe("multi_image_native");
  });

  it("fallback signature textuelle si multi-image refusé (1er appel succès, 2e rejette)", async () => {
    // Ancre OK
    editMock.mockResolvedValueOnce({ data: [{ b64_json: "ANCHOR_B64" }] });
    // 1er appel secondaire (multi-image) rejette → fallback
    editMock.mockRejectedValueOnce(new Error("image array not supported"));
    // 2e appel secondaire (fallback single image) OK
    editMock.mockResolvedValueOnce({ data: [{ b64_json: "SECONDARY_B64" }] });

    const photos = [makePhoto("p1", 0.5, 0.5), makePhoto("p2", 0.3, 0.3)];
    const storeImage = vi.fn(async (b64: string, name: string) => `/tmp/${name}`);
    const result = await generateCoherentVisuals(baseInput(photos, 2), { storeImage });

    expect(result.secondaries[0].coherence_mode).toBe("textual_signature");
    expect(result.failures).toHaveLength(0);
  });

  it("EC-5 : échec d'un secondaire n'arrête pas le batch — failures propagées", async () => {
    editMock.mockResolvedValueOnce({ data: [{ b64_json: "ANCHOR" }] }); // ancre OK
    // Secondaire 1 : multi-image fail + fallback fail
    editMock.mockRejectedValueOnce(new Error("multi fail 1"));
    editMock.mockRejectedValueOnce(new Error("fallback fail 1"));
    // Secondaire 2 : multi-image OK
    editMock.mockResolvedValueOnce({ data: [{ b64_json: "SEC2" }] });

    const photos = [
      makePhoto("p1", 0.5, 0.5),
      makePhoto("p2", 0.3, 0.3),
      makePhoto("p3", 0.7, 0.7),
    ];
    const storeImage = vi.fn(async (b64: string, name: string) => `/tmp/${name}`);
    const result = await generateCoherentVisuals(baseInput(photos, 3), { storeImage });

    // 1 réussi + 1 raté
    expect(result.secondaries.length + result.failures.length).toBe(2);
    expect(result.failures.length).toBeGreaterThanOrEqual(1);
  });

  it("échec ancre = throw (pas de cohérence possible sans ancre)", async () => {
    editMock.mockRejectedValueOnce(new Error("OpenAI 500 ancre"));
    const photos = [makePhoto("p1", 0.5, 0.5)];
    const storeImage = vi.fn(async () => "/tmp/x");
    await expect(
      generateCoherentVisuals(baseInput(photos, 1), { storeImage })
    ).rejects.toThrow();
  });

  it("throw si target_visual_count <= 0", async () => {
    const photos = [makePhoto("p1", 0.5, 0.5)];
    const storeImage = vi.fn(async () => "/tmp/x");
    await expect(
      generateCoherentVisuals(baseInput(photos, 0), { storeImage })
    ).rejects.toThrow(/target_visual_count/);
  });

  it("throw si aucune photo placée", async () => {
    const storeImage = vi.fn(async () => "/tmp/x");
    await expect(
      generateCoherentVisuals(baseInput([], 1), { storeImage })
    ).rejects.toThrow(/aucune photo/i);
  });

  it("response vide (pas de b64_json) → throw", async () => {
    editMock.mockResolvedValueOnce({ data: [{}] });
    const photos = [makePhoto("p1", 0.5, 0.5)];
    const storeImage = vi.fn(async () => "/tmp/x");
    await expect(
      generateCoherentVisuals(baseInput(photos, 1), { storeImage })
    ).rejects.toThrow(/réponse vide/i);
  });

  it("signature_json contient EXACTEMENT les 4 clés du contrat (palette, meubles, sols_murs, lumiere)", async () => {
    editMock.mockResolvedValue({ data: [{ b64_json: "B" }] });
    const photos = [makePhoto("p1", 0.5, 0.5)];
    const storeImage = vi.fn(async () => "/tmp/x");
    const result = await generateCoherentVisuals(baseInput(photos, 1), { storeImage });
    const keys = Object.keys(result.anchor.signature_json).sort();
    expect(keys).toEqual(["lumiere", "meubles", "palette", "sols_murs"]);
  });
});

describe("regenerateSecondaryVisual — point d'extension documenté", () => {
  it("throw avec message d'orientation pour la route Vague 2", async () => {
    // Mock query pour retourner un visual avec ancre + signature présente
    const dbMock = await import("@/lib/vs/db");
    vi.mocked(dbMock.query).mockResolvedValueOnce({
      rows: [{
        photo_id: "p1",
        style_id: "scandinave",
        anchor_visual_id: "anchor-1",
        anchor_signature_json: mockSignature,
        anchor_image_path: "/tmp/anchor.png",
        photo_file_path: "/tmp/p1.jpg",
        photo_mime: "image/jpeg",
        angle_degrees: 0,
        room_id: "room-1",
        room_type: "salon",
        surface_m2: 25,
        comment_text: null,
      }],
      rowCount: 1,
    } as never);

    await expect(
      regenerateSecondaryVisual("visual-id", { storeImage: async () => "/tmp/x" })
    ).rejects.toThrow(/caller \(route API\)/i);
  });

  it("throw 'Visuel introuvable' si query retourne 0 rows", async () => {
    const dbMock = await import("@/lib/vs/db");
    vi.mocked(dbMock.query).mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    await expect(
      regenerateSecondaryVisual("nonexistent", { storeImage: async () => "/tmp/x" })
    ).rejects.toThrow(/introuvable/i);
  });

  it("throw 'Signature ancre absente' si anchor_signature_json null", async () => {
    const dbMock = await import("@/lib/vs/db");
    vi.mocked(dbMock.query).mockResolvedValueOnce({
      rows: [{
        photo_id: "p1",
        style_id: "scandinave",
        anchor_visual_id: "anchor-1",
        anchor_signature_json: null, // ← key
        anchor_image_path: "/tmp/anchor.png",
        photo_file_path: "/tmp/p1.jpg",
        photo_mime: "image/jpeg",
        angle_degrees: 0,
        room_id: "room-1",
        room_type: "salon",
        surface_m2: 25,
        comment_text: null,
      }],
      rowCount: 1,
    } as never);

    await expect(
      regenerateSecondaryVisual("visual-id", { storeImage: async () => "/tmp/x" })
    ).rejects.toThrow(/Signature ancre absente/);
  });
});
