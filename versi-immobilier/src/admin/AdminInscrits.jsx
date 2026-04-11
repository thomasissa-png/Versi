import { useState, useEffect } from 'react';
import adminFetch from './adminFetch.js';

export default function AdminInscrits() {
  const [subscribers, setSubscribers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSubscribers();
  }, []);

  async function loadSubscribers() {
    setLoading(true);
    setError('');
    try {
      const data = await adminFetch('/api/admin/subscribers');
      setSubscribers(data.subscribers || []);
      setTotal(data.total ?? (data.subscribers || []).length);
    } catch {
      setError('Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Supprimer cet inscrit ?')) return;
    try {
      await adminFetch(`/api/admin/subscribers/${id}`, { method: 'DELETE' });
      setSubscribers((prev) => prev.filter((s) => s.id !== id));
      setTotal((prev) => prev - 1);
    } catch {
      setError('Erreur lors de la suppression.');
    }
  }

  function exportCSV() {
    const header = 'Email,Date inscription\n';
    const rows = subscribers.map(s => `${s.email},${new Date(s.created_at).toLocaleDateString('fr-FR')}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inscrits-versi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  if (loading) {
    return <p className="admin-loading">Chargement...</p>;
  }

  if (error) {
    return (
      <div className="admin-error">
        {error}{' '}
        <button className="btn btn-sm" onClick={loadSubscribers}>Réessayer</button>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-section-header">
        <h2>Inscrits aux notifications</h2>
        {subscribers.length > 0 && (
          <button className="btn" onClick={exportCSV}>Exporter CSV</button>
        )}
      </div>

      <p className="admin-counter">Total : {total} inscrit{total > 1 ? 's' : ''}</p>

      {subscribers.length === 0 ? (
        <div className="admin-empty">Aucun inscrit pour l'instant.</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Date d'inscription</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((sub) => (
              <tr key={sub.id}>
                <td>{sub.email}</td>
                <td>{formatDate(sub.created_at)}</td>
                <td>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(sub.id)}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
