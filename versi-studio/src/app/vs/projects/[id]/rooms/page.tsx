/**
 * Step 3 — Identification des pièces par lot
 * Rendu : Client Component — interactions canvas, drag, formulaires.
 *
 * 5 états UI :
 * - Défaut : zoom sur le lot, pièces en overlays colorés par type
 * - Loading : "Identification des pièces en cours..." (skeleton)
 * - Vide : "Aucune pièce détectée — ajoutez-en manuellement"
 * - Erreur : toast rouge de sauvegarde
 * - Succès : badge vert "Lot validé", passage au lot suivant
 */

"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Stepper from "@/components/vs/Stepper";
import RoomCanvas from "@/components/vs/RoomCanvas";
import RoomPanel from "@/components/vs/RoomPanel";
import ConfirmModal from "@/components/vs/ConfirmModal";
import type {
  VsProject,
  VsLot,
  VsRoom,
  VsPlan,
  ZoneRect,
  ApiResponse,
} from "@/lib/vs/types";

// ─── Types locaux ─────────────────────────────────────────────────

interface RoomsByLot {
  [lotId: string]: VsRoom[];
}

// ─── Constantes ───────────────────────────────────────────────────

const DEBOUNCE_MS = 1000;

// ─── Composant principal ──────────────────────────────────────────

export default function RoomsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();

  // ─── State ────────────────────────────────────────────────────

  const [project, setProject] = useState<VsProject | null>(null);
  const [lots, setLots] = useState<VsLot[]>([]);
  const [plans, setPlans] = useState<VsPlan[]>([]);
  const [roomsByLot, setRoomsByLot] = useState<RoomsByLot>({});
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<{
    id: string;
    name?: string;
  } | null>(null);
  const [validationBlocked, setValidationBlocked] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Debounce timers pour les PATCH individuels
  const patchTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ─── Chargement initial ───────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [projectRes, lotsRes, plansRes] = await Promise.all([
        fetch(`/api/vs/projects/${projectId}`),
        fetch(`/api/vs/projects/${projectId}/lots`),
        fetch(`/api/vs/projects/${projectId}/plans`),
      ]);

      const projectJson = (await projectRes.json()) as ApiResponse<VsProject>;
      const lotsJson = (await lotsRes.json()) as ApiResponse<VsLot[]>;
      const plansJson = (await plansRes.json()) as ApiResponse<VsPlan[]>;

      if (!projectJson.success) {
        setError(projectJson.error);
        return;
      }
      if (!lotsJson.success) {
        setError(lotsJson.error);
        return;
      }

      setProject(projectJson.data);
      setLots(lotsJson.data);

      if (plansJson.success) {
        setPlans(plansJson.data);
      }

      // Charger les pièces de tous les lots en parallèle
      const lotsData = lotsJson.data;
      if (lotsData.length > 0) {
        const roomsResults = await Promise.all(
          lotsData.map((lot) =>
            fetch(`/api/vs/lots/${lot.id}/rooms`)
              .then((r) => r.json() as Promise<ApiResponse<VsRoom[]>>)
              .then((json) => ({
                lotId: lot.id,
                rooms: json.success ? json.data : [],
              }))
          )
        );

        const roomsMap: RoomsByLot = {};
        for (const { lotId, rooms } of roomsResults) {
          roomsMap[lotId] = rooms;
        }
        setRoomsByLot(roomsMap);

        // Sélectionner le premier lot non validé, ou le premier lot
        const firstUnvalidated = lotsData.find((l) => l.status !== "validated");
        setSelectedLotId(firstUnvalidated?.id ?? lotsData[0]?.id ?? null);
      }
    } catch {
      setError("Impossible de charger les données du projet.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Cleanup debounce timers ──────────────────────────────────

  useEffect(() => {
    return () => {
      const timers = patchTimers.current;
      for (const key of Object.keys(timers)) {
        clearTimeout(timers[key]);
      }
    };
  }, []);

  // ─── Helpers dérivés ──────────────────────────────────────────

  const currentLot = lots.find((l) => l.id === selectedLotId) ?? null;
  const currentRooms = selectedLotId ? roomsByLot[selectedLotId] ?? [] : [];
  const currentLotValidated = currentLot?.status === "validated";

  const allLotsValidated =
    lots.length > 0 && lots.every((l) => l.status === "validated");

  // Trouver le premier plan (pour le canvas background)
  const firstPlan = plans.length > 0 ? plans[0] : null;
  const planImageUrl = firstPlan?.file_path ?? null;

  const defaultZone: ZoneRect = {
    x_percent: 0,
    y_percent: 0,
    width_percent: 100,
    height_percent: 100,
  };
  const lotZone: ZoneRect = currentLot?.zone_data
    ? (currentLot.zone_data as unknown as ZoneRect)
    : defaultZone;

  // Étapes complétées pour le stepper
  const completedSteps: (1 | 2 | 3 | 4)[] = [];
  if (
    project?.status === "step_1_complete" ||
    project?.status === "step_2_complete" ||
    project?.status === "step_3_complete" ||
    project?.status === "completed"
  ) {
    completedSteps.push(1);
  }
  if (
    project?.status === "step_2_complete" ||
    project?.status === "step_3_complete" ||
    project?.status === "completed"
  ) {
    completedSteps.push(2);
  }
  if (project?.status === "step_3_complete" || project?.status === "completed") {
    completedSteps.push(3);
  }

  // ─── PATCH individuel avec debounce ───────────────────────────

  const patchRoom = useCallback(
    (roomId: string, updates: Record<string, unknown>) => {
      // Clear le timer précédent pour cette pièce
      if (patchTimers.current[roomId]) {
        clearTimeout(patchTimers.current[roomId]);
      }

      patchTimers.current[roomId] = setTimeout(async () => {
        try {
          const res = await fetch(`/api/vs/rooms/${roomId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          });
          const json = (await res.json()) as ApiResponse<VsRoom>;

          if (!json.success) {
            setError(json.error);
          }
        } catch {
          setError("Impossible de sauvegarder la modification.");
        }

        delete patchTimers.current[roomId];
      }, DEBOUNCE_MS);
    },
    []
  );

  // ─── PATCH immédiat (sans debounce) — utilisé pour room_type (UX-P1-1)
  const patchRoomImmediate = useCallback(
    async (roomId: string, updates: Record<string, unknown>) => {
      // Annuler tout debounce en attente sur cette pièce pour éviter les écrasements
      if (patchTimers.current[roomId]) {
        clearTimeout(patchTimers.current[roomId]);
        delete patchTimers.current[roomId];
      }

      try {
        const res = await fetch(`/api/vs/rooms/${roomId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        const json = (await res.json()) as ApiResponse<VsRoom>;

        if (!json.success) {
          setError(json.error);
        }
      } catch {
        setError("Impossible de sauvegarder la modification.");
      }
    },
    []
  );

  // ─── Handlers ─────────────────────────────────────────────────

  const handleSelectLot = useCallback((lotId: string) => {
    setSelectedLotId(lotId);
    setSelectedRoomId(null);
  }, []);

  const handleSelectRoom = useCallback((roomId: string | null) => {
    setSelectedRoomId(roomId);
  }, []);

  const handleUpdateRoom = useCallback(
    (roomId: string, updates: Partial<VsRoom>) => {
      if (!selectedLotId) return;

      const isRoomTypeChange = updates.room_type !== undefined;
      const lotWasValidated =
        lots.find((l) => l.id === selectedLotId)?.status === "validated";

      // Optimistic update
      setRoomsByLot((prev) => {
        const lotRooms = prev[selectedLotId] ?? [];
        return {
          ...prev,
          [selectedLotId]: lotRooms.map((r) =>
            r.id === roomId ? { ...r, ...updates } : r
          ),
        };
      });

      // UX-P1-3 : si changement de type sur un lot déjà validé,
      // rebascule optimistement le lot en "à valider" + warning utilisateur
      if (isRoomTypeChange && lotWasValidated) {
        setLots((prev) =>
          prev.map((l) =>
            l.id === selectedLotId ? { ...l, status: "suggested" } : l
          )
        );
        setWarningMessage(
          "Le lot a été invalidé — validez-le à nouveau avant de continuer"
        );
      }

      // Préparer le payload API (ne pas envoyer les champs non-API)
      const apiUpdates: Record<string, unknown> = {};
      if (updates.room_type !== undefined)
        apiUpdates.room_type = updates.room_type;
      if (updates.custom_label !== undefined)
        apiUpdates.custom_label = updates.custom_label;
      if (updates.name !== undefined) apiUpdates.name = updates.name;
      if (updates.surface_m2 !== undefined)
        apiUpdates.surface_m2 = updates.surface_m2;
      if (updates.position !== undefined)
        apiUpdates.position = updates.position;

      if (Object.keys(apiUpdates).length > 0) {
        // UX-P1-1 : PATCH room_type immédiat (pas de debounce)
        if (isRoomTypeChange) {
          patchRoomImmediate(roomId, apiUpdates);
        } else {
          patchRoom(roomId, apiUpdates);
        }
      }
    },
    [selectedLotId, lots, patchRoom, patchRoomImmediate]
  );

  const handleMoveRoom = useCallback(
    (
      roomId: string,
      position: {
        x_percent: number;
        y_percent: number;
        width_percent: number;
        height_percent: number;
      }
    ) => {
      handleUpdateRoom(roomId, {
        position: position as unknown as Record<string, unknown>,
      });
    },
    [handleUpdateRoom]
  );

  const handleAddRoom = useCallback(async () => {
    if (!selectedLotId) return;

    try {
      const res = await fetch(`/api/vs/lots/${selectedLotId}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_type: "chambre",
          name: null,
          position: {
            x_percent: 10,
            y_percent: 10,
            width_percent: 25,
            height_percent: 25,
          },
        }),
      });
      const json = (await res.json()) as ApiResponse<VsRoom>;

      if (json.success) {
        setRoomsByLot((prev) => ({
          ...prev,
          [selectedLotId]: [...(prev[selectedLotId] ?? []), json.data],
        }));
        setSelectedRoomId(json.data.id);
      } else {
        setError(json.error);
      }
    } catch {
      setError("Impossible d'ajouter la pièce.");
    }
  }, [selectedLotId]);

  const handleDeleteRoom = useCallback(
    (roomId: string) => {
      const room = currentRooms.find((r) => r.id === roomId);
      setRoomToDelete({ id: roomId, name: room?.name ?? undefined });
    },
    [currentRooms]
  );

  const handleConfirmDelete = useCallback(
    async (roomId: string) => {
      if (!selectedLotId) return;

      // Optimistic delete
      setRoomsByLot((prev) => ({
        ...prev,
        [selectedLotId]: (prev[selectedLotId] ?? []).filter(
          (r) => r.id !== roomId
        ),
      }));

      if (selectedRoomId === roomId) {
        setSelectedRoomId(null);
      }

      try {
        const res = await fetch(`/api/vs/rooms/${roomId}`, {
          method: "DELETE",
        });
        const json = (await res.json()) as ApiResponse<{ deleted: boolean }>;

        if (!json.success) {
          // Rollback : recharger les pièces du lot
          setError(json.error);
          const refetch = await fetch(`/api/vs/lots/${selectedLotId}/rooms`);
          const refetchJson =
            (await refetch.json()) as ApiResponse<VsRoom[]>;
          if (refetchJson.success) {
            setRoomsByLot((prev) => ({
              ...prev,
              [selectedLotId]: refetchJson.data,
            }));
          }
        }
      } catch {
        setError("Impossible de supprimer la pièce.");
      }
    },
    [selectedLotId, selectedRoomId]
  );

  const handleValidateLot = useCallback(async () => {
    if (!selectedLotId) return;

    // Pré-check : toutes les pièces doivent être typées avant validation
    const untypedRooms = currentRooms.filter(
      (r) => r.room_type === "non_identifie"
    );
    if (untypedRooms.length > 0) {
      setValidationBlocked(true);
      setError(
        "Définissez le type de toutes les pièces avant de valider"
      );
      return;
    }
    setValidationBlocked(false);

    setIsValidating(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/vs/lots/${selectedLotId}/rooms/validate`,
        { method: "POST" }
      );
      const json =
        (await res.json()) as ApiResponse<{ lot: VsLot; rooms: VsRoom[] }>;

      if (json.success) {
        // Mettre à jour le lot et les pièces
        setLots((prev) =>
          prev.map((l) => (l.id === selectedLotId ? json.data.lot : l))
        );
        setRoomsByLot((prev) => ({
          ...prev,
          [selectedLotId]: json.data.rooms,
        }));

        // Passer au lot suivant non validé
        const updatedLots = lots.map((l) =>
          l.id === selectedLotId ? json.data.lot : l
        );
        const nextUnvalidated = updatedLots.find(
          (l) => l.status !== "validated" && l.id !== selectedLotId
        );
        if (nextUnvalidated) {
          setSelectedLotId(nextUnvalidated.id);
          setSelectedRoomId(null);
        }
      } else {
        setError(json.error);
      }
    } catch {
      setError("Impossible de valider les pièces.");
    } finally {
      setIsValidating(false);
    }
  }, [selectedLotId, lots, currentRooms]);

  const handleContinue = useCallback(async () => {
    try {
      await fetch(`/api/vs/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "step_3_complete" }),
      });
      router.push(`/vs/projects/${projectId}/visuals`);
    } catch {
      setError("Impossible de continuer.");
    }
  }, [projectId, router]);

  // ─── État Loading ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex gap-2xl h-[calc(100vh-120px)]">
        <aside className="w-64 flex-shrink-0">
          <Stepper currentStep={3} projectId={projectId} />
        </aside>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-6 h-6 border-2 border-border-default border-t-interactive-primary rounded-full animate-spin mb-md" />
            <p className="text-sm text-text-muted">
              {`L'IA identifie les pièces du ${currentLot?.name ?? "lot"}…`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── État Projet introuvable ──────────────────────────────────

  if (!project) {
    return (
      <div className="text-center py-4xl">
        <p className="text-text-muted">Opération introuvable.</p>
        {error && (
          <p className="mt-sm text-sm text-error max-w-md mx-auto">{error}</p>
        )}
        <div className="mt-md flex flex-col sm:flex-row gap-sm items-center justify-center">
          <button
            onClick={() => { setError(null); fetchData(); }}
            className="min-h-[44px] px-md py-sm rounded-md text-sm font-medium bg-interactive-primary text-text-inverse hover:bg-interactive-hover active:opacity-80 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
          >
            Réessayer
          </button>
          <button
            onClick={() => router.push("/vs")}
            className="text-sm underline text-text-muted hover:text-text-default"
          >
            Retour aux opérations
          </button>
        </div>
      </div>
    );
  }

  // ─── État Aucun lot ───────────────────────────────────────────

  if (lots.length === 0) {
    return (
      <div className="flex gap-2xl">
        <aside className="w-64 flex-shrink-0">
          <Stepper
            currentStep={3}
            projectId={projectId}
            completedSteps={completedSteps}
          />
        </aside>
        <div className="flex-1 flex items-center justify-center py-4xl">
          <div className="text-center">
            <p className="text-sm text-text-muted mb-md">
              Aucun lot défini. Retournez à l&apos;étape précédente pour découper
              vos lots.
            </p>
            <button
              onClick={() =>
                router.push(`/vs/projects/${projectId}/lots`)
              }
              className="
                px-xl py-sm rounded-md text-sm font-medium
                bg-interactive-primary text-text-inverse
                hover:bg-interactive-hover transition-colors duration-200
              "
            >
              Retour aux lots
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Rendu principal ──────────────────────────────────────────

  return (
    <div className="flex flex-col sm:flex-row gap-md sm:gap-2xl h-auto sm:h-[calc(100vh-120px)]">
      {/* Stepper latéral — caché sur mobile */}
      <aside className="hidden sm:block w-64 flex-shrink-0">
        <Stepper
          currentStep={3}
          projectId={projectId}
          completedSteps={completedSteps}
        />
      </aside>

      {/* Zone principale */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* En-tête */}
        <div className="mb-lg overflow-hidden">
          <p className="vs-label mb-xs truncate" title={project.adresse}>{project.adresse}</p>
          <h1 className="text-base sm:text-xl uppercase tracking-wide font-semibold">Identifiez les pièces</h1>
        </div>

        {/* Erreur globale */}
        {error && (
          <div className="mb-md bg-error/10 border border-error/20 rounded-md p-md text-sm text-error flex items-start gap-sm">
            <svg
              className="w-4 h-4 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-error hover:text-error/80"
              aria-label="Fermer le message d'erreur"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
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

        {/* Warning — lot invalidé après changement de type (UX-P1-3) */}
        {warningMessage && (
          <div
            className="mb-md bg-warning/10 border border-warning/20 rounded-md p-md text-sm text-warning flex items-start gap-sm"
            role="status"
          >
            <span className="flex-1">{warningMessage}</span>
            <button
              onClick={() => setWarningMessage(null)}
              className="ml-auto text-warning hover:text-warning/80"
              aria-label="Fermer l'avertissement"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
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

        {/* Message succès — tous les lots validés */}
        {allLotsValidated && (
          <p className="text-success mb-md" role="status">
            Tous les lots sont validés — vous pouvez générer les visuels
          </p>
        )}

        {/* Canvas + Panel */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0 gap-0">
          {/* Canvas — lecture seule sur mobile, interactif sur desktop */}
          <div className="h-[250px] shrink-0 sm:h-auto sm:shrink sm:flex-1 min-w-0">
            <RoomCanvas
              planImageUrl={planImageUrl}
              lotZone={lotZone}
              rooms={currentRooms}
              selectedRoomId={selectedRoomId}
              onSelectRoom={handleSelectRoom}
              onMoveRoom={handleMoveRoom}
              validationBlocked={validationBlocked}
            />
          </div>

          {/* Panel latéral */}
          <RoomPanel
            lots={lots}
            selectedLotId={selectedLotId ?? ""}
            onSelectLot={handleSelectLot}
            rooms={currentRooms}
            selectedRoomId={selectedRoomId}
            onSelectRoom={handleSelectRoom}
            onUpdateRoom={handleUpdateRoom}
            onAddRoom={handleAddRoom}
            onDeleteRoom={handleDeleteRoom}
            onValidateLot={handleValidateLot}
            onContinue={handleContinue}
            allLotsValidated={allLotsValidated}
            isValidating={isValidating}
            currentLotValidated={currentLotValidated}
            validationBlocked={validationBlocked}
          />
        </div>
      </div>
      <ConfirmModal
        isOpen={roomToDelete !== null}
        title="Supprimer cette pièce ?"
        message="Cette action est irréversible."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={() => {
          if (roomToDelete) {
            handleConfirmDelete(roomToDelete.id);
            setRoomToDelete(null);
          }
        }}
        onCancel={() => setRoomToDelete(null)}
      />
    </div>
  );
}
