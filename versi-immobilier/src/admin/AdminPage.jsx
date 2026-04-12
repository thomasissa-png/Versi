import { useState, useEffect } from 'react';
import { adminCheckSession } from './adminFetch.js';
import AdminLoginForm from './AdminLoginForm.jsx';
import AdminBienForm from './AdminBienForm.jsx';

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    adminCheckSession().then((isAuth) => {
      if (!cancelled) {
        setAuthenticated(isAuth);
        setChecking(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-muted, #6B6560)', fontFamily: 'var(--font-family)' }}>
          Chargement…
        </p>
      </div>
    );
  }

  if (!authenticated) {
    return <AdminLoginForm onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <div style={{ background: 'var(--color-bg-primary, #F7F5F2)', minHeight: '100vh' }}>
      <AdminBienForm />
    </div>
  );
}
