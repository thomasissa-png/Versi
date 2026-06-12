import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import adminFetch from './adminFetch.js';
import ConfirmModal from './ConfirmModal.jsx';

const STATUT_LABELS = {
  completed: 'Terminée',
  'in-progress': 'En cours',
  archive: 'Archivée',
};

const FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'completed', label: 'Terminées' },
  { value: 'in-progress', label: 'En cours' },
  { value: 'archive', label: 'Archivées' },
];

export default function AdminRealisations() {
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  function showSuccess(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    setError('');
    try {
      const data = await adminFetch('/api/admin/projects');
      setProjects(data.projects || []);
    } catch {
      setError('Erreur de chargement. Réessayer.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id, action) {
    if (action === 'delete') {
      setConfirmAction({ id, message: 'Supprimer définitivement cette réalisation ? Cette action est irréversible.' });
      return;
    }

    if (action === 'archive') {
      try {
        await adminFetch(`/api/admin/projects/${id}/archive`, { method: 'PATCH' });
        showSuccess('Réalisation archivée.');
        loadProjects();
      } catch {
        setError('Erreur lors de l\'archivage.');
      }
      return;
    }

    if (action === 'complete') {
      try {
        await adminFetch(`/api/admin/projects/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'completed' }),
        });
        showSuccess('Réalisation marquée comme terminée.');
        loadProjects();
      } catch {
        setError('Erreur lors de la mise à jour.');
      }
    }
  }

  const handleConfirm = useCallback(async () => {
    if (!confirmAction) return;
    const { id } = confirmAction;
    setConfirmAction(null);
    try {
      await adminFetch(`/api/admin/projects/${id}`, { method: 'DELETE' });
      setProjects((prev) => prev.filter((p) => p.id !== id));
      showSuccess('Réalisation supprimée.');
    } catch {
      setError('Erreur lors de la suppression.');
    }
  }, [confirmAction]);

  const filtered = filter === 'all' ? projects : projects.filter((p) => p.status === filter);

  if (loading) {
    return <p className="admin-loading">Chargement...</p>;
  }

  if (error) {
    return (
      <div className="admin-error">
        {error}{' '}
        <button className="btn btn-sm" onClick={loadProjects}>Réessayer</button>
      </div>
    );
  }

  return (
    <div>
      {successMsg && <div className="admin-toast">{successMsg}</div>}
      <div className="admin-section-header">
        <h2>Réalisations</h2>
        <Link to="/admin/realisations/nouveau" className="btn btn-primary">+ Ajouter</Link>
      </div>

      <div className="admin-filters">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={filter === f.value ? 'active' : ''}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="admin-empty">
          {filter === 'all'
            ? <>Aucune réalisation. <Link to="/admin/realisations/nouveau">Ajoutez la première.</Link></>
            : 'Aucune réalisation avec ce statut.'}
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Ville</th>
              <th>Statut</th>
              <th>Featured</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((project) => (
              <tr key={project.id}>
                <td>{project.title}</td>
                <td>{project.city}</td>
                <td>
                  <span className={`status-badge status-${project.status}`}>
                    {STATUT_LABELS[project.status] || project.status}
                  </span>
                </td>
                <td>{project.featured ? 'Oui' : '-'}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <Link to={`/admin/realisations/${project.id}/editer`} className="btn btn-sm">
                      Éditer
                    </Link>
                    {project.status === 'in-progress' && (
                      <button className="btn btn-sm" onClick={() => handleAction(project.id, 'complete')}>
                        Terminer
                      </button>
                    )}
                    {project.status !== 'archive' && (
                      <button className="btn btn-sm" onClick={() => handleAction(project.id, 'archive')}>
                        Archiver
                      </button>
                    )}
                    {project.status === 'archive' && (
                      <button className="btn btn-sm btn-danger" onClick={() => handleAction(project.id, 'delete')}>
                        Supprimer
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {confirmAction && (
        <ConfirmModal
          message={confirmAction.message}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
