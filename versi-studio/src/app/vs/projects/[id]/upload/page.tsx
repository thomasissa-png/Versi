/**
 * Step 1 — Upload des plans
 * Rendu : Client Component — interactions drag-and-drop.
 *
 * 5 états UI :
 * - Défaut : zone de dépôt vide
 * - Loading : upload en cours (progression parallèle par fichier)
 * - Vide : = défaut (aucun plan)
 * - Erreur : toast rouge + tuiles "Réessayer" par fichier échoué
 * - Succès : grille de miniatures + bouton "Lancer l'analyse"
 *
 * P0 corrigés Batch 4 versi-s15 :
 * - P0.1 Modal de confirmation suppression (ConfirmModal — remplace confirm() natif)
 * - P0.2 floor_number calculé côté client + persistance via PATCH /api/vs/plans/[id]
 * - P0.3 Bouton "Lancer l'analyse" avec état loading + POST /extract avant redirection
 * - P0.4 Message erreur réseau actionnable ("vérifiez votre connexion et réessayez")
 * - P0.5 Upload parallèle via Promise.allSettled + AbortController (race condition safe)
 * - P0.6 Retry par fichier (tuile "Réessayer" pour chaque upload échoué)
 * - Anglicismes : "uploader/uploadé" → "déposer/déposé"
 */

"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import DropZone from "@/components/vs/DropZone";
import PlanThumbnail from "@/components/vs/PlanThumbnail";
import Stepper from "@/components/vs/Stepper";
import ConfirmModal from "@/components/vs/ConfirmModal";
import type { VsPlan, VsProject, ApiResponse } from "@/lib/vs/types";
import { MAX_FILES_PER_PROJECT } from "@/lib/vs/types";

// ─── Types locaux ──────────────────────────────────────────────────

type FailedUpload = { file: File; error: string; targetFloor: number };

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
  // Map<fileName, percent 0-100> — % d'upload réel via XHR onprogress
  const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(
    new Map()
  );
  const [failedFiles, setFailedFiles] = useState<FailedUpload[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // AbortController pour annuler les uploads en cours au démontage
  const uploadAbortRef = useRef<AbortController | null>(null);

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
      setError(
        "Impossible de charger les données du projet — vérifiez votre connexion et réessayez."
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cleanup : annuler les uploads en cours si l'utilisateur quitte la page
  useEffect(() => {
    return () => {
      uploadAbortRef.current?.abort();
    };
  }, []);

  // ─── Upload d'un fichier unitaire (réutilisé pour retry) ───────

  const uploadSingleFile = useCallback(
    (
      file: File,
      targetFloor: number,
      signal: AbortSignal
    ): Promise<{ plan: VsPlan } | { error: string }> => {
      return new Promise((resolve) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("floor_number", String(targetFloor));

        const xhr = new XMLHttpRequest();

        // Progression d'upload réelle (event lengthComputable)
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setUploadProgress((prev) => {
              const next = new Map(prev);
              next.set(file.name, percent);
              return next;
            });
          }
        });

        // Réponse reçue
        xhr.addEventListener("load", () => {
          try {
            const json = JSON.parse(xhr.responseText) as ApiResponse<VsPlan>;
            if (xhr.status >= 200 && xhr.status < 300 && json.success) {
              resolve({ plan: json.data });
            } else if (!json.success) {
              resolve({ error: json.error });
            } else {
              resolve({
                error: `${file.name} n'a pas pu être déposé — vérifiez votre connexion et réessayez.`,
              });
            }
          } catch {
            resolve({
              error: `${file.name} n'a pas pu être déposé — vérifiez votre connexion et réessayez.`,
            });
          }
        });

        // Erreur réseau
        xhr.addEventListener("error", () => {
          resolve({
            error: `${file.name} n'a pas pu être déposé — vérifiez votre connexion et réessayez.`,
          });
        });

        // Annulation (AbortController.abort() ou démontage)
        xhr.addEventListener("abort", () => {
          resolve({ error: "Dépôt annulé." });
        });

        // Branchement AbortController
        if (signal.aborted) {
          resolve({ error: "Dépôt annulé." });
          return;
        }
        signal.addEventListener("abort", () => xhr.abort());

        xhr.open("POST", `/api/vs/projects/${projectId}/plans`);
        xhr.send(formData);
      });
    },
    [projectId]
  );

  // ─── Upload de fichiers (parallèle) ────────────────────────────

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      const remainingSlots = MAX_FILES_PER_PROJECT - plans.length;
      if (remainingSlots <= 0) {
        setError(
          `Vous avez atteint la limite de ${MAX_FILES_PER_PROJECT} plans par opération. Supprimez un plan existant pour en ajouter un nouveau.`
        );
        return;
      }

      const filesToUpload = files.slice(0, remainingSlots);
      if (filesToUpload.length < files.length) {
        setError(
          `${filesToUpload.length} fichier${filesToUpload.length > 1 ? "s" : ""} ajouté${filesToUpload.length > 1 ? "s" : ""} — limite de ${MAX_FILES_PER_PROJECT} plans par opération atteinte.`
        );
      } else {
        setError(null);
      }

      setUploading(true);
      // Initialiser tous les fichiers à 0 % (sera mis à jour par xhr.upload.onprogress)
      setUploadProgress(new Map(filesToUpload.map((f) => [f.name, 0])));
      setFailedFiles([]);

      const controller = new AbortController();
      uploadAbortRef.current = controller;

      const baseOffset = plans.length;

      const results = await Promise.allSettled(
        filesToUpload.map((file, index) =>
          uploadSingleFile(file, baseOffset + index, controller.signal).then(
            (result) => ({ file, targetFloor: baseOffset + index, result })
          )
        )
      );

      const newPlans: VsPlan[] = [];
      const newFailed: FailedUpload[] = [];

      for (const settled of results) {
        if (settled.status !== "fulfilled") continue;
        const { file, targetFloor, result } = settled.value;
        if ("plan" in result) {
          newPlans.push(result.plan);
        } else {
          newFailed.push({ file, targetFloor, error: result.error });
        }
        setUploadProgress((prev) => {
          const next = new Map(prev);
          next.delete(file.name);
          return next;
        });
      }

      setPlans((prev) => [...prev, ...newPlans]);
      setFailedFiles(newFailed);
      setUploading(false);
      uploadAbortRef.current = null;
    },
    [plans.length, uploadSingleFile]
  );

  // ─── Retry d'un fichier échoué ─────────────────────────────────

  const handleRetry = useCallback(
    async (failedUpload: FailedUpload) => {
      const { file, targetFloor } = failedUpload;

      setFailedFiles((prev) => prev.filter((f) => f.file !== file));
      setUploadProgress((prev) => new Map(prev).set(file.name, 0));

      const controller = new AbortController();
      const result = await uploadSingleFile(file, targetFloor, controller.signal);

      setUploadProgress((prev) => {
        const next = new Map(prev);
        next.delete(file.name);
        return next;
      });

      if ("plan" in result) {
        setPlans((prev) => [...prev, result.plan]);
      } else {
        setFailedFiles((prev) => [...prev, { file, targetFloor, error: result.error }]);
      }
    },
    [uploadSingleFile]
  );

  // ─── Suppression d'un plan (avec modal de confirmation) ────────

  const askDeleteConfirm = useCallback((planId: string) => {
    setConfirmDeleteId(planId);
  }, []);

  const confirmDelete = useCallback(async () => {
    const planId = confirmDeleteId;
    if (!planId) return;
    setConfirmDeleteId(null);
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
      setError(
        "Impossible de supprimer le plan — vérifiez votre connexion et réessayez."
      );
    } finally {
      setDeletingId(null);
    }
  }, [confirmDeleteId]);

  // ─── Modification du numéro d'étage (avec persistance PATCH) ───

  const handleFloorChange = useCallback(
    async (planId: string, floor: number) => {
      const previousPlans = plans;

      // Optimistic update
      setPlans((prev) =>
        prev.map((p) => (p.id === planId ? { ...p, floor_number: floor } : p))
      );

      try {
        const res = await fetch(`/api/vs/plans/${planId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ floor_number: floor }),
        });
        const json = (await res.json()) as ApiResponse<{
          id: string;
          floor_number: number;
        }>;

        if (!json.success) {
          // Rollback
          setPlans(previousPlans);
          setError(json.error);
        }
      } catch {
        setPlans(previousPlans);
        setError(
          "Impossible de mettre à jour l'étage — la valeur précédente a été restaurée. Vérifiez votre connexion et réessayez."
        );
      }
    },
    [plans]
  );

  // ─── Analyser les plans ────────────────────────────────────────

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // 1. Passer le projet en step_1_complete
      const patchRes = await fetch(`/api/vs/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "step_1_complete" }),
      });
      const patchJson = (await patchRes.json()) as ApiResponse<VsProject>;
      if (!patchJson.success) {
        setError(patchJson.error);
        setIsAnalyzing(false);
        return;
      }

      // 2. Lancer l'extraction IA
      const extractRes = await fetch(
        `/api/vs/projects/${projectId}/extract`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const extractJson = (await extractRes.json()) as ApiResponse<{
        lots_created: number;
      }>;
      if (!extractJson.success) {
        setError(extractJson.error);
        setIsAnalyzing(false);
        return;
      }

      // 3. Rediriger vers l'étape Lots (stepper 4 étapes — UI Reformatage supprimée s25 Round 2)
      //    La canonicalisation reste active en backend (flag VS_PLAN_CANONICALIZE)
      //    mais invisible côté utilisateur : fallback silencieux si échec.
      router.push(`/vs/projects/${projectId}/lots`);
    } catch {
      setError(
        "Impossible de lancer l'analyse — vérifiez votre connexion et réessayez."
      );
      setIsAnalyzing(false);
    }
  }, [projectId, router]);

  // ─── Rendu ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row gap-lg md:gap-2xl">
        <aside className="hidden md:block md:w-64 md:flex-shrink-0">
          <Stepper currentStep={1} projectId={projectId} />
        </aside>
        <div className="md:hidden mb-lg">
          <Stepper currentStep={1} projectId={projectId} variant="horizontal" />
        </div>
        <div className="flex-1 flex items-center justify-center py-4xl">
          <div className="inline-block w-6 h-6 border-2 border-border-default border-t-interactive-primary rounded-full animate-spin motion-reduce:animate-none" />
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
    <div className="flex flex-col md:flex-row gap-lg md:gap-2xl">
      {/* Stepper latéral (desktop/tablet) */}
      <aside className="hidden md:block md:w-64 md:flex-shrink-0">
        <Stepper
          currentStep={1}
          projectId={projectId}
          completedSteps={project?.status === "step_1_complete" ? [1] : []}
        />
      </aside>

      {/* Stepper horizontal (mobile) */}
      <div className="md:hidden mb-lg">
        <Stepper
          currentStep={1}
          projectId={projectId}
          variant="horizontal"
          completedSteps={project?.status === "step_1_complete" ? [1] : []}
        />
      </div>

      {/* Contenu principal */}
      <div className="flex-1 min-w-0">
        {/* En-tête */}
        <div className="mb-xl">
          <p className="vs-label mb-xs">{project.adresse}</p>
          <h1 className="vs-h3">Déposez vos plans</h1>
          <p className="text-sm text-text-muted mt-sm">
            Un plan par lot, ou un plan d&apos;ensemble — les deux formats
            fonctionnent.
            <br />
            Formats acceptés : PDF, PNG, JPG, WEBP — résolution minimum 150 dpi,
            20 Mo max par fichier.
          </p>
        </div>

        {/* Erreur globale */}
        {error && (
          <div
            role="alert"
            className="mb-lg bg-error/10 border border-error/20 rounded-md p-md text-sm text-error flex items-start gap-sm"
          >
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
              className="ml-auto min-h-[44px] min-w-[44px] flex items-center justify-center text-error hover:text-error/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error rounded-sm"
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

        {/* Progression d'upload (parallèle, % réel via XHR onprogress) */}
        {uploading && uploadProgress.size > 0 && (
          <div className="mt-lg flex flex-col gap-sm">
            {Array.from(uploadProgress.entries()).map(([name, percent]) => (
              <div key={name} className="text-sm text-text-muted">
                <div className="flex items-center gap-sm py-2xs">
                  <div className="w-4 h-4 border-2 border-border-default border-t-interactive-primary rounded-full animate-spin motion-reduce:animate-none" />
                  <span className="flex-1 truncate">
                    Dépôt de {name} en cours…
                  </span>
                  <span
                    className="tabular-nums text-xs"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {percent}&nbsp;%
                  </span>
                </div>
                <div
                  className="h-1 w-full bg-border-default rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progression du dépôt de ${name}`}
                >
                  <div
                    className="h-full bg-interactive-primary transition-[width] duration-200 motion-reduce:transition-none"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Uploads échoués — tuiles retry */}
        {failedFiles.length > 0 && (
          <div className="mt-lg flex flex-col gap-sm">
            {failedFiles.map((failed) => (
              <div
                key={failed.file.name}
                className="flex items-center gap-sm p-md bg-error/10 border border-error/20 rounded-md text-sm"
              >
                <svg
                  className="w-4 h-4 text-error flex-shrink-0"
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
                <div className="flex-1">
                  <p className="font-medium text-text-default">
                    {failed.file.name}
                  </p>
                  <p className="text-xs text-text-muted mt-2xs">
                    {failed.error}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRetry(failed)}
                  className="min-h-[44px] px-md py-sm rounded-md text-sm font-medium bg-interactive-primary text-text-inverse hover:bg-interactive-hover transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
                >
                  Réessayer
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Grille de plans déposés */}
        {plans.length > 0 && (
          <div className="mt-2xl">
            <div className="flex items-center justify-between mb-md">
              <h2 className="text-sm font-medium text-text-default">
                {plans.length} plan{plans.length > 1 ? "s" : ""} déposé
                {plans.length > 1 ? "s" : ""}
              </h2>
              <span className="text-xs text-text-muted">
                {MAX_FILES_PER_PROJECT - plans.length} emplacement
                {MAX_FILES_PER_PROJECT - plans.length > 1 ? "s" : ""} restant
                {MAX_FILES_PER_PROJECT - plans.length > 1 ? "s" : ""} sur{" "}
                {MAX_FILES_PER_PROJECT}
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md">
              {plans.map((plan) => (
                <PlanThumbnail
                  key={plan.id}
                  plan={plan}
                  onDelete={askDeleteConfirm}
                  onFloorChange={handleFloorChange}
                  deleting={deletingId === plan.id}
                />
              ))}
            </div>

            {/* s25 Round 2 — Comparateur "avant/après" retiré de l'UI client-facing.
                Le composant PlanComparator reste disponible pour un futur écran
                admin de debug. La canonicalisation tourne en silencieux. */}
          </div>
        )}

        {/* Bouton Analyser — toujours rendu, disabled si 0 plan */}
        <div className="mt-2xl flex justify-end">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={plans.length === 0 || isAnalyzing}
            aria-busy={isAnalyzing}
            title={
              plans.length === 0
                ? "Déposez au moins un plan pour lancer l'analyse"
                : undefined
            }
            className="
              inline-flex items-center gap-sm
              min-h-[44px] px-2xl py-md rounded-md text-sm font-medium
              bg-interactive-primary text-text-inverse
              hover:bg-interactive-hover
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200 motion-reduce:transition-none
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
            "
          >
            {isAnalyzing && (
              <span
                className="inline-block w-4 h-4 border-2 border-text-inverse/40 border-t-text-inverse rounded-full animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            )}
            {isAnalyzing ? "Analyse en cours…" : "Lancer l'analyse"}
          </button>
        </div>

        {/* Modal de confirmation suppression */}
        <ConfirmModal
          isOpen={confirmDeleteId !== null}
          title="Supprimer ce plan ?"
          message="Cette action est irréversible. Le fichier sera supprimé définitivement."
          confirmLabel="Supprimer"
          cancelLabel="Annuler"
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      </div>
    </div>
  );
}
