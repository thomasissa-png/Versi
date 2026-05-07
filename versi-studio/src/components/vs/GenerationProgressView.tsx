/**
 * GenerationProgressView — Étape 4 v2 / s30 Vague 3b
 *
 * Vue affichée pendant la génération streaming. Lit le state `useVisualsStream`
 * et affiche par pièce :
 *   - Statut (pending / generating / done / failed)
 *   - Compteur "X/Y visuels"
 *   - Spinner ou check selon état
 *
 * Gère 3 états globaux :
 *   - running       → barre globale + liste pièces avec status temps réel
 *   - completed     → callback onComplete (parent bascule en VisualGallery)
 *   - failed/error  → message + bouton "Réessayer" (relance preflight)
 *
 * P1 persona "streaming par pièce" : la liste affiche chaque pièce avec
 * son nombre de visuels prêts (3/5 par ex.) et un indicateur visuel.
 *
 * A11y : `aria-live="polite"` sur le compteur global, `role="status"` par item.
 */

"use client";

import { useEffect, useMemo } from "react";
import type { VsRoom } from "@/lib/vs/types";
import { getRoomLabel } from "@/lib/vs/styles";
import type { JobState, VisualGenerated, VisualFailure, StreamStatus } from "@/hooks/useVisualsStream";

export interface RoomTarget {
  room_id: string;
  target: number;
}

export interface GenerationProgressViewProps {
  rooms: VsRoom[];
  /** Map<room_id, target_visual_count> — borne supérieure attendue par pièce. */
  roomTargets: RoomTarget[];
  job: JobState | null;
  visualsByRoom: Map<string, VisualGenerated[]>;
  failures: VisualFailure[];
  streamStatus: StreamStatus;
  reconnects: number;
  /** Appelé quand job.status passe à 'completed'. */
  onComplete: () => void;
  /** Réinitialise le flow (retour aux settings). */
  onCancel: () => void;
}

export default function GenerationProgressView({
  rooms,
  roomTargets,
  job,
  visualsByRoom,
  failures,
  streamStatus,
  reconnects,
  onComplete,
  onCancel,
}: GenerationProgressViewProps) {
  // ─── Auto-bascule vers galerie quand batch.complete ─────────────
  useEffect(() => {
    if (job?.status === "completed") {
      onComplete();
    }
  }, [job?.status, onComplete]);

  const targetByRoom = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of roomTargets) m.set(t.room_id, t.target);
    return m;
  }, [roomTargets]);

  const failuresByRoom = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of failures) m.set(f.room_id, (m.get(f.room_id) ?? 0) + 1);
    return m;
  }, [failures]);

  const totalExpected = job?.expected_count ?? 0;
  const totalDone = (job?.completed_count ?? 0) + (job?.failed_count ?? 0);
  const percent = totalExpected > 0 ? Math.min(100, Math.round((totalDone / totalExpected) * 100)) : 0;

  const isFailed = job?.status === "failed" || streamStatus === "error";

  return (
    <div className="flex flex-col gap-lg p-lg">
      {/* Header global */}
      <div className="flex flex-col gap-sm">
        <h2 className="text-base font-semibold text-text-default">
          {isFailed ? "Génération interrompue" : "Génération en cours…"}
        </h2>
        <p className="text-sm text-text-muted" aria-live="polite">
          {totalDone} sur {totalExpected} visuel{totalExpected > 1 ? "s" : ""} prêt{totalDone > 1 ? "s" : ""}
        </p>
        <div
          className="h-2 bg-border-default rounded-full overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div
            className={
              "h-full rounded-full transition-all duration-500 ease-out " +
              (isFailed ? "bg-error" : "bg-interactive-primary")
            }
            style={{ width: `${percent}%` }}
          />
        </div>
        {reconnects > 0 && !isFailed && (
          <p className="text-xs text-warning" role="status">
            Reconnexion au flux ({reconnects})…
          </p>
        )}
      </div>

      {/* Liste pièces */}
      <ul className="flex flex-col gap-sm" aria-label="Progression par pièce">
        {rooms
          .filter((r) => (targetByRoom.get(r.id) ?? 0) > 0)
          .map((room) => {
            const target = targetByRoom.get(room.id) ?? 0;
            const done = visualsByRoom.get(room.id)?.length ?? 0;
            const fails = failuresByRoom.get(room.id) ?? 0;
            const label = room.custom_label || getRoomLabel(room.room_type);
            const isDone = done >= target;
            const isErrored = fails > 0 && done + fails >= target;

            return (
              <li
                key={room.id}
                className="flex items-center justify-between gap-md rounded-md border border-border-default bg-bg-card px-md py-sm"
                role="status"
                aria-label={`${label} — ${done} sur ${target} visuels prêts`}
                data-testid={`progress-room-${room.id}`}
              >
                <span className="text-sm font-medium text-text-default truncate">{label}</span>
                <div className="flex items-center gap-sm">
                  <span className="text-xs text-text-muted">
                    {done}/{target}
                  </span>
                  {isErrored ? (
                    <span className="text-error" aria-label="Échec">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </span>
                  ) : isDone ? (
                    <span className="text-success" aria-label="Terminé">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  ) : (
                    <span
                      className="inline-block w-4 h-4 border-2 border-border-default border-t-interactive-primary rounded-full animate-spin"
                      aria-label="En cours"
                    />
                  )}
                </div>
              </li>
            );
          })}
      </ul>

      {/* Footer actions */}
      {isFailed && (
        <div className="flex flex-col-reverse sm:flex-row gap-sm justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] px-lg py-sm rounded-md text-sm font-medium border border-border-default text-text-default hover:bg-bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
          >
            Revenir aux paramètres
          </button>
        </div>
      )}
    </div>
  );
}
