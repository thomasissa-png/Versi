/**
 * VisualWizard — Composant racine de l'Étape 4 (s32 Phase 4 complète).
 *
 * Wizard linéaire pièce-par-pièce avec preview INLINE des visuels :
 * Thomas génère pièce par pièce, valide chaque pièce avant la suivante.
 *
 * Phases parent :
 *   "wizard" → step pièce courante (avec sous-état RoomStepState) ou recap final
 *   "recap"  → vue d'ensemble post-validation de toutes les pièces
 *
 * RoomStepState (sous-état par pièce, source de vérité dans roomStepStates) :
 *   "configuring" → layout standard (canvas + photos + style + bouton "Générer cette pièce")
 *   "generating"  → RoomGenerationProgress (spinner) en lieu et place du canvas
 *   "preview"     → RoomPreviewView avec visuels + boutons "Régénérer" / "Valider"
 *   "validated"   → carte compacte "Modifier" si on revient à cette pièce
 *
 * État local clé :
 *   - currentStepIndex : index de la pièce courante (0..visibleRooms.length-1)
 *   - pendingPlacements : positions cliquées sur le canvas mais sans photo
 *     uploadée (préfixe id "pending-..."). Une fois upload réussi, remplacé
 *     par le VsPhoto réel renvoyé par l'API.
 *   - roomStepStates : Map<roomId, RoomStepState>
 *   - validatedVisualsByRoom : visuels reçus + validés par pièce (persistent UI)
 *
 * Persistance reprise : au mount, fetch /api/vs/rooms/:id/visuals pour chaque
 * pièce → si visuels existent, init la pièce en `validated`.
 *
 * Les callbacks API sont localisés ici (un seul point de vérité pour les
 * mutations photos/style). Le canvas et les sous-vues sont purement UI.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import VisualWizardRoomStep from "@/components/vs/VisualWizardRoomStep";
import VisualWizardRecap from "@/components/vs/VisualWizardRecap";
import RoomPreviewView from "@/components/vs/RoomPreviewView";
import RoomGenerationProgress from "@/components/vs/RoomGenerationProgress";
import { useVisualsStream, type VisualGenerated } from "@/hooks/useVisualsStream";
import type {
  VsRoom,
  VsPhoto,
  VsVisual,
  ZoneRect,
  ApiResponse,
} from "@/lib/vs/types";
import type { NormalizedPoint } from "@/lib/vs/ui/photo-placement";
import type { StyleId } from "@/lib/vs/styles";

type Phase = "wizard" | "recap";

/**
 * État d'une pièce dans le flow wizard pièce-par-pièce (s32 Phase 4).
 *
 *  - configuring : layout standard (canvas + photos + style + bouton "Générer cette pièce")
 *  - generating  : génération SSE en cours pour cette pièce
 *  - preview     : visuels reçus, en attente de validation utilisateur
 *  - validated   : pièce validée, carte compacte récap si on revient en arrière
 */
export type RoomStepState = "configuring" | "generating" | "preview" | "validated";

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
  // C1 itér.4 — normalise is_furnished : null/undefined → true (default métier
  // immo : un bien vendu marchand de biens est plus souvent meublé que vide).
  // Sans ça, le toggle "Non meublée" apparaît actif par défaut sans choix Thomas.
  const normalizeRoom = useCallback(
    (r: VsRoom): VsRoom => ({
      ...r,
      is_furnished: r.is_furnished === null || r.is_furnished === undefined ? true : r.is_furnished,
    }),
    []
  );
  const [phase, setPhase] = useState<Phase>("wizard");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [photos, setPhotos] = useState<VsPhoto[]>(initialPhotos);
  const [roomsState, setRoomsState] = useState<VsRoom[]>(() => rooms.map(normalizeRoom));
  // C3 itér.4 — expected_count par pièce (persisté à la POST /generate, lu par
  // RoomGenerationProgress via targetCount). Évite le hardcode 1.
  const [roomExpectedCount, setRoomExpectedCount] = useState<Map<string, number>>(
    () => new Map()
  );
  // C4 itér.4 — two-step confirm pour "Régénérer cette pièce" (depuis preview).
  const [confirmRegenerate, setConfirmRegenerate] = useState<boolean>(false);
  // Reset confirm si on change de pièce.
  useEffect(() => {
    setConfirmRegenerate(false);
  }, [currentStepIndex]);
  const [pendingPlacements, setPendingPlacements] = useState<PendingPlacement[]>([]);
  const [error, setError] = useState<string | null>(null);
  // s32 #3 (autopilot) — commentaires par pièce, lus à la première navigation
  // sur la pièce courante, persistés via PATCH /rooms/:id/settings (debounce
  // côté composant enfant). Map<room_id, comment_text>.
  const [commentsByRoom, setCommentsByRoom] = useState<Map<string, string>>(new Map());

  // s32 Phase 4 — state machine par pièce (configuring/generating/preview/validated).
  const [roomStepStates, setRoomStepStates] = useState<Map<string, RoomStepState>>(
    () => new Map()
  );
  // Visuels validés en mémoire (persistance UI : on garde la liste affichée
  // dans le récap final même si le SSE est fermé). Map<roomId, visuals>.
  const [validatedVisualsByRoom, setValidatedVisualsByRoom] = useState<
    Map<string, VisualGenerated[]>
  >(() => new Map());
  // Reprise initiale depuis DB : tag pour ne pas refetcher en boucle.
  const [initialResumeFetched, setInitialResumeFetched] = useState(false);

  // Resync si parent recharge les données
  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  useEffect(() => {
    setRoomsState(rooms.map(normalizeRoom));
  }, [rooms, normalizeRoom]);

  // s32 Phase 4 — au moins une pièce en `generating` ou `preview` doit garder
  // le stream actif (preview pour permettre re-régénération sans relancer la
  // connexion).
  const hasActiveRoomGeneration = useMemo(() => {
    for (const st of roomStepStates.values()) {
      if (st === "generating" || st === "preview") return true;
    }
    return false;
  }, [roomStepStates]);

  // SSE consumer (actif dès qu'au moins une pièce est en `generating` ou `preview`)
  const sseEnabled = hasActiveRoomGeneration;
  const stream = useVisualsStream({
    projectId: sseEnabled ? projectId : null,
    enabled: sseEnabled,
  });

  // Helper : lire l'état d'une pièce. `configuring` par défaut.
  const getRoomState = useCallback(
    (roomId: string): RoomStepState =>
      roomStepStates.get(roomId) ?? "configuring",
    [roomStepStates]
  );

  // Helper : muter l'état d'une pièce.
  const setRoomState = useCallback(
    (roomId: string, state: RoomStepState) => {
      setRoomStepStates((prev) => {
        const next = new Map(prev);
        next.set(roomId, state);
        return next;
      });
    },
    []
  );

  // ─── Helpers dérivés ────────────────────────────────────────────
  // s32 #5 — filtrer les pièces 'skipped' du wizard. Le user peut toujours
  // les retrouver via le récap ou désactiver le skip (pas implémenté en V1).
  const visibleRooms = useMemo(
    () => roomsState.filter((r) => r.status !== "skipped"),
    [roomsState]
  );
  const currentRoom: VsRoom | null = visibleRooms[currentStepIndex] ?? null;

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

  // Visuels reçus pour la pièce courante (filtre client par room_id).
  // Source : SSE en cours OU validatedVisualsByRoom (cas reprise après stream fermé).
  const currentRoomVisuals = useMemo<VisualGenerated[]>(() => {
    if (!currentRoom) return [];
    const fromStream = stream.visualsByRoom.get(currentRoom.id) ?? [];
    if (fromStream.length > 0) return fromStream;
    return validatedVisualsByRoom.get(currentRoom.id) ?? [];
  }, [currentRoom, stream.visualsByRoom, validatedVisualsByRoom]);

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
        setError("L'envoi de la photo a échoué.");
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

  // s32 #1 (autopilot) — commit déplacement pastille (drag move).
  const handlePlacementMoveCommit = useCallback(
    async (placementId: string, point: NormalizedPoint) => {
      // Cas pending : MAJ locale uniquement
      if (placementId.startsWith("pending-")) {
        setPendingPlacements((prev) =>
          prev.map((p) =>
            p.id === placementId
              ? { ...p, position_x: point.x, position_y: point.y }
              : p
          )
        );
        return;
      }
      const photo = photos.find((p) => p.id === placementId);
      if (!photo) return;
      // Optimistic UI : MAJ locale immédiate
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === placementId
            ? { ...p, position_x: point.x, position_y: point.y }
            : p
        )
      );
      try {
        const res = await fetch(`/api/vs/photos/${placementId}/place`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_id: photo.room_id,
            position_x: point.x,
            position_y: point.y,
            angle_degrees: photo.angle_degrees,
          }),
        });
        const json = (await res.json()) as ApiResponse<{
          photo_id: string;
          position_x: number;
          position_y: number;
        }>;
        if (!json.success) {
          // Rollback
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === placementId
                ? { ...p, position_x: photo.position_x, position_y: photo.position_y }
                : p
            )
          );
          setError(json.error);
        }
      } catch {
        setError("Déplacement non enregistré.");
      }
    },
    [photos]
  );

  // s32 #3 (autopilot) — toggle meublé/non-meublé sur la pièce courante.
  const handleFurnishedChange = useCallback(
    async (isFurnished: boolean) => {
      if (!currentRoom) return;
      // Optimistic
      setRoomsState((prev) =>
        prev.map((r) =>
          r.id === currentRoom.id ? { ...r, is_furnished: isFurnished } : r
        )
      );
      try {
        const res = await fetch(`/api/vs/rooms/${currentRoom.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_furnished: isFurnished }),
        });
        const json = (await res.json()) as ApiResponse<VsRoom>;
        if (!json.success) {
          setRoomsState((prev) =>
            prev.map((r) =>
              r.id === currentRoom.id ? { ...r, is_furnished: !isFurnished } : r
            )
          );
          setError(json.error);
        }
      } catch {
        setError("État de la pièce non enregistré.");
      }
    },
    [currentRoom]
  );

  // s32 #3 (autopilot) — commentaire pièce (debounce côté child, persisté
  // dans vs_room_settings.comment_text via /rooms/:id/settings).
  const handleCommentChange = useCallback(
    async (comment: string) => {
      if (!currentRoom) return;
      // s32 fix P2 (Thomas iter4) — PATCH partiel : on n'envoie QUE comment_text.
      // L'API settings préserve target_visual_count existant via COALESCE
      // (route.ts). Avant ce fix, on écrasait silencieusement target=3 → 1
      // dès que Thomas tapait un commentaire.
      try {
        const res = await fetch(`/api/vs/rooms/${currentRoom.id}/settings`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            comment_text: comment.trim() || null,
          }),
        });
        const json = (await res.json()) as ApiResponse<{ room_id: string }>;
        if (!json.success) {
          setError(json.error);
          return;
        }
        setCommentsByRoom((prev) => {
          const next = new Map(prev);
          next.set(currentRoom.id, comment);
          return next;
        });
      } catch {
        setError("Commentaire non enregistré.");
      }
    },
    [currentRoom]
  );

  // s32 Phase 4 (complète) — génère uniquement la pièce courante.
  // Pattern : POST /generate avec room_ids=[currentRoom.id], puis bascule
  // l'état de cette pièce en `generating`. Le SSE consommera les événements
  // filtrés côté worker par room_id. Le wizard parent garde phase="wizard"
  // mais la sous-vue affiche RoomGenerationProgress en lieu et place du canvas.
  const handleGenerateThisRoom = useCallback(async () => {
    if (!currentRoom) return;
    if (!currentRoom.style_id) {
      setError("Choisissez un style pour cette pièce avant de générer.");
      return;
    }
    // Reset visuels validés pour cette pièce (cas régénération) — les nouveaux
    // visuels arriveront via SSE, on évite ainsi d'afficher un mix anciens/nouveaux.
    setValidatedVisualsByRoom((prev) => {
      const next = new Map(prev);
      next.delete(currentRoom.id);
      return next;
    });
    try {
      const res = await fetch(
        `/api/vs/projects/${projectId}/visuals/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            style_id: currentRoom.style_id,
            room_ids: [currentRoom.id],
          }),
        }
      );
      const json = (await res.json()) as ApiResponse<{
        job_id: string;
        expected_count: number;
        estimated_cost_usd: number;
      }>;
      if (!json.success) {
        setError(json.error);
        return;
      }
      setError(null);
      // C3 itér.4 — persiste expected_count pour la pièce (lu par
      // RoomGenerationProgress via targetCount, évite le hardcode 1).
      setRoomExpectedCount((prev) => {
        const next = new Map(prev);
        next.set(currentRoom.id, json.data.expected_count ?? 1);
        return next;
      });
      // Bascule l'état de la pièce → la sous-vue affiche RoomGenerationProgress.
      setRoomState(currentRoom.id, "generating");
    } catch {
      setError("La génération n'a pas pu démarrer pour cette pièce.");
    }
  }, [currentRoom, projectId, setRoomState]);

  // s32 #5 (autopilot) — skip pièce courante.
  const handleSkipRoom = useCallback(async () => {
    if (!currentRoom) return;
    try {
      const res = await fetch(`/api/vs/rooms/${currentRoom.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "skipped" }),
      });
      const json = (await res.json()) as ApiResponse<VsRoom>;
      if (!json.success) {
        setError(json.error);
        return;
      }
      // Optimistic : retire la pièce de la liste visible. L'index courant
      // pointera automatiquement sur la "suivante" puisque visibleRooms se
      // recalculera. Si on était sur la dernière, fallback recap.
      setRoomsState((prev) =>
        prev.map((r) =>
          r.id === currentRoom.id ? { ...r, status: "skipped" } : r
        )
      );
      // Si la pièce skippée était la dernière visible, passer au récap.
      const remainingAfterSkip = visibleRooms.filter(
        (r) => r.id !== currentRoom.id
      );
      if (currentStepIndex >= remainingAfterSkip.length) {
        if (remainingAfterSkip.length === 0) {
          setPhase("recap");
        } else {
          setCurrentStepIndex(remainingAfterSkip.length - 1);
        }
      }
      // Sinon currentStepIndex reste sur la "nouvelle" pièce qui occupe ce slot.
    } catch {
      setError("Pièce non passée — réessayez.");
    }
  }, [currentRoom, visibleRooms, currentStepIndex]);

  // s32 #3 (autopilot) — fetch initial des paramètres room_settings (commentaire
  // déjà en DB) lors du changement de pièce courante.
  useEffect(() => {
    if (!currentRoom) return;
    if (commentsByRoom.has(currentRoom.id)) return; // déjà fetché/édité
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/vs/rooms/${currentRoom.id}/settings`);
        const json = (await res.json()) as ApiResponse<{
          comment_text: string | null;
        }>;
        if (cancelled) return;
        if (json.success) {
          setCommentsByRoom((prev) => {
            const next = new Map(prev);
            next.set(currentRoom.id, json.data.comment_text ?? "");
            return next;
          });
        }
      } catch {
        /* silencieux — UI part avec brouillon vide */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentRoom, commentsByRoom]);

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
    if (currentStepIndex < visibleRooms.length - 1) {
      setCurrentStepIndex((i) => i + 1);
    } else {
      setPhase("recap");
    }
  }, [currentStepIndex, visibleRooms.length]);

  const handlePrevRoom = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((i) => i - 1);
    }
  }, [currentStepIndex]);

  const handleEditRoomFromRecap = useCallback(
    (roomId: string) => {
      // s32 #5 : si la pièce est skippée, on l'unskip implicitement (le user
      // veut clairement la rééditer puisqu'il clique "Modifier").
      const target = roomsState.find((r) => r.id === roomId);
      if (target && target.status === "skipped") {
        // PATCH async — pas bloquant pour la nav.
        void fetch(`/api/vs/rooms/${roomId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "validated" }),
        });
        setRoomsState((prev) =>
          prev.map((r) => (r.id === roomId ? { ...r, status: "validated" } : r))
        );
      }
      const visible = roomsState
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => r.id === roomId || r.status !== "skipped");
      const idx = visible.findIndex(({ r }) => r.id === roomId);
      if (idx >= 0) {
        setCurrentStepIndex(idx);
        setPhase("wizard");
      }
    },
    [roomsState]
  );

  // s32 Phase 4 — Régénérer cette pièce : repasse en `configuring` et reset visuels.
  // C4 itér.4 — confirm two-step (premier clic = arme, second = exécute) pour
  // empêcher la perte accidentelle des visuels en cours.
  const handleRegenerateRoom = useCallback(() => {
    if (!currentRoom) return;
    if (!confirmRegenerate) {
      setConfirmRegenerate(true);
      return;
    }
    setConfirmRegenerate(false);
    setValidatedVisualsByRoom((prev) => {
      const next = new Map(prev);
      next.delete(currentRoom.id);
      return next;
    });
    setRoomState(currentRoom.id, "configuring");
  }, [currentRoom, setRoomState, confirmRegenerate]);

  // s32 Phase 4 — Valider les visuels et passer à la pièce suivante.
  // Persiste les visuels reçus dans validatedVisualsByRoom (pour le récap final
  // si le stream est fermé) puis bascule en `validated` + next step.
  const handleValidateRoom = useCallback(() => {
    if (!currentRoom) return;
    const visuals = currentRoomVisuals;
    if (visuals.length > 0) {
      setValidatedVisualsByRoom((prev) => {
        const next = new Map(prev);
        next.set(currentRoom.id, visuals);
        return next;
      });
    }
    setRoomState(currentRoom.id, "validated");
    // Avance au step suivant — si on était sur la dernière pièce, recap.
    if (currentStepIndex < visibleRooms.length - 1) {
      setCurrentStepIndex((i) => i + 1);
    } else {
      setPhase("recap");
    }
  }, [
    currentRoom,
    currentRoomVisuals,
    currentStepIndex,
    visibleRooms.length,
    setRoomState,
  ]);

  // s32 Phase 4 — Annuler une génération en cours pour cette pièce (revient
  // en configuring sans visuels).
  const handleCancelRoomGeneration = useCallback(() => {
    if (!currentRoom) return;
    setRoomState(currentRoom.id, "configuring");
  }, [currentRoom, setRoomState]);

  // s32 Phase 4 — Transitions automatiques générées par les events SSE.
  // Quand une pièce en `generating` reçoit un visuel via stream, on bascule
  // en `preview`. La logique est déclarative : pour CHAQUE pièce en
  // `generating`, vérifier si stream a déjà au moins 1 visuel pour elle.
  useEffect(() => {
    if (stream.visualsByRoom.size === 0) return;
    let mutated = false;
    const next = new Map(roomStepStates);
    for (const [roomId, state] of next.entries()) {
      if (state !== "generating") continue;
      const list = stream.visualsByRoom.get(roomId);
      if (list && list.length > 0) {
        next.set(roomId, "preview");
        mutated = true;
      }
    }
    if (mutated) setRoomStepStates(next);
  }, [stream.visualsByRoom, roomStepStates]);

  // s32 Phase 4 — Persistance reprise : au mount, fetch les visuels existants
  // pour chaque pièce. Si une pièce a déjà des visuels en DB → init en
  // `validated` + persiste les visuels pour le récap final.
  useEffect(() => {
    if (initialResumeFetched) return;
    if (visibleRooms.length === 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const results = await Promise.all(
          visibleRooms.map(async (room) => {
            try {
              const res = await fetch(`/api/vs/rooms/${room.id}/visuals`);
              const json = (await res.json()) as ApiResponse<{
                photos: VsPhoto[];
                visuals: Array<VsVisual & { photo_file_path: string }>;
              }>;
              if (!json.success) return { roomId: room.id, visuals: [] };
              // Garde uniquement les visuels avec un file_path (status generated/validated).
              const usable = json.data.visuals.filter(
                (v) => v.file_path && (v.status === "generated" || v.status === "validated")
              );
              const mapped: VisualGenerated[] = usable.map((v) => ({
                visual_id: v.id,
                room_id: room.id,
                kind: v.anchor_visual_id === null ? "anchor" : "secondary",
                file_path: v.file_path ?? "",
                coherence_mode: v.coherence_mode,
                status: v.status,
              }));
              return { roomId: room.id, visuals: mapped };
            } catch {
              return { roomId: room.id, visuals: [] };
            }
          })
        );
        if (cancelled) return;
        const initStates = new Map<string, RoomStepState>();
        const initVisuals = new Map<string, VisualGenerated[]>();
        for (const r of results) {
          if (r.visuals.length > 0) {
            initStates.set(r.roomId, "validated");
            initVisuals.set(r.roomId, r.visuals);
          }
        }
        if (initStates.size > 0) setRoomStepStates(initStates);
        if (initVisuals.size > 0) setValidatedVisualsByRoom(initVisuals);
        setInitialResumeFetched(true);
      } catch {
        setInitialResumeFetched(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialResumeFetched, visibleRooms]);

  // ─── Rendu ─────────────────────────────────────────────────────

  // État de la pièce courante (par défaut configuring).
  const currentRoomState: RoomStepState = currentRoom
    ? getRoomState(currentRoom.id)
    : "configuring";

  if (visibleRooms.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <p className="text-sm text-text-muted">Aucune pièce à configurer.</p>
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

      {/* Phase wizard avec sous-état par pièce. */}
      {phase === "wizard" && currentRoom && currentRoomState === "configuring" && (
        <VisualWizardRoomStep
          stepIndex={currentStepIndex + 1}
          totalSteps={visibleRooms.length}
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
          onFurnishedChange={handleFurnishedChange}
          onCommentChange={handleCommentChange}
          comment={commentsByRoom.get(currentRoom.id) ?? null}
          onSkipRoom={handleSkipRoom}
          onGenerateThisRoom={handleGenerateThisRoom}
          onPlacementMoveCommit={handlePlacementMoveCommit}
          onPrevRoom={currentStepIndex > 0 ? handlePrevRoom : null}
        />
      )}

      {phase === "wizard" && currentRoom && currentRoomState === "generating" && (
        <RoomGenerationProgress
          roomName={
            currentRoom.custom_label ||
            currentRoom.name ||
            currentRoom.room_type ||
            "Pièce"
          }
          receivedCount={(stream.visualsByRoom.get(currentRoom.id) ?? []).length}
          targetCount={roomExpectedCount.get(currentRoom.id) ?? 1}
          onCancel={handleCancelRoomGeneration}
          errorMessage={
            stream.status === "error"
              ? "Connexion difficile — la génération continue côté serveur, on rattrape l'état."
              : null
          }
        />
      )}

      {phase === "wizard" && currentRoom && currentRoomState === "preview" && (
        <div className="animate-in fade-in duration-300" data-testid="room-preview-wrapper">
          <RoomPreviewView
            roomName={
              currentRoom.custom_label ||
              currentRoom.name ||
              currentRoom.room_type ||
              "Pièce"
            }
            visuals={currentRoomVisuals}
            onRegenerate={handleRegenerateRoom}
            onValidate={handleValidateRoom}
            isLastRoom={currentStepIndex === visibleRooms.length - 1}
            busy={false}
            regenerateConfirm={confirmRegenerate}
          />
        </div>
      )}

      {/* État `validated` — carte compacte récap si on revient sur la pièce. */}
      {phase === "wizard" && currentRoom && currentRoomState === "validated" && (
        <ValidatedRoomCard
          stepIndex={currentStepIndex + 1}
          totalSteps={visibleRooms.length}
          roomName={
            currentRoom.custom_label ||
            currentRoom.name ||
            currentRoom.room_type ||
            "Pièce"
          }
          visuals={currentRoomVisuals}
          onModify={() => {
            if (!currentRoom) return;
            setRoomState(currentRoom.id, "configuring");
          }}
          onPrev={currentStepIndex > 0 ? handlePrevRoom : null}
          onNext={
            currentStepIndex < visibleRooms.length - 1
              ? handleNextRoom
              : () => setPhase("recap")
          }
          isLastRoom={currentStepIndex === visibleRooms.length - 1}
        />
      )}

      {phase === "recap" && (
        <VisualWizardRecap
          projectId={projectId}
          rooms={roomsState}
          photos={photos}
          validatedVisualsByRoom={validatedVisualsByRoom}
          planImageUrl={planImageUrl}
          lotZone={lotZone}
          onEditRoom={handleEditRoomFromRecap}
          onError={setError}
        />
      )}
    </div>
  );
}

// ─── ValidatedRoomCard ──────────────────────────────────────────────
// Carte compacte affichée pour une pièce déjà validée (visuels persistés).
// L'utilisateur peut "Modifier" pour revenir en configuring, ou naviguer
// avec Précédent / Suivante.

interface ValidatedRoomCardProps {
  stepIndex: number;
  totalSteps: number;
  roomName: string;
  visuals: VisualGenerated[];
  onModify: () => void;
  onPrev: (() => void) | null;
  onNext: () => void;
  isLastRoom: boolean;
}

function ValidatedRoomCard({
  stepIndex,
  totalSteps,
  roomName,
  visuals,
  onModify,
  onPrev,
  onNext,
  isLastRoom,
}: ValidatedRoomCardProps) {
  const main = visuals[0] ?? null;
  const previewSrc = main?.file_path
    ? `/api/vs/files?path=${encodeURIComponent(main.file_path)}`
    : null;
  return (
    <section
      className="flex flex-col gap-lg w-full"
      data-testid="validated-room-card"
      aria-labelledby="validated-room-title"
    >
      <header className="flex flex-col gap-xs">
        <p className="text-xs uppercase tracking-widest text-text-muted">
          Pièce {stepIndex} / {totalSteps} — Validée
        </p>
        <h2
          id="validated-room-title"
          className="text-xl sm:text-2xl uppercase tracking-wide font-semibold font-serif text-text-default"
        >
          {roomName}
        </h2>
      </header>

      <div className="rounded-md border border-success/40 bg-success/5 p-md flex flex-col sm:flex-row gap-md items-start">
        <div className="relative w-32 h-24 rounded-md overflow-hidden bg-bg-default border border-border-default flex-shrink-0">
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt={`Visuel principal — ${roomName}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">
              Aucun visuel
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col gap-xs min-w-0">
          <p className="text-sm text-text-default">
            Visuels validés — régénérez ou ajustez les paramètres si besoin.
          </p>
          <p className="text-xs text-text-muted">
            {visuals.length} visuel{visuals.length > 1 ? "s" : ""} validé
            {visuals.length > 1 ? "s" : ""} pour cette pièce.
          </p>
          <button
            type="button"
            onClick={onModify}
            data-testid="validated-room-modify"
            className="self-start min-h-[44px] px-md py-sm rounded-md text-sm font-medium border border-border-default text-text-default hover:bg-bg-card mt-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
          >
            Modifier
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-sm pt-sm border-t border-border-default">
        <div>
          {onPrev && (
            <button
              type="button"
              onClick={onPrev}
              className="min-h-[44px] px-md py-sm rounded-md text-sm font-medium border border-border-default text-text-default hover:bg-bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
            >
              ← Précédent
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onNext}
          data-testid="validated-room-next"
          className="min-h-[44px] px-xl py-sm rounded-md text-sm font-medium bg-interactive-primary text-text-inverse hover:bg-interactive-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
        >
          {isLastRoom ? "Récapitulatif" : "Pièce suivante →"}
        </button>
      </div>
    </section>
  );
}
