import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'authenticated' | 'unauthenticated'

  useEffect(() => {
    // Quick client-side check: if expiresAt is in the past, skip the network call
    const expiresAt = localStorage.getItem('vi_admin_expires');
    if (expiresAt && new Date(expiresAt) < new Date()) {
      localStorage.removeItem('vi_admin_expires');
      setStatus('unauthenticated');
      return;
    }

    // Verify session via the httpOnly cookie (sent automatically)
    fetch('/api/admin/me')
      .then(async (r) => {
        if (r.ok) {
          const data = await r.json();
          setStatus(data.ok ? 'authenticated' : 'unauthenticated');
        } else {
          localStorage.removeItem('vi_admin_expires');
          setStatus('unauthenticated');
        }
      })
      .catch(() => {
        setStatus('unauthenticated');
      });
  }, []);

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Vérification de la session...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
