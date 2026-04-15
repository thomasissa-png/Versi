/**
 * Step 1 — Upload des plans
 * Rendu : Client Component — interactions drag-and-drop.
 *
 * 5 états UI :
 * - Défaut : zone de dépôt vide
 * - Loading : upload en cours (indicateur par fichier)
 * - Vide : = défaut (aucun plan)
 * - Erreur : toast rouge
 * - Succès : grille de miniatures + bouton "Analyser les plans"
 */

"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import DropZone from "@/components/vs/DropZone";
import PlanThumbnail from "@/components/vs/PlanThumbnail";
import Stepper from "@/components/vs/Stepper";
import type { VsPlan, VsProject, ApiResponse } from "@/lib/vs/types";
import { MAX_FILES_PER_PROJECT } from "@/lib/vs/types";

// ─── Composant principal ───────────────────────────────────────────

export default function UploadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();

  const [project, setProject] = useState<VsProject | null>(null);
  const [plans, setPlans] = useState<VsPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─── Chargement initial ────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [projectRes, plansRes] = await Promise.all([
        fetch(`/api/vs/projects/${projectId}`),
        fetch(`/api/vs/projects/${projectId}/plans`),
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
    } catch {
      setError("Impossible de charger les données du projet.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Upload de fichiers ────────────────────────────────────────

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      const remainingSlots = MAX_FILES_PER_PROJECT - plans.length;
      if (remainingSlots <= 0) {
        setError(`Maximum ${MAX_FILES_PER_PROJECT} plans par opération.`);
        return;
      }

      const filesToUpload = files.slice(0, remainingSlots);
      if (filesToUpload.length < files.length) {
        setError(
          `Seuls ${filesToUpload.length} fichiers seront uploadés (limite de ${MAX_FILES_PER_PROJECT} plans).`
        );
      }

      setUploading(true);
      setUploadProgress(filesToUpload.map((f) => f.name));
      setError(null);

      const newPlans: VsPlan[] = [];
      const errors: string[] = [];

      for (const file of filesToUpload) {
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("floor_number", "0");

          const res = await fetch(`/api/vs/projects/${projectId}/plans`, {
            method: "POST",
            body: formData,
          });

          const json = (await res.json()) as ApiResponse<VsPlan>;

          if (json.success) {
            newPlans.push(json.data);
          } else {
            errors.push(`${file.name} : ${json.error}`);
          }
        } catch {
          errors.push(`${file.name} : erreur réseau.`);
        }

        // Retirer de la progression
        setUploadProgress((prev) => prev.filter((name) => name !== file.name));
      }

      setPlans((prev) => [...prev, ...newPlans]);
      setUploading(false);

      if (errors.length > 0) {
        setError(errors.join(" "));
      }
    },
    [plans.length, projectId]
  );

  // ─── Suppression d'un plan ─────────────────────────────────────

  const handleDelete = useCallback(async (planId: string) => {
    setDeletingId(planId);
    try {
      const res = await fetch(`/api/vs/plans/${planId}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as ApiResponse<{ deleted: boolean }>;

      if (json.success) {
        setPlans((prev) => prev.filter((p) => p.id !== planId));
      } else {
        setError(json.error);
      }
    } catch {
      setError("Impossible de supprimer le plan.");
    } finally {
      setDeletingId(null);
    }
  }, []);

  // ─── Modification du numéro d'étage ────────────────────────────

  const handleFloorChange = useCallback(
    async (planId: string, floor: number) => {
      // Optimistic update
      setPlans((prev) =>
        prev.map((p) => (p.id === planId ? { ...p, floor_number: floor } : p))
      );

      // Note : l'API PATCH plans n'est pas implémentée dans cette passe.
      // Le floor_number sera persisté quand l'API PATCH plan sera ajoutée.
    },
    []
  );

  // ─── Analyser les plans ────────────────────────────────────────

  const handleAnalyze = useCallback(async () => {
    // Stub : passer le projet en step_1_complete et naviguer vers step 2
    try {
      await fetch(`/api/vs/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "step_1_complete" }),
      });
      router.push(`/vs/projects/${projectId}/lots`);
    } catch {
      setError("Impossible de lancer l'analyse.");
    }
  }, [projectId, router]);

  // ─── Rendu ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex gap-2xl">
        <aside className="w-64 flex-shrink-0">
          <Stepper currentStep={1} projectId={projectId} />
        </aside>
        <div className="flex-1 flex items-center justify-center py-4xl">
          <div className="inline-block w-6 h-6 border-2 border-border-default border-t-interactive-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-4xl">
        <p className="text-text-muted">Opération introuvable.</p>
        <button
          onClick={() => router.push("/vs")}
          className="mt-md text-sm underline text-text-muted hover:text-text-default"
        >
          Retour aux opérations
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2xl">
      {/* Stepper latéral */}
      <aside className="w-64 flex-shrink-0">
        <Stepper currentStep={1} projectId={projectId} />
      </aside>

      {/* Contenu principal */}
      <div className="flex-1">
        {/* En-tête */}
        <div className="mb-xl">
          <p className="vs-label mb-xs">{project.adresse}</p>
          <h1 className="vs-h3">Uploadez vos plans</h1>
          <p className="text-sm text-text-muted mt-sm">
            Un plan par lot, ou un plan d'ensemble — les deux formats
            fonctionnent. PDF ou image, résolution minimum 150 dpi.
          </p>
        </div>

        {/* Erreur globale */}
        {error && (
          <div className="mb-lg bg-error/10 border border-error/20 rounded-md p-md text-sm text-error flex items-start gap-sm">
            <svg
              className="w-4 h-4 mt-0.5 flex-shrink-0"
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
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-error hover:text-error/80"
              aria-label="Fermer le message d'erreur"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Zone de dépôt */}
        <DropZone
          onFilesSelected={handleFilesSelected}
          disabled={uploading || plans.length >= MAX_FILES_PER_PROJECT}
        />

        {/* Progression d'upload */}
        {uploading && uploadProgress.length > 0 && (
          <div className="mt-lg">
            {uploadProgress.map((name) => (
              <div
                key={name}
                className="flex items-center gap-sm py-sm text-sm text-text-muted"
              >
                <div className="w-4 h-4 border-2 border-border-default border-t-interactive-primary rounded-full animate-spin" />
                <span>Upload de {name}...</span>
              </div>
            ))}
          </div>
        )}

        {/* Grille de plans uploadés */}
        {plans.length > 0 && (
          <div className="mt-2xl">
            <div className="flex items-center justify-between mb-md">
              <h2 className="text-sm font-medium text-text-default">
                {plans.length} plan{plans.length > 1 ? "s" : ""} uploadé
                {plans.length > 1 ? "s" : ""}
              </h2>
              <span className="text-xs text-text-muted">
                {MAX_FILES_PER_PROJECT - plans.length} emplacement
                {MAX_FILES_PER_PROJECT - plans.length > 1 ? "s" : ""} restant
                {MAX_FILES_PER_PROJECT - plans.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md">
              {plans.map((plan) => (
                <PlanThumbnail
                  key={plan.id}
                  plan={plan}
                  onDelete={handleDelete}
                  onFloorChange={handleFloorChange}
                  deleting={deletingId === plan.id}
                />
              ))}
            </div>

            {/* Bouton Analyser */}
            <div className="mt-2xl flex justify-end">
              <button
                onClick={handleAnalyze}
                disabled={plans.length === 0}
                className="
                  px-2xl py-md rounded-md text-sm font-medium
                  bg-interactive-primary text-text-inverse
                  hover:bg-interactive-hover
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-200
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
                "
              >
                Analyser les plans
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
