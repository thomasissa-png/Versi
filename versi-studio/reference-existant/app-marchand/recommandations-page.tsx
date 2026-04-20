"use client";

/**
 * Page recommandations architecte IA (Étape 6).
 *
 * Rendu : Client Component — appel IA + interactions accepter/refuser.
 *
 * Au mount : charge les lots, appelle POST /api/pro/projects/[id]/recommend
 * pour chaque lot. Affiche les RecommendationCard groupées par lot.
 * Thomas accepte ou refuse individuellement. Bouton "Lancer la génération".
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProStepper from "@/components/marchand/ProStepper";
import RecommendationCard from "@/components/marchand/RecommendationCard";
import { getCompletedSteps } from "@/lib/constants";

// ─── Types ──────────────────────────────────────────────────────────

type RecommendationType = "redistribute" | "merge" | "convert" | "add" | "optimize";
type RecommendationDecision = "pending" | "accepted" | "rejected";

interface Recommendation {
  id: string;
  type: RecommendationType;
  room_name: string;
  description: string;
  estimated_cost?: string | null;
  estimated_cost_raw?: number | null;
  impact: string;
  rationale_buyer?: string | null;
}

interface LotRecommendations {
  lot_id: string;
  lot_name: string;
  recommendations: Recommendation[];
  summary: string;
  isLoading: boolean;
  error: string | null;
}

type PageState = "loading" | "generating" | "ready" | "error";

// ─── Map API action_type to RecommendationCard type ─────────────────

const ACTION_TYPE_MAP: Record<string, RecommendationType> = {
  redistribution: "redistribute",
  cloison: "merge",
  affectation: "convert",
  deco: "optimize",
  sol: "optimize",
  luminaire: "optimize",
};

const IMPACT_LABELS: Record<string, string> = {
  haute: "Impact élevé",
  moyenne: "Impact moyen",
  basse: "Impact faible",
};

// ─── Component ──────────────────────────────────────────────────────

export default function RecommandationsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [pageState, setPageState] = useState<PageState>("loading");
  const [lotRecommendations, setLotRecommendations] = useState<LotRecommendations[]>([]);
  const [decisions, setDecisions] = useState<Map<string, RecommendationDecision>>(new Map());
  const [globalError, setGlobalError] = useState<string | null>(null);

  const hasTriggered = useRef(false);

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [projectStatus, setProjectStatus] = useState<string>("qualified");
  const [saveError, setSaveError] = useState<string | null>(null);

  // ─── Map API recommendations to UI format ──────────────────────────

  function mapApiRec(rec: {
    id: string;
    title: string;
    description: string;
    action_type: string;
    estimated_cost_eur: number | null;
    impact_level: string;
    affected_rooms?: string[];
    is_accepted?: boolean | null;
    rationale_buyer?: string | null;
  }): { rec: Recommendation; decision: RecommendationDecision } {
    const decision: RecommendationDecision =
      rec.is_accepted === true ? "accepted" :
      rec.is_accepted === false ? "rejected" : "pending";
    return {
      rec: {
        id: rec.id,
        type: ACTION_TYPE_MAP[rec.action_type] || "optimize",
        room_name: rec.title,
        description: rec.description,
        estimated_cost: rec.estimated_cost_eur
          ? `${rec.estimated_cost_eur.toLocaleString("fr-FR")} €`
          : null,
        estimated_cost_raw: rec.estimated_cost_eur ?? null,
        impact: IMPACT_LABELS[rec.impact_level] || rec.impact_level,
        rationale_buyer: rec.rationale_buyer ?? null,
      },
      decision,
    };
  }

  // ─── Load existing OR generate new recommendations ────────────────

  const loadAndGenerate = useCallback(async (forceRegenerate = false) => {
    if (hasTriggered.current && !forceRegenerate) return;
    hasTriggered.current = true;

    try {
      // Fetch project status for dynamic stepper
      try {
        const statusRes = await fetch(`/api/pro/projects/${projectId}/status`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.project?.status) setProjectStatus(statusData.project.status);
        }
      } catch { /* non-blocking */ }

      // Step 1: Check for existing recommendations (unless forced)
      if (!forceRegenerate) {
        const existingRes = await fetch(`/api/pro/projects/${projectId}/recommendations`);
        if (existingRes.ok) {
          const existingData = await existingRes.json();
          if (existingData.has_recommendations && existingData.lots?.length > 0) {
            // Load existing recommendations — no need to regenerate
            const newDecisions = new Map<string, RecommendationDecision>();
            const loadedLotRecs: LotRecommendations[] = existingData.lots.map(
              (lot: {
                lot_id: string;
                lot_name: string;
                recommendations: Array<{
                  id: string;
                  title: string;
                  description: string;
                  action_type: string;
                  estimated_cost_eur: number | null;
                  impact_level: string;
                  affected_rooms: string[];
                  is_accepted: boolean | null;
                  rationale_buyer: string | null;
                }>;
              }) => {
                const mapped = lot.recommendations.map((r) => {
                  const { rec, decision } = mapApiRec(r);
                  newDecisions.set(rec.id, decision);
                  return rec;
                });
                return {
                  lot_id: lot.lot_id,
                  lot_name: lot.lot_name,
                  recommendations: mapped,
                  summary: "",
                  isLoading: false,
                  error: null,
                };
              }
            );
            setLotRecommendations(loadedLotRecs);
            setDecisions(newDecisions);
            setPageState("ready");
            return;
          }
        }
      }

      // Step 2: No existing recommendations — generate new ones
      const lotsResponse = await fetch(`/api/pro/projects/${projectId}/lots`);
      if (!lotsResponse.ok) {
        const errData = await lotsResponse.json().catch(() => null);
        setGlobalError(errData?.message || `Impossible de charger les lots du projet (erreur ${lotsResponse.status}).`);
        setPageState("error");
        return;
      }

      const lotsData = await lotsResponse.json();
      const lots = lotsData.lots || [];

      if (lots.length === 0) {
        setGlobalError("Aucun lot trouvé. Veuillez d'abord qualifier votre projet.");
        setPageState("error");
        return;
      }

      // Initialize lot recommendations
      const initialLotRecs: LotRecommendations[] = lots.map((lot: { id: string; name: string }) => ({
        lot_id: lot.id,
        lot_name: lot.name,
        recommendations: [],
        summary: "",
        isLoading: true,
        error: null,
      }));
      setLotRecommendations(initialLotRecs);
      setPageState("generating");

      // Generate recommendations for each lot in parallel
      const results = await Promise.allSettled(
        lots.map(async (lot: { id: string; name: string }) => {
          const response = await fetch(`/api/pro/projects/${projectId}/recommend`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lot_id: lot.id }),
          });

          if (!response.ok) {
            const data = await response.json().catch(() => null);
            throw new Error(data?.message || `Erreur lors de la génération des recommandations (erreur ${response.status}).`);
          }

          return { lot_id: lot.id, data: await response.json() };
        })
      );

      // Process results
      const newDecisions = new Map<string, RecommendationDecision>();
      const updatedLotRecs = initialLotRecs.map((lotRec) => {
        const result = results.find((r) => {
          if (r.status === "fulfilled") return r.value.lot_id === lotRec.lot_id;
          return false;
        });

        if (result && result.status === "fulfilled") {
          const apiRecs = result.value.data.recommendations || [];
          const mapped: Recommendation[] = apiRecs.map(
            (rec: {
              id: string;
              title: string;
              description: string;
              action_type: string;
              estimated_cost_eur: number | null;
              impact_level: string;
              affected_rooms: string[];
            }) => {
              const { rec: mappedRec, decision } = mapApiRec(rec);
              newDecisions.set(mappedRec.id, decision);
              return mappedRec;
            }
          );

          return {
            ...lotRec,
            recommendations: mapped,
            summary: result.value.data.summary || "",
            isLoading: false,
            error: null,
          };
        }

        // Check for errors
        const errorResult = results.find((r) => {
          if (r.status === "rejected") return true;
          return false;
        });

        return {
          ...lotRec,
          isLoading: false,
          error:
            errorResult && errorResult.status === "rejected"
              ? (errorResult.reason as Error).message
              : "Erreur inconnue",
        };
      });

      setLotRecommendations(updatedLotRecs);
      setDecisions(newDecisions);
      setPageState("ready");
    } catch {
      setGlobalError("Erreur de connexion. Vérifiez votre réseau.");
      setPageState("error");
    } finally {
      setIsRegenerating(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadAndGenerate();
  }, [loadAndGenerate]);

  // ─── Accept / Reject handlers ─────────────────────────────────────

  async function handleAccept(recId: string) {
    const previousDecision = decisions.get(recId);
    setDecisions((prev) => new Map(prev).set(recId, "accepted"));
    setSaveError(null);
    try {
      const res = await fetch(`/api/pro/projects/${projectId}/recommendations/${recId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_accepted: true }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert on failure
      setDecisions((prev) => new Map(prev).set(recId, previousDecision || "pending"));
      setSaveError("Erreur de sauvegarde. Vérifiez votre connexion et réessayez.");
    }
  }

  async function handleReject(recId: string) {
    const previousDecision = decisions.get(recId);
    setDecisions((prev) => new Map(prev).set(recId, "rejected"));
    setSaveError(null);
    try {
      const res = await fetch(`/api/pro/projects/${projectId}/recommendations/${recId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_accepted: false }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert on failure
      setDecisions((prev) => new Map(prev).set(recId, previousDecision || "pending"));
      setSaveError("Erreur de sauvegarde. Vérifiez votre connexion et réessayez.");
    }
  }

  // ─── Stats ────────────────────────────────────────────────────────

  const allRecs = lotRecommendations.flatMap((lr) => lr.recommendations);
  const totalRecs = allRecs.length;
  const acceptedCount = Array.from(decisions.values()).filter((d) => d === "accepted").length;
  const decidedCount = Array.from(decisions.values()).filter((d) => d !== "pending").length;
  const hasPendingDecisions = totalRecs > 0 && decidedCount < totalRecs;

  // Fix P1-B : coût total des recommandations acceptées
  const acceptedCostTotal = allRecs.reduce((sum, rec) => {
    if (decisions.get(rec.id) === "accepted" && rec.estimated_cost_raw) {
      return sum + rec.estimated_cost_raw;
    }
    return sum;
  }, 0);

  // ─── Launch generation ────────────────────────────────────────────

  function handleLaunchGeneration() {
    router.push(`/projet/${projectId}/generation`);
  }

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      <Header variant="internal" />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pt-20 pb-8">
        {/* Stepper */}
        <div className="mb-8">
          <ProStepper
            currentStep={6}
            completedSteps={getCompletedSteps(projectStatus)}
            errorSteps={pageState === "error" ? [6] : []}
            projectId={projectId}
          />
        </div>

        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1C1C1E] tracking-tight">
            {pageState === "generating"
              ? "Analyse en cours..."
              : "Recommandations de l'architecte IA"}
          </h1>
          <p className="text-sm text-[#9B9A94] mt-1">
            {pageState === "generating" &&
              "L'architecte IA analyse votre projet et prépare ses recommandations..."}
            {pageState === "ready" && totalRecs > 0 && (
              <>
                {totalRecs} recommandation{totalRecs > 1 ? "s" : ""} —{" "}
                {acceptedCount} acceptée{acceptedCount > 1 ? "s" : ""}
                {decidedCount < totalRecs && (
                  <> / {totalRecs - decidedCount} en attente</>
                )}
              </>
            )}
            {pageState === "ready" && totalRecs === 0 &&
              "L'architecte n'a pas de recommandation pour ce projet. Vous pouvez lancer la génération."}
            {pageState === "error" && "Une erreur est survenue."}
          </p>
        </div>

        {/* Skip button — visible during loading, generating, and ready */}
        {pageState !== "error" && (
          <div className="mb-6">
            <button
              onClick={handleLaunchGeneration}
              className="inline-flex items-center gap-1 py-2 px-3 rounded-lg border border-[#D1D0CB]
                         bg-white text-sm text-[#9B9A94] hover:text-[#1C1C1E] hover:border-[#9B9A94]
                         transition-colors focus-visible:outline-none
                         focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
            >
              Passer et générer directement
              <span aria-hidden="true">&rarr;</span>
            </button>
          </div>
        )}

        {/* Generating state */}
        {pageState === "generating" && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <svg
              className="animate-spin w-8 h-8 text-[#7D9B76]"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="text-sm text-[#9B9A94]">
              L&apos;architecte IA analyse votre projet...
            </p>
            <p className="text-xs text-[#9B9A94]">
              Cette opération peut prendre quelques secondes.
            </p>
          </div>
        )}

        {/* Loading state */}
        {pageState === "loading" && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <svg
              className="animate-spin w-8 h-8 text-[#7D9B76]"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="text-sm text-[#9B9A94]">Chargement...</p>
          </div>
        )}

        {/* Error state */}
        {pageState === "error" && (
          <div className="py-8">
            <div
              className="p-4 rounded-lg bg-[#FEF2F2] border border-[#EF4444]/20 mb-6"
              role="alert"
            >
              <p className="text-sm text-[#B91C1C]">
                {globalError || "Erreur lors de la génération des recommandations."}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  hasTriggered.current = false;
                  setPageState("loading");
                  setGlobalError(null);
                  loadAndGenerate();
                }}
                className="py-2.5 px-4 rounded-lg bg-[#7D9B76] text-white text-sm font-medium
                           hover:bg-[#4A7A42] transition-colors
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
              >
                Réessayer
              </button>
              <button
                onClick={() => router.push(`/projet/${projectId}/qualification`)}
                className="py-2.5 px-4 rounded-lg border border-[#D1D0CB] bg-white
                           text-sm font-medium text-[#1C1C1E] hover:bg-[#F5F5F0]
                           transition-colors focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
              >
                Retour à la qualification
              </button>
            </div>
          </div>
        )}

        {/* Save error toast */}
        {saveError && (
          <div
            className="p-3 rounded-lg bg-[#FEF2F2] border border-[#EF4444]/20 mb-4"
            role="alert"
          >
            <p className="text-sm text-[#B91C1C]">{saveError}</p>
          </div>
        )}

        {/* Recommendations by lot */}
        {pageState === "ready" && (
          <div className="space-y-8 pb-24">
            {lotRecommendations.map((lotRec) => (
              <section key={lotRec.lot_id}>
                {/* Lot header */}
                <div className="mb-3">
                  <h2 className="text-base font-semibold text-[#1C1C1E]">
                    {lotRec.lot_name}
                  </h2>
                  {lotRec.summary && (
                    <p className="text-sm text-[#9B9A94] mt-0.5">
                      {lotRec.summary}
                    </p>
                  )}
                </div>

                {/* Loading per lot */}
                {lotRec.isLoading && (
                  <div className="flex items-center gap-2 py-4">
                    <svg
                      className="animate-spin w-4 h-4 text-[#7D9B76]"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span className="text-sm text-[#9B9A94]">Analyse en cours...</span>
                  </div>
                )}

                {/* Error per lot */}
                {lotRec.error && (
                  <div
                    className="p-3 rounded-lg bg-[#FEF2F2] border border-[#EF4444]/20 mb-3"
                    role="alert"
                  >
                    <p className="text-sm text-[#B91C1C]">{lotRec.error}</p>
                  </div>
                )}

                {/* Recommendation cards */}
                {!lotRec.isLoading && lotRec.recommendations.length > 0 && (
                  <div className="space-y-3">
                    {lotRec.recommendations.map((rec) => (
                      <RecommendationCard
                        key={rec.id}
                        recommendation={rec}
                        decision={decisions.get(rec.id) || "pending"}
                        onAccept={handleAccept}
                        onReject={handleReject}
                      />
                    ))}
                  </div>
                )}

                {/* No recommendations for this lot */}
                {!lotRec.isLoading && !lotRec.error && lotRec.recommendations.length === 0 && (
                  <div className="py-4 text-center">
                    <p className="text-sm text-[#9B9A94]">
                      Aucune recommandation pour ce lot.
                    </p>
                  </div>
                )}
              </section>
            ))}

            {/* Counter bar + budget estimé */}
            {totalRecs > 0 && (
              <div className="sticky bottom-0 bg-[#FAFAF8]/95 backdrop-blur-sm border-t border-[#D1D0CB]/40 py-3 -mx-4 px-4 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#9B9A94]">
                    {acceptedCount} recommandation{acceptedCount > 1 ? "s" : ""} acceptée{acceptedCount > 1 ? "s" : ""} / {totalRecs} total
                  </span>
                  <span className="text-xs text-[#9B9A94]">
                    {decidedCount}/{totalRecs} décidée{decidedCount > 1 ? "s" : ""}
                  </span>
                </div>
                {acceptedCostTotal > 0 && (
                  <div className="flex items-center gap-1.5 text-sm font-medium text-[#1C1C1E]">
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
                      className="text-[#7D9B76]"
                    >
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                    </svg>
                    Budget travaux estimé : {acceptedCostTotal.toLocaleString("fr-FR")} €
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#D1D0CB]/40">
              {/* Garde P1-A : message si aucune décision prise */}
              {hasPendingDecisions && (
                <p className="w-full text-xs text-[#D97706] mb-1">
                  Veuillez accepter ou ignorer chaque recommandation avant de continuer.
                </p>
              )}
              <button
                onClick={handleLaunchGeneration}
                disabled={hasPendingDecisions}
                className="flex-1 py-3 px-4 rounded-lg bg-[#7D9B76] text-white text-sm font-semibold
                           hover:bg-[#4A7A42] transition-colors
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9B76] focus-visible:ring-offset-2
                           shadow-[0_2px_8px_rgba(28,28,30,0.12)]
                           disabled:bg-[#D1D0CB] disabled:cursor-not-allowed disabled:shadow-none"
              >
                Lancer la génération des visuels
              </button>
              <button
                onClick={() => {
                  setIsRegenerating(true);
                  hasTriggered.current = false;
                  setPageState("loading");
                  setGlobalError(null);
                  loadAndGenerate(true);
                }}
                disabled={isRegenerating}
                className="py-3 px-4 rounded-lg border border-[#D1D0CB] bg-white
                           text-sm font-medium text-[#1C1C1E] hover:bg-[#F5F5F0]
                           transition-colors focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-[#7D9B76]
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRegenerating ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Régénération...
                  </span>
                ) : "Régénérer les recommandations"}
              </button>
              <button
                onClick={() => router.push(`/projet/${projectId}/qualification`)}
                className="py-3 px-4 rounded-lg border border-[#D1D0CB] bg-white
                           text-sm font-medium text-[#1C1C1E] hover:bg-[#F5F5F0]
                           transition-colors focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-[#7D9B76]"
              >
                Retour à la qualification
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
