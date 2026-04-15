/**
 * Dashboard — Mes opérations
 * Rendu : SSR avec Suspense — données dynamiques (liste des projets).
 *
 * - Liste des projets existants
 * - Bouton "Nouvelle opération" → formulaire inline
 * - État vide : message d'invitation
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type {
  VsProject,
  TypeBien,
  CreateProjectPayload,
  ApiResponse,
} from "@/lib/vs/types";
import { TYPE_BIEN_OPTIONS } from "@/lib/vs/types";

// ─── Status labels ─────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  step_1_complete: "Plans uploadés",
  step_2_complete: "Lots découpés",
  step_3_complete: "Pièces identifiées",
  completed: "Terminé",
};

// ─── Composant principal ───────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<VsProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/vs/projects");
      const json = (await res.json()) as ApiResponse<VsProject[]>;

      if (json.success) {
        setProjects(json.data);
      } else {
        setError(json.error);
      }
    } catch {
      setError("Impossible de charger les opérations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleProjectCreated = (project: VsProject) => {
    setShowForm(false);
    router.push(`/vs/projects/${project.id}/upload`);
  };

  return (
    <div>
      {/* Header section */}
      <div className="flex items-center justify-between mb-2xl">
        <h1 className="vs-h3">Mes opérations</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="
            px-lg py-sm rounded-md text-sm font-medium
            bg-interactive-primary text-text-inverse
            hover:bg-interactive-hover
            transition-colors duration-200
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
          "
        >
          {showForm ? "Annuler" : "Nouvelle opération"}
        </button>
      </div>

      {/* Formulaire de création */}
      {showForm && (
        <div className="mb-2xl">
          <CreateProjectForm
            onCreated={handleProjectCreated}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-4xl">
          <div className="inline-block w-6 h-6 border-2 border-border-default border-t-interactive-primary rounded-full animate-spin" />
          <p className="mt-md text-sm text-text-muted">Chargement...</p>
        </div>
      )}

      {/* Erreur */}
      {error && !loading && (
        <div className="bg-error/10 border border-error/20 rounded-md p-lg text-sm text-error">
          {error}
          <button
            onClick={fetchProjects}
            className="ml-md underline hover:no-underline"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* État vide */}
      {!loading && !error && projects.length === 0 && (
        <div className="text-center py-4xl">
          <div className="w-16 h-16 mx-auto mb-lg rounded-full bg-bg-card border border-border-default flex items-center justify-center">
            <svg
              className="w-8 h-8 text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21"
              />
            </svg>
          </div>
          <p className="text-text-muted">
            Aucune opération. Créez-en une pour commencer.
          </p>
        </div>
      )}

      {/* Liste des projets */}
      {!loading && !error && projects.length > 0 && (
        <div className="grid gap-md">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Formulaire de création ────────────────────────────────────────

function CreateProjectForm({
  onCreated,
  onCancel,
}: {
  onCreated: (project: VsProject) => void;
  onCancel: () => void;
}) {
  const [adresse, setAdresse] = useState("");
  const [typeBien, setTypeBien] = useState<TypeBien>("immeuble");
  const [surfaceTotale, setSurfaceTotale] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (adresse.trim().length < 5) {
      setError("L'adresse doit contenir au moins 5 caractères.");
      return;
    }

    try {
      setSubmitting(true);
      const payload: CreateProjectPayload = {
        adresse: adresse.trim(),
        type_bien: typeBien,
        surface_totale: surfaceTotale ? parseInt(surfaceTotale, 10) : null,
      };

      const res = await fetch("/api/vs/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as ApiResponse<VsProject>;

      if (json.success) {
        onCreated(json.data);
      } else {
        setError(json.error);
      }
    } catch {
      setError("Impossible de créer l'opération.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-bg-card border border-border-default rounded-lg p-xl"
    >
      <h2 className="text-lg font-medium mb-lg">Nouvelle opération</h2>

      {error && (
        <div className="mb-lg bg-error/10 border border-error/20 rounded-md p-md text-sm text-error">
          {error}
        </div>
      )}

      <div className="grid gap-lg">
        {/* Adresse */}
        <div>
          <label
            htmlFor="adresse"
            className="vs-label block mb-xs"
          >
            Adresse
          </label>
          <input
            id="adresse"
            type="text"
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            placeholder="12 rue de la République, 69001 Lyon"
            required
            minLength={5}
            className="
              w-full px-md py-sm rounded-md text-sm
              border border-border-default bg-bg-card
              focus:outline-none focus:ring-2 focus:ring-interactive-primary/20 focus:border-interactive-primary
              placeholder:text-text-muted/50
              transition-colors
            "
          />
        </div>

        {/* Type de bien */}
        <div>
          <label
            htmlFor="type_bien"
            className="vs-label block mb-xs"
          >
            Type de bien
          </label>
          <select
            id="type_bien"
            value={typeBien}
            onChange={(e) => setTypeBien(e.target.value as TypeBien)}
            className="
              w-full px-md py-sm rounded-md text-sm
              border border-border-default bg-bg-card
              focus:outline-none focus:ring-2 focus:ring-interactive-primary/20 focus:border-interactive-primary
              transition-colors
            "
          >
            {TYPE_BIEN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Surface totale */}
        <div>
          <label
            htmlFor="surface_totale"
            className="vs-label block mb-xs"
          >
            Surface totale (m2, optionnel)
          </label>
          <input
            id="surface_totale"
            type="number"
            value={surfaceTotale}
            onChange={(e) => setSurfaceTotale(e.target.value)}
            placeholder="350"
            min={1}
            className="
              w-full px-md py-sm rounded-md text-sm
              border border-border-default bg-bg-card
              focus:outline-none focus:ring-2 focus:ring-interactive-primary/20 focus:border-interactive-primary
              placeholder:text-text-muted/50
              transition-colors
            "
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-md mt-xl">
        <button
          type="submit"
          disabled={submitting}
          className="
            px-xl py-sm rounded-md text-sm font-medium
            bg-interactive-primary text-text-inverse
            hover:bg-interactive-hover
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
          "
        >
          {submitting ? "Création..." : "Créer l'opération"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="
            px-xl py-sm rounded-md text-sm font-medium
            text-text-muted hover:text-text-default
            transition-colors duration-200
          "
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

// ─── Carte projet ──────────────────────────────────────────────────

function ProjectCard({ project }: { project: VsProject }) {
  const router = useRouter();

  const createdDate = new Date(project.created_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <button
      onClick={() => router.push(`/vs/projects/${project.id}/upload`)}
      className="
        w-full text-left bg-bg-card border border-border-default rounded-lg p-xl
        hover:border-interactive-primary/30 hover:shadow-sm
        transition-all duration-200
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
      "
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-medium text-text-default">
            {project.adresse}
          </h3>
          <div className="flex items-center gap-md mt-sm">
            <span className="vs-label">
              {project.type_bien}
            </span>
            {project.surface_totale && (
              <span className="vs-label">
                {project.surface_totale} m2
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block px-sm py-2xs rounded text-xs bg-bg-default text-text-muted">
            {STATUS_LABELS[project.status] || project.status}
          </span>
          <p className="text-xs text-text-muted mt-xs">{createdDate}</p>
        </div>
      </div>
    </button>
  );
}
