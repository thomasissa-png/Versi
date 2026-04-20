"use client";

/**
 * Page dossier de pré-commercialisation (Étape 8).
 *
 * Rendu : Client Component — visuels, description, partage, PDF.
 *
 * Charge les visuels générés par lot. Description commerciale générée
 * par IA (éditable). Boutons de partage et téléchargement PDF.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProStepper from "@/components/marchand/ProStepper";
import { getCompletedSteps } from "@/lib/constants";

// ─── Types ──────────────────────────────────────────────────────────

interface RoomVisual {
  id: string;
  name: string;
  room_type: string;
  lot_id: string | null;
  lot_name: string | null;
  photo_path: string | null;
  visual_output_path: string | null;
  generation_status: string;
  surface_m2: number | null;
}

interface LotDossier {
  id: string;
  name: string;
  style_id: string | null;
  target_buyer: string | null;
  commercial_description: string | null;
  rooms: RoomVisual[];
}

type PageState = "loading" | "ready" | "error";

// ─── Constants ──────────────────────────────────────────────────────

const STYLE_LABELS: Record<string, string> = {
  scandinavian: "Scandinave",
  contemporary: "Contemporain",
  industrial: "Industriel",
  japandi: "Japandi",
  "art-deco": "Art Déco",
  "mid-century": "Mid-Century",
  bohemian: "Bohème",
  mediterranean: "Méditerranéen",
  cosy: "Cosy Moderne",
  "wabi-sabi": "Wabi-Sabi",
  maximalist: "Maximaliste",
  haussmannian: "Haussmannien",
};

const TARGET_LABELS: Record<string, string> = {
  famille: "Famille",
  couple_sans_enfant: "Couple",
  investisseur_locatif: "Investisseur",
  etudiant: "Étudiant",
  senior: "Senior",
  professionnel_liberal: "Professionnel",
};

const TYPE_BIEN_LABELS: Record<string, string> = {
  immeuble: "Immeuble",
  appartement: "Appartement",
  maison: "Maison",
  bureaux: "Bureaux",
  local_commercial: "Local commercial",
};

// ─── Component ──────────────────────────────────────────────────────

export default function DossierPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [pageState, setPageState] = useState<PageState>("loading");
  const [lotDossiers, setLotDossiers] = useState<LotDossier[]>([]);
  const [descriptions, setDescriptions] = useState<Map<string, string>>(new Map());
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [projectAddress, setProjectAddress] = useState("");
  const [projectTypeBien, setProjectTypeBien] = useState<string | null>(null);
  const [projectPlanPath, setProjectPlanPath] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [projectStatus, setProjectStatus] = useState<string>("visuals_done");

  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const pdfAutoTriggered = useRef(false);
  const pdfUrlRef = useRef<string | null>(null);

  // Cleanup blob URL on unmount to avoid memory leak
  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
      }
    };
  }, []);

  // ─── Load data ────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      setError(null);

      // Fetch status (rooms with visuals)
      const statusResponse = await fetch(`/api/pro/projects/${projectId}/status`);
      if (!statusResponse.ok) {
        setError("Impossible de charger les données du projet.");
        setPageState("error");
        return;
      }
      const statusData = await statusResponse.json();

      if (statusData.project_status) setProjectStatus(statusData.project_status);
      if (statusData.project_adresse) setProjectAddress(statusData.project_adresse);
      if (statusData.project_type_bien) setProjectTypeBien(statusData.project_type_bien);
      if (statusData.project_plan_path) setProjectPlanPath(statusData.project_plan_path);

      // Fetch lots
      const lotsResponse = await fetch(`/api/pro/projects/${projectId}/lots`);
      let lotsData: Array<{
        id: string;
        name: string;
        style_id: string | null;
        target_buyer: string | null;
        commercial_description: string | null;
      }> = [];

      if (lotsResponse.ok) {
        const lotsJson = await lotsResponse.json();
        lotsData = lotsJson.lots || [];
        if (lotsJson.project_address) {
          setProjectAddress(lotsJson.project_address);
        }
      }

      // Group rooms by lot
      const roomsByLot = new Map<string, RoomVisual[]>();
      for (const room of statusData.rooms || []) {
        const lotId = room.lot_id || "default";
        if (!roomsByLot.has(lotId)) roomsByLot.set(lotId, []);
        roomsByLot.get(lotId)!.push({
          id: room.id,
          name: room.name,
          room_type: room.room_type,
          lot_id: room.lot_id,
          lot_name: room.lot_name,
          photo_path: room.photo_path || null,
          visual_output_path: room.visual_output_path,
          generation_status: room.generation_status,
          surface_m2: room.surface_m2 ?? null,
        });
      }

      // Build lot dossiers
      const dossiers: LotDossier[] = lotsData.map((lot) => ({
        id: lot.id,
        name: lot.name,
        style_id: lot.style_id,
        target_buyer: lot.target_buyer,
        commercial_description: lot.commercial_description,
        rooms: roomsByLot.get(lot.id) || [],
      }));

      // If no lots, create a default
      if (dossiers.length === 0 && (statusData.rooms || []).length > 0) {
        dossiers.push({
          id: "default",
          name: "Lot principal",
          style_id: null,
          target_buyer: null,
          commercial_description: null,
          rooms: (statusData.rooms || []).map((r: RoomVisual & { surface_m2?: number | null }) => ({
            ...r,
            photo_path: r.photo_path || null,
            surface_m2: r.surface_m2 ?? null,
          })),
        });
      }

      setLotDossiers(dossiers);

      // Initialize descriptions
      const descMap = new Map<string, string>();
      for (const lot of dossiers) {
        descMap.set(lot.id, lot.commercial_description || "");
      }
      setDescriptions(descMap);

      setPageState("ready");
    } catch {
      setError("Erreur de connexion. Vérifiez votre réseau.");
      setPageState("error");
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Auto-generate PDF when lots are ready ────────────────────────

  useEffect(() => {
    if (pdfAutoTriggered.current) return;
    if (pageState !== "ready") return;
    const hasVisuals = lotDossiers.some((lot) =>
      lot.rooms.some((r) => r.visual_output_path)
    );
    if (!hasVisuals) return;

    pdfAutoTriggered.current = true;
    handleGeneratePdf();
  }, [pageState, lotDossiers]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Generate description via IA ──────────────────────────────────

  async function handleGenerateDescription(lotId: string) {
    setIsGeneratingDesc((prev) => new Set(prev).add(lotId));

    try {
      const response = await fetch(
        `/api/pro/projects/${projectId}/lots/${lotId}/description`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || "Erreur lors de la génération de la description.");
        return;
      }

      const data = await response.json();
      setDescriptions((prev) => {
        const next = new Map(prev);
        next.set(lotId, data.description || "");
        return next;
      });
    } catch {
      setError("Erreur de connexion lors de la génération.");
    } finally {
      setIsGeneratingDesc((prev) => {
        const next = new Set(prev);
        next.delete(lotId);
        return next;
      });
    }
  }

  // ─── Save description ─────────────────────────────────────────────

  async function handleSaveDescription(lotId: string) {
    const text = descriptions.get(lotId) || "";

    try {
      await fetch(`/api/pro/projects/${projectId}/lots/${lotId}/description`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: text }),
      });
      setEditingLotId(null);
    } catch {
      // Non-critical — text is in UI state
    }
  }

  // ─── Generate PDF ─────────────────────────────────────────────────

  async function handleGeneratePdf() {
    setIsGeneratingPdf(true);
    setError(null);

    try {
      // Collect lot IDs from loaded dossiers
      const lotIds = lotDossiers
        .map((lot) => lot.id)
        .filter((id) => id !== "default");

      if (lotIds.length === 0) {
        setError("Aucun lot disponible pour générer le dossier.");
        setIsGeneratingPdf(false);
        return;
      }

      const response = await fetch(`/api/pro/projects/${projectId}/dossier/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lot_ids: lotIds }),
      });

      if (!response.ok) {
        // Try to parse error JSON, fallback to generic message
        try {
          const data = await response.json();
          setError(data.message || "Erreur lors de la génération du dossier.");
        } catch {
          setError("Erreur lors de la génération du dossier.");
        }
        setIsGeneratingPdf(false);
        return;
      }

      // Response is a PDF blob — create an Object URL for preview + download
      const blob = await response.blob();
      // Revoke previous URL to avoid memory leak
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
      }
      const url = URL.createObjectURL(blob);
      pdfUrlRef.current = url;
      setPdfUrl(url);
    } catch {
      setError("Erreur de connexion lors de la génération du dossier.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  // ─── Fetch share token on mount ─────────────────────────────────────

  useEffect(() => {
    if (pageState !== "ready") return;
    if (shareToken) return;

    fetch(`/api/pro/projects/${projectId}/share-token`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.share_token) setShareToken(data.share_token);
      })
      .catch(() => {
        // Non-critical — fallback to authenticated URL
      });
  }, [pageState, projectId, shareToken]);

  // ─── Share helpers ─────────────────────────────────────────────────

  /** Construit l'URL publique du dossier (page /projet/partage/[token], sans auth). */
  function getShareUrl(): string {
    if (shareToken) {
      return `${window.location.origin}/projet/partage/${shareToken}`;
    }
    // Fallback si le token n'est pas encore chargé
    return `${window.location.origin}/projet/${projectId}/dossier`;
  }

  // ─── Share handlers ───────────────────────────────────────────────

  async function handleCopyLink() {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setShareSuccess("Lien copié dans le presse-papier");
      setTimeout(() => setShareSuccess(null), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setShareSuccess("Lien copié");
      setTimeout(() => setShareSuccess(null), 2000);
    }
  }

  async function handleShareWhatsApp() {
    const url = getShareUrl();
    const label = projectAddress || "Nouveau bien";
    const text = `🏠 Dossier de pré-commercialisation — ${label}\n${url}`;

    // Sur mobile, navigator.share permet la preview OG (lien enrichi)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Dossier — ${label}`,
          text: `🏠 Dossier de pré-commercialisation — ${label}`,
          url,
        });
        return;
      } catch {
        // L'utilisateur a annulé ou share non supporté — fallback wa.me
      }
    }

    // Fallback desktop ou mobile sans navigator.share
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank"
    );
  }

  function handleShareEmail() {
    const url = getShareUrl();
    const label = projectAddress || "Nouveau bien";
    const subject = `Dossier — ${label}`;
    const body = `Bonjour,\n\nVoici le dossier de pré-commercialisation :\n${url}\n\nCordialement`;
    window.open(
      `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    );
  }

  function handleDownloadPdf() {
    if (pdfUrl) {
      const a = document.createElement("a");
      a.href = pdfUrl;
      const slug = projectAddress
        ? projectAddress.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60)
        : projectId;
      a.download = `dossier-${slug}.pdf`;
      a.click();
    }
  }

  // ─── Count visuals ────────────────────────────────────────────────

  const totalVisuals = lotDossiers.reduce(
    (acc, lot) => acc + lot.rooms.filter((r) => r.visual_output_path).length,
    0
  );

  // ─── Computed project summary ────────────────────────────────────

  const allRooms = lotDossiers.flatMap((lot) => lot.rooms);
  const totalRooms = allRooms.length;
  const totalSurface = allRooms.reduce(
    (acc, r) => acc + (r.surface_m2 ?? 0),
    0
  );

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      <Header variant="internal" />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 pt-20 pb-8">
        {/* Stepper */}
        <div className="mb-8">
          <ProStepper
            currentStep={8}
            completedSteps={getCompletedSteps(projectStatus)}
            projectId={projectId}
          />
        </div>

        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1C1C1E] tracking-tight">
            Dossier de pré-commercialisation
          </h1>
          <p className="text-sm text-[#9B9A94] mt-1">
            {pageState === "ready" && totalVisuals > 0
              ? `${totalVisuals} visuel${totalVisuals > 1 ? "s" : ""} généré${totalVisuals > 1 ? "s" : ""} — prêt pour le partage`
              : "Chargement du dossier..."}
          </p>
        </div>

        {/* Loading */}
        {pageState === "loading" && (
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
            <p className="text-sm text-[#9B9A94]">Chargement du dossier...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="p-4 rounded-lg bg-[#FEF2F2] border border-[#EF4444]/20 mb-6"
            role="alert"
          >
            <p className="text-sm text-[#B91C1C]">{error}</p>
          </div>
        )}

        {/* Share success toast */}
        {shareSuccess && (
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg
                        bg-[#1C1C1E] text-white text-sm font-medium shadow-lg z-50
                        animate-[fadeIn_200ms_ease-out]"
            role="status"
          >
            {shareSuccess}
          </div>
        )}

        {pageState === "error" && !error && (
          <div className="py-8 text-center">
            <button
              onClick={() => {
                setPageState("loading");
                loadData();
              }}
              className="py-2.5 px-4 rounded-lg bg-[#7D9B76] text-white text-sm font-medium
                         hover:bg-[#4A7A42] transition-colors
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Dossier content */}
        {pageState === "ready" && (
          <div className="space-y-8">
            {/* Project summary card */}
            {(projectAddress || projectTypeBien || totalSurface > 0 || totalRooms > 0 || projectPlanPath) && (
              <section
                className="rounded-lg bg-[#F5F5F0] border border-[#D1D0CB] overflow-hidden"
                aria-label="Récapitulatif du bien"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Plan image */}
                  {projectPlanPath && (
                    <div className="sm:w-48 sm:min-h-[160px] flex-shrink-0 bg-white border-b sm:border-b-0 sm:border-r border-[#D1D0CB]">
                      <img
                        src={`/api/logs/image?path=${encodeURIComponent(projectPlanPath)}`}
                        alt="Plan du bien"
                        className="w-full h-full object-contain p-3"
                        loading="eager"
                      />
                    </div>
                  )}

                  {/* Info fields */}
                  <div className="flex-1 p-4 sm:p-5">
                    {projectAddress && (
                      <h2 className="text-lg font-semibold text-[#1C1C1E] mb-3 leading-snug">
                        {projectAddress}
                      </h2>
                    )}
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      {projectTypeBien && (
                        <div className="flex items-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9B9A94" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                          </svg>
                          <span className="text-sm text-[#1C1C1E]">
                            {TYPE_BIEN_LABELS[projectTypeBien] || projectTypeBien}
                          </span>
                        </div>
                      )}
                      {totalSurface > 0 && (
                        <div className="flex items-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9B9A94" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <path d="M3 9h18" />
                            <path d="M9 3v18" />
                          </svg>
                          <span className="text-sm text-[#1C1C1E]">
                            {totalSurface % 1 === 0
                              ? `${totalSurface} m\u00B2`
                              : `${totalSurface.toFixed(1)} m\u00B2`}
                          </span>
                        </div>
                      )}
                      {totalRooms > 0 && (
                        <div className="flex items-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9B9A94" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M2 20h20" />
                            <path d="M4 20V8l8-5 8 5v12" />
                            <path d="M9 20v-5h6v5" />
                          </svg>
                          <span className="text-sm text-[#1C1C1E]">
                            {totalRooms} pièce{totalRooms > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Share & PDF actions bar */}
            <div className="flex flex-wrap gap-2 p-4 rounded-lg bg-white border border-[#D1D0CB]/40
                            shadow-[0_1px_3px_rgba(28,28,30,0.08),0_1px_2px_rgba(28,28,30,0.04)]">
              {/* Generate PDF */}
              <button
                onClick={handleGeneratePdf}
                disabled={isGeneratingPdf}
                className="inline-flex items-center gap-2 py-2 px-3 min-h-[44px] rounded-md text-sm font-medium
                           bg-[#7D9B76] text-white hover:bg-[#4A7A42] transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
              >
                {isGeneratingPdf ? (
                  <svg
                    className="animate-spin w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                )}
                {isGeneratingPdf ? "Génération du PDF…" : pdfUrl ? "Regénérer le PDF" : "Générer le PDF"}
              </button>

              {/* Download PDF (visible only if pdf exists) */}
              {pdfUrl && (
                <button
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center gap-2 py-2 px-3 min-h-[44px] rounded-md text-sm font-medium
                             bg-[#1C1C1E] text-white hover:bg-[#3A3A3C] transition-colors
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1C1E]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Télécharger PDF
                </button>
              )}

              {/* Separator */}
              <div className="w-px h-8 bg-[#D1D0CB]/60 self-center mx-1 hidden sm:block" aria-hidden="true" />

              {/* Copy link */}
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-2 py-2 px-3 min-h-[44px] rounded-md text-sm font-medium
                           border border-[#D1D0CB] bg-white text-[#1C1C1E] hover:bg-[#F5F5F0]
                           transition-colors focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                </svg>
                Copier le lien
              </button>

              {/* WhatsApp */}
              <button
                onClick={handleShareWhatsApp}
                className="inline-flex items-center gap-2 py-2 px-3 min-h-[44px] rounded-md text-sm font-medium
                           border border-[#D1D0CB] bg-white text-[#1C1C1E] hover:bg-[#F5F5F0]
                           transition-colors focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.69 0-3.281-.472-4.633-1.29l-.332-.197-3.035.9.9-3.035-.197-.332A7.965 7.965 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
                </svg>
                WhatsApp
              </button>

              {/* Email */}
              <button
                onClick={handleShareEmail}
                className="inline-flex items-center gap-2 py-2 px-3 min-h-[44px] rounded-md text-sm font-medium
                           border border-[#D1D0CB] bg-white text-[#1C1C1E] hover:bg-[#F5F5F0]
                           transition-colors focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                Email
              </button>
            </div>

            {/* PDF Preview */}
            {pdfUrl && (
              <div className="rounded-lg bg-white border border-[#D1D0CB]/40 overflow-hidden
                              shadow-[0_1px_3px_rgba(28,28,30,0.08),0_1px_2px_rgba(28,28,30,0.04)]">
                <div className="px-4 py-3 bg-[#F5F5F0] border-b border-[#D1D0CB]/40 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[#1C1C1E]">
                    Aperçu du dossier PDF
                  </h2>
                  <button
                    onClick={handleDownloadPdf}
                    className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium
                               bg-[#1C1C1E] text-white hover:bg-[#3A3A3C] transition-colors
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1C1E]"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Télécharger
                  </button>
                </div>
                <div className="p-2">
                  <object
                    data={pdfUrl}
                    type="application/pdf"
                    className="w-full rounded"
                    style={{ height: "600px" }}
                    aria-label="Aperçu du dossier PDF"
                  >
                    {/* Fallback for browsers that don't support inline PDF */}
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#7D9B76" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <p className="text-sm text-[#9B9A94]">
                        L&apos;aperçu PDF n&apos;est pas disponible dans ce navigateur.
                      </p>
                      <button
                        onClick={handleDownloadPdf}
                        className="py-2 px-4 rounded-lg bg-[#7D9B76] text-white text-sm font-medium
                                   hover:bg-[#4A7A42] transition-colors
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
                      >
                        Télécharger le PDF
                      </button>
                    </div>
                  </object>
                </div>
              </div>
            )}

            {/* Lot dossiers */}
            {lotDossiers.map((lot) => {
              const desc = descriptions.get(lot.id) || "";
              const isEditing = editingLotId === lot.id;
              const isGenDesc = isGeneratingDesc.has(lot.id);
              const doneRooms = lot.rooms.filter((r) => r.visual_output_path);

              return (
                <section
                  key={lot.id}
                  className="rounded-lg bg-white border border-[#D1D0CB]/40 overflow-hidden
                             shadow-[0_1px_3px_rgba(28,28,30,0.08),0_1px_2px_rgba(28,28,30,0.04)]"
                >
                  {/* Lot header */}
                  <div className="px-4 py-3 bg-[#F5F5F0] border-b border-[#D1D0CB]/40">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold text-[#1C1C1E]">
                        {lot.name}
                      </h2>
                      <div className="flex gap-2">
                        {lot.style_id && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px]
                                          font-medium tracking-[0.03em] bg-[#F5F5F0] text-[#9B9A94] border border-[#D1D0CB]/40">
                            {STYLE_LABELS[lot.style_id] || lot.style_id}
                          </span>
                        )}
                        {lot.target_buyer && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px]
                                          font-medium tracking-[0.03em] bg-[#ECFDF5] text-[#4A7A42]">
                            {TARGET_LABELS[lot.target_buyer] || lot.target_buyer}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-[#9B9A94]">
                      {doneRooms.length} visuel{doneRooms.length > 1 ? "s" : ""} / {lot.rooms.length} pièce{lot.rooms.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Visual grid — before/after per room */}
                    {doneRooms.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {doneRooms.map((room) => (
                          <div key={room.id} className="space-y-1">
                            <h3 className="text-sm font-medium text-[#1C1C1E]">
                              {room.name}
                            </h3>
                            <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
                              {/* Before */}
                              <div className="relative aspect-[4/3] bg-[#F5F5F0]">
                                {room.photo_path ? (
                                  <img
                                    src={`/api/logs/image?path=${encodeURIComponent(room.photo_path)}`}
                                    alt={`${room.name} — avant`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[#D1D0CB]">
                                    <span className="text-xs">Avant</span>
                                  </div>
                                )}
                                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px]
                                                font-medium bg-black/50 text-white">
                                  Avant
                                </span>
                              </div>
                              {/* After */}
                              <div className="relative aspect-[4/3] bg-[#F5F5F0]">
                                {room.visual_output_path ? (
                                  <img
                                    src={`/api/logs/image?path=${encodeURIComponent(room.visual_output_path)}`}
                                    alt={`${room.name} — après`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[#D1D0CB]">
                                    <span className="text-xs">Après</span>
                                  </div>
                                )}
                                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px]
                                                font-medium bg-[#7D9B76] text-white">
                                  Après
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Rooms without visuals */}
                    {lot.rooms.filter((r) => !r.visual_output_path).length > 0 && (
                      <div className="text-xs text-[#9B9A94]">
                        {lot.rooms.filter((r) => !r.visual_output_path).length} pièce{lot.rooms.filter((r) => !r.visual_output_path).length > 1 ? "s" : ""} sans visuel :{" "}
                        {lot.rooms
                          .filter((r) => !r.visual_output_path)
                          .map((r) => r.name)
                          .join(", ")}
                      </div>
                    )}

                    {/* Commercial description */}
                    <div className="border-t border-[#D1D0CB]/40 pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-[#1C1C1E]">
                          Description commerciale
                        </h3>
                        <div className="flex gap-2">
                          {!isEditing && (
                            <button
                              onClick={() => {
                                setEditingLotId(lot.id);
                                // Auto-focus textarea
                                setTimeout(() => {
                                  textareaRefs.current.get(lot.id)?.focus();
                                }, 50);
                              }}
                              className="text-xs text-[#7D9B76] hover:text-[#4A7A42] font-medium
                                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9B76] rounded"
                            >
                              Modifier
                            </button>
                          )}
                          <button
                            onClick={() => handleGenerateDescription(lot.id)}
                            disabled={isGenDesc}
                            className="text-xs text-[#9B9A94] hover:text-[#1C1C1E] font-medium
                                       disabled:opacity-50 disabled:cursor-not-allowed
                                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9B76] rounded"
                          >
                            {isGenDesc ? "Génération..." : "Générer par IA"}
                          </button>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            ref={(el) => {
                              if (el) textareaRefs.current.set(lot.id, el);
                            }}
                            rows={4}
                            value={desc}
                            onChange={(e) => {
                              setDescriptions((prev) => {
                                const next = new Map(prev);
                                next.set(lot.id, e.target.value);
                                return next;
                              });
                            }}
                            className="w-full px-3 py-2.5 rounded-lg border border-[#D1D0CB] bg-white
                                       text-sm text-[#1C1C1E] resize-y transition-colors
                                       focus:outline-none focus:ring-2 focus:ring-[#7D9B76] focus:border-transparent"
                            placeholder="Décrivez le bien pour l'annonce..."
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveDescription(lot.id)}
                              className="py-1.5 px-3 rounded-md text-xs font-medium
                                         bg-[#7D9B76] text-white hover:bg-[#4A7A42] transition-colors
                                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
                            >
                              Enregistrer
                            </button>
                            <button
                              onClick={() => setEditingLotId(null)}
                              className="py-1.5 px-3 rounded-md text-xs font-medium
                                         border border-[#D1D0CB] bg-white text-[#1C1C1E] hover:bg-[#F5F5F0]
                                         transition-colors focus-visible:outline-none
                                         focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : desc ? (
                        <p className="text-sm text-[#1C1C1E]/80 leading-relaxed">
                          {desc}
                        </p>
                      ) : (
                        <p className="text-sm text-[#9B9A94] italic">
                          Aucune description. Cliquez sur &laquo; Générer par IA &raquo; ou &laquo; Modifier &raquo;.
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              );
            })}

            {/* Empty state */}
            {lotDossiers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm text-[#9B9A94]">
                  Aucun visuel disponible. Lancez la génération d&apos;abord.
                </p>
                <button
                  onClick={() => router.push(`/projet/${projectId}/generation`)}
                  className="mt-4 py-2.5 px-4 rounded-lg bg-[#7D9B76] text-white text-sm font-medium
                             hover:bg-[#4A7A42] transition-colors
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
                >
                  Lancer la génération
                </button>
              </div>
            )}

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#D1D0CB]/40">
              <button
                onClick={() => router.push("/mes-biens")}
                className="flex-1 py-3 px-4 rounded-lg bg-[#7D9B76] text-white text-sm font-semibold
                           hover:bg-[#4A7A42] transition-colors
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9B76] focus-visible:ring-offset-2
                           shadow-[0_2px_8px_rgba(28,28,30,0.12)]"
              >
                Voir tous mes biens
              </button>
              <button
                onClick={() => router.push(`/projet/${projectId}/generation`)}
                className="py-3 px-4 rounded-lg border border-[#D1D0CB] bg-white
                           text-sm font-medium text-[#1C1C1E] hover:bg-[#F5F5F0]
                           transition-colors focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
              >
                Modifier les visuels
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
