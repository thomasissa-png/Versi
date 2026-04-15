/**
 * VisualResult — Affiche le visuel généré avec actions et historique
 *
 * 5 états : processing (barre progression), failed (retry), generated (actions), validated (badge).
 * Historique des visuels en scroll horizontal en bas.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import type { VsVisual } from "@/lib/vs/types";
import { STYLES, type StyleId } from "@/lib/vs/styles";

interface VisualResultProps {
  /** Visuel actif (celui affiché en grand) */
  activeVisual: VsVisual | null;
  /** Tous les visuels de cette pièce (historique) */
  allVisuals: VsVisual[];
  /** Callback quand on clique Itérer */
  onIterate: () => void;
  /** Callback quand on clique Valider */
  onValidate: (visualId: string) => void;
  /** Callback quand on clique Autre style */
  onChangeStyle: () => void;
  /** Callback quand on clique Réessayer (erreur) */
  onRetry: () => void;
  /** Callback quand on sélectionne un visuel dans l'historique */
  onSelectVisual: (visual: VsVisual) => void;
  /** Est-ce que la validation est en cours */
  isValidating?: boolean;
}

// ─── Timer de progression ────────────────────────────────────────

function useProgressTimer(isProcessing: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isProcessing) {
      setElapsed(0);
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isProcessing]);

  return elapsed;
}

// ─── Composant principal ─────────────────────────────────────────

export default function VisualResult({
  activeVisual,
  allVisuals,
  onIterate,
  onValidate,
  onChangeStyle,
  onRetry,
  onSelectVisual,
  isValidating = false,
}: VisualResultProps) {
  const isProcessing = activeVisual?.status === "processing";
  const isFailed = activeVisual?.status === "failed";
  const isGenerated = activeVisual?.status === "generated";
  const isValidated = activeVisual?.status === "validated";
  const elapsed = useProgressTimer(isProcessing);

  // Estimation de la progression (90s)
  const progressPercent = isProcessing ? Math.min((elapsed / 90) * 100, 95) : 0;

  const styleName = activeVisual?.style_id
    ? STYLES[activeVisual.style_id as StyleId]?.name ?? activeVisual.style_id
    : "";

  // Historique : filtrer les visuels générés ou validés (pas processing/failed)
  const historyVisuals = allVisuals.filter(
    (v) => v.status === "generated" || v.status === "validated"
  );

  if (!activeVisual) return null;

  return (
    <div className="flex flex-col gap-lg">
      {/* ─── État Processing ─────────────────────────────────────── */}
      {isProcessing && (
        <div className="flex flex-col items-center justify-center py-4xl">
          {/* Barre de progression */}
          <div className="w-full max-w-sm mb-lg">
            <div className="h-2 bg-border-default rounded-full overflow-hidden">
              <div
                className="h-full bg-interactive-primary rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <p className="text-sm text-text-muted">
            Création en cours — environ 90 secondes
          </p>
          <p className="text-xs text-text-muted mt-xs">
            {elapsed}s écoulées
          </p>
        </div>
      )}

      {/* ─── État Failed ─────────────────────────────────────────── */}
      {isFailed && (
        <div className="flex flex-col items-center justify-center py-4xl">
          <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mb-md">
            <svg
              className="w-6 h-6 text-error"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <p className="text-sm text-text-default mb-xs">
            La création a échoué — réessayez
          </p>
          {activeVisual.error_message && (
            <p className="text-xs text-text-muted mb-md max-w-sm text-center">
              {activeVisual.error_message}
            </p>
          )}
          <button
            onClick={onRetry}
            className="
              px-xl py-sm rounded-md text-sm font-medium
              bg-interactive-primary text-text-inverse
              hover:bg-interactive-hover transition-colors duration-200
            "
          >
            Réessayer
          </button>
        </div>
      )}

      {/* ─── État Generated / Validated ──────────────────────────── */}
      {(isGenerated || isValidated) && (
        <div className="flex flex-col gap-md">
          {/* Badge style + validé */}
          <div className="flex items-center gap-sm">
            <span className="text-xs uppercase tracking-widest text-text-muted">
              {styleName}
            </span>
            {isValidated && (
              <span className="inline-flex items-center gap-2xs px-sm py-2xs rounded-full text-xs font-medium bg-success/10 text-success">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Validé
              </span>
            )}
          </div>

          {/* Image du visuel */}
          <div className="relative rounded-lg overflow-hidden bg-bg-card border border-border-default">
            {activeVisual.file_path && activeVisual.file_path !== "placeholder" ? (
              <img
                src={`/api/vs/files?path=${encodeURIComponent(activeVisual.file_path)}`}
                alt={`Visuel ${styleName}`}
                className="w-full h-auto max-h-[500px] object-contain"
              />
            ) : (
              <div className="w-full h-64 bg-gris-chaud/20 flex items-center justify-center">
                <div className="text-center">
                  <svg
                    className="w-12 h-12 text-text-muted mx-auto mb-sm"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                    />
                  </svg>
                  <p className="text-sm text-text-muted">Visuel de démonstration</p>
                  <p className="text-xs text-text-muted mt-2xs">
                    Mode simulation — configurez OPENAI_API_KEY pour la génération réelle
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-sm">
            {isGenerated && (
              <>
                <button
                  onClick={() => onValidate(activeVisual.id)}
                  disabled={isValidating}
                  className="
                    flex-1 px-lg py-sm rounded-md text-sm font-medium
                    bg-interactive-primary text-text-inverse
                    hover:bg-interactive-hover transition-colors duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  {isValidating ? "Validation..." : "Valider ce visuel"}
                </button>
                <button
                  onClick={onIterate}
                  className="
                    px-lg py-sm rounded-md text-sm font-medium
                    border border-border-default text-text-default
                    hover:bg-bg-card transition-colors duration-200
                  "
                >
                  Modifier
                </button>
                <button
                  onClick={onChangeStyle}
                  className="
                    px-lg py-sm rounded-md text-sm font-medium
                    border border-border-default text-text-muted
                    hover:bg-bg-card hover:text-text-default transition-colors duration-200
                  "
                >
                  Essayer un autre style
                </button>
              </>
            )}
            {isValidated && (
              <>
                <button
                  onClick={onIterate}
                  className="
                    px-lg py-sm rounded-md text-sm font-medium
                    border border-border-default text-text-default
                    hover:bg-bg-card transition-colors duration-200
                  "
                >
                  Modifier
                </button>
                <button
                  onClick={onChangeStyle}
                  className="
                    px-lg py-sm rounded-md text-sm font-medium
                    border border-border-default text-text-muted
                    hover:bg-bg-card hover:text-text-default transition-colors duration-200
                  "
                >
                  Essayer un autre style
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Historique horizontal ───────────────────────────────── */}
      {historyVisuals.length > 1 && (
        <div className="mt-md">
          <p className="text-xs uppercase tracking-widest text-text-muted mb-sm">
            Historique
          </p>
          <div className="flex gap-sm overflow-x-auto pb-sm">
            {historyVisuals.map((visual) => {
              const isActive = visual.id === activeVisual?.id;
              const vStyleName =
                STYLES[visual.style_id as StyleId]?.name ?? visual.style_id;

              return (
                <button
                  key={visual.id}
                  onClick={() => onSelectVisual(visual)}
                  className={`
                    flex-shrink-0 w-24 rounded-md overflow-hidden border-2 transition-all duration-200
                    ${isActive ? "border-interactive-primary" : "border-transparent hover:border-border-default"}
                  `}
                  aria-label={`Visuel ${vStyleName}`}
                  aria-pressed={isActive}
                >
                  {visual.file_path && visual.file_path !== "placeholder" ? (
                    <img
                      src={`/api/vs/files?path=${encodeURIComponent(visual.file_path)}`}
                      alt={`Visuel ${vStyleName}`}
                      className="w-full h-16 object-cover"
                    />
                  ) : (
                    <div className="w-full h-16 bg-gris-chaud/20 flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-text-muted"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="p-2xs">
                    <p className="text-[10px] text-text-muted truncate">{vStyleName}</p>
                    {visual.status === "validated" && (
                      <span className="text-[10px] text-success font-medium">Validé</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
