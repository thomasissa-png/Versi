import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import PageHead from '../components/PageHead.jsx';

export default function NotFound() {
  return (
    <>
      <PageHead
        title="Page introuvable - Versi Immobilier"
        description="La page demandée n'existe pas ou a été déplacée."
        noindex
      />
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
              background: 'var(--color-charcoal-950)',
              color: 'var(--color-calcaire-50)',
              padding: '12px 32px',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              minHeight: '44px',
            }}
          >
            Retour à l'accueil
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
