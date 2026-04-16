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

          {/* Bouton supprimer */}
          <div className="flex justify-end">
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
    [selectedRoomId, expandedCustom, onSelectRoom, onUpdateRoom, onDeleteRoom, validationBlocked]
  );

  // ─── Rendu principal ────────────────────────────────────────────

  return (
    <aside className="w-full sm:w-80 flex-shrink-0 flex flex-col sm:h-full bg-bg-card sm:border-l border-t sm:border-t-0 border-border-default">
      {/* Header : selecteur de lot */}
      <div className="p-md border-b border-border-default">
        <p className="vs-label mb-sm">Lot</p>
        {renderLotSelector()}
      </div>

      {/* Badge lot valide */}
      {currentLotValidated && (
        <div className="px-md py-sm bg-success/10 border-b border-success/20">
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
        </div>
      )}

      {/* Liste des pieces */}
      <div className="flex-1 overflow-y-auto p-md">
        {rooms.length === 0 ? (
          <div className="text-center py-2xl">
            <p className="text-sm text-text-muted">
              L'IA n'a pas détecté de pièces — ajoutez-en manuellement
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
          <div className="flex flex-col gap-sm">
            {rooms.map((room, i) => renderRoom(room, i))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-md border-t border-border-default flex flex-col gap-sm">
        {/* Ajouter une piece */}
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
            disabled={isValidating || hasUntypedRooms || rooms.length === 0}
            aria-describedby={hasUntypedRooms ? "validate-lot-warning" : undefined}
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

        {/* Avertissement si pieces non typees */}
        {hasUntypedRooms && !currentLotValidated && (
          <p id="validate-lot-warning" className="text-xs text-warning text-center">
            Définissez le type de toutes les pièces avant de valider
          </p>
        )}

        {/* Continuer vers les visuels */}
        {allLotsValidated && (
          <button
            onClick={onContinue}
            className="
              w-full px-md py-sm rounded-md text-sm font-medium min-h-[44px]
              bg-success text-text-inverse
              hover:bg-success/90 active:opacity-80
              transition-colors duration-200
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success
            "
          >
            Continuer vers les visuels
          </button>
        )}
      </div>
    </aside>
  );
}
