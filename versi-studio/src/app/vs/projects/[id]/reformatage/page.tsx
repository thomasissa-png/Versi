/**
 * Step 2 — Reformatage du plan (s25 Round B)
 * Rendu : Client Component — interactions comparateur + lightbox.
 *
 * 5 états UI :
 * - Défaut : comparateur avant/après + CTA "Utiliser ce plan"
 * - Loading : skeleton pendant chargement des plans
 * - Vide : aucun plan → retour étape 1 (Plans)
 * - Erreur : toast rouge "Impossible de charger le plan"
 * - Fallback : bannière orange + CTA "Continuer avec le plan original"
 *
 * Mot pivot métier : "plan", "reformaté", "pièce", "lot".
 * Jargon banni : "polygone", "zone", "calque", "canonicalisation".
 */

"use client";

import { useState, useEffect, useCallback, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import Stepper from "@/components/vs/Stepper";
import PlanComparator from "@/components/vs/PlanComparator";
import type { VsProject, VsPlan, ApiResponse } from "@/lib/vs/types";

export default function ReformatagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();

  const [project, setProject] = useState<VsProject | null>(null);
  const [plans, setPlans] = useState<VsPlan[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Chargement initial ───────────────────────────────────────

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setLoading(true);
        setError(null);

        const [projectRes, plansRes] = await Promise.all([
          fetch(`/api/vs/projects/${projectId}`, { signal }),
          fetch(`/api/vs/projects/${projectId}/plans`, { signal }),
        ]);

        const projectJson = (await projectRes.json()) as ApiResponse<VsProject>;
        const plansJson = (await plansRes.json()) as ApiResponse<VsPlan[]>;

        if (!projectJson.success) {
          setError(projectJson.error);
          return;
        }
        if (!plansJson.success) {
          setError(plansJson.error);
          return;
        }

        setProject(projectJson.data);
        setPlans(plansJson.data);
        if (plansJson.data.length > 0) {
          setSelectedFloor(plansJson.data[0].floor_number);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(
          "Impossible de charger les plans. Vérifiez votre connexion et actualisez la page."
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  // ─── Étages disponibles ───────────────────────────────────────

  const floors = useMemo(() => {
    const set = new Set<number>();
    for (const p of plans) set.add(p.floor_number);
    return Array.from(set).sort((a, b) => a - b);
  }, [plans]);

  const currentPlan = useMemo(
    () => plans.find((p) => p.floor_number === selectedFloor) ?? null,
    [plans, selectedFloor]
  );

  // ─── URLs (original + reformaté) ──────────────────────────────

  const originalUrl = currentPlan
    ? `/api/vs/files?path=${encodeURIComponent(currentPlan.file_path)}`
    : null;

  const canonicalizedUrl =
    currentPlan && currentPlan.canonicalized_image_path
      ? `/api/vs/files?path=${encodeURIComponent(currentPlan.canonicalized_image_path)}`
      : null;

  // ─── Stepper ─────────────────────────────────────────────────

  const completedSteps: (1 | 2 | 3 | 4 | 5)[] = [1];

  // ─── Handlers ─────────────────────────────────────────────────

  const handleContinue = useCallback(() => {
    router.push(`/vs/projects/${projectId}/lots`);
  }, [projectId, router]);

  // ─── États ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex gap-2xl">
        <aside className="hidden md:block w-64 flex-shrink-0">
          <Stepper currentStep={2} projectId={projectId} completedSteps={[1]} />
        </aside>
        <div className="flex-1 flex items-center justify-center py-4xl">
          <div className="text-center">
            <div className="inline-block w-6 h-6 border-2 border-[var(--color-border-default)] border-t-[var(--color-interactive-primary)] rounded-full animate-spin mb-md" />
            <p className="text-sm text-[var(--color-text-muted)]">
              Reformatage du plan en cours…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4xl">
        <p className="text-sm text-[var(--color-error)] max-w-md mx-auto">
          {error}
        </p>
        <button
          onClick={() => fetchData()}
          className="mt-md min-h-[44px] px-md py-sm rounded-md text-sm font-medium bg-[var(--color-interactive-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-interactive-hover)] transition-colors duration-200"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!project || plans.length === 0 || !currentPlan || !originalUrl) {
    return (
      <div className="flex gap-2xl">
        <aside className="hidden md:block w-64 flex-shrink-0">
          <Stepper currentStep={2} projectId={projectId} completedSteps={[1]} />
        </aside>
        <div className="flex-1 flex items-center justify-center py-4xl">
          <div className="text-center">
            <p className="text-sm text-[var(--color-text-muted)] mb-md">
              Aucun plan déposé pour ce projet.
            </p>
            <button
              onClick={() =>
                router.push(`/vs/projects/${projectId}/upload`)
              }
              className="min-h-[44px] px-xl py-sm rounded-md text-sm font-medium bg-[var(--color-interactive-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-interactive-hover)] transition-colors duration-200"
            >
              Déposer un plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasCanonical = Boolean(canonicalizedUrl);

  // ─── Rendu principal ──────────────────────────────────────────

  return (
    <div className="flex flex-col md:flex-row gap-lg md:gap-2xl">
      {/* Stepper latéral (desktop) */}
      <aside className="hidden md:block w-64 flex-shrink-0">
        <Stepper currentStep={2} projectId={projectId} completedSteps={completedSteps} />
      </aside>
      {/* Stepper horizontal (mobile) */}
      <div className="md:hidden mb-lg">
        <Stepper
          currentStep={2}
          projectId={projectId}
          completedSteps={completedSteps}
          variant="horizontal"
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {/* En-tête */}
        <div className="mb-lg">
          <button
            type="button"
            onClick={() => router.push(`/vs/projects/${projectId}/upload`)}
            className="inline-flex items-center gap-xs text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-default)] transition-colors duration-150 mb-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)] min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Plans
          </button>
          <p className="text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-xs">
            {project.adresse}
          </p>
          <h1 className="text-xl font-semibold text-[var(--color-text-default)]">
            {hasCanonical
              ? "Vérifiez votre plan reformaté"
              : "Plan non reformaté"}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-sm max-w-2xl">
            {hasCanonical
              ? "Votre plan a été nettoyé automatiquement (meubles, annotations, légendes retirés) pour améliorer la précision de l'analyse. Comparez avant de continuer."
              : "Le reformatage automatique n'a pas pu aboutir. Vous pouvez continuer avec le plan original — les résultats peuvent être moins précis."}
          </p>
        </div>

        {/* Sélecteur d'étage si plusieurs */}
        {floors.length > 1 && (
          <div className="mb-lg flex items-center gap-sm flex-wrap">
            <span className="text-xs uppercase tracking-widest text-[var(--color-text-muted)]">
              Étage :
            </span>
            {floors.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setSelectedFloor(f)}
                className={`min-h-[44px] px-md py-2xs rounded-md text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)] ${
                  selectedFloor === f
                    ? "bg-[var(--color-interactive-primary)] text-[var(--color-text-inverse)]"
                    : "bg-[var(--color-bg-subtle)] text-[var(--color-text-default)] hover:bg-[var(--color-bg-default)]"
                }`}
                aria-pressed={selectedFloor === f}
              >
                {f === 0 ? "Rez-de-chaussée" : `Étage ${f}`}
              </button>
            ))}
          </div>
        )}

        {/* Bannière fallback non-bloquante */}
        {!hasCanonical && (
          <div
            role="status"
            className="mb-lg rounded-md border border-orange-300 bg-orange-50 px-md py-sm text-sm text-orange-900 flex items-start gap-sm"
          >
            <svg
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <div className="flex-1">
              <p className="font-medium">Reformatage indisponible pour ce plan</p>
              <p className="mt-2xs">
                Le reformatage automatique du plan n&apos;a pas pu aboutir.
                Les résultats peuvent être moins précis.
              </p>
            </div>
          </div>
        )}

        {/* Comparateur avant/après */}
        <div className="mb-2xl">
          <PlanComparator
            plan={currentPlan}
            originalUrl={originalUrl}
            canonicalizedUrl={canonicalizedUrl}
          />
        </div>

        {/* CTA unique */}
        <div className="flex flex-col sm:flex-row gap-sm items-stretch sm:items-center justify-end">
          <button
            type="button"
            onClick={handleContinue}
            className="min-h-[44px] px-xl py-sm rounded-md text-sm font-medium bg-[var(--color-interactive-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-interactive-hover)] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive-primary)] inline-flex items-center justify-center gap-xs"
          >
            {hasCanonical ? "Utiliser ce plan" : "Continuer avec le plan original"}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
