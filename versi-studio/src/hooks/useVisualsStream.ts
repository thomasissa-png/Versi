/**
 * useVisualsStream — Hook hybride SSE + Polling (s32 P0 fix)
 *
 * BUG s32 résolu : « Connexion interrompue — réessayez » apparaissait quand
 * Thomas changeait d'onglet pendant la génération. Cause : EventSource est
 * agressivement throttlé par Chrome quand la tab perd le focus, et les
 * proxies (Replit autoscale / Vercel idle) coupent les long-lived connections.
 * Le hook v1 dépendait UNIQUEMENT du SSE → faux positif d'erreur alors que
 * le job tournait toujours côté serveur.
 *
 * Pattern Versimo (validé en prod, robuste tab-switch) :
 *  - Polling de `/api/vs/projects/[id]/visuals-job` toutes les 4s comme
 *    SOURCE DE VÉRITÉ (résiste au throttling browser : setInterval continue
 *    en background, même throttlé à 1Hz minimum).
 *  - SSE en mode OPTIONNEL pour low-latency (events arrivent en quasi-temps
 *    réel quand la tab est active). Si SSE drop → on n'affiche AUCUNE erreur,
 *    le polling prend le relais silencieusement.
 *  - Page Visibility API : à `visibilitychange → visible`, on déclenche un
 *    poll immédiat pour rattraper l'état (sinon attendre 4s = UX moche).
 *  - Reconnect SSE en arrière-plan (3 tentatives backoff 1s/3s/6s) — si
 *    succès, on retombe en mode low-latency, sinon on reste en polling pur.
 *  - L'état exposé `status` ne devient JAMAIS "error" tant que le job est
 *    actif côté serveur. Plus de message « Connexion interrompue ».
 *
 * État `status` (sémantique repensée) :
 *  - 'idle'      : hook désactivé (pas de projectId / enabled=false)
 *  - 'connecting': premier poll en cours
 *  - 'open'      : on reçoit des updates (SSE ou polling)
 *  - 'closed'    : job terminé (completed/failed) ou cleanup
 *  - 'error'     : SEULEMENT si l'API GET /visuals-job échoue durablement
 *                  (3 polls consécutifs en erreur réseau) — n'arrive jamais
 *                  sur un simple tab-switch.
 *
 * Référence : versi-studio/src/app/api/vs/projects/[id]/visuals-job/route.ts
 *             versi-studio/src/lib/vs/visual-job-bus.ts (types VisualJobEvent)
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
  /** Visuels reçus (SSE + polling fusionnés) indexés par room_id. */
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

const POLL_INTERVAL_MS = 4_000;
const SSE_RECONNECT_DELAYS_MS = [1_000, 3_000, 6_000];
const MAX_SSE_RECONNECTS = 3;
const POLL_FAILURE_THRESHOLD = 3; // 3 polls consécutifs en erreur → status='error'

// ─── Helpers fusion polling → state ────────────────────────────────

interface VisualsJobResponse {
  success: boolean;
  data?: {
    job: {
      id: string;
      status: "pending" | "running" | "completed" | "failed";
      expected_count: number;
      completed_count: number;
      failed_count: number;
      estimated_cost_usd: number;
      started_at: string | null;
      error: string | null;
    } | null;
    visuals_by_room: Record<string, VisualGenerated[]>;
  };
  error?: string;
}

/** Fusionne deux listes de visuels par visual_id (dédoublonnage). */
function mergeVisualLists(
  current: VisualGenerated[],
  incoming: VisualGenerated[]
): VisualGenerated[] {
  const byId = new Map<string, VisualGenerated>();
  for (const v of current) byId.set(v.visual_id, v);
  for (const v of incoming) byId.set(v.visual_id, v); // incoming écrase (plus récent)
  return Array.from(byId.values());
}

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
  const sseReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sseReconnectAttemptsRef = useRef(0);
  const pollFailuresRef = useRef(0);
  const closedManuallyRef = useRef(false);
  const inFlightPollRef = useRef(false);
  const runPollRef = useRef<() => Promise<void>>(async () => {});

  // ─── Polling : source de vérité ──────────────────────────────────

  const schedulePoll = useCallback((delayMs: number = POLL_INTERVAL_MS) => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    // Lecture via ref pour casser le cycle schedulePoll <-> runPoll sans
    // laisser ESLint râler sur les deps.
    pollTimerRef.current = setTimeout(() => void runPollRef.current(), delayMs);
  }, []);

  const runPoll = useCallback(async () => {
    if (closedManuallyRef.current) return;
    if (!projectId) return;
    if (inFlightPollRef.current) {
      // Évite les polls qui se chevauchent (réseau lent → on saute)
      schedulePoll();
      return;
    }
    inFlightPollRef.current = true;
    try {
      const res = await fetch(`/api/vs/projects/${projectId}/visuals-job`, {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as VisualsJobResponse;
      if (!json.success || !json.data) {
        throw new Error(json.error || "Réponse invalide");
      }

      pollFailuresRef.current = 0;

      // Mise à jour job
      const j = json.data.job;
      if (j) {
        setJob({
          id: j.id,
          expected_count: j.expected_count,
          completed_count: j.completed_count,
          failed_count: j.failed_count,
          estimated_cost_usd: j.estimated_cost_usd,
          started_at: j.started_at,
          status: j.status,
        });
      }

      // Mise à jour visuels (fusion avec ce qui est déjà là, dédoublonnage par visual_id)
      const incoming = json.data.visuals_by_room;
      if (incoming && Object.keys(incoming).length > 0) {
        setVisualsByRoom((prev) => {
          const next = new Map(prev);
          for (const [roomId, list] of Object.entries(incoming)) {
            const cur = next.get(roomId) ?? [];
            const merged = mergeVisualLists(cur, list);
            // Garde l'ordre stable : items déjà présents en premier, nouveaux à la fin
            next.set(roomId, merged);
          }
          return next;
        });
      }

      // Statut UI : 'open' tant que ça avance, 'closed' si terminal
      if (j && (j.status === "completed" || j.status === "failed")) {
        setStatus("closed");
        // On stoppe le polling ; l'UI bascule en preview
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
        return;
      }

      setStatus((prev) => (prev === "idle" || prev === "connecting" ? "open" : prev));
      // Si on était en 'error' à cause de polls KO, on rebascule en 'open'
      setStatus((prev) => (prev === "error" ? "open" : prev));

      schedulePoll();
    } catch {
      pollFailuresRef.current += 1;
      if (pollFailuresRef.current >= POLL_FAILURE_THRESHOLD) {
        // 3 polls consécutifs KO → vraie erreur réseau (pas un tab-switch)
        setStatus("error");
      }
      // On retente quand même — réseau rétabli un jour
      schedulePoll();
    } finally {
      inFlightPollRef.current = false;
    }
  }, [projectId, schedulePoll]);

  // Garde la ref en phase avec la dernière closure (évite les fermetures stale)
  useEffect(() => {
    runPollRef.current = runPoll;
  }, [runPoll]);

  // ─── SSE : low-latency optionnel ─────────────────────────────────

  const handleEventPayload = useCallback(
    (raw: string) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return;
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
          // Force un poll immédiat pour synchroniser l'état initial
          void runPoll();
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
            if (!list.some((v) => v.visual_id === visual.visual_id)) {
              next.set(roomId, [...list, visual]);
            }
            return next;
          });
          setJob((prev) =>
            prev ? { ...prev, completed_count: prev.completed_count + 1 } : prev
          );
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
          // On laisse le polling final confirmer (et basculer status='closed')
          void runPoll();
          break;
        }
        case "job.failed": {
          setJob((prev) => (prev ? { ...prev, status: "failed" } : prev));
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
          void runPoll();
          break;
        }
        default:
          break;
      }
    },
    [onEvent, runPoll]
  );

  const handleReplayPayload = useCallback((raw: string) => {
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
      // payload corrompu — silencieux
    }
  }, []);

  const connectSse = useCallback(() => {
    if (!projectId) return;
    if (closedManuallyRef.current) return;
    // On ne ferme PAS le polling : SSE = bonus, polling = filet
    const es = new EventSource(`/api/vs/projects/${projectId}/visuals-stream`);
    esRef.current = es;

    es.onopen = () => {
      sseReconnectAttemptsRef.current = 0;
      // Statut 'open' déjà géré par le polling — on ne touche à rien
    };

    es.onmessage = (ev) => {
      if (typeof ev.data === "string") handleEventPayload(ev.data);
    };

    es.addEventListener("replay", (ev) => {
      const m = ev as MessageEvent<string>;
      if (typeof m.data === "string") handleReplayPayload(m.data);
    });

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
      // CRITIQUE : on NE bascule PAS status='error'. Le polling continue
      // de tourner en arrière-plan → l'UI reste fluide. Le SSE est un bonus
      // de latence, pas une dépendance dure.
      const attempt = sseReconnectAttemptsRef.current;
      if (attempt >= MAX_SSE_RECONNECTS) {
        // On abandonne le SSE pour ce hook lifecycle. Polling pur prend le relais.
        return;
      }
      const delay =
        SSE_RECONNECT_DELAYS_MS[Math.min(attempt, SSE_RECONNECT_DELAYS_MS.length - 1)];
      sseReconnectAttemptsRef.current = attempt + 1;
      setReconnects((r) => r + 1);
      sseReconnectTimerRef.current = setTimeout(connectSse, delay);
    };
  }, [projectId, handleEventPayload, handleReplayPayload]);

  // ─── Cleanup ─────────────────────────────────────────────────────

  const close = useCallback(() => {
    closedManuallyRef.current = true;
    if (sseReconnectTimerRef.current) clearTimeout(sseReconnectTimerRef.current);
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    sseReconnectTimerRef.current = null;
    pollTimerRef.current = null;
    esRef.current?.close();
    esRef.current = null;
    setStatus("closed");
  }, []);

  // ─── Lifecycle principal ─────────────────────────────────────────

  useEffect(() => {
    if (!projectId || !enabled) {
      setStatus("idle");
      return;
    }

    closedManuallyRef.current = false;
    sseReconnectAttemptsRef.current = 0;
    pollFailuresRef.current = 0;
    setStatus("connecting");

    // 1. Lance le polling immédiat (source de vérité)
    void runPoll();
    // 2. Lance le SSE en bonus (low-latency)
    connectSse();

    return () => {
      closedManuallyRef.current = true;
      if (sseReconnectTimerRef.current) clearTimeout(sseReconnectTimerRef.current);
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      sseReconnectTimerRef.current = null;
      pollTimerRef.current = null;
      esRef.current?.close();
      esRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, enabled]);

  // ─── Page Visibility API : poll immédiat sur retour de tab ──────

  useEffect(() => {
    if (!projectId || !enabled) return;
    if (typeof document === "undefined") return;

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (closedManuallyRef.current) return;
      // Le browser a probablement throttlé le polling pendant le background.
      // On force un poll immédiat pour rattraper, et on reset le SSE si mort.
      void runPoll();
      if (!esRef.current && sseReconnectAttemptsRef.current < MAX_SSE_RECONNECTS) {
        // Tente un reconnect SSE silencieux
        connectSse();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    // Egalement : 'focus' pour les browsers qui ne déclenchent pas visibilitychange
    window.addEventListener("focus", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, enabled]);

  return { status, job, visualsByRoom, failures, reconnects, close };
}
