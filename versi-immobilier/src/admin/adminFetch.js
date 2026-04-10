/**
 * Fetch wrapper for admin API calls.
 * Adds Authorization header and handles 401 (session expired) globally.
 */
export default function adminFetch(url, options = {}) {
  const token = localStorage.getItem('vi_admin_token');
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  }).then((r) => {
    if (r.status === 401) {
      localStorage.removeItem('vi_admin_token');
      localStorage.removeItem('vi_admin_expires');
      window.location.href = '/admin/login';
      throw new Error('Session expirée');
    }
    return r.json();
  });
}
