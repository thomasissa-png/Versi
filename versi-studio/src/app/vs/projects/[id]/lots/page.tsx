/**
 * Step 2 — Éditeur canvas de découpe par lots
 * Rendu : Client Component — interactions canvas + panneau latéral.
 *
 * 5 états UI :
 * - Défaut : plan avec overlays colorés, panneau latéral avec liste des lots
 * - Loading : "Organisation des lots en cours..." (skeleton sur canvas)
 * - Vide : "Aucun lot détecté — créez-en manuellement" + bouton "Ajouter un lot"
 * - Erreur : toast rouge "Impossible de sauvegarder", état local conservé
 * - Succès : tous les lots validés, redirect vers /vs/projects/[id]/rooms
 */

"use client";

import { useState, useEffect, useCallback, useRef, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import Stepper from "@/components/vs/Stepper";
import PlanCanvas from "@/components/vs/PlanCanvas";
import LotPanel from "@/components/vs/LotPanel";
import type {
  VsProject,
  VsPlan,
  VsLot,
  ZoneRect,
  ApiResponse,
} from "@/lib/vs/types";

// ─── Constantes ───────────────────────────────────────────────────

const DEBOUNCE_SAVE_MS = 1_000;

// ─── Helpers ──────────────────────────────────────────────────────

function parseZoneData(lot: VsLot): ZoneRect {
  const zd = lot.zone_data as unknown as ZoneRect;
  return {
    x_percent: zd.x_percent ?? 10,
    y_percent: zd.y_percent ?? 10,
    width_percent: zd.width_percent ?? 20,
    height_percent: zd.height_percent ?? 20,
  };
}

function zonesOverlap(a: ZoneRect, b: ZoneRect): boolean {
  return (
    a.x_percent < b.x_percent + b.width_percent &&
    a.x_percent + a.width_percent > b.x_percent &&
    a.y_percent < b.y_percent + b.height_percent &&
    a.y_percent + a.height_percent > b.y_percent
  );
}

function hasAnyOverlap(lots: VsLot[]): boolean {
  for (let i = 0; i < lots.length; i++) {
    for (let j = i + 1; j < lots.length; j++) {
      if (lots[i].floor_number !== lots[j].floor_number) continue;
      if (zonesOverlap(parseZoneData(lots[i]), parseZoneData(lots[j]))) {
        return true;
      }
    }
  }
  return false;
}

// ─── Composant principal ──────────────────────────────────────────

export default function LotsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();

  // ─── State ────────────────────────────────────────────────────

  const [project, setProject] = useState<VsProject | null>(null);
  const [plans, setPlans] = useState<VsPlan[]>([]);
  const [lots, setLots] = useState<VsLot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<number>(0);

  // Debounce pour la sauvegarde auto
  const saveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  // ─── Chargement initial ───────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [projectRes, plansRes, lotsRes] = await Promise.all([
        fetch(`/api/vs/projects/${projectId}`),
        fetch(`/api/vs/projects/${projectId}/plans`),
        fetch(`/api/vs/projects/${projectId}/lots`),
      ]);

      const projectJson = (await projectRes.json()) as ApiResponse<VsProject>;
      const plansJson = (await plansRes.json()) as ApiResponse<VsPlan[]>;
      const lotsJson = (await lotsRes.json()) as ApiResponse<VsLot[]>;

      if (!projectJson.success) {
        setError(projectJson.error);
        return;
      }
      if (!plansJson.success) {
        setError(plansJson.error);
        return;
      }
      if (!lotsJson.success) {
        setError(lotsJson.error);
        return;
      }

      setProject(projectJson.data);
      setPlans(plansJson.data);
      setLots(lotsJson.data);

      // Sélectionner le premier étage disponible
      if (plansJson.data.length > 0) {
        setSelectedFloor(plansJson.data[0].floor_number);
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

  // ─── Étages disponibles ───────────────────────────────────────

  const floors = useMemo(() => {
    const floorSet = new Set<number>();
    for (const plan of plans) {
      floorSet.add(plan.floor_number);
    }
    return Array.from(floorSet).sort((a, b) => a - b);
  }, [plans]);

  // ─── Lots filtrés par étage ───────────────────────────────────

  const filteredLots = useMemo(
    () => lots.filter((lot) => lot.floor_number === selectedFloor),
    [lots, selectedFloor]
  );

  // ─── Index map stable pour les couleurs ───────────────────────

  const lotIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    lots.forEach((lot, i) => map.set(lot.id, i));
    return map;
  }, [lots]);

  // ─── Plan image URL pour l'étage sélectionné ─────────────────

  const planImageUrl = useMemo(() => {
    const plan = plans.find((p) => p.floor_number === selectedFloor);
    if (!plan) return null;
    return `/api/vs/files?path=${encodeURIComponent(plan.file_path)}`;
  }, [plans, selectedFloor]);

  // ─── Overlap detection ────────────────────────────────────────

  const hasOverlap = useMemo(() => hasAnyOverlap(lots), [lots]);

  // ─── Sauvegarde auto (debounce) ───────────────────────────────

  const saveLotZone = useCallback(
    async (lotId: string, zone: ZoneRect) => {
      try {
        const res = await fetch(`/api/vs/lots/${lotId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ zone_data: zone }),
        });
        const json = (await res.json()) as ApiResponse<VsLot>;
        if (!json.success) {
          setError("Impossible de sauvegarder les modifications.");
        }
      } catch {
        setError("Impossible de sauvegarder les modifications.");
      }
    },
    []
  );

  const handleUpdateLotZone = useCallback(
    (lotId: string, zone: ZoneRect) => {
      // Optimistic update
      setLots((prev) =>
        prev.map((lot) =>
          lot.id === lotId
            ? { ...lot, zone_data: zone as unknown as Record<string, unknown> }
            : lot
        )
      );

      // Debounce la sauvegarde
      const existing = saveTimersRef.current.get(lotId);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        saveLotZone(lotId, zone);
        saveTimersRef.current.delete(lotId);
      }, DEBOUNCE_SAVE_MS);

      saveTimersRef.current.set(lotId, timer);
    },
    [saveLotZone]
  );

  // ─── Renommer un lot ──────────────────────────────────────────

  const handleRenameLot = useCallback(async (lotId: string, name: string) => {
    // Optimistic update
    setLots((prev) =>
      prev.map((lot) => (lot.id === lotId ? { ...lot, name } : lot))
    );

    try {
      const res = await fetch(`/api/vs/lots/${lotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = (await res.json()) as ApiResponse<VsLot>;
      if (!json.success) {
        setError("Impossible de renommer le lot.");
      }
    } catch {
      setError("Impossible de renommer le lot.");
    }
  }, []);

  // ─── Supprimer un lot ─────────────────────────────────────────

  const handleDeleteLot = useCallback(
    async (lotId: string) => {
      // Optimistic update
      setLots((prev) => prev.filter((lot) => lot.id !== lotId));
      if (selectedLotId === lotId) setSelectedLotId(null);

      try {
        const res = await fetch(`/api/vs/lots/${lotId}`, {
          method: "DELETE",
        });
        const json = (await res.json()) as ApiResponse<{ deleted: boolean }>;
        if (!json.success) {
          // Rollback : recharger
          setError("Impossible de supprimer le lot.");
          fetchData();
        }
      } catch {
        setError("Impossible de supprimer le lot.");
        fetchData();
      }
    },
    [selectedLotId, fetchData]
  );

  // ─── Ajouter un lot manuellement ─────────────────────────────

  const handleAddLot = useCallback(async () => {
    const lotNumber = lots.length + 1;
    const floorLabel = selectedFloor === 0 ? "RDC" : `R+${selectedFloor}`;
    const name = `Lot ${lotNumber} — ${floorLabel}`;

    const zone: ZoneRect = {
      x_percent: 30,
      y_percent: 30,
      width_percent: 25,
      height_percent: 25,
    };

    try {
      const res = await fetch(`/api/vs/projects/${projectId}/lots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          floor_number: selectedFloor,
          zone_data: zone,
        }),
      });
      const json = (await res.json()) as ApiResponse<VsLot>;

      if (json.success) {
        setLots((prev) => [...prev, json.data]);
        setSelectedLotId(json.data.id);
      } else {
        setError(json.error);
      }
    } catch {
      setError("Impossible de créer le lot.");
    }
  }, [lots.length, selectedFloor, projectId]);

  // ─── Valider les lots ─────────────────────────────────────────

  const handleValidate = useCallback(async () => {
    setValidating(true);
    setError(null);

    try {
      const res = await fetch(`/api/vs/projects/${projectId}/lots/validate`, {
        method: "POST",
      });
      const json = (await res.json()) as ApiResponse<VsProject>;

      if (json.success) {
        router.push(`/vs/projects/${projectId}/rooms`);
      } else {
        setError(json.error);
      }
    } catch {
      setError("Impossible de valider les lots.");
    } finally {
      setValidating(false);
    }
  }, [projectId, router]);

  // ─── Cleanup timers ───────────────────────────────────────────

  useEffect(() => {
    return () => {
      for (const timer of saveTimersRef.current.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  // ─── État Loading ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex gap-2xl">
        <aside className="w-64 flex-shrink-0">
          <Stepper currentStep={2} projectId={projectId} completedSteps={[1]} />
        </aside>
        <div className="flex-1 flex items-center justify-center py-4xl">
          <div className="text-center">
            <div className="inline-block w-6 h-6 border-2 border-[var(--color-border-default)] border-t-[var(--color-interactive-primary)] rounded-full animate-spin mb-md" />
            <p className="text-sm text-[var(--color-text-muted)]">
              Organisation des lots en cours...
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
        <p className="text-[var(--color-text-muted)]">
          Opération introuvable.
        </p>
        <button
          onClick={() => router.push("/vs")}
          className="mt-md text-sm underline text-[var(--color-text-muted)] hover:text-[var(--color-text-default)]"
        >
          Retour aux opérations
        </button>
      </div>
    );
  }

  // ─── Rendu principal ──────────────────────────────────────────

  return (
    <div className="flex gap-2xl">
      {/* Stepper latéral */}
      <aside className="w-64 flex-shrink-0">
        <Stepper currentStep={2} projectId={projectId} completedSteps={[1]} />
      </aside>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* En-tête */}
        <div className="mb-lg">
          <p className="text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-xs">
            {project.adresse}
          </p>
          <h1 className="text-xl font-semibold text-[var(--color-text-default)]">
            Découpez vos lots
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-sm">
            Ajustez les zones de chaque lot sur le plan.
            Déplacez et redimensionnez les rectangles, ou ajoutez de nouveaux lots manuellement.
          </p>
        </div>

        {/* Erreur globale */}
        {error && (
          <div className="mb-md bg-red-50 border border-red-200 rounded-md p-md text-sm text-red-700 flex items-start gap-sm">
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
              className="ml-auto text-red-700 hover:text-red-500"
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

        {/* Sélecteur d'étage */}
        {floors.length > 1 && (
          <div className="mb-md flex items-center gap-sm">
            <span className="text-xs uppercase tracking-widest text-[var(--color-text-muted)]">
              Étage :
            </span>
            <div className="flex gap-2xs">
              {floors.map((floor) => {
                const label = floor === 0 ? "RDC" : `R+${floor}`;
                const isActive = floor === selectedFloor;
                return (
                  <button
                    key={floor}
                    onClick={() => setSelectedFloor(floor)}
                    className={`
                      px-md py-xs rounded-md text-sm font-medium transition-colors duration-150
                      ${
                        isActive
                          ? "bg-[var(--color-interactive-primary)] text-white"
                          : "bg-[var(--color-background-default)] text-[var(--color-text-muted)] hover:text-[var(--color-text-default)]"
                      }
                      focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)]
                    `}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Canvas + Panneau latéral */}
        <div className="flex-1 flex gap-0 min-h-[500px] rounded-md overflow-hidden border border-[var(--color-border-default)]">
          {/* Canvas */}
          <div className="flex-1 min-w-0">
            <PlanCanvas
              planImageUrl={planImageUrl}
              lots={filteredLots}
              selectedLotId={selectedLotId}
              onSelectLot={setSelectedLotId}
              onUpdateLotZone={handleUpdateLotZone}
              lotIndexMap={lotIndexMap}
            />
          </div>

          {/* Panneau latéral */}
          <LotPanel
            lots={filteredLots}
            selectedLotId={selectedLotId}
            onSelectLot={setSelectedLotId}
            onRenameLot={handleRenameLot}
            onDeleteLot={handleDeleteLot}
            onAddLot={handleAddLot}
            onValidate={handleValidate}
            hasOverlap={hasOverlap}
            validating={validating}
            lotIndexMap={lotIndexMap}
          />
        </div>
      </div>
    </div>
  );
}
