/**
 * Stepper — Navigation 4 étapes Versi Studio
 *
 * Affiche l'étape active, les étapes complétées (cochées), et les étapes futures (grisées).
 * Variant "vertical" (défaut) : barre latérale desktop (sidebar 256px).
 * Variant "horizontal" : rangée compacte mobile (< 768px), cercles + numéros, labels masqués.
 */

"use client";

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
  completedSteps = [],
  variant = "vertical",
}: StepperProps) {
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

          return (
            <div key={step.id} className="flex items-center gap-xs flex-shrink-0">
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

        return (
          <div
            key={step.id}
            className={`
              flex items-start gap-md p-md rounded-md transition-colors duration-200 motion-reduce:transition-none
              ${isActive ? "bg-bg-dark text-text-inverse border-l-[3px] border-text-default" : ""}
              ${isFuture ? "opacity-50" : ""}
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
          </div>
        );
      })}
    </nav>
  );
}
