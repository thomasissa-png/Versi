"use client";

/**
 * ProStepper — Stepper 8 étapes pour le parcours marchand.
 *
 * Rendu : Client Component (états visuels interactifs + navigation).
 *
 * Props :
 * - currentStep : étape active (1-8)
 * - completedSteps : étapes terminées (ex: [1, 2, 3])
 * - errorSteps? : étapes en erreur (ex: [2])
 * - projectId? : ID du projet pour la navigation
 * - onStepClick? : callback custom au lieu de la navigation par défaut
 *
 * Design tokens issus de docs/marchand-pivot/design/page-compositions.md :
 * - Completed : #7D9B76 (sage) + check blanc
 * - Active : #1C1C1E (foreground)
 * - Locked : #D1D0CB
 * - Error : #EF4444
 * - Connecteur done : #7D9B76, pending : #D1D0CB
 */

import { useRouter } from "next/navigation";

const STEPS = [
  { label: "Projet", sublabel: "Upload" },
  { label: "Découpe", sublabel: "Définition des biens" },
  { label: "Pièces", sublabel: "Détection IA" },
  { label: "Validation", sublabel: "Ajustements" },
  { label: "Style", sublabel: "Cible et ambiance" },
  { label: "Conseils", sublabel: "Propositions IA" },
  { label: "Visuels", sublabel: "Génération" },
  { label: "Dossier", sublabel: "PDF" },
] as const;

interface ProStepperProps {
  currentStep: number;
  completedSteps: number[];
  errorSteps?: number[];
  projectId?: string;
  onStepClick?: (stepNumber: number) => void;
}

type StepState = "completed" | "active" | "locked" | "error";

function getStepState(
  stepIndex: number,
  currentStep: number,
  completedSteps: number[],
  errorSteps: number[]
): StepState {
  const stepNumber = stepIndex + 1;
  if (errorSteps.includes(stepNumber)) return "error";
  if (completedSteps.includes(stepNumber)) return "completed";
  if (stepNumber === currentStep) return "active";
  return "locked";
}

/** Build the route for a given step number. */
function getStepRoute(stepNumber: number, projectId?: string): string | null {
  if (stepNumber === 1) return "/projet/nouveau";
  if (!projectId) return null;
  switch (stepNumber) {
    case 2: return `/projet/${projectId}/decoupe`;
    case 3: return `/projet/${projectId}/extraction`;
    case 4: return `/projet/${projectId}/validation`;
    case 5: return `/projet/${projectId}/qualification`;
    case 6: return `/projet/${projectId}/recommandations`;
    case 7: return `/projet/${projectId}/generation`;
    case 8: return `/projet/${projectId}/dossier`;
    default: return null;
  }
}

/** Check icon SVG for completed steps. */
function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2.5 7.5L5.5 10.5L11.5 3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Dot colors and styles per state. */
const DOT_STYLES: Record<StepState, string> = {
  completed: "bg-[#7D9B76] text-white",
  active: "bg-[#1C1C1E] text-white ring-4 ring-[#1C1C1E]/20 shadow-md",
  locked: "bg-[#D1D0CB] text-[#9B9A94]",
  error: "bg-[#EF4444] text-white",
};

const LABEL_STYLES: Record<StepState, string> = {
  completed: "text-[#4A7A42] font-medium",
  active: "text-[#1C1C1E] font-semibold",
  locked: "text-[#9B9A94] font-normal",
  error: "text-[#B91C1C] font-medium",
};

export default function ProStepper({
  currentStep,
  completedSteps,
  errorSteps = [],
  projectId,
  onStepClick,
}: ProStepperProps) {
  const router = useRouter();

  function handleStepClick(stepNumber: number, state: StepState) {
    // Only completed and active steps are clickable
    if (state === "locked") return;

    // Don't navigate if we're already on this step
    if (stepNumber === currentStep) return;

    if (onStepClick) {
      onStepClick(stepNumber);
      return;
    }

    const route = getStepRoute(stepNumber, projectId);
    if (route) {
      router.push(route);
    }
  }

  /** Whether a step is clickable (completed or active, and not current). */
  function isClickable(stepNumber: number, state: StepState): boolean {
    if (state === "locked") return false;
    if (stepNumber === currentStep) return false;
    return true;
  }

  return (
    <nav
      aria-label="Progression du projet"
      className="w-full overflow-x-auto bg-[#FAFAF8] border border-[#E8E7E2] rounded-xl px-6 py-5 shadow-[0_1px_4px_0_rgba(28,28,30,0.06)]"
    >
      {/* Desktop : horizontal */}
      <ol className="hidden sm:flex items-start justify-between gap-2">
        {STEPS.map((step, i) => {
          const state = getStepState(i, currentStep, completedSteps, errorSteps);
          const isLast = i === STEPS.length - 1;
          const stepNumber = i + 1;
          const clickable = isClickable(stepNumber, state);

          return (
            <li
              key={step.label}
              className="flex items-center flex-1 last:flex-none"
              aria-current={state === "active" ? "step" : undefined}
            >
              <button
                type="button"
                onClick={() => handleStepClick(stepNumber, state)}
                disabled={!clickable}
                className={`flex flex-col items-center min-w-[72px] transition-opacity duration-200
                  ${clickable
                    ? "cursor-pointer hover:opacity-75 hover:ring-2 hover:ring-[#7D9B76]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9B76] rounded-lg"
                    : state === "locked"
                      ? "cursor-not-allowed"
                      : "cursor-default"
                  }`}
                aria-label={`${step.label} — ${
                  state === "completed" ? "terminée" :
                  state === "active" ? "en cours" :
                  state === "error" ? "erreur" :
                  "verrouillée"
                }`}
              >
                {/* Dot */}
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full text-xs transition-all duration-300 ${DOT_STYLES[state]}`}
                >
                  {state === "completed" ? (
                    <CheckIcon />
                  ) : state === "error" ? (
                    <><span aria-hidden="true">!</span><span className="sr-only">Erreur à cette étape</span></>
                  ) : (
                    <span>{stepNumber}</span>
                  )}
                </div>
                {/* Label */}
                <span
                  className={`mt-2 text-xs tracking-[0.02em] leading-4 text-center ${LABEL_STYLES[state]}`}
                >
                  {step.label}
                </span>
                <span className={`text-[11px] leading-[14px] text-center ${state === "active" ? "text-[#6B6A64]" : "text-[#9B9A94]"}`}>
                  {step.sublabel}
                </span>
              </button>

              {/* Connector */}
              {!isLast && (
                <div
                  className={`flex-1 h-px mx-3 mt-[20px] self-start transition-colors duration-300 ${
                    completedSteps.includes(i + 1)
                      ? "bg-[#7D9B76]"
                      : "bg-[#D1D0CB]"
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile : vertical compact — single button per step for accessibility */}
      <ol className="flex sm:hidden flex-col gap-2 px-4 py-4">
        {STEPS.map((step, i) => {
          const state = getStepState(i, currentStep, completedSteps, errorSteps);
          const isLast = i === STEPS.length - 1;
          const stepNumber = i + 1;
          const clickable = isClickable(stepNumber, state);

          return (
            <li
              key={step.label}
              className="flex items-start gap-2.5"
              aria-current={state === "active" ? "step" : undefined}
            >
              <div className="flex flex-col items-center">
                {/* Single button wrapping dot + label — 1 focusable per step */}
                <button
                  type="button"
                  onClick={() => handleStepClick(stepNumber, state)}
                  disabled={!clickable}
                  className={`flex items-center gap-2.5 min-h-[44px]
                    ${clickable
                      ? "cursor-pointer hover:opacity-75 hover:ring-2 hover:ring-[#7D9B76]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9B76] rounded-lg"
                      : state === "locked"
                        ? "cursor-not-allowed"
                        : "cursor-default"
                    }`}
                  aria-label={`${step.label} — ${
                    state === "completed" ? "terminée" :
                    state === "active" ? "en cours" :
                    state === "error" ? "erreur" :
                    "verrouillée"
                  }`}
                >
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] transition-all duration-300 shrink-0 ${DOT_STYLES[state]}`}>
                    {state === "completed" ? (
                      <CheckIcon />
                    ) : state === "error" ? (
                      <><span aria-hidden="true">!</span><span className="sr-only">Erreur à cette étape</span></>
                    ) : (
                      <span>{stepNumber}</span>
                    )}
                  </div>
                  <div className="text-left">
                    <span
                      className={`text-xs tracking-[0.02em] leading-4 ${LABEL_STYLES[state]}`}
                    >
                      {step.label}
                    </span>
                    {state === "active" && (
                      <span className="text-[10px] text-[#9B9A94] leading-3 block mt-0.5">
                        {step.sublabel}
                      </span>
                    )}
                  </div>
                </button>
                {/* Vertical connector */}
                {!isLast && (
                  <div
                    className={`w-0.5 h-5 mt-0.5 transition-colors duration-300 ${
                      completedSteps.includes(i + 1)
                        ? "bg-[#7D9B76]"
                        : "bg-[#D1D0CB]"
                    }`}
                    aria-hidden="true"
                  />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
