"use client";

/**
 * Page validation et association photos/pièces (Étape 4).
 *
 * Rendu : Client Component — tableau éditable, upload photos.
 *
 * Charge les pièces du projet. Thomas peut renommer, changer le type,
 * modifier la surface, associer une photo à chaque pièce, et ajouter
 * des pièces manuellement. Les modifications sont sauvegardées à la
 * validation (PUT /api/pro/projects/[id]/validate).
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProStepper from "@/components/marchand/ProStepper";
import PlanEditor, { type PlanRoom, type PhotoMarker } from "@/components/marchand/PlanEditor";
import { getCompletedSteps } from "@/lib/constants";

// ─── Types ──────────────────────────────────────────────────────────

interface PhotoDirection {
  x_percent: number;
  y_percent: number;
  angle_deg: number;
}

interface RoomEntry {
  id: string;
  name: string;
  room_type: string;
  surface_m2: number | null;
  photoUrl: string | null;
  photoFile: File | null;
  isNew?: boolean;
  bounding_box?: { x_percent: number; y_percent: number; width_percent: number; height_percent: number } | null;
  photo_direction?: PhotoDirection | null;
}

const ROOM_TYPE_OPTIONS = [
  { value: "salon", label: "Salon" },
  { value: "sejour", label: "Séjour" },
  { value: "salle_a_manger", label: "Salle à manger" },
  { value: "cuisine", label: "Cuisine" },
  { value: "chambre", label: "Chambre" },
  { value: "chambre_parentale", label: "Chambre parentale" },
  { value: "sdb", label: "Salle de bain" },
  { value: "wc", label: "WC" },
  { value: "bureau", label: "Bureau" },
  { value: "entree", label: "Entrée" },
  { value: "dressing", label: "Dressing" },
  { value: "cellier", label: "Cellier / Buanderie" },
  { value: "terrasse", label: "Terrasse / Balcon" },
  { value: "garage", label: "Garage" },
  { value: "couloir", label: "Couloir" },
  { value: "cave", label: "Cave" },
  { value: "salle_reunion", label: "Salle de réunion" },
  { value: "open_space", label: "Open space" },
  { value: "accueil", label: "Accueil" },
  { value: "local_technique", label: "Local technique" },
  { value: "autre", label: "Autre" },
] as const;

// ─── Component ──────────────────────────────────────────────────────

export default function ValidationPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [rooms, setRooms] = useState<RoomEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [projectStatus, setProjectStatus] = useState<string>("extraction_done");
  const [projectAdresse, setProjectAdresse] = useState<string | null>(null);

  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const [isDirty, setIsDirty] = useState(false);
  const [planImageUrl, setPlanImageUrl] = useState<string | null>(null);
  const [showPlan, setShowPlan] = useState(false);
  const [placingPhotoRoomId, setPlacingPhotoRoomId] = useState<string | null>(null);

  // ─── Load rooms from project ─────────────────────────────────────

  useEffect(() => {
    async function loadRooms() {
      try {
        const response = await fetch(`/api/pro/projects/${projectId}/status`);
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          setError(data?.message || `Impossible de charger les données du projet (erreur ${response.status}).`);
          setIsLoading(false);
          return;
        }
        const data = await response.json();
        if (data.project_status) {
          setProjectStatus(data.project_status);
        }
        if (data.project_adresse) {
          setProjectAdresse(data.project_adresse);
        }
        // Plan image URL
        if (data.project_plan_path) {
          let firstPath = data.project_plan_path;
          try {
            if (firstPath.startsWith("[")) {
              const parsed = JSON.parse(firstPath);
              firstPath = Array.isArray(parsed) ? parsed[0] : firstPath;
            }
          } catch { /* use raw path */ }
          if (firstPath.endsWith(".pdf")) firstPath = firstPath.replace(/\.pdf$/i, "-preview.png");
          setPlanImageUrl(`/api/logs/image?path=${encodeURIComponent(firstPath)}`);
        }
        const loadedRooms: RoomEntry[] = (data.rooms || []).map(
          (r: { id: string; name: string; room_type: string; surface_m2?: number | null; photo_path?: string | null; bounding_box?: { x_percent: number; y_percent: number; width_percent: number; height_percent: number } | null; photo_direction?: PhotoDirection | null }) => ({
            id: r.id,
            name: r.name,
            room_type: r.room_type || "autre",
            surface_m2: r.surface_m2 ?? null,
            photoUrl: r.photo_path
              ? `/api/logs/image?path=${encodeURIComponent(r.photo_path)}`
              : null,
            photoFile: null,
            bounding_box: r.bounding_box || null,
            photo_direction: r.photo_direction || null,
          })
        );
        setRooms(loadedRooms);
      } catch {
        setError("Erreur de connexion.");
      } finally {
        setIsLoading(false);
      }
    }
    loadRooms();
  }, [projectId]);

  // ─── Dirty tracking + beforeunload guard ─────────────────────────

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // ─── Track blob URLs for cleanup (Fix P1 fuite mémoire) ──────────

  const blobUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Collecter les nouvelles blob URLs
    rooms.forEach((room) => {
      if (room.photoUrl?.startsWith("blob:")) {
        blobUrlsRef.current.add(room.photoUrl);
      }
    });
  }, [rooms]);

  useEffect(() => {
    const ref = blobUrlsRef;
    return () => {
      // Au démontage, révoquer toutes les blob URLs pour libérer la mémoire
      ref.current.forEach((url) => URL.revokeObjectURL(url));
      ref.current.clear();
    };
  }, []);

  // ─── Plan rooms for PlanEditor (read-only on validation page) ────

  const planRooms: PlanRoom[] = useMemo(() => {
    return rooms
      .filter((r) => r.bounding_box && !r.isNew)
      .map((r) => ({
        id: r.id,
        name: r.name,
        roomType: r.room_type,
        x: r.bounding_box!.x_percent,
        y: r.bounding_box!.y_percent,
        width: r.bounding_box!.width_percent,
        height: r.bounding_box!.height_percent,
        color: r.photoUrl ? "rgba(125, 155, 118, 0.3)" : "rgba(169, 169, 169, 0.2)",
      }));
  }, [rooms]);

  const photoMarkers: PhotoMarker[] = useMemo(() => {
    return rooms
      .filter((r) => r.photo_direction)
      .map((r) => ({
        roomId: r.id,
        roomName: r.name,
        x_percent: r.photo_direction!.x_percent,
        y_percent: r.photo_direction!.y_percent,
        angle_deg: r.photo_direction!.angle_deg,
      }));
  }, [rooms]);

  // ─── Photo direction handlers ────────────────────────────────────

  const handlePhotoDirectionChange = useCallback(
    async (roomId: string, x_percent: number, y_percent: number, angle_deg: number) => {
      const direction: PhotoDirection = { x_percent, y_percent, angle_deg };
      // Optimistic update
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, photo_direction: direction } : r))
      );
      // Persist to server (fire-and-forget for new rooms, save for existing)
      if (!roomId.startsWith("new-")) {
        try {
          await fetch(`/api/pro/projects/${projectId}/rooms/${roomId}/direction`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(direction),
          });
        } catch { /* best-effort */ }
      }
    },
    [projectId]
  );

  // ─── Room editing ────────────────────────────────────────────────

  const updateRoom = useCallback((roomId: string, field: keyof RoomEntry, value: string | number | null) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, [field]: value } : r))
    );
    setIsDirty(true);
  }, []);

  const deleteRoom = useCallback((roomId: string, roomName: string) => {
    const confirmed = window.confirm(
      `Supprimer "${roomName || "cette pièce"}" ? Cette action est irréversible.`
    );
    if (!confirmed) return;
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    setIsDirty(true);
  }, []);

  const addRoom = useCallback(() => {
    const newRoom: RoomEntry = {
      id: `new-${Date.now()}`,
      name: "",
      room_type: "autre",
      surface_m2: null,
      photoUrl: null,
      photoFile: null,
      isNew: true,
    };
    setRooms((prev) => [...prev, newRoom]);
    setIsDirty(true);
  }, []);

  // ─── Photo upload per room ───────────────────────────────────────

  const handlePhotoSelect = useCallback((roomId: string, file: File) => {
    // Resize large photos client-side before upload (max 2048px, JPEG 85%)
    const MAX_DIM = 2048;
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const maxSide = Math.max(img.width, img.height);
      if (maxSide > MAX_DIM) {
        // Resize needed
        const scale = MAX_DIM / maxSide;
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const resizedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
                const resizedUrl = URL.createObjectURL(resizedFile);
                setRooms((prev) =>
                  prev.map((r) =>
                    r.id === roomId ? { ...r, photoUrl: resizedUrl, photoFile: resizedFile } : r
                  )
                );
              } else {
                // Fallback: use original
                setRooms((prev) =>
                  prev.map((r) =>
                    r.id === roomId ? { ...r, photoUrl: objectUrl, photoFile: file } : r
                  )
                );
              }
              setIsDirty(true);
            },
            "image/jpeg",
            0.85
          );
          return;
        }
      }
      // No resize needed — use original
      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId ? { ...r, photoUrl: objectUrl, photoFile: file } : r
        )
      );
      setIsDirty(true);
    };
    img.onerror = () => {
      // Can't load — use original file
      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId ? { ...r, photoUrl: objectUrl, photoFile: file } : r
        )
      );
      setIsDirty(true);
    };
    img.src = objectUrl;
  }, []);

  // ─── Validate and continue ───────────────────────────────────────

  // ─── Upload a single room photo to the server ────────────────────
  const uploadRoomPhoto = useCallback(
    async (roomId: string, file: File): Promise<boolean> => {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(
        `/api/pro/projects/${projectId}/rooms/${roomId}/photo`,
        { method: "POST", body: formData }
      );
      return res.ok;
    },
    [projectId]
  );

  const handleValidate = useCallback(async () => {
    setIsValidating(true);
    setUploadProgress(null);
    setValidationErrors([]);
    setError(null);

    try {
      // ── Phase 1 : upload photos des pièces EXISTANTES (avant validate) ─
      const existingWithPhoto = rooms.filter(
        (r) => r.photoFile && !r.id.startsWith("new-")
      );
      const newWithPhoto = rooms.filter(
        (r) => r.photoFile && r.id.startsWith("new-")
      );
      const totalUploads = existingWithPhoto.length + newWithPhoto.length;
      let uploadedCount = 0;

      for (const room of existingWithPhoto) {
        uploadedCount++;
        setUploadProgress(
          `Upload photo ${uploadedCount}/${totalUploads}…`
        );
        const ok = await uploadRoomPhoto(room.id, room.photoFile!);
        if (!ok) {
          setError(
            `Échec de l'upload de la photo pour « ${room.name || "pièce"} ». Réessayez.`
          );
          return;
        }
      }

      // ── Phase 2 : appel PUT /validate (crée les nouvelles pièces) ──
      setUploadProgress(
        totalUploads > 0 ? "Validation en cours…" : null
      );

      const response = await fetch(`/api/pro/projects/${projectId}/validate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rooms: rooms.map((r) => ({
            id: r.id,
            name: r.name,
            room_type: r.room_type,
            surface_m2: r.surface_m2,
            isNew: r.isNew || false,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.missing) {
          setValidationErrors(data.missing);
        } else {
          setError(data.message || "Erreur lors de la validation.");
        }
        return;
      }

      // ── Phase 3 : upload photos des pièces NOUVELLES (après validate) ─
      // Le validate retourne un mapping old_id → new_id pour les pièces créées
      const idMapping: Record<string, string> = data.room_id_mapping || {};

      for (const room of newWithPhoto) {
        const realId = idMapping[room.id];
        if (!realId) {
          console.warn(
            `[validation] Pas de mapping d'ID pour la pièce « ${room.name} » (${room.id}) — photo non uploadée`
          );
          continue;
        }
        uploadedCount++;
        setUploadProgress(
          `Upload photo ${uploadedCount}/${totalUploads}…`
        );
        const ok = await uploadRoomPhoto(realId, room.photoFile!);
        if (!ok) {
          // Non bloquant : la validation est déjà faite, on log l'erreur
          console.error(
            `[validation] Échec upload photo pour nouvelle pièce « ${room.name} » (${realId})`
          );
        }
      }

      // Success — navigate to qualification (step 4)
      setIsDirty(false);
      router.push(`/projet/${projectId}/qualification`);
    } catch {
      setError("Erreur de connexion. Vérifiez votre réseau.");
    } finally {
      setIsValidating(false);
      setUploadProgress(null);
    }
  }, [projectId, router, rooms, uploadRoomPhoto]);

  // ─── Draft save ─────────────────────────────────────────────────

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const handleSaveDraft = useCallback(async () => {
    if (rooms.length === 0) return;
    setIsSavingDraft(true);
    setError(null);

    try {
      // ── Phase 1 : uploader les photos des pièces EXISTANTES ────
      const existingWithPhoto = rooms.filter(
        (r) => r.photoFile && !r.id.startsWith("new-")
      );
      for (const room of existingWithPhoto) {
        const ok = await uploadRoomPhoto(room.id, room.photoFile!);
        if (!ok) {
          setError(
            `Échec de l'upload de la photo pour « ${room.name || "pièce"} ». Réessayez.`
          );
          return;
        }
      }

      // ── Phase 2 : sauvegarder le brouillon (crée les nouvelles pièces) ──
      const response = await fetch(`/api/pro/projects/${projectId}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rooms: rooms.map((r) => ({
            id: r.id,
            name: r.name,
            room_type: r.room_type,
            surface_m2: r.surface_m2,
            isNew: r.isNew || false,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.message || "Erreur lors de la sauvegarde du brouillon.");
        return;
      }

      const data = await response.json();
      const idMapping: Record<string, string> = data.room_id_mapping || {};

      // ── Phase 3 : uploader les photos des pièces NOUVELLES ────
      const newWithPhoto = rooms.filter(
        (r) => r.photoFile && r.id.startsWith("new-")
      );
      for (const room of newWithPhoto) {
        const realId = idMapping[room.id];
        if (!realId) {
          console.warn(
            `[draft] Pas de mapping d'ID pour « ${room.name} » (${room.id}) — photo non uploadée`
          );
          continue;
        }
        const ok = await uploadRoomPhoto(realId, room.photoFile!);
        if (!ok) {
          console.error(
            `[draft] Échec upload photo pour nouvelle pièce « ${room.name} » (${realId})`
          );
        }
      }

      // ── Phase 4 : mettre à jour le state local ────────────────
      setRooms((prev) =>
        prev.map((r) => {
          const newId = idMapping[r.id];
          const updatedRoom = newId ? { ...r, id: newId, isNew: false } : r;
          // Effacer photoFile car la photo est maintenant persistée côté serveur
          if (updatedRoom.photoFile) {
            return { ...updatedRoom, photoFile: null };
          }
          return updatedRoom;
        })
      );

      setIsDirty(false);
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 3000);
    } catch {
      setError("Erreur de connexion lors de la sauvegarde.");
    } finally {
      setIsSavingDraft(false);
    }
  }, [projectId, rooms, uploadRoomPhoto]);

  // ─── Stats ───────────────────────────────────────────────────────

  const roomsWithPhoto = rooms.filter((r) => r.photoUrl).length;
  const totalRooms = rooms.length;

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      <Header variant="internal" />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pt-20 pb-8">
        {/* Stepper */}
        <div className="mb-8">
          <ProStepper
            currentStep={4}
            completedSteps={getCompletedSteps(projectStatus)}
            projectId={projectId}
          />
        </div>

        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1C1C1E] tracking-tight">
            Vérifiez les pièces de votre bien
          </h1>
          {projectAdresse && (
            <p className="text-sm text-[#9B9A94] mt-0.5">{projectAdresse}</p>
          )}
          <p className="text-sm text-[#9B9A94] mt-1">
            Corrigez les noms, types et surfaces si nécessaire. Vous pouvez associer une photo aux pièces que vous souhaitez meubler.
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-sm text-[#9B9A94]">
              <svg
                className="animate-spin w-5 h-5"
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
              Chargement des pièces…
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="p-3 rounded-lg bg-[#FEF2F2] text-sm text-[#B91C1C] mb-4"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div
            className="p-4 rounded-lg bg-[#FFFBEB] border border-[#D97706]/20 mb-4"
            role="alert"
          >
            <p className="text-sm font-medium text-[#B45309] mb-2">
              Informations manquantes :
            </p>
            <ul className="list-disc list-inside text-sm text-[#B45309]/80 space-y-1">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Room list */}
        {!isLoading && (
          <div className="space-y-4">
            {/* Counter */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#9B9A94]">
                {roomsWithPhoto}/{totalRooms} pièce{totalRooms > 1 ? "s" : ""} avec photo
              </p>
              {isDirty && (
                <span className="text-xs text-[#D97706]">
                  Modifications non sauvegardées
                </span>
              )}
            </div>

            {/* Collapsible plan view with photo direction markers */}
            {planImageUrl && (
              <div className="rounded-lg border border-[#D1D0CB]/40 bg-white overflow-hidden
                              shadow-[0_1px_3px_rgba(28,28,30,0.08),0_1px_2px_rgba(28,28,30,0.04)]">
                <button
                  onClick={() => setShowPlan((v) => !v)}
                  className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-[#1C1C1E]
                             hover:bg-[#F5F5F0] transition-colors
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
                >
                  <span className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                    Voir le plan — directions photo
                    {photoMarkers.length > 0 && (
                      <span className="text-xs text-[#7D9B76] bg-[#7D9B76]/10 px-1.5 py-0.5 rounded-full">
                        {photoMarkers.length} marqueur{photoMarkers.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </span>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                    className={`transition-transform ${showPlan ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {showPlan && (
                  <div className="border-t border-[#D1D0CB]/40">
                    {/* Instruction banner when placing */}
                    {placingPhotoRoomId && (
                      <div className="px-4 py-2 bg-[#7D9B76]/10 border-b border-[#7D9B76]/20 flex items-center justify-between">
                        <p className="text-xs text-[#4A7A42]">
                          Cliquez sur le plan pour placer la direction photo de <strong>{rooms.find((r) => r.id === placingPhotoRoomId)?.name || "la pièce"}</strong>. Glissez pour orienter.
                        </p>
                        <button
                          onClick={() => setPlacingPhotoRoomId(null)}
                          className="text-xs text-[#9B9A94] hover:text-[#1C1C1E] ml-2 whitespace-nowrap"
                        >
                          Annuler
                        </button>
                      </div>
                    )}
                    <div className="p-2">
                      <PlanEditor
                        planImageUrl={planImageUrl}
                        rooms={planRooms}
                        onRoomsChange={() => {/* read-only on validation page */}}
                        photoMarkers={photoMarkers}
                        onPhotoDirectionChange={handlePhotoDirectionChange}
                        placingPhotoRoomId={placingPhotoRoomId}
                        onPhotoPlacementComplete={() => setPlacingPhotoRoomId(null)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Room entries */}
            {rooms.map((room) => (
              <div
                key={room.id}
                className="p-4 rounded-lg bg-white border border-[#D1D0CB]/40
                           shadow-[0_1px_3px_rgba(28,28,30,0.08),0_1px_2px_rgba(28,28,30,0.04)]"
              >
                <div className="flex gap-3">
                  {/* Photo section */}
                  <div className="flex-shrink-0 w-20 h-20 sm:w-[100px] sm:h-[100px]">
                    {room.photoUrl ? (
                      <div className="relative w-full h-full rounded overflow-hidden">
                        <img
                          src={room.photoUrl}
                          alt={`Photo de ${room.name || "pièce"}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={async () => {
                            if (room.photoUrl?.startsWith("blob:")) {
                              URL.revokeObjectURL(room.photoUrl);
                            }
                            // Si la photo est stockée côté serveur, supprimer via DELETE
                            if (
                              room.photoUrl &&
                              !room.photoUrl.startsWith("blob:") &&
                              !room.id.startsWith("new-")
                            ) {
                              try {
                                await fetch(
                                  `/api/pro/projects/${projectId}/rooms/${room.id}/photo`,
                                  { method: "DELETE" }
                                );
                              } catch {
                                // Non bloquant : on supprime localement même si le serveur échoue
                              }
                            }
                            setRooms((prev) =>
                              prev.map((r) =>
                                r.id === room.id
                                  ? { ...r, photoUrl: null, photoFile: null }
                                  : r
                              )
                            );
                            setIsDirty(true);
                          }}
                          className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/50
                                     flex items-center justify-center text-white
                                     hover:bg-black/70 transition-colors"
                          aria-label="Supprimer la photo"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            aria-hidden="true"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          const ref = fileInputRefs.current.get(room.id);
                          ref?.click();
                        }}
                        className="w-full h-full rounded border-2 border-dashed border-[#D1D0CB]
                                   flex flex-col items-center justify-center gap-1
                                   text-[#9B9A94] hover:border-[#7D9B76] hover:text-[#7D9B76]
                                   transition-colors cursor-pointer
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
                        aria-label={`Ajouter une photo pour ${room.name || "cette pièce"}`}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                        <span className="text-[10px]">Photo</span>
                      </button>
                    )}
                    <input
                      ref={(el) => {
                        if (el) fileInputRefs.current.set(room.id, el);
                      }}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoSelect(room.id, file);
                        e.target.value = "";
                      }}
                    />
                  </div>

                  {/* Fields */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Name */}
                    <input
                      type="text"
                      value={room.name}
                      onChange={(e) => updateRoom(room.id, "name", e.target.value)}
                      placeholder="Nom de la pièce"
                      className="w-full px-2.5 py-1.5 rounded border border-[#D1D0CB] bg-transparent
                                 text-sm font-medium text-[#1C1C1E] placeholder-[#9B9A94]
                                 focus:outline-none focus:ring-1 focus:ring-[#7D9B76] focus:border-transparent"
                      aria-label={`Nom de la pièce ${room.name || ""}`}
                    />

                    <p className="text-[10px] text-[#9B9A94] leading-tight">
                      Changez le type pour transformer la pièce. Par exemple, changez « Bureau » en « Chambre » et l&apos;IA générera un visuel meublé en chambre.
                    </p>

                    <div className="flex gap-2">
                      {/* Type */}
                      <select
                        value={room.room_type}
                        onChange={(e) => updateRoom(room.id, "room_type", e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded border border-[#D1D0CB] bg-white
                                   text-xs text-[#1C1C1E]
                                   focus:outline-none focus:ring-1 focus:ring-[#7D9B76]"
                        aria-label={`Type de ${room.name || "pièce"}`}
                      >
                        {ROOM_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      {/* Surface */}
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={room.surface_m2 ?? ""}
                          onChange={(e) =>
                            updateRoom(
                              room.id,
                              "surface_m2",
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                          placeholder="m²"
                          min={1}
                          max={500}
                          className="w-16 px-2 py-1.5 rounded border border-[#D1D0CB] bg-white
                                     text-xs text-[#1C1C1E] text-right
                                     focus:outline-none focus:ring-1 focus:ring-[#7D9B76]"
                          aria-label={`Surface de ${room.name || "pièce"} en m²`}
                        />
                        <span className="text-xs text-[#9B9A94]">m²</span>
                      </div>
                    </div>

                    {/* Photo direction button — only for rooms with bounding box on the plan */}
                    {planImageUrl && room.bounding_box && (
                      <button
                        onClick={() => {
                          setPlacingPhotoRoomId(room.id);
                          setShowPlan(true);
                        }}
                        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded
                                   transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9B76]
                                   ${room.photo_direction
                                     ? "text-[#7D9B76] bg-[#7D9B76]/10 hover:bg-[#7D9B76]/20"
                                     : "text-[#9B9A94] hover:text-[#7D9B76] hover:bg-[#7D9B76]/5"
                                   }`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                        {room.photo_direction ? "Direction photo définie" : "Indiquer la direction photo"}
                      </button>
                    )}
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => deleteRoom(room.id, room.name)}
                    className="flex-shrink-0 self-start w-10 h-10 rounded-md text-[#9B9A94]
                               hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors
                               flex items-center justify-center
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444]"
                    aria-label={`Supprimer ${room.name || "cette pièce"}`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>

                {/* Warning if no photo */}
                {!room.photoUrl && (
                  <p className="mt-2 text-xs text-[#D97706] flex items-center gap-1">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Sans photo — vous pourrez en ajouter une plus tard
                  </p>
                )}

                {/* Warning: local photo not yet persisted */}
                {room.photoFile && (
                  <p className="mt-2 text-xs text-[#9B9A94] flex items-center gap-1">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    Photo enregistrée lors de la validation
                  </p>
                )}
              </div>
            ))}

            {/* Empty state */}
            {rooms.length === 0 && !isLoading && (
              <div className="text-center py-12 border-2 border-dashed border-[#D1D0CB] rounded-lg">
                <p className="text-sm text-[#9B9A94] mb-3">
                  Aucune pièce ajoutée
                </p>
                <button
                  onClick={addRoom}
                  className="text-sm font-medium text-[#7D9B76] hover:text-[#4A7A42]
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9B76] rounded"
                >
                  + Ajouter votre première pièce
                </button>
              </div>
            )}

            {/* Add room button */}
            {rooms.length > 0 && (
              <button
                onClick={addRoom}
                className="w-full py-2.5 rounded-lg border border-dashed border-[#D1D0CB]
                           text-sm font-medium text-[#9B9A94] hover:text-[#7D9B76] hover:border-[#7D9B76]
                           transition-colors focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
              >
                + Ajouter une pièce manuellement
              </button>
            )}

            {/* Draft saved feedback */}
            {draftSaved && (
              <div className="p-3 rounded-lg bg-[#F0FDF4] border border-[#7D9B76]/20 text-sm text-[#4A7A42] flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Brouillon sauvegardé
              </div>
            )}

            {/* Navigation — stacked on mobile, inline on sm+ */}
            {/* Warning if no rooms have photos */}
            {rooms.length > 0 && !rooms.some((r) => r.photoUrl || r.photoFile) && (
              <div className="bg-[#FFFBEB] border border-[#D97706]/30 rounded-lg p-3 flex items-start gap-2.5">
                <svg className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-[#92400E]">Aucune photo ajoutée</p>
                  <p className="text-xs text-[#B45309] mt-0.5">Sans photo, les visuels meublés ne pourront pas être générés à l{"'"}étape suivante. Ajoutez au moins une photo par pièce à meubler.</p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#D1D0CB]/40">
              {/* Primary CTA first on mobile (visual order = importance) */}
              <button
                onClick={handleValidate}
                disabled={isValidating || rooms.length === 0}
                className="w-full sm:w-auto sm:flex-1 order-first sm:order-last py-2.5 px-4 rounded-lg bg-[#7D9B76] text-white
                           text-sm font-medium hover:bg-[#4A7A42]
                           disabled:bg-[#D1D0CB] disabled:cursor-not-allowed
                           transition-colors focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-[#7D9B76] focus-visible:ring-offset-2"
              >
                {isValidating ? (
                  <span className="inline-flex items-center justify-center gap-2">
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
                    {uploadProgress || "Validation…"}
                  </span>
                ) : (
                  "Valider et continuer"
                )}
              </button>
              <div className="flex gap-3 order-last sm:order-first">
                <button
                  onClick={() => router.back()}
                  className="flex-1 sm:flex-none py-2.5 px-4 rounded-lg border border-[#D1D0CB] bg-white
                             text-sm font-medium text-[#1C1C1E] hover:bg-[#F5F5F0]
                             transition-colors focus-visible:outline-none
                             focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
                >
                  Retour
                </button>
                <button
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft || rooms.length === 0}
                  className="flex-1 sm:flex-none py-2.5 px-4 rounded-lg border border-[#7D9B76] bg-white
                             text-sm font-medium text-[#7D9B76] hover:bg-[#F0FDF4]
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-colors focus-visible:outline-none
                             focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
                >
                  {isSavingDraft ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sauvegarde…
                    </span>
                  ) : "Sauvegarder"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
