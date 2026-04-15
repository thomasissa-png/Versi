/**
 * RoomGrid — Panneau latéral de sélection des pièces par lot
 *
 * Grille de miniatures par lot avec statut (photo, visuel, validé).
 * Sélecteur de lot en haut. Progression globale en bas.
 */

"use client";

import type { VsLot, VsRoom, VsVisual, VsPhoto } from "@/lib/vs/types";
import { ROOM_TYPE_LABELS, ROOM_TYPE_COLORS, type RoomTypeKey } from "@/lib/vs/styles";

interface RoomStatus {
  hasPhoto: boolean;
  hasVisual: boolean;
  hasValidatedVisual: boolean;
}

interface RoomGridProps {
  lots: VsLot[];
  selectedLotId: string | null;
  onSelectLot: (lotId: string) => void;
  /** Pièces du lot sélectionné */
  rooms: VsRoom[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  /** Map room_id → statut (photos et visuels) */
  roomStatuses: Record<string, RoomStatus>;
  /** Compteurs globaux */
  totalRooms: number;
  validatedRooms: number;
}

export default function RoomGrid({
  lots,
  selectedLotId,
  onSelectLot,
  rooms,
  selectedRoomId,
  onSelectRoom,
  roomStatuses,
  totalRooms,
  validatedRooms,
}: RoomGridProps) {
  const selectedLotIndex = lots.findIndex((l) => l.id === selectedLotId);

  return (
    <aside className="w-[360px] flex-shrink-0 border-l border-border-default bg-bg-card flex flex-col h-full">
      {/* ─── Sélecteur de lot ──────────────────────────────────── */}
      <div className="p-md border-b border-border-default">
        <label
          htmlFor="lot-selector"
          className="text-xs uppercase tracking-widest text-text-muted mb-sm block"
        >
          Lot
        </label>
        <select
          id="lot-selector"
          value={selectedLotId ?? ""}
          onChange={(e) => onSelectLot(e.target.value)}
          className="
            w-full px-md py-sm rounded-md text-sm
            border border-border-default bg-bg-default
            text-text-default
            focus:outline-none focus:border-interactive-primary
            transition-colors duration-200
          "
        >
          {lots.map((lot, index) => (
            <option key={lot.id} value={lot.id}>
              {lot.name} — Étage {lot.floor_number}
            </option>
          ))}
        </select>
      </div>

      {/* ─── Grille de pièces ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-md">
        <p className="text-xs uppercase tracking-widest text-text-muted mb-sm">
          Pièces
        </p>

        {rooms.length === 0 && (
          <p className="text-sm text-text-muted py-md text-center">
            Aucune pièce dans ce lot.
          </p>
        )}

        <div className="grid grid-cols-3 gap-sm">
          {rooms.map((room) => {
            const isSelected = room.id === selectedRoomId;
            const status = roomStatuses[room.id];
            const roomLabel =
              room.custom_label ||
              room.name ||
              ROOM_TYPE_LABELS[room.room_type as RoomTypeKey] ||
              room.room_type;
            const roomColor = ROOM_TYPE_COLORS[room.room_type as RoomTypeKey] ?? "#7F8C8D";

            return (
              <button
                key={room.id}
                onClick={() => onSelectRoom(room.id)}
                aria-pressed={isSelected}
                className={`
                  relative flex flex-col items-center justify-center
                  p-sm rounded-md transition-all duration-200
                  aspect-square
                  ${
                    isSelected
                      ? "border-2 border-interactive-primary bg-bg-default shadow-sm"
                      : "border border-border-default hover:border-gris-pierre hover:shadow-sm"
                  }
                `}
              >
                {/* Indicateur couleur du type de pièce */}
                <div
                  className="w-6 h-6 rounded-sm mb-2xs"
                  style={{ backgroundColor: roomColor, opacity: 0.6 }}
                  aria-hidden="true"
                />

                {/* Nom de la pièce */}
                <span className="text-[10px] text-text-default text-center leading-tight line-clamp-2">
                  {roomLabel}
                </span>

                {/* Badge de statut */}
                {status?.hasValidatedVisual && (
                  <div className="absolute top-xs right-xs">
                    <svg
                      className="w-3.5 h-3.5 text-success"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-label="Visuel validé"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}

                {status?.hasVisual && !status.hasValidatedVisual && (
                  <div className="absolute top-xs right-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-warning" aria-label="Visuel en attente de validation" />
                  </div>
                )}

                {status?.hasPhoto && !status.hasVisual && (
                  <div className="absolute top-xs right-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-border-default" aria-label="Photo uploadée" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Progression globale ───────────────────────────────── */}
      <div className="p-md border-t border-border-default">
        <div className="flex items-center justify-between mb-sm">
          <span className="text-xs text-text-muted">Progression</span>
          <span className="text-xs font-medium text-text-default">
            {validatedRooms}/{totalRooms} pièces validées
          </span>
        </div>
        <div className="h-1.5 bg-border-default rounded-full overflow-hidden">
          <div
            className="h-full bg-success rounded-full transition-all duration-500"
            style={{
              width: totalRooms > 0 ? `${(validatedRooms / totalRooms) * 100}%` : "0%",
            }}
          />
        </div>
        {totalRooms > 0 && validatedRooms === totalRooms && (
          <p className="text-xs text-success font-medium mt-sm text-center">
            Toutes les pièces ont un visuel validé
          </p>
        )}
      </div>
    </aside>
  );
}
