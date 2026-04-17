/**
 * ChatAgent — Panneau de chat avec l'agent architecte
 *
 * Drawer latéral : input texte (max 500 chars) + historique des messages.
 * Chaque message envoie une instruction d'itération et génère un nouveau visuel.
 */

"use client";

import { useState, useRef, useEffect } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  visual_id?: string;
  timestamp: string;
}

interface ChatAgentProps {
  /** Messages de conversation */
  messages: ChatMessage[];
  /** Callback quand l'utilisateur envoie une instruction */
  onSendInstruction: (instruction: string) => void;
  /** Est-ce qu'une génération est en cours */
  isProcessing: boolean;
  /** Callback pour fermer le chat */
  onClose: () => void;
}

const MAX_CHARS = 500;

// ─── Suggestions rapides pour le chat ───────────────────────────

const CHAT_SUGGESTIONS = [
  { label: "Plus de lumière naturelle", text: "Ajoutez plus de lumière naturelle — agrandissez ou ajoutez des fenêtres si possible" },
  { label: "Changer le sol", text: "Changez le revêtement de sol par du parquet chêne clair" },
  { label: "Supprimer la cloison", text: "Supprimez la cloison visible pour ouvrir l'espace" },
  { label: "Ajouter une verrière", text: "Ajoutez une verrière entre la cuisine et le séjour" },
  { label: "Cuisine plus ouverte", text: "Ouvrez la cuisine sur le séjour en supprimant le mur séparatif" },
  { label: "Peinture murale blanche", text: "Repeignez tous les murs en blanc mat" },
];

export default function ChatAgent({
  messages,
  onSendInstruction,
  isProcessing,
  onClose,
}: ChatAgentProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus l'input à l'ouverture
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isProcessing) return;
    onSendInstruction(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  const charsRemaining = MAX_CHARS - input.length;

  return (
    <div className="flex flex-col h-full bg-bg-card border-l border-border-default">
      {/* Header */}
      <div className="flex items-center justify-between p-md border-b border-border-default">
        <div>
          <h3 className="text-sm font-medium text-text-default">
            Agent architecte
          </h3>
          <p className="text-xs text-text-muted">
            Modifier ce visuel
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-xs rounded-md hover:bg-bg-default transition-colors duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Fermer le chat"
        >
          <svg
            className="w-5 h-5 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-md space-y-md"
      >
        {/* Message d'introduction agent */}
        {messages.length === 0 && (
          <div>
            <div className="flex justify-start mb-md">
              <div className="max-w-[85%] rounded-lg p-sm bg-bg-default text-text-default border border-border-default">
                <p className="text-sm">
                  Voici votre visuel post-travaux. Décrivez une modification structurelle (mur, cloison, ouverture) ou une retouche décorative — l&apos;agent architecte met à jour le visuel.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Suggestions rapides (affichées quand pas encore de messages utilisateur) */}
        {!messages.some((m) => m.role === "user") && (
          <div className="mb-md">
            <p className="text-xs text-text-muted mb-sm">Suggestions :</p>
            <div className="flex flex-wrap gap-sm">
              {CHAT_SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setInput(s.text)}
                  disabled={isProcessing}
                  className="rounded-full border border-border-default bg-bg-default px-sm py-2xs text-xs text-text-muted hover:bg-bg-card hover:text-text-default transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`
                max-w-[85%] rounded-lg p-sm
                ${
                  msg.role === "user"
                    ? "bg-interactive-primary text-text-inverse"
                    : "bg-bg-default text-text-default border border-border-default"
                }
              `}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <p
                className={`
                  text-xs mt-2xs
                  ${msg.role === "user" ? "text-text-inverse/60" : "text-text-muted"}
                `}
              >
                {new Date(msg.timestamp).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}

        {/* Indicateur de traitement */}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-bg-default border border-border-default rounded-lg p-sm">
              <div className="flex items-center gap-sm">
                <div className="flex gap-xs">
                  <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-text-muted">Modification en cours…</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border-default p-md">
        <div className="flex gap-sm">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) {
                  setInput(e.target.value);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Décrivez les modifications souhaitées..."
              disabled={isProcessing}
              rows={2}
              className="
                w-full px-md py-sm rounded-md text-sm
                border border-border-default bg-bg-default
                text-text-default placeholder:text-text-muted
                focus-visible:outline-none focus-visible:border-interactive-primary
                resize-none disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-200
              "
              aria-label="Instructions de modification"
            />
            <span
              className={`
                absolute bottom-sm right-sm text-xs
                ${charsRemaining < 50 ? "text-warning" : "text-text-muted"}
                ${charsRemaining < 10 ? "text-error" : ""}
              `}
            >
              {charsRemaining}
            </span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isProcessing}
            className="
              self-end px-md py-sm rounded-md text-sm font-medium
              bg-interactive-primary text-text-inverse
              hover:bg-interactive-hover transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary min-h-[44px]
            "
            aria-label="Envoyer"
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
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export type { ChatMessage };
