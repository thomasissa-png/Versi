/**
 * Stepper — Navigation 4 étapes Versi Studio
 *
 * Affiche l'étape active, les étapes complétées (cochées), et les étapes futures (grisées).
 * Variant "vertical" (défaut) : barre latérale desktop (sidebar 256px).
 * Variant "horizontal" : rangée compacte mobile (< 768px), cercles + numéros, labels masqués.
 */

"use client";

import { useRouter } from "next/navigation";
import { STEPS, type StepId } from "@/lib/vs/types";

export type StepperVariant = "vertical" | "horizontal";

interface StepperProps {
  currentStep: StepId;
  projectId: string;
  completedSteps?: StepId[];
  variant?: StepperVariant;
}

export default function Stepper({
  currentStep,
  projectId,
  completedSteps = [],
  variant = "vertical",
}: StepperProps) {
  const router = useRouter();

  /** Un step est cliquable s'il est complété et pas l'étape courante */
  const isClickable = (stepId: StepId) =>
    completedSteps.includes(stepId) && stepId !== currentStep;

  const handleStepClick = (stepId: StepId) => {
    if (!isClickable(stepId)) return;
    const step = STEPS.find((s) => s.id === stepId);
    if (step) router.push(step.path(projectId));
  };

  if (variant === "horizontal") {
    return (
      <nav
        aria-label="Étapes du projet"
        className="flex items-center gap-xs overflow-x-auto"
      >
        {STEPS.map((step, idx) => {
          const isActive = step.id === currentStep;
          const isCompleted = completedSteps.includes(step.id);
          const isFuture = !isActive && !isCompleted;

          const clickable = isClickable(step.id);

          return (
            <div key={step.id} className="flex items-center gap-xs flex-shrink-0">
              <button
                type="button"
                onClick={() => handleStepClick(step.id)}
                disabled={!clickable}
                className={`flex flex-col items-center gap-2xs bg-transparent border-none p-0 ${clickable ? "cursor-pointer" : isFuture ? "cursor-not-allowed opacity-50" : "cursor-default"}`}
              >
                <div
                  aria-current={isActive ? "step" : undefined}
                  aria-label={`Étape ${step.id} : ${step.label}${isCompleted ? " (complétée)" : isActive ? " (en cours)" : ""}`}
                  className={`
                    flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                    text-sm font-medium transition-colors duration-200 motion-reduce:transition-none
                    ${isCompleted ? "bg-interactive-primary text-text-inverse" : ""}
                    ${isActive ? "bg-bg-dark text-text-inverse" : ""}
                    ${isFuture ? "border border-border-default text-text-muted" : ""}
                  `}
                >
                  {isCompleted ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>
                <span
                  className={`
                    text-xs text-center max-w-[60px] truncate
                    ${isActive ? "text-text-default font-medium" : "text-text-muted"}
                  `}
                >
                  {step.label}
                </span>
              </button>
              {idx < STEPS.length - 1 && (
                <div
                  className="w-4 h-px bg-border-default"
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </nav>
    );
  }

  // Variant vertical (défaut)
  return (
    <nav aria-label="Étapes du projet" className="flex flex-col gap-sm">
      {STEPS.map((step) => {
        const isActive = step.id === currentStep;
        const isCompleted = completedSteps.includes(step.id);
        const isFuture = !isActive && !isCompleted;
        const clickable = isClickable(step.id);

        return (
          // Arbitrary value justifiée: token --border-width-thick à créer si réutilisé ailleurs (P2 design-system)
          <button
            type="button"
            key={step.id}
            onClick={() => handleStepClick(step.id)}
            disabled={!clickable}
            className={`
              flex items-start gap-md p-md rounded-md transition-colors duration-200 motion-reduce:transition-none text-left
              ${isActive ? "bg-bg-dark text-text-inverse border-l-[3px] border-text-default" : ""}
              ${isFuture ? "opacity-50 cursor-not-allowed" : ""}
              ${clickable ? "cursor-pointer hover:bg-bg-default/50" : ""}
              ${!clickable && !isFuture ? "cursor-default" : ""}
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
            `}
          >
            {/* Indicateur circulaire */}
            <div
              className={`
                flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                text-sm font-medium transition-colors duration-200 motion-reduce:transition-none
                ${isCompleted ? "bg-interactive-primary text-text-inverse" : ""}
                ${isActive ? "bg-text-default text-bg-dark" : ""}
                ${isFuture ? "border border-border-default text-text-muted" : ""}
              `}
            >
              {isCompleted ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                step.id
              )}
            </div>

            {/* Labels */}
            <div className="flex flex-col">
              <span
                className={`
                  text-xs uppercase tracking-widest
                  ${isActive ? "text-text-inverse" : isCompleted ? "text-text-default" : "text-text-muted"}
                `}
              >
                {step.label}
              </span>
              <span
                className={`
                  text-sm mt-2xs
                  ${isActive ? "text-text-inverse/80" : "text-text-muted"}
                `}
              >
                {step.description}
              </span>
            </div>
          </button>
        );
      })}
    </nav>
  );
}
