/**
 * Stepper — Navigation latérale 4 étapes Versi Studio
 *
 * Affiche l'étape active, les étapes complétées (cochées), et les étapes futures (grisées).
 * Desktop-first : barre latérale verticale.
 */

"use client";

import { STEPS, type StepId } from "@/lib/vs/types";

interface StepperProps {
  currentStep: StepId;
  projectId: string;
  completedSteps?: StepId[];
}

export default function Stepper({
  currentStep,
  projectId,
  completedSteps = [],
}: StepperProps) {
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
