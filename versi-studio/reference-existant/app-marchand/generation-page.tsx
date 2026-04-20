"use client";

/**
 * Page génération des visuels (Étape 7).
 *
 * Rendu : Client Component — lance la génération, poll le statut, affiche en temps réel.
 *
 * Au mount : appelle POST /api/pro/projects/[id]/generate.
 * Poll GET /api/pro/projects/[id]/status toutes les 3 secondes.
 * Chaque pièce passe par : En attente → Passe 1 (surfaces) → Passe 2 (mobilier) → Terminée.
 * Quand tout est done : bouton "Voir le dossier" redirige vers /projet/[id]/dossier.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProStepper from "@/components/marchand/ProStepper";
import { getCompletedSteps } from "@/lib/constants";

// ─── Image action helpers (adapted from ImageComparator for URL-based images) ─

/**
 * Fetches an image URL and returns a Blob.
 */
async function fetchImageBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.blob();
}

/**
 * Adds a discrete watermark to an image blob (EU AI Act Art. 50 compliance).
 */
function addWatermarkToBlob(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(blob); return; }
      ctx.drawImage(img, 0, 0);
      const fontSize = Math.max(12, Math.round(img.width * 0.012));
      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.textAlign = "right";
      const padding = Math.round(img.width * 0.015);
      ctx.fillText("Généré par IA — Versimo", img.width - padding, img.height - padding);
      canvas.toBlob(
        (result) => resolve(result || blob),
        "image/jpeg",
        0.92
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image load failed"));
    };
    img.src = objectUrl;
  });
}

// ─── Types ──────────────────────────────────────────────────────────

interface RoomStatus {
  id: string;
  name: string;
  room_type: string;
  lot_name: string | null;
  style_id: string | null;
  generation_status: "pending" | "generating_pass1" | "generating_pass2" | "done" | "failed";
  visual_output_path: string | null;
  visual_pass1_path: string | null;
  error: string | null;
}

interface StatusSummary {
  total: number;
  done: number;
  failed: number;
  generating: number;
  pending: number;
}

type PageState = "triggering" | "generating" | "complete" | "error";

// ─── Style labels (hyphenated keys matching DB values) ──────────────

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

// ─── Status display config ──────────────────────────────────────────

const GENERATION_STATUS_CONFIG: Record<
  RoomStatus["generation_status"],
  { label: string; color: string; pulse?: boolean }
> = {
  pending: { label: "En attente", color: "text-[#9B9A94]" },
  generating_pass1: { label: "Préparation de la pièce", color: "text-[#7D9B76]", pulse: true },
  generating_pass2: { label: "Ajout du mobilier", color: "text-[#7D9B76]", pulse: true },
  done: { label: "Terminée", color: "text-[#4A7A42]" },
  failed: { label: "Erreur", color: "text-[#B91C1C]" },
};

// ─── Component ──────────────────────────────────────────────────────

export default function GenerationPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [pageState, setPageState] = useState<PageState>("triggering");
  const [rooms, setRooms] = useState<RoomStatus[]>([]);
  const [summary, setSummary] = useState<StatusSummary>({ total: 0, done: 0, failed: 0, generating: 0, pending: 0 });
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [projectStatus, setProjectStatus] = useState<string>("plan_final");
  const [projectAdresse, setProjectAdresse] = useState<string | null>(null);
  const [projectTypeBien, setProjectTypeBien] = useState<string | null>(null);
  const [retryingRooms, setRetryingRooms] = useState<Set<string>>(new Set());
  const [iteratingRooms, setIteratingRooms] = useState<Set<string>>(new Set());
  const [iterationComments, setIterationComments] = useState<Map<string, string>>(new Map());
  const [iterationErrors, setIterationErrors] = useState<Map<string, string>>(new Map());
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isGenerationTriggered = useRef(false);

  // Detect native share support (client-side only to avoid hydration mismatch)
  useEffect(() => {
    setCanShare(!!navigator.share);
  }, []);

  // ─── Timer ────────────────────────────────────────────────────────

  useEffect(() => {
    if (pageState !== "generating" && pageState !== "triggering") return;

    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [pageState]);

  // ─── Trigger generation (check status first to avoid re-triggering) ─

  useEffect(() => {
    if (isGenerationTriggered.current) return;
    isGenerationTriggered.current = true;

    async function checkAndTrigger() {
      try {
        // Check status first — if already done, show results directly
        const statusRes = await fetch(`/api/pro/projects/${projectId}/status`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          const status = statusData.project_status || statusData.project?.status;
          if (status) setProjectStatus(status);
          if (statusData.project_adresse) setProjectAdresse(statusData.project_adresse);
          if (statusData.project_type_bien) setProjectTypeBien(statusData.project_type_bien);

          if (status === "visuals_done" || status === "delivered") {
            // Already generated — show results without re-triggering
            setRooms(statusData.rooms || []);
            setSummary(statusData.summary || { total: 0, done: 0, failed: 0, generating: 0, pending: 0 });
            setPageState("complete");
            return;
          }

          if (status === "generating") {
            // Already in progress — just start polling
            setRooms(statusData.rooms || []);
            setSummary(statusData.summary || { total: 0, done: 0, failed: 0, generating: 0, pending: 0 });
            setPageState("generating");
            return;
          }
        }

        // Trigger new generation
        const response = await fetch(`/api/pro/projects/${projectId}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          if (response.status === 409) {
            // Already generating — just start polling
            setPageState("generating");
            return;
          }
          setError(data?.message || `Erreur lors du lancement de la génération (erreur ${response.status}).`);
          setPageState("error");
          return;
        }

        setPageState("generating");
      } catch {
        setError("Erreur de connexion. Vérifiez votre réseau.");
        setPageState("error");
      }
    }

    checkAndTrigger();
  }, [projectId]);

  // ─── Poll status every 3 seconds ─────────────────────────────────

  const pollStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/pro/projects/${projectId}/status`);
      if (!response.ok) return;

      const data = await response.json();
      const newRooms = data.rooms as RoomStatus[];
      const newSummary = data.summary as StatusSummary;

      if (data.project_status) setProjectStatus(data.project_status);
      if (data.project_adresse) setProjectAdresse(data.project_adresse);
      if (data.project_type_bien) setProjectTypeBien(data.project_type_bien);
      setRooms(newRooms);
      setSummary(newSummary);

      // Clear retrying state for rooms that are no longer failed
      setRetryingRooms((prev: Set<string>) => {
        const updated = new Set(prev);
        for (const room of newRooms) {
          if (room.generation_status !== "failed") {
            updated.delete(room.id);
          }
        }
        return updated.size === prev.size ? prev : updated;
      });

      // Check if generation is complete
      const allDone = newSummary.pending === 0 && newSummary.generating === 0;
      if (allDone) {
        setPageState("complete");
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    } catch {
      // Silent retry — polling will continue
    }
  }, [projectId]);

  useEffect(() => {
    if (pageState !== "generating") return;

    // Initial poll
    pollStatus();

    // Start polling every 3 seconds
    pollIntervalRef.current = setInterval(pollStatus, 3000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [pageState, pollStatus]);

  // ─── Retry individual room ────────────────────────────────────────

  const retryRoom = useCallback(async (roomId: string) => {
    setRetryingRooms((prev: Set<string>) => new Set(prev).add(roomId));

    try {
      const response = await fetch(`/api/pro/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_ids: [roomId] }),
      });

      if (!response.ok) {
        // Keep the room in retryingRooms so the user sees feedback
        setRetryingRooms((prev: Set<string>) => {
          const updated = new Set(prev);
          updated.delete(roomId);
          return updated;
        });
        return;
      }

      // Start polling if not already
      if (pageState === "complete") {
        setPageState("generating");
      }
    } catch {
      setRetryingRooms((prev: Set<string>) => {
        const updated = new Set(prev);
        updated.delete(roomId);
        return updated;
      });
    }
  }, [projectId, pageState]);

  // ─── Retry all failed rooms at once ──────────────────────────────

  const retryAllFailed = useCallback(async () => {
    const failedRooms = rooms.filter((r) => r.generation_status === "failed");
    if (failedRooms.length === 0) return;

    // Mark all failed rooms as retrying
    setRetryingRooms((prev) => {
      const updated = new Set(prev);
      for (const room of failedRooms) {
        updated.add(room.id);
      }
      return updated;
    });

    try {
      const response = await fetch(`/api/pro/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_ids: failedRooms.map((r) => r.id) }),
      });

      if (!response.ok) {
        // Remove all from retrying set on error
        setRetryingRooms((prev) => {
          const updated = new Set(prev);
          for (const room of failedRooms) {
            updated.delete(room.id);
          }
          return updated;
        });
        return;
      }

      // Restart polling
      if (pageState === "complete") {
        setPageState("generating");
      }
    } catch {
      setRetryingRooms((prev) => {
        const updated = new Set(prev);
        for (const room of failedRooms) {
          updated.delete(room.id);
        }
        return updated;
      });
    }
  }, [rooms, projectId, pageState]);

  // ─── Iterate on a generated room ──────────────────────────────────

  const iterateRoom = useCallback(async (roomId: string) => {
    const comment = iterationComments.get(roomId)?.trim();
    if (!comment) return;

    setIteratingRooms((prev) => new Set(prev).add(roomId));
    setIterationErrors((prev) => {
      const updated = new Map(prev);
      updated.delete(roomId);
      return updated;
    });

    try {
      const response = await fetch(
        `/api/pro/projects/${projectId}/rooms/${roomId}/iterate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setIterationErrors((prev) => new Map(prev).set(roomId, data?.message || "Erreur lors de l'itération."));
        return;
      }

      // Success — clear comment, refresh status
      setIterationComments((prev) => {
        const updated = new Map(prev);
        updated.delete(roomId);
        return updated;
      });

      // Poll once to refresh the image
      await pollStatus();
    } catch {
      setIterationErrors((prev) => new Map(prev).set(roomId, "Erreur de connexion."));
    } finally {
      setIteratingRooms((prev) => {
        const updated = new Set(prev);
        updated.delete(roomId);
        return updated;
      });
    }
  }, [projectId, iterationComments, pollStatus]);

  // ─── Image actions (download, share, copy) ────────────────────────

  const handleDownloadRoom = useCallback(async (imageUrl: string, roomName: string) => {
    try {
      const blob = await fetchImageBlob(imageUrl);
      const watermarked = await addWatermarkToBlob(blob);
      const blobUrl = URL.createObjectURL(watermarked);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `versimo-${roomName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      // Silent failure — the image might not be available yet
    }
  }, []);

  const handleShareRoom = useCallback(async (imageUrl: string) => {
    try {
      const blob = await fetchImageBlob(imageUrl);
      const file = new File([blob], "versimo.jpg", { type: "image/jpeg" });

      // Mobile: native share with file
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          text: "Découvre ce visuel d\u2019intérieur généré par Versimo",
          files: [file],
        });
        return;
      }

      // Desktop fallback: copy image to clipboard, then open WhatsApp Web
      try {
        const pngBlob = new Blob([blob], { type: "image/png" });
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": pngBlob }),
        ]);
      } catch {
        // Clipboard not available
      }
      const text = encodeURIComponent(
        "Découvre ce visuel d\u2019intérieur généré par Versimo \u2014 versimo.fr"
      );
      window.open(`https://wa.me/?text=${text}`, "_blank", "noopener");
    } catch {
      // Silent failure
    }
  }, []);

  const handleCopyRoom = useCallback(async (imageUrl: string, roomId: string) => {
    try {
      const blob = await fetchImageBlob(imageUrl);
      const pngBlob = new Blob([blob], { type: "image/png" });
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": pngBlob }),
      ]);
      setCopiedRoomId(roomId);
      setTimeout(() => setCopiedRoomId(null), 2000);
    } catch {
      // Clipboard API not available
    }
  }, []);

  // ─── Progress percentage ──────────────────────────────────────────

  const progressPercent = summary.total > 0
    ? Math.round(((summary.done + summary.failed) / summary.total) * 100)
    : 0;

  // ─── Format elapsed time ─────────────────────────────────────────

  function formatTime(seconds: number): string {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    if (min === 0) return `${sec}s`;
    return `${min}min ${sec.toString().padStart(2, "0")}s`;
  }

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      <Header variant="internal" />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pt-20 pb-8">
        {/* Stepper */}
        <div className="mb-8">
          <ProStepper
            currentStep={7}
            completedSteps={getCompletedSteps(projectStatus)}
            errorSteps={pageState === "error" ? [7] : []}
            projectId={projectId}
          />
        </div>

        {/* Project info */}
        {projectAdresse && (
          <div className="mb-4 flex items-center gap-2 text-sm text-[#6B6A65]">
            {projectTypeBien && (
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#F5F5F0] text-xs font-medium text-[#1C1C1E] border border-[#D1D0CB]/40">
                {projectTypeBien}
              </span>
            )}
            <span>{projectAdresse}</span>
          </div>
        )}

        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1C1C1E] tracking-tight">
            {pageState === "complete" ? "Génération terminée" : "Génération en cours…"}
          </h1>
          <p className="text-sm text-[#9B9A94] mt-1">
            {pageState === "triggering" && "Lancement de la génération…"}
            {pageState === "generating" && (
              <>
                {summary.total} pièce{summary.total > 1 ? "s" : ""} — ~{Math.ceil(summary.total * 1.5)} minutes estimées
              </>
            )}
            {pageState === "complete" && (
              <>
                {summary.done} pièce{summary.done > 1 ? "s" : ""} générée{summary.done > 1 ? "s" : ""}
                {summary.failed > 0 && ` — ${summary.failed} en erreur`}
              </>
            )}
            {pageState === "error" && "La génération a rencontré un problème."}
          </p>
        </div>

        {/* Progress bar */}
        {(pageState === "generating" || pageState === "complete") && summary.total > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-[#9B9A94] mb-2">
              <span>{progressPercent}% — {summary.done}/{summary.total} terminées</span>
              <span>{formatTime(elapsedSeconds)}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#F5F5F0] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  pageState === "complete" ? "bg-[#7D9B76]" : "bg-[#7D9B76]/60"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Error state */}
        {pageState === "error" && (
          <div className="py-8">
            <div
              className="p-4 rounded-lg bg-[#FEF2F2] border border-[#EF4444]/20 mb-6"
              role="alert"
            >
              <p className="text-sm text-[#B91C1C]">
                {error || "Génération indisponible — réessayez dans quelques instants."}
              </p>
            </div>
            <div className="flex gap-3">
              {error?.includes("photo") ? (
                <button
                  onClick={() => router.push(`/projet/${projectId}/validation`)}
                  className="py-2.5 px-4 min-h-[44px] rounded-lg bg-[#7D9B76] text-white text-sm font-medium
                             hover:bg-[#4A7A42] transition-colors
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
                >
                  Ajouter des photos
                </button>
              ) : (
                <button
                  onClick={() => {
                    isGenerationTriggered.current = false;
                    setPageState("triggering");
                    setError(null);
                    setElapsedSeconds(0);
                    isGenerationTriggered.current = false;
                    window.location.reload();
                  }}
                  className="py-2.5 px-4 min-h-[44px] rounded-lg bg-[#7D9B76] text-white text-sm font-medium
                             hover:bg-[#4A7A42] transition-colors
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
                >
                  Réessayer
                </button>
              )}
            </div>
          </div>
        )}

        {/* Room grid */}
        {(pageState === "generating" || pageState === "complete") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {rooms.map((room) => {
              const statusConfig = GENERATION_STATUS_CONFIG[room.generation_status];
              const imageUrl = room.visual_output_path
                ? `/api/logs/image?path=${encodeURIComponent(room.visual_output_path)}`
                : room.visual_pass1_path
                  ? `/api/logs/image?path=${encodeURIComponent(room.visual_pass1_path)}`
                  : null;

              return (
                <article
                  key={room.id}
                  className="rounded-lg bg-white border border-[#D1D0CB]/40 overflow-hidden
                             shadow-[0_1px_3px_rgba(28,28,30,0.08),0_1px_2px_rgba(28,28,30,0.04)]"
                >
                  {/* Image area */}
                  <div className="relative aspect-[4/3] bg-[#F5F5F0]">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={`Résultat pour ${room.name}`}
                        className={`w-full h-full object-cover ${
                          room.generation_status === "done" ? "" : "blur-sm opacity-70"
                        } transition-all duration-500`}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {room.generation_status === "pending" ? (
                          <svg
                            width="32"
                            height="32"
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
                        ) : (
                          <svg
                            className="animate-spin w-6 h-6 text-[#7D9B76]"
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
                        )}
                      </div>
                    )}

                    {/* Status overlay */}
                    {room.generation_status !== "done" && room.generation_status !== "pending" && (
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent px-3 py-2">
                        <span className={`text-xs font-medium text-white flex items-center gap-1.5`}>
                          {statusConfig.pulse && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden="true" />
                          )}
                          {statusConfig.label}
                        </span>
                      </div>
                    )}

                    {/* Done check */}
                    {room.generation_status === "done" && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#7D9B76] flex items-center justify-center">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 14 14"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M2.5 7.5L5.5 10.5L11.5 3.5"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Error indicator */}
                    {room.generation_status === "failed" && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#EF4444] flex items-center justify-center">
                        <span className="text-white text-xs font-bold" aria-hidden="true">!</span>
                      </div>
                    )}
                  </div>

                  {/* Room info */}
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-[#1C1C1E] truncate">
                        {room.name}
                      </h3>
                      <span className={`text-[11px] font-medium ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {room.lot_name && (
                        <span className="text-xs text-[#9B9A94]">{room.lot_name}</span>
                      )}
                      {room.style_id && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px]
                                        font-medium tracking-[0.02em] bg-[#F5F5F0] text-[#9B9A94] border border-[#D1D0CB]/40">
                          {STYLE_LABELS[room.style_id] || room.style_id}
                        </span>
                      )}
                    </div>
                    {/* Action buttons — download, share, copy (only when done) */}
                    {room.generation_status === "done" && imageUrl && (
                      <div className="flex items-center gap-1.5 mt-2">
                        {/* Download */}
                        <button
                          onClick={() => handleDownloadRoom(imageUrl, room.name)}
                          aria-label={`Télécharger le visuel de ${room.name}`}
                          className="inline-flex items-center gap-1 px-2 py-1 min-h-[44px] min-w-[44px] justify-center
                                     rounded text-xs font-medium text-[#1C1C1E] bg-[#F5F5F0]
                                     hover:bg-[#E8E8E3] transition-colors
                                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                          <span className="hidden sm:inline">Télécharger</span>
                        </button>

                        {/* Share (native on mobile, WhatsApp fallback on desktop) */}
                        <button
                          onClick={() => handleShareRoom(imageUrl)}
                          aria-label={`Partager le visuel de ${room.name}`}
                          className="inline-flex items-center gap-1 px-2 py-1 min-h-[44px] min-w-[44px] justify-center
                                     rounded text-xs font-medium text-[#1C1C1E] bg-[#F5F5F0]
                                     hover:bg-[#E8E8E3] transition-colors
                                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
                        >
                          {canShare ? (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                          )}
                          <span className="hidden sm:inline">{canShare ? "Partager" : "WhatsApp"}</span>
                        </button>

                        {/* Copy to clipboard */}
                        <button
                          onClick={() => handleCopyRoom(imageUrl, room.id)}
                          aria-label={`Copier le visuel de ${room.name}`}
                          className="inline-flex items-center gap-1 px-2 py-1 min-h-[44px] min-w-[44px] justify-center
                                     rounded text-xs font-medium text-[#1C1C1E] bg-[#F5F5F0]
                                     hover:bg-[#E8E8E3] transition-colors
                                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
                        >
                          {copiedRoomId === room.id ? (
                            <>
                              <svg className="w-3.5 h-3.5 text-[#7D9B76]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-[#7D9B76]">Copié</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                              </svg>
                              <span className="hidden sm:inline">Copier</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {room.error && (
                      <p className="text-xs text-[#B91C1C] mt-1">{room.error}</p>
                    )}
                    {room.generation_status === "failed" && !retryingRooms.has(room.id) && (
                      <button
                        onClick={() => retryRoom(room.id)}
                        className="mt-2 w-full py-1.5 px-3 min-h-[44px] rounded-md text-xs font-medium
                                   bg-[#FEF2F2] text-[#B91C1C] border border-[#EF4444]/20
                                   hover:bg-[#FEE2E2] transition-colors
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444]/50"
                      >
                        Réessayer cette pièce
                      </button>
                    )}
                    {retryingRooms.has(room.id) && (
                      <p className="mt-2 text-xs text-[#7D9B76] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7D9B76] animate-pulse" aria-hidden="true" />
                        Relancement en cours…
                      </p>
                    )}

                    {/* Iteration: text input to refine the visual */}
                    {room.generation_status === "done" && !iteratingRooms.has(room.id) && (
                      <div className="mt-3 pt-3 border-t border-[#D1D0CB]/30">
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={iterationComments.get(room.id) || ""}
                            onChange={(e) =>
                              setIterationComments((prev) => new Map(prev).set(room.id, e.target.value))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                iterateRoom(room.id);
                              }
                            }}
                            placeholder="Affiner : « ajouter un canapé gris », « enlever la plante »…"
                            className="flex-1 px-2.5 py-1.5 rounded border border-[#D1D0CB] bg-[#FAFAF8]
                                       text-xs text-[#1C1C1E] placeholder-[#9B9A94]
                                       focus:outline-none focus:ring-1 focus:ring-[#7D9B76] focus:border-transparent"
                            aria-label={`Affiner le visuel de ${room.name}`}
                          />
                          <button
                            onClick={() => iterateRoom(room.id)}
                            disabled={!iterationComments.get(room.id)?.trim()}
                            className="flex-shrink-0 px-2.5 py-1.5 rounded bg-[#7D9B76] text-white text-xs font-medium
                                       hover:bg-[#4A7A42] disabled:bg-[#D1D0CB] disabled:cursor-not-allowed
                                       transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
                            aria-label={`Envoyer l'instruction pour ${room.name}`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <line x1="22" y1="2" x2="11" y2="13" />
                              <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                          </button>
                        </div>
                        {iterationErrors.get(room.id) && (
                          <p className="mt-1 text-xs text-[#B91C1C]">{iterationErrors.get(room.id)}</p>
                        )}
                      </div>
                    )}

                    {/* Iterating state */}
                    {iteratingRooms.has(room.id) && (
                      <div className="mt-3 pt-3 border-t border-[#D1D0CB]/30">
                        <p className="text-xs text-[#7D9B76] flex items-center gap-1.5">
                          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Itération en cours…
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Triggering state */}
        {pageState === "triggering" && (
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
            <p className="text-sm text-[#9B9A94]">Lancement de la génération…</p>
          </div>
        )}

        {/* Complete state — navigation */}
        {pageState === "complete" && (
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#D1D0CB]/40">
            {summary.failed > 0 && (
              <button
                onClick={retryAllFailed}
                className="flex-1 py-3 px-4 rounded-lg bg-[#1C1C1E] text-white text-sm font-semibold
                           hover:bg-[#1C1C1E]/80 transition-colors
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1C1E] focus-visible:ring-offset-2
                           shadow-[0_2px_8px_rgba(28,28,30,0.12)]"
              >
                Relancer les {summary.failed} pièce{summary.failed > 1 ? "s" : ""} en échec
              </button>
            )}
            {summary.done > 0 && (
              <button
                onClick={() => router.push(`/projet/${projectId}/dossier`)}
                className="flex-1 py-3 px-4 rounded-lg bg-[#7D9B76] text-white text-sm font-semibold
                           hover:bg-[#4A7A42] transition-colors
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9B76] focus-visible:ring-offset-2
                           shadow-[0_2px_8px_rgba(28,28,30,0.12)]"
              >
                Voir le dossier
              </button>
            )}
            <button
              onClick={() => router.push("/mes-biens")}
              className="py-3 px-4 rounded-lg border border-[#D1D0CB] bg-white
                         text-sm font-medium text-[#1C1C1E] hover:bg-[#F5F5F0]
                         transition-colors focus-visible:outline-none
                         focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
            >
              Voir tous mes biens
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
