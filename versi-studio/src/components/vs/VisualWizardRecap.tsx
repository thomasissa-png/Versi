/**
 * VisualWizardRecap — Récap final du wizard (s32).
 *
 * Affiché après que toutes les pièces ont été configurées dans VisualWizard.
 * Contenu :
 *  - Plan complet avec toutes les pastilles photos placées (read-only)
 *  - Cartes pièces avec compteur photos + style choisi
 *  - Gros bouton "Générer tous les visuels" → POST /api/vs/projects/[id]/visuals/generate
 *
 * Pas de modification possible ici : l'édition se fait en revenant via
 * "Précédent" jusqu'à la pièce concernée.
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import VisualPlanCanvas from "@/components/vs/VisualPlanCanvas";
import { STYLES, type StyleId } from "@/lib/vs/styles";
import type {
  VsRoom,
  VsPhoto,
  ZoneRect,
  ApiResponse,
} from "@/lib/vs/types";

export interface VisualWizardRecapProps {
  projectId: string;
  rooms: VsRoom[];
  photos: VsPhoto[];
  planImageUrl: string | null;
  lotZone: ZoneRect;
  /** Callback : remonter à une pièce particulière pour édition. */
  onEditRoom: (roomId: string) => void;
  /** Callback : la génération a démarré (le parent passe en phase generating). */
  onJobStarted: (job: { job_id: string; expected_count: number; estimated_cost_usd: number }) => void;
  /** Callback : erreur générique. */
  onError: (msg: string) => void;
}

export default function VisualWizardRecap({
  projectId,
  rooms,
  photos,
  planImageUrl,
  lotZone,
  onEditRoom,
  onJobStarted,
  onError,
}: VisualWizardRecapProps) {
  const [submitting, setSubmitting] = useState(false);

  const photosByRoomId = useMemo(() => {
    const m = new Map<string, VsPhoto[]>();
    for (const p of photos) {
      if (!p.is_placed_on_plan) continue;
      const arr = m.get(p.room_id) ?? [];
      arr.push(p);
      m.set(p.room_id, arr);
    }
    return m;
  }, [photos]);

  const totalPlacedPhotos = useMemo(() => {
    let n = 0;
    for (const arr of photosByRoomId.values()) n += arr.length;
    return n;
  }, [photosByRoomId]);

  const totalRoomsWithStyle = useMemo(
    () => rooms.filter((r) => r.style_id).length,
    [rooms]
  );

  const allReady =
    totalPlacedPhotos > 0 &&
    totalRoomsWithStyle === rooms.length &&
    rooms.every((r) => (photosByRoomId.get(r.id)?.length ?? 0) > 0);

  const missingCount = useMemo(
    () =>
      rooms.filter((r) => {
        const placed = photosByRoomId.get(r.id)?.length ?? 0;
        return placed === 0 || !r.style_id;
      }).length,
    [rooms, photosByRoomId]
  );

  /**
   * Lance la génération. On utilise un style projet "factice" car le pipeline
   * accepte un fallback : chaque pièce avec son propre style_id sera utilisée.
   * Le backend lit room.style_id en priorité et bascule sur celui passé en
   * body uniquement si la pièce n'a pas de style. Ici toutes les pièces en ont
   * (allReady), donc le payload est juste un fallback safe.
   */
  const handleGenerate = useCallback(async () => {
    if (!allReady) return;
    setSubmitting(true);
    try {
      // Style "fallback" : on prend le premier disponible pour ne pas envoyer null.
      const fallbackStyle = rooms.find((r) => r.style_id)?.style_id ?? "moderne";
      const res = await fetch(
        `/api/vs/projects/${projectId}/visuals/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ style_id: fallbackStyle }),
        }
      );
      const json = (await res.json()) as ApiResponse<{
        job_id: string;
        expected_count: number;
        estimated_cost_usd: number;
      }>;
      if (!json.success) {
        onError(json.error);
        return;
      }
      onJobStarted(json.data);
    } catch {
      onError("La génération n'a pas pu démarrer.");
    } finally {
      setSubmitting(false);
    }
  }, [allReady, rooms, projectId, onJobStarted, onError]);

  return (
    <div
      className="flex flex-col gap-lg"
      data-testid="visual-wizard-recap"
    >
      <div className="flex flex-col gap-xs">
        <p className="text-xs uppercase tracking-widest text-text-muted">
          Étape finale
        </p>
        <h2 className="text-xl sm:text-2xl uppercase tracking-wide font-semibold font-serif text-text-default">
          Vérifiez et générez
        </h2>
        {/* C3 — message conditionnel WoW vs incomplet */}
        {allReady ? (
          <div className="rounded-md border border-success/20 bg-success/5 p-md">
            <p className="text-sm text-text-default">
              Tout est prêt. {totalPlacedPhotos} photo
              {totalPlacedPhotos > 1 ? "s" : ""} sur {rooms.length} pièce
              {rooms.length > 1 ? "s" : ""}. Versi va générer vos visuels en
              quelques minutes.
            </p>
          </div>
        ) : (
          <p className="text-sm text-text-muted">
            {missingCount} pièce{missingCount > 1 ? "s" : ""} à compléter avant
            génération.
          </p>
        )}
      </div>

      {/* Plan complet read-only */}
      <div className="relative w-full h-[400px] sm:h-[480px] rounded-md overflow-hidden border border-border-default">
        <VisualPlanCanvas
          planImageUrl={planImageUrl}
          lotZone={lotZone}
          rooms={rooms}
          photos={photos}
          focusedRoomId={null}
          onSelectRoom={() => {
            /* read-only */
          }}
          onDropPhotoOnRoom={() => {
            /* read-only */
          }}
          isMobile={false}
          activePlacementPhotoId={null}
          isCommitting={false}
        />
      </div>

      {/* Grille pièces */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
        {rooms.map((room) => {
          const placed = photosByRoomId.get(room.id) ?? [];
          const styleId = (room.style_id as StyleId | null) ?? null;
          const style = styleId ? STYLES[styleId] : null;
          const ok = placed.length > 0 && style !== null;
          return (
            <li
              key={room.id}
              className={[
                "flex flex-col gap-xs p-md rounded-md border bg-bg-card",
                ok
                  ? "border-success/40"
                  : "border-warning/40",
              ].join(" ")}
              data-testid={`recap-room-${room.id}`}
            >
              <div className="flex items-baseline justify-between gap-sm">
                <p className="text-sm font-semibold text-text-default truncate">
                  {room.custom_label || room.name || room.room_type || "Pièce"}
                </p>
                <span
                  className={[
                    "text-xs font-medium",
                    ok ? "text-success" : "text-warning",
                  ].join(" ")}
                  aria-label={ok ? "Pièce prête" : "Pièce incomplète"}
                >
                  {ok ? "✓ prête" : "⚠ incomplète"}
                </span>
              </div>
              <p className="text-xs text-text-muted">
                {placed.length} photo{placed.length > 1 ? "s" : ""} ·{" "}
                {style ? style.name : "style non choisi"}
              </p>
              <button
                type="button"
                onClick={() => onEditRoom(room.id)}
                className="text-xs self-start px-md min-h-[44px] inline-flex items-center rounded-md text-interactive-primary hover:bg-interactive-primary/10 mt-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
              >
                Modifier
              </button>
            </li>
          );
        })}
      </ul>

      {/* CTA Générer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-sm pt-md border-t border-border-default">
        {!allReady && (
          <p className="text-xs text-warning text-right">
            Toutes les pièces doivent avoir au moins une photo et un style choisi.
          </p>
        )}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!allReady || submitting}
          data-testid="wizard-generate-all"
          className="min-h-[48px] px-2xl py-sm rounded-md text-sm font-semibold bg-interactive-primary text-text-inverse hover:bg-interactive-hover disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
        >
          {submitting ? "Lancement..." : "Générer tous les visuels"}
        </button>
      </div>
    </div>
  );
}
