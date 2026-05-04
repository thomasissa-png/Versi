/**
 * RoomSettingsSidebar — Étape 4 v2 / s30 Vague 3b
 *
 * Pour chaque pièce du lot actif :
 *  - Slider target_visual_count (0-5)
 *  - Textarea comment_text (max 500)
 *  - Warning inline orange "ordre inversé" si target>0 && 0 photo placée
 *    (P1 persona Friction 2)
 *
 * PUT /api/vs/rooms/[id]/settings (debounce 400ms pour éviter le spam slider).
 *
 * Pas de blocage budget (préf fondateur s29 propagée s30) — le coût est affiché
 * via <CostEstimator/> côté header, jamais ici en modale ou disable.
 *
 * A11y : chaque slider+textarea ont un label associé (htmlFor + id), aria-describedby
 * pour le warning.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VsRoom, VsPhoto, VsRoomSettings, ApiResponse } from "@/lib/vs/types";
import { getRoomLabel } from "@/lib/vs/styles";

export interface RoomSettingsState {
  target_visual_count: number;
  comment_text: string;
  warning_pending: boolean;
  saving: boolean;
  error: string | null;
}

export interface RoomSettingsSidebarProps {
  rooms: VsRoom[];
  photos: VsPhoto[];
  initialSettings: VsRoomSettings[];
  /** Notifie le parent à chaque changement validé pour MAJ CostEstimator. */
  onSettingsChange?: (settings: Map<string, RoomSettingsState>) => void;
  /** Désactive l'édition pendant la génération. */
  disabled?: boolean;
}

const DEBOUNCE_MS = 400;

export default function RoomSettingsSidebar({
  rooms,
  photos,
  initialSettings,
  onSettingsChange,
  disabled = false,
}: RoomSettingsSidebarProps) {
  // ─── État local : Map<roomId, RoomSettingsState> ────────────────
  const [settingsMap, setSettingsMap] = useState<Map<string, RoomSettingsState>>(() => {
    const m = new Map<string, RoomSettingsState>();
    for (const r of rooms) {
      const s = initialSettings.find((x) => x.room_id === r.id);
      const target = s?.target_visual_count ?? 1;
      const placed = photos.some((p) => p.room_id === r.id && p.is_placed_on_plan);
      m.set(r.id, {
        target_visual_count: target,
        comment_text: s?.comment_text ?? "",
        warning_pending: target > 0 && !placed,
        saving: false,
        error: null,
      });
    }
    return m;
  });

  // ─── Debounce timers par roomId ─────────────────────────────────
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
    };
  }, []);

  // Notifie le parent
  useEffect(() => {
    onSettingsChange?.(settingsMap);
  }, [settingsMap, onSettingsChange]);

  const placedCountByRoom = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of photos) {
      if (p.is_placed_on_plan) m.set(p.room_id, (m.get(p.room_id) ?? 0) + 1);
    }
    return m;
  }, [photos]);

  // ─── Persistance API ────────────────────────────────────────────
  const persist = useCallback(
    async (roomId: string, target: number, comment: string) => {
      try {
        setSettingsMap((prev) => {
          const next = new Map(prev);
          const cur = next.get(roomId);
          if (cur) next.set(roomId, { ...cur, saving: true, error: null });
          return next;
        });
        const res = await fetch(`/api/vs/rooms/${roomId}/settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_visual_count: target, comment_text: comment || null }),
        });
        const json = (await res.json()) as ApiResponse<{
          warning_pending: boolean;
        }>;
        setSettingsMap((prev) => {
          const next = new Map(prev);
          const cur = next.get(roomId);
          if (!cur) return prev;
          if (json.success) {
            next.set(roomId, { ...cur, saving: false, error: null, warning_pending: json.data.warning_pending });
          } else {
            next.set(roomId, { ...cur, saving: false, error: json.error });
          }
          return next;
        });
      } catch {
        setSettingsMap((prev) => {
          const next = new Map(prev);
          const cur = next.get(roomId);
          if (cur) next.set(roomId, { ...cur, saving: false, error: "Sauvegarde échouée — réessayez." });
          return next;
        });
      }
    },
    []
  );

  const scheduleSave = useCallback(
    (roomId: string, target: number, comment: string) => {
      const old = timersRef.current.get(roomId);
      if (old) clearTimeout(old);
      const t = setTimeout(() => {
        timersRef.current.delete(roomId);
        void persist(roomId, target, comment);
      }, DEBOUNCE_MS);
      timersRef.current.set(roomId, t);
    },
    [persist]
  );

  // ─── Handlers ───────────────────────────────────────────────────
  const handleTargetChange = useCallback(
    (roomId: string, value: number) => {
      setSettingsMap((prev) => {
        const next = new Map(prev);
        const cur = next.get(roomId);
        if (!cur) return prev;
        const placed = placedCountByRoom.get(roomId) ?? 0;
        next.set(roomId, {
          ...cur,
          target_visual_count: value,
          warning_pending: value > 0 && placed === 0,
        });
        scheduleSave(roomId, value, cur.comment_text);
        return next;
      });
    },
    [placedCountByRoom, scheduleSave]
  );

  const handleCommentChange = useCallback(
    (roomId: string, value: string) => {
      setSettingsMap((prev) => {
        const next = new Map(prev);
        const cur = next.get(roomId);
        if (!cur) return prev;
        next.set(roomId, { ...cur, comment_text: value });
        scheduleSave(roomId, cur.target_visual_count, value);
        return next;
      });
    },
    [scheduleSave]
  );

  // ─── Rendu ──────────────────────────────────────────────────────
  if (rooms.length === 0) {
    return (
      <div className="p-md text-sm text-text-muted">
        Aucune pièce dans ce lot.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-md p-md">
      <h2 className="text-sm uppercase tracking-wide font-semibold text-text-default">
        Paramètres par pièce
      </h2>
      <ul className="flex flex-col gap-md">
        {rooms.map((room) => {
          const s = settingsMap.get(room.id);
          if (!s) return null;
          const label = room.custom_label || getRoomLabel(room.room_type);
          const targetId = `target-${room.id}`;
          const commentId = `comment-${room.id}`;
          const warningId = `warning-${room.id}`;
          const placed = placedCountByRoom.get(room.id) ?? 0;
          return (
            <li
              key={room.id}
              className="rounded-md border border-border-default bg-bg-card p-md flex flex-col gap-sm"
              data-testid={`room-settings-${room.id}`}
            >
              <div className="flex items-baseline justify-between gap-sm">
                <span className="font-medium text-text-default truncate">{label}</span>
                <span className="text-xs text-text-muted">
                  {placed} photo{placed > 1 ? "s" : ""} placée{placed > 1 ? "s" : ""}
                </span>
              </div>

              {/* Slider visuels */}
              <label htmlFor={targetId} className="text-xs text-text-muted">
                Nombre de visuels : <span className="font-semibold text-text-default">{s.target_visual_count}</span>
              </label>
              <input
                id={targetId}
                type="range"
                min={0}
                max={5}
                step={1}
                value={s.target_visual_count}
                onChange={(e) => handleTargetChange(room.id, Number.parseInt(e.target.value, 10))}
                disabled={disabled}
                aria-describedby={s.warning_pending ? warningId : undefined}
                className="w-full accent-interactive-primary disabled:opacity-50 disabled:cursor-not-allowed"
              />

              {/* Warning ordre inversé (P1 persona) */}
              {s.warning_pending && (
                <p
                  id={warningId}
                  role="status"
                  className="text-xs text-warning bg-warning/10 border border-warning/30 rounded-sm px-sm py-xs"
                >
                  Slider à {s.target_visual_count} mais aucune photo placée — placez une photo ou passez à 0.
                </p>
              )}

              {/* Textarea commentaire */}
              <label htmlFor={commentId} className="text-xs text-text-muted">
                Commentaire (optionnel)
              </label>
              <textarea
                id={commentId}
                value={s.comment_text}
                onChange={(e) => handleCommentChange(room.id, e.target.value.slice(0, 500))}
                placeholder="Ex: garder la cheminée, retirer les rideaux…"
                rows={2}
                disabled={disabled}
                maxLength={500}
                className="w-full rounded-sm border border-border-default bg-bg-default px-sm py-xs text-sm text-text-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive-primary focus-visible:ring-offset-1 focus-visible:border-interactive-primary disabled:opacity-50 disabled:cursor-not-allowed resize-y"
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted" aria-live="polite">
                  {s.saving ? "Sauvegarde…" : s.error ?? `${s.comment_text.length}/500`}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
