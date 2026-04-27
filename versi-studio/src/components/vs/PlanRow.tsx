/**
 * PlanRow — Ligne compacte d'un plan déposé (refonte s27 pattern liste)
 *
 * Layout horizontal 48px :
 *   [grip drag] [icône type PDF/IMG] [nom éditable] [badge étage cliquable]
 *   [boutons ↑/↓ mobile fallback] [supprimer]
 *
 * Touch targets ≥44px (mobile : padding row 6px → hauteur effective 48px).
 * Drag-and-drop natif HTML5 — aucune dépendance npm.
 *
 * Étage auto-calculé par position dans la liste (parent gère). Override possible
 * via <select> au clic sur le badge (Cave -2 / Cave -1 / RDC / R+1 … / Grenier).
 */

"use client";

import { useState, useRef, useEffect } from "react";
import type { VsPlan } from "@/lib/vs/types";

// ─── Mapping floor_number → label affiché ──────────────────────────

export function floorLabel(floor: number): string {
  if (floor === -2) return "Cave -2";
  if (floor === -1) return "Cave -1";
  if (floor === 0) return "RDC";
  if (floor === 99) return "Grenier";
  if (floor > 0) return `R+${floor}`;
  return `Étage ${floor}`;
}

const FLOOR_OPTIONS: Array<{ value: number; label: string }> = [
  { value: -2, label: "Cave -2" },
  { value: -1, label: "Cave -1" },
  { value: 0, label: "RDC" },
  ...Array.from({ length: 10 }, (_, i) => ({
    value: i + 1,
    label: `R+${i + 1}`,
  })),
  { value: 99, label: "Grenier" },
];

// ─── Props ─────────────────────────────────────────────────────────

interface PlanRowProps {
  plan: VsPlan;
  index: number;
  total: number;
  onDelete: (planId: string) => void;
  onFloorChange: (planId: string, floor: number) => void;
  onRename: (planId: string, name: string) => void;
  onMove: (planId: string, direction: "up" | "down") => void;
  onPreview: (planId: string) => void;
  onDragStart: (planId: string) => void;
  onDragOver: (planId: string) => void;
  onDrop: (planId: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDragOver: boolean;
  deleting?: boolean;
}

export default function PlanRow({
  plan,
  index,
  total,
  onDelete,
  onFloorChange,
  onRename,
  onMove,
  onPreview,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  isDragOver,
  deleting = false,
}: PlanRowProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(plan.original_filename || "Plan");
  const [prevFilename, setPrevFilename] = useState(plan.original_filename);
  const [editingFloor, setEditingFloor] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Resync nameInput quand le parent rollback original_filename (PATCH erreur).
  // Pattern React docs "Storing info from previous renders" (compliant React Compiler).
  if (plan.original_filename !== prevFilename) {
    setPrevFilename(plan.original_filename);
    setNameInput(plan.original_filename || "Plan");
  }

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const isImage = plan.mime_type.startsWith("image/");

  const commitName = () => {
    const next = nameInput.trim();
    if (next && next !== plan.original_filename) {
      onRename(plan.id, next);
    } else {
      setNameInput(plan.original_filename || "Plan");
    }
    setEditingName(false);
  };

  return (
    <li
      draggable={!editingName && !editingFloor && !deleting}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(plan.id);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver(plan.id);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(plan.id);
      }}
      onDragEnd={onDragEnd}
      className={`
        flex items-center gap-sm px-sm py-2xs
        bg-bg-card border border-border-default rounded-md
        transition-all duration-150 motion-reduce:transition-none
        ${isDragging ? "opacity-40" : ""}
        ${isDragOver ? "border-interactive-primary border-2" : ""}
        ${deleting ? "opacity-50" : ""}
      `}
      style={{ minHeight: 48 }}
      aria-label={`Plan ${index + 1} sur ${total} — ${plan.original_filename || "sans nom"}`}
    >
      {/* Grip handle (drag) */}
      <span
        className="flex-shrink-0 inline-flex items-center justify-center min-h-[44px] min-w-[24px] text-text-muted cursor-grab active:cursor-grabbing"
        aria-hidden="true"
        title="Glisser pour réordonner"
      >
        <svg className="w-3 h-4" viewBox="0 0 8 14" fill="currentColor">
          <circle cx="2" cy="2" r="1" />
          <circle cx="6" cy="2" r="1" />
          <circle cx="2" cy="7" r="1" />
          <circle cx="6" cy="7" r="1" />
          <circle cx="2" cy="12" r="1" />
          <circle cx="6" cy="12" r="1" />
        </svg>
      </span>

      {/* Icône type (clic = preview lightbox) */}
      <button
        type="button"
        onClick={() => onPreview(plan.id)}
        className={`
          flex-shrink-0 inline-flex items-center justify-center
          min-h-[44px] min-w-[44px] rounded
          ${isImage ? "text-info" : "text-text-muted"}
          hover:bg-bg-default
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
        `}
        aria-label={`Prévisualiser ${plan.original_filename || "ce plan"}`}
        title={isImage ? "Image" : "PDF"}
      >
        {isImage ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        )}
      </button>

      {/* Nom éditable inline */}
      <div className="flex-1 min-w-0">
        {editingName ? (
          <input
            ref={nameInputRef}
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") {
                setNameInput(plan.original_filename || "Plan");
                setEditingName(false);
              }
            }}
            className="w-full px-xs py-2xs rounded text-sm border border-interactive-primary bg-bg-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
            aria-label="Renommer le plan"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingName(true)}
            className="w-full text-left text-sm text-text-default truncate hover:text-interactive-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary rounded px-xs py-2xs"
            title={`${plan.original_filename || "Plan"} (cliquer pour renommer)`}
          >
            {plan.original_filename || "Plan sans nom"}
          </button>
        )}
      </div>

      {/* Badge étage cliquable */}
      {editingFloor ? (
        <select
          autoFocus
          value={plan.floor_number}
          onChange={(e) => {
            onFloorChange(plan.id, parseInt(e.target.value, 10));
            setEditingFloor(false);
          }}
          onBlur={() => setEditingFloor(false)}
          className="flex-shrink-0 min-h-[44px] px-sm rounded text-xs font-medium border border-interactive-primary bg-bg-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
          aria-label="Choisir l'étage"
        >
          {FLOOR_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <button
          type="button"
          onClick={() => setEditingFloor(true)}
          className="flex-shrink-0 min-h-[44px] inline-flex items-center px-sm rounded text-xs font-medium bg-bg-default border border-border-default text-text-default hover:border-interactive-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary tabular-nums"
          aria-label={`Étage : ${floorLabel(plan.floor_number)} — cliquer pour modifier`}
          title="Modifier l'étage"
        >
          {floorLabel(plan.floor_number)}
        </button>
      )}

      {/* Boutons ↑/↓ (fallback drag-and-drop sur mobile) */}
      <div className="flex-shrink-0 flex md:hidden items-center">
        <button
          type="button"
          onClick={() => onMove(plan.id, "up")}
          disabled={index === 0 || deleting}
          className="min-h-[44px] min-w-[36px] inline-flex items-center justify-center text-text-muted hover:text-text-default disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary rounded"
          aria-label="Monter ce plan dans la liste"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onMove(plan.id, "down")}
          disabled={index === total - 1 || deleting}
          className="min-h-[44px] min-w-[36px] inline-flex items-center justify-center text-text-muted hover:text-text-default disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary rounded"
          aria-label="Descendre ce plan dans la liste"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>

      {/* Supprimer */}
      <button
        type="button"
        onClick={() => onDelete(plan.id)}
        disabled={deleting}
        className="flex-shrink-0 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded text-text-muted hover:text-error transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={`Supprimer ${plan.original_filename || "ce plan"}`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </button>
    </li>
  );
}
