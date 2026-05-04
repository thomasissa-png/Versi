/**
 * PhotoSidebar — Étape 4 v2 / s30 Vague 3a
 *
 * Liste des photos non placées (uploadées mais sans is_placed_on_plan).
 * Desktop : drag-handle (HTML5 drag native) → drop sur polygone canvas
 * Mobile : tap-to-select → mode "placement actif" (FAB sur canvas, voir VisualPlanCanvas)
 *
 * Filtre la liste : `is_placed_on_plan === true` retire la photo (déjà sur le plan).
 */

"use client";

import { useMemo } from "react";
import type { VsPhoto } from "@/lib/vs/types";

export interface PhotoSidebarProps {
  photos: VsPhoto[];
  /** Photo actuellement sélectionnée pour placement mobile (tap-to-select). */
  selectedPhotoId: string | null;
  /** Tap mobile : sélectionne la photo pour le mode placement actif. */
  onSelectPhoto: (photoId: string | null) => void;
  /** Drag start desktop : transmet l'id pour drop. */
  onDragStart?: (photoId: string, event: React.DragEvent) => void;
  /** Mode mobile force le tap-to-select (cache le drag handle). */
  isMobile?: boolean;
}

export default function PhotoSidebar({
  photos,
  selectedPhotoId,
  onSelectPhoto,
  onDragStart,
  isMobile = false,
}: PhotoSidebarProps) {
  // Filtre : photos disponibles (non placées)
  const availablePhotos = useMemo(
    () => photos.filter((p) => !p.is_placed_on_plan),
    [photos]
  );

  if (availablePhotos.length === 0) {
    return (
      <aside
        className="vs-photo-sidebar vs-photo-sidebar--empty"
        aria-label="Photos disponibles"
      >
        <h3 className="vs-photo-sidebar__title">Photos à placer</h3>
        <p className="vs-photo-sidebar__empty-text">
          Toutes les photos sont placées sur le plan.
        </p>
      </aside>
    );
  }

  return (
    <aside className="vs-photo-sidebar" aria-label="Photos à placer">
      <h3 className="vs-photo-sidebar__title">
        Photos à placer ({availablePhotos.length})
      </h3>
      <ul className="vs-photo-sidebar__list" role="list">
        {availablePhotos.map((photo) => {
          const filename =
            photo.file_path.split("/").pop() ?? photo.id.slice(0, 8);
          const isSelected = selectedPhotoId === photo.id;
          return (
            <li
              key={photo.id}
              className={
                "vs-photo-sidebar__item" +
                (isSelected ? " vs-photo-sidebar__item--selected" : "")
              }
            >
              <button
                type="button"
                className="vs-photo-sidebar__button"
                aria-label={
                  isMobile
                    ? `Sélectionner ${filename} pour placement`
                    : `Glisser ${filename} sur une pièce`
                }
                aria-pressed={isSelected}
                draggable={!isMobile}
                onClick={() => onSelectPhoto(isSelected ? null : photo.id)}
                onDragStart={(e) => {
                  if (!isMobile && onDragStart) {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/photo-id", photo.id);
                    onDragStart(photo.id, e);
                  }
                }}
              >
                <span className="vs-photo-sidebar__thumb" aria-hidden>
                  <img
                    src={photo.file_path}
                    alt=""
                    className="vs-photo-sidebar__img"
                    loading="lazy"
                  />
                </span>
                <span className="vs-photo-sidebar__name" title={filename}>
                  {filename}
                </span>
                {!isMobile && (
                  <span
                    className="vs-photo-sidebar__handle"
                    aria-hidden
                    title="Glisser sur le plan"
                  >
                    {/* Drag handle indicator */}
                    ⋮⋮
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {isMobile && selectedPhotoId && (
        <p
          className="vs-photo-sidebar__hint"
          role="status"
          aria-live="polite"
        >
          Photo sélectionnée. Tapez sur une pièce du plan pour la placer.
        </p>
      )}
    </aside>
  );
}
