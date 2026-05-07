/**
 * s32 (Phase 9) — ArchitectChatPanel.
 *
 * Panel chat architecte virtuel qui pose des questions ciblées sur les
 * ambiguïtés non couvertes par les pills V3. ADDITIF aux pills, pas
 * remplacement.
 *
 * Mount → POST /chat/start (synthèse 3 sections + 1ère question + suggestions
 * dynamiques générées par LLM tool ask_question).
 *
 * Suggestions cliquables : un clic envoie le texte comme message user.
 * Texte libre : textarea + bouton Envoyer (Enter envoie, Shift+Enter newline).
 *
 * Tool callbacks (propagés au parent VisualWizardRoomStep) :
 *   - onFieldUpdate(field, value, scope) : update_field → toast + PATCH local
 *   - onBriefValidated(confidence)        : validate_brief → bouton Générer vert
 *
 * Design : sidebar compatible RoomSegmentsPanel (même largeur 280px, même tokens).
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/vs/types";

// ─── Props ────────────────────────────────────────────────────────

export type FieldUpdate = {
  field: string;
  value: string;
  scope: "room" | "lot";
};

export interface ArchitectChatPanelProps {
  roomId: string;
  /** Appelé quand le LLM appelle update_field. Le parent doit appliquer le
   *  PATCH côté API (room ou lot) + mettre à jour son state local + toast. */
  onFieldUpdate: (update: FieldUpdate) => void;
  /** Appelé quand le LLM appelle validate_brief — bouton Générer passe en vert. */
  onBriefValidated: (confidence: "high" | "medium" | "low") => void;
  /** Toggle retour vers panel segments. */
  onClose: () => void;
}

// ─── API types ────────────────────────────────────────────────────

interface ChatApiData {
  reply: ChatMessage;
  tool_calls: Array<{
    name: string;
    args: Record<string, unknown>;
    result: string;
  }>;
  brief_validated: boolean;
  /** s32 Phase 9 itér. — confidence remontée par validate_brief (LLM tool). */
  brief_confidence?: "high" | "medium" | "low" | null;
  field_updates: FieldUpdate[];
  transcript: ChatMessage[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Component ────────────────────────────────────────────────────

export default function ArchitectChatPanel({
  roomId,
  onFieldUpdate,
  onBriefValidated,
  onClose,
}: ArchitectChatPanelProps) {
  const [transcript, setTranscript] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // ─── Apply tool side effects (update_field, validate_brief) ─────
  const applyToolSideEffects = useCallback(
    (data: ChatApiData) => {
      for (const update of data.field_updates) {
        onFieldUpdate(update);
      }
      if (data.brief_validated) {
        // s32 Phase 9 itér. — lecture vraie confidence LLM (validate_brief.confidence).
        // Si "low" : le parent peut refuser d'activer le bouton vert.
        const conf = data.brief_confidence ?? "medium";
        onBriefValidated(conf);
      }
    },
    [onFieldUpdate, onBriefValidated]
  );

  // ─── Init : POST /chat/start au mount ────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/vs/rooms/${roomId}/chat/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        const json = (await res.json()) as ApiResponse<ChatApiData>;
        if (cancelled) return;
        if (!json.success || !json.data) {
          setError(json.error ?? "La connexion au service n'a pas abouti. Réessayez.");
          return;
        }
        setTranscript(json.data.transcript);
        applyToolSideEffects(json.data);
        setInitialized(true);
      } catch (err) {
        if (cancelled) return;
        console.error("[ArchitectChatPanel] init error:", err);
        setError("Connexion interrompue — vos données sont préservées.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [roomId, applyToolSideEffects]);

  // ─── Scroll auto en bas à chaque nouveau message ─────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, loading]);

  // ─── Envoi message ───────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      setInput("");
      setError(null);

      // Optimistic : on ajoute le message user immédiatement
      const optimisticUserMsg: ChatMessage = {
        role: "user",
        content: trimmed,
        timestamp: new Date().toISOString(),
      };
      setTranscript((prev) => [...prev, optimisticUserMsg]);
      setLoading(true);

      try {
        const res = await fetch(`/api/vs/rooms/${roomId}/chat/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed }),
        });
        const json = (await res.json()) as ApiResponse<ChatApiData>;
        if (!json.success || !json.data) {
          setError(json.error ?? "La réponse n'a pas pu être générée. Réessayez.");
          // Rollback : on retire le message optimiste si erreur définitive
          // (on garde quand même pour permettre un nouvel envoi manuel)
          return;
        }
        // L'API renvoie le transcript complet (source de vérité)
        setTranscript(json.data.transcript);
        applyToolSideEffects(json.data);
      } catch (err) {
        console.error("[ArchitectChatPanel] send error:", err);
        setError("Connexion interrompue — vos données sont préservées.");
      } finally {
        setLoading(false);
        textareaRef.current?.focus();
      }
    },
    [roomId, loading, applyToolSideEffects]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      sendMessage(input);
    },
    [input, sendMessage]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input);
      }
    },
    [input, sendMessage]
  );

  const handleSuggestion = useCallback(
    (text: string) => {
      sendMessage(text);
    },
    [sendMessage]
  );

  // ─── Rendu d'une bulle assistant (markdown léger : **bold**, listes -) ──
  const renderAssistantContent = (content: string) => {
    // Markdown très simple : **bold** + lignes commençant par "- " en liste.
    const lines = content.split("\n");
    const blocks: React.ReactNode[] = [];
    let listBuf: string[] = [];
    const flushList = (key: number) => {
      if (listBuf.length === 0) return;
      blocks.push(
        <ul key={`l-${key}`} className="list-disc pl-md text-sm">
          {listBuf.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      listBuf = [];
    };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s*-\s+/.test(line)) {
        listBuf.push(line.replace(/^\s*-\s+/, ""));
      } else {
        flushList(i);
        if (line.trim().length === 0) {
          blocks.push(<div key={`sp-${i}`} className="h-1" />);
        } else {
          blocks.push(
            <p key={`p-${i}`} className="text-sm">
              {renderInline(line)}
            </p>
          );
        }
      }
    }
    flushList(lines.length);
    return <div className="flex flex-col gap-xs">{blocks}</div>;
  };

  const renderInline = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <aside
      className="flex flex-col w-full max-h-[60dvh] lg:w-[280px] lg:flex-shrink-0 lg:max-h-[calc(100dvh-200px)] min-h-[400px] rounded-md border border-border-default bg-bg-card overflow-hidden"
      style={{ height: "100%" }}
      aria-labelledby="architect-chat-title"
      data-testid="architect-chat-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-md py-sm border-b border-border-default flex-shrink-0">
        <h3
          id="architect-chat-title"
          className="text-sm uppercase tracking-wide font-semibold text-text-default"
        >
          Architecte virtuel
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer — revenir aux segments"
          className="text-text-muted hover:text-text-default w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
          data-testid="architect-chat-close"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M3 3l10 10M13 3L3 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Body : transcript scrollable */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-md py-sm flex flex-col gap-sm"
        role="log"
        aria-live="polite"
      >
        {!initialized && loading && (
          <p className="text-xs text-text-muted italic">
            Préparation de la synthèse…
          </p>
        )}

        {transcript.map((msg, i) => {
          if (msg.role === "user") {
            return (
              <div
                key={i}
                className="self-end max-w-[85%] rounded-md px-sm py-sm bg-interactive-primary text-bg-canvas"
                data-testid={`chat-msg-user-${i}`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">
                  {msg.content}
                </p>
              </div>
            );
          }
          if (msg.role === "assistant") {
            return (
              <div
                key={i}
                className="self-start max-w-[88%] rounded-md px-sm py-sm bg-bg-default border border-border-default text-text-default"
                data-testid={`chat-msg-assistant-${i}`}
              >
                {renderAssistantContent(msg.content)}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <>
                    <p className="text-xs text-text-muted uppercase tracking-wide mt-sm mb-xs">
                      Suggestions
                    </p>
                    <div className="flex flex-wrap gap-xs">
                      {msg.suggestions.map((s, j) => (
                        <button
                          key={j}
                          type="button"
                          onClick={() => handleSuggestion(s)}
                          disabled={loading}
                          className="text-xs px-sm rounded-md border border-interactive-primary text-interactive-primary hover:bg-interactive-primary/10 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary min-h-[44px] inline-flex items-center"
                          data-testid={`chat-suggestion-${i}-${j}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          }
          return null;
        })}

        {loading && initialized && (
          <div
            className="self-start max-w-[60%] rounded-md px-sm py-sm bg-bg-default border border-border-default"
            aria-label="L'architecte rédige"
            data-testid="chat-typing-indicator"
          >
            {/* s33 Lot C C-6 — spinner SVG unique (préf fondateur : pas de cascade SaaS-style). */}
            <span className="inline-flex items-center gap-xs text-xs text-text-muted" aria-hidden="true">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                className="animate-spin"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeOpacity="0.25"
                />
                <path
                  d="M22 12a10 10 0 0 0-10-10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              L&apos;architecte rédige…
            </span>
          </div>
        )}

        {error && (
          <div
            className="self-start rounded-md px-sm py-sm bg-error/10 border border-error/30 text-error"
            role="alert"
            data-testid="chat-error"
          >
            <p className="text-xs">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-xs text-xs underline text-error hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary inline-flex items-center min-h-[32px]"
              data-testid="chat-error-back-segments"
            >
              Revenir aux segments
            </button>
          </div>
        )}
      </div>

      {/* Footer : input */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-xs px-md py-sm border-t border-border-default flex-shrink-0 bg-bg-default"
        style={{ paddingBottom: "max(var(--space-sm), env(safe-area-inset-bottom))" }}
      >
        <label htmlFor="chat-input" className="sr-only">
          Votre message à l&apos;architecte
        </label>
        <textarea
          ref={textareaRef}
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Votre réponse ou précision…"
          rows={2}
          disabled={loading}
          className="text-sm px-sm py-xs rounded-md border border-border-default bg-bg-card text-text-default placeholder:text-text-muted resize-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary disabled:opacity-50"
          data-testid="chat-input"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || input.trim().length === 0}
            className="inline-flex items-center gap-xs text-xs font-semibold px-md py-xs rounded-md bg-interactive-primary text-bg-canvas hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
            data-testid="chat-send"
          >
            {loading && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                className="animate-spin"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeOpacity="0.25"
                />
                <path
                  d="M22 12a10 10 0 0 0-10-10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            )}
            {loading ? "Envoi…" : "Envoyer"}
          </button>
        </div>
      </form>
    </aside>
  );
}
