import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import './admin.css';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already authenticated via cookie
    fetch('/api/admin/me')
      .then(async (r) => {
        if (r.ok) {
          const data = await r.json();
          if (data.ok) {
            navigate('/admin/biens', { replace: true });
          }
        }
      })
      .catch(() => {
        // Not authenticated, stay on login page
      });
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || 'Mot de passe incorrect');
        setLoading(false);
        return;
      }

      // Store expiresAt for client-side heuristic only (token is in httpOnly cookie)
      if (data.expiresAt) {
        localStorage.setItem('vi_admin_expires', data.expiresAt);
      }
      navigate('/admin/biens', { replace: true });
    } catch {
      setError('Erreur de connexion au serveur');
      setLoading(false);
    }
  }

  return (
    <>
      <Nav />
      <div className="admin-login-page" style={{ paddingTop: 'var(--nav-height)' }}>
        <h1>Versi Immobilier — Admin</h1>
        <form onSubmit={handleSubmit}>
          <label htmlFor="admin-password" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Mot de passe</label>
          <input
            id="admin-password"
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
          {error && <p className="error-msg">{error}</p>}
        </form>
      </div>
      <Footer />
    </>
  );
}
