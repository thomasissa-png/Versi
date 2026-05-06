/**
 * RefineVisualDialog — Modal "Affiner ce visuel" (s32 #P4 Thomas prod)
 *
 * Pattern Versimo : sur chaque visuel généré, l'utilisateur peut entrer
 * un prompt de modification et regénérer une version raffinée. Backend
 * existant : POST /api/vs/visuals/[id]/iterate + GET /[id]/status (polling).
 *
 * Flux UI :
 *  1. Aperçu du visuel actuel + textarea (max 500 chars)
 *  2. Soumission → spinner + message "Génération en cours... ~30s"
 *  3. Polling status toutes les 4s jusqu'à 'generated' ou 'failed'
 *  4. Succès : remontée au parent via onRefined(newVisualId), modal close
 *  5. Erreur : affichage message + retry possible
 *
 * Annulation : un AbortController arrête les polls au démontage.
 *
 * Pas d'appel direct OpenAI — purement orchestration UI.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { ApiResponse } from "@/lib/vs/types";

/**
 * Sélecteur des éléments focusables internes au dialog (focus trap).
 * Source : recommandations WAI-ARIA Authoring Practices Guide (APG) — pattern dialog.
 */
const FOCUSABLE_SELECTOR =
  'button:not(:disabled), [href], textarea:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])';

export interface RefineVisualDialogProps {
  /** ID du visuel parent à raffiner. */
  parentVisualId: string;
  /** URL src de l'image parent (pour aperçu, format /api/vs/files?path=...). */
  parentImageSrc: string | null;
  /** Nom de la pièce (alt + label visuel). */
  roomName: string;
  /** Callback fermeture (annulation utilisateur ou succès). */
  onClose: () => void;
  /** Callback succès : remonte le nouveau visuel pour ajout immédiat à la liste. */
  onRefined: (newVisualId: string) => void;
}

const MAX_INSTRUCTION_LENGTH = 500;
const POLL_INTERVAL_MS = 4000;
const POLL_MAX_DURATION_MS = 120_000; // 2 min — au-delà on déclare timeout côté UI

interface VisualStatus {
  id: string;
  status: "processing" | "generated" | "validated" | "failed";
  file_path: string | null;
  error_message: string | null;
}

export default function RefineVisualDialog({
  parentVisualId,
  parentImageSrc,
  roomName,
  onClose,
  onRefined,
}: RefineVisualDialogProps) {
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingVisualId, setPendingVisualId] = useState<string | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);
  // B1 / B2 — refs focus management (autoFocus textarea + focus trap + restore)
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Cleanup poll au démontage
  useEffect(() => {
    return () => {
      pollAbortRef.current?.abort();
    };
  }, []);

  // B1 — autofocus textarea à l'ouverture (WCAG 2.4.3 Focus Order)
  // B2 — capture l'élément qui avait le focus pour restore au unmount
  useEffect(() => {
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Délai 0 : laisse React monter le DOM avant de focus
    const t = setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
    return () => {
      clearTimeout(t);
      // Restore focus sur l'ouvreur du modal (pattern WAI-ARIA APG)
      previouslyFocusedRef.current?.focus?.();
    };
  }, []);

  // B2 — focus trap : Tab cycle dans le panneau (et reverse Shift+Tab)
  useEffect(() => {
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
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
    window.addEventListener("keydown", handleTab);
    return () => window.removeEventListener("keydown", handleTab);
  }, []);

  // Escape pour fermer (uniquement si pas en cours de génération)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [busy, onClose]);

  const handleSubmit = useCallback(async () => {
    const trimmed = instruction.trim();
    if (!trimmed) {
      setError("Décrivez la modification souhaitée.");
      return;
    }
    if (trimmed.length > MAX_INSTRUCTION_LENGTH) {
      setError(`Maximum ${MAX_INSTRUCTION_LENGTH} caractères.`);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/vs/visuals/${parentVisualId}/iterate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: trimmed }),
      });
      const json = (await res.json()) as ApiResponse<{ visual_id: string }>;
      if (!json.success) {
        setError(json.error);
        setBusy(false);
        return;
      }
      const newId = json.data.visual_id;
      setPendingVisualId(newId);
      // Polling status (jusqu'à generated/failed/timeout)
      const ac = new AbortController();
      pollAbortRef.current = ac;
      const startedAt = Date.now();
      const poll = async () => {
        if (ac.signal.aborted) return;
        try {
          const sRes = await fetch(`/api/vs/visuals/${newId}/status`, {
            signal: ac.signal,
          });
          const sJson = (await sRes.json()) as ApiResponse<VisualStatus>;
          if (!sJson.success) {
            // erreur transitoire : on retente
            setTimeout(poll, POLL_INTERVAL_MS);
            return;
          }
          const st = sJson.data.status;
          if (st === "generated" || st === "validated") {
            onRefined(newId);
            setBusy(false);
            // onClose appelé par parent via setTimeout après MAJ liste
            return;
          }
          if (st === "failed") {
            setError(
              sJson.data.error_message ||
                "La génération a échoué. Vérifiez votre connexion et réessayez."
            );
            setBusy(false);
            setPendingVisualId(null);
            return;
          }
          // processing : on continue
          if (Date.now() - startedAt > POLL_MAX_DURATION_MS) {
            setError("Délai dépassé — réessayez dans quelques instants.");
            setBusy(false);
            setPendingVisualId(null);
            return;
          }
          setTimeout(poll, POLL_INTERVAL_MS);
        } catch (err) {
          if (ac.signal.aborted) return;
          setError(err instanceof Error ? err.message : "Erreur réseau — vérifiez votre connexion et réessayez.");
          setBusy(false);
          setPendingVisualId(null);
        }
      };
      void poll();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur réseau — vérifiez votre connexion et réessayez."
      );
      setBusy(false);
    }
  }, [instruction, parentVisualId, onRefined]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="refine-dialog-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-md animate-in fade-in duration-200"
      onClick={(e) => {
        // Click sur backdrop ferme (sauf busy)
        if (e.target === e.currentTarget && !busy) onClose();
      }}
      data-testid="refine-visual-dialog"
    >
      <div
        ref={panelRef}
        style={{ paddingBottom: "max(var(--app-spacing-lg, 1.5rem), env(safe-area-inset-bottom))" }}
        className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-xl sm:rounded-md bg-bg-card border border-border-default shadow-xl flex flex-col gap-md p-lg"
      >
        <header className="flex flex-col gap-xs">
          <p className="text-xs uppercase tracking-widest text-text-muted">
            Affiner le visuel
          </p>
          <h3
            id="refine-dialog-title"
            className="text-lg sm:text-xl font-semibold font-serif text-text-default"
          >
            {roomName}
          </h3>
          <p className="text-sm text-text-muted">
            Décrivez ce que vous souhaitez changer — l&apos;IA produit une nouvelle version en conservant l&apos;ambiance du visuel.
          </p>
        </header>

        {/* Aperçu visuel parent (taille réduite) */}
        {parentImageSrc && (
          <div className="relative aspect-[4/3] w-full max-h-48 overflow-hidden rounded-md border border-border-default bg-bg-canvas">
            <Image
              src={parentImageSrc}
              alt={`Visuel actuel — ${roomName}`}
              fill
              sizes="(max-width: 640px) 100vw, 512px"
              className="object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Textarea instruction */}
        <div className="flex flex-col gap-xs">
          <label
            htmlFor="refine-instruction"
            className="text-xs text-text-muted"
          >
            Que voulez-vous modifier ?
          </label>
          <textarea
            ref={textareaRef}
            id="refine-instruction"
            value={instruction}
            onChange={(e) =>
              setInstruction(e.target.value.slice(0, MAX_INSTRUCTION_LENGTH))
            }
            placeholder="Ex: ajouter une plante près du canapé, changer la couleur du tapis, plus de lumière naturelle..."
            rows={4}
            maxLength={MAX_INSTRUCTION_LENGTH}
            disabled={busy}
            data-testid="refine-instruction-input"
            className="w-full px-md py-sm text-sm rounded-md border border-border-default bg-bg-default text-text-default placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary resize-y disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-text-muted text-right">
            {instruction.length} / {MAX_INSTRUCTION_LENGTH}
          </p>
        </div>

        {/* État busy : spinner + message */}
        {busy && pendingVisualId && (
          <div
            className="flex items-center gap-sm rounded-md border border-info/40 bg-info/5 px-md py-sm"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            data-testid="refine-busy-feedback"
          >
            <div className="inline-block w-4 h-4 border-2 border-info border-t-transparent rounded-full animate-spin shrink-0" />
            <p className="text-sm text-text-default">
              Génération en cours — comptez environ 30 secondes. Ne fermez pas cette fenêtre.
            </p>
          </div>
        )}

        {/* Erreur */}
        {error && !busy && (
          <div
            className="rounded-md border border-error/40 bg-error/5 px-md py-sm"
            role="alert"
          >
            <p className="text-sm text-text-default">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-sm pt-sm border-t border-border-default">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            data-testid="refine-cancel"
            className="min-h-[44px] px-md py-sm rounded-md text-sm font-medium border border-border-default text-text-default hover:bg-bg-default disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={busy || instruction.trim().length === 0}
            data-testid="refine-submit"
            className="min-h-[44px] px-xl py-sm rounded-md text-sm font-semibold bg-interactive-primary text-text-inverse hover:bg-interactive-hover disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
          >
            {busy ? "En cours..." : "Affiner"}
          </button>
        </div>
      </div>
    </div>
  );
}
