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
import ConfirmModal from "@/components/vs/ConfirmModal";
import PlanCalibration from "@/components/vs/PlanCalibration";
import type {
  VsProject,
  VsPlan,
  VsLot,
  ZoneRect,
  Zone,
  ZonePolygonPoint,
  ApiResponse,
} from "@/lib/vs/types";
import type { ExtractedRoom } from "@/lib/vs/schemas";
import { parseZone, zonesOverlap as zonesOverlapShared } from "@/lib/vs/types";

// ─── Constantes ───────────────────────────────────────────────────

const DEBOUNCE_SAVE_MS = 1_000;

// ─── Helpers ──────────────────────────────────────────────────────

// Détection chevauchement (rect + polygon) — mutualisé via zonesOverlapShared (types.ts)
function hasAnyOverlap(lots: VsLot[]): boolean {
  for (let i = 0; i < lots.length; i++) {
    for (let j = i + 1; j < lots.length; j++) {
      if (lots[i].floor_number !== lots[j].floor_number) continue;
      const za = parseZone(lots[i].zone_data as Record<string, unknown>);
      const zb = parseZone(lots[j].zone_data as Record<string, unknown>);
      if (zonesOverlapShared(za, zb)) return true;
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
  const [saving, setSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  // Mode dessin polygone (versi-s20 phase 2)
  const [drawingPolygon, setDrawingPolygon] = useState(false);

  // Debounce pour la sauvegarde auto
  const saveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  // ─── Chargement initial ───────────────────────────────────────

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);

      const [projectRes, plansRes, lotsRes] = await Promise.all([
        fetch(`/api/vs/projects/${projectId}`, { signal }),
        fetch(`/api/vs/projects/${projectId}/plans`, { signal }),
        fetch(`/api/vs/projects/${projectId}/lots`, { signal }),
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
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError("Impossible de charger les données du projet. Vérifiez votre connexion et actualisez la page.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
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

  const currentPlan = useMemo(
    () => plans.find((p) => p.floor_number === selectedFloor) ?? null,
    [plans, selectedFloor]
  );

  const planImageUrl = useMemo(() => {
    if (!currentPlan) return null;
    return `/api/vs/files?path=${encodeURIComponent(currentPlan.file_path)}`;
  }, [currentPlan]);

  const m2PerPixel = currentPlan?.m2_per_pixel ?? null;

  // ─── Overlap detection ────────────────────────────────────────

  const hasOverlap = useMemo(() => hasAnyOverlap(lots), [lots]);

  // ─── Sauvegarde auto (debounce) ───────────────────────────────

  const saveLotZone = useCallback(
    async (lotId: string, zone: Zone) => {
      try {
        setSaving(true);
        const res = await fetch(`/api/vs/lots/${lotId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ zone_data: zone }),
        });
        const json = (await res.json()) as ApiResponse<VsLot>;
        if (!json.success) {
          setError("Modifications non enregistrées. Rechargez la page pour reprendre depuis la dernière version sauvegardée.");
          fetchData();
        }
      } catch {
        setError("Modifications non enregistrées. Rechargez la page pour reprendre depuis la dernière version sauvegardée.");
        fetchData();
      } finally {
        setSaving(false);
      }
    },
    [fetchData]
  );

  const handleUpdateLotZone = useCallback(
    (lotId: string, zone: Zone) => {
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
        setError("Le renommage n'a pas pu être enregistré. Réessayez ou rechargez la page.");
      }
    } catch {
      setError("Le renommage n'a pas pu être enregistré. Réessayez ou rechargez la page.");
    }
  }, []);

  // ─── Supprimer un lot ─────────────────────────────────────────

  const handleDeleteLot = useCallback(
    (lotId: string) => {
      setDeleteTargetId(lotId);
    },
    []
  );

  const confirmDeleteLot = useCallback(async () => {
    const lotId = deleteTargetId;
    if (!lotId) return;
    setDeleteTargetId(null);
    // Optimistic update
    setLots((prev) => prev.filter((lot) => lot.id !== lotId));
    if (selectedLotId === lotId) setSelectedLotId(null);

    try {
      const res = await fetch(`/api/vs/lots/${lotId}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as ApiResponse<{ deleted: boolean }>;
      if (!json.success) {
        setError("La suppression a échoué. Le lot a été restauré automatiquement.");
        fetchData();
      }
    } catch {
      setError("La suppression a échoué. Le lot a été restauré automatiquement.");
      fetchData();
    }
  }, [deleteTargetId, selectedLotId, fetchData]);

  // ─── Ajouter un lot manuellement ─────────────────────────────

  const handleAddLot = useCallback(async () => {
    // Numérotation basée sur les lots existants pour CET étage (évite collision
    // si plusieurs étages ont des lots).
    const lotsOnFloor = lots.filter((l) => l.floor_number === selectedFloor);
    const lotNumber = lotsOnFloor.length + 1;
    const floorLabel = selectedFloor === 0 ? "RDC" : `R+${selectedFloor}`;
    const name = `Lot ${lotNumber} — ${floorLabel}`;

    // Décalage automatique : chaque nouveau lot est positionné en cascade pour
    // éviter de créer N lots superposés à coordonnées identiques (bug s20).
    // Pas de 4% horizontal et 4% vertical par lot existant, modulo borné.
    const offset = (lotsOnFloor.length * 4) % 50;
    const zone: ZoneRect = {
      type: "rect",
      x_percent: 10 + offset,
      y_percent: 10 + offset,
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
      setError("Le lot n'a pas pu être créé. Réessayez ou rechargez la page.");
    }
  }, [lots, selectedFloor, projectId]);

  // ─── Mode dessin polygone (versi-s20 phase 2) ─────────────────

  const handleStartDrawingPolygon = useCallback(() => {
    setDrawingPolygon(true);
    setSelectedLotId(null);
  }, []);

  const handleCancelDrawingPolygon = useCallback(() => {
    setDrawingPolygon(false);
  }, []);

  const handlePolygonComplete = useCallback(
    async (points: ZonePolygonPoint[]) => {
      // Sortie immédiate du mode dessin
      setDrawingPolygon(false);
      if (points.length < 3) return;

      const lotsOnFloor = lots.filter((l) => l.floor_number === selectedFloor);
      const lotNumber = lotsOnFloor.length + 1;
      const floorLabel = selectedFloor === 0 ? "RDC" : `R+${selectedFloor}`;
      const name = `Lot ${lotNumber} — ${floorLabel}`;

      const zone: Zone = { type: "polygon", points };

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
        setError("Le polygone n'a pas pu être créé. Réessayez ou rechargez la page.");
      }
    },
    [lots, selectedFloor, projectId]
  );

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
        setValidationSuccess(true);
        // Redirection différée pour laisser le feedback visible ~600ms
        setTimeout(() => {
          router.push(`/vs/projects/${projectId}/rooms`);
        }, 600);
      } else {
        setError("La validation a échoué. Vérifiez que les lots ne se chevauchent pas, puis réessayez.");
      }
    } catch {
      setError("La validation a échoué. Vérifiez que les lots ne se chevauchent pas, puis réessayez.");
    } finally {
      setValidating(false);
    }
  }, [projectId, router]);

  // ─── Valider un lot IA individuellement (versi-s21) ──────────

  const handleValidateSingleLot = useCallback(
    async (lotId: string) => {
      // Optimistic update
      setLots((prev) =>
        prev.map((l) =>
          l.id === lotId ? { ...l, status: "validated" as const } : l
        )
      );

      try {
        const res = await fetch(`/api/vs/lots/${lotId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "validated" }),
        });
        const json = (await res.json()) as ApiResponse<VsLot>;
        if (!json.success) {
          // Rollback
          setLots((prev) =>
            prev.map((l) =>
              l.id === lotId ? { ...l, status: "suggested" as const } : l
            )
          );
          setError("Impossible de valider ce lot.");
        }
      } catch {
        // Rollback
        setLots((prev) =>
          prev.map((l) =>
            l.id === lotId ? { ...l, status: "suggested" as const } : l
          )
        );
        setError("Impossible de valider ce lot.");
      }
    },
    []
  );

  // ─── U4 — Annuler la validation d'un lot IA (versi-s21 it2) ──

  const handleUnvalidateSingleLot = useCallback(
    async (lotId: string) => {
      // Optimistic update
      setLots((prev) =>
        prev.map((l) =>
          l.id === lotId ? { ...l, status: "suggested" as const } : l
        )
      );

      try {
        const res = await fetch(`/api/vs/lots/${lotId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "suggested" }),
        });
        const json = (await res.json()) as ApiResponse<VsLot>;
        if (!json.success) {
          // Rollback
          setLots((prev) =>
            prev.map((l) =>
              l.id === lotId ? { ...l, status: "validated" as const } : l
            )
          );
          setError("Impossible d'annuler la validation. Réessayez.");
        }
      } catch {
        // Rollback
        setLots((prev) =>
          prev.map((l) =>
            l.id === lotId ? { ...l, status: "validated" as const } : l
          )
        );
        setError("Impossible d'annuler la validation. Réessayez.");
      }
    },
    []
  );

  // ─── Valider tous les lots IA d'un coup (versi-s21) ──────────

  const handleValidateAllAiLots = useCallback(async () => {
    const aiSuggested = lots.filter(
      (l) => l.source === "ai" && l.status === "suggested"
    );
    if (aiSuggested.length === 0) return;

    // Optimistic update
    setLots((prev) =>
      prev.map((l) =>
        l.source === "ai" && l.status === "suggested"
          ? { ...l, status: "validated" as const }
          : l
      )
    );

    // PATCH chaque lot en parallèle
    const results = await Promise.allSettled(
      aiSuggested.map((lot) =>
        fetch(`/api/vs/lots/${lot.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "validated" }),
        }).then((r) => r.json() as Promise<ApiResponse<VsLot>>)
      )
    );

    // Rollback les échecs
    const failedIds = new Set<string>();
    results.forEach((r, i) => {
      if (r.status === "rejected" || (r.status === "fulfilled" && !r.value.success)) {
        failedIds.add(aiSuggested[i].id);
      }
    });

    if (failedIds.size > 0) {
      setLots((prev) =>
        prev.map((l) =>
          failedIds.has(l.id) ? { ...l, status: "suggested" as const } : l
        )
      );
      setError(`${failedIds.size} lot(s) n'ont pas pu être validé(s).`);
    }
  }, [lots]);

  // ─── U3 — Extraction IA déjà tentée ? (versi-s21 it2) ────────

  const hasAiExtracted = useMemo(() => {
    // Si au moins un plan a extraction_status === "done" ou "failed", l'IA a tourné
    return plans.some(
      (p) => p.extraction_status === "done" || p.extraction_status === "failed"
    );
  }, [plans]);

  // ─── U5 — Lots IA suggérés pour bannière feedback (versi-s21 it2)

  const aiSuggestedLots = useMemo(
    () => lots.filter((l) => l.source === "ai" && l.status === "suggested"),
    [lots]
  );

  // ─── I7 — Pièces non assignées depuis extraction_data (versi-s21 it2)

  const unassignedRooms = useMemo(() => {
    if (!currentPlan?.extraction_data) return [];
    const data = currentPlan.extraction_data as { rooms?: ExtractedRoom[] };
    if (!Array.isArray(data.rooms)) return [];
    return data.rooms.filter((r) => r.unit_id == null);
  }, [currentPlan]);

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
            {hasAiExtracted && aiSuggestedLots.length > 0
              ? `${aiSuggestedLots.length} lot${aiSuggestedLots.length > 1 ? "s" : ""} à valider`
              : "Découpez vos lots"}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-sm">
            Ajustez chaque lot par glisser-déposer. Zoomez à la molette, Ctrl+glisser pour naviguer.
            Utilisez « Dessiner un polygone » pour les formes complexes (appartements en L, retraits, pièces obliques).
          </p>
        </div>

        {/* Erreur globale */}
        {error && (
          <div className="mb-md bg-[var(--color-error-bg)] border border-[var(--color-error-border)] rounded-md p-md text-sm text-[var(--color-error-strong)] flex items-start gap-sm">
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
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => { setError(null); fetchData(); }}
              className="text-[var(--color-error-strong)] underline underline-offset-2 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-error-strong)]"
            >
              Réessayer
            </button>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-[var(--color-error-strong)] hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-error-strong)]"
              aria-label="Fermer le message d'erreur"
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
        {/* Feedback sauvegarde en cours (UX-F06) */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {`Étage ${selectedFloor === 0 ? "RDC" : `R+${selectedFloor}`} sélectionné — ${filteredLots.length} lot${filteredLots.length > 1 ? "s" : ""}`}
        </div>
        {saving && (
          <div className="mb-sm flex items-center gap-xs text-xs text-[var(--color-text-muted)]" role="status" aria-live="polite">
            <span className="inline-block w-3 h-3 border-2 border-[var(--color-border-default)] border-t-[var(--color-interactive-primary)] rounded-full animate-spin" aria-hidden="true" />
            Sauvegarde en cours…
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
                          ? "bg-[var(--color-interactive-primary)] text-[var(--color-text-inverse)]"
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

        {/* Bannière calibration (F05 versi-s19) — affichée si le plan courant n'est pas calibré */}
        {currentPlan && m2PerPixel == null && (
          <div
            role="status"
            className="mb-md flex items-center gap-md border-l-4 border-[var(--color-warning)] bg-[var(--color-warning)]/10 px-md py-sm rounded-md"
          >
            <svg
              className="w-5 h-5 flex-shrink-0 text-[var(--color-warning)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <span className="flex-1 text-sm text-[var(--color-text-default)]">
              Calibrez ce plan pour afficher les surfaces m² pendant le tracé des lots.
            </span>
            <button
              type="button"
              onClick={() => setCalibrationOpen(true)}
              className="px-md py-xs rounded-md text-sm font-medium bg-[var(--color-interactive-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-interactive-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)] active:opacity-80 min-h-[44px]"
            >
              Calibrer le plan
            </button>
          </div>
        )}

        {/* U5 — Bannière feedback post-extraction IA (versi-s21 it2) */}
        {aiSuggestedLots.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-md mb-md flex items-start gap-sm">
            <span className="text-blue-600 text-xl flex-shrink-0" aria-hidden="true">&#9733;</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                L&apos;IA a pré-créé {aiSuggestedLots.length} lot{aiSuggestedLots.length > 1 ? "s" : ""} depuis votre plan.
              </p>
              <p className="text-xs text-blue-700 mt-xs">
                Vérifiez chaque lot et validez en 1 clic ou globalement.
              </p>
            </div>
          </div>
        )}

        {/* Canvas + Panneau latéral */}
        <div className="flex-1 flex flex-col md:flex-row gap-0 min-h-[500px] rounded-md overflow-hidden border border-[var(--color-border-default)]">
          {/* Canvas */}
          <div className="flex-1 min-w-0">
            <PlanCanvas
              planImageUrl={planImageUrl}
              lots={filteredLots}
              selectedLotId={selectedLotId}
              onSelectLot={setSelectedLotId}
              onUpdateLotZone={handleUpdateLotZone}
              onDeleteLot={handleDeleteLot}
              lotIndexMap={lotIndexMap}
              m2PerPixel={m2PerPixel}
              drawingPolygon={drawingPolygon}
              onPolygonComplete={handlePolygonComplete}
              onCancelDrawingPolygon={handleCancelDrawingPolygon}
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
            validationSuccess={validationSuccess}
            onStartDrawingPolygon={handleStartDrawingPolygon}
            drawingPolygon={drawingPolygon}
            onCancelDrawingPolygon={handleCancelDrawingPolygon}
            onValidateSingleLot={handleValidateSingleLot}
            onValidateAllAiLots={handleValidateAllAiLots}
            hasAiExtracted={hasAiExtracted}
            onUnvalidateSingleLot={handleUnvalidateSingleLot}
            unassignedRooms={unassignedRooms}
          />
        </div>
      </div>
      <ConfirmModal
        isOpen={deleteTargetId !== null}
        title="Supprimer ce lot ?"
        message="Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={confirmDeleteLot}
        onCancel={() => setDeleteTargetId(null)}
      />

      {/* Modale calibration (F05 versi-s19) */}
      {calibrationOpen && currentPlan && planImageUrl && (
        <PlanCalibration
          planId={currentPlan.id}
          imageUrl={planImageUrl}
          onCalibrated={(value) => {
            // Optimistic update du plan courant
            setPlans((prev) =>
              prev.map((p) =>
                p.id === currentPlan.id ? { ...p, m2_per_pixel: value } : p
              )
            );
            setCalibrationOpen(false);
          }}
          onCancel={() => setCalibrationOpen(false)}
        />
      )}
    </div>
  );
}
