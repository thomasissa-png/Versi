/**
 * VisualWizardRecap — Récap final du wizard (s32 Phase 4 complète).
 *
 * Affiché après que toutes les pièces ont été parcourues dans le flow par
 * pièce (configuring → generating → preview → validated). Source de vérité :
 * les visuels validés en mémoire (validatedVisualsByRoom) — la génération
 * a déjà eu lieu pièce par pièce.
 *
 * Contenu :
 *  - Titre "Tous les visuels générés"
 *  - Cartes pièces : chacune affiche ses visuels validés (ou "Pas de visuels")
 *  - Bouton "Terminer" (clôt le flow — pas de re-génération en bloc)
 *  - Bouton "Modifier" par pièce → ramène au wizard sur la pièce concernée
 *
 * Pas d'appels API : la génération est déjà finie en amont. Seul le routage
 * "Modifier" remonte la pièce courante via callback parent.
 */

"use client";

import { useMemo } from "react";
import Image from "next/image";
import { STYLES, type StyleId } from "@/lib/vs/styles";
import type {
  VsRoom,
  VsPhoto,
  ZoneRect,
} from "@/lib/vs/types";
import type { VisualGenerated } from "@/hooks/useVisualsStream";

export interface VisualWizardRecapProps {
  projectId: string;
  rooms: VsRoom[];
  photos: VsPhoto[];
  /** s32 Phase 4 — visuels validés par pièce (source de vérité du récap). */
  validatedVisualsByRoom: Map<string, VisualGenerated[]>;
  planImageUrl: string | null;
  lotZone: ZoneRect;
  /** Callback : remonter à une pièce particulière pour édition. */
  onEditRoom: (roomId: string) => void;
  /** Callback : erreur générique. */
  onError: (msg: string) => void;
}

export default function VisualWizardRecap({
  projectId,
  rooms,
  photos,
  validatedVisualsByRoom,
  onEditRoom,
}: VisualWizardRecapProps) {
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

  const visibleRooms = useMemo(
    () => rooms.filter((r) => r.status !== "skipped"),
    [rooms]
  );

  const totalRoomsWithVisuals = useMemo(() => {
    let n = 0;
    for (const r of visibleRooms) {
      if ((validatedVisualsByRoom.get(r.id)?.length ?? 0) > 0) n++;
    }
    return n;
  }, [visibleRooms, validatedVisualsByRoom]);

  const totalVisuals = useMemo(() => {
    let n = 0;
    for (const r of visibleRooms) {
      n += validatedVisualsByRoom.get(r.id)?.length ?? 0;
    }
    return n;
  }, [visibleRooms, validatedVisualsByRoom]);

  const pendingRooms = visibleRooms.length - totalRoomsWithVisuals;

  return (
    <div
      className="flex flex-col gap-lg"
      data-testid="visual-wizard-recap"
    >
      <div className="flex flex-col gap-xs">
        <p className="text-xs uppercase tracking-widest text-text-muted">
          Récapitulatif
        </p>
        <h2 className="text-xl sm:text-2xl uppercase tracking-wide font-semibold font-serif text-text-default">
          Tous les visuels générés
        </h2>
        {totalVisuals > 0 ? (
          <div className="rounded-md border border-success/20 bg-success/5 p-md">
            <p className="text-sm text-text-default">
              {totalVisuals} visuel{totalVisuals > 1 ? "s" : ""} sur{" "}
              {totalRoomsWithVisuals} pièce
              {totalRoomsWithVisuals > 1 ? "s" : ""}.
              {pendingRooms > 0 && (
                <>
                  {" "}
                  {pendingRooms} pièce{pendingRooms > 1 ? "s" : ""} restante
                  {pendingRooms > 1 ? "s" : ""} à traiter — vous pouvez quitter
                  et y revenir plus tard.
                </>
              )}
            </p>
          </div>
        ) : (
          <p className="text-sm text-text-muted">
            Aucun visuel validé pour le moment. Reprenez les pièces une par une.
          </p>
        )}
      </div>

      {/* Grille pièces avec leurs visuels validés */}
      <ul className="grid grid-cols-1 gap-md">
        {visibleRooms.map((room) => {
          const placed = photosByRoomId.get(room.id) ?? [];
          const styleId = (room.style_id as StyleId | null) ?? null;
          const style = styleId ? STYLES[styleId] : null;
          const visuals = validatedVisualsByRoom.get(room.id) ?? [];
          const hasVisuals = visuals.length > 0;
          const roomLabel =
            room.custom_label || room.name || room.room_type || "Pièce";

          return (
            <li
              key={room.id}
              className={[
                "flex flex-col gap-md p-md rounded-md border bg-bg-card",
                hasVisuals ? "border-success/40" : "border-border-default",
              ].join(" ")}
              data-testid={`recap-room-${room.id}`}
            >
              <div className="flex items-start justify-between gap-sm">
                <div className="flex flex-col gap-xs min-w-0">
                  <p className="text-sm font-semibold text-text-default truncate">
                    {roomLabel}
                  </p>
                  <p className="text-xs text-text-muted">
                    {placed.length} photo{placed.length > 1 ? "s" : ""} ·{" "}
                    {style ? style.name : "style non choisi"}
                  </p>
                </div>
                <span
                  className={[
                    "text-xs font-medium whitespace-nowrap",
                    hasVisuals ? "text-success" : "text-text-muted",
                  ].join(" ")}
                  aria-label={hasVisuals ? "Pièce générée" : "Pièce non traitée"}
                >
                  {hasVisuals
                    ? `✓ ${visuals.length} visuel${visuals.length > 1 ? "s" : ""}`
                    : "À traiter"}
                </span>
              </div>

              <div className="flex flex-wrap gap-sm">
                <button
                  type="button"
                  onClick={() => onEditRoom(room.id)}
                  className="text-xs px-md min-h-[44px] inline-flex items-center rounded-md text-interactive-primary hover:bg-interactive-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
                >
                  {hasVisuals ? "Modifier ou régénérer" : "Configurer cette pièce"}
                </button>
              </div>

              {hasVisuals ? (
                <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-sm">
                  {visuals.map((v) => {
                    const src = v.file_path
                      ? `/api/vs/files?path=${encodeURIComponent(v.file_path)}`
                      : null;
                    const isAnchor = v.kind === "anchor";
                    return (
                      <li
                        key={v.visual_id}
                        className="relative rounded-md overflow-hidden border border-border-default bg-bg-default"
                      >
                        <div className="relative aspect-[4/3]">
                          {src ? (
                            <Image
                              src={src}
                              alt={`Visuel ${isAnchor ? "principal" : "secondaire"} — ${roomLabel}`}
                              fill
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                              loading="lazy"
                              className="object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-text-muted text-xs">
                              Image indisponible
                            </div>
                          )}
                          {isAnchor && (
                            <span
                              className="absolute top-xs left-xs inline-flex items-center text-[10px] uppercase tracking-wide font-semibold px-xs py-2xs rounded-sm bg-text-default text-text-inverse"
                              title="Visuel principal"
                            >
                              Principal
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-text-muted bg-bg-default border border-dashed border-border-default rounded-md p-sm">
                  Pas de visuels pour cette pièce — cliquez sur Modifier pour la
                  configurer et générer.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {/* CTA final — "Terminer" : redirige vers la liste des opérations.
          Pas de re-génération en bloc : la génération a eu lieu pièce par pièce. */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-sm pt-md border-t border-border-default">
        <p className="text-xs text-text-muted">
          Vos visuels sont conservés. Vous pourrez y revenir depuis la liste
          des opérations.
        </p>
        <a
          href={`/vs/projects/${projectId}`}
          data-testid="wizard-finish"
          className="min-h-[48px] px-2xl py-sm rounded-md text-sm font-semibold bg-interactive-primary text-text-inverse hover:bg-interactive-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary inline-flex items-center justify-center"
        >
          Terminer
        </a>
      </div>
    </div>
  );
}
