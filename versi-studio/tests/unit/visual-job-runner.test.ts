/**
 * Tests unitaires — visual-job-runner (s30 Vague 2)
 *
 * Couvre les helpers purs (estimateJobCost) et le formatage des events SSE.
 * Le worker complet (runVisualJob) nécessite un mock OpenAI + mock DB ;
 * il est couvert par les tests E2E (@qa Étape C).
 */

import { describe, it, expect } from "vitest";
import { estimateJobCost } from "@/lib/vs/visual-job-runner";
import { formatSseEvent } from "@/lib/vs/visual-job-bus";

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
