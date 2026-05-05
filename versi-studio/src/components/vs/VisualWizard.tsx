/**
 * VisualWizard — Composant racine de l'Étape 4 (s32 refonte UX).
 *
 * Wizard linéaire pièce-par-pièce remplaçant VisualPlacementView.
 *
 * Phases (machine d'états) :
 *   "wizard"      → step pièce courante (RoomZoomCanvas + style + uploads)
 *   "recap"       → vue d'ensemble + bouton "Générer tous les visuels"
 *   "generating"  → vue progression SSE
 *   "gallery"     → galerie résultats
 *
 * État local clé :
 *   - currentStepIndex : index de la pièce courante (0..rooms.length-1)
 *   - pendingPlacements : positions cliquées sur le canvas mais sans photo
 *     uploadée (préfixe id "pending-..."). Une fois upload réussi, remplacé
 *     par le VsPhoto réel renvoyé par l'API.
 *
 * Les callbacks API sont localisés ici (un seul point de vérité pour les
 * mutations photos/style). Le canvas et les sous-vues sont purement UI.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import VisualWizardRoomStep from "@/components/vs/VisualWizardRoomStep";
import VisualWizardRecap from "@/components/vs/VisualWizardRecap";
import GenerationProgressView from "@/components/vs/GenerationProgressView";
import VisualGallery from "@/components/vs/VisualGallery";
import { useVisualsStream, type VisualGenerated } from "@/hooks/useVisualsStream";
import type {
  VsRoom,
  VsPhoto,
  ZoneRect,
  ApiResponse,
} from "@/lib/vs/types";
import type { NormalizedPoint } from "@/lib/vs/ui/photo-placement";
import type { StyleId } from "@/lib/vs/styles";

type Phase = "wizard" | "recap" | "generating" | "gallery";

export interface VisualWizardProps {
  projectId: string;
  planImageUrl: string | null;
  lotZone: ZoneRect;
  rooms: VsRoom[];
  initialPhotos: VsPhoto[];
}

interface PendingPlacement {
  /** Id local "pending-..." pour l'UI. */
  id: string;
  room_id: string;
  position_x: number;
  position_y: number;
  angle_degrees: number | null;
}

/**
 * Convertit un PendingPlacement en VsPhoto factice (file_path vide). Permet
 * au RoomZoomCanvas et au RoomStep de l'afficher comme une pastille placée
 * sans photo encore attachée.
 */
function pendingToFakePhoto(pending: PendingPlacement): VsPhoto {
  return {
    id: pending.id,
    room_id: pending.room_id,
    file_path: "",
    angle_description: null,
    position_x: pending.position_x,
    position_y: pending.position_y,
    angle_degrees: pending.angle_degrees,
    is_placed_on_plan: true,
    taken_at: null,
    exif_raw: null,
    preprocessing_warnings: null,
    created_at: new Date().toISOString(),
  };
}

export default function VisualWizard({
  projectId,
  planImageUrl,
  lotZone,
  rooms,
  initialPhotos,
}: VisualWizardProps) {
  const [phase, setPhase] = useState<Phase>("wizard");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [photos, setPhotos] = useState<VsPhoto[]>(initialPhotos);
  const [roomsState, setRoomsState] = useState<VsRoom[]>(rooms);
  const [pendingPlacements, setPendingPlacements] = useState<PendingPlacement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [overrideVisuals, setOverrideVisuals] = useState<Map<string, VisualGenerated[]>>(new Map());

  // Resync si parent recharge les données
  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  useEffect(() => {
    setRoomsState(rooms);
  }, [rooms]);

  // SSE consumer (actif dès que job démarre)
  const sseEnabled = phase === "generating" || phase === "gallery";
  const stream = useVisualsStream({
    projectId: sseEnabled ? projectId : null,
    enabled: sseEnabled,
  });

  // ─── Helpers dérivés ────────────────────────────────────────────
  const currentRoom: VsRoom | null = roomsState[currentStepIndex] ?? null;

  const placementsForCurrentRoom = useMemo(() => {
    if (!currentRoom) return [];
    const dbPhotos = photos.filter((p) => p.room_id === currentRoom.id);
    const pending = pendingPlacements
      .filter((p) => p.room_id === currentRoom.id)
      .map(pendingToFakePhoto);
    return [...dbPhotos, ...pending].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [photos, pendingPlacements, currentRoom]);

  // Targets pour GenerationProgressView (target par défaut = 1 par pièce)
  const roomTargetsList = useMemo(
    () =>
      roomsState.map((r) => ({
        room_id: r.id,
        target: 1,
      })),
    [roomsState]
  );

  const visualsByRoomMerged = useMemo(() => {
    const merged = new Map<string, VisualGenerated[]>();
    for (const [k, v] of stream.visualsByRoom.entries()) merged.set(k, v);
    for (const [k, v] of overrideVisuals.entries()) {
      const existing = merged.get(k) ?? [];
      const overridden = existing.map(
        (ev) => v.find((nv) => nv.visual_id === ev.visual_id) ?? ev
      );
      merged.set(k, overridden);
    }
    return merged;
  }, [stream.visualsByRoom, overrideVisuals]);

  // ─── Handlers placement ─────────────────────────────────────────

  const handlePlacementPending = useCallback(
    (point: NormalizedPoint) => {
      if (!currentRoom) return;
      // Calcule un angle initial pointant vers le centre du polygone
      let initialAngle: number | null = null;
      if (currentRoom.polygon && currentRoom.polygon.length >= 3) {
        let sx = 0;
        let sy = 0;
        for (const p of currentRoom.polygon) {
          sx += p.x_percent;
          sy += p.y_percent;
        }
        const cx = sx / currentRoom.polygon.length / 100;
        const cy = sy / currentRoom.polygon.length / 100;
        const dx = cx - point.x;
        const dy = cy - point.y;
        // 0° = nord, sens horaire
        const rad = Math.atan2(dx, -dy);
        let deg = (rad * 180) / Math.PI;
        if (deg < 0) deg += 360;
        initialAngle = Math.round(deg) % 360;
      }
      const pending: PendingPlacement = {
        id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        room_id: currentRoom.id,
        position_x: point.x,
        position_y: point.y,
        angle_degrees: initialAngle,
      };
      setPendingPlacements((prev) => [...prev, pending]);
    },
    [currentRoom]
  );

  const handleAngleCommit = useCallback(
    async (placementId: string, angle: number) => {
      // Cas pending → MAJ locale
      if (placementId.startsWith("pending-")) {
        setPendingPlacements((prev) =>
          prev.map((p) =>
            p.id === placementId ? { ...p, angle_degrees: angle } : p
          )
        );
        return;
      }
      // Cas photo réelle → PATCH /api/vs/photos/[id]/place
      const photo = photos.find((p) => p.id === placementId);
      if (!photo) return;
      try {
        const res = await fetch(`/api/vs/photos/${placementId}/place`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_id: photo.room_id,
            position_x: photo.position_x ?? 0.5,
            position_y: photo.position_y ?? 0.5,
            angle_degrees: angle,
          }),
        });
        const json = (await res.json()) as ApiResponse<{
          photo_id: string;
          angle_degrees: number | null;
        }>;
        if (!json.success) {
          setError(json.error);
          return;
        }
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === placementId ? { ...p, angle_degrees: angle } : p
          )
        );
      } catch {
        setError("Angle non enregistré.");
      }
    },
    [photos]
  );

  const handleUploadForPending = useCallback(
    async (pendingId: string, file: File) => {
      const pending = pendingPlacements.find((p) => p.id === pendingId);
      if (!pending) return;
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("position_x", String(pending.position_x));
        fd.append("position_y", String(pending.position_y));
        if (pending.angle_degrees !== null) {
          fd.append("angle_degrees", String(pending.angle_degrees));
        }
        const res = await fetch(`/api/vs/rooms/${pending.room_id}/photos`, {
          method: "POST",
          body: fd,
        });
        const json = (await res.json()) as ApiResponse<VsPhoto>;
        if (!json.success) {
          setError(json.error);
          return;
        }
        // Remplace le pending par la photo réelle
        setPendingPlacements((prev) => prev.filter((p) => p.id !== pendingId));
        setPhotos((prev) => [...prev, json.data]);
      } catch {
        setError("Upload échoué.");
      }
    },
    [pendingPlacements]
  );

  const handleUploadReplace = useCallback(
    async (placementId: string, file: File) => {
      const photo = photos.find((p) => p.id === placementId);
      if (!photo) return;
      // Stratégie simple : DELETE puis POST nouveau (avec mêmes coords/angle)
      try {
        await fetch(`/api/vs/photos/${placementId}`, { method: "DELETE" });
        const fd = new FormData();
        fd.append("file", file);
        if (photo.position_x !== null) fd.append("position_x", String(photo.position_x));
        if (photo.position_y !== null) fd.append("position_y", String(photo.position_y));
        if (photo.angle_degrees !== null) fd.append("angle_degrees", String(photo.angle_degrees));
        const res = await fetch(`/api/vs/rooms/${photo.room_id}/photos`, {
          method: "POST",
          body: fd,
        });
        const json = (await res.json()) as ApiResponse<VsPhoto>;
        if (!json.success) {
          setError(json.error);
          return;
        }
        setPhotos((prev) =>
          prev.filter((p) => p.id !== placementId).concat(json.data)
        );
      } catch {
        setError("Remplacement échoué.");
      }
    },
    [photos]
  );

  const handleDeletePlacement = useCallback(
    async (placementId: string) => {
      // Pending : suppression locale uniquement
      if (placementId.startsWith("pending-")) {
        setPendingPlacements((prev) => prev.filter((p) => p.id !== placementId));
        return;
      }
      try {
        const res = await fetch(`/api/vs/photos/${placementId}`, {
          method: "DELETE",
        });
        const json = (await res.json()) as ApiResponse<{ deleted: boolean }>;
        if (!json.success) {
          setError(json.error);
          return;
        }
        setPhotos((prev) => prev.filter((p) => p.id !== placementId));
      } catch {
        setError("Suppression échouée.");
      }
    },
    []
  );

  const handleStyleSelect = useCallback(
    async (styleId: StyleId) => {
      if (!currentRoom) return;
      try {
        const res = await fetch(`/api/vs/rooms/${currentRoom.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ style_id: styleId }),
        });
        const json = (await res.json()) as ApiResponse<VsRoom>;
        if (!json.success) {
          setError(json.error);
          return;
        }
        setRoomsState((prev) =>
          prev.map((r) => (r.id === currentRoom.id ? { ...r, style_id: styleId } : r))
        );
      } catch {
        setError("Choix du style non enregistré.");
      }
    },
    [currentRoom]
  );

  // ─── Navigation ────────────────────────────────────────────────
  const handleNextRoom = useCallback(() => {
    if (currentStepIndex < roomsState.length - 1) {
      setCurrentStepIndex((i) => i + 1);
    } else {
      setPhase("recap");
    }
  }, [currentStepIndex, roomsState.length]);

  const handlePrevRoom = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((i) => i - 1);
    }
  }, [currentStepIndex]);

  const handleEditRoomFromRecap = useCallback(
    (roomId: string) => {
      const idx = roomsState.findIndex((r) => r.id === roomId);
      if (idx >= 0) {
        setCurrentStepIndex(idx);
        setPhase("wizard");
      }
    },
    [roomsState]
  );

  const handleJobStarted = useCallback(() => {
    setError(null);
    setPhase("generating");
  }, []);

  const handleProgressComplete = useCallback(() => {
    setPhase("gallery");
  }, []);

  const handleBackToWizard = useCallback(() => {
    stream.close();
    setOverrideVisuals(new Map());
    setPhase("wizard");
  }, [stream]);

  const handleVisualUpdated = useCallback(
    (roomId: string, updated: VisualGenerated) => {
      setOverrideVisuals((prev) => {
        const next = new Map(prev);
        const list = next.get(roomId) ?? [];
        const idx = list.findIndex((v) => v.visual_id === updated.visual_id);
        if (idx >= 0) list[idx] = updated;
        else list.push(updated);
        next.set(roomId, [...list]);
        return next;
      });
    },
    []
  );

  // ─── Rendu ─────────────────────────────────────────────────────

  if (roomsState.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <p className="text-sm text-text-muted">Aucune pièce à configurer.</p>
      </div>
    );
  }

  if (phase === "generating") {
    return (
      <div className="w-full">
        <GenerationProgressView
          rooms={roomsState}
          roomTargets={roomTargetsList}
          job={stream.job}
          visualsByRoom={stream.visualsByRoom}
          failures={stream.failures}
          streamStatus={stream.status}
          reconnects={stream.reconnects}
          onComplete={handleProgressComplete}
          onCancel={handleBackToWizard}
        />
      </div>
    );
  }

  if (phase === "gallery") {
    // Style "représentatif" pour la galerie — on prend celui de la 1re pièce
    // (la galerie n'utilise styleId qu'en libellé).
    const galleryStyle = roomsState.find((r) => r.style_id)?.style_id ?? "";
    return (
      <div className="w-full">
        <VisualGallery
          rooms={roomsState}
          visualsByRoom={visualsByRoomMerged}
          styleId={galleryStyle}
          onBackToSettings={handleBackToWizard}
          onVisualUpdated={handleVisualUpdated}
        />
      </div>
    );
  }

  return (
    <div
      className="vs-wizard relative w-full flex flex-col gap-md px-lg pb-lg"
      data-testid="visual-wizard"
    >
      {/* Erreur globale */}
      {error && (
        <div className="bg-error/10 border border-error/30 rounded-md p-md text-sm text-error flex items-start gap-sm">
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-error hover:text-error/80"
            aria-label="Fermer"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {phase === "wizard" && currentRoom && (
        <VisualWizardRoomStep
          stepIndex={currentStepIndex + 1}
          totalSteps={roomsState.length}
          room={currentRoom}
          planImageUrl={planImageUrl}
          lotZone={lotZone}
          placements={placementsForCurrentRoom}
          onPlacementPending={handlePlacementPending}
          onAngleCommit={handleAngleCommit}
          onUploadForPending={handleUploadForPending}
          onUploadReplace={handleUploadReplace}
          onDeletePlacement={handleDeletePlacement}
          onStyleSelect={handleStyleSelect}
          onNextRoom={handleNextRoom}
          onPrevRoom={currentStepIndex > 0 ? handlePrevRoom : null}
        />
      )}

      {phase === "recap" && (
        <VisualWizardRecap
          projectId={projectId}
          rooms={roomsState}
          photos={photos}
          planImageUrl={planImageUrl}
          lotZone={lotZone}
          onEditRoom={handleEditRoomFromRecap}
          onJobStarted={handleJobStarted}
          onError={setError}
        />
      )}
    </div>
  );
}
