/**
 * PlanComparator — US-VS-R1 (s25)
 *
 * Affiche côte-à-côte le plan original et le plan reformaté (canonicalisé).
 * Desktop : grille 2 colonnes. Mobile : stack vertical.
 * Lightbox native : clic sur une image → overlay plein écran, Escape ferme.
 *
 * Mot pivot métier : "plan", "pièce", "lot", "reformaté".
 * Jargon banni (cf. project-context.md s25) — voir prompt-library / ux-writing-guide.
 *
 * Rendu : Client Component (interactions clic + listener clavier).
 */

"use client";

import { useEffect, useState } from "react";
import type { VsPlan } from "@/lib/vs/types";

interface PlanComparatorProps {
  plan: VsPlan;
  /** URL publique du plan original (ex : /api/vs/plans/[id]/file). */
  originalUrl: string;
  /** URL publique du plan reformaté — null si pas encore canonicalisé. */
  canonicalizedUrl: string | null;
}

export default function PlanComparator({
  plan,
  originalUrl,
  canonicalizedUrl,
}: PlanComparatorProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Escape ferme la lightbox
  useEffect(() => {
    if (!lightboxUrl) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxUrl(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxUrl]);

  const fallbackReason = plan.canonical_fallback_reason;
  const hasCanonical = Boolean(canonicalizedUrl);

  return (
    <div className="w-full">
      {/* Bandeau dégradé s'il n'y a pas de version reformatée */}
      {!hasCanonical && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Plan non reformaté — résultats d&apos;analyse moins précis.
          {fallbackReason ? (
            <span className="ml-1 opacity-80">
              ({labelForReason(fallbackReason)})
            </span>
          ) : null}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PlanTile
          label="Original"
          url={originalUrl}
          alt={`Plan original — ${plan.original_filename ?? "sans nom"}`}
          onOpen={() => setLightboxUrl(originalUrl)}
        />
        {hasCanonical && canonicalizedUrl ? (
          <PlanTile
            label="Reformaté"
            url={canonicalizedUrl}
            alt={`Plan reformaté — ${plan.original_filename ?? "sans nom"}`}
            onOpen={() => setLightboxUrl(canonicalizedUrl)}
          />
        ) : (
          <div className="flex aspect-[1.41/1] items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
            Plan reformaté indisponible
          </div>
        )}
      </div>

      {lightboxUrl ? (
        <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      ) : null}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────

function PlanTile({
  label,
  url,
  alt,
  onOpen,
}: {
  label: string;
  url: string;
  alt: string;
  onOpen: () => void;
}) {
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-xs font-medium uppercase tracking-wide text-slate-600">
        {label}
      </figcaption>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Agrandir le plan ${label.toLowerCase()}`}
        className="group relative block aspect-[1.41/1] w-full overflow-hidden rounded-md border border-slate-200 bg-white transition hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          className="h-full w-full object-contain"
          loading="lazy"
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent p-2 text-right text-xs text-white opacity-0 transition group-hover:opacity-100">
          Cliquer pour agrandir
        </span>
      </button>
    </figure>
  );
}

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Plan agrandi"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20"
      >
        Fermer (Échap)
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Plan agrandi"
        className="max-h-full max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function labelForReason(reason: string): string {
  switch (reason) {
    case "timeout":
      return "temps de reformatage dépassé";
    case "api_error":
      return "erreur service IA";
    case "gate_fail":
      return "reformatage non conforme";
    case "empty_input":
      return "plan vide";
    default:
      return reason;
  }
}
