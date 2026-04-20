"use client";

/**
 * Page qualification des besoins par lot (Étape 5).
 *
 * Rendu : Client Component — formulaire éditable par lot.
 *
 * Charge les lots du projet via GET /api/pro/projects/[id]/status.
 * Pour chaque lot : cible acheteur, style global, budget travaux, contraintes.
 * Récapitulatif des pièces par lot avec photos.
 * Bouton "Valider" sauvegarde via PATCH /api/pro/projects/[id]/qualify.
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProStepper from "@/components/marchand/ProStepper";
import { roomTypeLabel, getCompletedSteps } from "@/lib/constants";

// ─── Types ──────────────────────────────────────────────────────────

interface LotRoom {
  id: string;
  name: string;
  room_type: string;
  surface_m2: number | null;
  photo_path: string | null;
}

interface Lot {
  id: string;
  name: string;
  floor: number | null;
  target_buyer: string | null;
  style_id: string | null;
  budget_travaux: number | null;
  contraintes: string | null;
  rooms: LotRoom[];
}

interface LotFormData {
  target_buyer: string;
  style_id: string;
  budget_travaux: string;
  contraintes: string;
}

// ─── Constants ──────────────────────────────────────────────────────

const TARGET_BUYER_OPTIONS = [
  { value: "", label: "Choisir une cible" },
  { value: "famille", label: "Famille" },
  { value: "couple_sans_enfant", label: "Couple sans enfant" },
  { value: "investisseur_locatif", label: "Investisseur locatif" },
  { value: "etudiant", label: "Étudiant" },
  { value: "senior", label: "Senior" },
  { value: "professionnel_liberal", label: "Professionnel libéral" },
] as const;

const STYLE_OPTIONS = [
  { value: "", label: "Choisir un style" },
  { value: "scandinavian", label: "Scandinave" },
  { value: "contemporary", label: "Contemporain" },
  { value: "industrial", label: "Industriel" },
  { value: "japandi", label: "Japandi" },
  { value: "art-deco", label: "Art Déco" },
  { value: "mid-century", label: "Mid-Century" },
  { value: "bohemian", label: "Bohème" },
  { value: "mediterranean", label: "Méditerranéen" },
  { value: "cosy", label: "Cosy Moderne" },
  { value: "wabi-sabi", label: "Wabi-Sabi" },
  { value: "maximalist", label: "Maximaliste" },
  { value: "haussmannian", label: "Haussmannien" },
] as const;

// ROOM_TYPE_LABELS now imported from lib/constants.ts (centralized)

// getCompletedSteps imported from lib/constants.ts

const TYPE_BIEN_LABELS: Record<string, string> = {
  appartement: "Appartement",
  maison: "Maison",
  immeuble: "Immeuble",
  bureaux: "Bureaux",
  local_commercial: "Local commercial",
};

// ─── Component ──────────────────────────────────────────────────────

export default function QualificationPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [lots, setLots] = useState<Lot[]>([]);
  const [formData, setFormData] = useState<Map<string, LotFormData>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [projectStatus, setProjectStatus] = useState<string>("validated");
  const [projectAdresse, setProjectAdresse] = useState<string | null>(null);
  const [projectTypeBien, setProjectTypeBien] = useState<string | null>(null);
  const [totalRooms, setTotalRooms] = useState<number>(0);
  const [isDirty, setIsDirty] = useState(false);

  // ─── beforeunload guard (unsaved changes) ─────────────────────────

  useEffect(() => {
    if (!isDirty) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // ─── Load lots and rooms from project ────────────────────────────

  const loadData = useCallback(async () => {
    try {
      setError(null);

      // Fetch lots with rooms
      const response = await fetch(`/api/pro/projects/${projectId}/status`);
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        setError(errData?.message || `Impossible de charger les données du projet (erreur ${response.status}).`);
        setIsLoading(false);
        return;
      }

      const data = await response.json();

      // Track project info for stepper + recap banner
      if (data.project_status) setProjectStatus(data.project_status);
      if (data.project_adresse) setProjectAdresse(data.project_adresse);
      if (data.project_type_bien) setProjectTypeBien(data.project_type_bien);
      if (data.summary?.total) setTotalRooms(data.summary.total);

      // Fetch lots separately for qualification fields
      const lotsResponse = await fetch(`/api/pro/projects/${projectId}/lots`);
      let lotsData: Lot[] = [];

      if (lotsResponse.ok) {
        const lotsJson = await lotsResponse.json();
        lotsData = lotsJson.lots || [];
      }

      // Group rooms by lot from status
      const roomsByLot = new Map<string, LotRoom[]>();
      for (const room of data.rooms || []) {
        const lotId = room.lot_id || "unassigned";
        if (!roomsByLot.has(lotId)) roomsByLot.set(lotId, []);
        roomsByLot.get(lotId)!.push({
          id: room.id,
          name: room.name,
          room_type: room.room_type,
          surface_m2: room.surface_m2 ?? null,
          photo_path: room.visual_output_path || room.photo_path || null,
        });
      }

      // Merge lot data with rooms
      const mergedLots: Lot[] = lotsData.map((lot) => ({
        ...lot,
        rooms: roomsByLot.get(lot.id) || [],
      }));

      // If no lots from API but rooms exist, rooms may not be assigned yet.
      // This shouldn't happen with the auto-assign fix, but handle gracefully.
      if (mergedLots.length === 0 && (data.rooms || []).length > 0) {
        setError("Aucun lot trouvé. Vérifiez que le projet a été correctement créé.");
        setIsLoading(false);
        return;
      }

      // For single-lot projects, attach unassigned rooms to the single lot
      if (mergedLots.length === 1) {
        const unassignedRooms = (data.rooms || [])
          .filter((r: { lot_id: string | null }) => !r.lot_id)
          .map((r: { id: string; name: string; room_type: string; surface_m2?: number | null; visual_output_path?: string | null; photo_path?: string | null }) => ({
            id: r.id,
            name: r.name,
            room_type: r.room_type,
            surface_m2: r.surface_m2 ?? null,
            photo_path: r.visual_output_path || r.photo_path || null,
          }));
        if (unassignedRooms.length > 0) {
          mergedLots[0].rooms = [...mergedLots[0].rooms, ...unassignedRooms];
        }
      }

      setLots(mergedLots);

      // Initialize form data from existing lot data
      const initialFormData = new Map<string, LotFormData>();
      for (const lot of mergedLots) {
        initialFormData.set(lot.id, {
          target_buyer: lot.target_buyer || "",
          style_id: lot.style_id || "",
          budget_travaux: lot.budget_travaux ? String(lot.budget_travaux) : "",
          contraintes: lot.contraintes || "",
        });
      }
      setFormData(initialFormData);
      setIsLoading(false);
    } catch {
      setError("Erreur de connexion. Vérifiez votre réseau.");
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Form handlers ────────────────────────────────────────────────

  function updateLotField(lotId: string, field: keyof LotFormData, value: string) {
    setFormData((prev) => {
      const next = new Map(prev);
      const current = next.get(lotId);
      if (current) {
        next.set(lotId, { ...current, [field]: value });
      }
      return next;
    });
    setSaveSuccess(false);
    setIsDirty(true);
  }

  // ─── Validate & Save ─────────────────────────────────────────────

  async function handleValidate() {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      // Validate: each lot must have target_buyer and style_id
      const missingFields: string[] = [];
      for (const lot of lots) {
        const data = formData.get(lot.id);
        if (!data?.target_buyer) {
          missingFields.push(`${lot.name} : cible acheteur manquante`);
        }
        if (!data?.style_id) {
          missingFields.push(`${lot.name} : style manquant`);
        }
      }

      if (missingFields.length > 0) {
        setError(`Champs obligatoires manquants :\n${missingFields.join("\n")}`);
        setIsSaving(false);
        return;
      }

      // Save each lot
      const lotsPayload = lots.map((lot) => {
        const data = formData.get(lot.id)!;
        return {
          lot_id: lot.id,
          target_buyer: data.target_buyer,
          style_id: data.style_id,
          budget_travaux: data.budget_travaux ? parseFloat(data.budget_travaux) : null,
          contraintes: data.contraintes || null,
        };
      });

      const response = await fetch(`/api/pro/projects/${projectId}/qualify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lots: lotsPayload }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.message || `Erreur lors de la sauvegarde (erreur ${response.status}). Réessayez.`);
        setIsSaving(false);
        return;
      }

      setSaveSuccess(true);
      setIsDirty(false);

      // Redirect to recommendations after delay (1500ms for visual confirmation)
      setTimeout(() => {
        router.push(`/projet/${projectId}/recommandations`);
      }, 1500);
    } catch {
      setError("Erreur de connexion. Vérifiez votre réseau.");
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      <Header variant="internal" />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pt-20 pb-8">
        {/* Stepper */}
        <div className="mb-8">
          <ProStepper
            currentStep={5}
            completedSteps={getCompletedSteps(projectStatus)}
            projectId={projectId}
          />
        </div>

        {/* Project recap banner */}
        {(projectAdresse || projectTypeBien) && (
          <div className="mb-6 rounded-lg bg-[#1C1C1E]/[0.03] border border-[#D1D0CB]/40 p-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-[#1C1C1E]">
              {projectAdresse && (
                <span className="flex items-center gap-1.5">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="text-[#9B9A94] flex-shrink-0"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {projectAdresse}
                </span>
              )}
              {projectTypeBien && (
                <span className="flex items-center gap-1.5">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="text-[#9B9A94] flex-shrink-0"
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  {TYPE_BIEN_LABELS[projectTypeBien] || projectTypeBien}
                </span>
              )}
              {totalRooms > 0 && (
                <span className="flex items-center gap-1.5 text-[#9B9A94]">
                  {totalRooms} pièce{totalRooms > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1C1C1E] tracking-tight">
            Qualification des besoins
          </h1>
          <p className="text-sm text-[#9B9A94] mt-1">
            Définissez la cible acheteur et le style pour {lots.length <= 1 ? "votre bien" : "chaque lot"}.
            Ces informations guideront les recommandations de l&apos;architecte IA.
          </p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <svg
              className="animate-spin w-8 h-8 text-[#7D9B76]"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="text-sm text-[#9B9A94]">Chargement du projet...</p>
          </div>
        )}

        {/* Error state (top-level) */}
        {error && !isLoading && (
          <div
            className="p-4 rounded-lg bg-[#FEF2F2] border border-[#EF4444]/20 mb-6"
            role="alert"
          >
            <p className="text-sm text-[#B91C1C] whitespace-pre-line">{error}</p>
          </div>
        )}

        {/* Success feedback */}
        {saveSuccess && (
          <div
            className="p-4 rounded-lg bg-[#ECFDF5] border border-[#7D9B76]/30 mb-6"
            role="status"
          >
            <p className="text-sm text-[#4A7A42] font-medium">
              Qualification enregistrée. Redirection vers les recommandations...
            </p>
          </div>
        )}

        {/* Lot forms */}
        {!isLoading && lots.length > 0 && (
          <div className="space-y-6">
            {lots.map((lot) => {
              const data = formData.get(lot.id);
              if (!data) return null;

              return (
                <section
                  key={lot.id}
                  className="rounded-lg bg-white border border-[#D1D0CB]/40 overflow-hidden
                             shadow-[0_1px_3px_rgba(28,28,30,0.08),0_1px_2px_rgba(28,28,30,0.04)]"
                >
                  {/* Lot header */}
                  <div className="px-4 py-3 bg-[#F5F5F0] border-b border-[#D1D0CB]/40">
                    <h2 className="text-base font-semibold text-[#1C1C1E]">
                      {lot.name}
                    </h2>
                    {lot.floor !== null && lot.floor !== undefined && (
                      <span className="text-xs text-[#9B9A94]">
                        Étage {lot.floor}
                      </span>
                    )}
                    <span className="text-xs text-[#9B9A94] ml-2">
                      {lot.rooms.length} pièce{lot.rooms.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Target buyer */}
                    <div>
                      <label
                        htmlFor={`target-${lot.id}`}
                        className="block text-sm font-medium text-[#1C1C1E] mb-1.5"
                      >
                        Cible acheteur <span className="text-[#EF4444]">*</span>
                      </label>
                      <select
                        id={`target-${lot.id}`}
                        value={data.target_buyer}
                        onChange={(e) => updateLotField(lot.id, "target_buyer", e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-[#D1D0CB] bg-white
                                   text-sm text-[#1C1C1E] transition-colors
                                   focus:outline-none focus:ring-2 focus:ring-[#7D9B76] focus:border-transparent"
                      >
                        {TARGET_BUYER_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Style */}
                    <div>
                      <label
                        htmlFor={`style-${lot.id}`}
                        className="block text-sm font-medium text-[#1C1C1E] mb-1.5"
                      >
                        Style global <span className="text-[#EF4444]">*</span>
                      </label>
                      <select
                        id={`style-${lot.id}`}
                        value={data.style_id}
                        onChange={(e) => updateLotField(lot.id, "style_id", e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-[#D1D0CB] bg-white
                                   text-sm text-[#1C1C1E] transition-colors
                                   focus:outline-none focus:ring-2 focus:ring-[#7D9B76] focus:border-transparent"
                      >
                        {STYLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Budget */}
                    <div>
                      <label
                        htmlFor={`budget-${lot.id}`}
                        className="block text-sm font-medium text-[#1C1C1E] mb-1.5"
                      >
                        Budget travaux estimé
                        <span className="text-[#9B9A94] font-normal ml-1">(optionnel)</span>
                      </label>
                      <div className="relative">
                        <input
                          id={`budget-${lot.id}`}
                          type="number"
                          min="0"
                          step="1000"
                          placeholder="Ex: 25000"
                          value={data.budget_travaux}
                          onChange={(e) => updateLotField(lot.id, "budget_travaux", e.target.value)}
                          className="w-full px-3 py-2.5 pr-8 rounded-lg border border-[#D1D0CB] bg-white
                                     text-sm text-[#1C1C1E] placeholder-[#9B9A94] transition-colors
                                     focus:outline-none focus:ring-2 focus:ring-[#7D9B76] focus:border-transparent"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#9B9A94]">
                          &euro;
                        </span>
                      </div>
                    </div>

                    {/* Contraintes */}
                    <div>
                      <label
                        htmlFor={`contraintes-${lot.id}`}
                        className="block text-sm font-medium text-[#1C1C1E] mb-1.5"
                      >
                        Contraintes spécifiques
                        <span className="text-[#9B9A94] font-normal ml-1">(optionnel)</span>
                      </label>
                      <textarea
                        id={`contraintes-${lot.id}`}
                        rows={2}
                        placeholder="Ex: PMR, garder la cheminée, pas de travaux lourds..."
                        value={data.contraintes}
                        onChange={(e) => updateLotField(lot.id, "contraintes", e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-[#D1D0CB] bg-white
                                   text-sm text-[#1C1C1E] placeholder-[#9B9A94] resize-none transition-colors
                                   focus:outline-none focus:ring-2 focus:ring-[#7D9B76] focus:border-transparent"
                      />
                    </div>

                    {/* Room recap */}
                    {lot.rooms.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-[#1C1C1E] mb-2">
                          {lots.length === 1 ? "Pièces du bien" : "Pièces du lot"}
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {lot.rooms.map((room) => (
                            <div
                              key={room.id}
                              className="rounded-lg border border-[#D1D0CB]/40 overflow-hidden bg-[#F5F5F0]"
                            >
                              {/* Room photo thumbnail */}
                              <div className="aspect-[4/3] bg-[#EDEDEB] relative">
                                {room.photo_path ? (
                                  <img
                                    src={`/api/logs/image?path=${encodeURIComponent(room.photo_path)}`}
                                    alt={room.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <svg
                                      width="24"
                                      height="24"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="#D1D0CB"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      aria-hidden="true"
                                    >
                                      <rect x="3" y="3" width="18" height="18" rx="2" />
                                      <circle cx="8.5" cy="8.5" r="1.5" />
                                      <path d="M21 15l-5-5L5 21" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              {/* Room info */}
                              <div className="px-2 py-1.5">
                                <p className="text-xs font-medium text-[#1C1C1E] truncate">
                                  {room.name}
                                </p>
                                <p className="text-[11px] text-[#9B9A94]">
                                  {roomTypeLabel(room.room_type)}
                                  {room.surface_m2 ? ` — ${room.surface_m2} m²` : ""}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              );
            })}

            {/* Empty state */}
            {lots.length === 0 && !isLoading && !error && (
              <div className="text-center py-12">
                <p className="text-sm text-[#9B9A94]">
                  Aucun lot trouvé pour ce projet. Vérifiez que l&apos;extraction est terminée.
                </p>
              </div>
            )}

            {/* Submit button */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#D1D0CB]/40">
              <button
                onClick={handleValidate}
                disabled={isSaving || saveSuccess}
                className="flex-1 py-3 px-4 rounded-lg bg-[#7D9B76] text-white text-sm font-semibold
                           hover:bg-[#4A7A42] transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9B76] focus-visible:ring-offset-2
                           shadow-[0_2px_8px_rgba(28,28,30,0.12)]"
              >
                {isSaving ? (
                  <span className="inline-flex items-center gap-2">
                    <svg
                      className="animate-spin w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Enregistrement...
                  </span>
                ) : saveSuccess ? (
                  "Qualification enregistrée"
                ) : (
                  "Valider et obtenir les recommandations"
                )}
              </button>
              <button
                onClick={() => router.push(`/projet/${projectId}/validation`)}
                className="py-3 px-4 rounded-lg border border-[#D1D0CB] bg-white
                           text-sm font-medium text-[#1C1C1E] hover:bg-[#F5F5F0]
                           transition-colors focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
              >
                Retour
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
