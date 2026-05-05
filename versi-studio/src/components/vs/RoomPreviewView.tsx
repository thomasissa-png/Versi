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
import type { VisualGenerated } from "@/hooks/useVisualsStream";

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
}

export default function RoomPreviewView({
  roomName,
  visuals,
  onRegenerate,
  onValidate,
  busy = false,
  isLastRoom = false,
  regenerateConfirm = false,
}: RoomPreviewViewProps) {
  const empty = visuals.length === 0;

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
                    <Image
                      src={src}
                      alt={`Visuel ${isAnchor ? "principal" : "secondaire"} — ${roomName}`}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      loading="lazy"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-text-muted text-xs">
                      Image indisponible
                    </div>
                  )}
                  {isAnchor && (
                    <span
                      className="absolute top-xs left-xs inline-flex items-center gap-2xs text-[10px] uppercase tracking-wide font-semibold px-xs py-2xs rounded-sm bg-info/90 text-text-inverse"
                      title="Visuel principal — sa palette guide les autres"
                    >
                      Principal
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
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
