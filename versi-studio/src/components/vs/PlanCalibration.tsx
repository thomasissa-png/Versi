/**
 * PlanCalibration — Modale de calibration d'un plan (F05 versi-s19)
 *
 * Permet à l'utilisateur de tracer une ligne de référence sur le plan (2 clics)
 * et de saisir sa longueur réelle en mètres. Calcule m2_per_pixel et le persiste
 * sur le plan via PATCH /api/vs/plans/[id].
 *
 * Rendu : Client Component — interactions souris + état local.
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface Point {
  x: number;
  y: number;
}

interface PlanCalibrationProps {
  planId: string;
  imageUrl: string;
  onCalibrated: (m2PerPixel: number) => void;
  onCancel: () => void;
}

export default function PlanCalibration({
  planId,
  imageUrl,
  onCalibrated,
  onCancel,
}: PlanCalibrationProps) {
  const [pointA, setPointA] = useState<Point | null>(null);
  const [pointB, setPointB] = useState<Point | null>(null);
  const [lengthMeters, setLengthMeters] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [autoSuggestion, setAutoSuggestion] = useState<{
    scale_text: string | null;
    scale_ratio: number | null;
    confidence: number;
    reasoning: string;
  } | null>(null);
  const [isAutoDetecting, setIsAutoDetecting] = useState(true);
  const [hasAutoSuggested, setHasAutoSuggested] = useState(false);

  useEffect(() => {
    // Au montage : tenter la détection automatique d'échelle
    let cancelled = false;
    async function autoDetect() {
      try {
        const res = await fetch(`/api/vs/plans/${planId}/auto-calibrate`, {
          method: "POST",
        });
        if (!res.ok || cancelled) {
          setIsAutoDetecting(false);
          return;
        }
        const json = await res.json();
        if (cancelled) return;

        if (
          json.success &&
          json.scale &&
          json.scale.confidence >= 0.9 &&
          json.suggestion
        ) {
          // Pré-remplir le champ longueur (assistant, pas remplacement)
          setAutoSuggestion({
            scale_text: json.scale.scale_text,
            scale_ratio: json.scale.scale_ratio,
            confidence: json.scale.confidence,
            reasoning: json.scale.reasoning,
          });
          setLengthMeters(String(json.suggestion.suggestedLengthMeters));
          setHasAutoSuggested(true);
        }
      } catch {
        // Silencieux : fallback manuel V1 (zéro régression)
      } finally {
        if (!cancelled) setIsAutoDetecting(false);
      }
    }
    autoDetect();
    return () => {
      cancelled = true;
    };
  }, [planId]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      const img = imageRef.current;
      if (!img) return;
      const rect = img.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (!pointA) {
        setPointA({ x, y });
      } else if (!pointB) {
        setPointB({ x, y });
      } else {
        // Reset si déjà 2 points : nouveau tracé
        setPointA({ x, y });
        setPointB(null);
        setError(null);
      }
    },
    [pointA, pointB]
  );

  const handleConfirm = useCallback(async () => {
    if (!pointA || !pointB || !lengthMeters) return;
    const meters = parseFloat(lengthMeters.replace(",", "."));
    if (isNaN(meters) || meters <= 0) {
      setError("Longueur invalide. Saisissez un nombre positif en mètres.");
      return;
    }
    // S23 FIX calibration : convertir les coords clic (pixels d'affichage dans
    // la modale) → pixels NATIFS de l'image source AVANT de calculer
    // m2_per_pixel. Sans ça, la valeur persistée dépend de la taille de rendu
    // de la modale, alors que les consommateurs (PlanCanvas overlay, calcul de
    // surface des lots) travaillent en pixels natifs ou en coords %. Le facteur
    // d'échelle entre les deux rendus (modale vs canvas principal) générait un
    // écart d'ordre de magnitude sur la surface affichée (Thomas : 47m² réel
    // affiché 120m²). Source de vérité unique : pixels natifs de l'image.
    const img = imageRef.current;
    if (!img || img.naturalWidth <= 0 || img.clientWidth <= 0) {
      setError("Impossible de lire les dimensions du plan. Rechargez la page.");
      return;
    }
    const displayToNativeRatio = img.naturalWidth / img.clientWidth;
    const axNative = pointA.x * displayToNativeRatio;
    const ayNative = pointA.y * displayToNativeRatio;
    const bxNative = pointB.x * displayToNativeRatio;
    const byNative = pointB.y * displayToNativeRatio;
    const lengthPxNative = Math.sqrt(
      Math.pow(bxNative - axNative, 2) + Math.pow(byNative - ayNative, 2)
    );
    // Seuil en px d'affichage (UX) : on vérifie la longueur écran, pas native.
    const lengthPxDisplay = Math.sqrt(
      Math.pow(pointB.x - pointA.x, 2) + Math.pow(pointB.y - pointA.y, 2)
    );
    if (lengthPxDisplay < 5 || lengthPxNative < 1) {
      setError("La ligne est trop courte. Tracez une référence plus longue.");
      return;
    }
    const metersPerPixelNative = meters / lengthPxNative;
    const m2PerPixel = metersPerPixelNative * metersPerPixelNative;

    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/vs/plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ m2_per_pixel: m2PerPixel }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Échec de la sauvegarde.");
      }
      onCalibrated(m2PerPixel);
    } catch {
      setError("Impossible d'enregistrer la calibration. Réessayez.");
    } finally {
      setIsSaving(false);
    }
  }, [pointA, pointB, lengthMeters, planId, onCalibrated]);

  const handleReset = useCallback(() => {
    setPointA(null);
    setPointB(null);
    setLengthMeters("");
    setError(null);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="calibration-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg-overlay)] p-md"
    >
      <div className="bg-[var(--color-bg-card)] rounded-lg p-lg max-w-2xl w-full max-h-[90vh] overflow-auto border border-[var(--color-border-default)]">
        <h2
          id="calibration-title"
          className="text-xl font-semibold text-[var(--color-text-default)] mb-sm"
        >
          Donner l&apos;échelle du plan
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-md">
          Cliquez sur deux extrémités d&apos;un mur dont vous connaissez la longueur, puis saisissez cette longueur en mètres.
        </p>

        {isAutoDetecting && (
          <div className="mb-md p-sm rounded-md bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] text-sm text-[var(--color-text-muted)]">
            Détection automatique de l&apos;échelle en cours…
          </div>
        )}
        {!isAutoDetecting && hasAutoSuggested && autoSuggestion && (
          <div className="mb-md p-sm rounded-md bg-[var(--color-bg-canvas)] border border-[var(--color-interactive-primary)] text-sm text-[var(--color-text-default)]">
            <strong>Échelle détectée automatiquement</strong>
            {autoSuggestion.scale_text && (
              <>
                {" "}: <span className="font-mono">{autoSuggestion.scale_text}</span>
              </>
            )}
            . Vérifiez la longueur pré-remplie ci-dessous puis tracez la ligne de référence.
          </div>
        )}
        {!isAutoDetecting && !hasAutoSuggested && (
          <div className="mb-md p-sm rounded-md bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] text-xs text-[var(--color-text-muted)]">
            Détection automatique indisponible — calibrez manuellement en traçant une ligne de référence.
          </div>
        )}

        <div className="relative inline-block max-w-full border border-[var(--color-border-default)] rounded-md overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Plan à calibrer — cliquez pour tracer une ligne de référence"
            onClick={handleClick}
            className="max-w-full h-auto cursor-crosshair select-none block"
            draggable={false}
          />
          {pointA && (
            <span
              style={{ left: pointA.x - 6, top: pointA.y - 6 }}
              className="absolute w-3 h-3 rounded-full bg-[var(--color-interactive-primary)] border-2 border-[var(--color-text-inverse)] pointer-events-none"
              aria-hidden="true"
            />
          )}
          {pointB && (
            <span
              style={{ left: pointB.x - 6, top: pointB.y - 6 }}
              className="absolute w-3 h-3 rounded-full bg-[var(--color-interactive-primary)] border-2 border-[var(--color-text-inverse)] pointer-events-none"
              aria-hidden="true"
            />
          )}
          {pointA && pointB && (
            <svg
              className="absolute inset-0 pointer-events-none"
              style={{ width: "100%", height: "100%" }}
              aria-hidden="true"
            >
              <line
                x1={pointA.x}
                y1={pointA.y}
                x2={pointB.x}
                y2={pointB.y}
                stroke="var(--color-interactive-primary)"
                strokeWidth="2"
              />
            </svg>
          )}
        </div>

        <div role="status" aria-live="polite" className="mt-sm text-xs text-[var(--color-text-muted)] min-h-[16px]">
          {!pointA && "Cliquez sur le premier point de votre ligne de référence."}
          {pointA && !pointB && "Cliquez sur le second point."}
          {pointA && pointB && "Indiquez la longueur réelle en mètres."}
        </div>

        {pointA && pointB && (
          <div className="mt-md">
            <label
              htmlFor="length-meters"
              className="block text-sm font-medium text-[var(--color-text-default)] mb-2xs"
            >
              Longueur de cette ligne (mètres)
            </label>
            <input
              id="length-meters"
              type="number"
              step="0.1"
              min="0.1"
              value={lengthMeters}
              onChange={(e) => setLengthMeters(e.target.value)}
              className="w-full px-md py-sm rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-card)] text-[var(--color-text-default)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)] min-h-[44px]"
              placeholder="Ex : 5.0"
              autoFocus
              aria-describedby={error ? "calibration-error" : undefined}
            />
          </div>
        )}

        {error && (
          <p
            id="calibration-error"
            role="alert"
            className="mt-sm text-sm text-[var(--color-error-strong)]"
          >
            {error}
          </p>
        )}

        <div className="mt-lg flex flex-wrap gap-md justify-end">
          {(pointA || pointB) && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="px-lg py-sm rounded-md text-sm font-medium border border-[var(--color-border-default)] text-[var(--color-text-muted)] hover:text-[var(--color-text-default)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)] active:opacity-80 disabled:opacity-50 min-h-[44px]"
            >
              Recommencer le tracé
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="px-lg py-sm rounded-md text-sm font-medium border border-[var(--color-border-default)] text-[var(--color-text-default)] hover:bg-[var(--color-bg-canvas)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)] active:opacity-80 disabled:opacity-50 min-h-[44px]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!pointA || !pointB || !lengthMeters || isSaving}
            className="px-lg py-sm rounded-md text-sm font-medium bg-[var(--color-interactive-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-interactive-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)] active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {isSaving ? "Enregistrement…" : "Valider la calibration"}
          </button>
        </div>
      </div>
    </div>
  );
}
