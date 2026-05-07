/**
 * VisualGallery — Étape 4 v2 / s30 Vague 3b
 *
 * Galerie résultats finale après génération SSE. 1 row par pièce.
 *
 * Affichage par visuel :
 *  - Thumbnail (next/image, lazy)
 *  - Indicateur ancre (★) ou secondaire
 *  - Badge cohérence si coherence_mode === 'textual_signature'
 *      → "Cohérence : réduite" avec tooltip explicatif (P1 persona R1 fallback)
 *  - Bouton "Régénérer ce visuel" (POST /api/vs/visuals/[id]/regenerate)
 *
 * Performance : `<Image>` Next.js avec loading="lazy". Si > 50 visuels :
 * la performance reste OK car le render est un grid simple, mais on peut
 * envisager react-window plus tard (V3).
 *
 * A11y : alt explicite, badge "title" pour tooltip, focus-visible.
 */

"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import type { VsRoom, ApiResponse } from "@/lib/vs/types";
import { getRoomLabel, STYLES, type StyleId } from "@/lib/vs/styles";
import type { VisualGenerated } from "@/hooks/useVisualsStream";
import VisualLightbox from "@/components/vs/VisualLightbox";

export interface VisualGalleryProps {
  rooms: VsRoom[];
  visualsByRoom: Map<string, VisualGenerated[]>;
  /** Style choisi pour la génération (header). */
  styleId: string;
  /** Retourne aux paramètres (relance modifiable). */
  onBackToSettings: () => void;
  /** Le visuel a été régénéré → MAJ store local (file_path neuf, status). */
  onVisualUpdated: (roomId: string, updated: VisualGenerated) => void;
}

interface RegenerateResponse {
  visual_id: string;
  file_path: string;
  status: "generated";
  kind: "anchor" | "secondary";
}

export default function VisualGallery({
  rooms,
  visualsByRoom,
  styleId,
  onBackToSettings,
  onVisualUpdated,
}: VisualGalleryProps) {
  const [regenerating, setRegenerating] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  // s33 issue #4 — état modal Lightbox (zoom au clic). Monté une seule fois au
  // niveau parent, partagé entre toutes les cards.
  const [zoomTarget, setZoomTarget] = useState<{ src: string; alt: string } | null>(null);

  const styleName = STYLES[styleId as StyleId]?.name ?? styleId;

  const handleRegenerate = useCallback(
    async (roomId: string, visual: VisualGenerated) => {
      setRegenerating((prev) => {
        const next = new Set(prev);
        next.add(visual.visual_id);
        return next;
      });
      setErrors((prev) => {
        const next = new Map(prev);
        next.delete(visual.visual_id);
        return next;
      });
      try {
        const res = await fetch(`/api/vs/visuals/${visual.visual_id}/regenerate`, {
          method: "POST",
        });
        const json = (await res.json()) as ApiResponse<RegenerateResponse>;
        if (!json.success) {
          setErrors((prev) => new Map(prev).set(visual.visual_id, json.error));
          return;
        }
        onVisualUpdated(roomId, {
          ...visual,
          file_path: json.data.file_path,
          status: "generated",
        });
      } catch {
        setErrors((prev) => new Map(prev).set(visual.visual_id, "Régénération échouée — réessayez."));
      } finally {
        setRegenerating((prev) => {
          const next = new Set(prev);
          next.delete(visual.visual_id);
          return next;
        });
      }
    },
    [onVisualUpdated]
  );

  const roomsWithVisuals = rooms.filter((r) => (visualsByRoom.get(r.id)?.length ?? 0) > 0);

  return (
    <div className="flex flex-col gap-lg p-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-sm">
        <div>
          <h2 className="text-base font-semibold text-text-default">Vos visuels sont prêts</h2>
          <p className="text-sm text-text-muted">
            Style : {styleName} — {roomsWithVisuals.length} pièce{roomsWithVisuals.length > 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToSettings}
          className="min-h-[44px] px-lg py-sm rounded-md text-sm font-medium border border-border-default text-text-default hover:bg-bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
        >
          Modifier les paramètres
        </button>
      </div>

      {/* s33 issue #4 — modal Lightbox (zoom au clic), monté une fois pour la galerie */}
      {zoomTarget && (
        <VisualLightbox
          src={zoomTarget.src}
          alt={zoomTarget.alt}
          onClose={() => setZoomTarget(null)}
        />
      )}

      {/* Liste pièces */}
      {roomsWithVisuals.length === 0 ? (
        <p className="text-sm text-text-muted">Aucun visuel généré.</p>
      ) : (
        <ul className="flex flex-col gap-xl">
          {roomsWithVisuals.map((room) => {
            const visuals = visualsByRoom.get(room.id) ?? [];
            const label = room.custom_label || getRoomLabel(room.room_type);
            return (
              <li key={room.id} data-testid={`gallery-room-${room.id}`}>
                <h3 className="text-sm font-medium text-text-default mb-sm">
                  {label}{" "}
                  <span className="text-xs text-text-muted font-normal">
                    ({visuals.length} visuel{visuals.length > 1 ? "s" : ""})
                  </span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
                  {visuals.map((v) => (
                    <VisualCard
                      key={v.visual_id}
                      roomId={room.id}
                      roomLabel={label}
                      visual={v}
                      isRegenerating={regenerating.has(v.visual_id)}
                      error={errors.get(v.visual_id) ?? null}
                      onRegenerate={handleRegenerate}
                      onZoom={(src, alt) => setZoomTarget({ src, alt })}
                    />
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Sous-composant carte visuel ──────────────────────────────────

interface VisualCardProps {
  roomId: string;
  /** Label de la pièce — utilisé pour l'alt descriptif (Round 3 s30 fix D6 WCAG 1.1.1). */
  roomLabel: string;
  visual: VisualGenerated;
  isRegenerating: boolean;
  error: string | null;
  onRegenerate: (roomId: string, visual: VisualGenerated) => void;
  /** s33 issue #4 — callback ouverture lightbox. */
  onZoom: (src: string, alt: string) => void;
}

function VisualCard({ roomId, roomLabel, visual, isRegenerating, error, onRegenerate, onZoom }: VisualCardProps) {
  const src = visual.file_path
    ? `/api/vs/files?path=${encodeURIComponent(visual.file_path)}`
    : null;
  const isAnchor = visual.kind === "anchor";
  const isFallback = visual.coherence_mode === "textual_signature" && !isAnchor;

  return (
    <article
      className="relative rounded-md overflow-hidden border border-border-default bg-bg-card flex flex-col"
      data-testid={`visual-card-${visual.visual_id}`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-bg-canvas">
        {src ? (
          <>
            <Image
              src={src}
              alt={`Visuel ${isAnchor ? "ancre" : "secondaire"} — ${roomLabel}`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              loading="lazy"
              className="object-cover"
            />
            {/* s33 issue #4 — bouton transparent superposé pour ouvrir le lightbox.
                Désactivé pendant la régénération pour éviter un clic accidentel. */}
            <button
              type="button"
              onClick={() =>
                onZoom(src, `Visuel ${isAnchor ? "ancre" : "secondaire"} — ${roomLabel}`)
              }
              disabled={isRegenerating}
              aria-label={`Agrandir le visuel ${isAnchor ? "ancre" : "secondaire"} — ${roomLabel}`}
              data-testid={`visual-card-zoom-${visual.visual_id}`}
              className="absolute inset-0 z-0 cursor-zoom-in disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-interactive-primary"
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-text-muted text-xs">
            Image indisponible
          </div>
        )}
        {/* Overlay regen — z-10 pour rester au-dessus du bouton zoom */}
        {isRegenerating && (
          <div className="absolute inset-0 z-10 bg-bg-dark/60 flex items-center justify-center" aria-live="polite">
            <span className="inline-block w-6 h-6 border-2 border-text-inverse/40 border-t-text-inverse rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Footer badges + actions */}
      <div className="p-sm flex flex-col gap-xs">
        <div className="flex items-center justify-between gap-xs flex-wrap">
          <div className="flex items-center gap-xs flex-wrap">
            {isAnchor ? (
              <span
                className="inline-flex items-center gap-2xs text-xs px-xs py-2xs rounded-full bg-bg-canvas text-text-default border border-border-default"
                title="Visuel principal — sa palette guide les autres"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10 2l2.6 5.27 5.81.85-4.2 4.1.99 5.78L10 15.27l-5.2 2.73.99-5.78-4.2-4.1 5.81-.85L10 2z" />
                </svg>
                Ancre
              </span>
            ) : (
              <span className="inline-flex items-center text-xs px-xs py-2xs rounded-full bg-bg-canvas text-text-muted border border-border-default">
                Secondaire
              </span>
            )}
            {isFallback && (
              <span
                className="inline-flex items-center text-xs px-xs py-2xs rounded-full bg-bg-card text-text-default border border-border-default"
                title="Le multi-image natif n'a pas pu être appliqué : la cohérence visuelle entre l'ancre et ce secondaire est garantie par signature textuelle uniquement (palette + meubles + ambiance), pas par référence pixel-à-pixel."
                aria-label="Cohérence réduite : signature textuelle"
                data-testid="badge-coherence-fallback"
              >
                Cohérence : réduite
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onRegenerate(roomId, visual)}
            disabled={isRegenerating}
            className="text-xs text-interactive-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[44px] px-xs rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive-primary focus-visible:ring-offset-1"
            aria-label="Régénérer ce visuel"
            data-testid={`regenerate-${visual.visual_id}`}
          >
            {isRegenerating ? "…" : "Régénérer"}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-xs text-error">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
