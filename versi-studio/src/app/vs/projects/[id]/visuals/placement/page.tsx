/**
 * Step 4 v2 — Placement photos sur plan (s30 Vague 3a)
 *
 * Rendu : Client Component — interactions canvas, drag-drop, tap mobile.
 *
 * Cette page expose le NOUVEAU pattern de placement (canvas plan + photos
 * draggables). La page `/visuals` existante (mode pièce-par-pièce v1) reste
 * intacte — la migration utilisateur sera décidée en Vague 3b.
 *
 * Sélection lot/étage : déduit depuis selectedLotId. Si plusieurs étages,
 * dropdown étage permet de switcher (règle s28 — plan dérivé dynamiquement
 * de l'étage sélectionné, JAMAIS plans[0]).
 *
 * 5 états UI (Gate G21) :
 *  - Loading : skeleton spinner
 *  - Vide : aucune pièce → CTA retour étape 3
 *  - Erreur : bandeau retry
 *  - Défaut : canvas + sidebar
 *  - Succès : toast après chaque placement (géré dans VisualPlacementView)
 */

"use client";

import { useEffect, useState, useCallback, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import VisualWizard from "@/components/vs/VisualWizard";
import type {
  VsProject,
  VsLot,
  VsPlan,
  VsRoom,
  VsPhoto,
  VsVisual,
  ZoneRect,
  ZonePolygonPoint,
  ApiResponse,
} from "@/lib/vs/types";

const DEFAULT_LOT_ZONE: ZoneRect = {
  x_percent: 0,
  y_percent: 0,
  width_percent: 100,
  height_percent: 100,
};

interface RoomVisualsResponse {
  photos: VsPhoto[];
  visuals: VsVisual[];
}

export default function VisualPlacementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();

  const [project, setProject] = useState<VsProject | null>(null);
  const [lots, setLots] = useState<VsLot[]>([]);
  const [plans, setPlans] = useState<VsPlan[]>([]);
  const [rooms, setRooms] = useState<VsRoom[]>([]);
  const [photos, setPhotos] = useState<VsPhoto[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
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
      if (!plansJson.success) {
        setError(plansJson.error);
        return;
      }

      setProject(projectJson.data);
      setLots(lotsJson.data);
      setPlans(plansJson.data);

      const firstLot = lotsJson.data[0] ?? null;
      if (firstLot) setSelectedLotId(firstLot.id);

      // Charger pièces + photos par lot
      const lotRoomsResults = await Promise.all(
        lotsJson.data.map((lot) =>
          fetch(`/api/vs/lots/${lot.id}/rooms`)
            .then((r) => r.json() as Promise<ApiResponse<VsRoom[]>>)
            .then((j) => (j.success ? j.data : []))
            .catch(() => [] as VsRoom[])
        )
      );
      const allRooms = lotRoomsResults.flat();
      setRooms(allRooms);

      // Charger photos par room (un fetch par room, parallèle)
      const photoResults = await Promise.all(
        allRooms.map((r) =>
          fetch(`/api/vs/rooms/${r.id}/visuals`)
            .then((res) => res.json() as Promise<ApiResponse<RoomVisualsResponse>>)
            .then((j) => (j.success ? j.data.photos : []))
            .catch(() => [] as VsPhoto[])
        )
      );
      setPhotos(photoResults.flat());
    } catch {
      setError("Impossible de charger les données du projet.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ─── Plan dérivé de selectedLot.floor_number (règle s28 — JAMAIS plans[0]) ─

  const selectedLot = useMemo(
    () => lots.find((l) => l.id === selectedLotId) ?? null,
    [lots, selectedLotId]
  );

  const planForLot = useMemo(() => {
    if (!selectedLot) return null;
    // Dérivation dynamique stricte (règle s28 propagée fullstack.md)
    const matched = plans.find((p) => p.floor_number === selectedLot.floor_number);
    return matched ?? null;
  }, [plans, selectedLot]);

  const planImageUrl = useMemo(() => {
    if (!planForLot) return null;
    return `/api/vs/files?path=${encodeURIComponent(planForLot.file_path)}`;
  }, [planForLot]);

  // ─── lotZone (s32 fix BUG 1) ────────────────────────────────────
  // Pattern aligné avec rooms/page.tsx : dérive bbox du lot depuis zone_data.
  // Un lot peut être stocké en rect ({x,y,w,h}) OU polygon ({points}). Pour
  // le rendu canvas, on a besoin d'un rect (bbox englobant).
  const lotZone = useMemo<ZoneRect>(() => {
    if (!selectedLot?.zone_data) return DEFAULT_LOT_ZONE;
    const raw = selectedLot.zone_data as Record<string, unknown>;
    if (raw.type === "polygon" && Array.isArray(raw.points)) {
      const pts = (raw.points as ZonePolygonPoint[]).map((p) => ({
        x_percent: Number(p.x_percent),
        y_percent: Number(p.y_percent),
      }));
      if (pts.length === 0) return DEFAULT_LOT_ZONE;
      const xs = pts.map((p) => p.x_percent);
      const ys = pts.map((p) => p.y_percent);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);
      return {
        x_percent: minX,
        y_percent: minY,
        width_percent: maxX - minX,
        height_percent: maxY - minY,
      };
    }
    // Rect (legacy ou explicite)
    return {
      x_percent: Number(raw.x_percent ?? 0),
      y_percent: Number(raw.y_percent ?? 0),
      width_percent: Number(raw.width_percent ?? 100),
      height_percent: Number(raw.height_percent ?? 100),
    };
  }, [selectedLot]);

  const roomsForLot = useMemo(
    () => (selectedLotId ? rooms.filter((r) => r.lot_id === selectedLotId) : []),
    [rooms, selectedLotId]
  );

  const photosForLot = useMemo(() => {
    const roomIds = new Set(roomsForLot.map((r) => r.id));
    return photos.filter((p) => roomIds.has(p.room_id));
  }, [photos, roomsForLot]);

  // ─── États UI ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="text-center">
          <div className="inline-block w-6 h-6 border-2 border-border-default border-t-interactive-primary rounded-full animate-spin mb-md" />
          <p className="text-sm text-text-muted">Chargement du plan…</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-4xl">
        <p className="text-text-muted mb-md">Opération introuvable.</p>
        {error && (
          <p className="mt-sm text-sm text-error max-w-md mx-auto">{error}</p>
        )}
        <button
          onClick={() => router.push("/vs")}
          className="mt-md min-h-[44px] px-md py-sm rounded-md text-sm font-medium bg-interactive-primary text-text-inverse hover:bg-interactive-hover"
        >
          Retour aux opérations
        </button>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="text-center max-w-md">
          <p className="text-sm text-text-muted mb-md">
            Aucune pièce définie — retournez à l&apos;étape précédente pour
            identifier vos pièces.
          </p>
          <button
            onClick={() => router.push(`/vs/projects/${projectId}/rooms`)}
            className="min-h-[44px] px-xl py-sm rounded-md text-sm font-medium bg-interactive-primary text-text-inverse hover:bg-interactive-hover"
          >
            Retour aux pièces
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* En-tête + sélecteur lot */}
      <div className="px-lg pt-lg pb-md border-b border-border-default">
        {/* HOTFIX-2 s31 : `/visuals` redirige désormais vers `/visuals/placement`,
            le bouton retour pointe directement vers l'étape précédente (pièces)
            pour éviter la boucle de redirect. */}
        <button
          type="button"
          onClick={() => router.push(`/vs/projects/${projectId}/rooms`)}
          className="inline-flex items-center gap-xs text-sm text-text-muted hover:text-text-default transition-colors mb-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary min-h-[44px]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Pièces
        </button>
        <p className="vs-label mb-xs truncate" title={project.adresse}>
          {project.adresse}
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-sm">
          <h1 className="text-base sm:text-xl uppercase tracking-wide font-semibold">
            Configurez vos pièces une par une
          </h1>
          {lots.length > 1 && (
            <label className="inline-flex items-center gap-sm text-sm">
              <span className="text-text-muted">Lot :</span>
              <select
                value={selectedLotId ?? ""}
                onChange={(e) => setSelectedLotId(e.target.value)}
                className="rounded-md border border-border-default px-md py-xs text-sm text-text-default bg-bg-default focus-visible:outline-none focus-visible:border-interactive-primary"
                aria-label="Sélectionner un lot"
              >
                {lots.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} (étage {l.floor_number})
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <p className="text-sm text-text-muted mt-xs">
          Pour chaque pièce, cliquez sur le plan pour ajouter une position de prise de vue,
          uploadez la photo correspondante, orientez la flèche et choisissez un style.
        </p>
      </div>

      {/* Erreur globale */}
      {error && (
        <div className="mx-lg my-md bg-error/10 border border-error/20 rounded-md p-md text-sm text-error flex items-start gap-sm">
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => fetchAll()}
            className="px-md py-xs rounded-md text-sm font-medium bg-interactive-primary text-text-inverse hover:bg-interactive-hover"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Vue principale — wizard pièce-par-pièce (s32 refonte UX) */}
      <div className="w-full">
        <VisualWizard
          projectId={projectId}
          planImageUrl={planImageUrl}
          lotZone={lotZone}
          rooms={roomsForLot}
          initialPhotos={photosForLot}
        />
      </div>
    </div>
  );
}
