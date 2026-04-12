import { useState, useCallback } from 'react';
import { adminLogin } from './adminFetch.js';
import './AdminLoginForm.css';

export default function AdminLoginForm({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!password.trim() || loading) return;

    setLoading(true);
    setError('');

    try {
      await adminLogin(password);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  }, [password, loading, onSuccess]);

  return (
    <div className="admin-login">
      <form className="admin-login__form" onSubmit={handleSubmit} aria-label="Connexion admin">
        <h2 className="admin-login__title">Espace admin</h2>
        <p className="admin-login__subtitle">Versi Immobilier — Back-office</p>

        <div className="admin-login__field">
          <label htmlFor="admin-password" className="admin-login__label">
            Mot de passe
          </label>
          <input
            type="password"
            id="admin-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe admin"
            disabled={loading}
            autoFocus
            className="admin-login__input"
          />
        </div>

        {error && (
          <p className="admin-login__error" role="alert">{error}</p>
        )}

        <button
          type="submit"
          className="admin-login__submit"
          disabled={loading || !password.trim()}
        >
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
