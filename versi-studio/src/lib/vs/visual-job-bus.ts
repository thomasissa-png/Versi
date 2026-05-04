/**
 * Versi Studio — Event bus SSE pour génération visuels Étape 4 v2 (s30 Vague 2)
 *
 * Bus in-memory minimaliste (pas de Redis V2) qui :
 *  - relaye les événements de progression (visual.created, visual.generated,
 *    visual.failed, batch.complete) du worker async vers les EventSources SSE
 *    abonnées via /api/vs/projects/[id]/visuals-stream.
 *  - persiste l'état du job en BDD (vs_visual_jobs) pour résister à un crash
 *    serveur ou à une reconnexion SSE après perte réseau (P1 persona Friction 9).
 *
 * Limites V2 connues : ce bus vit dans le process Node courant. Sur un déploiement
 * Replit autoscale multi-instances, un client SSE connecté à l'instance B ne
 * recevra pas les events émis par l'instance A. Mitigation V2 : la BDD reste
 * source de vérité (le frontend peut interroger GET /jobs/[id] en complément).
 * Migration V3 vers Redis pub/sub si besoin multi-instance.
 *
 * Pattern subscribe : la route SSE garde une référence à un EventEmitter par
 * project_id, le worker push() ses events via emitJobEvent(). Un cleanup
 * sur disconnect côté client est essentiel (P1 persona — perception vitesse).
 */

import { EventEmitter } from "node:events";
import { query } from "@/lib/vs/db";

// ─── Types d'événements SSE ────────────────────────────────────────

export type VisualJobEvent =
  | {
      type: "job.started";
      project_id: string;
      job_id: string;
      expected_count: number;
      estimated_cost_usd: number;
    }
  | {
      type: "visual.created";
      project_id: string;
      job_id: string;
      room_id: string;
      visual_id: string;
      kind: "anchor" | "secondary";
    }
  | {
      type: "visual.generated";
      project_id: string;
      job_id: string;
      room_id: string;
      visual_id: string;
      kind: "anchor" | "secondary";
      file_path: string;
      coherence_mode: "multi_image_native" | "textual_signature" | null;
    }
  | {
      type: "visual.failed";
      project_id: string;
      job_id: string;
      room_id: string;
      photo_id: string;
      error: string;
    }
  | {
      type: "batch.complete";
      project_id: string;
      job_id: string;
      completed_count: number;
      failed_count: number;
    }
  | {
      type: "job.failed";
      project_id: string;
      job_id: string;
      error: string;
    };

// ─── EventEmitter par project_id ───────────────────────────────────

/**
 * Map projectId → EventEmitter. Lazy init. Un emitter persiste tant qu'au
 * moins un listener est abonné OU qu'un job tourne. Cleanup explicite via
 * releaseEmitter() quand plus aucun client n'écoute (cf. SSE disconnect).
 */
const emitters = new Map<string, EventEmitter>();

export function getJobEmitter(projectId: string): EventEmitter {
  let em = emitters.get(projectId);
  if (!em) {
    em = new EventEmitter();
    em.setMaxListeners(20); // ~10 onglets max + marge
    emitters.set(projectId, em);
  }
  return em;
}

export function releaseEmitter(projectId: string): void {
  const em = emitters.get(projectId);
  if (em && em.listenerCount("event") === 0) {
    emitters.delete(projectId);
  }
}

// ─── Émission d'événements (worker → bus + persistance BDD) ───────

/**
 * Emit un event SSE et met à jour les compteurs du job en BDD si pertinent.
 * Idempotent côté DB : SELECT puis UPDATE conditionnel.
 */
export async function emitJobEvent(event: VisualJobEvent): Promise<void> {
  const em = emitters.get(event.project_id);
  if (em) em.emit("event", event);

  // Persist progression côté BDD pour reprise après reconnexion client
  try {
    if (event.type === "visual.generated") {
      await query(
        `UPDATE vs_visual_jobs SET completed_count = completed_count + 1
         WHERE id = $1 AND status = 'running'`,
        [event.job_id]
      );
    } else if (event.type === "visual.failed") {
      await query(
        `UPDATE vs_visual_jobs SET failed_count = failed_count + 1
         WHERE id = $1 AND status = 'running'`,
        [event.job_id]
      );
    } else if (event.type === "batch.complete") {
      await query(
        `UPDATE vs_visual_jobs
         SET status = 'done',
             completed_at = NOW(),
             completed_count = $2,
             failed_count = $3
         WHERE id = $1`,
        [event.job_id, event.completed_count, event.failed_count]
      );
    } else if (event.type === "job.failed") {
      await query(
        `UPDATE vs_visual_jobs
         SET status = 'failed',
             completed_at = NOW(),
             error_message = $2
         WHERE id = $1`,
        [event.job_id, event.error]
      );
    } else if (event.type === "job.started") {
      await query(
        `UPDATE vs_visual_jobs
         SET status = 'running',
             started_at = NOW(),
             expected_count = $2,
             estimated_cost_usd = $3
         WHERE id = $1`,
        [event.job_id, event.expected_count, event.estimated_cost_usd]
      );
    }
  } catch (err) {
    // Log mais ne re-throw pas — un échec de persistance ne doit pas bloquer
    // le worker. Le client peut toujours interroger /jobs/[id] en fallback.
    console.error("[visual-job-bus] persistance event échouée:", err);
  }
}

// ─── Helpers SSE (formatage wire) ──────────────────────────────────

export function formatSseEvent(event: VisualJobEvent): string {
  // Format SSE : event: <type>\ndata: <json>\n\n
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}
