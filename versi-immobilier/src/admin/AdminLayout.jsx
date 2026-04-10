import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import './admin.css';

export default function AdminLayout() {
  const navigate = useNavigate();

  async function handleLogout() {
    const token = localStorage.getItem('vi_admin_token');

    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch {
      // Silently continue — we clear the session locally regardless
    }

    localStorage.removeItem('vi_admin_token');
    localStorage.removeItem('vi_admin_expires');
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="admin-layout">
      <nav className="admin-nav">
        <span className="nav-brand">Versi Admin</span>
        <NavLink to="/admin/biens" className={({ isActive }) => isActive ? 'active' : ''}>
          Biens
        </NavLink>
        <NavLink to="/admin/realisations" className={({ isActive }) => isActive ? 'active' : ''}>
          Réalisations
        </NavLink>
        <NavLink to="/admin/inscrits" className={({ isActive }) => isActive ? 'active' : ''}>
          Inscrits
        </NavLink>
        <div className="nav-spacer" />
        <button className="btn-logout" onClick={handleLogout}>
          Déconnexion
        </button>
      </nav>
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
}
