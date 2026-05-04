/**
 * Tests unitaires — visual-job-runner (s30 Vague 2)
 *
 * Couvre :
 *  - estimateJobCost (pure, helpers)
 *  - formatSseEvent (sérialisation wire format)
 *  - createVisualJob (insert vs_visual_jobs)
 *  - runVisualJob lifecycle : 0 pièces → batch.complete count=0,0
 *  - runVisualJob failure cascade : exception interne → job.failed event émis
 *
 * Le pipeline complet (DB réelle + OpenAI réel) est couvert par les tests
 * E2E Playwright (@qa Étape D).
 *
 * Source test plan §4.5 (extension s30).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks (hoisted) ──────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  queryMock: vi.fn(),
  emitMock: vi.fn(async () => {}),
}));

vi.mock("@/lib/vs/db", () => ({
  query: mocks.queryMock,
  ensureDbReady: vi.fn(async () => {}),
  withTransaction: vi.fn(),
}));

vi.mock("@/lib/vs/visual-job-bus", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/vs/visual-job-bus")>();
  return {
    ...actual,
    emitJobEvent: mocks.emitMock,
  };
});

import { createVisualJob, estimateJobCost, runVisualJob } from "@/lib/vs/visual-job-runner";
import { formatSseEvent } from "@/lib/vs/visual-job-bus";

const { queryMock, emitMock } = mocks;

describe("estimateJobCost", () => {
  it("retourne 0 pour 0 visuel", () => {
    expect(estimateJobCost(0)).toBe(0);
  });

  it("estime ~$0.04 par visuel + ~$0.001 par signature", () => {
    // 5 visuels = 1 signature → 5*0.04 + 1*0.001 = 0.201
    expect(estimateJobCost(5)).toBeCloseTo(0.201, 3);
  });

  it("scale linéairement avec le nombre de visuels", () => {
    const cost10 = estimateJobCost(10);
    const cost20 = estimateJobCost(20);
    expect(cost20).toBeGreaterThan(cost10);
    // Ratio approximatif (les signatures arrondissent un peu)
    expect(cost20 / cost10).toBeCloseTo(2, 1);
  });

  it("reste sous $1.50 pour un projet typique (<25 visuels)", () => {
    // P0 persona Thomas — pas de surprise budget pour un appartement standard.
    // 25 visuels * $0.04 + 5 signatures * $0.001 = ~$1.005 → confortable < $1.50.
    expect(estimateJobCost(25)).toBeLessThan(1.5);
  });
});

describe("formatSseEvent", () => {
  it("respecte le format SSE wire (event: + data: + double newline)", () => {
    const ev = formatSseEvent({
      type: "job.started",
      project_id: "proj-1",
      job_id: "job-1",
      expected_count: 3,
      estimated_cost_usd: 0.12,
    });
    expect(ev).toMatch(/^event: job\.started\n/);
    expect(ev).toMatch(/data: \{.+\}\n\n$/);
    expect(ev).toContain('"job_id":"job-1"');
  });

  it("sérialise visual.generated avec coherence_mode", () => {
    const ev = formatSseEvent({
      type: "visual.generated",
      project_id: "p", job_id: "j", room_id: "r",
      visual_id: "v", kind: "secondary",
      file_path: "/tmp/x.png",
      coherence_mode: "multi_image_native",
    });
    expect(ev).toContain('"coherence_mode":"multi_image_native"');
    expect(ev).toContain('"kind":"secondary"');
  });

  it("supporte batch.complete avec compteurs", () => {
    const ev = formatSseEvent({
      type: "batch.complete",
      project_id: "p", job_id: "j",
      completed_count: 4, failed_count: 1,
    });
    expect(ev).toContain('"completed_count":4');
    expect(ev).toContain('"failed_count":1');
  });
});

// ─── Lifecycle createVisualJob (s30 extension) ────────────────────

describe("createVisualJob", () => {
  beforeEach(() => {
    queryMock.mockReset();
    emitMock.mockClear();
  });

  it("INSERT vs_visual_jobs + retour { job_id, estimated_cost_usd }", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: "job-uuid-123" }], rowCount: 1 });
    const job = await createVisualJob("project-1", 5);
    expect(job.job_id).toBe("job-uuid-123");
    expect(job.estimated_cost_usd).toBeCloseTo(0.201, 3); // 5*0.04 + 1*0.001
    // Vérifier la requête SQL
    const sql = queryMock.mock.calls[0][0] as string;
    expect(sql).toMatch(/INSERT INTO vs_visual_jobs/);
    expect(sql).toMatch(/'pending'/);
  });

  it("propage les paramètres : project_id, expected_count, estimated_cost_usd", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: "j1" }], rowCount: 1 });
    await createVisualJob("project-X", 10);
    const params = queryMock.mock.calls[0][1] as unknown[];
    expect(params[0]).toBe("project-X");
    expect(params[1]).toBe(10);
    expect(typeof params[2]).toBe("number");
  });
});

// ─── Lifecycle runVisualJob (s30 extension) ───────────────────────

describe("runVisualJob — lifecycle minimal", () => {
  beforeEach(() => {
    queryMock.mockReset();
    emitMock.mockClear();
  });

  it("0 pièces actives → emit batch.complete(0,0) sans crash", async () => {
    // loadRoomsToGenerate retourne []
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await runVisualJob({ job_id: "j1", project_id: "p1", style_id: "scandinave" });
    expect(emitMock).toHaveBeenCalledTimes(1);
    const event = emitMock.mock.calls[0][0];
    expect(event.type).toBe("batch.complete");
    expect(event).toMatchObject({
      type: "batch.complete",
      project_id: "p1",
      job_id: "j1",
      completed_count: 0,
      failed_count: 0,
    });
  });

  it("failure cascade : query() throw → emit job.failed avec error", async () => {
    queryMock.mockRejectedValueOnce(new Error("DB connection lost"));
    await runVisualJob({ job_id: "j1", project_id: "p1", style_id: "scandinave" });
    // Au moins 1 emit job.failed
    const failedEvent = emitMock.mock.calls.find((c) => {
      const ev = c[0];
      return ev.type === "job.failed";
    });
    expect(failedEvent).toBeDefined();
    expect((failedEvent![0] as { error: string }).error).toMatch(/DB connection lost/i);
  });
});
