/**
 * Dashboard — Mes opérations
 * Rendu : SSR avec Suspense — données dynamiques (liste des projets).
 *
 * - Liste des projets existants
 * - Bouton "Nouvelle opération" → formulaire inline
 * - État vide : message d'invitation
 */

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import type {
  VsProject,
  TypeBien,
  CreateProjectPayload,
  ApiResponse,
} from "@/lib/vs/types";
import { TYPE_BIEN_OPTIONS } from "@/lib/vs/types";

// ─── Filtres statut ────────────────────────────────────────────────

type StatusFilter = "all" | "in_progress" | "completed" | "archived";

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: "Tous",
  in_progress: "En cours",
  completed: "Terminés",
  archived: "Archivés",
};

const PAGE_SIZE = 20;

// ─── Status labels ─────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: "En cours",
  step_1_complete: "Plans déposés",
  step_2_complete: "Lots découpés",
  step_3_complete: "Pièces identifiées",
  completed: "Terminé",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-bg-default text-text-muted border border-border-default",
  step_1_complete: "bg-warning/10 text-warning",
  step_2_complete: "bg-warning/10 text-warning",
  step_3_complete: "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
};

// ─── Composant principal ───────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<VsProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [lastCreatedTitle, setLastCreatedTitle] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Auto-dismiss toast après 4s
  useEffect(() => {
    if (!lastCreatedTitle) return;
    const t = setTimeout(() => setLastCreatedTitle(null), 4000);
    return () => clearTimeout(t);
  }, [lastCreatedTitle]);

  const fetchProjects = useCallback(async (externalSignal?: AbortSignal) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const signal = externalSignal ?? controller.signal;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/vs/projects", { signal });

      if (!res.ok) {
        throw new Error(String(res.status));
      }

      const json = (await res.json()) as ApiResponse<VsProject[]>;

      if (json.success) {
        setProjects(json.data);
      } else {
        setError(json.error);
      }
    } catch (err) {
      const errName = (err as Error).name;
      if (errName === "AbortError") return;
      setError("Impossible de charger les opérations.");
    } finally {
      clearTimeout(timeoutId);
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log("[analytics] vs_dashboard_loaded", {});
    const controller = new AbortController();
    fetchProjects(controller.signal);
    return () => controller.abort();
  }, [fetchProjects]);

  const handleProjectCreated = (project: VsProject) => {
    setShowForm(false);
    setLastCreatedTitle(project.adresse);
    router.push(`/vs/projects/${project.id}/upload`);
  };

  const handleArchive = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`/api/vs/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, status: "archived" } : p))
      );
    } catch {
      setError("Impossible d'archiver l'opération. Réessayez.");
    }
  }, []);

  const handleDelete = useCallback(async (projectId: string) => {
    if (!window.confirm("Supprimer définitivement cette opération ? Cette action est irréversible.")) {
      return;
    }
    try {
      const res = await fetch(`/api/vs/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch {
      setError("Impossible de supprimer l'opération. Réessayez.");
    }
  }, []);

  // Filtrage client-side : statut + recherche
  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects.filter((p) => {
      // Filtre statut
      if (statusFilter === "archived" && p.status !== "archived") return false;
      if (statusFilter === "completed" && p.status !== "completed") return false;
      if (
        statusFilter === "in_progress" &&
        (p.status === "completed" || p.status === "archived")
      )
        return false;
      if (statusFilter === "all" && p.status === "archived") return false;

      // Filtre recherche
      if (q.length > 0) {
        const haystack = `${p.adresse ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [projects, statusFilter, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProjects = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredProjects.slice(start, start + PAGE_SIZE);
  }, [filteredProjects, safeCurrentPage]);

  // Reset page quand filtre change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  return (
    <div aria-busy={loading}>
      {/* Toast feedback création projet */}
      {lastCreatedTitle && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-50 max-w-sm bg-success/10 border border-success/30 text-success rounded-md px-lg py-md shadow-md text-sm"
        >
          Opération &laquo;&nbsp;{lastCreatedTitle}&nbsp;&raquo; créée
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between mb-2xl">
        <div>
          <h1 className="vs-h1">Mes opérations</h1>
          <p className="vs-body-sm text-text-muted mt-1">
            Découpez vos plans, identifiez les lots et créez des visuels vendeurs — prêts à intégrer dans vos dossiers d&apos;acquisition.
          </p>
        </div>
        <button
          onClick={() => {
            if (!showForm) {
              console.log("[analytics] vs_new_project_cta_clicked", { source: "header" });
            }
            setShowForm(!showForm);
          }}
          className="
            w-full sm:w-auto
            px-lg py-[10px] rounded-md text-sm font-medium
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
          <p className="mt-md text-sm text-text-muted">Chargement de vos opérations…</p>
        </div>
      )}

      {/* Erreur */}
      {error && !loading && (
        <div
          role="alert"
          aria-live="polite"
          className="bg-error/10 border border-error/20 rounded-md p-lg text-sm text-error"
        >
          {error}
          <button
            onClick={() => fetchProjects()}
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
          <p className="vs-body mb-lg text-text-muted">
            Aucune opération pour l&apos;instant. Créez votre première opération pour commencer.
          </p>
          <button
            onClick={() => {
              console.log("[analytics] vs_new_project_cta_clicked", { source: "empty_state" });
              setShowForm(true);
            }}
            className="vs-btn-primary"
          >
            + Nouvelle opération
          </button>
        </div>
      )}

      {/* Liste des projets */}
      {!loading && !error && projects.length > 0 && (
        <>
          {/* Barre filtre + recherche */}
          <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between mb-lg">
            <div className="flex flex-wrap gap-xs" role="group" aria-label="Filtrer par statut">
              {(Object.keys(STATUS_FILTER_LABELS) as StatusFilter[]).map((key) => {
                const active = statusFilter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatusFilter(key)}
                    aria-pressed={active}
                    className={`
                      px-md py-[10px] rounded-md text-sm font-medium border transition-colors
                      focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
                      ${active
                        ? "bg-interactive-primary text-text-inverse border-interactive-primary"
                        : "bg-bg-card text-text-default border-border-default hover:border-interactive-primary/30"}
                    `}
                  >
                    {STATUS_FILTER_LABELS[key]}
                  </button>
                );
              })}
            </div>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une adresse…"
              aria-label="Rechercher une opération"
              className="
                w-full sm:w-72 px-md py-[10px] rounded-md text-sm
                border border-border-default bg-bg-card
                focus:outline-none focus:ring-2 focus:ring-interactive-primary/20 focus:border-interactive-primary
                placeholder:text-text-muted/50
                transition-colors
              "
            />
          </div>

          {filteredProjects.length === 0 ? (
            <div className="text-center py-2xl text-sm text-text-muted">
              Aucune opération ne correspond à votre filtre.
            </div>
          ) : (
            <div className="grid gap-md">
              {paginatedProjects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  position={(safeCurrentPage - 1) * PAGE_SIZE + index}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {filteredProjects.length > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-lg">
              <p className="text-xs text-text-muted">
                Page {safeCurrentPage} sur {totalPages} — {filteredProjects.length} opération
                {filteredProjects.length > 1 ? "s" : ""}
              </p>
              <div className="flex gap-xs">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="
                    px-md py-[10px] rounded-md text-sm font-medium border border-border-default
                    bg-bg-card text-text-default
                    hover:border-interactive-primary/30
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors
                  "
                >
                  Précédent
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="
                    px-md py-[10px] rounded-md text-sm font-medium border border-border-default
                    bg-bg-card text-text-default
                    hover:border-interactive-primary/30
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors
                  "
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </>
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
  const adresseRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adresseRef.current?.focus();
  }, []);

  const postProject = async (payload: CreateProjectPayload, attempt = 0): Promise<ApiResponse<VsProject>> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch("/api/vs/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 503 && attempt === 0) {
          clearTimeout(timeoutId);
          await new Promise((r) => setTimeout(r, 1000));
          return postProject(payload, attempt + 1);
        }
        throw new Error(String(res.status));
      }

      return (await res.json()) as ApiResponse<VsProject>;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (adresse.trim().length < 5) {
      setError("L'adresse est obligatoire (minimum 5 caractères).");
      return;
    }

    let surfaceParsed: number | null = null;
    if (surfaceTotale.trim() !== "") {
      const parsed = parseInt(surfaceTotale, 10);
      surfaceParsed = Number.isFinite(parsed) ? parsed : null;
    }

    if (surfaceParsed !== null && (surfaceParsed < 9 || surfaceParsed > 5000)) {
      setError("La surface doit être comprise entre 9 et 5000 m².");
      return;
    }

    try {
      setSubmitting(true);
      const payload: CreateProjectPayload = {
        adresse: adresse.trim(),
        type_bien: typeBien,
        surface_totale: surfaceParsed,
      };

      const json = await postProject(payload);

      if (json.success) {
        console.log("[toast] Opération créée."); // TODO: remplacer par useToast() une fois la lib ajoutée
        onCreated(json.data);
      } else {
        setError(json.error);
      }
    } catch (err) {
      const errMsg = (err as Error).message;
      if (errMsg === "404") {
        setError("Ressource introuvable.");
      } else if (errMsg === "503") {
        setError("Service temporairement indisponible. Réessayez dans un instant.");
      } else {
        setError("Une erreur inattendue est survenue. Vérifiez votre connexion et réessayez.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-bg-card border border-border-default rounded-lg p-xl"
    >
      <h2 className="vs-h3 mb-xs">Nouvelle opération</h2>
      <p className="vs-body-sm text-text-muted mb-lg">Renseignez les informations de base pour initialiser l&apos;opération.</p>

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-lg bg-error/10 border border-error/20 rounded-md p-md text-sm text-error"
        >
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
            ref={adresseRef}
            id="adresse"
            type="text"
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            placeholder="12 rue de la République, 69001 Lyon"
            required
            minLength={5}
            maxLength={200}
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
            Surface totale (m², optionnel)
          </label>
          <input
            id="surface_totale"
            type="number"
            value={surfaceTotale}
            onChange={(e) => setSurfaceTotale(e.target.value)}
            placeholder="350"
            min={9}
            max={5000}
            step={1}
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
      <div className="flex flex-col-reverse sm:flex-row gap-md mt-xl">
        <button
          type="submit"
          disabled={submitting}
          className="
            w-full sm:w-auto
            px-xl py-[10px] rounded-md text-sm font-medium
            bg-interactive-primary text-text-inverse
            hover:bg-interactive-hover
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
          "
        >
          {submitting ? "Création…" : "Créer l'opération"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="
            w-full sm:w-auto
            px-xl py-[10px] rounded-md text-sm font-medium
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

function ProjectCard({
  project,
  position,
  onArchive,
  onDelete,
}: {
  project: VsProject;
  position: number;
  onArchive: (projectId: string) => void;
  onDelete: (projectId: string) => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fermer le menu sur clic extérieur ou Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const createdDate = new Date(project.created_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const openProject = () => {
    console.log("[analytics] vs_project_opened", {
      project_id: project.id,
      position_in_list: position,
    });
    router.push(`/vs/projects/${project.id}/upload`);
  };

  return (
    <div
      className="
        relative w-full bg-bg-card border border-border-default rounded-lg p-sm sm:p-xl
        hover:border-interactive-primary/30 hover:shadow-sm
        transition-all duration-200
        focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-interactive-primary
      "
    >
      <button
        type="button"
        onClick={openProject}
        className="block w-full text-left pr-2xl focus:outline-none"
        aria-label={`Ouvrir l'opération ${project.adresse}`}
      >
        <div className="flex items-start justify-between gap-md">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-medium text-text-default truncate">
              {project.adresse}
            </h3>
            <div className="flex flex-wrap items-center gap-md mt-sm">
              <span className="vs-label">
                {TYPE_BIEN_OPTIONS.find((o) => o.value === project.type_bien)?.label ?? project.type_bien}
              </span>
              {project.surface_totale && (
                <span className="vs-label">
                  {project.surface_totale} m²
                </span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span className={`inline-block px-sm py-2xs rounded text-xs ${STATUS_COLORS[project.status] ?? "bg-bg-default text-text-muted border border-border-default"}`}>
              {STATUS_LABELS[project.status] || project.status}
            </span>
            <p className="text-xs text-text-muted mt-xs">{createdDate}</p>
          </div>
        </div>
      </button>

      {/* Menu kebab */}
      <div ref={menuRef} className="absolute top-2 right-2">
        <button
          type="button"
          aria-label="Actions sur l'opération"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className="
            w-11 h-11 inline-flex items-center justify-center rounded-md text-text-muted
            hover:bg-bg-default hover:text-text-default
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
            transition-colors
          "
        >
          <span aria-hidden="true" className="text-lg leading-none">⋯</span>
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute top-full right-0 mt-1 min-w-[160px] bg-bg-card border border-border-default rounded-md shadow-md py-1 z-10"
          >
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onArchive(project.id);
              }}
              className="block w-full text-left px-md py-[10px] text-sm text-text-default hover:bg-bg-default transition-colors"
            >
              Archiver
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onDelete(project.id);
              }}
              className="block w-full text-left px-md py-[10px] text-sm text-error hover:bg-error/10 transition-colors"
            >
              Supprimer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
