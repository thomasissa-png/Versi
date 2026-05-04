/**
 * VisualResult — Affiche le visuel généré avec actions et historique
 *
 * 5 états : processing (barre progression), failed (retry), generated (actions), validated (badge).
 * Historique des visuels en scroll horizontal en bas.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import type { VsVisual } from "@/lib/vs/types";
import { STYLES, type StyleId } from "@/lib/vs/styles";

interface VisualResultProps {
  /** Visuel actif (celui affiché en grand) */
  activeVisual: VsVisual | null;
  /** Tous les visuels de cette pièce (historique) */
  allVisuals: VsVisual[];
  /** Callback quand on clique Itérer */
  onIterate: () => void;
  /** Callback quand on clique Valider */
  onValidate: (visualId: string) => void;
  /** Callback quand on clique Autre style */
  onChangeStyle: () => void;
  /** Callback quand on clique Réessayer (erreur) */
  onRetry: () => void;
  /** Callback quand on sélectionne un visuel dans l'historique */
  onSelectVisual: (visual: VsVisual) => void;
  /** Est-ce que la validation est en cours */
  isValidating?: boolean;
  /** URL de la photo source (photo de la pièce avant génération) */
  sourceImageUrl?: string | null;
}

// ─── Mapping erreurs OpenAI brutes → messages utilisateur ────────
// Retourne null si aucun pattern spécifique ne match (évite duplication avec le titre générique).

function translateOpenAIError(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.includes("content policy") || lower.includes("safety")) return "Image refusée par le filtre de contenu. Modifiez l'instruction.";
  if (lower.includes("timeout") || lower.includes("timed out")) return "Délai dépassé. Réessayez dans quelques instants.";
  if (lower.includes("rate limit") || lower.includes("rate_limit")) return "Limite de génération atteinte. Réessayez dans une heure.";
  if (lower.includes("not found") || (lower.includes("model") && (lower.includes("does not exist") || lower.includes("invalid")))) {
    return "Modèle de génération indisponible (gpt-image-2 non accessible avec votre clé OpenAI). Contactez le support.";
  }
  if (lower.includes("billing") || lower.includes("quota") || lower.includes("insufficient_quota") || lower.includes("insufficient")) {
    return "Quota OpenAI épuisé ou facturation à mettre à jour. Contactez le support.";
  }
  if (lower.includes("invalid") && lower.includes("image")) return "La photo est invalide ou trop petite. Déposez une photo de meilleure qualité.";
  if (lower.includes("unauthorized") || lower.includes("api key") || lower.includes("authentication")) {
    return "Clé OpenAI invalide ou expirée. Vérifier OPENAI_API_KEY dans les Replit Secrets.";
  }
  // Pas de pattern match : retourner le message brut tronqué (utile pour diagnostic) plutôt que null.
  if (raw.length > 200) return raw.substring(0, 200) + "…";
  return raw;
}

// ─── Timer de progression ────────────────────────────────────────

function useProgressTimer(isProcessing: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const [prevProcessing, setPrevProcessing] = useState(isProcessing);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset elapsed quand on repasse à isProcessing=true — setState pendant render
  // (pattern React docs compliant React Compiler, pas de cascading renders).
  if (isProcessing && !prevProcessing) {
    setPrevProcessing(true);
    setElapsed(0);
  } else if (!isProcessing && prevProcessing) {
    setPrevProcessing(false);
  }

  useEffect(() => {
    if (isProcessing) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isProcessing]);

  return elapsed;
}

// ─── Composant principal ─────────────────────────────────────────

export default function VisualResult({
  activeVisual,
  allVisuals,
  onIterate,
  onValidate,
  onChangeStyle,
  onRetry,
  onSelectVisual,
  isValidating = false,
  sourceImageUrl = null,
}: VisualResultProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Fermer la modale avec Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxSrc(null);
    };
    if (lightboxSrc) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxSrc]);

  const isProcessing = activeVisual?.status === "processing";
  const isFailed = activeVisual?.status === "failed";
  const isGenerated = activeVisual?.status === "generated";
  const isValidated = activeVisual?.status === "validated";
  const elapsed = useProgressTimer(isProcessing);

  // Estimation de la progression (90s)
  const progressPercent = isProcessing ? Math.min((elapsed / 90) * 100, 95) : 0;

  const styleName = activeVisual?.style_id
    ? STYLES[activeVisual.style_id as StyleId]?.name ?? activeVisual.style_id
    : "";

  // Historique : filtrer les visuels générés ou validés (pas processing/failed)
  const historyVisuals = allVisuals.filter(
    (v) => v.status === "generated" || v.status === "validated"
  );

  if (!activeVisual) return null;

  return (
    <div className="flex flex-col gap-lg">
      {/* ─── État Processing ─────────────────────────────────────── */}
      {isProcessing && (
        <div className="flex flex-col items-center justify-center py-4xl">
          {/* Skeleton aperçu pendant la génération */}
          <div className="w-full h-64 bg-bg-canvas animate-pulse rounded-lg mb-md" aria-hidden="true" />
          {/* Barre de progression */}
          <div className="w-full max-w-sm mb-lg">
            <div className="h-2 bg-border-default rounded-full overflow-hidden">
              <div
                className="h-full bg-interactive-primary rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <p className="text-sm text-text-muted">
            Création en cours — environ 90 secondes
          </p>
        </div>
      )}

      {/* ─── État Failed ─────────────────────────────────────────── */}
      {isFailed && (
        <div className="flex flex-col items-center justify-center py-4xl">
          <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mb-md">
            <svg
              className="w-6 h-6 text-error"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <p className="text-sm text-text-default mb-xs">
            La création a échoué
          </p>
          {(() => {
            const detail = translateOpenAIError(activeVisual.error_message);
            return detail ? (
              <p className="text-xs text-text-muted mb-md max-w-sm text-center">
                {detail}
              </p>
            ) : (
              <p className="text-xs text-text-muted mb-md">Réessayez ou contactez le support.</p>
            );
          })()}
          <button
            onClick={onRetry}
            className="
              px-xl py-sm rounded-md text-sm font-medium
              bg-interactive-primary text-text-inverse
              hover:bg-interactive-hover transition-colors duration-200
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary active:opacity-80 min-h-[44px]
            "
          >
            Réessayer
          </button>
        </div>
      )}

      {/* ─── État Generated / Validated ──────────────────────────── */}
      {(isGenerated || isValidated) && (
        <div className="flex flex-col gap-md">
          {/* Badge style + validé */}
          <div className="flex items-center gap-sm">
            <span className="text-xs uppercase tracking-widest text-text-muted">
              {styleName}
            </span>
            {isValidated && (
              <span className="inline-flex items-center gap-2xs px-sm py-2xs rounded-full text-xs font-medium bg-success/10 text-success">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Validé
              </span>
            )}
          </div>

          {/* ─── Comparateur avant/après ───────────────────────── */}
          {(() => {
            const generatedImageUrl = (activeVisual.file_path && activeVisual.file_path !== "placeholder")
              ? `/api/vs/files?path=${encodeURIComponent(activeVisual.file_path)}`
              : null;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                {/* Colonne Avant */}
                <div className="flex flex-col gap-xs">
                  <div
                    className="relative rounded-lg overflow-hidden bg-bg-canvas border border-border-default cursor-zoom-in"
                    onClick={() => sourceImageUrl && setLightboxSrc(sourceImageUrl)}
                    role="button"
                    aria-label="Agrandir la photo actuelle"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && sourceImageUrl && setLightboxSrc(sourceImageUrl)}
                  >
                    {sourceImageUrl ? (
                      <img
                        src={sourceImageUrl}
                        alt="Photo actuelle de la pièce"
                        className="w-full h-48 sm:h-64 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 sm:h-64 flex items-center justify-center">
                        <p className="text-xs text-text-muted text-center px-md">Photo source non disponible</p>
                      </div>
                    )}
                    {sourceImageUrl && (
                      <div className="absolute top-sm right-sm">
                        <span className="bg-bg-dark/70 text-text-inverse text-xs px-xs py-2xs rounded">
                          <svg className="w-3 h-3 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Avant — photo actuelle</span>
                    {sourceImageUrl && (
                      <a
                        href={sourceImageUrl}
                        download
                        className="inline-flex items-center gap-2xs text-xs text-text-muted hover:text-text-default transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary min-h-[44px]"
                        aria-label="Télécharger la photo actuelle"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Télécharger
                      </a>
                    )}
                  </div>
                </div>

                {/* Colonne Après */}
                <div className="flex flex-col gap-xs">
                  <div
                    className="relative rounded-lg overflow-hidden bg-bg-canvas border border-border-default cursor-zoom-in"
                    onClick={() => generatedImageUrl && setLightboxSrc(generatedImageUrl)}
                    role="button"
                    aria-label="Agrandir le visuel IA"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && generatedImageUrl && setLightboxSrc(generatedImageUrl)}
                  >
                    {generatedImageUrl ? (
                      <img
                        src={generatedImageUrl}
                        alt={`Visuel IA — ${styleName}`}
                        className="w-full h-48 sm:h-64 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 sm:h-64 flex items-center justify-center">
                        <div className="text-center">
                          <svg
                            className="w-12 h-12 text-text-muted mx-auto mb-sm"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                            />
                          </svg>
                          <p className="text-sm text-text-muted">Visuel de démonstration</p>
                          <p className="text-xs text-text-muted mt-2xs">
                            La clé de génération n&apos;est pas configurée.
                          </p>
                        </div>
                      </div>
                    )}
                    {generatedImageUrl && (
                      <div className="absolute top-sm right-sm">
                        <span className="bg-bg-dark/70 text-text-inverse text-xs px-xs py-2xs rounded">
                          <svg className="w-3 h-3 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Après — visuel IA</span>
                    {generatedImageUrl && (
                      <a
                        href={generatedImageUrl}
                        download
                        className="inline-flex items-center gap-2xs text-xs text-text-muted hover:text-text-default transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary min-h-[44px]"
                        aria-label="Télécharger le visuel IA"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Télécharger
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Boutons d'action */}
          <div className="flex gap-sm">
            {isGenerated && (
              <>
                <button
                  onClick={() => onValidate(activeVisual.id)}
                  disabled={isValidating}
                  className="
                    flex-1 px-lg py-sm rounded-md text-sm font-medium
                    bg-interactive-primary text-text-inverse
                    hover:bg-interactive-hover transition-colors duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                    active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary min-h-[44px]
                  "
                >
                  {isValidating ? "Validation…" : "Valider ce visuel"}
                </button>
                <button
                  onClick={onIterate}
                  className="
                    inline-flex items-center gap-xs
                    px-lg py-sm rounded-md text-sm font-medium
                    border border-border-default text-text-default
                    hover:bg-bg-card transition-colors duration-200
                    active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary min-h-[44px]
                  "
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                  Affiner le visuel
                </button>
                <button
                  onClick={onChangeStyle}
                  className="
                    px-lg py-sm rounded-md text-sm font-medium
                    border border-border-default text-text-muted
                    hover:bg-bg-card hover:text-text-default transition-colors duration-200
                    active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary min-h-[44px]
                  "
                >
                  Essayer un autre style
                </button>
              </>
            )}
            {isValidated && (
              <>
                <button
                  onClick={onIterate}
                  className="
                    inline-flex items-center gap-xs
                    px-lg py-sm rounded-md text-sm font-medium
                    border border-border-default text-text-default
                    hover:bg-bg-card transition-colors duration-200
                    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary active:opacity-80 min-h-[44px]
                  "
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                  Affiner le visuel
                </button>
                <button
                  onClick={onChangeStyle}
                  className="
                    px-lg py-sm rounded-md text-sm font-medium
                    border border-border-default text-text-muted
                    hover:bg-bg-card hover:text-text-default transition-colors duration-200
                    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary active:opacity-80 min-h-[44px]
                  "
                >
                  Essayer un autre style
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Historique horizontal ───────────────────────────────── */}
      {historyVisuals.length > 1 && (
        <div className="mt-md">
          <p className="text-xs uppercase tracking-widest text-text-muted mb-sm">
            Autres versions
          </p>
          <div className="flex gap-sm overflow-x-auto pb-sm">
            {historyVisuals.map((visual) => {
              const isActive = visual.id === activeVisual?.id;
              const vStyleName =
                STYLES[visual.style_id as StyleId]?.name ?? visual.style_id;

              return (
                <button
                  key={visual.id}
                  onClick={() => onSelectVisual(visual)}
                  className={`
                    flex-shrink-0 w-24 rounded-md overflow-hidden border-2 transition-all duration-200
                    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary active:opacity-80
                    ${isActive ? "border-interactive-primary" : "border-transparent hover:border-border-default"}
                  `}
                  aria-label={`Visuel ${vStyleName}`}
                  aria-pressed={isActive}
                >
                  {visual.file_path && visual.file_path !== "placeholder" ? (
                    <img
                      src={`/api/vs/files?path=${encodeURIComponent(visual.file_path)}`}
                      alt={`Visuel ${vStyleName}`}
                      className="w-full h-16 object-cover"
                    />
                  ) : (
                    <div className="w-full h-16 bg-bg-canvas flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-text-muted"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="p-2xs">
                    <p className="text-xs text-text-muted truncate">{vStyleName}</p>
                    {visual.status === "validated" && (
                      <span className="text-xs text-success font-medium">Validé</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Modale plein écran (lightbox) ──────────────────────── */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-bg-dark/90 flex items-center justify-center p-md"
          onClick={() => setLightboxSrc(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image agrandie"
        >
          <button
            className="absolute top-md right-md text-text-inverse hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary min-h-[44px] min-w-[44px]"
            onClick={() => setLightboxSrc(null)}
            aria-label="Fermer"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={lightboxSrc}
            alt="Vue agrandie"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
