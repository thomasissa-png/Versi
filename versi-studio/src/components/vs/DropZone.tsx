/**
 * DropZone — Zone de drag-and-drop pour les plans
 *
 * Accepte PDF, PNG, JPG, WEBP. Max 20 Mo par fichier.
 * 5 états UI : défaut (zone vide), drag-over, loading, erreur, succès.
 */

"use client";

import { useState, useRef, useCallback, type DragEvent } from "react";
import {
  MAX_FILE_SIZE_BYTES,
  ACCEPTED_MIME_TYPES,
} from "@/lib/vs/types";

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export default function DropZone({ onFilesSelected, disabled = false }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback((files: File[]): File[] => {
    const valid: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (
        !ACCEPTED_MIME_TYPES.includes(
          file.type as (typeof ACCEPTED_MIME_TYPES)[number]
        )
      ) {
        errors.push(
          `${file.name} : format non supporté. Utilisez PDF, PNG, JPG ou WEBP.`
        );
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push(
          `${file.name} : taille supérieure à 20 Mo.`
        );
        continue;
      }
      valid.push(file);
    }

    if (errors.length > 0) {
      setValidationError(errors.join(" "));
    } else {
      setValidationError(null);
    }

    return valid;
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      const valid = validateFiles(files);
      if (valid.length > 0) {
        onFilesSelected(valid);
      }
    },
    [disabled, onFilesSelected, validateFiles]
  );

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const valid = validateFiles(files);
      if (valid.length > 0) {
        onFilesSelected(valid);
      }
      // Reset pour permettre de re-sélectionner le même fichier
      e.target.value = "";
    },
    [onFilesSelected, validateFiles]
  );

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Zone de dépôt de fichiers. Cliquez ou glissez-déposez vos plans."
        className={`
          relative border-2 border-dashed rounded-lg p-4xl
          flex flex-col items-center justify-center gap-md
          cursor-pointer transition-all duration-200
          min-h-[200px]
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          ${
            isDragOver
              ? "border-interactive-primary bg-interactive-primary/5"
              : "border-border-default hover:border-gris-pierre/50 bg-bg-card"
          }
        `}
      >
        {/* Icône */}
        <div
          className={`
            w-12 h-12 rounded-full flex items-center justify-center
            transition-colors duration-200
            ${isDragOver ? "bg-interactive-primary/10" : "bg-bg-default"}
          `}
        >
          <svg
            className={`w-6 h-6 ${isDragOver ? "text-interactive-primary" : "text-text-muted"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>

        {/* Texte */}
        <div className="text-center">
          <p className="text-sm text-text-default">
            {isDragOver
              ? "Relâchez pour déposer"
              : "Déposez vos plans ici"}
          </p>
          <p className="text-xs text-text-muted mt-xs">
            PDF, JPG, PNG — jusqu'à 20 Mo par fichier
          </p>
        </div>

        {/* Bouton parcourir */}
        <span className="text-xs text-text-muted underline">
          ou parcourir vos fichiers
        </span>
      </div>

      {/* Input caché */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        onChange={handleInputChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Erreur de validation */}
      {validationError && (
        <div className="mt-md bg-error/10 border border-error/20 rounded-md p-md text-xs text-error">
          {validationError}
        </div>
      )}
    </div>
  );
}
