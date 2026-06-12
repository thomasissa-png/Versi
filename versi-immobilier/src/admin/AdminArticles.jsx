import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import adminFetch from './adminFetch.js';
import ConfirmModal from './ConfirmModal.jsx';

const STATUT_LABELS = {
  draft: 'Brouillon',
  published: 'Publié',
  archived: 'Archivé',
};

const FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'published', label: 'Publiés' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'archived', label: 'Archivés' },
];

function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminArticles() {
  const [articles, setArticles] = useState([]);
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
    loadArticles();
  }, []);

  async function loadArticles() {
    setLoading(true);
    setError('');
    try {
      const data = await adminFetch('/api/admin/blog');
      setArticles(data.articles || []);
    } catch {
      setError('Erreur de chargement. Réessayer.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id, action) {
    if (action === 'delete') {
      setConfirmAction({ id, action, message: 'Supprimer définitivement cet article ? Cette action est irréversible.' });
      return;
    }

    const endpoints = {
      publish: `/api/admin/blog/${id}/publish`,
      archive: `/api/admin/blog/${id}/archive`,
    };

    const ACTION_LABELS = {
      publish: 'Article publié.',
      archive: 'Article archivé.',
    };

    try {
      await adminFetch(endpoints[action], { method: 'PATCH' });
      showSuccess(ACTION_LABELS[action] || 'Action effectuée.');
      loadArticles();
    } catch {
      setError('Erreur lors de la mise à jour.');
    }
  }

  const handleConfirm = useCallback(async () => {
    if (!confirmAction) return;
    const { id } = confirmAction;
    setConfirmAction(null);
    try {
      await adminFetch(`/api/admin/blog/${id}`, { method: 'DELETE' });
      setArticles((prev) => prev.filter((a) => a.id !== id));
      showSuccess('Article supprimé.');
    } catch {
      setError('Erreur lors de la suppression.');
    }
  }, [confirmAction]);

  const filtered = filter === 'all' ? articles : articles.filter((a) => a.status === filter);

  if (loading) {
    return <p className="admin-loading">Chargement...</p>;
  }

  if (error) {
    return (
      <div className="admin-error">
        {error}{' '}
        <button className="btn btn-sm" onClick={loadArticles}>Réessayer</button>
      </div>
    );
  }

  return (
    <div>
      {successMsg && <div className="admin-toast">{successMsg}</div>}
      <div className="admin-section-header">
        <h2>Articles du blog</h2>
        <Link to="/admin/articles/nouveau" className="btn btn-primary">+ Ajouter</Link>
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
            ? <>Aucun article. <Link to="/admin/articles/nouveau">Ajoutez le premier.</Link></>
            : 'Aucun article avec ce statut.'}
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Statut</th>
              <th>Date de publication</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((article) => (
              <tr key={article.id}>
                <td>{article.title}</td>
                <td>
                  <span className={`status-badge status-${article.status}`}>
                    {STATUT_LABELS[article.status] || article.status}
                  </span>
                </td>
                <td>{formatDate(article.published_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <Link to={`/admin/articles/${article.id}/editer`} className="btn btn-sm">
                      Éditer
                    </Link>
                    {article.status === 'draft' && (
                      <>
                        <button className="btn btn-sm" onClick={() => handleAction(article.id, 'publish')}>
                          Publier
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleAction(article.id, 'delete')}>
                          Supprimer
                        </button>
                      </>
                    )}
                    {article.status === 'published' && (
                      <button className="btn btn-sm" onClick={() => handleAction(article.id, 'archive')}>
                        Archiver
                      </button>
                    )}
                    {article.status === 'archived' && (
                      <>
                        <button className="btn btn-sm" onClick={() => handleAction(article.id, 'publish')}>
                          Republier
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleAction(article.id, 'delete')}>
                          Supprimer
                        </button>
                      </>
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
