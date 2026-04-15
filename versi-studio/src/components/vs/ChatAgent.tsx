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
            Décrivez les modifications souhaitées
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-xs rounded-md hover:bg-bg-default transition-colors duration-200"
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
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg
                className="w-10 h-10 text-text-muted mx-auto mb-sm"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                />
              </svg>
              <p className="text-sm text-text-muted">
                Décrivez les modifications souhaitées
              </p>
              <p className="text-xs text-text-muted mt-2xs">
                Exemple : « Ajoutez un tapis beige et des rideaux en lin »
              </p>
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
                  text-[10px] mt-2xs
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
                <span className="text-xs text-text-muted">Modification en cours...</span>
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
                focus:outline-none focus:border-interactive-primary
                resize-none disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-200
              "
              aria-label="Instructions de modification"
            />
            <span
              className={`
                absolute bottom-sm right-sm text-[10px]
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
