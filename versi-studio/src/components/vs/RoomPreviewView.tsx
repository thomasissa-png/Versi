/**
 * RoomPreviewView — Phase 4 (s32) : preview inline des visuels d'UNE pièce.
 *
 * Affiché entre l'état `generating` et `validated` du wizard pièce-par-pièce.
 * Source de vérité Thomas : "on devrait générer les photos à chaque pièce, et
 * on passe à la suivante que quand on a validé".
 *
 * Composition :
 *  - Titre "Visuels — [Nom pièce]"
 *  - Grid responsive des visuels générés (1/2/3 cols)
 *  - 2 boutons d'action :
 *      → "Régénérer cette pièce"  (secondary)  — relance pipeline pour la pièce
 *      → "Valider et passer à la suivante" (primary) — commit puis next step
 *
 * Pas d'appels API — purement UI. Les callbacks remontent au wizard parent.
 */

"use client";

import Image from "next/image";
import { useState } from "react";
import type { VisualGenerated } from "@/hooks/useVisualsStream";
import RefineVisualDialog from "@/components/vs/RefineVisualDialog";
import VisualLightbox from "@/components/vs/VisualLightbox";

export interface RoomPreviewViewProps {
  roomName: string;
  visuals: VisualGenerated[];
  /** Régénère cette pièce uniquement (revient en `configuring`). */
  onRegenerate: () => void;
  /** Valide les visuels (state `validated`) et passe au step suivant. */
  onValidate: () => void;
  /** Indique si l'action validate/regenerate est en cours (disable boutons). */
  busy?: boolean;
  /** Si dernière pièce du wizard, l'action valide change de label. */
  isLastRoom?: boolean;
  /**
   * C4 itér.4 — true si le 1er clic « Régénérer » a été reçu (état armé).
   * Le bouton bascule alors en bg-warning + label « Confirmer ... » jusqu'au 2e clic.
   */
  regenerateConfirm?: boolean;
  /**
   * s32 #P4 (Thomas prod) — un visuel raffiné a été créé. Le parent doit
   * recharger la liste des visuels pour la pièce courante (le SSE/polling
   * actif s'en charge, mais on peut aussi remonter pour un feedback immédiat).
   * Si non fourni, la fonctionnalité Affiner n'est pas exposée.
   */
  onVisualRefined?: (newVisualId: string) => void;
}

export default function RoomPreviewView({
  roomName,
  visuals,
  onRegenerate,
  onValidate,
  busy = false,
  isLastRoom = false,
  regenerateConfirm = false,
  onVisualRefined,
}: RoomPreviewViewProps) {
  const empty = visuals.length === 0;
  // s32 #P4 — état modal Affiner (visuel parent en cours d'édition).
  const [refineTarget, setRefineTarget] = useState<{
    visualId: string;
    src: string | null;
  } | null>(null);
  // s33 issue #4 — état modal Lightbox (visuel cliqué pour agrandir).
  const [zoomTarget, setZoomTarget] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  return (
    <section
      className="flex flex-col gap-lg w-full"
      data-testid="room-preview-view"
      aria-labelledby="room-preview-title"
    >
      <header className="flex flex-col gap-xs">
        <p className="text-xs uppercase tracking-widest text-text-muted">
          Aperçu généré
        </p>
        <h2
          id="room-preview-title"
          className="text-xl sm:text-2xl uppercase tracking-wide font-semibold font-serif text-text-default"
        >
          {roomName}
        </h2>
        <p className="text-sm text-text-muted">
          {empty
            ? "Aucun visuel encore disponible — patientez ou régénérez."
            : `${visuals.length} visuel${visuals.length > 1 ? "s" : ""} prêt${visuals.length > 1 ? "s" : ""} à valider.`}
        </p>
      </header>

      {empty ? (
        <div className="rounded-md border border-dashed border-border-default bg-bg-card p-lg text-center">
          <p className="text-sm text-text-muted">
            Les visuels arriveront dans quelques secondes.
          </p>
        </div>
      ) : (
        <ul
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md"
          data-testid="room-preview-grid"
        >
          {visuals.map((v) => {
            const src = v.file_path
              ? `/api/vs/files?path=${encodeURIComponent(v.file_path)}`
              : null;
            const isAnchor = v.kind === "anchor";
            return (
              <li
                key={v.visual_id}
                className="relative rounded-md overflow-hidden border border-border-default bg-bg-card"
                data-testid={`room-preview-card-${v.visual_id}`}
              >
                <div className="relative aspect-[4/3] bg-bg-canvas">
                  {src ? (
                    <>
                      <Image
                        src={src}
                        alt={`Visuel ${isAnchor ? "principal" : "secondaire"} — ${roomName}`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        loading="lazy"
                        className="object-cover"
                      />
                      {/* s33 issue #4 — bouton transparent superposé pour ouvrir le lightbox.
                          Z-index inférieur au bouton "Affiner" (qui reste au-dessus). */}
                      <button
                        type="button"
                        onClick={() =>
                          setZoomTarget({
                            src,
                            alt: `Visuel ${isAnchor ? "principal" : "secondaire"} — ${roomName}`,
                          })
                        }
                        aria-label={`Agrandir le visuel ${isAnchor ? "principal" : "secondaire"} — ${roomName}`}
                        data-testid={`room-preview-zoom-${v.visual_id}`}
                        className="absolute inset-0 z-0 cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-interactive-primary"
                      />
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-text-muted text-xs">
                      Image indisponible
                    </div>
                  )}
                  {isAnchor && (
                    <span
                      className="absolute top-xs left-xs z-10 pointer-events-none inline-flex items-center gap-2xs text-[10px] uppercase tracking-wide font-semibold px-xs py-2xs rounded-sm bg-info/90 text-text-inverse"
                      title="Visuel principal — sa palette guide les autres"
                    >
                      Principal
                    </span>
                  )}
                  {/* s32 #P4 (Thomas prod) — bouton "Affiner" sur chaque card.
                      s33 issue #4 : z-10 obligatoire pour rester cliquable au-dessus
                      du bouton transparent de zoom. */}
                  {onVisualRefined && src && (
                    <button
                      type="button"
                      onClick={() =>
                        setRefineTarget({ visualId: v.visual_id, src })
                      }
                      data-testid={`room-preview-refine-${v.visual_id}`}
                      aria-label="Affiner ce visuel"
                      className="absolute bottom-xs right-xs z-10 inline-flex items-center gap-xs px-sm py-xs rounded-md bg-bg-card/95 border border-border-default text-xs font-medium text-text-default hover:bg-bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary shadow-sm min-h-[44px]"
                    >
                      {/* Icône sparkles SVG inline (pas de dépendance) */}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                      </svg>
                      Affiner
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* s32 #P4 — modal Affiner */}
      {refineTarget && (
        <RefineVisualDialog
          parentVisualId={refineTarget.visualId}
          parentImageSrc={refineTarget.src}
          roomName={roomName}
          onClose={() => setRefineTarget(null)}
          onRefined={(newVisualId) => {
            onVisualRefined?.(newVisualId);
            // Délai 300ms : laisse le temps au parent de propager le nouveau
            // visuel dans la liste avant fermeture (évite un flash visuel).
            setTimeout(() => setRefineTarget(null), 300);
          }}
        />
      )}

      {/* s33 issue #4 — modal Lightbox (zoom au clic) */}
      {zoomTarget && (
        <VisualLightbox
          src={zoomTarget.src}
          alt={zoomTarget.alt}
          onClose={() => setZoomTarget(null)}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-sm pt-md border-t border-border-default">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={busy}
          data-testid="room-preview-regenerate"
          aria-pressed={regenerateConfirm}
          className={[
            "min-h-[44px] px-md py-sm rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary",
            regenerateConfirm
              ? "bg-warning text-text-inverse hover:bg-warning/90"
              : "border border-border-default text-text-default hover:bg-bg-card",
          ].join(" ")}
        >
          {regenerateConfirm
            ? "Confirmer la régénération (visuels actuels seront perdus)"
            : "Régénérer cette pièce"}
        </button>
        <button
          type="button"
          onClick={onValidate}
          disabled={busy || empty}
          data-testid="room-preview-validate"
          className="min-h-[44px] px-xl py-sm rounded-md text-sm font-semibold bg-interactive-primary text-text-inverse hover:bg-interactive-hover disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
        >
          {isLastRoom
            ? "Valider et terminer"
            : "Valider et passer à la suivante"}
        </button>
      </div>
    </section>
  );
}
