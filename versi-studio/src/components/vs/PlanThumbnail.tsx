/**
 * PlanThumbnail — Miniature d'un plan uploadé
 *
 * Affiche le preview (image) ou une icône (PDF), le nom du fichier,
 * le numéro d'étage, et un bouton de suppression.
 */

"use client";

import { useEffect, useState } from "react";
import type { VsPlan } from "@/lib/vs/types";

interface PlanThumbnailProps {
  plan: VsPlan;
  onDelete: (planId: string) => void;
  onFloorChange: (planId: string, floor: number) => void;
  deleting?: boolean;
}

export default function PlanThumbnail({
  plan,
  onDelete,
  onFloorChange,
  deleting = false,
}: PlanThumbnailProps) {
  const [floorInput, setFloorInput] = useState(String(plan.floor_number));

  // BUG-1 fix (versi-s19) : resync floorInput quand le parent rollback floor_number
  // après un PATCH /plans/:id en erreur. Sans cet effect, l'input visuel reste
  // sur la valeur saisie alors que la valeur métier est revenue à l'origine.
  useEffect(() => {
    setFloorInput(String(plan.floor_number));
  }, [plan.floor_number]);

  const isImage = plan.mime_type.startsWith("image/");

  const handleFloorBlur = () => {
    const value = parseInt(floorInput, 10);
    if (!isNaN(value) && value !== plan.floor_number) {
      onFloorChange(plan.id, value);
    } else {
      setFloorInput(String(plan.floor_number));
    }
  };

  return (
    <div
      className={`
        bg-bg-card border border-border-default rounded-lg overflow-hidden
        transition-opacity duration-200
        ${deleting ? "opacity-50" : ""}
      `}
    >
      {/* Preview */}
      <div className="aspect-[4/3] bg-bg-default flex items-center justify-center overflow-hidden">
        {isImage ? (
          <img
            src={`/api/vs/files?path=${encodeURIComponent(plan.file_path)}`}
            alt={plan.original_filename || "Plan"}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-sm text-text-muted">
            <svg
              className="w-10 h-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <span className="text-xs">PDF</span>
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="p-md">
        <p
          className="text-xs text-text-default truncate"
          title={plan.original_filename || "Plan"}
        >
          {plan.original_filename || "Plan sans nom"}
        </p>

        <div className="flex items-center justify-between mt-sm">
          {/* Étage */}
          <div className="flex items-center gap-xs">
            <label
              htmlFor={`floor-${plan.id}`}
              className="text-xs text-text-muted"
            >
              Étage
            </label>
            <input
              id={`floor-${plan.id}`}
              type="number"
              value={floorInput}
              onChange={(e) => setFloorInput(e.target.value)}
              onBlur={handleFloorBlur}
              className="
                w-12 px-xs py-2xs rounded text-xs text-center
                border border-border-default bg-bg-default
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
              "
            />
          </div>

          {/* Supprimer */}
          <button
            onClick={() => onDelete(plan.id)}
            disabled={deleting}
            className="
              p-xs rounded text-text-muted hover:text-error
              min-h-[44px] min-w-[44px] inline-flex items-center justify-center
              transition-colors duration-200
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            aria-label={`Supprimer ${plan.original_filename || "ce plan"}`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
