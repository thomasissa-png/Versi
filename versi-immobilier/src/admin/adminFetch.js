/**
 * Fetch wrapper for admin API calls.
 * The auth token is stored in an httpOnly cookie (sent automatically by the browser).
 * Handles 401 (session expired) globally.
 */
export default function adminFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }).then(async (r) => {
    if (r.status === 401) {
      localStorage.removeItem('vi_admin_expires');
      window.location.href = '/admin/login';
      throw new Error('Session expirée');
    }
    const data = await r.json().catch(() => ({ ok: false, error: 'Réponse serveur invalide' }));
    if (!r.ok) {
      throw new Error(data.error || `Erreur ${r.status}`);
    }
    return data;
  });
}
