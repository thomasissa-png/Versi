"use client";

/**
 * RoomCard — Carte pour une pièce extraite/validée dans le parcours marchand.
 *
 * Rendu : Client Component (interactions upload photo, édition).
 *
 * Design tokens issus de docs/marchand-pivot/design/page-compositions.md :
 * - Status badges : extracting (#EFF6FF/#1D4ED8), validating (#FFFBEB/#B45309),
 *   generating (#EFF6FF/#1D4ED8 pulse), completed (#ECFDF5/#4A7A42), error (#FEF2F2/#B91C1C)
 * - Card : radius 8px, shadow subtle, padding 16px, gap 12px
 * - Photo thumb : 80px mobile, 120px desktop, radius 4px
 */

import { useRef } from "react";

// ─── Types ──────────────────────────────────────────────────────────

type RoomStatus = "pending" | "validated" | "generating_pass1" | "generating_pass2" | "done" | "failed";

interface Room {
  id: string;
  name: string;
  room_type: string;
  surface_m2?: number | null;
  photoUrl?: string | null;
  status: RoomStatus;
}

interface RoomCardProps {
  room: Room;
  onEdit?: (roomId: string) => void;
  onUploadPhoto?: (roomId: string, file: File) => void;
}

// ─── Status config ──────────────────────────────────────────────────

const STATUS_CONFIG: Record<RoomStatus, { label: string; bg: string; text: string; dot?: string }> = {
  pending: {
    label: "En attente",
    bg: "bg-[#F5F5F0]",
    text: "text-[#9B9A94]",
  },
  validated: {
    label: "Validée",
    bg: "bg-[#ECFDF5]",
    text: "text-[#4A7A42]",
  },
  generating_pass1: {
    label: "Passe 1 — surfaces",
    bg: "bg-[#EFF6FF]",
    text: "text-[#1D4ED8]",
    dot: "animate-pulse",
  },
  generating_pass2: {
    label: "Passe 2 — mobilier",
    bg: "bg-[#EFF6FF]",
    text: "text-[#1D4ED8]",
    dot: "animate-pulse",
  },
  done: {
    label: "Terminée",
    bg: "bg-[#ECFDF5]",
    text: "text-[#4A7A42]",
  },
  failed: {
    label: "Erreur",
    bg: "bg-[#FEF2F2]",
    text: "text-[#B91C1C]",
  },
};

// ─── Room type labels (FR) ──────────────────────────────────────────

export const ROOM_TYPE_LABELS: Record<string, string> = {
  salon: "Salon",
  sejour: "Séjour",
  salle_a_manger: "Salle à manger",
  cuisine: "Cuisine",
  chambre: "Chambre",
  chambre_parentale: "Chambre parentale",
  sdb: "Salle de bain",
  wc: "WC",
  bureau: "Bureau",
  entree: "Entrée",
  dressing: "Dressing",
  cellier: "Cellier / Buanderie",
  terrasse: "Terrasse / Balcon",
  garage: "Garage",
  couloir: "Couloir",
  cave: "Cave",
  // Types professionnels
  salle_reunion: "Salle de réunion",
  open_space: "Open space",
  accueil: "Accueil",
  local_technique: "Local technique",
  autre: "Autre",
};

// ─── Component ──────────────────────────────────────────────────────

export default function RoomCard({ room, onEdit, onUploadPhoto }: RoomCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusConfig = STATUS_CONFIG[room.status] || STATUS_CONFIG.pending;
  const roomTypeLabel = ROOM_TYPE_LABELS[room.room_type] || room.room_type;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && onUploadPhoto) {
      onUploadPhoto(room.id, file);
    }
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <article
      className="flex gap-3 p-4 rounded-lg bg-white border border-[#D1D0CB]/40
                 shadow-[0_1px_3px_rgba(28,28,30,0.08),0_1px_2px_rgba(28,28,30,0.04)]
                 hover:shadow-[0_4px_12px_rgba(28,28,30,0.10),0_2px_4px_rgba(28,28,30,0.06)]
                 transition-shadow duration-200"
    >
      {/* Photo thumbnail or placeholder */}
      <div className="flex-shrink-0 w-20 h-20 sm:w-[120px] sm:h-[120px] rounded overflow-hidden bg-[#F5F5F0]">
        {room.photoUrl ? (
          <img
            src={room.photoUrl}
            alt={`Photo de ${room.name}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#9B9A94]">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18M3 9h18" />
            </svg>
            <span className="text-[10px] mt-1">Plan</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        {/* Name + type + surface */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[#1C1C1E] truncate leading-5">
              {room.name}
            </h3>
            <p className="text-xs text-[#9B9A94] leading-4">
              {roomTypeLabel}
              {room.surface_m2 != null && ` — ${room.surface_m2} m²`}
            </p>
          </div>

          {/* Edit button */}
          {onEdit && (
            <button
              onClick={() => onEdit(room.id)}
              className="flex-shrink-0 p-1.5 rounded-md text-[#9B9A94] hover:text-[#1C1C1E]
                         hover:bg-[#F5F5F0] transition-colors focus-visible:outline-none
                         focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
              aria-label={`Modifier ${room.name}`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px]
                        font-medium tracking-[0.03em] leading-[14px] ${statusConfig.bg} ${statusConfig.text}`}
          >
            {statusConfig.dot && (
              <span
                className={`w-1.5 h-1.5 rounded-full bg-current ${statusConfig.dot}`}
                aria-hidden="true"
              />
            )}
            {statusConfig.label}
          </span>
        </div>

        {/* Upload photo button (if no photo and callback provided) */}
        {!room.photoUrl && onUploadPhoto && (
          <div className="mt-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7D9B76]
                         hover:text-[#4A7A42] transition-colors focus-visible:outline-none
                         focus-visible:ring-2 focus-visible:ring-[#7D9B76] rounded"
              aria-label={`Ajouter une photo pour ${room.name}`}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              Ajouter photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>
    </article>
  );
}
