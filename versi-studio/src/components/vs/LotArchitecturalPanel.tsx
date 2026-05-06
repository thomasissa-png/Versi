/**
 * LotArchitecturalPanel — Sous-panneau profil architectural du lot sélectionné (Étape 2)
 *
 * 5 champs marchand (Thomas s32 prod feedback) :
 *   - Hauteur sous plafond
 *   - Orientation
 *   - État général
 *   - Niveau visé
 *   - Public cible
 *
 * UX :
 *   - Section repliable (collapsed par défaut), header cliquable
 *   - Pills horizontales (radio-group sémantique) pour chaque champ
 *   - Clic sur pill active = désélection (toggle off) → null
 *   - Optimistic update + PATCH /api/vs/lots/[id]
 *   - Saisie marchand uniquement (pas de Vision sur le profil lot)
 *
 * Source de vérité : `lot.architectural_profile`. Si undefined → tous null.
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import {
  ARCHITECTURAL_PROFILE_OPTIONS,
  emptyArchitecturalProfile,
  type ArchitecturalProfile,
  type VsLot,
} from "@/lib/vs/types";

interface Props {
  lot: VsLot;
  /** Optimistic update local — l'orchestrateur parent gère le PATCH. */
  onChange: (next: ArchitecturalProfile) => void;
}

const FIELD_LABELS: Record<keyof ArchitecturalProfile, string> = {
  ceiling_height: "Hauteur sous plafond",
  orientation: "Orientation",
  general_state: "État général",
  target_level: "Niveau visé",
  target_audience: "Public cible",
};

const FIELD_ORDER: Array<keyof ArchitecturalProfile> = [
  "ceiling_height",
  "orientation",
  "general_state",
  "target_level",
  "target_audience",
];

export default function LotArchitecturalPanel({ lot, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const profile: ArchitecturalProfile = useMemo(
    () => lot.architectural_profile ?? emptyArchitecturalProfile(),
    [lot.architectural_profile]
  );

  const filledCount = useMemo(
    () => FIELD_ORDER.filter((k) => profile[k] != null).length,
    [profile]
  );

  const handlePillToggle = useCallback(
    (field: keyof ArchitecturalProfile, value: string) => {
      const current = profile[field];
      const next: ArchitecturalProfile = {
        ...profile,
        [field]: current === value ? null : value,
      };
      onChange(next);
    },
    [profile, onChange]
  );

  return (
    <section
      className="border border-[var(--color-border-default)] rounded-md bg-white"
      aria-labelledby={`arch-profile-heading-${lot.id}`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`arch-profile-body-${lot.id}`}
        className="w-full flex items-center justify-between px-md py-sm text-left rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)] min-h-[44px]"
      >
        <div className="flex flex-col">
          <h3
            id={`arch-profile-heading-${lot.id}`}
            className="text-sm font-medium text-[var(--color-text-default)]"
          >
            Profil architectural
          </h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            {filledCount === 0
              ? `Renseignez le profil de ${lot.name} pour des visuels plus précis`
              : `${filledCount} / ${FIELD_ORDER.length} champ${filledCount > 1 ? "s" : ""} renseigné${filledCount > 1 ? "s" : ""}`}
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          id={`arch-profile-body-${lot.id}`}
          className="px-md pb-md pt-2xs flex flex-col gap-md border-t border-[var(--color-border-default)]"
        >
          {FIELD_ORDER.map((field) => {
            const options = ARCHITECTURAL_PROFILE_OPTIONS[field];
            const current = profile[field];
            return (
              <div key={field}>
                <p className="text-xs font-medium text-[var(--color-text-default)] mb-xs">
                  {FIELD_LABELS[field]}
                </p>
                <div role="radiogroup" aria-label={FIELD_LABELS[field]} className="flex flex-wrap gap-xs">
                  {options.map((opt) => {
                    const active = current === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => handlePillToggle(field, opt)}
                        className={`
                          inline-flex items-center px-sm py-xs rounded-full text-xs font-medium border transition-colors duration-150
                          min-h-[36px]
                          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)]
                          ${
                            active
                              ? "bg-[var(--color-interactive-primary)] text-[var(--color-text-inverse)] border-[var(--color-interactive-primary)]"
                              : "bg-white text-[var(--color-text-default)] border-[var(--color-border-default)] hover:border-[var(--color-text-muted)]"
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
          <p className="text-[11px] text-[var(--color-text-muted)] italic">
            Ces informations seront intégrées au brief de génération IA pour produire des visuels cohérents avec votre lot.
          </p>
        </div>
      )}
    </section>
  );
}
