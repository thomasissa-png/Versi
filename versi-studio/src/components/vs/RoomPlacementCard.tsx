/**
 * RoomPlacementCard — Carte pièce sous le plan (s32 refonte BUG 3 + BUG 4)
 *
 * Pattern : étapes 2 et 3 du Stepper utilisent le layout "canvas en haut +
 * panneau dessous". On reproduit ce pattern à l'étape 4 (placement photos).
 *
 * Une carte par pièce affiche :
 *  - Nom de la pièce + nombre de photos placées
 *  - Vignettes des photos déjà uploadées (placées ET non placées)
 *  - Bouton "Ajouter des photos" (multipart upload via /api/vs/rooms/:id/photos)
 *  - Drag handles desktop (HTML5 drag-and-drop) pour replacer
 *  - Tap mobile (sélection pour placement actif)
 *
 * Drag-and-drop : `draggable` sur la photo non placée, on transmet `text/photo-id`
 * aligné avec VisualPlanCanvas.handleDrop.
 */

"use client";

import { useRef, useState, useCallback } from "react";
import type { VsPhoto, VsRoom } from "@/lib/vs/types";

export interface RoomPlacementCardProps {
  room: VsRoom;
  photos: VsPhoto[];
  /** ID photo sélectionnée pour placement actif (mobile tap-to-place). */
  selectedPhotoId: string | null;
  /** Mobile : tap pour entrer en mode placement actif. */
  onSelectPhoto: (photoId: string | null) => void;
  /** Pièce focus (drive le zoom canvas). */
  isFocused: boolean;
  onFocusRoom: (roomId: string) => void;
  /** Callback upload réussi : ajoute la photo à la liste. */
  onPhotoUploaded: (photo: VsPhoto) => void;
  /** Callback upload erreur : remonte au parent pour toast. */
  onUploadError: (msg: string) => void;
  /** Drag-handle desktop : déclenche le DataTransfer. */
  onDragStartPhoto?: (photoId: string, event: React.DragEvent) => void;
  isMobile: boolean;
}

const ACCEPTED_MIMES = ["image/jpeg", "image/png", "image/webp"];

export default function RoomPlacementCard({
  room,
  photos,
  selectedPhotoId,
  onSelectPhoto,
  isFocused,
  onFocusRoom,
  onPhotoUploaded,
  onUploadError,
  onDragStartPhoto,
  isMobile,
}: RoomPlacementCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const placedCount = photos.filter((p) => p.is_placed_on_plan).length;
  const totalCount = photos.length;

  const label = room.custom_label || room.name || room.room_type || "Pièce";

  const handleUpload = useCallback(
    async (files: FileList) => {
      if (uploading) return;
      const valid = Array.from(files).filter((f) =>
        ACCEPTED_MIMES.includes(f.type)
      );
      if (valid.length === 0) {
        onUploadError("Aucun fichier valide (JPG, PNG ou WEBP attendu).");
        return;
      }
      setUploading(true);
      try {
        for (const file of valid) {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch(`/api/vs/rooms/${room.id}/photos`, {
            method: "POST",
            body: fd,
          });
          const json = (await res.json()) as
            | { success: true; data: VsPhoto }
            | { success: false; error: string };
          if (!json.success) {
            onUploadError(json.error || "Échec de l'upload.");
            continue;
          }
          onPhotoUploaded(json.data);
        }
      } catch {
        onUploadError("Échec de l'upload — réessayez.");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [uploading, room.id, onPhotoUploaded, onUploadError]
  );

  const onClickAddPhoto = () => {
    fileInputRef.current?.click();
  };

  return (
    <article
      className={
        "rounded-md border bg-bg-card p-md flex flex-col gap-sm transition-colors " +
        (isFocused
          ? "border-interactive-primary shadow-sm"
          : "border-border-default hover:border-border-strong")
      }
      data-testid={`room-placement-card-${room.id}`}
    >
      {/* En-tête : nom + compteur + focus */}
      <header className="flex items-start justify-between gap-sm">
        <button
          type="button"
          onClick={() => onFocusRoom(room.id)}
          className="text-left min-w-0 flex-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary rounded-sm"
          aria-label={`Centrer le plan sur ${label}`}
        >
          <h3 className="text-sm font-semibold text-text-default truncate">
            {label}
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            {totalCount === 0
              ? "Aucune photo"
              : placedCount === 0
              ? `${totalCount} à placer`
              : placedCount === totalCount
              ? `${placedCount}/${totalCount} placée${placedCount > 1 ? "s" : ""}`
              : `${placedCount}/${totalCount} placée${placedCount > 1 ? "s" : ""}`}
          </p>
        </button>
        {placedCount > 0 && (
          <span
            className="inline-flex items-center px-xs py-0.5 rounded-sm text-xs font-medium bg-success/10 text-success"
            aria-label="Pièce avec photos placées"
          >
            ✓
          </span>
        )}
      </header>

      {/* Vignettes photos */}
      {totalCount > 0 && (
        <ul
          className="grid grid-cols-3 sm:grid-cols-4 gap-xs"
          role="list"
          aria-label={`Photos de ${label}`}
        >
          {photos.map((photo) => {
            const isSelected = selectedPhotoId === photo.id;
            const isPlaced = photo.is_placed_on_plan;
            const filename = photo.file_path.split("/").pop() ?? photo.id.slice(0, 8);
            return (
              <li key={photo.id} className="relative aspect-square">
                <button
                  type="button"
                  draggable={!isMobile && !isPlaced}
                  onClick={() => {
                    if (isPlaced) {
                      // Photo placée : focus la pièce (utilisateur peut éditer)
                      onFocusRoom(room.id);
                      return;
                    }
                    onSelectPhoto(isSelected ? null : photo.id);
                  }}
                  onDragStart={(e) => {
                    if (isMobile || isPlaced || !onDragStartPhoto) return;
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/photo-id", photo.id);
                    onDragStartPhoto(photo.id, e);
                  }}
                  className={
                    "w-full h-full rounded-sm overflow-hidden border-2 transition-all relative " +
                    (isSelected
                      ? "border-interactive-primary ring-2 ring-interactive-primary/30"
                      : isPlaced
                      ? "border-success/60"
                      : "border-border-default hover:border-border-strong cursor-grab active:cursor-grabbing")
                  }
                  aria-label={
                    isPlaced
                      ? `Photo placée : ${filename}`
                      : isMobile
                      ? `Sélectionner ${filename} pour la placer`
                      : `Glisser ${filename} sur le plan`
                  }
                  aria-pressed={isSelected}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.file_path}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {isPlaced && (
                    <span
                      className="absolute top-0.5 right-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-success text-white text-[10px] font-bold"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                  )}
                  {!isPlaced && !isMobile && (
                    <span
                      className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5 text-center"
                      aria-hidden="true"
                    >
                      Glisser
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Bouton upload */}
      <div className="mt-auto">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleUpload(e.target.files);
            }
          }}
          className="sr-only"
          aria-label={`Ajouter des photos à ${label}`}
        />
        <button
          type="button"
          onClick={onClickAddPhoto}
          disabled={uploading}
          className="w-full min-h-[40px] px-md py-xs rounded-md border border-dashed border-border-strong text-sm text-text-muted hover:text-text-default hover:bg-bg-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary disabled:opacity-50 disabled:cursor-wait inline-flex items-center justify-center gap-xs"
          data-testid={`room-card-upload-${room.id}`}
        >
          {uploading ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
              Envoi…
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Ajouter des photos
            </>
          )}
        </button>
      </div>
    </article>
  );
}
