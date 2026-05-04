/**
 * PlacementBottomSheet — Étape 4 v2 / s30 Vague 3a + Round 2 (s30)
 *
 * Bottom sheet mobile pour confirmer un placement photo (P0 fix GP5).
 *
 * Workflow mobile (audit Thomas s29 — Friction 1) :
 *  1. Tap photo dans PhotoSidebar → mode "placement actif"
 *  2. Tap sur polygone du plan → ouvre cette bottom sheet
 *  3. Mini-aperçu polygone pièce ciblée + Preview photo + Confirmer / Annuler
 *  4. Confirm → PATCH /api/vs/photos/[id]/place
 *
 * Le doigt ne couvre JAMAIS le polygone (P0 fix GP5).
 *
 * Round 2 (s30) — Friction P2 persona "pas de mini-aperçu pièce ciblée" :
 * SVG des polygones de toutes les pièces de l'étage, pièce cible en vert.
 * Évite à Thomas de confirmer "à l'aveugle" sur un plan dense (8+ pièces).
 * Fallback robuste : si polygones manquants → pas d'aperçu, juste le label texte.
 */

"use client";

import { useEffect, useMemo } from "react";
import type { VsPhoto, VsRoom } from "@/lib/vs/types";
import { ROOM_TYPE_LABELS, type RoomTypeKey } from "@/lib/vs/styles";
import { buildRoomMiniPreviewData } from "@/lib/vs/ui/room-mini-preview";

export interface PlacementBottomSheetProps {
  /** Photo en cours de placement (preview thumbnail). */
  photo: VsPhoto | null;
  /** Pièce cible visée (preview label + surface). */
  targetRoom: VsRoom | null;
  /** Toutes les pièces de l'étage courant — affichées en gris dans le mini-aperçu pour situer la cible. */
  allRoomsOnFloor?: VsRoom[];
  /** True pendant l'appel API PATCH (loading state du bouton). */
  isCommitting: boolean;
  /** Confirmer le placement → déclenche le PATCH API. */
  onConfirm: () => void;
  /** Annuler — referme la sheet sans commit. */
  onCancel: () => void;
}

/** Dimensions du mini-aperçu SVG (lot-local % → viewBox 100x100 → rendu fixe). */
const PREVIEW_W = 160;
const PREVIEW_H = 96;

export default function PlacementBottomSheet({
  photo,
  targetRoom,
  allRoomsOnFloor,
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

  // ─── Mini-aperçu : convertir les polygones (lot-local %) en path SVG ───
  // Logique pure extraite dans @/lib/vs/ui/room-mini-preview pour testabilité Vitest.
  // Robuste : retourne null si polygone target absent / invalide → fallback label texte.
  const previewData = useMemo(
    () => buildRoomMiniPreviewData(targetRoom, allRoomsOnFloor),
    [targetRoom, allRoomsOnFloor],
  );

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

      {/* Sheet — Round 3 s30 fix D2 : pb-xl + safe-area-inset-bottom iOS notch. */}
      <div
        className="relative w-full sm:max-w-md bg-bg-default rounded-t-2xl sm:rounded-2xl border border-border-default shadow-xl p-lg animate-in slide-in-from-bottom duration-200"
        style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {/* (paddingBottom remplace pb-xl ; safe-area = 0px sur desktop, inchangé) */}
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

        {/* Mini-aperçu pièce ciblée (Round 2 s30 — Friction P2) */}
        {previewData && (
          <div className="mb-md flex items-center gap-sm" data-testid="room-mini-preview">
            <svg
              width={PREVIEW_W}
              height={PREVIEW_H}
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
              className="rounded-md border border-border-default bg-bg-card flex-shrink-0"
              role="img"
              aria-label={`Aperçu de la pièce ${roomLabel} parmi les autres pièces de l'étage`}
            >
              {/* Pièces voisines en gris clair (contexte) */}
              {previewData.others.map((o) => (
                <path
                  key={o.id}
                  d={o.d}
                  className="fill-bg-card stroke-border-default"
                  strokeWidth={0.5}
                />
              ))}
              {/* Pièce cible en vert (highlight) */}
              <path
                d={previewData.target}
                className="fill-success/20 stroke-success"
                strokeWidth={1.5}
                data-testid="room-mini-preview-target"
              />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-muted">Cibler la pièce</p>
              <p className="text-sm font-medium text-text-default truncate">{roomLabel}</p>
              {targetRoom.surface_m2 ? (
                <p className="text-xs text-text-muted">
                  {Number(targetRoom.surface_m2).toFixed(1)} m²
                </p>
              ) : null}
            </div>
          </div>
        )}

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
            className="flex-1 min-h-[44px] px-md py-sm rounded-md text-sm font-medium border border-border-default text-text-default hover:bg-bg-card transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive-primary focus-visible:ring-offset-1"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isCommitting}
            className="flex-1 min-h-[44px] px-md py-sm rounded-md text-sm font-medium bg-interactive-primary text-text-inverse hover:bg-interactive-hover transition-colors duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
            data-testid="confirm-placement-btn"
          >
            {isCommitting ? "Enregistrement…" : "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}

