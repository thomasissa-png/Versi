/**
 * StyleGrid — Grille de sélection des 12 styles de décoration
 *
 * Carte par style avec nom. Style sélectionné = border interactive-primary 2px.
 * Pas de preview image en V1.
 */

"use client";

import { STYLES, type StyleId } from "@/lib/vs/styles";

interface StyleGridProps {
  selectedStyleId: StyleId | null;
  onSelect: (styleId: StyleId) => void;
  disabled?: boolean;
}

const STYLE_IDS = Object.keys(STYLES) as StyleId[];

export default function StyleGrid({
  selectedStyleId,
  onSelect,
  disabled = false,
}: StyleGridProps) {
  return (
    <div className="grid grid-cols-3 gap-md">
      {STYLE_IDS.map((styleId) => {
        const style = STYLES[styleId];
        const isSelected = styleId === selectedStyleId;

        return (
          <button
            key={styleId}
            type="button"
            onClick={() => onSelect(styleId)}
            disabled={disabled}
            aria-pressed={isSelected}
            className={`
              group relative flex flex-col items-center justify-center
              p-lg rounded-lg transition-all duration-200
              ${
                isSelected
                  ? "border-2 border-interactive-primary bg-bg-card shadow-sm"
                  : "border border-border-default bg-bg-card hover:border-interactive-primary hover:shadow-sm"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary active:opacity-80
            `}
          >
            {/* Icône décorative placeholder */}
            <div
              className={`
                w-10 h-10 rounded-md mb-sm flex items-center justify-center
                ${isSelected ? "bg-interactive-primary text-text-inverse" : "bg-bg-default text-text-muted"}
                transition-colors duration-200
              `}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                />
              </svg>
            </div>

            {/* Nom du style */}
            <span
              className={`
                text-sm font-medium text-center
                ${isSelected ? "text-text-default" : "text-text-muted group-hover:text-text-default"}
                transition-colors duration-200
              `}
            >
              {style.name}
            </span>

            {/* Indicateur de sélection */}
            {isSelected && (
              <div className="absolute top-sm right-sm">
                <svg
                  className="w-4 h-4 text-interactive-primary"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
