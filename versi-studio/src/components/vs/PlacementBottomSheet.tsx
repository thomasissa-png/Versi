/**
 * PlacementBottomSheet — Étape 4 v2 / s30 Vague 3a
 *
 * Bottom sheet mobile pour confirmer un placement photo (P0 fix GP5).
 *
 * Workflow mobile (audit Thomas s29 — Friction 1) :
 *  1. Tap photo dans PhotoSidebar → mode "placement actif"
 *  2. Tap sur polygone du plan → ouvre cette bottom sheet
 *  3. Preview + bouton "Confirmer" / "Annuler"
 *  4. Confirm → PATCH /api/vs/photos/[id]/place
 *
 * Le doigt ne couvre JAMAIS le polygone (P0 fix GP5).
 */

"use client";

import { useEffect } from "react";
import type { VsPhoto, VsRoom } from "@/lib/vs/types";
import { ROOM_TYPE_LABELS, type RoomTypeKey } from "@/lib/vs/styles";

export interface PlacementBottomSheetProps {
  /** Photo en cours de placement (preview thumbnail). */
  photo: VsPhoto | null;
  /** Pièce cible visée (preview label + surface). */
  targetRoom: VsRoom | null;
  /** True pendant l'appel API PATCH (loading state du bouton). */
  isCommitting: boolean;
  /** Confirmer le placement → déclenche le PATCH API. */
  onConfirm: () => void;
  /** Annuler — referme la sheet sans commit. */
  onCancel: () => void;
}

export default function PlacementBottomSheet({
  photo,
  targetRoom,
  isCommitting,
  onConfirm,
  onCancel,
}: PlacementBottomSheetProps) {
  // Ferme avec Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isCommitting) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, isCommitting]);

  if (!photo || !targetRoom) return null;

  const roomLabel =
    targetRoom.custom_label ||
    targetRoom.name ||
    ROOM_TYPE_LABELS[targetRoom.room_type as RoomTypeKey] ||
    targetRoom.room_type;

  const filename = photo.file_path.split("/").pop() ?? "photo";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="placement-sheet-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={isCommitting ? undefined : onCancel}
        aria-label="Annuler le placement"
        tabIndex={-1}
      />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-md bg-bg-default rounded-t-2xl sm:rounded-2xl border border-border-default shadow-xl p-lg pb-xl animate-in slide-in-from-bottom duration-200">
        {/* Drag handle visuel mobile */}
        <div
          className="sm:hidden mx-auto mb-md w-12 h-1 rounded-full bg-border-default"
          aria-hidden="true"
        />

        <h3
          id="placement-sheet-title"
          className="text-base font-semibold text-text-default mb-sm"
        >
          Confirmer le placement
        </h3>
        <p className="text-sm text-text-muted mb-md">
          Placez{" "}
          <span className="font-medium text-text-default">{filename}</span>{" "}
          dans la pièce{" "}
          <span className="font-medium text-text-default">{roomLabel}</span>
          {targetRoom.surface_m2 ? (
            <>
              {" "}
              <span className="text-text-muted">
                ({Number(targetRoom.surface_m2).toFixed(1)} m²)
              </span>
            </>
          ) : null}
          .
        </p>

        {/* Preview thumbnail photo (cohérent VisualRoom — <img> natif via /api/vs/files). */}
        <div className="mb-md w-full max-h-40 rounded-md overflow-hidden border border-border-default bg-bg-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/vs/files?path=${encodeURIComponent(photo.file_path)}`}
            alt={`Aperçu de ${filename}`}
            className="w-full h-40 object-cover"
            loading="lazy"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-sm">
          <button
            type="button"
            onClick={onCancel}
            disabled={isCommitting}
            className="flex-1 min-h-[44px] px-md py-sm rounded-md text-sm font-medium border border-border-default text-text-default hover:bg-bg-card transition-colors duration-200 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isCommitting}
            className="flex-1 min-h-[44px] px-md py-sm rounded-md text-sm font-medium bg-interactive-primary text-text-inverse hover:bg-interactive-hover transition-colors duration-200 disabled:opacity-60 disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
            data-testid="confirm-placement-btn"
          >
            {isCommitting ? "Enregistrement…" : "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}
