/**
 * GenerateButton — Étape 4 v2 / s30 Vague 3b
 *
 * Bouton principal "Lancer la génération" qui orchestre :
 *  1. POST /api/vs/projects/[id]/preflight (style_id) → questions ?
 *     - Si questions[].length > 0 : remonter au parent pour ouvrir QuestionsModal
 *     - Si ready_for_generation : enchaîner étape 2
 *  2. POST /api/vs/projects/[id]/visuals/generate (style_id) → job_id
 *     - Notifier parent (job_id) pour basculer en GenerationProgressView (SSE)
 *
 * Pas de blocage budget (préf fondateur). Juste un bouton clair avec état loading.
 *
 * Pré-conditions UI (gérées par parent) : au moins 1 photo placée et 1 room avec
 * target>0. Si aucune → bouton disabled avec hint tooltip.
 */

"use client";

import { useCallback, useState } from "react";
import type { ApiResponse } from "@/lib/vs/types";
import type { AmbiguityQuestion } from "@/lib/vs/ambiguity-detector";

interface PreflightResponse {
  questions: AmbiguityQuestion[];
  ready_for_generation: boolean;
}

interface GenerateResponse {
  job_id: string;
  expected_count: number;
  estimated_cost_usd: number;
}

export interface GenerateButtonProps {
  projectId: string;
  styleId: string;
  /** true si au moins 1 pièce a target>0 ET 1 photo placée. */
  canStart: boolean;
  /** Raison du disabled (tooltip). */
  disabledReason?: string;
  onQuestions: (questions: AmbiguityQuestion[]) => void;
  onJobStarted: (jobId: string, expectedCount: number) => void;
  onError: (msg: string) => void;
}

export default function GenerateButton({
  projectId,
  styleId,
  canStart,
  disabledReason,
  onQuestions,
  onJobStarted,
  onError,
}: GenerateButtonProps) {
  const [state, setState] = useState<"idle" | "preflight" | "starting">("idle");

  const handleClick = useCallback(async () => {
    if (!canStart || state !== "idle") return;
    try {
      // ─── 1. Preflight ─────────────────────────────────────────
      setState("preflight");
      const pf = await fetch(`/api/vs/projects/${projectId}/preflight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style_id: styleId }),
      });
      const pfJson = (await pf.json()) as ApiResponse<PreflightResponse>;
      if (!pfJson.success) {
        onError(pfJson.error);
        setState("idle");
        return;
      }
      if (pfJson.data.questions.length > 0) {
        onQuestions(pfJson.data.questions);
        setState("idle");
        return;
      }

      // ─── 2. Generate (fire-and-forget contrôlé côté API) ──────
      setState("starting");
      const gen = await fetch(`/api/vs/projects/${projectId}/visuals/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style_id: styleId }),
      });
      const genJson = (await gen.json()) as ApiResponse<GenerateResponse>;
      if (!genJson.success) {
        onError(genJson.error);
        setState("idle");
        return;
      }
      onJobStarted(genJson.data.job_id, genJson.data.expected_count);
      setState("idle");
    } catch {
      onError("Lancement échoué — réessayez.");
      setState("idle");
    }
  }, [canStart, state, projectId, styleId, onQuestions, onJobStarted, onError]);

  const isLoading = state !== "idle";
  const label =
    state === "preflight" ? "Vérification…" : state === "starting" ? "Démarrage…" : "Lancer la génération";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!canStart || isLoading}
      title={!canStart ? disabledReason : undefined}
      className="w-full min-h-[44px] px-md py-sm rounded-md text-sm font-medium bg-interactive-primary text-text-inverse hover:bg-interactive-hover disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary inline-flex items-center justify-center gap-sm"
      data-testid="generate-button"
      aria-busy={isLoading}
    >
      {isLoading && (
        <span
          className="inline-block w-4 h-4 border-2 border-text-inverse/40 border-t-text-inverse rounded-full animate-spin"
          aria-hidden="true"
        />
      )}
      {label}
    </button>
  );
}
