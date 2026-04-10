import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminFetch from './adminFetch.js';

const STATUT_LABELS = {
  disponible: 'Disponible',
  archive: 'Archivé',
  vendu: 'Vendu',
};

const FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'disponible', label: 'Disponibles' },
  { value: 'archive', label: 'Archivés' },
  { value: 'vendu', label: 'Vendus' },
];

export default function AdminBiens() {
  const [biens, setBiens] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBiens();
  }, []);

  async function loadBiens() {
    setLoading(true);
    setError('');
    try {
      const data = await adminFetch('/api/admin/properties');
      setBiens(data.properties || []);
    } catch {
      setError('Erreur de chargement. Réessayer.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id, action) {
    if (action === 'delete') {
      if (!window.confirm('Supprimer définitivement ce bien ? Cette action est irréversible.')) {
        return;
      }
      try {
        await adminFetch(`/api/admin/properties/${id}`, { method: 'DELETE' });
        setBiens((prev) => prev.filter((b) => b.id !== id));
      } catch {
        alert('Erreur lors de la suppression.');
      }
      return;
    }

    const endpoints = {
      archive: `/api/admin/properties/${id}/archive`,
      vendu: `/api/admin/properties/${id}/vendu`,
      restaurer: `/api/admin/properties/${id}/restaurer`,
    };

    try {
      await adminFetch(endpoints[action], { method: 'PATCH' });
      loadBiens();
    } catch {
      alert('Erreur lors de la mise à jour.');
    }
  }

  const filtered = filter === 'all' ? biens : biens.filter((b) => b.status === filter);

  if (loading) {
    return <p className="admin-loading">Chargement...</p>;
  }

  if (error) {
    return (
      <div className="admin-error">
        {error}{' '}
        <button className="btn btn-sm" onClick={loadBiens}>Réessayer</button>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-section-header">
        <h2>Biens en vente</h2>
        <Link to="/admin/biens/nouveau" className="btn btn-primary">+ Ajouter</Link>
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
            ? <>Aucun bien. <Link to="/admin/biens/nouveau">Ajoutez le premier.</Link></>
            : 'Aucun bien avec ce statut.'}
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Ville</th>
              <th>Prix</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((bien) => (
              <tr key={bien.id}>
                <td>{bien.title}</td>
                <td>{bien.city}</td>
                <td>{bien.price}</td>
                <td>
                  <span className={`status-badge status-${bien.status}`}>
                    {STATUT_LABELS[bien.status] || bien.status}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <Link to={`/admin/biens/${bien.id}/editer`} className="btn btn-sm">
                      Éditer
                    </Link>
                    {bien.status === 'disponible' && (
                      <>
                        <button className="btn btn-sm" onClick={() => handleAction(bien.id, 'archive')}>
                          Archiver
                        </button>
                        <button className="btn btn-sm" onClick={() => handleAction(bien.id, 'vendu')}>
                          Marquer vendu
                        </button>
                      </>
                    )}
                    {bien.status === 'archive' && (
                      <>
                        <button className="btn btn-sm" onClick={() => handleAction(bien.id, 'restaurer')}>
                          Restaurer
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleAction(bien.id, 'delete')}>
                          Supprimer
                        </button>
                      </>
                    )}
                    {bien.status === 'vendu' && (
                      <button className="btn btn-sm" onClick={() => handleAction(bien.id, 'restaurer')}>
                        Restaurer
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
