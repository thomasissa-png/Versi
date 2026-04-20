/**
 * ConfirmModal — Modal de confirmation réutilisable Versi Studio
 *
 * Remplace confirm() natif. Focus trap + Escape pour fermer.
 * Variantes : danger (destructive action), default (neutre).
 *
 * Accessibilité :
 * - role="dialog", aria-modal, aria-labelledby, aria-describedby
 * - Focus trap sur [Tab] à l'intérieur du modal
 * - Escape ferme le modal (onCancel)
 * - Focus initial sur le bouton "Annuler" (safer default, évite action destructive sur Enter)
 */

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";

export type ConfirmModalVariant = "danger" | "default";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: ConfirmModalVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel = "Annuler",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  // SSR safety — document.body n'est disponible que côté client.
  // Pattern standard Next.js App Router : setState dans useEffect vide pour détecter
  // le passage client. Alternative useSyncExternalStore disproportionnée pour ce cas.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Focus initial + restauration
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement;
      // Focus le bouton "Annuler" au montage (safer default — évite action destructive sur Enter)
      requestAnimationFrame(() => {
        cancelButtonRef.current?.focus();
      });
    } else if (previouslyFocusedRef.current) {
      previouslyFocusedRef.current.focus();
      previouslyFocusedRef.current = null;
    }
  }, [isOpen]);

  // Escape pour fermer
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    },
    [isOpen, onCancel]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Focus trap
  const handleTabKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !modalRef.current) return;

    const focusables = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  if (!isOpen || !mounted) return null;

  const confirmButtonClasses =
    variant === "danger"
      ? "bg-error hover:bg-error/90 text-text-inverse focus-visible:outline-error"
      : "bg-interactive-primary hover:bg-interactive-hover text-text-inverse focus-visible:outline-interactive-primary";

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-message"
      className="fixed inset-0 z-50 flex items-center justify-center p-md motion-reduce:transition-none"
      onKeyDown={handleTabKey}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-bg-overlay motion-reduce:transition-none"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-bg-card rounded-lg shadow-xl w-full max-w-md p-lg border border-border-default"
      >
        <h2
          id="confirm-modal-title"
          className="text-lg font-semibold text-text-default mb-sm"
        >
          {title}
        </h2>
        <p
          id="confirm-modal-message"
          className="text-sm text-text-muted mb-lg"
        >
          {message}
        </p>
        <div className="flex items-center justify-end gap-sm">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="min-h-[44px] px-md py-sm rounded-md border border-border-default text-text-default hover:bg-bg-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary transition-colors motion-reduce:transition-none"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-[44px] px-md py-sm rounded-md font-medium focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors motion-reduce:transition-none ${confirmButtonClasses}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
