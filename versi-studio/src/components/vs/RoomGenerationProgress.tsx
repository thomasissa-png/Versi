/**
 * RoomGenerationProgress — Vue de progression pour UNE pièce (s32 Phase 4).
 *
 * Affiché entre l'état `configuring` et `preview` du wizard pièce-par-pièce.
 * Remplace le canvas + uploads par un panneau "Génération en cours...".
 *
 * Différent de GenerationProgressView (qui affiche TOUTES les pièces du job
 * en parallèle). Ici on est focalisé sur 1 seule pièce, donc l'affichage est
 * plus minimaliste : spinner + message + count partiel.
 */

"use client";

export interface RoomGenerationProgressProps {
  roomName: string;
  /** Visuels déjà reçus pour cette pièce (filtré par room_id côté parent). */
  receivedCount: number;
  /** Cible attendue (1 ancre + N secondaires). Défaut 1. */
  targetCount: number;
  /** Cancel / retour au mode configuring. */
  onCancel: () => void;
  /** Indique une erreur SSE remontée par le hook (status === 'error'). */
  errorMessage?: string | null;
}

export default function RoomGenerationProgress({
  roomName,
  receivedCount,
  targetCount,
  onCancel,
  errorMessage,
}: RoomGenerationProgressProps) {
  const pct = targetCount > 0 ? Math.min(100, Math.round((receivedCount / targetCount) * 100)) : 0;
  const hasError = !!errorMessage;

  return (
    <section
      className="flex flex-col gap-lg w-full"
      data-testid="room-generation-progress"
      aria-labelledby="room-progress-title"
      aria-live="polite"
    >
      <header className="flex flex-col gap-xs">
        <p className="text-xs uppercase tracking-widest text-text-muted">
          Génération en cours
        </p>
        <h2
          id="room-progress-title"
          className="text-xl sm:text-2xl uppercase tracking-wide font-semibold font-serif text-text-default"
        >
          {roomName}
        </h2>
      </header>

      <div className="rounded-md border border-border-default bg-bg-card p-lg flex flex-col items-center gap-md">
        {!hasError ? (
          <>
            <span
              className="inline-block w-10 h-10 border-4 border-interactive-primary/30 border-t-interactive-primary rounded-full animate-spin"
              aria-hidden="true"
            />
            <p className="text-sm text-text-default text-center">
              Création des visuels pour cette pièce...
              <br />
              <span className="text-xs text-text-muted">
                Environ 3 minutes — vous pouvez patienter ici.
              </span>
            </p>
          </>
        ) : (
          <>
            <span
              className="inline-flex w-10 h-10 items-center justify-center rounded-full bg-error/10 text-error text-lg font-semibold"
              aria-hidden="true"
            >
              !
            </span>
            <p className="text-sm text-error text-center">
              {errorMessage}
            </p>
          </>
        )}

        <div
          className="w-full max-w-xs h-1 rounded-full bg-bg-default overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div
            className="h-full bg-interactive-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-text-muted">
          {receivedCount} / {targetCount} visuel{targetCount > 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onCancel}
          data-testid="room-generation-cancel"
          className="min-h-[44px] px-md py-sm rounded-md text-sm font-medium border border-border-default text-text-default hover:bg-bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
        >
          Annuler
        </button>
      </div>
    </section>
  );
}
