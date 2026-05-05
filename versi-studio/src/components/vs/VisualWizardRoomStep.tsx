/**
 * VisualWizardRoomStep — Une étape du wizard (1 pièce).
 *
 * Composition (s32) :
 *  - Header : progression "Pièce N / Total" + nom + barre
 *  - RoomZoomCanvas : vue zoomée + click-to-place + drag flèche d'angle
 *  - Liste pastilles placées : vignettes photos uploadées + bouton upload par position
 *  - RoomStylePicker : style propre à la pièce
 *  - Footer : Précédent / Suivant (validation : ≥1 photo + style)
 *
 * Responsabilité : orchestrer 1 pièce. Toute la persistance API est déléguée
 * au parent (VisualWizard) via callbacks.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import RoomZoomCanvas from "@/components/vs/RoomZoomCanvas";
import RoomStylePicker from "@/components/vs/RoomStylePicker";
import type { VsRoom, VsPhoto, ZoneRect } from "@/lib/vs/types";
import type { NormalizedPoint } from "@/lib/vs/ui/photo-placement";
import type { StyleId } from "@/lib/vs/styles";

export interface VisualWizardRoomStepProps {
  /** Index 1-based pour l'affichage. */
  stepIndex: number;
  /** Nombre total de pièces dans le wizard. */
  totalSteps: number;
  /** Pièce courante. */
  room: VsRoom;
  /** URL plan global. */
  planImageUrl: string | null;
  /** Zone du lot (% du plan global). */
  lotZone: ZoneRect;
  /** Photos placées dans cette pièce. */
  placements: VsPhoto[];

  /**
   * Crée une nouvelle position photographe (pas encore d'image attachée).
   * Le parent crée un placement "pending" qui prendra une photo lors de l'upload.
   */
  onPlacementPending: (point: NormalizedPoint) => void;
  /** Met à jour l'angle d'un placement existant (PATCH photo). */
  onAngleCommit: (placementId: string, angle: number) => Promise<void>;
  /** Upload d'une photo pour un placement pending (multipart + position). */
  onUploadForPending: (
    pendingId: string,
    file: File
  ) => Promise<void>;
  /** Upload remplaçant la photo d'un placement déjà fait. */
  onUploadReplace: (placementId: string, file: File) => Promise<void>;
  /** Supprime un placement (DELETE photo OU annule pending). */
  onDeletePlacement: (placementId: string) => Promise<void>;

  /** Sélectionne le style de la pièce (PATCH /rooms/:id). */
  onStyleSelect: (id: StyleId) => Promise<void>;

  /** Navigation. */
  onNextRoom: () => void;
  onPrevRoom: (() => void) | null;

  /** Drag visuel (sans commit). Optionnel. */
  onAngleDrag?: (placementId: string, angle: number) => void;
}

/**
 * Type étendu : un placement "pending" est un VsPhoto avec id `pending-*` et
 * file_path vide. C'est juste une UI-side abstraction pour faire apparaître
 * la pastille AVANT que la photo soit uploadée. Une fois la photo uploadée
 * via `onUploadForPending`, le parent remplace le pending par le VsPhoto réel.
 */

export default function VisualWizardRoomStep({
  stepIndex,
  totalSteps,
  room,
  planImageUrl,
  lotZone,
  placements,
  onPlacementPending,
  onAngleCommit,
  onUploadForPending,
  onUploadReplace,
  onDeletePlacement,
  onStyleSelect,
  onNextRoom,
  onPrevRoom,
  onAngleDrag,
}: VisualWizardRoomStepProps) {
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [busyPlacementId, setBusyPlacementId] = useState<string | null>(null);
  const [outsideHint, setOutsideHint] = useState<string | null>(null); // A7 — toast clic hors polygone
  const [recentlyCreatedIds, setRecentlyCreatedIds] = useState<Set<string>>(new Set()); // B6
  const [errorPlacementIds, setErrorPlacementIds] = useState<Map<string, string>>(new Map()); // B10 — erreur par placement
  const fileInputsRef = useRef<Map<string, HTMLInputElement>>(new Map());
  const cardRefs = useRef<Map<string, HTMLLIElement>>(new Map()); // B7 — auto-scroll
  const headerRef = useRef<HTMLHeadingElement>(null); // B9 — focus reset
  const prevPlacementCountRef = useRef<number>(placements.length);
  const prevPlacementIdsRef = useRef<Set<string>>(
    new Set(placements.map((p) => p.id))
  );

  const placementsWithPhoto = useMemo(
    () => placements.filter((p) => p.is_placed_on_plan && p.file_path !== ""),
    [placements]
  );

  const styleId = (room.style_id as StyleId | null) ?? null;

  const canGoNext = useMemo(() => {
    if (!styleId) return false;
    if (placementsWithPhoto.length === 0) return false;
    return true;
  }, [styleId, placementsWithPhoto.length]);

  const disabledReason = useMemo(() => {
    if (!styleId && placementsWithPhoto.length === 0) {
      return "Placez au moins une photo et choisissez un style.";
    }
    if (!styleId) return "Choisissez un style pour cette pièce.";
    if (placementsWithPhoto.length === 0) return "Ajoutez au moins une photo.";
    return null;
  }, [styleId, placementsWithPhoto.length]);

  const triggerFilePicker = useCallback((placementId: string) => {
    const input = fileInputsRef.current.get(placementId);
    input?.click();
  }, []);

  // A7 — auto-clear du hint hors polygone (2s)
  const handleClickOutsidePolygon = useCallback(() => {
    setOutsideHint("Cliquez à l'intérieur de la pièce.");
  }, []);
  useEffect(() => {
    if (outsideHint === null) return;
    const t = setTimeout(() => setOutsideHint(null), 2000);
    return () => clearTimeout(t);
  }, [outsideHint]);

  // B6 + B7 — détection nouveaux placements (auto-scroll + flag "recent" 3s)
  useEffect(() => {
    const currentIds = new Set(placements.map((p) => p.id));
    const prevIds = prevPlacementIdsRef.current;
    const newIds: string[] = [];
    for (const id of currentIds) {
      if (!prevIds.has(id)) newIds.push(id);
    }
    if (newIds.length > 0) {
      // B6 : marquer comme récemment créés (3s)
      setRecentlyCreatedIds((prev) => {
        const next = new Set(prev);
        for (const id of newIds) next.add(id);
        return next;
      });
      const timers = newIds.map((id) =>
        setTimeout(() => {
          setRecentlyCreatedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, 3000)
      );
      // B7 : auto-scroll vers la dernière nouvelle carte
      const lastNewId = newIds[newIds.length - 1];
      requestAnimationFrame(() => {
        const card = cardRefs.current.get(lastNewId);
        card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      prevPlacementIdsRef.current = currentIds;
      prevPlacementCountRef.current = placements.length;
      return () => {
        for (const t of timers) clearTimeout(t);
      };
    }
    prevPlacementIdsRef.current = currentIds;
    prevPlacementCountRef.current = placements.length;
  }, [placements]);

  // B9 — focus reset sur changement de pièce (room.id)
  useEffect(() => {
    headerRef.current?.focus();
  }, [room.id]);

  const handleFileChange = useCallback(
    async (placementId: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setBusyPlacementId(placementId);
      // Reset erreur précédente pour ce placement
      setErrorPlacementIds((prev) => {
        if (!prev.has(placementId)) return prev;
        const next = new Map(prev);
        next.delete(placementId);
        return next;
      });
      try {
        const isPending = placementId.startsWith("pending-");
        if (isPending) {
          await onUploadForPending(placementId, file);
        } else {
          await onUploadReplace(placementId, file);
        }
      } catch (err) {
        // B10 — stocker l'erreur pour ce placement spécifique
        const msg =
          err instanceof Error ? err.message : "L'envoi de la photo a échoué.";
        setErrorPlacementIds((prev) => {
          const next = new Map(prev);
          next.set(placementId, msg);
          return next;
        });
      } finally {
        setBusyPlacementId(null);
      }
    },
    [onUploadForPending, onUploadReplace]
  );

  // B10 — réessayer l'upload pour un placement en erreur
  const handleRetryUpload = useCallback(
    (placementId: string) => {
      setErrorPlacementIds((prev) => {
        if (!prev.has(placementId)) return prev;
        const next = new Map(prev);
        next.delete(placementId);
        return next;
      });
      triggerFilePicker(placementId);
    },
    [triggerFilePicker]
  );

  const handleDelete = useCallback(
    async (placementId: string) => {
      setBusyPlacementId(placementId);
      try {
        await onDeletePlacement(placementId);
        if (selectedPlacementId === placementId) setSelectedPlacementId(null);
      } finally {
        setBusyPlacementId(null);
      }
    },
    [onDeletePlacement, selectedPlacementId]
  );

  const roomLabel = room.custom_label || room.name || room.room_type || "Pièce";
  // B3 — au chargement Pièce 1 = 0%, pas (1/N)*100
  const progressPct = Math.round(((stepIndex - 1) / totalSteps) * 100);

  return (
    <div className="flex flex-col gap-lg w-full" data-testid="visual-wizard-room-step">
      {/* Header progression */}
      <div className="flex flex-col gap-xs">
        <div className="flex items-baseline justify-between">
          <p className="text-xs uppercase tracking-widest text-text-muted">
            Pièce {stepIndex} / {totalSteps}
          </p>
          <p className="text-xs text-text-muted">
            {placementsWithPhoto.length} photo{placementsWithPhoto.length > 1 ? "s" : ""} placée
            {placementsWithPhoto.length > 1 ? "s" : ""}
          </p>
        </div>
        <h2
          ref={headerRef}
          tabIndex={-1}
          className="text-xl sm:text-2xl uppercase tracking-wide font-semibold font-serif text-text-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
        >
          {roomLabel}
        </h2>
        <div
          className="w-full h-1 rounded-full bg-bg-card overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPct}
          aria-label={`Avancement de la configuration : ${progressPct} %`}
        >
          <div
            className="h-full bg-interactive-primary transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Canvas zoom — B8 : opacity réduite pendant upload busy */}
      <div
        className={[
          "relative w-full h-[420px] sm:h-[520px] transition-opacity",
          busyPlacementId !== null ? "opacity-70 pointer-events-none" : "",
        ].join(" ")}
      >
        <RoomZoomCanvas
          room={room}
          planImageUrl={planImageUrl}
          lotZone={lotZone}
          placements={placements}
          selectedPlacementId={selectedPlacementId}
          onPlaceClick={onPlacementPending}
          onSelectPlacement={setSelectedPlacementId}
          onAngleDrag={onAngleDrag}
          onAngleCommit={onAngleCommit}
          isCommitting={busyPlacementId !== null}
          onClickOutsidePolygon={handleClickOutsidePolygon}
        />
        {/* A7 — toast clic hors polygone (auto-clear 2s) */}
        {outsideHint && (
          <div
            className="absolute bottom-md left-1/2 -translate-x-1/2 pointer-events-none"
            role="status"
            aria-live="polite"
          >
            <p className="text-xs text-text-default bg-bg-card/95 px-md py-xs rounded-md border border-warning/40 shadow-md">
              {outsideHint}
            </p>
          </div>
        )}
      </div>

      {/* Liste pastilles + uploads */}
      <section
        aria-labelledby="placements-list-title"
        className="flex flex-col gap-sm"
      >
        <h3
          id="placements-list-title"
          className="text-sm uppercase tracking-wide font-semibold text-text-default"
        >
          Photos pour cette pièce
        </h3>
        {placements.length === 0 ? (
          <p className="text-sm text-text-muted bg-bg-card border border-border-default border-dashed rounded-md p-md">
            Cliquez sur le plan pour placer une prise de vue, puis uploadez la photo.
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-sm">
            {placements.map((p, idx) => {
              const hasPhoto = p.is_placed_on_plan && p.file_path !== "";
              const isBusy = busyPlacementId === p.id;
              const placementError = errorPlacementIds.get(p.id) ?? null;
              const showDragHint = recentlyCreatedIds.has(p.id);
              const photoUrl = hasPhoto
                ? `/api/vs/files?path=${encodeURIComponent(p.file_path)}`
                : null;
              return (
                <li
                  key={p.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(p.id, el);
                    else cardRefs.current.delete(p.id);
                  }}
                  className={[
                    "flex gap-sm p-sm rounded-md border bg-bg-card",
                    selectedPlacementId === p.id
                      ? "border-interactive-primary ring-2 ring-interactive-primary/30"
                      : placementError
                      ? "border-error/50"
                      : "border-border-default",
                  ].join(" ")}
                  data-testid={`placement-item-${idx + 1}`}
                >
                  <div className="relative w-16 h-16 rounded-md overflow-hidden bg-bg-default border border-border-default flex-shrink-0">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrl}
                        alt={`Photo position ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl text-text-muted">
                        {idx + 1}
                      </div>
                    )}
                    <span
                      className={[
                        "absolute -top-1 -left-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white",
                        hasPhoto ? "bg-success" : "bg-interactive-primary",
                      ].join(" ")}
                      aria-label={hasPhoto ? "Photo uploadée" : "En attente d'upload"}
                    >
                      {hasPhoto ? "✓" : idx + 1}
                    </span>
                  </div>
                  <div className="flex flex-col gap-xs flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-default truncate">
                      Position {idx + 1}
                    </p>
                    <p className="text-xs text-text-muted">
                      {p.angle_degrees !== null
                        ? `Angle ${Math.round(p.angle_degrees)}°`
                        : "Faites tourner la flèche pour orienter."}
                    </p>
                    {/* B6 — hint drag-angle pendant 3s après création, même si angle défini */}
                    {showDragHint && p.angle_degrees !== null && (
                      <p className="text-xs text-interactive-primary">
                        Faites glisser la pointe pour ajuster.
                      </p>
                    )}
                    {/* B10 — message erreur + bouton réessayer par placement */}
                    {placementError && (
                      <p className="text-xs text-error" role="alert">
                        {placementError}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-xs mt-xs">
                      <input
                        ref={(el) => {
                          if (el) fileInputsRef.current.set(p.id, el);
                          else fileInputsRef.current.delete(p.id);
                        }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(e) => handleFileChange(p.id, e)}
                        aria-label={
                          hasPhoto
                            ? `Remplacer la photo position ${idx + 1}`
                            : `Uploader la photo position ${idx + 1}`
                        }
                      />
                      {placementError ? (
                        <button
                          type="button"
                          onClick={() => handleRetryUpload(p.id)}
                          disabled={isBusy}
                          className="text-xs px-sm py-xs rounded-md bg-error text-text-inverse hover:bg-error/90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
                          data-testid={`placement-retry-${idx + 1}`}
                        >
                          Réessayer
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => triggerFilePicker(p.id)}
                          disabled={isBusy}
                          className="text-xs px-sm py-xs rounded-md bg-interactive-primary text-text-inverse hover:bg-interactive-hover disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
                        >
                          {isBusy
                            ? "..."
                            : hasPhoto
                            ? "Remplacer"
                            : "Uploader"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        disabled={isBusy}
                        className="text-xs px-sm py-xs rounded-md text-error hover:bg-error/10 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Style picker */}
      <section className="rounded-md border border-border-default bg-bg-card p-md">
        <RoomStylePicker
          selectedStyleId={styleId}
          onSelect={onStyleSelect}
        />
      </section>

      {/* Footer navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-sm pt-sm border-t border-border-default">
        <div className="flex items-center">
          {onPrevRoom && (
            <button
              type="button"
              onClick={onPrevRoom}
              className="min-h-[44px] px-md py-sm rounded-md text-sm font-medium border border-border-default text-text-default hover:bg-bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
            >
              ← Précédent
            </button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-xs sm:gap-sm">
          {disabledReason && (
            <p className="text-xs text-text-muted text-right">
              {disabledReason}
            </p>
          )}
          <button
            type="button"
            onClick={onNextRoom}
            disabled={!canGoNext}
            data-testid="wizard-next-room"
            className="min-h-[44px] px-xl py-sm rounded-md text-sm font-medium bg-interactive-primary text-text-inverse hover:bg-interactive-hover disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
          >
            {stepIndex === totalSteps ? "Récapitulatif" : "Pièce suivante →"}
          </button>
        </div>
      </div>
    </div>
  );
}
