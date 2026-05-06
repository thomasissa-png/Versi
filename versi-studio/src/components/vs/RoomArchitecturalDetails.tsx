/**
 * RoomArchitecturalDetails — Section "Détails architecturaux" wizard Étape 4
 *
 * Champs marchand pièce (Thomas s32 prod feedback) :
 *   - Sol actuel (single-select)
 *   - État murs (single-select)
 *   - Luminosité naturelle (single-select)
 *   - Particularités (multi-select)
 *   - s32 migration 014 — Niveau de prestation par pièce (single-select)
 *   - s32 migration 014 — Contraintes techniques (multi-select)
 *
 * UX :
 *   - Pills sauf particularités/contraintes → chips toggle
 *   - Pré-rempli si Vision avec confidence ≥ 0.7
 *     (badge subtil "Détecté" si confirmed=true, "À confirmer" orange sinon)
 *   - Clic sur un pill Vision passif (source='vision' && !confirmed) → confirm
 *   - Saisie marchand toujours prioritaire (source='user' écrase 'vision')
 *   - Optimistic + PATCH /api/vs/rooms/[id] (orchestré par le parent)
 *
 * Source de vérité : `room.architectural_details`. Si undefined → tous vides.
 */

"use client";

import { useCallback, useMemo } from "react";
import {
  ARCHITECTURAL_DETAILS_OPTIONS,
  ARCHITECTURAL_LEVEL_LABELS,
  TECHNICAL_CONSTRAINTS_LABELS,
  emptyArchitecturalDetails,
  type ArchitecturalDetails,
  type ArchitecturalFieldValue,
  type VsRoom,
} from "@/lib/vs/types";

interface Props {
  room: VsRoom;
  /** Optimistic update — l'orchestrateur parent gère le PATCH. */
  onChange: (next: ArchitecturalDetails) => void;
  /** Indicateur Vision en cours d'analyse (loader subtil). */
  visionAnalyzing?: boolean;
  /**
   * Indique si au moins une photo source est uploadée pour cette pièce.
   * Si false → Vision n'a pas pu s'exécuter (besoin photo) — on affiche
   * un message d'aide visible plutôt qu'un silence (s32 audit @persona).
   */
  hasPhotoSource?: boolean;
}

const SINGLE_FIELDS: Array<{
  key: "floor" | "walls" | "lighting";
  label: string;
}> = [
  { key: "floor", label: "Sol actuel" },
  { key: "walls", label: "État des murs" },
  { key: "lighting", label: "Luminosité naturelle" },
];

/** Helper : true si le pill doit être affiché en mode "À confirmer" (orange).
 *  Règle : Vision a renseigné une valeur mais le marchand n'a pas confirmé. */
function isUnconfirmedVision(field: ArchitecturalFieldValue): boolean {
  return (
    field.source === "vision" &&
    field.value != null &&
    field.confirmed !== true
  );
}

/** Badge "Détecté" subtil affiché sur un champ Vision déjà confirmé par le marchand. */
function VisionBadge({ confidence }: { confidence?: number }) {
  return (
    <span
      className="inline-flex items-center gap-2xs px-xs py-2xs rounded text-xs font-medium bg-interactive-primary/10 text-interactive-primary"
      title={
        confidence != null
          ? `Détecté automatiquement par l'IA (${Math.round(confidence * 100)} % de confiance). Cliquez pour modifier.`
          : "Détecté automatiquement par l'IA. Cliquez pour modifier."
      }
    >
      <svg
        className="w-3 h-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
      Détecté
    </span>
  );
}

/** Badge "À confirmer" orange affiché tant que le marchand n'a pas validé un champ Vision. */
function ToConfirmBadge({ confidence }: { confidence?: number }) {
  return (
    <span
      className="inline-flex items-center gap-2xs px-xs py-2xs rounded text-xs font-medium bg-warning/15 text-warning border border-warning/40"
      title={
        confidence != null
          ? `Détecté par l'IA (${Math.round(confidence * 100)} %). Cliquez le pill actif pour confirmer ou choisissez une autre option.`
          : "Détecté par l'IA. Cliquez le pill actif pour confirmer ou choisissez une autre option."
      }
    >
      <svg
        className="w-3 h-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0L3.34 16a2 2 0 001.74 3z"
        />
      </svg>
      À confirmer
    </span>
  );
}

export default function RoomArchitecturalDetails({
  room,
  onChange,
  visionAnalyzing = false,
  hasPhotoSource = true,
}: Props) {
  const details: ArchitecturalDetails = useMemo(
    () => room.architectural_details ?? emptyArchitecturalDetails(),
    [room.architectural_details]
  );

  // Toggle d'un champ single-select (floor/walls/lighting/level).
  // Sémantique :
  //  - Clic sur valeur active = désélection (value:null, source:null).
  //  - Clic sur valeur inactive = sélection user (value, source:'user', confirmed:true).
  //  - Re-clic sur la même valeur Vision NON confirmée = confirme passivement
  //    (on préserve source='vision' mais confirmed=true → badge passe au vert).
  const handleSingleToggle = useCallback(
    (
      field: "floor" | "walls" | "lighting" | "level",
      value: string
    ) => {
      const current: ArchitecturalFieldValue =
        (details[field] as ArchitecturalFieldValue | undefined) ?? {
          value: null,
          source: null,
        };
      const isActive = current.value === value;
      let nextField: ArchitecturalFieldValue;
      if (isActive) {
        // Re-clic sur la valeur active.
        // Vision non confirmée → confirme (preserve source/confidence).
        if (isUnconfirmedVision(current)) {
          nextField = { ...current, confirmed: true };
        } else {
          // User déjà confirmé → désélection.
          nextField = { value: null, source: null };
        }
      } else {
        // Choix d'une autre valeur → écrase en user-confirmed.
        nextField = { value, source: "user", confirmed: true };
      }
      const next: ArchitecturalDetails = {
        ...details,
        [field]: nextField,
      };
      onChange(next);
    },
    [details, onChange]
  );

  // Toggle d'une particularité (multi-select).
  // Règle : "Aucune" est exclusif — sélectionner "Aucune" vide les autres,
  // sélectionner une autre option vide "Aucune".
  const handleSpecificToggle = useCallback(
    (value: string) => {
      const currentValues = details.specifics.map((s) => s.value);
      const has = currentValues.includes(value);

      let nextSpecifics: ArchitecturalFieldValue[];
      if (has) {
        // Désélection
        nextSpecifics = details.specifics.filter((s) => s.value !== value);
      } else if (value === "Aucune") {
        // "Aucune" exclusif
        nextSpecifics = [{ value: "Aucune", source: "user", confirmed: true }];
      } else {
        // Ajout d'une particularité réelle → retire "Aucune" si présent
        nextSpecifics = [
          ...details.specifics.filter((s) => s.value !== "Aucune"),
          { value, source: "user", confirmed: true },
        ];
      }
      onChange({ ...details, specifics: nextSpecifics });
    },
    [details, onChange]
  );

  // s32 migration 014 — Toggle d'une contrainte technique (multi-select libre).
  const handleConstraintToggle = useCallback(
    (value: string) => {
      const current = details.technical_constraints ?? [];
      const has = current.some((c) => c.value === value);
      let next: ArchitecturalFieldValue[];
      if (has) {
        next = current.filter((c) => c.value !== value);
      } else {
        next = [...current, { value, source: "user", confirmed: true }];
      }
      onChange({ ...details, technical_constraints: next });
    },
    [details, onChange]
  );

  // Pré-calcul : y a-t-il au moins un champ Vision non confirmé ?
  const hasUnconfirmedVision = useMemo(() => {
    if (isUnconfirmedVision(details.floor)) return true;
    if (isUnconfirmedVision(details.walls)) return true;
    if (isUnconfirmedVision(details.lighting)) return true;
    if (details.level && isUnconfirmedVision(details.level)) return true;
    if (details.specifics.some((s) => isUnconfirmedVision(s))) return true;
    return false;
  }, [details]);

  return (
    <section
      aria-labelledby={`room-arch-details-title-${room.id}`}
      className="rounded-md border border-border-default bg-bg-card p-md flex flex-col gap-md"
    >
      <div className="flex items-center justify-between gap-sm">
        <h3
          id={`room-arch-details-title-${room.id}`}
          className="text-sm uppercase tracking-wide font-semibold text-text-default"
        >
          Détails architecturaux
        </h3>
        {visionAnalyzing && (
          <span
            className="inline-flex items-center gap-xs text-xs text-text-muted"
            role="status"
            aria-live="polite"
          >
            <span className="inline-block w-3 h-3 border-2 border-text-muted/30 border-t-text-muted rounded-full animate-spin" />
            Analyse photo…
          </span>
        )}
      </div>
      <p className="text-xs text-text-muted">
        Précisez l&apos;état actuel de la pièce pour des visuels plus fidèles.
      </p>

      {hasUnconfirmedVision && (
        <p
          role="note"
          className="text-xs px-sm py-xs rounded-md bg-warning/10 text-warning border border-warning/30"
          data-testid="room-arch-confirm-hint"
        >
          Les valeurs détectées par l&apos;IA sont en orange. Cliquez le pill
          actif pour confirmer, ou choisissez une autre option.
        </p>
      )}

      {!hasPhotoSource && !visionAnalyzing && (
        <p
          role="note"
          className="text-xs px-sm py-xs rounded-md bg-interactive-primary/10 text-interactive-primary border border-interactive-primary/20"
        >
          Ajoutez une photo source pour activer l&apos;analyse automatique
          (sol, murs, luminosité). Vous pouvez aussi remplir manuellement
          les champs ci-dessous.
        </p>
      )}

      {SINGLE_FIELDS.map(({ key, label }) => {
        const options = ARCHITECTURAL_DETAILS_OPTIONS[key];
        const field = details[key];
        const isVision = field.source === "vision";
        const unconfirmed = isUnconfirmedVision(field);
        return (
          <div key={key}>
            <div className="flex items-center gap-xs mb-xs">
              <p className="text-xs font-medium text-text-default">{label}</p>
              {isVision && field.value != null && unconfirmed && (
                <ToConfirmBadge confidence={field.confidence} />
              )}
              {isVision && field.value != null && !unconfirmed && (
                <VisionBadge confidence={field.confidence} />
              )}
            </div>
            <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-xs">
              {options.map((opt) => {
                const active = field.value === opt;
                // Pill orange uniquement si actif ET non confirmé Vision.
                const orangeStyle = active && unconfirmed;
                return (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => handleSingleToggle(key, opt)}
                    data-testid={`room-arch-${key}-${opt}`}
                    className={`
                      inline-flex items-center px-sm py-xs rounded-full text-xs font-medium border transition-colors duration-150
                      min-h-[44px]
                      focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
                      ${
                        orangeStyle
                          ? "bg-warning/10 text-warning border-warning/40 hover:bg-warning/20 cursor-pointer"
                          : active
                          ? "bg-interactive-primary text-text-inverse border-interactive-primary"
                          : "bg-bg-card text-text-default border-border-default hover:border-text-muted"
                      }
                    `}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Particularités multi-select */}
      <div>
        <div className="flex items-center gap-xs mb-xs">
          <p className="text-xs font-medium text-text-default">Particularités</p>
          {details.specifics.some((s) => isUnconfirmedVision(s)) ? (
            <ToConfirmBadge />
          ) : (
            details.specifics.some((s) => s.source === "vision") && (
              <VisionBadge />
            )
          )}
        </div>
        <div
          role="group"
          aria-label="Particularités de la pièce"
          className="flex flex-wrap gap-xs"
        >
          {ARCHITECTURAL_DETAILS_OPTIONS.specifics.map((opt) => {
            const matched = details.specifics.find((s) => s.value === opt);
            const active = matched != null;
            const unconfirmed = matched != null && isUnconfirmedVision(matched);
            return (
              <button
                key={opt}
                type="button"
                aria-pressed={active}
                onClick={() => handleSpecificToggle(opt)}
                data-testid={`room-arch-specific-${opt}`}
                className={`
                  inline-flex items-center px-sm py-xs rounded-full text-xs font-medium border transition-colors duration-150
                  min-h-[44px]
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
                  ${
                    unconfirmed
                      ? "bg-warning/10 text-warning border-warning/40 hover:bg-warning/20"
                      : active
                      ? "bg-interactive-primary text-text-inverse border-interactive-primary"
                      : "bg-bg-card text-text-default border-border-default hover:border-text-muted"
                  }
                `}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* s32 migration 014 — Niveau de prestation par pièce */}
      {(() => {
        const levelField: ArchitecturalFieldValue =
          details.level ?? { value: null, source: null };
        const levelIsVision = levelField.source === "vision";
        const levelUnconfirmed = isUnconfirmedVision(levelField);
        return (
      <div>
        <div className="flex items-center gap-xs mb-xs">
          <p className="text-xs font-medium text-text-default">
            Niveau de prestation
          </p>
          {/* s32 P1-8 — cohérence avec floor/walls/lighting :
              affiche badge "À confirmer" / "Détecté" sur le header. */}
          {levelIsVision && levelField.value != null && levelUnconfirmed && (
            <ToConfirmBadge confidence={levelField.confidence} />
          )}
          {levelIsVision && levelField.value != null && !levelUnconfirmed && (
            <VisionBadge confidence={levelField.confidence} />
          )}
        </div>
        <p className="text-xs text-text-muted mb-xs">
          Indépendant du niveau global du lot — utile si une pièce vise une
          gamme différente (ex : salon premium, chambres standard).
        </p>
        <div
          role="radiogroup"
          aria-label="Niveau de prestation"
          className="flex flex-wrap gap-xs"
        >
          {ARCHITECTURAL_DETAILS_OPTIONS.level.map((opt) => {
            const field: ArchitecturalFieldValue =
              details.level ?? { value: null, source: null };
            const active = field.value === opt;
            const unconfirmed = active && isUnconfirmedVision(field);
            return (
              <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => handleSingleToggle("level", opt)}
                data-testid={`room-arch-level-${opt}`}
                className={`
                  inline-flex items-center px-sm py-xs rounded-full text-xs font-medium border transition-colors duration-150
                  min-h-[44px]
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
                  ${
                    unconfirmed
                      ? "bg-warning/10 text-warning border-warning/40 hover:bg-warning/20"
                      : active
                      ? "bg-interactive-primary text-text-inverse border-interactive-primary"
                      : "bg-bg-card text-text-default border-border-default hover:border-text-muted"
                  }
                `}
              >
                {ARCHITECTURAL_LEVEL_LABELS[opt] ?? opt}
              </button>
            );
          })}
        </div>
      </div>
        );
      })()}

      {/* s32 migration 014 — Contraintes techniques (multi-select) */}
      <div>
        <div className="flex items-center gap-xs mb-xs">
          <p className="text-xs font-medium text-text-default">
            Contraintes techniques
          </p>
          {/* s32 P1-8 — cohérence : badge "À confirmer" si une contrainte vision non confirmée. */}
          {(details.technical_constraints ?? []).some((c) => isUnconfirmedVision(c)) && (
            <ToConfirmBadge />
          )}
        </div>
        <p className="text-xs text-text-muted mb-xs">
          Éléments immuables que l&apos;IA doit respecter dans la génération
          (ne pas les déplacer, ne pas les supprimer).
        </p>
        <div
          role="group"
          aria-label="Contraintes techniques"
          className="flex flex-wrap gap-xs"
        >
          {ARCHITECTURAL_DETAILS_OPTIONS.technical_constraints.map((opt) => {
            const list = details.technical_constraints ?? [];
            const matched = list.find((c) => c.value === opt);
            const active = matched != null;
            const unconfirmed = matched != null && isUnconfirmedVision(matched);
            return (
              <button
                key={opt}
                type="button"
                aria-pressed={active}
                onClick={() => handleConstraintToggle(opt)}
                data-testid={`room-arch-constraint-${opt}`}
                className={`
                  inline-flex items-center px-sm py-xs rounded-full text-xs font-medium border transition-colors duration-150
                  min-h-[44px]
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
                  ${
                    unconfirmed
                      ? "bg-warning/10 text-warning border-warning/40 hover:bg-warning/20"
                      : active
                      ? "bg-interactive-primary text-text-inverse border-interactive-primary"
                      : "bg-bg-card text-text-default border-border-default hover:border-text-muted"
                  }
                `}
              >
                {TECHNICAL_CONSTRAINTS_LABELS[opt] ?? opt}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
