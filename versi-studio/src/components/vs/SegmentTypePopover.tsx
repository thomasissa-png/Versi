/**
 * SegmentTypePopover — popover inline pour annoter un segment du polygone.
 *
 * Affiché en mode annotating quand l'utilisateur clique sur une arête.
 * 6 boutons (wall/door/window/bay_window/opening/flexible) + bouton fermer.
 *
 * Positionnement : `screenX` / `screenY` = position absolue dans le container
 * canvas (le parent gère l'overflow et le viewport).
 *
 * s32 (autopilot Thomas) — Feature B annotations sémantiques.
 */

"use client";

import { useEffect, useRef } from "react";
import type { VsRoomSegmentType } from "@/lib/vs/types";
import { SEGMENT_TYPE_LABELS } from "@/lib/vs/ui/segment-render";

interface SegmentTypePopoverProps {
  /** Position dans le container canvas (px). */
  x: number;
  y: number;
  /** Type courant du segment (sera prébouton actif). */
  currentType: VsRoomSegmentType;
  onSelect: (type: VsRoomSegmentType) => void;
  onClose: () => void;
}

const ITEMS: Array<{ type: VsRoomSegmentType; icon: string }> = [
  { type: "wall", icon: "▮" },
  { type: "door", icon: "⌐" },
  { type: "window", icon: "▦" },
  { type: "bay_window", icon: "◫" },
  { type: "opening", icon: "○" },
  { type: "flexible", icon: "┄" },
];

export default function SegmentTypePopover({
  x,
  y,
  currentType,
  onSelect,
  onClose,
}: SegmentTypePopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Fermeture par Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Focus trap : focus le 1er bouton à l'ouverture
  useEffect(() => {
    const first = ref.current?.querySelector<HTMLButtonElement>("button[data-type]");
    first?.focus();
  }, []);

  // Évite que le popover sorte du container : on shift à gauche/haut si besoin
  // Sinon on positionne avec translate négatif (centré horizontalement, au-dessus
  // du clic). Le parent peut ajouter un wrapper en `position: relative`.
  const POPOVER_W = 220;
  const POPOVER_H = 220; // hauteur estimée
  const offsetX = Math.max(8, x - POPOVER_W / 2);
  const offsetY = Math.max(8, y - POPOVER_H - 12);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Choisir le type de segment"
      data-testid="segment-type-popover"
      className="absolute z-30 w-[220px] bg-bg-card border border-border-default rounded-md shadow-md p-sm flex flex-col gap-xs"
      style={{ left: `${offsetX}px`, top: `${offsetY}px` }}
      onMouseDown={(e) => {
        // Empêche le clic sur le popover de re-déclencher un placement canvas
        e.stopPropagation();
      }}
    >
      <div className="flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-wide text-text-muted">
          Type de segment
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="text-text-muted hover:text-text-default text-xs px-xs"
        >
          ✕
        </button>
      </div>
      <ul className="flex flex-col gap-[2px]">
        {ITEMS.map((it) => {
          const isActive = it.type === currentType;
          return (
            <li key={it.type}>
              <button
                type="button"
                data-type={it.type}
                data-testid={`segment-type-${it.type}`}
                onClick={() => onSelect(it.type)}
                className={[
                  "w-full flex items-center gap-sm text-sm px-sm py-xs rounded-md text-left transition-colors min-h-[36px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary",
                  isActive
                    ? "bg-interactive-primary text-text-inverse"
                    : "text-text-default hover:bg-bg-default",
                ].join(" ")}
              >
                <span aria-hidden className="font-mono text-base w-4 text-center">
                  {it.icon}
                </span>
                <span>{SEGMENT_TYPE_LABELS[it.type]}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
