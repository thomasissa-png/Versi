/**
 * s32 Phase 5 — BriefSummaryDialog.
 *
 * Modale lisible affichée juste avant /visuals/generate :
 *   - Titre : « Avant de générer »
 *   - Body : briefText (synthèse FR construite par buildHumanReadableBrief)
 *   - 2 boutons : « Modifier » (cancel) + « Confirmer et générer » (primary)
 *
 * Source : audit Thomas marchand 7/10 — gap « Le marchand ne sait pas ce que
 * l'IA va générer avant qu'elle génère ». Cette modale donne un dernier check
 * et la possibilité de corriger un champ avant de consommer du crédit IA.
 *
 * UX :
 *   - Backdrop semi-opaque, modale centrée
 *   - Escape ferme (cancel)
 *   - Focus auto sur « Confirmer et générer » à l'ouverture
 *   - Trap focus dans la modale (cycle Tab)
 */

"use client";

import { useEffect, useRef } from "react";

interface Props {
  /** true = visible. */
  open: boolean;
  /** Texte humain de la synthèse (buildHumanReadableBrief). */
  briefText: string;
  /** Estimation indicative coût IA (s29 — affichage non bloquant). */
  costHint?: string | null;
  /** Confirmation utilisateur → continue avec POST /visuals/generate. */
  onConfirm: () => void;
  /** Cancel → ferme la modale, reste sur le wizard. */
  onCancel: () => void;
}

export default function BriefSummaryDialog({
  open,
  briefText,
  costHint,
  onConfirm,
  onCancel,
}: Props) {
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Focus auto sur le bouton primary à l'ouverture.
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      confirmBtnRef.current?.focus();
    });
  }, [open]);

  // Escape ferme la modale + s32 P0-5 focus trap : Tab cycle dans la modale.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
        return;
      }
      if (e.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      // Collecte les focusables internes (exclut tabIndex=-1 et disabled).
      const focusables = dialog.querySelectorAll<HTMLElement>(
        'button:not(:disabled):not([tabindex="-1"]), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="brief-summary-title"
      data-testid="brief-summary-dialog"
      className="fixed inset-0 z-[60] flex items-center justify-center p-md"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fermer la modale"
        onClick={onCancel}
        tabIndex={-1}
        className="absolute inset-0 bg-text-default/40 backdrop-blur-sm cursor-default"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-lg bg-bg-card border border-border-default rounded-md shadow-2xl flex flex-col gap-md p-lg"
      >
        <div className="flex items-start justify-between gap-sm">
          <h2
            id="brief-summary-title"
            className="text-lg uppercase tracking-wide font-semibold font-serif text-text-default"
          >
            Avant de générer
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fermer"
            className="text-text-muted hover:text-text-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary rounded p-2xs"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <p className="text-xs text-text-muted">
          Vérifiez la synthèse de votre brief. Vous pouvez encore modifier un
          champ avant de lancer la génération.
        </p>

        <div
          className="text-sm text-text-default leading-relaxed bg-bg-default/50 border border-border-default rounded-md p-md max-h-[40vh] overflow-y-auto whitespace-pre-wrap"
          data-testid="brief-summary-text"
        >
          {briefText}
        </div>

        {costHint && (
          <p className="text-xs text-text-muted" data-testid="brief-summary-cost-hint">
            Coût estimé : {costHint} (indicatif, non bloquant)
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-sm pt-xs">
          <button
            type="button"
            onClick={onCancel}
            data-testid="brief-summary-cancel"
            className="min-h-[44px] px-md py-sm rounded-md text-sm font-medium border border-border-default text-text-default hover:bg-bg-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
          >
            Modifier
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            data-testid="brief-summary-confirm"
            className="min-h-[44px] px-md py-sm rounded-md text-sm font-semibold bg-interactive-primary text-text-inverse hover:bg-interactive-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
          >
            Confirmer et générer
          </button>
        </div>
      </div>
    </div>
  );
}
