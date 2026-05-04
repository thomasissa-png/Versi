/**
 * QuestionsModal — Étape 4 v2 / s30 Vague 3b (modale C bloquante)
 *
 * Affiche les questions T1-T5 retournées par /preflight et collecte les réponses
 * de Thomas avant de relancer la génération.
 *
 * Comportement :
 *  - Pour chaque question, un champ adapté au trigger_type :
 *      • surface_aberrante / surface_inconnue → input number (m²)
 *      • photo_manquante                       → boutons "Désactiver" (passer à 0)
 *                                                ou "Garder" (réponse libre)
 *      • conflit_style_commentaire             → choix A/B
 *      • photos_incoherentes                   → textarea libre
 *  - Au "Confirmer", boucle PATCH /api/vs/visual-questions/[id] pour chaque
 *    réponse non vide, puis remonte au parent qui relance preflight ou generate.
 *
 * A11y :
 *  - role="dialog", aria-modal="true", aria-labelledby
 *  - Focus trap basique : focus auto sur premier input à l'ouverture
 *  - Escape ferme uniquement si toutes les réponses sont vides (sinon prompt
 *    pour éviter perte de saisie). Ici on bloque Escape si dirty, le parent
 *    propose un cancel explicite.
 *  - Boutons min-h 44px (mobile target)
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AmbiguityQuestion } from "@/lib/vs/ambiguity-detector";
import type { ApiResponse } from "@/lib/vs/types";

export interface QuestionsModalProps {
  questions: AmbiguityQuestion[];
  /** Ferme la modale sans relancer (annulation). */
  onCancel: () => void;
  /** Toutes les réponses ont été persistées : le parent relance preflight. */
  onAnswered: () => void;
}

interface FieldState {
  value: string;
  saving: boolean;
  saved: boolean;
  error: string | null;
}

// ─── Helpers ───────────────────────────────────────────────────────

function triggerLabel(t: AmbiguityQuestion["trigger_type"]): string {
  switch (t) {
    case "surface_aberrante":
      return "Surface à confirmer";
    case "surface_inconnue":
      return "Surface manquante";
    case "photo_manquante":
      return "Photo manquante";
    case "conflit_style_commentaire":
      return "Style vs commentaire";
    case "photos_incoherentes":
      return "Photos incohérentes";
    default:
      return "Question";
  }
}

function inputKindFor(t: AmbiguityQuestion["trigger_type"]): "number" | "ab" | "passZero" | "text" {
  if (t === "surface_aberrante" || t === "surface_inconnue") return "number";
  if (t === "conflit_style_commentaire") return "ab";
  if (t === "photo_manquante") return "passZero";
  return "text";
}

// ─── Composant ─────────────────────────────────────────────────────

export default function QuestionsModal({ questions, onCancel, onAnswered }: QuestionsModalProps) {
  const [fields, setFields] = useState<Map<string, FieldState>>(() => {
    const m = new Map<string, FieldState>();
    for (const q of questions) {
      m.set(q.id, { value: "", saving: false, saved: false, error: null });
    }
    return m;
  });
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // ─── Focus trap basique ──────────────────────────────────────────
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  // Empêche Esc de fermer si l'utilisateur a saisi quelque chose
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const hasInput = Array.from(fields.values()).some((f) => f.value.trim().length > 0);
      if (!hasInput) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fields, onCancel]);

  const updateField = useCallback((id: string, patch: Partial<FieldState>) => {
    setFields((prev) => {
      const next = new Map(prev);
      const cur = next.get(id);
      if (!cur) return prev;
      next.set(id, { ...cur, ...patch });
      return next;
    });
  }, []);

  const allAnswered = useMemo(() => {
    if (questions.length === 0) return false;
    return questions.every((q) => (fields.get(q.id)?.value ?? "").trim().length > 0);
  }, [questions, fields]);

  // ─── Submit : boucle PATCH ───────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setGlobalError(null);

    let allOk = true;
    for (const q of questions) {
      const cur = fields.get(q.id);
      if (!cur || cur.value.trim().length === 0 || cur.saved) continue;
      updateField(q.id, { saving: true, error: null });
      try {
        const res = await fetch(`/api/vs/visual-questions/${q.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answer: cur.value.trim() }),
        });
        const json = (await res.json()) as ApiResponse<{ status: string }>;
        if (!json.success) {
          updateField(q.id, { saving: false, error: json.error });
          allOk = false;
          continue;
        }
        updateField(q.id, { saving: false, saved: true, error: null });
      } catch {
        updateField(q.id, { saving: false, error: "Sauvegarde échouée — réessayez." });
        allOk = false;
      }
    }

    setSubmitting(false);
    if (allOk) {
      onAnswered();
    } else {
      setGlobalError("Certaines réponses n'ont pas pu être enregistrées.");
    }
  }, [submitting, questions, fields, updateField, onAnswered]);

  // ─── Rendu ───────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 bg-bg-dark/70 flex items-center justify-center p-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="questions-modal-title"
      data-testid="questions-modal"
    >
      <div
        ref={dialogRef}
        className="bg-bg-default rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-border-default"
      >
        <div className="p-lg border-b border-border-default">
          <h2 id="questions-modal-title" className="text-base font-semibold text-text-default">
            Quelques précisions avant de générer
          </h2>
          <p className="text-sm text-text-muted mt-xs">
            L&apos;IA a détecté {questions.length} point{questions.length > 1 ? "s" : ""} à clarifier
            pour produire des visuels cohérents.
          </p>
        </div>

        <ul className="p-lg flex flex-col gap-md">
          {questions.map((q, idx) => {
            const f = fields.get(q.id);
            if (!f) return null;
            const kind = inputKindFor(q.trigger_type);
            const inputId = `q-input-${q.id}`;
            const isFirst = idx === 0;

            return (
              <li
                key={q.id}
                className="rounded-md border border-border-default bg-bg-card p-md flex flex-col gap-sm"
                data-testid={`question-${q.id}`}
              >
                <div className="flex items-baseline justify-between gap-sm">
                  <span className="text-xs uppercase tracking-wide text-text-muted">
                    {triggerLabel(q.trigger_type)}
                  </span>
                  {f.saved && (
                    <span className="inline-flex items-center gap-2xs text-xs text-success">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Enregistrée
                    </span>
                  )}
                </div>
                <label htmlFor={inputId} className="text-sm text-text-default">
                  {q.question_text}
                </label>

                {kind === "number" && (
                  <input
                    ref={isFirst ? (firstInputRef as React.RefObject<HTMLInputElement>) : undefined}
                    id={inputId}
                    type="number"
                    min={1}
                    max={500}
                    step="0.1"
                    value={f.value}
                    onChange={(e) => updateField(q.id, { value: e.target.value, saved: false })}
                    placeholder="Ex: 24.5"
                    disabled={f.saving || f.saved}
                    className="w-full rounded-sm border border-border-default bg-bg-default px-sm py-xs text-sm text-text-default focus-visible:outline-none focus-visible:border-interactive-primary disabled:opacity-50"
                  />
                )}

                {kind === "ab" && (
                  <div className="flex gap-sm">
                    {(["A", "B"] as const).map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => updateField(q.id, { value: choice, saved: false })}
                        disabled={f.saving || f.saved}
                        className={
                          "flex-1 min-h-[44px] px-md py-sm rounded-md text-sm font-medium border transition-colors " +
                          (f.value === choice
                            ? "border-interactive-primary bg-interactive-primary text-text-inverse"
                            : "border-border-default text-text-default hover:bg-bg-card")
                        }
                        aria-pressed={f.value === choice}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                )}

                {kind === "passZero" && (
                  <div className="flex flex-col gap-sm">
                    <div className="flex flex-col sm:flex-row gap-sm">
                      <button
                        type="button"
                        onClick={() => updateField(q.id, { value: "passer à 0", saved: false })}
                        disabled={f.saving || f.saved}
                        className={
                          "flex-1 min-h-[44px] px-md py-sm rounded-md text-sm font-medium border transition-colors " +
                          (f.value === "passer à 0"
                            ? "border-interactive-primary bg-interactive-primary text-text-inverse"
                            : "border-border-default text-text-default hover:bg-bg-card")
                        }
                        aria-pressed={f.value === "passer à 0"}
                      >
                        Désactiver cette pièce (passer à 0)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField(q.id, { value: "garder, je placerai une photo", saved: false })}
                        disabled={f.saving || f.saved}
                        className={
                          "flex-1 min-h-[44px] px-md py-sm rounded-md text-sm font-medium border transition-colors " +
                          (f.value === "garder, je placerai une photo"
                            ? "border-interactive-primary bg-interactive-primary text-text-inverse"
                            : "border-border-default text-text-default hover:bg-bg-card")
                        }
                        aria-pressed={f.value === "garder, je placerai une photo"}
                      >
                        Garder (je placerai une photo)
                      </button>
                    </div>
                  </div>
                )}

                {kind === "text" && (
                  <textarea
                    ref={isFirst ? (firstInputRef as React.RefObject<HTMLTextAreaElement>) : undefined}
                    id={inputId}
                    value={f.value}
                    onChange={(e) => updateField(q.id, { value: e.target.value.slice(0, 500), saved: false })}
                    rows={2}
                    maxLength={500}
                    placeholder="Votre réponse…"
                    disabled={f.saving || f.saved}
                    className="w-full rounded-sm border border-border-default bg-bg-default px-sm py-xs text-sm text-text-default focus-visible:outline-none focus-visible:border-interactive-primary disabled:opacity-50 resize-y"
                  />
                )}

                {f.error && (
                  <p role="alert" className="text-xs text-error">
                    {f.error}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        <div className="p-lg border-t border-border-default flex flex-col-reverse sm:flex-row gap-sm justify-end items-stretch sm:items-center">
          {globalError && (
            <p role="alert" className="text-xs text-error mr-auto" aria-live="polite">
              {globalError}
            </p>
          )}
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="min-h-[44px] px-lg py-sm rounded-md text-sm font-medium border border-border-default text-text-default hover:bg-bg-card disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            aria-busy={submitting}
            className="min-h-[44px] px-lg py-sm rounded-md text-sm font-medium bg-interactive-primary text-text-inverse hover:bg-interactive-hover disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-sm"
            data-testid="questions-modal-submit"
          >
            {submitting && (
              <span
                className="inline-block w-4 h-4 border-2 border-text-inverse/40 border-t-text-inverse rounded-full animate-spin"
                aria-hidden="true"
              />
            )}
            Confirmer mes réponses
          </button>
        </div>
      </div>
    </div>
  );
}
