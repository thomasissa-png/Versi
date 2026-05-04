/**
 * Helper E2E — SSE mock pour /api/vs/projects/[id]/visuals-stream (s30)
 *
 * Intercepte la route SSE Playwright et retourne un stream contrôlé.
 * Permet de tester :
 *   - S8 : événements `visual.generated` reçus → galerie progressive
 *   - S10 : reconnect après déconnect (heartbeat keep-alive `: ka`)
 *
 * NOTE : Playwright route interception ne supporte pas nativement les
 * streams chunked. On utilise `route.fulfill()` avec body texte
 * pré-construit (replay + N events + batch.complete). Pour tester un
 * vrai stream progressif, on ouvre la route mais on garde le contrôle
 * via `routeFromHAR` ou `page.evaluate()` qui dispatch les events.
 */

import type { Page, Route } from "@playwright/test";

export interface SseEvent {
  event: string;
  data: Record<string, unknown>;
}

/**
 * Construit le body SSE concaténé pour les events fournis.
 * Format SSE : `event: <name>\ndata: <json>\n\n`.
 */
export function buildSseBody(events: SseEvent[]): string {
  return events
    .map((ev) => `event: ${ev.event}\ndata: ${JSON.stringify(ev.data)}\n\n`)
    .join("");
}

/**
 * Mock SSE simple — fulfill instantané avec tous les events.
 * Utilisé pour S8 (galerie progressive — on vérifie que les events
 * arrivent et sont rendus, pas la temporalité fine).
 */
export async function mockSseStream(
  page: Page,
  projectId: string,
  events: SseEvent[]
): Promise<void> {
  await page.route(`**/api/vs/projects/${projectId}/visuals-stream`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
      body: buildSseBody(events),
    });
  });
}

/**
 * Events par défaut — succès complet 5 visuels (3 salon + 2 chambre).
 */
export function defaultSuccessEvents(): SseEvent[] {
  return [
    {
      event: "replay",
      data: { job_id: "job-test-001", status: "running", expected_count: 5,
              completed_count: 0, failed_count: 0, estimated_cost_usd: 1.05 },
    },
    {
      event: "job.started",
      data: { job_id: "job-test-001", expected_count: 5 },
    },
    {
      event: "visual.generated",
      data: {
        visual_id: "v1", room_id: "room-0001-0000-0000-000000000001",
        is_anchor: true, image_url: "/test-fixtures/v1.jpg", index: 0,
      },
    },
    {
      event: "visual.generated",
      data: {
        visual_id: "v2", room_id: "room-0001-0000-0000-000000000001",
        is_anchor: false, image_url: "/test-fixtures/v2.jpg", index: 1,
      },
    },
    {
      event: "visual.generated",
      data: {
        visual_id: "v3", room_id: "room-0001-0000-0000-000000000001",
        is_anchor: false, image_url: "/test-fixtures/v3.jpg", index: 2,
      },
    },
    {
      event: "visual.generated",
      data: {
        visual_id: "v4", room_id: "room-0002-0000-0000-000000000002",
        is_anchor: true, image_url: "/test-fixtures/v4.jpg", index: 0,
      },
    },
    {
      event: "visual.generated",
      data: {
        visual_id: "v5", room_id: "room-0002-0000-0000-000000000002",
        is_anchor: false, image_url: "/test-fixtures/v5.jpg", index: 1,
      },
    },
    {
      event: "batch.complete",
      data: { job_id: "job-test-001", completed_count: 5, failed_count: 0 },
    },
  ];
}

/**
 * Events 1 visuel failed — pour S9 régénération individuelle EC-5.
 */
export function partialFailEvents(): SseEvent[] {
  return [
    {
      event: "job.started",
      data: { job_id: "job-test-002", expected_count: 3 },
    },
    {
      event: "visual.generated",
      data: { visual_id: "v1", room_id: "room-0001-0000-0000-000000000001",
              is_anchor: true, image_url: "/test-fixtures/v1.jpg", index: 0 },
    },
    {
      event: "visual.failed",
      data: { visual_id: "v2", room_id: "room-0001-0000-0000-000000000001",
              error: "OpenAI 500", index: 1 },
    },
    {
      event: "visual.generated",
      data: { visual_id: "v3", room_id: "room-0001-0000-0000-000000000001",
              is_anchor: false, image_url: "/test-fixtures/v3.jpg", index: 2 },
    },
    {
      event: "batch.complete",
      data: { job_id: "job-test-002", completed_count: 2, failed_count: 1 },
    },
  ];
}
