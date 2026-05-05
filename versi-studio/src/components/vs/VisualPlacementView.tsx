/**
 * VisualPlacementView — Orchestrateur Étape 4 v2 (s32 refonte UX)
 *
 * Pattern UX aligné sur les étapes 2 et 3 du Stepper :
 *  - Plan canvas pleine largeur en haut
 *  - Grille de cartes pièces dessous (1 col mobile / 2 cols tablet / 3 cols desktop)
 *  - Bloc style + CTA "Générer" sous les cartes
 *
 * Refonte s32 :
 *  - BUG 1 (polygones débordant) : VisualPlanCanvas reçoit lotZone et utilise
 *    le pattern letterbox + lot-local→plan-global d'étape 3.
 *  - BUG 2 (coût utilisateur visible) : CostEstimator retiré du DOM (préf
 *    fondateur s29-s30 — pas de blocage technique sur le coût).
 *  - BUG 3 (UX nulle, sidebar masquant) : layout vertical aligné étapes 2/3.
 *  - BUG 4 (upload invisible) : bouton "Ajouter des photos" sur chaque carte
 *    pièce (consomme /api/vs/rooms/:id/photos qui existait déjà).
 *
 * Phases (machine d'états) :
 *   "placement"   → canvas + cartes pièces + style + CTA (par défaut)
 *   "questions"   → modale T1-T5 bloquante (preflight a retourné des Q)
 *   "generating"  → vue progression SSE (job en cours)
 *   "gallery"     → galerie résultats (job complet)
 *
 * Mobile detection : matchMedia "(max-width: 767px)" (breakpoint 768).
 */

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import VisualPlanCanvas from "@/components/vs/VisualPlanCanvas";
import RoomPlacementCard from "@/components/vs/RoomPlacementCard";
import PlacementBottomSheet from "@/components/vs/PlacementBottomSheet";
import AngleController from "@/components/vs/AngleController";
import RoomSettingsSidebar, { type RoomSettingsState } from "@/components/vs/RoomSettingsSidebar";
import GenerateButton from "@/components/vs/GenerateButton";
import QuestionsModal from "@/components/vs/QuestionsModal";
import GenerationProgressView from "@/components/vs/GenerationProgressView";
import VisualGallery from "@/components/vs/VisualGallery";
import StyleGrid from "@/components/vs/StyleGrid";
import { usePhotoPlacement } from "@/hooks/usePhotoPlacement";
import { useVisualsStream, type VisualGenerated } from "@/hooks/useVisualsStream";
import type { VsRoom, VsPhoto, VsRoomSettings, ZoneRect, ApiResponse } from "@/lib/vs/types";
import type { NormalizedPoint } from "@/lib/vs/ui/photo-placement";
import type { AmbiguityQuestion } from "@/lib/vs/ambiguity-detector";
import type { StyleId } from "@/lib/vs/styles";

// ─── Types & Props ────────────────────────────────────────────────

type Phase = "placement" | "questions" | "generating" | "gallery";

export interface VisualPlacementViewProps {
  /** Identifiant projet (Vague 3b — preflight, generate, SSE). */
  projectId: string;
  /** URL de l'image plan (étage courant). */
  planImageUrl: string | null;
  /**
   * Zone du lot dans le plan global (% du plan entier). s32 fix BUG 1.
   * Source : lot.zone_data, dérivée par la page parente comme dans rooms/page.tsx.
   */
  lotZone: ZoneRect;
  /** Pièces de l'étage courant (avec polygones lot-local %). */
  rooms: VsRoom[];
  /** Toutes les photos uploadées du projet. */
  initialPhotos: VsPhoto[];
}

interface SettingsApiResponse {
  room_id: string;
  target_visual_count: number;
  comment_text: string | null;
  warning_pending: boolean;
}

export default function VisualPlacementView({
  projectId,
  planImageUrl,
  lotZone,
  rooms,
  initialPhotos,
}: VisualPlacementViewProps) {
  // ─── Phase ──────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("placement");

  // ─── Détection mobile (breakpoint 768) ──────────────────────────
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // ─── State UI placement ─────────────────────────────────────────
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [focusedRoomId, setFocusedRoomId] = useState<string | null>(null);
  const [pendingPlacement, setPendingPlacement] = useState<{
    photoId: string; roomId: string; point: NormalizedPoint;
  } | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; msg: string } | null>(null);

  // ─── State Vague 3b ─────────────────────────────────────────────
  const [styleId, setStyleId] = useState<StyleId | null>(null);
  const [initialSettings, setInitialSettings] = useState<VsRoomSettings[]>([]);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [roomSettingsMap, setRoomSettingsMap] = useState<Map<string, RoomSettingsState>>(new Map());
  const [questions, setQuestions] = useState<AmbiguityQuestion[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [overrideVisuals, setOverrideVisuals] = useState<Map<string, VisualGenerated[]>>(new Map());

  // ─── Hook placement ─────────────────────────────────────────────
  const { photos, isCommitting, onCommitPlacement, addPhoto } = usePhotoPlacement({
    initialPhotos,
    onCommitSuccess: (p) => {
      const filename = p.file_path.split("/").pop() ?? "Photo";
      setToast({ kind: "success", msg: `${filename} placée.` });
    },
    onCommitError: (err) => setToast({ kind: "error", msg: err }),
  });

  // ─── Handler upload depuis RoomPlacementCard (s32 BUG 4) ────────
  const handlePhotoUploaded = useCallback(
    (photo: VsPhoto) => {
      addPhoto(photo);
      setToast({ kind: "success", msg: "Photo ajoutée." });
    },
    [addPhoto]
  );

  const handleUploadError = useCallback((msg: string) => {
    setToast({ kind: "error", msg });
  }, []);

  // ─── Auto-clear toast 3s ────────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ─── Charger settings initiaux ──────────────────────────────────
  const initialSettingsLoadedRef = useRef(false);
  useEffect(() => {
    if (initialSettingsLoadedRef.current || rooms.length === 0) return;
    initialSettingsLoadedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.all(
          rooms.map((r) =>
            fetch(`/api/vs/rooms/${r.id}/settings`)
              .then((res) => res.json() as Promise<ApiResponse<SettingsApiResponse>>)
              .then((j) =>
                j.success
                  ? ({
                      room_id: j.data.room_id,
                      target_visual_count: j.data.target_visual_count,
                      comment_text: j.data.comment_text,
                      created_at: "",
                      updated_at: "",
                    } as VsRoomSettings)
                  : null
              )
              .catch(() => null)
          )
        );
        if (cancelled) return;
        setInitialSettings(results.filter((x): x is VsRoomSettings => x !== null));
        setSettingsLoaded(true);
      } catch {
        if (!cancelled) setSettingsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rooms]);

  // ─── SSE consumer (actif dès qu'un job démarre) ─────────────────
  const sseEnabled = phase === "generating" || phase === "gallery";
  const stream = useVisualsStream({
    projectId: sseEnabled ? projectId : null,
    enabled: sseEnabled,
  });

  // ─── Helpers dérivés (placement) ────────────────────────────────
  const pendingPhoto = useMemo(
    () => (pendingPlacement ? photos.find((p) => p.id === pendingPlacement.photoId) ?? null : null),
    [pendingPlacement, photos]
  );
  const pendingRoom = useMemo(
    () => (pendingPlacement ? rooms.find((r) => r.id === pendingPlacement.roomId) ?? null : null),
    [pendingPlacement, rooms]
  );
  const focusedPhoto = useMemo(() => {
    if (!focusedRoomId) return null;
    const placed = photos.filter((p) => p.is_placed_on_plan && p.room_id === focusedRoomId);
    return placed[placed.length - 1] ?? null;
  }, [focusedRoomId, photos]);

  // ─── Helpers dérivés (settings) ─────────────────────────────────
  const roomTargets = useMemo(() => {
    const m = new Map<string, number>();
    for (const [k, v] of roomSettingsMap.entries()) m.set(k, v.target_visual_count);
    return m;
  }, [roomSettingsMap]);

  const totalTargets = useMemo(() => {
    let total = 0;
    for (const t of roomTargets.values()) total += t;
    return total;
  }, [roomTargets]);

  const placedRoomIds = useMemo(() => {
    const s = new Set<string>();
    for (const p of photos) if (p.is_placed_on_plan) s.add(p.room_id);
    return s;
  }, [photos]);

  // ─── Photos par room (pour les RoomPlacementCard) ───────────────
  const photosByRoomId = useMemo(() => {
    const map = new Map<string, VsPhoto[]>();
    for (const p of photos) {
      const arr = map.get(p.room_id) ?? [];
      arr.push(p);
      map.set(p.room_id, arr);
    }
    return map;
  }, [photos]);

  /**
   * canStart : on autorise le clic même si certaines pièces ont target>0 sans photo.
   * Le warning est affiché inline (P1 persona Friction 2). Seul vrai blocage : 0 visuel
   * total OU pas de style sélectionné.
   */
  const canStart = useMemo(() => {
    if (!styleId) return false;
    if (totalTargets === 0) return false;
    // Au moins 1 pièce avec target>0 doit avoir une photo, sinon preflight bloquera
    let oneReady = false;
    for (const [roomId, target] of roomTargets.entries()) {
      if (target > 0 && placedRoomIds.has(roomId)) {
        oneReady = true;
        break;
      }
    }
    return oneReady;
  }, [styleId, totalTargets, roomTargets, placedRoomIds]);

  const disabledReason = useMemo(() => {
    if (!styleId) return "Choisissez un style avant de générer.";
    if (totalTargets === 0) return "Réglez au moins 1 visuel sur une pièce.";
    return "Placez au moins 1 photo sur une pièce active.";
  }, [styleId, totalTargets]);

  // Targets pour GenerationProgressView
  const roomTargetsList = useMemo(
    () => Array.from(roomTargets.entries()).map(([room_id, target]) => ({ room_id, target })),
    [roomTargets]
  );

  // Visuels affichés en galerie : merge stream + overrides (régénérations)
  const visualsByRoomMerged = useMemo(() => {
    const merged = new Map<string, VisualGenerated[]>();
    for (const [k, v] of stream.visualsByRoom.entries()) merged.set(k, v);
    for (const [k, v] of overrideVisuals.entries()) {
      const existing = merged.get(k) ?? [];
      const overridden = existing.map((ev) => v.find((nv) => nv.visual_id === ev.visual_id) ?? ev);
      merged.set(k, overridden);
    }
    return merged;
  }, [stream.visualsByRoom, overrideVisuals]);

  // ─── Handlers placement ─────────────────────────────────────────
  const handleDropDesktop = useCallback(
    async (photoId: string, roomId: string, point: NormalizedPoint) => {
      const ok = await onCommitPlacement({
        photoId, room_id: roomId,
        position_x: point.x, position_y: point.y,
        angle_degrees: null,
      });
      if (ok) {
        setSelectedPhotoId(null);
        setFocusedRoomId(roomId);
      }
    },
    [onCommitPlacement]
  );

  const handleSelectRoomMobile = useCallback(
    (roomId: string | null) => {
      if (isMobile && selectedPhotoId && roomId) {
        const room = rooms.find((r) => r.id === roomId);
        if (!room || !room.polygon || room.polygon.length < 3) {
          setFocusedRoomId(roomId);
          return;
        }
        let sumX = 0, sumY = 0;
        for (const pt of room.polygon) {
          sumX += pt.x_percent;
          sumY += pt.y_percent;
        }
        const cx = sumX / room.polygon.length / 100;
        const cy = sumY / room.polygon.length / 100;
        setPendingPlacement({ photoId: selectedPhotoId, roomId, point: { x: cx, y: cy } });
        return;
      }
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

  const handleCancelPlacement = useCallback(() => setPendingPlacement(null), []);

  const handleAngleCommit = useCallback(
    async (angle: number) => {
      if (!focusedPhoto) return;
      const ok = await onCommitPlacement({
        photoId: focusedPhoto.id, room_id: focusedPhoto.room_id,
        position_x: focusedPhoto.position_x ?? 0.5,
        position_y: focusedPhoto.position_y ?? 0.5,
        angle_degrees: angle,
      });
      if (!ok) setToast({ kind: "error", msg: "Angle non enregistré — réessayez." });
    },
    [focusedPhoto, onCommitPlacement]
  );

  // ─── Handlers Vague 3b ──────────────────────────────────────────
  const handleQuestions = useCallback((qs: AmbiguityQuestion[]) => {
    setQuestions(qs);
    setPhase("questions");
  }, []);

  const handleQuestionsAnswered = useCallback(async () => {
    // Re-trigger preflight pour vérifier qu'il ne reste plus de questions
    if (!styleId) {
      setPhase("placement");
      return;
    }
    try {
      const res = await fetch(`/api/vs/projects/${projectId}/preflight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style_id: styleId }),
      });
      const json = (await res.json()) as ApiResponse<{
        questions: AmbiguityQuestion[];
        ready_for_generation: boolean;
      }>;
      if (!json.success) {
        setGenerationError(json.error);
        setPhase("placement");
        return;
      }
      if (json.data.questions.length > 0) {
        setQuestions(json.data.questions);
        return;
      }
      // Plus de questions → lancer la génération directement
      const gen = await fetch(`/api/vs/projects/${projectId}/visuals/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style_id: styleId }),
      });
      const genJson = (await gen.json()) as ApiResponse<{
        job_id: string;
        expected_count: number;
        estimated_cost_usd: number;
      }>;
      if (!genJson.success) {
        setGenerationError(genJson.error);
        setPhase("placement");
        return;
      }
      setPhase("generating");
    } catch {
      setGenerationError("Lancement échoué — réessayez.");
      setPhase("placement");
    }
  }, [projectId, styleId]);

  const handleQuestionsCancel = useCallback(() => {
    setQuestions([]);
    setPhase("placement");
  }, []);

  const handleJobStarted = useCallback(() => {
    setGenerationError(null);
    setPhase("generating");
  }, []);

  const handleGenerationError = useCallback((msg: string) => {
    setGenerationError(msg);
    setToast({ kind: "error", msg });
  }, []);

  const handleProgressComplete = useCallback(() => setPhase("gallery"), []);
  const handleBackToSettings = useCallback(() => {
    stream.close();
    setOverrideVisuals(new Map());
    setPhase("placement");
  }, [stream]);

  const handleVisualUpdated = useCallback((roomId: string, updated: VisualGenerated) => {
    setOverrideVisuals((prev) => {
      const next = new Map(prev);
      const list = next.get(roomId) ?? [];
      const idx = list.findIndex((v) => v.visual_id === updated.visual_id);
      if (idx >= 0) list[idx] = updated;
      else list.push(updated);
      next.set(roomId, [...list]);
      return next;
    });
  }, []);

  // ─── FAB mobile ─────────────────────────────────────────────────
  const showFAB = isMobile && selectedPhotoId !== null && !pendingPlacement && phase === "placement";

  // ─── Rendu ──────────────────────────────────────────────────────

  // Phase generating ou gallery : on remplace tout par la vue dédiée
  if (phase === "generating") {
    return (
      <div className="vs-placement-view relative w-full h-full flex flex-col min-h-0 overflow-y-auto">
        <GenerationProgressView
          rooms={rooms}
          roomTargets={roomTargetsList}
          job={stream.job}
          visualsByRoom={stream.visualsByRoom}
          failures={stream.failures}
          streamStatus={stream.status}
          reconnects={stream.reconnects}
          onComplete={handleProgressComplete}
          onCancel={handleBackToSettings}
        />
      </div>
    );
  }

  if (phase === "gallery") {
    return (
      <div className="vs-placement-view relative w-full h-full flex flex-col min-h-0 overflow-y-auto">
        <VisualGallery
          rooms={rooms}
          visualsByRoom={visualsByRoomMerged}
          styleId={styleId ?? ""}
          onBackToSettings={handleBackToSettings}
          onVisualUpdated={handleVisualUpdated}
        />
      </div>
    );
  }

  // Phase placement — layout vertical aligné étapes 2/3 (s32 refonte UX)
  return (
    <div
      className="vs-placement-view relative w-full h-full flex flex-col gap-lg overflow-y-auto px-lg pb-lg"
      data-testid="visual-placement-view"
    >
      {/* Canvas plan — pleine largeur, hauteur fixe responsive */}
      <div className="relative w-full h-[400px] sm:h-[550px] rounded-md overflow-hidden border border-border-default flex-shrink-0">
        <VisualPlanCanvas
          planImageUrl={planImageUrl}
          lotZone={lotZone}
          rooms={rooms}
          photos={photos}
          focusedRoomId={focusedRoomId}
          onSelectRoom={handleSelectRoomMobile}
          onDropPhotoOnRoom={handleDropDesktop}
          isMobile={isMobile}
          activePlacementPhotoId={selectedPhotoId}
          isCommitting={isCommitting}
        />

        {/* AngleController flottant */}
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
              (toast.kind === "success" ? "bg-success text-text-inverse" : "bg-error text-text-inverse")
            }
            role="status"
            aria-live="polite"
          >
            {toast.msg}
          </div>
        )}

        {/* Erreur génération */}
        {generationError && (
          <div className="absolute bottom-md left-md z-20 max-w-md">
            <div className="bg-error/10 border border-error/30 rounded-md p-md text-sm text-error flex items-start gap-sm">
              <span className="flex-1">{generationError}</span>
              <button
                type="button"
                onClick={() => setGenerationError(null)}
                className="text-error hover:text-error/80"
                aria-label="Fermer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cartes pièces — grille responsive sous le plan (s32 BUG 3 + BUG 4) */}
      <section
        aria-labelledby="rooms-grid-title"
        className="flex flex-col gap-sm"
      >
        <div className="flex items-baseline justify-between gap-sm">
          <h2
            id="rooms-grid-title"
            className="text-sm uppercase tracking-wide font-semibold text-text-default"
          >
            Vos pièces
          </h2>
          <p className="text-xs text-text-muted">
            {selectedPhotoId
              ? "Cliquez sur la pièce du plan pour placer la photo sélectionnée."
              : "Glissez une photo sur le plan, ou ajoutez-en de nouvelles ci-dessous."}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
          {rooms.map((room) => (
            <RoomPlacementCard
              key={room.id}
              room={room}
              photos={photosByRoomId.get(room.id) ?? []}
              selectedPhotoId={selectedPhotoId}
              onSelectPhoto={setSelectedPhotoId}
              isFocused={focusedRoomId === room.id}
              onFocusRoom={setFocusedRoomId}
              onPhotoUploaded={handlePhotoUploaded}
              onUploadError={handleUploadError}
              isMobile={isMobile}
            />
          ))}
        </div>
      </section>

      {/* Style + targets — sous les cartes pièces */}
      <section className="flex flex-col gap-md p-md rounded-md border border-border-default bg-bg-card">
        <div>
          <h2 className="text-sm uppercase tracking-wide font-semibold text-text-default mb-sm">
            Style des visuels
          </h2>
          <StyleGrid
            selectedStyleId={styleId}
            onSelect={(id) => setStyleId(id)}
          />
        </div>

        {settingsLoaded && (
          <div className="border-t border-border-default pt-md">
            <RoomSettingsSidebar
              rooms={rooms}
              photos={photos}
              initialSettings={initialSettings}
              onSettingsChange={setRoomSettingsMap}
            />
          </div>
        )}
      </section>

      {/* CTA Générer — sticky bottom-like */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-sm pt-sm">
        {styleId ? (
          <GenerateButton
            projectId={projectId}
            styleId={styleId}
            canStart={canStart}
            disabledReason={disabledReason}
            onQuestions={handleQuestions}
            onJobStarted={handleJobStarted}
            onError={handleGenerationError}
          />
        ) : (
          <p className="text-xs text-text-muted text-center sm:text-right">
            Choisissez un style ci-dessus pour activer la génération.
          </p>
        )}
      </div>

      {/* FAB mobile (placement actif) */}
      {showFAB && (
        <button
          type="button"
          onClick={() => setToast({ kind: "success", msg: "Tapez sur une pièce du plan pour la placer." })}
          className="fixed bottom-lg right-lg z-30 min-h-[56px] min-w-[56px] px-lg rounded-full bg-interactive-primary text-text-inverse text-sm font-medium shadow-lg flex items-center gap-sm hover:bg-interactive-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
          aria-label="Placer la photo sélectionnée"
          data-testid="placement-fab"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          Placer la photo
        </button>
      )}

      {/* Bottom sheet mobile (Vague 3a — fix GP5) */}
      {pendingPlacement && (
        <PlacementBottomSheet
          photo={pendingPhoto}
          targetRoom={pendingRoom}
          allRoomsOnFloor={rooms}
          isCommitting={isCommitting}
          onConfirm={handleConfirmPlacement}
          onCancel={handleCancelPlacement}
        />
      )}

      {/* Modale questions (Vague 3b) */}
      {phase === "questions" && questions.length > 0 && (
        <QuestionsModal
          questions={questions}
          onCancel={handleQuestionsCancel}
          onAnswered={handleQuestionsAnswered}
        />
      )}
    </div>
  );
}
