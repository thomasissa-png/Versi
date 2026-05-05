/**
 * RoomStylePicker — Sélecteur de style PAR PIÈCE (s32 wizard).
 *
 * Différence avec StyleGrid (legacy projet) :
 *  - Sélection unique persistée par pièce (PATCH /api/vs/rooms/:id { style_id })
 *  - Layout responsive grille 2/3/4 colonnes (mobile/tablet/desktop)
 *  - Preview courte (nom + hint) sans illustration (cohérent avec calibration
 *    "pas d'icônes Maison génériques", règle s32 brief)
 */

"use client";

import { useState, useCallback } from "react";
import { STYLES, type StyleId } from "@/lib/vs/styles";

export interface RoomStylePickerProps {
  /** Style courant (null si pas encore choisi). */
  selectedStyleId: StyleId | null;
  /** Callback : sélection d'un style. Le parent fait le PATCH API. */
  onSelect: (id: StyleId) => Promise<void> | void;
  /** Désactive les interactions pendant un PATCH. */
  isPersisting?: boolean;
}

const STYLE_ORDER: StyleId[] = [
  "scandinave",
  "industriel",
  "moderne",
  "boheme",
  "classique",
  "minimaliste",
  "art-deco",
  "tropical",
  "wabi-sabi",
  "mid-century",
  "cottagecore",
  "japandi",
];

/**
 * D1 — bandeau couleur catégorielle pour différencier visuellement les 12
 * styles. Mapping local pour rester focused (pas de modif de la config STYLES
 * partagée). Couleurs choisies cohérentes avec la palette sobre Versi.
 */
const STYLE_COLORS: Record<StyleId, string> = {
  scandinave: "#A3B5C9", // bleu-gris pâle
  industriel: "#3D3D3D", // anthracite
  moderne: "#0B0B0B", // noir
  boheme: "#C8956D", // terracotta
  classique: "#8B7355", // taupe
  minimaliste: "#FFFFFF", // blanc (traité spécial avec border)
  "art-deco": "#C9A55C", // or pâle
  tropical: "#5A8060", // vert sauge
  "wabi-sabi": "#A89F88", // lin
  "mid-century": "#9C5933", // cuivre
  cottagecore: "#D4B896", // beige doré
  japandi: "#7B8576", // vert kaki sombre
};

export default function RoomStylePicker({
  selectedStyleId,
  onSelect,
  isPersisting = false,
}: RoomStylePickerProps) {
  const [pendingId, setPendingId] = useState<StyleId | null>(null);

  const handleClick = useCallback(
    async (id: StyleId) => {
      if (isPersisting) return;
      if (id === selectedStyleId) return;
      setPendingId(id);
      try {
        await onSelect(id);
      } finally {
        setPendingId(null);
      }
    },
    [isPersisting, selectedStyleId, onSelect]
  );

  return (
    <div data-testid="room-style-picker" className="flex flex-col gap-sm">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm uppercase tracking-wide font-semibold text-text-default">
          Style de cette pièce
        </h3>
        {selectedStyleId && (
          <span className="text-xs text-text-muted">
            {STYLES[selectedStyleId].name} sélectionné
          </span>
        )}
      </div>
      <div
        role="radiogroup"
        aria-label="Style de décoration de la pièce"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-sm"
      >
        {STYLE_ORDER.map((id) => {
          const style = STYLES[id];
          const isSelected = id === selectedStyleId;
          const isPending = id === pendingId;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleClick(id)}
              disabled={isPersisting}
              data-testid={`room-style-option-${id}`}
              className={[
                "text-left rounded-md border min-h-[68px] flex flex-col transition-colors overflow-hidden",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary",
                isSelected
                  ? "border-interactive-primary bg-interactive-primary/5 ring-2 ring-interactive-primary/30"
                  : "border-border-default bg-bg-card hover:border-interactive-primary/60",
                isPersisting ? "opacity-60 cursor-wait" : "cursor-pointer",
              ].join(" ")}
            >
              {/* D1 — bandeau couleur catégorielle 4px (border interne pour le blanc) */}
              <div
                className={[
                  "h-[4px] w-full",
                  id === "minimaliste"
                    ? "border-b border-border-default"
                    : "",
                ].join(" ")}
                style={{ backgroundColor: STYLE_COLORS[id] }}
                aria-hidden="true"
              />
              <div className="flex flex-col gap-2xs p-sm flex-1">
              <div className="flex items-center justify-between gap-xs">
                <span className="font-semibold text-sm text-text-default">
                  {style.name}
                </span>
                {isSelected && (
                  <svg
                    className="w-4 h-4 text-interactive-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
                {isPending && (
                  <span
                    className="inline-block w-3 h-3 border-2 border-border-default border-t-interactive-primary rounded-full animate-spin"
                    aria-hidden="true"
                  />
                )}
              </div>
              <span className="text-xs text-text-muted leading-snug line-clamp-2">
                {style.prompt_hint}
              </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
