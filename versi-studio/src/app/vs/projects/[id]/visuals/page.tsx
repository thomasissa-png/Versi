/**
 * Step 4 — Créez vos visuels post-travaux
 * Rendu : Client Component — interactions upload, génération, chat.
 *
 * 5 états UI :
 * - Défaut : grille des pièces, invitation à sélectionner
 * - Loading : chargement initial du projet (skeleton)
 * - Vide : aucune pièce → retour step 3
 * - Erreur : toast rouge
 * - Succès : toutes les pièces ont un visuel validé → projet terminé
 */

"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Stepper from "@/components/vs/Stepper";
import RoomGrid from "@/components/vs/RoomGrid";
import VisualRoom from "@/components/vs/VisualRoom";
import type {
  VsProject,
  VsLot,
  VsRoom,
  VsPhoto,
  VsVisual,
  ApiResponse,
} from "@/lib/vs/types";

// ─── Types locaux ─────────────────────────────────────────────────

interface RoomsByLot {
  [lotId: string]: VsRoom[];
}

interface RoomStatus {
  hasPhoto: boolean;
  hasVisual: boolean;
  hasValidatedVisual: boolean;
}

// ─── Composant principal ──────────────────────────────────────────

export default function VisualsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();

  // ─── State ────────────────────────────────────────────────────

  const [project, setProject] = useState<VsProject | null>(null);
  const [lots, setLots] = useState<VsLot[]>([]);
  const [roomsByLot, setRoomsByLot] = useState<RoomsByLot>({});
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomStatuses, setRoomStatuses] = useState<Record<string, RoomStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Chargement initial ───────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [projectRes, lotsRes] = await Promise.all([
        fetch(`/api/vs/projects/${projectId}`),
        fetch(`/api/vs/projects/${projectId}/lots`),
      ]);

      const projectJson = (await projectRes.json()) as ApiResponse<VsProject>;
      const lotsJson = (await lotsRes.json()) as ApiResponse<VsLot[]>;

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
              .catch(() => ({
                lotId: lot.id,
                rooms: [] as VsRoom[],
              }))
          )
        );

        const roomsMap: RoomsByLot = {};
        for (const { lotId, rooms } of roomsResults) {
          roomsMap[lotId] = rooms;
        }
        setRoomsByLot(roomsMap);

        // Sélectionner le premier lot
        setSelectedLotId(lotsData[0]?.id ?? null);

        // Charger les statuts de toutes les pièces (non-critique : ne pas bloquer)
        const allRooms = Object.values(roomsMap).flat();
        try {
          await fetchRoomStatuses(allRooms);
        } catch {
          // Les statuts de visuels sont secondaires — pas d'erreur globale
        }
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

  // ─── Chargement des statuts des pièces (photos + visuels) ────

  const fetchRoomStatuses = useCallback(async (rooms: VsRoom[]) => {
    const statuses: Record<string, RoomStatus> = {};

    // Charger les visuels de chaque pièce en parallèle
    const results = await Promise.all(
      rooms.map((room) =>
        fetch(`/api/vs/rooms/${room.id}/visuals`)
          .then((r) => r.json() as Promise<ApiResponse<{ photos: VsPhoto[]; visuals: VsVisual[] }>>)
          .then((json) => ({
            roomId: room.id,
            data: json.success ? json.data : { photos: [], visuals: [] },
          }))
          .catch(() => ({
            roomId: room.id,
            data: { photos: [] as VsPhoto[], visuals: [] as VsVisual[] },
          }))
      )
    );

    for (const { roomId, data } of results) {
      const photos = Array.isArray(data?.photos) ? data.photos : [];
      const visuals = Array.isArray(data?.visuals) ? data.visuals : [];
      statuses[roomId] = {
        hasPhoto: photos.length > 0,
        hasVisual: visuals.some(
          (v) => v.status === "generated" || v.status === "validated"
        ),
        hasValidatedVisual: visuals.some(
          (v) => v.status === "validated"
        ),
      };
    }

    setRoomStatuses(statuses);
  }, []);

  // ─── Rafraîchir les statuts d'une pièce après action ─────────

  const handleRefreshRoom = useCallback(async () => {
    if (!selectedRoomId) return;

    try {
      const res = await fetch(`/api/vs/rooms/${selectedRoomId}/visuals`);
      const json = (await res.json()) as ApiResponse<{ photos: VsPhoto[]; visuals: VsVisual[] }>;

      if (json.success) {
        setRoomStatuses((prev) => ({
          ...prev,
          [selectedRoomId]: {
            hasPhoto: json.data.photos.length > 0,
            hasVisual: json.data.visuals.some(
              (v) => v.status === "generated" || v.status === "validated"
            ),
            hasValidatedVisual: json.data.visuals.some(
              (v) => v.status === "validated"
            ),
          },
        }));
      }
    } catch {
      // Silencieux
    }
  }, [selectedRoomId]);

  // ─── Helpers dérivés ──────────────────────────────────────────

  const allRooms = Object.values(roomsByLot).flat();
  const currentRooms = selectedLotId ? roomsByLot[selectedLotId] ?? [] : [];
  const selectedRoom = currentRooms.find((r) => r.id === selectedRoomId) ?? null;

  const totalRooms = allRooms.length;
  const validatedRooms = allRooms.filter(
    (r) => roomStatuses[r.id]?.hasValidatedVisual
  ).length;
  const allValidated = totalRooms > 0 && validatedRooms === totalRooms;

  // Étapes complétées pour le stepper
  const completedSteps: (1 | 2 | 3 | 4)[] = [1, 2, 3];
  if (project?.status === "completed") {
    completedSteps.push(4);
  }

  // ─── Handlers ─────────────────────────────────────────────────

  const handleSelectLot = useCallback((lotId: string) => {
    setSelectedLotId(lotId);
    setSelectedRoomId(null);
  }, []);

  const handleSelectRoom = useCallback((roomId: string) => {
    setSelectedRoomId(roomId);
  }, []);

  const handleCompleteProject = useCallback(async () => {
    try {
      await fetch(`/api/vs/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      setProject((prev) => (prev ? { ...prev, status: "completed" } : prev));
    } catch {
      setError("Impossible de finaliser le projet.");
    }
  }, [projectId]);

  // ─── État Loading ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex gap-2xl h-[calc(100vh-120px)]">
        <aside className="w-64 flex-shrink-0">
          <Stepper currentStep={4} projectId={projectId} />
        </aside>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-6 h-6 border-2 border-border-default border-t-interactive-primary rounded-full animate-spin mb-md" />
            <p className="text-sm text-text-muted">
              Chargement des visuels...
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

  // ─── État Aucune pièce ────────────────────────────────────────

  if (allRooms.length === 0) {
    return (
      <div className="flex gap-2xl">
        <aside className="w-64 flex-shrink-0">
          <Stepper
            currentStep={4}
            projectId={projectId}
            completedSteps={completedSteps}
          />
        </aside>
        <div className="flex-1 flex items-center justify-center py-4xl">
          <div className="text-center">
            <p className="text-sm text-text-muted mb-md">
              Aucune pièce définie. Retournez à l'étape précédente pour
              identifier vos pièces.
            </p>
            <button
              onClick={() =>
                router.push(`/vs/projects/${projectId}/rooms`)
              }
              className="
                px-xl py-sm rounded-md text-sm font-medium
                bg-interactive-primary text-text-inverse
                hover:bg-interactive-hover transition-colors duration-200
              "
            >
              Retour aux pièces
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
          currentStep={4}
          projectId={projectId}
          completedSteps={completedSteps}
        />
      </aside>

      {/* Zone principale */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* En-tête */}
        <div className="mb-lg px-lg pt-lg overflow-hidden">
          <p className="vs-label mb-xs truncate" title={project.adresse}>{project.adresse}</p>
          <h1 className="text-base sm:text-xl uppercase tracking-wide font-semibold">Créez vos visuels</h1>
        </div>

        {/* Erreur globale */}
        {error && (
          <div className="mx-lg mb-md bg-error/10 border border-error/20 rounded-md p-md text-sm text-error flex items-start gap-sm">
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Bannière projet terminé */}
        {allValidated && (
          <div className="mx-lg mb-md bg-success/10 border border-success/20 rounded-md p-md">
            <div className="flex items-center gap-sm">
              <svg
                className="w-5 h-5 text-success flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-success">
                  Projet terminé — {lots.length} lot{lots.length > 1 ? "s" : ""} traité{lots.length > 1 ? "s" : ""}, {validatedRooms} visuel{validatedRooms > 1 ? "s" : ""} créé{validatedRooms > 1 ? "s" : ""}
                </p>
              </div>
              {project.status !== "completed" && (
                <button
                  onClick={handleCompleteProject}
                  className="
                    px-lg py-xs rounded-md text-sm font-medium
                    bg-success text-white
                    hover:bg-success/90 transition-colors duration-200
                  "
                >
                  Finaliser le projet
                </button>
              )}
            </div>
          </div>
        )}

        {/* Contenu : vue pièce + panneau latéral */}
        <div className="flex flex-1 min-h-0">
          {/* Zone de travail */}
          <div className="flex-1 min-w-0 flex">
            {selectedRoom ? (
              <VisualRoom
                key={selectedRoom.id}
                room={selectedRoom}
                onRefreshRoom={handleRefreshRoom}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <svg
                    className="w-16 h-16 text-text-muted mx-auto mb-md"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={0.75}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                    />
                  </svg>
                  <p className="text-sm text-text-muted">
                    Sélectionnez une pièce pour créer son visuel
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Panneau latéral : grille des pièces */}
          <RoomGrid
            lots={lots}
            selectedLotId={selectedLotId}
            onSelectLot={handleSelectLot}
            rooms={currentRooms}
            selectedRoomId={selectedRoomId}
            onSelectRoom={handleSelectRoom}
            roomStatuses={roomStatuses}
            totalRooms={totalRooms}
            validatedRooms={validatedRooms}
          />
        </div>
      </div>
    </div>
  );
}
