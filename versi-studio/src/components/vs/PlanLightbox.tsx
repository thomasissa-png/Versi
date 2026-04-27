/**
 * PlanLightbox — Modal preview plein écran pour un plan (image ou PDF)
 *
 * Rendu : Client Component — gestion focus + ESC.
 * Affiche image (img) ou PDF (iframe) plein écran. ESC pour fermer.
 */

"use client";

import { useEffect, useRef } from "react";
import type { VsPlan } from "@/lib/vs/types";

interface PlanLightboxProps {
  plan: VsPlan | null;
  onClose: () => void;
}

export default function PlanLightbox({ plan, onClose }: PlanLightboxProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!plan) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    closeBtnRef.current?.focus();
    // Bloquer le scroll de la page
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [plan, onClose]);

  if (!plan) return null;

  const isImage = plan.mime_type.startsWith("image/");
  const fileUrl = `/api/vs/files?path=${encodeURIComponent(plan.file_path)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Aperçu de ${plan.original_filename || "plan"}`}
      className="fixed inset-0 z-50 flex flex-col bg-black/80 p-md"
      onClick={onClose}
    >
      <div className="flex justify-between items-center mb-sm text-text-inverse">
        <p className="text-sm truncate" title={plan.original_filename || ""}>
          {plan.original_filename || "Plan"}
        </p>
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded text-text-inverse hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-inverse"
          aria-label="Fermer l'aperçu (Échap)"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div
        className="flex-1 flex items-center justify-center overflow-auto bg-white rounded-md"
        onClick={(e) => e.stopPropagation()}
      >
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fileUrl}
            alt={plan.original_filename || "Plan"}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <iframe
            src={fileUrl}
            title={plan.original_filename || "Plan PDF"}
            className="w-full h-full"
          />
        )}
      </div>
    </div>
  );
}
