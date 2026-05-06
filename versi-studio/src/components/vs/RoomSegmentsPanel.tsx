/**
 * RoomSegmentsPanel — Panel latéral V3 pour annotations segments.
 *
 * Pattern V3 (validé @moi 9.5/10 + @persona Thomas 10/10) :
 *  - Sidebar à droite du canvas (compact, scan rapide, anti-clics accidentels)
 *  - 1 ligne par segment : numéro horaire + orientation + dropdown 3 types
 *  - Résumé header dynamique « X segments — Y Mur / Z Baie / W Ouverture »
 *  - Navigation clavier Tab/Shift+Tab native (ordre DOM)
 *  - Optimistic update local + PATCH API (feedback < 100ms)
 *  - Numérotation horaire depuis Nord (cohérence avec canvas)
 *  - Code couleur (pastilles noir/orange/vert) à gauche du label
 *
 * Note : la persistance DB reste en `segment_index` original (pas de migration
 * destructive). Le mapping horaire est purement UI/affichage.
 */

"use client";

import { useCallback, useMemo } from "react";
import type {
  VsRoomSegment,
  VsRoomSegmentType,
  ZonePolygonPoint,
} from "@/lib/vs/types";
import { polygonCentroid } from "@/lib/vs/types";
import {
  reorderSegmentsClockwiseFromNorth,
  orientationLabel,
  orientationLongLabel,
  toV3DisplayType,
  SEGMENT_TYPE_LABELS_V3,
} from "@/lib/vs/ui/segment-render";

// ─── Props ────────────────────────────────────────────────────────

export interface RoomSegmentsPanelProps {
  /** Polygone de la pièce (lot-local %), source unique pour numérotation horaire. */
  polygon: ZonePolygonPoint[] | null;
  /** Segments persistés (indexés par segment_index DB). */
  segments: VsRoomSegment[];
  /**
   * Callback appelé à chaque changement de type. Le composant fait l'optimistic
   * update via mise à jour de `segments` côté parent ; ici on relaie l'event
   * en (segment_index_db, nouveau_type).
   */
  onSegmentTypeChange: (segmentIndex: number, type: VsRoomSegmentType) => void;
  /** True si la liste est en chargement initial (ex: après navigation pièce). */
  loading?: boolean;
  /** Segment actuellement focus/hover (sync avec canvas). Optionnel. */
  highlightedSegmentIndex?: number | null;
  /** Callback hover sur une ligne (sync canvas). Optionnel. */
  onRowHover?: (segmentIndex: number | null) => void;
  /** s32 (Phase 9) — toggle vers le chat architecte. Si défini, affiche
   *  une icône chat dans le header. */
  onOpenChat?: () => void;
}

// ─── Couleurs pastilles (synchro avec segment-render.ts) ──────────

const PASTILLE_COLORS: Record<"wall" | "bay_window" | "opening", string> = {
  wall: "#0B0B0B",
  bay_window: "#C9844C",
  opening: "#5A8060",
};

// ─── Component ────────────────────────────────────────────────────

export default function RoomSegmentsPanel({
  polygon,
  segments,
  onSegmentTypeChange,
  loading = false,
  highlightedSegmentIndex = null,
  onRowHover,
  onOpenChat,
}: RoomSegmentsPanelProps) {
  // ─── Mapping horaire depuis Nord (segment_index_db → display_index) ──
  const horaireMap = useMemo(() => {
    if (!polygon || polygon.length < 3) return new Map<number, number>();
    return reorderSegmentsClockwiseFromNorth(polygon);
  }, [polygon]);

  // ─── Centroïde polygone (pour calculer orientation cardinale) ─────
  const centroid = useMemo(() => {
    if (!polygon || polygon.length < 3) return null;
    return polygonCentroid(polygon);
  }, [polygon]);

  // ─── Construit la liste affichée (triée par display_index horaire) ──
  const rows = useMemo(() => {
    if (!polygon || polygon.length < 3 || !centroid) return [];
    // Map segment_index_db → type DB (default "wall" si absent).
    const typeByDbIndex = new Map<number, VsRoomSegmentType>();
    for (const s of segments) {
      typeByDbIndex.set(s.segment_index, s.type);
    }
    const result: Array<{
      dbIndex: number;
      displayIndex: number;
      orientationShort: string;
      orientationLong: string;
      type: VsRoomSegmentType;
      v3Type: "wall" | "bay_window" | "opening";
    }> = [];
    const n = polygon.length;
    for (let i = 0; i < n; i++) {
      const a = polygon[i];
      const b = polygon[(i + 1) % n];
      const midX = (a.x_percent + b.x_percent) / 2;
      const midY = (a.y_percent + b.y_percent) / 2;
      const orShort = orientationLabel(midX, midY, centroid.x_percent, centroid.y_percent);
      const dbType = typeByDbIndex.get(i) ?? "wall";
      result.push({
        dbIndex: i,
        displayIndex: horaireMap.get(i) ?? i + 1,
        orientationShort: orShort,
        orientationLong: orientationLongLabel(orShort),
        type: dbType,
        v3Type: toV3DisplayType(dbType),
      });
    }
    // Trie par display_index horaire (1, 2, 3...)
    result.sort((a, b) => a.displayIndex - b.displayIndex);
    return result;
  }, [polygon, segments, horaireMap, centroid]);

  // ─── Résumé header dynamique ─────────────────────────────────────
  const summary = useMemo(() => {
    if (rows.length === 0) return "Aucun segment";
    let wallCount = 0;
    let bayCount = 0;
    let openCount = 0;
    for (const r of rows) {
      if (r.v3Type === "wall") wallCount++;
      else if (r.v3Type === "bay_window") bayCount++;
      else if (r.v3Type === "opening") openCount++;
    }
    if (wallCount === rows.length) {
      return `${rows.length} segments — Tous en mur plein`;
    }
    const parts: string[] = [];
    if (wallCount > 0) parts.push(`${wallCount} mur${wallCount > 1 ? "s" : ""} plein${wallCount > 1 ? "s" : ""}`);
    if (bayCount > 0) parts.push(`${bayCount} baie${bayCount > 1 ? "s" : ""} vitrée${bayCount > 1 ? "s" : ""}`);
    if (openCount > 0) parts.push(`${openCount} ouverture${openCount > 1 ? "s" : ""}`);
    return `${rows.length} segments — ${parts.join(" · ")}`;
  }, [rows]);

  const handleSelectChange = useCallback(
    (dbIndex: number, e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value as "wall" | "bay_window" | "opening";
      onSegmentTypeChange(dbIndex, value);
    },
    [onSegmentTypeChange]
  );

  const handleMouseEnter = useCallback(
    (dbIndex: number) => {
      onRowHover?.(dbIndex);
    },
    [onRowHover]
  );
  const handleMouseLeave = useCallback(() => {
    onRowHover?.(null);
  }, [onRowHover]);

  return (
    <aside
      className="flex flex-col gap-sm w-full lg:w-[280px] lg:flex-shrink-0 rounded-md border border-border-default bg-bg-card p-md"
      aria-labelledby="segments-panel-title"
      data-testid="room-segments-panel"
    >
      {/* Header */}
      <div className="flex flex-col gap-xs">
        <div className="flex items-start justify-between gap-sm">
          <h3
            id="segments-panel-title"
            className="text-sm uppercase tracking-wide font-semibold text-text-default"
          >
            Caractéristiques des murs
          </h3>
          {onOpenChat && (
            <button
              type="button"
              onClick={onOpenChat}
              aria-label="Ouvrir le chat avec l'architecte virtuel"
              title="Architecte virtuel — préciser des détails par chat"
              className="text-text-muted hover:text-text-default w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary flex-shrink-0"
              data-testid="open-architect-chat"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden
              >
                <path
                  d="M3 4.5C3 3.67 3.67 3 4.5 3h9c.83 0 1.5.67 1.5 1.5v6c0 .83-.67 1.5-1.5 1.5H7l-3 2.5v-2.5h-.5C2.67 12 2 11.33 2 10.5v-6"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="6" cy="7.5" r="0.7" fill="currentColor" />
                <circle cx="9" cy="7.5" r="0.7" fill="currentColor" />
                <circle cx="12" cy="7.5" r="0.7" fill="currentColor" />
              </svg>
            </button>
          )}
        </div>
        <p
          className="text-xs text-text-muted"
          aria-live="polite"
          data-testid="segments-panel-summary"
        >
          {loading ? "Chargement..." : summary}
        </p>
      </div>

      {/* Liste */}
      {rows.length === 0 ? (
        <p className="text-xs text-text-muted italic">
          Aucun segment détecté pour cette pièce.
        </p>
      ) : (
        <ul className="flex flex-col gap-xs" role="list">
          {rows.map((row) => {
            const highlighted = highlightedSegmentIndex === row.dbIndex;
            return (
              <li
                key={row.dbIndex}
                className={[
                  "flex items-center gap-sm px-sm py-sm min-h-[44px] rounded-md border transition-colors",
                  highlighted
                    ? "border-interactive-primary bg-interactive-primary/10"
                    : "border-border-default bg-bg-default hover:bg-bg-subtle",
                ].join(" ")}
                onMouseEnter={() => handleMouseEnter(row.dbIndex)}
                onMouseLeave={handleMouseLeave}
                data-testid={`segment-row-${row.displayIndex}`}
              >
                {/* Pastille couleur */}
                <span
                  aria-hidden="true"
                  className="inline-block w-3 h-3 rounded-full flex-shrink-0 border border-black/10"
                  style={{ backgroundColor: PASTILLE_COLORS[row.v3Type] }}
                />
                {/* Numéro */}
                <span
                  aria-hidden="true"
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-bg-card border border-border-default text-xs font-semibold text-text-default flex-shrink-0"
                >
                  {row.displayIndex}
                </span>
                {/* Orientation */}
                <span
                  className="text-xs text-text-muted flex-shrink-0 w-12"
                  title={row.orientationLong}
                >
                  {row.orientationShort}
                </span>
                {/* Dropdown */}
                <label className="sr-only" htmlFor={`segment-type-${row.dbIndex}`}>
                  Type du segment {row.displayIndex} ({row.orientationLong})
                </label>
                <select
                  id={`segment-type-${row.dbIndex}`}
                  value={row.v3Type}
                  onChange={(e) => handleSelectChange(row.dbIndex, e)}
                  onFocus={() => handleMouseEnter(row.dbIndex)}
                  onBlur={handleMouseLeave}
                  data-testid={`segment-select-${row.displayIndex}`}
                  className="flex-1 min-w-0 text-xs px-sm py-xs rounded-md border border-border-default bg-bg-card text-text-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
                >
                  <option value="wall">{SEGMENT_TYPE_LABELS_V3.wall}</option>
                  <option value="bay_window">{SEGMENT_TYPE_LABELS_V3.bay_window}</option>
                  <option value="opening">{SEGMENT_TYPE_LABELS_V3.opening}</option>
                </select>
              </li>
            );
          })}
        </ul>
      )}

      {/* Légende couleur */}
      <div
        className="flex flex-wrap items-center gap-sm pt-sm border-t border-border-default"
        aria-label="Légende des couleurs"
      >
        <span className="flex items-center gap-xs text-xs text-text-muted">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: PASTILLE_COLORS.wall }}
            aria-hidden="true"
          />
          Mur
        </span>
        <span className="flex items-center gap-xs text-xs text-text-muted">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: PASTILLE_COLORS.bay_window }}
            aria-hidden="true"
          />
          Baie
        </span>
        <span className="flex items-center gap-xs text-xs text-text-muted">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: PASTILLE_COLORS.opening }}
            aria-hidden="true"
          />
          Ouverture
        </span>
      </div>
    </aside>
  );
}
