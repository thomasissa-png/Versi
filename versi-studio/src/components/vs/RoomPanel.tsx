/**
 * RoomPanel — Panneau lateral Step 3 (identification des pieces)
 *
 * Rendu : Client Component — interactions formulaire.
 *
 * Contenu :
 * - Selecteur de lot (tabs si <= 5, dropdown sinon)
 * - Liste des pieces du lot selectionne
 * - Dropdown type par piece + surface
 * - Boutons : ajouter piece, valider lot, continuer
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { VsLot, VsRoom } from "@/lib/vs/types";
import {
  getRoomColor,
  ROOM_TYPE_DROPDOWN,
  type RoomTypeKey,
} from "@/lib/vs/styles";

// ─── Types ────────────────────────────────────────────────────────

interface RoomPanelProps {
  lots: VsLot[];
  selectedLotId: string;
  onSelectLot: (lotId: string) => void;
  rooms: VsRoom[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string | null) => void;
  onUpdateRoom: (roomId: string, updates: Partial<VsRoom>) => void;
  onAddRoom: () => void;
  onDeleteRoom: (roomId: string) => void;
  onValidateLot: () => void;
  onContinue: () => void;
  onConfirmRoom: (roomId: string) => void;
  allLotsValidated: boolean;
  isValidating: boolean;
  currentLotValidated: boolean;
  validationBlocked?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────

function getDropdownLabel(roomType: string): string {
  const found = ROOM_TYPE_DROPDOWN.find((r) => r.value === roomType);
  return found?.label ?? roomType;
}

function isLotValidated(lot: VsLot): boolean {
  return lot.status === "validated";
}

// ─── Composant ────────────────────────────────────────────────────

export default function RoomPanel({
  lots,
  selectedLotId,
  onSelectLot,
  rooms,
  selectedRoomId,
  onSelectRoom,
  onUpdateRoom,
  onAddRoom,
  onDeleteRoom,
  onValidateLot,
  onContinue,
  onConfirmRoom,
  allLotsValidated,
  isValidating,
  currentLotValidated,
  validationBlocked = false,
}: RoomPanelProps) {
  const [expandedCustom, setExpandedCustom] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const hasUntypedRooms = rooms.some(
    (r) => r.room_type === "non_identifie"
  );

  const hasUntouchedAiRooms = rooms.some(
    (r) => r.source === "ai" && !r.touched
  );

  // Scroll vers la card sélectionnée quand selectedRoomId change (CORR-B5)
  useEffect(() => {
    if (selectedRoomId && cardRefs.current[selectedRoomId]) {
      cardRefs.current[selectedRoomId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedRoomId]);

  // ─── Selecteur de lot ───────────────────────────────────────────

  const renderLotSelector = useCallback(() => {
    if (lots.length <= 5) {
      // Tabs
      return (
        <div className="flex gap-xs overflow-x-auto pb-xs" role="tablist" aria-label="Sélection du lot">
          {lots.map((lot) => {
            const isActive = lot.id === selectedLotId;
            const validated = isLotValidated(lot);
            return (
              <button
                key={lot.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelectLot(lot.id)}
                className={`
                  flex items-center gap-xs px-md py-sm rounded-md text-sm font-medium
                  whitespace-nowrap transition-colors duration-200 active:opacity-80
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
                  ${isActive
                    ? "bg-interactive-primary text-text-inverse"
                    : "bg-bg-card text-text-default border border-border-default hover:bg-bg-default"
                  }
                `}
              >
                {validated && (
                  <svg
                    className="w-3.5 h-3.5 text-success flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {lot.name}
              </button>
            );
          })}
        </div>
      );
    }

    // Dropdown pour > 5 lots
    return (
      <div>
        <label htmlFor="lot-selector" className="sr-only">
          Sélectionner un lot
        </label>
        <select
          id="lot-selector"
          value={selectedLotId}
          onChange={(e) => onSelectLot(e.target.value)}
          className="
            w-full px-md py-sm rounded-md text-sm border border-border-default
            bg-bg-card text-text-default
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
          "
        >
          {lots.map((lot) => (
            <option key={lot.id} value={lot.id}>
              {isLotValidated(lot) ? "✓ " : ""}{lot.name}
            </option>
          ))}
        </select>
      </div>
    );
  }, [lots, selectedLotId, onSelectLot]);

  // ─── Rendu d'une piece ──────────────────────────────────────────

  const renderRoom = useCallback(
    (room: VsRoom, index: number) => {
      const isSelected = room.id === selectedRoomId;
      const color = getRoomColor(room.room_type);
      const isCustomExpanded = expandedCustom === room.id;

      const isBlockedRoom =
        validationBlocked && room.room_type === "non_identifie";

      const isAiUntouched = room.source === "ai" && !room.touched;
      const isAiTouched = room.source === "ai" && room.touched;

      return (
        <div
          key={room.id}
          ref={(el) => {
            cardRefs.current[room.id] = el;
          }}
          className={`
            p-md rounded-md border transition-all duration-200 cursor-pointer active:opacity-80
            ${isBlockedRoom
              ? "border-error border-2 bg-bg-card"
              : isSelected
              ? "border-interactive-primary bg-bg-default shadow-sm"
              : "border-border-default bg-bg-card hover:border-interactive-primary/50"
            }
          `}
          onClick={() => onSelectRoom(room.id)}
          role="button"
          tabIndex={0}
          aria-label={`Pièce ${index + 1} : ${getDropdownLabel(room.room_type)}`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectRoom(room.id);
            }
          }}
        >
          {/* En-tete piece */}
          <div className="flex items-center gap-sm mb-sm">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-text-default flex-1">
              {room.name || getDropdownLabel(room.room_type)}
            </span>
            {/* Indicateur IA / Validée */}
            {isAiUntouched && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700" title="Suggestion IA — à confirmer">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                </svg>
                IA
              </span>
            )}
            {isAiTouched && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700" title="Pièce confirmée">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                OK
              </span>
            )}
            {room.surface_m2 && (
              <span className="text-xs text-text-muted">
                {Number(room.surface_m2).toFixed(0)} m²
              </span>
            )}
          </div>

          {/* Dropdown type */}
          <div className="mb-sm">
            <label
              htmlFor={`room-type-${room.id}`}
              className="sr-only"
            >
              Type de pièce
            </label>
            <select
              id={`room-type-${room.id}`}
              value={room.room_type}
              onChange={(e) => {
                const newType = e.target.value as RoomTypeKey;
                onUpdateRoom(room.id, {
                  room_type: newType,
                  custom_label: newType === "autre" ? room.custom_label : null,
                });
                if (newType === "autre") {
                  setExpandedCustom(room.id);
                } else {
                  setExpandedCustom(null);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="
                w-full px-sm py-xs rounded-md text-sm border border-border-default
                bg-bg-card text-text-default
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
              "
            >
              <option value="non_identifie" disabled>
                Sélectionnez un type
              </option>
              {ROOM_TYPE_DROPDOWN.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Champ custom_label si type = autre */}
          {(room.room_type === "autre" || isCustomExpanded) && (
            <div className="mb-sm">
              <label
                htmlFor={`room-custom-${room.id}`}
                className="sr-only"
              >
                Nom personnalisé
              </label>
              <input
                id={`room-custom-${room.id}`}
                type="text"
                value={room.custom_label || ""}
                placeholder="Nom de la pièce"
                maxLength={50}
                onChange={(e) => {
                  onUpdateRoom(room.id, { custom_label: e.target.value });
                }}
                onClick={(e) => e.stopPropagation()}
                className="
                  w-full px-sm py-xs rounded-md text-sm border border-border-default
                  bg-bg-card text-text-default placeholder:text-text-muted
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
                "
              />
            </div>
          )}

          {/* Actions : Confirmer (si IA non confirmée) + Supprimer */}
          <div className="flex items-center justify-between">
            {isAiUntouched ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirmRoom(room.id);
                }}
                className="
                  text-xs font-medium text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100
                  active:opacity-80 transition-colors duration-200
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500
                  px-sm py-2xs rounded min-h-[44px]
                "
                aria-label={`Confirmer la pièce ${getDropdownLabel(room.room_type)}`}
              >
                Confirmer
              </button>
            ) : (
              <span />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteRoom(room.id);
              }}
              className="
                text-xs text-text-muted hover:text-error active:opacity-80 transition-colors duration-200
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error
                px-xs py-2xs rounded min-h-[44px] min-w-[44px]
              "
              aria-label={`Supprimer la pièce ${getDropdownLabel(room.room_type)}`}
            >
              Supprimer
            </button>
          </div>
        </div>
      );
    },
    [selectedRoomId, expandedCustom, onSelectRoom, onUpdateRoom, onDeleteRoom, onConfirmRoom, validationBlocked]
  );

  // ─── Rendu principal ────────────────────────────────────────────

  return (
    <section className="w-full flex flex-col">
      {/* Header : sélecteur de lot + badge */}
      <div className="py-sm flex flex-wrap items-center gap-md">
        <div className="flex-1 min-w-0">
          <p className="vs-label mb-sm">Lot</p>
          {renderLotSelector()}
        </div>
        {/* Badge lot validé */}
        {currentLotValidated && (
          <div className="flex items-center gap-xs text-sm font-medium text-success">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Lot validé
          </div>
        )}
      </div>

      {/* Grille des pièces (s22 Point 4 — cards en grille au lieu de liste latérale) */}
      <div className="py-md">
        {rooms.length === 0 ? (
          <div className="text-center py-2xl">
            <p className="text-sm text-text-muted">
              L&apos;IA n&apos;a pas détecté de pièces — ajoutez-en manuellement
            </p>
            <button
              type="button"
              onClick={onAddRoom}
              className="mt-md min-h-[44px] px-md py-sm rounded-md text-sm font-medium bg-interactive-primary text-text-inverse hover:bg-interactive-hover active:opacity-80 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
            >
              Ajouter une pièce
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
            {rooms.map((room, i) => renderRoom(room, i))}
          </div>
        )}
      </div>

      {/* Actions (s22 Point 4) */}
      <div className="border-t border-border-default py-md mt-md flex flex-col gap-sm">
        {/* Ajouter une pièce */}
        <button
          onClick={onAddRoom}
          className="
            w-full px-md py-sm rounded-md text-sm font-medium min-h-[44px]
            border border-dashed border-border-default
            text-text-muted hover:text-text-default hover:border-interactive-primary active:opacity-80
            transition-colors duration-200
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
          "
        >
          + Ajouter une pièce
        </button>

        {/* Valider ce lot */}
        {!currentLotValidated && (
          <button
            onClick={onValidateLot}
            disabled={isValidating || hasUntypedRooms || hasUntouchedAiRooms || rooms.length === 0}
            aria-describedby={
              hasUntypedRooms ? "validate-lot-warning" : hasUntouchedAiRooms ? "validate-lot-ai-warning" : undefined
            }
            className="
              w-full px-md py-sm rounded-md text-sm font-medium min-h-[44px]
              bg-interactive-primary text-text-inverse
              hover:bg-interactive-hover active:opacity-80
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
            "
            title={
              hasUntypedRooms
                ? "Définissez le type de toutes les pièces avant de valider"
                : hasUntouchedAiRooms
                ? "Ajustez ou confirmez chaque pièce IA avant de valider le lot"
                : undefined
            }
          >
            {isValidating ? (
              <span className="flex items-center justify-center gap-sm">
                <span className="inline-block w-4 h-4 border-2 border-text-inverse/30 border-t-text-inverse rounded-full animate-spin" />
                Validation...
              </span>
            ) : (
              "Valider ce lot"
            )}
          </button>
        )}

        {/* Avertissement si pièces non typées */}
        {hasUntypedRooms && !currentLotValidated && (
          <p id="validate-lot-warning" className="text-xs text-warning text-center">
            Définissez le type de toutes les pièces avant de valider
          </p>
        )}

        {/* Avertissement si pièces IA non confirmées */}
        {hasUntouchedAiRooms && !hasUntypedRooms && !currentLotValidated && (
          <p id="validate-lot-ai-warning" className="text-xs text-warning text-center">
            Ajustez ou confirmez chaque pièce IA avant de valider le lot
          </p>
        )}

        {/* Continuer vers les visuels */}
        {allLotsValidated && (
          <button
            onClick={onContinue}
            className="
              w-full flex items-center justify-center gap-sm
              px-md py-sm rounded-md text-sm font-medium min-h-[44px]
              bg-[var(--color-interactive-primary)] text-text-inverse
              hover:opacity-90 active:opacity-80
              transition-colors duration-200
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
            "
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            Passer aux visuels
          </button>
        )}
      </div>
    </section>
  );
}
