/**
 * VisualRoom — Vue principale Step 4
 *
 * Gère les sous-états d'une pièce sélectionnée :
 * 1. Pas de photo → zone upload
 * 2. Photo uploadée, pas de style → grille de styles
 * 3. Style sélectionné → bouton "Créer le visuel"
 * 4. Visuel en cours → barre de progression (via VisualResult)
 * 5. Visuel généré → résultat + actions (via VisualResult)
 * 6. Chat itération → drawer ChatAgent
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import StyleGrid from "@/components/vs/StyleGrid";
import VisualResult from "@/components/vs/VisualResult";
import ChatAgent, { type ChatMessage } from "@/components/vs/ChatAgent";
import type { VsRoom, VsPhoto, VsVisual, ApiResponse } from "@/lib/vs/types";
import { ROOM_TYPE_LABELS, type RoomTypeKey } from "@/lib/vs/styles";
import type { StyleId } from "@/lib/vs/styles";

interface VisualRoomProps {
  room: VsRoom;
  /** Callback pour rafraîchir les données de la pièce */
  onRefreshRoom: () => void;
}

// ─── Sous-états ──────────────────────────────────────────────────

type RoomSubState =
  | "upload"
  | "select-style"
  | "generating"
  | "result"
  | "chat";

const POLL_INTERVAL = 5000;

// ─── Composant principal ─────────────────────────────────────────

export default function VisualRoom({ room, onRefreshRoom }: VisualRoomProps) {
  // ─── State ────────────────────────────────────────────────────
  const [photos, setPhotos] = useState<VsPhoto[]>([]);
  const [visuals, setVisuals] = useState<VsVisual[]>([]);
  const [activeVisual, setActiveVisual] = useState<VsVisual | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState<StyleId | null>(null);
  const [subState, setSubState] = useState<RoomSubState>("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const roomLabel =
    room.custom_label ||
    room.name ||
    ROOM_TYPE_LABELS[room.room_type as RoomTypeKey] ||
    room.room_type;

  // ─── Chargement initial des photos et visuels ─────────────────

  const fetchRoomData = useCallback(async () => {
    try {
      const res = await fetch(`/api/vs/rooms/${room.id}/visuals`);
      const json = await res.json() as ApiResponse<{
        photos: VsPhoto[];
        visuals: (VsVisual & { photo_file_path: string; angle_description: string | null })[];
      }>;

      if (!json.success) return;

      setPhotos(json.data.photos);
      setVisuals(json.data.visuals);

      // Déterminer le sous-état initial
      if (json.data.photos.length === 0) {
        setSubState("upload");
      } else if (json.data.visuals.length === 0) {
        setSubState("select-style");
      } else {
        // Prendre le visuel le plus récent comme actif
        const latestVisual = json.data.visuals[0];
        setActiveVisual(latestVisual);

        if (latestVisual.status === "processing") {
          setSubState("generating");
          setIsGenerating(true);
          startPolling(latestVisual.id);
        } else {
          setSubState("result");
        }
      }
    } catch {
      // Silencieux — on garde l'état courant
    }
  }, [room.id]);

  useEffect(() => {
    fetchRoomData();
    return () => stopPolling();
  }, [fetchRoomData]);

  // ─── Persistance localStorage du chat (P1-6) ──────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(`vs-chat-${room.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ChatMessage[];
        if (Array.isArray(parsed)) setChatMessages(parsed);
      } catch {
        // Silencieux — localStorage corrompu, on ignore
      }
    }
  }, [room.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (chatMessages.length > 0) {
      try {
        localStorage.setItem(`vs-chat-${room.id}`, JSON.stringify(chatMessages));
      } catch {
        // Silencieux — quota localStorage ou mode privé
      }
    }
  }, [chatMessages, room.id]);

  // ─── Polling ──────────────────────────────────────────────────

  const startPolling = useCallback((visualId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/vs/visuals/${visualId}/status`);
        const json = await res.json() as ApiResponse<{
          id: string;
          status: string;
          file_path: string | null;
          error_message: string | null;
        }>;

        if (!json.success) return;

        const { status, file_path, error_message } = json.data;

        if (status === "generated" || status === "validated") {
          stopPolling();
          setIsGenerating(false);

          // Mettre à jour le visuel actif
          setActiveVisual((prev) =>
            prev && prev.id === visualId
              ? { ...prev, status: status as VsVisual["status"], file_path, error_message }
              : prev
          );

          // Mettre à jour dans la liste
          setVisuals((prev) =>
            prev.map((v) =>
              v.id === visualId
                ? { ...v, status: status as VsVisual["status"], file_path, error_message }
                : v
            )
          );

          // Si nouveau visuel pas encore dans la liste, ajouter
          setVisuals((prev) => {
            if (prev.some((v) => v.id === visualId)) return prev;
            return [
              {
                id: visualId,
                photo_id: activeVisual?.photo_id ?? "",
                style_id: activeVisual?.style_id ?? "",
                file_path,
                status: status as VsVisual["status"],
                prompt_used: null,
                iteration_count: 0,
                parent_visual_id: activeVisual?.parent_visual_id ?? null,
                error_message,
                created_at: new Date().toISOString(),
              },
              ...prev,
            ];
          });

          setSubState("result");
        }

        if (status === "failed") {
          stopPolling();
          setIsGenerating(false);
          setActiveVisual((prev) =>
            prev && prev.id === visualId
              ? { ...prev, status: "failed", error_message }
              : prev
          );
          setSubState("result");
        }
      } catch {
        // Retry silencieux
      }
    }, POLL_INTERVAL);
  }, [activeVisual]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // ─── Upload photo ─────────────────────────────────────────────

  const handleUploadPhoto = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`/api/vs/rooms/${room.id}/photos`, {
          method: "POST",
          body: formData,
        });
        const json = (await res.json()) as ApiResponse<VsPhoto>;

        if (!json.success) {
          const errorMessages: Record<string, string> = {
            FILE_TOO_LARGE: "Le fichier dépasse 10 Mo. Compressez la photo et réessayez.",
            INVALID_FORMAT: "Format non supporté. Utilisez JPG ou PNG.",
            ROOM_NOT_FOUND: "Pièce introuvable. Rechargez la page.",
            RATE_LIMIT_EXCEEDED: "Limite de génération atteinte. Réessayez dans une heure.",
          };
          const friendlyMessage = errorMessages[json.error] || json.error || "Une erreur inattendue s'est produite.";
          setError(friendlyMessage);
          return;
        }

        setPhotos((prev) => [json.data, ...prev]);
        setSubState("select-style");
      } catch {
        setError("Impossible de déposer la photo.");
      } finally {
        setIsUploading(false);
      }
    },
    [room.id]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleUploadPhoto(file);
      }
    },
    [handleUploadPhoto]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        handleUploadPhoto(file);
      }
    },
    [handleUploadPhoto]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  // ─── Génération ───────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!selectedStyleId || photos.length === 0) return;

    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/vs/rooms/${room.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo_id: photos[0].id,
          style_id: selectedStyleId,
        }),
      });
      const json = (await res.json()) as ApiResponse<{ visual_id: string }>;

      if (!json.success) {
        setError(json.error);
        setIsGenerating(false);
        return;
      }

      // Créer un visuel temporaire en status processing
      const newVisual: VsVisual = {
        id: json.data.visual_id,
        photo_id: photos[0].id,
        style_id: selectedStyleId,
        file_path: null,
        status: "processing",
        prompt_used: null,
        iteration_count: 0,
        parent_visual_id: null,
        error_message: null,
        created_at: new Date().toISOString(),
      };

      setActiveVisual(newVisual);
      setVisuals((prev) => [newVisual, ...prev]);
      setSubState("generating");
      startPolling(json.data.visual_id);
    } catch {
      setError("Impossible de lancer la création du visuel.");
      setIsGenerating(false);
    }
  }, [selectedStyleId, photos, room.id, startPolling]);

  // ─── Validation ───────────────────────────────────────────────

  const handleValidate = useCallback(
    async (visualId: string) => {
      setIsValidating(true);
      setError(null);

      try {
        const res = await fetch(`/api/vs/visuals/${visualId}/validate`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ validated: true }),
        });
        const json = (await res.json()) as ApiResponse<VsVisual>;

        if (!json.success) {
          setError(json.error);
          return;
        }

        setActiveVisual(json.data);
        setVisuals((prev) =>
          prev.map((v) => (v.id === visualId ? json.data : v))
        );
        onRefreshRoom();
      } catch {
        setError("Impossible de valider le visuel.");
      } finally {
        setIsValidating(false);
      }
    },
    [onRefreshRoom]
  );

  // ─── Itération (chat) ─────────────────────────────────────────

  const handleOpenChat = useCallback(() => {
    setShowChat(true);
  }, []);

  const handleCloseChat = useCallback(() => {
    setShowChat(false);
  }, []);

  const handleSendInstruction = useCallback(
    async (instruction: string) => {
      if (!activeVisual) return;

      // Ajouter le message utilisateur
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: instruction,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, userMsg]);
      setIsGenerating(true);

      try {
        const res = await fetch(`/api/vs/visuals/${activeVisual.id}/iterate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instruction }),
        });
        const json = (await res.json()) as ApiResponse<{ visual_id: string }>;

        if (!json.success) {
          setChatMessages((prev) => [
            ...prev,
            {
              id: `agent-err-${Date.now()}`,
              role: "agent",
              content: json.error,
              timestamp: new Date().toISOString(),
            },
          ]);
          setIsGenerating(false);
          return;
        }

        // Ajouter un message agent de confirmation
        const agentMsg: ChatMessage = {
          id: `agent-${Date.now()}`,
          role: "agent",
          content: "Modification en cours…",
          visual_id: json.data.visual_id,
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, agentMsg]);

        // Créer le nouveau visuel en processing
        const newVisual: VsVisual = {
          id: json.data.visual_id,
          photo_id: activeVisual.photo_id,
          style_id: activeVisual.style_id,
          file_path: null,
          status: "processing",
          prompt_used: null,
          iteration_count: activeVisual.iteration_count + 1,
          parent_visual_id: activeVisual.id,
          error_message: null,
          created_at: new Date().toISOString(),
        };

        setActiveVisual(newVisual);
        setVisuals((prev) => [newVisual, ...prev]);
        setSubState("generating");
        startPolling(json.data.visual_id);
      } catch {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `agent-err-${Date.now()}`,
            role: "agent",
            content: "Impossible de lancer la modification.",
            timestamp: new Date().toISOString(),
          },
        ]);
        setIsGenerating(false);
      }
    },
    [activeVisual, startPolling]
  );

  // ─── Change style ─────────────────────────────────────────────

  const handleChangeStyle = useCallback(() => {
    setSelectedStyleId(null);
    setSubState("select-style");
  }, []);

  // ─── Retry ────────────────────────────────────────────────────

  const handleRetry = useCallback(() => {
    if (selectedStyleId) {
      handleGenerate();
    } else {
      setSubState("select-style");
    }
  }, [selectedStyleId, handleGenerate]);

  // ─── Select visual from history ───────────────────────────────

  const handleSelectVisual = useCallback((visual: VsVisual) => {
    setActiveVisual(visual);
    setSubState("result");
  }, []);

  // ─── Rendu ────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 min-h-0">
      {/* Zone principale */}
      <div className="flex-1 overflow-y-auto p-lg">
        {/* Titre pièce */}
        <div className="mb-lg">
          <h2 className="text-lg font-medium text-text-default capitalize">
            {roomLabel}
          </h2>
          {room.surface_m2 && (
            <p className="text-sm text-text-muted">{Number(room.surface_m2)} m²</p>
          )}
        </div>

        {/* Erreur */}
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
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* ─── État Upload ─────────────────────────────────────── */}
        {subState === "upload" && (
          <div>
            <p className="text-sm text-text-muted mb-md">
              Déposez une photo de cette pièce pour démarrer la génération
            </p>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed border-border-default rounded-lg
                p-4xl flex flex-col items-center justify-center
                cursor-pointer hover:border-interactive-primary transition-colors duration-200
                ${isUploading ? "opacity-50 pointer-events-none" : ""}
              `}
              role="button"
              tabIndex={0}
              aria-label="Zone de dépôt de photo"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              {isUploading ? (
                <div className="flex flex-col items-center">
                  <div className="inline-block w-8 h-8 border-2 border-border-default border-t-interactive-primary rounded-full animate-spin mb-md" />
                  <p className="text-sm text-text-muted">Dépôt en cours…</p>
                </div>
              ) : (
                <>
                  <svg
                    className="w-12 h-12 text-text-muted mb-md"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
                  </svg>
                  <p className="text-sm text-text-default mb-2xs">
                    Déposez ou sélectionnez une photo
                  </p>
                  <p className="text-xs text-text-muted">
                    JPG, PNG — jusqu'à 10 Mo
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
                aria-hidden="true"
              />
            </div>
          </div>
        )}

        {/* ─── État Select Style ───────────────────────────────── */}
        {subState === "select-style" && (
          <div>
            {/* Miniature de la photo uploadée */}
            {photos.length > 0 && (
              <div className="mb-lg">
                <p className="text-xs uppercase tracking-widest text-text-muted mb-sm">
                  Photo de la pièce
                </p>
                <div className="w-full max-w-xs rounded-md overflow-hidden border border-border-default">
                  <img
                    src={`/api/vs/files?path=${encodeURIComponent(photos[0].file_path)}`}
                    alt={`Photo ${roomLabel}`}
                    className="w-full h-40 object-cover"
                  />
                </div>
              </div>
            )}

            <p className="text-sm text-text-muted mb-md">
              Choisissez un style
            </p>

            <StyleGrid
              selectedStyleId={selectedStyleId}
              onSelect={(styleId) => setSelectedStyleId(styleId)}
            />

            {/* Bouton générer (rendu inconditionnel, disabled si pas de style) */}
            <div className="mt-lg">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!selectedStyleId || isGenerating}
                className="
                  w-full px-xl py-md rounded-md text-sm font-medium
                  bg-interactive-primary text-text-inverse
                  hover:bg-interactive-hover transition-colors duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary active:opacity-80 min-h-[44px]
                "
              >
                {isGenerating ? "Création en cours…" : "Créer le visuel"}
              </button>
            </div>
          </div>
        )}

        {/* ─── État Generating / Result ────────────────────────── */}
        {(subState === "generating" || subState === "result") && (
          <VisualResult
            activeVisual={activeVisual}
            allVisuals={visuals}
            onIterate={handleOpenChat}
            onValidate={handleValidate}
            onChangeStyle={handleChangeStyle}
            onRetry={handleRetry}
            onSelectVisual={handleSelectVisual}
            isValidating={isValidating}
          />
        )}
      </div>

      {/* ─── Drawer Chat ───────────────────────────────────────── */}
      {showChat && (
        <div className="w-[380px] flex-shrink-0">
          <ChatAgent
            messages={chatMessages}
            onSendInstruction={handleSendInstruction}
            isProcessing={isGenerating}
            onClose={handleCloseChat}
          />
        </div>
      )}
    </div>
  );
}
