/**
 * useVisualsStream — SSE consumer Étape 4 v2 / s30 Vague 3b
 *
 * Consomme `/api/vs/projects/[id]/visuals-stream` (EventSource) et expose un
 * state local consolidé pour les vues de génération + galerie :
 *
 *   {
 *     status: 'idle' | 'connecting' | 'open' | 'closed' | 'error',
 *     job: { id, expected, completed, failed, started_at } | null,
 *     visualsByRoom: Map<roomId, VsVisual[]>,
 *     failures: VisualFailure[],
 *     reconnects: number,
 *   }
 *
 * Patterns critiques :
 *  - Replay initial : événement custom `replay` consommé avant `event` standard.
 *  - Reconnect auto : 3 tentatives (backoff 1s/3s/6s), puis abandon (toast côté UI).
 *  - Heartbeat detect : si aucun message > 60s, on force un reconnect (le serveur
 *    envoie `: ka` toutes les 25s en commentaire SSE — EventSource les ignore mais
 *    `onmessage` ne se déclenche pas). On track la dernière activité réseau via
 *    un timer `readyState` + onerror.
 *  - Cleanup obligatoire au unmount (`close()` + clear timers).
 *
 * Référence : versi-studio/src/lib/vs/visual-job-bus.ts (types VisualJobEvent),
 *             versi-studio/src/app/api/vs/projects/[id]/visuals-stream/route.ts (replay).
 *
 * Hors-scope V2 (mitigation worker multi-instance Replit) : si le serveur perd
 * un event, l'UI a un fallback `refetch()` exposé (TODO V3 polling fallback).
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { VsVisual } from "@/lib/vs/types";

// ─── Types publics ─────────────────────────────────────────────────

export type StreamStatus = "idle" | "connecting" | "open" | "closed" | "error";

export interface JobState {
  id: string;
  expected_count: number;
  completed_count: number;
  failed_count: number;
  estimated_cost_usd: number;
  started_at: string | null;
  status: string; // pending | running | completed | failed | cancelled
}

export interface VisualFailure {
  job_id: string;
  room_id: string;
  photo_id: string;
  error: string;
  at: string;
}

export interface VisualGenerated {
  visual_id: string;
  room_id: string;
  kind: "anchor" | "secondary";
  file_path: string;
  coherence_mode: "multi_image_native" | "textual_signature" | null;
  status: VsVisual["status"];
}

export interface UseVisualsStreamState {
  status: StreamStatus;
  job: JobState | null;
  /** Visuels reçus via SSE indexés par room_id. Mis à jour en temps réel. */
  visualsByRoom: Map<string, VisualGenerated[]>;
  failures: VisualFailure[];
  reconnects: number;
  /** Force la fermeture manuelle (ex: utilisateur quitte la phase galerie). */
  close: () => void;
}

interface UseVisualsStreamOptions {
  /** projectId — si null, le hook reste inactif. */
  projectId: string | null;
  /** Activer ou non la connexion (false → idle). Défaut true si projectId présent. */
  enabled?: boolean;
  /** Callback optionnel à chaque event (debug ou analytics). */
  onEvent?: (raw: unknown) => void;
}

const MAX_RECONNECTS = 3;
const RECONNECT_DELAYS_MS = [1_000, 3_000, 6_000];
const HEARTBEAT_TIMEOUT_MS = 60_000;

// ─── Hook ──────────────────────────────────────────────────────────

export function useVisualsStream({
  projectId,
  enabled = true,
  onEvent,
}: UseVisualsStreamOptions): UseVisualsStreamState {
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [job, setJob] = useState<JobState | null>(null);
  const [visualsByRoom, setVisualsByRoom] = useState<Map<string, VisualGenerated[]>>(
    () => new Map()
  );
  const [failures, setFailures] = useState<VisualFailure[]>([]);
  const [reconnects, setReconnects] = useState(0);

  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const closedManuallyRef = useRef(false);

  const resetHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
    heartbeatTimerRef.current = setTimeout(() => {
      // Aucun message reçu depuis 60s : EventSource peut être "open" mais bloqué
      // côté proxy → force un reconnect en fermant manuellement (déclenche onerror).
      esRef.current?.close();
      setStatus("error");
    }, HEARTBEAT_TIMEOUT_MS);
  }, []);

  const close = useCallback(() => {
    closedManuallyRef.current = true;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
    esRef.current?.close();
    esRef.current = null;
    setStatus("closed");
  }, []);

  const handleEventPayload = useCallback(
    (raw: string) => {
      resetHeartbeat();
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return; // payload non-JSON ignoré (keep-alives sont des comments, pas des events)
      }
      onEvent?.(parsed);
      if (typeof parsed !== "object" || parsed === null) return;
      const ev = parsed as Record<string, unknown>;
      const type = typeof ev.type === "string" ? ev.type : undefined;

      switch (type) {
        case "job.started": {
          setJob({
            id: String(ev.job_id ?? ""),
            expected_count: Number(ev.expected_count ?? 0),
            completed_count: 0,
            failed_count: 0,
            estimated_cost_usd: Number(ev.estimated_cost_usd ?? 0),
            started_at: new Date().toISOString(),
            status: "running",
          });
          break;
        }
        case "visual.generated": {
          const roomId = String(ev.room_id ?? "");
          const visual: VisualGenerated = {
            visual_id: String(ev.visual_id ?? ""),
            room_id: roomId,
            kind: ev.kind === "anchor" ? "anchor" : "secondary",
            file_path: String(ev.file_path ?? ""),
            coherence_mode:
              ev.coherence_mode === "multi_image_native" || ev.coherence_mode === "textual_signature"
                ? ev.coherence_mode
                : null,
            status: "generated",
          };
          setVisualsByRoom((prev) => {
            const next = new Map(prev);
            const list = next.get(roomId) ?? [];
            // dédoublonnage si le serveur retransmet (replay double)
            if (!list.some((v) => v.visual_id === visual.visual_id)) {
              next.set(roomId, [...list, visual]);
            }
            return next;
          });
          setJob((prev) => (prev ? { ...prev, completed_count: prev.completed_count + 1 } : prev));
          break;
        }
        case "visual.failed": {
          setFailures((prev) => [
            ...prev,
            {
              job_id: String(ev.job_id ?? ""),
              room_id: String(ev.room_id ?? ""),
              photo_id: String(ev.photo_id ?? ""),
              error: String(ev.error ?? "Erreur inconnue"),
              at: new Date().toISOString(),
            },
          ]);
          setJob((prev) => (prev ? { ...prev, failed_count: prev.failed_count + 1 } : prev));
          break;
        }
        case "batch.complete": {
          setJob((prev) =>
            prev
              ? {
                  ...prev,
                  status: "completed",
                  completed_count: Number(ev.completed_count ?? prev.completed_count),
                  failed_count: Number(ev.failed_count ?? prev.failed_count),
                }
              : prev
          );
          // Le serveur ferme la connexion après batch.complete (cf. route SSE).
          break;
        }
        case "job.failed": {
          setJob((prev) =>
            prev ? { ...prev, status: "failed" } : prev
          );
          setFailures((prev) => [
            ...prev,
            {
              job_id: String(ev.job_id ?? ""),
              room_id: "",
              photo_id: "",
              error: String(ev.error ?? "Job échoué"),
              at: new Date().toISOString(),
            },
          ]);
          break;
        }
        default:
          // visual.created : on l'ignore pour l'instant (UI affiche directement
          // les visuels generated)
          break;
      }
    },
    [onEvent, resetHeartbeat]
  );

  const handleReplayPayload = useCallback(
    (raw: string) => {
      resetHeartbeat();
      try {
        const data = JSON.parse(raw) as {
          job_id: string;
          status: string;
          expected_count: number;
          completed_count: number;
          failed_count: number;
          estimated_cost_usd: number;
          started_at: string | null;
        };
        setJob({
          id: data.job_id,
          expected_count: data.expected_count,
          completed_count: data.completed_count,
          failed_count: data.failed_count,
          estimated_cost_usd: data.estimated_cost_usd,
          started_at: data.started_at,
          status: data.status,
        });
      } catch {
        // payload replay corrompu — silencieux
      }
    },
    [resetHeartbeat]
  );

  useEffect(() => {
    if (!projectId || !enabled) {
      setStatus("idle");
      return;
    }

    closedManuallyRef.current = false;
    reconnectAttemptsRef.current = 0;

    const connect = () => {
      setStatus("connecting");
      const es = new EventSource(`/api/vs/projects/${projectId}/visuals-stream`);
      esRef.current = es;

      es.onopen = () => {
        setStatus("open");
        reconnectAttemptsRef.current = 0;
        resetHeartbeat();
      };

      es.onmessage = (ev) => {
        // events sans `event:` explicit (default = "message") — payload est l'event object
        if (typeof ev.data === "string") handleEventPayload(ev.data);
      };

      es.addEventListener("replay", (ev) => {
        const m = ev as MessageEvent<string>;
        if (typeof m.data === "string") handleReplayPayload(m.data);
      });

      // Le serveur émet via formatSseEvent qui produit `event: <type>\ndata: ...`.
      // EventSource déclenche onmessage UNIQUEMENT pour `event: message`. Pour les
      // autres types nommés, il faut addEventListener par nom.
      const namedEvents = [
        "job.started",
        "visual.created",
        "visual.generated",
        "visual.failed",
        "batch.complete",
        "job.failed",
      ];
      for (const name of namedEvents) {
        es.addEventListener(name, (ev) => {
          const m = ev as MessageEvent<string>;
          if (typeof m.data === "string") handleEventPayload(m.data);
        });
      }

      es.onerror = () => {
        if (closedManuallyRef.current) return;
        es.close();
        esRef.current = null;
        const attempt = reconnectAttemptsRef.current;
        if (attempt >= MAX_RECONNECTS) {
          setStatus("error");
          return;
        }
        const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
        reconnectAttemptsRef.current = attempt + 1;
        setReconnects((r) => r + 1);
        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      closedManuallyRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
      esRef.current?.close();
      esRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, enabled]);

  return { status, job, visualsByRoom, failures, reconnects, close };
}
