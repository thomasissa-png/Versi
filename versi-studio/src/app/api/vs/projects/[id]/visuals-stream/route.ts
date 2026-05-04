/**
 * API Route — GET /api/vs/projects/[id]/visuals-stream
 *
 * SSE EventSource pour streamer en temps réel les events de génération
 * visuels (job.started, visual.created, visual.generated, visual.failed,
 * batch.complete, job.failed). Branchée sur `visual-job-bus.ts`.
 *
 * Patterns critiques :
 *  - Le client envoie `Accept: text/event-stream` ; on retourne text/event-stream + no-cache
 *  - On émet un keep-alive toutes les 25s pour éviter le buffering proxy Replit
 *  - Cleanup obligatoire au disconnect (P1 persona "perception vitesse")
 *  - Replay initial : on push l'état BDD courant (status job + counts) AVANT de
 *    s'abonner pour donner à l'UI un point d'ancrage si elle se reconnecte
 *
 * Limites V2 connues : pas de Redis pub/sub, donc multi-instance Replit autoscale
 * peut perdre des events si le worker tourne sur instance A et le SSE sur B.
 * Mitigation : le frontend peut interroger `vs_visual_jobs` en complément.
 */

import { NextRequest } from "next/server";
import { ensureDbReady, query } from "@/lib/vs/db";
import { getJobEmitter, releaseEmitter, formatSseEvent, type VisualJobEvent } from "@/lib/vs/visual-job-bus";

export const dynamic = "force-dynamic"; // jamais de cache sur un stream

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  await ensureDbReady();
  const { id: projectId } = await params;
  if (!isValidUUID(projectId)) {
    return new Response("Identifiant projet invalide.", { status: 400 });
  }

  const encoder = new TextEncoder();
  const emitter = getJobEmitter(projectId);
  let keepAlive: ReturnType<typeof setInterval> | null = null;
  let cleaned = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // 1. Replay : état du dernier job pour ce projet (UI peut se reconnecter)
      try {
        const last = await query<{
          id: string; status: string; expected_count: number;
          completed_count: number; failed_count: number;
          estimated_cost_usd: string | number | null; started_at: string | null;
        }>(
          `SELECT id, status, expected_count, completed_count, failed_count,
                  estimated_cost_usd, started_at::TEXT AS started_at
             FROM vs_visual_jobs
            WHERE project_id = $1
            ORDER BY created_at DESC LIMIT 1`,
          [projectId]
        );
        if (last.rows.length > 0) {
          const job = last.rows[0];
          const replay = `event: replay\ndata: ${JSON.stringify({
            job_id: job.id, status: job.status,
            expected_count: job.expected_count,
            completed_count: job.completed_count,
            failed_count: job.failed_count,
            estimated_cost_usd: Number(job.estimated_cost_usd ?? 0),
            started_at: job.started_at,
          })}\n\n`;
          controller.enqueue(encoder.encode(replay));
        }
      } catch (err) {
        console.warn("[SSE visuals-stream] replay échoué:", err);
      }

      // 2. Souscription bus
      const onEvent = (ev: VisualJobEvent) => {
        try {
          controller.enqueue(encoder.encode(formatSseEvent(ev)));
          // Si terminal, fermer côté serveur après envoi (l'UI se reconnectera si besoin)
          if (ev.type === "batch.complete" || ev.type === "job.failed") {
            cleanup();
            try { controller.close(); } catch { /* déjà fermé */ }
          }
        } catch (err) {
          console.warn("[SSE visuals-stream] enqueue failed:", err);
        }
      };
      emitter.on("event", onEvent);

      // 3. Keep-alive (commentaire SSE — ignoré par EventSource mais maintient la connexion)
      keepAlive = setInterval(() => {
        try { controller.enqueue(encoder.encode(": ka\n\n")); } catch { /* closed */ }
      }, 25_000);

      // 4. Cleanup on disconnect (P1 persona "perception vitesse")
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        emitter.off("event", onEvent);
        if (keepAlive) clearInterval(keepAlive);
        releaseEmitter(projectId);
      };

      // AbortSignal du client (close tab, navigate away)
      request.signal.addEventListener("abort", () => {
        cleanup();
        try { controller.close(); } catch { /* déjà fermé */ }
      });
    },
    cancel() {
      cleaned = true;
      if (keepAlive) clearInterval(keepAlive);
      releaseEmitter(projectId);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // hint Nginx/Replit pour ne pas buffer le stream
    },
  });
}
