import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('vi_admin_token');
  const expiresAt = localStorage.getItem('vi_admin_expires');

  if (!token || !expiresAt || new Date(expiresAt) < new Date()) {
    localStorage.removeItem('vi_admin_token');
    localStorage.removeItem('vi_admin_expires');
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
