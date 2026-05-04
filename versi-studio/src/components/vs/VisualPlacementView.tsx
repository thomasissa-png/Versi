/**
 * VisualPlacementView — Orchestrateur Étape 4 v2 / s30 Vague 3a
 *
 * Assemble :
 *  - VisualPlanCanvas (canvas plan + polygones + photos placées)
 *  - PhotoSidebar (liste photos non placées + drag/tap)
 *  - PlacementBottomSheet (mobile fix GP5 — confirmation tap)
 *  - AngleController (panneau d'angle après placement)
 *  - usePhotoPlacement (state + commit API)
 *
 * Mobile detection : matchMedia "(max-width: 767px)" (breakpoint 768).
 *
 * Hors-scope V3a : modale questions IA, génération, galerie, badge cohérence,
 * SSE consumer (→ Vague 3b dans une Task séparée).
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import VisualPlanCanvas from "@/components/vs/VisualPlanCanvas";
import PhotoSidebar from "@/components/vs/PhotoSidebar";
import PlacementBottomSheet from "@/components/vs/PlacementBottomSheet";
import AngleController from "@/components/vs/AngleController";
import { usePhotoPlacement } from "@/hooks/usePhotoPlacement";
import type { VsRoom, VsPhoto } from "@/lib/vs/types";
import type { NormalizedPoint } from "@/lib/vs/ui/photo-placement";

export interface VisualPlacementViewProps {
  /** URL de l'image plan (étage courant). */
  planImageUrl: string | null;
  /** Pièces de l'étage courant (avec polygones). */
  rooms: VsRoom[];
  /** Toutes les photos uploadées du projet (toutes pièces). */
  initialPhotos: VsPhoto[];
}

export default function VisualPlacementView({
  planImageUrl,
  rooms,
  initialPhotos,
}: VisualPlacementViewProps) {
  // ─── Détection mobile (breakpoint 768) ─────────────────────────
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // ─── State UI ──────────────────────────────────────────────────
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [focusedRoomId, setFocusedRoomId] = useState<string | null>(null);
  const [pendingPlacement, setPendingPlacement] = useState<{
    photoId: string;
    roomId: string;
    point: NormalizedPoint;
  } | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; msg: string } | null>(null);

  // ─── Hook placement (state + commit API + dual-callback) ───────
  const { photos, isCommitting, onCommitPlacement } = usePhotoPlacement({
    initialPhotos,
    onCommitSuccess: (p) => {
      const filename = p.file_path.split("/").pop() ?? "Photo";
      setToast({ kind: "success", msg: `${filename} placée.` });
    },
    onCommitError: (err) => {
      setToast({ kind: "error", msg: err });
    },
  });

  // ─── Auto-clear toast après 3s ─────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ─── Helpers dérivés ───────────────────────────────────────────
  const pendingPhoto = useMemo(
    () => (pendingPlacement ? photos.find((p) => p.id === pendingPlacement.photoId) ?? null : null),
    [pendingPlacement, photos]
  );

  const pendingRoom = useMemo(
    () => (pendingPlacement ? rooms.find((r) => r.id === pendingPlacement.roomId) ?? null : null),
    [pendingPlacement, rooms]
  );

  // Photo focus pour AngleController : dernière photo placée dans focusedRoom
  const focusedPhoto = useMemo(() => {
    if (!focusedRoomId) return null;
    const placed = photos.filter((p) => p.is_placed_on_plan && p.room_id === focusedRoomId);
    return placed[placed.length - 1] ?? null;
  }, [focusedRoomId, photos]);

  // ─── Handlers placement ────────────────────────────────────────

  /** Desktop : drop direct → commit immédiat (pas de bottom sheet). */
  const handleDropDesktop = useCallback(
    async (photoId: string, roomId: string, point: NormalizedPoint) => {
      const ok = await onCommitPlacement({
        photoId,
        room_id: roomId,
        position_x: point.x,
        position_y: point.y,
        angle_degrees: null,
      });
      if (ok) {
        setSelectedPhotoId(null);
        setFocusedRoomId(roomId);
      }
    },
    [onCommitPlacement]
  );

  /** Mobile : tap polygone après tap photo sidebar → ouvre bottom sheet. */
  const handleSelectRoomMobile = useCallback(
    (roomId: string | null) => {
      if (isMobile && selectedPhotoId && roomId) {
        // Position par défaut : centre de la pièce (sera ajusté à l'angle ensuite)
        // P0 GP5 — l'utilisateur ne touche PAS le polygone précisément, on utilise centroïde
        const room = rooms.find((r) => r.id === roomId);
        if (!room || !room.polygon || room.polygon.length < 3) {
          setFocusedRoomId(roomId);
          return;
        }
        // Centroïde du polygone en coords plan-relatif (0-1)
        let sumX = 0;
        let sumY = 0;
        for (const pt of room.polygon) {
          sumX += pt.x_percent;
          sumY += pt.y_percent;
        }
        const cx = sumX / room.polygon.length / 100;
        const cy = sumY / room.polygon.length / 100;
        setPendingPlacement({
          photoId: selectedPhotoId,
          roomId,
          point: { x: cx, y: cy },
        });
        return;
      }
      // Sinon : simple sélection (focus zoom auto sans placement)
      setFocusedRoomId(roomId);
    },
    [isMobile, selectedPhotoId, rooms]
  );

  const handleConfirmPlacement = useCallback(async () => {
    if (!pendingPlacement) return;
    const ok = await onCommitPlacement({
      photoId: pendingPlacement.photoId,
      room_id: pendingPlacement.roomId,
      position_x: pendingPlacement.point.x,
      position_y: pendingPlacement.point.y,
      angle_degrees: null,
    });
    if (ok) {
      setFocusedRoomId(pendingPlacement.roomId);
      setSelectedPhotoId(null);
      setPendingPlacement(null);
    }
  }, [pendingPlacement, onCommitPlacement]);

  const handleCancelPlacement = useCallback(() => {
    setPendingPlacement(null);
  }, []);

  // ─── Handler angle (dual-callback s27.2) ───────────────────────
  const handleAngleCommit = useCallback(
    async (angle: number) => {
      if (!focusedPhoto) return;
      const ok = await onCommitPlacement({
        photoId: focusedPhoto.id,
        room_id: focusedPhoto.room_id,
        position_x: focusedPhoto.position_x ?? 0.5,
        position_y: focusedPhoto.position_y ?? 0.5,
        angle_degrees: angle,
      });
      if (!ok) {
        setToast({ kind: "error", msg: "Angle non enregistré — réessayez." });
      }
    },
    [focusedPhoto, onCommitPlacement]
  );

  // ─── FAB mobile : visible si une photo est sélectionnée ────────
  const showFAB = isMobile && selectedPhotoId !== null && !pendingPlacement;

  return (
    <div className="vs-placement-view relative w-full h-full flex flex-col sm:flex-row min-h-0">
      {/* Canvas — zone principale */}
      <div className="flex-1 relative min-h-[60vh] sm:min-h-0">
        <VisualPlanCanvas
          planImageUrl={planImageUrl}
          rooms={rooms}
          photos={photos}
          focusedRoomId={focusedRoomId}
          onSelectRoom={handleSelectRoomMobile}
          onDropPhotoOnRoom={handleDropDesktop}
          isMobile={isMobile}
          activePlacementPhotoId={selectedPhotoId}
          isCommitting={isCommitting}
        />

        {/* AngleController flottant — position bas-droit canvas */}
        {focusedPhoto && (
          <div className="absolute bottom-md right-md z-10">
            <AngleController
              key={focusedPhoto.id}
              initialAngle={focusedPhoto.angle_degrees}
              onCommit={handleAngleCommit}
              isCommitting={isCommitting}
            />
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div
            className={
              "absolute top-md left-1/2 -translate-x-1/2 z-20 px-md py-sm rounded-md text-sm font-medium shadow-lg " +
              (toast.kind === "success"
                ? "bg-success text-text-inverse"
                : "bg-error text-text-inverse")
            }
            role="status"
            aria-live="polite"
          >
            {toast.msg}
          </div>
        )}
      </div>

      {/* Sidebar — desktop = colonne droite 240px, mobile = drawer bas */}
      <aside
        className={
          isMobile
            ? "border-t border-border-default bg-bg-default max-h-[40vh] overflow-y-auto"
            : "w-60 flex-shrink-0 border-l border-border-default bg-bg-card overflow-y-auto"
        }
      >
        <PhotoSidebar
          photos={photos}
          selectedPhotoId={selectedPhotoId}
          onSelectPhoto={setSelectedPhotoId}
          isMobile={isMobile}
        />
      </aside>

      {/* FAB mobile : visible quand photo active sans placement en cours */}
      {showFAB && (
        <button
          type="button"
          onClick={() => {
            // Hint UX : si pas de focusedRoom, prompt user à tapper une pièce
            setToast({
              kind: "success",
              msg: "Tapez sur une pièce du plan pour la placer.",
            });
          }}
          className="fixed bottom-lg right-lg z-30 min-h-[56px] min-w-[56px] px-lg rounded-full bg-interactive-primary text-text-inverse text-sm font-medium shadow-lg flex items-center gap-sm hover:bg-interactive-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
          aria-label="Placer la photo sélectionnée"
          data-testid="placement-fab"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
          </svg>
          Placer la photo
        </button>
      )}

      {/* Bottom sheet mobile (P0 fix GP5) */}
      {pendingPlacement && (
        <PlacementBottomSheet
          photo={pendingPhoto}
          targetRoom={pendingRoom}
          isCommitting={isCommitting}
          onConfirm={handleConfirmPlacement}
          onCancel={handleCancelPlacement}
        />
      )}
    </div>
  );
}
