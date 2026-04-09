import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';

export default function NotFound() {
  return (
    <>
      <Nav />
      <main style={{
        paddingTop: 'var(--nav-height)',
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
          <span style={{
            display: 'block',
            fontSize: 'var(--font-size-display-num)',
            fontWeight: 'var(--font-weight-thin)',
            color: 'var(--color-text-primary)',
            opacity: 'var(--opacity-subtle)',
            marginBottom: 'var(--spacing-lg)',
          }}>
            404
          </span>
          <h1 className="text-heading-lg" style={{ marginBottom: 'var(--spacing-md)' }}>
            Page introuvable
          </h1>
          <p className="text-body-md" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xl)' }}>
            La page que vous recherchez n'existe pas ou a été déplacée.
          </p>
          <Link
            to="/"
            className="text-cta"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              border: '1px solid var(--color-border)',
              padding: '12px 32px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-primary)',
              textDecoration: 'none',
              minHeight: '44px',
            }}
          >
            RETOUR À L'ACCUEIL
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
