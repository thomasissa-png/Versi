/**
 * RoomArchitecturalDetails — Section "Détails architecturaux" wizard Étape 4
 *
 * 4 champs marchand pièce (Thomas s32 prod feedback) :
 *   - Sol actuel (single-select)
 *   - État murs (single-select)
 *   - Luminosité naturelle (single-select)
 *   - Particularités (multi-select)
 *
 * UX :
 *   - Pills sauf particularités → chips toggle
 *   - Pré-rempli si Vision avec confidence ≥ 0.7 (badge subtil "Détecté")
 *   - Saisie marchand toujours prioritaire (source='user' écrase 'vision')
 *   - Optimistic + PATCH /api/vs/rooms/[id] (orchestré par le parent)
 *
 * Source de vérité : `room.architectural_details`. Si undefined → tous vides.
 */

"use client";

import { useCallback, useMemo } from "react";
import {
  ARCHITECTURAL_DETAILS_OPTIONS,
  emptyArchitecturalDetails,
  type ArchitecturalDetails,
  type ArchitecturalFieldValue,
  type VsRoom,
} from "@/lib/vs/types";

interface Props {
  room: VsRoom;
  /** Optimistic update — l'orchestrateur parent gère le PATCH. */
  onChange: (next: ArchitecturalDetails) => void;
  /** Indicateur Vision en cours d'analyse (loader subtil). */
  visionAnalyzing?: boolean;
}

const SINGLE_FIELDS: Array<{
  key: "floor" | "walls" | "lighting";
  label: string;
}> = [
  { key: "floor", label: "Sol actuel" },
  { key: "walls", label: "État des murs" },
  { key: "lighting", label: "Luminosité naturelle" },
];

/** Badge "Détecté" subtil affiché sur un champ pré-rempli par Vision. */
function VisionBadge({ confidence }: { confidence?: number }) {
  return (
    <span
      className="inline-flex items-center gap-2xs px-xs py-2xs rounded text-[10px] font-medium bg-[var(--color-interactive-primary)]/10 text-[var(--color-interactive-primary)]"
      title={
        confidence != null
          ? `Détecté automatiquement par l'IA (${Math.round(confidence * 100)} % de confiance). Cliquez pour modifier.`
          : "Détecté automatiquement par l'IA. Cliquez pour modifier."
      }
    >
      <svg
        className="w-3 h-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
      Détecté
    </span>
  );
}

export default function RoomArchitecturalDetails({
  room,
  onChange,
  visionAnalyzing = false,
}: Props) {
  const details: ArchitecturalDetails = useMemo(
    () => room.architectural_details ?? emptyArchitecturalDetails(),
    [room.architectural_details]
  );

  // Toggle d'un champ single-select (clic sur valeur active = null)
  const handleSingleToggle = useCallback(
    (field: "floor" | "walls" | "lighting", value: string) => {
      const current = details[field];
      const isActive = current.value === value;
      const next: ArchitecturalDetails = {
        ...details,
        [field]: isActive
          ? ({ value: null, source: null } as ArchitecturalFieldValue)
          : ({ value, source: "user" } as ArchitecturalFieldValue),
      };
      onChange(next);
    },
    [details, onChange]
  );

  // Toggle d'une particularité (multi-select).
  // Règle : "Aucune" est exclusif — sélectionner "Aucune" vide les autres,
  // sélectionner une autre option vide "Aucune".
  const handleSpecificToggle = useCallback(
    (value: string) => {
      const currentValues = details.specifics.map((s) => s.value);
      const has = currentValues.includes(value);

      let nextSpecifics: ArchitecturalFieldValue[];
      if (has) {
        nextSpecifics = details.specifics.filter((s) => s.value !== value);
      } else if (value === "Aucune") {
        // "Aucune" exclusif
        nextSpecifics = [{ value: "Aucune", source: "user" }];
      } else {
        // Ajout d'une particularité réelle → retire "Aucune" si présent
        nextSpecifics = [
          ...details.specifics.filter((s) => s.value !== "Aucune"),
          { value, source: "user" },
        ];
      }
      onChange({ ...details, specifics: nextSpecifics });
    },
    [details, onChange]
  );

  return (
    <section
      aria-labelledby={`room-arch-details-title-${room.id}`}
      className="rounded-md border border-border-default bg-bg-card p-md flex flex-col gap-md"
    >
      <div className="flex items-center justify-between gap-sm">
        <h3
          id={`room-arch-details-title-${room.id}`}
          className="text-sm uppercase tracking-wide font-semibold text-text-default"
        >
          Détails architecturaux
        </h3>
        {visionAnalyzing && (
          <span
            className="inline-flex items-center gap-xs text-xs text-[var(--color-text-muted)]"
            role="status"
            aria-live="polite"
          >
            <span className="inline-block w-3 h-3 border-2 border-[var(--color-text-muted)]/30 border-t-[var(--color-text-muted)] rounded-full animate-spin" />
            Analyse photo…
          </span>
        )}
      </div>
      <p className="text-xs text-text-muted">
        Précisez l&apos;état actuel de la pièce pour des visuels plus fidèles.
      </p>

      {SINGLE_FIELDS.map(({ key, label }) => {
        const options = ARCHITECTURAL_DETAILS_OPTIONS[key];
        const field = details[key];
        const isVision = field.source === "vision";
        return (
          <div key={key}>
            <div className="flex items-center gap-xs mb-xs">
              <p className="text-xs font-medium text-text-default">{label}</p>
              {isVision && field.value != null && (
                <VisionBadge confidence={field.confidence} />
              )}
            </div>
            <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-xs">
              {options.map((opt) => {
                const active = field.value === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => handleSingleToggle(key, opt)}
                    className={`
                      inline-flex items-center px-sm py-xs rounded-full text-xs font-medium border transition-colors duration-150
                      min-h-[36px]
                      focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
                      ${
                        active
                          ? "bg-interactive-primary text-text-inverse border-interactive-primary"
                          : "bg-bg-card text-text-default border-border-default hover:border-text-muted"
                      }
                    `}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Particularités multi-select */}
      <div>
        <div className="flex items-center gap-xs mb-xs">
          <p className="text-xs font-medium text-text-default">Particularités</p>
          {details.specifics.some((s) => s.source === "vision") && (
            <VisionBadge />
          )}
        </div>
        <div
          role="group"
          aria-label="Particularités de la pièce"
          className="flex flex-wrap gap-xs"
        >
          {ARCHITECTURAL_DETAILS_OPTIONS.specifics.map((opt) => {
            const active = details.specifics.some((s) => s.value === opt);
            return (
              <button
                key={opt}
                type="button"
                aria-pressed={active}
                onClick={() => handleSpecificToggle(opt)}
                className={`
                  inline-flex items-center px-sm py-xs rounded-full text-xs font-medium border transition-colors duration-150
                  min-h-[36px]
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
                  ${
                    active
                      ? "bg-interactive-primary text-text-inverse border-interactive-primary"
                      : "bg-bg-card text-text-default border-border-default hover:border-text-muted"
                  }
                `}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
