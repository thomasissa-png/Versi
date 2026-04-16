/**
 * LotPanel — Panneau latéral liste des lots
 *
 * Affiche la liste des lots avec : nom (éditable inline), surface estimée, couleur.
 * Boutons : ajouter un lot, supprimer un lot, continuer vers les pièces.
 *
 * Rendu : Client Component — interactions formulaires inline.
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { VsLot } from "@/lib/vs/types";
import { getLotColor } from "@/lib/vs/types";

// ─── Types ────────────────────────────────────────────────────────

interface LotPanelProps {
  lots: VsLot[];
  selectedLotId: string | null;
  onSelectLot: (lotId: string | null) => void;
  onRenameLot: (lotId: string, name: string) => void;
  onDeleteLot: (lotId: string) => void;
  onAddLot: () => void;
  onValidate: () => void;
  hasOverlap: boolean;
  validating: boolean;
  lotIndexMap: Map<string, number>;
  validationSuccess?: boolean;
  // Mode dessin polygone (versi-s20 phase 2)
  onStartDrawingPolygon?: () => void;
  drawingPolygon?: boolean;
  onCancelDrawingPolygon?: () => void;
}

// ─── Composant LotCard ──────────────────────────────────────────

function LotCard({
  lot,
  index,
  isSelected,
  onSelect,
  onRename,
  onDelete,
}: {
  lot: VsLot;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(lot.name);
  const [prevLotName, setPrevLotName] = useState(lot.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const color = getLotColor(index);

  // Resync editValue quand le nom du lot change côté parent (optimistic update rollback).
  // Pattern React docs "Storing info from previous renders" — setState pendant render
  // (accepté par React Compiler, pas de cascading renders).
  if (lot.name !== prevLotName) {
    setPrevLotName(lot.name);
    setEditValue(lot.name);
  }

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSubmitRename = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed.length > 0 && trimmed !== lot.name) {
      onRename(trimmed);
    } else {
      setEditValue(lot.name);
    }
    setEditing(false);
  }, [editValue, lot.name, onRename]);

  const surfaceLabel =
    lot.surface_m2 != null ? `${Number(lot.surface_m2).toFixed(0)} m²` : "Surface non renseignée";

  return (
    <div
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Sélectionner ${lot.name}`}
      className={`
        group flex items-start gap-sm p-md rounded-md cursor-pointer transition-colors duration-150
        ${isSelected ? "bg-[var(--color-background-default)] border border-[var(--color-border-default)]" : "hover:bg-[var(--color-background-default)]"}
      `}
    >
      {/* Pastille couleur */}
      <div
        className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSubmitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmitRename();
              if (e.key === "Escape") {
                setEditValue(lot.name);
                setEditing(false);
              }
            }}
            className="w-full text-sm font-medium bg-white border border-[var(--color-border-default)] rounded px-sm py-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)] focus:outline-none"
            aria-label="Renommer le lot"
          />
        ) : (
          <div className="flex items-center gap-xs">
            <button
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              className="text-sm font-medium text-[var(--color-text-default)] truncate block text-left flex-1 min-w-0"
              title="Double-cliquez pour renommer"
            >
              {lot.name}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 ml-xs inline-flex p-2xs rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-default)] transition-opacity"
              aria-label={`Renommer ${lot.name}`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        )}
        <p className="text-xs text-[var(--color-text-muted)] mt-2xs">
          {surfaceLabel}
          {lot.source === "manual" && (
            <span className="ml-sm text-[var(--color-text-muted)]">
              (manuel)
            </span>
          )}
        </p>
      </div>

      {/* Bouton supprimer */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-sm md:p-xs rounded text-[var(--color-text-muted)] hover:text-[var(--color-error-strong)] hover:bg-[var(--color-error-bg)] transition-all duration-150 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
        aria-label={`Supprimer ${lot.name}`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────

export default function LotPanel({
  lots,
  selectedLotId,
  onSelectLot,
  onRenameLot,
  onDeleteLot,
  onAddLot,
  onValidate,
  hasOverlap,
  validating,
  lotIndexMap,
  validationSuccess = false,
  onStartDrawingPolygon,
  drawingPolygon = false,
  onCancelDrawingPolygon,
}: LotPanelProps) {
  const canValidate = lots.length > 0 && !hasOverlap && !validating;

  return (
    <aside className="w-80 flex-shrink-0 flex flex-col bg-white border-l border-[var(--color-border-default)] h-full">
      {/* En-tête */}
      <div className="px-lg py-md border-b border-[var(--color-border-default)]">
        <h2 className="text-sm font-medium text-[var(--color-text-default)]">
          {lots.length} lot{lots.length !== 1 ? "s" : ""}
        </h2>
      </div>

      {/* Liste des lots */}
      <div className="flex-1 overflow-y-auto px-sm py-sm">
        {lots.length === 0 ? (
          <div className="text-center py-2xl px-md">
            <p className="text-sm text-[var(--color-text-muted)]">
              Aucun lot détecté — utilisez le bouton « Ajouter un lot » ci-dessous.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2xs">
            {lots.map((lot) => (
              <LotCard
                key={lot.id}
                lot={lot}
                index={lotIndexMap.get(lot.id) ?? 0}
                isSelected={lot.id === selectedLotId}
                onSelect={() => onSelectLot(lot.id)}
                onRename={(name) => onRenameLot(lot.id, name)}
                onDelete={() => onDeleteLot(lot.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-lg py-md border-t border-[var(--color-border-default)] flex flex-col gap-sm">
        {/* Bandeau mode dessin actif (versi-s20) */}
        {drawingPolygon && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-md bg-[var(--color-interactive-primary)]/10 border border-[var(--color-interactive-primary)] px-md py-sm text-xs text-[var(--color-text-default)] flex flex-col gap-xs"
          >
            <p className="font-medium">Mode dessin polygone actif</p>
            <p className="text-[var(--color-text-muted)]">
              Cliquez pour ajouter un sommet, double-cliquez pour fermer la forme,
              Échap pour annuler, Retour arrière pour supprimer le dernier point.
            </p>
            <button
              type="button"
              onClick={onCancelDrawingPolygon}
              className="self-start mt-xs px-sm py-2xs rounded text-xs font-medium underline text-[var(--color-text-default)] hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)] min-h-[44px]"
            >
              Annuler le tracé
            </button>
          </div>
        )}

        {/* Bouton ajouter */}
        <button
          onClick={onAddLot}
          disabled={drawingPolygon}
          className="
            w-full flex items-center justify-center gap-sm
            px-md py-sm rounded-md text-sm font-medium
            border border-dashed border-[var(--color-border-default)]
            text-[var(--color-text-muted)]
            hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-default)]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)]
          "
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
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Ajouter un lot
        </button>

        {/* Bouton dessiner un polygone (versi-s20 phase 2) */}
        {onStartDrawingPolygon && (
          <button
            onClick={onStartDrawingPolygon}
            disabled={drawingPolygon}
            className="
              w-full flex items-center justify-center gap-sm
              px-md py-sm rounded-md text-sm font-medium
              border border-dashed border-[var(--color-border-default)]
              text-[var(--color-text-muted)]
              hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-default)]
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-150
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)]
              min-h-[44px]
            "
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
                d="M5 4l7 5 7-5-3 9-4 7-4-7-3-9z"
              />
            </svg>
            Dessiner un polygone
          </button>
        )}

        {/* Bouton valider */}
        <button
          onClick={onValidate}
          disabled={!canValidate}
          className="
            w-full px-md py-sm rounded-md text-sm font-medium
            bg-[var(--color-interactive-primary)] text-[var(--color-text-inverse)]
            hover:opacity-90
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-150
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)]
          "
        >
          {validating ? (
            <span className="flex items-center justify-center gap-sm">
              <span className="inline-block w-4 h-4 border-2 border-[var(--color-text-inverse)]/30 border-t-[var(--color-text-inverse)] rounded-full animate-spin" />
              Validation...
            </span>
          ) : (
            "Continuer vers les pièces"
          )}
        </button>

        {/* Message d'aide si aucun lot (versi-s20) */}
        {lots.length === 0 && (
          <p className="text-xs text-[var(--color-text-muted)] text-center">
            Ajoutez au moins un lot pour continuer.
          </p>
        )}

        {/* Message d'avertissement chevauchement */}
        {hasOverlap && lots.length > 0 && (
          <p className="text-xs text-[var(--color-error-strong)] text-center">
            Corrigez les chevauchements avant de continuer.
          </p>
        )}

        {validationSuccess && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-center gap-sm text-xs text-[var(--color-success,#16A34A)] text-center"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Lots enregistrés
          </div>
        )}
      </div>
    </aside>
  );
}
