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
import type { VsLot, ArchitecturalProfile } from "@/lib/vs/types";
import type { ExtractedRoom } from "@/lib/vs/schemas";
import { getLotColor, computeZoneAreaM2, parseZone } from "@/lib/vs/types";
import LotArchitecturalPanel from "@/components/vs/LotArchitecturalPanel";

// ─── Types ────────────────────────────────────────────────────────

interface LotPanelProps {
  lots: VsLot[];
  selectedLotId: string | null;
  onSelectLot: (lotId: string | null) => void;
  onRenameLot: (lotId: string, name: string) => void;
  /** s32 — mise à jour profil architectural (5 champs marchand) */
  onUpdateLotProfile?: (lotId: string, profile: ArchitecturalProfile) => void;
  onDeleteLot: (lotId: string) => void;
  onAddLot: () => void;
  onValidate: () => void;
  /** Navigation vers pièces — distinct de onValidate (s22 Point 3) */
  onContinue?: () => void;
  hasOverlap: boolean;
  validating: boolean;
  lotIndexMap: Map<string, number>;
  validationSuccess?: boolean;
  // Mode dessin polygone (versi-s20 phase 2)
  onStartDrawingPolygon?: () => void;
  drawingPolygon?: boolean;
  onCancelDrawingPolygon?: () => void;
  // Validation individuelle de lot IA (versi-s21)
  onValidateSingleLot?: (lotId: string) => void;
  onValidateAllAiLots?: () => void;
  // U3 — État vide différencié (versi-s21 it2)
  hasAiExtracted?: boolean;
  // U4 — Annuler validation lot IA (versi-s21 it2)
  onUnvalidateSingleLot?: (lotId: string) => void;
  // I7 — Pièces non assignées (versi-s21 it2)
  unassignedRooms?: ExtractedRoom[];
  // S23 FIX calibration : permet de recalculer la surface en direct à partir
  // de zone_data + calibration plutôt que d'afficher lot.surface_m2 figé (issu
  // de l'extraction IA initiale, indépendant du plan calibré par Thomas).
  m2PerPixel?: number | null;
  planNaturalWidth?: number | null;
  planNaturalHeight?: number | null;
}

// ─── Composant LotCard ──────────────────────────────────────────

function LotCard({
  lot,
  index,
  isSelected,
  onSelect,
  onRename,
  onDelete,
  onValidateSingle,
  onUnvalidateSingle,
  m2PerPixel,
  planNaturalWidth,
  planNaturalHeight,
}: {
  lot: VsLot;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onValidateSingle?: () => void;
  onUnvalidateSingle?: () => void;
  m2PerPixel?: number | null;
  planNaturalWidth?: number | null;
  planNaturalHeight?: number | null;
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

  // S23 FIX calibration : la surface affichée est DÉRIVÉE en direct depuis
  // zone_data + calibration, pour refléter les ajustements manuels de Thomas
  // post-calibration. lot.surface_m2 (stocké) n'est utilisé qu'en fallback si
  // le plan n'est pas calibré — dans ce cas il affiche la surface LLM initiale,
  // sinon c'est la géométrie éditée qui fait foi.
  const computedSurfaceM2 = computeZoneAreaM2(
    parseZone(lot.zone_data as Record<string, unknown>),
    m2PerPixel,
    planNaturalWidth,
    planNaturalHeight
  );
  const surfaceLabel = (() => {
    if (computedSurfaceM2 != null) {
      return `${computedSurfaceM2.toFixed(0)} m²`;
    }
    if (lot.surface_m2 != null) {
      return `${Number(lot.surface_m2).toFixed(0)} m² (estimation IA)`;
    }
    return "Donnez l'échelle du plan pour afficher la surface";
  })();

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
        bg-white border
        ${lot.source === "ai" && lot.status === "suggested" ? "border-dashed border-[var(--color-interactive-primary)]/40" : ""}
        ${lot.source === "ai" && lot.status === "validated" ? "border-solid border-[var(--color-success)]/40" : ""}
        ${isSelected ? "ring-2 ring-[var(--color-interactive-primary)] border-[var(--color-interactive-primary)]" : ""}
        ${!isSelected && !(lot.source === "ai") ? "border-[var(--color-border-default)]" : ""}
        ${!isSelected ? "hover:bg-[var(--color-background-default)]" : ""}
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
              className="opacity-100 ml-xs inline-flex p-2xs rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-default)] transition-opacity"
              aria-label={`Renommer ${lot.name}`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex items-center gap-xs mt-2xs flex-wrap">
          <p className="text-xs text-[var(--color-text-muted)]">
            {surfaceLabel}
          </p>
          {lot.source === "ai" && (
            <span className="inline-flex items-center gap-2xs px-xs py-2xs rounded text-[10px] font-medium bg-[var(--color-interactive-primary)]/10 text-[var(--color-interactive-primary)]">
              IA
              {lot.status === "validated" && (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
          )}
          {/* U1 — Badge confiance IA (versi-s21 it2, tokens design system s27 Round 3) */}
          {lot.confidence_avg != null && (
            <span
              className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                lot.confidence_avg < 0.75
                  ? "bg-[var(--color-error)]/10 text-[var(--color-error)]"
                  : lot.confidence_avg < 0.85
                    ? "bg-[var(--color-warning)]/10 text-[var(--color-warning)]"
                    : "bg-[var(--color-success)]/10 text-[var(--color-success)]"
              }`}
              title={`Confiance IA : ${Math.round(lot.confidence_avg * 100)} %`}
            >
              {Math.round(lot.confidence_avg * 100)} %
            </span>
          )}
          {lot.source === "manual" && (
            <span className="text-xs text-[var(--color-text-muted)]">
              (manuel)
            </span>
          )}
        </div>
        {/* Bouton valider pour lots IA suggérés */}
        {lot.source === "ai" && lot.status === "suggested" && onValidateSingle && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onValidateSingle();
            }}
            className="mt-xs px-sm py-2xs rounded text-xs font-medium bg-[var(--color-success)]/10 text-[var(--color-success)] hover:bg-[var(--color-success)]/20 transition-colors min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)]"
            aria-label={`Valider ${lot.name}`}
          >
            Valider ce lot
          </button>
        )}
        {/* U4 — Bouton annuler validation pour lots IA validés (versi-s21 it2) */}
        {lot.source === "ai" && lot.status === "validated" && onUnvalidateSingle && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUnvalidateSingle();
            }}
            className="mt-xs px-sm py-xs text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-default)] underline min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)]"
            aria-label={`Annuler la validation de ${lot.name}`}
          >
            Annuler la validation
          </button>
        )}
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
  onUpdateLotProfile,
  onDeleteLot,
  onAddLot,
  onValidate,
  onContinue,
  hasOverlap,
  validating,
  lotIndexMap,
  validationSuccess = false,
  onStartDrawingPolygon,
  drawingPolygon = false,
  onCancelDrawingPolygon,
  onValidateSingleLot,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- prop API publique gardée pour évolution UI (validation batch IA)
  onValidateAllAiLots,
  hasAiExtracted = false,
  onUnvalidateSingleLot,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- prop API publique gardée pour panneau "rooms non assignées" futur
  unassignedRooms,
  m2PerPixel = null,
  planNaturalWidth = null,
  planNaturalHeight = null,
}: LotPanelProps) {
  const canValidate = lots.length > 0 && !hasOverlap && !validating;
  const aiSuggestedLots = lots.filter((l) => l.source === "ai" && l.status === "suggested");
  const _allLotsValidated = lots.length > 0 && lots.every((l) => l.status === "validated");
  const hasSuggestedLots = lots.some((l) => l.status === "suggested");

  return (
    <section className="w-full flex flex-col">
      {/* En-tête */}
      <div className="py-sm">
        <h2 className="text-sm font-medium text-[var(--color-text-default)]">
          {lots.length} lot{lots.length !== 1 ? "s" : ""}
        </h2>
        {/* s23 — Statut IA : titre dynamique 3 branches + sous-texte (specs @ux + @copywriter) */}
        {aiSuggestedLots.length > 0 && (
          <div className="mt-2xs">
            <p className="text-xs text-[var(--color-text-muted)]">
              {aiSuggestedLots.length === 1
                ? "1 lot détecté"
                : `${aiSuggestedLots.length} lots détectés`}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Vérifiez les délimitations, puis validez.
            </p>
          </div>
        )}
        {aiSuggestedLots.length === 0 && hasAiExtracted && lots.length === 0 && (
          <div className="mt-2xs">
            <p className="text-xs text-[var(--color-text-muted)]">
              Aucun lot détecté
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Dessinez les lots manuellement, puis validez.
            </p>
          </div>
        )}
        {lots.some((l) => l.source === "ai") && (
          <p className="text-xs text-[var(--color-text-muted)] italic mt-2xs">
            Les délimitations proposées par l&apos;IA sont des estimations. Ajustez-les si nécessaire.
          </p>
        )}
      </div>

      {/* Grille de lots (s22 Point 4 — cards en grille au lieu de liste latérale) */}
      <div>
        {lots.length === 0 ? (
          <div className="text-center text-sm text-[var(--color-text-muted)] py-2xl px-md">
            {hasAiExtracted ? (
              <>
                <p>Aucun lot détecté sur ce plan.</p>
                <p className="mt-sm">Dessinez-les manuellement avec le bouton ci-dessous.</p>
              </>
            ) : (
              <>
                <p>Aucun lot pour le moment.</p>
                <p className="mt-sm">Lancez la détection IA ou tracez un lot manuellement.</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
            {lots.map((lot) => (
              <LotCard
                key={lot.id}
                lot={lot}
                index={lotIndexMap.get(lot.id) ?? 0}
                isSelected={lot.id === selectedLotId}
                onSelect={() => onSelectLot(lot.id)}
                onRename={(name) => onRenameLot(lot.id, name)}
                onDelete={() => onDeleteLot(lot.id)}
                onValidateSingle={
                  onValidateSingleLot
                    ? () => onValidateSingleLot(lot.id)
                    : undefined
                }
                onUnvalidateSingle={
                  onUnvalidateSingleLot
                    ? () => onUnvalidateSingleLot(lot.id)
                    : undefined
                }
                m2PerPixel={m2PerPixel}
                planNaturalWidth={planNaturalWidth}
                planNaturalHeight={planNaturalHeight}
              />
            ))}
          </div>
        )}
      </div>

      {/* s32 — Profil architectural du lot sélectionné (5 champs marchand) */}
      {selectedLotId && onUpdateLotProfile && (() => {
        const selectedLot = lots.find((l) => l.id === selectedLotId);
        if (!selectedLot) return null;
        return (
          <div className="mt-md">
            <LotArchitecturalPanel
              lot={selectedLot}
              onChange={(profile) => onUpdateLotProfile(selectedLot.id, profile)}
            />
          </div>
        );
      })()}

      {/* I7 — Pièces non assignées : bloc supprimé s23 (spec @ux)
          Données préservées en DB et dans la prop `unassignedRooms` (réutilisable Étape 3). */}

      {/* Actions (s22 Point 4) */}
      <div className="border-t border-[var(--color-border-default)] py-md mt-lg flex flex-col gap-sm">
        {/* Bandeau mode dessin actif (versi-s20) */}
        {drawingPolygon && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-md bg-[var(--color-interactive-primary)]/10 border border-[var(--color-interactive-primary)] px-md py-sm text-xs text-[var(--color-text-default)] flex flex-col gap-xs"
          >
            <p className="font-medium">Dessin du lot en cours</p>
            <p className="text-[var(--color-text-muted)]">
              Cliquez pour poser un point. Double-cliquez pour terminer le lot. Échap pour annuler.
            </p>
            <button
              type="button"
              onClick={onCancelDrawingPolygon}
              className="self-start mt-xs px-sm py-2xs rounded text-xs font-medium underline text-[var(--color-text-default)] hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)] min-h-[44px]"
            >
              Annuler
            </button>
          </div>
        )}

        {/* Bouton ajouter rectangle (par défaut au centre du plan) */}
        <button
          onClick={onAddLot}
          disabled={drawingPolygon}
          title="Ajoute un rectangle au centre du plan, à redimensionner ensuite"
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
          Ajouter un lot (forme rectangulaire)
        </button>

        {/* Bouton dessiner un polygone — pour formes complexes (L, T, retraits)
            — versi-s20 it3 UX P1 */}
        {onStartDrawingPolygon && (
          <button
            onClick={onStartDrawingPolygon}
            disabled={drawingPolygon}
            title="Tracez le contour du lot point par point, double-clic pour terminer"
            className="
              w-full flex items-center justify-center gap-sm
              px-md py-sm rounded-md text-sm font-medium
              border border-solid border-[var(--color-interactive-primary)]/40
              text-[var(--color-interactive-primary)]
              hover:border-[var(--color-interactive-primary)] hover:bg-[var(--color-interactive-primary)]/5
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
            Ajouter un lot (forme libre)
          </button>
        )}

        {/* versi-s22 P2 — UN SEUL bouton : valide si nécessaire + navigue vers les pièces */}
        <button
          onClick={() => {
            if (hasSuggestedLots) {
              // Valide tous les lots non validés, puis navigue
              if (onValidate) onValidate();
            } else if (onContinue) {
              // Tous déjà validés : navigation directe
              onContinue();
            }
          }}
          disabled={!canValidate || hasOverlap}
          className="
            w-full flex items-center justify-center gap-sm
            px-md py-sm rounded-md text-sm font-medium min-h-[44px]
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
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              {hasSuggestedLots ? "Valider et passer aux pièces" : "Passer aux pièces"}
            </>
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
            className="flex items-center justify-center gap-sm text-xs text-[var(--color-success)] text-center"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Lots enregistrés
          </div>
        )}
      </div>
    </section>
  );
}
