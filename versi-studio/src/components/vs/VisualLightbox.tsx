/**
 * VisualLightbox — Modal aperçu plein écran pour un visuel généré (s33 issue #4).
 *
 * Pattern frère de PlanLightbox.tsx, signature simplifiée pour visuels IA :
 *  - Pas de rendu PDF (visuels = toujours images)
 *  - API minimaliste : { src, alt, onClose }
 *  - WCAG : role="dialog" + aria-modal + ESC + focus return + click backdrop
 *
 * Mindset (CLAUDE.md règle "10 lignes natives plutôt qu'un package") :
 *  - Pas de Radix Dialog ni shadcn — composant léger natif
 *  - Pas de zoom/pan (out of scope V1, voir audit s33 §8)
 */

"use client";

import { useEffect, useRef } from "react";

interface VisualLightboxProps {
  src: string | null;
  alt: string;
  onClose: () => void;
}

export default function VisualLightbox({ src, alt, onClose }: VisualLightboxProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!src) return;
    // Capture l'élément focus pour restore au unmount
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    closeBtnRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus?.();
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Aperçu agrandi — ${alt}`}
      className="fixed inset-0 z-50 flex flex-col bg-black/80 p-md"
      onClick={onClose}
      data-testid="visual-lightbox"
    >
      <div className="flex justify-end items-center mb-sm text-text-inverse">
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded text-text-inverse hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-inverse"
          aria-label="Fermer l'aperçu (Échap)"
          data-testid="visual-lightbox-close"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div
        className="flex-1 flex items-center justify-center overflow-auto rounded-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain"
          data-testid="visual-lightbox-image"
        />
      </div>
    </div>
  );
}
