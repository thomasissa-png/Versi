/**
 * Hook usePhotoPlacement — Étape 4 v2 / s30 Vague 3a
 *
 * Encapsule la logique de placement photo sur canvas plan :
 *  - état local optimistic des positions (pendant drag/visuel)
 *  - mutation PATCH /api/vs/photos/[id]/place au commit
 *  - rollback automatique si l'API échoue
 *
 * Pattern dual-callback (règle s27.2 — propagée fullstack.md) :
 *  - onUpdateVisual(photoId, x, y, angle?) : maj visuelle SANS snapshot historique
 *    (appelé pendant le drag, à chaque pointermove)
 *  - onCommitPlacement(photoId, x, y, angle, roomId?) : snapshot final au mouseup
 *    (1 seul appel API, 1 seule entrée d'historique)
 *
 * Évite que Ctrl+Z décompose le déplacement en N micro-undos.
 */

import { useCallback, useState } from "react";
import type { VsPhoto } from "@/lib/vs/types";

export interface PhotoPlacementDraft {
  photoId: string;
  position_x: number; // 0-1
  position_y: number; // 0-1
  angle_degrees: number | null;
  room_id: string;
}

export interface UsePhotoPlacementOptions {
  /** Photos initiales (depuis le serveur). */
  initialPhotos: VsPhoto[];
  /** Callback succès commit (toast / SSE refresh). */
  onCommitSuccess?: (photo: VsPhoto) => void;
  /** Callback erreur commit (toast erreur). */
  onCommitError?: (error: string, photoId: string) => void;
}

export interface UsePhotoPlacementReturn {
  /** Photos avec overlay des drafts visuels en cours. */
  photos: VsPhoto[];
  /** True si une mutation est en vol. */
  isCommitting: boolean;
  /**
   * Maj visuelle uniquement (pas d'API, pas d'historique).
   * À appeler pendant le drag à chaque pointermove.
   */
  onUpdateVisual: (draft: PhotoPlacementDraft) => void;
  /**
   * Commit final (1 appel API, 1 entrée historique).
   * À appeler au pointerup. Rollback automatique si erreur.
   */
  onCommitPlacement: (draft: PhotoPlacementDraft) => Promise<boolean>;
  /** Reset du draft visuel (utilisé sur abandon, ex: Escape pendant drag). */
  resetVisual: (photoId: string) => void;
}

export function usePhotoPlacement(
  options: UsePhotoPlacementOptions
): UsePhotoPlacementReturn {
  const { initialPhotos, onCommitSuccess, onCommitError } = options;

  // État serveur (rollback target). Initialisé une fois, remplacé sur commit success.
  const [serverPhotos, setServerPhotos] = useState<VsPhoto[]>(initialPhotos);
  // Drafts visuels par photoId (transitoires, jamais persistés sans commit).
  const [drafts, setDrafts] = useState<Record<string, PhotoPlacementDraft>>({});
  const [isCommitting, setIsCommitting] = useState(false);

  // Photos visibles = serveur + overlay des drafts en cours
  const photos: VsPhoto[] = serverPhotos.map((p) => {
    const draft = drafts[p.id];
    if (!draft) return p;
    return {
      ...p,
      position_x: draft.position_x,
      position_y: draft.position_y,
      angle_degrees: draft.angle_degrees,
      room_id: draft.room_id,
      is_placed_on_plan: true,
    };
  });

  const onUpdateVisual = useCallback((draft: PhotoPlacementDraft) => {
    setDrafts((prev) => ({ ...prev, [draft.photoId]: draft }));
  }, []);

  const resetVisual = useCallback((photoId: string) => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[photoId];
      return next;
    });
  }, []);

  const onCommitPlacement = useCallback(
    async (draft: PhotoPlacementDraft): Promise<boolean> => {
      setIsCommitting(true);

      // Optimistic : applique le draft en attendant l'API
      setDrafts((prev) => ({ ...prev, [draft.photoId]: draft }));

      try {
        const res = await fetch(`/api/vs/photos/${draft.photoId}/place`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_id: draft.room_id,
            position_x: draft.position_x,
            position_y: draft.position_y,
            angle_degrees: draft.angle_degrees,
          }),
          signal: AbortSignal.timeout(5_000),
        });

        const text = await res.text();
        const json = text ? JSON.parse(text) : null;

        if (!res.ok || !json?.success) {
          const errorMsg =
            (json && typeof json.error === "string" && json.error) ||
            "Placement non enregistré — réessayez.";
          // Rollback : retire le draft, photo revient à l'état serveur
          resetVisual(draft.photoId);
          onCommitError?.(errorMsg, draft.photoId);
          return false;
        }

        // Succès : promote le draft en serveur
        setServerPhotos((prev) =>
          prev.map((p) =>
            p.id === draft.photoId
              ? {
                  ...p,
                  position_x: draft.position_x,
                  position_y: draft.position_y,
                  angle_degrees: draft.angle_degrees,
                  room_id: draft.room_id,
                  is_placed_on_plan: true,
                }
              : p
          )
        );
        // Vide le draft (plus besoin d'overlay)
        resetVisual(draft.photoId);
        const updated = serverPhotos.find((p) => p.id === draft.photoId);
        if (updated) onCommitSuccess?.({ ...updated, ...draft, is_placed_on_plan: true });
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur réseau.";
        resetVisual(draft.photoId);
        onCommitError?.(msg, draft.photoId);
        return false;
      } finally {
        setIsCommitting(false);
      }
    },
    [serverPhotos, onCommitSuccess, onCommitError, resetVisual]
  );

  return {
    photos,
    isCommitting,
    onUpdateVisual,
    onCommitPlacement,
    resetVisual,
  };
}
